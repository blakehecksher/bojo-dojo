import * as THREE from 'three';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  private clock = new THREE.Clock();
  private frameCallbacks: Array<(dt: number) => void> = [];

  constructor() {
    // Renderer — 60 fps with antialiasing for smooth visuals
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.body.prepend(this.renderer.domElement);

    // Scene — sky-blue background so missing terrain is obvious (not just black)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

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
    const ambient = new THREE.AmbientLight(0xb0c4de, 0.75);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdceeff, 0x556041, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.002;
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

  /** Register a callback to run each frame. */
  onFrame(cb: (dt: number) => void) {
    this.frameCallbacks.push(cb);
  }

  /** Start the render loop (native refresh rate). */
  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05); // cap at 50ms to avoid spiral
      for (const cb of this.frameCallbacks) cb(dt);
      this.renderer.render(this.scene, this.camera);
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
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      for (const cb of this.frameCallbacks) cb(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
