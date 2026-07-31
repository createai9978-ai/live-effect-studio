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
  private effects: EffectParams[] = [];
  private animationId: number | null = null;
  private onFrameReady: ((canvas: HTMLCanvasElement) => void) | null = null;

  constructor() {}

  /** Initialize WebGL context and shader program */
  init(canvas: HTMLCanvasElement, video: HTMLVideoElement): boolean {
    this.canvas = canvas;
    this.video = video;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      console.warn("WebGL not supported, falling back to CSS filters");
      return false;
    }
    this.gl = gl;

    // Create shader program
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) return false;

    this.program = gl.createProgram();
    if (!this.program) return false;

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("Shader program failed to link");
      return false;
    }

    // Create video texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Set up vertex buffer
    const vertices = new Float32Array([
      -1, -1,   1, -1,
      -1,  1,   -1,  1,
       1, -1,   1,  1,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
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
    this.effects = effects;
  }

  /** Start rendering loop */
  start(onFrameReady: (canvas: HTMLCanvasElement) => void) {
    this.onFrameReady = onFrameReady;
    this.render();
  }

  /** Stop rendering loop */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private render = () => {
    if (!this.gl || !this.canvas || !this.video || !this.program) {
      this.animationId = requestAnimationFrame(this.render);
      return;
    }

    const gl = this.gl;

    // Update video texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);

    // Resize canvas to match video
    if (this.video.videoWidth && this.video.videoHeight) {
      if (this.canvas.width !== this.video.videoWidth ||
          this.canvas.height !== this.video.videoHeight) {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Use shader program
    gl.useProgram(this.program);

    // Set up vertex attribute
    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(this.program, "u_time");
    gl.uniform1f(timeLocation, performance.now() / 1000);

    const intensityLocation = gl.getUniformLocation(this.program, "u_intensity");
    const typeLocation = gl.getUniformLocation(this.program, "u_effectType");
    const colorLocation = gl.getUniformLocation(this.program, "u_color");
    const resolutionLocation = gl.getUniformLocation(this.program, "u_resolution");

    // Render each effect in sequence (simplified - real impl would use multiple passes)
    gl.uniform1f(intensityLocation, this.effects[0]?.intensity ?? 0.5);
    gl.uniform1i(typeLocation, EFFECT_TYPE_MAP[this.effects[0]?.type ?? "none"] ?? 0);

    if (this.effects[0]?.color) {
      gl.uniform3fv(colorLocation, this.effects[0].color);
    } else {
      gl.uniform3fv(colorLocation, [1, 1, 1]);
    }

    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Callback with processed frame
    if (this.onFrameReady) {
      this.onFrameReady(this.canvas);
    }

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
