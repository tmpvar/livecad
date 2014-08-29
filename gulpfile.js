var gulp = require('gulp')
  , util = require('gulp-util')
  , argv = require('minimist')(process.argv.slice(2))
  , paths = {
      allscripts: ['./**/*.js', '!./gulpfile.js']
    , server: './server.js'
    , dist: './dist/'
    , frontend: {
        // html top level in directory only
        html: './frontend/*.html'

      , resources: './frontend/resources/**/*'

        // sass and browserify handle includes for us
      , styles: './frontend/scss/main.scss'
      , scripts: './frontend/js/main.js' 
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

var browserify = require('gulp-browserify')
  , jsmin = require('gulp-uglify')
gulp.task('scripts', function (cb) {
  return gulp.src(paths.frontend.scripts)
    .pipe(browserify({ insertGlobals: true, debug: argv.debug }))
    .pipe(argv.debug ? util.noop() : jsmin())
    .pipe(gulp.dest(paths.dist))
})

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
  gulp.watch(paths.allscripts, ['scripts'])
  gulp.watch(paths.frontend.resources, ['resources'])
  nodemon(paths.server + ' --oce=' + argv.oce)
})

// TODO: create full dist builds
gulp.task('build', ['html', 'styles', 'scripts', 'resources'], function () {})

gulp.task('default', ['watch'])
