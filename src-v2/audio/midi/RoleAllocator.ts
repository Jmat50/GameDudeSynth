/**
 * Competitive role allocation across all tracks (global context).
 * Enforces quotas: 1 lead, 1 bass, up to 2 drums; demotes overflow tracks.
 */

import type { TrackAnalysis, TrackRole, TrackOverride } from '../../types';

export interface RoleAllocatorConfig {
  minConfidence: number;
  maxDrumTracks: number;
  maxLeadTracks: number;
  maxBassTracks: number;
  /** When false, all parts stay in the review table for manual assignment */
  autoMuteLowConfidence: boolean;
}

const VOCAL_LEAD_NAME_RE = /\b(vocals?|voice|vox)\b/i;
const LEAD_NAME_RE = /\b(lead|main|solo)\b/i;

const DEFAULT_CONFIG: RoleAllocatorConfig = {
  minConfidence: 0.35,
  maxDrumTracks: 2,
  maxLeadTracks: 1,
  maxBassTracks: 1,
  autoMuteLowConfidence: false,
};

/** Pattern-only drums need high confidence before routing to noise */
const PATTERN_DRUM_THRESHOLD = 0.8;
const NAME_DRUM_THRESHOLD = 0.6;

export class RoleAllocator {
  private config: RoleAllocatorConfig;

