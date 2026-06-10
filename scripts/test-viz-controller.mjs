import assert from 'node:assert/strict';
import { ButterchurnController } from '../src-player/visualizer/ButterchurnController.js';

async function testSetAudioActiveGate() {
  const ctrl = Object.create(ButterchurnController.prototype);
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

async function testCatalogGroupsVibes() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._catalog = [
    { vibe: 'Particles', slug: 'a' },
    { vibe: 'Dancer', slug: 'b' },
    { vibe: 'Dancer', slug: 'c' },
    { vibe: 'Waveform', slug: 'd' },
  ];
  ctrl._vibeSelect = { innerHTML: '', options: [], disabled: false, appendChild() {} };

  const groups = new Map();
  for (const entry of ctrl._catalog) {
    groups.set(entry.vibe, (groups.get(entry.vibe) ?? 0) + 1);
  }

  assert.deepEqual(
    [...groups.entries()],
    [
      ['Particles', 1],
      ['Dancer', 2],
      ['Waveform', 1],
    ],
    'catalog entries should group into Vibe counts',
  );
}

async function testVibeSelectionRandomizesWithinSelectedStyle() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._visualizer = {};
  ctrl._ready = true;
  ctrl._vibeBusy = false;
  ctrl._vibeSelect = { value: 'Dancer' };
  ctrl._catalog = [
    { index: 0, vibe: 'Particles', slug: 'p1', url: './presets/p1.json' },
    { index: 1, vibe: 'Dancer', slug: 'd1', url: './presets/d1.json' },
    { index: 2, vibe: 'Dancer', slug: 'd2', url: './presets/d2.json' },
    { index: 3, vibe: 'Waveform', slug: 'w1', url: './presets/w1.json' },
  ];
  ctrl._currentPresetSlug = 'd1';
  ctrl._random = () => 0.99;
  let loadedSlug = null;
  ctrl._loadPresetEntry = async (entry) => {
    loadedSlug = entry.slug;
  };

  await ctrl._applySelectedVibe({ forceNew: true });

  assert.equal(
    loadedSlug,
    'd2',
    'selecting a Vibe should choose a different random preset from that Vibe when possible',
  );
}

async function testGetSelectedVibePresetsFiltersByVibe() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._vibeSelect = { value: 'Reaction' };
  ctrl._catalog = [
    { vibe: 'Particles', slug: 'p1' },
    { vibe: 'Reaction', slug: 'r1' },
    { vibe: 'Reaction', slug: 'r2' },
  ];

  const presets = ctrl._getSelectedVibePresets();
  assert.deepEqual(
    presets.map((entry) => entry.slug),
    ['r1', 'r2'],
    'selected vibe presets should be filtered from the catalog',
  );
}

async function testAudioGatingRequiresPlayback() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl.enabled = true;
  ctrl._ready = true;
  ctrl.audioActive = false;
  let frames = 0;
  ctrl._renderFrameOnce = () => {
    frames += 1;
  };
  ctrl._raf = 1;
  ctrl._visualizer = {};

  const tick = () => {
    if (!ctrl.enabled || !ctrl._ready || !ctrl.audioActive) return;
    ctrl._renderFrameOnce();
  };
  tick();

  assert.equal(frames, 0, 'render loop should not draw frames while audio is inactive');
}

async function run() {
  await testSetAudioActiveGate();
  await testCatalogGroupsVibes();
  await testVibeSelectionRandomizesWithinSelectedStyle();
  await testGetSelectedVibePresetsFiltersByVibe();
  await testAudioGatingRequiresPlayback();
  console.log('All visualizer controller checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
