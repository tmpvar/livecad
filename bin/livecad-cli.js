#!/usr/bin/env node

var argv = require('optimist').argv;
var duplex = require('duplexer');
var createClient = require('../core');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var evil = require('vm').runInThisContext;

if (!argv.oce) {
  return console.log('usage: livecad --oce=/path/to/net-oce filename');
}

var child = spawn(path.resolve(process.cwd(), argv.oce), [], { stdio : 'pipe' })

child.on('error', console.error)

child.stderr.setEncoding('utf8');


child.stderr.on('data', console.error)
child.on('exit', console.error);

var client = createClient(duplex(child.stdin, child.stdout), function(e, methods) {

  fs.readFile(path.resolve(process.cwd(), argv._[0]), function(e, r) {
    evil(r.toString());
  })
})
