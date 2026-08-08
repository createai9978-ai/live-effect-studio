import { cn } from "../utils/cn";
import { useAdmin } from "./AdminContext";

/** Header switch that turns Admin Mode on/off and opens the customizer. */
export default function AdminToggle() {
  const { adminMode, setAdminMode, panelOpen, setPanelOpen } = useAdmin();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        onClick={() => setAdminMode(!adminMode)}
        role="switch"
        aria-checked={adminMode}
        title="Toggle Admin Mode"
        className={cn(
          "flex items-center gap-2 rounded-full border px-2 py-1 text-[10.5px] transition-all duration-300",
          adminMode
            ? "border-[color:var(--nova-accent)]/50 bg-[color:var(--nova-accent)]/10 text-[color:var(--nova-accent)]"
            : "border-white/[0.08] bg-black/30 text-zinc-500 hover:text-zinc-200"
        )}
      >
        <span
          className={cn(
            "relative h-3.5 w-7 rounded-full transition-colors duration-300",
            adminMode ? "bg-[color:var(--nova-accent)]/60" : "bg-white/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
              adminMode ? "left-[16px]" : "left-0.5"
            )}
          />
        </span>
        <span className="hidden font-medium tracking-wide sm:inline">ADMIN</span>
      </button>

      {adminMode && (
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          title="Open visual customizer"
          className={cn(
            "rounded-md border border-white/[0.08] p-1.5 text-zinc-300 transition hover:bg-white/[0.08] hover:text-white",
            panelOpen && "bg-white/[0.08] text-white"
          )}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 007 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 13.6H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010.3 3V3a2 2 0 014 0v.1A1.7 1.7 0 0017 4.6l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </button>
      )}
    </div>
  );
}
