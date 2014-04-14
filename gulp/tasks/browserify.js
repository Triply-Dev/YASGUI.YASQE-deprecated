var browserify = require('browserify');
var gulp = require('gulp');
var livereload = require('gulp-livereload');
var notify = require("gulp-notify");
var source = require('vinyl-source-stream');
var embedlr = require("gulp-embedlr");



module.exports = function() {
	return browserify('./src/main.js'
//			{
//			entries: ['./src/javascript/app.coffee'],
//			extensions: ['.coffee', '.hbs']
//		}
			)
//			browserify('./src/main.js').bundle({standalone: "Yasqe", debug: true})
//    .pipe(source('bundle.js'))
//    .pipe(gulp.dest(dest));
//	
//		.require('backbone/node_modules/underscore', { expose: 'underscore' })
		.bundle({standalone: "Yasqe", debug: true})
		.on('error', notify.onError({
			message: "<%= error.message %>",
			title: "JavaScript Error"
		}))
		.pipe(source('app.js'))
		.pipe(embedlr())
		.pipe(gulp.dest('./build/'))
		.pipe(livereload());
};
