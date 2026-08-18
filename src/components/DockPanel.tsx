import { memo, useCallback, useEffect, useRef } from "react";
import { PANEL_TITLE, PanelId } from "../editor/layoutStore";
import type { EditorLayoutApi } from "../editor/useEditorLayout";
import { cn } from "../utils/cn";

type Props = {
  id: PanelId;
  api: EditorLayoutApi;
  /** Grid-area class applied only while docked. */
  className?: string;
  children: React.ReactNode;
};

/**
 * A single dockable editor region.
 *
 * Docked  → renders inside its own, fixed grid area. It never influences the
 *           position of any sibling because the grid areas are declared by CSS.
 * Floating→ renders as an overlay window with remembered geometry. Clicking
 *           "Dock" always returns it to its own home region — a floating panel
 *           can't be attached to a different region by accident.
 */
function DockPanel({ id, api, className, children }: Props) {
  const state = api.layout.panels[id];
  const docked = state.mode === "docked";

  const winRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef(state.rect);
  rectRef.current = state.rect;

  // Drag / resize are written straight to the DOM and committed once on
  // pointer-up, so gestures never thrash React or the rest of the layout.
  const startGesture = useCallback(
    (e: React.PointerEvent, mode: "move" | "resize") => {
      if (docked) return;
      e.preventDefault();
      const el = winRef.current;
      if (!el) return;
      const start = { ...rectRef.current };
      const ox = e.clientX;
      const oy = e.clientY;
      const next = { ...start };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - ox;
        const dy = ev.clientY - oy;
        if (mode === "move") {
          next.x = Math.max(0, Math.min(window.innerWidth - 120, start.x + dx));
          next.y = Math.max(0, Math.min(window.innerHeight - 60, start.y + dy));
          el.style.left = `${next.x}px`;
          el.style.top = `${next.y}px`;
        } else {
          next.w = Math.max(320, Math.min(1600, start.w + dx));
          next.h = Math.max(220, Math.min(1200, start.h + dy));
          el.style.width = `${next.w}px`;
          el.style.height = `${next.h}px`;
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.classList.remove("nova-dragging");
        api.setPanelRect(id, next);
      };
      document.body.classList.add("nova-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [api, docked, id]
  );

  // Keep a floating window inside the viewport when the browser is resized.
  useEffect(() => {
    if (docked) return;
    const onResize = () => {
      const r = rectRef.current;
      const x = Math.min(r.x, Math.max(0, window.innerWidth - 160));
      const y = Math.min(r.y, Math.max(0, window.innerHeight - 80));
      if (x !== r.x || y !== r.y) api.setPanelRect(id, { ...r, x, y });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [api, docked, id]);

  const toggle = (
    <button
      type="button"
      onClick={() => api.togglePanelMode(id)}
      title={docked ? `Detach ${PANEL_TITLE[id]}` : `Dock ${PANEL_TITLE[id]} back`}
      aria-label={docked ? `Detach ${PANEL_TITLE[id]}` : `Dock ${PANEL_TITLE[id]}`}
      className="nova-tap nova-dock-btn grid h-5 w-5 place-items-center rounded-md text-zinc-500 hover:bg-white/[0.08] hover:text-[#00F0FF]"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {docked ? (
          <>
            <path d="M9 3H5a2 2 0 0 0-2 2v4" />
            <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
            <rect x="8" y="8" width="12" height="9" rx="2" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 15h18" />
          </>
        )}
      </svg>
    </button>
  );

  if (docked) {
    return (
      <div className={cn("nova-dock-region nova-panel-card relative flex min-h-0 min-w-0", className)}>
        <div className="nova-dock-affordance absolute right-1.5 top-1.5 z-20">{toggle}</div>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={winRef}
      className="nova-panel-card nova-float-window fixed z-[80] flex min-h-0 min-w-0 flex-col"
      style={{ left: state.rect.x, top: state.rect.y, width: state.rect.w, height: state.rect.h }}
    >
      <div
        onPointerDown={(e) => startGesture(e, "move")}
        className="flex shrink-0 cursor-grab items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-3 py-1.5 active:cursor-grabbing"
      >
        <span className="truncate text-[11px] font-semibold text-zinc-200">{PANEL_TITLE[id]}</span>
        {toggle}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <div
        onPointerDown={(e) => startGesture(e, "resize")}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
      />
    </div>
  );
}

export default memo(DockPanel);
