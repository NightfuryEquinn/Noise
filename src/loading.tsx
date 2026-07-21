import { useEffect, useRef, useState } from 'react';
import {
  EXPLORE_FRAGMENT,
  LOADER_FRAGMENT,
  LOADER_VERTEX,
} from './shaders/loader';

type LoadingScreenProps = {
  ready: boolean;
  onExplore: () => void;
};

// Compiles a WebGL program from vertex + fragment source
function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram | null {
  const vert = gl.createShader(gl.VERTEX_SHADER);
  const frag = gl.createShader(gl.FRAGMENT_SHADER);

  if (!vert || !frag) return null;

  gl.shaderSource(vert, vertSrc);
  gl.compileShader(vert);

  if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(vert));
    return null;
  }

  gl.shaderSource(frag, fragSrc);
  gl.compileShader(frag);

  if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(frag));
    return null;
  }

  const program = gl.createProgram();

  if (!program) return null;

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return null;
  }

  gl.deleteShader(vert);
  gl.deleteShader(frag);

  return program;
}

// Bordered Explore CTA with a liquid-fill shader on hover
function ExploreButton({
  ready,
  disabled,
  onClick,
}: {
  ready: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(false);
  const fillRef = useRef(0);

  // Runs the liquid fill shader; fill amount eases toward hover state
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });

    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const program = createProgram(gl, LOADER_VERTEX, EXPLORE_FRAGMENT);

    if (!program) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, 'aPos');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uFill = gl.getUniformLocation(program, 'uFill');

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let raf = 0;
    let alive = true;
    const t0 = performance.now();
    let last = t0;

    // Fits the canvas drawing buffer to its CSS size
    function resize(): void {
      if (!canvas || !gl) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    // Renders one frame of rising liquid fill
    function frame(now: number): void {
      if (!alive || !gl) return;

      const dt = Math.min(0.05, (now - last) * 0.001);
      last = now;

      const target = hoverRef.current ? 1 : 0;
      const speed = target > fillRef.current ? 3.2 : 4.5;
      fillRef.current += (target - fillRef.current) * Math.min(1, dt * speed);

      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - t0) * 0.001);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.uniform1f(uFill, fillRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <button
      type="button"
      className={`np-loader-explore${ready ? ' is-ready' : ''}`}
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={() => {
        if (ready && !disabled) hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
    >
      <canvas ref={canvasRef} className="np-loader-explore-fill" aria-hidden />
      <span className="np-loader-explore-label">Explore</span>
    </button>
  );
}

// Fullscreen minimal-shader boot overlay; Explore dismisses into the studio
export function LoadingScreen({ ready, onExplore }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);

  // Drive the soft sine-field shader while the overlay is mounted
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });

    if (!gl) return;

    const program = createProgram(gl, LOADER_VERTEX, LOADER_FRAGMENT);

    if (!program) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, 'aPos');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRes = gl.getUniformLocation(program, 'uRes');
    const uMouse = gl.getUniformLocation(program, 'uMouse');

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let raf = 0;
    let alive = true;
    const t0 = performance.now();
    const mouseTarget = { x: 0, y: 0 };
    const mouseSmooth = { x: 0, y: 0 };

    // Fits the canvas drawing buffer to its CSS size
    function resize(): void {
      if (!canvas || !gl) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    // Maps pointer position into the same UV space the shader uses
    function onPointerMove(e: PointerEvent): void {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = (x - rect.width * 0.5) / (rect.height * 0.5);
      const ny = -((y - rect.height * 0.5) / (rect.height * 0.5));
      mouseTarget.x = nx;
      mouseTarget.y = ny;
    }

    // Renders one frame of the loader field
    function frame(now: number): void {
      if (!alive || !gl) return;

      // Ease toward the cursor so the wash trails slightly
      mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.08;
      mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.08;

      resize();
      gl.uniform1f(uTime, (now - t0) * 0.001);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.uniform2f(uMouse, mouseSmooth.x, mouseSmooth.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, []);

  // Starts the fade-out and notifies the parent after the transition
  function handleExplore(): void {
    if (!ready || fading) return;

    setFading(true);
    window.setTimeout(() => {
      setMounted(false);
      onExplore();
    }, 700);
  }

  if (!mounted) return null;

  return (
    <div
      className={`np-loader${fading ? ' is-fading' : ''}`}
      aria-busy={!ready}
      aria-live="polite"
    >
      <canvas ref={canvasRef} className="np-loader-canvas" />
      <div className="np-loader-brand">
        <span className="np-loader-title">Noise</span>
        <span className="np-loader-sub">studio</span>
        <ExploreButton
          ready={ready}
          disabled={!ready || fading}
          onClick={handleExplore}
        />
      </div>
    </div>
  );
}
