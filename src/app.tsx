import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VERTEX, FRAGMENT } from './shaders/noise';
import { LoadingScreen } from './loading';
import type {
  ColorMode,
  DetailBlend,
  LightPreset,
  LightPresetName,
  LightType,
  LookName,
  NoiseState,
  NoiseStyle,
  NoiseUniforms,
  ObjectKind,
  Palette,
  RimTint,
} from './types';

const PALETTES: Palette[] = [
  {
    name: 'cobalt',
    a: '#041526',
    c: '#0a5a6e',
    d: '#3ec8e0',
    b: '#d8f4ff',
    bg: '#03060c',
  },
  {
    name: 'magma',
    a: '#0a0102',
    c: '#8b0a00',
    d: '#ff6a00',
    b: '#fff4a8',
    bg: '#060201',
  },
  {
    name: 'viridis',
    a: '#061410',
    c: '#1a5c3a',
    d: '#6bbf4a',
    b: '#d4f5a0',
    bg: '#040a08',
  },
  {
    name: 'mono',
    a: '#0a0a0a',
    c: '#404040',
    d: '#a0a0a0',
    b: '#f4f4f4',
    bg: '#000000',
  },
  {
    name: 'plasma',
    a: '#0a0218',
    c: '#5b1fa8',
    d: '#ff2d8a',
    b: '#5ef0ff',
    bg: '#05020c',
  },
  {
    name: 'arctic',
    a: '#061820',
    c: '#1a5a6e',
    d: '#6ec8e0',
    b: '#e8f8ff',
    bg: '#030a10',
  },
];

const OBJECTS: ObjectKind[] = ['sphere', 'torus', 'knot', 'box', 'plane'];
const COLOR_MODES: ColorMode[] = ['gradient', 'normal', 'bands', 'solid'];
const DETAIL_BLEND: DetailBlend[] = ['add', 'mult', 'max'];
const RIM_TINTS: RimTint[] = ['cool', 'warm', 'white', 'palette'];
const LIGHT_TYPES: LightType[] = ['directional', 'point', 'spot', 'hemisphere'];
const NOISE_STYLES: NoiseStyle[] = ['fbm', 'ridged'];

const LIGHT_PRESETS: Record<LightPresetName, LightPreset> = {
  studio: {
    lightType: 'directional',
    ambient: 0.22,
    keyIntensity: 0.85,
    keyAz: 50,
    keyEl: 40,
    lightX: 2.2,
    lightY: 2.0,
    lightZ: 1.4,
    lightDistance: 6,
    spotAngle: 28,
    spotPenumbra: 0.35,
    lightColor: '#cfe8ff',
    rim: 1.15,
    spec: 0.85,
    specPower: 72,
  },
  wax: {
    lightType: 'directional',
    ambient: 0.10,
    keyIntensity: 0.85,
    keyAz: 90,
    keyEl: 30,
    lightX: 2.5,
    lightY: 1.2,
    lightZ: 0.2,
    lightDistance: 6,
    spotAngle: 28,
    spotPenumbra: 0.35,
    lightColor: '#ffe2c0',
    rim: 0.25,
    spec: 0.7,
    specPower: 48,
  },
  overhead: {
    lightType: 'point',
    ambient: 0.22,
    keyIntensity: 0.95,
    keyAz: 270,
    keyEl: 80,
    lightX: 0,
    lightY: 3.2,
    lightZ: 0,
    lightDistance: 7,
    spotAngle: 40,
    spotPenumbra: 0.4,
    lightColor: '#ffffff',
    rim: 0.30,
    spec: 0.0,
    specPower: 24,
  },
  rim: {
    lightType: 'directional',
    ambient: 0.05,
    keyIntensity: 0.30,
    keyAz: 60,
    keyEl: 20,
    lightX: -2.4,
    lightY: 0.8,
    lightZ: -1.6,
    lightDistance: 6,
    spotAngle: 28,
    spotPenumbra: 0.35,
    lightColor: '#cfe8ff',
    rim: 1.40,
    spec: 0.0,
    specPower: 24,
  },
  clay: {
    lightType: 'hemisphere',
    ambient: 0.35,
    keyIntensity: 0.70,
    keyAz: 60,
    keyEl: 60,
    lightX: 1.5,
    lightY: 2.5,
    lightZ: 1.5,
    lightDistance: 6,
    spotAngle: 35,
    spotPenumbra: 0.4,
    lightColor: '#ffffff',
    rim: 0.10,
    spec: 0.0,
    specPower: 24,
  },
  lantern: {
    lightType: 'point',
    ambient: 0.08,
    keyIntensity: 1.6,
    keyAz: 45,
    keyEl: 35,
    lightX: 1.4,
    lightY: 1.1,
    lightZ: 1.8,
    lightDistance: 4.5,
    spotAngle: 30,
    spotPenumbra: 0.3,
    lightColor: '#ffb060',
    rim: 0.35,
    spec: 0.45,
    specPower: 32,
  },
  stage: {
    lightType: 'spot',
    ambient: 0.06,
    keyIntensity: 1.8,
    keyAz: 40,
    keyEl: 55,
    lightX: 1.8,
    lightY: 3.4,
    lightZ: 2.2,
    lightDistance: 8,
    spotAngle: 22,
    spotPenumbra: 0.45,
    lightColor: '#fff4e0',
    rim: 0.55,
    spec: 0.35,
    specPower: 40,
  },
};

