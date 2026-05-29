/**
 * Game Boy Player
 * 
 * Main entry point for the v2 synthesis engine.
 * Orchestrates MIDI parsing, track analysis, channel mapping,
 * arpeggiator, and APU scheduling.
 */

import { Midi } from '@tonejs/midi';
import { GameBoyAPU } from '../audio/apu/APU';
import { ChannelMapper, type ChannelMapperConfig } from '../audio/midi/ChannelMapper';
import { Arpeggiator } from '../audio/midi/Arpeggiator';
import { midiNoteToDrumHit } from '../audio/midi/drumNoteMap';
import { needsAssignmentReview } from '../audio/midi/RoleAllocator';
import { GameBoyArranger, type ArrangerConfig } from '../audio/arranger/GameBoyArranger';
import type { MIDITrack, MIDINote } from '../audio/midi/TrackAnalyzer';
import type { 
  ChannelNote, 
  ChannelAssignment, 
  PlaybackInfo,
  ArpNote,
  V2Config,
  MIDIAnalysisResult,
  TrackOverride,
  TrackAnalysis,
} from '../types';

export interface GameBoyPlayerConfig extends Partial<V2Config> {
  /** Whether to auto-resume audio context on play */
  autoResume: boolean;
  
  /** Default BPM if not detected from MIDI */
  defaultBPM: number;
  
  /** Enable the arranger for fuller sound */
  enableArranger: boolean;
  
  /** Arranger configuration */
  arrangerConfig: Partial<ArrangerConfig>;
  
  /** Channel mapping configuration for dense MIDI handling */
  mapperConfig: Partial<ChannelMapperConfig>;
  
  /** One-note-per-channel mode (authentic DMG behavior) */
  enforceChannelMonophony: boolean;
  
  /** Policy when a note arrives on a busy channel */
  monophonyStrategy: 'steal' | 'skip';
}

const DEFAULT_PLAYER_CONFIG: GameBoyPlayerConfig = {
  autoResume: true,
  defaultBPM: 120,
  masterVolume: 0.7,
  enableArranger: false, // OFF by default - too many overlapping notes causes clipping
  arrangerConfig: {},
  mapperConfig: {},
  enforceChannelMonophony: false,
  monophonyStrategy: 'steal',
};

export class GameBoyPlayer {
  private apu: GameBoyAPU;
  private mapper: ChannelMapper;
  private arpeggiator: Arpeggiator;
  private arranger: GameBoyArranger;
  private config: GameBoyPlayerConfig;
  
  private isPlaying: boolean = false;
  private currentPlaybackInfo: PlaybackInfo | null = null;
  private playbackStartTime: number = 0;
  
  // Progressive scheduling state
  private pendingNotes: ChannelNote[] = [];
  private scheduleIndex: number = 0;
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SCHEDULE_AHEAD_TIME = 2.0; // Schedule 2 seconds ahead
  private readonly SCHEDULER_INTERVAL_MS = 250; // Check every 250ms
  
  constructor(config: Partial<GameBoyPlayerConfig> = {}) {
    this.config = { ...DEFAULT_PLAYER_CONFIG, ...config };
    this.apu = new GameBoyAPU(undefined, this.config);
    this.mapper = new ChannelMapper(this.config.mapperConfig);
    this.arpeggiator = new Arpeggiator({ bpm: this.config.defaultBPM });
    this.arranger = new GameBoyArranger(this.config.arrangerConfig);
  }
  
  /**
   * Get the APU instance for direct channel control.
   */
  getAPU(): GameBoyAPU {
    return this.apu;
  }
  
