var gulp = require('gulp'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    filter = require('gulp-filter'),
    tag_version = require('gulp-tag-version');
	



function inc(importance) {
    // get all the files to bump version in
    return gulp.src('./package.json') 
        // bump the version number in those files
        .pipe(bump({type: importance}))
        // save it back to filesystem
        .pipe(gulp.dest('./'));
}


gulp.task('tag', function() {
	return gulp.src('./package.json')
    .pipe(git.commit('version bump')).pipe(tag_version());
});


gulp.task('bumpPatch', function() { return inc('patch'); })
gulp.task('bumpMinor', function() { return inc('minor'); })
gulp.task('bumpMajor', function() { return inc('major'); })

gulp.task('patch', ['bumpPatch', 'default', 'tag']);
gulp.task('minor', ['bumpMinor', 'default', 'tag']);
gulp.task('major', ['bumpMajor', 'default', 'tag']);
