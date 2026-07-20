// GLSL noise library — Stefan Gustavson / Ashima Arts simplex noise (3D + 4D),
// plus fBm wrappers, a Box-Muller Gaussian remap, and the displacement vert/frag.
// MIT-licensed (Ashima/Gustavson originals).

export const NOISE_GLSL = /* glsl */ `
// --- common helpers -----------------------------------------------------------
vec3 mod289_3(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289_4(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute4(vec4 x){ return mod289_4(((x*34.0)+1.0)*x); }
float permute1(float x){ return floor(mod(((x*34.0)+1.0)*x, 289.0)); }
vec4 taylorInvSqrt4(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt1(float r){ return 1.79284291400159 - 0.85373472095314 * r; }

// --- 3D simplex noise (Ashima) -----------------------------------------------
float snoise3(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289_3(i);
  vec4 p = permute4(permute4(permute4(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// --- 4D simplex noise (Stefan Gustavson) -------------------------------------
vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p, s;
  p.xyz = floor( fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w   = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
  return p;
}

float snoise4(vec4 v){
  const vec2 C = vec2(0.138196601125010504, 0.309016994374947451);
  vec4 i  = floor(v + dot(v, C.yyyy));
  vec4 x0 = v -   i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
  i = mod(i, 289.0);
  float j0 = permute1( permute1( permute1( permute1(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute4( permute4( permute4( permute4(
             i.w + vec4(i1.w, i2.w, i3.w, 1.0))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0);
  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  p4 *= taylorInvSqrt1(dot(p4,p4));
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot(p0,x0), dot(p1,x1), dot(p2,x2) ))
                + dot(m1*m1, vec2( dot(p3,x3), dot(p4,x4) ) ) );
}

// --- fBm wrappers ------------------------------------------------------------
float fbm3(vec3 p, int octaves, float lacunarity, float persistence){
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= octaves) break;
    sum  += amp * snoise3(p);
    norm += amp;
    p    *= lacunarity;
    amp  *= persistence;
  }
  return sum / max(norm, 1e-5);
}

float fbm4(vec4 p, int octaves, float lacunarity, float persistence){
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= octaves) break;
    sum  += amp * snoise4(p);
    norm += amp;
    p    *= lacunarity;
    amp  *= persistence;
  }
  return sum / max(norm, 1e-5);
}

// --- Box-Muller Gaussian remap -----------------------------------------------
// Treats two independent noise samples as ~uniform U1, U2 on (0,1] and returns
// a normally-distributed sample. Scaled so output ranges ~[-1,1] for displacement.
float gaussianize(float n1, float n2){
  float u1 = clamp(n1 * 0.5 + 0.5, 0.001, 0.999);
  float u2 = clamp(n2 * 0.5 + 0.5, 0.001, 0.999);
  float g  = sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2);
  return clamp(g * 0.35, -1.0, 1.0);
}
`;

// =============================================================================

export const VERTEX = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uFrequency;
uniform float uAmplitude;
uniform int   uOctaves;
uniform float uLacunarity;
uniform float uPersistence;
uniform float uTimeSpeed;
uniform int   uDimensions;   // 3 or 4
uniform int   uGaussian;     // 0 / 1
uniform float uSeed;

// layers
uniform int   uWarpOn;
uniform float uWarpFreq;
uniform float uWarpStrength;
uniform int   uDetailOn;
uniform float uDetailFreq;
uniform float uDetailAmp;
uniform int   uDetailBlend;  // 0 add, 1 mult, 2 max

// smoothing
uniform float uCurve;
uniform int   uSmoothstep;

varying float vNoise;
varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying vec3  vAnalyticalN;

${NOISE_GLSL}

float sampleBase(vec3 p, float t){
  if (uDimensions == 4){
    return fbm4(vec4(p * uFrequency, t * uTimeSpeed + uSeed), uOctaves, uLacunarity, uPersistence);
  } else {
    vec3 q = p * uFrequency + vec3(0.0, 0.0, 1.0) * t * uTimeSpeed + vec3(uSeed);
    return fbm3(q, uOctaves, uLacunarity, uPersistence);
  }
}

