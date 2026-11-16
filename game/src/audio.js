// Emberlight — every sound is synthesized with WebAudio, no audio files.
// One file, one job: nothing here knows about the game state; the world
// just calls play('dash') and this module decides what that sounds like.
export function createAudio() {
  let context = null;
  let muted = false;
  let drone = null;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      return null;
    }
    return context;
  }

  // A soft two-oscillator night drone that starts on the first gesture
  // and sits under everything, so the game never feels silent.
  function startDrone() {
    const ctx = ensure();
    if (!ctx || drone) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(ctx.destination);
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 110;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 164.81;
      const g2 = ctx.createGain();
      g2.gain.value = 0.4;
      o1.connect(gain);
      o2.connect(g2);
      g2.connect(gain);
      o1.start();
      o2.start();
      drone = { gain };
    } catch {
      // Audio is decoration; a failure here must never break the game.
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Ignore audio errors.
    }
  }

  function noise(dur, vol, fromFreq, toFreq) {
    const ctx = ensure();
    if (!ctx || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(fromFreq || 1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(toFreq || 300, ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore audio errors.
    }
  }

  const SOUNDS = {
    dash() { noise(0.18, 0.22, 2400, 320); },
    banish() { tone(520, 0.14, 'triangle', 0.18, 180); noise(0.1, 0.1, 900, 2400); },
    spark() { tone(880, 0.09, 'sine', 0.1, 1320); },
    hurt() { tone(220, 0.3, 'sawtooth', 0.2, 70); noise(0.2, 0.15, 500, 120); },
    flare() { noise(0.5, 0.3, 400, 2400); tone(160, 0.5, 'sine', 0.25, 640); },
    wave() { tone(392, 0.16, 'triangle', 0.16); setTimeout(() => tone(523, 0.22, 'triangle', 0.16), 140); },
    upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.14), i * 90)); },
    over() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.12), i * 180)); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.15), i * 120)); },
    bossHit() { tone(140, 0.2, 'square', 0.16, 90); },
  };

  return {
    unlock() { ensure(); startDrone(); },
    play(name) { if (SOUNDS[name]) SOUNDS[name](); },
    toggleMute() {
      muted = !muted;
      if (drone) drone.gain.gain.value = muted ? 0 : 0.035;
      return muted;
    },
    get muted() { return muted; },
  };
}
