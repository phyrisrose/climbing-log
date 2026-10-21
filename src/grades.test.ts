import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sends from "../sends.json" with { type: "json" };
import {
  buildLedgerRows,
  getDiscipline,
  gradeRank,
  type LedgerRow,
  type Send,
} from "./grades.ts";

// Compact view of rows for assertions: "5.8: 07-11, 08-09".
const summarize = (rows: LedgerRow[]) =>
  rows.map((r) => `${r.grade}: ${r.sends.map((s) => s.date.slice(5)).join(", ")}`);

const send = (grade: string, date = "2026-01-01"): Send => ({
  date,
  name: `Test ${grade}`,
  grade,
  location: "Test Crag",
});

describe("getDiscipline", () => {
  test("V-scale grades are boulders", () => {
    for (const g of ["V0", "V5", "V17", "VB", "v5", "vb"]) {
      assert.equal(getDiscipline(g), "boulder", g);
    }
  });

  test("YDS grades are routes", () => {
    for (const g of ["5.6", "5.9", "5.10", "5.10a", "5.11c", "5.15d"]) {
      assert.equal(getDiscipline(g), "route", g);
    }
  });

  test("anything else is null", () => {
    for (const g of ["", "banana", "Vanilla", "V", "V5a", "5.foo", "5.", "5.10e", "5.16a", "5.09", "6.10a", "5.10V", " V5"]) {
      assert.equal(getDiscipline(g), null, JSON.stringify(g));
    }
  });
});

describe("gradeRank", () => {
  test("orders YDS grades, including across 5.9 → 5.10a", () => {
    const ordered = ["5.6", "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c"];
    const ranks = ordered.map(gradeRank);
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i - 1]! < ranks[i]!, `${ordered[i - 1]} < ${ordered[i]}`);
    }
  });

  test("orders V-scale grades, with VB below V0", () => {
    const ordered = ["VB", "V0", "V1", "V2", "V5", "V6", "V10"];
    const ranks = ordered.map(gradeRank);
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i - 1]! < ranks[i]!, `${ordered[i - 1]} < ${ordered[i]}`);
    }
  });

  test("is case-insensitive for boulders", () => {
    assert.equal(gradeRank("v5"), gradeRank("V5"));
    assert.equal(gradeRank("vb"), gradeRank("VB"));
  });

  test("plain 5.10 ranks the same as 5.10a", () => {
    assert.equal(gradeRank("5.10"), gradeRank("5.10a"));
  });

  test("invalid grades are null", () => {
    for (const g of ["", "banana", "Vanilla", "5.foo", "5.9a", "5.10e"]) {
      assert.equal(gradeRank(g), null, JSON.stringify(g));
    }
  });
});

describe("buildLedgerRows", () => {
  test("routes from sends.json: hardest first, each row oldest first", () => {
    assert.deepEqual(summarize(buildLedgerRows(sends, "route")), [
      "5.11c: 05-17",
      "5.11a: 07-26",
      "5.10d: 05-31",
      "5.10a: 03-14",
      "5.8: 07-11, 08-09",
      "5.7: 03-22, 09-12",
      "5.6: 05-02",
    ]);
  });

  test("boulders from sends.json", () => {
    assert.deepEqual(summarize(buildLedgerRows(sends, "boulder")), [
      "V6: 06-28",
      "V5: 04-19, 10-04",
      "V4: 06-13",
      "V3: 04-05",
      "V2: 08-23",
    ]);
  });

  test("doesn't depend on input order", () => {
    const reversed = [...sends].reverse();
    assert.deepEqual(
      summarize(buildLedgerRows(reversed, "route")),
      summarize(buildLedgerRows(sends, "route")),
    );
  });

  test("only includes the requested discipline", () => {
    const rows = buildLedgerRows(sends, "route");
    assert.ok(rows.every((r) => getDiscipline(r.grade) === "route"));
  });

  test("drops sends with invalid grades", () => {
    const rows = buildLedgerRows([send("5.9a"), send("banana"), send("5.8")], "route");
    assert.deepEqual(summarize(rows), ["5.8: 01-01"]);
  });

  test("merges grades that differ only in case", () => {
    const rows = buildLedgerRows([send("V5"), send("v5", "2026-02-01")], "boulder");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sends.length, 2);
  });

  test("no sends → no rows", () => {
    assert.deepEqual(buildLedgerRows([], "route"), []);
    assert.deepEqual(buildLedgerRows([send("V5")], "route"), []);
  });
});
