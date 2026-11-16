// Emberlight — the upgrade cards offered between waves.
// One file, one job: the pool of choices, their caps, and what each one
// does to the player's stats. The world asks for three distinct cards
// and applies the one the player picks.
export const UPGRADES = [
  {
    id: 'swift',
    name: 'Swift Boots',
    icon: 'wind',
    text: '+12% move speed',
    max: 5,
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'dash',
    name: 'Quick Dash',
    icon: 'bolt',
    text: 'Dash recharges 15% faster',
    max: 4,
    apply(p) { p.dashCooldown = Math.max(0.45, p.dashCooldown * 0.85); },
  },
  {
    id: 'heart',
    name: 'Heart Vessel',
    icon: 'heart',
    text: '+1 max heart, heal 1',
    max: 5,
    apply(p, world) {
      p.maxHearts += 1;
      world.heal(1);
    },
  },
  {
    id: 'magnet',
    name: 'Spark Magnet',
    icon: 'magnet',
    text: '+40% spark pickup range',
    max: 4,
    apply(p) { p.magnetRadius *= 1.4; },
  },
  {
    id: 'bright',
    name: 'Bright Sparks',
    icon: 'star',
    text: 'Sparks are worth +1 score each',
    max: 3,
    apply(p) { p.sparkValue += 1; },
  },
  {
    id: 'flare',
    name: 'Flare Charge',
    icon: 'sun',
    text: 'Flare fills 25% faster',
    max: 3,
    apply(p) { p.flareGain *= 1.25; },
  },
  {
    id: 'trail',
    name: 'Trailblaze',
    icon: 'flame',
    text: 'Your dash leaves a burning trail',
    max: 2,
    apply(p) { p.trail += 1; },
  },
  {
    id: 'secondwind',
    name: 'Second Wind',
    icon: 'wing',
    text: 'Revive once at 1 heart',
    max: 1,
    apply(p) { p.secondWind = true; },
  },
];

// Three distinct cards the player has not maxed out yet, drawn at random.
export function drawUpgrades(random, taken) {
  const pool = UPGRADES.filter((u) => (taken[u.id] || 0) < u.max);
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(random.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}
