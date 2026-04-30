AFRAME.registerShader('halo-rings', {
  schema: {
    color: { type: 'color', is: 'uniform', default: '#00e5ff' },
    time: { type: 'float', is: 'uniform', default: 0 },
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
    uniform float time;
    uniform float intensity;

    float ring(float distanceFromCenter, float radius, float width) {
      return 1.0 - smoothstep(0.0, width, abs(distanceFromCenter - radius));
    }

    void main() {
      vec2 centeredUv = vUv - vec2(0.5);
      float distanceFromCenter = length(centeredUv);
      float pulse = sin(time * 1.6) * 0.025;
      float rings = 0.0;

      rings += ring(distanceFromCenter, 0.21 + pulse, 0.018) * 0.75;
      rings += ring(distanceFromCenter, 0.30 - pulse * 0.6, 0.014) * 0.6;
      rings += ring(distanceFromCenter, 0.39 + pulse * 0.35, 0.012) * 0.45;

      float fade = 1.0 - smoothstep(0.43, 0.55, distanceFromCenter);
      float alpha = rings * fade * intensity;

      gl_FragColor = vec4(color, alpha);
    }
  `
});

AFRAME.registerComponent('shader-time', {
  tick: function (time) {
    var mesh = this.el.getObject3D('mesh');
    var material = mesh && mesh.material;

    if (material && material.uniforms && material.uniforms.time) {
      material.uniforms.time.value = time / 1000;
    }
  }
});

