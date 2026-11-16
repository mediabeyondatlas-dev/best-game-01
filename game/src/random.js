// Emberlight — a small seeded random source.
// The game never calls Math.random directly: a seeded stream makes the
// screenshot scenes deterministic (same seed, same frame, every time)
// and lets a run be replayed exactly.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return {
    // Next float in [0, 1).
    next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    },
    // Next float in [min, max).
    range(min, max) {
      return min + this.next() * (max - min);
    },
    // Next integer in [min, max].
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    // Pick one element of an array.
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
    // True with probability p.
    chance(p) {
      return this.next() < p;
    },
  };
}
