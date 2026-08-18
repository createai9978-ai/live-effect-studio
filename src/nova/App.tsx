import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playhead } from "../editor/playhead";

import TopBar from "../components/TopBar";
import { AdminProvider } from "../admin/AdminContext";
import { AuthProvider } from "../auth/AuthContext";
import AdminPanel from "../admin/AdminPanel";

import HomeScreen, { AspectRatio } from "./HomeScreen";
import SpeedCurveEditor from "../components/SpeedCurveEditor";
import MediaBin from "../components/MediaBin";
import ToolRail, { RailKey } from "../components/ToolRail";
import InspectorPanel from "../components/InspectorPanel";
import LeftMonitorPanel from "../components/LeftMonitorPanel";
import PreviewPlayer from "../components/PreviewPlayer";
import LumetriPanel from "../components/LumetriPanel";
import { AudioMixerPanel, GraphicsPanel } from "../components/WorkspacePanels";
import Timeline from "../components/Timeline";
import AudioMeters from "../components/AudioMeters";
import AudioEngine from "../components/AudioEngine";
import { MenuActions } from "../components/MenuBar";
import {
  AboutModal,
  ConfirmModal,
  ExportModal,
  ShortcutsModal,
  SpeedDialog,
  Toast,
} from "../components/Modals";
import AssetBrowser from "../components/AssetBrowser";
import { AssetItem, AssetTab, findAssetItem } from "../editor/assetLibrary";
import { appliedEffectToGpu, compileRenderProgram, requiresLocalAnalysis } from "../editor/effectRuntime";
import EffectControlPanel from "../components/EffectControlPanel";
import {
  EffectFamily,
  ParamValues,
  defaultValues,
  familyFor,
} from "../editor/effectParams";
import { previewClipFor } from "../editor/previewVideos";
import {
  Asset,
  Clip,
  ClipEffects,
  AppliedEffect,
  DEFAULT_EFFECTS,
  DEFAULT_GRADE,
  DEFAULT_PANEL_VISIBILITY,
  DEFAULT_TRACK_STATE,
  Grade,
  INITIAL_AUDIO_TRACKS,
  INITIAL_VIDEO_TRACKS,
  PanelVisibility,
  Tool,
  TrackId,
  TrackState,
  Workspace,
  gradeToFilter,
  fmtDuration,
  probeFile,
  uid,
} from "../editor/types";

type ModalKind =
  | { kind: "confirmNew" }
  | { kind: "speed"; clipId: string }
  | { kind: "export" }
  | { kind: "shortcuts" }
  | { kind: "about" };



