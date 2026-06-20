import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export interface NeuralVortexBackgroundProps {
  className?: string;
  /** Size to parent container instead of the viewport. */
  contained?: boolean;
}

const VERTEX_SHADER = `
  precision mediump float;
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_ratio;
  uniform vec2 u_pointer_position;
  uniform float u_scroll_progress;

  vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float neuro_shape(vec2 uv, float t, float p) {
    vec2 sine_acc = vec2(0.);
    vec2 res = vec2(0.);
    float scale = 8.;
    for (int j = 0; j < 15; j++) {
      uv = rotate(uv, 1.);
      sine_acc = rotate(sine_acc, 1.);
      vec2 layer = uv * scale + float(j) + sine_acc - t;
      sine_acc += sin(layer) + 2.4 * p;
      res += (.5 + .5 * cos(layer)) / scale;
      scale *= 1.2;
    }
    return res.x + res.y;
  }

  void main() {
    vec2 uv = .5 * vUv;
    uv.x *= u_ratio;
    vec2 pointer = vUv - u_pointer_position;
    pointer.x *= u_ratio;
    float p = clamp(length(pointer), 0., 1.);
    p = .5 * pow(1. - p, 2.);
    float t = .001 * u_time;
    float noise = neuro_shape(uv, t, p);
    noise = 1.15 * pow(noise, 2.8);
    noise += pow(noise, 8.) * 0.85;
    noise = max(.0, noise - .42);
    noise *= (1. - length(vUv - .5) * 0.85);

    // Dark base + CardSync cyan + two violet glows
    vec3 baseDark = vec3(0.03, 0.05, 0.12);
    vec3 violet = vec3(0.62, 0.28, 0.95);
    vec3 violetDeep = vec3(0.38, 0.12, 0.72);
    vec3 cyan = vec3(0.10, 0.58, 0.88);

    vec3 glow = mix(violetDeep, mix(violet, cyan, 0.42 + 0.2 * sin(2.0 * u_scroll_progress + 1.2)), noise);
    glow += violet * (0.15 + 0.08 * sin(2.0 * u_scroll_progress + 1.5));
    vec3 color = baseDark + glow * noise * 1.65;

    float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.65;
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Interactive neural vortex canvas — use as auth/marketing background layer. */
export function NeuralVortexBackground({ className, contained = true }: NeuralVortexBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, tX: 0, tY: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const rootEl = rootRef.current;
    if (!canvasEl) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const gl =
      canvasEl.getContext("webgl") ??
      canvasEl.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRatio = gl.getUniformLocation(program, "u_ratio");
    const uPointerPosition = gl.getUniformLocation(program, "u_pointer_position");
    const uScrollProgress = gl.getUniformLocation(program, "u_scroll_progress");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const getBounds = () => {
      if (contained && rootEl) {
        return rootEl.getBoundingClientRect();
      }
      return { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    };

    const resizeCanvas = () => {
      const bounds = getBounds();
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(bounds.width * devicePixelRatio));
      const height = Math.max(1, Math.floor(bounds.height * devicePixelRatio));
      canvasEl.width = width;
      canvasEl.height = height;
      canvasEl.style.width = `${bounds.width}px`;
      canvasEl.style.height = `${bounds.height}px`;
      gl.viewport(0, 0, width, height);
      gl.uniform1f(uRatio, width / height);
    };

    resizeCanvas();

    const render = () => {
      const bounds = getBounds();
      pointer.current.x += (pointer.current.tX - pointer.current.x) * 0.2;
      pointer.current.y += (pointer.current.tY - pointer.current.y) * 0.2;

      gl.uniform1f(uTime, performance.now());
      gl.uniform2f(
        uPointerPosition,
        (pointer.current.x - bounds.left) / bounds.width,
        1 - (pointer.current.y - bounds.top) / bounds.height,
      );
      gl.uniform1f(uScrollProgress, window.pageYOffset / (2 * window.innerHeight));

      gl.clearColor(0.03, 0.05, 0.12, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    const handlePointerMove = (e: PointerEvent) => {
      pointer.current.tX = e.clientX;
      pointer.current.tY = e.clientY;
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove);

    const observer = contained && rootEl ? new ResizeObserver(resizeCanvas) : null;
    observer?.observe(rootEl);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      observer?.disconnect();
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [contained]);

  return (
    <div
      ref={rootRef}
      className={cn("absolute inset-0 overflow-hidden bg-[#070b14]", className)}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}

export default NeuralVortexBackground;
