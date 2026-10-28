import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Send } from "./grades.ts";
import { placeTooltip } from "./tooltip.ts";

type Active = { send: Send; dot: HTMLElement };

/**
 * State and behavior for the ledger's single tooltip.
 *
 * - show / hide / toggle are what the dots call (see DotStrip).
 * - containerRef goes on the element the card is positioned in (the ledger),
 *   cardRef on the card itself.
 * - While a tooltip is open, Escape, a tap outside any dot, or a window
 *   resize closes it.
 *
 * Placing the card takes two passes: render it hidden so its real size can
 * be measured, then compute the position with placeTooltip. useLayoutEffect
 * runs both before the browser paints, so the hidden pass is never seen.
 */
export function useSendTooltip() {
  const [active, setActive] = useState<Active | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const show = (send: Send, dot: HTMLElement) => setActive({ send, dot });
  const hide = () => setActive(null);
  const toggle = (send: Send, dot: HTMLElement) =>
    setActive((current) => (current?.send === send ? null : { send, dot }));

  // Measure the dot, the container and the hidden card; then place the card.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!active || !container || !card) {
      setPosition(null);
      return;
    }
    const c = container.getBoundingClientRect();
    const d = active.dot.getBoundingClientRect();
    const { left, top } = placeTooltip(
      { left: d.left - c.left, top: d.top - c.top, width: d.width, height: d.height },
      { width: c.width, height: c.height },
      { width: card.offsetWidth, height: card.offsetHeight },
    );
    setPosition({ left, top });
  }, [active]);

  // While open: close on Escape, on a tap or click outside the dots, and on
  // resize (the measured positions would be stale).
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onPointerDown = (e: PointerEvent) => {
      // Taps on a dot are handled by its own onClick (toggle or switch).
      if (!(e.target instanceof Element && e.target.closest(".dot"))) hide();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", hide);
    };
  }, [active]);

  const style: CSSProperties = position ?? { left: 0, top: 0, visibility: "hidden" };

  return { active: active?.send ?? null, show, hide, toggle, containerRef, cardRef, style };
}
