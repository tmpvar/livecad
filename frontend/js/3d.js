var createBuffer = require('gl-buffer');
var glslify = require('glslify');
var createOrbitCamera = require("orbit-camera");
var glm = require("gl-matrix");
var mat4 = glm.mat4;
var vec3 = glm.vec3;
var createVAO = require('gl-vao');
var createFBO = require('gl-fbo');
var fxaa = require('./fxaa');
var near = .1;
var far = 1000;
var fov = Math.PI/4.0;

module.exports = setMesh;

function isNear(a, b, thresh) {
  return Math.abs(a-b) < (thresh || .1);
}

var cameraCenter = [0,0,0], cameraDistance = 200;
function lerpCameraTo(camera, pos, dt) {
  var feel = dt/10;

  if (cameraDistance !== null && camera.distance !== cameraDistance) {

    camera.distance += (cameraDistance - camera.distance) * feel;
    if (isNear(camera.distance, cameraDistance)) {
      cameraDistance = null;
    }
  }

  var cc = camera.center;

  if (cameraCenter) {
    if (
      !isNear(cc[0], cameraCenter[0]) ||
      !isNear(cc[1], cameraCenter[1]) ||
      !isNear(cc[2], cameraCenter[2])
    ) {
      cc[0] += (cameraCenter[0] - cc[0]) * feel;
      cc[1] += (cameraCenter[1] - cc[1]) * feel;
      cc[2] += (cameraCenter[2] - cc[2]) * feel;

      if (
        isNear(cc[0], cameraCenter[0]) &&
        isNear(cc[1], cameraCenter[1]) &&
        isNear(cc[2], cameraCenter[2])
      ) {
        cameraCenter = null;
      }

    }
  }
}

//Initialize shell
var shell = require("gl-now")({
  element: document.querySelector('#output'),
  clearColor : [0, 0, 0, 1]
});

var mesh, buffers, totalVerts;
function setMesh(e, b) {
  var gl = shell.gl;
  far = b[2][5] - b[2][2];

  cameraCenter = [
    b[2][0] + (b[2][3] - b[2][0])/2,
    b[2][1] + (b[2][4] - b[2][1])/2,
    b[2][2] + (b[2][5] - b[2][2])/2
  ];

  var r = vec3.distance(cameraCenter, [b[2][0], b[2][0], b[2][0]]);
  cameraDistance = r * 2 * 1.0 / Math.sin(fov/2);

  totalVerts = b[0].length;
  if (!buffers) {
    buffers = [
      createBuffer(gl, b[0]),
      createBuffer(gl, b[1])
    ];

    mesh = createVAO(gl, [{
      buffer: buffers[0],
      size: 3
    },{
      buffer: buffers[1],
      size: 3
    }]);

  } else {
    buffers[0].update(b[0]);
    buffers[1].update(b[1]);
  }
}


var createShader = glslify({
  vertex: '../resources/shaders/basic.vert',
  fragment: '../resources/shaders/basic.frag',
})

var camera = createOrbitCamera([0, 200, 200],
                               [0, 0, 0],
                               [0, 1, 0])
var shader;

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = createShader(shell.gl)
  shader.attributes.position.location = 0;
  shader.attributes.normal.location = 1;

  ['mousedown', 'click', 'mouseup', 'mousemove', 'mousewheel'].forEach(function(name) {
    document.querySelector('canvas').addEventListener(name, function(ev) {
      ev.preventDefault();
    }, true)
  });
})

var start = Date.now();
shell.on("gl-render", function(t) {
  var gl = shell.gl

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  lerpCameraTo(camera, cameraCenter, t);

  if (buffers) {

    fxaa(gl, shell, function() {
      shader.bind()

      var scratch = mat4.create()
      shader.uniforms.model = scratch

      shader.uniforms.projection = mat4.perspective(
        scratch,
        fov,
        shell.width/shell.height,
        near,
        far + camera.distance
      );

      shader.uniforms.view = camera.view(scratch)
      shader.uniforms.eye = camera.center;
      mesh.bind();
      mesh.draw(gl.TRIANGLES, totalVerts/3)
      mesh.unbind();
    });
  } else {
    // TODO: render interesting placeholder.. dust motes or something ;)
  }
})

shell.on("tick", function() {
  if(shell.wasDown("mouse-left")) {
    camera.rotate([shell.mouseX/shell.width-0.5, shell.mouseY/shell.height-0.5],
                  [shell.prevMouseX/shell.width-0.5, shell.prevMouseY/shell.height-0.5])
    cameraCenter = null;
    cameraDistance = null;
  }

  if(shell.wasDown("mouse-right")) {
    camera.pan([10*(shell.mouseX-shell.prevMouseX)/shell.width,
                10*(shell.mouseY - shell.prevMouseY)/shell.height])
    cameraCenter = null;
    cameraDistance = null;
  }

  if(shell.scroll[1]) {
    camera.zoom(shell.scroll[1] * 0.1)
    cameraCenter = null;
    cameraDistance = null;
  }
})



shell.on("gl-error", function(e) {
  throw new Error("WebGL not supported :(")
})