  constructor(config: Partial<RoleAllocatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Assign final roles with global quotas and primary lead election.
   */
  allocate(analyses: TrackAnalysis[], overrides: TrackOverride[] = []): TrackAnalysis[] {
    const result = analyses.map(a => ({ ...a, roleConfidence: { ...a.roleConfidence } }));

    for (const o of overrides) {
      const t = result.find(a => a.trackIndex === o.trackIndex);
      if (!t) continue;
      if (o.muted !== undefined) t.muted = o.muted;
      if (o.role !== undefined) t.role = o.role;
      if (o.isPrimaryLead) {
        result.forEach(r => {
          r.isPrimaryLead = r.trackIndex === o.trackIndex;
        });
      }
    }

    const active = result.filter(a => !a.muted && a.noteCount > 0);

    const eligibleForDrums = active.filter(a => this.shouldAllowDrumRole(a));
    const drumCandidates = [...eligibleForDrums].sort(
      (a, b) => (b.roleConfidence.drums ?? 0) - (a.roleConfidence.drums ?? 0)
    );
    const drumWinners = new Set(
      drumCandidates.slice(0, this.config.maxDrumTracks).map(a => a.trackIndex)
    );

    for (const a of result) {
      if (a.muted || a.noteCount === 0) continue;
      if (drumWinners.has(a.trackIndex)) {
        a.role = 'drums';
        a.isDrums = true;
      } else if (a.role === 'drums' || a.isDrums) {
        a.isDrums = false;
        a.role = this.pickMelodicFallback(a);
      }
    }

    const nonDrums = result.filter(a => !a.muted && a.noteCount > 0 && a.role !== 'drums');

    const leadOverride = overrides.find(o => o.isPrimaryLead);
    let primaryLeadIndex: number | null = leadOverride?.trackIndex ?? null;

    if (primaryLeadIndex === null) {
      const leadCandidates = [...nonDrums].sort(
        (a, b) => (b.roleConfidence.lead ?? 0) - (a.roleConfidence.lead ?? 0)
      );
      const vocalLeads = leadCandidates.filter(a => VOCAL_LEAD_NAME_RE.test(a.trackName ?? ''));
      const namedLeads = leadCandidates.filter(a => LEAD_NAME_RE.test(a.trackName ?? ''));
      const pool = vocalLeads.length > 0 ? vocalLeads : namedLeads.length > 0 ? namedLeads : leadCandidates;
      if (pool.length > 0 && (pool[0].roleConfidence.lead ?? 0) >= this.config.minConfidence) {
        primaryLeadIndex = pool[0].trackIndex;
      }
    }

    if (primaryLeadIndex !== null) {
      for (const a of result) {
        a.isPrimaryLead = a.trackIndex === primaryLeadIndex;
        if (a.trackIndex === primaryLeadIndex) {
          a.role = 'lead';
        } else if (a.role === 'lead' && !a.muted) {
          a.role = a.hasChords ? 'harmony' : 'pad';
        }
      }
    }

    const bassCandidates = result
      .filter(a => !a.muted && a.noteCount > 0 && a.role !== 'drums' && !a.isPrimaryLead)
      .sort((a, b) => (b.roleConfidence.bass ?? 0) - (a.roleConfidence.bass ?? 0));

    let bassAssigned = 0;
    for (const a of bassCandidates) {
      if (bassAssigned >= this.config.maxBassTracks) break;
      if ((a.roleConfidence.bass ?? 0) >= this.config.minConfidence || BASS_LIKE(a)) {
        a.role = 'bass';
        bassAssigned++;
      }
    }

    if (this.config.autoMuteLowConfidence) {
      for (const a of result) {
        if (a.muted || a.noteCount === 0) continue;
        if (a.isPrimaryLead || a.role === 'drums' || a.role === 'bass') continue;
        if ((a.bestRoleConfidence ?? 0) < this.config.minConfidence) {
          a.muted = true;
          continue;
        }
        if (a.role === 'lead') {
          a.role = a.hasChords ? 'harmony' : 'pad';
        }
      }
    } else {
      for (const a of result) {
        if (a.muted || a.noteCount === 0) continue;
        if (a.isPrimaryLead || a.role === 'drums' || a.role === 'bass') continue;
        if (a.role === 'lead') {
          a.role = a.hasChords ? 'harmony' : 'pad';
        }
      }
    }

    for (const o of overrides) {
      const t = result.find(a => a.trackIndex === o.trackIndex);
      if (!t) continue;
      if (o.role !== undefined) t.role = o.role;
      if (o.muted !== undefined) t.muted = o.muted;
      if (o.isPrimaryLead) {
        result.forEach(r => {
          r.isPrimaryLead = r.trackIndex === o.trackIndex;
          if (r.trackIndex === o.trackIndex) r.role = 'lead';
        });
      }
    }

    return result.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Whether this track may be classified as drums (noise channel).
   */
  shouldAllowDrumRole(analysis: TrackAnalysis): boolean {
    if (analysis.channel === 9) return true;
    if (analysis.drumConfidence >= NAME_DRUM_THRESHOLD && DRUM_NAME(analysis)) return true;
    if (analysis.drumConfidence >= PATTERN_DRUM_THRESHOLD) return true;
    return false;
  }

  private pickMelodicFallback(a: TrackAnalysis): TrackRole {
    const scores = { ...a.roleConfidence };
    delete scores.drums;
    const roles: TrackRole[] = ['lead', 'harmony', 'bass', 'pad', 'fx'];
    let best: TrackRole = 'harmony';
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
}

function DRUM_NAME(a: TrackAnalysis): boolean {
  return /\b(drum|drums|kit|perc|percussion)\b/i.test(a.trackName ?? '');
}

function BASS_LIKE(a: TrackAnalysis): boolean {
  return /\b(bass|sub|808)\b/i.test(a.trackName ?? '') || a.medianPitch < 48;
}

/**
 * Returns true if MIDI should show assignment review UI.
 */
export function needsAssignmentReview(analyses: TrackAnalysis[]): boolean {
  const active = analyses.filter(a => a.noteCount > 0);
  if (active.length > 8) return true;
  if (active.filter(a => a.role === 'drums').length > 2) return true;
  if (active.filter(a => a.role === 'lead').length > 1) return true;
  if (active.some(a => a.bestRoleConfidence < 0.5)) return true;
  if (active.some(a => a.role === 'drums' && a.drumConfidence < 0.6 && a.channel !== 9)) return true;
  return false;
}
