var _xhr = window.XMLHttpRequest;

function XHR(o) {
  var r = new _xhr(o);

  var _open = r.open;
  r.open = function fuuuOpener(method, url, async, user, password) {
    r.timeout = 0;

    if (url.indexOf(window.location.host) > -1) {
      return _open.call(r, method, url, async, user, password);
    } else {

      return _open.call(
        r,
        method,
        window.location.href + 'proxy?url=' + escape(url),
        async,
        user,
        password
      );
    }
  };

  return r;
}

window.XMLHttpRequest = XHR;
