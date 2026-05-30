/**
 * MIDI Track Analyzer
 *
 * Computes per-track features and multi-role confidence scores for
 * competitive role allocation (see RoleAllocator).
 */

import type { RoleConfidenceMap, TrackAnalysis, TrackRole } from '../../types';
import { gmProgramLabel } from './gmPrograms';

export interface MIDINote {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
}

export interface MIDITrack {
  channel: number;
  notes: MIDINote[];
  name?: string;
  program?: number;
  instrumentName?: string;
}

const DRUM_NAME_RE = /\b(drum|drums|kit|perc|percussion|snare|kick|hihat|hi-hat|cymbal)\b/i;
const BASS_NAME_RE = /\b(bass|sub|808)\b/i;
const LEAD_NAME_RE = /\b(vocals?|voice|vox|lead|melody|main|solo)\b/i;
const PAD_NAME_RE = /\b(pad|string|strings|choir|ambient)\b/i;
const HARMONY_NAME_RE = /\b(harm|harmony|chord|backing|rhythm|guitar|piano|keys)\b/i;
const NON_DRUM_NAME_RE = /\b(guitar|vocal|voice|vox|piano|keys|strings|violin|cello|flute|sax|bass|lead|melody|synth|organ)\b/i;
/** Pattern-only drum routing needs at least this confidence (see RoleAllocator) */
const PATTERN_DRUM_MIN = 0.8;

export class TrackAnalyzer {
  analyzeTrack(track: MIDITrack, trackIndex: number): TrackAnalysis {
    const notes = track.notes;

    if (notes.length === 0) {
      return this.createEmptyAnalysis(trackIndex, track.channel, track.name);
    }

    const sorted = [...notes].sort((a, b) => a.time - b.time);
    const noteRange = this.calculateNoteRange(sorted);
    const medianPitch = this.calculateMedianPitch(sorted);
    const noteDensity = this.calculateNoteDensity(sorted);
    const avgVelocity = this.calculateAverageVelocity(sorted);
    const avgDuration = this.calculateAverageDuration(sorted);
    const complexity = this.calculateComplexity(sorted);
    const hasChords = this.detectChords(sorted);
    const polyphonyRatio = this.calculatePolyphonyRatio(sorted);
    const isMonophonic = polyphonyRatio < 0.15;
    const hasPhraseContinuity = this.detectPhraseContinuity(sorted);
    const repetitionScore = this.calculateRepetitionScore(sorted);
    const isPercussive = avgDuration < 0.15;

    const drumConfidence = this.calculateDrumConfidence(track, sorted, noteRange, avgDuration);
    const roleConfidence = this.calculateRoleScores(
      track,
      sorted,
      noteRange,
      medianPitch,
      noteDensity,
      hasChords,
      avgDuration,
      polyphonyRatio,
      isMonophonic,
      hasPhraseContinuity,
      repetitionScore,
      drumConfidence
    );

    const role = this.pickBestRole(roleConfidence);
    const bestRoleConfidence = roleConfidence[role] ?? 0;
    const isDrums = drumConfidence >= 0.6 && (track.channel === 9 || drumConfidence >= 0.75);

    const priority = this.calculatePriority(role, noteDensity, avgVelocity, notes.length, bestRoleConfidence);

    const instrumentLabel =
      track.instrumentName ??
      (track.program !== undefined ? gmProgramLabel(track.program, track.channel) : undefined);

    return {
      trackIndex,
      channel: track.channel,
      trackName: track.name,
      instrumentLabel,
      program: track.channel === 9 ? undefined : track.program,
      isDrums,
      isPercussive,
      noteRange,
      medianPitch,
      noteDensity,
      complexity,
      hasChords,
      polyphonyRatio,
      isMonophonic,
      hasPhraseContinuity,
      repetitionScore,
      avgVelocity,
      avgDuration,
      noteCount: notes.length,
      role,
      roleConfidence,
      bestRoleConfidence,
      drumConfidence,
      priority,
      muted: false,
      isPrimaryLead: false,
    };
  }

  analyzeTracks(tracks: MIDITrack[]): TrackAnalysis[] {
    return tracks.map((track, index) => this.analyzeTrack(track, index));
  }

  private createEmptyAnalysis(trackIndex: number, channel: number, trackName?: string): TrackAnalysis {
    const roleConfidence: RoleConfidenceMap = { fx: 0 };
    return {
      trackIndex,
      channel,
      trackName,
      isDrums: false,
      isPercussive: false,
      noteRange: { min: 0, max: 0, avg: 0 },
      medianPitch: 0,
      noteDensity: 0,
      complexity: 0,
      hasChords: false,
      polyphonyRatio: 0,
      isMonophonic: true,
      hasPhraseContinuity: false,
      repetitionScore: 0,
      avgVelocity: 0,
      avgDuration: 0,
      noteCount: 0,
      role: 'fx',
      roleConfidence,
      bestRoleConfidence: 0,
      drumConfidence: 0,
      priority: 0,
      muted: true,
      isPrimaryLead: false,
    };
  }

