// Emberlight — the world: state, waves, collisions, scoring.
// One file, one job: everything the game IS, nothing about how it looks
// or sounds. The renderer reads state; main.js feeds it input; the
// audio module is told what happened through the events this returns.
import { ENEMIES, FIELD, PALETTE, PLAYER, SPARK, STEP, WIN_WAVE, waveRoster, waveSpeedScale } from './config.js';
import { UPDATERS } from './enemies.js';
import { drawUpgrades } from './upgrades.js';

export const EVENT_NONE = 0;
export const EVENT_BANISH = 1;
export const EVENT_SPARK = 2;
export const EVENT_HURT = 4;
export const EVENT_FLARE = 8;
export const EVENT_WAVE = 16;
export const EVENT_UPGRADE = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;
export const EVENT_BOSS_HIT = 256;
export const EVENT_DASH = 512;

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    best: 0,
    wave: 0,
    phase: 'title', // title | play | upgrade | over | win
    hearts: 3,
    maxHearts: 3,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    flare: 0,
    flareReady: false,
    spawnQueue: [],
    spawnTimer: 0,
    waveTimer: 0,
    banner: '',
    bannerTimer: 0,
    shake: 0,
    flash: 0,
    upgradeChoices: [],
    takenUpgrades: {},
    kills: 0,
    playSeconds: 0,
    player: null,
    enemies: [],
    sparks: [],
    particles: [],
    trails: [],
    fireflies: [],
  };

  function freshPlayer() {
    return {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      radius: PLAYER.radius,
      speed: PLAYER.speed,
      dashCooldown: PLAYER.dashCooldown,
      dashTimer: 0,
      dashTime: 0,
      dashDirX: 1,
      dashDirY: 0,
      invuln: 0,
      magnetRadius: PLAYER.magnetRadius,
      flareGain: 1,
      sparkValue: 1,
      trail: 0,
      secondWind: false,
      usedSecondWind: false,
      faceX: 1,
      faceY: 0,
    };
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.wave = 0;
    state.phase = 'title';
    state.hearts = 3;
    state.maxHearts = 3;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.flare = 0;
    state.flareReady = false;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.waveTimer = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.upgradeChoices = [];
    state.takenUpgrades = {};
    state.kills = 0;
    state.playSeconds = 0;
    state.player = freshPlayer();
    state.enemies = [];
    state.sparks = [];
    state.particles = [];
    state.trails = [];
    state.fireflies = [];
    for (let i = 0; i < 26; i += 1) {
      state.fireflies.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        phase: random.range(0, Math.PI * 2),
        speed: random.range(0.2, 0.7),
        size: random.range(1, 2.6),
      });
    }
  }

  function edgePoint() {
    const side = random.int(0, 3);
    const m = 30;
    if (side === 0) return { x: random.range(m, FIELD.width - m), y: m };
    if (side === 1) return { x: random.range(m, FIELD.width - m), y: FIELD.height - m };
    if (side === 2) return { x: m, y: random.range(m, FIELD.height - m) };
    return { x: FIELD.width - m, y: random.range(m, FIELD.height - m) };
  }

  function spawnEnemy(kind, x, y) {
    const def = ENEMIES[kind];
    const at = x === undefined ? edgePoint() : { x, y };
    const enemy = {
      kind,
      x: at.x,
      y: at.y,
      radius: def.radius,
      speed: def.speed * waveSpeedScale(state.wave),
      hp: def.hp || 1,
      color: def.color,
      seed: random.range(0, Math.PI * 2),
      heading: random.range(0, Math.PI * 2),
      state: 'stalk',
      timer: random.range(1, 2),
      aimX: 0,
      aimY: 0,
      hitFlash: 0,
      spawnTimer: 4,
    };
    state.enemies.push(enemy);
    return enemy;
  }

  function startWave(wave) {
    state.wave = wave;
    const roster = waveRoster(wave);
    state.spawnQueue = [];
    for (let i = 0; i < roster.count; i += 1) {
      state.spawnQueue.push(random.pick(roster.kinds));
    }
    if (wave === WIN_WAVE) state.spawnQueue.push('boss');
    state.spawnTimer = 0.5;
    state.banner = wave === WIN_WAVE ? 'THE GLOOM HERALD' : `WAVE ${wave}`;
    state.bannerTimer = 2.2;
    state.phase = 'play';
  }

  function beginUpgrade() {
    state.upgradeChoices = drawUpgrades(random, state.takenUpgrades);
    state.phase = 'upgrade';
  }

  function heal(amount) {
    state.hearts = Math.min(state.maxHearts, state.hearts + amount);
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.3, 0.7),
        maxLife: 0.7,
        size: random.range(2, 4.5),
        color,
      });
    }
  }

  function addScore(base) {
    state.score += Math.round(base * state.multiplier);
  }

  function dropSparks(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const dist = random.range(6, 26);
      state.sparks.push({
        x: Math.max(14, Math.min(FIELD.width - 14, x + Math.cos(angle) * dist)),
        y: Math.max(14, Math.min(FIELD.height - 14, y + Math.sin(angle) * dist)),
        vx: Math.cos(angle) * 30,
        vy: Math.sin(angle) * 30,
        life: SPARK.lifetime,
        phase: random.range(0, Math.PI * 2),
      });
    }
  }

  // Banish one enemy: score, combo, sparks, and what it leaves behind.
  function banishEnemy(enemy, index) {
    const def = ENEMIES[enemy.kind];
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = 2.5;
    state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 4) * 0.5);
    addScore(def.score);
    state.flare = Math.min(1, state.flare + PLAYER.flarePerBanish * state.player.flareGain);
    if (state.flare >= 1) state.flareReady = true;
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 40 : 14, 160);
    if (enemy.kind === 'splitter') {
      spawnEnemy('motelet', enemy.x - 14, enemy.y);
      spawnEnemy('motelet', enemy.x + 14, enemy.y);
    } else if (enemy.kind !== 'boss') {
      dropSparks(enemy.x, enemy.y, enemy.kind === 'wisp' ? 2 : 1);
    }
    return EVENT_BANISH;
  }

  // The nova: everything on screen is banished, the boss takes 2 damage.
  function flare() {
    if (!state.flareReady) return EVENT_NONE;
    state.flare = 0;
    state.flareReady = false;
    state.flash = 0.5;
    state.shake = 10;
    let events = EVENT_FLARE;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.kind === 'boss') {
        enemy.hp -= 2;
        enemy.hitFlash = 0.4;
        if (enemy.hp <= 0) events |= banishEnemy(enemy, i);
      } else {
        events |= banishEnemy(enemy, i);
      }
    }
    return events;
  }

  function tryDash(dirX, dirY) {
    const p = state.player;
    if (p.dashTimer > 0) return false;
    p.dashTimer = p.dashCooldown;
    p.dashTime = PLAYER.dashTime;
    p.dashDirX = dirX;
    p.dashDirY = dirY;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
    burst(p.x, p.y, PALETTE.ember, 8, 120);
    return true;
  }

  function chooseUpgrade(index) {
    const card = state.upgradeChoices[index];
    if (!card) return false;
    state.takenUpgrades[card.id] = (state.takenUpgrades[card.id] || 0) + 1;
    card.apply(state.player, { heal });
    state.upgradeChoices = [];
    startWave(state.wave + 1);
    return true;
  }

  function updatePlayer(dt, dir, wantDash, wantFlare, dashTarget) {
    const p = state.player;
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    let events = EVENT_NONE;
    if (wantFlare) events |= flare();
    if (wantDash && p.dashTimer <= 0) {
      let dx = dir.x;
      let dy = dir.y;
      if (dx === 0 && dy === 0 && dashTarget) {
        dx = dashTarget.x - p.x;
        dy = dashTarget.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
      }
      if (dx !== 0 || dy !== 0) {
        if (tryDash(dx, dy)) state.lastDashSound = true;
      }
    }
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashDirX * PLAYER.dashSpeed * dt;
      p.y += p.dashDirY * PLAYER.dashSpeed * dt;
      if (p.trail > 0) {
        state.trails.push({ x: p.x, y: p.y, life: 0.6 * p.trail, maxLife: 0.6 * p.trail, radius: 16 });
      }
    } else {
      p.vx = dir.x * p.speed;
      p.vy = dir.y * p.speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (dir.x !== 0 || dir.y !== 0) {
        p.faceX = dir.x;
        p.faceY = dir.y;
      }
    }
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y));
    return events;
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const enemy of state.enemies) {
      UPDATERS[enemy.kind](enemy, p, dt, state.time);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.kind === 'boss') {
        enemy.spawnTimer -= dt;
        if (enemy.spawnTimer <= 0 && state.enemies.length < 14) {
          enemy.spawnTimer = 4;
          spawnEnemy('wisp', enemy.x + 40, enemy.y);
        }
      }
    }
    // Burning dash trails banish whatever they touch.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      for (const trail of state.trails) {
        if (Math.hypot(enemy.x - trail.x, enemy.y - trail.y) < enemy.radius + trail.radius) {
          if (enemy.kind === 'boss') {
            enemy.hp -= 1;
            enemy.hitFlash = 0.4;
            trail.life = 0;
            if (enemy.hp <= 0) banishEnemy(enemy, i);
          } else {
            banishEnemy(enemy, i);
          }
          break;
        }
      }
    }
  }

  function updateSparks(dt) {
    const p = state.player;
    for (let i = state.sparks.length - 1; i >= 0; i -= 1) {
      const spark = state.sparks[i];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.92;
      spark.vy *= 0.92;
      const dx = p.x - spark.x;
      const dy = p.y - spark.y;
      const dist = Math.hypot(dx, dy);
      if (dist < p.magnetRadius) {
        spark.x += (dx / (dist || 1)) * 260 * dt;
        spark.y += (dy / (dist || 1)) * 260 * dt;
      }
      if (dist < p.radius + SPARK.radius + 4) {
        state.sparks.splice(i, 1);
        addScore(SPARK.score * p.sparkValue);
        state.flare = Math.min(1, state.flare + PLAYER.flarePerSpark * p.flareGain);
        if (state.flare >= 1) state.flareReady = true;
        burst(spark.x, spark.y, PALETTE.mote, 5, 80);
        state.sparkSound = true;
        continue;
      }
      if (spark.life <= 0) state.sparks.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.trails.length - 1; i >= 0; i -= 1) {
      const trail = state.trails[i];
      trail.life -= dt;
      if (trail.life <= 0) state.trails.splice(i, 1);
    }
    for (const fly of state.fireflies) {
      fly.phase += dt * fly.speed;
      fly.x += Math.sin(fly.phase) * 6 * dt;
      fly.y += Math.cos(fly.phase * 0.7) * 5 * dt;
    }
  }

  // One fixed step of the world. `attract` is true on the title screen,
  // where the world idles behind the menu and nothing can hurt you.
  function step(dt, dir, wantDash, wantFlare, dashTarget, attract) {
    state.time += dt;
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.flash = Math.max(0, state.flash - dt * 1.6);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    updateParticles(dt);
    if (attract) {
      for (const enemy of state.enemies) UPDATERS[enemy.kind](enemy, state.player, dt, state.time);
      return EVENT_NONE;
    }
    state.playSeconds += dt;
    let events = EVENT_NONE;
    state.lastDashSound = false;
    state.sparkSound = false;
    events |= updatePlayer(dt, dir, wantDash, wantFlare, dashTarget);
    if (state.lastDashSound) events |= EVENT_DASH;
    if (state.sparkSound) events |= EVENT_SPARK;

    // Trickle the wave's roster in, a few at a time.
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = 0.7;
        spawnEnemy(state.spawnQueue.shift());
      }
    }
    updateEnemies(dt);
    updateSparks(dt);

    // Dashing through a foe banishes it; touching one any other way hurts.
    const p = state.player;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (dist > enemy.radius + p.radius + 2) continue;
      if (p.dashTime > 0) {
        if (enemy.kind === 'boss') {
          if (enemy.hitFlash <= 0) {
            enemy.hp -= 1;
            enemy.hitFlash = 0.6;
            burst(enemy.x, enemy.y, PALETTE.boss, 18, 200);
            events |= EVENT_BOSS_HIT;
            if (enemy.hp <= 0) events |= banishEnemy(enemy, i);
          }
        } else {
          events |= banishEnemy(enemy, i);
        }
      } else if (p.invuln <= 0) {
        state.hearts -= 1;
        p.invuln = PLAYER.hurtInvuln;
        state.combo = 0;
        state.multiplier = 1;
        state.shake = 12;
        burst(p.x, p.y, PALETTE.danger, 18, 200);
        events |= EVENT_HURT;
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        p.x += (dx / len) * 26;
        p.y += (dy / len) * 26;
        if (state.hearts <= 0) {
          if (p.secondWind && !p.usedSecondWind) {
            p.usedSecondWind = true;
            state.hearts = 1;
            p.invuln = 2;
            state.banner = 'SECOND WIND';
            state.bannerTimer = 2;
          } else {
            state.phase = 'over';
            return events | EVENT_OVER;
          }
        }
      }
    }

    // Wave cleared: boss dead on wave 10 wins the game, otherwise the
    // upgrade choice opens the next wave.
    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      if (state.wave >= WIN_WAVE) {
        state.phase = 'win';
        return events | EVENT_WIN;
      }
      events |= EVENT_WAVE;
      beginUpgrade();
    }
    return events;
  }

  return { state, reset, startWave, beginUpgrade, heal, burst, addScore, banishEnemy, flare, tryDash, chooseUpgrade, step };
}
