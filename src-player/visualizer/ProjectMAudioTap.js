import { Howler } from 'howler';

const BUFFER_SIZE = 1024;

/**
 * Taps Howler's Web Audio graph and forwards interleaved stereo PCM to projectM.
 */
export class ProjectMAudioTap {
  constructor() {
    this.onPcm = null;
    this._processor = null;
    this._wired = false;
    this._stereoScratch = new Float32Array(BUFFER_SIZE * 2);
  }

  /** @param {(interleaved: Float32Array, samplesPerChannel: number) => void} handler */
  setPcmHandler(handler) {
    this.onPcm = handler;
  }

  start() {
    this._ensureGraph();
    if (!this._processor) return;

    if (this._processor.context?.state === 'suspended') {
      this._processor.context.resume().catch(() => {});
    }
  }

  stop() {
    /* Processor stays connected; silence is forwarded when not playing. */
  }

  _ensureGraph() {
    const ctx = Howler.ctx;
    if (!ctx || this._wired) return;

    try {
      this._processor = ctx.createScriptProcessor(BUFFER_SIZE, 2, 2);
    } catch {
      return;
    }

    this._processor.onaudioprocess = (event) => {
      if (!this.onPcm) return;

      const inL = event.inputBuffer.getChannelData(0);
      const inR = event.inputBuffer.numberOfChannels > 1
        ? event.inputBuffer.getChannelData(1)
        : inL;
      const outL = event.outputBuffer.getChannelData(0);
      const outR = event.outputBuffer.numberOfChannels > 1
        ? event.outputBuffer.getChannelData(1)
        : outL;

      const len = inL.length;
      const scratch = this._stereoScratch;
      for (let i = 0; i < len; i++) {
        const l = inL[i];
        const r = inR[i];
        scratch[i * 2] = l;
        scratch[i * 2 + 1] = r;
        outL[i] = l;
        outR[i] = r;
      }

      this.onPcm(scratch.subarray(0, len * 2), len);
    };

    const master = Howler.masterGain;
    if (!master) return;

    try {
      master.disconnect();
    } catch {
      /* already disconnected */
    }

    master.connect(this._processor);
    this._processor.connect(ctx.destination);
    this._wired = true;
  }
}
