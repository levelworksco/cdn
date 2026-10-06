// chatgpt-markdown-exporter.js
// Single-file, no-build Lit 3 component.
import { LitElement, html, css, nothing } from 'https://unpkg.com/lit@3/index.js?module';

// ═══════════════════════════════════════════════════════════════════════════
// Platform API
//
// The component never calls fetch() or filesystem APIs directly.
//
// KEY METHOD: extractConversation(url)
//   Returns { title, messages } or throws.
//   - BrowserPlatformApi: tries ChatGPT's JSON API endpoint, then HTML parse
//   - FlutterPlatformApi: asks Flutter to load the URL in a hidden WebView,
//     execute the page's JavaScript, and extract from the live rendered DOM.
//     This is the only reliable way now that ChatGPT pages are fully CSR.
// ═══════════════════════════════════════════════════════════════════════════

class BrowserPlatformApi {
  async httpGet(url, headers = {}) {
    const response = await fetch(url, { headers });
    const body = await response.text();
    return { status: response.status, body };
  }

  async saveFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  async extractConversation(url) {
    const shareId = url.split('/share/')[1]?.split(/[?#]/)[0];

    // ── Attempt 1: ChatGPT backend JSON API ───────────────────────────────
    // ChatGPT exposes a JSON endpoint for public share links. If it works,
    // we get structured data without needing to parse HTML at all.
    if (shareId) {
      try {
        const apiResp = await this.httpGet(
          `https://chatgpt.com/backend-api/share/${shareId}`,
          { 'Accept': 'application/json' },
        );
        if (apiResp.status === 200) {
          const conv = ChatGPTExtractor.fromApiJson(apiResp.body);
          if (conv) return conv;
        }
      } catch (e) {
        this.log('API attempt failed: ' + e.message);
      }
    }

    // ── Attempt 2: Fetch the page HTML and parse ──────────────────────────
    // Works for older share pages that still use SSR / __NEXT_DATA__.
    const resp = await this.httpGet(url, { 'Accept': 'text/html,application/xhtml+xml' });
    if (resp.status !== 200) throw new Error(`Server returned HTTP ${resp.status}.`);

    const conv = new ChatGPTExtractor().extract(resp.body);
    if (conv) return conv;

    // ── Nothing worked ────────────────────────────────────────────────────
    throw new Error(
      'ChatGPT now loads conversations dynamically (client-side rendering). ' +
      'A plain browser fetch cannot execute JavaScript to render the page. ' +
      'Use the Flutter desktop or mobile app for reliable exports.',
    );
  }

  log(message) {
    console.log('[ChatGPT Exporter]', message);
  }
}

class FlutterPlatformApi {
  #pending = new Map();

  constructor() {
    window.handleFlutterResponse = (data) => {
      const msg = JSON.parse(data);
      const req = this.#pending.get(msg.id);
      if (!req) return;
      this.#pending.delete(msg.id);
      if (msg.type === 'error') {
        req.reject(new Error(msg.payload?.message ?? 'Unknown bridge error'));
      } else {
        req.resolve(msg.payload);
      }
    };
  }

  #send(type, payload) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.#pending.set(id, { resolve, reject });
      window.FlutterBridge.postMessage(JSON.stringify({ id, type, payload }));
    });
  }

  // Flutter loads the URL in a hidden WebView, executes JS, extracts the
  // live DOM, and returns { title, messages } once content is found.
  async extractConversation(url) {
    const result = await this.#send('extractConversation', { url });
    if (result.error) throw new Error(result.error);
    return { title: result.title, messages: result.messages };
  }

  async saveFile(filename, content) {
    await this.#send('saveFile', { filename, content });
  }

  log(message) {
    window.FlutterBridge?.postMessage(
      JSON.stringify({ id: crypto.randomUUID(), type: 'log', payload: { message } }),
    );
  }
}

