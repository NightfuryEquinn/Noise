// Minimal fullscreen loader shaders — soft drifting sine field, no noise library.

export const LOADER_VERTEX = /* glsl */ `
attribute vec2 aPos;

void main(){
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const LOADER_FRAGMENT = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse; // aspect-corrected UV space, same as uv

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.35;

  // Parallax the field toward the cursor so the wash follows motion
  vec2 focus = mix(vec2(0.0), uMouse, 0.72);
  vec2 p = uv - focus * 0.55;

  // Layered soft waves — reads as fluid without heavy noise
  float w =
      0.55 * sin(p.x * 2.4 + t + uMouse.x * 0.8)
    + 0.35 * sin(p.y * 3.1 - t * 1.15 + uMouse.y * 0.9)
    + 0.25 * sin((p.x + p.y) * 1.8 + t * 0.7);

  float r = length(uv - focus);
  float glow = exp(-r * r * 1.35);
  float field = 0.5 + 0.5 * w;
  field = mix(field, field * field, 0.35);
  field *= 0.5 + 0.5 * glow;

  vec3 deep = vec3(0.02, 0.04, 0.08);
  vec3 mid  = vec3(0.05, 0.22, 0.32);
  vec3 hi   = vec3(0.35, 0.78, 0.88);

  vec3 col = mix(deep, mid, smoothstep(0.15, 0.55, field));
  col = mix(col, hi, smoothstep(0.55, 0.95, field) * 0.55);

  // Soft vignette centered on the cursor focus
  col *= 0.68 + 0.32 * glow;

  gl_FragColor = vec4(col, 1.0);
}
`;

// Liquid fill for the Explore button — wavy surface + internal refraction
export const EXPLORE_FRAGMENT = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform vec2  uRes;
uniform float uFill;

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime;

  // Surface height rises with hover; ripple the meniscus
  float wave =
      0.045 * sin(uv.x * 18.0 + t * 3.2)
    + 0.028 * sin(uv.x * 31.0 - t * 4.1)
    + 0.018 * sin(uv.x * 9.0 + t * 1.7);

  float level = uFill * 1.12 - 0.06 + wave;
  float liquid = smoothstep(level + 0.02, level - 0.01, 1.0 - uv.y);

  // Domain-warped interior so the fill reads as moving fluid
  vec2 p = uv;
  p.x += 0.04 * sin(p.y * 14.0 + t * 2.4) * liquid;
  p.y += 0.03 * sin(p.x * 12.0 - t * 1.9) * liquid;

  float swirl =
      0.5
    + 0.5 * sin(p.x * 8.0 + t * 1.6)
    * sin(p.y * 10.0 - t * 2.1);

  vec3 deep = vec3(0.04, 0.28, 0.38);
  vec3 mid  = vec3(0.18, 0.62, 0.72);
  vec3 hi   = vec3(0.72, 0.94, 1.0);

  vec3 col = mix(deep, mid, swirl);
  col = mix(col, hi, pow(swirl, 2.0) * 0.45);

  // Bright rim along the liquid surface
  float rim = smoothstep(0.04, 0.0, abs((1.0 - uv.y) - level));
  col += hi * rim * 0.55 * liquid;

  float alpha = liquid * clamp(uFill * 1.4, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;
