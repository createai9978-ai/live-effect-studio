/**
 * WebGL-based video effect processor for NOVA Studio.
 * Provides GPU-accelerated real-time effects for the preview player.
 */

import { sampleMotionWithVelocity, type MotionSignature } from "./motionEngine";


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
  | "sharpen"
  | "procedural"
  | "rotoscope"
  | "depthMap"
  | "bodyTrack"
  | "motionVectors"
  | "motionTrail"
  | "glitchWarp"
  | "transitionWarp"
  | "opticalOverlay"
  | "splitLayout"
  | "textMotion"
  | "colorGrade"
  | "speedWarp"
  | "voiceSync"
  // ---- Real visual-effect primitives (NOT colour grades) ----
  | "gaussianBlur"
  | "directionalBlur"
  | "rgbSplit"
  | "cameraShake"
  | "grain"
  | "zoomPulse"
  | "glow"
  | "vhs"
  | "lightLeakFx"
  | "glitchBlock"
  | "kaleido"
  | "mirror";

export type EffectParams = {
  type: EffectType;
  intensity: number;       // 0-1
  color?: [number, number, number];  // RGB 0-1
  texture?: string;        // URL for overlay textures
  gradient?: string;       // CSS gradient for atmosphere
  lut?: string;            // LUT data URL
  speed?: number;          // Playback speed multiplier
  offset?: number;         // Time offset for speed ramp
  seed?: number;
  motion?: number;
  warp?: number;
  trail?: number;
  audio?: number;
  /** Unique eased keyframe animation + shutter-angle motion blur for this preset. */
  motionSig?: MotionSignature;
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
  private audioLevel = 0;

  constructor() {}

  /** True when a usable GL context + linked program exist. */
  get ready(): boolean {
    return !!(this.gl && this.program && !this.failed);
  }

  setFailureHandler(cb: (() => void) | null) {
    this.onFailure = cb;
  }

  setAudioLevel(level: number) {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  private fail(reason: string): false {
    if (!this.failed) {
      this.failed = true;
      console.warn(`[VideoProcessor] GPU pipeline unavailable; showing the unprocessed source: ${reason}`);
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
    gl.uniform1f(gl.getUniformLocation(this.program, "u_seed"), effect?.seed ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_motion"), effect?.motion ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_warp"), effect?.warp ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_trail"), effect?.trail ?? 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_audio"), this.audioLevel * (effect?.audio ?? 1));

    // ---- Keyframed motion + shutter-angle motion blur -------------------
    const sig = effect?.motionSig;
    if (sig) {
      const m = sampleMotionWithVelocity(sig, performance.now() / 1000, 60);
      gl.uniform2f(gl.getUniformLocation(this.program, "u_mOffset"), m.tx, m.ty);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mScale"), m.scale);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mRot"), m.rot);
      // Velocity is in UV/frame; scaling by the shutter gives the smear length.
      gl.uniform2f(gl.getUniformLocation(this.program, "u_mVel"), m.vx, m.vy);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mZoomVel"), m.vScale);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_shutter"), m.shutter);
    } else {
      gl.uniform2f(gl.getUniformLocation(this.program, "u_mOffset"), 0, 0);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mScale"), 1);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mRot"), 0);
      gl.uniform2f(gl.getUniformLocation(this.program, "u_mVel"), 0, 0);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_mZoomVel"), 0);
      gl.uniform1f(gl.getUniformLocation(this.program, "u_shutter"), 0);
    }


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
  procedural: 14,
  rotoscope: 15,
  depthMap: 16,
  bodyTrack: 17,
  motionVectors: 18,
  motionTrail: 19,
  glitchWarp: 20,
  transitionWarp: 21,
  opticalOverlay: 22,
  splitLayout: 23,
  textMotion: 24,
  colorGrade: 25,
  speedWarp: 26,
  voiceSync: 27,
  gaussianBlur: 28,
  directionalBlur: 29,
  rgbSplit: 30,
  cameraShake: 31,
  grain: 32,
  zoomPulse: 33,
  glow: 34,
  vhs: 35,
  lightLeakFx: 36,
  glitchBlock: 37,
  kaleido: 38,
  mirror: 39,
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
  uniform float u_seed;
  uniform float u_motion;
  uniform float u_warp;
  uniform float u_trail;
  uniform float u_audio;
  uniform vec2 u_mOffset;
  uniform float u_mScale;
  uniform float u_mRot;
  uniform vec2 u_mVel;
  uniform float u_mZoomVel;
  uniform float u_shutter;


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

  vec2 safeUV(vec2 uv) { return clamp(uv, vec2(0.002), vec2(0.998)); }

  // Animated affine transform (eased keyframes are solved on the CPU and
  // delivered as u_mOffset / u_mScale / u_mRot for this exact frame).
  vec2 motionXform(vec2 uv, float back) {
    vec2 c = uv - 0.5;
    float s = sin(-u_mRot);
    float co = cos(-u_mRot);
    c = vec2(c.x * co - c.y * s, c.x * s + c.y * co);
    float sc = max(0.2, u_mScale - u_mZoomVel * back);
    c /= sc;
    c -= u_mOffset - u_mVel * back;
    return c + 0.5;
  }

  // Cinematic motion blur: accumulate 11 taps across the shutter interval so
  // fast eased sections smear and held sections stay razor sharp.
  vec3 motionSample(vec2 uv) {
    float speed = length(u_mVel) + abs(u_mZoomVel) * 0.6;
    if (u_shutter < 0.001 || speed < 0.00008) {
      return texture2D(u_video, safeUV(motionXform(uv, 0.0))).rgb;
    }
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 11; i++) {
      float f = float(i) / 10.0;                 // 0..1 across the open shutter
      float w = 1.0 - 0.55 * f;                  // weight the newest sample most
      acc += texture2D(u_video, safeUV(motionXform(uv, f * u_shutter * 1.6))).rgb * w;
      wsum += w;
    }
    return acc / wsum;
  }


  vec3 blur5(vec2 uv, vec2 direction) {
    vec3 c = texture2D(u_video, safeUV(uv)).rgb * 0.34;
    c += texture2D(u_video, safeUV(uv + direction)).rgb * 0.22;
    c += texture2D(u_video, safeUV(uv - direction)).rgb * 0.22;
    c += texture2D(u_video, safeUV(uv + direction * 2.0)).rgb * 0.11;
    c += texture2D(u_video, safeUV(uv - direction * 2.0)).rgb * 0.11;
    return c;
  }

  void main() {
    // Sample through the preset's own animated transform, with shutter blur.
    vec2 uv = motionXform(v_uv, 0.0);
    vec3 color = motionSample(v_uv);


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
    } else if (u_effectType == 14) {
      float wave = sin((uv.y * (7.0 + u_seed * 19.0) + u_time * (0.4 + u_motion * 2.0)) * 6.2831);
      vec2 p = safeUV(uv + vec2(wave * u_warp * 0.012, 0.0));
      color = mix(color, texture2D(u_video, p).rgb, u_intensity);
    } else if (u_effectType == 15) {
      vec2 px = 1.0 / u_resolution;
      vec3 gx = texture2D(u_video, safeUV(uv + vec2(px.x * 2.0, 0.0))).rgb - texture2D(u_video, safeUV(uv - vec2(px.x * 2.0, 0.0))).rgb;
      vec3 gy = texture2D(u_video, safeUV(uv + vec2(0.0, px.y * 2.0))).rgb - texture2D(u_video, safeUV(uv - vec2(0.0, px.y * 2.0))).rgb;
      float edge = smoothstep(0.06 + u_trail * 0.08, 0.3, length(gx) + length(gy));
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      float keyed = smoothstep(0.15 + u_warp * 0.12, 0.82, luma + edge * 0.45);
      vec3 matte = mix(vec3(0.025), color, keyed);
      color = mix(color, matte + u_color * edge * 0.7, u_intensity);
    } else if (u_effectType == 16) {
      vec2 subject = vec2(0.5 + sin(u_time * 0.35 + u_seed * 6.0) * 0.04, 0.48);
      float d = distance(uv, subject);
      float depth = smoothstep(0.58, 0.12 + u_trail * 0.08, d);
      vec3 background = blur5(uv, vec2(1.5 / u_resolution.x, 1.5 / u_resolution.y) * (1.0 + u_warp * 3.0));
      vec2 parallaxUV = safeUV(uv + (uv - subject) * u_warp * 0.025 * (1.0 - depth));
      background = mix(background, texture2D(u_video, parallaxUV).rgb, 0.35);
      color = mix(background, color, depth);
    } else if (u_effectType == 17) {
      vec2 center = vec2(0.5 + sin(u_time * (0.7 + u_motion) + u_seed * 9.0) * 0.12, 0.5 + cos(u_time * 0.6 + u_seed * 5.0) * 0.05);
      vec2 delta = center - vec2(0.5);
      vec2 trackedUV = safeUV(uv - delta * (0.25 + u_warp * 0.55));
      color = mix(color, texture2D(u_video, trackedUV).rgb, u_intensity * 0.72);
      float ring = smoothstep(0.025, 0.0, abs(distance(uv, center) - (0.19 + u_warp * 0.08)));
      color += u_color * ring * u_intensity;
    } else if (u_effectType == 18 || u_effectType == 19) {
      vec2 vector = vec2(sin(u_time * (1.0 + u_motion * 3.0) + u_seed * 12.0), cos(u_time * 0.8 + u_seed * 7.0));
      vector *= (0.002 + u_warp * 0.018);
      vec3 trail = blur5(uv, vector);
      color = mix(color, trail, u_intensity * (0.35 + u_trail * 0.55));
    } else if (u_effectType == 20) {
      float band = step(0.72, random(vec2(floor(uv.y * (12.0 + u_seed * 40.0)), floor(u_time * (8.0 + u_motion * 16.0)))));
      float shift = band * (u_warp * 0.07 + 0.004);
      color.r = texture2D(u_video, safeUV(uv + vec2(shift, 0.0))).r;
      color.b = texture2D(u_video, safeUV(uv - vec2(shift, 0.0))).b;
    } else if (u_effectType == 21) {
      float phase = 0.5 + 0.5 * sin(u_time * (0.7 + u_motion * 2.4) + u_seed * 6.2831);
      vec2 centered = uv - 0.5;
      vec2 p = safeUV(centered * (1.0 - phase * u_warp * 0.28) + 0.5 + vec2((phase - 0.5) * u_warp * 0.08, 0.0));
      color = mix(color, blur5(p, vec2(u_warp * 0.012, 0.0)), u_intensity);
    } else if (u_effectType == 22) {
      vec2 lightPos = vec2(0.2 + 0.6 * fract(u_seed + u_time * 0.035 * (1.0 + u_motion)), 0.25 + u_seed * 0.35);
      float flare = pow(max(0.0, 1.0 - distance(uv, lightPos)), 8.0) + smoothstep(0.012, 0.0, abs(uv.y - lightPos.y)) * 0.22;
      color += u_color * flare * u_intensity;
    } else if (u_effectType == 23) {
      float cols = 2.0 + floor(u_seed * 3.0);
      vec2 tile = fract(uv * vec2(cols, 2.0));
      vec2 source = safeUV(tile * 0.5 + vec2(floor(uv.x * cols) / cols * 0.18, floor(uv.y * 2.0) * 0.16));
      color = mix(color, texture2D(u_video, source).rgb, u_intensity);
    } else if (u_effectType == 24) {
      float scan = smoothstep(0.025, 0.0, abs(uv.y - (0.72 + sin(u_time * 1.4 + u_seed * 8.0) * 0.035)));
      float bars = step(0.48, fract(uv.x * (8.0 + floor(u_seed * 12.0)) + u_time * u_motion));
      color += u_color * scan * bars * u_intensity;
    } else if (u_effectType == 25) {
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      vec3 tint = mix(vec3(luma), color * u_color * 1.35, 0.62 + u_seed * 0.25);
      color = mix(color, tint, u_intensity);
    } else if (u_effectType == 26) {
      vec2 dir = normalize(uv - vec2(0.5) + vec2(0.0001));
      color = mix(color, blur5(uv, dir * (0.002 + u_motion * 0.012)), u_intensity * 0.72);
    } else if (u_effectType == 27) {
      float beat = max(u_audio, 0.08 + 0.08 * sin(u_time * (4.0 + u_motion * 8.0)));
      vec2 centered = uv - vec2(0.5);
      vec2 pulseUV = safeUV(centered / (1.0 + beat * (0.04 + u_warp * 0.1)) + vec2(0.5));
      vec3 pulse = texture2D(u_video, pulseUV).rgb;
      float ring = smoothstep(0.03, 0.0, abs(length(centered) - (0.18 + beat * 0.32)));
      color = mix(color, pulse, u_intensity * 0.8) + u_color * ring * beat * u_intensity;
    } else if (u_effectType == 28) {
      // Gaussian blur — real spatial convolution, 13 taps on two axes.
      float r = (0.6 + u_intensity * 5.0 + u_warp * 4.0);
      vec2 px = r / u_resolution;
      vec3 acc = vec3(0.0);
      float wsum = 0.0;
      for (int i = -3; i <= 3; i++) {
        for (int j = -3; j <= 3; j++) {
          vec2 o = vec2(float(i), float(j)) * px;
          float w = exp(-(float(i * i + j * j)) / 6.0);
          acc += texture2D(u_video, safeUV(uv + o)).rgb * w;
          wsum += w;
        }
      }
      color = acc / wsum;
    } else if (u_effectType == 29) {
      // Directional / motion blur along a preset-specific angle.
      float ang = u_seed * 6.2831 + u_time * u_motion * 0.4;
      vec2 dir = vec2(cos(ang), sin(ang)) * (0.004 + u_intensity * 0.05);
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        float t = (float(i) / 8.0 - 0.5);
        acc += texture2D(u_video, safeUV(uv + dir * t)).rgb;
      }
      color = acc / 9.0;
    } else if (u_effectType == 30) {
      // RGB split — geometric channel displacement, not a tint.
      float ang = u_seed * 6.2831;
      vec2 d = vec2(cos(ang), sin(ang)) * (0.004 + u_intensity * 0.03) * (0.7 + 0.3 * sin(u_time * 3.0));
      color.r = texture2D(u_video, safeUV(uv + d)).r;
      color.g = texture2D(u_video, safeUV(uv)).g;
      color.b = texture2D(u_video, safeUV(uv - d)).b;
    } else if (u_effectType == 31) {
      // Camera shake — real frame displacement with sub-pixel jitter.
      float f = 6.0 + u_motion * 22.0;
      vec2 shake = vec2(
        sin(u_time * f + u_seed * 11.0) * 0.5 + sin(u_time * f * 2.3) * 0.5,
        cos(u_time * f * 0.87 + u_seed * 7.0)
      ) * (0.004 + u_intensity * 0.045);
      vec2 z = (uv - 0.5) / (1.0 + u_intensity * 0.08) + 0.5;
      color = texture2D(u_video, safeUV(z + shake)).rgb;
    } else if (u_effectType == 32) {
      // Film grain + subtle gate flicker.
      float n = random(uv * u_resolution * 0.5 + fract(u_time) * 91.7) - 0.5;
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      color += n * u_intensity * 0.35 * (1.2 - lum);
      color *= 1.0 + sin(u_time * 21.0 + u_seed * 5.0) * 0.012 * u_intensity;
    } else if (u_effectType == 33) {
      // Zoom pulse — rhythmic scale punch with radial smear.
      float beat = 0.5 + 0.5 * sin(u_time * (2.0 + u_motion * 6.0) + u_seed * 6.28);
      float s = 1.0 + beat * (0.06 + u_intensity * 0.22);
      vec2 z = (uv - 0.5) / s + 0.5;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 6; i++) {
        float t = float(i) / 5.0;
        vec2 p = mix(z, uv, t * 0.35);
        acc += texture2D(u_video, safeUV(p)).rgb;
      }
      color = acc / 6.0;
    } else if (u_effectType == 34) {
      // Glow / bloom — highlight extraction blurred and screened back.
      vec2 px = (2.5 + u_intensity * 6.0) / u_resolution;
      vec3 bloom = vec3(0.0);
      for (int i = -2; i <= 2; i++) {
        for (int j = -2; j <= 2; j++) {
          vec3 s = texture2D(u_video, safeUV(uv + vec2(float(i), float(j)) * px)).rgb;
          float l = dot(s, vec3(0.299, 0.587, 0.114));
          bloom += s * smoothstep(0.55, 1.0, l);
        }
      }
      bloom /= 25.0;
      color = 1.0 - (1.0 - color) * (1.0 - bloom * (0.6 + u_intensity * 1.4));
    } else if (u_effectType == 35) {
      // VHS — tape warp, head-switch tear, scanlines and chroma bleed.
      float line = floor(uv.y * 240.0);
      float wob = sin(u_time * 2.0 + line * 0.09) * 0.0018 * (1.0 + u_intensity * 6.0);
      float tear = step(0.985, random(vec2(line, floor(u_time * 8.0)))) * 0.03 * u_intensity;
      vec2 p = safeUV(uv + vec2(wob + tear, 0.0));
      color.r = texture2D(u_video, safeUV(p + vec2(0.0035 * u_intensity, 0.0))).r;
      color.g = texture2D(u_video, p).g;
      color.b = texture2D(u_video, safeUV(p - vec2(0.0035 * u_intensity, 0.0))).b;
      color *= 0.86 + 0.14 * sin(uv.y * u_resolution.y * 1.6);
      color += (random(uv + fract(u_time)) - 0.5) * 0.08 * u_intensity;
    } else if (u_effectType == 36) {
      // Light leak — animated soft gradient burn across the frame.
      float ang = u_seed * 6.2831;
      vec2 dir = vec2(cos(ang), sin(ang));
      float pos = 0.5 + 0.45 * sin(u_time * (0.25 + u_motion * 0.5) + u_seed * 3.1);
      float band = exp(-pow((dot(uv - 0.5, dir) + 0.5 - pos) * 3.4, 2.0) * 4.0);
      vec3 leak = mix(vec3(1.0, 0.62, 0.28), u_color, 0.45) * band * u_intensity * 1.4;
      color = 1.0 - (1.0 - color) * (1.0 - leak);
    } else if (u_effectType == 37) {
      // Digital glitch — block displacement + channel corruption.
      float rows = 14.0 + floor(u_seed * 26.0);
      float row = floor(uv.y * rows);
      float t = floor(u_time * (6.0 + u_motion * 14.0));
      float hit = step(0.7, random(vec2(row, t)));
      float shift = (random(vec2(row, t + 1.0)) - 0.5) * u_intensity * 0.22 * hit;
      vec2 p = safeUV(uv + vec2(shift, 0.0));
      color = texture2D(u_video, p).rgb;
      color.r = texture2D(u_video, safeUV(p + vec2(shift * 0.4, 0.0))).r;
      color.b = texture2D(u_video, safeUV(p - vec2(shift * 0.4, 0.0))).b;
      color = mix(color, vec3(dot(color, vec3(0.33))), hit * 0.12 * u_intensity);
    } else if (u_effectType == 38) {
      // Kaleidoscope fold.
      vec2 c = uv - 0.5;
      float a = atan(c.y, c.x);
      float rr = length(c);
      float seg = 3.0 + floor(u_seed * 6.0);
      a = abs(mod(a + u_time * 0.2 * u_motion, 6.2831 / seg) - 3.1415 / seg);
      vec2 p = safeUV(vec2(cos(a), sin(a)) * rr + 0.5);
      color = mix(color, texture2D(u_video, p).rgb, u_intensity);
    } else if (u_effectType == 39) {
      // Mirror split.
      vec2 p = uv;
      p.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
      color = mix(color, texture2D(u_video, safeUV(p)).rgb, u_intensity);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Singleton instance for the app */
export const videoProcessor = new VideoProcessor();
