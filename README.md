# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/mediabeyondatlas-dev/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/mediabeyondatlas-dev/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberlight — a 2D canvas wave-survival arena game. You are the last ember wisp in a night garden: dash through shadow enemies to banish them, collect sparks, charge the Flare meter for a screen-clearing nova, build a combo multiplier up to x5, and pick 1 of 3 upgrade cards after each wave (8 kinds: speed, dash cooldown, hearts, magnet, spark value, flare charge, fire trail, one revive). Survive 10 waves and defeat the Gloom Herald boss to win. Synthesized WebAudio sound effects, no network requests, runs offline from static files.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Play the game by serving `game/` with any static file server and opening `index.html` in a desktop browser:

```sh
npx serve game
```

Controls: WASD / arrows to move, Space or click to dash, F for Flare, P to pause, M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dk68ddnc&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
