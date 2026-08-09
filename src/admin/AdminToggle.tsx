import { useState } from "react";
import { toast } from "sonner";
import { cn } from "../utils/cn";
import { useAdmin } from "./AdminContext";
import { useAuth } from "../auth/AuthContext";
import AuthDialog from "../auth/AuthDialog";

/**
 * Account + Admin Mode control. Admin Mode is only offered when the database
 * says the signed-in user holds the admin role.
 */
export default function AdminToggle() {
  const { adminMode, canAdmin, setAdminMode, panelOpen, setPanelOpen, saving } = useAdmin();
  const { loading, user, profile, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  if (loading) {
    return <div className="h-7 w-16 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {canAdmin && (
        <>
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
                "relative rounded-md border border-white/[0.08] p-1.5 text-zinc-300 transition hover:bg-white/[0.08] hover:text-white",
                panelOpen && "bg-white/[0.08] text-white"
              )}
            >
              {saving && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-ping rounded-full bg-[color:var(--nova-accent)]" />
              )}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 007 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 13.6H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010.3 3V3a2 2 0 014 0v.1A1.7 1.7 0 0017 4.6l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
              </svg>
            </button>
          )}
        </>
      )}

      {user ? (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            title={user.email ?? "Account"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white/10 transition hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--nova-accent-2,#8A2BE2), var(--nova-accent,#00E5FF))",
            }}
          >
            {initials || "U"}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-[100] w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141824]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl animate-[nova-pop_.2s_cubic-bezier(.22,1,.36,1)]">
                <div className="px-3 py-2">
                  <p className="truncate text-[12px] font-medium text-zinc-100">
                    {profile?.display_name ?? "Signed in"}
                  </p>
                  <p className="truncate text-[10.5px] text-zinc-500">{user.email}</p>
                  {canAdmin && (
                    <span className="mt-1.5 inline-block rounded bg-[color:var(--nova-accent)]/15 px-1.5 py-px text-[9px] font-semibold tracking-wider text-[color:var(--nova-accent)]">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    toast.success("Signed out");
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setAuthOpen(true)}
          className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.1] active:scale-95"
        >
          Sign in
        </button>
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
