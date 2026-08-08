import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Visual customisation saved by an admin, persisted to LocalStorage. */
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
  { label: "Inter / Helvetica", value: 'Inter, Helvetica, Arial, sans-serif' },
  { label: "Georgia Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Monospace", value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { label: "Rounded Grotesk", value: '"Trebuchet MS", Verdana, sans-serif' },
];

const STORAGE_KEY = "nova.admin.settings.v1";
const MODE_KEY = "nova.admin.mode.v1";

type Ctx = {
  adminMode: boolean;
  setAdminMode: (v: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  settings: AdminSettings;
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

function readStored(): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed, labels: { ...(parsed.labels ?? {}) } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [adminMode, setAdminModeState] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  // Load persisted state after hydration (avoids SSR mismatch).
  useEffect(() => {
    setSettings(readStored());
    try {
      setAdminModeState(window.localStorage.getItem(MODE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist settings.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  const setAdminMode = useCallback((v: boolean) => {
    setAdminModeState(v);
    if (!v) setPanelOpen(false);
    try {
      window.localStorage.setItem(MODE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

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

  const value = useMemo<Ctx>(
    () => ({
      adminMode,
      setAdminMode,
      panelOpen,
      setPanelOpen,
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      setLabel: (id, text) =>
        setSettings((s) => ({ ...s, labels: { ...s.labels, [id]: text } })),
      labelFor: (id, fallback) => settings.labels[id] ?? fallback,
      reset: () => setSettings(DEFAULT_SETTINGS),
    }),
    [adminMode, setAdminMode, panelOpen, settings]
  );

  return (
    <AdminCtx.Provider value={value}>
      <div
        style={{
          fontFamily: settings.fontFamily,
          // `zoom` scales the whole px-based UI predictably in Chromium-based browsers.
          zoom: settings.fontScale,
        }}
        className="contents-none h-full"
      >
        {children}
      </div>
    </AdminCtx.Provider>
  );
}
