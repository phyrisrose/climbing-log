import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { datePercent, formatRange, monthRange } from "./timeline.ts";

const RANGE = { start: "2026-03-01", end: "2026-11-01" }; // 245 days

// Intl separates a range with thin spaces around an en dash.
const dash = " – ";

// Runs `fn` with the process time zone set to `tz`, then restores it.
// Node picks up changes to process.env.TZ immediately.
function inTimeZone(tz: string, fn: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// West of UTC, east of UTC, and UTC itself.
const TIME_ZONES = ["UTC", "America/Denver", "Pacific/Kiritimati", "Pacific/Pago_Pago"];

describe("monthRange", () => {
  test("spans from the 1st of the first month to the 1st after the last", () => {
    assert.deepEqual(monthRange(["2026-10-04", "2026-03-14", "2026-07-11"]), RANGE);
  });

  test("handles a single date", () => {
    assert.deepEqual(monthRange(["2026-05-17"]), { start: "2026-05-01", end: "2026-06-01" });
  });

  test("rolls the end over into the next year", () => {
    assert.deepEqual(monthRange(["2026-12-05"]), { start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("datePercent", () => {
  const close = (actual: number | null, expected: number) =>
    assert.ok(actual !== null && Math.abs(actual - expected) < 0.01, `${actual} ≈ ${expected}`);

  test("range start is 0 and range end is 100", () => {
    assert.equal(datePercent("2026-03-01", RANGE), 0);
    assert.equal(datePercent("2026-11-01", RANGE), 100);
  });

  test("dates in between are proportional to days elapsed", () => {
    close(datePercent("2026-03-14", RANGE), 5.31);
    close(datePercent("2026-07-01", RANGE), 49.8);
    close(datePercent("2026-10-04", RANGE), 88.57);
  });

  test("works across a year boundary", () => {
    close(datePercent("2026-12-16", { start: "2026-12-01", end: "2027-01-01" }), 48.39);
  });

  test("dates outside the range are null", () => {
    assert.equal(datePercent("2026-02-28", RANGE), null);
    assert.equal(datePercent("2026-11-02", RANGE), null);
  });
});

describe("formatRange", () => {
  test("months in one year share the year", () => {
    assert.equal(formatRange(RANGE, "en-US"), `Mar${dash}Oct 2026`);
  });

  test("a range across two years shows both", () => {
    assert.equal(
      formatRange({ start: "2026-11-01", end: "2027-03-01" }, "en-US"),
      `Nov 2026${dash}Feb 2027`,
    );
  });

  test("a single month collapses to one label", () => {
    assert.equal(formatRange({ start: "2026-12-01", end: "2027-01-01" }, "en-US"), "Dec 2026");
    assert.equal(formatRange({ start: "2026-03-01", end: "2026-03-02" }, "en-US"), "Mar 2026");
  });

  test("the end is exclusive even when it's mid-month", () => {
    assert.equal(
      formatRange({ start: "2026-03-01", end: "2026-10-15" }, "en-US"),
      `Mar${dash}Oct 2026`,
    );
  });

  test("the result doesn't depend on the viewer's time zone", () => {
    for (const tz of TIME_ZONES) {
      inTimeZone(tz, () => {
        assert.equal(formatRange(RANGE, "en-US"), `Mar${dash}Oct 2026`, tz);
        assert.equal(formatRange({ start: "2026-12-01", end: "2027-01-01" }, "en-US"), "Dec 2026", tz);
      });
    }
  });

  test("uses the given locale", () => {
    assert.notEqual(formatRange(RANGE, "fr-FR"), formatRange(RANGE, "en-US"));
    assert.match(formatRange(RANGE, "fr-FR"), /mars/);
  });
});