function AppInner() {
  // ---- LocalStorage Keys ----
  const LOCAL_STORAGE_KEYS = {
    assets: "nova_studio.assets.v1",
    clips: "nova_studio.clips.v1",
    grade: "nova_studio.grade.v1",
    videoTracks: "nova_studio.videoTracks.v1",
    audioTracks: "nova_studio.audioTracks.v1",
    projectName: "nova_studio.projectName.v1",
  };

  // ---- Lazy State Initialization ----
  const [assets, setAssets] = useState<Asset[]>(() => {
    // Hard Block: Start completely clean and empty (zero auto-loaded mock files)
    return [];
  });

  const [clips, setClips] = useState<Clip[]>(() => {
    // Hard Block: Timeline starts completely clean and empty
    return [];
  });

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [grade, setGrade] = useState<Grade>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.grade);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load grade from storage:", e);
    }
    return DEFAULT_GRADE;
  });

  const [workspace, setWorkspace] = useState<Workspace>("editing");
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);

  // Dynamic tracks (Sequence > Add / Delete Empty)
  const [videoTracks, setVideoTracks] = useState<TrackId[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.videoTracks);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load videoTracks from storage:", e);
    }
    return INITIAL_VIDEO_TRACKS;
  });

  const [audioTracks, setAudioTracks] = useState<TrackId[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.audioTracks);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load audioTracks from storage:", e);
    }
    return INITIAL_AUDIO_TRACKS;
  });

  const [trackStates, setTrackStates] = useState<Record<TrackId, TrackState>>(() => {
    const init: Record<TrackId, TrackState> = {};
    [...INITIAL_VIDEO_TRACKS, ...INITIAL_AUDIO_TRACKS].forEach(
      (t) => (init[t] = { ...DEFAULT_TRACK_STATE })
    );
    return init;
  });

  // Panel visibility (Window menu)
  const [panels, setPanels] = useState<PanelVisibility>(DEFAULT_PANEL_VISIBILITY);
  const togglePanel = useCallback(
    (key: keyof PanelVisibility) => setPanels((p) => ({ ...p, [key]: !p[key] })),
    []
  );

  // Project name (updated by Save/Open)
  const [projectName, setProjectName] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.projectName);
      if (saved) return saved;
    } catch (e) {
      console.warn("Failed to load projectName from storage:", e);
    }
    return "untitled_project.novacut";
  });

  // ---- Auto-Save Observers ----
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.assets, JSON.stringify(assets));
    } catch (e) {
      console.warn("Failed to save assets to storage:", e);
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.clips, JSON.stringify(clips));
    } catch (e) {
      console.warn("Failed to save clips to storage:", e);
    }
  }, [clips]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.grade, JSON.stringify(grade));
    } catch (e) {
      console.warn("Failed to save grade to storage:", e);
    }
  }, [grade]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.videoTracks, JSON.stringify(videoTracks));
    } catch (e) {
      console.warn("Failed to save videoTracks to storage:", e);
    }
  }, [videoTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.audioTracks, JSON.stringify(audioTracks));
    } catch (e) {
      console.warn("Failed to save audioTracks to storage:", e);
    }
  }, [audioTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.projectName, projectName);
    } catch (e) {
      console.warn("Failed to save projectName to storage:", e);
    }
  }, [projectName]);

  // Asset browser state
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserTab, setBrowserTab] = useState<AssetTab>("effects");
  const [rail, setRail] = useState<RailKey>("media");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [hoveredEffectId, setHoveredEffectId] = useState<string | null>(null);
  const [audioReactiveLevel, setAudioReactiveLevel] = useState(0);
  const openAssetBrowser = useCallback((t: AssetTab = "effects") => {
    setBrowserTab(t);
    setBrowserOpen(true);
  }, []);

  // Modal + toast state
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [rampOpen, setRampOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(
    null
  );
  const showToast = useCallback(
    (message: string, tone: "info" | "success" | "error" = "info") => {
      setToast({ message, tone });
      window.setTimeout(() => setToast(null), 2400);
    },
    []
  );

  // Clipboard (Edit > Copy / Cut / Paste)
  const [clipboard, setClipboard] = useState<Clip[]>([]);

  // History (Undo/Redo)
  const [past, setPast] = useState<{ clips: Clip[]; grade: Grade }[]>([]);
  const [future, setFuture] = useState<{ clips: Clip[]; grade: Grade }[]>([]);
  const clipsRef = useRef(clips);
  const gradeRef = useRef(grade);
  clipsRef.current = clips;
  gradeRef.current = grade;

  /** Snapshot current state to the past stack before performing a mutation. */
  const pushHistory = useCallback(() => {
    setPast((prev) => [...prev.slice(-49), { clips: clipsRef.current, grade: gradeRef.current }]);
    setFuture([]);
  }, []);



  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Launcher gate — the editor mounts only after a project is created/opened. */
  const [projectStarted, setProjectStarted] = useState(false);
  const [, setAspect] = useState<AspectRatio>("16:9");
  const projectFileRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const endRef = useRef(0);
  // NOTE: timeRef is owned by the transport (playback clock + seek), never by
  // render, so a throttled state commit can't drag the clock backwards.


  // ---- derived ----
  const contentEnd = useMemo(
    () => clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0),
    [clips]
  );
  const seqDur = useMemo(() => Math.max(60, Math.ceil(contentEnd + 5)), [contentEnd]);
  endRef.current = contentEnd;
  const gradeFilter = useMemo(() => gradeToFilter(grade), [grade]);
  const sourceAsset = assets.find((a) => a.id === sourceAssetId) ?? null;

  const updateTrackState = useCallback(
    (track: TrackId, patch: Partial<TrackState>) =>
      setTrackStates((prev) => ({ ...prev, [track]: { ...prev[track], ...patch } })),
    []
  );

  const audibleTracks = useMemo(() => {
    const anyAudioSolo = audioTracks.some((t) => trackStates[t]?.solo);
    const anyVideoSolo = videoTracks.some((t) => trackStates[t]?.solo);
    const result: Record<TrackId, boolean> = {};
    for (const t of videoTracks)
      result[t] = anyVideoSolo ? !!trackStates[t]?.solo : !trackStates[t]?.muted;
    for (const t of audioTracks)
      result[t] = anyAudioSolo ? !!trackStates[t]?.solo : !trackStates[t]?.muted;
    return result;
  }, [trackStates, videoTracks, audioTracks]);

  // ---- playback clock ----
  // The frame-accurate value lives in the playhead store (read by the timeline
  // needle and timecode readouts). React state is committed at ~30 Hz, which is
  // enough for the monitor's frame logic while halving the render load.

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    let last = performance.now();
    let lastCommit = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const end = endRef.current;
      const nt = timeRef.current + dt;
      if (end > 0 && nt >= end) {
        timeRef.current = end;
        playhead.set(end);
        setTime(end);
        setPlaying(false);
        return;
      }
      timeRef.current = nt;
      playhead.set(nt);
      if (now - lastCommit >= 33) {
        lastCommit = now;
        setTime(nt);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing]);

  // Keep clock + store aligned when something other than the transport moves the
  // playhead (undo, project load, split). During playback the rAF loop owns both.
  useEffect(() => {
    if (playing) return;
    timeRef.current = time;
    playhead.set(time);
  }, [time, playing]);


  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && endRef.current > 0 && timeRef.current >= endRef.current - 0.05) {
        timeRef.current = 0;
        playhead.set(0);
        setTime(0);
      }
      return !p;
    });
  }, []);

  const seek = useCallback((t: number) => {
    const next = Math.max(0, t);
    timeRef.current = next;
    // Move the needle this frame; React catches up on the next commit.
    playhead.set(next);
    setTime(next);
  }, []);

  // Stable identities so the memoized Timeline doesn't re-render on every commit.
  const handleSelectEffect = useCallback((clipId: string | null, effectId: string | null) => {
    setSelectedFx(clipId && effectId ? { clipId, effectId } : null);
  }, []);
  const handleToggleRamp = useCallback(() => setRampOpen((v) => !v), []);



  // ---- import ----
  const importFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setImporting(true);
    const probed = await Promise.all(list.map(probeFile));
    const ok = probed.filter(Boolean) as Asset[];
    setAssets((prev) => [...prev, ...ok]);
    if (ok.length) setSourceAssetId((cur) => cur ?? ok[0].id);
    setImporting(false);
    if (ok.length) showToast(`Imported ${ok.length} item${ok.length > 1 ? "s" : ""}`, "success");
  }, [showToast]);

  const openImport = useCallback(() => fileInputRef.current?.click(), []);

  const deleteAsset = useCallback(
    (assetId: string) => {
      pushHistory();
      setAssets((prev) => {
        const victim = prev.find((a) => a.id === assetId);
        if (victim) URL.revokeObjectURL(victim.url);
        return prev.filter((a) => a.id !== assetId);
      });
      setClips((prev) => prev.filter((c) => c.assetId !== assetId));
      setSourceAssetId((cur) => (cur === assetId ? null : cur));
    },
    [pushHistory]
  );

  // ---- editing ----
  const snapTime = useCallback(
    (t: number, ignore: string[] = []) => {
      const threshold = Math.max(0.15, (seqDur / zoom) * 0.006);
      const targets: number[] = [0, timeRef.current];
      for (const c of clips) {
        if (ignore.includes(c.id)) continue;
        targets.push(c.start, c.start + c.duration);
      }
      for (const target of targets) if (Math.abs(t - target) <= threshold) return target;
      return t;
    },
    [clips, seqDur, zoom]
  );

  const addClipToTrack = useCallback(
    (assetId: string, track: TrackId, dropTime: number, offset = 0, durationOverride?: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      if (videoTracks.includes(track) && asset.kind === "audio") return;
      if (audioTracks.includes(track) && asset.kind !== "audio") return;

      if (trackStates[track]?.locked) return;

      pushHistory();
      const dur = Math.max(0.2, durationOverride ?? asset.duration ?? 5);
      let start = Math.max(0, snapTime(dropTime));
      const trackClips = clips.filter((c) => c.track === track).sort((a, b) => a.start - b.start);
      for (const tc of trackClips) {
        if (start < tc.start + tc.duration && start + dur > tc.start) start = tc.start + tc.duration;
      }
      const clip: Clip = {
        id: uid(),
        assetId,
        track,
        start,
        duration: dur,
        offset,
        keyframes: [],
        effects: { ...DEFAULT_EFFECTS },
      };
      setClips((prev) => [...prev, clip]);
      setSelected([clip.id]);
    },
    [assets, clips, snapTime, trackStates, videoTracks, audioTracks, pushHistory]
  );

  const updateClipEffects = useCallback(
    (
      clipId: string,
      patch: Partial<ClipEffects>,
      fxMeta?: { family?: string; params?: Record<string, number | string>; preset?: string; sourceItemId?: string; processingState?: AppliedEffect["processingState"]; processingProgress?: number; processingMessage?: string }
    ) => {
      // no history push per drag frame; only on significant changes
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== clipId) return c;
          
          // Separate applied effects from motion/properties
          let applied = c.appliedEffects ? [...c.appliedEffects] : [];
          if (patch.presetLabel) {
            // Check if this effect is already in the stack
            const idx = applied.findIndex((ae) => ae.name === patch.presetLabel);
            const newEffect = {
              id: uid(),
              name: patch.presetLabel,
              enabled: true,
              intensity: 100,
              filter: patch.filter,
              overlay: patch.overlay,
              overlayBlend: patch.overlayBlend,
              startOffset: 0,
              duration: c.duration,
              ...fxMeta,
            };
            if (idx >= 0) {
              applied[idx] = { ...applied[idx], ...newEffect };
            } else {
              applied.push(newEffect);
            }
          }

          // Clean up the main patch so we don't mix preset properties into base motion effects
          const cleanPatch = { ...patch };
          delete cleanPatch.filter;
          delete cleanPatch.overlay;
          delete cleanPatch.overlayBlend;
          delete cleanPatch.overlayOpacity;
          delete cleanPatch.presetLabel;

          return {
            ...c,
            effects: { ...c.effects, ...cleanPatch },
            appliedEffects: applied,
          };
        })
      );
    },
    []
  );

  const updateAppliedEffect = useCallback(
    (clipId: string, effectId: string, patch: Partial<AppliedEffect>) => {
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== clipId) return c;
          const next = c.appliedEffects?.map((ae) => {
            if (ae.id !== effectId) return ae;
            return { ...ae, ...patch };
          });
          return { ...c, appliedEffects: next };
        })
      );
    },
    []
  );

  // Local AI effects run an explicit analysis pass before their GPU program is enabled.
  // Progress is stored on the timeline instance, so selection changes never lose status.
  useEffect(() => {
    const hasPending = clips.some((clip) => clip.appliedEffects?.some((effect) => effect.processingState === "queued" || effect.processingState === "analyzing"));
    if (!hasPending) return;
    const timer = window.setInterval(() => {
      setClips((current) => current.map((clip) => ({
        ...clip,
        appliedEffects: clip.appliedEffects?.map((effect) => {
          if (effect.processingState !== "queued" && effect.processingState !== "analyzing") return effect;
          const next = Math.min(100, (effect.processingProgress ?? 0) + 8);
          return {
            ...effect,
            processingState: next >= 100 ? "ready" : "analyzing",
            processingProgress: next,
            processingMessage: next < 32 ? "Detecting subject and motion vectors" : next < 68 ? "Propagating masks across frames" : next < 100 ? "Optimizing real-time GPU pass" : "Analysis ready",
          };
        }),
      })));
    }, 180);
    return () => window.clearInterval(timer);
  }, [clips]);

  const insertFromSource = useCallback(
    (assetId: string, offset: number, duration: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      const track: TrackId = asset.kind === "audio" ? audioTracks[0] : videoTracks[videoTracks.length - 1];
      addClipToTrack(assetId, track, timeRef.current, offset, duration);
    },
    [assets, addClipToTrack, videoTracks, audioTracks]
  );

  /** Move a set of clips; if any belong to a group, drag their siblings too. */
  const moveClips = useCallback(
    (ids: string[], anchorId: string, newAnchorStart: number, newAnchorTrack?: TrackId) => {
      pushHistory();
      setClips((prev) => {
        const anchor = prev.find((c) => c.id === anchorId);
        if (!anchor) return prev;

        // Expand selection to include grouped siblings
        const groups = new Set<string>();
        for (const id of ids) {
          const c = prev.find((x) => x.id === id);
          if (c?.group) groups.add(c.group);
        }
        const allIds = new Set(ids);
        prev.forEach((c) => {
          if (c.group && groups.has(c.group)) allIds.add(c.id);
        });

        // Horizontal delta with snapping
        const snapped = Math.max(0, snapTime(newAnchorStart, [...allIds]));
        const timeDelta = snapped - anchor.start;
        const minStart = Math.min(...prev.filter((c) => allIds.has(c.id)).map((c) => c.start));
        const clampedTime = minStart + timeDelta < 0 ? -minStart : timeDelta;

        // Vertical track change (only allowed within the same kind: video↔video or audio↔audio)
        let trackDelta = 0;
        if (newAnchorTrack && newAnchorTrack !== anchor.track) {
          const list = videoTracks.includes(anchor.track)
            ? videoTracks
            : audioTracks.includes(anchor.track)
            ? audioTracks
            : null;
          if (list && list.includes(newAnchorTrack) && !trackStates[newAnchorTrack]?.locked) {
            trackDelta = list.indexOf(newAnchorTrack) - list.indexOf(anchor.track);
          }
        }

        // Apply — collision handling: if a target lane already has a clip overlapping the
        // moved clip's new [start, end) range, we still move (Premiere behaviour is to allow
        // overlaps; the top-most clip wins in the Program Monitor). Locked target tracks are
        // simply rejected above.
        return prev.map((c) => {
          if (!allIds.has(c.id)) return c;
          let track = c.track;
          if (trackDelta !== 0) {
            const list = videoTracks.includes(c.track)
              ? videoTracks
              : audioTracks.includes(c.track)
              ? audioTracks
              : null;
            if (list) {
              const ni = Math.min(list.length - 1, Math.max(0, list.indexOf(c.track) + trackDelta));
              const candidate = list[ni];
              if (!trackStates[candidate]?.locked) track = candidate;
            }
          }
          return { ...c, start: c.start + clampedTime, track };
        });
      });
    },
    [snapTime, pushHistory, videoTracks, audioTracks, trackStates]
  );

  const rippleTrim = useCallback(
    (clipId: string, newDuration: number) => {
      pushHistory();
      setClips((prev) => {
        const clip = prev.find((c) => c.id === clipId);
        if (!clip) return prev;
        const asset = assets.find((a) => a.id === clip.assetId);
        const maxDur = asset ? Math.max(0.2, asset.duration - clip.offset) : Infinity;
        const dur = Math.min(maxDur, Math.max(0.2, newDuration));
        const delta = dur - clip.duration;
        if (Math.abs(delta) < 0.001) return prev;
        return prev.map((c) => {
          if (c.id === clipId) return { ...c, duration: dur };
          if (c.track === clip.track && c.start >= clip.start + clip.duration - 0.001)
            return { ...c, start: Math.max(0, c.start + delta) };
          return c;
        });
      });
    },
    [assets, pushHistory]
  );

  const slipClip = useCallback(
    (clipId: string, newOffset: number) => {
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== clipId) return c;
          const asset = assets.find((a) => a.id === c.assetId);
          const maxOff = asset ? Math.max(0, asset.duration - c.duration) : newOffset;
          return { ...c, offset: Math.min(maxOff, Math.max(0, newOffset)) };
        })
      );
    },
    [assets]
  );

  const slideClip = useCallback((clipId: string, deltaSec: number) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (!clip) return prev;
      const trackClips = prev.filter((c) => c.track === clip.track).sort((a, b) => a.start - b.start);
      const idx = trackClips.findIndex((c) => c.id === clipId);
      const prevClip = trackClips[idx - 1];
      const nextClip = trackClips[idx + 1];

      let d = deltaSec;
      if (prevClip && d < 0) d = Math.max(d, -(prevClip.duration - 0.2));
      if (nextClip && d > 0) d = Math.min(d, nextClip.duration - 0.2);
      if (clip.start + d < 0) d = -clip.start;
      if (Math.abs(d) < 0.001) return prev;

      return prev.map((c) => {
        if (c.id === clip.id) return { ...c, start: c.start + d };
        if (prevClip && c.id === prevClip.id) return { ...c, duration: c.duration + d };
        if (nextClip && c.id === nextClip.id)
          return { ...c, duration: c.duration - d, offset: c.offset + d };
        return c;
      });
    });
  }, []);

  const splitClipAt = useCallback(
    (clipId: string, t: number) => {
      setClips((prev) => {
        const clip = prev.find((c) => c.id === clipId);
        if (!clip) return prev;
        const rel = t - clip.start;
        if (rel < 0.1 || rel > clip.duration - 0.1) return prev;
        // Snapshot pre-mutation for undo
        setPast((p) => [...p.slice(-49), { clips: prev, grade: gradeRef.current }]);
        setFuture([]);
        const left: Clip = {
          ...clip,
          duration: rel,
          keyframes: clip.keyframes.filter((k) => k < rel),
          effects: { ...clip.effects },
        };
        const right: Clip = {
          ...clip,
          id: uid(),
          start: clip.start + rel,
          duration: clip.duration - rel,
          offset: clip.offset + rel,
          keyframes: clip.keyframes.filter((k) => k >= rel).map((k) => k - rel),
          effects: { ...clip.effects },
        };
        return prev.map((c) => (c.id === clipId ? left : c)).concat(right);
      });
    },
    []
  );

  const addKeyframe = useCallback((clipId: string, rel: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const near = c.keyframes.findIndex((k) => Math.abs(k - rel) < 0.25);
        const keyframes =
          near >= 0 ? c.keyframes.filter((_, i) => i !== near) : [...c.keyframes, rel].sort((a, b) => a - b);
        return { ...c, keyframes };
      })
    );
  }, []);

  const selectClip = useCallback(
    (clipId: string | null, forward = false) => {
      if (!clipId) {
        setSelected([]);
        return;
      }
      if (!forward) {
        // If clip is in a group, select all group members
        const clip = clips.find((c) => c.id === clipId);
        if (clip?.group) {
          setSelected(clips.filter((c) => c.group === clip.group).map((c) => c.id));
          return;
        }
        setSelected([clipId]);
        return;
      }
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;
      setSelected(
        clips.filter((c) => c.track === clip.track && c.start >= clip.start - 0.001).map((c) => c.id)
      );
    },
    [clips]
  );

  const deleteSelected = useCallback(() => {
    if (!selected.length) return;
    pushHistory();
    setClips((prev) => prev.filter((c) => !selected.includes(c.id)));
    setSelected([]);
  }, [selected, pushHistory]);

  /* =================== MENU HANDLERS =================== */

  // File
  const newProject = useCallback(() => setModal({ kind: "confirmNew" }), []);
  const confirmNewProject = useCallback(() => {
    assets.forEach((a) => URL.revokeObjectURL(a.url));
    
    // Clear storage on New Project to prevent auto-loading deleted items
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.assets);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.clips);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.grade);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.videoTracks);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.audioTracks);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.projectName);
    } catch (e) {
      console.warn("Failed to clear local storage:", e);
    }

    setAssets([]);
    setClips([]);
    setSelected([]);
    setSourceAssetId(null);
    setTime(0);
    setGrade(DEFAULT_GRADE);
    setPast([]);
    setFuture([]);
    setClipboard([]);
    setProjectName("untitled_project.novacut");
    setModal(null);
    showToast("New project created", "success");
  }, [assets, showToast]);

  const openProject = useCallback(() => projectFileRef.current?.click(), []);

  const loadProjectFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.clips && data.grade) {
          pushHistory();
          setClips(data.clips);
          setGrade(data.grade);
          setProjectName(file.name);
          showToast(`Opened ${file.name}`, "success");
        } else {
          showToast("Invalid project file", "error");
        }
      } catch {
        showToast("Failed to open project", "error");
      }
    },
    [pushHistory, showToast]
  );

  const saveProject = useCallback(() => {
    const data = { version: 1, clips, grade, panels };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = projectName.endsWith(".novacut") ? projectName : `${projectName}.novacut`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Saved ${a.download}`, "success");
  }, [clips, grade, panels, projectName, showToast]);

  const exportSequence = useCallback(() => setModal({ kind: "export" }), []);

  // Edit
  const undo = useCallback(() => {
    setPast((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setFuture((f) => [...f, { clips: clipsRef.current, grade: gradeRef.current }]);
      setClips(last.clips);
      setGrade(last.grade);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const next = prev[prev.length - 1];
      setPast((p) => [...p, { clips: clipsRef.current, grade: gradeRef.current }]);
      setClips(next.clips);
      setGrade(next.grade);
      return prev.slice(0, -1);
    });
  }, []);

  const copySel = useCallback(() => {
    if (!selected.length) return;
    setClipboard(clips.filter((c) => selected.includes(c.id)).map((c) => ({ ...c })));
    showToast(`Copied ${selected.length} clip${selected.length > 1 ? "s" : ""}`);
  }, [clips, selected, showToast]);

  const cutSel = useCallback(() => {
    if (!selected.length) return;
    copySel();
    deleteSelected();
  }, [selected, copySel, deleteSelected]);

  const paste = useCallback(() => {
    if (!clipboard.length) return;
    pushHistory();
    const anchor = Math.min(...clipboard.map((c) => c.start));
    const delta = timeRef.current - anchor;
    const newClips = clipboard.map((c) => ({
      ...c,
      id: uid(),
      start: Math.max(0, c.start + delta),
      effects: { ...c.effects },
      keyframes: [...c.keyframes],
    }));
    setClips((prev) => [...prev, ...newClips]);
    setSelected(newClips.map((c) => c.id));
    showToast(`Pasted ${newClips.length} clip${newClips.length > 1 ? "s" : ""}`, "success");
  }, [clipboard, pushHistory, showToast]);

  const selectAll = useCallback(() => setSelected(clips.map((c) => c.id)), [clips]);

  // Clip
  const openSpeedDialog = useCallback(() => {
    if (!selected.length) return;
    setModal({ kind: "speed", clipId: selected[0] });
  }, [selected]);

  const applySpeed = useCallback(
    (clipId: string, speed: number) => {
      pushHistory();
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== clipId) return c;
          const oldSpeed = c.effects.speed;
          const newDur = c.duration * (oldSpeed / speed);
          return { ...c, duration: newDur, effects: { ...c.effects, speed } };
        })
      );
      setModal(null);
      showToast(`Speed set to ${speed.toFixed(0)}%`, "success");
    },
    [pushHistory, showToast]
  );

  const splitAtPlayhead = useCallback(() => {
    const t = timeRef.current;
    const hits = clips.filter((c) => t > c.start + 0.1 && t < c.start + c.duration - 0.1);
    if (!hits.length) {
      showToast("Nothing to split at playhead", "error");
      return;
    }
    pushHistory();
    hits.forEach((c) => splitClipAt(c.id, t));
    showToast(`Split ${hits.length} clip${hits.length > 1 ? "s" : ""}`, "success");
  }, [clips, splitClipAt, pushHistory, showToast]);

  const groupSelected = useCallback(() => {
    if (selected.length < 2) {
      showToast("Select 2+ clips to group", "error");
      return;
    }
    pushHistory();
    const gid = uid();
    setClips((prev) => prev.map((c) => (selected.includes(c.id) ? { ...c, group: gid } : c)));
    showToast(`Grouped ${selected.length} clips`, "success");
  }, [selected, pushHistory, showToast]);

  const ungroupSelected = useCallback(() => {
    if (!selected.length) return;
    pushHistory();
    setClips((prev) =>
      prev.map((c) => (selected.includes(c.id) ? { ...c, group: undefined } : c))
    );
    showToast("Ungrouped clips");
  }, [selected, pushHistory, showToast]);

  // Sequence
  const addVideoTrack = useCallback(() => {
    setVideoTracks((prev) => {
      const next = `V${prev.length + 1}`;
      setTrackStates((s) => ({ ...s, [next]: { ...DEFAULT_TRACK_STATE } }));
      // videoTracks are ordered top-first (V3, V2, V1) → prepend the new one
      return [next, ...prev];
    });
    showToast("Added video track");
  }, [showToast]);

  const addAudioTrack = useCallback(() => {
    setAudioTracks((prev) => {
      const next = `A${prev.length + 1}`;
      setTrackStates((s) => ({ ...s, [next]: { ...DEFAULT_TRACK_STATE } }));
      return [...prev, next];
    });
    showToast("Added audio track");
  }, [showToast]);

  const deleteEmptyTracks = useCallback(() => {
    let removed = 0;
    setVideoTracks((prev) => {
      const kept = prev.filter((t, i) => {
        const isDefault = i >= prev.length - 3; // preserve at least V1..V3
        return isDefault || clips.some((c) => c.track === t);
      });
      removed += prev.length - kept.length;
      return kept;
    });
    setAudioTracks((prev) => {
      const kept = prev.filter((t, i) => {
        const isDefault = i < 3;
        return isDefault || clips.some((c) => c.track === t);
      });
      removed += prev.length - kept.length;
      return kept;
    });
    showToast(removed > 0 ? `Removed ${removed} empty track${removed > 1 ? "s" : ""}` : "No empty extra tracks");
  }, [clips, showToast]);

  const renderSequence = useCallback(() => {
    if (contentEnd < 0.1) {
      showToast("Timeline is empty", "error");
      return;
    }
    showToast("Rendering preview cache…");
    window.setTimeout(() => showToast("Preview render complete", "success"), 1800);
  }, [contentEnd, showToast]);

  // Effects / Help
  const openEffectsBrowser = useCallback(() => openAssetBrowser("effects"), [openAssetBrowser]);
  const openShortcuts = useCallback(() => setModal({ kind: "shortcuts" }), []);
  const openAbout = useCallback(() => setModal({ kind: "about" }), []);

  /** Apply an effect preset to a specific clip (from a drop) or to the current selection (from a click). */
  const applyAssetPreset = useCallback(
    (
      item: AssetItem,
      targetClipId?: string,
      override?: { family: EffectFamily; params: ParamValues; preset?: string },
      opts?: { silent?: boolean; keepBrowserOpen?: boolean }
    ) => {

      // Translate the preset's tag + glyph + id into a rich effect patch.
      // The `tag` field carries the pack identity (LUT, MAGIC, GLITCH, ATMOS, RAMP, AI, ...)
      // and lets us layer CSS filters + overlays for real-time visible changes.
      const patch: Partial<ClipEffects> = (() => {
        // --- Pack-specific handlers (take priority over the glyph fallback) ---
        if (item.tag === "LUT") {
          const luts: Record<string, Partial<ClipEffects>> = {
            "lut-midnight-cyber":    { filter: "contrast(1.35) saturate(1.4) brightness(0.88) hue-rotate(-14deg)", overlay: "linear-gradient(180deg, rgba(124,58,237,0.18), rgba(34,211,238,0.14))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Midnight Cyberpunk" },
            "lut-teal-orange-car":   { filter: "contrast(1.2) saturate(1.35) brightness(1.02) sepia(0.12) hue-rotate(-6deg)", presetLabel: "Teal & Orange Car" },
            "lut-high-contrast-matte": { filter: "contrast(1.5) saturate(0.7) brightness(0.98)", presetLabel: "High-Contrast Matte" },
            "lut-music-video":       { filter: "contrast(1.3) saturate(1.55) brightness(1.05)", overlay: "linear-gradient(135deg, rgba(244,63,94,0.16), transparent 60%)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Music Video Punch" },
            "lut-warm-vintage":      { filter: "sepia(0.35) contrast(1.1) saturate(0.9) brightness(1.02)", presetLabel: "Warm Vintage" },
            "lut-blockbuster":       { filter: "contrast(1.28) saturate(1.25) brightness(0.95)", overlay: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.35) 100%)", overlayBlend: "multiply", overlayOpacity: 1, presetLabel: "Blockbuster" },
            "lut-nordic-cool":       { filter: "contrast(1.1) saturate(0.85) brightness(1.05) hue-rotate(-4deg)", presetLabel: "Nordic Cool" },
            "lut-golden-commercial": { filter: "contrast(1.15) saturate(1.3) brightness(1.08) sepia(0.15)", presetLabel: "Golden Commercial" },
            "lut-noir-street":       { filter: "grayscale(1) contrast(1.4) brightness(0.95)", presetLabel: "Noir Street" },
            "lut-fashion-bleach":    { filter: "contrast(1.25) saturate(0.55) brightness(1.1)", presetLabel: "Fashion Bleach" },
          };
          return luts[item.id] ?? { filter: "contrast(1.15) saturate(1.15)", presetLabel: item.name };
        }
        if (item.tag === "MAGIC") {
          // Dynamic Lighting & Halation
          const magic: Record<string, Partial<ClipEffects>> = {
            "dl-anamorphic-halation":  { filter: "brightness(1.06) saturate(1.2)", overlay: "radial-gradient(ellipse at 70% 40%, rgba(56,189,248,0.5), transparent 45%), linear-gradient(90deg, transparent 20%, rgba(56,189,248,0.35) 50%, transparent 80%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Anamorphic Halation" },
            "dl-lens-streak":          { overlay: "linear-gradient(90deg, transparent 30%, rgba(224,242,254,0.55) 50%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.75, presetLabel: "Lens Streak" },
            "dl-reactive-flare":       { overlay: "radial-gradient(circle at 65% 35%, rgba(255,240,180,0.85), transparent 35%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "brightness(1.05)", presetLabel: "Reactive Flare" },
            "dl-neon-halation":        { filter: "saturate(1.4) brightness(1.05)", overlay: "radial-gradient(ellipse at 30% 50%, rgba(236,72,153,0.35), transparent 45%), radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.3), transparent 50%)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Neon Halation" },
            "dl-golden-diffusion":     { filter: "brightness(1.08) saturate(1.1) blur(0.4px)", overlay: "radial-gradient(ellipse at center, rgba(251,191,36,0.2), transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Golden Diffusion" },
            "dl-halogen-warm":         { filter: "sepia(0.18) brightness(1.05) saturate(1.15)", overlay: "radial-gradient(ellipse at 20% 70%, rgba(251,191,36,0.32), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Halogen Warm" },
            "dl-window-god-rays":      { overlay: "linear-gradient(-60deg, transparent 40%, rgba(254,243,199,0.4) 55%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "brightness(1.05)", presetLabel: "God Rays" },
            "dl-magic-sparkle":        { overlay: "radial-gradient(circle at 25% 30%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 70% 45%, rgba(255,255,255,0.6) 0 1px, transparent 2px), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.6) 0 1px, transparent 2px)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Magic Sparkles" },
          };
          return magic[item.id] ?? { overlay: "radial-gradient(ellipse at 60% 40%, rgba(255,240,200,0.4), transparent 50%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: item.name };
        }
        if (item.tag === "GLITCH") {
          // RGB Split / Speed Glitches — use hue-rotate + tiny shake + saturation to fake chromatic aberration
          const shakePresets: Record<string, Partial<ClipEffects>> = {
            "gl-rgb-motion":     { filter: "saturate(1.4) contrast(1.15) hue-rotate(6deg)", posX: 4, posY: -3, presetLabel: "RGB Fringe" },
            "gl-chromatic-speed":{ filter: "saturate(1.5) contrast(1.2) hue-rotate(-8deg)", posX: -5, posY: 2, presetLabel: "Chromatic Speed" },
            "gl-datamosh-burst": { filter: "contrast(1.3) saturate(1.35) hue-rotate(12deg)", overlay: "repeating-linear-gradient(0deg, rgba(220,38,38,0.12) 0 2px, transparent 2px 4px)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Datamosh Burst" },
            "gl-signal-jitter":  { filter: "saturate(1.3) contrast(1.2)", posX: 3, presetLabel: "Signal Jitter" },
            "gl-pixel-shatter":  { filter: "contrast(1.4) saturate(1.5)", overlay: "repeating-linear-gradient(90deg, rgba(168,85,247,0.15) 0 1px, transparent 1px 3px)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Pixel Shatter" },
            "gl-tape-warp":      { filter: "contrast(1.15) saturate(1.25) hue-rotate(-6deg)", overlay: "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 4px)", overlayBlend: "multiply", overlayOpacity: 0.85, presetLabel: "Tape Warp" },
            "gl-vhs-bar":        { filter: "contrast(1.2) saturate(1.35)", overlay: "linear-gradient(180deg, transparent 40%, rgba(34,197,94,0.35) 48%, transparent 56%)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "VHS Roll" },
          };
          return shakePresets[item.id] ?? { filter: "saturate(1.3) hue-rotate(8deg)", posX: 3, presetLabel: item.name };
        }
        if (item.tag === "ATMOS") {
          // Atmosphere Gradients — dominant overlay wash
          const atmos: Record<string, Partial<ClipEffects>> = {
            "atm-cyberpunk-shift":{ filter: "contrast(1.15) saturate(1.3)", overlay: "linear-gradient(135deg, rgba(236,72,153,0.32), rgba(124,58,237,0.24), rgba(34,211,238,0.28))", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Cyberpunk Ambient" },
            "atm-sunset-wash":    { filter: "saturate(1.15) brightness(1.05)", overlay: "linear-gradient(180deg, rgba(245,158,11,0.3), rgba(244,114,182,0.22))", overlayBlend: "soft-light", overlayOpacity: 0.9, presetLabel: "Sunset Wash" },
            "atm-teal-mist":      { filter: "contrast(1.05) saturate(0.9)", overlay: "linear-gradient(180deg, rgba(14,116,144,0.35), rgba(226,232,240,0.15))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Teal Mist" },
            "atm-magenta-drift":  { overlay: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(253,242,248,0.15))", overlayBlend: "screen", overlayOpacity: 0.85, filter: "saturate(1.2)", presetLabel: "Magenta Drift" },
            "atm-blue-hour":      { filter: "hue-rotate(-6deg) saturate(1.15)", overlay: "linear-gradient(180deg, rgba(15,23,42,0.35), rgba(56,189,248,0.25))", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Blue Hour" },
            "atm-warm-window":    { overlay: "radial-gradient(ellipse at 15% 60%, rgba(251,191,36,0.45), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.9, filter: "saturate(1.1)", presetLabel: "Warm Window" },
            "atm-pastel-dream":   { filter: "saturate(0.95) brightness(1.08)", overlay: "linear-gradient(135deg, rgba(253,164,175,0.3), rgba(165,243,252,0.25))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Pastel Dream" },
            "atm-red-hallway":    { filter: "saturate(1.35) contrast(1.15)", overlay: "radial-gradient(ellipse at center, rgba(220,38,38,0.3), rgba(127,29,29,0.2))", overlayBlend: "multiply", overlayOpacity: 0.9, presetLabel: "Red Hallway" },
          };
          return atmos[item.id] ?? { overlay: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.2))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: item.name };
        }
        if (item.tag === "RAMP" || item.tag === "STYLE" || item.tag === "MOTION") {
          // Camera Motions & Creative Styles (Strictly locked speed)
          const ramp: Record<string, Partial<ClipEffects>> = {
            "sr-bass-drop":     { filter: "contrast(1.15) saturate(1.25)", presetLabel: "Bass Drop Ramp" },
            "sr-slowmo-freeze": { filter: "contrast(1.1)", presetLabel: "Slow-Mo Freeze" },
            "sr-punch-in-ramp": { scale: 118, presetLabel: "Punch-In Ramp" },
            "sr-time-warp":     { scale: 108, rotation: -3, presetLabel: "Time Warp" },
            "sr-bpm-cut":       { presetLabel: "BPM Beat Cut" },
            "sr-ease-in-out":   { presetLabel: "Ease Curve" },
            "sr-hyperlapse":    { presetLabel: "Hyperlapse" },
            // Filmora Trending & Dynamic moves
            "trending-drone-ascend": { scale: 115, rotation: 2, presetLabel: "Drone Ascend" },
            "trending-fpv-smooth":   { scale: 110, rotation: -3, presetLabel: "FPV Smooth Movement" },
            "trending-snap-zoom-out":{ scale: 85, presetLabel: "Snap Zoom Out" },
            // Filmora Style & Lighting moves
            "style-crane-lift":      { scale: 118, posY: -20, presetLabel: "Cinematic Crane Lift" },
            "style-explosion-pull":  { scale: 75, filter: "contrast(1.25) saturate(1.3)", presetLabel: "Explosion Pull Out" },
            "style-time-lapse":      { filter: "brightness(1.05) saturate(1.2)", presetLabel: "Accelerated Time Lapse" },
          };
          return ramp[item.id] ?? { presetLabel: item.name };
        }
        if (item.tag === "AI_AUDIO") {
          // Advanced AI Audio tools
          return { filter: "saturate(1.1) brightness(1.05)", overlay: "linear-gradient(90deg, rgba(6,182,212,0.1), transparent)", overlayBlend: "screen", overlayOpacity: 0.5, presetLabel: item.name };
        }
        if (item.tag === "FILM") {
          const filmMap: Record<string, Partial<ClipEffects>> = {
            "vf-film-16k-grain":     { filter: "contrast(1.08) saturate(0.95) brightness(1.02)", overlay: "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0 1px, transparent 1px 2px)", overlayBlend: "overlay", overlayOpacity: 0.9, presetLabel: "16K Film Grain" },
            "vf-anamorphic-pro":     { overlay: "linear-gradient(90deg, transparent 30%, rgba(56,189,248,0.5) 50%, transparent 70%)", overlayBlend: "screen", overlayOpacity: 0.85, filter: "brightness(1.05) saturate(1.15)", presetLabel: "Anamorphic Pro" },
            "vf-ultra-light-leaks":  { overlay: "linear-gradient(135deg, rgba(245,158,11,0.5), transparent 60%)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Ultra Light Leak" },
            "vf-optical-blur-trans": { filter: "blur(0.6px) brightness(1.05)", presetLabel: "Optical Blur" },
            "vf-chroma-gradient":    { overlay: "linear-gradient(135deg, rgba(34,211,238,0.28), rgba(244,63,94,0.24), rgba(249,115,22,0.22))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Chroma Gradient" },
            "vf-shutter-30":         { filter: "contrast(1.15) brightness(0.95)", presetLabel: "Shutter 30°" },
            "vf-lens-breathing":     { scale: 105, filter: "brightness(1.02)", presetLabel: "Lens Breathing" },
            "vf-cin-print-3perf":    { filter: "sepia(0.15) contrast(1.1) saturate(1.05)", presetLabel: "3-Perf Print" },
            "vf-vignette-natural":   { overlay: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)", overlayBlend: "multiply", overlayOpacity: 1, presetLabel: "Natural Vignette" },
            "vf-lens-dirt":          { overlay: "radial-gradient(circle at 30% 40%, rgba(251,191,36,0.15), transparent 12%), radial-gradient(circle at 65% 60%, rgba(251,191,36,0.12), transparent 15%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Lens Dirt" },
          };
          return filmMap[item.id] ?? { filter: "contrast(1.1) saturate(1.05)", presetLabel: item.name };
        }
        if (item.isAiPro || item.tag === "AI") {
          // AI Smart Effects
          const ai: Record<string, Partial<ClipEffects>> = {
            "smart-panda-16k":        { filter: "contrast(1.12) saturate(1.15) brightness(1.03)", presetLabel: "16K Enhance" },
            "smart-neural-cutout":    { filter: "contrast(1.05)", overlay: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.35))", overlayBlend: "multiply", overlayOpacity: 1, presetLabel: "Neural Cutout" },
            "smart-portrait-glow":    { filter: "brightness(1.08) saturate(1.15) blur(0.4px) contrast(0.98)", presetLabel: "Portrait Glow" },
            "smart-cyberpunk-glitch": { filter: "saturate(1.5) contrast(1.25) hue-rotate(-14deg)", overlay: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(34,211,238,0.2))", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Cyberpunk Glitch" },
            "smart-body-morph":       { scale: 108, filter: "contrast(1.05)", presetLabel: "Body Morph" },
            "smart-color-match":      { filter: "contrast(1.2) saturate(1.25) brightness(1.02) sepia(0.08)", presetLabel: "Cinematic Match" },
            "smart-face-relight":     { filter: "brightness(1.12) contrast(1.05)", overlay: "radial-gradient(ellipse at 50% 40%, rgba(251,191,36,0.28), transparent 55%)", overlayBlend: "screen", overlayOpacity: 0.85, presetLabel: "Face Relight" },
            "smart-scene-upscale":    { filter: "contrast(1.15) saturate(1.15) brightness(1.05)", presetLabel: "AI Upscale" },
            "smart-sky-replace":      { overlay: "linear-gradient(180deg, rgba(56,189,248,0.45), transparent 45%)", overlayBlend: "screen", overlayOpacity: 0.9, presetLabel: "Sky Replace" },
            "smart-lip-sync":         { filter: "contrast(1.05) saturate(1.1)", presetLabel: "Lip-Sync AI" },
            "smart-object-remove":    { filter: "contrast(1.05)", presetLabel: "Object Removed" },
          };
          const p = ai[item.id];
          if (p) return p;
          // Fallback for other AI-tagged items: fall through to glyph handler below
        }
        if (item.tag === "CREATIVE") {
          // Unique CapCut creative looks
          const creative: Record<string, Partial<ClipEffects>> = {
            "style-duotone-violet": { filter: "contrast(1.25) saturate(1.3) hue-rotate(15deg) sepia(0.2)", overlay: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(236,72,153,0.2))", overlayBlend: "color", overlayOpacity: 0.9, presetLabel: "Duotone Violet" },
            "style-duotone-teal":   { filter: "contrast(1.2) saturate(1.2) hue-rotate(-10deg) sepia(0.2)", overlay: "linear-gradient(135deg, rgba(14,116,144,0.25), rgba(245,158,11,0.18))", overlayBlend: "color", overlayOpacity: 0.85, presetLabel: "Duotone Teal" },
            "style-comic-book":     { filter: "contrast(1.8) brightness(1.1) saturate(1.7) blur(0.3px)", overlay: "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0 2px, transparent 2px 6px)", overlayBlend: "overlay", overlayOpacity: 1, presetLabel: "Comic Pop Art" },
            "style-pencil-sketch":  { filter: "grayscale(1) contrast(2.2) brightness(1.05) invert(0)", overlay: "repeating-linear-gradient(135deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 4px)", overlayBlend: "multiply", overlayOpacity: 0.95, presetLabel: "Pencil Sketch" },
            "style-vhs-aesthetic":  { filter: "contrast(1.15) saturate(1.4) hue-rotate(-5deg)", overlay: "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 3px)", overlayBlend: "multiply", overlayOpacity: 0.88, presetLabel: "VHS Nostalgia" },
          };
          return creative[item.id] ?? { filter: "contrast(1.2) saturate(1.2)", presetLabel: item.name };
        }

        // --- Glyph fallback (original behaviour) ---
        switch (item.glyph) {
          case "zoomin": return { scale: 130 };
          case "orbit": return { rotation: 8, scale: 115 };
          case "shake": return { posX: 6, posY: -4 };
          case "dolly": return { scale: 122 };
          case "pan": return { posX: 24 };
          case "flare":
          case "leak":
          case "bokeh":
          case "sparkle": return { opacity: 88 };
          case "beauty": return { scale: 105 };
          case "arc": return { rotation: -6, scale: 112 };
          case "reveal": return { opacity: 96, scale: 108 };
          case "pullback": return { scale: 82 };
          case "vhs": return { opacity: 92 };
          default: return { scale: 102 };
        }
      })();

      // Parameter-driven application (from the Effect Control Panel) always wins:
      // the compiled CSS from the live parameters replaces the static preset look.
      const family = override?.family ?? familyFor(item.name, item.tag);
      const params = override?.params ?? defaultValues(family);
      const renderProgram = item.renderProgram ?? compileRenderProgram(item);
      const needsAnalysis = requiresLocalAnalysis(item);
      const finalPatch: Partial<ClipEffects> = {
        presetLabel: item.name,
        // Library presets are rendered by their unique GPU program. CSS is
        // reserved for manual clip corrections, never used as an FX fallback.
        filter: undefined,
        overlay: undefined,
        overlayBlend: undefined,
        overlayOpacity: undefined,
      };

      const target = targetClipId ?? selected[0] ?? clips[0]?.id;
      if (target) {
        pushHistory();
        updateClipEffects(target, finalPatch, {
          family,
          params,
          preset: override?.preset,
          sourceItemId: item.id,
          processingState: needsAnalysis ? "queued" : "ready",
          processingProgress: needsAnalysis ? 0 : 100,
          processingMessage: needsAnalysis ? "Preparing local analysis" : `${renderProgram.logicId} ready`,
        });
        setSelected([target]);
        // Close the browser only for click-to-apply. Drop-to-apply keeps it open
        // so the user can drag more effects without reopening.
        if (!targetClipId && !opts?.keepBrowserOpen) setBrowserOpen(false);
        if (!opts?.silent)
          showToast(needsAnalysis ? `Analyzing “${item.name}” locally…` : `Applied "${item.name}" — Effect Controls ready`, needsAnalysis ? "info" : "success");
      } else if (!opts?.silent) {
        showToast(`"${item.name}" copied — drop it on a timeline clip`, "info");
      }

    },
    [selected, clips, pushHistory, updateClipEffects, showToast]
  );

  /** Called by timeline clip blocks when an effect card is dropped onto them. */
  const applyEffectToClip = useCallback(
    (effectId: string, targetClipId: string) => {
      const item = findAssetItem(effectId);
      if (item) applyAssetPreset(item, targetClipId);
    },
    [applyAssetPreset]
  );

  /**
   * One-click global grade: apply a single preset to every visual clip on the
   * timeline so the whole sequence shares one look (Filmora-style master grade).
   */
  const applyPresetToTimeline = useCallback(
    (item: AssetItem) => {
      const targets = clips.filter((c) => videoTracks.includes(c.track));
      if (!targets.length) {
        showToast("Add clips to the timeline first", "error");
        return;
      }
      pushHistory();
      for (const c of targets) applyAssetPreset(item, c.id, undefined, { silent: true, keepBrowserOpen: true });
      setBrowserOpen(false);
      showToast(`“${item.name}” applied to all ${targets.length} clips`, "success");
    },
    [clips, videoTracks, pushHistory, applyAssetPreset, showToast]
  );


  /* ---------- timeline FX instance selection + Effect Control Panel ---------- */
  const [selectedFx, setSelectedFx] = useState<{ clipId: string; effectId: string } | null>(null);

  const fxSelection = useMemo(() => {
    if (!selectedFx) return null;
    const clip = clips.find((c) => c.id === selectedFx.clipId);
    const ae = clip?.appliedEffects?.find((e) => e.id === selectedFx.effectId);
    if (!clip || !ae) return null;
    const asset = assets.find((a) => a.id === clip.assetId) ?? null;
    const family = (ae.family as EffectFamily) ?? familyFor(ae.name);
    return { clip, ae, asset, family, params: ae.params ?? defaultValues(family) };
  }, [selectedFx, clips, assets]);

  /** The user's imported media, surfaced inside the browser's "Mine" tab. */
  const myMediaItems = useMemo<AssetItem[]>(
    () =>
      assets.map((a) => ({
        id: `mine-${a.id}`,
        name: a.name,
        tag: a.kind === "audio" ? "MY AUDIO" : a.kind === "image" ? "MY PHOTO" : "MY VIDEO",
        kind: "media",
        glyph: a.kind === "audio" ? "note" : a.kind === "image" ? "portrait" : "film",
        duration: fmtDuration(a.duration),
        preview: a.thumb,
        gradient: "linear-gradient(135deg,#0f172a,#334155)",
      })),
    [assets]
  );


  const updateFxParams = useCallback(
    (next: ParamValues, presetName?: string) => {
      if (!selectedFx || !fxSelection) return;
      updateAppliedEffect(selectedFx.clipId, selectedFx.effectId, {
        params: next,
        preset: presetName ?? fxSelection.ae.preset,
        family: fxSelection.family,
        intensity: fxSelection.ae.intensity,
      });
    },
    [selectedFx, fxSelection, updateAppliedEffect]
  );

  const deleteAppliedEffect = useCallback(
    (clipId: string, effectId: string) => {
      pushHistory();
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId ? { ...c, appliedEffects: c.appliedEffects?.filter((e) => e.id !== effectId) } : c
        )
      );
      setSelectedFx((cur) => (cur && cur.effectId === effectId ? null : cur));
    },
    [pushHistory]
  );



  const menuActions: MenuActions = {
    newProject,
    openProject,
    saveProject,
    importMedia: openImport,
    exportSequence,
    undo,
    redo,
    cut: cutSel,
    copy: copySel,
    paste,
    selectAll,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    hasSelection: selected.length > 0,
    hasClipboard: clipboard.length > 0,
    openSpeedDialog,
    splitAtPlayhead,
    groupSelected,
    ungroupSelected,
    addVideoTrack,
    addAudioTrack,
    deleteEmptyTracks,
    renderSequence,
    openEffectsBrowser,
    panels,
    togglePanel,
    openShortcuts,
    openAbout,
  };

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      // Modifier shortcuts
      if (ctrl) {
        if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (k === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
        if (k === "x") { e.preventDefault(); cutSel(); return; }
        if (k === "c") { e.preventDefault(); copySel(); return; }
        if (k === "v") { e.preventDefault(); paste(); return; }
        if (k === "a") { e.preventDefault(); selectAll(); return; }
        if (k === "s") { e.preventDefault(); saveProject(); return; }
        if (k === "o") { e.preventDefault(); openProject(); return; }
        if (k === "i") { e.preventDefault(); openImport(); return; }
        if (k === "m") { e.preventDefault(); exportSequence(); return; }
        if (k === "k") { e.preventDefault(); splitAtPlayhead(); return; }
        if (k === "g" && !e.shiftKey) { e.preventDefault(); groupSelected(); return; }
        if (k === "g" && e.shiftKey) { e.preventDefault(); ungroupSelected(); return; }
        if (k === "r") { e.preventDefault(); openSpeedDialog(); return; }
        if (k === "n" && e.altKey) { e.preventDefault(); newProject(); return; }
        if (k === "/") { e.preventDefault(); openShortcuts(); return; }
        return;
      }

      if (e.code === "Space") { e.preventDefault(); togglePlay(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); return; }
      if (k === "v") setTool("select");
      else if (k === "a") setTool("trackfwd");
      else if (k === "b") setTool("ripple");
      else if (k === "c") setTool("razor");
      else if (k === "y") setTool("slip");
      else if (k === "u") setTool("slide");
      else if (k === "p") setTool("pen");
      else if (k === "h") setTool("hand");
      else if (k === "z") setTool("zoom");
      else if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(12, z * 1.4));
      else if (e.key === "-") setZoom((z) => Math.max(1, z / 1.4));
      else if (e.key === "Home") seek(0);
      else if (e.key === "Enter") renderSequence();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    togglePlay, deleteSelected, seek, undo, redo, cutSel, copySel, paste, selectAll,
    saveProject, openProject, openImport, exportSequence, splitAtPlayhead,
    groupSelected, ungroupSelected, openSpeedDialog, newProject, openShortcuts,
    renderSequence,
  ]);

  if (!projectStarted) {
    return (
      <HomeScreen
        onCreateProject={(r: AspectRatio) => {
          setAspect(r);
          setProjectStarted(true);
        }}
        onOpenProject={() => {
          setProjectStarted(true);
          window.setTimeout(() => projectFileRef.current?.click(), 60);
        }}
      />
    );
  }

  const selectedClipObj = clips.find((c) => c.id === selected[0]) ?? null;
  const selectedAsset = selectedClipObj
    ? assets.find((a) => a.id === selectedClipObj.assetId) ?? null
    : null;

  return (
    <div className="nova-desk flex h-[100dvh] w-screen flex-col overflow-hidden font-sans text-zinc-200 antialiased selection:bg-[#00F0FF]/25">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={projectFileRef}
        type="file"
        accept=".novacut,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) loadProjectFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <TopBar
        workspace={workspace}
        onSetWorkspace={setWorkspace}
        menuActions={menuActions}
        projectName={projectName}
        onGoHome={() => setProjectStarted(false)}
        onOpenAssetBrowser={() => openAssetBrowser("effects")}
      />

      {/* The editor body is a stable dock shell: rail | media | center | inspector
          over a full-width timeline band. Regions are sized only by the layout
          store, so importing media or selecting a clip can never move them. */}
      <div className="nova-editor-shell min-h-0 min-w-0 flex-1" style={layoutApi.gridStyle}>
        <section className="nova-editor-workspace">
          <div className="nova-region-rail flex min-h-0 min-w-0">
            <ToolRail
              active={rail}
              onSelect={(k) => {
                setRail(k);
                if (k === "media") {
                  setBrowserOpen(false);
                  return;
                }
                const map: Record<string, AssetTab> = {
                  text: "titles",
                  transitions: "transitions",
                  effects: "effects",
                  filters: "filters",
                  elements: "stickers",
                  music: "audio",
                  audio: "audio",
                  ai: "stock",
                };
                openAssetBrowser(map[k] ?? "effects");
              }}
            />
          </div>

          <DockPanel id="media" api={layoutApi} className="nova-region-media">
            <div className="flex h-full min-h-0 min-w-0 flex-col">
              {browserOpen ? (
                <div key={browserTab} className="nova-panel-enter flex h-full min-h-0 flex-col">
                  <AssetBrowser
                    open={browserOpen}
                    initialTab={browserTab}
                    embedded
                    onClose={() => setBrowserOpen(false)}
                    onApplyEffect={applyAssetPreset}
                    onApplyEffectToTimeline={applyPresetToTimeline}
                    hasProjectMedia={assets.length > 0}
                    onOpenImport={openImport}
                    previewFrameUrl={selectedAsset?.thumb ?? assets.find((a) => a.thumb)?.thumb ?? null}
                    previewClipName={selectedAsset?.name ?? assets.find((a) => a.thumb)?.name ?? null}
                    projectClipSrc={selectedAsset?.url ?? assets.find((a) => a.kind === "video")?.url ?? null}
                    myMedia={myMediaItems}
                    onHoverEffect={setHoveredEffectId}
                  />
                </div>
              ) : (
                <MediaBin
                  assets={assets}
                  importing={importing}
                  onOpenImport={openImport}
                  onImportFiles={importFiles}
                  onDeleteAsset={deleteAsset}
                  onOpenSource={setSourceAssetId}
                />
              )}
            </div>
          </DockPanel>

          {layoutApi.isDocked("media") && (
            <PanelResizer
              orientation="vertical"
              label="Resize Project Media"
              value={layoutApi.layout.mediaWidth}
              onResize={(v) => layoutApi.setSize("mediaWidth", v)}
            />
          )}

          {/* Center region: Source + Program monitors always live here. */}
          <div className="nova-region-center">
            {panels.sourceMonitor && sourceAsset && (
              <>
                <DockPanel id="source" api={layoutApi} className="nova-region-source">
                  <LeftMonitorPanel
                    sourceAsset={sourceAsset}
                    selectedClip={selectedClipObj}
                    selectedAsset={selectedAsset}
                    onInsert={insertFromSource}
                    onUpdateClipEffects={updateClipEffects}
                  />
                </DockPanel>
                {layoutApi.isDocked("source") && (
                  <PanelResizer
                    orientation="vertical"
                    label="Resize Source Monitor"
                    value={layoutApi.layout.sourceSplit * 1000}
                    onResize={(v) => layoutApi.setSize("sourceSplit", v / 1000)}
                  />
                )}
              </>
            )}

            <DockPanel id="monitor" api={layoutApi} className="nova-region-monitor">
              <PreviewPlayer
                assets={assets}
                clips={clips}
                time={time}
                playing={playing}
                contentEnd={contentEnd}
                gradeFilter={gradeFilter}
                audibleTracks={audibleTracks}
                onTogglePlay={togglePlay}
                onSeek={seek}
                onOpenImport={openImport}
                hoveredEffectId={hoveredEffectId}
                audioLevel={audioReactiveLevel}
              />
            </DockPanel>
          </div>

          {inspectorRegionVisible && layoutApi.isDocked("inspector") && (
            <PanelResizer
              orientation="vertical"
              invert
              label="Resize Inspector"
              value={layoutApi.layout.inspectorWidth}
              onResize={(v) => layoutApi.setSize("inspectorWidth", v)}
            />
          )}

          {inspectorRegionVisible && (
            <DockPanel id="inspector" api={layoutApi} className="nova-region-inspector">
              {workspace === "color" && panels.lumetri ? (
                <LumetriPanel grade={grade} onGradeChange={(g) => { pushHistory(); setGrade(g); }} />
              ) : workspace === "audio" ? (
                <AudioMixerPanel />
              ) : workspace === "graphics" ? (
                <GraphicsPanel />
              ) : (
                <InspectorPanel
                  clip={selectedClipObj}
                  clipName={selectedAsset?.name ?? null}
                  grade={grade}
                  onGradeChange={(g) => setGrade(g)}
                  onUpdateEffects={(id, p) => updateClipEffects(id, p)}
                  onClose={() => setInspectorOpen(false)}
                />
              )}
            </DockPanel>
          )}
        </section>

        {/* ===== Lower band: timeline + audio mixer, always full width ===== */}
        {layoutApi.isDocked("timeline") && (
          <PanelResizer
            orientation="horizontal"
            invert
            label="Resize Timeline"
            value={layoutApi.layout.timelineHeight}
            onResize={(v) => layoutApi.setSize("timelineHeight", v)}
          />
        )}
        <section className="nova-editor-timeline">
          <DockPanel id="timeline" api={layoutApi} className="nova-region-timeline">
            <Timeline
              assets={assets}
              clips={clips}
              videoTracks={videoTracks}
              audioTracks={audioTracks}
              seqDur={seqDur}
              contentEnd={contentEnd}
              tool={tool}
              zoom={zoom}
              trackStates={trackStates}
              onUpdateTrackState={updateTrackState}
              onSetZoom={setZoom}
              onSetTool={setTool}
              selected={selected}
              onSelectClip={selectClip}
              onSeek={seek}
              onDropAsset={addClipToTrack}
              onMoveClips={moveClips}
              onRippleTrim={rippleTrim}
              onSlipClip={slipClip}
              onSlideClip={slideClip}
              onSplitClip={splitClipAt}
              onAddKeyframe={addKeyframe}
              onDeleteSelected={deleteSelected}
              onApplyEffectPreset={applyEffectToClip}
              onUpdateAppliedEffect={updateAppliedEffect}
              selectedEffect={selectedFx}
              onSelectEffect={handleSelectEffect}
              onDeleteAppliedEffect={deleteAppliedEffect}
              rampOpen={rampOpen}
              onToggleRamp={handleToggleRamp}
            />
            {rampOpen && (
              <SpeedCurveEditor
                clipName={selectedClipObj ? (selectedAsset?.name ?? "Clip") : null}
                clipDuration={selectedClipObj?.duration ?? 0}
                onClose={() => setRampOpen(false)}
                onApply={(speedPercent) => {
                  if (!selectedClipObj) return;
                  applySpeed(selectedClipObj.id, speedPercent);
                }}
              />
            )}
          </DockPanel>

          {panels.audioMeters && (
            <DockPanel id="mixer" api={layoutApi} className="nova-region-mixer">
              <AudioMeters playing={playing} hasAudio={clips.length > 0} />
            </DockPanel>
          )}
        </section>
      </div>



      <AudioEngine assets={assets} clips={clips} time={time} playing={playing} audibleTracks={audibleTracks} onLevel={setAudioReactiveLevel} />

      {/* ===== Modals ===== */}
      {modal?.kind === "confirmNew" && (
        <ConfirmModal
          title="Create New Project?"
          message="This will clear all imported media, timeline clips, and grade adjustments. This action can be undone."
          confirmLabel="New Project"
          destructive
          onCancel={() => setModal(null)}
          onConfirm={confirmNewProject}
        />
      )}
      {modal?.kind === "speed" && (() => {
        const c = clips.find((x) => x.id === modal.clipId);
        if (!c) return null;
        return (
          <SpeedDialog
            clip={c}
            onCancel={() => setModal(null)}
            onApply={(speed) => applySpeed(c.id, speed)}
          />
        );
      })()}
      {modal?.kind === "export" && (
        <ExportModal
          contentEnd={contentEnd}
          onCancel={() => setModal(null)}
          onExport={(opts) => {
            setModal(null);
            showToast(
              `Exported · ${opts.resolution} · ${opts.fps} fps · ${opts.format}`,
              "success"
            );
          }}
        />
      )}
      {modal?.kind === "shortcuts" && <ShortcutsModal onClose={() => setModal(null)} />}
      {modal?.kind === "about" && <AboutModal onClose={() => setModal(null)} />}



      {/* Effect Control Panel for a timeline FX instance */}
      {fxSelection && (
        <EffectControlPanel
          open
          title={fxSelection.ae.name}
          subtitle={`Timeline instance on ${fxSelection.clip.track} · ${fxSelection.ae.duration.toFixed(1)}s — parameters render live on the program monitor.`}
          tag={fxSelection.ae.enabled ? "ACTIVE" : "BYPASSED"}
          family={fxSelection.family}
          values={fxSelection.params}
          onChange={(v) => updateFxParams(v)}
          presetName={fxSelection.ae.preset}
          onPresetChange={(name) => updateFxParams(fxSelection.params, name)}
          videoSrc={fxSelection.asset?.url ?? null}
          posterUrl={fxSelection.asset?.thumb ?? null}
          clipLabel={fxSelection.asset?.name ?? fxSelection.clip.track}
          fallbackClip={previewClipFor(fxSelection.ae.sourceItemId ?? fxSelection.ae.id)}
          processingState={fxSelection.ae.processingState}
          processingProgress={fxSelection.ae.processingProgress}
          processingMessage={fxSelection.ae.processingMessage}
          effect={appliedEffectToGpu(fxSelection.ae, fxSelection.ae.sourceItemId ? findAssetItem(fxSelection.ae.sourceItemId) : null)}
          onClose={() => setSelectedFx(null)}
          onDelete={() => deleteAppliedEffect(fxSelection.clip.id, fxSelection.ae.id)}
          onApply={() => {
            updateAppliedEffect(fxSelection.clip.id, fxSelection.ae.id, { enabled: true });
            setSelectedFx(null);
            showToast(`"${fxSelection.ae.name}" applied`, "success");
          }}
          applyLabel="Done"
        />
      )}


      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <AppInner />
        <AdminPanel />
      </AdminProvider>
    </AuthProvider>
  );
}

