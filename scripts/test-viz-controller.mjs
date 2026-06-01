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
  const pendingTimers = [];
  globalThis.setTimeout = (fn) => {
    pendingTimers.push(fn);
    return pendingTimers.length;
  };
  globalThis.clearTimeout = () => {};

  const ctrl = Object.create(ProjectMController.prototype);
  ctrl.enabled = true;
  ctrl._ready = true;
  ctrl._presetButtons = [{ disabled: false }, { disabled: false }];
  ctrl._presetUnlockTimer = null;
  ctrl._presetLastSwitchMs = -1e9;
  ctrl._presetQueueDir = 0;
  ctrl._presetBusy = false;
  ctrl._setError = () => {};
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
    ['pm_next_preset', 'pm_prev_preset'],
    'queued preset request should run after unlock timer',
  );

  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
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
