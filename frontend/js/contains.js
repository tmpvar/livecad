module.exports = contains;

function contains(haystack, needle, caseSensitive) {
  var h = (caseSensitive) ? haystack : haystack.toLowerCase();
  var n = (caseSensitive) ? needle : needle.toLowerCase();
  return h.indexOf(n) > -1;
}
