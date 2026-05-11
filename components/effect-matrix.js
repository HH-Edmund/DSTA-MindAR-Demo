// effect-matrix: animated digit-rain canvas texture overlaid on each target
// mesh as a duplicate SkinnedMesh/Mesh. Additive blending stacks cleanly
// over other effects and the original PBR material.
//
// `part` is a comma-separated list of mesh names (case-insensitive).
// Multi-instance is supported via __id suffixes:
//   effect-matrix="part: Hoodie, Pants"
//   effect-matrix__hoodie="part: Hoodie; color: #63ff9d"
AFRAME.registerComponent('effect-matrix', {
	multiple: true,

	schema: {
		part: { type: 'string', default: '' },
		color: { type: 'color', default: '#63ff9d' },
		columns: { type: 'int', default: 18 },
		intensity: { type: 'number', default: 0.9 },
		speed: { type: 'number', default: 120 }
	},

	init: function () {
		this.canvas = document.createElement('canvas');
		this.canvas.width = 1024;
		this.canvas.height = 1024;
		this.ctx = this.canvas.getContext('2d');
		this.texture = new THREE.CanvasTexture(this.canvas);
		this.texture.minFilter = THREE.LinearFilter;
		this.texture.magFilter = THREE.LinearFilter;

		this.streams = [];
		for (let i = 0; i < this.data.columns; i++) {
			this.streams.push({
				offset: Math.random() * this.canvas.height,
				speed: this.data.speed * (0.7 + Math.random() * 0.75),
				length: 8 + Math.floor(Math.random() * 10),
				phase: Math.random() * 1000
			});
		}

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
			self.addOverlay(node);
		});
	},

	addOverlay: function (mesh) {
		const material = new THREE.MeshBasicMaterial({
			map: this.texture,
			transparent: true,
			opacity: this.data.intensity,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		});
		AvatarEffectUtils.createOverlayMesh(mesh, material);
	},

	tick: function (time, delta) {
		if (!delta || this.appliedMeshes.size === 0) return;
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const colW = w / this.data.columns;
		const fontSize = Math.floor(colW * 0.88);
		const rowH = fontSize * 1.18;
		const color = this.data.color;
		const speed = this.data.speed;

		ctx.clearRect(0, 0, w, h);
		ctx.font = fontSize + 'px Consolas, "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		for (let i = 0; i < this.streams.length; i++) {
			const s = this.streams[i];
			const x = i * colW + colW * 0.5;
			s.offset += s.speed * delta / 1000;
			if (s.offset - s.length * rowH > h) {
				s.offset = -Math.random() * rowH * 4;
				s.speed = speed * (0.7 + Math.random() * 0.75);
				s.length = 8 + Math.floor(Math.random() * 10);
			}
			for (let r = 0; r < s.length; r++) {
				const y = s.offset - r * rowH;
				if (y < -rowH || y > h + rowH) continue;
				const digit = Math.floor((Math.sin(s.phase + r * 31.7 + time * 0.006) + 1) * 1000) % 2;
				const alpha = Math.max(0, 1 - r / s.length);
				const head = r === 0;
				ctx.shadowColor = color;
				ctx.shadowBlur = head ? 14 : 8;
				ctx.fillStyle = head
					? 'rgba(210, 255, 225, ' + alpha + ')'
					: AvatarEffectUtils.colorWithAlpha(color, 0.22 + alpha * 0.55);
				ctx.fillText(digit, x, y);
			}
		}
		this.texture.needsUpdate = true;
	}
});
