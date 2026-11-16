// Emberlight — how each kind of foe moves.
// One file, one job: given an enemy, the player and the clock, move it.
// The world owns spawning, collisions and health; this only steers.
import { FIELD } from './config.js';

function steerToward(enemy, target, speed, dt) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const len = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / len) * speed * dt;
  enemy.y += (dy / len) * speed * dt;
}

function keepInside(enemy) {
  const m = enemy.radius;
  enemy.x = Math.max(m, Math.min(FIELD.width - m, enemy.x));
  enemy.y = Math.max(m, Math.min(FIELD.height - m, enemy.y));
}

// A wisp hunts the player, a little wobbly so it never feels robotic.
export function updateWisp(enemy, player, dt, time) {
  steerToward(enemy, player, enemy.speed, dt);
  enemy.x += Math.sin(time * 2.1 + enemy.seed) * 14 * dt;
  enemy.y += Math.cos(time * 1.7 + enemy.seed) * 14 * dt;
  keepInside(enemy);
}

// A drifter wanders on its own heading and bounces off the field edge.
export function updateDrifter(enemy, _player, dt) {
  enemy.x += Math.cos(enemy.heading) * enemy.speed * dt;
  enemy.y += Math.sin(enemy.heading) * enemy.speed * dt;
  if (enemy.x < enemy.radius || enemy.x > FIELD.width - enemy.radius) enemy.heading = Math.PI - enemy.heading;
  if (enemy.y < enemy.radius || enemy.y > FIELD.height - enemy.radius) enemy.heading = -enemy.heading;
  keepInside(enemy);
}

// A splitter drifts slowly toward the player; its danger is what it
// leaves behind, not its speed.
export function updateSplitter(enemy, player, dt) {
  steerToward(enemy, player, enemy.speed * 0.7, dt);
  keepInside(enemy);
}

// A motelet is a fast little chaser with no wobble.
export function updateMotelet(enemy, player, dt) {
  steerToward(enemy, player, enemy.speed, dt);
  keepInside(enemy);
}

// A lunger stalks at walking pace, then telegraphs and lunges.
// Its state machine lives on the enemy: 'stalk' -> 'aim' -> 'lunge' -> 'rest'.
export function updateLunger(enemy, player, dt) {
  enemy.timer -= dt;
  if (enemy.state === 'stalk') {
    steerToward(enemy, player, enemy.speed * 0.8, dt);
    if (enemy.timer <= 0) {
      enemy.state = 'aim';
      enemy.timer = 0.55;
    }
  } else if (enemy.state === 'aim') {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.aimX = dx / len;
    enemy.aimY = dy / len;
    if (enemy.timer <= 0) {
      enemy.state = 'lunge';
      enemy.timer = 0.32;
    }
  } else if (enemy.state === 'lunge') {
    enemy.x += enemy.aimX * enemy.speed * 5.2 * dt;
    enemy.y += enemy.aimY * enemy.speed * 5.2 * dt;
    if (enemy.timer <= 0) {
      enemy.state = 'rest';
      enemy.timer = 0.9;
    }
  } else {
    if (enemy.timer <= 0) {
      enemy.state = 'stalk';
      enemy.timer = 1.4 + Math.random() * 0.8;
    }
  }
  keepInside(enemy);
}

// The Gloom Herald, boss of wave 10: slow chase, and every few seconds
// it calls a wisp to its side. The world spawns the wisp; this only moves.
export function updateBoss(enemy, player, dt, time) {
  steerToward(enemy, player, enemy.speed, dt);
  enemy.x += Math.sin(time * 0.9 + enemy.seed) * 10 * dt;
  enemy.y += Math.cos(time * 0.7 + enemy.seed) * 10 * dt;
  keepInside(enemy);
}

export const UPDATERS = {
  wisp: updateWisp,
  drifter: updateDrifter,
  splitter: updateSplitter,
  motelet: updateMotelet,
  lunger: updateLunger,
  boss: updateBoss,
};
