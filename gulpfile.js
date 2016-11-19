var gulp = require('gulp');
var less = require('gulp-less');
var uglifyJs = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var minifyejs = require('gulp-minify-ejs');
var path = require('path');

gulp.task('less', function () {
  return gulp.src('./public/less/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./public/css'));
});

gulp.task('minify-css', function() {
    return gulp.src('./public/css/*.css')
        .pipe(minifyCss())
        .pipe(gulp.dest('./mini/css'))
});

gulp.task("compress", function() {
    return gulp.src('./public/js/common.js')
        .pipe(uglifyJs())
        .pipe(gulp.dest('./mini/js'));
});

gulp.task('minify-html', function() {
    return gulp.src('./views/**/*.html')
        .pipe(minifyejs())
        .pipe(gulp.dest('./mini/html'));
});

// 默认任务
gulp.task('default', function() {
    gulp.run('less');

    gulp.watch([
        './public/less/*.less',
    ], function(event) {
        gulp.run('less');
    });
});

//gulp.task('mini', ['minify-css', 'minify-html', 'compress'], function() {
//});


gulp.task('mini', ['minify-css', 'minify-html'], function() {
});