  /**
   * Parse and play a MIDI file.
   * 
   * @param midiData - MIDI file as ArrayBuffer
   * @returns Playback information
   */
  async playMIDI(midiData: ArrayBuffer, overrides: TrackOverride[] = []): Promise<PlaybackInfo> {
    // Resume audio context if needed
    if (this.config.autoResume) {
      await this.apu.resume();
    }
    
    // Stop any current playback
    if (this.isPlaying) {
      this.stop();
    }
    
    // Parse MIDI file
    const midi = new Midi(midiData);
    const bpm = midi.header.tempos[0]?.bpm || this.config.defaultBPM;
    
    // Update arpeggiator and arranger BPM
    this.arpeggiator.setBPM(bpm);
    this.arranger.setBPM(bpm);
    
    // Convert to our track format
    const tracks = this.convertMIDITracks(midi);
    
    const { assignments } = this.mapper.mapTracks(tracks, overrides);
    const nonEmptyTrackCount = tracks.filter(t => t.notes.length > 0).length;
    const droppedTrackCount = Math.max(0, nonEmptyTrackCount - assignments.length);
    if (droppedTrackCount > 0) {
      console.warn(
        `ChannelMapper dropped ${droppedTrackCount} non-empty track(s). ` +
        `Try increasing mapperConfig.maxTracks or enabling mapperConfig.allowChannelReuse.`
      );
    }
    
    // Convert to scheduled notes
    let gbNotes = this.convertToGBNotes(tracks, assignments);
    
    // Apply arranger for fuller sound (if enabled)
    let arrangerStats = null;
    if (this.config.enableArranger) {
      const result = this.arranger.arrange(gbNotes, assignments, midi.duration);
      gbNotes = result.notes;
      arrangerStats = result.stats;
      console.log(`Arranger: Added ${result.stats.addedNotes} notes (${result.stats.originalNotes} → ${gbNotes.length})`);
    }
    
    // Get current time for scheduling
    const startTime = this.apu.getCurrentTime() + 0.1; // Small lookahead
    this.playbackStartTime = startTime;
    
    // Store notes for progressive scheduling
    this.pendingNotes = gbNotes;
    this.scheduleIndex = 0;
    
    // Schedule initial batch
    this.scheduleNextBatch();
    
    // Start the scheduler for progressive note scheduling
    this.startScheduler();
    
    this.isPlaying = true;
    
    // Create playback info
    this.currentPlaybackInfo = {
      duration: midi.duration,
      assignments,
      noteCount: gbNotes.length,
    };
    
    console.log(
      `Playing MIDI: ${gbNotes.length} notes, ${assignments.length}/${nonEmptyTrackCount} mapped tracks, ` +
      `${midi.duration.toFixed(1)}s duration`
    );
    
    // Schedule auto-stop
    const stopDelay = (midi.duration + 1) * 1000;
    setTimeout(() => {
      if (this.isPlaying && this.playbackStartTime === startTime) {
        this.isPlaying = false;
      }
    }, stopDelay);
    
    return this.currentPlaybackInfo;
  }
  
  /**
   * Convert tonejs/midi tracks to logical parts (split multi-channel tracks).
   */
  private convertMIDITracks(midi: InstanceType<typeof Midi>): MIDITrack[] {
    const parts: MIDITrack[] = [];

    for (const track of midi.tracks) {
      if (track.notes.length === 0) continue;

      const byChannel = new Map<number, Array<{
        midi: number;
        time: number;
        duration: number;
        velocity: number;
      }>>();

      for (const note of track.notes) {
        const ch = this.getNoteMidiChannel(
          note as { channel?: number },
          track as { channel?: number }
        );
        const bucket = byChannel.get(ch) ?? [];
        bucket.push({
          midi: note.midi,
          time: note.time,
          duration: note.duration,
          velocity: Math.round(note.velocity * 127),
        });
        byChannel.set(ch, bucket);
      }

      const program =
        (track as { instrument?: { number?: number } }).instrument?.number ??
        (track as { instrumentNumber?: number }).instrumentNumber;
      const instrumentName = (track as { instrument?: { name?: string } }).instrument?.name;

      const channels = [...byChannel.keys()].sort((a, b) => a - b);
      const multiChannel = channels.length > 1;

      for (const channel of channels) {
        const notes = byChannel.get(channel)!;
        const baseName = track.name?.trim() || undefined;
        let name = baseName;
        if (multiChannel) {
          const suffix = channel === 9 ? 'Drums' : `Ch ${channel + 1}`;
          name = baseName ? `${baseName} (${suffix})` : suffix;
        }

        parts.push({
          channel,
          name,
          notes,
          program: channel === 9 ? undefined : program,
          instrumentName: channel === 9 ? 'Drum Kit' : instrumentName,
        });
      }
    }

    return parts;
  }

  private getNoteMidiChannel(
    note: { channel?: number },
    track: { channel?: number }
  ): number {
    if (typeof note.channel === 'number') return note.channel;
    if (typeof track.channel === 'number') return track.channel;
    return 0;
  }
  
