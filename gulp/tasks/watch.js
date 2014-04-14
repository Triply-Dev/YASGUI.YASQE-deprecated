var gulp       = require('gulp');
var livereload = require('gulp-livereload');

module.exports = function(){
	gulp.watch('src/**/*.js', ['browserify']);
	gulp.watch('src/images/**', ['images']);
	livereload();
};
