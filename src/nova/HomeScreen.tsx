import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Button } from "../components/ui/button";
import EditableText from "../admin/EditableText";
import AdminToggle from "../admin/AdminToggle";
import { useAdmin } from "../admin/AdminContext";
import { useAuth } from "../auth/AuthContext";
import HeroPreview from "./HeroPreview";
import DashboardMotion from "./DashboardMotion";

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

const NAV_ITEMS: NavItem[] = [
  { id: "create", label: "Create Project", icon: "M12 5v14M5 12h14" },
  { id: "cloud", label: "Studio Cloud", icon: "M6 18a4 4 0 010-8 5 5 0 019.6-1.6A4 4 0 1118 18z", badge: "SYNC" },
  { id: "hub", label: "Creator Hub", icon: "M4 6h16v12H4zM4 10h16" },
  { id: "toolbox", label: "Toolbox", icon: "M3 8h18v11H3zM8 8V6a4 4 0 018 0v2" },
];

const PORTFOLIO_SECTIONS = [
  "Personal Presentation",
  "About Me",
  "Education",
  "Personal Skills",
  "Work Experience",
  "Project Portfolio",
];

type DialogState = { title: string; description: string; action?: "create" | "open" } | null;

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
  const [dialog, setDialog] = useState<DialogState>(null);
  const { settings } = useAdmin();
  const { user, profile, isAdmin } = useAuth();
  const accountLabel = profile?.display_name || user?.email || "Guest session";
  const accountInitials = (accountLabel.match(/\b[a-z0-9]/gi) ?? ["N"])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  const openNav = (item: NavItem) => {
    setNav(item.id);
    if (item.id === "create") {
      onCreateProject(ratio);
      return;
    }
    setDialog({
      title: item.label,
      description:
        item.id === "cloud"
          ? "Your synchronized projects and shared studio files are ready from the editor workspace."
          : item.id === "hub"
            ? "Open the editor to browse creative templates, effects, titles, and transitions."
            : "Launch the complete production toolbox with your selected canvas format.",
      action: "create",
    });
  };

  const openPortfolio = (title: string) => {
    setDialog({
      title,
      description: `${title} opens as a dedicated sequence inside NOVA Studio, ready for media, titles, motion, and cinematic grading.`,
      action: title === "Project Portfolio" ? "open" : "create",
    });
  };

  return (
    <div className="nova-live-dashboard nova-nebula-shell relative h-screen overflow-hidden font-sans text-foreground antialiased">
      <DashboardMotion />
      <div className="nova-nebula-particles" aria-hidden="true" />

      <div className="nova-nebula-layout">
      <aside className="nova-nebula-glass nova-nebula-rail">
        <div className="nova-nebula-brand">
          <div
            className="nova-nebula-logo"
            style={{
              background: settings.logoUrl ? "transparent" : `linear-gradient(135deg, ${settings.accent}, ${settings.accent2})`,
            }}
          >
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="NOVA Studio Logo" className="h-full w-full object-contain" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 9h20M7 5v4M12 5v4M17 5v4" />
              </svg>
            )}
          </div>
          <div className="nova-nebula-brand-copy">
            <div>
              <EditableText id="home.brand" text="NOVA" />
            </div>
            <div className="nova-nebula-brand-sub">
              <EditableText id="home.brandSub" text="Studio" />
            </div>
          </div>
        </div>

        <nav className="nova-nebula-rail-nav" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              onClick={() => openNav(item)}
              className={cn("nova-nebula-rail-button", nav === item.id && "is-active")}
              title={item.label}
              aria-label={item.label}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.badge && <span className="nova-nebula-sync-dot" />}
            </Button>
          ))}
        </nav>
        <div className="nova-nebula-avatar" title={accountLabel}>
          {accountInitials}
          <span className={user ? "is-online" : ""} />
        </div>
      </aside>

      <header className="nova-nebula-glass nova-nebula-header">
          <div className="nova-nebula-status">
            <span className="nova-nebula-status-pulse" />
            <span>STUDIO LINK</span>
            <strong>{user ? (isAdmin ? "ADMIN" : "ONLINE") : "LOCAL"}</strong>
          </div>
          <div className="nova-nebula-ratios" aria-label="Project aspect ratio">
            {RATIOS.map((r) => (
              <Button
                key={r.id}
                variant="ghost"
                onClick={() => setRatio(r.id)}
                title={r.hint}
                aria-pressed={ratio === r.id}
                className={cn("nova-nebula-ratio", ratio === r.id && "is-active")}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={onOpenProject}
            className="nova-nebula-open"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h6l2 2h8v10H4z" /></svg>
            Open Project
          </Button>
          <AdminToggle />
      </header>

      <section className="nova-nebula-glass nova-nebula-portfolio">
        <div className="nova-nebula-kicker">CREATIVE SYSTEM / 04</div>
        <h1 className="nova-gradient-text"><EditableText id="home.portfolio" text="CREATIVE PORTFOLIO" /></h1>
        <nav className="nova-nebula-portfolio-nav" aria-label="Portfolio sections">
          {PORTFOLIO_SECTIONS.map((label, index) => (
            <Button key={label} variant="ghost" onClick={() => openPortfolio(label)} className="nova-pill">
              <span>{String(index + 1).padStart(2, "0")}</span>{label}
            </Button>
          ))}
        </nav>
      </section>

      <main className="nova-nebula-stage">
        <div className="nova-nebula-stage-copy">
          <div className="nova-nebula-kicker"><span /> LIVE COMPOSITION</div>
          <h2><EditableText id="home.hero" text="Shape motion into cinema." /></h2>
          <p>Build a {ratio} sequence with precision effects, adaptive color, and a professional multi-track timeline.</p>
          <Button onClick={() => onCreateProject(ratio)} className="nova-nebula-ignite">
            Ignite new project
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="m9 18 6-6-6-6" /></svg>
          </Button>
        </div>
        <div className="nova-nebula-preview"><HeroPreview /></div>
        <div className="nova-nebula-float-stat" aria-hidden="true"><i /><i /><i /><span>ENC 009</span></div>
      </main>

      <section className="nova-nebula-tools" aria-label="Quick tools">
        <div className="nova-nebula-section-heading"><span>Quick systems</span><small>04 MODULES</small></div>
        <div className="nova-nebula-tool-stack">
            {QUICK_TOOLS.map((t) => (
              <Button
                key={t.id}
                variant="ghost"
                onClick={() => onCreateProject(ratio)}
                className="nova-nebula-glass nova-nebula-tool"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={t.icon} />
                </svg>
                <span><strong>{t.label}</strong><small>{t.desc}</small></span>
                <b>↗</b>
              </Button>
            ))}
        </div>
      </section>

      <section className="nova-nebula-glass nova-nebula-deck">
        <div className="nova-nebula-deck-block">
          <div className="nova-nebula-section-heading"><span><EditableText id="home.recommended" text="Signal library" /></span><small>TRENDING</small></div>
          <div className="nova-nebula-recommended">
              {RECOMMENDED.map((r) => (
                <Button
                  key={r.id}
                  variant="ghost"
                  onClick={() => onCreateProject(ratio)}
                  className="nova-nebula-chip"
                >
                  {r.label}
                  {r.badge && <span>{r.badge}</span>}
                </Button>
              ))}
          </div>
        </div>
        <div className="nova-nebula-deck-divider" />
        <div className="nova-nebula-deck-block nova-nebula-projects">
          <div className="nova-nebula-section-heading"><span><EditableText id="home.localProjects" text="Local Projects" /></span><small>{recentProjects.length.toString().padStart(2, "0")} FILES</small></div>
            {recentProjects.length === 0 ? (
              <Button variant="ghost" onClick={() => onCreateProject(ratio)} className="nova-nebula-empty-project">
                <span>+</span><div><strong>Initialize first sequence</strong><small>No local projects yet</small></div>
              </Button>
            ) : (
              <div className="nova-nebula-project-list">
                {recentProjects.map((p) => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    onClick={onOpenProject}
                    className="nova-nebula-project"
                  >
                    <i /><span><strong>{p.name}</strong><small>{p.edited}</small></span>
                  </Button>
                ))}
              </div>
            )}
        </div>
      </section>
      </div>

      {dialog && (
        <div className="nova-nebula-dialog-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <section className="nova-nebula-glass nova-nebula-dialog" role="dialog" aria-modal="true" aria-labelledby="nova-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="icon" className="nova-nebula-dialog-close" onClick={() => setDialog(null)} aria-label="Close dialog">×</Button>
            <div className="nova-nebula-kicker">NOVA / MODULE</div>
            <h2 id="nova-dialog-title">{dialog.title}</h2>
            <p>{dialog.description}</p>
            <div className="nova-nebula-dialog-actions">
              <Button variant="ghost" onClick={() => setDialog(null)}>Not now</Button>
              <Button className="nova-nebula-ignite" onClick={() => { setDialog(null); dialog.action === "open" ? onOpenProject() : onCreateProject(ratio); }}>
                {dialog.action === "open" ? "Open project" : "Enter studio"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
