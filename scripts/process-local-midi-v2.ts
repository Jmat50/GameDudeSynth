/**
 * Run a local .mid through the v2 stack (same as /v2 play):
 * @tonejs/midi → ChannelMapper → GameBoyAPU (pulse/wave/noise) → WAV
 *
 * Usage: npm run process:midi:v2 -- "C:\path\to\song.mid"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AudioContext, OfflineAudioContext } from 'node-web-audio-api';
import { audioBufferToWav } from './wav-utils';

// GameBoyAPU constructs AudioContext at init; Node needs a polyfill (OfflineAudioContext for renderOffline).
(globalThis as typeof globalThis & { AudioContext: typeof AudioContext }).AudioContext =
  AudioContext as unknown as typeof globalThis.AudioContext;
(globalThis as typeof globalThis & { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext =
  OfflineAudioContext as unknown as typeof globalThis.OfflineAudioContext;

const { GameBoyPlayer } = await import('../src-v2/core/GameBoyPlayer');

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const inputPath = resolve(process.argv[2] || '');
  if (!inputPath) {
    console.error('Usage: npm run process:midi:v2 -- <path-to.mid>');
    process.exit(1);
  }

  const bytes = readFileSync(inputPath);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const player = new GameBoyPlayer({ enableArranger: false });

  const analysis = player.analyzeMIDI(arrayBuffer);
  console.log('--- v2 MIDI parse (@tonejs/midi) ---');
  console.log(
    JSON.stringify(
      {
        duration: analysis.duration,
        trackCount: analysis.trackCount,
        noteCount: analysis.noteCount,
        bpm: analysis.bpm,
      },
      null,
      2
    )
  );

  console.log('--- Channel mapping (analyze + allocate + map) ---');
  if (analysis.needsReview) {
    console.log('  (review recommended: ambiguous or dense track layout)');
  }
  for (const a of analysis.assignments) {
    const meta = analysis.analyses.find(x => x.trackIndex === a.trackIndex);
    console.log(
      `  track ${a.trackIndex} "${meta?.trackName ?? '?'}" role=${meta?.role} ` +
        `conf=${((meta?.bestRoleConfidence ?? 0) * 100).toFixed(0)}% ` +
        `→ ${a.channelId}` +
        (meta?.isPrimaryLead ? ' [primary lead]' : '') +
        (a.shouldArpeggiate ? ' [arp]' : '') +
        (a.dutyCycle !== undefined ? ` duty=${a.dutyCycle}` : '') +
        (a.wavePreset ? ` wave=${a.wavePreset}` : '') +
        (a.noiseMode ? ` noise=${a.noiseMode}` : '')
    );
  }

  console.log('--- Offline render (GameBoyAPU, arranger off) ---');
  const { buffer, info } = await player.renderOffline(arrayBuffer, 44100);
  console.log(
    `Rendered: ${buffer.duration.toFixed(2)}s, ${info.noteCount} GB notes scheduled @ ${buffer.sampleRate}Hz`
  );

  const wav = audioBufferToWav(buffer);
  const base = basename(inputPath).replace(/\.(mid|midi)$/i, '');
  const outDir = join(projectRoot, 'output');
  mkdirSync(outDir, { recursive: true });
  const outProject = join(outDir, `${base}-wariosynth-v2.wav`);
  const outDesktop = join(dirname(inputPath), `${base}-wariosynth-v2.wav`);
  writeFileSync(outProject, wav);
  writeFileSync(outDesktop, wav);

  console.log('--- Output ---');
  console.log(outProject);
  console.log(outDesktop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
