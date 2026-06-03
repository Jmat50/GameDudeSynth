import assert from 'node:assert/strict';
import { ProjectMController } from '../src-player/visualizer/ProjectMController.js';

async function testSetAudioActiveGate() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl.enabled = true;
  ctrl._ready = true;
  ctrl.audioActive = false;
  let started = 0;
  let stopped = 0;
  ctrl._startLoop = () => {
    started += 1;
  };
  ctrl._stopLoop = () => {
    stopped += 1;
  };

  ctrl.setAudioActive(true);
  ctrl.setAudioActive(false);

  assert.equal(started, 1, 'render loop should start when active');
  assert.equal(stopped, 1, 'render loop should stop when inactive');
}

async function testRuntimeCatalogUsesCuratedVibes() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl._ready = true;
  ctrl._presetManifest = [
    'Particles/Points/one.milk',
    'Dancer/Glowsticks/two.milk',
    'Dancer/Whirl/three.milk',
    'Waveform/Spectrum/four.milk',
  ];
  const runtimePaths = [
    '/presets/preset_000_one.milk',
    '/presets/preset_001_two.milk',
    '/presets/preset_002_three.milk',
    '/presets/preset_003_four.milk',
  ];
  ctrl._module = {
    ccall: (name, _ret, _args, values) => {
      if (name === 'pm_get_preset_count') return runtimePaths.length;
      if (name === 'pm_get_preset_path') return runtimePaths[values[0]];
      return 0;
    },
  };

  ctrl._syncRuntimePresets();

  assert.deepEqual(
    ctrl._runtimePresets.map((preset) => preset.vibe),
    ['Particles', 'Dancer', 'Dancer', 'Waveform'],
    'runtime presets should inherit Vibe categories from the curated manifest',
  );
}

async function testVibeSelectionRandomizesWithinSelectedStyle() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl._module = {};
  ctrl._ready = true;
  ctrl._vibeBusy = false;
  ctrl._vibeSelect = { value: 'Dancer' };
  ctrl._runtimePresets = [
    { index: 0, vibe: 'Particles' },
    { index: 1, vibe: 'Dancer' },
    { index: 2, vibe: 'Dancer' },
    { index: 3, vibe: 'Waveform' },
  ];
  ctrl._getCurrentPresetIndex = () => 1;
  ctrl._random = () => 0.99;
  let selectedIndex = null;
  ctrl._selectRuntimePreset = async (index) => {
    selectedIndex = index;
  };

  await ctrl._applySelectedVibe({ forceNew: true });

  assert.equal(
    selectedIndex,
    2,
    'selecting a Vibe should choose a different random preset from that Vibe when possible',
  );
}

async function testRuntimePresetJumpUsesShortestDirection() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl._ready = true;
  ctrl.enabled = true;
  ctrl.audioActive = false;
  ctrl._raf = null;
  ctrl.hostEl = { dataset: {} };
  ctrl._runtimePresets = [
    { index: 0, vibe: 'A' },
    { index: 1, vibe: 'B' },
    { index: 2, vibe: 'C' },
    { index: 3, vibe: 'D' },
    { index: 4, vibe: 'E' },
  ];
  const calls = [];
  ctrl._module = {
    ccall: (name) => {
      calls.push(name);
      if (name === 'pm_get_preset_count') return 5;
      if (name === 'pm_get_preset_index') return 4;
      return 0;
    },
  };

  await ctrl._selectRuntimePreset(1);

  assert.deepEqual(
    calls,
    [
      'pm_get_preset_count',
      'pm_get_preset_index',
      'pm_next_preset',
      'pm_next_preset',
      'pm_render_frame',
    ],
    'runtime preset jumps should use the shortest internal route',
  );
}

async function testFeedPcmBufferReuse() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl._pcmPtr = 0;
  ctrl._pcmCapacity = 0;
  ctrl._module = {
    HEAPF32: new Float32Array(4096),
    _malloc: () => 256,
    _free: () => {},
    ccall: () => {},
  };

  const pcm = new Float32Array(256);
  ctrl._feedPcm(pcm, 128);
  const firstPtr = ctrl._pcmPtr;
  ctrl._feedPcm(pcm, 128);
  assert.equal(firstPtr, ctrl._pcmPtr, 'PCM pointer should be reused for same sized buffer');
}

async function run() {
  await testSetAudioActiveGate();
  await testRuntimeCatalogUsesCuratedVibes();
  await testVibeSelectionRandomizesWithinSelectedStyle();
  await testRuntimePresetJumpUsesShortestDirection();
  await testFeedPcmBufferReuse();
  console.log('All visualizer controller checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
