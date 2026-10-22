import type { Send } from "./grades.ts";
import { datePercent, type DateRange } from "./timeline.ts";

type DotStripProps = {
  sends: Send[]; // one row's sends, oldest first
  range: DateRange;
};

/**
 * The right side of a ledger row: one dot per send, placed left to right by
 * date across `range`. The first send (sends[0]) is the bigger gold dot;
 * repeats are smaller grey ones.
 *
 * The wrapper (.dot-strip in mcp-app.css) draws the center line and is the
 * positioning box: each dot's `left` is a percentage of its width. Sends
 * outside `range` (datePercent → null) aren't drawn. Each dot's `title` is
 * a plain tooltip until slice 4.
 */
export function DotStrip({ sends, range }: DotStripProps) {
  return (
    <div className="dot-strip">
      {sends.map((send, index) => {
        const percentage = datePercent(send.date, range);
        if (percentage === null) return null;

        const isFirst = index === 0;

        return (
          <div
            key={`${send.date}-${send.name}`}
            className={`dot${isFirst ? " dot--first" : ""}`}
            title={`${send.name} - ${send.grade} - ${send.date}`}
            style={{ left: `${percentage}%` }}
          />
        );
      })}
    </div>
  );
}
