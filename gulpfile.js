var gulp = require('gulp')
  , paths = {
      allscripts: './**/*.js'
    , server: './server.js'
    , frontend: {
        // html top level in directory only
        html: './frontend/*.html'

        // sass and browserify handle includes for us
      , styles: './frontend/scss/main.scss'
      , scripts: {
          main:'./frontend/js/main.js' 
        , dir: './frontend/js/**/*.js'
        }
      }
    , dist: {
        main: './dist/' // used for placing html files
      , styles: './dist/css/'
      , bundle: './dist/bundle.js'
      }
    }

var htmlmin = require('gulp-minify-html')
gulp.task('html', function (cb) {
  return gulp.src(paths.frontend.html)
    .pipe(htmlmin)
    .pipe(gulp.dest(paths.dist.main))
})

var sass = require('gulp-sass')
  , prefix = require('gulp-autoprefixer')
  , cssmin = require('gulp-minify-css')
gulp.task('styles', function (cb) {
  return gulp.src(paths.frontend.styles)
    // scss preprocessor
    .pipe(sass({ sourceComments: 'map' }))
    // rule prefixer; works with source maps
    .pipe(prefix())
    // minify; *hopefully* doesn't kill source maps
    .pipe(cssmin())
    .pipe(gulp.dest(paths.dist.styles))
})

var browserify = require('gulp-browserify')
gulp.task('scripts', function (cb) {
  gulp.src(paths.frontend.scripts)
    .pipe(browserify({
      insertGlobals: true
    , debug: !gulp.env.production
    }))
    .pipe(gulp.dest(paths.dist.bundle))
})

gulp.task('resources', function (cb) {
  gulp.src(paths.frontend.resources)
    .pipe(gulp.dest(paths.dist.main))
})

var nodemon = require('gulp-nodemon')
  , argv = require('minimist')(process.argv.slice(2))
gulp.task('watch', function (cb) {
  gulp.watch(paths.frontend.html, ['html'])
  gulp.watch(paths.frontend.styles, ['styles'])
  gulp.watch(paths.frontend.scripts.dir, ['scripts'])
  gulp.watch(paths.frontend.resources, ['resources'])
  nodemon({ 
    script: paths.server 
  , execMap: { js: "node --oce=" + argv.oce }
  })
})

// TODO: create full dist builds
gulp.task('build', ['html', 'styles', 'scripts', 'resources'], function () {})

gulp.task('default', ['watch'])
