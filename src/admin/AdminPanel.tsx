import { cn } from "../utils/cn";
import { FONT_CHOICES, useAdmin } from "./AdminContext";

const ACCENT_SWATCHES = ["#00E5FF", "#8A2BE2", "#F97316", "#22C55E", "#F43F5E", "#FACC15"];
const SURFACES = ["#0F1117", "#0B0E14", "#101826", "#161219", "#12141A"];

/** Right-hand admin drawer: fonts, accent colours, surface, logo and reset. */
export default function AdminPanel() {
  const { adminMode, panelOpen, setPanelOpen, settings, update, reset, saving } = useAdmin();
  if (!adminMode || !panelOpen) return null;

  return (
    <aside className="fixed right-0 top-0 z-[80] flex h-screen w-[310px] max-w-[86vw] flex-col border-l border-white/[0.08] bg-[#141824]/95 backdrop-blur-xl shadow-2xl shadow-black/50 animate-[nova-panel_.28s_cubic-bezier(.22,1,.36,1)]">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: settings.accent }} />
        <span className="text-[12.5px] font-semibold text-zinc-100">Admin Customizer</span>
        <span
          className={cn(
            "ml-1 text-[9.5px] uppercase tracking-wider transition-opacity duration-300",
            saving ? "text-[color:var(--nova-accent)] opacity-100" : "text-emerald-400/80 opacity-70"
          )}
        >
          {saving ? "Saving…" : "Saved"}
        </span>
        <button
          onClick={() => setPanelOpen(false)}
          className="ml-auto rounded p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-100"
          title="Close"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>


      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <Section title="Typography">
          <label className="mb-1 block text-[10.5px] uppercase tracking-wider text-zinc-500">Font family</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 py-2 text-[11.5px] text-zinc-200 outline-none focus:border-[color:var(--nova-accent)]"
          >
            {FONT_CHOICES.map((f) => (
              <option key={f.label} value={f.value} className="bg-[#141824]">
                {f.label}
              </option>
            ))}
          </select>

          <label className="mb-1 mt-4 block text-[10.5px] uppercase tracking-wider text-zinc-500">
            Font / UI size · {Math.round(settings.fontScale * 100)}%
          </label>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={settings.fontScale}
            onChange={(e) => update({ fontScale: Number(e.target.value) })}
            className="w-full accent-[color:var(--nova-accent)]"
          />
        </Section>

        <Section title="Theme colours">
          <ColorRow
            label="Primary accent"
            value={settings.accent}
            swatches={ACCENT_SWATCHES}
            onChange={(v) => update({ accent: v })}
          />
          <ColorRow
            label="Secondary accent"
            value={settings.accent2}
            swatches={ACCENT_SWATCHES}
            onChange={(v) => update({ accent2: v })}
          />
          <ColorRow
            label="App background"
            value={settings.surface}
            swatches={SURFACES}
            onChange={(v) => update({ surface: v })}
          />
        </Section>

        <Section title="Branding">
          <label className="mb-1 block text-[10.5px] uppercase tracking-wider text-zinc-500">Custom logo URL</label>
          <input
            value={settings.logoUrl}
            onChange={(e) => update({ logoUrl: e.target.value })}
            placeholder="https://…/logo.png"
            maxLength={500}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 py-2 text-[11.5px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[color:var(--nova-accent)]"
          />
          {settings.logoUrl && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/30 p-2">
              <img src={settings.logoUrl} alt="Custom logo preview" className="h-7 w-7 rounded object-contain" />
              <span className="text-[10.5px] text-zinc-500">Live preview</span>
            </div>
          )}
        </Section>

        <p className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-[10.5px] leading-relaxed text-zinc-500">
          Tip: with Admin Mode on, click any pencil (or double-click the text) to rename headings,
          the app title and asset tab names. Changes save automatically and apply for every visitor.
        </p>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <button
          onClick={reset}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11.5px] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          Reset all customisations
        </button>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold text-zinc-300">{title}</div>
      {children}
    </div>
  );
}

function ColorRow({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="font-mono text-[10px] text-zinc-500">{value}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent"
        />
        {swatches.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            title={s}
            style={{ background: s }}
            className={cn(
              "h-6 w-6 rounded-full ring-1 transition hover:scale-110",
              value.toLowerCase() === s.toLowerCase() ? "ring-2 ring-white/80" : "ring-white/15"
            )}
          />
        ))}
      </div>
    </div>
  );
}
