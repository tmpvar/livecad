attribute vec3 position;
attribute vec3 normal;
uniform float highlight;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform vec3 eye;
varying vec3 camera;
varying vec3 vNormal;
void main() {
  vNormal = normalize(normal);

  if (highlight == 0.0) {
    gl_Position = projection * view * model * vec4(position, 1.0);
  } else {
    gl_Position = (projection * view * model * vec4(position, 1.0));// + vec4(vNormal * vec3(2), 1.0);
  }

  gl_PointSize = 100.0;

  camera = eye;
}
