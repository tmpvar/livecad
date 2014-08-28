precision highp float;
varying vec3 fragColor;
varying vec3 camera;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;


#pragma glslify: hemisphere = require(glsl-hemisphere-light)

void main() {

  vec3 sky = vec3(.64, 0.88, .17);
  vec3 gnd = sky * 0.6;
  vec3 direction = normalize(vec3(0.0, 1.0, 0.0));

  vec3 lighting = hemisphere(
    fragColor,
    sky,
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