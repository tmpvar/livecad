attribute vec3 position;
attribute vec3 normal;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
varying vec3 fragColor;
void main() {

  gl_Position = projection * view * model * vec4(position,1);
  fragColor = normal;
}
