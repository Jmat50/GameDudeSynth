/**
 * Channel Mapper — maps allocated track roles to Game Boy APU channels.
 */

import { TrackAnalyzer, type MIDITrack } from './TrackAnalyzer';
import { RoleAllocator } from './RoleAllocator';
import type {
  ChannelAssignment,
  ChannelId,
  PulseChannelId,
  TrackAnalysis,
  TrackOverride,
  TrackRole,
} from '../../types';
import type { DutyIndex } from '../synthesis/DutyCycle';
import type { WavePreset } from '../synthesis/WaveTable';
import type { LFSRMode } from '../synthesis/LFSR';

export interface ChannelMapperConfig {
  maxTracks: number;
  allowChannelReuse: boolean;
  arpeggiateHarmony: boolean;
  leadDuty: DutyIndex;
  harmonyDuty: DutyIndex;
}

const DEFAULT_CONFIG: ChannelMapperConfig = {
  maxTracks: 64,
  allowChannelReuse: true,
  arpeggiateHarmony: true,
  leadDuty: 2,
  harmonyDuty: 1,
};

const CHANNEL_POOLS = {
  pulse: ['p1', 'p2', 'p3', 'p4'] as PulseChannelId[],
  wave: ['w1', 'w2'] as const,
  noise: ['n1', 'n2'] as const,
};

const NOISE_CHANNELS: ChannelId[] = ['n1', 'n2'];

export class ChannelMapper {
  private analyzer: TrackAnalyzer;
  private allocator: RoleAllocator;
  private config: ChannelMapperConfig;

  constructor(config: Partial<ChannelMapperConfig> = {}) {
    this.analyzer = new TrackAnalyzer();
    this.allocator = new RoleAllocator();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<ChannelMapperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Full pipeline: analyze → allocate roles → map to GB channels.
   */
  mapTracks(tracks: MIDITrack[], overrides: TrackOverride[] = []): {
    assignments: ChannelAssignment[];
    analyses: TrackAnalysis[];
  } {
    const raw = this.analyzer.analyzeTracks(tracks);
    const analyses = this.allocator.allocate(raw, overrides);
    let assignments = this.mapFromAnalyses(analyses);
    assignments = this.applyChannelOverrides(assignments, overrides, analyses);
    return { assignments, analyses };
  }

  /**
   * Apply user channel overrides; add rows for manual channel picks not auto-mapped.
   */
  applyChannelOverrides(
    assignments: ChannelAssignment[],
    overrides: TrackOverride[],
    analyses: TrackAnalysis[]
  ): ChannelAssignment[] {
    let result = assignments.map(a => {
      const o = overrides.find(x => x.trackIndex === a.trackIndex);
      if (o?.channelId) {
        return { ...a, channelId: o.channelId };
      }
      return a;
    });

    if (overrides.length === 0) return result;

    for (const o of overrides) {
      if (!o.channelId || o.muted) continue;
      if (result.some(a => a.trackIndex === o.trackIndex)) continue;
      const analysis = analyses.find(a => a.trackIndex === o.trackIndex);
      if (!analysis || analysis.noteCount === 0) continue;
      result.push(this.assignmentFromOverride(analysis, o));
    }

    return result;
  }

  private assignmentFromOverride(
    analysis: TrackAnalysis,
    override: TrackOverride
  ): ChannelAssignment {
    const role = override.role ?? analysis.role;
    const channelId = override.channelId!;
    const isPulse = channelId.startsWith('p');
    const isWave = channelId.startsWith('w');
    const isNoise = channelId.startsWith('n');

    return {
      trackIndex: analysis.trackIndex,
      channelId,
      shouldArpeggiate: role === 'harmony' && analysis.hasChords,
      ...(isPulse ? { dutyCycle: role === 'lead' ? this.config.leadDuty : this.config.harmonyDuty } : {}),
      ...(isWave ? { wavePreset: role === 'bass' ? 'bass' : 'pad' } : {}),
      ...(isNoise ? { noiseMode: '7bit' as const } : {}),
    };
  }

  mapFromAnalyses(analyses: TrackAnalysis[]): ChannelAssignment[] {
    const usedChannels = new Set<ChannelId>();
    const assignments: ChannelAssignment[] = [];

    const sorted = [...analyses]
      .filter(a => !a.muted && a.noteCount > 0)
      .sort((a, b) => {
        if (a.isPrimaryLead) return -1;
        if (b.isPrimaryLead) return 1;
        return b.priority - a.priority;
      });

    for (const analysis of sorted) {
      if (assignments.length >= this.config.maxTracks) break;

      const assignment = this.assignChannel(analysis, usedChannels, assignments);
      if (assignment) {
        assignments.push(assignment);
        if (!this.config.allowChannelReuse) {
          usedChannels.add(assignment.channelId);
        } else {
          usedChannels.add(assignment.channelId);
        }
      }
    }

    return assignments;
  }

  private assignChannel(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    const { role, hasChords, isPrimaryLead } = analysis;

    if (role === 'drums' && analysis.isDrums) {
      return this.assignDrums(analysis, usedChannels, existingAssignments);
    }

    switch (role) {
      case 'bass':
        return this.assignBass(analysis, usedChannels, existingAssignments);
      case 'lead':
        return this.assignLead(analysis, usedChannels, existingAssignments, isPrimaryLead);
      case 'harmony':
        return this.assignHarmony(analysis, usedChannels, existingAssignments, hasChords);
      case 'pad':
        return this.assignPad(analysis, usedChannels, existingAssignments);
      case 'fx':
        return this.assignFX(analysis, usedChannels, existingAssignments);
      default:
        return this.assignToAnyPulse(analysis, usedChannels, existingAssignments);
    }
  }

  private assignDrums(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    if (!analysis.isDrums) return null;

    const channel = this.findFreeChannel([...CHANNEL_POOLS.noise], usedChannels);
    if (channel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: channel,
        shouldArpeggiate: false,
        noiseMode: channel === 'n2' ? '15bit' : '7bit',
      };
    }

    if (this.config.allowChannelReuse) {
      const reusable = this.findReusableChannel('drums', existingAssignments);
      if (reusable && NOISE_CHANNELS.includes(reusable)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId: reusable as 'n1' | 'n2',
          shouldArpeggiate: false,
          noiseMode: '7bit',
        };
      }
    }

