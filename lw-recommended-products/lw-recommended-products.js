import { LitElement, html, css, nothing }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// COMPONENT: <lw-recommended-products>
//
// A row of product cards. Up to `per-row` cards sit side by side; once
// there are more products than fit, the row becomes a slider (arrows plus
// swipe/scroll). On narrow spaces, such as the side panel or a phone, fewer
// cards fit per row, so the slider starts sooner.
//
// PROPERTIES:
//   heading           (String)  — title above the row, default "Recommended Products"
//   products          (Array)   — [{ id, title, image, price, description, url }]
//   per-row           (Number)  — most cards in view at once, default 4
//   currency          (String)  — put before a numeric price, default "Rs."
//   show-description  (Boolean) — card description,  default false
//   show-price        (Boolean) — card price,        default true
//   show-add-to-cart  (Boolean) — "Add to cart" button, default true
//
//   The three show-* flags are switched off with show-price="false" and so on.
//
// EVENTS:
//   product-click — detail: { product }   the card (image or title) was opened
//   add-to-cart   — detail: { product }   the button was pressed. The button
//                   does nothing else yet: the host decides what a cart is.
// ─────────────────────────────────────────────────────────────

// An attribute is "on" unless it says "false"; with a plain Boolean type a
// default-true flag could never be turned off from markup.
const flag = {
  fromAttribute: value => value !== 'false',
  toAttribute: value => (value ? 'true' : 'false'),
};

const MIN_CARD_WIDTH = 150;   // px — fewer cards per row below this
const GAP = 16;               // px — keep in step with --gap in the styles

export class LwRecommendedProducts extends LitElement {

