import { html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

// ─────────────────────────────────────────────────────────────
// SHARED: FlowToken-style reveal animations.
//
// The same effects <lw-blog-overview> uses for the AI answer, packaged so the
// rest of the results (headings, product cards, blog cards) can come in the
// same way. Nothing here is a component; it is a stylesheet and a helper.
//
// USAGE (inside a Lit component):
//   static styles = [flowStyles, css`…`];
//   ${flowWords('Related Blogs', 'fadeIn')}                      // a heading
//   <div class="fc fadeIn" style="--i:2">…</div>                  // a card
//
// Names: 'fadeIn' | 'blurIn' | 'slideUp' | 'dropIn' | 'fadeAndScale' |
//        'blurAndSharpen' | 'highlight'
//
// TIMING (all optional CSS custom properties, set on the host or any ancestor):
//   --lw-flow-duration   length of one effect                    (0.6s)
//   --lw-flow-ease       timing function                         (ease-out)
//   --lw-flow-base       delay before the whole block starts     (0ms)
//   --lw-flow-step       gap between successive words            (55ms)
//   --lw-flow-head       pause between a heading and its cards   (160ms)
//   --lw-flow-card-step  gap between successive cards            (90ms)
//
// `fill-mode: backwards` (not `both`) on purpose: once the effect has played
// the element goes back to its own styles, so a card's hover transform or
// shadow is not pinned by the animation's last frame.
// ─────────────────────────────────────────────────────────────

export const FLOW_ANIMATIONS = [
  'fadeIn', 'blurIn', 'slideUp', 'dropIn', 'fadeAndScale', 'blurAndSharpen', 'highlight',
];

/** The animation name when it is a known one, otherwise '' (no animation). */
export const flowName = (name) => (FLOW_ANIMATIONS.includes(name) ? name : '');

export const flowStyles = css`
  @keyframes lw-flow-fadeIn         { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lw-flow-blurIn         { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: blur(0); } }
  @keyframes lw-flow-slideUp        { from { opacity: 0; transform: translateY(0.6em); } to { opacity: 1; transform: none; } }
  @keyframes lw-flow-dropIn         { from { opacity: 0; transform: translateY(-0.6em); } to { opacity: 1; transform: none; } }
  @keyframes lw-flow-fadeAndScale   { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: none; } }
  @keyframes lw-flow-blurAndSharpen { from { opacity: 0; filter: blur(8px); transform: scale(1.1); } to { opacity: 1; filter: blur(0); transform: none; } }
  @keyframes lw-flow-highlight      { from { background: rgba(255, 213, 79, 0.55); } to { background: transparent; } }

  /* a word of a heading */
  .fw {
    display: inline-block;
    animation-duration: var(--lw-flow-duration, 0.6s);
    animation-timing-function: var(--lw-flow-ease, ease-out);
    animation-fill-mode: backwards;
    animation-delay: calc(var(--lw-flow-base, 0ms) + var(--i, 0) * var(--lw-flow-step, 55ms));
  }
  /* a card, or any block that follows a heading */
  .fc {
    animation-duration: var(--lw-flow-duration, 0.6s);
    animation-timing-function: var(--lw-flow-ease, ease-out);
    animation-fill-mode: backwards;
    animation-delay: calc(var(--lw-flow-base, 0ms) + var(--lw-flow-head, 160ms) + var(--i, 0) * var(--lw-flow-card-step, 90ms));
  }
  .fw.fadeIn, .fc.fadeIn                 { animation-name: lw-flow-fadeIn; }
  .fw.blurIn, .fc.blurIn                 { animation-name: lw-flow-blurIn; }
  .fw.slideUp, .fc.slideUp               { animation-name: lw-flow-slideUp; }
  .fw.dropIn, .fc.dropIn                 { animation-name: lw-flow-dropIn; }
  .fw.fadeAndScale, .fc.fadeAndScale     { animation-name: lw-flow-fadeAndScale; }
  .fw.blurAndSharpen, .fc.blurAndSharpen { animation-name: lw-flow-blurAndSharpen; }
  .fw.highlight, .fc.highlight           { animation-name: lw-flow-highlight; }

  @media (prefers-reduced-motion: reduce) {
    .fw, .fc { animation: none; }
  }
`;

/**
 * `text` as one animated span per word, the gap kept outside the span so the
 * inline-block never swallows it. Each word's `--i` is its position, which the
 * stylesheet turns into the stagger. Without a known `animation` the plain text
 * comes back unchanged.
 */
export function flowWords(text, animation) {
  const name = flowName(animation);
  const str = String(text ?? '');
  if (!name) return str;
  const out = [];
  const re = /(\S+)(\s*)/g;
  let m;
  let i = 0;
  while ((m = re.exec(str))) {
    out.push(html`<span class="fw ${name}" style="--i:${i++}">${m[1]}</span>${m[2]}`);
  }
  return out;
}

/** How many words `flowWords` splits `text` into — the cards that follow count from here. */
export const flowWordCount = (text) => (String(text ?? '').match(/\S+/g) || []).length;