const DEFAULTS: NoiseState = {
  look: 'studio',
  object: 'sphere',
  detail: 288,
  wireframe: false,
  dimensions: 3,
  noiseStyle: 'fbm',
  frequency: 1.15,
  amplitude: 0.16,
  octaves: 4,
  lacunarity: 1.9,
  persistence: 0.42,
  timeSpeed: 0.38,
  gaussian: false,
  seed: 42,
  warpOn: true,
  warpFreq: 0.85,
  warpStrength: 0.38,
  detailOn: true,
  detailFreq: 2.8,
  detailAmp: 0.14,
  detailBlend: 'add',
  curve: 1.35,
  smoothstep: true,
  normalBlend: 0.55,
  lightPreset: 'studio',
  lightType: 'directional',
  ambient: 0.22,
  keyIntensity: 0.85,
  keyAz: 50,
  keyEl: 40,
  lightX: 2.2,
  lightY: 2.0,
  lightZ: 1.4,
  lightDistance: 6,
  spotAngle: 28,
  spotPenumbra: 0.35,
  lightColor: '#cfe8ff',
  rim: 1.15,
  spec: 0.85,
  specPower: 72,
  rimTint: 'cool',
  colorMode: 'gradient',
  palette: 'cobalt',
  bands: 6,
  emissive: 0,
  autoRotate: true,
  rotationSpeed: 0.16,
  bloomOn: true,
  bloomStrength: 0.7,
  bloomRadius: 0.5,
  bloomThreshold: 0.42,
};

