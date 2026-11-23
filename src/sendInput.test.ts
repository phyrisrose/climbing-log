import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateSend, type SendInput } from "./sendInput.ts";

const TODAY = "2026-11-23";

const input = (overrides: Partial<SendInput> = {}): SendInput => ({
  name: "Pea Brain",
  grade: "5.10a",
  location: "Eldorado Canyon, CO",
  date: "2026-11-20",
  ...overrides,
});

// Unwraps the errors, failing the test if validation unexpectedly passed.
function errorsFor(overrides: Partial<SendInput>): string[] {
  const result = validateSend(input(overrides), TODAY);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.errors;
}

describe("validateSend: valid input", () => {
  test("returns the send unchanged when it's already clean", () => {
    assert.deepEqual(validateSend(input(), TODAY), {
      ok: true,
      send: { date: "2026-11-20", name: "Pea Brain", grade: "5.10a", location: "Eldorado Canyon, CO" },
    });
  });

  test("defaults a missing or blank date to today", () => {
    for (const date of [undefined, "", "  "]) {
      const result = validateSend(input({ date }), TODAY);
      assert.ok(result.ok && result.send.date === TODAY, `date ${JSON.stringify(date)}`);
    }
  });

  test("accepts today itself", () => {
    assert.equal(validateSend(input({ date: TODAY }), TODAY).ok, true);
  });

  test("trims every field", () => {
    const result = validateSend(
      { name: "  Pea Brain ", grade: " 5.10a ", location: " Eldorado Canyon, CO  ", date: " 2026-11-20 " },
      TODAY,
    );
    assert.deepEqual(result, {
      ok: true,
      send: { date: "2026-11-20", name: "Pea Brain", grade: "5.10a", location: "Eldorado Canyon, CO" },
    });
  });

  test("uppercases V-grades", () => {
    for (const [grade, expected] of [["v5", "V5"], ["vb", "VB"], ["V6", "V6"]]) {
      const result = validateSend(input({ grade }), TODAY);
      assert.ok(result.ok && result.send.grade === expected, grade);
    }
  });
});

describe("validateSend: invalid input", () => {
  test("rejects an empty name or location", () => {
    assert.deepEqual(errorsFor({ name: "  " }), ["Name is required."]);
    assert.deepEqual(errorsFor({ location: "" }), ["Location is required."]);
  });

  test("rejects grades gradeRank can't place", () => {
    for (const grade of ["5.9a", "banana", "5.10+", "V", ""]) {
      const errors = errorsFor({ grade });
      assert.equal(errors.length, 1, grade);
      assert.match(errors[0], /isn't a valid YDS or V-scale grade/);
    }
  });

  test("rejects dates that aren't real YYYY-MM-DD dates", () => {
    for (const date of ["2026-02-30", "2025-02-29", "2026-13-01", "11/20/2026", "yesterday"]) {
      const errors = errorsFor({ date });
      assert.equal(errors.length, 1, date);
      assert.match(errors[0], /isn't a real date/);
    }
  });

  test("accepts Feb 29 in a leap year", () => {
    assert.equal(validateSend(input({ date: "2024-02-29" }), TODAY).ok, true);
  });

  test("rejects a date after today", () => {
    assert.deepEqual(errorsFor({ date: "2026-11-24" }), [
      "Date 2026-11-24 is in the future (today is 2026-11-23).",
    ]);
  });

  test("reports every problem at once", () => {
    const errors = errorsFor({ name: "", location: "", grade: "5.9a", date: "2027-01-01" });
    assert.equal(errors.length, 4);
  });
});