function createPlatformApi() {
  if (typeof window !== 'undefined' && window.FlutterBridge != null) {
    return new FlutterPlatformApi();
  }
  return new BrowserPlatformApi();
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML → Markdown converter  (DOM fallback path only)
// ═══════════════════════════════════════════════════════════════════════════

class HtmlToMarkdownConverter {
  convert(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node;
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return '';

    if (el.classList.contains('katex-display')) {
      const ann = el.querySelector('annotation[encoding="application/x-tex"]');
      if (ann?.textContent) return '\n\n$$' + ann.textContent.trim() + '$$\n\n';
    }
    if (el.classList.contains('katex')) {
      const ann = el.querySelector('annotation[encoding="application/x-tex"]');
      if (ann?.textContent) return '$' + ann.textContent.trim() + '$';
    }

    const kids = Array.from(el.childNodes).map(n => this.convert(n)).join('');

    const hMatch = tag.match(/^h([1-6])$/);
    if (hMatch) return '\n\n' + '#'.repeat(Number(hMatch[1])) + ' ' + kids.trim() + '\n\n';
    if (tag === 'p') return '\n\n' + kids.trim() + '\n\n';
    if (tag === 'br') return '\n';
    if (tag === 'hr') return '\n\n---\n\n';
    if (tag === 'strong' || tag === 'b') return '**' + kids + '**';
    if (tag === 'em' || tag === 'i') return '_' + kids + '_';
    if (tag === 'del' || tag === 's') return '~~' + kids + '~~';
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? '#';
      if (!kids.trim()) return '';
      return '[' + kids + '](' + href + ')';
    }
    if (tag === 'code') {
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return el.textContent ?? '';
      return '`' + kids + '`';
    }
    if (tag === 'pre') {
      const codeEl = el.querySelector('code');
      const lang = codeEl?.className.match(/language-(\S+)/)?.[1] ?? '';
      const text = (codeEl?.textContent ?? el.textContent ?? '').replace(/\n$/, '');
      return '\n\n```' + lang + '\n' + text + '\n```\n\n';
    }
    if (tag === 'blockquote') {
      return '\n\n' + kids.trim().split('\n').map(l => '> ' + l).join('\n') + '\n\n';
    }
    if (tag === 'ul') {
      const items = Array.from(el.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map(li => '- ' + this.#listItemContent(li))
        .join('\n');
      return '\n\n' + items + '\n\n';
    }
    if (tag === 'ol') {
      const items = Array.from(el.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map((li, i) => `${i + 1}. ` + this.#listItemContent(li))
        .join('\n');
      return '\n\n' + items + '\n\n';
    }
    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (!rows.length) return kids;
      const mdRows = rows.map((row, i) => {
        const cells = Array.from(row.querySelectorAll('th,td'));
        const line = '| ' + cells.map(c => (c.textContent ?? '').trim().replace(/\|/g, '\\|')).join(' | ') + ' |';
        if (i === 0) return line + '\n| ' + cells.map(() => '---').join(' | ') + ' |';
        return line;
      });
      return '\n\n' + mdRows.join('\n') + '\n\n';
    }
    if (tag === 'img') {
      return '![' + (el.getAttribute('alt') ?? '') + '](' + (el.getAttribute('src') ?? '') + ')';
    }
    return kids;
  }

  #listItemContent(li) {
    let inline = '';
    let nested = '';
    for (const child of Array.from(li.childNodes)) {
      const childTag = child.tagName?.toLowerCase();
      if (childTag === 'ul') {
        nested += '\n' + Array.from(child.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map(nli => '  - ' + this.#listItemContent(nli))
          .join('\n');
      } else if (childTag === 'ol') {
        nested += '\n' + Array.from(child.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map((nli, idx) => `  ${idx + 1}. ` + this.#listItemContent(nli))
          .join('\n');
      } else {
        inline += this.convert(child);
      }
    }
    return inline.replace(/\n+/g, ' ').trim() + nested;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ChatGPT conversation extractor
// ═══════════════════════════════════════════════════════════════════════════

class ChatGPTExtractor {
  #converter = new HtmlToMarkdownConverter();

  // ── Parse rendered HTML (from WebView or older SSR pages) ─────────────────

  extract(rawHtml) {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    return this.#extractFromNextData(doc) ?? this.#extractFromDOM(doc);
  }

  // ── Parse the ChatGPT backend JSON API response ───────────────────────────
  // Static method so BrowserPlatformApi can call it without an instance.

  static fromApiJson(jsonString) {
    let root;
    try { root = JSON.parse(jsonString); } catch { return null; }
    return new ChatGPTExtractor().#fromDataObject(root);
  }

  // Shared logic for __NEXT_DATA__ and the JSON API (same mapping structure).
  #fromDataObject(root) {
    const convData = this.#findConvData(root, 0);
    if (!convData?.mapping) return null;

    let rootId = null;
    for (const [id, node] of Object.entries(convData.mapping)) {
      if (node.parent == null) { rootId = id; break; }
    }
    if (!rootId) return null;

    const messages = [];
    this.#walkMapping(convData.mapping, rootId, messages);
    if (!messages.length) return null;

    return { title: convData.title ?? 'ChatGPT Conversation', messages };
  }

  #extractFromNextData(doc) {
    const scriptEl = doc.getElementById('__NEXT_DATA__');
    if (!scriptEl?.textContent) return null;
    let root;
    try { root = JSON.parse(scriptEl.textContent); } catch { return null; }
    return this.#fromDataObject(root);
  }

  #findConvData(obj, depth) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || depth > 10) return null;
    if (obj.mapping && typeof obj.mapping === 'object' && !Array.isArray(obj.mapping)) {
      const keys = Object.keys(obj.mapping);
      if (keys.length > 0 && 'children' in (obj.mapping[keys[0]] ?? {})) return obj;
    }
    for (const val of Object.values(obj)) {
      const found = this.#findConvData(val, depth + 1);
      if (found) return found;
    }
    return null;
  }

  #walkMapping(mapping, nodeId, out) {
    const node = mapping[nodeId];
    if (!node) return;
    const msg = node.message;
    if (msg?.author && msg.content) {
      const role = msg.author.role;
      if (role === 'user' || role === 'assistant') {
        const text = (msg.content.parts ?? [])
          .filter(p => typeof p === 'string')
          .join('\n').trim();
        if (text) out.push({ role, content: text });
      }
    }
    const children = node.children ?? [];
    if (children.length > 0) this.#walkMapping(mapping, children[children.length - 1], out);
  }

  #extractFromDOM(doc) {
    const turns = Array.from(doc.querySelectorAll('[data-message-author-role]'));
    if (!turns.length) return null;
    const messages = [];
    for (const turn of turns) {
      const role = turn.getAttribute('data-message-author-role');
      if (role !== 'user' && role !== 'assistant') continue;
      let content;
      if (role === 'assistant') {
        const mdEl =
          turn.querySelector('.markdown') ??
          turn.querySelector('[class*="prose"]') ??
          turn.querySelector('[class*="markdown"]') ??
          turn;
        content = this.#converter.convert(mdEl).trim();
      } else {
        content = (turn.innerText ?? turn.textContent ?? '').trim();
      }
      if (content) messages.push({ role, content });
    }
    if (!messages.length) return null;
    const title = doc.title.replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim() || 'ChatGPT Conversation';
    return { title, messages };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Markdown builder + utilities
// ═══════════════════════════════════════════════════════════════════════════

function buildMarkdown(conv) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [`# ${conv.title}`, '', `*Exported on ${today}*`, '', '---', ''];
  for (const msg of conv.messages) {
    lines.push(msg.role === 'user' ? '## User' : '## Assistant', '', msg.content, '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function slugify(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'chatgpt-conversation';
}

function isValidShareUrl(url) {
  return /^https:\/\/(chatgpt\.com|chat\.openai\.com)\/share\/[a-zA-Z0-9_-]+/.test(url.trim());
}

function makeSteps() {
  return [
    { id: 'validate', label: 'Validating URL',        status: 'idle' },
    { id: 'extract',  label: 'Loading conversation',  status: 'idle' },
    { id: 'generate', label: 'Generating Markdown',   status: 'idle' },
    { id: 'save',     label: 'Saving file',           status: 'idle' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// Lit component
// ═══════════════════════════════════════════════════════════════════════════

class ChatgptMarkdownExporter extends LitElement {

  static properties = {
    _url:      { state: true },
    _filename: { state: true },
    _steps:    { state: true },
    _running:  { state: true },
    _error:    { state: true },
    _done:     { state: true },
  };

  constructor() {
    super();
    this._url      = '';
    this._filename = '';
    this._steps    = makeSteps();
    this._running  = false;
    this._error    = '';
    this._done     = false;
    this._extractor = new ChatGPTExtractor();
  }

  connectedCallback() {
    super.connectedCallback();
    this._api = createPlatformApi();
    this._api.log('chatgpt-markdown-exporter connected');
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 48px 16px 80px;
      box-sizing: border-box;
      background: #f4f5f7;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 4px 32px rgba(0,0,0,.08);
      padding: 40px 44px;
      max-width: 580px;
      width: 100%;
    }

    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }

    .logo-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #10a37f 0%, #0d8f6f 100%);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 20px; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(16,163,127,.35);
    }

    h1 { font-size: 22px; font-weight: 700; color: #111; margin: 0; }

    .subtitle { font-size: 14px; color: #666; margin: 0 0 32px; line-height: 1.5; }

    .form { display: flex; flex-direction: column; gap: 18px; }

    label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: #333; }

    input {
      width: 100%; padding: 10px 14px;
      border: 1.5px solid #e0e0e0; border-radius: 10px;
      font-size: 14px; color: #111; outline: none;
      transition: border-color .15s, box-shadow .15s;
      box-sizing: border-box; background: #fafafa;
    }
    input:focus { border-color: #10a37f; box-shadow: 0 0 0 3px rgba(16,163,127,.12); background: #fff; }
    input::placeholder { color: #bbb; }
    .input-hint { font-size: 12px; font-weight: 400; color: #999; margin-top: 2px; }

    .btn-generate {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 13px 20px;
      background: linear-gradient(135deg, #10a37f 0%, #0d8f6f 100%);
      color: #fff; font-size: 15px; font-weight: 600;
      border: none; border-radius: 12px; cursor: pointer;
      transition: opacity .15s, transform .1s;
      box-shadow: 0 3px 12px rgba(16,163,127,.4);
    }
    .btn-generate:hover:not(:disabled) { opacity: .92; }
    .btn-generate:active:not(:disabled) { transform: scale(.985); }
    .btn-generate:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

    @keyframes spin { to { transform: rotate(360deg); } }

    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid rgba(255,255,255,.4); border-top-color: #fff;
      border-radius: 50%; animation: spin .75s linear infinite; flex-shrink: 0;
    }

    .divider { border: none; border-top: 1px solid #f0f0f0; margin: 28px 0; }

    .progress { display: flex; flex-direction: column; gap: 14px; }

    .step { display: flex; align-items: center; gap: 12px; }

    .step-indicator {
      width: 26px; height: 26px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 13px; transition: background .2s;
    }
    .step-indicator.idle   { background: #f0f0f0; color: #bbb; }
    .step-indicator.active { background: #e8f8f4; border: 2px solid #10a37f; }
    .step-indicator.done   { background: #10a37f; color: #fff; }
    .step-indicator.error  { background: #fff0f0; border: 2px solid #e53e3e; color: #e53e3e; }

    .step-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(16,163,127,.3); border-top-color: #10a37f;
      border-radius: 50%; animation: spin .75s linear infinite;
    }

    .step-label { font-size: 14px; color: #555; transition: color .2s; }
    .step-label.active  { color: #111; font-weight: 600; }
    .step-label.done    { color: #10a37f; }
    .step-label.error   { color: #e53e3e; }

    .error-box {
      background: #fff5f5; border: 1.5px solid #feb2b2; border-radius: 10px;
      padding: 14px 16px; font-size: 14px; color: #c53030; line-height: 1.5; margin-top: 20px;
      white-space: pre-line;
    }

    .success-box {
      background: #f0fdf8; border: 1.5px solid #9ae6b4; border-radius: 10px;
      padding: 18px 20px; text-align: center; margin-top: 20px;
    }
    .success-icon  { font-size: 32px; margin-bottom: 8px; }
    .success-title { font-size: 16px; font-weight: 700; color: #276749; margin-bottom: 4px; }
    .success-sub   { font-size: 13px; color: #48bb78; }

    .btn-again {
      margin-top: 14px; padding: 8px 20px;
      background: #10a37f; color: #fff; font-size: 13px; font-weight: 600;
      border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s;
    }
    .btn-again:hover { opacity: .85; }

    .note { font-size: 12px; color: #bbb; line-height: 1.6; margin-top: 24px; }

    @media (max-width: 480px) {
      :host { padding: 24px 12px 60px; }
      .card { padding: 28px 20px; }
      h1 { font-size: 19px; }
    }
  `;

  // ── Export orchestration ──────────────────────────────────────────────────

  _setStep(id, status) {
    this._steps = this._steps.map(s => s.id === id ? { ...s, status } : s);
  }

  async _runExport() {
    if (this._running) return;

    const url      = this._url.trim();
    const filename = (this._filename.trim() || 'chat-export') + '.md';

    this._running = true;
    this._error   = '';
    this._done    = false;
    this._steps   = makeSteps();

    try {
      // 1 — Validate
      this._setStep('validate', 'active');
      this._api.log(`Validating: ${url}`);
      if (!isValidShareUrl(url)) {
        throw new Error('Invalid URL. Please paste a ChatGPT share link, e.g.\nhttps://chatgpt.com/share/abc123');
      }
      this._setStep('validate', 'done');

      // 2 — Extract  (fetch + render + parse, all in one platform call)
      this._setStep('extract', 'active');
      this._api.log(`Extracting conversation from: ${url}`);
      const conversation = await this._api.extractConversation(url);
      this._api.log(`Extracted ${conversation.messages.length} messages: "${conversation.title}"`);
      this._setStep('extract', 'done');

      // 3 — Generate Markdown
      this._setStep('generate', 'active');
      this._api.log('Generating Markdown…');
      const markdown = buildMarkdown(conversation);
      const finalFilename = this._filename.trim() ? filename : slugify(conversation.title) + '.md';
      this._setStep('generate', 'done');

      // 4 — Save
      this._setStep('save', 'active');
      this._api.log(`Saving ${finalFilename}…`);
      await this._api.saveFile(finalFilename, markdown);
      this._setStep('save', 'done');

      this._done = true;
      this._api.log('Export complete.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._api.log('Export failed: ' + msg);
      this._error = msg;
      this._steps = this._steps.map(s => s.status === 'active' ? { ...s, status: 'error' } : s);
    } finally {
      this._running = false;
    }
  }

  _reset() {
    this._url      = '';
    this._filename = '';
    this._steps    = makeSteps();
    this._running  = false;
    this._error    = '';
    this._done     = false;
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  _renderStepIndicator(step) {
    if (step.status === 'idle')   return html`<span class="step-indicator idle">○</span>`;
    if (step.status === 'active') return html`<span class="step-indicator active"><span class="step-spinner"></span></span>`;
    if (step.status === 'done')   return html`<span class="step-indicator done">✓</span>`;
    return html`<span class="step-indicator error">✕</span>`;
  }

  _renderProgress() {
    if (this._steps.every(s => s.status === 'idle')) return nothing;
    return html`
      <hr class="divider" />
      <div class="progress">
        ${this._steps.map(step => html`
          <div class="step">
            ${this._renderStepIndicator(step)}
            <span class="step-label ${step.status}">${step.label}</span>
          </div>
        `)}
      </div>
    `;
  }

  _renderError() {
    if (!this._error) return nothing;
    return html`<div class="error-box"><strong>Export failed:</strong>\n${this._error}</div>`;
  }

  _renderSuccess() {
    if (!this._done) return nothing;
    return html`
      <div class="success-box">
        <div class="success-icon">✅</div>
        <div class="success-title">Exported successfully!</div>
        <div class="success-sub">Your Markdown file has been saved.</div>
        <br />
        <button class="btn-again" @click=${this._reset}>Export another</button>
      </div>
    `;
  }

  render() {
    const canSubmit = this._url.trim().length > 0 && !this._running;
    return html`
      <div class="card">
        <div class="header">
          <div class="logo-icon">↓</div>
          <h1>ChatGPT → Markdown</h1>
        </div>
        <p class="subtitle">
          Paste a ChatGPT share URL to download the conversation as a <code>.md</code> file.
        </p>

        <div class="form">
          <label>
            ChatGPT Share URL
            <input
              type="url"
              .value=${this._url}
              @input=${e => this._url = e.target.value}
              placeholder="https://chatgpt.com/share/…"
              ?disabled=${this._running}
              autocomplete="off"
              spellcheck="false"
            />
            <span class="input-hint">Any URL starting with <code>https://chatgpt.com/share/</code></span>
          </label>

          <label>
            Output Filename
            <input
              type="text"
              .value=${this._filename}
              @input=${e => this._filename = e.target.value}
              placeholder="chat-export"
              ?disabled=${this._running}
              autocomplete="off"
            />
            <span class="input-hint">Leave blank to use the conversation title. <code>.md</code> is added automatically.</span>
          </label>

          <button
            class="btn-generate"
            ?disabled=${!canSubmit}
            @click=${this._runExport}
          >
            ${this._running
              ? html`<span class="spinner"></span> Exporting…`
              : '⬇ Export to Markdown'}
          </button>
        </div>

        ${this._renderProgress()}
        ${this._renderError()}
        ${this._renderSuccess()}

        <p class="note">
          Runs entirely in your browser or device. No data leaves your machine except
          the request to the ChatGPT share URL.
        </p>
      </div>
    `;
  }
}

customElements.define('chatgpt-markdown-exporter', ChatgptMarkdownExporter);