// Named full-scene looks (noise + lighting + color together)
const LOOK_PRESETS: Record<LookName, NoiseState> = {
  // Organic liquid water ball — soft flowing fBm, wet Fresnel
  studio: { ...DEFAULTS },

  // Photosphere — soft granulation, self-glowing heat (no sharp ridges)
  'ridge magma': {
    ...DEFAULTS,
    look: 'ridge magma',
    object: 'sphere',
    detail: 288,
    dimensions: 3,
    noiseStyle: 'fbm',
    frequency: 1.6,
    amplitude: 0.12,
    octaves: 5,
    lacunarity: 1.95,
    persistence: 0.4,
    timeSpeed: 0.32,
    gaussian: false,
    seed: 17.4,
    warpOn: true,
    warpFreq: 0.7,
    warpStrength: 0.22,
    detailOn: true,
    detailFreq: 3.6,
    detailAmp: 0.18,
    detailBlend: 'add',
    curve: 1.4,
    smoothstep: true,
    normalBlend: 0.5,
    ...LIGHT_PRESETS.wax,
    lightPreset: 'wax',
    ambient: 0.45,
    keyIntensity: 0.55,
    rim: 0.35,
    rimTint: 'warm',
    colorMode: 'gradient',
    palette: 'magma',
    emissive: 1.8,
    bloomOn: true,
    bloomStrength: 1.35,
    bloomRadius: 0.75,
    bloomThreshold: 0.18,
    autoRotate: true,
    rotationSpeed: 0.12,
  },

  // Interdimensional portal — swirling 4D torus with ethereal glow
  'warp plasma': {
    ...DEFAULTS,
    look: 'warp plasma',
    object: 'torus',
    detail: 288,
    dimensions: 4,
    noiseStyle: 'fbm',
    frequency: 1.15,
    amplitude: 0.2,
    octaves: 4,
    lacunarity: 1.9,
    persistence: 0.45,
    timeSpeed: 0.48,
    seed: 63.2,
    warpOn: true,
    warpFreq: 1.2,
    warpStrength: 0.48,
    detailOn: true,
    detailFreq: 3.2,
    detailAmp: 0.16,
    detailBlend: 'mult',
    curve: 1.3,
    smoothstep: true,
    normalBlend: 0.5,
    ...LIGHT_PRESETS.rim,
    lightPreset: 'rim',
    ambient: 0.12,
    rim: 1.55,
    rimTint: 'palette',
    colorMode: 'gradient',
    palette: 'plasma',
    emissive: 1.2,
    bloomOn: true,
    bloomStrength: 1.45,
    bloomRadius: 0.8,
    bloomThreshold: 0.22,
    rotationSpeed: 0.32,
  },

  // Icy aurora knot — soft flowing ice, cool Fresnel glow
  'gaussian arctic': {
    ...DEFAULTS,
    look: 'gaussian arctic',
    object: 'knot',
    detail: 288,
    dimensions: 3,
    noiseStyle: 'fbm',
    frequency: 1.1,
    amplitude: 0.14,
    octaves: 4,
    lacunarity: 1.85,
    persistence: 0.4,
    timeSpeed: 0.26,
    gaussian: false,
    seed: 8.1,
    warpOn: true,
    warpFreq: 0.75,
    warpStrength: 0.32,
    detailOn: true,
    detailFreq: 2.4,
    detailAmp: 0.12,
    detailBlend: 'add',
    curve: 1.4,
    smoothstep: true,
    normalBlend: 0.58,
    ...LIGHT_PRESETS.overhead,
    lightPreset: 'overhead',
    ambient: 0.2,
    keyIntensity: 0.75,
    lightColor: '#d8f0ff',
    rim: 0.95,
    spec: 0.55,
    specPower: 56,
    rimTint: 'cool',
    colorMode: 'gradient',
    palette: 'arctic',
    emissive: 0.25,
    bloomOn: true,
    bloomStrength: 0.85,
    bloomRadius: 0.55,
    bloomThreshold: 0.38,
    rotationSpeed: 0.12,
  },

  // Living organic cube — soft fBm matter crawling over a box silhouette
  'ridge viridis': {
    ...DEFAULTS,
    look: 'ridge viridis',
    object: 'box',
    detail: 256,
    dimensions: 3,
    noiseStyle: 'fbm',
    frequency: 1.2,
    amplitude: 0.18,
    octaves: 4,
    lacunarity: 1.9,
    persistence: 0.42,
    timeSpeed: 0.2,
    seed: 41,
    warpOn: true,
    warpFreq: 0.9,
    warpStrength: 0.4,
    detailOn: true,
    detailFreq: 2.8,
    detailAmp: 0.14,
    detailBlend: 'add',
    curve: 1.35,
    smoothstep: true,
    normalBlend: 0.6,
    ...LIGHT_PRESETS.stage,
    lightPreset: 'stage',
    ambient: 0.14,
    rim: 0.5,
    rimTint: 'cool',
    colorMode: 'gradient',
    palette: 'viridis',
    emissive: 0.15,
    bloomOn: true,
    bloomStrength: 0.85,
    bloomRadius: 0.55,
    bloomThreshold: 0.35,
    rotationSpeed: 0.1,
  },
};

const STATE_KEYS = Object.keys(DEFAULTS) as (keyof NoiseState)[];

type BloomComposer = EffectComposer & { bloomPass: UnrealBloomPass };

// Picks only serializable control keys from a state object
function pickState(s: Partial<NoiseState>): Partial<NoiseState> {
  const out: Partial<NoiseState> = {};

  for (const k of STATE_KEYS) {
    if (s[k] !== undefined) {
      (out as Record<string, unknown>)[k] = s[k];
    }
  }

  return out;
}

