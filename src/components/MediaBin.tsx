import { useState } from "react";
import { Asset, fmtDuration, fmtSize, waveformBars } from "../editor/types";
import { cn } from "../utils/cn";

type Props = {
  assets: Asset[];
  importing: boolean;
  onOpenImport: () => void;
  onImportFiles: (files: FileList | File[]) => void;
  onDeleteAsset: (id: string) => void;
  onOpenSource: (id: string) => void;
};

export default function MediaBin({
  assets,
  importing,
  onOpenImport,
  onImportFiles,
  onDeleteAsset,
  onOpenSource,
}: Props) {
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const filtered = assets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  const totalBytes = assets.reduce((s, a) => s + a.size, 0);

  return (
    <aside
      className={cn(
        "relative flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#111218] transition",
        dragOver && "ring-2 ring-inset ring-violet-500/60"
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          onImportFiles(e.dataTransfer.files);
        }
        setDragOver(false);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-200">Project</span>
        <span className="text-[9px] text-zinc-600">
          {assets.length} item{assets.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Search + import */}
      <div className="flex items-center gap-1.5 p-2.5 pb-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-md bg-black/30 px-2 py-1.5">
          <svg className="h-3 w-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media…"
            className="w-full bg-transparent text-[11px] text-zinc-300 placeholder-zinc-600 outline-none"
          />
        </div>
        <button
          onClick={onOpenImport}
          title="Import media from your computer"
          className="flex h-7 shrink-0 items-center gap-1 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-2 text-[10px] font-medium text-white shadow-md shadow-violet-600/25 transition hover:brightness-110"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Import
        </button>
      </div>

      {/* Content */}
      {assets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
          <div
            onClick={onOpenImport}
            className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.12] px-4 py-10 transition hover:border-violet-500/50 hover:bg-white/[0.02]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]">
              {importing ? (
                <svg className="h-5 w-5 animate-spin text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-6.2-8.56" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              )}
            </div>
            <div>
              <div className="text-[12px] font-medium text-zinc-300">
                {importing ? "Importing…" : "Import Media"}
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                Click to browse, or drag video &amp; audio
                <br />
                files here from your computer
              </div>
            </div>
          </div>
          <div className="text-[9px] text-zinc-700">MP4 · MOV · WEBM · MP3 · WAV · AAC</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2.5 pb-2">
          {importing && (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-violet-500/10 px-2 py-1.5 text-[10px] text-violet-300">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M21 12a9 9 0 11-6.2-8.56" />
              </svg>
              Importing media…
            </div>
          )}
          <div className="mb-1.5 text-[9px] text-zinc-600">
            Drag to timeline · double-click to open in Source Monitor
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onDelete={() => onDeleteAsset(a.id)}
                onOpenSource={() => onOpenSource(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/[0.05] px-3 py-2.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Project size</span>
          <span className="font-mono text-zinc-400">{assets.length ? fmtSize(totalBytes) : "—"}</span>
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#111218]/80">
          <div className="rounded-lg border border-dashed border-violet-400 px-4 py-3 text-[12px] text-violet-300">
            Drop files to import
          </div>
        </div>
      )}
    </aside>
  );
}

function AssetCard({
  asset,
  onDelete,
  onOpenSource,
}: {
  asset: Asset;
  onDelete: () => void;
  onOpenSource: () => void;
}) {
  const bars = waveformBars(asset.id, 24);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-nova-asset", asset.id);
        e.dataTransfer.setData("text/plain", asset.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={onOpenSource}
      className="group relative cursor-grab overflow-hidden rounded-lg border border-white/[0.06] bg-black/20 transition hover:border-violet-500/50 active:cursor-grabbing"
      title={`${asset.name} — drag to timeline, double-click for Source Monitor`}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        {asset.kind !== "audio" && asset.thumb ? (
          <img src={asset.thumb} alt={asset.name} className="h-full w-full object-cover" draggable={false} />
        ) : asset.kind !== "audio" ? (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M10 9l5 3-5 3V9z" />
            </svg>
          </div>
        ) : (
          <div className="flex h-full w-full items-end gap-px bg-gradient-to-b from-emerald-950/60 to-black px-1.5 pb-1.5">
            {bars.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm bg-emerald-400/60" style={{ height: `${v * 80}%` }} />
            ))}
          </div>
        )}
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px font-mono text-[8px] text-zinc-300">
          {fmtDuration(asset.duration)}
        </span>
        <span
          className={cn(
            "absolute left-1 top-1 rounded px-1 py-px text-[8px] font-semibold",
            asset.kind === "video"
              ? "bg-violet-500/80 text-white"
              : asset.kind === "image"
              ? "bg-sky-500/80 text-white"
              : "bg-emerald-500/80 text-white"
          )}
        >
          {asset.kind === "video" ? "V" : asset.kind === "image" ? "IMG" : "A"}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Remove from project"
          className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded bg-black/70 text-zinc-400 transition hover:text-fuchsia-400 group-hover:flex"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-1.5 py-1">
        <div className="truncate text-[9.5px] text-zinc-300">{asset.name}</div>
        <div className="text-[8.5px] text-zinc-600">{fmtSize(asset.size)}</div>
      </div>
    </div>
  );
}
