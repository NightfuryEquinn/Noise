import { chromium } from 'playwright';

const BASE = process.env.NOISE_URL || 'http://localhost:5173/';

const CASES = [
  // Noise uniforms
  { set: { frequency: 3.25 }, uniform: 'uFrequency', expect: 3.25 },
  { set: { amplitude: 0.55 }, uniform: 'uAmplitude', expect: 0.55 },
  { set: { octaves: 6 }, uniform: 'uOctaves', expect: 6 },
  { set: { lacunarity: 3.1 }, uniform: 'uLacunarity', expect: 3.1 },
  { set: { persistence: 0.2 }, uniform: 'uPersistence', expect: 0.2 },
  { set: { timeSpeed: 1.4 }, uniform: 'uTimeSpeed', expect: 1.4 },
  { set: { dimensions: 4 }, uniform: 'uDimensions', expect: 4 },
  { set: { gaussian: true }, uniform: 'uGaussian', expect: 1 },
  { set: { seed: 42.5 }, uniform: 'uSeed', expect: 42.5 },

  // Layers
  { set: { warpOn: true }, uniform: 'uWarpOn', expect: 1 },
  { set: { warpFreq: 2.4 }, uniform: 'uWarpFreq', expect: 2.4 },
  { set: { warpStrength: 1.1 }, uniform: 'uWarpStrength', expect: 1.1 },
  { set: { detailOn: true }, uniform: 'uDetailOn', expect: 1 },
  { set: { detailFreq: 8 }, uniform: 'uDetailFreq', expect: 8 },
  { set: { detailAmp: 0.7 }, uniform: 'uDetailAmp', expect: 0.7 },
  { set: { detailBlend: 'mult' }, uniform: 'uDetailBlend', expect: 1 },
  { set: { detailBlend: 'max' }, uniform: 'uDetailBlend', expect: 2 },

  // Smoothing
  { set: { curve: 2.2 }, uniform: 'uCurve', expect: 2.2 },
  { set: { smoothstep: true }, uniform: 'uSmoothstep', expect: 1 },
  { set: { normalBlend: 0.65 }, uniform: 'uNormalBlend', expect: 0.65 },

  // Lighting
  { set: { ambient: 0.4 }, uniform: 'uAmbient', expect: 0.4 },
  { set: { keyIntensity: 1.8 }, uniform: 'uKeyIntensity', expect: 1.8 },
  { set: { rim: 1.2 }, uniform: 'uRimIntensity', expect: 1.2 },
  { set: { spec: 0.9 }, uniform: 'uSpec', expect: 0.9 },
  { set: { specPower: 64 }, uniform: 'uSpecPower', expect: 64 },

  // Color
  { set: { colorMode: 'bands' }, uniform: 'uColorMode', expect: 2 },
  { set: { bands: 12 }, uniform: 'uBands', expect: 12 },
  { set: { colorMode: 'normal' }, uniform: 'uColorMode', expect: 1 },
  { set: { colorMode: 'solid' }, uniform: 'uColorMode', expect: 3 },
];

function nearly(a, b, eps = 1e-4) {
  return Math.abs(a - b) <= eps;
}

async function waitForUniforms(page) {
  await page.waitForFunction(() => window.__noiseUniforms && window.__setNoiseControls, null, {
    timeout: 15000,
  });
}

async function readUniform(page, name) {
  return page.evaluate((n) => {
    const u = window.__noiseUniforms[n];
    if (!u) return { missing: true };
    const v = u.value;
    if (v && typeof v === 'object' && 'x' in v && 'y' in v && !('z' in v)) {
      return { x: v.x, y: v.y };
    }
    if (v && typeof v === 'object' && 'r' in v) {
      return { r: v.r, g: v.g, b: v.b };
    }
    return v;
  }, name);
}

