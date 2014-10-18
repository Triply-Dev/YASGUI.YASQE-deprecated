require('require-dir')('./gulp');
var gulp = require('gulp');

gulp.task('default', ['browserify', 'browserifyWithDeps', 'minifyCss', 'makeMainPage']);
gulp.task('serve', ['default', 'minifyCss', 'watch', 'connect']);

