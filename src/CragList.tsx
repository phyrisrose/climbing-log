import type { CragSummary } from "./crags.ts";

/**
 * The fullscreen crag list: each crag with its hardest route and boulder
 * (whichever it has) and its send count, most sends first.
 */
export function CragList({ crags }: { crags: CragSummary[] }) {
  return (
    <aside className="crag-list" aria-label="Crags">
      <h2 className="ledger-block-label">Crags</h2>
      <ul>
        {crags.map((crag) => (
          <li key={crag.name}>
            <span className="crag-name">{crag.name}</span>
            <span className="crag-hardest">
              {[crag.hardestRoute, crag.hardestBoulder].filter(Boolean).join(" · ")}
            </span>
            <span className="crag-count">{crag.count}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
