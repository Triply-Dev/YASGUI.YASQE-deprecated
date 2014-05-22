var paths = {
	style: [
		'node_modules/codemirror/lib/codemirror.css', 
		'node_modules/codemirror/addon/hint/show-hint.css',
		'src/**/*.css',
	]
};
var dest = "dist";
var outputName = "yasqe";
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
var jsValidate = require('gulp-jsvalidate');
var yuidoc = require("gulp-yuidoc");
gulp.on('err', function(err){
	console.log("on general err");
	  console.log(err);
});


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
		port : 4000,
		livereload: true
	});
});
gulp.task('browserify', function() {
	gulp.src("./src/*.js").pipe(jsValidate()).on('error', 
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
		    .pipe(source(outputName + '.js'))
		    .pipe(embedlr())
		    .pipe(gulp.dest(dest))
		    .pipe(connect.reload());
		});
		
		
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
	});
});


gulp.task('makeDocLib', function() {
	gulp.src("./doc/*.js").pipe(jsValidate()).on('error', 
			notify.onError({
				message: "Error: <%= error.message %>",
				title: "Failed running browserify"
			})).on('finish', function(){
				browserify("./doc/main.js")
				.bundle({debug: true}).on('error', notify.onError({
			        message: "Error: <%= error.message %>",
			        title: "Failed running browserify"
			      })).on('prebundle', function(bundle) {
			    	  console.log("prebundle!");
			    	})
			    .pipe(source('doc.js'))
			    .pipe(embedlr())
			    .pipe(gulp.dest('doc'));
//			    .pipe(connect.reload());
			});
});
gulp.task('makeDocCss', function() {
	gulp.src(['node_modules/twitter-bootstrap-3.0.0/dist/css/bootstrap.css', './doc/main.css'])
  	.pipe(concat('doc.css'))
    .pipe(gulp.dest("doc"))
    ;
	
});
gulp.task('makedoc', ['makeDocLib', 'makeDocCss'], function() {
	//copy bootstrap, used for our documentation
//	gulp.src("./src/main.js")
//	.pipe(jsdoc.parser())
//	.pipe(gulp.dest("./doc"));
	gulp.src("./src/main.js")
	.pipe(yuidoc.parser())
	.pipe(gulp.dest("./doc"));
	
	
});
gulp.task('packageMinified', ['minifyJs', 'minifyCss']);
gulp.task('default', ['browserify', 'packageMinified']);
gulp.task('serve', ['browserify', 'minifyCss', 'watch', 'connect']);

