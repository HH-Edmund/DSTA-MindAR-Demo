// Inject a card-glow style holographic effect into the existing material
// of each mesh listed in the part property, preserving the original PBR textures.
AFRAME.registerComponent('apply-glow', {
	schema: {
		part: { type: 'string', default: 'Hoodie' }
	},

	init: function () {
		this.glowColor = new THREE.Color('#00e5ff');
		this.glowIntensity = 2.5;
		this.shaderRefs = [];
		this.targetParts = this.parseParts(this.data.part);

		this.applyToTargets = this.applyToTargets.bind(this);
		this.el.addEventListener('model-loaded', this.applyToTargets);
		if (this.el.getObject3D('mesh')) this.applyToTargets();
	},

	update: function () {
		this.targetParts = this.parseParts(this.data.part);
		this.applyToTargets();
	},

	parseParts: function (part) {
		return part
			.split(',')
			.map((name) => name.trim().toLowerCase())
			.filter(Boolean);
	},

	applyToTargets: function () {
		const model = this.el.getObject3D('mesh');
		if (!model) return;
		model.traverse((node) => {
			if (node.isMesh && this.targetParts.includes(node.name.toLowerCase())) {
				this.injectGlow(node);
			}
		});
	},

	injectGlow: function (mesh) {
		if (!mesh.material || mesh.userData.glowInjected) return;
		mesh.userData.glowInjected = true;

		// Clone so other meshes that share this material don't pick up the glow.
		const mat = mesh.material.clone();
		mesh.material = mat;

		const glowColor = this.glowColor;
		const glowIntensity = this.glowIntensity;
		const shaderRefs = this.shaderRefs;

		mat.onBeforeCompile = (shader) => {
			shader.uniforms.glowColor = { value: glowColor };
			shader.uniforms.glowIntensity = { value: glowIntensity };
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
		mat.needsUpdate = true;
	},

	tick: function (time) {
		const t = time / 1000;
		for (let i = 0; i < this.shaderRefs.length; i++) {
			const shader = this.shaderRefs[i];
			if (shader.uniforms.glowTime) shader.uniforms.glowTime.value = t;
		}
	}
});
