require('require-dir')('./gulp');
var gulp = require('gulp');

gulp.task('default', ['browserify', 'browserifyWithDeps', 'minifyCss', 'makedoc']);
gulp.task('serve', ['default', 'minifyCss', 'watch', 'connect']);

