var glslify = require('glslify');
var createShader = glslify({
  vertex: '../resources/shaders/basic.vert',
  fragment: '../resources/shaders/picker.frag',
});

var createFBO = require('gl-fbo');
var createBuffer = require('gl-buffer');

var clear = require('gl-clear')({
  color: [0, 0, 0, 0],
  depth: true,
  stencil: false
});

module.exports = pickMouse;

var shader, fbo, buffer, resolution = [0, 0];
var pixel = new Uint8Array(4);

var color = new ArrayBuffer(16);
var uint8Color = new Uint8Array(color);
var uint32Id = new Uint32Array(color);

function pickMouse(gl, mouse, objects, fn) {

  if (!shader) {
    shader = createShader(gl);
    fbo = createFBO(gl, [gl.canvas.width, gl.canvas.height]);
    resolution[0] = gl.canvas.width;
    resolution[1] = gl.canvas.height;
  } else if (resolution[0] !== gl.canvas.width || resolution[1] !== gl.canvas.height) {
    resolution[0] = gl.canvas.width;
    resolution[1] = gl.canvas.height;
    fbo.shape = resolution;
  }

  // bind to fbo
  fbo.bind();
  clear(gl);

  fn(gl, shader);

  for (var i=0; i<objects.length; i++) {
    uint32Id[0] = i+1;

    var c = [
      uint8Color[0]/255,
      uint8Color[1]/255,
      uint8Color[2]/255,
      uint8Color[3]/255
    ];

    objects[i].color = null;
    objects[i].render(gl, shader, c);
  }

  gl.readPixels(mouse[0], mouse[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  var val = new Uint32Array(pixel.buffer)[0];
  return val-1;
}
