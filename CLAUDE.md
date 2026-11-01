# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Libre Transport Tycoon: a self-contained, OpenTTD-inspired transport tycoon game in the browser (3D only, WebGL via Three.js). It has no build step, no `package.json` and no server. Open `index.html` directly over `file://`. All libraries and model data are vendored locally. **The game must never fetch anything from the network at runtime**, and `tests/browser-startup.cjs` checks this. The UI text, README and OPENTTD-AUDIT.md are in German, written with ASCII umlaut substitutes (`ae`, `oe`, `ue`, `ss`). Keep that convention in user-facing strings.

## Workflow and documentation (user requirement)

- **Commit early and often**, locally, in small logical steps (e.g. feature, then tests, then docs). Commit messages are in German. Don't push unless asked.
- With every change, keep these files current (German, ASCII umlaut substitutes):
  - `fachlich.md`: game rules and controls from the player's point of view (costs, speeds, limits, gestures). This is the feature spec.
  - `technisch.md`: architecture, implementation details, save compatibility, dependencies, the test list and the test environment. Add each new test to its "Testliste".
  - `devlog.md`: dated entries, newest first. Record what changed and why, test results, and open points.
  - `sw.js`: when a page starts loading a new file, add it to `FILES` and bump `VERSION`, otherwise the installed app breaks offline (`tests/browser-pwa.cjs` checks this).
  - `help.html`: the in-game player guide with SVG diagrams. Update it whenever rules or controls change. Its passing-loop recipe is verified by `tests/passing-loop.cjs`.
  - `README.md`: short entry point with start, feature overview and links. Update it when the overview or the controls change.
- `OPENTTD-AUDIT.md` tracks the differences from OpenTTD.

This workspace is a XaresAICoder container (see `AGENTS.md`). If you need to serve the game over HTTP, bind to `0.0.0.0`. Normally it isn't needed, because the game runs from `file://`.

## Commands

Each test is a standalone Node script. There is no test runner or framework, and there is no linter.

```bash
node tests/railway.cjs           # run a single test from the project root (browser tests resolve index.html/artifacts/ relative to cwd) (exit code 0 = pass; asserts via node:assert/strict)
for t in tests/*.cjs; do case $t in tests/browser*) continue;; esac; node "$t" || echo "FAIL $t"; done   # all non-browser tests
```

- The non-browser tests (`tests/<topic>.cjs`) need only Node (v22 available). Each one has a matching `tests/browser-<topic>.cjs`.
- Browser tests (`tests/browser*.cjs`) need `playwright` and `pngjs`. There is no `package.json`; they are installed untracked into the gitignored `node_modules/` via `npm install --no-save --no-package-lock playwright pngjs`, plus `npx playwright install chromium` (system libraries: `sudo env PATH="$PATH" npx playwright install-deps chromium`). The browser is the Windows Chrome path on win32, `$CHROME_PATH` if set, otherwise Playwright's bundled Chromium. They load `index.html` via `file://`, block all http(s) requests, run at desktop (1440) and mobile (390/320) viewports, do pixel checks, and write screenshots to `artifacts/` (gitignored).
- In this container there is no GPU, so WebGL is software-rendered on a shared, busy CPU. Measured: ~2 s per frame on the default map and ~23 s per frame at 128×96. Browser tests take minutes each, and `browser-construction`, `browser-coordinates` and `browser-landscape` (which switch to large maps) hit Playwright's 30 s action timeouts. These are environment failures, not game bugs. Make any timing-dependent test logic independent of frame rate, e.g. pass CDP `timestamp`s as `tests/browser-touch.cjs` does.
- Rebuild the vendored libraries and models only when needed. Both scripts need tooling in `artifacts/routing-vendor/node_modules` (three 0.164.1, esbuild 0.25.0):
  - `node scripts/build-three.cjs` builds `src/vendor/three-0.164.1.min.js` as an IIFE that exposes the global `ThreeLibrary`.
  - `node scripts/build-assets.mjs` builds `src/assets/models.js` and `manifest.json` from the Kenney packs in `artifacts/kenney/`. `models.js` is generated, so don't hand-edit it.

## Architecture

**Classic scripts that share one global scope.** No modules, no imports. `index.html` loads, in order: the vendor libraries (`ThreeLibrary`, `PF` pathfinding, `TerrainNoise` simplex) → `landscape.js` → `assets/models.js` → `models.js` → `towns.js` → `railway.js` → `construction.js` → `physics.js` → `game.js` → `management.js`. Every top-level `const`/`function` is effectively global, and files call each other freely. Function declarations are hoisted across script boundaries only at call time, so top-level code must not call into files that load later.

- `game.js` is the core: the `config` and `game` state objects, map generation, building, routing (`findPath`/`findBestRoute`), vehicles and cargo, monthly accounting, the Three.js renderer (the `three` object, scene build/rebuild, instancing, cab camera), UI, input events, and the `frame` loop. It ends with a bare `init();`.
- `management.js` handles saves (`createSave` / `decodeSave` validation / `restoreSave`; localStorage keys `libre-transport-save-v1` and `libre-transport-previous-world-v1`, with autosave every 15 s), JSON import/export, the new-world/expand-map dialog, and the vehicle list and orders. It ends with a bare `initManagement();`.
- `railway.js`: the `traffic` state, block signals, PBS path reservations, and explicit track connections (the `links` bitmask: E=1, W=2, S=4, N=8; `links === undefined` means legacy auto-connect).
- `construction.js`: the preview → confirm build flow (`construction` state). Builds are atomic: everything is re-validated on confirm, and nothing is charged if validation fails.
- Map input lives in `bindMapTarget` (`game.js`). Touch (`pointerType === "touch"`) has its own path: one finger pans with glide, two fingers pan, pinch and twist, and the ground point under the fingers is re-anchored via `groundPointAt`. With the rail/road tools, drawing starts only once a single finger moves. While a finger draws (`three.touchDraw`), `renderBuildLoupe` draws a magnified second pass through `three.loupeCamera` into a scissored viewport, and `applyTouchDrawScroll` scrolls the map at the edges. The mouse and cab-view paths are separate and unchanged; the camera state is `three.orbit`.
- `physics.js`: acceleration, braking and curve speed limits. `towns.js`: monthly town growth. `landscape.js`: seeded, deterministic terrain generation and preview. `models.js`: decodes the quantized geometry in `assets/models.js` into Three.js geometries.

**How tests load code:** the unit tests `readFileSync` a subset of `src/*.js`, strip the trailing `init();` / `initManagement();` with a regex (`/\ninit(?:Management)?\(\);\s*$/`), concatenate the files, and run them in `vm.runInNewContext` with stub DOM objects. Two things follow from this:
- Keep `init();` and `initManagement();` as the literal last line of their files.
- Simulation logic must be callable without a real DOM or WebGL. Keep rendering and DOM access out of the simulation paths, or guard them.

**Backward compatibility is a hard requirement.** Old saves have to keep loading: saves without size, seed, signals, PBS, `links`, multi-tile stations or growth data, and old 2D saves too. New fields are added lazily (on first use or at month rollover) instead of being written into old saves at load time. `decodeSave` strictly validates every field, so new state fields need validation there and in `createSave`'s field list. Same seed + size + landscape type must keep producing the same world for a given generator version.
