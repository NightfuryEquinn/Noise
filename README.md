# Noise Studio

Interactive WebGL studio for sculpting **3D / 4D simplex noise** fields on meshes. Tweak displacement, lighting, and color live with [Leva](https://github.com/pmndrs/leva), then share or export the result.

Built with React 19, Three.js, React Three Fiber, Vite, and Bun.

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). A shader boot screen appears first — click **Explore** once WebGL is ready.

## Features

- **Noise** — fBm or ridged multi-fractal; 3D or 4D simplex; frequency, amplitude, octaves, lacunarity, persistence, seed, and animated time
- **Layers** — domain warp and a secondary detail layer (add / mult / max blend)
- **Remap & smoothing** — optional Box–Muller Gaussian remap, curve, smoothstep, normal blend
- **Meshes** — sphere, torus, knot, box, or plane at adjustable subdivision; wireframe mode
- **Lighting** — directional, point, spot, or hemisphere; rim + specular; named light presets (studio, wax, overhead, rim, clay, lantern, stage)
- **Color** — gradient, normals, bands, or solid; palettes (cobalt, magma, viridis, mono, plasma, arctic); emissive
- **Bloom** — UnrealBloomPass with strength / radius / threshold
- **Looks** — full-scene presets: studio, ridge magma, warp plasma, gaussian arctic, ridge viridis
- **Share** — state encoded in the URL hash (`#s=…`); **copy link** writes a shareable URL
- **Export** — PNG still or ~3s WebM (VP9 when available)
- **Scene** — orbit camera, auto-rotate, palette-matched fog background

## Controls

All parameters live in the Leva panel:

| Folder | What it drives |
| --- | --- |
| Look | Named full-scene presets |
| Object | Mesh kind, subdivision, wireframe |
| Noise | Dimensions, style, fractal params, Gaussian, seed |
| Layers | Domain warp + detail layer |
| Smoothing | Curve, smoothstep, normal blend |
| Lighting | Light preset / type / key / rim / specular |
| Bloom | Post-process bloom |
| Color | Mode, palette, bands, emissive |
| Scene | Auto-rotate |

Actions: **copy link**, **export png**, **export video**, **new seed**, **reset all**.

## Scripts

```bash
bun run dev         # Vite on :5173
bun run typecheck   # tsc --noEmit
bun run build       # typecheck + vite build
bun run preview     # serve production build
bun run check       # Playwright control→uniform smoke (needs bun run dev)
```

`bun run check` drives Leva via `window.__setNoiseControls` and asserts shader uniforms match. Override the target with `NOISE_URL` (default `http://localhost:5173/`).

## Layout

```
src/
  app.tsx             # Scene, Leva schema, URL state, export
  loading.tsx         # Boot overlay + Explore CTA
  main.tsx
  styles.css
  types.ts            # NoiseState, uniforms, presets
  shaders/
    noise.ts          # Simplex fBm / ridged GLSL + displacement shaders
    loader.ts         # Minimal loader field shaders
scripts/
  check-controls.mjs  # Playwright smoke tests
```

## Credits

Simplex noise GLSL is based on the [Ashima Arts / Stefan Gustavson](https://github.com/ashima/webgl-noise) implementations (MIT).

## License

[MIT](LICENSE) © 2026 Yip (Equinn) Zi Xian
