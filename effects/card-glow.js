// Created by HelloHolo developers
// Simple card glow shader. 
// <a-plane position="0 0 -0.02" height="2" width="1.2" rotation="0 0 90" material="shader: card-glow; color: #00e5ff; intensity: 1.35; transparent: true; depthWrite: false; blending: additive;">
AFRAME.registerShader('card-glow', {
  schema: {
    color: { type: 'color', is: 'uniform', default: '#00e5ff' },
    intensity: { type: 'float', is: 'uniform', default: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec3 color;
    uniform float intensity;

    void main() {
      vec2 centeredUv = vUv - vec2(0.5);
      float distanceFromCenter = length(centeredUv * vec2(1.0, 1.0));
      float glow = 1.0 - smoothstep(0.08, 0.52, distanceFromCenter);
      float alpha = glow * glow * 0.72 * intensity;

      gl_FragColor = vec4(color, alpha);
    }
  `
});
