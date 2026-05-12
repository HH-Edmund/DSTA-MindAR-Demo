// Created by HelloHolo developers
// Matrix stream component. 
// <a-plane position="0 0 0.01" width="1" height="0.6" rotation="0 0 0" matrix-stream="color: #63ff9d; intensity: 0.85; columns: 15; speed: 120"></a-plane>

AFRAME.registerComponent('matrix-stream', {
  schema: {
    color: { type: 'color', default: '#63ff9d' },
    columns: { type: 'int', default: 15 },
    intensity: { type: 'number', default: 0.85 },
    speed: { type: 'number', default: 120 }
  },

  init: function () {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 566;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.columns = [];

    for (var i = 0; i < this.data.columns; i++) {
      this.columns.push({
        offset: Math.random() * this.canvas.height,
        speed: this.data.speed * (0.7 + Math.random() * 0.75),
        length: 8 + Math.floor(Math.random() * 10),
        phase: Math.random() * 1000
      });
    }

    this.applyMaterial();
  },

  applyMaterial: function () {
    var mesh = this.el.getObject3D('mesh');

    if (!mesh) {
      return;
    }

    mesh.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: this.data.intensity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  },

  colorWithAlpha: function (alpha) {
    var hex = this.data.color.replace('#', '');
    var red = parseInt(hex.substring(0, 2), 16);
    var green = parseInt(hex.substring(2, 4), 16);
    var blue = parseInt(hex.substring(4, 6), 16);

    return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
  },

  tick: function (time, delta) {
    var ctx = this.ctx;
    var mesh = this.el.getObject3D('mesh');
    var width = this.canvas.width;
    var height = this.canvas.height;
    var columnWidth = width / this.data.columns;
    var fontSize = Math.floor(columnWidth * 0.88);
    var rowHeight = fontSize * 1.18;

    if (!mesh || !mesh.material || !mesh.material.map) {
      this.applyMaterial();
    }

    ctx.clearRect(0, 0, width, height);
    ctx.font = fontSize + 'px Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var columnIndex = 0; columnIndex < this.columns.length; columnIndex++) {
      var column = this.columns[columnIndex];
      var x = columnIndex * columnWidth + columnWidth * 0.5;

      column.offset += column.speed * delta / 1000;

      if (column.offset - column.length * rowHeight > height) {
        column.offset = -Math.random() * rowHeight * 4;
        column.speed = this.data.speed * (0.7 + Math.random() * 0.75);
        column.length = 8 + Math.floor(Math.random() * 10);
      }

      for (var row = 0; row < column.length; row++) {
        var y = column.offset - row * rowHeight;

        if (y < -rowHeight || y > height + rowHeight) {
          continue;
        }

        var digit = Math.floor((Math.sin(column.phase + row * 31.7 + time * 0.006) + 1) * 1000) % 2;
        var alpha = Math.max(0, 1 - row / column.length);
        var head = row === 0;

        ctx.shadowColor = this.data.color;
        ctx.shadowBlur = head ? 14 : 8;
        ctx.fillStyle = head
          ? 'rgba(210, 255, 225, ' + alpha + ')'
          : this.colorWithAlpha(0.22 + alpha * 0.55);
        ctx.fillText(digit, x, y);
      }
    }

    this.texture.needsUpdate = true;
  }
});
