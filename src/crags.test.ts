import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sends from "../sends.json" with { type: "json" };
import { summarizeCrags } from "./crags.ts";
import type { Send } from "./grades.ts";

const send = (grade: string, location: string): Send => ({
  date: "2026-01-01",
  name: `Test ${grade}`,
  grade,
  location,
});

describe("summarizeCrags", () => {
  test("sends.json: one entry per crag, most sends first", () => {
    const crags = summarizeCrags(sends);
    assert.equal(crags.length, 8);
    assert.deepEqual(crags[0], {
      name: "Eldorado Canyon, CO",
      count: 5,
      hardestRoute: "5.10a",
      hardestBoulder: null,
    });
    // Counts never go up as you read down the list.
    for (let i = 1; i < crags.length; i++) {
      assert.ok(crags[i - 1].count >= crags[i].count);
    }
  });

  test("a crag with both disciplines keeps the hardest of each", () => {
    const [rmnp] = summarizeCrags([
      send("V4", "RMNP"),
      send("5.9", "RMNP"),
      send("V6", "RMNP"),
      send("5.11a", "RMNP"),
      send("5.10d", "RMNP"),
    ]);
    assert.deepEqual(rmnp, { name: "RMNP", count: 5, hardestRoute: "5.11a", hardestBoulder: "V6" });
  });

  test("compares grades by rank, not as strings", () => {
    // As strings, "5.9" > "5.10a" and "V5" > "V10".
    const [crag] = summarizeCrags([
      send("5.9", "A"),
      send("5.10a", "A"),
      send("V5", "A"),
      send("V10", "A"),
    ]);
    assert.equal(crag.hardestRoute, "5.10a");
    assert.equal(crag.hardestBoulder, "V10");
  });

  test("skips sends with invalid grades", () => {
    const crags = summarizeCrags([send("banana", "A"), send("5.9a", "A"), send("V3", "B")]);
    assert.deepEqual(crags, [{ name: "B", count: 1, hardestRoute: null, hardestBoulder: "V3" }]);
  });

  test("ties are sorted alphabetically", () => {
    const names = summarizeCrags([send("V1", "Zeta"), send("V1", "Alpha"), send("V1", "Mid")]).map(
      (c) => c.name,
    );
    assert.deepEqual(names, ["Alpha", "Mid", "Zeta"]);
  });

  test("no sends → no crags", () => {
    assert.deepEqual(summarizeCrags([]), []);
  });
});
