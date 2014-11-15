require('./monkey-patches/xhr');

var skateboard = require('skateboard');
var generate = require('generate-function');
var createClient = require('./client');
var qel = require('qel');
var detective = require('detective');
var varargs = require('varargs');
var Shape = require('./shape');

var threedee = require('./3d');
var setMesh = threedee.setMesh;
var addHelperMesh = threedee.addHelperMesh;
var clearHelperMeshes = threedee.clearHelperMeshes;
var createBrowserifyBundle = require('./browserify');

function contains(haystack, needle, caseSensitive) {
  var h = (caseSensitive) ? haystack : haystack.toLowerCase();
  var n = (caseSensitive) ? needle : needle.toLowerCase();
  return h.indexOf(n) > -1;
}

require('domready')(function() {

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
  var jse = require('tmpvar-javascript-editor')({
    container: qel('#editor'),
    value: value,
    updateInterval:  1000
  });

  jse.marks = [];

  jse.editor.setCursor(0, 0);

  jse.addError = function(err) {
    jse.errorLines.push(err);
  }

  // fix "cursor is off the end of the line on last line" issue #29
  jse.editor.refresh();

  function clearErrors() {
    var els = qel('.code-error-message', null, true);
    var i = els.length;
    while (i--) {

      els[i].parentNode.removeChild(els[i]);
    }

    while (jse.errorLines.length) {
      var line = jse.errorLines.pop();
      jse.editor.removeLineClass(line.lineNumber, 'background', 'errorLine');
    }

    while (jse.marks.length) {
      jse.marks.pop().clear();
    }
  }

  skateboard(function(stream) {

    // treat reconnections as server reloads
    stream.on('reconnect', function() {
      window.location.reload();
    });

    stream.once('data', function(uuid) {
      createClient(stream, function(err, methods, evalWrapper) {
        var header = Object.keys(methods).map(function(name) {
          return 'var ' + name + ' = ' + 'ops.' + name + ';';
        });

        // handle shape creation errors and other `net-oce`
        // related explosions
        Shape.emitter.on('error', function(e) {
          if (e.shape) {
            var line = e.shape.line;
            var column = e.shape.column;

            // Fix odd case where the column is messed up
            // on line 0.
            if (line === 0) {
              column -= 2;
            }

            jse.addError( {
              lineNumber: line,
              message: e.message,
              length: e.shape.name.length,
              column: column
            });

            jse.editor.addLineClass(line, 'background', 'errorLine' )

            appendErrorLines();
          } else {
            throw e;
          }
        });

        // hijack display
        var _display = methods.display;
        methods.display = function() {
          typeof ga === 'function' && ga('send', 'event', 'net-oce', 'display', arguments.length);

          var args = varargs(arguments);

          args.push(function(e, r) {
            if (e) {
              // TODO: show an error
              console.error('nothing to display');
            } else {
              setMesh(null, r);
            }
          });

          clearErrors();

          _display.apply(null, args);
        };

        function appendErrorLines() {

          if (jse.errorLines) {

            var els = qel('.errorLine', null, true);

            jse.errorLines.forEach(function(err, idx) {
              // find where the message should go
              var errorLineElement = els[idx];

              if (errorLineElement) {
                var el = document.createElement('error');
                el.setAttribute('class', 'code-error-message');
                var message = err.message.replace(/^Line \d*:/, '');
                el.innerHTML = message;

                document.body.appendChild(el);

                var topBounds = errorLineElement.getBoundingClientRect();
                el.style.top = topBounds.top + 'px';

                var leftBounds = jse.element.getBoundingClientRect();
                el.style.left = (leftBounds.right - 6) + 'px';

                var lineWrapper = getLineByNumber(err.lineNumber);
                var linePre = qel('pre span', lineWrapper);

                var span = document.createElement('span');
                span.setAttribute('class', 'errorLoc');

                var length = 1;

                if (err.length) {
                  length = err.length;
                } else if (contains(message, 'is not defined')) {
                  length = message.split(' ').shift().trim().length;
                }

                var mark = jse.editor.markText(
                  { line: err.lineNumber, ch: err.column },
                  { line: err.lineNumber, ch: err.column + length },
                  {
                    className : 'errorLoc'
                  }
                );

                jse.marks.push(mark);
              } else {
                console.error('error without line highlight:' + err.message);
              }
            });
          }
        }

        var performEvalMethodUsage;

        function performEval (text, require) {

          try {
            var fn = generate()
              ('function(){')
                (header.join(';') + '\n')
                (text)
              ('}').toFunction({ops:methods, require:require });

            evalWrapper(fn, function(e, usage) {
              performEvalMethodUsage = usage;
            });

          } catch (e) {
            var matches = e.stack.match(/anonymous>:(\d*):(\d*)/);

            if (matches) {
              var lineNumber = parseInt(matches[1]) - 6;
              var column = parseInt(matches[2]);

              if (lineNumber === 0) {
                column -= 2;
              }

              jse.addError( {
                lineNumber: lineNumber,
                message: e.message,
                column: column - 1
              });

              jse.editor.addLineClass(lineNumber, 'background', 'errorLine' )

              appendErrorLines();
            }
          }
        }

        jse.editor._handlers.change[0]();

        var codeMirrorEl = qel('.CodeMirror');
        function getLineByNumber(num) {
          return qel('.CodeMirror-code div:nth-of-type(' + (num+1) + ')');
        }

        function getLine(span) {
          var line = span.parentNode.parentNode.parentNode;
          var where = 0;
          while(line.previousSibling) {
            line = line.previousSibling;
            where++;
          }
          return where;
        }

        function getColumn(span) {

          var c = 0;
          var pre = span.parentNode;
          var children = pre.childNodes;

          for (var i=0; i<children.length; i++) {
            var child = children[i];
            if (span === child) {
              break;
            }
            c += child.textContent.length;
          }

          return c;
        }

        codeMirrorEl.addEventListener('mousemove', function(e) {
          var el = e.target;

          var hovered = qel('.hovered', codeMirrorEl, true);
          var c = hovered.length;
          var alreadyHovered = el.className.indexOf('hovered') > -1;
          while(c--) {
            if (hovered[c] === el) {
              continue;
            }
            hovered[c].className = hovered[c].className.replace(/ *hovered */g, '');
          }

          if (alreadyHovered) {
            return;
          }

          clearHelperMeshes();

          if (el.className.indexOf('variable') > -1 || el.className.indexOf('property') > -1) {
            var name = el.textContent;

            if (methods[name]) {
              var line = getLine(el);
              var col = getColumn(el);

              if (performEvalMethodUsage && performEvalMethodUsage[line]) {
                var performEvalLine = performEvalMethodUsage[line];

                // match with the text
                for (var i=0; i<performEvalLine.length; i++) {
                  if (Math.abs(performEvalLine[i].column - col) <= 2) {
                    typeof ga === 'function' && ga('send', 'event', 'shape', 'hover', arguments.length);
                    _display(performEvalLine[i], addHelperMesh);
                  }
                }
              }

              el.className += ' hovered';
            }
          }

          // TODO: consider allowing hover of lines
          // TODO: consider hover of loops

        });

        jse.on('update', function(errors, ast) {
          typeof ga === 'function' && ga('send', 'event', 'editor', 'change', errors ? 'valid' : 'invalid');

          clearErrors();

          if (!errors) {
            var text = jse.getValue();
            localStorage.setItem('text', text);

            createBrowserifyBundle(text, window.location.href + 'bundle/' + uuid, function(errors, require) {
              if (errors) {

                // TODO: fix this hacky .reverse
                errors.reverse().map(function(e) {
                  if (e.start) {
                    var line = e.start.line - 1;
                    jse.addError({
                      lineNumber: line,
                      column: e.start.column + 9,
                      length: e.module.length,
                      message: "'" + e.module + "' not found"
                    });

                    jse.editor.addLineClass(line, 'background', 'errorLine');
                  }
                });
                appendErrorLines();
                return;
              }

              methods.reset(function() {
                performEval(text, require);
              });
            });
          } else {
            errors.forEach(function(e){
              var length = 1;
              var message = e.message;
              console.log('message', message);
              // /TODO: this might not be granular enough
              if (contains(message, 'invalid regular expression')) {
                if (contains(message, ': missing')) {
                  e.column -= 2;
                }
              } else if (contains(message, 'unexpected token')) {
                message = message.split(' ').pop().trim();
                if (message !== 'ILLEGAL') {
                  length = message.length;
                } else {
                  e.column -= 1;
                }
              }


              jse.addError( {
                lineNumber: e.lineNumber,
                column: e.column-1,
                // TODO: this needs to be computed based
                //       on the type of error
                length: length,
                message: e.message
              });

              jse.editor.addLineClass(e.lineNumber, 'background', 'errorLine' );
            });

            appendErrorLines();
          }
        });

        window.methods = methods;
      });
    });
  });
});
