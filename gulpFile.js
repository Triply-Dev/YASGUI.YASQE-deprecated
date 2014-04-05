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


var gulp = require('gulp');
var gutil = require('gulp-util');
var watchify = require('watchify');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var bust = require('gulp-buster');

var dest = "dist";

var log = function(mainMsg, secondaryMsg) {
	var args = ['[' + gutil.colors.green(new Date().toLocaleTimeString()) + ']'];
	if (mainMsg) args.push(gutil.colors.cyan(mainMsg));
	if (secondaryMsg) args.push(gutil.colors.magenta(secondaryMsg));
	gutil.log.apply(null, args);
};

//log("blaat", "blaa2");
gulp.task('concatCmResources', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.cmResources)
    .pipe(concat('cmResources.js'))
    .pipe(gulp.dest("./lib"));
});


gulp.task('concatCss', function() {
  gulp.src(paths.style)
  	.pipe(concat('yasqe.css'))
    .pipe(gulp.dest(dest));
});
gulp.task('minifyCss', ['concatCss'], function() {
	gulp.src(dest + "/yasqe.css")
	.pipe(concat('yasqe.min.css'))
    .pipe(minifyCSS())
	.pipe(gulp.dest(dest));
	if (lr) notifyLivereload({path: "./" + dest + "/yasqe.min.css"});
});

var startExpress = function() {
	 
	 var express = require('express');
	  var app = express();
	  app.use(require('connect-livereload')());
	  app.use(express.static(EXPRESS_ROOT));
	  app.listen(EXPRESS_PORT);
};
var lr;
function notifyLivereload(event) {
	
	var fileName = require('path').relative(EXPRESS_ROOT, event.path);
	log(fileName, event.path);
	  lr.changed({
	    body: {
	      files: [fileName]
	    }
	  });
	gulp.src(event.path, {
		read : false
	}).pipe(require('gulp-livereload')(lr));
	
}

function startLivereload() {
  lr = require('tiny-lr')();
  lr.listen(LIVERELOAD_PORT);
}
gulp.task('browserify', ["concatCmResources"], function() {
	console.log("browserifying!!!!!!!!!!!");
	browserify('./src/main.js').bundle({standalone: "Yasqe", debug: true})
    .pipe(source('bundle.js'))
    .pipe(gulp.dest(dest));
	
	if (lr) notifyLivereload({path: "./dist/bundle.js"});
});


gulp.task('watch', function() {
	gulp.watch(paths.cmScripts, [ 'browserify' ]);
	gulp.watch(paths.trieScripts, [ 'browserify' ]);
	gulp.watch("src/main.js", [ 'browserify' ]);
	gulp.watch(paths.style, [ 'minifyCss' ]);
//	gulp.watch("dist/bundle.js", function(event) {
//		watchEvent(event, "bundle", true);
//	});
});

gulp.task('default', ['browserify', 'minifyCss', 'watch'], function() {
	startExpress();
	startLivereload();
//	gutil.log(new Date().toLocaleTimeString());  
	log('Running on http://localhost:' + EXPRESS_PORT);
//	gutil.log('[' + gutil.colors.green(new Date().toLocaleTimeString()) + ']', gutil.colors.cyan('Running on http://localhost:' + EXPRESS_PORT));
});



