var gulp = require('gulp'),
	concat = require('gulp-concat'),
	paths = require('./paths.js'),
	connect = require('gulp-connect'),
	minifyCSS = require('gulp-minify-css');

gulp.task('concatCss', function() {
  return gulp.src(paths.style)
  	.pipe(concat(paths.bundleName + '.css'))
    .pipe(gulp.dest(paths.bundleDir))
    ;
});
gulp.task('minifyCss', ['concatCss'], function() {
	return gulp.src(paths.bundleDir + "/" + paths.bundleName + ".css")
	.pipe(concat(paths.bundleName + '.min.css'))
    .pipe(minifyCSS())
	.pipe(gulp.dest(paths.bundleDir))
	 .pipe(connect.reload());
	
});