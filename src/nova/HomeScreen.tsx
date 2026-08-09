import { useState } from "react";
import { cn } from "../utils/cn";
import EditableText from "../admin/EditableText";
import AdminToggle from "../admin/AdminToggle";
import { useAdmin } from "../admin/AdminContext";
import { useAuth } from "../auth/AuthContext";

/**
 * NOVA Studio launcher — the dashboard shown before the editor opens.
 * Premium studio layout: aspect-ratio picker, hero "New Project" card,
 * quick-action tools and a recent-projects shelf.
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

const NAV = [
  { id: "create", label: "Create Project" },
  { id: "cloud", label: "Studio Cloud" },
  { id: "hub", label: "Creator Hub" },
  { id: "toolbox", label: "Toolbox" },
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
    <div className="flex h-screen overflow-hidden bg-[#0F1117] font-sans text-zinc-200 antialiased">
      {/* ---------- Side rail ---------- */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[#181B24] p-4 md:flex">
        <div className="mb-8 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-violet-500/25"
            style={{ background: settings.logoUrl ? "transparent" : `linear-gradient(135deg, ${settings.accent}, ${settings.accent2})` }}
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

        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setNav(n.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] transition-all duration-200",
                nav === n.id
                  ? "bg-gradient-to-r from-[#00E5FF]/15 to-[#8A2BE2]/15 text-[#8DF3FF] ring-1 ring-[#00E5FF]/25"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <EditableText id={`home.nav.${n.id}`} text={n.label} />
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/[0.06] bg-black/30 p-3">
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
      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* top strip */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.06] bg-[#0F1117]/80 px-6 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
            {RATIOS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRatio(r.id)}
                title={r.hint}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11.5px] transition-all duration-200",
                  ratio === r.id
                    ? "bg-[#00E5FF]/15 text-[#8DF3FF] ring-1 ring-[#00E5FF]/35"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenProject}
            className="ml-auto rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
          >
            Open Project
          </button>
          <AdminToggle />
        </div>

        <div className="mx-auto max-w-[1180px] px-6 py-6">
          {/* hero row */}
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <button
              onClick={() => onCreateProject(ratio)}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00E5FF] via-[#3AA7FF] to-[#8A2BE2] p-8 text-left shadow-2xl shadow-cyan-500/10 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.01]"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(600px_at_var(--x,50%)_0%,rgba(255,255,255,.22),transparent)]" />
              <div className="relative flex h-full min-h-[170px] flex-col justify-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/25">
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

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#181B24] p-5">
              <span className="absolute right-4 top-4 rounded-full bg-[#00E5FF]/20 px-2 py-0.5 text-[10px] font-semibold text-[#8DF3FF] ring-1 ring-[#00E5FF]/30">
                New
              </span>
              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {["from-violet-600 to-indigo-900", "from-cyan-600 to-slate-900", "from-amber-500 to-rose-900", "from-emerald-500 to-slate-900"].map((g) => (
                  <div key={g} className={cn("h-16 rounded-lg bg-gradient-to-br", g)} />
                ))}
              </div>
              <div className="text-[13px] font-medium text-zinc-100">Idea to Video Agent</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                Describe a concept and NOVA assembles a rough cut with grades, transitions and captions.
              </p>
            </div>
          </div>

          {/* quick tools */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => onCreateProject(ratio)}
                className="group rounded-xl border border-white/[0.07] bg-[#181B24] p-4 text-left transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 hover:border-[#00E5FF]/30 hover:bg-[#1c2030]"
              >
                <svg className="mb-2.5 h-5 w-5 text-[#8DF3FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
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
            <div className="flex flex-wrap gap-2">
              {RECOMMENDED.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onCreateProject(ratio)}
                  className="relative rounded-lg border border-white/[0.06] bg-[#181B24] px-4 py-2.5 text-[11.5px] text-zinc-300 transition hover:border-[#8A2BE2]/40 hover:text-white"
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#181B24]/50 py-14">
                <svg className="mb-3 h-10 w-10 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" />
                </svg>
                <div className="text-[12px] text-zinc-500">No recent projects yet</div>
                <button
                  onClick={() => onCreateProject(ratio)}
                  className="mt-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#8A2BE2] px-4 py-1.5 text-[11.5px] font-medium text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recentProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onCreateProject(ratio)}
                    className="rounded-xl border border-white/[0.07] bg-[#181B24] p-3 text-left transition hover:border-[#00E5FF]/30"
                  >
                    <div className="mb-2 h-20 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
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
