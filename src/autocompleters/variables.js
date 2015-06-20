'use strict';
var $ = require('jquery');
module.exports = function(yasqe) {
	return {
		isValidCompletionPosition: function() {
			var token = yasqe.getTokenAt(yasqe.getCursor());
			if (token.type != "ws") {
				token = yasqe.getCompleteToken(token);
				if (token && token.string.indexOf("?") == 0) {
					return true;
				}
			}
			return false;
		},
		get: function(token) {
			if (token.trim().length == 0) return []; //nothing to autocomplete
			var distinctVars = {};
			//do this outside of codemirror. I expect jquery to be faster here (just finding dom elements with classnames)
			$(yasqe.getWrapperElement()).find(".cm-atom").each(function() {
				var variable = this.innerHTML;
				if (variable.indexOf("?") == 0) {
					//ok, lets check if the next element in the div is an atom as well. In that case, they belong together (may happen sometimes when query is not syntactically valid)
					var nextEl = $(this).next();
					var nextElClass = nextEl.attr('class');
					if (nextElClass && nextEl.attr('class').indexOf("cm-atom") >= 0) {
						variable += nextEl.text();
					}

					//skip single questionmarks
					if (variable.length <= 1) return;

					//it should match our token ofcourse
					if (variable.indexOf(token) !== 0) return;

					//skip exact matches
					if (variable == token) return;

					//store in map so we have a unique list 
					distinctVars[variable] = true;


				}
			});
			var variables = [];
			for (var variable in distinctVars) {
				variables.push(variable);
			}
			variables.sort();
			return variables;
		},
		async: false,
		bulk: false,
		autoShow: true,
	}
};