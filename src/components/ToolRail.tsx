import { memo, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type RailKey =
  | "media"
  | "text"
  | "transitions"
  | "effects"
  | "filters"
  | "elements"
  | "music"
  | "audio"
  | "ai";

const ITEMS: { key: RailKey; label: string; badge?: string; icon: ReactNode }[] = [
  {
    key: "media",
    label: "Media",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M10 9.5l5 2.5-5 2.5v-5z" />
      </svg>
    ),
  },
  {
    key: "text",
    label: "Text",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <path d="M5 6h14M12 6v13M9 19h6" />
      </svg>
    ),
  },
  {
    key: "transitions",
    label: "Transitions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5l8 7-8 7V5zM21 5l-8 7 8 7V5z" />
      </svg>
    ),
  },
  {
    key: "effects",
    label: "Effects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 4.6L19 9.5l-4.2 3 .7 5-3.5-2.4L8.5 17.5l.7-5L5 9.5l5.1-1.9L12 3z" />
      </svg>
    ),
  },
  {
    key: "filters",
    label: "Filters",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
        <circle cx="9" cy="10" r="5.5" />
        <circle cx="15" cy="14" r="5.5" />
      </svg>
    ),
  },
  {
    key: "elements",
    label: "Elements",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="4" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
        <path d="M13 4h7.5v7.5H13z" />
      </svg>
    ),
  },
  {
    key: "music",
    label: "Music",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V6l9-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="15.5" cy="16" r="2.5" />
      </svg>
    ),
  },
  {
    key: "ai",
    label: "AI Tools",
    badge: "NEW",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4L12 4zM18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
      </svg>
    ),
  },
];

/** Far-left vertical quick-tool strip. */
function ToolRail({
  active,
  onSelect,
}: {
  active: RailKey;
  onSelect: (key: RailKey) => void;
}) {
  return (
    <nav className="nova-scroll-thin nova-panel-card flex h-full min-h-0 w-full min-w-0 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-1.5 py-3">
      {ITEMS.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            title={it.label}
            className={cn(
              "group relative flex w-full shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-all duration-300",
              on
                ? "bg-gradient-to-b from-[#00F0FF]/20 to-[#5B7CFF]/10 text-[#00F0FF] ring-1 ring-[#00F0FF]/40 shadow-[0_0_24px_-8px_#00F0FF]"
                : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
            )}
          >
            <span className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110">
              {it.icon}
            </span>
            <span className="max-w-full truncate text-[10px] font-medium leading-none tracking-tight">{it.label}</span>
            {it.badge && (
              <span className="absolute right-1 top-1 rounded-[3px] bg-fuchsia-500 px-1 text-[7px] font-bold text-white">
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
      <div className="mt-auto shrink-0 pt-2 text-[10px] text-zinc-600">More</div>
    </nav>
  );
}

/** Memoized: this panel only re-renders when its own props change. */
export default memo(ToolRail);
