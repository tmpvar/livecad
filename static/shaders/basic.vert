attribute vec3 position;
attribute vec3 normal;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform vec3 eye;
varying vec3 camera;
varying vec3 fragColor;
void main() {
  gl_Position = projection * view * model * vec4(position, 1.0);
  fragColor = normalize(normal);
  camera = eye;
}