  private calculateNoteRange(notes: MIDINote[]): { min: number; max: number; avg: number } {
    let min = 127;
    let max = 0;
    let sum = 0;
    for (const note of notes) {
      min = Math.min(min, note.midi);
      max = Math.max(max, note.midi);
      sum += note.midi;
    }
    return { min, max, avg: sum / notes.length };
  }

  private calculateMedianPitch(notes: MIDINote[]): number {
    const pitches = notes.map(n => n.midi).sort((a, b) => a - b);
    const mid = Math.floor(pitches.length / 2);
    return pitches.length % 2 === 0
      ? (pitches[mid - 1] + pitches[mid]) / 2
      : pitches[mid];
  }

  private calculateNoteDensity(notes: MIDINote[]): number {
    if (notes.length < 2) return 0;
    const startTime = notes[0].time;
    const endTime = notes[notes.length - 1].time + notes[notes.length - 1].duration;
    const duration = endTime - startTime;
    return duration <= 0 ? 0 : notes.length / duration;
  }

  private calculateAverageVelocity(notes: MIDINote[]): number {
    return notes.reduce((acc, n) => acc + n.velocity, 0) / notes.length;
  }

  private calculateAverageDuration(notes: MIDINote[]): number {
    return notes.reduce((acc, n) => acc + n.duration, 0) / notes.length;
  }