float sampleDetail(vec3 p, float t){
  // small fixed-octave fBm for the detail layer
  if (uDimensions == 4){
    return fbm4(vec4(p * uDetailFreq, t * uTimeSpeed + uSeed + 13.7), 2, 2.0, 0.5);
  } else {
    vec3 q = p * uDetailFreq + vec3(0.0, 0.0, 1.0) * t * uTimeSpeed + vec3(uSeed + 13.7);
    return fbm3(q, 2, 2.0, 0.5);
  }
}

float layeredNoise(vec3 p, float t){
  // --- layer 1 : domain warp (offsets the input of layer 2) ---
  if (uWarpOn == 1){
    vec3 q = p * uWarpFreq + vec3(uSeed);
    vec3 w = vec3(
      snoise3(q),
      snoise3(q + vec3(5.2, 1.3, 7.4)),
      snoise3(q + vec3(2.6, 9.1, 3.8))
    );
    p += w * uWarpStrength;
  }

  // --- layer 2 : base fBm ---
  float n = sampleBase(p, t);

  // --- layer 3 : detail ---
  if (uDetailOn == 1){
    float d = sampleDetail(p, t);
    if (uDetailBlend == 0){
      n = n + d * uDetailAmp;
    } else if (uDetailBlend == 1){
      // multiply blend, keeping mid-tones intact
      n = n * (1.0 + d * uDetailAmp);
    } else {
      n = max(n, d * uDetailAmp);
    }
  }
  return n;
}

float finalNoise(vec3 p, float t){
  float n = layeredNoise(p, t);
  if (uGaussian == 1){
    float n2 = layeredNoise(p + vec3(17.3, -9.1, 4.7), t + 31.7);
    n = gaussianize(n, n2);
  }
  // gamma curve (sign-preserving)
  if (uCurve != 1.0){
    float s = sign(n);
    n = s * pow(clamp(abs(n), 0.0, 1.5), uCurve);
  }
  // smoothstep remap
  if (uSmoothstep == 1){
    float t01 = clamp(n * 0.5 + 0.5, 0.0, 1.0);
    t01 = t01 * t01 * (3.0 - 2.0 * t01);
    n = t01 * 2.0 - 1.0;
  }
  return n;
}

void main(){
  vec3 pos = position;
  float n  = finalNoise(pos, uTime);
  vNoise   = n;

  vec3 displaced = pos + normal * n * uAmplitude;

  // --- analytical normal of the *displaced* surface --------------------------
  // Build two tangent directions perpendicular to the original surface normal,
  // sample the noise field at small offsets along each, displace those points,
  // and take the cross product. This gives a smooth per-vertex normal that
  // matches the displaced surface, hiding the mesh's subdivision facets that
  // a dFdx/dFdy normal would otherwise reveal.
  vec3  helper = abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3  t1     = normalize(cross(normal, helper));
  vec3  t2     = cross(normal, t1);
  float eps    = 0.0035;
  float n1     = finalNoise(pos + t1 * eps, uTime);
  float n2     = finalNoise(pos + t2 * eps, uTime);
  vec3  p1     = (pos + t1 * eps) + normal * n1 * uAmplitude;
  vec3  p2     = (pos + t2 * eps) + normal * n2 * uAmplitude;
  vec3  analytical = normalize(cross(p1 - displaced, p2 - displaced));
  // t1 x t2 = normal (right-hand), so the cross order above already points outward.

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos    = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vAnalyticalN = normalize(mat3(modelMatrix) * analytical);
  gl_Position  = projectionMatrix * viewMatrix * worldPos;
}
`;

export const FRAGMENT = /* glsl */ `
precision highp float;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uBgColor;
uniform int   uColorMode;     // 0 gradient, 1 normal, 2 bands, 3 solid
uniform float uBands;
uniform float uTime;

