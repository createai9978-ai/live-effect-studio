import { useRef, useState, cloneElement, ReactElement } from "react";
import { cn } from "../utils/cn";

type Side = "top" | "bottom" | "left" | "right";

/**
 * Lightweight, dependency-free tooltip.
 * Renders fixed-position so it never gets clipped by panel overflow,
 * and flips automatically when it would leave the viewport.
 */
export default function Tooltip({
  label,
  hint,
  side = "bottom",
  delay = 120,
  children,
  className,
}: {
  label: string;
  hint?: string;
  side?: Side;
  delay?: number;
  children: ReactElement;
  className?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number; side: Side } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const gap = 8;
    let s: Side = side;
    if (s === "bottom" && r.bottom + 56 > window.innerHeight) s = "top";
    if (s === "top" && r.top - 56 < 0) s = "bottom";
    if (s === "right" && r.right + 200 > window.innerWidth) s = "left";
    if (s === "left" && r.left - 200 < 0) s = "right";

    const x =
      s === "left" ? r.left - gap : s === "right" ? r.right + gap : r.left + r.width / 2;
    const y =
      s === "top" ? r.top - gap : s === "bottom" ? r.bottom + gap : r.top + r.height / 2;
    setPos({ x, y, side: s });
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => show(el), delay);
  };
  const onLeave = () => {
    if (timer.current) clearTimeout(timer.current);
    setPos(null);
  };

  const transform =
    pos?.side === "top"
      ? "translate(-50%,-100%)"
      : pos?.side === "bottom"
      ? "translate(-50%,0)"
      : pos?.side === "left"
      ? "translate(-100%,-50%)"
      : "translate(0,-50%)";

  return (
    <>
      {cloneElement(children as ReactElement<Record<string, unknown>>, {
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
        onMouseDown: onLeave,
      })}
      {pos && (
        <div
          role="tooltip"
          style={{ left: pos.x, top: pos.y, transform }}
          className={cn(
            "pointer-events-none fixed z-[200] max-w-[220px] animate-[nova-tip_.16s_cubic-bezier(.22,1,.36,1)] rounded-lg border border-white/[0.09] bg-[#0f1017]/95 px-2.5 py-1.5 shadow-2xl shadow-black/60 backdrop-blur-md",
            className
          )}
        >
          <div className="text-[11px] font-medium leading-tight text-zinc-100">{label}</div>
          {hint && <div className="mt-0.5 text-[10px] leading-snug text-zinc-500">{hint}</div>}
        </div>
      )}
    </>
  );
}
