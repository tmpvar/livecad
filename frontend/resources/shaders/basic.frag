precision highp float;
varying vec3 vNormal;
varying vec3 camera;

uniform float highlight;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform vec4 color;

#pragma glslify: hemisphere = require(glsl-hemisphere-light)

void main() {
  if (highlight > 0.0) {
    gl_FragColor = color;
  } else {
    vec3 gnd = color.xyz * 0.6;
    vec3 direction = normalize(vec3(0.0, 1.0, 0.0));

    vec3 lighting = hemisphere(
      vNormal,
      color.xyz,
      gnd,
      direction,
      model,
      view,
      camera,
      20.0,
      0.2
    );

    gl_FragColor = vec4(lighting, 1.0);
  }
}
