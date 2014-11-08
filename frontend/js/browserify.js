var detective = require('detective');
var request = require('hyperquest');
var concat = require('concat-stream');
var varargs = require('varargs');
module.exports = attemptBrowserify;


function createError(text, moduleName) {
  var found = detective.find(text, {
    nodes: true,
    parse: { tolerant: true, loc: true }
  })

  var strings = found.strings;
  for (var i=0; i<strings.length; i++) {
    if (strings[i] === moduleName) {
      var obj = found.nodes[i].loc;
      obj.module = moduleName;
      return obj;
    }
  }
  return moduleName;
}

var cache = ''
var cacheContents = [];

function attemptBrowserify(text, url, cbResult) {
  var requires = detective(text);
  if (requires && requires.length) {


    var newCache = requires.sort().join(',');

    function cb() {
      cacheContents = varargs(arguments);
      cache = newCache;
      cbResult.apply(null, cacheContents);
    }

    if (newCache === cache) {
      if (cacheContents[0]) {
        cacheContents[0] = createError(text, cacheContents[0].module);
      }

      cbResult.apply(null, cacheContents);
      return;
    }

    var req = request.post(url, {}, function(err, res) {
      res.pipe(concat(function(js) {
        js = js.toString();
        if (res.statusCode === 200) {
          var require = null;
          eval(js);
          cb(null, require);
        } else {
          var m = JSON.parse(js).module;
          cb(createError(text, m));
        }
      }));
    });
    req.end(JSON.stringify(requires));

  } else {
    cb();
  }
}
