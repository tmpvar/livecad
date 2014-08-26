precision highp float;
varying vec3 fragColor;
void main() {
  gl_FragColor = vec4(normalize(fragColor), 1.0);
}
