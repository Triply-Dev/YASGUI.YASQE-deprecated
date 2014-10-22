require('require-dir')('./gulp');

var gulp = require('gulp');
gulp.task('default', ['browserify', 'browserifyWithDeps', 'minifyCss', 'makeMainPage']);
gulp.task('serve', ['minifyCss', 'makeMainPage', 'browserifyForDebug', 'watch', 'connect']);

