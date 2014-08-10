var glnow = require('gl-now');
var glslify = require('glslify');
var skateboard = require('skateboard');

var createProgram = glslify({
  fragment: "./shaders/basic.frag",
  vertex: "./shaders/basic.vert"
});


require('domready')(function() {


  skateboard(function(stream) {

  })


});
