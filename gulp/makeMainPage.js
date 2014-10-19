var gulp = require('gulp'),
	browserify = require('browserify'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	embedlr = require('gulp-embedlr'),
	concat = require('gulp-concat');

gulp.task('makeMainPageJs', function() {
	return gulp.src("./doc/*.js").pipe(jsValidate()).on('finish', function(){
				browserify({entries: ["./doc/main.js"],debug: true})
				.bundle()
			    .pipe(source('doc.js'))
			    .pipe(embedlr())
			    .pipe(gulp.dest('doc'));
			});
});
gulp.task('makeMainPageCss', function() {
	return gulp.src(['node_modules/twitter-bootstrap-3.0.0/dist/css/bootstrap.css', './doc/main.css'])
  	.pipe(concat('doc.css'))
    .pipe(gulp.dest("doc"))
    ;
	
});

gulp.task('makeMainPage', ['makeMainPageJs', 'makeMainPageCss']);