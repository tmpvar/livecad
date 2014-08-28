var gulp = require('gulp')
  , debug = require('gulp-debug')
  , argv = require('minimist')(process.argv.slice(2))
  , paths = {
      allscripts: './**/*.js'
    , server: './server.js'
    , frontend: {
        // html top level in directory only
        html: './frontend/*.html'

        // sass and browserify handle includes for us
      , styles: {
          main: './frontend/scss/main.scss'
        , dir: './frontend/scss'
        }
      , scripts: {
          main:'./frontend/js/main.js' 
        , dir: './frontend/js/**/*.js'
        }
      }
    , dist: {
        main: './dist/' // used for placing html files
      , styles: './dist/style.css'
      , bundle: './dist/bundle.js'
      }
    }

gulp.task('html', function (cb) {
  return gulp.src(paths.frontend.html)
    .pipe(gulp.dest(paths.dist.main))
})

var sass = require('gulp-sass')
  , prefix = require('gulp-autoprefixer')
  , cssmin = require('gulp-minify-css')
gulp.task('styles', function (cb) {
  return gulp.src(paths.frontend.styles.main)
    // scss preprocessor
    .pipe(sass({ 
    //  sourceComments: 'map'
      errLogToConsole: true 
    , includePaths: [ paths.frontend.styles.dir ]
    , onError: function (err) { console.log(err) }
    , error: function (err) { console.log(err) }
    , 
    }))
    // rule prefixer; works with source maps
    //.pipe(prefix())
    // minify; *hopefully* doesn't kill source maps
    //.pipe(cssmin())
    .pipe(gulp.dest(paths.dist.styles))
})

var browserify = require('gulp-browserify')
gulp.task('scripts', function (cb) {
  gulp.src(paths.frontend.scripts.main)
    .pipe(browserify({
      insertGlobals: true
    , debug: argv.debug
    }))
    .pipe(gulp.dest(paths.dist.bundle))
})

gulp.task('resources', function (cb) {
  gulp.src(paths.frontend.resources)
    .pipe(gulp.dest(paths.dist.main))
})

var nodemon = require('gulp-nodemon')
gulp.task('watch', function (cb) {
  if (!argv.oce) throw console.error('Error: Please provide location of oce binary')
  console.log(argv)
  gulp.watch(paths.frontend.html, ['html'])
  gulp.watch(paths.frontend.styles, ['styles'])
  gulp.watch(paths.frontend.scripts.dir, ['scripts'])
  gulp.watch(paths.frontend.resources, ['resources'])
  nodemon(paths.server + ' --oce=' + argv.oce)
})

// TODO: create full dist builds
gulp.task('build', ['html', 'styles', 'scripts', 'resources'], function () {})

gulp.task('default', ['watch'])
