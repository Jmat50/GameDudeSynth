export const ASSET_BASE = './public/vendor/netstalgia';

export const BACKGROUND_THEMES = [
  {
    id: 'gamedude',
    label: 'GameDude Stripes',
    type: 'css',
    className: 'bg-gamedude-default',
    group: 'default',
  },
  {
    id: 'pattern-dots',
    label: 'Win95 Dots',
    type: 'css',
    className: 'bg-pattern-dots',
    group: 'css',
  },
  {
    id: 'pattern-grid',
    label: 'Win95 Grid',
    type: 'css',
    className: 'bg-pattern-grid',
    group: 'css',
  },
  {
    id: 'dither-blue',
    label: 'Dither Blue',
    type: 'css',
    className: 'dithered-gradient-blue',
    group: 'css',
  },
  {
    id: 'dither-green',
    label: 'Dither Green',
    type: 'css',
    className: 'dithered-gradient-green',
    group: 'css',
  },
  {
    id: 'dither-red',
    label: 'Dither Red',
    type: 'css',
    className: 'dithered-gradient-red',
    group: 'css',
  },
  {
    id: 'dither-gray',
    label: 'Dither Gray',
    type: 'css',
    className: 'dithered-gradient-gray',
    group: 'css',
  },
  {
    id: 'pixel-checker',
    label: 'Pixel Checkerboard',
    type: 'css',
    className: 'pixel-pattern-checkerboard',
    group: 'css',
  },
  {
    id: 'pixel-dots',
    label: 'Pixel Dots',
    type: 'css',
    className: 'pixel-pattern-dots',
    group: 'css',
  },
  {
    id: 'pixel-grid',
    label: 'Pixel Grid',
    type: 'css',
    className: 'pixel-pattern-grid',
    group: 'css',
  },
  {
    id: 'pixel-diagonal',
    label: 'Pixel Diagonal',
    type: 'css',
    className: 'pixel-pattern-diagonal',
    group: 'css',
  },
  {
    id: 'pixel-brick',
    label: 'Pixel Brick',
    type: 'css',
    className: 'pixel-pattern-brick',
    group: 'css',
  },
  {
    id: 'win95-desktop',
    label: 'Win95 Desktop Teal',
    type: 'css',
    className: 'bg-win95-teal',
    group: 'css',
  },
  {
    id: 'starfield',
    label: 'Starfield Warp',
    type: 'canvas',
    renderer: 'starfield',
    underlayClass: 'bg-canvas-underlay',
    group: 'canvas',
  },
  {
    id: 'matrix',
    label: 'Matrix Rain',
    type: 'canvas',
    renderer: 'matrix',
    underlayClass: 'bg-canvas-underlay-matrix',
    group: 'canvas',
  },
  {
    id: 'toasters',
    label: 'Flying Toasters',
    type: 'canvas',
    renderer: 'toasters',
    underlayClass: 'bg-canvas-underlay',
    group: 'canvas',
  },
  {
    id: 'dialup',
    label: 'Dial-Up Modem',
    type: 'scene',
    renderer: 'dialup',
    underlayClass: 'bg-scene-underlay',
    group: 'scenes',
  },
  {
    id: 'bsod',
    label: 'Blue Screen of Death',
    type: 'scene',
    renderer: 'bsod',
    underlayClass: 'bg-scene-underlay',
    group: 'scenes',
  },
  {
    id: 'under-construction',
    label: 'Under Construction',
    type: 'scene',
    renderer: 'underConstruction',
    group: 'scenes',
  },
  {
    id: 'crt',
    label: 'CRT Scanlines',
    type: 'scene',
    renderer: 'crtStandalone',
    underlayClass: 'bg-crt-underlay',
    group: 'scenes',
  },
];

export const THEME_GROUP_LABELS = {
  css: 'CSS Patterns',
  canvas: 'Canvas FX',
  scenes: 'Netstalgia Scenes',
};

export const ALL_THEME_CLASS_NAMES = BACKGROUND_THEMES.filter((t) => t.className).map(
  (t) => t.className,
);

export const FX_THEME_OPTIONS = BACKGROUND_THEMES.filter((t) => t.id !== 'gamedude');

export function getThemeById(id) {
  return BACKGROUND_THEMES.find((t) => t.id === id) ?? BACKGROUND_THEMES[0];
}
