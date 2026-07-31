import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { PanelVisibility } from "../editor/types";

export type MenuActions = {
  // File
  newProject: () => void;
  openProject: () => void;
  saveProject: () => void;
  importMedia: () => void;
  exportSequence: () => void;
  // Edit
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  hasClipboard: boolean;
  // Clip
  openSpeedDialog: () => void;
  splitAtPlayhead: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  // Sequence
  addVideoTrack: () => void;
  addAudioTrack: () => void;
  deleteEmptyTracks: () => void;
  renderSequence: () => void;
  // Effects
  openEffectsBrowser: () => void;
  // Window
  panels: PanelVisibility;
  togglePanel: (key: keyof PanelVisibility) => void;
  // Help
  openShortcuts: () => void;
  openAbout: () => void;
};

type MenuId = "file" | "edit" | "clip" | "sequence" | "effects" | "window" | "help";

type Item =
  | {
      label: string;
      shortcut?: string;
      onClick?: () => void;
      disabled?: boolean;
      checked?: boolean;
    }
  | { divider: true };

export default function MenuBar({ actions }: { actions: MenuActions }) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const menus: { id: MenuId; label: string; items: Item[] }[] = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New Project", shortcut: "Ctrl+Alt+N", onClick: actions.newProject },
        { label: "Open Project…", shortcut: "Ctrl+O", onClick: actions.openProject },
        { label: "Save Project", shortcut: "Ctrl+S", onClick: actions.saveProject },
        { divider: true },
        { label: "Import Media…", shortcut: "Ctrl+I", onClick: actions.importMedia },
        { divider: true },
        { label: "Export Media…", shortcut: "Ctrl+M", onClick: actions.exportSequence },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          onClick: actions.undo,
          disabled: !actions.canUndo,
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Shift+Z",
          onClick: actions.redo,
          disabled: !actions.canRedo,
        },
        { divider: true },
        { label: "Cut", shortcut: "Ctrl+X", onClick: actions.cut, disabled: !actions.hasSelection },
        { label: "Copy", shortcut: "Ctrl+C", onClick: actions.copy, disabled: !actions.hasSelection },
        {
          label: "Paste",
          shortcut: "Ctrl+V",
          onClick: actions.paste,
          disabled: !actions.hasClipboard,
        },
        { divider: true },
        { label: "Select All", shortcut: "Ctrl+A", onClick: actions.selectAll },
      ],
    },
    {
      id: "clip",
      label: "Clip",
      items: [
        {
          label: "Speed / Duration…",
          shortcut: "Ctrl+R",
          onClick: actions.openSpeedDialog,
          disabled: !actions.hasSelection,
        },
        {
          label: "Split at Playhead",
          shortcut: "Ctrl+K",
          onClick: actions.splitAtPlayhead,
        },
        { divider: true },
        {
          label: "Group",
          shortcut: "Ctrl+G",
          onClick: actions.groupSelected,
          disabled: !actions.hasSelection,
        },
        {
          label: "Ungroup",
          shortcut: "Ctrl+Shift+G",
          onClick: actions.ungroupSelected,
        },
      ],
    },
    {
      id: "sequence",
      label: "Sequence",
      items: [
        { label: "Add Video Track", onClick: actions.addVideoTrack },
        { label: "Add Audio Track", onClick: actions.addAudioTrack },
        { divider: true },
        { label: "Delete Empty Tracks", onClick: actions.deleteEmptyTracks },
        { divider: true },
        { label: "Render In to Out", shortcut: "Enter", onClick: actions.renderSequence },
      ],
    },
    {
      id: "effects",
      label: "Effects",
      items: [
        { label: "Open Effects Browser…", shortcut: "Shift+7", onClick: actions.openEffectsBrowser },
        { divider: true },
        {
          label: "Show Lumetri Color",
          checked: actions.panels.lumetri,
          onClick: () => actions.togglePanel("lumetri"),
        },
        {
          label: "Show Effect Controls",
          checked: actions.panels.effectControls,
          onClick: () => actions.togglePanel("effectControls"),
        },
      ],
    },
    {
      id: "window",
      label: "Window",
      items: [
        {
          label: "Project Bin",
          checked: actions.panels.projectBin,
          onClick: () => actions.togglePanel("projectBin"),
        },
        {
          label: "Source Monitor",
          checked: actions.panels.sourceMonitor,
          onClick: () => actions.togglePanel("sourceMonitor"),
        },
        {
          label: "Effect Controls",
          checked: actions.panels.effectControls,
          onClick: () => actions.togglePanel("effectControls"),
        },
        {
          label: "Lumetri Color",
          checked: actions.panels.lumetri,
          onClick: () => actions.togglePanel("lumetri"),
        },
        {
          label: "Audio Meters",
          checked: actions.panels.audioMeters,
          onClick: () => actions.togglePanel("audioMeters"),
        },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Keyboard Shortcuts…", shortcut: "Ctrl+/", onClick: actions.openShortcuts },
        { label: "About NOVA Studio", onClick: actions.openAbout },
      ],
    },
  ];

  return (
    <nav ref={ref} className="flex items-center gap-0.5">
      {menus.map((m) => (
        <div key={m.id} className="relative">
          <button
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onMouseEnter={() => open && setOpen(m.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[12px] transition",
              open === m.id
                ? "bg-white/[0.09] text-zinc-100"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            )}
          >
            {m.label}
          </button>
          {open === m.id && (
            <div
              className="absolute left-0 top-full z-50 mt-1 w-[240px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#161822] shadow-2xl shadow-black/60 backdrop-blur"
              onMouseLeave={() => setOpen(null)}
            >
              {m.items.map((it, i) =>
                "divider" in it ? (
                  <div key={i} className="my-1 h-px bg-white/[0.06]" />
                ) : (
                  <button
                    key={i}
                    disabled={it.disabled}
                    onClick={() => {
                      if (it.disabled) return;
                      setOpen(null);
                      it.onClick?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] transition",
                      it.disabled
                        ? "cursor-not-allowed text-zinc-700"
                        : "text-zinc-300 hover:bg-violet-500/15 hover:text-zinc-100"
                    )}
                  >
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                      {it.checked && (
                        <svg className="h-3 w-3 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1">{it.label}</span>
                    {it.shortcut && (
                      <span className="font-mono text-[9.5px] text-zinc-600">{it.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
