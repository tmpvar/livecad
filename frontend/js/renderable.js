var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');
var subdivideArc = require('subdivide-arc');
var glm = require('gl-matrix');
var mat4 = glm.mat4;
var vec3 = glm.vec3;

var m4scratch = mat4.create();
var v3scratch1 = vec3.create();
var v3scratch2 = vec3.create();
var yup = [0, 1, 0];


window.vec3 = vec3;
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
  }];

  var edges = this.edges = [];


  var segments = [];

  obj.feature_edges.map(function(edge) {

    edge.map(function(parts) {

      parts.map(function(part) {

        // line
        if (part.start && part.end) {
          segments.push(
            part.start[0], part.start[1], part.start[2],
            part.end[0], part.end[1], part.end[2]
          );

        // circle
        } else if (part.center) {
          // setup a matrix so we can transform the points coming off of
          // subdivide-arc

          mat4.identity(m4scratch);
          mat4.translate(m4scratch, m4scratch, part.center);
          var perp = [part.normal[0], part.normal[2], part.normal[1]];

          mat4.rotate(
            m4scratch,
            m4scratch,
            Math.PI/2,
            vec3.cross(v3scratch1, yup, part.normal)
          );

          var points = subdivideArc(0, 0, part.radius, 0, Math.PI*2, 50)
          points.map(function(point) {

            point.push(point[1]);
            point[1] = 0;

            return vec3.transformMat4(
              point,
              point,
              m4scratch
            );

          }).map(function(point, i, a) {
            // create individual segments
            var prev = i==0 ? a[a.length-1] : a[i-1];
            segments.push(prev[0], prev[1], prev[2]);
            segments.push(point[0], point[1], point[2]);
          });
        }
      });
    });


    // TODO: segments need to be broken up by edge

  });

  edges.push(new Edge(gl, segments));

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

  for (var i=0; i<this.edges.length; i++) {
    this.edges[i].render(gl, shader, color, true);
  }
};

function Edge(gl, segments) {
  this.total = segments.length/3;

  this.buffer = createBuffer(gl, new Float32Array(segments), gl.ARRAY_BUFFER);
  this.vao = createVAO(gl, [{
    buffer: this.buffer,
    size: 3
  }]);
}

Edge.prototype.destroy = function() {
  this.buffer.dispose();
  this.vao.dispose();
};

Edge.prototype.render = function(gl, shader, color, disableDepth) {
  shader.uniforms.color = [1,1,1,1];
  shader.uniforms.highlight = 1;

  disableDepth && gl.disable(gl.DEPTH_TEST);
  this.vao.bind();
  this.vao.draw(gl.LINES, this.total);
  this.vao.unbind();
  disableDepth && gl.enable(gl.DEPTH_TEST);


  shader.uniforms.color = [1,0, 0,1];
  shader.uniforms.highlight = 1;

  disableDepth && gl.disable(gl.DEPTH_TEST);
  this.vao.bind();
  this.vao.draw(gl.POINTS, this.total/2);
  this.vao.unbind();
  disableDepth && gl.enable(gl.DEPTH_TEST);

}

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

  disableDepth && gl.disable(gl.DEPTH_TEST);

  this.vaos[0].bind();
  this.vaos[0].draw(gl.TRIANGLES, this.total);
  this.vaos[0].unbind();

  disableDepth && gl.enable(gl.DEPTH_TEST);
}

