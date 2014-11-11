module.exports = extractLocation;

function extractLocation(lineOffset, columnOffset) {
  lineOffset = lineOffset || -6;
  columnOffset = columnOffset || -3;

  var currentLine = (new Error()).stack.split('\n').filter(function(line) {
    return line.indexOf('eval at <anonymous>') > -1;
  })[0];

  if (currentLine) {
    var parts = currentLine.split(':');
    var col = Math.max(0, parseInt(parts.pop(), 10) - columnOffset);
    var line = parseInt(parts.pop(), 10) - lineOffset;
    return [col, line];
  }
}
