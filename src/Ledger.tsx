import { useState } from "react";
import { DisciplineToggle } from "./DisciplineToggle.tsx";
import { DotStrip } from "./DotStrip.tsx";
import {
  buildLedgerRows,
  getDiscipline,
  type Discipline,
  type Send,
} from "./grades.ts";
import { SendTooltip } from "./SendTooltip.tsx";
import { formatRange, monthRange } from "./timeline.ts";
import { useSendTooltip } from "./useSendTooltip.ts";

const NOUNS: Record<Discipline, [singular: string, plural: string]> = {
  route: ["route", "routes"],
  boulder: ["boulder", "boulders"],
};

const pluralize = (discipline: Discipline, n: number) =>
  NOUNS[discipline][n === 1 ? 0 : 1];

/** The Grade ledger: one row per grade sent, hardest first, for one discipline at a time. */
export function Ledger({ sends }: { sends: Send[] }) {
  const [discipline, setDiscipline] = useState<Discipline>("route");
  // Hooks go before the early return below: React needs the same hooks
  // called in the same order on every render.
  const tooltip = useSendTooltip();

  const changeDiscipline = (next: Discipline) => {
    tooltip.hide(); // its dot is about to disappear
    setDiscipline(next);
  };

  // Only sends with a valid grade count anywhere in the ledger.
  const valid = sends.filter((s) => getDiscipline(s.grade) !== null);
  if (valid.length === 0)
    return <p className="ledger-empty">No sends logged yet.</p>;

  const routeRows = buildLedgerRows(valid, "route");
  const boulderRows = buildLedgerRows(valid, "boulder");
  const rows = discipline === "route" ? routeRows : boulderRows;

  const countOf = (r: typeof rows) =>
    r.reduce((n, row) => n + row.sends.length, 0);
  const counts: Record<Discipline, number> = {
    route: countOf(routeRows),
    boulder: countOf(boulderRows),
  };
  const count = counts[discipline];
  const maxCount = Math.max(1, ...rows.map((r) => r.sends.length));

  // One range for both tabs, from all sends, so the time axis stays put when
  // switching between routes and boulders.
  const range = monthRange(valid.map((s) => s.date));
  const cragCount = new Set(valid.map((s) => s.location)).size;

  return (
    <section className="ledger" ref={tooltip.containerRef}>
      <header className="ledger-header">
        <div className="ledger-header-title">
          <h1>Grade ledger</h1>
          <p>
            {count} {pluralize(discipline, count)}
            {rows.length > 0 && ` · hardest ${rows[0].grade}`} ·{" "}
            {formatRange(range)}
          </p>
        </div>
        <DisciplineToggle
          value={discipline}
          onChange={changeDiscipline}
          counts={counts}
        />
      </header>

      {rows.length === 0 ? (
        <p className="ledger-empty">
          No {pluralize(discipline, 0)} logged yet.
        </p>
      ) : (
        <div className="ledger-rows">
          {rows.map((row) => (
            <div className="ledger-row" key={row.grade}>
              <div className="ledger-count">
                <span>{row.sends.length}</span>
                <div
                  className="ledger-bar"
                  style={{ width: `${(row.sends.length / maxCount) * 100}%` }}
                />
              </div>
              <div className="ledger-grade">{row.grade}</div>
              <DotStrip
                sends={row.sends}
                range={range}
                active={tooltip.active}
                onShow={tooltip.show}
                onHide={tooltip.hide}
                onToggle={tooltip.toggle}
              />
            </div>
          ))}
        </div>
      )}

      <footer className="ledger-footer">
        <div className="ledger-legend">
          <span>
            <span className="legend-dot legend-dot--first" />
            First send at grade
          </span>
          <span>
            <span className="legend-dot" />
            Repeat at grade
          </span>
        </div>
        <span>
          {cragCount} {cragCount === 1 ? "crag" : "crags"}
        </span>
      </footer>

      {tooltip.active && (
        <SendTooltip ref={tooltip.cardRef} send={tooltip.active} style={tooltip.style} />
      )}
    </section>
  );
}