// lighting
uniform float uAmbient;
uniform float uKeyIntensity;
uniform vec2  uKeyDir;        // azimuth, elevation (radians) — directional / hemi up bias
uniform vec3  uLightPos;      // world position — point / spot
uniform int   uLightType;     // 0 directional, 1 point, 2 spot, 3 hemisphere
uniform vec3  uLightColor;
uniform float uLightDistance; // attenuation range for point / spot
uniform float uSpotAngle;     // outer cone half-angle (radians)
uniform float uSpotPenumbra;  // 0..1 soft edge
uniform vec3  uHemiSky;
uniform vec3  uHemiGround;
uniform float uRimIntensity;
uniform float uSpec;
uniform float uSpecPower;
uniform vec3  uRimColor;

// smoothing
uniform float uNormalBlend;   // 0 = accurate displaced (faceted-ish), 1 = smooth mesh normal

varying float vNoise;
varying vec3  vWorldPos;
varying vec3  vWorldNormal;
varying vec3  vAnalyticalN;

// Directional light vector from azimuth / elevation
vec3 dirFromAzEl(vec2 azEl){
  float az = azEl.x;
  float el = azEl.y;
  return normalize(vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az)));
}

// Point / spot attenuation falloff over uLightDistance
float lightAttenuation(float dist){
  float r = max(uLightDistance, 0.05);
  float x = clamp(dist / r, 0.0, 1.0);
  return (1.0 - x) * (1.0 - x);
}

void main(){
  // analytical displaced surface normal (smooth per-vertex), blended with the
  // pre-displacement mesh normal for the 'normal blend' smoothing tweak.
  vec3 Nfacet  = normalize(vAnalyticalN);
  vec3 Nsmooth = normalize(vWorldNormal);
  vec3 N = normalize(mix(Nfacet, Nsmooth, clamp(uNormalBlend, 0.0, 1.0)));

  // remap noise to [0,1] for color sampling
  float t = clamp(vNoise * 0.5 + 0.5, 0.0, 1.0);

  vec3 base;
  if (uColorMode == 0){
    base = mix(uColorA, uColorB, smoothstep(0.0, 1.0, t));
  } else if (uColorMode == 1){
    base = N * 0.5 + 0.5;
  } else if (uColorMode == 2){
    float b = fract(t * uBands);
    float edge = smoothstep(0.45, 0.5, abs(b - 0.5));
    base = mix(uColorA, uColorB, edge);
  } else {
    base = uColorA;
  }

  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 2.5) * uRimIntensity;

  vec3 lit;

  if (uLightType == 3){
    // Hemisphere: soft sky / ground wrap, no hard key
    float h = N.y * 0.5 + 0.5;
    vec3 hemi = mix(uHemiGround, uHemiSky, h);
    lit = base * (uAmbient + hemi * uKeyIntensity) + uRimColor * fres;
  } else {
    vec3 L;
    float atten = 1.0;

    if (uLightType == 0){
      // Distant directional key from az/el
      L = dirFromAzEl(uKeyDir);
    } else {
      // Point / spot: light lives at uLightPos
      vec3 toLight = uLightPos - vWorldPos;
      float dist = length(toLight);
      L = toLight / max(dist, 1e-5);
      atten = lightAttenuation(dist);

      if (uLightType == 2){
        // Spot aims at the origin; cone softens with penumbra
        vec3 spotDir = normalize(-uLightPos);
        float cosOuter = cos(uSpotAngle);
        float cosInner = cos(uSpotAngle * (1.0 - clamp(uSpotPenumbra, 0.0, 0.99)));
        float cosTheta = dot(-L, spotDir);
        atten *= smoothstep(cosOuter, cosInner, cosTheta);
      }
    }

    vec3 H = normalize(L + V);
    float ndl = max(dot(N, L), 0.0);
    float ndh = max(dot(N, H), 0.0);

    float diffuse = uAmbient + ndl * uKeyIntensity * atten;
    float spec = pow(ndh, max(uSpecPower, 1.0)) * uSpec * atten * step(0.001, ndl);

    lit = base * diffuse * mix(vec3(1.0), uLightColor, 0.85)
        + uLightColor * spec
        + uRimColor * fres;
  }

  // subtle atmospheric tint into the bg at grazing angles
  lit = mix(lit, uBgColor, fres * 0.06);

  gl_FragColor = vec4(lit, 1.0);
}
`;
