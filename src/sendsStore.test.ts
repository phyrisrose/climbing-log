import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { Send } from "./grades.ts";
import { addSend, DuplicateSendError, formatSends, readSends } from "./sendsStore.ts";

// The real log, used only as read-only sample data. Tests write to a copy.
const REAL_SENDS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sends.json");

const send = (name: string, date = "2026-11-20"): Send => ({
  date,
  name,
  grade: "5.10a",
  location: "Eldorado Canyon, CO",
});

let dir: string;
let file: string;
let original: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "climbing-log-"));
  file = path.join(dir, "sends.json");
  original = await fs.readFile(REAL_SENDS, "utf-8");
  await fs.writeFile(file, original);
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("formatSends", () => {
  test("reproduces sends.json byte for byte", async () => {
    assert.equal(formatSends(await readSends(file)), original);
  });

  test("writes an empty log as []", () => {
    assert.equal(formatSends([]), "[]\n");
  });
});

describe("addSend", () => {
  test("appends exactly one line and returns the whole log", async () => {
    const before = await readSends(file);
    const after = await addSend(file, send("New Route"));

    assert.equal(after.length, before.length + 1);
    assert.deepEqual(after.at(-1), send("New Route"));
    assert.deepEqual(await readSends(file), after);

    const oldLines = original.trimEnd().split("\n");
    const newLines = (await fs.readFile(file, "utf-8")).trimEnd().split("\n");
    assert.equal(newLines.length, oldLines.length + 1);
  });

  test("rejects the same climb on the same date, ignoring case and spaces", async () => {
    await assert.rejects(addSend(file, send("  pea brain ", "2026-03-14")), DuplicateSendError);
    assert.equal(await fs.readFile(file, "utf-8"), original); // unchanged
  });

  test("allows the same climb on a different date", async () => {
    const after = await addSend(file, send("Pea Brain", "2026-11-20"));
    assert.equal(after.filter((s) => s.name === "Pea Brain").length, 2);
  });

  test("keeps every send when several are added at once", async () => {
    const names = ["A", "B", "C", "D", "E"];
    await Promise.all(names.map((name) => addSend(file, send(name))));
    const logged = (await readSends(file)).map((s) => s.name);
    for (const name of names) assert.ok(logged.includes(name), name);
  });

  test("a failed add doesn't block the next one", async () => {
    await assert.rejects(addSend(file, send("Pea Brain", "2026-03-14")));
    const after = await addSend(file, send("Next One"));
    assert.equal(after.at(-1)?.name, "Next One");
  });

  test("leaves no temporary files behind", async () => {
    await addSend(file, send("New Route"));
    await assert.rejects(addSend(file, send("New Route")));
    assert.deepEqual(await fs.readdir(dir), ["sends.json"]);
  });

  test("works on an empty log", async () => {
    await fs.writeFile(file, "[]\n");
    assert.deepEqual(await addSend(file, send("First")), [send("First")]);
  });
});
