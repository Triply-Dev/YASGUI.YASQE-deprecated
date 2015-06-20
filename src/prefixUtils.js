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
	var queryPrefixes = {};
	var shouldContinue = true;
	var getPrefixesFromLine = function(lineOffset, colOffset) {
		if (!shouldContinue) return;
		if (!colOffset) colOffset = 1;
		var token = yasqe.getNextNonWsToken(i, colOffset);
		if (token) {
			if (token.state.possibleCurrent.indexOf("PREFIX") == -1 && token.state.possibleNext.indexOf("PREFIX") == -1) shouldContinue = false; //we are beyond the place in the query where we can enter prefixes
			if (token.string.toUpperCase() == "PREFIX") {
				var prefix = yasqe.getNextNonWsToken(i, token.end + 1);
				if (prefix) {
					var uri = yasqe.getNextNonWsToken(i, prefix.end + 1);
					if (uri) {
						var uriString = uri.string;
						if (uriString.indexOf("<") == 0)
							uriString = uriString.substring(1);
						if (uriString.slice(-1) == ">")
							uriString = uriString
							.substring(0, uriString.length - 1);
						queryPrefixes[prefix.string.slice(0, -1)] = uriString;

						getPrefixesFromLine(lineOffset, uri.end + 1);
					} else {
						getPrefixesFromLine(lineOffset, prefix.end + 1);
					}

				} else {
					getPrefixesFromLine(lineOffset, token.end + 1);
				}
			} else {
				getPrefixesFromLine(lineOffset, token.end + 1);
			}
		}
	};


	var numLines = yasqe.lineCount();
	for (var i = 0; i < numLines; i++) {
		if (!shouldContinue) break;
		getPrefixesFromLine(i);

	}
	return queryPrefixes;
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