import type { DrumHitType } from '../../types';

/**
 * Map GM drum MIDI notes to shaped noise hits (kick/snare/hihat).
 */
export function midiNoteToDrumHit(midiNote: number): DrumHitType {
  if (midiNote >= 42 && midiNote <= 46) return 'hihat';
  if (midiNote >= 81) return 'hihat';
  if (midiNote === 38 || midiNote === 40) return 'snare';
  if (midiNote < 42) return 'kick';
  if (midiNote < 55) return 'snare';
  return 'noise';
}
