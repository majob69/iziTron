// Nachbearbeitung für die Roboter-Sicht. Das Bild hängt vom eingebauten Sensor ab:
// cheap = Rauschen, Scanlines, niedrige Auflösung; military = klar mit leichtem Tönen;
// thermal = Wärmebild (Droiden glühen).
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const SENSOR_MODES = { none: 0, cheap: 1, military: 2, thermal: 3 };
export const SENSOR_NAMES = { none: 'ohne Sensor', cheap: 'Billig-Optik', military: 'Militär-Optik', thermal: 'Thermalsensor' };

const SensorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uMode: { value: 0 },
    uMix: { value: 0 },
    uGlitch: { value: 0 },
    uRes: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform int uMode;
    uniform float uMix;
    uniform float uGlitch;
    uniform vec2 uRes;
    varying vec2 vUv;

    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

    vec3 thermal(float t) {
      vec3 c = mix(vec3(0.0, 0.0, 0.08), vec3(0.15, 0.0, 0.55), smoothstep(0.0, 0.25, t));
      c = mix(c, vec3(0.85, 0.05, 0.45), smoothstep(0.25, 0.5, t));
      c = mix(c, vec3(1.0, 0.55, 0.0), smoothstep(0.5, 0.75, t));
      return mix(c, vec3(1.0, 1.0, 0.75), smoothstep(0.75, 1.0, t));
    }

    void main() {
      vec2 uv = vUv;
      // Bildstörung beim Umschalten
      if (uGlitch > 0.0) {
        float band = step(0.7, rand(vec2(floor(uv.y * 30.0), floor(uTime * 30.0))));
        uv.x += band * (rand(vec2(uTime, uv.y)) - 0.5) * 0.08 * uGlitch;
      }
      vec4 base = texture2D(tDiffuse, uv);
      if (uMix <= 0.001 && uGlitch <= 0.001) { gl_FragColor = base; return; }
      vec3 col = base.rgb;
      float vig = smoothstep(0.9, 0.3, length(vUv - 0.5));

      if (uMode == 1) {
        vec2 px = vec2(360.0, 200.0);
        vec2 q = (floor(uv * px) + 0.5) / px;
        float wob = (rand(vec2(floor(uTime * 24.0), floor(uv.y * 50.0))) - 0.5) * 0.004;
        vec3 c;
        c.r = texture2D(tDiffuse, q + vec2(0.0035 + wob, 0.0)).r;
        c.g = texture2D(tDiffuse, q + vec2(wob, 0.0)).g;
        c.b = texture2D(tDiffuse, q - vec2(0.0035 - wob, 0.0)).b;
        float l = dot(c, vec3(0.3, 0.59, 0.11));
        c = mix(c, vec3(l) * vec3(1.0, 0.92, 0.72), 0.55);
        c += (rand(floor(uv * px) + fract(uTime)) - 0.5) * 0.2;
        c *= 0.82 + 0.18 * sin(uv.y * px.y * 3.14159);
        col = c * vig;
      } else if (uMode == 2) {
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, vec3(l * 0.8, l * 1.08, l * 1.05), 0.3);
        col *= 0.95 + 0.05 * sin(uv.y * uRes.y * 0.7 + uTime * 5.0);
        col *= mix(1.0, vig, 0.55);
      } else if (uMode == 3) {
        float l = dot(base.rgb, vec3(0.3, 0.59, 0.11));
        col = thermal(clamp(pow(l * 0.75, 0.9), 0.0, 1.0));
        col += (rand(uv * uRes + uTime) - 0.5) * 0.05;
        col *= mix(1.0, vig, 0.5);
      } else {
        col *= mix(1.0, vig, 0.4);
      }
      col += uGlitch * (rand(uv * uRes + uTime) - 0.5) * 0.3;
      gl_FragColor = vec4(mix(base.rgb, col, max(uMix, uGlitch * 0.6)), base.a);
    }`,
};

export function createSensorPass() {
  const pass = new ShaderPass(SensorShader);
  pass.setSensor = (sensor, mix, glitch, time) => {
    pass.uniforms.uMode.value = SENSOR_MODES[sensor] ?? 0;
    pass.uniforms.uMix.value = mix;
    pass.uniforms.uGlitch.value = glitch;
    pass.uniforms.uTime.value = time;
    pass.enabled = mix > 0.001 || glitch > 0.001;
  };
  return pass;
}