// Encodes Leva state into a compact URL hash payload
function encodeState(s: NoiseState): string {
  const json = JSON.stringify(pickState(s));

  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decodes a URL hash payload back into a partial Leva state patch
function decodeState(raw: string): Partial<NoiseState> | null {
  if (!raw) return null;

  try {
    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const data: unknown = JSON.parse(json);

    if (!data || typeof data !== 'object') return null;

    const patch: Partial<NoiseState> = {};
    const record = data as Record<string, unknown>;

    for (const k of STATE_KEYS) {
      if (record[k] !== undefined) {
        (patch as Record<string, unknown>)[k] = record[k];
      }
    }

    return Object.keys(patch).length ? patch : null;
  } catch {
    return null;
  }
}

// Reads initial state from #s=… hash, falling back to DEFAULTS
function stateFromUrl(): NoiseState {
  const hash = window.location.hash || '';
  const m = hash.match(/[#&]s=([^&]*)/);

  if (!m?.[1]) return { ...DEFAULTS };

  const patch = decodeState(decodeURIComponent(m[1]));
  return patch ? { ...DEFAULTS, ...patch } : { ...DEFAULTS };
}

// Writes the current look into the URL hash without scrolling
function writeUrlState(s: NoiseState): void {
  const next = `#s=${encodeState(s)}`;
  if (window.location.hash === next) return;
  history.replaceState(null, '', next);
}

// Triggers a browser download for a blob or data URL
function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// Captures the WebGL canvas as a PNG download
function exportPng(): void {
  const canvas = document.querySelector('#root canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    downloadUrl(url, `noise-${Date.now()}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

// Records a short WebM loop from the canvas stream
async function exportVideo(seconds = 3): Promise<void> {
  const canvas = document.querySelector('#root canvas');
  if (!(canvas instanceof HTMLCanvasElement) || typeof MediaRecorder === 'undefined') return;

  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

  if (!mime) return;

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });

  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      downloadUrl(url, `noise-${Date.now()}.webm`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve();
    };
  });

  recorder.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  if (recorder.state !== 'inactive') recorder.stop();
  await done;
}

// Copies a shareable URL for the current look to the clipboard
async function copyShareLink(s: NoiseState): Promise<void> {
  writeUrlState(s);
  const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback for restricted clipboard contexts
    window.prompt('Copy share link', url);
  }
}

// Builds subdivided geometry for the selected object kind
function makeGeometry(kind: ObjectKind, detail: number): THREE.BufferGeometry {
  const d = Math.max(8, Math.min(512, detail | 0));

  switch (kind) {
    case 'torus':
      return new THREE.TorusGeometry(0.85, 0.32, Math.max(16, d / 2), d);
    case 'knot':
      return new THREE.TorusKnotGeometry(0.75, 0.26, d, Math.max(16, d / 8));
    case 'box': {
      // BoxGeometry duplicates edge verts with different normals/UVs. mergeVertices
      // hashes *all* attributes, so strip those first or corners never weld.
      const s = Math.max(16, Math.floor(d / 2));
      const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4, s, s, s);
      geo.deleteAttribute('normal');
      geo.deleteAttribute('uv');
      const welded = mergeVertices(geo);
      welded.computeVertexNormals();
      geo.dispose();
      return welded;
    }
    case 'plane':
      return new THREE.PlaneGeometry(2.4, 2.4, d, d);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(1, d, Math.max(16, d / 2));
  }
}

// Resolves a palette by name with a cobalt fallback
function findPalette(name: string): Palette {
  return PALETTES.find((x) => x.name === name) ?? PALETTES[0]!;
}

