var skateboard = require('skateboard');
var generate = require('generate-function');
var createClient = require('./core');

require('domready')(function() {

  var renderMesh = require('./3d');

  var value = localStorage.getItem('text') || [
    'var distanceBetweenHoles = 31;',
    'var centerCircleDiameter = 22;',
    'var dimension = 42; // width and height',
    'var materialWidth = 3;',
    '',
    '// compute hole pattern',
    'var triLeg = distanceBetweenHoles/2;',
    'var l = Math.sqrt(triLeg*triLeg*2);',
    '',
    'var b = box(dimension, materialWidth, dimension);',
    'b = b.cut(cylinder(centerCircleDiameter/2, materialWidth));',
    '',
    'var TAU = Math.PI*2;',
    'var a45 = Math.PI/4;',
    'var a90 = Math.PI/2',
    '',
    'for (var i=1; i<=4; i++) {',
    '  var c = cylinder(1.5, materialWidth).translate(',
    '    l * Math.sin(i * a90 + a45),',
    '    0,',
    '    l * Math.cos(i * a90 + a45)',
    '  );',
    '',
    '  b = b.cut(c)',
    '}',
    '',
    'display(b)',
  ].join('\n');

  // setup editor
  var jse = require('javascript-editor')({
    container: document.querySelector('#editor'),
    value: value
  });

  jse.editor.setCursor(0, 0);

  // fix "cursor is off the end of the line on last line" issue #29
  jse.editor.refresh();

  // Hack around protocol-buffers and their magical
  // function generation.
  window.Buffer = Buffer;

  skateboard(function(stream) {
    stream.socket.addEventListener('close', function() {
      console.log('reloading');
      setTimeout(function() {
        window.location.reload();
      }, 1000);
    });

    createClient(stream, function(err, methods) {
      var header = Object.keys(methods).map(function(name) {
        return 'var ' + name + ' = ' + 'ops.' + name + ';';
      });

      // hijack extract_verts
      var _display = methods.display;
      methods.display = function() {
        var p = _display.apply(null, arguments)
        p(function(e, r) {
          renderMesh(e, r);
        });
        return p;
      };

      function evil (text) {
        try {
          generate()
            ('function(){')
              (header.join(';'))
              (text)
            ('}').toFunction({ops:methods})()
        } catch (e) {
          console.error();
          var matches = e.stack.match(/anonymous>:(\d*)/)
          // TODO: add the error message to the editor
          if (matches) {
            var lineNumber = parseInt(matches[1]) - 5;
            jse.errorLines.push( {num: lineNumber, message: e.message} )
            jse.editor.addLineClass(lineNumber, 'background', 'errorLine' )
          }
        }
      }

      evil(jse.getValue())

      jse.on('valid', function(valid) {
        if (valid) {
          var text = jse.getValue();
          localStorage.setItem('text', text);
          methods.reset(function() {
            evil(text)
          });
        }
      });

      window.methods = methods;
    });
  });
});
