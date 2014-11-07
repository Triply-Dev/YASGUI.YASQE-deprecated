var gulp = require('gulp'),
	browserify = require('browserify'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	embedlr = require('gulp-embedlr'),
	minifyCSS = require('gulp-minify-css'),
	uglify = require("gulp-uglify"),
	buffer = require("vinyl-buffer"),
	concat = require('gulp-concat');

gulp.task('makeMainPageJs', function() {
	return gulp.src("./doc/*.js").pipe(jsValidate()).on('finish', function(){
				browserify({entries: ["./doc/main.js"],debug: true})
				.bundle()
				.pipe(source('doc.min.js'))
				.pipe(buffer())
				.pipe(uglify())
			    .pipe(gulp.dest('doc'));
			});
});
gulp.task('makeMainPageCss', function() {
	return gulp.src(['node_modules/twitter-bootstrap-3.0.0/dist/css/bootstrap.css', './doc/main.css'])
  	.pipe(concat('doc.min.css'))
  	.pipe(minifyCSS())
    .pipe(gulp.dest("doc"))
    ;
	
});

gulp.task('makeMainPage', ['makeMainPageJs', 'makeMainPageCss']);