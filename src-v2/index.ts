/**
 * GameDudeSynth - Main Exports
 * 
 * Game Boy-authentic synthesis engine
 */

// Core Player - Main entry point
export { GameBoyPlayer } from './core/GameBoyPlayer';

// APU and Channels
export { GameBoyAPU } from './audio/apu/APU';
export { PulseChannel } from './audio/apu/PulseChannel';
export { WaveChannel } from './audio/apu/WaveChannel';
export { NoiseChannel } from './audio/apu/NoiseChannel';

// Synthesis primitives
export { 
  createDutyWave,
  createAllDutyWaves,
  getDutyDescription,
  type DutyIndex
} from './audio/synthesis/DutyCycle';

export {
  calculatePulseFrequency,
  calculateWaveFrequency,
  calculateNoiseFrequency,
  midiToStandardFrequency,
  getFrequencyDeviation
} from './audio/synthesis/FrequencyCalc';

export {
  LFSR,
  generateNoiseBuffer,
  verifyLFSR,
  type LFSRMode
} from './audio/synthesis/LFSR';

export {
  WaveTable,
  WAVE_PRESETS,
  generateTriangleWave,
  generateSawtoothWave,
  generateSineWave,
  generateSquareWave,
  generateBassWave,
  generatePadWave,
  generateLeadWave,
  type WavePreset,
  type WaveVolume
} from './audio/synthesis/WaveTable';

// Track preview (export UI)
export { PartPreviewPlayer, type PartPreviewPlayOptions } from './audio/preview/PartPreviewPlayer';
export {
  pickPreviewWindow,
  estimatePreviewPrepareMs,
  previewNoteCap,
  type PreviewWindowResult,
} from './audio/preview/previewWindow';

// MIDI Intelligence
export { TrackAnalyzer, type MIDINote, type MIDITrack } from './audio/midi/TrackAnalyzer';
export { Arpeggiator, type ArpeggiatorConfig } from './audio/midi/Arpeggiator';
export { ChannelMapper, type ChannelMapperConfig } from './audio/midi/ChannelMapper';
export { RoleAllocator, needsAssignmentReview } from './audio/midi/RoleAllocator';
export { midiNoteToDrumHit } from './audio/midi/drumNoteMap';
export {
  GM_PROGRAMS,
  gmProgramLabel,
  listGmInstrumentOptions,
  type GmInstrumentOption,
} from './audio/midi/gmPrograms';

// Arranger (makes sparse MIDIs sound full like real GB music)
export { GameBoyArranger, type ArrangerConfig, type ArrangementResult } from './audio/arranger/GameBoyArranger';

// Effects
export { GameBoyColorizer, type ColorizerConfig } from './audio/effects/GameBoyColorizer';

// Types
export * from './types';

// Tests
export {
  runVerificationTests,
  createTestChannels,
  testDutyCycles,
  testWaveChannel,
  testNoiseChannel,
  testCombined,
  runAllAudioTests
} from './audio/test/soundTest';
