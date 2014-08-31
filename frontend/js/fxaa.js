var glslify = require('glslify');
var createShader = glslify({
  vertex: '../resources/shaders/fxaa.vert',
  fragment: '../resources/shaders/fxaa.frag',
});

var createFBO = require('gl-fbo');
var createBuffer = require('gl-buffer');

var clear = require('gl-clear')({
  color: [0x11/255, 0x11/255, 0x22/255, 1],
  depth: true,
  stencil: false
});

module.exports = applyFXAA;

var shader, fbo, buffer, resolution = [0, 0];

function applyFXAA(gl, shell, fn) {

  if (!shader) {
    shader = createShader(gl);
    fbo = createFBO(gl, [shell.width, shell.height]);
    buffer = createBuffer(gl, [1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]);
  }

  // bind to fbo
  fbo.bind();
  clear(gl);

  fn();

  // render resulting fbo on the screen with fxaa
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  if (resolution[0] !== shell.width || resolution[1] !== shell.height) {
    resolution[0] = shell.width;
    resolution[1] = shell.height;

    fbo.shape = resolution;
  }

  shader.bind();
  buffer.bind();
  shader.attributes.position.pointer();
  shader.uniforms.resolution = resolution;
  shader.uniforms.framebuffer = fbo.color[0].bind();
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