  private calculateComplexity(notes: MIDINote[]): number {
    if (notes.length < 2) return 0;
    const range = this.calculateNoteRange(notes);
    const pitchVariation = Math.min(1, (range.max - range.min) / 36);
    const timeDiffs: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      timeDiffs.push(notes[i].time - notes[i - 1].time);
    }
    if (timeDiffs.length === 0) return pitchVariation * 0.5;
    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const timeVariance =
      timeDiffs.reduce((acc, t) => acc + Math.pow(t - avgTimeDiff, 2), 0) / timeDiffs.length;
    const rhythmVariation = Math.min(1, Math.sqrt(timeVariance) / Math.max(avgTimeDiff, 0.001));
    return pitchVariation * 0.6 + rhythmVariation * 0.4;
  }

  private detectChords(notes: MIDINote[]): boolean {
    const tolerance = 0.02;
    const timeSlots = new Map<number, number>();
    for (const note of notes) {
      const slot = Math.floor(note.time / tolerance);
      timeSlots.set(slot, (timeSlots.get(slot) || 0) + 1);
    }
    let chordSlots = 0;
    for (const count of timeSlots.values()) {
      if (count >= 2) chordSlots++;
    }
    return chordSlots > timeSlots.size * 0.1;
  }

  private calculatePolyphonyRatio(notes: MIDINote[]): number {
    if (notes.length < 2) return 0;
    const tolerance = 0.02;
    let overlapCount = 0;
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        if (Math.abs(notes[i].time - notes[j].time) < tolerance) {
          overlapCount++;
        }
      }
    }
    const maxPairs = (notes.length * (notes.length - 1)) / 2;
    return maxPairs > 0 ? overlapCount / maxPairs : 0;
  }

  private detectPhraseContinuity(notes: MIDINote[]): boolean {
    if (notes.length < 4) return false;
    let legatoGaps = 0;
    for (let i = 1; i < notes.length; i++) {
      const gap = notes[i].time - (notes[i - 1].time + notes[i - 1].duration);
      if (gap >= -0.05 && gap < 0.15) legatoGaps++;
    }
    return legatoGaps / (notes.length - 1) > 0.4;
  }

  private calculateRepetitionScore(notes: MIDINote[]): number {
    const pitchCounts = new Map<number, number>();
    for (const note of notes) {
      pitchCounts.set(note.midi, (pitchCounts.get(note.midi) || 0) + 1);
    }
    const maxCount = Math.max(...pitchCounts.values());
    return Math.min(1, maxCount / notes.length);
  }

  /**
   * Stricter drum likelihood — avoids staccato guitar false positives.
   */
  private calculateDrumConfidence(
    track: MIDITrack,
    notes: MIDINote[],
    range: { min: number; max: number; avg: number },
    avgDuration: number
  ): number {
    if (track.channel === 9) return 1;

    const name = track.name?.toLowerCase() ?? '';
    if (DRUM_NAME_RE.test(name)) return 0.85;

    if (notes.length < 8) return 0;

    let score = 0;
    const inGmDrumRange = notes.filter(n => n.midi >= 35 && n.midi <= 81).length / notes.length;
    if (inGmDrumRange > 0.85) score += 0.35;
    if (avgDuration < 0.12) score += 0.25;
    if (range.min >= 35 && range.max <= 81 && range.max - range.min < 24) score += 0.2;

    const pitchCounts = new Map<number, number>();
    for (const note of notes) {
      pitchCounts.set(note.midi, (pitchCounts.get(note.midi) || 0) + 1);
    }
    const unique = pitchCounts.size;
    if (unique <= 12 && notes.length > 24) score += 0.15;

    const kickSnareHat = [36, 38, 40, 42, 44, 46].filter(p => pitchCounts.has(p)).length;
    const hasKickOrSnare = pitchCounts.has(36) || pitchCounts.has(38);
    if (kickSnareHat >= 2 && hasKickOrSnare) score += 0.2;

    if (track.channel !== 9) {
      if (!hasKickOrSnare) score *= 0.4;
      if (NON_DRUM_NAME_RE.test(name)) score = Math.min(score, 0.25);
      if (score < PATTERN_DRUM_MIN) score = Math.min(score, 0.5);
    }

    return Math.min(1, score);
  }

  private calculateRoleScores(
    track: MIDITrack,
    notes: MIDINote[],
    range: { min: number; max: number; avg: number },
    medianPitch: number,
    density: number,
    hasChords: boolean,
    avgDuration: number,
    polyphonyRatio: number,
    isMonophonic: boolean,
    hasPhraseContinuity: boolean,
    repetitionScore: number,
    drumConfidence: number
  ): RoleConfidenceMap {
    const name = track.name ?? '';

    let drums = drumConfidence;
    if (DRUM_NAME_RE.test(name)) drums = Math.max(drums, 0.75);
    if (track.channel === 9) drums = 1;

    let bass = 0;
    if (BASS_NAME_RE.test(name)) bass += 0.5;
    if (medianPitch < 48) bass += 0.35;
    if (range.max < 55) bass += 0.25;
    if (isMonophonic && medianPitch < 52) bass += 0.15;
    bass = Math.min(1, bass);

    let lead = 0;
    if (LEAD_NAME_RE.test(name)) lead += 0.45;
    if (isMonophonic) lead += 0.3;
    if (hasPhraseContinuity) lead += 0.25;
    if (medianPitch >= 55 && medianPitch <= 84) lead += 0.15;
    if (range.max - range.min > 12) lead += 0.1;
    if (drumConfidence > 0.5) lead *= 0.3;
    lead = Math.min(1, lead);

    let harmony = 0;
    if (HARMONY_NAME_RE.test(name)) harmony += 0.35;
    if (hasChords) harmony += 0.45;
    if (polyphonyRatio > 0.2) harmony += 0.25;
    if (density > 1 && density < 6) harmony += 0.1;
    harmony = Math.min(1, harmony);

    let pad = 0;
    if (PAD_NAME_RE.test(name)) pad += 0.4;
    if (density < 1.5 && avgDuration > 0.5) pad += 0.4;
    if (hasChords && avgDuration > 0.35) pad += 0.2;
    pad = Math.min(1, pad);

    let fx = 0;
    if (density > 8) fx += 0.5;
    if (avgDuration < 0.08 && drumConfidence < 0.5) fx += 0.2;
    fx = Math.min(1, fx);

    return { drums, bass, lead, harmony, pad, fx };
  }

  private pickBestRole(scores: RoleConfidenceMap): TrackRole {
    const roles: TrackRole[] = ['drums', 'bass', 'lead', 'harmony', 'pad', 'fx'];
    let best: TrackRole = 'fx';
    let bestScore = -1;
    for (const role of roles) {
      const s = scores[role] ?? 0;
      if (s > bestScore) {
        bestScore = s;
        best = role;
      }
    }
    return best;
  }

  private calculatePriority(
    role: TrackRole,
    density: number,
    avgVelocity: number,
    noteCount: number,
    confidence: number
  ): number {
    let priority = 50 + confidence * 30;
    switch (role) {
      case 'drums':
        priority += 30;
        break;
      case 'bass':
        priority += 25;
        break;
      case 'lead':
        priority += 20;
        break;
      case 'harmony':
        priority += 15;
        break;
      case 'pad':
        priority += 10;
        break;
      case 'fx':
        priority += 5;
        break;
    }
    priority += Math.min(20, density * 2);
    priority += (avgVelocity / 127) * 10;
    priority += Math.min(10, Math.log10(noteCount + 1) * 3);
    return priority;
  }
}