// Copies Leva state into shader uniforms (called every frame)
function syncUniforms(u: NoiseUniforms, s: NoiseState): void {
  u.uFrequency.value = s.frequency;
  u.uAmplitude.value = s.amplitude;
  u.uOctaves.value = s.octaves | 0;
  u.uLacunarity.value = s.lacunarity;
  u.uPersistence.value = s.persistence;
  u.uTimeSpeed.value = s.timeSpeed;
  u.uDimensions.value = s.dimensions | 0;
  u.uGaussian.value = s.gaussian ? 1 : 0;
  u.uNoiseStyle.value = Math.max(0, NOISE_STYLES.indexOf(s.noiseStyle));
  u.uSeed.value = s.seed;
  u.uWarpOn.value = s.warpOn ? 1 : 0;
  u.uWarpFreq.value = s.warpFreq;
  u.uWarpStrength.value = s.warpStrength;
  u.uDetailOn.value = s.detailOn ? 1 : 0;
  u.uDetailFreq.value = s.detailFreq;
  u.uDetailAmp.value = s.detailAmp;
  u.uDetailBlend.value = Math.max(0, DETAIL_BLEND.indexOf(s.detailBlend));
  u.uCurve.value = s.curve;
  u.uSmoothstep.value = s.smoothstep ? 1 : 0;
  u.uNormalBlend.value = s.normalBlend;
  u.uAmbient.value = s.ambient;
  u.uKeyIntensity.value = s.keyIntensity;
  u.uKeyDir.value.set((s.keyAz * Math.PI) / 180, (s.keyEl * Math.PI) / 180);
  u.uLightPos.value.set(s.lightX, s.lightY, s.lightZ);
  u.uLightType.value = Math.max(0, LIGHT_TYPES.indexOf(s.lightType));
  u.uLightColor.value.set(s.lightColor);
  u.uLightDistance.value = s.lightDistance;
  u.uSpotAngle.value = (s.spotAngle * Math.PI) / 180;
  u.uSpotPenumbra.value = s.spotPenumbra;
  u.uRimIntensity.value = s.rim;
  u.uSpec.value = s.spec;
  u.uSpecPower.value = s.specPower;
  u.uBands.value = s.bands;
  u.uColorMode.value = COLOR_MODES.indexOf(s.colorMode);

  const p = findPalette(s.palette);
  u.uColorA.value.set(p.a);
  u.uColorB.value.set(p.b);
  u.uColorC.value.set(p.c);
  u.uColorD.value.set(p.d);
  u.uBgColor.value.set(p.bg);
  u.uEmissive.value = s.emissive;

  const rimTints: Record<RimTint, string> = {
    cool: '#cfe8ff',
    warm: '#ffd6a3',
    white: '#ffffff',
    palette: p.b,
  };
  u.uRimColor.value.set(rimTints[s.rimTint] || '#ffffff');

  // Hemisphere sky borrows light color; ground stays warm/dark
  u.uHemiSky.value.set(s.lightColor);
  u.uHemiGround.value.set(p.a);
}

// Creates the initial shader uniform bag used by NoiseObject
function createUniforms(): NoiseUniforms {
  const cobalt = PALETTES[0]!;

  return {
    uTime: { value: 0 },
    uFrequency: { value: DEFAULTS.frequency },
    uAmplitude: { value: DEFAULTS.amplitude },
    uOctaves: { value: DEFAULTS.octaves },
    uLacunarity: { value: DEFAULTS.lacunarity },
    uPersistence: { value: DEFAULTS.persistence },
    uTimeSpeed: { value: DEFAULTS.timeSpeed },
    uDimensions: { value: DEFAULTS.dimensions },
    uGaussian: { value: 0 },
    uNoiseStyle: { value: 0 },
    uSeed: { value: 0 },
    uWarpOn: { value: 0 },
    uWarpFreq: { value: DEFAULTS.warpFreq },
    uWarpStrength: { value: DEFAULTS.warpStrength },
    uDetailOn: { value: 0 },
    uDetailFreq: { value: DEFAULTS.detailFreq },
    uDetailAmp: { value: DEFAULTS.detailAmp },
    uDetailBlend: { value: 0 },
    uCurve: { value: DEFAULTS.curve },
    uSmoothstep: { value: 0 },
    uNormalBlend: { value: DEFAULTS.normalBlend },
    uAmbient: { value: DEFAULTS.ambient },
    uKeyIntensity: { value: DEFAULTS.keyIntensity },
    uKeyDir: { value: new THREE.Vector2() },
    uLightPos: { value: new THREE.Vector3(DEFAULTS.lightX, DEFAULTS.lightY, DEFAULTS.lightZ) },
    uLightType: { value: 0 },
    uLightColor: { value: new THREE.Color(DEFAULTS.lightColor) },
    uLightDistance: { value: DEFAULTS.lightDistance },
    uSpotAngle: { value: (DEFAULTS.spotAngle * Math.PI) / 180 },
    uSpotPenumbra: { value: DEFAULTS.spotPenumbra },
    uHemiSky: { value: new THREE.Color('#d8e8ff') },
    uHemiGround: { value: new THREE.Color('#1a1410') },
    uRimIntensity: { value: DEFAULTS.rim },
    uSpec: { value: DEFAULTS.spec },
    uSpecPower: { value: DEFAULTS.specPower },
    uRimColor: { value: new THREE.Color('#cfe8ff') },
    uColorA: { value: new THREE.Color(cobalt.a) },
    uColorB: { value: new THREE.Color(cobalt.b) },
    uColorC: { value: new THREE.Color(cobalt.c) },
    uColorD: { value: new THREE.Color(cobalt.d) },
    uBgColor: { value: new THREE.Color(cobalt.bg) },
    uColorMode: { value: 0 },
    uBands: { value: DEFAULTS.bands },
    uEmissive: { value: DEFAULTS.emissive },
  };
}

