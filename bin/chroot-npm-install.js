#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var posix = require('posix');
var fs = require('fs');
var npm = require('npm');
var path = require('path');
var browserify = require('browserify');

if (!argv.deps) {
  console.error('include a --deps=dep,dep argument')
  process.exit(1);
}

if (!argv.dir) {
  console.error('include a --dir=/path/to/base argument')
  process.exit(1);
}

fs.stat(argv.dir, function(e) {
  if (e) {
    console.error('invalid --dir', argv.dir);
    process.exit(1);
  }

  var dns = require('dns');
  // cache the lookup so we can keep the jail minimal
  dns.lookup('registry.npmjs.org', function() {

    var rootUser = process.env.SUDO_USER === 'root' || process.env.USERNAME === 'root';
    var basedir = argv.dir;
    var relativeDir = basedir;
    if (rootUser) {
      relativeDir = '/';
    }

    npm.load({
      dir: relativeDir,
      loglevel : 'warn',
      tmp: path.join(relativeDir, 'tmp'),
      cache: path.join(relativeDir, 'cache')

    }, function(e) {
      if (e) throw e;

      // cache these npm commands before we jail
      var install = npm.commands.install;
      var build = npm.commands.build;
      var unbuild = npm.commands.unbuild;

      if (rootUser) {
        posix.chroot(basedir);

        if (argv.user) {
          // posix.setreuid(-1, 1000); // just set the EUID to 1000
          posix.setreuid(argv.user, -1); // change both RUID and EUID to "nobody"
        }
      }

      var deps = argv.deps.split(',').map(function(a) { return a.trim() }).filter(Boolean);

      install(relativeDir, deps, function(e) {
        if (e) {
          throw e;
        }
      });
    });
  });

});
