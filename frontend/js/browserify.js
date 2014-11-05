var detective = require('detective');
var request = require('hyperquest');
var concat = require('concat-stream');
module.exports = attemptBrowserify;

var cache;
function attemptBrowserify(text, url, cb) {
  var requires = detective(text);
  if (requires && requires.length) {

    var req = request.post(url, {}, function(err, res) {
      res.pipe(concat(function(js) {
        var require = null;
        eval(js.toString());
        cb(null, require);
      }));
    });
    req.end(JSON.stringify(requires));

  } else {
    cb();
  }
}
