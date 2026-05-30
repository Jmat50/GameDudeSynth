import type { MIDINote } from '../midi/TrackAnalyzer';
import type { PreviewNote } from '../../types';

export interface PreviewWindowResult {
  windowStart: number;
  notes: PreviewNote[];
  duration: number;
}

/**
 * Cap note count for a preview window based on duration.
 */
export function previewNoteCap(durationSec: number): number {
  return Math.min(320, Math.max(80, Math.round(32 * durationSec)));
}

/**
 * Floor so UI never feels instant-empty; cap so dense clips don't freeze the page.
 */
export function estimatePreviewPrepareMs(noteCount: number): number {
  return Math.min(800, Math.max(80, Math.round(noteCount * 0.8)));
}

/**
 * Slide a window of maxDurationSec across notes and pick the densest segment.
 */
export function pickPreviewWindow(
  notes: MIDINote[],
  maxDurationSec: number
): PreviewWindowResult {
  if (notes.length === 0) {
    return { windowStart: 0, notes: [], duration: maxDurationSec };
  }

  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const lastEnd = sorted.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0
  );
  const span = Math.max(lastEnd, maxDurationSec);

  let bestStart = 0;
  let bestCount = -1;

  if (span <= maxDurationSec) {
    bestStart = 0;
    bestCount = sorted.length;
  } else {
    const step = Math.max(0.25, maxDurationSec / 8);
    for (let start = 0; start <= span - maxDurationSec; start += step) {
      const end = start + maxDurationSec;
      let count = 0;
      for (const n of sorted) {
        if (n.time >= start && n.time < end) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestStart = start;
      }
    }
  }

  const windowEnd = bestStart + maxDurationSec;
  let windowNotes: PreviewNote[] = sorted
    .filter(n => n.time >= bestStart && n.time < windowEnd)
    .map(n => ({
      midiNote: n.midi,
      startTime: n.time - bestStart,
      duration: Math.min(n.duration, windowEnd - n.time),
      velocity: n.velocity,
    }));

  const cap = previewNoteCap(maxDurationSec);
  if (windowNotes.length > cap) {
    windowNotes = thinNotesToCap(windowNotes, cap);
  }

  const actualEnd = windowNotes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration),
    0
  );
  const duration = Math.min(maxDurationSec, Math.max(actualEnd, 0.1));

  return {
    windowStart: bestStart,
    notes: windowNotes,
    duration,
  };
}

function thinNotesToCap(notes: PreviewNote[], cap: number): PreviewNote[] {
  const byStart = new Map<number, PreviewNote[]>();
  for (const n of notes) {
    const key = Math.round(n.startTime * 1000);
    const bucket = byStart.get(key) ?? [];
    bucket.push(n);
    byStart.set(key, bucket);
  }

  const kept: PreviewNote[] = [];
  for (const bucket of byStart.values()) {
    bucket.sort((a, b) => b.velocity - a.velocity);
    kept.push(bucket[0]);
  }

  kept.sort((a, b) => a.startTime - b.startTime);
  if (kept.length <= cap) return kept;

  const stride = kept.length / cap;
  const out: PreviewNote[] = [];
  for (let i = 0; i < cap; i++) {
    out.push(kept[Math.floor(i * stride)]);
  }
  return out;
}
