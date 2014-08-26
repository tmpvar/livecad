var createBuffer = require('gl-buffer');
var glslify = require('glslify');
var createOrbitCamera = require("orbit-camera")
var glm = require("gl-matrix")
var mat4 = glm.mat4


module.exports = setMesh

//Initialize shell
var shell = require("gl-now")({
  element: document.querySelector('#output'),
  clearColor : [0, 0, 0, 1]
});


var buffer, totalVerts = 0, vao;
function setMesh(e, b) {
  var gl = shell.gl;
  //Create buffer
  totalVerts = (b[0].byteLength/4)/3;

  if (!buffer) {
    buffer = createBuffer(gl, b[0])
    normal = createBuffer(gl, b[1])
  } else {
    buffer.update(b[0]);
    normal.update(b[1]);
  }
}


var createShader = glslify({
  vertex: './static/shaders/basic.vert',
  fragment: './static/shaders/basic.frag',
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
    document.querySelector('canvas').addEventListener(name, function(ev) { ev.preventDefault(); }, true)
  });
})

var start = Date.now();
shell.on("gl-render", function(t) {
  var gl = shell.gl

  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE)

  if (buffer && shader) {
    shader.bind()
    buffer.bind();
    shader.attributes.position.pointer();
    shader.attributes.normal.pointer();
    // shader.attributes.color = [1.0, 0, 1.0]
    var scratch = mat4.create()
    shader.uniforms.model = scratch
    shader.uniforms.projection = mat4.perspective(scratch, Math.PI/4.0, shell.width/shell.height, 0.1, 1000.0)
    shader.uniforms.view = camera.view(scratch)

    gl.drawArrays(gl.TRIANGLES, 0, totalVerts);
  } else {
    // TODO: render interesting placeholder.. dust motes or something ;)
  }
})

shell.on("tick", function() {
  if(shell.wasDown("mouse-left")) {
    camera.rotate([shell.mouseX/shell.width-0.5, shell.mouseY/shell.height-0.5],
                  [shell.prevMouseX/shell.width-0.5, shell.prevMouseY/shell.height-0.5])
  }
  if(shell.wasDown("mouse-right")) {
    camera.pan([10*(shell.mouseX-shell.prevMouseX)/shell.width,
                10*(shell.mouseY - shell.prevMouseY)/shell.height])
  }
  if(shell.scroll[1]) {
    camera.zoom(shell.scroll[1] * 0.1)
  }
})



shell.on("gl-error", function(e) {
  throw new Error("WebGL not supported :(")
})
