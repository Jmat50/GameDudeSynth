/**
 * Unit checks for preview window selection and prepare-time estimate.
 */
import {
  pickPreviewWindow,
  estimatePreviewPrepareMs,
  previewNoteCap,
} from '../src-v2/audio/preview/previewWindow';
import type { MIDINote } from '../src-v2/audio/midi/TrackAnalyzer';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function makeNotes(
  specs: Array<{ time: number; midi?: number; vel?: number }>
): MIDINote[] {
  return specs.map((s, i) => ({
    midi: s.midi ?? 60 + (i % 12),
    time: s.time,
    duration: 0.2,
    velocity: s.vel ?? 90,
  }));
}

function testEmpty(): void {
  const r = pickPreviewWindow([], 10);
  assert(r.notes.length === 0, 'empty input → no notes');
  assert(r.duration === 10, 'empty keeps requested duration');
}

function testDenseWindow10s(): void {
  const notes: MIDINote[] = [];
  for (let t = 5; t < 14; t += 0.1) {
    notes.push({ midi: 64, time: t, duration: 0.15, velocity: 100 });
  }
  for (let t = 0; t < 2; t += 0.5) {
    notes.push({ midi: 48, time: t, duration: 0.2, velocity: 80 });
  }
  const r = pickPreviewWindow(notes, 10);
  assert(r.windowStart >= 3.5 && r.windowStart <= 6, 'picks dense mid-file region, not leading sparse bars');
  assert(r.notes.length > 0 && r.notes[0].startTime >= 0, 'notes are clip-relative');
  assert(r.notes.length > 50, 'dense region yields many notes');
  assert(r.notes.length <= previewNoteCap(10), 'respects note cap');
  assert(r.duration <= 10.01, 'duration within window');
}

function testPrepareMs(): void {
  assert(estimatePreviewPrepareMs(0) >= 80, 'floor at 80ms');
  assert(estimatePreviewPrepareMs(2000) <= 800, 'cap at 800ms');
  const a = estimatePreviewPrepareMs(50);
  const b = estimatePreviewPrepareMs(100);
  assert(b >= a, 'monotonic with note count');
}

function testCapScaling(): void {
  assert(previewNoteCap(2.5) >= 80, 'short window min cap');
  assert(previewNoteCap(10) === 320, '10s hits max cap');
}

function run(): void {
  testEmpty();
  testDenseWindow10s();
  testPrepareMs();
  testCapScaling();
  console.log('preview-window: all checks passed');
}

run();