  /**
   * Convert MIDI notes to GB channel notes using assignments.
   */
  /**
   * Render MIDI through the v2 stack (ChannelMapper → GameBoyAPU) offline.
   * Same note pipeline as playMIDI(), without real-time progressive scheduling.
   */
  async renderOffline(
    midiData: ArrayBuffer,
    sampleRate = 44100,
    overrides: TrackOverride[] = []
  ): Promise<{
    buffer: AudioBuffer;
    info: PlaybackInfo;
  }> {
    const midi = new Midi(midiData);
    const bpm = midi.header.tempos[0]?.bpm || this.config.defaultBPM;
    this.arpeggiator.setBPM(bpm);
    this.arranger.setBPM(bpm);

    const tracks = this.convertMIDITracks(midi);
    const { assignments } = this.mapper.mapTracks(tracks, overrides);
    const totalDuration = midi.duration + 0.5;
    const totalSamples = Math.ceil(totalDuration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const offlineApu = new GameBoyAPU(offlineCtx as unknown as AudioContext, this.config);

    let gbNotes = this.convertToGBNotes(tracks, assignments, offlineApu);

    if (this.config.enableArranger) {
      const result = this.arranger.arrange(gbNotes, assignments, midi.duration);
      gbNotes = result.notes;
    }

    for (const note of gbNotes) {
      offlineApu.scheduleNote({
        ...note,
        startTime: note.startTime,
      });
    }

    const buffer = await offlineCtx.startRendering();
    const info: PlaybackInfo = {
      duration: midi.duration,
      assignments,
      noteCount: gbNotes.length,
    };
    return { buffer, info };
  }

  private convertToGBNotes(
    tracks: MIDITrack[],
    assignments: ChannelAssignment[],
    apu: GameBoyAPU = this.apu
  ): ChannelNote[] {
    const gbNotes: ChannelNote[] = [];
    
    for (const assignment of assignments) {
      const track = tracks[assignment.trackIndex];
      if (!track || track.notes.length === 0) continue;
      
      // Apply channel-specific settings
      this.applyChannelSettings(assignment, apu);
      
      // Get notes from track
      let notes: ArpNote[] = track.notes.map(n => ({
        midiNote: n.midi,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
      }));
      
      // Apply arpeggiator if needed
      if (assignment.shouldArpeggiate) {
        notes = this.arpeggiator.arpeggiate(notes);
      }
      
      const isNoise = assignment.channelId.startsWith('n');

      for (const note of notes) {
        gbNotes.push({
          channel: assignment.channelId,
          midiNote: note.midiNote,
          startTime: note.time,
          duration: note.duration,
          velocity: note.velocity,
          ...(isNoise ? { drumHit: midiNoteToDrumHit(note.midiNote) } : {}),
        });
      }
    }
    
    // Sort by start time for efficient scheduling
    return gbNotes.sort((a, b) => a.startTime - b.startTime);
  }
  
  /**
   * Apply channel-specific settings from assignment.
   */
  private applyChannelSettings(assignment: ChannelAssignment, apu: GameBoyAPU = this.apu): void {
    const { channelId, dutyCycle, wavePreset, noiseMode } = assignment;
    
    if (channelId.startsWith('p') && dutyCycle !== undefined) {
      apu.setPulseDuty(channelId as any, dutyCycle);
    }
    
    if (channelId.startsWith('w') && wavePreset) {
      apu.setWavePreset(channelId as any, wavePreset);
    }
    
    if (channelId.startsWith('n') && noiseMode) {
      apu.setNoiseMode(channelId as any, noiseMode);
    }
  }
  
  /**
   * Schedule notes progressively - only schedule notes within the lookahead window.
   */
  private scheduleNextBatch(): void {
    if (!this.isPlaying && this.scheduleIndex > 0) return;
    
    const currentTime = this.apu.getCurrentTime();
    const elapsedTime = currentTime - this.playbackStartTime;
    const scheduleUntil = elapsedTime + this.SCHEDULE_AHEAD_TIME;
    
    let scheduledCount = 0;
    
    while (this.scheduleIndex < this.pendingNotes.length) {
      const note = this.pendingNotes[this.scheduleIndex];
      
      // If note is beyond our scheduling window, stop
      if (note.startTime > scheduleUntil) {
        break;
      }
      
      // Schedule the note
      this.apu.scheduleNote({
        ...note,
        startTime: this.playbackStartTime + note.startTime,
      });
      
      this.scheduleIndex++;
      scheduledCount++;
    }
    
    if (scheduledCount > 0) {
      console.log(`Scheduled ${scheduledCount} notes (${this.scheduleIndex}/${this.pendingNotes.length})`);
    }
  }
  
  /**
   * Start the progressive scheduler.
   */
  private startScheduler(): void {
    this.stopScheduler();
    
    this.schedulerInterval = setInterval(() => {
      if (!this.isPlaying) {
        this.stopScheduler();
        return;
      }
      
      this.scheduleNextBatch();
      
      // Check if all notes have been scheduled
      if (this.scheduleIndex >= this.pendingNotes.length) {
        this.stopScheduler();
      }
    }, this.SCHEDULER_INTERVAL_MS);
  }
  
  /**
   * Stop the progressive scheduler.
   */
  private stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }
  
