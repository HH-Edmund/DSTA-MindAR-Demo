AFRAME.registerComponent('shader-time', {
  tick: function (time) {
    var mesh = this.el.getObject3D('mesh');
    var material = mesh && mesh.material;

    if (material && material.uniforms && material.uniforms.time) {
      material.uniforms.time.value = time / 1000;
    }
  }
});