// Displaced noise mesh driven by Leva-linked shader uniforms
function NoiseObject({ s }: { s: NoiseState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const sRef = useRef(s);
  sRef.current = s;

  const geometry = useMemo(() => makeGeometry(s.object, s.detail), [s.object, s.detail]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => createUniforms(), []);

  useFrame((_, dt) => {
    const cur = sRef.current;
    const matUniforms = matRef.current?.uniforms as NoiseUniforms | undefined;
    const u = matUniforms || uniforms;

    syncUniforms(u, cur);
    u.uTime.value += dt;

    if (import.meta.env.DEV) {
      window.__noiseUniforms = u;
      window.__noiseState = cur;
    }

    if (cur.autoRotate && meshRef.current) {
      meshRef.current.rotation.y += dt * cur.rotationSpeed;
      meshRef.current.rotation.x += dt * cur.rotationSpeed * 0.35;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        wireframe={s.wireframe}
        side={s.object === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

// Orbit camera with damping around the origin
function CameraRig() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    camera.position.set(0, 5.0, 3.2);
    camera.lookAt(0, 0, 0);
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 1.6;
    c.maxDistance = 8;
    c.enablePan = false;
    controlsRef.current = c;
    return () => c.dispose();
  }, [camera, gl]);

  useFrame(() => controlsRef.current?.update());
  return null;
}

// Solid fogged background matching the active palette
function Background({ palette }: { palette: Palette }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color(palette.bg);
    scene.fog = new THREE.Fog(new THREE.Color(palette.bg), 6, 14);
  }, [scene, palette]);

  return null;
}

// Bloom post-process that takes over R3F's default render loop while mounted
function Bloom({ s }: { s: NoiseState }) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl) as BloomComposer;
    c.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width || 1, size.height || 1),
      s.bloomStrength,
      s.bloomRadius,
      s.bloomThreshold,
    );
    c.addPass(bloom);
    c.bloomPass = bloom;
    return c;
    // bloom params are synced in effects below; recreate only on renderer/scene/camera change
  }, [gl, scene, camera]);

  useEffect(() => () => composer.dispose(), [composer]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    composer.bloomPass.setSize?.(size.width, size.height);
  }, [size, composer]);

  useEffect(() => {
    composer.bloomPass.strength = s.bloomStrength;
    composer.bloomPass.radius = s.bloomRadius;
    composer.bloomPass.threshold = s.bloomThreshold;
  }, [s.bloomStrength, s.bloomRadius, s.bloomThreshold, composer]);

  useFrame((_, dt) => {
    composer.render(dt);
  }, 1);

  return null;
}

// Writes the DOM status line (must stay outside R3F JSX — no HTML tags in the Canvas tree)
function syncReadout(s: NoiseState): void {
  const el = document.getElementById('np-readout');
  if (!el) return;

  const layers = [s.warpOn && 'warp', 'base', s.detailOn && 'detail'].filter(Boolean).join(' › ');

  el.innerHTML = `
    <span>
      <b>${s.dimensions}D</b> ${s.noiseStyle}[${s.octaves}]
    </span>
    <span class="sep">·</span>
    <span>${s.gaussian ? 'box–muller' : 'raw'}</span>
    <span class="sep">·</span>
    <span>${layers}</span>
    <span class="sep">·</span>
    <span>
      ${s.object}/${s.detail}
    </span>
  `;
}

// Root R3F scene graph — Leva lives here so tweaks re-render inside the Canvas tree
function Scene() {
  const s = useNoiseControls();
  const palette = findPalette(s.palette);

  useEffect(() => {
    const root = document.querySelector('.np-app');
    if (root instanceof HTMLElement) root.style.background = palette.bg;
  }, [palette.bg]);

  useEffect(() => {
    syncReadout(s);
  }, [s]);

  return (
    <>
      <Background palette={palette} />
      <CameraRig />
      <NoiseObject s={s} />
      {s.bloomOn && <Bloom s={s} />}
    </>
  );
}

