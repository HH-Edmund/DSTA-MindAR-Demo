// effect-glow: cyan rim glow injected into the target mesh's existing PBR
// material via onBeforeCompile. Preserves textures and lighting; the glow is
// added before tonemapping so it flows through the color pipeline normally.
//
// `part` is a comma-separated list of mesh names (case-insensitive).
// Multi-instance is supported via __id suffixes for per-mesh customization:
//   effect-glow="part: Hoodie, Pants"
//   effect-glow__crown="part: Hair; color: #ff00ff; intensity: 3.0"
AFRAME.registerComponent('effect-glow', {
	multiple: true,

	schema: {
		part: { type: 'string', default: '' },
		color: { type: 'color', default: '#00e5ff' },
		intensity: { type: 'number', default: 2.5 }
	},

	init: function () {
		this.shaderRefs = [];
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
			self.injectGlow(node);
		});
	},

	injectGlow: function (mesh) {
		if (!mesh.material || mesh.userData.effectGlowApplied) {
			if (mesh.userData.effectGlowApplied) {
				console.warn('[effect-glow] mesh "' + mesh.name + '" already has a glow applied; skipping.');
			}
			return;
		}
		mesh.userData.effectGlowApplied = true;

		// Clone so meshes that share the original material don't pick up the glow.
		const material = mesh.material.clone();
		mesh.material = material;

		const color = new THREE.Color(this.data.color);
		const intensity = this.data.intensity;
		const shaderRefs = this.shaderRefs;

		material.onBeforeCompile = function (shader) {
			shader.uniforms.glowColor = { value: color };
			shader.uniforms.glowIntensity = { value: intensity };
			shader.uniforms.glowTime = { value: 0 };

			shader.fragmentShader =
				'uniform vec3 glowColor;\nuniform float glowIntensity;\nuniform float glowTime;\n' +
				shader.fragmentShader.replace(
					'#include <tonemapping_fragment>',
					`{
						vec3 viewDir = normalize(vViewPosition);
						vec3 normalDir = normalize(vNormal);
						float fresnel = 1.0 - max(dot(normalDir, viewDir), 0.0);
						float rim = pow(fresnel, 3.5);
						float halo = pow(fresnel, 1.4);
						float pulse = 0.75 + 0.25 * sin(glowTime + vViewPosition.y * 5.0);
						float glow = (rim * 3.0 + halo * 0.6) * pulse * glowIntensity;
						gl_FragColor.rgb += glowColor * glow;
					}
					#include <tonemapping_fragment>`
				);
			shaderRefs.push(shader);
		};
		material.needsUpdate = true;
	},

	tick: function (time) {
		const t = time / 1000;
		for (let i = 0; i < this.shaderRefs.length; i++) {
			const shader = this.shaderRefs[i];
			if (shader.uniforms.glowTime) shader.uniforms.glowTime.value = t;
		}
	}
});
