import { Temporal } from "@js-temporal/polyfill";

// Date math for the ledger's time strip. Pure functions, no DOM.

// Inclusive start, exclusive end, both "YYYY-MM-DD".
export type DateRange = { start: string; end: string };

/**
 * The range the strip covers: from the 1st of the month of the earliest send
 * to the 1st of the month after the latest one, so month labels line up.
 * ["2026-03-14", "2026-10-04"] → { start: "2026-03-01", end: "2026-11-01" }.
 * Assumes at least one date.
 */
export function monthRange(dates: string[]): DateRange {
  const sorted = dates.toSorted();
  const [y1, m1] = sorted[0].split("-").map(Number);
  const [y2, m2] = sorted[sorted.length - 1].split("-").map(Number);
  const iso = (y: number, m: number) =>
    new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  return { start: iso(y1, m1), end: iso(y2, m2 + 1) };
}

export function getDaysBetweenDates(
  dateString1: string,
  dateString2: string,
): number {
  const date1: Temporal.PlainDate = Temporal.PlainDate.from(dateString1);
  const date2: Temporal.PlainDate = Temporal.PlainDate.from(dateString2);

  const duration: Temporal.Duration = date1.until(date2, {
    largestUnit: "days",
  });

  return Number(duration.days);
}

/**
 * Where a date sits across the range, as a percentage from 0 (range.start)
 * to 100 (range.end). Used for the `left` position of each dot.
 * "2026-07-01" in { start: "2026-03-01", end: "2026-11-01" } → ≈ 49.8
 * (122 of the range's 245 days).
 *
 * A date outside the range (before start or after end) → null. Uses Temporal (via the polyfill) for the
 * day counts; throws a RangeError if a string isn't a valid date.
 */
export function datePercent(date: string, range: DateRange): number | null {
  const daysInRange = getDaysBetweenDates(range.start, range.end);
  const daysToSend = getDaysBetweenDates(range.start, date);
  const percentage = (daysToSend / daysInRange) * 100;
  if (daysToSend < 0 || percentage > 100) {
    return null; // date out of range
  }

  return percentage;
}
