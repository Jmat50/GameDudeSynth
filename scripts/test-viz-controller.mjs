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

async function testPresetQueueingAndCooldown() {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const realRaf = globalThis.requestAnimationFrame;
  const pendingTimers = [];
  globalThis.setTimeout = (fn) => {
    pendingTimers.push(fn);
    return pendingTimers.length;
  };
  globalThis.clearTimeout = () => {};
  globalThis.requestAnimationFrame = (cb) => {
    cb();
    return 0;
  };

  const ctrl = Object.create(ProjectMController.prototype);
  ctrl.enabled = true;
  ctrl._ready = true;
  ctrl.audioActive = true;
  ctrl._presetButtons = [{ disabled: false }, { disabled: false }];
  ctrl._presetUnlockTimer = null;
  ctrl._presetLastSwitchMs = -1e9;
  ctrl._presetQueueDir = 0;
  ctrl._presetBusy = false;
  ctrl._setError = () => {};
  ctrl._stopLoop = () => {};
  ctrl._startLoop = () => {};
  const called = [];
  ctrl._module = {
    ccall: (name) => {
      called.push(name);
    },
  };

  ctrl._changePreset(1);
  ctrl._changePreset(-1); // queues while busy
  assert.deepEqual(called, ['pm_next_preset'], 'first preset call should fire once');
  assert.equal(ctrl._presetQueueDir, -1, 'second direction should queue');

  while (pendingTimers.length) {
    pendingTimers.shift()?.();
  }

  assert.deepEqual(
    called,
    ['pm_next_preset', 'pm_render_frame', 'pm_prev_preset', 'pm_render_frame'],
    'queued preset request should run after unlock timer (with settle renders)',
  );

  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  globalThis.requestAnimationFrame = realRaf;
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
  assert.equal(ctrl._pcmPtr, firstPtr, 'PCM pointer should be reused for same sized buffer');
}

async function testVibeScopedPresetNavigation() {
  const ctrl = Object.create(ProjectMController.prototype);
  ctrl.enabled = true;
  ctrl._ready = true;
  ctrl.audioActive = true;
  ctrl._presetBusy = false;
  ctrl._presetQueueDir = 0;
  ctrl._presetLastSwitchMs = -1e9;
  ctrl._presetUnlockTimer = null;
  ctrl._presetManifest = [
    'A/first.milk',
    'Dancer/second.milk',
    'Dancer/third.milk',
    'B/fourth.milk',
  ];
  ctrl._vibeSelect = { value: 'Dancer' };
  ctrl._module = {
    ccall: (name, ret, args, vals) => {
      if (name === 'pm_get_preset_index') return 1;
      if (name === 'pm_get_preset_path') return 'Dancer/second.milk';
      return 0;
    },
  };
  let selected = null;
  ctrl._selectPresetByPath = async (path) => {
    selected = path;
  };

  await ctrl._changePreset(1);
  assert.equal(selected, 'Dancer/third.milk', 'Preset navigation should move within selected vibe');
}

async function run() {
  await testSetAudioActiveGate();
  await testPresetQueueingAndCooldown();
  await testFeedPcmBufferReuse();
  console.log('All visualizer controller checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
