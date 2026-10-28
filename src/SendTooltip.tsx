import type { CSSProperties, Ref } from "react";
import type { Send } from "./grades.ts";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC", // "YYYY-MM-DD" parses as UTC midnight; keep the same day everywhere
});

/** "2026-05-17" → "May 17, 2026" in the viewer's locale. */
export const formatSendDate = (date: string) => dateFormat.format(new Date(date));

type SendTooltipProps = {
  send: Send;
  style: CSSProperties; // position, set by Ledger
  ref?: Ref<HTMLDivElement>; // React 19: refs are plain props, no forwardRef
};

/**
 * The card shown for the active dot: name and grade, date, location.
 * Purely visual: each dot's aria-label already says the same thing, so the
 * card is hidden from screen readers to avoid announcing it twice.
 */
export function SendTooltip({ send, style, ref }: SendTooltipProps) {
  return (
    <div ref={ref} className="send-tooltip" style={style} aria-hidden="true">
      <div className="send-tooltip-title">
        <span className="send-tooltip-name">{send.name}</span>
        <span className="send-tooltip-grade">{send.grade}</span>
      </div>
      <div>{formatSendDate(send.date)}</div>
      <div>{send.location}</div>
    </div>
  );
}
