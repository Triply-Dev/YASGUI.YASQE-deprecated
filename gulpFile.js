require('require-dir')('./gulp');
var gulp = require('gulp');
gulp.task('default', ['browserify', 'minifyJs', 'minifyCss', 'makedoc']);
gulp.task('serve', ['default', 'watch', 'connect']);


