import type { GridStackNode } from "gridstack";

/** The subset of a widget's geometry the reflow needs to restore/consult. */
export interface DesktopSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Height to use once the widget stacks full-width at the single-column
   * breakpoint. Some widgets stack their own internals there and need more
   * room than their desktop-tuned `h` provides.
   */
  mobileH?: number;
}

/**
 * Builds GridStack's `columnOpts.layout` callback: reflows widgets whenever
 * the column count changes at a breakpoint.
 *
 * - Back at `desktopColumns` (the starting width, or widened back past every
 *   breakpoint): restore the exact hand-tuned desktop positions, keyed by id.
 * - Narrower: pack widgets left-to-right, two per row down to tablet width and
 *   one at mobile. A widget that was full-width at the *previous* column count
 *   is treated as full-width again and given its own row.
 *
 * Kept framework-agnostic (plain functions over GridStack nodes, no Lit or
 * React) so it stays reusable by any other grid this project grows.
 */
export const buildResponsiveLayout = (
  desktopColumns: number,
  desktopLayout: Map<string, DesktopSlot>,
) => {
  // GridStack does not guarantee `nodes` arrives in declaration order, so sort
  // against the hand-tuned desktop (y, x) reading order rather than trusting
  // array order -- keeps the reflow deterministic.
  const readingOrder = [...desktopLayout.entries()]
    .sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
    .map(([id]) => id);
  const orderIndex = new Map(readingOrder.map((id, i) => [id, i]));

  return (
    column: number,
    prevColumn: number,
    newNodes: GridStackNode[],
    nodes: GridStackNode[],
  ) => {
    const ordered = [...nodes].sort(
      (a, b) =>
        (orderIndex.get(String(a.id)) ?? 0) -
        (orderIndex.get(String(b.id)) ?? 0),
    );

    if (column === desktopColumns) {
      ordered.forEach((node) => {
        const original = desktopLayout.get(String(node.id));
        if (original) Object.assign(node, original);
        newNodes.push(node);
      });
      return;
    }

    const itemsPerRow = column >= 4 ? 2 : 1;
    const cardWidth = Math.max(1, Math.floor(column / itemsPerRow));
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    // Buffered rather than pushed to newNodes immediately: two widgets paired
    // into the same reflowed row keep their own desktop-tuned `h` otherwise,
    // and if those differ (e.g. a 7-row list next to a 4-row chart), the
    // shorter one leaves a visible gap below it instead of matching its
    // row-mate. Flushing the row assigns every buffered node the row's max
    // height once the row is known to be complete.
    let rowNodes: GridStackNode[] = [];
    const flushRow = () => {
      // A row that ends up with just one item (an odd item out at the end,
      // not a `wasFullWidth` widget) would otherwise sit at `cardWidth` with
      // empty space beside it -- stretch it to the full row instead.
      if (rowNodes.length === 1) rowNodes[0].w = column;
      rowNodes.forEach((node) => {
        node.h = rowHeight;
      });
      newNodes.push(...rowNodes);
      rowNodes = [];
    };

    ordered.forEach((node) => {
      const wasFullWidth = node.w === prevColumn;
      const w = wasFullWidth ? column : cardWidth;

      if (wasFullWidth || x + w > column) {
        if (x > 0) {
          flushRow();
          y += rowHeight;
        }
        x = 0;
        rowHeight = 0;
      }

      // Height comes from the widget's original slot, never from `node.h`:
      // `flushRow` writes the row height back onto every node, so `node.h`
      // may still hold a previous breakpoint's value (a `mobileH`, or a
      // row-mate's taller height). Reading it here would make those stick
      // when resizing back up, since only the desktop branch restores.
      const slot = desktopLayout.get(String(node.id));
      const baseH = slot?.h ?? node.h ?? 1;
      // Applied in every reflowed state, not just single-column: two cards to
      // a row at the tablet breakpoint leaves each ~320px wide, which is
      // essentially the single-column width, so a card that needs extra
      // height when narrow needs it in both. (This branch only ever runs when
      // the column count differs from desktop.)
      const effectiveH = slot?.mobileH ?? baseH;

      node.x = x;
      node.y = y;
      node.w = w;
      rowHeight = Math.max(rowHeight, effectiveH);
      x += w;
      rowNodes.push(node);

      if (wasFullWidth) {
        flushRow();
        y += rowHeight;
        x = 0;
        rowHeight = 0;
      }
    });
    flushRow();
  };
};

/** Breakpoints shared by both dashboards: 4 columns at tablet, 1 at mobile. */
export const RESPONSIVE_BREAKPOINTS = [
  { w: 1100, c: 4 },
  { w: 640, c: 1 },
];
