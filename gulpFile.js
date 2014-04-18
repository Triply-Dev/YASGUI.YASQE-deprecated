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
var uglify = require('gulp-uglify');

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
	});
});
gulp.task('browserify', function() {
		var browse = browserify("./src/main.js")
		.bundle({standalone: "YasguiQuery", debug: true}).on('error', notify.onError({
	        message: "Error: <%= error.message %>",
	        title: "Failed running browserify"
	      }));
		
	    browse.pipe(source(outputName + '.js'))
	    .pipe(embedlr())
	    .pipe(gulp.dest(dest))
	    .pipe(connect.reload());
});
gulp.task('minifyJs', function() {
	gulp.src(dest + "/" + outputName + ".js")
	.pipe(concat(outputName + '.min.js'))
    .pipe(uglify())
	.pipe(gulp.dest(dest));
});


gulp.task('watch', function() {
	gulp.watch(["./src/main.js", './lib/*.js'], [ 'browserify' ]);
	gulp.watch(paths.style, [ 'minifyCss' ]);
	  gulp.watch(
		'./*.html'
	, function(files) {
		gulp.src(files.path).pipe(connect.reload());
//		console.log(files);
//		connect.reload(files.path);
//		return files.pipe(connect.reload());
	});
});


gulp.task('packageMinified', ['minifyJs', 'minifyCss']);
gulp.task('default', ['browserify', 'packageMinified']);

gulp.task('serve', ['browserify', 'watch', 'connect']);

