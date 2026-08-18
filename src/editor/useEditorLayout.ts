import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_LAYOUT,
  EditorLayout,
  FloatRect,
  LAYOUT_LIMITS,
  PanelId,
  clampRange,
  loadLayout,
  saveLayout,
} from "./layoutStore";

type SizeKey = "mediaWidth" | "inspectorWidth" | "timelineHeight" | "sourceSplit";

/**
 * Owns the structural layout of the editor. Deliberately has no knowledge of
 * assets, clips or the transport, so nothing that happens to the media can
 * mutate a dock position or a panel size.
 */
export function useEditorLayout() {
  const [layout, setLayout] = useState<EditorLayout>(DEFAULT_LAYOUT);

  // Read persisted layout after mount so SSR and hydration agree.
  useEffect(() => setLayout(loadLayout()), []);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Persist lazily; never during a drag frame.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveLayout(layoutRef.current), 250);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [layout]);

  const setSize = useCallback((key: SizeKey, value: number) => {
    setLayout((l) => {
      const next = clampRange(value, LAYOUT_LIMITS[key]);
      return l[key] === next ? l : { ...l, [key]: next };
    });
  }, []);

  const setPanelMode = useCallback((id: PanelId, mode: "docked" | "floating") => {
    setLayout((l) =>
      l.panels[id].mode === mode
        ? l
        : { ...l, panels: { ...l.panels, [id]: { ...l.panels[id], mode } } }
    );
  }, []);

  const togglePanelMode = useCallback((id: PanelId) => {
    setLayout((l) => {
      const cur = l.panels[id];
      return {
        ...l,
        panels: {
          ...l.panels,
          [id]: { ...cur, mode: cur.mode === "docked" ? "floating" : "docked" },
        },
      };
    });
  }, []);

  const setPanelRect = useCallback((id: PanelId, rect: FloatRect) => {
    setLayout((l) => ({ ...l, panels: { ...l.panels, [id]: { ...l.panels[id], rect } } }));
  }, []);

  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), []);

  /** Docked state per panel, memoized so consumers stay referentially stable. */
  const isDocked = useCallback((id: PanelId) => layout.panels[id].mode === "docked", [layout]);

  const gridStyle = useMemo(
    () =>
      ({
        "--nova-media-w": `${layout.mediaWidth}px`,
        "--nova-inspector-w": `${layout.inspectorWidth}px`,
        "--nova-timeline-h": `${layout.timelineHeight}px`,
      }) as React.CSSProperties,
    [layout.mediaWidth, layout.inspectorWidth, layout.timelineHeight]
  );

  return {
    layout,
    gridStyle,
    setSize,
    setPanelMode,
    togglePanelMode,
    setPanelRect,
    resetLayout,
    isDocked,
  };
}

export type EditorLayoutApi = ReturnType<typeof useEditorLayout>;
