# lw-web-components

A collection of Lit-based web components for the Levelworks blog platform. Built with [Lit](https://lit.dev/) via CDN — no build step required.

---

## Components

| Component | Tag | Description |
|---|---|---|
| [lw-blog](lw-blog/) | `<lw-blog>` | **Unified entry point** — composes all blog components into one tag |
| [lw-header](lw-header/) | `<lw-header>` | Site header with logo and Sign In button |
| [lw-insights-bar](lw-insights-bar/) | `<lw-insights-bar>` | Stats bar (blogs, searches, updated) with collapsible View Insights panel |
| [lw-blog-search](lw-blog-search/) | `<lw-blog-search>` | Search input with semantic ratio slider and search-time display |
| [lw-blog-list](lw-blog-list/) | `<lw-blog-list>` | Blog post list/grid with infinite scroll, dynamic category sidebar, and sort dropdown |
| [lw-blog-list-item](lw-blog-list-item/) | `<lw-blog-list-item>` | Individual blog post card (list or grid view) |
| [lw-blog-details](lw-blog-details/) | `<lw-blog-details>` | Full blog post detail view |
| [lw-summary](lw-summary/) | `<lw-summary>` | Overview section with citation hover cards |
| [lw-settings](lw-settings/) | `<lw-settings>` | Slide-out settings drawer for configuring search parameters |
| [lw-slider](lw-slider/) | `<lw-slider>` | Reusable range slider primitive used by `<lw-settings>` |
| [lw-ask-our-blog](lw-ask-our-blog/) | `<lw-ask-our-blog>` | Button that expands on hover into suggested questions, each opening the `<lw-ai-search>` modal |
| [lw-ai-search](lw-ai-search/) | `<lw-ai-search>` | Full-screen AI search modal with its own trigger button |
| [lw-ai-search](lw-ai-search/) | `<lw-ai-search>` | Launcher button that opens a full-screen AI search modal with results |

---

## Demo Page

Open `lw-blog/lw-blog.html` to see the full assembled page.

```
http://localhost:3000/lw-blog/lw-blog
```

---

## Local Development

A local proxy server is required to bypass CORS when calling the search API.

**Start the proxy:**
```bash
node proxy-server.js
```

The server runs on `http://localhost:3000` and does two things:
- Serves all static files (HTML/JS)
- Forwards `/api/*` requests to the DiscoverAI search backend (avoids CORS)

> `proxy-server.js` is excluded from git (see `.gitignore`) — it is for local dev only.

---

## Search API

Components connect to the DiscoverAI search API:

| Setting | Value |
|---|---|
| Endpoint | `POST /api/v1/search/all` |
| Auth | `X-API-KEY` header |
| Features | Full-text search, semantic ratio, category filter, infinite pagination |

---

## Quick Start — single tag

The `<lw-blog>` component is the recommended way to embed the full blog experience. It renders `<lw-insights-bar>`, `<lw-header>`, `<lw-blog-search>`, and `<lw-blog-list>` internally and wires all events automatically. No extra JavaScript needed.

```html
<lw-blog
  base-url="/api/v1/search/all"
  api-key="YOUR_API_KEY"
  detail-url="/lw-blog-details/lw-blog-details"
  demo-note="Demoing content & AI search functionality only. Demo not intended to visually match source site."
  blogs="124"
  updated="25 Jun 2026"
  searches="31.5K"
  unblocked="95%"
  logo-src="/assets/logo.png"
  branding-logo-src="/assets/branding-logo.png"
  logo-href="/"
  search-placeholder="Search articles…"
  slider-max="1"
  slider-step="0.1"
  style="--blog-search-top: 40px; --pl-sidebar-top: 155px;"
></lw-blog>

<script type="module">
  import './lw-blog/lw-blog.js';
</script>
```

---

## Component Reference

### `<lw-blog>` — unified component

All props from every child component are available directly on `<lw-blog>`.

**Insights bar**

| Attribute | Description | Default |
|---|---|---|
| `demo-note` | Left-side label text | Built-in demo message |
| `blogs` | Blogs stat value | `"87"` |
| `updated` | Updated stat value | `"18 Jun 2026"` |
| `searches` | Searches stat value | `"14.2K"` |
| `unblocked` | Searches Unblocked stat value | `"92%"` |

**Header**

| Attribute | Description | Default |
|---|---|---|
| `logo-src` | Logo image URL; shows a placeholder if missing or broken | — |
| `branding-logo-src` | Separate logo URL used inside the insights bar | — |
| `logo-href` | Logo link target | `"/"` |

**API / navigation**

| Attribute | Description |
|---|---|
| `base-url` | Search API endpoint |
| `api-key` | `X-API-KEY` header value |
| `detail-url` | Page navigated to when a post is clicked |
| `query-param` | URL key read on load to seed the search box, default `q` — receives questions from `<lw-ask-our-blog>` |

**Search bar**

| Attribute | Description | Default |
|---|---|---|
| `search-placeholder` | Input placeholder text | `"Search"` |
| `slider-max` | Semantic ratio slider maximum | `1` |
| `slider-step` | Semantic ratio slider step | `0.1` |
| `slider-label` | Label shown left of the slider | — |

**List**

| Attribute | Description | Default |
|---|---|---|
| `default-view` | Initial layout — `list` or `grid` | `"list"` |
| `default-sort` | Initial sort key | `"newest"` |

**CSS variables**

| Variable | Description | Default |
|---|---|---|
| `--blog-page-max-width` | Max width of the content area | `960px` |
| `--blog-page-padding` | Padding of the content area | `0 2rem 4rem` |
| `--blog-search-top` | Sticky top offset for the search bar | `40px` |
| `--pl-sidebar-top` | Sticky top offset for the category sidebar | `1rem` |

---

### `<lw-header>`

| Attribute | Description | Default |
|---|---|---|
| `logo-src` | Logo image URL; shows a placeholder if missing or broken | — |
| `branding-logo-src` | Separate logo URL used inside the insights bar | — |
| `logo-href` | Logo link target | `"/"` |

```html
<lw-header
  logo-src="/assets/logo.png"
  branding-logo-src="/assets/branding-logo.png"
  logo-href="/">
</lw-header>
```

If `logo-src` is omitted or the image fails to load, a placeholder box labelled **"Logo here"** is shown automatically.

---

### `<lw-insights-bar>`

| Attribute | Description |
|---|---|
| `demo-note` | Left-side label text |
| `logo-src` | Logo image URL shown inside the bar |
| `blogs` | Blogs stat value |
| `updated` | Updated stat value |
| `searches` | Searches stat value |
| `unblocked` | Searches Unblocked stat value |

```html
<lw-insights-bar
  blogs="124"
  updated="25 Jun 2026"
  searches="31.5K"
  unblocked="95%"
  demo-note="Demoing content & AI search functionality only.">
</lw-insights-bar>
```

---

### `<lw-blog-search>`

```html
<lw-blog-search
  placeholder="Search articles…"
  slider-max="1"
  slider-step="0.1"
  slider-label="Semantic">
</lw-blog-search>
```

Events fired: `search-change` (`detail.value`), `slider-change` (`detail.value`)

---

### `<lw-blog-list>`

Self-fetching — posts and categories are derived from the API automatically. No data needs to be passed in.

```html
<lw-blog-list
  base-url="/api/v1/search/all"
  api-key="YOUR_API_KEY"
  detail-url="/lw-blog-details/lw-blog-details"
  default-view="list"
  default-sort="newest">
</lw-blog-list>
```

**Category sidebar** is built dynamically from the fetched results. Each category's total count is resolved via a parallel lightweight API call (`limit: 1`) and cached — no repeated requests on scroll.

Events fired: `search-time-update` (`detail.ms`), `lw-category-change` (`detail.category`)

---

### `<lw-blog-details>`

Renders a single blog post in full detail view. Data is passed as a JS property.

```js
document.querySelector('lw-blog-details').post = {
  title, url, image, imageCaption,
  summary,
  author, avatar, date, readTime, postType,
  categories: [],
  tags: [],
  body: [
    { type: 'heading',   text: '...' },
    { type: 'paragraph', text: '...' },
    { type: 'image',     src: '...', alt: '...', caption: '...' },
  ]
};
```

**Styling attributes** (each maps to a `--pd-*` CSS variable):

| Attribute | Description |
|---|---|
| `container-width` | Width of the content container |
| `container-max-width` | Max width of the content container |
| `container-margin` | Margin of the content container |
| `container-background` | Background colour |
| `title-color` | Post title colour |
| `title-font-size` | Post title font size |
| `title-font-family` | Post title font family |
| `url-color` | Link colour |
| `image-border-radius` | Hero image border radius |
| `image-caption-color` | Image caption colour |
| `summary-color` | Summary text colour |
| `meta-label-color` | Meta label colour (Author, Date, etc.) |
| `meta-value-color` | Meta value colour |
| `body-color` | Body text colour |
| `body-line-height` | Body line height |
| `body-font-size` | Body font size |
| `section-label-color` | Section heading colour |
| `section-label-font-size` | Section heading font size |
| `css-vars` | Inline `--var: value; --var: value` pairs for bulk overrides |

---

### `<lw-summary>`

Overview section with optional citation hover cards.

| Property | Type | Description | Default |
|---|---|---|---|
| `heading` | String | Section title | `"Overview"` |
| `displayCitations` | String | `'none'` \| `'number'` \| `'chip'` \| `'link'` | `'chip'` |
| `paragraphs` | Array | Array of paragraph objects (see below) | `[]` |

**Paragraph object shape:**
```js
{
  text: String,
  citation?: {
    label: String,
    articles: [{ title, excerpt, image, url }]
  }
}
```

```js
document.querySelector('lw-summary').paragraphs = [
  {
    text: 'Children learn best through play.',
    citation: {
      label: 'Source 1',
      articles: [{ title: 'Play & Learning', excerpt: '...', image: '/img.jpg', url: '/post/1' }]
    }
  }
];
```

---

### `<lw-settings>`

Slide-out settings drawer.

| Property | Type | Description | Default |
|---|---|---|---|
| `open` | Boolean | Controls drawer open/closed state | `false` |
| `width` | String | Drawer width | `"300px"` |
| `top` | String | Top offset (CSS value) | — |

CSS variables: `--lw-drawer-top`, `--lw-drawer-width`

Events fired: `settings-open`, `settings-close`

---

### `<lw-slider>`

Reusable range slider primitive.

| Property | Type | Description | Default |
|---|---|---|---|
| `value` | Number | Current value | `0.5` |
| `min` | Number | Minimum value | `0` |
| `max` | Number | Maximum value | `10` |
| `step` | Number | Step increment | `0.1` |
| `label` | String | Label shown left of the slider | `""` |

```html
<lw-slider value="0.5" min="0" max="1" step="0.1" label="Semantic"></lw-slider>
```

Event fired: `slider-change` (`detail.value`)

---

### `<lw-ask-our-blog>`

A button that expands on hover into a stack of suggested questions plus a primary
CTA. `btn-type` decides how it sits on the page:

- **`float`** (default) — pinned to the bottom-right of the viewport, panel
  opening upward above the button.
- **`normal`** — a plain labelled button in normal document flow, placeable
  anywhere on a page. No hover and no question panel: pressing it goes straight
  to `href`, the same way `<lw-ai-search>` works. `questions`, `trigger` and the
  panel attributes do not apply.

In `float` mode the panel is sticky — it stays open after the pointer leaves, and
only the close icon (or Escape) hides it. Clicking the circle navigates to `href`.
Where there is no hover (touch devices, or `trigger="click"`) the first press
opens the panel and the next one follows the link.

Nothing navigates away. The button, the CTA and every question open the
`<lw-ai-search>` modal on the same page — a question runs its search straight
away, the button and CTA open it empty. This component never calls the search API
itself; the modal does.

`<lw-ai-search>` must be loaded on the page. It is deliberately **not** imported
by `<lw-ask-our-blog>`, so a site can keep using its own copy without a duplicate
custom-element definition:

```html
<script type="module" src="/lw-ask-our-blog/lw-ask-our-blog.js"></script>
<script type="module" src="/lw-ai-search/lw-ai-search.js"></script>
```

If the page has no `<lw-ai-search>` element, a hidden one is created for its
modal, with `search-base` / `search-key` / `search-index` forwarded from this tag;
its own trigger button is suppressed through `::part(ai-search-container)`. If the
`<lw-ai-search>` script is missing entirely, clicks fall back to `href` with the
question in the query string, which `<lw-blog>` reads on load — see its
`query-param` attribute.

| Property | Type | Description | Default |
|---|---|---|---|
| `search-base` | String | Search API origin, forwarded to the modal | `""` |
| `search-key` | String | `X-API-KEY` value, forwarded to the modal | `""` |
| `search-index` | String | Index to search, forwarded to the modal | `"all"` |
| `search-target` | String | CSS selector for the `<lw-ai-search>` to open | `"lw-ai-search"` |
| `href` | String | Fallback page, used only when `<lw-ai-search>` is not loaded | `""` |
| `target` | String | Link target for `href`, e.g. `"_blank"` | `""` |
| `query-param` | String | Query key the question is passed in | `"q"` |
| `questions` | Array | Suggestion strings, top to bottom — **max 4**, extras ignored | `[]` |
| `cta-label` | String | Primary button label — the CTA always renders, with or without questions | `"Ask Our Blog"` |
| `cta-href` | String | Renders the CTA as a link when set | `""` |
| `cta-target` | String | Link target for `cta-href` | `""` |
| `trigger` | String | `"hover"` or `"click"` | `"hover"` |
| `btn-type` | String | `"float"` pins the circle to the viewport corner; `"normal"` renders a plain labelled button in flow | `"float"` |
| `btn-label` | String | Label for the `normal` button | `"Search with AI"` |
| `btn-subtext` | String | Optional line under the `normal` button | `""` |
| `open` | Boolean | Panel state, reflected as an attribute | `false` |
| `label` | String | aria-label for the floating button | `"Ask our blog"` |

```html
<lw-ask-our-blog
  search-base="https://discoverai.levelworks.co"
  search-key="YOUR_API_KEY"
  search-index="all"
  href="/lw-blog/lw-blog"
  cta-href="/lw-blog/lw-blog"
  questions='["How long does it take to integrate?",
              "Does it work with Webflow?",
              "Can I see a live demo?",
              "How does AI Search work on my website?"]'
  style="--lw-ask-accent: #1E7A4A;"
></lw-ask-our-blog>
```

Questions come from the tag only — there are no built-in defaults. Up to four can
be set. Anything past the fourth is dropped
(with a console warning). The **Ask Our Blog** button is not one of the four — it
always renders below them, and `cta-label` only changes its wording.

CSS variables — shared: `--lw-ask-accent`, `--lw-ask-accent-hover`.
`float` only: `--lw-ask-size`, `--lw-ask-right`, `--lw-ask-bottom`, `--lw-ask-z`,
`--lw-ask-close`. `normal` only: `--lw-ask-btn-padding`, `--lw-ask-btn-radius`,
`--lw-ask-btn-font-size`, `--lw-ask-btn-icon-size`, `--lw-ask-btn-gap`,
`--lw-ask-btn-width`, `--lw-ask-subtext-color`, `--lw-ask-subtext-font-size`,
`--lw-ask-subtext-margin-top`.

```html
<!-- normal: a plain button, placed wherever you want it -->
<lw-ask-our-blog
  btn-type="normal"
  btn-label="Search with AI"
  btn-subtext="Ask anything to find relevant blogs"
  href="/lw-blog/lw-blog"
  style="--lw-ask-accent: #f58220; --lw-ask-accent-hover: #d16e19;"
></lw-ask-our-blog>
```

For a full-width button set the width on the tag itself
(`style="width: 100%; --lw-ask-btn-width: 100%"`).

Events fired: `lw-ask-question` (`detail.question`, `detail.index`, `detail.href` —
cancelable, so a listener can handle the query in place instead of navigating),
`lw-ask-cta` (cancelable), `lw-ask-navigate` (`detail.href`, cancelable — fired
when the button is pressed, before the modal opens), `lw-ask-modal-open`
(`detail.query`, `detail.target` — after the modal is asked to open),
`lw-ask-toggle` (`detail.open`)

---

### `<lw-ai-search>`

A launcher button in normal document flow plus the full-screen AI search modal it
opens. Unlike `<lw-ask-our-blog>`, which hands the query to another page, this
component calls the search API itself and renders the results in the modal.

Typing debounces at 350 ms but only refetches once a search has been **committed
with Enter** — the first Enter swaps the modal from its centred hero layout to the
scrolling results layout. Scrolling near the bottom prefetches the next page
(20 per page). Opening pushes a history entry, so the browser back gesture closes
the modal; Escape and a click on the backdrop close it too.

While connected, the component registers `window.openAISearch()`, so any other
button on the page can open the modal.

| Property | Type | Description | Default |
|---|---|---|---|
| `search-base` | String | Search API origin | `"https://discoverai.levelworks.co"` |
| `search-key` | String | `X-API-KEY` value | `""` |
| `search-index` | String | Index to search | `"all"` |
| `btn-label` | String | Button label | `"Search with AI"` |
| `btn-subtext` | String | Line under the button | `"Ask anything to find relevant blogs"` |

```html
<lw-ai-search
  search-base="https://discoverai.levelworks.co"
  search-key="YOUR_API_KEY"
  search-index="All"
  btn-label="Search with AI"
  btn-subtext="Ask anything to find relevant blogs"
></lw-ai-search>
```

**Styling.** Every remaining attribute is mapped onto a `--lw-<attribute>` custom
property on the host, and the stylesheet reads it as `var(--lw-<attribute>, default)`
— so the default lives in CSS and the attribute only overrides when it is set.

- Button: `btn-width`, `btn-height`, `btn-padding`, `btn-background`,
  `btn-hover-background`, `btn-color`, `btn-border-radius`, `btn-font-size`,
  `btn-font-weight`, `btn-icon-size`, `btn-gap`, `btn-subtext-color`,
  `btn-subtext-font-size`, `btn-subtext-margin-top`
- Container: `container-text-align`, `container-display`, `container-align-items`,
  `container-justify-content`, `container-flex-direction`, `container-gap`,
  `container-padding`, `container-margin`, `container-width`
- `css-vars` — freeform escape hatch, `"key:val; key:val"`, set straight onto the host

```html
<lw-ai-search
  search-key="YOUR_API_KEY"
  btn-label="Ask the blog"
  btn-background="#1E7A4A"
  btn-hover-background="#17603A"
  btn-border-radius="999px"
  container-text-align="left"
  container-width="280px"
></lw-ai-search>
```

Shadow parts: `ai-search-container`, `ai-search-btn`, `inner-container`,
`btn-icon`, `ai-search-subtext`.

---

### `<lw-ai-search>`

Full-screen AI search modal: a trigger button, a hero with the search field and
feature cards, then results with infinite scroll. `<lw-ask-our-blog>` drives it
through `open()` and `openWithQuery(query)`.

| Attribute | Description | Default |
|---|---|---|
| `search-base` | API origin; empty for a same-origin/proxied call | `"https://discoverai.levelworks.co"` |
| `search-key` | `X-API-KEY` header value | `""` |
| `search-index` | Index to search | `"all"` |
| `btn-label` | Trigger button label | `"Search with AI"` |
| `btn-subtext` | Line under the trigger button | `"Ask anything to find relevant blogs"` |

Every `btn-*` and `container-*` attribute is mapped to a `--lw-<name>` CSS
variable on the host, and `css-vars="key:val; key:val"` sets arbitrary ones.

```html
<lw-ai-search
  search-base="https://discoverai.levelworks.co"
  search-key="YOUR_API_KEY"
  search-index="All"
  btn-label="Search with AI"
  btn-subtext="Ask anything to find relevant blogs"
></lw-ai-search>
```

---

## Tech Stack

- **[Lit 3](https://lit.dev/)** — web components via CDN, no build step
- **Shadow DOM** — scoped styles per component
- **Custom Events** — cross-component communication
- **IntersectionObserver** — infinite scroll
- **SessionStorage** — passing post data to the detail page

---

## Branch

Active development happens on the `raj-web-component` branch.