// Leva control schema wired to NoiseState; returns the live control values
function useNoiseControls(): NoiseState {
  const initial = useMemo(() => stateFromUrl(), []);
  const sRef = useRef(initial);

  const [s, set, get] = useControls(() => ({
    Look: folder({
      look: {
        value: initial.look,
        options: Object.keys(LOOK_PRESETS),
        label: 'preset',
        transient: false,
        onChange: (v: string, _path: string, context?: { initial: boolean }) => {
          if (context?.initial) return;
          const preset = LOOK_PRESETS[v as LookName];
          if (preset) set(pickState({ ...preset, look: v }));
        },
      },
    }),

    Object: folder({
      object: { value: initial.object, options: OBJECTS },
      detail: { value: initial.detail, min: 16, max: 384, step: 2 },
      wireframe: initial.wireframe,
    }),

    Noise: folder({
      dimensions: { value: initial.dimensions, options: { '3D': 3, '4D': 4 } },
      noiseStyle: { value: initial.noiseStyle, options: NOISE_STYLES, label: 'style' },
      frequency: { value: initial.frequency, min: 0.1, max: 6, step: 0.01 },
      amplitude: { value: initial.amplitude, min: 0, max: 0.7, step: 0.005 },
      octaves: { value: initial.octaves, min: 1, max: 8, step: 1 },
      lacunarity: { value: initial.lacunarity, min: 1, max: 4, step: 0.01 },
      persistence: { value: initial.persistence, min: 0, max: 1, step: 0.01 },
      timeSpeed: { value: initial.timeSpeed, min: 0, max: 2, step: 0.01, label: 'time speed' },
      gaussian: { value: initial.gaussian, label: 'gaussian remap' },
      seed: { value: initial.seed, min: 0, max: 100, step: 0.1 },
    }),

    Layers: folder({
      warpOn: { value: initial.warpOn, label: 'domain warp' },
      warpFreq: {
        value: initial.warpFreq,
        min: 0.1,
        max: 4,
        step: 0.01,
        label: 'warp freq',
        render: (get) => get('Layers.warpOn'),
      },
      warpStrength: {
        value: initial.warpStrength,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: 'warp strength',
        render: (get) => get('Layers.warpOn'),
      },
      detailOn: { value: initial.detailOn, label: 'detail layer' },
      detailFreq: {
        value: initial.detailFreq,
        min: 0.5,
        max: 12,
        step: 0.05,
        label: 'detail freq',
        render: (get) => get('Layers.detailOn'),
      },
      detailAmp: {
        value: initial.detailAmp,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'detail amount',
        render: (get) => get('Layers.detailOn'),
      },
      detailBlend: {
        value: initial.detailBlend,
        options: DETAIL_BLEND,
        label: 'blend',
        render: (get) => get('Layers.detailOn'),
      },
    }),

    Smoothing: folder({
      curve: { value: initial.curve, min: 0.3, max: 3.0, step: 0.01 },
      smoothstep: initial.smoothstep,
      normalBlend: { value: initial.normalBlend, min: 0, max: 1, step: 0.01, label: 'normal blend' },
    }),

    Lighting: folder({
      lightPreset: {
        value: initial.lightPreset,
        options: Object.keys(LIGHT_PRESETS),
        label: 'preset',
        transient: false,
        onChange: (v: string, _path: string, context?: { initial: boolean }) => {
          if (context?.initial) return;
          const preset = LIGHT_PRESETS[v as LightPresetName];
          if (preset) set({ ...preset, lightPreset: v });
        },
      },
      lightType: {
        value: initial.lightType,
        options: LIGHT_TYPES,
        label: 'kind',
      },
      lightColor: { value: initial.lightColor, label: 'color' },
      ambient: { value: initial.ambient, min: 0, max: 1, step: 0.01 },
      keyIntensity: { value: initial.keyIntensity, min: 0, max: 2.5, step: 0.01, label: 'intensity' },
      keyAz: {
        value: initial.keyAz,
        min: 0,
        max: 360,
        step: 1,
        label: 'azimuth',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'directional' || t === 'hemisphere';
        },
      },
      keyEl: {
        value: initial.keyEl,
        min: -90,
        max: 90,
        step: 1,
        label: 'elevation',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'directional' || t === 'hemisphere';
        },
      },
      lightX: {
        value: initial.lightX,
        min: -5,
        max: 5,
        step: 0.05,
        label: 'pos X',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'point' || t === 'spot';
        },
      },
      lightY: {
        value: initial.lightY,
        min: -5,
        max: 5,
        step: 0.05,
        label: 'pos Y',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'point' || t === 'spot';
        },
      },
      lightZ: {
        value: initial.lightZ,
        min: -5,
        max: 5,
        step: 0.05,
        label: 'pos Z',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'point' || t === 'spot';
        },
      },
      lightDistance: {
        value: initial.lightDistance,
        min: 0.5,
        max: 12,
        step: 0.1,
        label: 'range',
        render: (get) => {
          const t = get('Lighting.lightType');
          return t === 'point' || t === 'spot';
        },
      },
      spotAngle: {
        value: initial.spotAngle,
        min: 5,
        max: 60,
        step: 1,
        label: 'spot angle',
        render: (get) => get('Lighting.lightType') === 'spot',
      },
      spotPenumbra: {
        value: initial.spotPenumbra,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'penumbra',
        render: (get) => get('Lighting.lightType') === 'spot',
      },
      rim: { value: initial.rim, min: 0, max: 2, step: 0.01 },
      rimTint: { value: initial.rimTint, options: RIM_TINTS, label: 'rim tint' },
      spec: { value: initial.spec, min: 0, max: 2, step: 0.01, label: 'specular' },
      specPower: {
        value: initial.specPower,
        min: 1,
        max: 128,
        step: 1,
        label: 'spec power',
        render: (get) => get('Lighting.spec') > 0,
      },
    }),

    Bloom: folder({
      bloomOn: { value: initial.bloomOn, label: 'enabled' },
      bloomStrength: {
        value: initial.bloomStrength,
        min: 0,
        max: 3,
        step: 0.01,
        label: 'strength',
        render: (get) => get('Bloom.bloomOn'),
      },
      bloomRadius: {
        value: initial.bloomRadius,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: 'radius',
        render: (get) => get('Bloom.bloomOn'),
      },
      bloomThreshold: {
        value: initial.bloomThreshold,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'threshold',
        render: (get) => get('Bloom.bloomOn'),
      },
    }),

    Color: folder({
      colorMode: { value: initial.colorMode, options: COLOR_MODES, label: 'mode' },
      bands: {
        value: initial.bands,
        min: 1,
        max: 32,
        step: 1,
        label: 'band count',
        render: (get) => get('Color.colorMode') === 'bands',
      },
      palette: { value: initial.palette, options: PALETTES.map((p) => p.name) },
      emissive: {
        value: initial.emissive,
        min: 0,
        max: 3,
        step: 0.01,
        label: 'emissive',
      },
    }),

    Scene: folder({
      autoRotate: { value: initial.autoRotate, label: 'auto rotate' },
      rotationSpeed: {
        value: initial.rotationSpeed,
        min: 0,
        max: 2,
        step: 0.01,
        label: 'rotation speed',
      },
    }),

    'copy link': button(() => {
      void copyShareLink(sRef.current);
    }),
    'export png': button(() => exportPng()),
    'export video': button(() => {
      void exportVideo(3);
    }),
    'new seed': button(() => set({ seed: Math.random() * 100 })),
    'reset all': button(() => set({ ...DEFAULTS })),
  }));

  // Leva's folder schema types don't flatten cleanly onto NoiseState
  const state = s as unknown as NoiseState;
  sRef.current = state;

  useEffect(() => {
    const id = setTimeout(() => writeUrlState(state), 150);
    return () => clearTimeout(id);
  }, [state]);

  if (import.meta.env.DEV) {
    window.__setNoiseControls = set as unknown as (patch: Partial<NoiseState>) => void;
    window.__getLeva = get as unknown as () => unknown;
  }

  return state;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event('resize'));
    const ids = [0, 50, 200, 500].map((d) => setTimeout(fire, d));
    return () => ids.forEach(clearTimeout);
  }, []);

  // Marks the studio ready after WebGL boots and a couple of paint frames
  function handleCreated(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
  }

  return (
    <div className="np-app" style={{ background: PALETTES[0]!.bg }}>
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0.4, 3.2] }}
        resize={{ scroll: false, debounce: 0 }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onCreated={handleCreated}
      >
        <Scene />
      </Canvas>

      <div className="np-readout" id="np-readout" />
      {!entered && (
        <LoadingScreen ready={ready} onExplore={() => setEntered(true)} />
      )}
    </div>
  );
}