  /**
   * Stop playback.
   */
  stop(): void {
    this.isPlaying = false;
    this.stopScheduler();
    this.pendingNotes = [];
    this.scheduleIndex = 0;
    this.apu.stopAll();
    console.log('Playback stopped');
  }
  
  /**
   * Check if currently playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Get current playback info.
   */
  getPlaybackInfo(): PlaybackInfo | null {
    return this.currentPlaybackInfo;
  }
  
  /**
   * Get elapsed playback time in seconds.
   */
  getElapsedTime(): number {
    if (!this.isPlaying) return 0;
    return this.apu.getCurrentTime() - this.playbackStartTime;
  }
  
  /**
   * Set master volume.
   */
  setVolume(volume: number): void {
    this.apu.setMasterVolume(volume);
  }
  
  /**
   * Get master volume.
   */
  getVolume(): number {
    return this.apu.getMasterVolume();
  }
  
  /**
   * Toggle strict one-note-per-channel playback.
   */
  setChannelMonophony(enabled: boolean): void {
    this.config.enforceChannelMonophony = enabled;
    this.apu.setChannelMonophony(enabled);
  }
  
  getChannelMonophonyEnabled(): boolean {
    return this.apu.getChannelMonophonyEnabled();
  }
  
  /**
   * Set how channel conflicts are resolved in monophonic mode.
   */
  setMonophonyStrategy(strategy: 'steal' | 'skip'): void {
    this.config.monophonyStrategy = strategy;
    this.apu.setMonophonyStrategy(strategy);
  }
  
  getMonophonyStrategy(): 'steal' | 'skip' {
    return this.apu.getMonophonyStrategy();
  }
  
  /**
   * Resume audio context (required after user interaction in most browsers).
   */
  async resume(): Promise<void> {
    await this.apu.resume();
  }
  
  /**
   * Enable or disable the arranger.
   */
  setArrangerEnabled(enabled: boolean): void {
    this.config.enableArranger = enabled;
    console.log(`Arranger ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if arranger is enabled.
   */
  isArrangerEnabled(): boolean {
    return this.config.enableArranger ?? true;
  }
  
  /**
   * Get the arranger instance for configuration.
   */
  getArranger(): GameBoyArranger {
    return this.arranger;
  }
  
  /**
   * Parse MIDI without playing (for analysis/preview).
   */
  analyzeMIDI(midiData: ArrayBuffer, overrides: TrackOverride[] = []): MIDIAnalysisResult {
    const midi = new Midi(midiData);
    const tracks = this.convertMIDITracks(midi);
    const { assignments, analyses } = this.mapper.mapTracks(tracks, overrides);

    const partsWithNotes = analyses.filter(a => a.noteCount > 0);

    return {
      duration: midi.duration,
      trackCount: midi.tracks.length,
      partCount: partsWithNotes.length,
      noteCount: midi.tracks.reduce((sum, t) => sum + t.notes.length, 0),
      bpm: midi.header.tempos[0]?.bpm || this.config.defaultBPM,
      analyses,
      assignments,
      needsReview: needsAssignmentReview(analyses),
    };
  }

  /**
   * Re-map tracks with user overrides (role, mute, primary lead, channel).
   */
  mapTracksWithOverrides(
    midiData: ArrayBuffer,
    overrides: TrackOverride[] = []
  ): { assignments: ChannelAssignment[]; analyses: TrackAnalysis[] } {
    const midi = new Midi(midiData);
    const tracks = this.convertMIDITracks(midi);
    return this.mapper.mapTracks(tracks, overrides);
  }
  
  /**
   * Get detailed track analysis after competitive role allocation.
   */
  getTrackAnalysis(midiData: ArrayBuffer): TrackAnalysis[] {
    return this.analyzeMIDI(midiData).analyses;
  }
}
