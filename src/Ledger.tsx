import { useState } from "react";
import { CragList } from "./CragList.tsx";
import { summarizeCrags } from "./crags.ts";
import { DisciplineToggle } from "./DisciplineToggle.tsx";
import { DotStrip } from "./DotStrip.tsx";
import {
  buildLedgerRows,
  getDiscipline,
  type Discipline,
  type LedgerRow,
  type Send,
} from "./grades.ts";
import { SendTooltip } from "./SendTooltip.tsx";
import { formatRange, monthRange, type DateRange } from "./timeline.ts";
import { useSendTooltip } from "./useSendTooltip.ts";

const NOUNS: Record<Discipline, [singular: string, plural: string]> = {
  route: ["route", "routes"],
  boulder: ["boulder", "boulders"],
};

const pluralize = (discipline: Discipline, n: number) =>
  NOUNS[discipline][n === 1 ? 0 : 1];

// Block headings in fullscreen, where both disciplines are stacked.
const BLOCK_LABELS: Record<Discipline, string> = {
  route: "Routes · YDS",
  boulder: "Boulders · V-scale",
};

type LedgerProps = {
  sends: Send[];
  expanded: boolean; // fullscreen: both disciplines stacked, plus the crag list
  canExpand: boolean; // the host offers fullscreen
  onToggleExpand: () => void;
};

/**
 * The Grade ledger: one row per grade sent, hardest first. Inline it shows
 * one discipline at a time with a toggle; fullscreen shows both, stacked,
 * with a list of crags beside them.
 */
export function Ledger({ sends, expanded, canExpand, onToggleExpand }: LedgerProps) {
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

  const rowsByDiscipline: Record<Discipline, LedgerRow[]> = {
    route: buildLedgerRows(valid, "route"),
    boulder: buildLedgerRows(valid, "boulder"),
  };
  const rows = rowsByDiscipline[discipline];

  const countOf = (r: LedgerRow[]) => r.reduce((n, row) => n + row.sends.length, 0);
  const counts: Record<Discipline, number> = {
    route: countOf(rowsByDiscipline.route),
    boulder: countOf(rowsByDiscipline.boulder),
  };

  // One range for both disciplines, from all sends, so the time axis stays
  // put when switching between routes and boulders (and lines up when
  // they're stacked in fullscreen).
  const range = monthRange(valid.map((s) => s.date));
  const crags = summarizeCrags(valid);

  // Subtitle: one discipline inline, both in fullscreen.
  let summary: string;
  if (expanded) {
    const total = counts.route + counts.boulder;
    const hardest = [rowsByDiscipline.route[0]?.grade, rowsByDiscipline.boulder[0]?.grade]
      .filter(Boolean)
      .join(" and ");
    summary = `${total} ${total === 1 ? "send" : "sends"} · hardest ${hardest}`;
  } else {
    const count = counts[discipline];
    summary = `${count} ${pluralize(discipline, count)}`;
    if (rows.length > 0) summary += ` · hardest ${rows[0].grade}`;
  }

  const rowProps = { range, tooltip };

  return (
    <section
      className={`ledger${expanded ? " ledger--expanded" : ""}`}
      ref={tooltip.containerRef}
    >
      <header className="ledger-header">
        <div className="ledger-header-title">
          <h1>Grade ledger</h1>
          <p>
            {summary} · {formatRange(range)}
          </p>
        </div>
        <div className="ledger-header-actions">
          {!expanded && (
            <DisciplineToggle value={discipline} onChange={changeDiscipline} counts={counts} />
          )}
          {canExpand && <ExpandButton expanded={expanded} onClick={onToggleExpand} />}
        </div>
      </header>

      {expanded ? (
        <div className="ledger-body">
          <div className="ledger-blocks">
            {(["route", "boulder"] as const).map((d) => (
              <div className="ledger-block" key={d}>
                <h2 className="ledger-block-label">{BLOCK_LABELS[d]}</h2>
                <LedgerRows discipline={d} rows={rowsByDiscipline[d]} {...rowProps} />
              </div>
            ))}
          </div>
          <CragList crags={crags} />
        </div>
      ) : (
        <LedgerRows discipline={discipline} rows={rows} {...rowProps} />
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
          {crags.length} {crags.length === 1 ? "crag" : "crags"}
        </span>
      </footer>

      {tooltip.active && (
        <SendTooltip ref={tooltip.cardRef} send={tooltip.active} style={tooltip.style} />
      )}
    </section>
  );
}

type LedgerRowsProps = {
  discipline: Discipline; // for the empty-state message
  rows: LedgerRow[];
  range: DateRange;
  tooltip: ReturnType<typeof useSendTooltip>;
};

/** One discipline's rows: count bar, grade, dot strip. */
function LedgerRows({ discipline, rows, range, tooltip }: LedgerRowsProps) {
  if (rows.length === 0) {
    return <p className="ledger-empty">No {pluralize(discipline, 0)} logged yet.</p>;
  }

  const maxCount = Math.max(...rows.map((r) => r.sends.length));

  return (
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
  );
}

/** The fullscreen button: arrows pointing out to expand, in to exit. */
function ExpandButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  const label = expanded ? "Exit fullscreen" : "Fullscreen";
  return (
    <button type="button" className="ledger-expand" onClick={onClick} aria-label={label} title={label}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {expanded ? (
          <>
            <path d="M4 14h6v6M20 10h-6V4" />
            <path d="M14 10l7-7M3 21l7-7" />
          </>
        ) : (
          <>
            <path d="M15 3h6v6M9 21H3v-6" />
            <path d="M21 3l-7 7M3 21l7-7" />
          </>
        )}
      </svg>
    </button>
  );
}
