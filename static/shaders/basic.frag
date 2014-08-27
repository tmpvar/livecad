precision highp float;
varying vec3 fragColor;
void main() {
  gl_FragColor = vec4(normalize(normalize(fragColor) + vec3(1.0)), 1.0);
}
