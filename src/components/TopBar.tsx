import MenuBar, { MenuActions } from "./MenuBar";
import { Workspace } from "../editor/types";
import { cn } from "../utils/cn";
import Tooltip from "./Tooltip";

const WORKSPACES: { id: Workspace; label: string; hint: string }[] = [
  { id: "editing", label: "Editing", hint: "Timeline, trimming and assembly tools" },
  { id: "color", label: "Color", hint: "Lumetri grading wheels, curves and LUTs" },
  { id: "audio", label: "Audio", hint: "Mixer, levels and audio effects" },
  { id: "graphics", label: "Graphics", hint: "Titles, shapes and motion graphics" },
];

export default function TopBar({
  workspace,
  onSetWorkspace,
  menuActions,
  projectName,
  onOpenAssetBrowser,
}: {
  workspace: Workspace;
  onSetWorkspace: (w: Workspace) => void;
  menuActions: MenuActions;
  projectName: string;
  onOpenAssetBrowser: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111218] px-3">
      {/* Logo */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 9h20M7 5v4M12 5v4M17 5v4M7 15h4" />
          </svg>
        </div>
        <span className="hidden text-[13px] font-semibold tracking-wide text-zinc-100 md:inline">
          NOVA <span className="font-light text-zinc-400">Studio</span>
          <span className="ml-1.5 rounded bg-white/[0.07] px-1 py-px text-[8px] font-medium tracking-wider text-zinc-500">EDIT</span>
        </span>
      </div>

      {/* Menu bar */}
      <MenuBar actions={menuActions} />

      {/* Workspace tabs */}
      <div className="mx-auto flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
        {WORKSPACES.map((w) => (
          <Tooltip key={w.id} label={`${w.label} workspace`} hint={w.hint} side="bottom">
            <button
              onClick={() => onSetWorkspace(w.id)}
              aria-pressed={workspace === w.id}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] active:scale-95",
                workspace === w.id
                  ? "bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white shadow-lg shadow-violet-600/25"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
              )}
            >
              {w.label}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Project name */}
      <div className="hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-1 lg:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
        <span className="max-w-[180px] truncate text-[12px] text-zinc-300">{projectName}</span>
      </div>

      {/* Asset Library launcher */}
      <Tooltip label="Asset Library" hint="Effects, stock, audio, titles and transitions" side="bottom">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenAssetBrowser();
        }}
        className="hidden shrink-0 items-center gap-1.5 rounded-md border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 transition hover:from-violet-500/25 hover:to-fuchsia-500/20 md:flex"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.5 5 5.5.8-4 3.8 1 5.4-5-2.6-5 2.6 1-5.4-4-3.8 5.5-.8L12 2z" />
        </svg>
        Assets
        <span className="rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1 py-px text-[7.5px] font-bold text-white">
          NEW
        </span>
      </button>
      </Tooltip>

      {/* Export shortcut */}
      <Tooltip label="Export Media" hint="Choose resolution, frame rate, format and quality · Ctrl+M" side="bottom">
      <button
        onClick={menuActions.exportSequence}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M12 15l-4-4M12 15l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        Export
      </button>
      </Tooltip>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[10px] font-bold text-white ring-2 ring-white/10">
        AK
      </div>
    </header>
  );
}
