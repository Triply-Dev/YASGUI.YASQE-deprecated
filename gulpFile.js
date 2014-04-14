var paths = {
  cmResources: [
	'bower_components/codemirror/mode/javascript/javascript.js',
	'bower_components/codemirror/mode/xml/xml.js',
	'bower_components/codemirror/mode/turtle/turtle.js',
	'bower_components/codemirror/addon/hint/show-hint.js',
	'bower_components/codemirror/addon/search/searchcursor.js',
	'bower_components/codemirror/addon/edit/matchbrackets.js',
	'bower_components/codemirror/addon/runmode/runmode.js',
	'lib/formatting.js',
	'lib/flint.js',
	
  ],
  trieScripts: [
    'lib/trie.js'
	],
	style: [
		'bower_components/codemirror/lib/codemirror.css', 
		'bower_components/codemirror/addon/hint/show-hint.css',
		'src/**/*.css',
	]
};

var EXPRESS_PORT = 4000;
var EXPRESS_ROOT = __dirname;
var LIVERELOAD_PORT = 35729;

var debug = require('gulp-debug');
var gulp = require('gulp');
var gutil = require('gulp-util');
var watchify = require('watchify');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var bust = require('gulp-buster');
var connect = require('gulp-connect');
var embedlr = require('gulp-embedlr');
var livereload = require('gulp-livereload');

var dest = "dist";

var log = function(mainMsg, secondaryMsg) {
	var args = ['[' + gutil.colors.green(new Date().toLocaleTimeString()) + ']'];
	if (mainMsg) args.push(gutil.colors.cyan(mainMsg));
	if (secondaryMsg) args.push(gutil.colors.magenta(secondaryMsg));
	gutil.log.apply(null, args);
};

gulp.task('concatCmResources', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.cmResources)
    .pipe(concat('cmResources.js'))
    .pipe(gulp.dest("./lib"));
});


gulp.task('concatCss', function() {
  gulp.src(paths.style)
  
  	.pipe(concat('yasqe.css'))
    .pipe(gulp.dest(dest))
//    .on('err', function(error) {
//    	console.log("browserify error");
//    	notify("error");
//    });
    ;
});
gulp.task('minifyCss', ['concatCss'], function() {
	gulp.src(dest + "/yasqe.css")
	.pipe(concat('yasqe.min.css'))
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
gulp.task('browserify', ["concatCmResources"], function() {
	browserify('./src/main.js').bundle({standalone: "Yasqe", debug: true})
	
    .pipe(source('bundle.js'))
    .pipe(embedlr())
    .pipe(gulp.dest(dest))
    .pipe(connect.reload())
//    .on('error', function(error) {
//    	console.log("browserify error");
//    	notify("error");
//    })
    ;
    ;
});
gulp.task('watch', function() {
	gulp.watch(paths.cmResources, [ 'browserify' ]);
	gulp.watch(paths.trieScripts, [ 'browserify' ]);
	gulp.watch("src/main.js", [ 'browserify' ]);
	gulp.watch(paths.style, [ 'minifyCss' ]);
//	var server = livereload();
//	  gulp.watch('./dist/**').on('change', function(file) {
//		  console.log("dist change");
//		  console.log(file.path);
////	      server.changed(file.path);
//		  server.changed("dist/bundle.js");
//	  });
//	  gulp.watch('./*.html').on('change', function(file) {
//	      server.changed(file.path);
//	  });
});


gulp.task('default', ['browserify', 'minifyCss', 'watch', 'connect']);



