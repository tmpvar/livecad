var detective = require('detective');
var xhr = require('xhr');
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

    xhr({
      uri: url,
      method: 'POST',
      headers : {
        'content-type' : 'application/json'
      },
      timeout: 0,
      body: JSON.stringify(requires),
    }, function(err, res, body) {

      if (err) {
        return cbResult(err);
      }

      err && console.log(err.stack)
      if (res.statusCode === 200) {
        var js = res.responseText;
        var require = null;
        eval(js);
        cb(null, require);
      } else {
        cb(JSON.parse(js).module.split(',').map(function(m) {
          return createError(text, m);
        }));
      }
    });
  } else {
    cb();
  }
}
