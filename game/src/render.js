// Emberlight — everything the player sees, drawn on one canvas.
// One file, one job: given a world state and a screen name, paint it.
// It never changes the world; the world never draws anything.
import { FIELD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowDot(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff6b7a' : 'rgba(255,107,122,0.22)';
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    return { scale, ox, oy };
  }

  function drawBackground(state, time) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Stars.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i += 1) {
      const sx = (i * 137.5) % FIELD.width;
      const sy = (i * 89.3) % (FIELD.height * 0.55);
      ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 0.6 + i));
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    // Moon, low enough to stay clear of the HUD.
    glowDot(ctx, 862, 168, 55, '#f5edd0', 0.16);
    ctx.fillStyle = '#f5edd0';
    ctx.beginPath();
    ctx.arc(862, 168, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.skyTop;
    ctx.beginPath();
    ctx.arc(853, 162, 20, 0, Math.PI * 2);
    ctx.fill();
    // Rolling hills, far and near.
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.quadraticCurveTo(240, 400, 480, 462);
    ctx.quadraticCurveTo(720, 512, 960, 452);
    ctx.lineTo(960, 600);
    ctx.lineTo(0, 600);
    ctx.fill();
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, 530);
    ctx.quadraticCurveTo(300, 480, 620, 528);
    ctx.quadraticCurveTo(820, 556, 960, 522);
    ctx.lineTo(960, 600);
    ctx.lineTo(0, 600);
    ctx.fill();
    // Fireflies drifting over the field.
    for (const fly of state.fireflies) {
      const tw = 0.35 + 0.4 * Math.abs(Math.sin(fly.phase * 2));
      glowDot(ctx, fly.x, fly.y, 7, '#ffe9a8', tw * 0.5);
    }
    // Vignette: the edges of the night are darker than the middle.
    const vg = ctx.createRadialGradient(480, 300, 220, 480, 300, 620);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,4,16,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTrails(state) {
    for (const trail of state.trails) {
      const a = Math.max(0, trail.life / trail.maxLife);
      glowDot(ctx, trail.x, trail.y, trail.radius * (0.7 + a * 0.5), PALETTE.emberHot, a * 0.5);
    }
  }

  function drawSparks(state, time) {
    for (const spark of state.sparks) {
      const pulse = 1 + 0.25 * Math.sin(time * 6 + spark.phase);
      const r = 7 * pulse;
      glowDot(ctx, spark.x, spark.y, 20, PALETTE.mote, 0.35);
      ctx.save();
      ctx.translate(spark.x, spark.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.mote;
      ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
      ctx.restore();
    }
  }

  function drawEnemies(state, time) {
    for (const enemy of state.enemies) {
      const flash = enemy.hitFlash > 0;
      const telegraph = enemy.kind === 'lunger' && enemy.state === 'aim';
      glowDot(ctx, enemy.x, enemy.y, enemy.radius * 2.4, enemy.color, telegraph ? 0.55 : 0.32);
      ctx.fillStyle = flash ? '#ffffff' : enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      // A darker core and two glowing eyes make every foe read as a face.
      ctx.fillStyle = 'rgba(10,8,30,0.55)';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      const eyeY = enemy.y - enemy.radius * 0.18;
      const eyeDX = enemy.radius * 0.36;
      ctx.fillStyle = telegraph ? '#ff5d5d' : '#ffe9a8';
      ctx.beginPath();
      ctx.arc(enemy.x - eyeDX, eyeY, 2.6, 0, Math.PI * 2);
      ctx.arc(enemy.x + eyeDX, eyeY, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (enemy.kind === 'boss') {
        ctx.strokeStyle = PALETTE.boss;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 8 + 2 * Math.sin(time * 3), 0, Math.PI * 2);
        ctx.stroke();
        const w = 90;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 18, w, 6);
        ctx.fillStyle = PALETTE.boss;
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 18, w * (enemy.hp / 5), 6);
      }
    }
  }

  function drawPlayer(state, time) {
    const p = state.player;
    if (!p) return;
    const flicker = 1 + 0.12 * Math.sin(time * 11) + 0.06 * Math.sin(time * 23);
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (!blink) {
      glowDot(ctx, p.x, p.y, 64 * flicker, PALETTE.ember, 0.5);
      glowDot(ctx, p.x, p.y, 30 * flicker, PALETTE.emberHot, 0.7);
      // Flame tail, streaming behind the direction of travel.
      ctx.fillStyle = PALETTE.emberHot;
      ctx.beginPath();
      ctx.moveTo(p.x - p.faceX * 12, p.y - p.faceY * 12);
      ctx.quadraticCurveTo(
        p.x - p.faceX * 30 + Math.sin(time * 9) * 6, p.y - p.faceY * 30 + Math.cos(time * 8) * 6,
        p.x - p.faceX * 40, p.y - p.faceY * 40,
      );
      ctx.quadraticCurveTo(
        p.x - p.faceX * 30 - Math.sin(time * 9) * 6, p.y - p.faceY * 30 - Math.cos(time * 8) * 6,
        p.x - p.faceX * 12, p.y - p.faceY * 12,
      );
      ctx.fill();
      ctx.fillStyle = PALETTE.emberCore;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.beginPath();
      ctx.arc(p.x - 3.5, p.y - 1.5, 1.8, 0, Math.PI * 2);
      ctx.arc(p.x + 3.5, p.y - 1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dash cooldown ring around the player.
    const p2 = state.player;
    const frac = 1 - p2.dashTimer / p2.dashCooldown;
    if (frac < 1) {
      ctx.strokeStyle = 'rgba(255,179,71,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(8,10,28,0.55)';
    roundRect(ctx, 0, 0, FIELD.width, 46, 0);
    ctx.fill();
    // Hearts.
    for (let i = 0; i < state.maxHearts; i += 1) drawHeart(ctx, 28 + i * 30, 24, 15, i < state.hearts);
    // Score.
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${state.score}`, 190, 24);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 400, 24);
    // Wave and foes left.
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const left = state.enemies.length + state.spawnQueue.length;
    ctx.fillText(state.wave === 0 ? 'WAVE —' : `WAVE ${state.wave}  ·  ${left} LEFT`, 620, 24);
    // Flare meter.
    const fx = 800;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, fx, 14, 120, 18, 9);
    ctx.fill();
    ctx.fillStyle = state.flareReady ? PALETTE.flare : PALETTE.ember;
    if (state.flare > 0) {
      roundRect(ctx, fx, 14, 120 * state.flare, 18, 9);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.flareReady ? 'FLARE READY [F]' : 'FLARE', fx, 42);
    // Combo multiplier, when it is worth showing.
    if (state.multiplier > 1) {
      ctx.fillStyle = PALETTE.mote;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`x${state.multiplier.toFixed(1)} COMBO`, FIELD.width - 16, 76);
    }
    ctx.textAlign = 'left';
  }

  function drawBanner(state) {
    if (state.bannerTimer <= 0 || !state.banner) return;
    const a = Math.min(1, state.bannerTimer / 0.6);
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.banner, FIELD.width / 2, 130);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function dimScreen(alpha) {
    ctx.fillStyle = `rgba(5,7,20,${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dimScreen(0.45);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glowDot(ctx, FIELD.width / 2, 190, 150, PALETTE.ember, 0.35);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '700 64px Georgia, serif';
    ctx.fillText('EMBERLIGHT', FIELD.width / 2, 180);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('Keep the last light burning.', FIELD.width / 2, 224);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('Dash through the gloom to banish it. Gather sparks. Survive 10 waves.', FIELD.width / 2, 268);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('WASD / Arrows — move      SPACE / Click — dash      F — flare      P — pause      M — mute', FIELD.width / 2, 320);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO BEGIN', FIELD.width / 2, 392);
    if (best > 0) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 432);
    }
    ctx.textAlign = 'left';
  }

  const ICONS = {
    wind(ctx, x, y, s) { ctx.strokeStyle = PALETTE.mote; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - s, y - s / 2); ctx.quadraticCurveTo(x, y - s, x + s, y - s / 2); ctx.moveTo(x - s, y + s / 3); ctx.quadraticCurveTo(x, y, x + s, y + s / 3); ctx.stroke(); },
    bolt(ctx, x, y, s) { ctx.fillStyle = PALETTE.ember; ctx.beginPath(); ctx.moveTo(x + s / 3, y - s); ctx.lineTo(x - s / 2, y); ctx.lineTo(x, y); ctx.lineTo(x - s / 3, y + s); ctx.lineTo(x + s / 2, y - s / 6); ctx.lineTo(x, y - s / 6); ctx.closePath(); ctx.fill(); },
    heart(ctx, x, y, s) { drawHeart(ctx, x, y, s * 1.4, true); },
    magnet(ctx, x, y, s) { ctx.strokeStyle = PALETTE.danger; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, s * 0.8, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - s * 0.8, y); ctx.lineTo(x - s * 0.8, y + s * 0.6); ctx.moveTo(x + s * 0.8, y); ctx.lineTo(x + s * 0.8, y + s * 0.6); ctx.stroke(); },
    star(ctx, x, y, s) { ctx.fillStyle = PALETTE.mote; ctx.beginPath(); for (let i = 0; i < 5; i += 1) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); const a2 = a + Math.PI / 5; ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.lineTo(x + Math.cos(a2) * s * 0.45, y + Math.sin(a2) * s * 0.45); } ctx.closePath(); ctx.fill(); },
    sun(ctx, x, y, s) { ctx.fillStyle = PALETTE.flare; ctx.beginPath(); ctx.arc(x, y, s * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = PALETTE.flare; ctx.lineWidth = 3; for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.75, y + Math.sin(a) * s * 0.75); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); } },
    flame(ctx, x, y, s) { ctx.fillStyle = PALETTE.emberHot; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.2, x + s * 0.4, y + s * 0.5); ctx.quadraticCurveTo(x, y + s * 0.8, x - s * 0.4, y + s * 0.5); ctx.quadraticCurveTo(x - s * 0.8, y - s * 0.2, x, y - s); ctx.fill(); },
    wing(ctx, x, y, s) { ctx.fillStyle = PALETTE.text; ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.4); ctx.quadraticCurveTo(x - s * 0.4, y - s, x + s * 0.4, y - s * 0.4); ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.2, x + s, y + s * 0.5); ctx.quadraticCurveTo(x, y + s * 0.8, x - s, y + s * 0.4); ctx.fill(); },
  };

  function drawUpgrade(state) {
    dimScreen(0.6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 34px Georgia, serif';
    ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 110);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('Choose one blessing before the next wave.', FIELD.width / 2, 150);
    const cards = state.upgradeChoices;
    const w = 240;
    const h = 220;
    const gap = 28;
    const total = cards.length * w + (cards.length - 1) * gap;
    const x0 = (FIELD.width - total) / 2;
    const y0 = 210;
    cards.forEach((card, i) => {
      const x = x0 + i * (w + gap);
      ctx.fillStyle = PALETTE.card;
      roundRect(ctx, x, y0, w, h, 14);
      ctx.fill();
      ctx.strokeStyle = PALETTE.cardEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y0, w, h, 14);
      ctx.stroke();
      if (ICONS[card.icon]) ICONS[card.icon](ctx, x + w / 2, y0 + 62, 22);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText(card.name, x + w / 2, y0 + 122);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(card.text, x + w / 2, y0 + 154);
      ctx.fillStyle = PALETTE.ember;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Press ${i + 1} or click`, x + w / 2, y0 + 190);
    });
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score}   ·   Hearts ${state.hearts}/${state.maxHearts}`, FIELD.width / 2, 480);
    ctx.textAlign = 'left';
  }

  function drawPaused(state) {
    dimScreen(0.6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 44px Georgia, serif';
    ctx.fillText('PAUSED', FIELD.width / 2, 270);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep playing.', FIELD.width / 2, 320);
    ctx.textAlign = 'left';
  }

  function drawOver(state, best) {
    dimScreen(0.62);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = '700 52px Georgia, serif';
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 220);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(`You reached wave ${state.wave} and banished ${state.kills} foes.`, FIELD.width / 2, 282);
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, 336);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(`Best ${best}`, FIELD.width / 2, 372);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO TRY AGAIN', FIELD.width / 2, 436);
    ctx.textAlign = 'left';
  }

  function drawWin(state, best) {
    dimScreen(0.55);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glowDot(ctx, FIELD.width / 2, 210, 180, PALETTE.flare, 0.4);
    ctx.fillStyle = PALETTE.flare;
    ctx.font = '700 52px Georgia, serif';
    ctx.fillText('DAWN BREAKS', FIELD.width / 2, 200);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('The Gloom Herald is gone. The garden glows again.', FIELD.width / 2, 250);
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(`10 waves cleared  ·  ${state.kills} foes banished  ·  ${Math.floor(state.playSeconds)}s`, FIELD.width / 2, 300);
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, 348);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(`Best ${best}`, FIELD.width / 2, 384);
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('PRESS SPACE OR CLICK TO PLAY AGAIN', FIELD.width / 2, 444);
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05071a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const { scale, ox, oy } = fit();
    // A hit shakes the whole field for a beat.
    const shx = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shy = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.setTransform(scale, 0, 0, scale, ox + shx * scale, oy + shy * scale);
    drawBackground(state, state.time);
    drawTrails(state);
    drawSparks(state, state.time);
    drawEnemies(state, state.time);
    if (screen !== SCREEN_TITLE) drawPlayer(state, state.time);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) drawHud(state, best);
    if (screen === SCREEN_PLAY) drawBanner(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_UPGRADE) drawUpgrade(state);
    if (screen === SCREEN_PAUSED) drawPaused(state);
    if (screen === SCREEN_OVER) drawOver(state, best);
    if (screen === SCREEN_WIN) drawWin(state, best);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,233,168,${state.flash * 0.55})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
  }

  return { draw, fit };
}
