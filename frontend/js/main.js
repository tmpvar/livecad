var skateboard = require('skateboard');
var generate = require('generate-function');
var createClient = require('./client');
var qel = require('qel');

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
    container: qel('#editor'),
    value: value,
    updateInterval:  0
  });

  jse.editor.setCursor(0, 0);

  // fix "cursor is off the end of the line on last line" issue #29
  jse.editor.refresh();

  // Hack around protocol-buffers and their magical
  // function generation.
  window.Buffer = Buffer;

  skateboard(function(stream) {
    stream.socket.addEventListener('close', function() {
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
        typeof ga === 'function' && ga('send', 'event', 'net-oce', 'display', arguments.length);

        var p = _display.apply(null, arguments)
        p(function(e, r) {
          if (e) {
            // TODO: show an error
            console.error('nothing to display');
          } else {
            renderMesh(e, r);
          }
        });
        return p;
      };

      function appendErrorLines() {
        if (jse.errorLines) {

          var els = qel('.errorLine', null, true);

          jse.errorLines.forEach(function(err, idx) {
            var el = document.createElement('error');
            el.setAttribute('class', 'code-error-message');
            el.innerHTML = err.message.replace(/^Line \d*:/, '');
            // TODO: position correctly
            document.body.appendChild(el);

            // find where the message should go
            var errorLineElement = els[idx];

            if (errorLineElement) {
              var bounds = errorLineElement.getBoundingClientRect();
              el.style.top = bounds.top + 'px';
              el.style.left = (bounds.right - 1) + 'px';
            }
          });
        }
      }

      function evil (text) {

        try {
          generate()
            ('function(){')
              (header.join(';'))
              (text)
            ('}').toFunction({ops:methods})()

        } catch (e) {
          var matches = e.stack.match(/anonymous>:(\d*):(\d*)/);

          if (matches) {
            var lineNumber = parseInt(matches[1]) - 5;
            jse.errorLines.push( {
              num: lineNumber,
              message: e.message,
              col: parseInt(matches[2])
            });
            jse.editor.addLineClass(lineNumber, 'background', 'errorLine' )
          }
        }
      }

      jse.editor._handlers.change[0]();

      jse.on('valid', function(valid) {
        typeof ga === 'function' && ga('send', 'event', 'editor', 'change', valid ? 'valid' : 'invalid');

        var els = qel('.code-error-message', null, true), l = els.length;
        for (var i=0; i<l; i++) {
          els[i].parentNode.removeChild(els[i]);
        }

        if (valid) {
          var text = jse.getValue();
          localStorage.setItem('text', text);
          methods.reset(function() {
            evil(text)
            appendErrorLines();
          });
        } else {
          appendErrorLines();
        }
      });

      window.methods = methods;
    });
  });
});
