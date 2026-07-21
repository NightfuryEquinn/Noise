# Noise

3D / 4D Gaussian field studio — tweak simplex noise shaders with Leva.

```bash
bun install
bun run dev
```

## Features

- fBm or ridged multi-fractal displacement (3D / 4D simplex)
- Domain warp, detail layer, Gaussian remap, smoothing
- Named look presets, shareable URL state (`#s=…`)
- PNG + short WebM export
- Multi-type lighting, palettes, bloom

## Scripts

```bash
bun run dev         # Vite on :5173
bun run typecheck   # tsc --noEmit
bun run build       # typecheck + vite build
bun run preview
bun run check       # Playwright control→uniform smoke (needs bun run dev)
```
