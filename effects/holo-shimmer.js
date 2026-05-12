// Created by HelloHolo developers
// Holographic shimmer shader based on camera position 
// material="shader: holo-shimmer; shimmerIntensity: 0.5;  foilBrightness: 0.2; tiling: 1.0"
AFRAME.registerShader('holo-shimmer', {
  schema: {
    src: {type: 'map', is: 'uniform'},
    shimmerIntensity: {type: 'float', is: 'uniform', default: 0.5},
    foilBrightness: {type: 'float', is: 'uniform', default: 0.2},
    tiling: {type: 'float', is: 'uniform', default: 1.0} // Higher = shorter/more gradients
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewVec;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
      vViewVec = normalize(-worldPos.xyz);
      gl_Position = projectionMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewVec;
    uniform sampler2D src;
    uniform float shimmerIntensity;
    uniform float foilBrightness;
    uniform float tiling;

    vec3 rainbow(float h) {
      h = fract(h);
      return abs(6.0 * fract(h + vec3(3.0, 2.0, 1.0) / 3.0) - 3.0) - 1.0;
    }

    void main() {
      vec4 tex = texture2D(src, vUv);
      float viewDot = dot(vNormal, vViewVec);
      
      // We multiply the entire map by 'tiling' to repeat the rainbow
      // The (1.0 - viewDot) adds the camera-based shift
      float colorMap = ((vUv.x + vUv.y) + (1.0 - viewDot) * 1.5) * tiling;
      
      vec3 foilRGB = rainbow(colorMap);
      
      // Combine with texture
      vec3 finalRGB = tex.rgb + (foilRGB * shimmerIntensity * (foilBrightness + (1.0 - viewDot)));
      
      gl_FragColor = vec4(finalRGB, tex.a);
    }
  `
});