/**
 * Wario Synth v2 Type Definitions
 * 
 * Types specific to the Game Boy-authentic synthesis engine.
 */

import type { DutyIndex } from '../audio/synthesis/DutyCycle';
import type { LFSRMode } from '../audio/synthesis/LFSR';
import type { WavePreset, WaveVolume } from '../audio/synthesis/WaveTable';

/**
 * Channel identifiers for the 8-channel "Super Game Boy" setup
 */
export type PulseChannelId = 'p1' | 'p2' | 'p3' | 'p4';
export type WaveChannelId = 'w1' | 'w2';
export type NoiseChannelId = 'n1' | 'n2';
export type ChannelId = PulseChannelId | WaveChannelId | NoiseChannelId;

/**
 * A note scheduled to play on a specific channel
 */
export interface ChannelNote {
  channel: ChannelId;
  midiNote: number;
  startTime: number;      // In seconds from playback start
  duration: number;       // In seconds
  velocity: number;       // 0-127
  /** When set, noise channel uses shaped drum hits instead of raw LFSR note mapping */
  drumHit?: DrumHitType;
}

/**
 * Pulse channel configuration
 */
export interface PulseChannelConfig {
  id: PulseChannelId;
  hasSweep: boolean;
  defaultDuty: DutyIndex;
  role: 'lead' | 'fx' | 'harmony' | 'arp';
}

/**
 * Wave channel configuration
 */
export interface WaveChannelConfig {
  id: WaveChannelId;
  preset: WavePreset;
  role: 'bass' | 'texture';
}

/**
 * Noise channel configuration
 */
export interface NoiseChannelConfig {
  id: NoiseChannelId;
  mode: LFSRMode;
  role: 'percussion' | 'hihats';
}

/**
 * Track role for MIDI analysis
 */
export type TrackRole = 'drums' | 'bass' | 'lead' | 'harmony' | 'pad' | 'fx';

export type DrumHitType = 'kick' | 'snare' | 'hihat' | 'noise';

/**
 * Per-role confidence scores (0-1) from TrackAnalyzer
 */
export type RoleConfidenceMap = Partial<Record<TrackRole, number>>;

/**
 * Analysis result for a single MIDI track
 */
export interface TrackAnalysis {
  trackIndex: number;
  channel: number;                    // MIDI channel (0-15, 9 = drums)
  trackName?: string;
  /** GM or MIDI meta instrument label when available */
  instrumentLabel?: string;
  isDrums: boolean;
  isPercussive: boolean;
  noteRange: {
    min: number;
    max: number;
    avg: number;
  };
  medianPitch: number;
  noteDensity: number;                // Notes per second
  complexity: number;                 // 0-1 score
  hasChords: boolean;
  polyphonyRatio: number;             // 0-1 simultaneous overlap
  isMonophonic: boolean;
  hasPhraseContinuity: boolean;
  repetitionScore: number;            // 0-1
  avgVelocity: number;
  avgDuration: number;
  noteCount: number;
  role: TrackRole;
  roleConfidence: RoleConfidenceMap;
  bestRoleConfidence: number;
  drumConfidence: number;             // 0-1 likelihood this is percussion
  priority: number;                   // Higher = more important
  muted: boolean;
  isPrimaryLead: boolean;
}

/**
 * User overrides for track assignment (export UI / API)
 */
export interface TrackOverride {
  trackIndex: number;
  role?: TrackRole;
  channelId?: ChannelId;
  muted?: boolean;
  isPrimaryLead?: boolean;
}

/**
 * Full analysis payload for UI review
 */
export interface MIDIAnalysisResult {
  duration: number;
  /** Raw track count from the MIDI file */
  trackCount: number;
  /** Logical parts after per-channel split (what the assignment table uses) */
  partCount: number;
  noteCount: number;
  bpm: number;
  analyses: TrackAnalysis[];
  assignments: ChannelAssignment[];
  needsReview: boolean;
}

/**
 * Assignment of a MIDI track to a GB channel
 */
export interface ChannelAssignment {
  trackIndex: number;
  channelId: ChannelId;
  shouldArpeggiate: boolean;
  dutyCycle?: DutyIndex;              // For pulse channels
  wavePreset?: WavePreset;            // For wave channels
  noiseMode?: LFSRMode;               // For noise channels
}

/**
 * Note format for arpeggiator processing
 */
export interface ArpNote {
  midiNote: number;
  time: number;
  duration: number;
  velocity: number;
}

/**
 * Grouped chord for arpeggiator
 */
export interface ArpChord {
  startTime: number;
  notes: ArpNote[];
}

/**
 * v2 Engine configuration
 */
export interface V2Config {
  masterVolume: number;               // 0-1
  lookaheadTime: number;              // Scheduling lookahead in seconds
  scheduleInterval: number;           // Scheduler interval in ms
  enforceChannelMonophony: boolean;   // true = one active note per channel
  monophonyStrategy: 'steal' | 'skip'; // steal = cut old note, skip = drop new note
}

/**
 * Default configuration values
 */
export const DEFAULT_V2_CONFIG: V2Config = {
  masterVolume: 0.7,
  lookaheadTime: 0.1,
  scheduleInterval: 25,
  enforceChannelMonophony: false,
  monophonyStrategy: 'steal',
};

/**
 * Channel state for APU
 */
export interface ChannelState {
  id: ChannelId;
  isBusy: boolean;
  busyUntil: number;                  // AudioContext time when channel becomes free
  currentGain: number;
}

/**
 * Playback result info
 */
export interface PlaybackInfo {
  duration: number;
  assignments: ChannelAssignment[];
  noteCount: number;
}