async function readState(page, key) {
  return page.evaluate((k) => window.__noiseState?.[k], key);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || (msg.type() === 'warning' && msg.text().includes('set` for path'))) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  console.log('Loading', BASE);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#root canvas', { timeout: 20000 });
  console.log('Canvas ready, waiting for debug hooks…');
  await waitForUniforms(page);
  console.log('Hooks ready');

  const results = [];

  // Reset first
  await page.evaluate(() => window.__setNoiseControls({
    object: 'sphere', detail: 128, wireframe: false, dimensions: 3,
    frequency: 1.6, amplitude: 0.22, octaves: 3, lacunarity: 2.0,
    persistence: 0.55, timeSpeed: 0.35, gaussian: false, seed: 0,
    warpOn: false, warpFreq: 1.2, warpStrength: 0.45, detailOn: false,
    detailFreq: 4.5, detailAmp: 0.35, detailBlend: 'add', curve: 1.0,
    smoothstep: false, normalBlend: 0.0, lightPreset: 'studio',
    ambient: 0.18, keyIntensity: 1.0, keyAz: 60, keyEl: 45, rim: 0.45,
    spec: 0.0, specPower: 24, rimTint: 'cool', colorMode: 'gradient',
    palette: 'cobalt', bands: 6, autoRotate: true, rotationSpeed: 0.2,
    bloomOn: true, bloomStrength: 0.85, bloomRadius: 0.55, bloomThreshold: 0.35,
  }));
  await page.waitForTimeout(100);

  for (const c of CASES) {
    await page.evaluate((patch) => window.__setNoiseControls(patch), c.set);
    // React effect needs a frame
    await page.waitForTimeout(50);
    await page.waitForFunction(
      ({ uniform, expect }) => {
        const u = window.__noiseUniforms?.[uniform];
        if (!u) return false;
        const v = u.value;
        return Math.abs(v - expect) < 1e-4;
      },
      { uniform: c.uniform, expect: c.expect },
      { timeout: 3000 },
    ).catch(() => null);

    const got = await readUniform(page, c.uniform);
    const ok = typeof got === 'number' ? nearly(got, c.expect) : got === c.expect;
    results.push({
      name: `${Object.keys(c.set)[0]} → ${c.uniform}`,
      ok,
      expect: c.expect,
      got,
    });
  }

  // Key direction from az/el
  await page.evaluate(() => window.__setNoiseControls({ keyAz: 90, keyEl: 30 }));
  await page.waitForTimeout(50);
  const keyDir = await readUniform(page, 'uKeyDir');
  const azOk = nearly(keyDir.x, (90 * Math.PI) / 180);
  const elOk = nearly(keyDir.y, (30 * Math.PI) / 180);
  results.push({ name: 'keyAz/keyEl → uKeyDir', ok: azOk && elOk, expect: 'rad', got: keyDir });

  // Palette colors
  await page.evaluate(() => window.__setNoiseControls({ palette: 'magma' }));
  await page.waitForTimeout(50);
  const colorB = await readUniform(page, 'uColorB');
  // #ffae42
  const magmaOk =
    nearly(colorB.r, 1, 0.02) && nearly(colorB.g, 174 / 255, 0.02) && nearly(colorB.b, 66 / 255, 0.02);
  results.push({ name: 'palette magma → uColorB', ok: magmaOk, expect: '#ffae42', got: colorB });

  // Light preset
  await page.evaluate(() => window.__setNoiseControls({ lightPreset: 'wax' }));
  await page.waitForTimeout(80);
  // Trigger onChange by setting via path — lightPreset onChange only fires from panel.
  // Apply preset values directly to mimic button path used by UI handler:
  await page.evaluate(() =>
    window.__setNoiseControls({
      ambient: 0.1,
      keyIntensity: 0.85,
      keyAz: 90,
      keyEl: 30,
      rim: 0.25,
      spec: 0.7,
      specPower: 48,
    }),
  );
  await page.waitForTimeout(50);
  const waxSpec = await readUniform(page, 'uSpec');
  results.push({ name: 'wax lighting values → uSpec', ok: nearly(waxSpec, 0.7), expect: 0.7, got: waxSpec });

  // Scene / object state (not uniforms)
  await page.evaluate(() => window.__setNoiseControls({ object: 'torus', wireframe: true, autoRotate: false }));
  await page.waitForTimeout(80);
  const object = await readState(page, 'object');
  const wireframe = await readState(page, 'wireframe');
  const autoRotate = await readState(page, 'autoRotate');
  results.push({ name: 'object → torus', ok: object === 'torus', expect: 'torus', got: object });
  results.push({ name: 'wireframe → true', ok: wireframe === true, expect: true, got: wireframe });
  results.push({ name: 'autoRotate → false', ok: autoRotate === false, expect: false, got: autoRotate });

  // Bloom state
  await page.evaluate(() =>
    window.__setNoiseControls({ bloomOn: true, bloomStrength: 1.5, bloomRadius: 0.9, bloomThreshold: 0.2 }),
  );
  await page.waitForTimeout(50);
  const bloomStrength = await readState(page, 'bloomStrength');
  results.push({
    name: 'bloomStrength state',
    ok: nearly(bloomStrength, 1.5),
    expect: 1.5,
    got: bloomStrength,
  });

  // Reset all via setControls(DEFAULTS equivalent)
  await page.evaluate(() =>
    window.__setNoiseControls({
      frequency: 1.6,
      amplitude: 0.22,
      object: 'sphere',
      gaussian: false,
      warpOn: false,
    }),
  );
  await page.waitForTimeout(50);
  const freq = await readUniform(page, 'uFrequency');
  results.push({ name: 'reset frequency', ok: nearly(freq, 1.6), expect: 1.6, got: freq });

  // Leva get round-trip
  await page.evaluate(() => window.__setNoiseControls({ frequency: 2.75 }));
  await page.waitForTimeout(30);
  const levaFreq = await page.evaluate(() => window.__getLeva('frequency'));
  results.push({ name: 'leva get frequency', ok: nearly(levaFreq, 2.75), expect: 2.75, got: levaFreq });

  // Click Leva "new seed" and "reset all" buttons if present
  const newSeed = page.getByRole('button', { name: /new seed/i });
  const resetAll = page.getByRole('button', { name: /reset all/i });
  if (await newSeed.count()) {
    const before = await readUniform(page, 'uSeed');
    await newSeed.click();
    await page.waitForTimeout(80);
    const after = await readUniform(page, 'uSeed');
    results.push({
      name: 'UI new seed button',
      ok: after !== before,
      expect: 'changed',
      got: { before, after },
    });
  } else {
    results.push({ name: 'UI new seed button', ok: false, expect: 'present', got: 'missing' });
  }

  if (await resetAll.count()) {
    await page.evaluate(() => window.__setNoiseControls({ frequency: 5, amplitude: 0.6 }));
    await page.waitForTimeout(40);
    await resetAll.click();
    await page.waitForTimeout(100);
    const rf = await readUniform(page, 'uFrequency');
    const ra = await readUniform(page, 'uAmplitude');
    results.push({
      name: 'UI reset all button',
      ok: nearly(rf, 1.6) && nearly(ra, 0.22),
      expect: 'defaults',
      got: { frequency: rf, amplitude: ra },
    });
  } else {
    results.push({ name: 'UI reset all button', ok: false, expect: 'present', got: 'missing' });
  }

  // Light preset via panel select — open Lighting and change preset
  // Fallback: call onChange path by setting lightPreset through leva after ensuring handler works.
  // Simulate selecting 'rim' by setting the control; onChange may not fire via store.set.
  // Verify store path works for lighting fields used by presets:
  await page.evaluate(() =>
    window.__setNoiseControls({
      ambient: 0.05,
      keyIntensity: 0.3,
      keyAz: 60,
      keyEl: 20,
      rim: 1.4,
      spec: 0,
      specPower: 24,
    }),
  );
  await page.waitForTimeout(50);
  const rimU = await readUniform(page, 'uRimIntensity');
  results.push({ name: 'rim preset values → uRimIntensity', ok: nearly(rimU, 1.4), expect: 1.4, got: rimU });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  const setPathWarnings = consoleErrors.filter((e) => e.includes('set` for path'));

  console.log('\n=== Noise control check ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (got ${JSON.stringify(r.got)}, expect ${JSON.stringify(r.expect)})`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (setPathWarnings.length) {
    console.log(`\nFAIL  leva set path warnings: ${setPathWarnings.length}`);
    console.log(setPathWarnings.slice(0, 3).join('\n'));
  }
  if (consoleErrors.length && !setPathWarnings.length) {
    console.log('\nOther console errors:');
    console.log([...new Set(consoleErrors)].slice(0, 5).join('\n'));
  }

  if (failed.length || setPathWarnings.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
