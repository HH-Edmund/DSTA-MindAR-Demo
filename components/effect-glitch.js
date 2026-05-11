// effect-glitch: scanlines + random horizontal glitch bars + flicker, masked
// by a fresnel falloff so the artefacts hug the silhouette of the target
// mesh. Renders as a duplicate overlay with additive blending.
//
// Usage:
//   effect-glitch="part: Head, Hair; color: #ff3aa3; glitchRate: 1.2"
AFRAME.registerComponent('effect-glitch', {
	multiple: true,

	schema: {
		part: { type: 'string', default: '' },
		color: { type: 'color', default: '#ff3aa3' },
		intensity: { type: 'number', default: 1.0 },
		glitchRate: { type: 'number', default: 1.0 }
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
				intensity: { value: this.data.intensity },
				glitchRate: { value: this.data.glitchRate }
			},
			vertexShader: AvatarEffectUtils.SKINNING_VERTEX_SHADER,
			fragmentShader: `
				varying vec2 vUvE;
				varying vec3 vNormalE;
				varying vec3 vViewDirE;
				uniform vec3 color;
				uniform float time;
				uniform float intensity;
				uniform float glitchRate;

				float hash(vec2 p) {
					return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
				}

				void main() {
					float scan = sin(vUvE.y * 250.0 + time * 8.0) * 0.5 + 0.5;
					float scanFalloff = pow(scan, 1.5);

					float barRow = floor(vUvE.y * 24.0);
					float barTrigger = step(0.92, hash(vec2(barRow, floor(time * 3.0 * glitchRate))));

					float fresnel = 1.0 - max(dot(vNormalE, vViewDirE), 0.0);
					fresnel = pow(fresnel, 1.5);

					float flicker = step(0.5, hash(vec2(floor(time * 12.0 * glitchRate), 0.0))) * 0.4 + 0.6;

					float alpha = (scanFalloff * 0.45 + barTrigger * 0.7) * fresnel * intensity * flicker;
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
