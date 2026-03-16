import * as THREE from 'three';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1 / TARGET_FPS;

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private clock = new THREE.Clock();
  private accumulated = 0;
  private frameCallbacks: Array<(dt: number) => void> = [];

  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    document.body.prepend(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera — 70 degree FOV for first-person mobile
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // Add camera to scene so its children (e.g. bow model) render
    this.scene.add(this.camera);

    // Lighting
    const ambient = new THREE.AmbientLight(0xb0c4de, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sun.position.set(50, 80, 30);
    this.scene.add(sun);

    // Fog for draw distance limiting (good for mobile perf)
    this.scene.fog = new THREE.Fog(0x87ceeb, 150, 350);

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /** Register a callback to run each frame (at 30fps). */
  onFrame(cb: (dt: number) => void) {
    this.frameCallbacks.push(cb);
  }

  /** Start the 30fps render loop. */
  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();
      this.accumulated += delta;

      if (this.accumulated >= FRAME_INTERVAL) {
        const dt = this.accumulated;
        this.accumulated = 0;

        for (const cb of this.frameCallbacks) {
          cb(dt);
        }
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  /** Pause the render loop (e.g. when tab is backgrounded). */
  pause() {
    this.renderer.setAnimationLoop(null);
    this.clock.stop();
  }

  /** Resume the render loop. */
  resume() {
    this.clock.start();
    this.accumulated = 0;
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();
      this.accumulated += delta;

      if (this.accumulated >= FRAME_INTERVAL) {
        const dt = this.accumulated;
        this.accumulated = 0;

        for (const cb of this.frameCallbacks) {
          cb(dt);
        }
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
