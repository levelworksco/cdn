import { LitElement, html, css }
  from 'https://cdn.jsdelivr.net/gh/lit/dist@3/all/lit-all.min.js';

export class LwInsightsBar extends LitElement {

  static properties = {
    demoNote:          { type: String, attribute: 'demo-note'           },
    logoSrc:           { type: String, attribute: 'logo-src'            },
    blogs:             { type: String },
    updatedAt:         { type: String, attribute: 'updated' },
    searches:          { type: String },
    unblocked: { type: String, attribute: 'unblocked'  },
    _open:             { state: true },
    _top:              { state: true },
    _settingsOpen:     { state: true },
    _logoError:        { state: true },
    _updatedOpen:      { state: true },
    _searchesOpen:     { state: true },
    _updatedClosing:   { state: true },
    _searchesClosing:  { state: true },
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Stats bar ── */
    .bar {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      background: #1a1a1a;
      border-top: 1px solid #2a2a2a;
      padding: 0 0 0 2rem;
      min-height: 32px;
      gap: 0;
    }

    /* Desktop: dock is a pass-through wrapper — its children lay out as if
       they were direct children of .bar (identical to the original bar). */
    .dock,
    .dock-secondary {
      display: contents;
    }

    .demo-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 11px;
      color: #e8e8e8;
      font-style: normal;
      /* Sized to its content (not flex:1) so the stats sit close behind it —
         only "View Insights" grows to absorb the bar's leftover space, via
         its own margin-left:auto below. Still shrinks + ellipsizes if the
         bar is too narrow to fit everything. */
      flex: 0 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-right: 1.5rem;
    }

    .bar-logo {
      width: 20px;
      height: 20px;
      object-fit: contain;
      flex-shrink: 0;
      display: block;
      border-radius: 3px;
    }

    .stats {
      display: flex;
      align-items: stretch;
      flex-shrink: 0;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0 1.1rem;
      border-left: 1px solid rgba(255, 255, 255, 0.22);
    }

    .stat--updated,
    .stat--unblocked { cursor: pointer; }
    .stat--updated:active,
    .stat--unblocked:active { opacity: 0.7; }

    .stat-label {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      font-size: 11px;
      font-weight: 500;
      color: #F58B2C;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
    }

    /* The two stats that open a details popover are marked as such with a
       dotted underline. */
    .stat--updated .stat-value,
    .stat--unblocked .stat-value {
      border-bottom: 1px dotted rgba(255, 255, 255, 0.6);
      padding-bottom: 1px;
    }

    /* "Updated" stat: date-only text is mobile-only (see the max-width:1023px
       block below, which swaps these two spans). */
    .date-short { display: none; }

    /* ── Info icon + tooltip ── */
    /* Hidden on the bar itself — markup/rules kept in case it's reused
       elsewhere later. */
    .info-wrap {
      display: none;
      position: relative;
      align-items: center;
    }

