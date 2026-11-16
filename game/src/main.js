// Emberlight — boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps,
// and the renderer paints what is there. Screens: title, play, paused,
// upgrade, game over, win.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|win|end
// (with &seed=N) stages that scene instead of running the loop, paints
// it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BANISH, EVENT_BOSS_HIT, EVENT_DASH, EVENT_FLARE, EVENT_HURT, EVENT_OVER, EVENT_SPARK, EVENT_UPGRADE, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_FLARE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
world.reset();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts one visit.
  }
}

function playEventSound(events) {
  if (events & EVENT_DASH) audio.play('dash');
  if (events & EVENT_BANISH) audio.play('banish');
  if (events & EVENT_SPARK) audio.play('spark');
  if (events & EVENT_HURT) audio.play('hurt');
  if (events & EVENT_FLARE) audio.play('flare');
  if (events & EVENT_WAVE) audio.play('wave');
  if (events & EVENT_UPGRADE) audio.play('upgrade');
  if (events & EVENT_BOSS_HIT) audio.play('bossHit');
  if (events & EVENT_OVER) audio.play('over');
  if (events & EVENT_WIN) audio.play('win');
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    world.startWave(1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Dash through the gloom to banish it.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`You won. Score ${world.state.score}.`);
  }

  // Upgrade cards live in field coordinates; a click picks one.
  function upgradeCardAt(point) {
    if (!point || world.state.upgradeChoices.length === 0) return -1;
    const { scale, ox, oy } = renderer.fit();
    const fx = (point.x - ox) / scale;
    const fy = (point.y - oy) / scale;
    const cards = world.state.upgradeChoices;
    const w = 240;
    const h = 220;
    const gap = 28;
    const total = cards.length * w + (cards.length - 1) * gap;
    const x0 = (960 - total) / 2;
    const y0 = 210;
    for (let i = 0; i < cards.length; i += 1) {
      const x = x0 + i * (w + gap);
      if (fx >= x && fx <= x + w && fy >= y0 && fy <= y0 + h) return i;
    }
    return -1;
  }

  // One frame's input, read once and shared: handleActions spends the
  // menu keys, step() spends the dash/flare on its first sub-step.
  const pending = { dash: false, flare: false, click: null, confirm: false, pause: false };

  function handleActions() {
    const click = pending.click;
    if (input.isDown('m') && !handleActions._muted) {
      handleActions._muted = true;
      announce(audio.toggleMute() ? 'Muted.' : 'Sound on.');
    }
    if (!input.isDown('m')) handleActions._muted = false;
    if (screen === SCREEN_UPGRADE) {
      if (input.isDown('1') || input.isDown('2') || input.isDown('3')) {
        const index = input.isDown('1') ? 0 : input.isDown('2') ? 1 : 2;
        if (world.chooseUpgrade(index)) {
          audio.play('upgrade');
          screen = SCREEN_PLAY;
          announce(`Wave ${world.state.wave}.`);
        }
        return;
      }
      const picked = upgradeCardAt(click);
      if (picked >= 0 && world.chooseUpgrade(picked)) {
        audio.play('upgrade');
        screen = SCREEN_PLAY;
        announce(`Wave ${world.state.wave}.`);
      }
      return;
    }
    if (pending.confirm && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (click && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (pending.pause && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (pending.pause && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, false, null, true);
      return;
    }
    const dir = input.direction();
    const click = pending.click;
    const dashTarget = click ? (() => {
      const { scale, ox, oy } = renderer.fit();
      return { x: (click.x - ox) / scale, y: (click.y - oy) / scale };
    })() : null;
    const events = world.step(STEP, dir, pending.dash, pending.flare, dashTarget, false);
    pending.dash = false;
    pending.flare = false;
    pending.click = null;
    playEventSound(events);
    if (world.state.phase === 'over') endGame();
    else if (world.state.phase === 'win') winGame();
    else if (world.state.phase === 'upgrade') screen = SCREEN_UPGRADE;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const click = input.takeClick();
    pending.dash = Boolean(actions & ACTION_DASH) || Boolean(click);
    pending.flare = Boolean(actions & ACTION_FLARE);
    pending.click = click;
    pending.confirm = Boolean(actions & ACTION_CONFIRM);
    pending.pause = Boolean(actions & ACTION_PAUSE);
    if (pending.dash) audio.unlock();
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A handle for automated play-testing: the test harness drives the game
  // through this instead of reaching into the module internals.
  window.__ember = { world, get screen() { return screen; }, startGame, renderer };
  announce('Emberlight. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
