var gulp = require('gulp'),
	browserify = require('browserify'),
	connect = require('gulp-connect'),
	concat = require('gulp-concat'),
	embedlr = require('gulp-embedlr'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	uglify = require("gulp-uglify"),
	rename = require("gulp-rename"),
	streamify = require('gulp-streamify'),
	paths = require("./paths.js");


gulp.task('browserify', function() {
	var baseBundle = browserify("./src/main.js", {bundleExternal: true})
		.exclude('jquery')
		.exclude('codemirror')
		.bundle({standalone: "YASQE", debug: true})
		.pipe(source(paths.bundleName + '.js'))
		.pipe(streamify(jsValidate()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(rename(paths.bundleName + '.min.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(connect.reload());
	
});


gulp.task('browserifyWithDeps', function() {
	return gulp.src("./src/*.js").pipe(jsValidate()).on('finish', function(){
			browserify("./src/main.js")
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