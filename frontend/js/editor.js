var createCodemirror = require('tmpvar-javascript-editor')
var qel = require('qel');

module.exports = createEditor;


function createEditor(opts) {
  var jse = createCodemirror(opts);

  jse.marks = [];

  jse.editor.setCursor(0, 0);

  jse.addError = function(err) {
    var length = 1;
    var message = err.message;
    if (err.length) {
      length = err.length;
    } else if (contains(message, 'is not defined')) {
      length = message.split(' ').shift().trim().length;
      message = 'not defined';
    }

    var el = document.createElement('div');
    el.setAttribute('class', 'code-error-message');
    el.innerHTML = '<div class="arrow-down"></div>' + message.replace(/^Line \d*:/, '');

    var placeholder = document.createElement('div');
    placeholder.innerHTML = '&nbsp;';
    jse.marks.push(jse.editor.addLineWidget(err.line, placeholder, {
      coverGutter: false,
      noHScroll: false,
      above: true
    }));

    jse.editor.addWidget({ line: err.line, ch: err.column}, el, false, 'above');

    jse.marks.push({
      clear : function() {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    });

    var mark = jse.editor.markText(
      { line: err.line, ch: err.column },
      { line: err.line, ch: err.column + length },
      {
        className : 'errorLoc'
      }
    );
    jse.marks.push(mark);
  }

  // fix "cursor is off the end of the line on last line" issue #29
  jse.editor.refresh();
  jse.clearErrors = clearErrors

  function clearErrors() {
    var els = qel('.code-error-message', null, true);
    var i = els.length;
    while (i--) {
      els[i].parentNode.removeChild(els[i]);
    }

    while (jse.marks.length) {
      jse.marks.pop().clear();
    }
  }


  jse.getLine = function getLine(span) {
    var line = span.parentNode.parentNode.parentNode;
    var where = 0;
    while(line.previousSibling) {
      line = line.previousSibling;
      where++;
    }
    return where;
  }


  jse.getColumn = function getColumn(span) {

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

  jse.element.addEventListener('mousemove', function(e) {

    var el = e.target;

    var hovered = qel('.hovered', null, true);
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

    jse.emit('hover', el);
  }, true);

  return jse;
}
