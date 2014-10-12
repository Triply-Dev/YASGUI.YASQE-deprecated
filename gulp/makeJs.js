var gulp = require('gulp'),
	concat = require('gulp-concat'),
	browserify = require('browserify'),
	notify = require('gulp-notify'),
	connect = require('gulp-connect'),
	embedlr = require('gulp-embedlr'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	uglify = require("gulp-uglify"),
	paths = require("./paths.js");



gulp.task('browserify', function() {
	return gulp.src("./src/*.js").pipe(jsValidate()).on('error', 
		notify.onError({
			message: "Error: <%= error.message %>",
			title: "Failed running browserify"
		})).on('finish', function(){
			browserify("./src/main.js")
			.bundle({standalone: "YASQE", debug: true}).on('error', notify.onError({
		        message: "Error: <%= error.message %>",
		        title: "Failed running browserify"
		      })).on('prebundle', function(bundle) {
		    	  console.log("prebundle!");
		    	})
		    .pipe(source(paths.bundleName + '.js'))
		    .pipe(embedlr())
		    .pipe(gulp.dest(paths.bundleDir))
		    .pipe(connect.reload());
		});
});
gulp.task('minifyJs', ['browserify'], function() {
	return gulp.src(paths.bundleDir + "/" + paths.bundleName + ".js")
	.pipe(concat(paths.bundleName + '.min.js'))
    .pipe(uglify())
	.pipe(gulp.dest(paths.bundleDir));
});