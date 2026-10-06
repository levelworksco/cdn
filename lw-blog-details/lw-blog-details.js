import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// Standard "broken/missing image" glyph (picture frame + mountain + sun),
// shown when the hero/body image fails to load.
const IMAGE_PLACEHOLDER_ICON = html`
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="3.5" width="19" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="9" r="1.75" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 16.5l5.5-5.5a1.5 1.5 0 0 1 2.12 0L15 15.38M13.5 13.5l1.88-1.88a1.5 1.5 0 0 1 2.12 0L21 15.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-blog-details>
// Renders a single blog post in full detail view.
//
// ATTRIBUTES (map to --pd-* CSS vars):
//   container-width, container-max-width, container-margin,
//   container-background, title-color, title-font-size,
//   title-font-family, url-color, image-border-radius,
//   image-caption-color, summary-color, meta-label-color,
//   meta-value-color, body-color, body-line-height, body-font-size,
//   section-label-color, section-label-font-size, css-vars
//
// DATA (JS property):
//   el.post = {
//     title, url, image, imageCaption,
//     summary,
//     author, avatar, date, readTime, postType, categories[],
//     tags[],
//     body[] → array of block objects:
//       { type: 'heading',   text }
//       { type: 'paragraph', text }
//       { type: 'image',     src, alt?, caption? }
//   }
// ─────────────────────────────────────────────────────────────

export class LwBlogDetailed extends LitElement {

  static properties = {
    post:    { type: Object  },
    loading: { type: Boolean },

    containerWidth:       { attribute: 'container-width'        },
    containerMaxWidth:    { attribute: 'container-max-width'    },
    containerMargin:      { attribute: 'container-margin'       },
    containerBackground:  { attribute: 'container-background'   },
    titleColor:           { attribute: 'title-color'            },
    titleFontSize:        { attribute: 'title-font-size'        },
    titleFontFamily:      { attribute: 'title-font-family'      },
    urlColor:             { attribute: 'url-color'              },
    imageBorderRadius:    { attribute: 'image-border-radius'    },
    imageCaptionColor:    { attribute: 'image-caption-color'    },
    summaryColor:         { attribute: 'summary-color'          },
    metaLabelColor:       { attribute: 'meta-label-color'       },
    metaValueColor:       { attribute: 'meta-value-color'       },
    bodyColor:            { attribute: 'body-color'             },
    bodyLineHeight:       { attribute: 'body-line-height'       },
    bodyFontSize:         { attribute: 'body-font-size'         },
    sectionLabelColor:    { attribute: 'section-label-color'    },
    sectionLabelFontSize: { attribute: 'section-label-font-size'},
    cssVars:              { attribute: 'css-vars'               },
  };

  attributeChangedCallback(name, _old, value) {
    super.attributeChangedCallback?.(name, _old, value);
    const cssAttrs = [
      'container-max-width', 'container-width', 'container-margin', 'container-background',
      'title-color', 'title-font-size', 'title-font-family',
      'url-color',
      'image-border-radius', 'image-caption-color',
      'summary-color',
      'meta-label-color', 'meta-value-color',
      'body-color', 'body-line-height', 'body-font-size',
      'section-label-color', 'section-label-font-size',
    ];
    if (cssAttrs.includes(name)) this.style.setProperty(`--pd-${name}`, value);
    if (name === 'css-vars' && value) {
      value.split(';').forEach(pair => {
        const [k, ...rest] = pair.split(':');
        if (k && rest.length) this.style.setProperty(k.trim(), rest.join(':').trim());
      });
    }
  }

  constructor() {
    super();
    this.post    = null;
    this.loading = false;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      font-family: var(--lw-ai-results-body-font, 'Inter', sans-serif);
      color: var(--lw-ai-results-body-color, #222);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    p { color: #000; }
    a { color: var(--pd-url-color, #aaa); text-decoration: underline; }
    a:hover { color: #777; }

    .pd-container {
      width:      var(--pd-container-width, 100%);
      max-width:  var(--pd-container-max-width, 720px);
      margin:     var(--pd-container-margin, 0 auto);
      background: var(--pd-container-background, transparent);
    }

    .pd-loading, .pd-empty {
      padding: 3rem 0; text-align: center; color: #bbb; font-size: 0.9rem;
    }

    /* ── Title ── */
    .pd-title {
      font-family: var(--lw-ai-results-title-font, var(--pd-title-font-family, 'Inter', sans-serif));
      font-size:   var(--pd-title-font-size, 2rem);
      font-weight: 700;
      color:       var(--lw-ai-results-title-color, var(--pd-title-color, #111));
      line-height: 1.2;
      margin-bottom: 0.4rem;
    }

    /* ── Canonical URL ── */
    .pd-url {
      font-size: 0.72rem;
      color:     var(--pd-url-color, #aaa) !important;
      margin-bottom: 1rem;
      word-break: break-all;
      display: block;
      text-decoration: underline;
    }
    .pd-url:hover { text-decoration: underline; }

    /* ── Inline meta row (avatar · author · date · read time · category pill) ── */
    .pd-meta-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      font-size: 0.8rem;
      color: #999;
      margin-bottom: 0.75rem;
    }
    .pd-meta-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .pd-meta-author { color: #444; font-weight: 500; }
    .pd-meta-dot    { color: #ccc; }
    .pd-meta-category-pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--lw-ai-results-chip-bg, #fde8d4);
      color: var(--lw-ai-results-chip-color, #e07630);
      font-weight: 500;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    /* ── Tags (comma-separated plain text) ── */
    .pd-tags {
      font-size: 0.8rem;
      font-family: var(--lw-ai-results-body-font, inherit);
      color: var(--lw-ai-results-body-color, #888);
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }

    /* ── Hero image ── */
    .pd-image-wrap {
      width: 100%;
      border-radius: var(--pd-image-border-radius, 8px);
      overflow: hidden;
      margin-bottom: 0.4rem;
      background: #ddd;
      aspect-ratio: 16/7;
    }
    .pd-image-wrap img { width:100%; height:100%; object-fit:cover; display:block; }
    .pd-image-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #e9ecef;
    }
    .pd-image-placeholder svg { width: 22%; height: 22%; color: #adb5bd; }

    .pd-image-caption {
      font-size: 0.68rem;
      color:     var(--pd-image-caption-color, #aaa);
      margin-bottom: 1.5rem;
      text-align: center;
    }

    /* ── Divider ── */
    .pd-divider {
      border: none;
      border-top: 1px solid var(--lw-ai-results-line-color, #e8e8e8);
      margin: 1.4rem 0;
    }

    /* ── Section label ── */
    .pd-section-label {
      font-size:      var(--pd-section-label-font-size, 0.65rem);
      font-weight:    700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family:    var(--lw-ai-results-heading-font, inherit);
      color:          var(--lw-ai-results-heading-color, var(--pd-section-label-color, #aaa));
      margin-bottom:  0.5rem;
    }

    /* ── Summary ── */
    .pd-summary {
      font-size: 16px;
      font-family: var(--lw-ai-results-body-font, inherit);
      color:     var(--lw-ai-results-body-color, var(--pd-summary-color, #000)) !important;
      line-height: 1.7;
    }


    /* ── Body ── */
    .pd-body {
      font-size:   var(--pd-body-font-size,   1rem);
      font-family: var(--lw-ai-results-body-font, inherit);
      color:       var(--lw-ai-results-body-color, #222) !important;
      line-height: var(--pd-body-line-height, 1.8);
    }
    .pd-body p            { margin-bottom: 1.1rem; color: var(--lw-ai-results-body-color, #000) !important; }
    .pd-body p:last-child { margin-bottom: 0; }
    .pd-body strong       { font-weight: 700; }
    .pd-heading {
      font-family: var(--lw-ai-results-heading-font, inherit);
      font-weight: 700;
      font-size:   1.05rem;
      margin: 1.75rem 0 0.6rem;
      color: var(--lw-ai-results-heading-color, #111);
      line-height: 1.3;
    }
    .pd-heading:first-child { margin-top: 0.25rem; }

    /* ── Inline image inside body ── */
    .pd-body-image {
      margin: 0.4rem 0;
      width: 100%;
      border-radius: var(--pd-image-border-radius, 8px);
      overflow: hidden;
    }
    .pd-body-image img {
      width: 100%;
      display: block;
      object-fit: cover;
    }
    .pd-body-image .pd-image-placeholder { aspect-ratio: 16/9; }
    .pd-body-image-caption {
      font-size: 0.68rem;
      color: var(--pd-image-caption-color, #aaa);
      margin-top: 0.3rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
  `;

  _renderBody(body) {
    if (!body?.length) return null;
    return body.map(block => {
      if (block.type === 'heading') {
        return html`<h2 class="pd-heading">${block.text}</h2>`;
      }
      if (block.type === 'image') {
        return html`
          <div class="pd-body-image">
            <img src="${block.src}" alt="${block.alt ?? ''}" loading="lazy"
                 @error=${e => {
                   e.target.style.display = 'none';
                   e.target.nextElementSibling.style.display = 'flex';
                 }} />
            <div class="pd-image-placeholder" style="display:none">${IMAGE_PLACEHOLDER_ICON}</div>
          </div>
          <div class="pd-body-image-caption">
            <a href="${block.src}" target="_blank" rel="noopener noreferrer">${block.src}</a>
          </div>
        `;
      }
      return html`<p>${block.text}</p>`;
    });
  }

  _metaParts(author, avatar, date, readTime, postType) {
    const parts = [];
    if (author) {
      parts.push(html`
        ${avatar ? html`<img class="pd-meta-avatar" src="${avatar}" alt="${author}"
                             @error=${e => { e.target.style.display = 'none'; }} />` : ''}
        <span class="pd-meta-author">${author}</span>
      `);
    }
    if (date)     parts.push(html`<span>${date}</span>`);
    if (readTime) parts.push(html`<span>${readTime}</span>`);
    if (postType) parts.push(html`<span class="pd-meta-category-pill">${postType}</span>`);

    return parts.map((part, i) => html`${i ? html`<span class="pd-meta-dot">•</span>` : ''}${part}`);
  }

  render() {
    if (this.loading) return html`<div class="pd-loading">Loading post…</div>`;
    if (!this.post)  return html`<div class="pd-empty">No post data.</div>`;

    const {
      title, url, image, imageCaption,
      summary, author, avatar, date, readTime,
      postType, categories, tags, body,
    } = this.post;

    return html`
      <div class="pd-container">

        <h1 class="pd-title">${title}</h1>
        ${url ? html`<a class="pd-url" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : ''}

        <!-- Inline meta row. Parts carry a leading "•" only when something
             already precedes them, so a missing date (or author, or read
             time) leaves no stray separator. -->
        <div class="pd-meta-row">
          ${this._metaParts(author, avatar, date, readTime, postType)}
        </div>

        <!-- Tags -->
        ${tags?.length ? html`
          <div class="pd-tags">${tags.join(', ')}</div>
        ` : ''}

        <!-- Hero image -->
        ${image ? html`
          <div class="pd-image-wrap">
            <img src="${image}" alt="${title}" loading="lazy"
                 @error=${e => {
                   e.target.style.display = 'none';
                   e.target.nextElementSibling.style.display = 'flex';
                 }} />
            <div class="pd-image-placeholder" style="display:none">${IMAGE_PLACEHOLDER_ICON}</div>
          </div>
          ${imageCaption ? html`
            <div class="pd-image-caption">
              ${imageCaption.startsWith('http')
                ? html`<a href="${imageCaption}" target="_blank" rel="noopener noreferrer">${imageCaption}</a>`
                : imageCaption}
            </div>` : ''}
        ` : ''}

        ${summary ? html`
          <hr class="pd-divider" />
          <div class="pd-section-label">Summary</div>
          <div class="pd-summary">${summary}</div>
        ` : ''}

        <hr class="pd-divider" />
        <div class="pd-section-label">Body</div>
        <div class="pd-body">
          ${this._renderBody(body)}
        </div>

      </div>
    `;
  }
}

customElements.define('lw-blog-details', LwBlogDetailed);
