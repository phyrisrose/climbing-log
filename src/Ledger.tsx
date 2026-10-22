import { DotStrip } from "./DotStrip.tsx";
import { buildLedgerRows, getDiscipline, type Send } from "./grades.ts";
import { monthRange } from "./timeline.ts";

/** The Grade ledger for routes: one row per grade sent, hardest first. */
export function Ledger({ sends }: { sends: Send[] }) {
  const rows = buildLedgerRows(sends, "route");
  if (rows.length === 0) return <p className="ledger-empty">No routes logged yet.</p>;

  const routeCount = rows.reduce((n, r) => n + r.sends.length, 0);
  const maxCount = Math.max(...rows.map((r) => r.sends.length));
  // One shared range so every row's dots line up on the same time axis.
  const range = monthRange(
    sends.filter((s) => getDiscipline(s.grade) === "route").map((s) => s.date),
  );

  return (
    <section className="ledger">
      <header className="ledger-header">
        <h1>Grade ledger</h1>
        <p>
          {routeCount} {routeCount === 1 ? "route" : "routes"} · hardest {rows[0].grade}
        </p>
      </header>
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
            <DotStrip sends={row.sends} range={range} />
          </div>
        ))}
      </div>
    </section>
  );
}
