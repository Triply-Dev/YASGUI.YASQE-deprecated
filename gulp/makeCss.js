var gulp = require('gulp'),
	concat = require('gulp-concat'),
	paths = require('./paths.js'),
	connect = require('gulp-connect'),
	sourcemaps = require('gulp-sourcemaps');
	sass = require('gulp-sass'),
	cssImport = require('gulp-cssimport'),
	rename = require("gulp-rename"),
	minifyCSS = require('gulp-minify-css');


gulp.task('makeCss', function() {
	  return gulp.src(paths.style)
		  .pipe(cssImport())//needed, because css files are not -actually- imported by sass, but remain as css @import statement...
	    .pipe(sass())
	    .pipe(concat(paths.bundleName + '.css'))
	    .pipe(gulp.dest(paths.bundleDir))
	    .pipe(minifyCSS())
	    .pipe(rename(paths.bundleName + '.min.css'))
	    .pipe(gulp.dest(paths.bundleDir))
	    .pipe(connect.reload());
})
