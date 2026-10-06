import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-feedback-card>
//
// A small card that asks what someone made of the answer they just read,
// and takes them somewhere useful depending on the reply: a thumbs down
// opens a line to say what was missing, a thumbs up opens a short form to
// book a call. Both end on a confirmation with a way back.
//
// It is written to sit in the corner of something else -- the right-hand
// search panel it was designed for -- so it has no backdrop, no focus
// trap, and never covers the whole screen. The host positions it.
//
// TWO PATHS, BOTH WANTED. In normal use embed-url is set and a hosted
// survey answers for all of this; the steps below are then the fallback,
// and they look unused because they are, until the frame does not load --
// a content policy or a blocker on the reader's side refuses it silently,
// and a lead captured by our own form beats an empty white box. Kept
// deliberately: do not strip them as dead code. The cost is that they ask
// their own questions, so a change to the hosted survey does not reach
// them.
//
// PROPERTIES:
//   open          (Boolean, reflected) — shown at all
//   wide          (Boolean, reflected) — two-column form, for a card
//                             across the foot of a full page
//   heading       (String)  — the question at the top
//   note          (String)  — the line under it
//   positiveLabel (String)  — the 👍 button, attribute positive-label
//   negativeLabel (String)  — the 👎 button, attribute negative-label
//   slots         (Array)   — options in the meeting-slot select, or a
//                             JSON array in the slots attribute
//   submitUrl     (String)  — POSTed the payload as JSON, attribute
//                             submit-url. Optional: with no URL the card
//                             only fires the events below, and the page
//                             (or the backend) decides where it goes.
//   embedUrl      (String)  — a form hosted elsewhere (a Formbricks link
//                             survey, say), attribute embed-url. Set, it
//                             replaces the steps below with that page in
//                             an iframe; the card keeps the close button.
//
// EVENTS (all bubble and cross the shadow boundary):
//   feedback-response — {sentiment}, as soon as 👍/👎 is pressed
//   feedback-submit   — the filled-in payload; a negative reply carries
//                       {sentiment, message}, a positive one
//                       {sentiment, name, email, slot, message}
//   feedback-dismiss  — {step}, the × or Escape, at whatever step
//
// The payload is the same shape whichever way it leaves, so a survey
// backend (Formbricks and the like) can be wired at either end without
// this file changing.
// ─────────────────────────────────────────────────────────────

const STEPS = ['prompt', 'negative', 'positive', 'embed', 'done'];

