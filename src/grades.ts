// Grade logic for the Grade ledger view. Pure functions, no DOM.
const BOULDER = /^V(?<num>B|\d{1,2})$/i;
const ROUTE = /^5\.(?<num>\d|1[0-5])(?<letter>[a-d])?$/;

export type Send = {
  date: string; // "YYYY-MM-DD"
  name: string;
  grade: string; // "V5" or "5.10a"
  location: string;
};

export type Discipline = "boulder" | "route";

export type LedgerRow = {
  grade: string;
  // Oldest first, so sends[0] is the first send at this grade (the gold dot).
  sends: Send[];
};

type Letter = keyof typeof LETTER_RANK_MAP;

const LETTER_RANK_MAP: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
};

const LETTERS_PER_NUMBER = Object.keys(LETTER_RANK_MAP).length; // 4

/**
 * "V5" → "boulder", "5.10a" → "route".
 */
export function getDiscipline(grade: string): Discipline | null {
  if (BOULDER.test(grade)) {
    return "boulder";
  } else if (ROUTE.test(grade)) {
    return "route";
  }

  return null;
}

/**
 * Turns a grade into a number for sorting within its own discipline,
 * so that V2 < V5 and 5.9 < 5.10a < 5.10b < 5.11c.
 *
 * - Plain string comparison fails: "5.10a" < "5.9" is true.
 * - YDS has no letters below 5.10 and uses a–d from 5.10 up.
 * - Decide what "5.10" (no letter) and garbage like "banana" do:
 *   throw, or return null? If you go with null, change the return type to
 *   `number | null` and be ready to defend the choice.
 */
export function gradeRank(grade: string): number | null {
  const boulder = grade.match(BOULDER);
  const route = grade.match(ROUTE);
  if (boulder) {
    const level = boulder.groups!.num;
    if (level.toLowerCase() === "b") {
      return -1;
    } else {
      return Number(level);
    }
  } else if (route) {
    const number = route.groups!.num;
    const letter = route.groups!.letter;
    if (Number(number) < 10 && letter) return null;
    const letterRank = letter ? LETTER_RANK_MAP[letter as Letter] : 0;

    return Number(number) * LETTERS_PER_NUMBER + letterRank;
  }
  return null;
}

/**
 * Builds the ledger rows for one discipline: hardest grade first, one row per
 * grade you've sent. Grades with no sends get no row (product call: no gap
 * rows for now). Sends with an invalid grade are dropped. Each row's sends
 * are sorted oldest first. No sends in the discipline → [].
 */
export function buildLedgerRows(
  sends: Send[],
  discipline: Discipline,
): LedgerRow[] {
  const filteredByDiscipline = sends.filter(
    (send) =>
      getDiscipline(send.grade) === discipline &&
      gradeRank(send.grade) !== null,
  );

  const byGrade = Map.groupBy(
    filteredByDiscipline,
    (send) => gradeRank(send.grade)!,
  );
  const ledgerRows = Array.from(byGrade, ([rank, sends]) => ({
    rank,
    sends,
  }));

  const sortedRows = ledgerRows.sort((a, b) => b.rank - a.rank);

  return sortedRows.map(({ sends }) => ({
    grade: sends[0].grade,
    sends: sends.toSorted((a, b) => a.date.localeCompare(b.date)),
  }));
}
