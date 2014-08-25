var createBuffer = require('gl-buffer');
var glslify = require('glslify');
var createVAO = require('gl-vao');

module.exports = setMesh

//Initialize shell
var shell = require("gl-now")({
  element: document.querySelector('#output'),
  clearColor : [0, 0, 0, 1]
});


var buffer, totalVerts = 0, vao;
function setMesh(e, b, count) {
  var gl = shell.gl;
  // debugger;
  //Create buffer
  var buf = new Float32Array(b.buffer.slice(31));

console.log(buf);
  if (!buffer) {
    buffer = createBuffer(gl, buf)
    totalVerts = count;

    vao = createVAO(gl, [{
        "buffer": buffer,
        "type": gl.FLOAT,
        "size": 3
      },
      [0.8, 1, 0.5]
    ]);

  } else {
    buffer.update(buf);
    throw new Error('implement me...')
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

var shader;

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shader
  shader = createShader(gl)
  shader.attributes.position.location = 0;
  shader.attributes.color.location = 1;
})

var start = Date.now();
shell.on("gl-render", function(t) {
  var gl = shell.gl

  if (buffer && shader) {
    shader.bind()

    shader.attributes.tick = (Date.now()-start) / -1000;
    vao.bind();
    vao.draw(gl.TRIANGLES, totalVerts);
    vao.unbind();
  } else {
    // TODO: render interesting placeholder.. dust motes or something ;)
  }
})

shell.on("gl-error", function(e) {
  throw new Error("WebGL not supported :(")
})
