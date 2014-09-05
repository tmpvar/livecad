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
var Renderable = require('./renderable');
var hsl = require('./hsl');

var pickMouse = require('./picker');

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

var min = Math.min;
var max = Math.max;

var mesh, buffers, totalVerts, renderables = [];
function setMesh(e, b) {
  renderDebouncer();

  if (!Array.isArray(b)) {
    b = [b];
  }
  var aabb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

  while (renderables.length) {
    renderables.pop().destroy();
  }

  var l = b.length;
  for (var i=0; i<l; i++) {
    var r = new Renderable(gl, b[i]);
    renderables.push(r);

    var bounds = r.bounds;
    aabb[0] = min(aabb[0], bounds[0]);
    aabb[1] = min(aabb[1], bounds[1]);
    aabb[2] = min(aabb[2], bounds[2]);

    aabb[3] = max(aabb[3], bounds[3]);
    aabb[4] = max(aabb[4], bounds[4]);
    aabb[5] = max(aabb[5], bounds[5]);
  }

  // TODO: prepare features as part of the renderables
  // TODO: mouse picking
  // TODO: render features on hover
  // TODO: rotate/fit face based on feature mouseup (if not moved)
  // TODO: center camera on the center of the feature

  cameraCenter = [
    aabb[0] + (aabb[3] - aabb[0])/2,
    aabb[1] + (aabb[4] - aabb[1])/2,
    aabb[2] + (aabb[5] - aabb[2])/2
  ];

  far = vec3.distance(
    [aabb[0], aabb[1], aabb[2]],
    [aabb[3], aabb[4], aabb[5]]
  );

  cameraDistance = far/2 * 1.0 / Math.sin(fov/2);

  far*=2;
}


var createShader = glslify({
  vertex: '../resources/shaders/basic.vert',
  fragment: '../resources/shaders/basic.frag',
})

var camera = createOrbitCamera([0, 200, 200],
                               [0, 0, 0],
                               [0, 1, 0])
var shader;

var clear = require('gl-clear')({
  color: [0x11/255, 0x11/255, 0x22/255, 1],
  depth: true,
  stencil: false
});

function setupRender(gl, shader) {
  shader.bind()

  var scratch = mat4.create()
  shader.uniforms.model = scratch

  shader.uniforms.projection = mat4.perspective(
    scratch,
    fov,
    gl.canvas.width/gl.canvas.height,
    near,
    far + Math.abs(camera.distance) + Math.abs(cameraDistance)
  );

  shader.uniforms.view = camera.view(scratch)
  shader.uniforms.eye = camera.center;
}

function renderRenderables(gl, shader) {
  if (renderables.length) {
    var l = renderables.length;
    for (var i=0; i<l; i++) {
      var color = hsl((i+.1)/l, .75, .65);
      renderables[i].render(gl, shader, color);
    }
  }
}


var gl = fc(function render(t) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  clear(gl);

  setupRender(gl, shader);
  renderRenderables(gl, shader);

  lerpCameraTo(camera, t);

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
      if (ev.wheelDeltaY) {
        camera.zoom(ev.wheelDeltaY * -.05);
        renderDebouncer();
      }
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
  transformMouse(ev, currentPosition);
  renderDebouncer();

  if (down) {
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
  } else {
    var index = pickMouse(gl, currentPosition, renderables, setupRender);
    if (index >= 0) {
      renderables[index].color = [1, 0, 1, 1];
    }
  }
});

