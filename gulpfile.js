var gulp = require('gulp');
var lr  = require('gulp-livereload');
var browserSync = require("browser-sync").create()
var babel = require('gulp-babel'); 
var sourcemaps = require('gulp-sourcemaps');

//File paths
var SCRIPTS_PATH = 'public/js/**/*.js';
var ES6_PATH = './**/*.es6';
var CSS_PATH = 'public/assets/css/**/*.css';
var IMAGES_PATH = 'public/images/**/*';

gulp.task('default',['images','styles','scripts'],function(){

    startExpress();
    console.log('gulp is up and running');
});

function startExpress() {


    var www = require('./bin/www');
    browserSync.init({
        proxy:'http://localhost:3100'
    })
  //  lr.listen();

}
gulp.task('watch',['default'],function(){
    gulp.watch('views/**/*.ejs', notifyLivereload);
    gulp.watch(IMAGES_PATH, notifyLivereload);
    gulp.watch(CSS_PATH, notifyLivereload);
    gulp.watch(SCRIPTS_PATH, notifyLivereload);
    gulp.watch(ES6_PATH, ['scripts']);
});
gulp.task('scripts',function(){
    console.log("optimizing scripts");
    return gulp.src(ES6_PATH)
    .pipe(sourcemaps.init())
    .pipe(babel({presets:['es2015']}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("./"))
    .pipe(browserSync.stream())
});
gulp.task('styles',function(){
    console.log("optimizing stylesheets");
});
gulp.task('images',function(){
    console.log("optimizing images");
});

gulp.task('connect',function(){
    console.log('connecting server')
    connect.server({livereload:true});
});
function notifyLivereload(event) {
    console.log("i detected a change");
// `gulp.watch()` events provide an absolute path
    // so we need to make it relative to the server root
    gulp.src(event.path, {read: false})
        //.pipe(lr())
        .pipe(browserSync.stream());


}