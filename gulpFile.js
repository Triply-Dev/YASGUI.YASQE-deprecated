var paths = {
	style: [
		'bower_components/codemirror/lib/codemirror.css', 
		'bower_components/codemirror/addon/hint/show-hint.css',
		'src/**/*.css',
	]
};
var dest = "dist";
var outputName = "yasgui-query";
var EXPRESS_PORT = 4000;


var gulp = require('gulp');
var gutil = require('gulp-util');
var watchify = require('watchify');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var connect = require('gulp-connect');
var embedlr = require('gulp-embedlr');
var livereload = require('gulp-livereload');
var notify = require("gulp-notify");


var log = function(mainMsg, secondaryMsg) {
	var args = ['[' + gutil.colors.green(new Date().toLocaleTimeString()) + ']'];
	if (mainMsg) args.push(gutil.colors.cyan(mainMsg));
	if (secondaryMsg) args.push(gutil.colors.magenta(secondaryMsg));
	gutil.log.apply(null, args);
};


gulp.task('concatCss', function() {
  gulp.src(paths.style)
  	.pipe(concat(outputName + '.css'))
    .pipe(gulp.dest(dest))
    ;
});
gulp.task('minifyCss', ['concatCss'], function() {
	gulp.src(dest + "/" + outputName + ".css")
	.pipe(concat(outputName + '.min.css'))
    .pipe(minifyCSS())
	.pipe(gulp.dest(dest))
	 .pipe(connect.reload());
	
});

gulp.task('connect', function() {
//	log('Running on http://localhost:' + EXPRESS_PORT);
	connect.server({
//		root : './',
		port : 4000,
		livereload: true
	}).on("error", errorHandler);
});
var onPackageError = function(err){
	
	this.emit('end');
};
gulp.task('browserify', function() {
		var browse = browserify("./src/main.js")
		.bundle({debug: true}).on('error', onPackageError);
		
		
	    browse.pipe(source(outputName + '.js'))
	    .pipe(embedlr())
	    .pipe(gulp.dest(dest))
	    .pipe(connect.reload())
	    .on('error', function(error) {
	    	console.log("browserify error");
	    	notify("error");
	    });
		
		
});
gulp.task('watch', function() {
	gulp.watch(paths.cmResources, [ 'browserify' ]);
	gulp.watch(paths.trieScripts, [ 'browserify' ]);
	gulp.watch("src/main.js", [ 'browserify' ]);
	gulp.watch(paths.style, [ 'minifyCss' ]);
});


gulp.task('default', ['browserify', 'minifyCss', 'watch', 'connect']);



