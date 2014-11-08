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
        js = js.toString();
        if (res.statusCode === 200) {
          var require = null;
          eval(js);
          cb(null, require);
        } else {
          var found = detective.find(text, {
            nodes: true,
            parse: { tolerant: true, loc: true }
          })

          var m = JSON.parse(js).module;

          var strings = found.strings;
          for (var i=0; i<strings.length; i++) {
            if (strings[i] === m) {
              var obj = found.nodes[i].loc;
              obj.module = m;
              return cb(obj);
              break;
            }
          }

          cb(m);
        }
      }));
    });
    req.end(JSON.stringify(requires));

  } else {
    cb();
  }
}
