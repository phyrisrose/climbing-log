// Checks and cleans up a new send before it's saved. Pure, no I/O.
import { getDiscipline, gradeRank, type Send } from "./grades.ts";
import { parseIsoDate } from "./timeline.ts";

/** What the log-send tool receives. `date` is optional: it defaults to today. */
export type SendInput = {
  name: string;
  grade: string;
  location: string;
  date?: string;
};

/**
 * Either a clean send ready to save, or every problem found with the input.
 * A discriminated union: check `ok` first, and TypeScript then knows which
 * of `send` or `errors` exists.
 */
export type ValidationResult = { ok: true; send: Send } | { ok: false; errors: string[] };

/** True for a real calendar date in YYYY-MM-DD form ("2026-02-30" is false). */
const isCalendarDate = (date: string) => parseIsoDate(date) !== null;

/**
 * Validates and normalizes a new send.
 *
 * - Trims every field. A missing date becomes `today`.
 * - V-grades are uppercased ("v5" → "V5") so the log stays consistent.
 * - Collects all errors instead of stopping at the first, so Claude can ask
 *   about everything at once: an empty name or location, a grade that isn't
 *   a valid YDS or V-scale grade, a date that isn't a real YYYY-MM-DD date,
 *   or a date after `today`.
 *
 * `today` ("YYYY-MM-DD") is passed in rather than read from the clock, so
 * the result depends only on the arguments and tests are deterministic.
 */
export function validateSend(input: SendInput, today: string): ValidationResult {
  const errors: string[] = [];

  const name = input.name.trim();
  const location = input.location.trim();
  const date = input.date?.trim() || today;

  let grade = input.grade.trim();
  if (getDiscipline(grade) === "boulder") grade = grade.toUpperCase();

  if (name === "") errors.push("Name is required.");
  if (location === "") errors.push("Location is required.");

  if (gradeRank(grade) === null) {
    errors.push(
      `Grade "${input.grade}" isn't a valid YDS or V-scale grade (for example 5.10a or V5).`,
    );
  }

  if (!isCalendarDate(date)) {
    errors.push(`Date "${date}" isn't a real date in YYYY-MM-DD form.`);
  } else if (date > today) {
    // Both are YYYY-MM-DD, so string order is date order.
    errors.push(`Date ${date} is in the future (today is ${today}).`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, send: { date, name, grade, location } };
}
