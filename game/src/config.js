// Emberlight — tuning, palette and shared constants.
// One file, one job: every number the game balances on lives here, so a
// tuning pass touches this file and nothing else.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'emberlight-best-score';
export const WIN_WAVE = 10;

// Palette: one cold night, one warm light. Everything on screen draws
// from these, so the scene reads as a single place at a glance.
export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#141b3d',
  hillFar: '#1b2450',
  hillNear: '#121838',
  ground: '#0c1026',
  ember: '#ffb347',
  emberHot: '#ff7b2f',
  emberCore: '#fff3c4',
  mote: '#5ef2c0',
  flare: '#ffe9a8',
  gloom: '#8a7fd6',
  gloomDeep: '#4a3f8f',
  splitter: '#c77fd6',
  lunger: '#d67f8a',
  boss: '#b06fd6',
  text: '#f4ead8',
  textDim: '#9aa3c7',
  card: '#1d2447',
  cardEdge: '#3a4480',
  danger: '#ff5d5d',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  dashSpeed: 920,
  dashTime: 0.16,
  dashCooldown: 1.1,
  dashInvuln: 0.3,
  hurtInvuln: 1.3,
  magnetRadius: 70,
  flarePerSpark: 0.09,
  flarePerBanish: 0.05,
};

// Enemy kinds. speed is base px/s; wave scaling is applied in world.js.
export const ENEMIES = {
  wisp: { radius: 13, speed: 74, score: 10, color: PALETTE.gloom },
  drifter: { radius: 12, speed: 52, score: 10, color: PALETTE.gloomDeep },
  splitter: { radius: 18, speed: 58, score: 20, color: PALETTE.splitter },
  motelet: { radius: 8, speed: 118, score: 5, color: PALETTE.gloom },
  lunger: { radius: 13, speed: 60, score: 15, color: PALETTE.lunger },
  boss: { radius: 46, speed: 46, score: 500, color: PALETTE.boss, hp: 5 },
};

export const SPARK = { radius: 7, value: 5, score: 5, lifetime: 9 };

// How many foes a wave fields, and which kinds may appear in it.
export function waveRoster(wave) {
  const count = 4 + wave * 2;
  const kinds = ['wisp', 'drifter'];
  if (wave >= 2) kinds.push('splitter');
  if (wave >= 4) kinds.push('lunger');
  return { count, kinds };
}

// Enemy speed grows a little every wave, so later waves feel faster
// without ever outrunning a dashing player.
export function waveSpeedScale(wave) {
  return 1 + (wave - 1) * 0.06;
}
