# Local Dependencies

`three-0.164.1.min.js` bundles Three.js 0.164.1 as a classic browser IIFE named `ThreeLibrary`, using esbuild 0.25.0. It works directly through `file://` without local ES-module CORS restrictions or a CDN. Only bundling/minification is applied. License: `three-LICENSE.txt` (MIT).

Upstream: https://github.com/mrdoob/three.js/tree/r164

Rebuild: `node scripts/build-three.cjs`, with Three.js 0.164.1 and esbuild 0.25.0 installed in `artifacts/routing-vendor/node_modules`.

`pathfinding-0.4.18.min.js` bundles PathFinding.js 0.4.18 and heap 0.2.5 without changes to their algorithms. It is generated as a browser IIFE named `PF` with esbuild 0.25.0. No network request is needed at game runtime.

Upstream: https://github.com/qiao/PathFinding.js

The complete upstream notices are retained in `pathfinding-README.md` (MIT) and `heap-README.md` (PSF license, JavaScript port). The only transformation is bundling/minification.

`simplex-noise-4.0.3.min.js` bundles simplex-noise 4.0.3 as a browser IIFE named `TerrainNoise`, using esbuild 0.25.0. It supplies seeded 2D noise for the flat landscape generator. The algorithm is unchanged; only bundling/minification is applied. License: `simplex-noise-LICENSE.txt` (MIT, Jonas Wagner).

Upstream: https://github.com/jwagner/simplex-noise.js
