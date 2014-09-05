var one = require('onecolor');

module.exports = hsl;

function hsl(h,s,l) {
  var c = new one.HSL(h, s, l)
  return [c.red(), c.green(), c.blue(), 1.0];
};
