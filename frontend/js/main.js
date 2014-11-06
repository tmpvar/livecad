var skateboard = require('skateboard');
var generate = require('generate-function');
var createClient = require('./client');
var qel = require('qel');
var detective = require('detective');

var threedee = require('./3d');
var setMesh = threedee.setMesh;
var addHelperMesh = threedee.addHelperMesh;
var clearHelperMeshes = threedee.clearHelperMeshes;
var createBrowserifyBundle = require('./browserify');

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
  var jse = require('javascript-editor')({
    container: qel('#editor'),
    value: value,
    updateInterval:  25
  });

  jse.editor.setCursor(0, 0);

  // fix "cursor is off the end of the line on last line" issue #29
  jse.editor.refresh();

  skateboard(function(stream) {
    stream.socket.addEventListener('close', function() {
      setTimeout(function() {
        window.location.reload();
      }, 1000);
    });

    stream.once('data', function(uuid) {
      createClient(stream, function(err, methods, wrapper) {
        var header = Object.keys(methods).map(function(name) {
          return 'var ' + name + ' = ' + 'ops.' + name + ';';
        });

        // hijack display
        var _display = methods.display;
        methods.display = function() {
          typeof ga === 'function' && ga('send', 'event', 'net-oce', 'display', arguments.length);
          var p = _display.apply(null, arguments)
          p(function(e, r) {
            if (e) {
              // TODO: show an error
              console.error('nothing to display');
            } else {
              setMesh(e, r);
            }
          });
          return p;
        };

        function insertAfter(ref, add) {
          var next = ref.nextSibling;
          if (next) {
            ref.parentNode.insertBefore(add, next);
          } else {
            ref.parentNode.appendChild(add);
          }
        }

        function wrap(p, c) {
          c.parentNode.replaceChild(p, c);
          p.appendChild(c);
          return p;
        }

        function appendErrorLines() {

          if (jse.errorLines) {

            var els = qel('.errorLine', null, true);

            jse.errorLines.forEach(function(err, idx) {
              var el = document.createElement('error');
              el.setAttribute('class', 'code-error-message');
              var message = err.message.replace(/^Line \d*:/, '');
              el.innerHTML = message;
              // TODO: position correctly
              document.body.appendChild(el);
              // find where the message should go
              var errorLineElement = els[idx];

              if (errorLineElement) {
                var topBounds = errorLineElement.getBoundingClientRect();
                el.style.top = topBounds.top + 'px';

                var leftBounds = jse.element.getBoundingClientRect();
                el.style.left = (leftBounds.right - 6) + 'px';

                var lineWrapper = getLineByNumber(err.lineNumber);
                var linePre = qel('pre', lineWrapper);

                var l = linePre.childNodes.length;

                var find = null;
                if (message.toLowerCase().indexOf('unexpected token') > -1) {
                  find = message.replace(/unexpected token/i, '').trim();

                } else if (message.toLowerCase.indexOf(' is not defined') > -1) {
                  find = message.replace(/ is not defined/i, '').trim();
                } else if (message.columnNumber) {
//                  find = linePre.innerHTML.substr()
                }

                if (find) {

                  for (var i=0; i<l; i++) {
                    var child = linePre.childNodes.item(i);
                    var index = child.textContent.indexOf(find);
                    if (index > -1) {
                      var span = document.createElement('span');
                      span.setAttribute('class', 'errorLoc');

                      // straight up replace the textNode
                      // handles things like `===` as well
                      if (find.length === child.textContent.length) {
                        wrap(span, child);

                      // split the text node
                      } else {
                        var parts = child.textContent.split(find).filter(Boolean);
                        child.textContent = parts.shift();
                        span.textContent = find;
                        insertAfter(child, span);
                        parts.length && insertAfter(span, document.createTextNode(parts.shift()));
                      }
                    }
                  }
                } else {
                  console.error('unhandled syntax situation', err);
                }
              }
            });
          }
        }

        var evilMethodUsage;

        function evil (text, require) {

          try {
            var fn = generate()
              ('function(){')
                (header.join(';') + '\n')
                (text)
              ('}').toFunction({ops:methods, require:require});

            wrapper(fn, function(e, usage) {
              evilMethodUsage = usage;
            });

          } catch (e) {
            var matches = e.stack.match(/anonymous>:(\d*):(\d*)/);

            if (matches) {
              var lineNumber = parseInt(matches[1]) - 6;
              jse.errorLines.push( {
                lineNumber: lineNumber,
                message: e.message,
                column: parseInt(matches[2])
              });
              jse.editor.addLineClass(lineNumber, 'background', 'errorLine' )
            }
          }
        }

        jse.editor._handlers.change[0]();

        var codeMirrorEl = qel('.CodeMirror');
        function getLineByNumber(num) {
          return qel('.CodeMirror-code div:nth-of-type(' + (num+1) + ')');
        }

        function getLine(span) {
          var line = span.parentNode.parentNode;
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

              if (evilMethodUsage && evilMethodUsage[line]) {

                var evilLine = evilMethodUsage[line];

                // match with the text
                for (var i=0; i<evilLine.length; i++) {

                  if (Math.abs(evilLine[i]._column - col) <= 2) {
                    var future = evilLine[i];

                    future(function(e, r) {
                      if (!future._displayFuture) {
                        typeof ga === 'function' && ga('send', 'event', 'shape', 'hover', arguments.length);
                        future._displayFuture = _display(r);
                      }

                      // TODO: Allow more than one mesh to be rendered.
                      future._displayFuture(addHelperMesh);
                    });
                  }
                }
              }

              el.className += ' hovered';
            }

          }

          // TODO: consider allowing hover of lines
          // TODO: consider hover of loops

        });

        jse.on('valid', function(valid, ast) {
          typeof ga === 'function' && ga('send', 'event', 'editor', 'change', valid ? 'valid' : 'invalid');
          var els = qel('.code-error-message', null, true), l = els.length;
          for (var i=0; i<l; i++) {
            els[i].parentNode.removeChild(els[i]);
          }

          if (valid) {
            var text = jse.getValue();
            localStorage.setItem('text', text);

            createBrowserifyBundle(text, window.location.href + 'bundle/' + uuid, function(e, require) {
              methods.reset(function() {
                evil(text, require)
                appendErrorLines();
              });
            })
          } else {
            appendErrorLines();
          }
        });

        window.methods = methods;
      });
    });
  });
});
