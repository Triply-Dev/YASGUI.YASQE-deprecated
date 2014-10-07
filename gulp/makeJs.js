var gulp = require('gulp'),
	// concat = require('gulp-concat'),
	browserify = require('browserify'),
	notify = require('gulp-notify'),
	connect = require('gulp-connect'),
	embedlr = require('gulp-embedlr'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	uglify = require("gulp-uglify"),
	rename = require("gulp-rename"),
	streamify = require('gulp-streamify'),
	paths = require("./paths.js");

gulp.task('browserify', function() {
	return gulp.src("./src/*.js").pipe(jsValidate()).on('finish', function(){
			browserify("./src/main.js")
			.bundle({standalone: "YASQE", debug: true})
			.pipe(source(paths.bundleName + '.js'))
			.pipe(embedlr())
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(rename(paths.bundleName + '.min.js'))
			.pipe(streamify(uglify()))
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(connect.reload());
		});
});
gulp.task('browserifyWithDeps', function() {
	return gulp.src("./src/*.js").pipe(jsValidate()).on('finish', function(){
			browserify("./src/main.js")
			.require('jquery')
			.require('codemirror')
			// .require('yasgui-utils')
			.bundle({standalone: "YASQE", debug: true})
			.pipe(source(paths.bundleName + '.deps.js'))
			.pipe(embedlr())
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(rename(paths.bundleName + '.deps.min.js'))
			.pipe(streamify(uglify()))
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(connect.reload());
		});
});