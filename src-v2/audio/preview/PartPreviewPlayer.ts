import { midiToStandardFrequency } from '../synthesis/FrequencyCalc';
import { midiNoteToDrumHit } from '../midi/drumNoteMap';
import type { TrackPreviewClip } from '../../types';

export interface PartPreviewPlayOptions {
  onProgress?: (elapsedSec: number, totalSec: number) => void;
}

/**
 * Lightweight Web Audio preview — GM-ish oscillators, not export timbre.
 */
export class PartPreviewPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (OscillatorNode | AudioBufferSourceNode | GainNode)[] = [];
  private playResolve: (() => void) | null = null;
  private playReject: ((err: Error) => void) | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private stoppedEarly = false;

  async play(
    clip: TrackPreviewClip,
    options: PartPreviewPlayOptions = {}
  ): Promise<void> {
    this.stop(true);
    this.stoppedEarly = false;

    const ctx = await this.ensureContext();
    const master = this.masterGain!;

    if (clip.notes.length === 0) {
      return;
    }

    const startAt = ctx.currentTime + 0.05;
    const totalSec = clip.duration;

    return new Promise<void>((resolve, reject) => {
      this.playResolve = resolve;
      this.playReject = reject;

      for (const note of clip.notes) {
        const when = startAt + note.startTime;
        const vel = note.velocity / 127;
        if (clip.isDrums) {
          this.scheduleDrumHit(ctx, master, note.midiNote, when, note.duration, vel);
        } else {
          this.scheduleMelodicNote(
            ctx,
            master,
            note.midiNote,
            when,
            note.duration,
            vel,
            clip.program
          );
        }
      }

      if (options.onProgress) {
        const t0 = performance.now();
        this.progressTimer = setInterval(() => {
          const elapsed = (performance.now() - t0) / 1000;
          options.onProgress!(Math.min(elapsed, totalSec), totalSec);
        }, 250);
      }

      this.endTimer = setTimeout(() => {
        this.finishPlay();
      }, totalSec * 1000 + 120);
    });
  }

  stop(silent = false): void {
    this.stoppedEarly = true;
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    for (const node of this.activeNodes) {
      try {
        if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
          node.stop();
        }
        node.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.activeNodes = [];

    if (!silent && this.playReject) {
      this.playReject(new Error('Preview stopped'));
    }
    this.playReject = null;
    this.playResolve = null;
  }

  private finishPlay(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.endTimer = null;
    const resolve = this.playResolve;
    this.playResolve = null;
    this.playReject = null;
    resolve?.();
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private trackNode(node: OscillatorNode | AudioBufferSourceNode | GainNode): void {
    this.activeNodes.push(node);
  }

  private scheduleMelodicNote(
    ctx: AudioContext,
    master: GainNode,
    midiNote: number,
    when: number,
    duration: number,
    velocity: number,
    program?: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = brightProgram(program) ? 'square' : 'triangle';
    osc.frequency.value = midiToStandardFrequency(midiNote);

    const dur = Math.max(0.03, Math.min(duration, 2));
    const peak = velocity * 0.45;
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);

    this.trackNode(osc);
    this.trackNode(gain);
  }

  private scheduleDrumHit(
    ctx: AudioContext,
    master: GainNode,
    midiNote: number,
    when: number,
    duration: number,
    velocity: number
  ): void {
    const hit = midiNoteToDrumHit(midiNote);
    const dur = Math.max(0.04, Math.min(duration, hit === 'hihat' ? 0.12 : 0.35));
    const peak = velocity * (hit === 'kick' ? 0.55 : 0.4);

    const bufferLen = Math.ceil(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (hit === 'kick') {
      for (let i = 0; i < bufferLen; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 18);
        data[i] = Math.sin(2 * Math.PI * 80 * t) * env * peak;
      }
    } else {
      for (let i = 0; i < bufferLen; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * (hit === 'hihat' ? 40 : 22));
        data[i] = (Math.random() * 2 - 1) * env * peak;
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(master);
    src.start(when);
    src.stop(when + dur);

    this.trackNode(src);
    this.trackNode(gain);
  }
}

function brightProgram(program?: number): boolean {
  if (program === undefined) return false;
  return program === 80 || program === 81 || program === 62 || program === 56;
}
