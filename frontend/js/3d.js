var createBuffer = require('gl-buffer');
var glslify = require('glslify');
var createOrbitCamera = require("orbit-camera");
var glm = require("gl-matrix");
var mat4 = glm.mat4;
var vec3 = glm.vec3;
var createVAO = require('gl-vao');
var createFBO = require('gl-fbo');
var fxaa = require('./fxaa');
var fc = require('fc');
var near = .1;
var far = 1000;
var fov = Math.PI/4.0;

module.exports = setMesh;

function isNear(a, b, thresh) {
  return Math.abs(a-b) < (thresh || .1);
}

var cameraCenter = [0,0,0], cameraDistance = 200;
function lerpCameraTo(camera, dt) {
  var feel = dt/100;

  if (cameraDistance && !isNear(camera.distance, cameraDistance)) {
    camera.distance += (cameraDistance - camera.distance) * feel;
    if (isNear(camera.distance, cameraDistance)) {
      cameraDistance = 0;
    }
  } else {
    cameraDistance = 0;
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

    } else {
      cameraCenter = null;
    }
  }

  if (cameraCenter || cameraDistance) {
    renderDebouncer();
  }
}

var mesh, buffers, totalVerts;
function setMesh(e, b) {
  renderDebouncer();

  cameraCenter = [
    b[2][0] + (b[2][3] - b[2][0])/2,
    b[2][1] + (b[2][4] - b[2][1])/2,
    b[2][2] + (b[2][5] - b[2][2])/2
  ];

  far = vec3.distance(
    [b[2][0], b[2][1], b[2][2]],
    [b[2][3], b[2][4], b[2][5]]
  );

  cameraDistance = far * 1.0 / Math.sin(fov/2);

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

var gl = fc(function render(t) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  lerpCameraTo(camera, t);

  if (buffers) {

    fxaa(gl, gl.canvas, function() {
      shader.bind()

      var scratch = mat4.create()
      shader.uniforms.model = scratch

      shader.uniforms.projection = mat4.perspective(
        scratch,
        fov,
        gl.canvas.width/gl.canvas.height,
        near,
        far + Math.max(camera.distance, cameraDistance)
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
}, false, 3);

function createDebouncer(time, before, after) {
  var handle = setTimeout(after, time);

  return function() {
    before();
    clearTimeout(handle);
    handle = setTimeout(after, time);
  }
}

var renderDebouncer = createDebouncer(1000, gl.start, gl.stop);

//Create shader
shader = createShader(gl)
shader.attributes.position.location = 0;
shader.attributes.normal.location = 1;

var lastPosition = [0, 0];
var currentPosition = [0, 0];
var down = false;

function transformMouse(ev, out) {
  out[0] = ev.clientX;
  out[1] = ev.clientY;
  return out;
}

function handleMouse(ev) {
  ev.preventDefault();

  cameraCenter = null;
  cameraDistance = null;

  switch (ev.type) {

    case 'mousewheel':
      camera.zoom(ev.wheelDeltaY * -0.05)
      renderDebouncer();
    break;

    case 'mousedown':
      down = true;
      transformMouse(ev, lastPosition);
      renderDebouncer();
    break;
  }
}

['mousedown', 'click', 'mousewheel'].forEach(function(name) {
  gl.canvas.addEventListener(name, handleMouse, true);
});

document.addEventListener('mouseup', function(ev) {
  renderDebouncer();
  down = false;
});

document.addEventListener('mousemove', function(ev) {
  if (down) {
    renderDebouncer();
    transformMouse(ev, currentPosition);
    var w = gl.canvas.width;
    var h = gl.canvas.height;

    camera.rotate([
      currentPosition[0]/w-0.5,
      currentPosition[1]/h-0.5
    ],[
      lastPosition[0]/w-0.5,
      lastPosition[1]/h-0.5
    ])

    lastPosition[0] = currentPosition[0];
    lastPosition[1] = currentPosition[1];
  }
});

