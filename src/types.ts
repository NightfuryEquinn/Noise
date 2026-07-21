import type * as THREE from 'three';

export type ObjectKind = 'sphere' | 'torus' | 'knot' | 'box' | 'plane';
export type ColorMode = 'gradient' | 'normal' | 'bands' | 'solid';
export type DetailBlend = 'add' | 'mult' | 'max';
export type RimTint = 'cool' | 'warm' | 'white' | 'palette';
export type LightType = 'directional' | 'point' | 'spot' | 'hemisphere';
export type NoiseStyle = 'fbm' | 'ridged';
export type PaletteName = 'cobalt' | 'magma' | 'viridis' | 'mono' | 'plasma' | 'arctic';
export type LightPresetName =
  | 'studio'
  | 'wax'
  | 'overhead'
  | 'rim'
  | 'clay'
  | 'lantern'
  | 'stage';
export type LookName =
  | 'studio'
  | 'ridge magma'
  | 'warp plasma'
  | 'gaussian arctic'
  | 'ridge viridis';

export type Palette = {
  name: PaletteName;
  a: string;
  b: string;
  c: string;
  d: string;
  bg: string;
};

export type LightPreset = {
  lightType: LightType;
  ambient: number;
  keyIntensity: number;
  keyAz: number;
  keyEl: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  lightDistance: number;
  spotAngle: number;
  spotPenumbra: number;
  lightColor: string;
  rim: number;
  spec: number;
  specPower: number;
};

export type NoiseState = {
  look: LookName | string;
  object: ObjectKind;
  detail: number;
  wireframe: boolean;
  dimensions: 3 | 4 | number;
  noiseStyle: NoiseStyle;
  frequency: number;
  amplitude: number;
  octaves: number;
  lacunarity: number;
  persistence: number;
  timeSpeed: number;
  gaussian: boolean;
  seed: number;
  warpOn: boolean;
  warpFreq: number;
  warpStrength: number;
  detailOn: boolean;
  detailFreq: number;
  detailAmp: number;
  detailBlend: DetailBlend;
  curve: number;
  smoothstep: boolean;
  normalBlend: number;
  lightPreset: LightPresetName | string;
  lightType: LightType;
  ambient: number;
  keyIntensity: number;
  keyAz: number;
  keyEl: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  lightDistance: number;
  spotAngle: number;
  spotPenumbra: number;
  lightColor: string;
  rim: number;
  spec: number;
  specPower: number;
  rimTint: RimTint;
  colorMode: ColorMode;
  palette: PaletteName | string;
  bands: number;
  emissive: number;
  autoRotate: boolean;
  rotationSpeed: number;
  bloomOn: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
};

export type UniformNumber = { value: number };
export type UniformVector2 = { value: THREE.Vector2 };
export type UniformVector3 = { value: THREE.Vector3 };
export type UniformColor = { value: THREE.Color };

export type NoiseUniforms = {
  uTime: UniformNumber;
  uFrequency: UniformNumber;
  uAmplitude: UniformNumber;
  uOctaves: UniformNumber;
  uLacunarity: UniformNumber;
  uPersistence: UniformNumber;
  uTimeSpeed: UniformNumber;
  uDimensions: UniformNumber;
  uGaussian: UniformNumber;
  uNoiseStyle: UniformNumber;
  uSeed: UniformNumber;
  uWarpOn: UniformNumber;
  uWarpFreq: UniformNumber;
  uWarpStrength: UniformNumber;
  uDetailOn: UniformNumber;
  uDetailFreq: UniformNumber;
  uDetailAmp: UniformNumber;
  uDetailBlend: UniformNumber;
  uCurve: UniformNumber;
  uSmoothstep: UniformNumber;
  uNormalBlend: UniformNumber;
  uAmbient: UniformNumber;
  uKeyIntensity: UniformNumber;
  uKeyDir: UniformVector2;
  uLightPos: UniformVector3;
  uLightType: UniformNumber;
  uLightColor: UniformColor;
  uLightDistance: UniformNumber;
  uSpotAngle: UniformNumber;
  uSpotPenumbra: UniformNumber;
  uHemiSky: UniformColor;
  uHemiGround: UniformColor;
  uRimIntensity: UniformNumber;
  uSpec: UniformNumber;
  uSpecPower: UniformNumber;
  uRimColor: UniformColor;
  uColorA: UniformColor;
  uColorB: UniformColor;
  uColorC: UniformColor;
  uColorD: UniformColor;
  uBgColor: UniformColor;
  uColorMode: UniformNumber;
  uBands: UniformNumber;
  uEmissive: UniformNumber;
};

declare global {
  interface Window {
    __noiseUniforms?: NoiseUniforms;
    __noiseState?: NoiseState;
    __setNoiseControls?: (patch: Partial<NoiseState>) => void;
    __getLeva?: () => unknown;
  }
}

export {};
