var gulp = require('gulp');
var open = require("gulp-open");

module.exports = function() {

	var options = {
		url: "http://localhost:4000",
		app: "google chrome"
	};

	return gulp.src("./index.html").pipe(open("", options));
};
