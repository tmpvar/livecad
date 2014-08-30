precision highp float;

uniform sampler2D framebuffer;
uniform vec2 resolution;

varying vec2 uv;

#pragma glslify: fxaa = require(glsl-fxaa)

void main() {
  gl_FragColor = fxaa(framebuffer, uv * resolution, resolution);
}
