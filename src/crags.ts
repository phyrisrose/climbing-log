// Per-crag summary for the fullscreen ledger's crag list. Pure, no DOM.
import { getDiscipline, gradeRank, type Send } from "./grades.ts";

export type CragSummary = {
  name: string; // the send's `location`
  count: number; // sends at this crag (valid grades only)
  hardestRoute: string | null; // null if no routes here
  hardestBoulder: string | null; // null if no boulders here
};

// The harder of two grades in the same discipline; `current` may be null.
function harder(current: string | null, grade: string): string {
  if (current === null) return grade;
  return gradeRank(grade)! > gradeRank(current)! ? grade : current;
}

/**
 * One entry per crag: how many sends, and the hardest route and boulder.
 * Sends with an invalid grade are skipped. Sorted by count, most first;
 * ties alphabetically by name.
 */
export function summarizeCrags(sends: Send[]): CragSummary[] {
  const byCrag = new Map<string, CragSummary>();

  for (const send of sends) {
    const discipline = getDiscipline(send.grade);
    if (discipline === null || gradeRank(send.grade) === null) continue;

    const crag = byCrag.get(send.location) ?? {
      name: send.location,
      count: 0,
      hardestRoute: null,
      hardestBoulder: null,
    };
    crag.count++;
    if (discipline === "route") crag.hardestRoute = harder(crag.hardestRoute, send.grade);
    else crag.hardestBoulder = harder(crag.hardestBoulder, send.grade);
    byCrag.set(send.location, crag);
  }

  return [...byCrag.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
