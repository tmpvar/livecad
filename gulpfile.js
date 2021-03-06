var gulp = require('gulp')
  , util = require('gulp-util')
  , argv = require('minimist')(process.argv.slice(2))
  , paths = {
      server: './server.js'
    , dist: './dist/'
    , frontend: {
        // html top level in directory only
        html: ['./frontend/*.html', './frontend/*.ico']

      , resources: './frontend/resources/**/*'

        // sass and browserify handle includes for us
      , styles: './frontend/scss/main.scss'
      , entry: './frontend/js/main.js'
      , scripts: ['./frontend/js/**/*.js', './node_modules/net-oce-protocol/*.js']
      }
    }

gulp.task('html', function (cb) {
  return gulp.src(paths.frontend.html)
    .pipe(gulp.dest(paths.dist))
})

var sass = require('gulp-sass')
  , prefix = require('gulp-autoprefixer')
  , cssmin = require('gulp-minify-css')
gulp.task('styles', function (cb) {
  return gulp.src(paths.frontend.styles)
    .pipe(sass({ errLogToConsole: true }))
    .pipe(prefix())
    .pipe(argv.debug ? util.noop() : cssmin())
    .pipe(gulp.dest(paths.dist))
})

var watchify = require('gulp-watchify')
  , jsmin = require('gulp-uglify')
  , streamify = require('gulp-streamify')

// Browserify and copy js files
gulp.task('scripts', watchify(function(watchify) {
  return gulp.src(paths.frontend.entry)
    .pipe(watchify({
        insertGlobals: true
      , debug: argv.debug
      , watch: paths.scripts
    }))
    .pipe(argv.debug ? util.noop() : streamify(jsmin({ mangle: false })))
    .pipe(gulp.dest(paths.dist))
}))

gulp.task('resources', function (cb) {
  return gulp.src(paths.frontend.resources)
    .pipe(gulp.dest(paths.dist))
})

var nodemon = require('gulp-nodemon')
gulp.task('watch', ['html', 'styles', 'scripts', 'resources'], function (cb) {
  if (!argv.oce) throw console.error([
      'Error: Please provide location of oce binary'
    , 'Usage: "gulp --oce=path/to/oce"'
    ].join('\n'))
  gulp.watch(paths.frontend.html, ['html'])
  gulp.watch(paths.frontend.styles, ['styles'])
  gulp.watch(paths.frontend.scripts, ['scripts'])
  gulp.watch(paths.frontend.resources, ['resources'])
  nodemon(paths.server + ' --oce=' + argv.oce)
})

// TODO: create full dist builds
gulp.task('build', ['html', 'styles', 'scripts', 'resources', 'favicon'], function () {})

gulp.task('default', ['watch'])
