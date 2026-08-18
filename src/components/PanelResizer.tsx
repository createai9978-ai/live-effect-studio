import { memo, useCallback, useRef } from "react";
import { cn } from "../utils/cn";

type Props = {
  orientation: "vertical" | "horizontal";
  /** Current size in px of the region being resized. */
  value: number;
  /** Sign of the delta applied to the pointer movement. */
  invert?: boolean;
  onResize: (next: number) => void;
  className?: string;
  label: string;
};

/**
 * A splitter that mutates exactly one layout dimension. It never touches the
 * position or size of any other region — the grid recomputes from that single
 * CSS variable.
 */
function PanelResizer({ orientation, value, invert, onResize, className, label }: Props) {
  const startRef = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const vertical = orientation === "vertical";
      const origin = vertical ? e.clientX : e.clientY;
      startRef.current = value;
      document.body.classList.add("nova-dragging");
      const onMove = (ev: PointerEvent) => {
        const delta = (vertical ? ev.clientX : ev.clientY) - origin;
        onResize(startRef.current + (invert ? -delta : delta));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.classList.remove("nova-dragging");
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [invert, onResize, orientation, value]
  );

  const vertical = orientation === "vertical";
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-label={label}
      onPointerDown={onPointerDown}
      className={cn(
        "nova-resizer group relative z-30 shrink-0",
        vertical ? "w-[10px] cursor-col-resize" : "h-[10px] cursor-row-resize",
        className
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-transparent transition-colors duration-200 group-hover:bg-[#00F0FF]/45",
          vertical ? "inset-y-3 left-1/2 w-[2px] -translate-x-1/2" : "inset-x-6 top-1/2 h-[2px] -translate-y-1/2"
        )}
      />
    </div>
  );
}

export default memo(PanelResizer);