    return null;
  }

  private assignBass(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    if (!usedChannels.has('w1')) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: 'w1',
        shouldArpeggiate: false,
        wavePreset: 'bass' as WavePreset,
      };
    }
    if (!usedChannels.has('w2')) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: 'w2',
        shouldArpeggiate: false,
        wavePreset: 'bass' as WavePreset,
      };
    }

    const pulseChannel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
    if (pulseChannel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: pulseChannel,
        shouldArpeggiate: false,
        dutyCycle: 2 as DutyIndex,
      };
    }

    const reusable = this.findReusableChannel('bass', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      const isWave = reusable.startsWith('w');
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable,
        shouldArpeggiate: false,
        ...(isWave ? { wavePreset: 'bass' as WavePreset } : { dutyCycle: 2 as DutyIndex }),
      };
    }

    return null;
  }

  private assignLead(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[],
    isPrimaryLead: boolean
  ): ChannelAssignment | null {
    if (isPrimaryLead && !usedChannels.has('p1')) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: 'p1',
        shouldArpeggiate: false,
        dutyCycle: this.config.leadDuty,
      };
    }

    for (const channelId of ['p1', 'p2'] as PulseChannelId[]) {
      if (!usedChannels.has(channelId)) {
        return {
          trackIndex: analysis.trackIndex,
          channelId,
          shouldArpeggiate: false,
          dutyCycle: this.config.leadDuty,
        };
      }
    }

    const channel = this.findFreeChannel(['p3', 'p4'] as PulseChannelId[], usedChannels);
    if (channel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: channel,
        shouldArpeggiate: false,
        dutyCycle: this.config.leadDuty,
      };
    }

    const reusable = this.findReusableChannel('lead', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable as PulseChannelId,
        shouldArpeggiate: false,
        dutyCycle: this.config.leadDuty,
      };
    }

    return null;
  }

  private assignHarmony(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[],
    hasChords: boolean
  ): ChannelAssignment | null {
    const channel = this.findFreeChannel(['p3', 'p4', 'p2', 'p1'] as PulseChannelId[], usedChannels);
    if (channel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: channel,
        shouldArpeggiate: this.config.arpeggiateHarmony && hasChords,
        dutyCycle: this.config.harmonyDuty,
      };
    }

    const reusable = this.findReusableChannel('harmony', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable as PulseChannelId,
        shouldArpeggiate: this.config.arpeggiateHarmony && hasChords,
        dutyCycle: this.config.harmonyDuty,
      };
    }

    return null;
  }

  private assignPad(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    if (!usedChannels.has('w2')) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: 'w2',
        shouldArpeggiate: false,
        wavePreset: 'pad' as WavePreset,
      };
    }
    if (!usedChannels.has('w1')) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: 'w1',
        shouldArpeggiate: false,
        wavePreset: 'pad' as WavePreset,
      };
    }

    const pulseChannel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
    if (pulseChannel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: pulseChannel,
        shouldArpeggiate: false,
        dutyCycle: 2 as DutyIndex,
      };
    }

    const reusable = this.findReusableChannel('pad', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      const isWave = reusable.startsWith('w');
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable,
        shouldArpeggiate: false,
        ...(isWave ? { wavePreset: 'pad' as WavePreset } : { dutyCycle: 2 as DutyIndex }),
      };
    }

    return null;
  }

  private assignFX(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    const channel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
    if (channel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: channel,
        shouldArpeggiate: false,
        dutyCycle: 0 as DutyIndex,
      };
    }

    const reusable = this.findReusableChannel('fx', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable as PulseChannelId,
        shouldArpeggiate: false,
        dutyCycle: 0 as DutyIndex,
      };
    }

    return null;
  }

  private assignToAnyPulse(
    analysis: TrackAnalysis,
    usedChannels: Set<ChannelId>,
    existingAssignments: ChannelAssignment[]
  ): ChannelAssignment | null {
    const channel = this.findFreeChannel(CHANNEL_POOLS.pulse, usedChannels);
    if (channel) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: channel,
        shouldArpeggiate: false,
        dutyCycle: 2 as DutyIndex,
      };
    }

    const reusable = this.findReusableChannel('harmony', existingAssignments);
    if (reusable && !NOISE_CHANNELS.includes(reusable)) {
      return {
        trackIndex: analysis.trackIndex,
        channelId: reusable as PulseChannelId,
        shouldArpeggiate: false,
        dutyCycle: 2 as DutyIndex,
      };
    }

    return null;
  }

  private findFreeChannel<T extends ChannelId>(pool: T[], usedChannels: Set<ChannelId>): T | null {
    for (const channel of pool) {
      if (!usedChannels.has(channel)) {
        return channel;
      }
    }
    return null;
  }

  private findReusableChannel(
    role: TrackRole,
    existingAssignments: ChannelAssignment[]
  ): ChannelId | null {
    if (!this.config.allowChannelReuse) return null;
    if (existingAssignments.length === 0) return null;

    const byPreference: Record<TrackRole, ChannelId[]> = {
      lead: ['p1', 'p2', 'p3', 'p4'],
      harmony: ['p3', 'p4', 'p2', 'p1'],
      bass: ['w1', 'w2', 'p3', 'p4'],
      pad: ['w2', 'w1', 'p3', 'p4'],
      drums: ['n1', 'n2'],
      fx: ['p4', 'p3', 'p2', 'p1'],
    };

    const preferred = byPreference[role];
    for (const channelId of preferred) {
      if (role !== 'drums' && NOISE_CHANNELS.includes(channelId)) continue;
      if (role === 'drums' && !NOISE_CHANNELS.includes(channelId)) continue;
      if (existingAssignments.some(a => a.channelId === channelId)) {
        return channelId;
      }
    }

    const fallback = existingAssignments[existingAssignments.length - 1]?.channelId ?? null;
    if (fallback && role !== 'drums' && NOISE_CHANNELS.includes(fallback)) return null;
    if (fallback && role === 'drums' && !NOISE_CHANNELS.includes(fallback)) return null;
    return fallback;
  }

  getAnalyzer(): TrackAnalyzer {
    return this.analyzer;
  }

  analyzeTracks(tracks: MIDITrack[]): TrackAnalysis[] {
    return this.analyzer.analyzeTracks(tracks);
  }
}
