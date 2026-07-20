import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VERTEX, FRAGMENT } from './shaders.js';

const PALETTES = [
  { name: 'cobalt', a: '#0c1c3a', b: '#7cc4ff', bg: '#05070d' },
  { name: 'magma', a: '#1a0511', b: '#ffae42', bg: '#080406' },
  { name: 'viridis', a: '#1b1f3a', b: '#9ee493', bg: '#070a10' },
  { name: 'mono', a: '#0a0a0a', b: '#f4f4f4', bg: '#000000' },
  { name: 'plasma', a: '#2d0b4e', b: '#ff5d8f', bg: '#08040f' },
  { name: 'arctic', a: '#0d2a36', b: '#c9f2ff', bg: '#050d12' },
];

const OBJECTS = ['sphere', 'torus', 'knot', 'box', 'plane'];
const COLOR_MODES = ['gradient', 'normal', 'bands', 'solid'];
const DETAIL_BLEND = ['add', 'mult', 'max'];
const RIM_TINTS = ['cool', 'warm', 'white', 'palette'];
const LIGHT_TYPES = ['directional', 'point', 'spot', 'hemisphere'];

const LIGHT_PRESETS = {
  studio: {
    lightType: 'directional',
    ambient: 0.18,
    keyIntensity: 1.0,
    keyAz: 60,
    keyEl: 45,
    lightX: 2.2,
    lightY: 2.0,
    lightZ: 1.4,
    lightDistance: 6,
    spotAngle: 28,
    spotPenumbra: 0.35,
    lightColor: '#ffffff',
    rim: 0.45,
    spec: 0.0,
    specPower: 24,
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

const DEFAULTS = {
  object: 'sphere',
  detail: 128,
  wireframe: false,
  dimensions: 3,
  frequency: 1.6,
  amplitude: 0.22,
  octaves: 3,
  lacunarity: 2.0,
  persistence: 0.55,
  timeSpeed: 0.35,
  gaussian: false,
  seed: 0,
  warpOn: false,
  warpFreq: 1.2,
  warpStrength: 0.45,
  detailOn: false,
  detailFreq: 4.5,
  detailAmp: 0.35,
  detailBlend: 'add',
  curve: 1.0,
  smoothstep: false,
  normalBlend: 0.0,
  lightPreset: 'studio',
  lightType: 'directional',
  ambient: 0.18,
  keyIntensity: 1.0,
  keyAz: 60,
  keyEl: 45,
  lightX: 2.2,
  lightY: 2.0,
  lightZ: 1.4,
  lightDistance: 6,
  spotAngle: 28,
  spotPenumbra: 0.35,
  lightColor: '#ffffff',
  rim: 0.45,
  spec: 0.0,
  specPower: 24,
  rimTint: 'cool',
  colorMode: 'gradient',
  palette: 'cobalt',
  bands: 6,
  autoRotate: true,
  rotationSpeed: 0.2,
  bloomOn: true,
  bloomStrength: 0.85,
  bloomRadius: 0.55,
  bloomThreshold: 0.35,
};

// Builds subdivided geometry for the selected object kind
function makeGeometry(kind, detail) {
  const d = Math.max(8, Math.min(512, detail | 0));
  switch (kind) {
    case 'torus':
      return new THREE.TorusGeometry(0.85, 0.32, Math.max(16, d / 2), d);
    case 'knot':
      return new THREE.TorusKnotGeometry(0.75, 0.26, d, Math.max(16, d / 8));
    case 'box': {
      const s = Math.max(16, Math.floor(d / 2));
      return new THREE.BoxGeometry(1.4, 1.4, 1.4, s, s, s);
    }
    case 'plane':
      return new THREE.PlaneGeometry(2.4, 2.4, d, d);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(1, d, Math.max(16, d / 2));
  }
}

// Copies Leva state into shader uniforms (called every frame)
function syncUniforms(u, s) {
  u.uFrequency.value = s.frequency;
  u.uAmplitude.value = s.amplitude;
  u.uOctaves.value = s.octaves | 0;
  u.uLacunarity.value = s.lacunarity;
  u.uPersistence.value = s.persistence;
  u.uTimeSpeed.value = s.timeSpeed;
  u.uDimensions.value = s.dimensions | 0;
  u.uGaussian.value = s.gaussian ? 1 : 0;
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

  const p = PALETTES.find((x) => x.name === s.palette) || PALETTES[0];
  u.uColorA.value.set(p.a);
  u.uColorB.value.set(p.b);
  u.uBgColor.value.set(p.bg);

  const rimTints = { cool: '#cfe8ff', warm: '#ffd6a3', white: '#ffffff', palette: p.b };
  u.uRimColor.value.set(rimTints[s.rimTint] || '#ffffff');

  // Hemisphere sky borrows light color; ground stays warm/dark
  u.uHemiSky.value.set(s.lightColor);
  u.uHemiGround.value.set(p.a);
}

// Displaced noise mesh driven by Leva-linked shader uniforms
function NoiseObject({ s }) {
  const meshRef = useRef();
  const matRef = useRef();
  const sRef = useRef(s);
  sRef.current = s;

  const geometry = useMemo(() => makeGeometry(s.object, s.detail), [s.object, s.detail]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFrequency: { value: DEFAULTS.frequency },
      uAmplitude: { value: DEFAULTS.amplitude },
      uOctaves: { value: DEFAULTS.octaves },
      uLacunarity: { value: DEFAULTS.lacunarity },
      uPersistence: { value: DEFAULTS.persistence },
      uTimeSpeed: { value: DEFAULTS.timeSpeed },
      uDimensions: { value: DEFAULTS.dimensions },
      uGaussian: { value: 0 },
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
      uColorA: { value: new THREE.Color(PALETTES[0].a) },
      uColorB: { value: new THREE.Color(PALETTES[0].b) },
      uBgColor: { value: new THREE.Color(PALETTES[0].bg) },
      uColorMode: { value: 0 },
      uBands: { value: DEFAULTS.bands },
    }),
    [],
  );

  useFrame((_, dt) => {
    const cur = sRef.current;
    const u = matRef.current?.uniforms || uniforms;

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
  const controlsRef = useRef();
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
function Background({ palette }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(palette.bg);
    scene.fog = new THREE.Fog(new THREE.Color(palette.bg), 6, 14);
  }, [scene, palette]);
  return null;
}

// Bloom post-process that takes over R3F's default render loop while mounted
function Bloom({ s }) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => () => composer.dispose?.(), [composer]);

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
function syncReadout(s) {
  const el = document.getElementById('np-readout');
  if (!el) return;

  const layers = [s.warpOn && 'warp', 'base', s.detailOn && 'detail'].filter(Boolean).join(' › ');

  el.innerHTML = `
    <span>
      <b>${s.dimensions}D</b> simplex · fbm[${s.octaves}]
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
  const palette = PALETTES.find((p) => p.name === s.palette) || PALETTES[0];

  useEffect(() => {
    const root = document.querySelector('.np-app');
    if (root) root.style.background = palette.bg;
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

function useNoiseControls() {
  const [s, set, get] = useControls(() => ({
    Object: folder({
      object: { value: DEFAULTS.object, options: OBJECTS },
      detail: { value: DEFAULTS.detail, min: 16, max: 384, step: 2 },
      wireframe: DEFAULTS.wireframe,
    }),

    Noise: folder({
      dimensions: { value: DEFAULTS.dimensions, options: { '3D': 3, '4D': 4 } },
      frequency: { value: DEFAULTS.frequency, min: 0.1, max: 6, step: 0.01 },
      amplitude: { value: DEFAULTS.amplitude, min: 0, max: 0.7, step: 0.005 },
      octaves: { value: DEFAULTS.octaves, min: 1, max: 8, step: 1 },
      lacunarity: { value: DEFAULTS.lacunarity, min: 1, max: 4, step: 0.01 },
      persistence: { value: DEFAULTS.persistence, min: 0, max: 1, step: 0.01 },
      timeSpeed: { value: DEFAULTS.timeSpeed, min: 0, max: 2, step: 0.01, label: 'time speed' },
      gaussian: { value: DEFAULTS.gaussian, label: 'gaussian remap' },
      seed: { value: DEFAULTS.seed, min: 0, max: 100, step: 0.1 },
    }),

    Layers: folder({
      warpOn: { value: DEFAULTS.warpOn, label: 'domain warp' },
      warpFreq: {
        value: DEFAULTS.warpFreq,
        min: 0.1,
        max: 4,
        step: 0.01,
        label: 'warp freq',
        render: (get) => get('Layers.warpOn'),
      },
      warpStrength: {
        value: DEFAULTS.warpStrength,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: 'warp strength',
        render: (get) => get('Layers.warpOn'),
      },
      detailOn: { value: DEFAULTS.detailOn, label: 'detail layer' },
      detailFreq: {
        value: DEFAULTS.detailFreq,
        min: 0.5,
        max: 12,
        step: 0.05,
        label: 'detail freq',
        render: (get) => get('Layers.detailOn'),
      },
      detailAmp: {
        value: DEFAULTS.detailAmp,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'detail amount',
        render: (get) => get('Layers.detailOn'),
      },
      detailBlend: {
        value: DEFAULTS.detailBlend,
        options: DETAIL_BLEND,
        label: 'blend',
        render: (get) => get('Layers.detailOn'),
      },
    }),

    Smoothing: folder({
      curve: { value: DEFAULTS.curve, min: 0.3, max: 3.0, step: 0.01 },
      smoothstep: DEFAULTS.smoothstep,
      normalBlend: { value: DEFAULTS.normalBlend, min: 0, max: 1, step: 0.01, label: 'normal blend' },
    }),

    Lighting: folder({
      lightPreset: {
        value: DEFAULTS.lightPreset,
        options: Object.keys(LIGHT_PRESETS),
        label: 'preset',
        onChange: (v, _path, context) => {
          if (context.initial) return;
          const preset = LIGHT_PRESETS[v];
          if (preset) set(preset);
        },
      },
      lightType: {
        value: DEFAULTS.lightType,
        options: LIGHT_TYPES,
        label: 'kind',
      },
      lightColor: { value: DEFAULTS.lightColor, label: 'color' },
      ambient: { value: DEFAULTS.ambient, min: 0, max: 1, step: 0.01 },
      keyIntensity: { value: DEFAULTS.keyIntensity, min: 0, max: 2.5, step: 0.01, label: 'intensity' },
      keyAz: {
        value: DEFAULTS.keyAz,
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
        value: DEFAULTS.keyEl,
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
        value: DEFAULTS.lightX,
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
        value: DEFAULTS.lightY,
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
        value: DEFAULTS.lightZ,
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
        value: DEFAULTS.lightDistance,
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
        value: DEFAULTS.spotAngle,
        min: 5,
        max: 60,
        step: 1,
        label: 'spot angle',
        render: (get) => get('Lighting.lightType') === 'spot',
      },
      spotPenumbra: {
        value: DEFAULTS.spotPenumbra,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'penumbra',
        render: (get) => get('Lighting.lightType') === 'spot',
      },
      rim: { value: DEFAULTS.rim, min: 0, max: 2, step: 0.01 },
      rimTint: { value: DEFAULTS.rimTint, options: RIM_TINTS, label: 'rim tint' },
      spec: { value: DEFAULTS.spec, min: 0, max: 2, step: 0.01, label: 'specular' },
      specPower: {
        value: DEFAULTS.specPower,
        min: 1,
        max: 128,
        step: 1,
        label: 'spec power',
        render: (get) => get('Lighting.spec') > 0,
      },
    }),

    Bloom: folder({
      bloomOn: { value: DEFAULTS.bloomOn, label: 'enabled' },
      bloomStrength: {
        value: DEFAULTS.bloomStrength,
        min: 0,
        max: 3,
        step: 0.01,
        label: 'strength',
        render: (get) => get('Bloom.bloomOn'),
      },
      bloomRadius: {
        value: DEFAULTS.bloomRadius,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: 'radius',
        render: (get) => get('Bloom.bloomOn'),
      },
      bloomThreshold: {
        value: DEFAULTS.bloomThreshold,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'threshold',
        render: (get) => get('Bloom.bloomOn'),
      },
    }),

    Color: folder({
      colorMode: { value: DEFAULTS.colorMode, options: COLOR_MODES, label: 'mode' },
      bands: {
        value: DEFAULTS.bands,
        min: 1,
        max: 32,
        step: 1,
        label: 'band count',
        render: (get) => get('Color.colorMode') === 'bands',
      },
      palette: { value: DEFAULTS.palette, options: PALETTES.map((p) => p.name) },
    }),

    Scene: folder({
      autoRotate: { value: DEFAULTS.autoRotate, label: 'auto rotate' },
      rotationSpeed: {
        value: DEFAULTS.rotationSpeed,
        min: 0,
        max: 2,
        step: 0.01,
        label: 'rotation speed',
      },
    }),

    'new seed': button(() => set({ seed: Math.random() * 100 })),
    'reset all': button(() => set({ ...DEFAULTS })),
  }));

  if (import.meta.env.DEV) {
    window.__setNoiseControls = set;
    window.__getLeva = get;
  }

  return s;
}

export default function App() {
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event('resize'));
    const ids = [0, 50, 200, 500].map((d) => setTimeout(fire, d));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div className="np-app" style={{ background: PALETTES[0].bg }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, near: 0.1, far: 100, position: [0, 0.4, 3.2] }}
        resize={{ scroll: false, debounce: 0 }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>

      <div className="np-readout" id="np-readout" />
    </div>
  );
}
