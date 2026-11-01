# 3D Models

The local `icons/arrow-left-right.svg`, `icons/locate-fixed.svg`, `icons/eye.svg` and `icons/log-out.svg` UI icons are from Lucide 0.468.0 (ISC; original notice in `icons/LICENSE.txt`). Sources: https://github.com/lucide-icons/lucide/tree/0.468.0/icons. They are not part of the 30-model 3D library.

Selected models by **Kenney**, licensed **CC0 1.0**. Original license notices are retained in `licenses/`. Train Kit additionally credits Guus Vermeulen and Tony Schaer.

Sources verified on 2026-10-31:

- [City Kit (Suburban), 2.0](https://kenney.nl/assets/city-kit-suburban)
- [Nature Kit, 1.0](https://kenney.nl/assets/nature-kit)
- [City Kit (Industrial), 2.0](https://kenney.nl/assets/city-kit-industrial)
- [Train Kit, 1.1](https://kenney.nl/assets/train-kit)
- [Car Kit, 3.1](https://kenney.nl/assets/car-kit)

`manifest.json` lists every selected source OBJ, its SHA-256, palette variation, bounds and triangle count. `models.js` is generated geometry, not hand-authored model data. It is a local classic script so the game continues to work directly from `file://` without fetching GLB files or textures.

Preparation uses Three.js 0.164.1 OBJLoader/MTLLoader, PNG palette sampling and merged vertex colors. Models are centered, grounded, normalized and quantized. Front wheel groups determine +Z orientation when present. The coal payload is separated from the hopper; a recolored copy serves as grain. Original palette variations are used for houses. Simulation routes and collision footprints are not changed.

At runtime, vehicle visuals are fitted to the existing car spacing/track gauge; this is a stylized scale rather than an exact real-world scale. Repeated scenery is instanced, shared geometries are cached, and freight load visibility is driven by the existing simulation. There are no runtime GLB or texture fetches and no AI-generated images in this model set.

To rebuild: place the five original packs in `artifacts/kenney/{houses,nature,industry,train,cars}`, install Three.js 0.164.1 in `artifacts/routing-vendor`, make `pngjs` available to Node, and run `node scripts/build-assets.mjs` from the project root. No build step is needed to play.
