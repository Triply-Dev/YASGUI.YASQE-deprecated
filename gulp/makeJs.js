var gulp = require('gulp'),
	browserify = require('browserify'),
	connect = require('gulp-connect'),
	concat = require('gulp-concat'),
	browserifyShim = require('browserify-shim'),
	embedlr = require('gulp-embedlr'),
	jsValidate = require('gulp-jsvalidate'),
	source = require('vinyl-source-stream'),
	uglify = require("gulp-uglify"),
	rename = require("gulp-rename"),
	merge = require('merge-stream'),
	streamify = require('gulp-streamify'),
	paths = require("./paths.js"),
	replace = require('gulp-replace');

var addOnFiles = [
	"./node_modules/codemirror/addon/hint/show-hint.js",
	"./node_modules/codemirror/addon/search/searchcursor.js",
	"./node_modules/codemirror/addon/edit/matchbrackets.js",
	"./node_modules/codemirror/addon/runmode/runmode.js"
];

gulp.task('browserify', function() {
	var baseBundle = browserify("./src/main.js", {bundleExternal: false})
		.transform(browserifyShim)
		// Workarounds for yasgui-utils requiring dependencies and browserify-shim not being able to remove
		.require('yasgui-utils')
		.bundle({standalone: "YASQE", debug: true})
		.pipe(source(paths.bundleName + '.js'))
		.pipe(streamify(jsValidate()));

	// We need to include the addOns separately because they are treated as external modules.
	var addOns = gulp.src(addOnFiles);

	return merge(baseBundle, addOns)
		.pipe(streamify(concat(paths.bundleName + '.js')))
		// Workarounds for yasgui-utils requiring dependencies and browserify-shim not being able to shim
		// dependencies of dependencies.
		.pipe(replace('_dereq_("jquery")', '(typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null)'))
		.pipe(replace('_dereq_("store")', '(typeof window !== "undefined" ? window.store : typeof global !== "undefined" ? global.store : null)'))
		.pipe(embedlr())
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(rename(paths.bundleName + '.min.js'))
		.pipe(streamify(uglify()))
		.pipe(gulp.dest(paths.bundleDir))
		.pipe(connect.reload());
});
gulp.task('browserifyWithDeps', function() {
	return gulp.src("./src/*.js").pipe(jsValidate()).on('finish', function(){
			browserify("./src/main.js")
			.bundle({standalone: "YASQE", debug: true})
			.pipe(source(paths.bundleName + '.deps.js'))
			.pipe(embedlr())
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(rename(paths.bundleName + '.deps.min.js'))
			.pipe(streamify(uglify()))
			.pipe(gulp.dest(paths.bundleDir))
			.pipe(connect.reload());
		});

});