  static properties = {
    heading:         { type: String },
    products:        { type: Array },
    perRow:          { type: Number, attribute: 'per-row' },
    currency:        { type: String },
    showDescription: { converter: flag, attribute: 'show-description' },
    showPrice:       { converter: flag, attribute: 'show-price' },
    showAddToCart:   { converter: flag, attribute: 'show-add-to-cart' },
    _cols:           { state: true },
    _atStart:        { state: true },
    _atEnd:          { state: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #3c3c3c;
      -webkit-font-smoothing: antialiased;
      --gap: 16px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    h3 {
      margin: 0 0 14px;
      font-size: var(--lw-recommended-heading-size, var(--lw-overview-heading-size, 24px));
      font-weight: 700;
      font-family: var(--lw-ai-results-heading-font, inherit);
      color: var(--lw-ai-results-heading-color, #1a1a1a);
    }

    .viewport { position: relative; }

    .track {
      display: flex;
      gap: var(--gap);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      /* room for the cards' shadow, so it is not clipped by the scroller */
      padding: 4px 2px 14px;
      margin: 0 -2px;
    }
    .track::-webkit-scrollbar { display: none; }

    .card {
      flex: 0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols));
      min-width: 0;
      display: flex;
      flex-direction: column;
      scroll-snap-align: start;
      border-radius: 14px;
      background: var(--lw-product-card-bg, #ffffff);
      box-shadow: 0 2px 12px rgba(16, 18, 27, 0.10);
      overflow: hidden;
    }

    .media {
      display: block;
      aspect-ratio: 4 / 5;
      background: rgba(128, 128, 128, 0.12);
      overflow: hidden;
    }
    .media img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 12px 16px;
      text-align: center;
    }

    .title {
      font-size: 14px;
      font-weight: 500;
      line-height: 1.35;
      color: var(--lw-ai-results-title-color, #1a1a1a);
      text-decoration: none;
      /* two lines, then an ellipsis, so cards in a row stay level */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .title:hover { text-decoration: underline; }

    .price {
      font-size: 14px;
      font-weight: 500;
      color: var(--lw-product-price-color, #4b5563);
    }

    .desc {
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--lw-ai-results-body-color, #68686C);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .cart {
      appearance: none;
      /* at the foot of every card, however tall the text above it */
      margin-top: auto;
      padding: 9px 18px;
      border: none;
      border-radius: 999px;
      background: var(--lw-ai-button-bg, var(--lw-ask-accent, #1A1A1A));
      color: var(--lw-ai-button-color, #ffffff);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s;
    }
    .cart:hover { filter: brightness(0.92); }
    .cart:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

    .arrow {
      appearance: none;
      position: absolute;
      top: calc(50% - 20px);
      z-index: 2;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: #ffffff;
      color: #1a1a1a;
      box-shadow: 0 2px 10px rgba(16, 18, 27, 0.22);
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    .arrow:hover { transform: scale(1.06); }
    .arrow svg { width: 18px; height: 18px; }
    .arrow.prev { left: -10px; }
    .arrow.next { right: -10px; }
    .arrow[hidden] { display: none; }
    .arrow:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

    @media (prefers-reduced-motion: reduce) {
      .track { scroll-behavior: auto; }
    }
  `;

  constructor() {
    super();
    this.heading         = 'Recommended Products';
    this.products        = [];
    this.perRow          = 4;
    this.currency        = 'Rs.';
    this.showDescription = false;
    this.showPrice       = true;
    this.showAddToCart   = true;
    this._cols    = 4;
    this._atStart = true;
    this._atEnd   = false;
    this._resizer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (window.ResizeObserver) {
      this._resizer = new ResizeObserver(() => this._fitColumns());
      this._resizer.observe(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizer?.disconnect();
    this._resizer = null;
  }

  firstUpdated() {
    this._fitColumns();
  }

  updated(changed) {
    if (changed.has('products') || changed.has('perRow') || changed.has('_cols')) {
      this._syncArrows();
    }
  }

  /** As many cards per row as the width allows, up to `per-row`. */
  _fitColumns() {
    const width = this.getBoundingClientRect().width;
    if (!width) return;
    const max = Math.max(1, Math.floor(this.perRow) || 4);
    const fit = Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP));
    const cols = Math.max(1, Math.min(max, fit));
    if (cols !== this._cols) this._cols = cols;
  }

  get _isSlider() {
    return (this.products?.length ?? 0) > this._cols;
  }

  get _track() {
    return this.renderRoot?.querySelector('.track');
  }

  _syncArrows() {
    const track = this._track;
    if (!track) return;
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    if (atStart !== this._atStart) this._atStart = atStart;
    if (atEnd !== this._atEnd) this._atEnd = atEnd;
  }

  /** One screenful at a time: the cards in view slide out, the next ones in. */
  _page(direction) {
    const track = this._track;
    if (!track) return;
    track.scrollBy({ left: direction * (track.clientWidth + GAP), behavior: 'smooth' });
  }

  _formatPrice(price) {
    if (price == null || price === '') return '';
    // Already text such as "Rs. 10" or "$12.00": shown as it came.
    if (typeof price === 'string' && /[^\d.,\s]/.test(price)) return price;
    const value = Number(String(price).replace(/,/g, ''));
    if (Number.isNaN(value)) return String(price);
    const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
    return this.currency ? `${this.currency} ${text}` : text;
  }

  _emit(name, product) {
    this.dispatchEvent(new CustomEvent(name, {
      detail: { product },
      bubbles: true,
      composed: true,
    }));
  }

  _renderCard(product) {
    const href = product.url || null;
    const open = () => this._emit('product-click', product);
    const price = this.showPrice ? this._formatPrice(product.price) : '';

    return html`
      <article class="card">
        <a class="media" href=${href ?? nothing} target=${href ? '_blank' : nothing}
           rel=${href ? 'noopener noreferrer' : nothing} tabindex="-1" aria-hidden="true"
           @click=${open}>
          ${product.image
            ? html`<img src=${product.image} alt="" loading="lazy" />`
            : nothing}
        </a>
        <div class="body">
          <a class="title" href=${href ?? nothing} target=${href ? '_blank' : nothing}
             rel=${href ? 'noopener noreferrer' : nothing} @click=${open}>${product.title}</a>
          ${price ? html`<span class="price">${price}</span>` : nothing}
          ${this.showDescription && product.description
            ? html`<p class="desc">${product.description}</p>` : nothing}
          ${this.showAddToCart
            ? html`<button class="cart" type="button"
                           @click=${() => this._emit('add-to-cart', product)}>Add to cart</button>`
            : nothing}
        </div>
      </article>`;
  }

  render() {
    const products = this.products ?? [];
    if (!products.length) return nothing;

    const slider = this._isSlider;
    const chevron = d => html`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${d}/></svg>`;

    return html`
      ${this.heading ? html`<h3>${this.heading}</h3>` : nothing}
      <div class="viewport">
        <button class="arrow prev" aria-label="Previous products"
                ?hidden=${!slider || this._atStart}
                @click=${() => this._page(-1)}>${chevron('M15 5l-7 7 7 7')}</button>
        <div class="track" style="--cols:${this._cols}"
             role=${slider ? 'region' : nothing}
             aria-label=${slider ? this.heading || 'Products' : nothing}
             @scroll=${this._syncArrows}>
          ${products.map(product => this._renderCard(product))}
        </div>
        <button class="arrow next" aria-label="Next products"
                ?hidden=${!slider || this._atEnd}
                @click=${() => this._page(1)}>${chevron('M9 5l7 7-7 7')}</button>
      </div>`;
  }
}

if (!customElements.get('lw-recommended-products')) {
  customElements.define('lw-recommended-products', LwRecommendedProducts);
}
