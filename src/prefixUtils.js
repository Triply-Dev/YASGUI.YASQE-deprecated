'use strict';
/**
 * Append prefix declaration to list of prefixes in query window.
 *
 * @param yasqe
 * @param prefix
 */
var addPrefixes = function(yasqe, prefixes) {
	var existingPrefixes = yasqe.getPrefixesFromQuery();
	//for backwards compatability, we stil support prefixes value as string (e.g. 'rdf: <http://fbfgfgf>'
	if (typeof prefixes == "string") {
		addPrefixAsString(yasqe, prefixes);
	} else {
		for (var pref in prefixes) {
			if (!(pref in existingPrefixes))
				addPrefixAsString(yasqe, pref + ": <" + prefixes[pref] + ">");
		}
	}
	yasqe.collapsePrefixes(false);
};

var addPrefixAsString = function(yasqe, prefixString) {
	var lastPrefix = null;
	var lastPrefixLine = 0;
	var numLines = yasqe.lineCount();
	for (var i = 0; i < numLines; i++) {
		var firstToken = yasqe.getNextNonWsToken(i);
		if (firstToken != null && (firstToken.string == "PREFIX" || firstToken.string == "BASE")) {
			lastPrefix = firstToken;
			lastPrefixLine = i;
		}
	}

	if (lastPrefix == null) {
		yasqe.replaceRange("PREFIX " + prefixString + "\n", {
			line: 0,
			ch: 0
		});
	} else {
		var previousIndent = getIndentFromLine(yasqe, lastPrefixLine);
		yasqe.replaceRange("\n" + previousIndent + "PREFIX " + prefixString, {
			line: lastPrefixLine
		});
	}
	yasqe.collapsePrefixes(false);
};
var removePrefixes = function(yasqe, prefixes) {
	var escapeRegex = function(string) {
		//taken from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
		return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
	for (var pref in prefixes) {
		yasqe.setValue(yasqe.getValue().replace(new RegExp("PREFIX\\s*" + pref + ":\\s*" + escapeRegex("<" + prefixes[pref] + ">") + "\\s*", "ig"), ''));
	}
	yasqe.collapsePrefixes(false);

};

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 *
 * @param cm
 * @returns {Array}
 */
var getPrefixesFromQuery = function(yasqe) {
	//Use precise here. We want to be sure we use the most up to date state. If we're
	//not, we might get outdated prefixes from the current query (creating loops such
	//as https://github.com/OpenTriply/YASGUI/issues/84)
	return yasqe.getTokenAt({line: yasqe.lastLine(), ch:yasqe.getLine(yasqe.lastLine()).length}, true).state.prefixes;
};

/**
 * Get the used indentation for a certain line
 *
 * @param yasqe
 * @param line
 * @param charNumber
 * @returns
 */
var getIndentFromLine = function(yasqe, line, charNumber) {
	if (charNumber == undefined)
		charNumber = 1;
	var token = yasqe.getTokenAt({
		line: line,
		ch: charNumber
	});
	if (token == null || token == undefined || token.type != "ws") {
		return "";
	} else {
		return token.string + getIndentFromLine(yasqe, line, token.end + 1);
	};
};

module.exports = {
	addPrefixes: addPrefixes,
	getPrefixesFromQuery: getPrefixesFromQuery,
	removePrefixes: removePrefixes
};
