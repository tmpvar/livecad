var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');

module.exports = Renderable;


function Renderable(gl, obj) {
  this.totalVerts = obj.positions.length;

  this.positions = createBuffer(gl, obj.positions)
  this.normals = createBuffer(gl, obj.normals)

  this.features = obj.features;
  this.bounds = obj.bounds;

  this.vao = createVAO(gl, [{
    buffer: this.positions,
    size: 3
  },{
    buffer: this.normals,
    size: 3
  }]);
}

Renderable.prototype.destroy = function() {

  this.positions.dispose();
  this.normals.dispose();

  this.vao.dispose();

  // TODO: dispose of

};

Renderable.prototype.render = function(gl, shader, color) {
  shader.uniforms.color = color;
  this.vao.bind();
  this.vao.draw(gl.TRIANGLES, this.totalVerts/3)
  this.vao.unbind();
};
