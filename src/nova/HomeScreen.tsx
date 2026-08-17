import { useState } from "react";
import { cn } from "../utils/cn";
import EditableText from "../admin/EditableText";
import AdminToggle from "../admin/AdminToggle";
import { useAdmin } from "../admin/AdminContext";
import { useAuth } from "../auth/AuthContext";
import HeroPreview from "./HeroPreview";

/**
 * NOVA Studio launcher — the dashboard shown before the editor opens.
 * Premium studio layout: grouped side rail with a sliding active indicator,
 * aspect-ratio picker, cinematic hero, quick-action tools and a project shelf.
 */

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

const RATIOS: { id: AspectRatio; label: string; hint: string }[] = [
  { id: "16:9", label: "16:9", hint: "Landscape" },
  { id: "9:16", label: "9:16", hint: "Vertical" },
  { id: "1:1", label: "1:1", hint: "Square" },
  { id: "4:5", label: "4:5", hint: "Portrait" },
];

const QUICK_TOOLS = [
  { id: "text-to-video", label: "Text to Video", desc: "Turn a script into an edit", icon: "M4 6h16M4 12h10M4 18h7" },
  { id: "captions", label: "Auto Captions", desc: "Caption clips automatically", icon: "M4 5h16v14H4zM7 10h4M7 14h8" },
  { id: "recorder", label: "Screen Recorder", desc: "Capture your screen", icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM3 6h18v12H3z" },
  { id: "enhance", label: "AI Enhancer", desc: "Upscale and denoise", icon: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" },
];

const RECOMMENDED = [
  { id: "charts", label: "Animated Charts", badge: "" },
  { id: "extend", label: "AI Extend", badge: "HOT" },
  { id: "audio-video", label: "Audio to Video", badge: "" },
  { id: "idea", label: "Idea to Video", badge: "BETA" },
  { id: "shorts", label: "Smart Short Clips", badge: "" },
  { id: "more", label: "More Tools", badge: "" },
];

type NavItem = { id: string; label: string; icon: string; badge?: string };

const NAV_GROUPS: { id: string; title: string; items: NavItem[] }[] = [
  {
    id: "workspace",
    title: "Workspace",
    items: [
      { id: "create", label: "Create Project", icon: "M12 5v14M5 12h14" },
      { id: "cloud", label: "Studio Cloud", icon: "M6 18a4 4 0 010-8 5 5 0 019.6-1.6A4 4 0 1118 18z", badge: "SYNC" },
    ],
  },
  {
    id: "library",
    title: "Library",
    items: [
      { id: "hub", label: "Creator Hub", icon: "M4 6h16v12H4zM4 10h16" },
      { id: "toolbox", label: "Toolbox", icon: "M3 8h18v11H3zM8 8V6a4 4 0 018 0v2" },
    ],
  },
];

export default function HomeScreen({
  onCreateProject,
  onOpenProject,
  recentProjects = [],
}: {
  onCreateProject: (ratio: AspectRatio) => void;
  onOpenProject: () => void;
  recentProjects?: { id: string; name: string; edited: string }[];
}) {
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [nav, setNav] = useState("create");
  const { settings } = useAdmin();
  const { user, profile, isAdmin } = useAuth();
  const accountLabel = profile?.display_name || user?.email || "Guest session";
  const accountInitials = (accountLabel.match(/\b[a-z0-9]/gi) ?? ["N"])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#111621] font-sans text-zinc-200 antialiased">
      {/* Ambient cinematic wash behind the whole launcher */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[540px] w-[540px] rounded-full opacity-[0.16] blur-[120px]"
        style={{
          background: `radial-gradient(circle, var(--nova-accent,#00E5FF), transparent 70%)`,
          animation: "nova-aurora 18s var(--ease-drift) infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 right-0 h-[560px] w-[560px] rounded-full opacity-[0.14] blur-[130px]"
        style={{
          background: `radial-gradient(circle, var(--nova-accent-2,#8A2BE2), transparent 70%)`,
          animation: "nova-aurora 24s var(--ease-drift) infinite reverse",
        }}
      />

      {/* ---------- Side rail ---------- */}
      <aside className="relative z-10 hidden w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[#131824]/85 p-4 backdrop-blur-xl md:flex">
        <div className="nova-rise mb-8 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-violet-500/25"
            style={{
              background: settings.logoUrl ? "transparent" : `linear-gradient(135deg, ${settings.accent}, ${settings.accent2})`,
              animation: "nova-breathe 5.5s var(--ease-drift) infinite",
            }}
          >
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="App logo" className="h-full w-full object-contain" />
            ) : (
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 9h20M7 5v4M12 5v4M17 5v4" />
              </svg>
            )}
          </div>
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold text-zinc-50">
              <EditableText id="home.brand" text="NOVA" />
            </div>
            <div className="text-[11px] font-light text-zinc-400">
              <EditableText id="home.brandSub" text="Studio" />
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="nova-stagger flex flex-col gap-1">
              <div className="px-3 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                {group.title}
              </div>
              {group.items.map((n) => {
                const active = nav === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setNav(n.id)}
                    className={cn(
                      "group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2.5 text-[12.5px]",
                      "transition-[background-color,color,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "hover:translate-x-[3px]",
                      active
                        ? "bg-gradient-to-r from-[#00E5FF]/15 to-[#8A2BE2]/15 text-[#8DF3FF] ring-1 ring-[#00E5FF]/25"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                    )}
                  >
                    {/* sliding active rail */}
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00E5FF]",
                        "origin-left transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                      )}
                    />
                    <svg
                      className={cn(
                        "h-4 w-4 transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        active ? "scale-110" : "group-hover:scale-110"
                      )}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={n.icon} />
                    </svg>
                    <EditableText id={`home.nav.${n.id}`} text={n.label} />
                    {n.badge && (
                      <span className="ml-auto rounded bg-white/[0.07] px-1.5 py-px text-[8px] font-bold tracking-wide text-zinc-400">
                        {n.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="nova-lift mt-auto rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                background: `linear-gradient(135deg, var(--nova-accent,#00E5FF), var(--nova-accent-2,#8A2BE2))`,
              }}
            >
              {accountInitials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[11.5px] text-zinc-200">{accountLabel}</div>
              <div className="text-[10px] text-zinc-500">
                {user ? (isAdmin ? "Administrator" : "Signed in") : "Not signed in"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto">
        {/* top strip */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.06] bg-[#111621]/80 px-6 py-3 backdrop-blur-xl">
          <div className="relative flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
            {RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRatio(r.id)}
                title={r.hint}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11.5px]",
                  "transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  ratio === r.id
                    ? "scale-[1.04] bg-[#00E5FF]/15 text-[#8DF3FF] ring-1 ring-[#00E5FF]/35"
                    : "text-zinc-500 hover:scale-[1.03] hover:text-zinc-200"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenProject}
            className="nova-lift ml-auto rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
          >
            Open Project
          </button>
          <AdminToggle />
        </div>

        <div className="mx-auto max-w-[1180px] px-6 py-6">
          {/* hero row */}
          <div className="nova-stagger grid gap-4 lg:grid-cols-[1fr_1.5fr]">
            <button
              onClick={() => onCreateProject(ratio)}
              className="nova-lift nova-sheen-host group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00E5FF] via-[#3AA7FF] to-[#8A2BE2] p-8 text-left shadow-2xl shadow-cyan-500/10"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(600px_at_50%_0%,rgba(255,255,255,.22),transparent)]" />
              <div className="relative flex h-full min-h-[170px] flex-col justify-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/25 transition-transform duration-[520ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <h1 className="text-[30px] font-semibold leading-tight text-white"><EditableText id="home.hero" text="New Project" /></h1>
                <p className="mt-1 text-[13px] text-white/80">
                  Start a {ratio} timeline with the full effects library
                </p>
              </div>
            </button>

            <HeroPreview />
          </div>

          {/* quick tools */}
          <div className="nova-stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => onCreateProject(ratio)}
                className="nova-lift nova-sheen-host group rounded-xl border border-white/[0.07] bg-[#131824] p-4 text-left hover:border-[#00E5FF]/30 hover:bg-[#1c2030] hover:shadow-[0_18px_40px_-20px_rgba(0,229,255,0.55)]"
              >
                <svg
                  className="mb-2.5 h-5 w-5 text-[#8DF3FF] transition-transform duration-[520ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-0.5 group-hover:scale-110"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={t.icon} />
                </svg>
                <div className="text-[12.5px] font-medium text-zinc-100">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* recommended strip */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-zinc-200"><EditableText id="home.recommended" text="Recommended" /></h2>
              <span className="text-[11px] text-zinc-500">Expand</span>
            </div>
            <div className="nova-stagger flex flex-wrap gap-2">
              {RECOMMENDED.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onCreateProject(ratio)}
                  className="nova-lift relative rounded-lg border border-white/[0.06] bg-[#131824] px-4 py-2.5 text-[11.5px] text-zinc-300 hover:border-[#8A2BE2]/40 hover:text-white"
                >
                  {r.label}
                  {r.badge && (
                    <span className="absolute -right-1.5 -top-1.5 rounded bg-gradient-to-r from-fuchsia-500 to-orange-400 px-1.5 py-px text-[8px] font-bold text-white">
                      {r.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* recent projects */}
          <div className="mt-8 pb-10">
            <h2 className="mb-3 text-[13px] font-medium text-zinc-200"><EditableText id="home.localProjects" text="Local Projects" /></h2>
            {recentProjects.length === 0 ? (
              <div className="nova-rise flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#131824]/50 py-14">
                <svg
                  className="mb-3 h-10 w-10 text-zinc-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "nova-breathe 6s var(--ease-drift) infinite" }}
                >
                  <path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" />
                </svg>
                <div className="text-[12px] text-zinc-500">No recent projects yet</div>
                <button
                  onClick={() => onCreateProject(ratio)}
                  className="nova-lift mt-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#8A2BE2] px-4 py-1.5 text-[11.5px] font-medium text-white shadow-lg shadow-cyan-500/20 hover:brightness-110"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="nova-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recentProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onCreateProject(ratio)}
                    className="nova-lift nova-sheen-host rounded-xl border border-white/[0.07] bg-[#131824] p-3 text-left hover:border-[#00E5FF]/30"
                  >
                    <div className="mb-2 h-20 overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
                    <div className="truncate text-[12px] text-zinc-100">{p.name}</div>
                    <div className="text-[10.5px] text-zinc-500">{p.edited}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
