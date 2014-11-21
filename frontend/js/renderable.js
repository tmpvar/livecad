var createBuffer = require('gl-buffer');
var createVAO = require('gl-vao');
var subdivideArc = require('subdivide-arc');
var subdivideEllipse = require('ellipse-component');

var glm = require('gl-matrix');
var mat4 = glm.mat4;
var vec3 = glm.vec3;
var quat = glm.quat;

function createAABB() {
  var aabb = [
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity],
  ]

  return function checkAABB(point) {
    if (!point) {
      return aabb;
    }

    if (point[0] < aabb[0][0]) {
      aabb[0][0] = point[0];
    }

    if (point[1] < aabb[0][1]) {
      aabb[0][1] = point[1];
    }

    if (point[2] < aabb[0][2]) {
      aabb[0][2] = point[2];
    }

    if (point[0] > aabb[1][0]) {
      aabb[1][0] = point[0];
    }

    if (point[1] > aabb[1][1]) {
      aabb[1][1] = point[1];
    }

    if (point[2] > aabb[1][2]) {
      aabb[1][2] = point[1];
    }
  }
}

// TODO: ripped from a later version of gl-matrix
quat.rotationTo = (function() {
  var tmpvec3 = vec3.create();
  var xUnitVec3 = vec3.fromValues(1,0,0);
  var yUnitVec3 = vec3.fromValues(0,0,1);

  return function(out, a, b) {
      var dot = vec3.dot(a, b);
      if (dot < -0.999999) {
          vec3.cross(tmpvec3, xUnitVec3, a);
          if (vec3.length(tmpvec3) < 0.000001)
              vec3.cross(tmpvec3, yUnitVec3, a);
          vec3.normalize(tmpvec3, tmpvec3);
          quat.setAxisAngle(out, tmpvec3, Math.PI);
          return out;
      } else if (dot > 0.999999) {
          out[0] = 0;
          out[1] = 0;
          out[2] = 0;
          out[3] = 1;
          return out;
      } else {
          vec3.cross(tmpvec3, a, b);
          out[0] = tmpvec3[0];
          out[1] = tmpvec3[1];
          out[2] = tmpvec3[2];
          out[3] = 1 + dot;
          return quat.normalize(out, out);
      }
  };
})();


var m4scratch = mat4.create();
var v3scratch1 = vec3.create();
var v3scratch2 = vec3.create();
var yup = [0, 1, 0];


window.vec3 = vec3;
module.exports = Renderable;

function appendConicSegments(segments, points, part) {
  mat4.identity(m4scratch);

  var perp = [part.normal[0], part.normal[2], part.normal[1]];

  mat4.identity(m4scratch);
  mat4.translate(m4scratch, m4scratch, part.center);

  var qscratch = quat.create();

  quat.rotationTo(qscratch, [0, 0, 1], part.normal);

  points.map(function(point) {
    point.push(0);
    vec3.transformQuat(
      v3scratch1,
      point,
      qscratch
    );

    return vec3.transformMat4(point, v3scratch1, m4scratch);

  }).map(function(point, i, a) {
    // create individual segments
    var prev = i==0 ? a[a.length-1] : a[i-1];
    segments.push(prev[0], prev[1], prev[2]);
    segments.push(point[0], point[1], point[2]);
  });
}

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
        switch (part.type) {
          case 'line':
            segments.push(
              part.start[0], part.start[1], part.start[2],
              part.end[0], part.end[1], part.end[2]
            );
          break;

          case 'circle':
            // setup a matrix so we can transform the points coming off of
            // subdivide-arc

            var points = subdivideArc(0, 0, part.radius, 0, Math.PI*2, 50)
            appendConicSegments(segments, points, part);
          break;

          case 'ellipse':
            var points = subdivideEllipse(
              part.minor_radius * 2,
              part.major_radius * 2,
              50
            ).map(function(p) {
              // ellipse-component decided it would be good if ellipsis
              // were oriented by the top corner.  NBD, we'll just move
              // it over by the appropriate radii
              return [p.x - part.minor_radius, p.y - part.major_radius];
            });

            appendConicSegments(segments, points, part);

          break;


          default:
            console.log('unhandled part.type', part.type);
          break;

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
  var positions = obj.positions;
  var pscratch = [0, 0, 0];
  for (var j = 0; j<featureCounts.length; j++) {
    var cur = featureCounts[j];
    var featureArray = Array(cur.length * 3);
    var aabb = createAABB();
    for (var k = 0; k<cur.length; k++) {
      var k3 = k*3;
      var ck3 = cur[k] * 3;
      featureArray[k3 + 0] = ck3 + 0;
      featureArray[k3 + 1] = ck3 + 1;
      featureArray[k3 + 2] = ck3 + 2;

      pscratch[0] = positions[ck3 + 0];
      pscratch[1] = positions[ck3 + 1];
      pscratch[2] = positions[ck3 + 2];

      aabb(pscratch);
    }

    features.push(new Feature(gl, attributes, featureArray, aabb()));
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

  for (var i=0; i<this.edges.length; i++) {
    this.edges[i].render(gl, shader, [0, 0, 0, 1]);
  }
};

Renderable.prototype.renderFeatures = function(gl, shader, color) {
  for (var i=0; i<this.features.length; i++) {
    if (this.features[i].selected) {
      this.features[i].render(gl, shader, color, true);
    }
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
  shader.uniforms.color = color;
  shader.uniforms.highlight = 1;
  shader.uniforms.moveTowardCamera = 1;
  gl.lineWidth(1);
  disableDepth && gl.disable(gl.DEPTH_TEST);
  this.vao.bind();
  this.vao.draw(gl.LINES, this.total);
  this.vao.unbind();
  disableDepth && gl.enable(gl.DEPTH_TEST);
  shader.uniforms.moveTowardCamera = 0;
}

function Feature(gl, attributes, elements, aabb) {
  this.total = elements.length;
  this.aabb = aabb;

  this.buffers = [
    createBuffer(gl, elements, gl.ELEMENT_ARRAY_BUFFER),
    createBuffer(gl, elements.slice().reverse(), gl.ELEMENT_ARRAY_BUFFER)
  ];

  this.vaos = [
    createVAO(gl, attributes, this.buffers[0]),
    createVAO(gl, attributes, this.buffers[1])
  ];

  this.center = [
    (aabb[1][0] - aabb[0][0])/2 + aabb[0][0],
    (aabb[1][1] - aabb[0][1])/2 + aabb[0][1],
    (aabb[1][2] - aabb[0][2])/2 + aabb[0][2]
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
  shader.uniforms.highlight = 0;

  disableDepth && gl.disable(gl.DEPTH_TEST);

  this.vaos[0].bind();
  this.vaos[0].draw(gl.TRIANGLES, this.total);
  this.vaos[0].unbind();

  disableDepth && gl.enable(gl.DEPTH_TEST);
}

