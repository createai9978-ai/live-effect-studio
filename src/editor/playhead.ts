/**
 * Playhead clock store.
 *
 * The transport runs at display refresh rate. Pushing that through React state
 * would re-render the whole editor 60×/s, so the authoritative value lives in
 * this tiny external store: high-frequency consumers (the timeline needle, the
 * running timecode) subscribe directly and write to the DOM, while React state
 * is only committed at a coarse rate for logic that genuinely needs it
 * (source-video drift correction, effect windows).
 */

import { useEffect, useRef, useState } from "react";

type Listener = (t: number) => void;

let current = 0;
const listeners = new Set<Listener>();

export const playhead = {
  get: () => current,
  set(t: number) {
    if (t === current) return;
    current = t;
    for (const fn of listeners) fn(t);
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(current);
    return () => {
      listeners.delete(fn);
    };
  },
};

/**
 * Subscribe an imperative callback to the clock. The callback runs outside of
 * React rendering, so it must only touch refs/DOM — never setState per frame.
 */
export function usePlayheadEffect(fn: (t: number) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => playhead.subscribe((t) => ref.current(t)), []);
}

/**
 * React-state view of the clock, throttled to `hz` so text nodes update at a
 * readable rate instead of every frame.
 */
export function usePlayheadValue(hz = 20) {
  const [t, setT] = useState(playhead.get());
  const last = useRef(0);
  useEffect(() => {
    const interval = 1000 / hz;
    return playhead.subscribe((next) => {
      const now = performance.now();
      if (now - last.current < interval) return;
      last.current = now;
      setT(next);
    });
  }, [hz]);
  return t;
}

/**
 * Coalesce a high-frequency handler (pointermove, wheel drag, slider input) to
 * at most one call per animation frame, always with the newest arguments.
 */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void) {
  let frame: number | null = null;
  let latest: A | null = null;
  const run = () => {
    frame = null;
    if (latest) fn(...latest);
    latest = null;
  };
  const throttled = (...args: A) => {
    latest = args;
    if (frame === null) frame = requestAnimationFrame(run);
  };
  throttled.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    latest = null;
  };
  /** Run any pending call immediately (used on pointerup so the last move lands). */
  throttled.flush = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (latest) fn(...latest);
    latest = null;
  };
  return throttled;
}
