// Reading and appending to the sends file. Server-only: uses node:fs, and
// the View never imports it.
import fs from "node:fs/promises";
import path from "node:path";
import type { Send } from "./grades.ts";

/** Thrown by addSend when the same climb is already logged on that date. */
export class DuplicateSendError extends Error {
  override name = "DuplicateSendError";
}

export async function readSends(file: string): Promise<Send[]> {
  return JSON.parse(await fs.readFile(file, "utf-8"));
}

/**
 * The file's layout: one send per line, keys in a fixed order, a space after
 * each colon and inside the braces. Keeping it means `git diff sends.json`
 * shows exactly the lines that changed.
 */
export function formatSends(sends: Send[]): string {
  if (sends.length === 0) return "[]\n";
  const line = ({ date, name, grade, location }: Send) =>
    `  { "date": ${JSON.stringify(date)}, "name": ${JSON.stringify(name)}, ` +
    `"grade": ${JSON.stringify(grade)}, "location": ${JSON.stringify(location)} }`;
  return `[\n${sends.map(line).join(",\n")}\n]\n`;
}

// One queue per file: each task starts only after the previous one finished,
// whether it succeeded or failed. Without it, two quick adds could both read
// the same old file, and the second write would drop the first send.
const queues = new Map<string, Promise<unknown>>();

function serialize<T>(file: string, task: () => Promise<T>): Promise<T> {
  const key = path.resolve(file);
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(key, next.catch(() => {})); // a failed task mustn't block later ones
  return next;
}

const sameClimb = (a: Send, b: Send) =>
  a.date === b.date && a.name.trim().toLowerCase() === b.name.trim().toLowerCase();

/**
 * Appends a send and returns the whole log after the change. Expects an
 * already-validated send (see validateSend).
 *
 * Rejects with DuplicateSendError if the same climb (name ignoring case and
 * surrounding spaces) is already logged on the same date; the file is then
 * left unchanged.
 *
 * The write is atomic: the new contents go to a temporary file in the same
 * folder, which is then renamed over the original. A crash mid-write leaves
 * the old file intact instead of a half-written one.
 */
export function addSend(file: string, send: Send): Promise<Send[]> {
  return serialize(file, async () => {
    const sends = await readSends(file);
    if (sends.some((existing) => sameClimb(existing, send))) {
      throw new DuplicateSendError(`"${send.name}" on ${send.date} is already in the log.`);
    }

    const updated = [...sends, send];
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(temp, formatSends(updated), "utf-8");
      await fs.rename(temp, file);
    } catch (error) {
      await fs.rm(temp, { force: true });
      throw error;
    }
    return updated;
  });
}
