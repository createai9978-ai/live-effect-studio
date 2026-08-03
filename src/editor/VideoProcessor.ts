/**
 * WebGL-based video effect processor for NOVA Studio.
 * Provides GPU-accelerated real-time effects for the preview player.
 */

export type EffectType =
  | "none"
  | "filmGrain"
  | "anamorphicFlare"
  | "lightLeak"
  | "atmosphereGradient"
  | "speedGlitch"
  | "chromaticAberration"
  | "speedRamp"
  | "overlay"
  | "lut"
  | "halation"
  | "vignette"
  | "blur"
  | "sharpen";

export type EffectParams = {
  type: EffectType;
  intensity: number;       // 0-1
  color?: [number, number, number];  // RGB 0-1
  texture?: string;        // URL for overlay textures
  gradient?: string;       // CSS gradient for atmosphere
  lut?: string;            // LUT data URL
  speed?: number;          // Playback speed multiplier
  offset?: number;         // Time offset for speed ramp
};

export class VideoProcessor {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private video: HTMLVideoElement | null = null;
  private texture: WebGLTexture | null = null;
  private buffer: WebGLBuffer | null = null;
  private effects: EffectParams[] = [];
  private animationId: number | null = null;
  private onFrameReady: ((canvas: HTMLCanvasElement) => void) | null = null;
  /** Called once when the GPU pipeline fails at runtime so the UI can fall back. */
  private onFailure: (() => void) | null = null;
  private failed = false;

  constructor() {}

  /** True when a usable GL context + linked program exist. */
  get ready(): boolean {
    return !!(this.gl && this.program && !this.failed);
  }

  setFailureHandler(cb: (() => void) | null) {
    this.onFailure = cb;
  }

  private fail(reason: string): false {
    if (!this.failed) {
      this.failed = true;
      console.warn(`[VideoProcessor] GPU pipeline unavailable — falling back to CSS: ${reason}`);
      this.stop();
      this.onFailure?.();
    }
    return false;
  }

  /** Initialize WebGL context and shader program */
  init(canvas: HTMLCanvasElement, video: HTMLVideoElement): boolean {
    this.canvas = canvas;
    this.video = video;
    this.failed = false;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true }) ??
        canvas.getContext("experimental-webgl", { premultipliedAlpha: false })) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) return this.fail("no WebGL context");
    this.gl = gl;

    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) return this.fail("shader compile failed");

    this.program = gl.createProgram();
    if (!this.program) return this.fail("program allocation failed");

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      return this.fail(gl.getProgramInfoLog(this.program) ?? "link error");
    }

    // Video texture — clamped + linear so no edge smear / wrap artefacts appear.
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Browsers upload video frames bottom-up; flip so the frame is never mirrored.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    return true;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  /** Set active effects array */
  setEffects(effects: EffectParams[]) {
    this.effects = effects.filter((e) => e && e.type !== "none" && EFFECT_TYPE_MAP[e.type] !== undefined);
  }

  /** Start rendering loop */
  start(onFrameReady: (canvas: HTMLCanvasElement) => void) {
    if (!this.ready) return;
    this.onFrameReady = onFrameReady;
    if (this.animationId === null) this.render();
  }

  /** Stop rendering loop */
  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** Release GL resources (called when the active clip changes / unmounts). */
  dispose() {
    this.stop();
    const gl = this.gl;
    if (gl) {
      if (this.texture) gl.deleteTexture(this.texture);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.program) gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.buffer = null;
    this.video = null;
    this.canvas = null;
    this.onFrameReady = null;
  }

  private render = () => {
    if (this.failed) return;
    const gl = this.gl;
    const video = this.video;
    const canvas = this.canvas;
    if (!gl || !canvas || !video || !this.program) {
      this.animationId = requestAnimationFrame(this.render);
      return;
    }

    // Never upload an undecoded frame — that is what produced torn / blasted output.
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      this.animationId = requestAnimationFrame(this.render);
      return;
    }

    // Keep the drawing buffer at the source resolution so the frame is never stretched.
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    } catch {
      this.fail("frame upload rejected (cross-origin or decoding)");
      return;
    }
    const samplerLocation = gl.getUniformLocation(this.program, "u_video");
    gl.uniform1i(samplerLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const effect = this.effects[0];
    gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), performance.now() / 1000);
    gl.uniform1f(
      gl.getUniformLocation(this.program, "u_intensity"),
      Math.max(0, Math.min(1, effect?.intensity ?? 0.5))
    );
    gl.uniform1i(gl.getUniformLocation(this.program, "u_effectType"), EFFECT_TYPE_MAP[effect?.type ?? "none"] ?? 0);
    gl.uniform3fv(gl.getUniformLocation(this.program, "u_color"), effect?.color ?? [1, 1, 1]);
    gl.uniform2f(gl.getUniformLocation(this.program, "u_resolution"), canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (gl.getError() !== gl.NO_ERROR) {
      this.fail("GL draw error");
      return;
    }

    this.onFrameReady?.(canvas);
    this.animationId = requestAnimationFrame(this.render);
  };
}

