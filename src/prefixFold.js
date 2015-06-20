var CodeMirror = require('codemirror'),
	tokenUtils = require('./tokenUtils.js');

"use strict";
var lookFor = "PREFIX";
module.exports = {
	findFirstPrefixLine: function(cm) {
		var lastLine = cm.lastLine();
		for (var i = 0; i <= lastLine; ++i) {
			if (findFirstPrefix(cm, i) >= 0) {
				return i;
			}
		}
	}
}

function findFirstPrefix(cm, line, ch, lineText) {
	if (!ch) ch = 0;
	if (!lineText) lineText = cm.getLine(line);
	lineText = lineText.toUpperCase();
	for (var at = ch, pass = 0;;) {
		var found = lineText.indexOf(lookFor, at);
		if (found == -1) {
			if (pass == 1)
				break;
			pass = 1;
			at = lineText.length;
			continue;
		}
		if (pass == 1 && found < ch)
			break;
		tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
		if (!/^(comment|string)/.test(tokenType))
			return found + 1;
		at = found - 1;
	}
}

CodeMirror.registerHelper("fold", "prefix", function(cm, start) {
	var line = start.line,
		lineText = cm.getLine(line);

	var startCh, tokenType;

	function hasPreviousPrefix() {
		var hasPreviousPrefix = false;
		for (var i = line - 1; i >= 0; i--) {
			if (cm.getLine(i).toUpperCase().indexOf(lookFor) >= 0) {
				hasPreviousPrefix = true;
				break;
			}
		}
		return hasPreviousPrefix;
	}


	function findOpening(openCh) {
		for (var at = start.ch, pass = 0;;) {
			var found = at <= 0 ? -1 : lineText.lastIndexOf(openCh, at - 1);
			if (found == -1) {
				if (pass == 1)
					break;
				pass = 1;
				at = lineText.length;
				continue;
			}
			if (pass == 1 && found < start.ch)
				break;
			tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
			if (!/^(comment|string)/.test(tokenType))
				return found + 1;
			at = found - 1;
		}
	}
	var getLastPrefixPos = function(line, ch) {
		var prefixKeywordToken = cm.getTokenAt(CodeMirror.Pos(line, ch + 1));
		if (!prefixKeywordToken || prefixKeywordToken.type != "keyword") return -1;
		var prefixShortname = tokenUtils.getNextNonWsToken(cm, line, prefixKeywordToken.end + 1);
		if (!prefixShortname || prefixShortname.type != "string-2") return -1; //missing prefix keyword shortname
		var prefixUri = tokenUtils.getNextNonWsToken(cm, line, prefixShortname.end + 1);
		if (!prefixUri || prefixUri.type != "variable-3") return -1; //missing prefix uri
		return prefixUri.end;
	}

	//only use opening prefix declaration
	if (hasPreviousPrefix())
		return;
	var prefixStart = findFirstPrefix(cm, line, start.ch, lineText);

	if (prefixStart == null)
		return;
	var stopAt = '{'; //if this char is there, we won't have a chance of finding more prefixes
	var stopAtNextLine = false;
	var count = 1,
		lastLine = cm.lastLine(),
		end, endCh;
	var prefixEndChar = getLastPrefixPos(line, prefixStart);
	var prefixEndLine = line;

	outer: for (var i = line; i <= lastLine; ++i) {
		if (stopAtNextLine)
			break;
		var text = cm.getLine(i),
			pos = i == line ? prefixStart + 1 : 0;

		for (;;) {
			if (!stopAtNextLine && text.indexOf(stopAt) >= 0)
				stopAtNextLine = true;

			var nextPrefixDeclaration = text.toUpperCase()
				.indexOf(lookFor, pos);

			if (nextPrefixDeclaration >= 0) {
				if ((endCh = getLastPrefixPos(i, nextPrefixDeclaration)) > 0) {
					prefixEndChar = endCh;
					prefixEndLine = i;
					pos = prefixEndChar;
				}
				pos++;
			} else {
				break;
			}
		}
	}
	return {
		from: CodeMirror.Pos(line, prefixStart + lookFor.length),
		to: CodeMirror.Pos(prefixEndLine, prefixEndChar)
	};
});