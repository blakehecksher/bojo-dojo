import * as THREE from 'three';

/**
 * Creates a sky hemisphere for the scene background.
 * Simple gradient from light blue (top) to pale horizon.
 */
export function createSky(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(400, 16, 12);
  // Flip faces inward so we see the sky from inside
  geometry.scale(-1, 1, -1);

  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec3 dir = normalize(vWorldPosition);
      float h = dir.y;
      // Sky gradient: horizon to zenith
      vec3 horizon = vec3(0.75, 0.85, 0.95);
      vec3 zenith = vec3(0.35, 0.55, 0.85);
      vec3 ground = vec3(0.65, 0.72, 0.68);
      vec3 color = h > 0.0
        ? mix(horizon, zenith, pow(h, 0.6))
        : mix(horizon, ground, pow(-h, 0.4));

      // Sun — direction matches the scene's directional light (50, 80, 30).
      vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
      float d = max(dot(dir, sunDir), 0.0);
      float disc = smoothstep(0.9975, 0.9992, d);       // crisp sun disc
      float halo = pow(d, 220.0) * 0.6 + pow(d, 12.0) * 0.18; // warm glow falloff
      color += vec3(1.0, 0.93, 0.78) * halo;
      color = mix(color, vec3(1.0, 0.97, 0.9), disc);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const sky = new THREE.Mesh(geometry, material);
  sky.renderOrder = -1;
  return sky;
}
