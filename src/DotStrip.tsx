import type { PointerEvent as ReactPointerEvent } from "react";
import type { Send } from "./grades.ts";
import { formatSendDate } from "./SendTooltip.tsx";
import { datePercent, type DateRange } from "./timeline.ts";

type DotStripProps = {
  sends: Send[]; // one row's sends, oldest first
  range: DateRange;
  active: Send | null; // the send whose tooltip is showing, if any
  onShow: (send: Send, dot: HTMLElement) => void;
  onHide: () => void;
  onToggle: (send: Send, dot: HTMLElement) => void;
};

const isMouse = (e: ReactPointerEvent) => e.pointerType === "mouse";

/**
 * The right side of a ledger row: one dot per send, placed left to right by
 * date across `range`. The first send (sends[0]) is the bigger gold dot;
 * repeats are smaller grey ones.
 *
 * The wrapper (.dot-strip in mcp-app.css) draws the center line and is the
 * positioning box: each dot's `left` is a percentage of its width. Sends
 * outside `range` (datePercent → null) aren't drawn.
 *
 * Each dot is a <button> labeled with the climb, so keyboard and screen
 * reader users can reach it. It reports to Ledger, which owns the tooltip:
 * mouse hover shows/hides, keyboard focus shows/hides, and a tap toggles.
 */
export function DotStrip({ sends, range, active, onShow, onHide, onToggle }: DotStripProps) {
  return (
    <div className="dot-strip">
      {sends.map((send, index) => {
        const percentage = datePercent(send.date, range);
        if (percentage === null) return null;

        const isFirst = index === 0;

        return (
          <button
            type="button"
            key={`${send.date}-${send.name}`}
            className={`dot${isFirst ? " dot--first" : ""}`}
            style={{ left: `${percentage}%` }}
            aria-label={`${send.name}, ${send.grade}, ${formatSendDate(send.date)}, ${send.location}`}
            data-active={active === send}
            onPointerEnter={(e) => isMouse(e) && onShow(send, e.currentTarget)}
            onPointerLeave={(e) => isMouse(e) && onHide()}
            // Only keyboard focus: a mouse click or a tap also focuses the
            // button, but those are handled by hover and onClick.
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && onShow(send, e.currentTarget)}
            onBlur={onHide}
            onClick={(e) => {
              // A click is a PointerEvent; touch and pen taps toggle.
              const type = (e.nativeEvent as PointerEvent).pointerType;
              if (type === "touch" || type === "pen") onToggle(send, e.currentTarget);
            }}
          />
        );
      })}
    </div>
  );
}
