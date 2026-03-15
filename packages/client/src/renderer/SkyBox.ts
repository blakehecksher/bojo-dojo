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
      float h = normalize(vWorldPosition).y;
      // Sky gradient: horizon to zenith
      vec3 horizon = vec3(0.75, 0.85, 0.95);
      vec3 zenith = vec3(0.35, 0.55, 0.85);
      vec3 ground = vec3(0.65, 0.72, 0.68);
      vec3 color = h > 0.0
        ? mix(horizon, zenith, pow(h, 0.6))
        : mix(horizon, ground, pow(-h, 0.4));
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
