var gulp = require('gulp'),
	browserify = require('browserify'),
	notify = require("gulp-notify"),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	embedlr = require('gulp-embedlr'),
	concat = require('gulp-concat'),
	yuidoc = require("gulp-yuidoc");


gulp.task('makeDocLib', function() {
	return gulp.src("./doc/*.js").pipe(jsValidate()).on('finish', function(){
				browserify({entries: ["./doc/main.js"],debug: true})
				.bundle().on('prebundle', function(bundle) {
			    	  console.log("prebundle!");
			    	})
			    .pipe(source('doc.js'))
			    .pipe(embedlr())
			    .pipe(gulp.dest('doc'));
			});
});
gulp.task('makeDocCss', function() {
	return gulp.src(['node_modules/twitter-bootstrap-3.0.0/dist/css/bootstrap.css', './doc/main.css'])
  	.pipe(concat('doc.css'))
    .pipe(gulp.dest("doc"))
    ;
	
});

gulp.task('makedoc', ['makeDocLib', 'makeDocCss'], function() {
	gulp.src("./src/main.js")
	.pipe(yuidoc.parser())
	.pipe(gulp.dest("./doc"));
});