export class LwFeedbackCard extends LitElement {
  static properties = {
    open:          { type: Boolean, reflect: true },
    // Laid out for a wide card -- the form in two columns -- rather than
    // the narrow column a side panel gives it.
    wide:          { type: Boolean, reflect: true },
    heading:       { type: String },
    note:          { type: String },
    positiveLabel: { type: String, attribute: 'positive-label' },
    negativeLabel: { type: String, attribute: 'negative-label' },
    slots:         { type: Array },
    submitUrl:     { type: String, attribute: 'submit-url' },
    embedUrl:      { type: String, attribute: 'embed-url' },
    embedTimeout:  { type: Number, attribute: 'embed-timeout' },

    _embedFailed: { state: true },

    _step:    { state: true },
    _done:    { state: true },
    _invalid: { state: true },
    _sending: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      /* The accent follows the widget's own Button colour, so the card
         belongs to whatever site it turns up on. */
      --lw-fb-accent: var(--lw-ai-button-bg, var(--lw-ask-accent, #F97316));
      --lw-fb-radius: 14px;
      font-family: var(--lw-ai-question-font, 'Inter', -apple-system,
                   BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif);
      color: #303037;
      -webkit-font-smoothing: antialiased;
    }
    :host(:not([open])) { display: none; }

    .card {
      position: relative;
      background: #ffffff;
      border-radius: var(--lw-fb-radius);
      /* pointing down by default, up when the card is pinned to a foot */
      box-shadow: var(--lw-fb-shadow, 0 10px 30px rgba(16, 18, 27, 0.18));
      padding: var(--lw-fb-padding, 18px 18px 16px);
      /* Long enough to need it, the form scrolls inside the card rather
         than growing past whatever corner it was put in. */
      max-height: var(--lw-fb-max-height, 70vh);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }

    .close {
      position: absolute;
      top: 8px;
      right: 8px;
      appearance: none;
      border: none;
      background: none;
      padding: 4px;
      line-height: 0;
      color: #9aa1a8;
      cursor: pointer;
      border-radius: 6px;
    }
    .close svg { width: 13px; height: 13px; }
    .close:hover { color: #303037; }
    .close:focus-visible { outline: 2px solid var(--lw-fb-accent); outline-offset: 1px; }

    h3 {
      margin: 0 26px 5px 0;
      font-size: 14.5px;
      font-weight: 600;
      line-height: 1.35;
      color: #16161a;
    }
    .note {
      margin: 0 0 14px;
      font-size: 12px;
      line-height: 1.5;
      color: #6b7280;
    }

    /* ── Step one: the two replies ── */
    .choices {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .choice {
      appearance: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      font: inherit;
      font-size: 12px;
      color: #303037;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .choice:hover { border-color: #cfd4da; background: #fafafa; }
    .choice:focus-visible { outline: 2px solid var(--lw-fb-accent); outline-offset: 1px; }
    .choice .emoji { font-size: 17px; line-height: 1; }

    /* ── Steps two: the two forms ── */
    .field { margin-bottom: 11px; }
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .req { color: #dc2626; }
    .opt { font-weight: 400; text-transform: none; letter-spacing: 0; }

    input, select, textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 12.5px;
      color: #303037;
    }
    textarea { min-height: 62px; resize: vertical; }
    input::placeholder, textarea::placeholder { color: #9aa1a8; }
    select { appearance: none; background-image: none; cursor: pointer; }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--lw-fb-accent);
    }
    .is-invalid { border-color: #dc2626; }
    .error {
      margin: 6px 0 0;
      font-size: 11px;
      color: #dc2626;
    }

    .submit {
      appearance: none;
      width: 100%;
      margin-top: 3px;
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      background: var(--lw-fb-accent);
      color: var(--lw-ai-button-color, #ffffff);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .submit:hover { filter: brightness(0.95); }
    .submit:focus-visible { outline: 2px solid currentColor; outline-offset: -3px; }
    .submit[disabled] { opacity: 0.65; cursor: default; filter: none; }

    /* ── Step three: the confirmation ── */
    .done {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 6px 4px 2px;
    }
    .tick {
      width: 46px;
      height: 46px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      /* the accent at a tenth strength, whatever colour it is */
      background: color-mix(in srgb, var(--lw-fb-accent) 12%, #ffffff);
      color: var(--lw-fb-accent);
    }
    .tick svg { width: 20px; height: 20px; }
    .done h3 { margin: 0 0 4px; }
    .done .note { margin-bottom: 14px; }
    .done .submit { width: auto; padding: 8px 22px; }

    /* ── Wide: the card across the foot of a full page ──
       Three short fields in a column, the message beside them, and the
       button under it on the right. Narrow, none of this applies and the
       fields stay in the one column they are written in. */
    :host([wide]) .card {
      padding: var(--lw-fb-padding, 22px 24px 24px);
    }
    :host([wide]) h3 {
      margin: 0 0 20px;
      font-size: 17px;
      text-align: center;
    }
    :host([wide]) .form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        'name    message'
        'slot    message'
        'email   submit';
      gap: 0 30px;
      max-width: var(--lw-fb-wide-max, 760px);
      margin: 0 auto;
    }
    :host([wide]) .f-name    { grid-area: name; }
    :host([wide]) .f-slot    { grid-area: slot; }
    :host([wide]) .f-email   { grid-area: email; }
    :host([wide]) .f-message { grid-area: message; display: flex; flex-direction: column; }
    :host([wide]) .f-message textarea { flex: 1 1 auto; }
    :host([wide]) .f-submit {
      grid-area: submit;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
    }
    :host([wide]) .f-submit .submit { width: auto; padding: 10px 26px; }

    /* The prompt and the note read better centred on a wide card, where a
       left-aligned line would trail off across the page. */
    :host([wide]) .note { text-align: center; }
    :host([wide]) .choices {
      max-width: 420px;
      margin: 0 auto;
    }
    /* A hosted form centres its own card, so across the whole width of a
       page it ends up marooned in white. Held to the width the rest of
       the wide card uses, and given enough height that the survey does
       not scroll inside its own frame. */
    :host([wide]) .embed {
      max-width: var(--lw-fb-wide-max, 760px);
      margin: 0 auto;
      height: var(--lw-fb-embed-height, min(68vh, 620px));
    }

    @media (max-width: 720px) {
      /* No room for two columns; back to the single one. */
      :host([wide]) .form { grid-template-columns: 1fr; grid-template-areas: none; }
      :host([wide]) .f-name, :host([wide]) .f-slot, :host([wide]) .f-email,
      :host([wide]) .f-message, :host([wide]) .f-submit { grid-area: auto; }
      :host([wide]) .f-submit .submit { width: 100%; }
    }

    /* ── A hosted form in place of ours ── */
    .embed {
      display: block;
      width: 100%;
      /* Tall enough for a survey with a few questions on it, and still
         short enough to leave the answer behind it partly visible. */
      height: var(--lw-fb-embed-height, min(62vh, 560px));
      border: 0;
      border-radius: 10px;
      background: #fff;
    }
    .embed-card { padding: 34px 10px 10px; }
  `;

  constructor() {
    super();
    this.open = false;
    this.wide = false;
    this.heading = 'What do you think so far?';
    this.note = 'If DiscoverAI feels useful, continue to see how you can add it to your website.';
    this.positiveLabel = 'This is useful';
    this.negativeLabel = 'Not what I expected';
    this.slots = ['Morning (9am – 12pm)', 'Afternoon (12pm – 4pm)', 'Evening (4pm – 7pm)'];
    this.submitUrl = '';
    this.embedUrl = '';
    this.embedTimeout = 8000;
    this._embedFailed = false;

    this._step = 'prompt';
    this._done = null;
    this._invalid = [];
    this._sending = false;
  }

  /** Back to the opening question, so a reopened card is not mid-form. */
  reset() {
    this._embedFailed = false;
    this._step = this.embedUrl ? 'embed' : 'prompt';
    this._done = null;
    this._invalid = [];
    this._sending = false;
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true,
    }));
  }

  _dismiss = () => {
    this._emit('feedback-dismiss', { step: this._step });
    this.open = false;
  };

  _onKeydown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); this._dismiss(); }
  };

  _choose(sentiment) {
    this._invalid = [];
    this._emit('feedback-response', { sentiment });
    this._step = sentiment === 'positive' ? 'positive' : 'negative';
  }

  _value(id) {
    return (this.renderRoot.querySelector(`#${id}`)?.value ?? '').trim();
  }

  /**
   * Only what the card itself can be sure of: something in the required
   * boxes, and an email with a name, an @ and a dot after it. Anything
   * finer belongs to whatever receives the payload.
   */
  _validate(fields) {
    const missing = fields.filter(f => f.required && !this._value(f.id)).map(f => f.id);
    const email = this._value('email');
    if (fields.some(f => f.id === 'email') && email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      missing.push('email');
    }
    this._invalid = missing;
    return missing.length === 0;
  }

  async _submit(sentiment) {
    const fields = sentiment === 'positive'
      ? [{ id: 'name', required: true }, { id: 'email', required: true },
         { id: 'slot', required: true }, { id: 'message', required: false }]
      : [{ id: 'message', required: true }];
    if (!this._validate(fields)) {
      this.renderRoot.querySelector(`#${this._invalid[0]}`)?.focus();
      return;
    }

    const payload = { sentiment };
    for (const f of fields) payload[f.id] = this._value(f.id);

    this._emit('feedback-submit', payload);

    if (this.submitUrl) {
      this._sending = true;
      try {
        await fetch(this.submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // The answer is already on its way out as an event; a failed POST
        // is the host's problem to retry, not something to show a reader
        // who has just done us a favour.
        console.warn('[lw-feedback-card] could not post the response:', err);
      }
      this._sending = false;
    }

    this._done = sentiment === 'positive' ? 'form' : 'feedback';
    this._step = 'done';
  }

  _renderClose() {
    return html`
      <button class="close" aria-label="Close" @click=${this._dismiss}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 19 5 5M19 5 5 19" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round"/>
        </svg>
      </button>`;
  }

  _renderPrompt() {
    return html`
      <h3>${this.heading}</h3>
      ${this.note ? html`<p class="note">${this.note}</p>` : ''}
      <div class="choices">
        <button class="choice" @click=${() => this._choose('positive')}>
          <span class="emoji" aria-hidden="true">👍</span>
          <span>${this.positiveLabel}</span>
        </button>
        <button class="choice" @click=${() => this._choose('negative')}>
          <span class="emoji" aria-hidden="true">👎</span>
          <span>${this.negativeLabel}</span>
        </button>
      </div>`;
  }

  _renderNegative() {
    const bad = this._invalid.includes('message');
    return html`
      <h3>Sorry to hear that — what were you hoping to see?</h3>
      <div class="field">
        <textarea id="message" class=${bad ? 'is-invalid' : ''}
                  aria-label="What you were looking for"
                  placeholder="Tell us what you were looking for..."></textarea>
        ${bad ? html`<p class="error">Please tell us what you were after.</p>` : ''}
      </div>
      <button class="submit" ?disabled=${this._sending}
              @click=${() => this._submit('negative')}>
        ${this._sending ? 'Sending…' : 'Submit feedback'}
      </button>`;
  }

  /**
   * The order the fields are written in is the order they are read in a
   * narrow card. Wide, the CSS puts the three short ones in one column
   * and the message beside them -- hence the class on each field, which
   * is the only thing that layout has to go on.
   */
  _renderPositive() {
    const bad = id => this._invalid.includes(id) ? 'is-invalid' : '';
    return html`
      <h3>Let's discuss the next steps</h3>
      <div class="form">
        <div class="field f-name">
          <label for="name">Full name <span class="req">*</span></label>
          <input id="name" class=${bad('name')} type="text"
                 autocomplete="name" placeholder="Acme Corp" />
        </div>
        <div class="field f-slot">
          <label for="slot">Preferred meeting slot <span class="req">*</span></label>
          <select id="slot" class=${bad('slot')}>
            <option value="">Select a time</option>
            ${(this.slots ?? []).map(s => html`<option value=${s}>${s}</option>`)}
          </select>
        </div>
        <div class="field f-email">
          <label for="email">Email <span class="req">*</span></label>
          <input id="email" class=${bad('email')} type="email"
                 autocomplete="email" placeholder="you@company.com" />
          ${this._invalid.includes('email')
            ? html`<p class="error">A working email, so we can reach you.</p>` : ''}
        </div>
        <div class="field f-message">
          <label for="message">Message <span class="opt">(optional)</span></label>
          <textarea id="message" placeholder="Your message..."></textarea>
        </div>
        <div class="f-submit">
          <button class="submit" ?disabled=${this._sending}
                  @click=${() => this._submit('positive')}>
            ${this._sending ? 'Sending…' : 'Schedule a call'}
          </button>
        </div>
      </div>`;
  }

  /**
   * A form hosted elsewhere -- a Formbricks link survey, or anything
   * else with a URL -- in the same corner our own steps use. It replaces
   * the flow rather than joining it: the hosted form asks its own
   * questions. The card still owns the close button, since an iframe
   * cannot be trusted to give one.
   *
   * Nothing here listens for "they finished": that signal is specific to
   * whatever is embedded, so it is wired once the form is known.
   *
   * If the frame has not loaded by embedTimeout the card falls back to
   * its own steps. A content policy or a blocker on the reader's side
   * refuses the frame silently -- there is no error to catch across
   * origins -- and an empty white box is worse than the plain form.
   */
  _renderEmbed() {
    clearTimeout(this._embedTimer);
    this._embedTimer = setTimeout(() => {
      if (this._step !== 'embed') return;
      console.warn('[lw-feedback-card] the embedded form did not load; ' +
                   'falling back to the built-in one:', this.embedUrl);
      this._embedFailed = true;
      this._step = 'prompt';
    }, this.embedTimeout);

    return html`
      <iframe class="embed" src=${this.embedUrl} title=${this.heading}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              referrerpolicy="no-referrer-when-downgrade"
              @load=${() => clearTimeout(this._embedTimer)}></iframe>`;
  }

  _renderDone() {
    const form = this._done === 'form';
    return html`
      <div class="done">
        <div class="tick" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 13 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.4"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>${form ? 'Form Submitted!' : 'Feedback Submitted!'}</h3>
        <p class="note">
          ${form
            ? html`Thanks for filling up the form,<br />we'll get back to you soon.`
            : html`Thanks for sharing your<br />feedback with us.`}
        </p>
        <button class="submit" @click=${this._dismiss}>Go back</button>
      </div>`;
  }

  /**
   * embed-url takes the card over from the first render, not only from
   * reset(), so a card opened before reset() runs shows the right thing.
   * Settled here rather than in render() because the timeout below has
   * to be able to ask which step the card is really on.
   */
  willUpdate() {
    if (this.embedUrl && !this._embedFailed && this._step === 'prompt') {
      this._step = 'embed';
    } else if ((!this.embedUrl || this._embedFailed) && this._step === 'embed') {
      this._step = 'prompt';
    }
  }

  render() {
    const step = STEPS.includes(this._step) ? this._step : 'prompt';
    const body = {
      prompt:   () => this._renderPrompt(),
      negative: () => this._renderNegative(),
      positive: () => this._renderPositive(),
      embed:    () => this._renderEmbed(),
      done:     () => this._renderDone(),
    }[step];

    return html`
      <div class="card ${step === 'embed' ? 'embed-card' : ''}"
           role="region" aria-label="Feedback"
           @keydown=${this._onKeydown}>
        ${this._renderClose()}
        ${body()}
      </div>`;
  }
}

if (!customElements.get('lw-feedback-card')) {
  customElements.define('lw-feedback-card', LwFeedbackCard);
}
