var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');

module.exports = Renderable;


function Renderable(gl, obj) {
  this.totalVerts = obj.positions.length;

  this.positions = createBuffer(gl, obj.positions)
  this.normals = createBuffer(gl, obj.normals)

  var attributes = [{
    buffer: this.positions,
    size: 3
  },{
    buffer: this.normals,
    size: 3
  }]

  var featureCounts = []

  for (var i=0; i<obj.features.length; i++) {
    var index = obj.features[i];
    if (index > featureCounts.length) {
      featureCounts.length = index;
    }
    index--; // values come in starting at idx 0

    if (typeof featureCounts[index] === 'undefined') {
      featureCounts[index] = [i];
    } else {
      featureCounts[index].push(i);
    }
  }

  var features = [];
  for (var j = 0; j<featureCounts.length; j++) {
    var cur = featureCounts[j];
    var featureArray = Array(cur.length * 3);

    for (var k = 0; k<cur.length; k++) {
      var k3 = k*3;
      var ck3 = cur[k] * 3;
      featureArray[k3 + 0] = ck3 + 0;
      featureArray[k3 + 1] = ck3 + 1;
      featureArray[k3 + 2] = ck3 + 2;
    }

    features.push(new Feature(gl, attributes, featureArray));
  }

  this.features = features;

  this.bounds = obj.bounds;

  this.vao = createVAO(gl, attributes);
}

Renderable.prototype.destroy = function() {

  this.positions.dispose();
  this.normals.dispose();

  this.vao.dispose();

  this.features.forEach(function(feature) {
    feature.destroy();
  });
};

Renderable.prototype.render = function(gl, shader, color, recurse) {
  shader.uniforms.color = color;
  shader.uniforms.highlight = 0;
  this.vao.bind();
  this.vao.draw(gl.TRIANGLES, this.totalVerts/3);
  this.vao.unbind();

  recurse && this.renderFeatures(gl, shader, [1, 0, 0, 1]);
};

Renderable.prototype.renderFeatures = function(gl, shader, color) {

  for (var i=0; i<this.features.length; i++) {
    if (this.features[i].selected) {
      this.features[i].render(gl, shader, color, true);
    }
  }
};

function Feature(gl, attributes, elements) {
  this.total = elements.length;
  this.buffers = [
    createBuffer(gl, elements, gl.ELEMENT_ARRAY_BUFFER),
    createBuffer(gl, elements.slice().reverse(), gl.ELEMENT_ARRAY_BUFFER)
  ];

  this.vaos = [
    createVAO(gl, attributes, this.buffers[0]),
    createVAO(gl, attributes, this.buffers[1])
  ];
};

Feature.prototype.destroy = function() {
  this.buffers[0].dispose();
  this.buffers[1].dispose();
  this.vaos[0].dispose();
  this.vaos[1].dispose();
}

Feature.prototype.selected = false;

Feature.prototype.render = function(gl, shader, color, disableDepth) {

  shader.uniforms.color = color;
  shader.uniforms.highlight = 1;

  if (disableDepth) {
    gl.disable(gl.DEPTH_TEST);

    this.vaos[0].bind();
    this.vaos[0].draw(gl.TRIANGLES, this.total);
    this.vaos[0].unbind();

    this.vaos[1].bind();
    this.vaos[1].draw(gl.TRIANGLES, this.total);
    this.vaos[1].unbind();

    gl.enable(gl.DEPTH_TEST);
  } else {
    this.vaos[0].bind();
    this.vaos[0].draw(gl.TRIANGLES, this.total);
    this.vaos[0].unbind();
  }
}

