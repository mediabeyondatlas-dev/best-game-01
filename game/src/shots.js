// Emberlight — the screenshot scenes behind ?shot=start|play|upgrade|win|end.
// Each scene plays the real rules forward from a fresh world, steered by
// an autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame. The win scene plays only
// wave 10 (the boss wave) from a fresh world, then lands the final blow.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** The nearest enemy to the player, and how far away it is. */
function nearestEnemy(state) {
  const p = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return { enemy: best, dist: bestDist };
}

function nearestSpark(state) {
  const p = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const spark of state.sparks) {
    const d = Math.hypot(spark.x - p.x, spark.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = spark;
    }
  }
  return { spark: best, dist: bestDist };
}

function norm(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/**
 * A competent player: dash through a foe when it is close, flare when the
 * room is crowded, flee when one is nearly touching, otherwise chase sparks.
 */
function autopilot(world) {
  const state = world.state;
  const p = state.player;
  const { enemy, dist } = nearestEnemy(state);
  const { spark, dist: sparkDist } = nearestSpark(state);
  const wantFlare = state.flareReady && state.enemies.length >= 3;
  let wantDash = false;
  let dir = { x: 0, y: 0 };
  if (enemy && dist < 150 && p.dashTimer <= 0) {
    wantDash = true;
    dir = norm(enemy.x - p.x, enemy.y - p.y);
  } else if (enemy && dist < 70) {
    dir = norm(p.x - enemy.x, p.y - enemy.y);
  } else if (spark && sparkDist < 260) {
    dir = norm(spark.x - p.x, spark.y - p.y);
  } else if (enemy) {
    dir = norm(enemy.x - p.x, enemy.y - p.y);
  } else {
    dir = norm(480 - p.x, 300 - p.y);
  }
  return { dir, wantDash, wantFlare };
}

/** Run the world forward for `seconds` of play, or until `stop` says so. */
function simulate(world, seconds, stop) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const { dir, wantDash, wantFlare } = autopilot(world);
    world.step(SAMPLE, dir, wantDash, wantFlare, null, false);
    // The stop is checked before the autopilot spends the upgrade,
    // so a caller waiting for the upgrade screen actually sees it.
    if (stop && stop(world.state)) break;
    if (world.state.phase === 'upgrade') world.chooseUpgrade(0);
    if (world.state.phase === 'over' || world.state.phase === 'win') break;
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, false, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // A hurried player who never dashes: stand still and be caught.
    world.startWave(1);
    const steps = Math.floor(LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, false, null, false);
      if (world.state.phase === 'upgrade') world.chooseUpgrade(0);
      if (world.state.phase === 'over') break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'upgrade') {
    world.startWave(1);
    simulate(world, LIMIT_SECONDS, (s) => s.phase === 'upgrade');
    if (world.state.phase !== 'upgrade') world.beginUpgrade();
    return { screen: SCREEN_UPGRADE, best: world.state.score };
  }
  if (name === 'win') {
    world.startWave(10);
    simulate(world, LIMIT_SECONDS, (s) => s.phase === 'win');
    if (world.state.phase !== 'win') {
      // Fallback: the boss wave is long, so stage its final blow — the
      // boss alone, one hit from defeat, and the autopilot dashes in.
      const boss = world.state.enemies.find((e) => e.kind === 'boss');
      if (boss) {
        world.state.enemies = [boss];
        world.state.spawnQueue = [];
        boss.hp = 1;
        boss.x = world.state.player.x + 90;
        boss.y = world.state.player.y;
        const steps = Math.floor(30 / SAMPLE);
        for (let i = 0; i < steps; i += 1) {
          const { dir, wantDash, wantFlare } = autopilot(world);
          world.step(SAMPLE, dir, wantDash, wantFlare, null, false);
          if (world.state.phase === 'win') break;
        }
      }
    }
    return { screen: world.state.phase === 'win' ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  world.startWave(1);
  // The autopilot clears foes as fast as they spawn, so a head-count
  // condition only holds right after a wave spawns in: catch wave 2
  // the instant its roster is on the field, with the player below the
  // HUD. No extra waiting after the trigger — every further step only
  // thins the field out again.
  simulate(world, 60, (s) => s.wave >= 2 && s.enemies.length >= 4 && s.player.y > 130);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
