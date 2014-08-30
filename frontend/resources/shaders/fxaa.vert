attribute vec2 position;

varying vec2 uv;
varying vec2 fragCoord;

void main() {
  uv = 0.5 * (position + 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}
