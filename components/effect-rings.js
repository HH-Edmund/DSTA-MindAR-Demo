// effect-rings: pulsing concentric ring pattern projected through the target
// mesh's UVs. Renders as a duplicate overlay mesh with additive blending and
// a fresnel-weighted alpha so it reads strongest on silhouettes.
//
// Note: the rings are radial in UV space, so they appear once per UV island.
// Looks best on meshes with a mostly-flat unwrap (Hair, Eyes, Brows). For
// complex unwraps the pattern will tile/repeat across islands.
//
// Usage:
//   effect-rings="part: Hair; color: #ff66ff"
AFRAME.registerComponent('effect-rings', {
	multiple: true,

	schema: {
		part: { type: 'string', default: '' },
		color: { type: 'color', default: '#00e5ff' },
		intensity: { type: 'number', default: 1.0 }
	},

	init: function () {
		this.material = null;
		this.appliedMeshes = new Set();
		this.targetParts = this.parseParts(this.data.part);
		this.apply = this.apply.bind(this);
		this.el.addEventListener('model-loaded', this.apply);
		if (this.el.getObject3D('mesh')) this.apply();
	},

	remove: function () {
		this.el.removeEventListener('model-loaded', this.apply);
	},

	parseParts: function (part) {
		return part
			.split(',')
			.map(function (s) { return s.trim().toLowerCase(); })
			.filter(Boolean);
	},

	ensureMaterial: function () {
		if (this.material) return this.material;
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				color: { value: new THREE.Color(this.data.color) },
				time: { value: 0 },
				intensity: { value: this.data.intensity }
			},
			vertexShader: AvatarEffectUtils.SKINNING_VERTEX_SHADER,
			fragmentShader: `
				varying vec2 vUvE;
				varying vec3 vNormalE;
				varying vec3 vViewDirE;
				uniform vec3 color;
				uniform float time;
				uniform float intensity;

				float ring(float d, float r, float w) {
					return 1.0 - smoothstep(0.0, w, abs(d - r));
				}

				void main() {
					vec2 c = vUvE - vec2(0.5);
					float d = length(c);
					float pulse = sin(time * 1.6) * 0.025;
					float rings = 0.0;
					rings += ring(d, 0.21 + pulse, 0.018) * 0.75;
					rings += ring(d, 0.30 - pulse * 0.6, 0.014) * 0.6;
					rings += ring(d, 0.39 + pulse * 0.35, 0.012) * 0.45;
					float fade = 1.0 - smoothstep(0.43, 0.55, d);
					float fresnel = 1.0 - max(dot(vNormalE, vViewDirE), 0.0);
					float alpha = rings * fade * intensity * (0.4 + fresnel * 0.6);
					gl_FragColor = vec4(color, alpha);
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		});
		return this.material;
	},

	apply: function () {
		const root = this.el.getObject3D('mesh');
		if (!root) return;
		const targets = this.targetParts;
		const self = this;
		root.traverse(function (node) {
			if (!node.isMesh) return;
			if (targets.indexOf(node.name.toLowerCase()) === -1) return;
			if (self.appliedMeshes.has(node)) return;
			self.appliedMeshes.add(node);
			AvatarEffectUtils.createOverlayMesh(node, self.ensureMaterial());
		});
	},

	tick: function (time) {
		if (this.material) this.material.uniforms.time.value = time / 1000;
	}
});
