var detective = require('detective');
var xhr = require('xhr');
var concat = require('concat-stream');
var varargs = require('varargs');

module.exports = attemptBrowserify;


function createError(foundModules, moduleName) {
  var strings = foundModules.strings;
  for (var i=0; i<strings.length; i++) {
    if (strings[i] === moduleName) {
      var obj = foundModules.nodes[i].loc;
      obj.module = moduleName;
      return obj;
    }
  }

  return moduleName;
}

var cache = ''
var cacheContents = [];

function attemptBrowserify(text, url, cbResult) {

  var requires = detective.find(text, {
    nodes: true,
    parse: { tolerant: true, loc: true }
  });

  if (requires && requires.strings.length) {

    var newCache = requires.strings.sort().join(',');

    function cb() {
      cacheContents = varargs(arguments);
      cache = newCache;
      cbResult.apply(null, cacheContents);
    }

    if (newCache === cache) {
      if (cacheContents[0]) {
        cacheContents[0] = cacheContents[0].map(function(error) {
          return createError(requires, error.module);
        });
      }

      cbResult.apply(null, cacheContents.slice());
      return;
    }

    xhr({
      uri: url,
      method: 'POST',
      headers : {
        'content-type' : 'application/json'
      },
      timeout: 0,
      body: JSON.stringify(requires.strings),
    }, function(err, res, body) {

      if (err && err.statusCode !== 404) {
        return cbResult(err);
      }

      if (res.statusCode === 200) {
        var js = res.responseText;
        var require = null;
        eval(js);
        cb(null, require);
      } else {
        var missing = JSON.parse(res.responseText).module.split(',').map(function(m) {
          return createError(requires, m);
        });

        cb(missing);
      }
    });
  } else {
    cb();
  }
}
