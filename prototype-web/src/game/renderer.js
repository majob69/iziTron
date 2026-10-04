// Renderer, Licht, Umgebung und Nachbearbeitung mit Qualitätsstufen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSensorPass } from './sensor-pass.js';

export const QUALITY_LEVELS = ['low', 'medium', 'high'];
export const QUALITY_NAMES = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' };

const QUALITY = {
  low: { pixelRatio: 0.75, bloom: false, shadows: false, shadowSize: 512, samples: 0 },
  medium: { pixelRatio: 1, bloom: true, shadows: true, shadowSize: 1024, samples: 0 },
  high: { pixelRatio: 1.5, bloom: true, shadows: true, shadowSize: 2048, samples: 4 },
};

export class Renderer {
  constructor(container, quality) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070b);
    this.scene.fog = new THREE.FogExp2(0x05070b, 0.022);

    // Umgebungsreflexion: ohne sie wirkt Metall schwarz.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);

    this.scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x1a1410, 0.45));
    const sun = new THREE.DirectionalLight(0xd6e4ff, 1.7);
    sun.position.set(-14, 26, 10);
    sun.castShadow = true;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    const sc = sun.shadow.camera;
    sc.left = -34;
    sc.right = 34;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 1;
    sc.far = 80;
    this.scene.add(sun);
    this.sun = sun;

    // Farbige Akzentlichter für Sci-Fi-Stimmung
    for (const [color, x, z, i] of [[0x33ccff, -18, -12, 40], [0xff7733, 16, 10, 40], [0x9955ff, 8, -14, 30], [0x33ccff, -10, 14, 30]]) {
      const l = new THREE.PointLight(color, i, 24, 1.6);
      l.position.set(x, 6, z);
      this.scene.add(l);
    }

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.4, 0.9);
    this.output = new OutputPass();
    this.sensor = createSensorPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.sensor);

    this.setQuality(quality);
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(level) {
    this.quality = level;
    const q = QUALITY[level];
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, q.pixelRatio);
    this.bloom.enabled = q.bloom;
    const shadowsChanged = this.renderer.shadowMap.enabled !== q.shadows;
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.composer.renderTarget1.samples = q.samples;
    this.composer.renderTarget2.samples = q.samples;
    if (shadowsChanged) this.scene.traverse((o) => o.material && (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)));
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.bloom.resolution.set((w * this.pixelRatio) / 2, (h * this.pixelRatio) / 2);
    this.sensor.uniforms.uRes.value.set(w * this.pixelRatio, h * this.pixelRatio);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.composer.render();
  }
}
