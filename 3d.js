var createBuffer = require('gl-buffer');
var glslify = require('glslify');
var createVAO = require('gl-vao');
var simple3DShader = require("simple-3d-shader")
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

  // TODO: this cannot be right..
  var buf = new Float32Array(b.buffer.slice(14));
  totalVerts = buf.length/3;

  if (!buffer) {
    buffer = createBuffer(gl, buf)

    vao = createVAO(gl, [{
        buffer: buffer,
        type: gl.FLOAT,
        size: 3
      },
      [0.8, 1, 0.5]
    ]);

  } else {
    buffer.update(buf);
    vao.update([
      {
        buffer: buffer,
        type: gl.FLOAT,
        size: 3
      },
      [0.8, 1, 0.5]
    ])
  }
}


var createShader = glslify({
  vertex: "\
    attribute vec3 position;\
    attribute vec3 color;\
    varying vec3 fragColor;\
    attribute float tick;\
    void main() {\
      vec3 p = position; \
      p.x = tick; \
      gl_Position = vec4(p, 1.0);\
      fragColor = color;\
    }",
  fragment: "\
    precision highp float;\
    varying vec3 fragColor;\
    void main() {\
      gl_FragColor = vec4(fragColor, 1.0);\
    }",
  inline: true
})

var camera = createOrbitCamera([0, 200, 200],
                               [0, 0, 0],
                               [0, 1, 0])

var shader;

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = simple3DShader(shell.gl)
  shader.attributes.position.location = 0;
  shader.attributes.color.location = 1;

  ['mousedown', 'click', 'mouseup', 'mousemove', 'mousewheel'].forEach(function(name) {
    document.querySelector('canvas').addEventListener(name, function(ev) { ev.preventDefault(); }, true)
  });
})

var start = Date.now();
shell.on("gl-render", function(t) {
  var gl = shell.gl

  if (buffer && shader) {
    shader.bind()

    var scratch = mat4.create()
    shader.uniforms.model = scratch
    shader.uniforms.projection = mat4.perspective(scratch, Math.PI/4.0, shell.width/shell.height, 0.1, 1000.0)
    shader.uniforms.view = camera.view(scratch)



    vao.bind();
    vao.draw(gl.TRIANGLES, totalVerts);
    vao.unbind();
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
