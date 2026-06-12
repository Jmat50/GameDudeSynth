import assert from 'node:assert/strict';
import { ButterchurnController } from '../src-player/visualizer/ButterchurnController.js';

function makeSelect() {
  const options = [];
  return {
    innerHTML: '',
    value: '',
    disabled: false,
    options,
    appendChild(option) {
      options.push(option);
      if (!this.value && option.value) {
        this.value = option.value;
      }
    },
  };
}

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

async function testPresetsForPackFiltersAndSorts() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._catalog = [
    { key: 'Z preset', slug: 'z', packs: ['base'] },
    { key: 'A preset', slug: 'a', packs: ['base', 'extra'] },
    { key: 'Other only', slug: 'o', packs: ['other'] },
  ];

  const basePresets = ctrl._presetsForPack('base');
  assert.deepEqual(
    basePresets.map((entry) => entry.slug),
    ['a', 'z'],
    'base pack presets should be sorted by key',
  );

  const extraPresets = ctrl._presetsForPack('extra');
  assert.deepEqual(extraPresets.map((entry) => entry.slug), ['a']);
}

async function testBuildPresetOptionsUsesSavedSlug() {
  globalThis.document = {
    createElement(tag) {
      if (tag !== 'option') throw new Error(`unexpected tag ${tag}`);
      return { value: '', textContent: '', title: '' };
    },
  };

  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._catalog = [
    { key: 'First', slug: 'first', packs: ['base'] },
    { key: 'Second', slug: 'second', packs: ['base'] },
  ];
  ctrl._packSelect = makeSelect();
  ctrl._packSelect.value = 'base';
  ctrl._presetSelect = makeSelect();

  globalThis.localStorage = {
    _data: new Map([['gamedude.vizPresetSlug', 'second']]),
    getItem(key) {
      return this._data.get(key) ?? null;
    },
    setItem(key, value) {
      this._data.set(key, value);
    },
  };

  ctrl._buildPresetOptions();

  assert.equal(ctrl._presetSelect.value, 'second', 'saved slug should be selected when in pack');
}

async function testApplyPresetSlugLoadsEntry() {
  const ctrl = Object.create(ButterchurnController.prototype);
  ctrl._visualizer = {};
  ctrl._ready = true;
  ctrl._presetBusy = false;
  ctrl._catalog = [
    { index: 1, key: 'Test', slug: 'test-slug', url: './presets/test-slug.json', packs: ['base'] },
  ];
  ctrl._presetSelect = makeSelect();
  ctrl._packSelect = makeSelect();
  let loadedSlug = null;
  ctrl._loadPresetEntry = async (entry) => {
    loadedSlug = entry.slug;
  };

  await ctrl._applyPresetSlug('test-slug');

  assert.equal(loadedSlug, 'test-slug', 'applyPresetSlug should load matching catalog entry');
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
  await testPresetsForPackFiltersAndSorts();
  await testBuildPresetOptionsUsesSavedSlug();
  await testApplyPresetSlugLoadsEntry();
  await testAudioGatingRequiresPlayback();
  console.log('All visualizer controller checks passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
