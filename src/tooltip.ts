// Where to put the tooltip card. Pure geometry, no DOM.

/** A box in the container's coordinates: (0, 0) is the container's top-left corner. */
export type Box = { left: number; top: number; width: number; height: number };

export type Size = { width: number; height: number };

export type Placement = {
  left: number; // card's left edge, in container coordinates
  top: number; // card's top edge, in container coordinates
  placement: "above" | "below";
};

/**
 * Places the tooltip card next to a dot, inside its container.
 *
 * Horizontally: centered on the dot, then clamped so it stays inside
 * 0 … container.width. If the card is wider than the container, its left
 * edge wins (left = 0): the start of the text stays readable and only the
 * end overflows. (The CSS also caps the card at the container's width, so
 * this is a fallback.)
 *
 * Vertically: above the dot if the card fits there, otherwise below if it
 * fits there. If it fits on neither side, whichever side has more room.
 *
 * Example: dot { left: 100, top: 50, width: 8, height: 8 }, container
 * { width: 400, height: 300 }, card { width: 160, height: 60 }, gap 8:
 *   centered left = 100 + 8/2 − 160/2 = 24, fits → left 24
 *   room above = 50 − 8 = 42 < 60 → doesn't fit; room below = 234 → fits
 *   below: top = 50 + 8 + 8 = 66 → { left: 24, top: 66, placement: "below" }
 */
export function placeTooltip(
  dot: Box,
  container: Size,
  card: Size,
  gap = 8,
): Placement {
  // Horizontal: no further right than fits, then no further left than 0.
  // The left clamp is applied last, so it wins when the card can't fit.
  const centered = dot.left + dot.width / 2 - card.width / 2;
  const left = Math.max(0, Math.min(centered, container.width - card.width));

  // Vertical: space between the dot and each edge of the container.
  const roomAbove = dot.top - gap;
  const roomBelow = container.height - (dot.top + dot.height + gap);
  const placement =
    card.height <= roomAbove ? "above"
    : card.height <= roomBelow ? "below"
    : roomBelow > roomAbove ? "below"
    : "above";

  const top =
    placement === "above"
      ? dot.top - gap - card.height
      : dot.top + dot.height + gap;

  return { left, top, placement };
}