    .info-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #f5f5f5;
      border: 1px solid #d0d0d0;
      color: #B37040;
      font-size: 11px;
      font-weight: 700;
      font-style: normal;
      line-height: 12px;
      cursor: default;
      margin-left: 0.25rem;
      flex-shrink: 0;
      user-select: none;
      vertical-align: middle;
    }

    .info-tooltip {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 400;
      line-height: 1.5;
      white-space: nowrap;
      padding: 0.45rem 0.7rem;
      border-radius: 6px;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
    }

    .info-tooltip::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-bottom-color: #1a1a1a;
    }

    .info-wrap:hover .info-tooltip {
      display: block;
    }

    /* ── View Insights button ── */
    .insights-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      /* Absorbs the bar's leftover space, so it (and only it) sits flush at
         the right edge while the demo note and stats hug together on the left. */
      margin-left: auto;
      /* Fills the bar's full 32px height — no vertical padding to grow it. */
      align-self: stretch;
      padding: 0 0.9rem;
      background: #F58B2C;
      border: 1px solid #F58B2C;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      color: #000000;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1;
    }
    .insights-btn:hover { background: #e89247; border-color: #e89247; }

    .insights-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    /* Use the same right-pointing CTA arrow on every screen size. */
    .insights-arrow .chev { display: none; }
    .insights-arrow .arr  { display: block; width: 18px; height: 18px; }

    /* ── Settings gear button ── */
    /* Plain icon on the bar — no chip background, and no fill when the drawer
       is open; only the divider separates it from the demo note. */
    .settings-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0 0.2rem;
      margin: 0;
      background: none;
      border: none;
      border-right: 1px solid rgba(255, 255, 255, 0.22);
      box-sizing: content-box;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
      transition: color 0.15s;
    }
    .settings-btn:hover   { color: #F58B2C; }
    .settings-btn.is-open { color: #F58B2C; }

    /* ── "Last Updated" / "Searches Unblocked" popover (desktop): a small
       card anchored below the stat that opened it, with a pointer arrow.
       Opens/closes on hover — the backdrop has no visual dimming and lets
       pointer events pass through (only the popover itself is interactive),
       so it doesn't steal the hover off the anchoring stat. Position is
       computed in JS (_positionPopover) since the anchoring stat can sit
       anywhere along the bar. ── */
    .updated-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 950;
      background: transparent;
      pointer-events: none;
    }
    .updated-modal {
      position: absolute;
      top: var(--lw-pop-top, 56px);
      left: var(--lw-pop-left, 50%);
      transform: translateX(-50%);
      width: 360px;
      max-width: calc(100vw - 2rem);
      background: #fff;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      animation: lw-pop-in 0.18s ease;
      pointer-events: auto;
    }
    .updated-modal::before {
      content: '';
      position: absolute;
      top: -7px;
      left: 50%;
      width: 14px;
      height: 14px;
      background: #fff;
      transform: translateX(-50%) rotate(45deg);
      border-radius: 3px 0 0 0;
    }
    @keyframes lw-pop-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .updated-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .updated-modal-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #ef7d34;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    /* Desktop popover is hover-driven — no explicit close button needed
       (it closes when the mouse leaves). Mobile re-enables it below. */
    .updated-modal-close {
      display: none;
    }
    .updated-modal-date {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    .updated-modal-desc {
      font-size: 0.85rem;
      color: #888;
      line-height: 1.5;
      max-width: 100%;
    }

    /* ── Coming soon ── */
    .coming-soon {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .cs-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fef3ea;
      border: 1px solid #fddcba;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #f97316;
    }

    .cs-label {
      font-size: 1rem;
      font-weight: 600;
      color: #222;
    }

    /* ── Insights drawer ──
       The mechanism at every width: a right-side slide-in, mirroring the
       settings drawer (which opens from the left on desktop). Replaces the
       expandable panel that used to drop below the bar on desktop. */
    .insights-drawer {
      display: flex;
      flex-direction: column;
      position: fixed;
      /* Sits flush below the bar, so it tucks behind it (same as lw-settings). */
      top: var(--lw-insights-top, 32px);
      right: 0;
      bottom: 0;
      width: var(--lw-insights-width, 300px);   /* same as the settings drawer */
      max-width: 100%;
      background: #fff;
      border-left: 1px solid #e8e8e8;
      z-index: 900;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
    }
    .insights-drawer::-webkit-scrollbar       { width: 6px; }
    .insights-drawer::-webkit-scrollbar-track { background: transparent; }
    .insights-drawer::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 99px; }
    .insights-drawer::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
    .insights-drawer.is-open { transform: translateX(0); }
    .insights-drawer * { box-sizing: border-box; }

    .ins-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 1;
    }
    /* Title left, close right — same header shape as the settings drawer. */
    .ins-header-title { flex: 1; font-size: 1.05rem; font-weight: 700; color: #1a1a1a; }

    .ins-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      color: #aaa;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .ins-close:hover { background: #f5f5f5; color: #333; }

    .ins-body { padding: 1.25rem; }

    /* ── View Insights content (the drawer's sections) ── */
    .ins-grid, .ins-grid * { box-sizing: border-box; }
    /* The drawer is a narrow column, so the sections stack full-width. */
    .ins-grid {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 2rem;
      padding: 0;
      width: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .ins-section-head {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.9rem;
    }
    .ins-section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #fdecd8;
      color: #ef7d34;
      flex-shrink: 0;
    }
    .ins-section-title { font-size: 13px; font-weight: 700; color: #1a1a1a; }

    .ins-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 0;
      border-top: 1px solid #f2f2f2;
    }
    .ins-row-label { font-size: 11px; color: #98a2b3; }
    .ins-row-value { display: inline-flex; align-items: baseline; gap: 0.5rem; }
    .ins-row b { font-size: 13px; font-weight: 700; color: #1a1a1a; }
    .ins-trend { font-size: 11px; color: #98a2b3; white-space: nowrap; }

    .ins-chart { padding-bottom: 0.25rem; }
    .ins-chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .ins-chart-label { font-size: 11px; color: #98a2b3; }
    .ins-chart-delta { font-size: 13px; font-weight: 700; color: #ef7d34; }
    .ins-sparkline { display: block; width: 100%; height: 44px; }

    .ins-tags { display: flex; flex-wrap: wrap; gap: 0.55rem; }
    .ins-tag {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-size: 11px;
      color: #667085;
      background: #fff;
      border: 1px solid #eaecf0;
    }
    .ins-tag.active { background: #fdecd8; color: #c2601a; border-color: transparent; }

    /* Promo card is mobile-only — desktop panel drops it (see the
       max-width:1023px override below, which re-enables it). */
    .ins-promo {
      display: none;
      position: relative;
      overflow: hidden;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.75rem;
      padding: 1.15rem 1.25rem;
      border-radius: 16px;
      background: linear-gradient(105deg, #ee6f2b 0%, #f68e2d 55%, #fbb63c 100%);
      color: #fff;
      text-decoration: none;
    }
    .ins-promo-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.28);
    }
    .ins-promo-text { font-size: 1.02rem; font-weight: 600; line-height: 1.35; }

    /* Desktop: the stats sit inside the dark bar, so give them dark-theme
       contrast. (On mobile the stats live in the light dock — untouched.) */
    @media (min-width: 1024px) {
      .stat        { border-left-color: rgba(255, 255, 255, 0.22); }
      .stat-value  { color: #fff; }
      .info-icon   { background: #2e2e2e; border-color: #555; color: #f0a868; }

      /* Settings gear sits at the far left as a plain icon, separated from the
         demo note by a divider (no chip background, no fill when open). */
      .bar { padding-left: 0; }
      .settings-btn {
        order: -1;
        margin: 0 0.6rem 0 0;
        background: none;
        border: none;
        border-right: 1px solid rgba(255, 255, 255, 0.22);
        color: #fff;
      }
      .settings-btn:hover   { background: none; color: #F58B2C; }
      .settings-btn.is-open { background: none; color: #F58B2C; }
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .bar          { padding: 0 1.25rem; }
      .demo-note    { font-size: 12px; }
      .stat         { padding: 0 0.75rem; }
      .stat-label   { font-size: 9px; }
      .stat-value   { font-size: 0.72rem; }
      .insights-btn { padding: 0.65rem 0.7rem; font-size: 0.72rem; margin-left: 0.75rem; }
    }

    @media (max-width: 1023px) {
      /* Split the bar in two:
         · TOP  — demo note stays in flow (with the settings gear).
         · DOCK — stats + View Insights float, fixed to the bottom of the screen. */
      .bar {
        min-height: 0;
        padding: 0;
        align-items: stretch;
        position: relative;
      }

      /* ── TOP: demo note (only in-flow content, so the sticky bar hugs it) ── */
      .demo-note {
        flex: 1 1 100%;
        align-items: flex-start;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        line-height: 1.4;
        padding: 0.4rem 3.25rem 0.4rem 1.25rem;   /* room for the gear on the right */
      }

      /* Gear vertically centered against the (two-line) demo note, top-right */
      .settings-btn {
        position: absolute;
        top: 50%;
        right: 0.6rem;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        margin: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.22);
        border-right: none;
      }
      .settings-btn svg { width: 17px; height: 17px; }

      /* ── DOCK: floating bottom bar ── */
      .dock {
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 700;
        background: #fff;
      }
      /* Lift the dock above the Last-Updated backdrop so it stays bright/active
         (undimmed) while the sheet is open. */
      .dock.is-elevated { z-index: 960; }

      /* Row 1 — Blogs / Updated / Searches, white band with orange labels */
      .stats {
        display: flex;
        min-width: 0;
        background: #fff;
        border-top: 2px solid #F58635;
        padding:0 0!important;
      }
      .stat {
        flex: 1 1 0;
        min-width: 0;            /* allow shrink below content width — prevents overflow */
        flex-direction: column;  /* label above value, matching the design */
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 3px;
        padding: 0.3rem 0.25rem;
        border-left: none;
      }
      .stats .stat:first-child { border-left: none; }
      .stats .stat { border-left-color: #f6e6d6; }
      .stat-label {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        line-height: 1.2;
      }
      /* Row 1 labels are orange, values dark. */
      .stats .stat-label { color: #F58B2C; }
      .stat-value { white-space: nowrap; line-height: 1.25; color: #1a1a1a; }
      /* Underline the Updated date to match the design (skip the "-" fallback) */
      .stat-value.is-date {
        text-decoration: underline dotted;
        text-underline-offset: 3px;
      }
      /* Mobile: date only (desktop shows date + time — see .date-short above) */
      .date-full  { display: none; }
      .date-short { display: inline; }

      /* Unblocked now lives in Row 1 as a normal white-band stat, matching the
         other three (orange label, dark value). */
      .stat--unblocked {
        flex: 1 1 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        text-align: center;
        line-height: 1.2;
      }
      .stat--unblocked .stat-label { color: #F58B2C; }
      .stat--unblocked .stat-value {
        color: #1a1a1a;
        text-decoration: underline dotted;
        text-underline-offset: 3px;
      }
      /* Tooltip stays hidden on touch (no hover). */
      .stat--unblocked .info-wrap:hover .info-tooltip { display: none; }

      /* Row 2 — orange gradient band: just the centered "View Insights →". */
      .dock-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.55rem 1rem;
        background: linear-gradient(90deg, #f2911d 0%, #fbb44a 100%);
        color: #1a1a1a;
      }

      /* Plain "View Insights →" — dark text + simple arrow on the orange band. */
      .insights-btn {
        margin: 0;
        padding: 0;
        flex-shrink: 0;
        gap: 0.45rem;
        background: none;
        border: none;
        color: #1a1a1a;
        font-weight: 700;
        font-size: 13px;
      }
      .insights-btn:hover { background: none; border: none; }
      .insights-arrow {
        width: auto;
        height: auto;
        border-radius: 0;
        background: none;
        color: #1a1a1a;
        flex-shrink: 0;
      }
      .insights-arrow .chev { display: none; }
      .insights-arrow .arr  { display: block; width: 18px; height: 18px; }

      .updated-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 950;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        pointer-events: auto;
        /* Sit flush above the floating dock (its height is measured on open). */
        padding-bottom: var(--lw-dock-h, 88px);
        animation: lw-fade-in 0.25s ease;
      }
      .updated-modal-backdrop.is-closing {
        animation: lw-fade-out 0.25s ease forwards;
      }
      /* Full-width bottom sheet that slides up above the dock (overrides the
         desktop popover's absolute anchoring — this is a normal flex child). */
      .updated-modal {
        position: static;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        background: #fff;
        border-radius: 20px 20px 0 0;
        padding: 1.5rem 1.5rem 1.75rem;
        box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.14);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        animation: lw-sheet-up 0.25s ease;
        transform: none;
      }
      .updated-modal.is-closing {
        animation: lw-sheet-down 0.25s ease forwards;
      }
      .updated-modal::before { display: none; }
      .updated-modal *, .updated-modal *::before, .updated-modal *::after {
        box-sizing: border-box;
      }
      .updated-modal-desc { max-width: 100%; }
      @keyframes lw-sheet-up {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      @keyframes lw-sheet-down {
        from { transform: translateY(0); }
        to   { transform: translateY(100%); }
      }
      @keyframes lw-fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes lw-fade-out {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
      .updated-modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .updated-modal-title {
        font-size: 12px;
        font-weight: 600;
        color: #ef7d34;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .updated-modal-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        color: #999;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.15s, color 0.15s;
      }
      .updated-modal-close:hover { background: #f5f5f5; color: #555; }
      .updated-modal-date {
        font-size: 12px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 12px;
      }
      .updated-modal-desc {
        font-size: 12px;
        color: #777;
        line-height: 1.5;
      }

      /* Mobile: the drawer (defined above) covers the full screen — top to
         bottom, not tucked under the bar — and the promo card is shown. */
      .insights-drawer { width: 100%; top: 0; border-left: none; }
      .ins-promo { display: flex; }

      /* Larger, easier-to-tap close target on touch devices. */
      .ins-close { width: 32px; height: 32px; }
      .ins-close svg { width: 32px; height: 32px; }
    }

    @media (max-width: 480px) {
      .demo-note    { font-size: 13px; padding: 0.3rem 2.75rem 0.3rem 1rem; }
      .stat         { padding: 0.3rem 0.25rem; gap: 0.3rem; }
      .stat-value   { font-size: 0.68rem; }
      .dock-secondary { padding: 0.3rem 0.85rem; }
    }
  `;

  constructor() {
    super();
    this.demoNote          = 'Demoing content & AI search functionality only. Demo not intended to visually match source site.';
    this.logoSrc           = '../../logo.png';
    this.blogs             = '87';
    this.updatedAt         = '2000-01-01T15:20:00+05:30';
    this.searches          = '14.2K';
    this.unblocked = '92%';
    this._open             = false;
    this._top              = '32px';
    this._settingsOpen     = false;
    this._logoError        = false;
    this._updatedOpen      = false;
    this._searchesOpen     = false;
    this._updatedClosing   = false;
    this._searchesClosing  = false;
    this._updatedHoverTimer  = null;
    this._searchesHoverTimer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Stay in sync with the drawer no matter who opened/closed it. Opening
    // Settings while Insights is open should close Insights — the two large
    // -device panels are mutually exclusive.
    this._onSettingsChanged = (e) => {
      this._settingsOpen = !!(e.detail && e.detail.open);
      if (this._settingsOpen && this._open) this._setInsightsOpen(false);
    };
    window.addEventListener('lw-settings-changed', this._onSettingsChanged);

    // The drawer is a full-screen overlay on mobile, so the push has to be
    // dropped (and restored) as the viewport crosses the breakpoint.
    this._onResize = () => {
      if (!this._open) return;
      this._updateTop();      // the bar gets taller/shorter as it wraps
      this._applyPush(true);
    };
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('lw-settings-changed', this._onSettingsChanged);
    window.removeEventListener('resize', this._onResize);
    this._setPush('');
    clearTimeout(this._updatedCloseTimer);
    clearTimeout(this._searchesCloseTimer);
    clearTimeout(this._updatedHoverTimer);
    clearTimeout(this._searchesHoverTimer);
  }

  updated(changed) { if (changed.has('logoSrc')) this._logoError = false; }

  // Fall back to a dash when a stat has no value.
  _dash(v) { return (v == null || String(v).trim() === '') ? '-' : v; }

  // Splits `updatedAt` into its date/time parts (IST), used to build the
  // desktop, mobile-stat, and mobile-drawer variants of the "Updated" text.
  _updatedParts() {
    const raw = this.updatedAt;
    if (raw == null || String(raw).trim() === '') return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;

    const date = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    }).format(d);
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }).format(d);

    return { date, time: `${time} IST` };
  }

  _toggle() {
    // A stat-detail tooltip must not remain above the Insights drawer. Close
    // it immediately so one tap cleanly transitions from the tooltip to the
    // drawer, including on the mobile dock.
    this._dismissStatDetails();
    this._setInsightsOpen(!this._open);
  }

  _dismissStatDetails() {
    clearTimeout(this._updatedCloseTimer);
    clearTimeout(this._searchesCloseTimer);
    clearTimeout(this._updatedHoverTimer);
    clearTimeout(this._searchesHoverTimer);
    this._updatedOpen = false;
    this._searchesOpen = false;
    this._updatedClosing = false;
    this._searchesClosing = false;
  }

  // Opening Insights while Settings is open should close Settings — the two
  // large-device panels are mutually exclusive.
  _setInsightsOpen(value) {
    this._open = value;
    if (value) this._updateTop();
    this._applyPush(value);
    window.dispatchEvent(new CustomEvent('lw-insights-changed', { detail: { open: value } }));
    if (value && this._settingsOpen) {
      window.dispatchEvent(new CustomEvent('lw-settings-toggle', { detail: { open: false } }));
    }
  }

  // Drop the drawer flush below the bar. The bar's height is responsive, so
  // this is measured rather than hard-coded.
  _updateTop() {
    this._top = `${Math.round(this.getBoundingClientRect().bottom)}px`;
  }

  // Push the page content aside while the insights drawer is open, mirroring
  // <lw-settings> — but from the right, since this drawer opens on the right.
  // Mobile keeps the drawer as a full-screen overlay, so nothing is pushed.
  _applyPush(value) {
    this._setPush(value && !this._isMobile() ? this._drawerWidth : '');
  }

  get _drawerWidth() {
    return getComputedStyle(this).getPropertyValue('--lw-insights-width').trim() || '300px';
  }

  _setPush(width) {
    const ease = 'padding-right 0.28s cubic-bezier(0.4,0,0.2,1)';

    // The .page / lw-header live either in the light DOM or inside a page
    // wrapper's shadow root (lw-blog, lw-summary-page) — same lookup as
    // <lw-settings> uses.
    const wrappers = [...document.querySelectorAll('lw-blog, lw-summary-page')];

    const headers = [
      ...document.querySelectorAll('lw-header'),
      ...wrappers.map(el => el.shadowRoot?.querySelector('lw-header')).filter(Boolean),
    ];

    const pages = [
      ...document.querySelectorAll('.page'),
      ...wrappers.map(el => el.shadowRoot?.querySelector('.page')).filter(Boolean),
    ];

    // The centered .page already leaves margin on either side once the
    // viewport is wide enough — if that margin alone fits the drawer, let it
    // overlay the empty space instead of shifting the content.
    const push = (width && this._hasRoomFor(pages[0], width)) ? '' : width;

    headers.forEach(host => {
      const target = host.shadowRoot?.querySelector('.header') ?? host;
      target.style.transition   = ease;
      target.style.paddingRight = push;
    });

    pages.forEach(el => {
      el.style.transition   = ease;
      el.style.paddingRight = push;
    });
  }

  // True when the centered .page column's own side margin is already wide
  // enough for a `widthStr`-wide drawer to sit over it without covering any
  // content. False (no room to spare) whenever the page has no capped
  // max-width to measure — e.g. compare mode's full-width layout.
  _hasRoomFor(page, widthStr) {
    if (!page) return false;
    const maxWidth = parseFloat(getComputedStyle(page).maxWidth);
    if (!Number.isFinite(maxWidth)) return false;
    const margin = (window.innerWidth - maxWidth) / 2;
    return margin >= parseFloat(widthStr);
  }

  _toggleSettings() {
    // Fire a global command; <lw-settings> listens for it wherever it lives.
    window.dispatchEvent(new CustomEvent('lw-settings-toggle', {
      detail: { open: !this._settingsOpen },
    }));
  }

  _isMobile() {
    return window.matchMedia('(max-width: 1023px)').matches;
  }

  // Measure the floating dock so a sheet sits flush above it (no gap/overlap).
  _measureDock() {
    const dock = this.renderRoot?.querySelector('.dock');
    const h = dock ? Math.round(dock.getBoundingClientRect().height) : 88;
    this.style.setProperty('--lw-dock-h', `${h}px`);
  }

  // Desktop: anchor the popover under the stat that opened it (its position
  // on the bar varies), with a gap for the arrow.
  _positionPopover(selector) {
    const anchor = this.renderRoot?.querySelector(selector);
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    this.style.setProperty('--lw-pop-left', `${Math.round(r.left + r.width / 2)}px`);
    this.style.setProperty('--lw-pop-top', `${Math.round(r.bottom + 10)}px`);
  }

  // Desktop: open/close on hover instead of click (mobile keeps tap-to-open,
  // guarded via _isMobile() at the call sites in render()).
  _onUpdatedEnter() {
    if (this._isMobile()) return;
    clearTimeout(this._updatedHoverTimer);
    clearTimeout(this._searchesHoverTimer);
    this._searchesOpen = false;
    this._searchesClosing = false;
    this._updatedClosing = false;
    this._updatedOpen = true;
    this._positionPopover('.stat--updated');
  }

  _onUpdatedLeave() {
    if (this._isMobile()) return;
    clearTimeout(this._updatedHoverTimer);
    // Small delay so the cursor can travel from the stat down into the popover.
    this._updatedHoverTimer = setTimeout(() => { this._updatedOpen = false; }, 150);
  }

  _onSearchesEnter() {
    if (this._isMobile()) return;
    clearTimeout(this._searchesHoverTimer);
    clearTimeout(this._updatedHoverTimer);
    this._updatedOpen = false;
    this._updatedClosing = false;
    this._searchesClosing = false;
    this._searchesOpen = true;
    this._positionPopover('.stat--unblocked .stat-value');
  }

  _onSearchesLeave() {
    if (this._isMobile()) return;
    clearTimeout(this._searchesHoverTimer);
    this._searchesHoverTimer = setTimeout(() => { this._searchesOpen = false; }, 150);
  }

  _toggleUpdatedModal(e) {
    e?.stopPropagation();
    if (this._updatedOpen) { this._closeUpdatedModal(); return; }
    clearTimeout(this._searchesCloseTimer);
    this._searchesOpen = false;
    this._searchesClosing = false;
    clearTimeout(this._updatedCloseTimer);
    this._updatedClosing = false;
    this._updatedOpen = true;
    this._isMobile() ? this._measureDock() : this._positionPopover('.stat--updated');
  }

  // Mobile: let the sheet play its slide-down animation before unmounting it.
  // Desktop: no directional animation to reverse, so close immediately.
  _closeUpdatedModal() {
    if (this._isMobile() && this._updatedOpen) {
      this._updatedClosing = true;
      clearTimeout(this._updatedCloseTimer);
      this._updatedCloseTimer = setTimeout(() => {
        this._updatedOpen = false;
        this._updatedClosing = false;
      }, 250);
    } else {
      this._updatedOpen = false;
    }
  }

  _toggleSearchesModal(e) {
    e?.stopPropagation();
    if (this._searchesOpen) { this._closeSearchesModal(); return; }
    clearTimeout(this._updatedCloseTimer);
    this._updatedOpen = false;
    this._updatedClosing = false;
    clearTimeout(this._searchesCloseTimer);
    this._searchesClosing = false;
    this._searchesOpen = true;
    this._isMobile() ? this._measureDock() : this._positionPopover('.stat--unblocked .stat-value');
  }

  _closeSearchesModal() {
    if (this._isMobile() && this._searchesOpen) {
      this._searchesClosing = true;
      clearTimeout(this._searchesCloseTimer);
      this._searchesCloseTimer = setTimeout(() => {
        this._searchesOpen = false;
        this._searchesClosing = false;
      }, 250);
    } else {
      this._searchesOpen = false;
    }
  }

  // Shared "View Insights" content — rendered in the desktop panel and the
  // mobile drawer (only the surrounding layout differs).
  _renderInsights() {
    return html`
      <div class="ins-grid">
        <!-- Search Performance -->
        <div class="ins-section">
          <div class="ins-section-head">
            <span class="ins-section-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 17 9 11 13 15 21 7"/>
                <polyline points="15 7 21 7 21 13"/>
              </svg>
            </span>
            <span class="ins-section-title">Search Performance</span>
          </div>
          <div class="ins-chart">
            <div class="ins-chart-head">
              <span class="ins-chart-label">Volume — 7 days</span>
              <span class="ins-chart-delta">+14%</span>
            </div>
            <svg class="ins-sparkline" viewBox="0 0 300 46" preserveAspectRatio="none" fill="none">
              <path d="M0 34 C 25 30, 45 22, 70 26 S 110 38, 140 30 S 185 14, 220 20 S 265 30, 300 22"
                    stroke="#f58b2c" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M0 34 C 25 30, 45 22, 70 26 S 110 38, 140 30 S 185 14, 220 20 S 265 30, 300 22 L 300 46 L 0 46 Z"
                    fill="#f58b2c" fill-opacity="0.08"/>
            </svg>
          </div>
          <div class="ins-row">
            <span class="ins-row-label">Search Success Rate</span>
            <span class="ins-row-value"><span class="ins-trend">↑ 2.1%</span><b>94.3%</b></span>
          </div>
          <div class="ins-row">
            <span class="ins-row-label">Avg Search Time</span>
            <span class="ins-row-value"><span class="ins-trend">↓ 0.1s</span><b>0.8s</b></span>
          </div>
        </div>

        <!-- AI Insights -->
        <div class="ins-section">
          <div class="ins-section-head">
            <span class="ins-section-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.5 13.5H11L10 22l9.5-12H14L13 2Z"/>
              </svg>
            </span>
            <span class="ins-section-title">AI Insights</span>
          </div>
          <div class="ins-row"><span class="ins-row-label">Intent Recognition</span><b>96%</b></div>
          <div class="ins-row"><span class="ins-row-label">Search Quality Score</span><b>91%</b></div>
          <div class="ins-row"><span class="ins-row-label">Content Discovery Boost</span><b>+34%</b></div>
        </div>

        <!-- Top Searches -->
        <div class="ins-section">
          <div class="ins-section-head">
            <span class="ins-section-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="20" x2="6" y2="13"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="18" y1="20" x2="18" y2="9"/>
              </svg>
            </span>
            <span class="ins-section-title">Top Searches</span>
          </div>
          <div class="ins-tags">
            <span class="ins-tag active">machine learning</span>
            <span class="ins-tag active">crafts DIY</span>
            <span class="ins-tag active">JavaScript</span>
            <span class="ins-tag">farming tips</span>
            <span class="ins-tag">philosophy</span>
          </div>
        </div>

        <!-- Promo -->
        <a class="ins-promo" href="#">
          <span class="ins-promo-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="12" x2="20" y2="12"/>
              <polyline points="14 6 20 12 14 18"/>
            </svg>
          </span>
          <span class="ins-promo-text">Transform the way your team searches with AI</span>
        </a>
      </div>
    `;
  }

  render() {
    const updatedParts = this._updatedParts();
    const updatedFull  = updatedParts ? `${updatedParts.date} ${updatedParts.time}` : this._dash(this.updatedAt);
    const updatedShort = updatedParts ? updatedParts.date : updatedFull;
    const updatedModal = updatedParts ? `${updatedParts.date} · ${updatedParts.time}` : updatedFull;
    return html`
      <div class="bar">
        <span class="demo-note">
          ${this.logoSrc && !this._logoError
            ? html`<img class="bar-logo" src=${this.logoSrc} alt="" aria-hidden="true"
                        @error=${() => { this._logoError = true; }}>`
            : ''}
          ${this.demoNote}
        </span>

        <!-- Dock: inline on desktop, floats to the bottom of the screen on mobile -->
        <div class="dock ${(this._updatedOpen || this._searchesOpen || this._updatedClosing || this._searchesClosing) ? 'is-elevated' : ''}">

          <div class="stats">
            <div class="stat">
              <span class="stat-label">Blogs</span>
              <span class="stat-value">${this._dash(this.blogs)}</span>
            </div>
            <div class="stat stat--updated" role="button" tabindex="0"
                 @click=${(e) => { if (this._isMobile()) this._toggleUpdatedModal(e); }}
                 @mouseenter=${this._onUpdatedEnter}
                 @mouseleave=${this._onUpdatedLeave}
                 @keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') this._toggleUpdatedModal(e); }}>
              <span class="stat-label">Updated</span>
              <span class="stat-value ${updatedFull === '-' ? '' : 'is-date'}">
                <span class="date-full">${updatedFull}</span>
                <span class="date-short">${updatedShort}</span>
              </span>
            </div>
            <div class="stat">
              <span class="stat-label">Searches</span>
              <span class="stat-value">${this._dash(this.searches)}</span>
            </div>
            <div class="stat stat--unblocked" role="button" tabindex="0"
                 @click=${(e) => { if (this._isMobile()) this._toggleSearchesModal(e); }}
                 @mouseenter=${this._onSearchesEnter}
                 @mouseleave=${this._onSearchesLeave}
                 @keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') this._toggleSearchesModal(e); }}>
              <span class="stat-label">
                Unblocked
                <span class="info-wrap">
                  <em class="info-icon">i</em>
                  <span class="info-tooltip">
                    % of searches that returned relevant results<br>
                    without manual filtering or re-queries.
                  </span>
                </span>
              </span>
              <span class="stat-value">${this._dash(this.unblocked)}</span>
            </div>
          </div>

          <div class="dock-secondary">
            <button class="insights-btn ${this._open ? 'is-open' : ''}" @click=${this._toggle}>
              View Insights
              <span class="insights-arrow">
                <!-- desktop: chevron that flips when open -->
                <svg class="chev" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <!-- mobile: CTA-style right arrow -->
                <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12"/>
                  <polyline points="14 6 20 12 14 18"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <button class="settings-btn ${this._settingsOpen ? 'is-open' : ''}"
                @click=${this._toggleSettings} aria-label="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <!-- "Last Updated" details — dropdown panel on desktop, bottom sheet on mobile -->
      ${(this._updatedOpen || this._updatedClosing) ? html`
        <div class="updated-modal-backdrop ${this._updatedClosing ? 'is-closing' : ''}" @click=${this._closeUpdatedModal}>
          <div class="updated-modal ${this._updatedClosing ? 'is-closing' : ''}" @click=${(e) => e.stopPropagation()}
               @mouseenter=${() => clearTimeout(this._updatedHoverTimer)}
               @mouseleave=${this._onUpdatedLeave}>
            <div class="updated-modal-head">
              <span class="updated-modal-title">Last Updated</span>
              <button class="updated-modal-close" @click=${this._closeUpdatedModal} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="1" y1="1" x2="13" y2="13"/>
                  <line x1="13" y1="1" x2="1" y2="13"/>
                </svg>
              </button>
            </div>
            <div class="updated-modal-date">${updatedModal}</div>
            <div class="updated-modal-desc">
              This content was last updated on the above date and time.
            </div>
          </div>
        </div>
      ` : ''}

      <!-- "Searches Unblocked" details — dropdown panel on desktop, bottom sheet on mobile -->
      ${(this._searchesOpen || this._searchesClosing) ? html`
        <div class="updated-modal-backdrop ${this._searchesClosing ? 'is-closing' : ''}" @click=${this._closeSearchesModal}>
          <div class="updated-modal ${this._searchesClosing ? 'is-closing' : ''}" @click=${(e) => e.stopPropagation()}
               @mouseenter=${() => clearTimeout(this._searchesHoverTimer)}
               @mouseleave=${this._onSearchesLeave}>
            <div class="updated-modal-head">
              <span class="updated-modal-title">Searches Unblocked</span>
              <button class="updated-modal-close" @click=${this._closeSearchesModal} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="1" y1="1" x2="13" y2="13"/>
                  <line x1="13" y1="1" x2="1" y2="13"/>
                </svg>
              </button>
            </div>
            <div class="updated-modal-date">${this._dash(this.unblocked)}</div>
            <div class="updated-modal-desc">
              AI helped retrieve relevant results for ${this._dash(this.unblocked)} of search
              queries, improving content discoverability across your website.
            </div>
          </div>
        </div>
      ` : ''}

      <!-- View Insights drawer — right-side slide-in at every width. -->
      <div class="insights-drawer ${this._open ? 'is-open' : ''}"
           style="--lw-insights-top: ${this._top}">
        <div class="ins-header">
          <span class="ins-header-title">Insights</span>
          <button class="ins-close" @click=${this._toggle} aria-label="Close insights">
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>

        <div class="ins-body">
          ${this._renderInsights()}
        </div>
        </div>
    `;
  }
}

customElements.define('lw-insights-bar', LwInsightsBar);
