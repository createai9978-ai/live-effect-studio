import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../auth/AuthContext";

/** Visual customisation owned by admins, stored in the shared studio record. */
export type AdminSettings = {
  fontFamily: string;
  fontScale: number;
  accent: string;
  accent2: string;
  surface: string;
  logoUrl: string;
  /** Inline text overrides keyed by a stable slot id. */
  labels: Record<string, string>;
};

export const DEFAULT_SETTINGS: AdminSettings = {
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontScale: 1,
  accent: "#00E5FF",
  accent2: "#8A2BE2",
  surface: "#0F1117",
  logoUrl: "",
  labels: {},
};

export const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "System Sans (default)", value: DEFAULT_SETTINGS.fontFamily },
  { label: "Inter / Helvetica", value: "Inter, Helvetica, Arial, sans-serif" },
  { label: "Georgia Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Rounded Grotesk", value: '"Trebuchet MS", Verdana, sans-serif' },
];

/** Local cache only — the database is the source of truth. */
const CACHE_KEY = "nova.admin.settings.cache.v2";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_LABEL = 120;

/** Never trust stored/remote values blindly: colours and URLs end up in the DOM. */
export function sanitize(patch: Partial<AdminSettings>, base: AdminSettings): AdminSettings {
  const colour = (v: unknown, fallback: string) =>
    typeof v === "string" && HEX.test(v.trim()) ? v.trim() : fallback;
  const url = (v: unknown, fallback: string) => {
    if (typeof v !== "string" || v.trim() === "") return "";
    try {
      const parsed = new URL(v.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : fallback;
    } catch {
      return fallback;
    }
  };
  const labels: Record<string, string> = {};
  const raw = (patch.labels ?? base.labels) as Record<string, unknown>;
  Object.entries(raw ?? {})
    .slice(0, 300)
    .forEach(([k, v]) => {
      if (typeof v === "string") labels[k.slice(0, 80)] = v.slice(0, MAX_LABEL);
    });

  return {
    fontFamily:
      typeof patch.fontFamily === "string" && patch.fontFamily.length < 200
        ? patch.fontFamily.replace(/[;{}<>]/g, "")
        : base.fontFamily,
    fontScale: Math.min(1.3, Math.max(0.8, Number(patch.fontScale ?? base.fontScale) || 1)),
    accent: colour(patch.accent, base.accent),
    accent2: colour(patch.accent2, base.accent2),
    surface: colour(patch.surface, base.surface),
    logoUrl: patch.logoUrl === undefined ? base.logoUrl : url(patch.logoUrl, base.logoUrl),
    labels,
  };
}

type Row = {
  font_family: string;
  font_scale: number | string;
  accent: string;
  accent2: string;
  surface: string;
  logo_url: string;
  labels: unknown;
};

const fromRow = (row: Row): AdminSettings =>
  sanitize(
    {
      fontFamily: row.font_family,
      fontScale: Number(row.font_scale),
      accent: row.accent,
      accent2: row.accent2,
      surface: row.surface,
      logoUrl: row.logo_url,
      labels: (row.labels ?? {}) as Record<string, string>,
    },
    DEFAULT_SETTINGS
  );

type Ctx = {
  /** True only when the signed-in user holds the admin role in the database. */
  adminMode: boolean;
  canAdmin: boolean;
  setAdminMode: (v: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  settings: AdminSettings;
  saving: boolean;
  update: (patch: Partial<AdminSettings>) => void;
  setLabel: (id: string, text: string) => void;
  labelFor: (id: string, fallback: string) => string;
  reset: () => void;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

function readCache(): AdminSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? sanitize(JSON.parse(raw) as Partial<AdminSettings>, DEFAULT_SETTINGS) : null;
  } catch {
    return null;
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { isAdmin, user } = useAuth();
  const [adminMode, setAdminModeState] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paint the cached look immediately, then reconcile with the database.
  useEffect(() => {
    const cached = readCache();
    if (cached) setSettings(cached);

    let active = true;
    void supabase
      .from("app_settings")
      .select("font_family, font_scale, accent, accent2, surface, logo_url, labels")
      .eq("id", "global")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        loaded.current = true;
        if (error || !data) return;
        const next = fromRow(data as Row);
        setSettings(next);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* quota or private mode — cache is optional */
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Losing the admin role instantly closes the editing surface.
  useEffect(() => {
    if (!isAdmin) {
      setAdminModeState(false);
      setPanelOpen(false);
    }
  }, [isAdmin]);

  const persist = useCallback(
    (next: AdminSettings) => {
      if (!isAdmin || !user) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaving(true);
      saveTimer.current = setTimeout(() => {
        void supabase
          .from("app_settings")
          .update({
            font_family: next.fontFamily,
            font_scale: next.fontScale,
            accent: next.accent,
            accent2: next.accent2,
            surface: next.surface,
            logo_url: next.logoUrl,
            labels: next.labels,
            updated_by: user.id,
          })
          .eq("id", "global")
          .then(({ error }) => {
            setSaving(false);
            if (error) toast.error("Could not save changes", { description: error.message });
          });
      }, 600);
    },
    [isAdmin, user]
  );

  const apply = useCallback(
    (mutate: (s: AdminSettings) => AdminSettings) => {
      setSettings((prev) => {
        const next = mutate(prev);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setAdminMode = useCallback(
    (v: boolean) => {
      if (v && !isAdmin) {
        toast.error("Admin access required", { description: "Sign in with an admin account." });
        return;
      }
      setAdminModeState(v);
      if (!v) setPanelOpen(false);
    },
    [isAdmin]
  );

  // Push theme values to CSS custom properties.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--nova-accent", settings.accent);
    root.style.setProperty("--nova-accent-2", settings.accent2);
    root.style.setProperty("--nova-surface", settings.surface);
    root.style.setProperty("--nova-font", settings.fontFamily);
    document.body.style.fontFamily = settings.fontFamily;
    document.body.style.background = settings.surface;
  }, [settings.accent, settings.accent2, settings.surface, settings.fontFamily]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      adminMode: adminMode && isAdmin,
      canAdmin: isAdmin,
      setAdminMode,
      panelOpen,
      setPanelOpen,
      settings,
      saving,
      update: (patch) => apply((s) => sanitize({ ...s, ...patch }, s)),
      setLabel: (id, text) =>
        apply((s) => ({ ...s, labels: { ...s.labels, [id]: text.slice(0, MAX_LABEL) } })),
      labelFor: (id, fallback) => settings.labels[id] ?? fallback,
      reset: () => {
        apply(() => DEFAULT_SETTINGS);
        toast.success("Customisations reset");
      },
    }),
    [adminMode, isAdmin, setAdminMode, panelOpen, settings, saving, apply]
  );

  return (
    <AdminCtx.Provider value={value}>
      <div
        style={{
          fontFamily: settings.fontFamily,
          // `zoom` scales the whole px-based UI predictably in Chromium-based browsers.
          zoom: settings.fontScale,
        }}
        className="h-full"
      >
        {children}
      </div>
    </AdminCtx.Provider>
  );
}