/** Effect type enum for shader */
const EFFECT_TYPE_MAP: Record<EffectType, number> = {
  none: 0,
  filmGrain: 1,
  anamorphicFlare: 2,
  lightLeak: 3,
  atmosphereGradient: 4,
  speedGlitch: 5,
  chromaticAberration: 6,
  speedRamp: 7,
  overlay: 8,
  lut: 9,
  halation: 10,
  vignette: 11,
  blur: 12,
  sharpen: 13,
};

/** Vertex shader - pass-through */
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/** Fragment shader - effect implementations */
const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_video;
  uniform float u_time;
  uniform float u_intensity;
  uniform int u_effectType;
  uniform vec3 u_color;
  uniform vec2 u_resolution;

  // Pseudo-random noise
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // Film grain noise
  float grain(vec2 st) {
    return random(st + u_time * 0.5) * u_intensity;
  }

  // Anamorphic lens flare
  vec3 anamorphicFlare(vec2 uv, vec3 color) {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    float flare = exp(-dist * 4.0) * u_intensity;
    vec2 streakUV = uv - center;
    float streak = smoothstep(0.48, 0.52, abs(streakUV.x)) * flare;
    return color * streak + color * flare * 0.3;
  }

  // Light leak overlay
  vec3 lightLeak(vec2 uv, vec3 color) {
    float leak = smoothstep(0.7, 0.3, uv.x) * sin(uv.y * 3.14159) * u_intensity;
    return color * leak;
  }

  // Chromatic aberration (RGB split)
  vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
    vec2 offset = vec2(amount * u_intensity, 0.0);
    float r = texture2D(tex, uv - offset).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv + offset).b;
    return vec3(r, g, b);
  }

  // Speed glitch effect
  vec3 speedGlitch(sampler2D tex, vec2 uv) {
    float glitch = step(0.98, random(vec2(u_time * 10.0, uv.y)));
    float offset = glitch * u_intensity * 0.1;
    return texture2D(tex, uv + vec2(offset, 0.0)).rgb;
  }

  // Halation bloom
  vec3 halation(sampler2D tex, vec2 uv) {
    vec3 color = texture2D(tex, uv).rgb;
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    float bloom = smoothstep(0.7, 1.0, brightness) * u_intensity;
    return color + vec3(bloom * 0.3, bloom * 0.2, bloom * 0.1);
  }

  // Vignette
  vec3 vignette(vec3 color, vec2 uv) {
    float dist = distance(uv, vec2(0.5));
    float vig = smoothstep(0.7, 0.3, dist) * u_intensity;
    return color * mix(0.5, 1.0, vig);
  }

  void main() {
    vec2 uv = v_uv;
    vec3 color = texture2D(u_video, uv).rgb;

    if (u_effectType == 1) {
      // Film grain
      float n = grain(uv * u_resolution / 100.0);
      color += vec3(n);
    } else if (u_effectType == 2) {
      // Anamorphic flare
      color += anamorphicFlare(uv, u_color);
    } else if (u_effectType == 3) {
      // Light leak
      color += lightLeak(uv, u_color);
    } else if (u_effectType == 4) {
      // Atmosphere gradient (simplified)
      color = mix(color, u_color, u_intensity * 0.3);
    } else if (u_effectType == 5) {
      // Speed glitch
      color = speedGlitch(u_video, uv);
    } else if (u_effectType == 6) {
      // Chromatic aberration
      color = chromaticAberration(u_video, uv, 0.003);
    } else if (u_effectType == 10) {
      // Halation
      color = halation(u_video, uv);
    } else if (u_effectType == 11) {
      // Vignette
      color = vignette(color, uv);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Singleton instance for the app */
export const videoProcessor = new VideoProcessor();
