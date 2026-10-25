import type { Discipline } from "./grades.ts";

type DisciplineToggleProps = {
  value: Discipline; // the tab that's selected
  onChange: (discipline: Discipline) => void; // called when a tab is clicked
  counts: Record<Discipline, number>; // sends per discipline, shown on each tab
};

const TABS: { value: Discipline; label: string }[] = [
  { value: "route", label: "Routes" },
  { value: "boulder", label: "Boulders" },
];

/**
 * The Routes / Boulders tabs in the ledger header. A controlled component:
 * it keeps no state of its own. `Ledger` owns the selected discipline and
 * passes it in as `value`; clicking a tab calls `onChange`.
 *
 * Looks like: [ Routes 9 | Boulders 6 ], with the selected tab highlighted.
 *
 * Follows the ARIA tabs pattern (role="tablist" / role="tab" with
 * aria-selected), and mcp-app.css styles the selected tab by that same
 * aria-selected attribute, so what's highlighted on screen and what a
 * screen reader announces can't disagree.
 */
export function DisciplineToggle({
  value,
  counts,
  onChange,
}: DisciplineToggleProps) {
  return (
    <div className="discipline-toggle" role="tablist">
      {TABS.map((tab) => (
        <button
          role="tab"
          key={tab.value}
          onClick={() => onChange(tab.value)}
          aria-selected={value === tab.value}
        >
          {tab.label}
          <span className="discipline-toggle-count">{counts[tab.value]}</span>
        </button>
      ))}
    </div>
  );
}
