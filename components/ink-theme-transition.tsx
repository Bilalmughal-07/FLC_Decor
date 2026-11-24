"use client";

import { useEffect, useRef } from "react";

type Theme = "light" | "dark";
type Point = { x: number; y: number };
type ToggleDetail = { point: Point };

const CSS_DURATION = 1180;

const vertexShader = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D uSnapshot;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform float uProgress;
uniform float uSeed;
uniform float uTime;
out vec4 outColor;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y); }
float organicNoise(vec2 p) { return noise(p * 2.2 + uSeed) * 0.55 + noise(p * 5.7 - uSeed * 0.7) * 0.3 + noise(p * 12.0 + uSeed * 1.4) * 0.15; }
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 origin = vec2(uOrigin.x / uResolution.x, 1.0 - uOrigin.y / uResolution.y);
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  float distanceFromOrigin = length((uv - origin) * aspect);
  float farthest = max(max(length(vec2(origin.x, origin.y) * aspect), length(vec2(1.0 - origin.x, origin.y) * aspect)), max(length(vec2(origin.x, 1.0 - origin.y) * aspect), length(vec2(1.0 - origin.x, 1.0 - origin.y) * aspect)));
  float radius = uProgress * farthest * 1.2;
  vec2 direction = normalize((uv - origin) * aspect + vec2(0.0001));
  // WebGL coordinates grow upward; negative Y sends the front toward the
  // bottom of the screen while the negative X component sends it left.
  float diagonalCurrent = dot(direction, normalize(vec2(-0.82, -0.82))) * uProgress * 0.095;
  vec2 flow = (uv - origin) * vec2(7.0, 7.0) + vec2(uTime * 0.13, -uTime * 0.09);
  float edgeOne = (organicNoise(flow) - 0.5) * 0.2;
  float edgeTwo = (organicNoise(flow * 1.35 + vec2(4.2, -1.7)) - 0.5) * 0.16;
  float edgeThree = (organicNoise(flow * 2.15 + vec2(-2.8, 5.1)) - 0.5) * 0.1;
  float revealOne = smoothstep(radius + diagonalCurrent + edgeOne + 0.03, radius + diagonalCurrent + edgeOne - 0.03, distanceFromOrigin);
  float revealTwo = smoothstep(radius * 0.965 + diagonalCurrent * 0.78 + edgeTwo + 0.022, radius * 0.965 + diagonalCurrent * 0.78 + edgeTwo - 0.022, distanceFromOrigin);
  float revealThree = smoothstep(radius * 1.025 + diagonalCurrent * 1.12 + edgeThree + 0.014, radius * 1.025 + diagonalCurrent * 1.12 + edgeThree - 0.014, distanceFromOrigin);
  float reveal = min(revealOne, min(revealTwo, revealThree));
  outColor = vec4(texture(uSnapshot, vec2(uv.x, 1.0 - uv.y)).rgb, reveal);
}
`;

function currentTheme(): Theme { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }

function otherTheme(theme: Theme): Theme { return theme === "dark" ? "light" : "dark"; }

function themeCanvas(theme: Theme): string { return theme === "dark" ? "#171614" : "#f8f6f2"; }

function themeVariables(theme: Theme): Record<string, string> {
  return theme === "dark"
    ? { "--canvas": "#171614", "--surface": "#22201d", "--elevated": "#2b2824", "--ink": "#f5f1ea", "--muted": "#b9b0a3", "--line": "#39352f", "--brass": "#c3a77e", "--sage": "#aebba4", "--deep": "#f5f1ea", "--soft": "#2b2824" }
    : { "--canvas": "#f8f6f2", "--surface": "#ffffff", "--elevated": "#ffffff", "--ink": "#242424", "--muted": "#645f58", "--line": "#eae6df", "--brass": "#91785a", "--sage": "#536052", "--deep": "#242424", "--soft": "#f2efea" };
}

function commitTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("flc-theme", theme);
  window.dispatchEvent(new Event("flc-theme-change"));
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("INK_SHADER_CREATE_FAILED");
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader) ?? "INK_SHADER_COMPILE_FAILED"; gl.deleteShader(shader); throw new Error(message); }
  return shader;
}

function createWebglRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl) return null;
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  try {
    vertex = compile(gl, gl.VERTEX_SHADER, vertexShader); fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
    program = gl.createProgram(); buffer = gl.createBuffer(); texture = gl.createTexture();
    if (!program || !buffer || !texture) throw new Error("INK_WEBGL_RESOURCE_FAILED");
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    vertex = null; fragment = null;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "INK_PROGRAM_LINK_FAILED");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { gl, program, buffer, texture, position: gl.getAttribLocation(program, "position"), resolution: gl.getUniformLocation(program, "uResolution"), origin: gl.getUniformLocation(program, "uOrigin"), progress: gl.getUniformLocation(program, "uProgress"), seed: gl.getUniformLocation(program, "uSeed"), time: gl.getUniformLocation(program, "uTime"), snapshot: gl.getUniformLocation(program, "uSnapshot") };
  } catch (error) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    console.warn("Ink theme WebGL renderer unavailable; using CSS fallback.", error);
    return null;
  }
}

function safeSnapshot(theme: Theme): HTMLCanvasElement {
  const snapshot = document.createElement("canvas");
  snapshot.width = Math.max(1, window.innerWidth);
  snapshot.height = Math.max(1, window.innerHeight);
  const context = snapshot.getContext("2d");
  if (context) {
    context.fillStyle = themeCanvas(theme);
    context.fillRect(0, 0, snapshot.width, snapshot.height);
  }
  return snapshot;
}

export function InkThemeTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = createWebglRenderer(canvas);
    document.documentElement.dataset.ink = renderer ? "webgl" : "css";
    let animationFrame = 0;
    let fallbackTimer = 0;
    let fallbackImage: HTMLImageElement | null = null;
    let active = false;
    let destroyed = false;
    let generation = 0;
    let pendingTheme: Theme | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
      if (renderer) renderer.gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const clearFallback = () => {
      window.clearTimeout(fallbackTimer);
      fallbackImage?.remove();
      fallbackImage = null;
    };

    const stop = () => {
      generation += 1;
      window.cancelAnimationFrame(animationFrame);
      active = false;
      pendingTheme = null;
      delete document.documentElement.dataset.inkPhase;
      canvas.classList.remove("is-active");
      canvas.style.opacity = "0";
      clearFallback();
    };

    const isCurrent = (run: number) => !destroyed && generation === run;

    const showCssFallback = (snapshot: HTMLCanvasElement, point: Point, to: Theme, run: number) => {
      const image = document.createElement("img");
      image.className = "ink-theme-fallback";
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.src = snapshot.toDataURL("image/jpeg", 0.82);
      image.style.setProperty("--ink-x", `${point.x}px`);
      image.style.setProperty("--ink-y", `${point.y}px`);
      image.style.setProperty("--ink-duration", `${CSS_DURATION}ms`);
      image.dataset.toTheme = to;
      fallbackImage = image;
      document.body.append(image);
      window.requestAnimationFrame(() => {
        if (isCurrent(run)) image.classList.add("is-active");
      });
      fallbackTimer = window.setTimeout(() => {
        if (!isCurrent(run)) return;
        commitTheme(to);
        document.documentElement.dataset.inkPhase = "committed";
        image.classList.add("is-done");
        fallbackTimer = window.setTimeout(() => {
          if (!isCurrent(run)) return;
          clearFallback();
          active = false;
          pendingTheme = null;
          delete document.documentElement.dataset.inkPhase;
        }, 140);
      }, CSS_DURATION + 20);
    };

    const transition = (event: Event) => {
      event.preventDefault();
      if (active) return;
      const custom = event as CustomEvent<ToggleDetail>;
      const from = currentTheme();
      const to = otherTheme(from);
      const point = custom.detail?.point ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      if (reducedMotion.matches) {
        document.documentElement.dataset.inkTransition = "reduced-motion";
        commitTheme(to);
        document.documentElement.dataset.inkPhase = "committed";
        return;
      }
      const run = ++generation;
      active = true;
      pendingTheme = to;
      document.documentElement.dataset.inkOrigin = `${Math.round(point.x)},${Math.round(point.y)}`;
      document.documentElement.dataset.inkTransition = renderer ? "webgl" : "css";
      resize();

      void (async () => {
        let snapshot: HTMLCanvasElement;
        try {
          const { default: html2canvas } = await import("html2canvas");
          if (!isCurrent(run)) return;
          snapshot = await html2canvas(document.documentElement, {
            backgroundColor: themeCanvas(to),
            width: window.innerWidth,
            height: window.innerHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            x: window.scrollX,
            y: window.scrollY,
            scale: Math.min(window.devicePixelRatio || 1, 1.5),
            logging: false,
            useCORS: true,
            foreignObjectRendering: true,
            onclone: (clonedDocument) => {
              clonedDocument.documentElement.dataset.theme = to;
              Object.entries(themeVariables(to)).forEach(([name, value]) => clonedDocument.documentElement.style.setProperty(name, value));
              clonedDocument.querySelectorAll("style").forEach((style) => {
                style.textContent = style.textContent.replace(/color-mix\([^;]+/g, "transparent");
              });
              clonedDocument.querySelectorAll("[data-ink-live]").forEach((element) => {
                (element as HTMLElement).style.display = "none";
              });
            },
          });
        } catch (error) {
          console.warn("Ink theme capture failed; using a safe destination texture.", error);
          snapshot = safeSnapshot(to);
        }
        if (!isCurrent(run)) return;
        if (!renderer) {
          document.documentElement.dataset.inkPhase = "revealing";
          showCssFallback(snapshot, point, to, run);
          return;
        }
        const { gl } = renderer;
        gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot);
        gl.useProgram(renderer.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
        gl.enableVertexAttribArray(renderer.position);
        gl.vertexAttribPointer(renderer.position, 2, gl.FLOAT, false, 0, 0);
        canvas.classList.add("is-active");
        canvas.style.opacity = "1";
        document.documentElement.dataset.inkPhase = "revealing";
        const started = performance.now();
        const seed = Math.random() * 80;
        const draw = (now: number) => {
          if (!isCurrent(run)) return;
          const progress = Math.min(1, (now - started) / CSS_DURATION);
          gl.uniform2f(renderer.resolution, canvas.width, canvas.height);
          gl.uniform2f(renderer.origin, point.x * canvas.width / window.innerWidth, point.y * canvas.height / window.innerHeight);
          gl.uniform1f(renderer.progress, 1 - Math.pow(1 - progress, 3));
          gl.uniform1f(renderer.seed, seed);
          gl.uniform1f(renderer.time, (now - started) / 1000);
          gl.uniform1i(renderer.snapshot, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (progress < 1) {
            animationFrame = window.requestAnimationFrame(draw);
            return;
          }
          commitTheme(to);
          document.documentElement.dataset.inkPhase = "committed";
          animationFrame = window.requestAnimationFrame(() => {
            if (!isCurrent(run)) return;
            canvas.classList.remove("is-active");
            canvas.style.opacity = "0";
            active = false;
            pendingTheme = null;
            delete document.documentElement.dataset.inkPhase;
          });
        };
        animationFrame = window.requestAnimationFrame(draw);
      })();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      const target = pendingTheme;
      stop();
      document.documentElement.dataset.ink = "css";
      if (target) commitTheme(target);
    };

    const onResize = () => {
      const target = pendingTheme;
      if (active && target) {
        stop();
        commitTheme(target);
      }
      resize();
    };

    resize();
    canvas.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener("resize", onResize);
    window.addEventListener("flc-theme-toggle", transition as EventListener);
    return () => {
      destroyed = true;
      stop();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("flc-theme-toggle", transition as EventListener);
      if (renderer) {
        renderer.gl.deleteTexture(renderer.texture);
        renderer.gl.deleteBuffer(renderer.buffer);
        renderer.gl.deleteProgram(renderer.program);
      }
    };
  }, []);
  return <canvas ref={canvasRef} className="ink-theme-canvas" aria-hidden="true" data-ink-live />;
}
