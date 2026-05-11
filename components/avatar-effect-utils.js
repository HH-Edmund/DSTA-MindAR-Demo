// Shared helpers for avatar effect components.
// Each effect-* component registers a `multiple: true` A-Frame component and
// targets a single mesh inside a GLTF model by name (e.g. Hoodie, Hair, Head).
// Use multiple instances on the same entity by appending `__id` suffixes:
//   effect-glow__hoodie="target: Hoodie"
//   effect-glow__pants="target: Pants; color: #ff00ff"
(function () {
	function findMeshByName(root, name) {
		let result = null;
		root.traverse(function (node) {
			if (!result && node.isMesh && node.name === name) result = node;
		});
		return result;
	}

	function createOverlayMesh(mesh, material) {
		let overlay;
		if (mesh.isSkinnedMesh) {
			overlay = new THREE.SkinnedMesh(mesh.geometry, material);
			overlay.bind(mesh.skeleton, mesh.bindMatrix);
		} else {
			overlay = new THREE.Mesh(mesh.geometry, material);
		}
		overlay.position.copy(mesh.position);
		overlay.quaternion.copy(mesh.quaternion);
		overlay.scale.copy(mesh.scale);
		overlay.frustumCulled = mesh.frustumCulled;
		mesh.parent.add(overlay);
		return overlay;
	}

	function colorWithAlpha(hex, alpha) {
		hex = hex.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
	}

	// Vertex shader template with skinning support — provides three varyings:
	//   vUvE, vNormalE, vViewDirE
	// USE_SKINNING is auto-defined by three.js when the host mesh is a SkinnedMesh.
	const SKINNING_VERTEX_SHADER = `
		#include <skinning_pars_vertex>

		varying vec2 vUvE;
		varying vec3 vNormalE;
		varying vec3 vViewDirE;

		void main() {
			vUvE = uv;
			vec3 transformed = position;
			vec3 transformedNormal = normal;

			#ifdef USE_SKINNING
				mat4 boneMatX = getBoneMatrix(skinIndex.x);
				mat4 boneMatY = getBoneMatrix(skinIndex.y);
				mat4 boneMatZ = getBoneMatrix(skinIndex.z);
				mat4 boneMatW = getBoneMatrix(skinIndex.w);

				mat4 skinMatrix = mat4(0.0);
				skinMatrix += skinWeight.x * boneMatX;
				skinMatrix += skinWeight.y * boneMatY;
				skinMatrix += skinWeight.z * boneMatZ;
				skinMatrix += skinWeight.w * boneMatW;
				skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;

				transformed = (skinMatrix * vec4(transformed, 1.0)).xyz;
				transformedNormal = (skinMatrix * vec4(transformedNormal, 0.0)).xyz;
			#endif

			vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
			gl_Position = projectionMatrix * mvPosition;
			vNormalE = normalize(normalMatrix * transformedNormal);
			vViewDirE = normalize(-mvPosition.xyz);
		}
	`;

	window.AvatarEffectUtils = {
		findMeshByName: findMeshByName,
		createOverlayMesh: createOverlayMesh,
		colorWithAlpha: colorWithAlpha,
		SKINNING_VERTEX_SHADER: SKINNING_VERTEX_SHADER
	};
})();
