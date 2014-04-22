'use strict';
var $ = require("jquery");
var CodeMirror = require("codemirror");

require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');
require('../lib/formatting.js');
require('../lib/flint.js');
var root = module.exports = function(parent, config) {
	config = extendConfig(config);
	var cm = extendCmInstance(CodeMirror(parent, config));
	postProcessCmElement(cm);
	return cm;
};

/**
 * Extend config object, which we will pass on to the CM constructor later on.
 * Need this, to make sure our own 'onBlur' etc events do not get overwritten by people who add their own onblur events to the config
 * Additionally, need this to include the CM defaults ourselves. CodeMirror has a method for including defaults, but we can't rely on that one: it assumes flat config object, where we have nested objects (e.g. the persistency option)
 */
var extendConfig = function(config) {
	var extendedConfig = $.extend(true, {}, root.defaults, config);//I know, codemirror deals with default options as well. However, it does not do this recursively (i.e. the persistency option)
	
//	if (extendedConfig.persistency && extendedConfig.persistency.query) {
		
//	}
	return extendedConfig;
};
/**
 * Add extra functions to the CM document (i.e. the codemirror instantiated object)
 */
var extendCmInstance = function(cm) {
	cm.query = function() {
		console.log("queryingffddssddssssssdssssss! " + cm.getValue());
	};
	cm.store = function() {
		root.storeInStorage(cm);
	};
	cm.getFromStorage = function() {
		var valFromStorage = root.getFromStorage(cm);
		if (valFromStorage) cm.setValue(valFromStorage);
	};
	return cm;
};

var postProcessCmElement = function(cm) {
	if (cm.getOption("persistency") && cm.getOption("persistency").query) {
		cm.getFromStorage();
	}
	
	cm.on('blur',function(cm, eventInfo) {
		if (cm.getOption("persistency") && cm.getOption("persistency").query) {
			cm.store();
		}
	});
	cm.on('change', function(cm, eventInfo) {
		checkSyntax(cm, true);
		root.showHint(cm, root.prefixHint, {closeCharacters: /(?=a)b/});
		root.appendPrefixIfNeeded(cm);
	});
	checkSyntax(cm, true);//on first load, check as well (our stored or default query might be incorrect as well)
};
/**
 * helpers
 */
var fetchFromPrefixCc = function(callback) {
	$.get("http://prefix.cc/popular/all.file.json", function(data) {
		console.log(data);
	});
};
var checkSyntax = function(cm, deepcheck) {
	var queryValid = true,
		prevQueryValid = true,
		clearError = null;
	if (clearError) {
		clearError();
		clearError = null;
	}
	cm.clearGutter("gutterErrorBar");
	var state = null;
	for ( var l = 0; l < cm.lineCount(); ++l) {
		var precise = false;
		if (!prevQueryValid) {
			//we don't want cached information in this case, otherwise the previous error sign might still show up,
			//even though the syntax error might be gone already
			precise = true;
		}
		state = cm.getTokenAt({
			line : l,
			ch : cm.getLine(l).length
		}, precise).state;
		if (state.OK == false) {
			var error = document.createElement('span');
			error.innerHTML = "&rarr;";
			error.className = "gutterError";
			cm.setGutterMarker(l,"gutterErrorBar", error);
			clearError = function() {
				cm.markText({
					line : l,
					ch : state.errorStartPos
				}, {
					line : l,
					ch : state.errorEndPos
				}, "sp-error");
			};
			queryValid = false;
			break;
		}
	}
	prevQueryValid = queryValid;
	if (deepcheck) {
		if (state != null && state.stack != undefined) {
			var stack = state.stack, len = state.stack.length;
			// Because incremental parser doesn't receive end-of-input
			// it can't clear stack, so we have to check that whatever
			// is left on the stack is nillable
			if (len > 1)
				queryValid = false;
			else if (len == 1) {
				if (stack[0] != "solutionModifier" && stack[0] != "?limitOffsetClauses"
						&& stack[0] != "?offsetClause")
					queryValid = false;
			}
		}
	}
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the YASQE object
$.extend(root, CodeMirror);


root.determineId = function(cm) {
	return $(cm.getWrapperElement()).closest('[id]').attr('id');
};
root.storeInStorage = function(cm) {
	require("./storage.js").set("queryVal_" + root.determineId(cm), cm.getValue(), "year");
};
root.getFromStorage = function(cm) {
	return require("./storage.js").get("queryVal_" + root.determineId(cm));
};
// now add all the static functions
root.deleteLines = function(cm) {
	var startLine = cm.getCursor(true).line;
	var endLine = cm.getCursor(false).line;
	var min = Math.min(startLine, endLine);
	var max = Math.max(startLine, endLine);
	for (var i = min; i <= max; i++) {
		// Do not remove i, because line counter changes after deleting 1 line.
		// Therefore, keep on deleting the minimum of the selection
		cm.removeLine(min);
	}
	var cursor = cm.getCursor(true);
	if (cursor.line + 1 <= cm.lineCount()) {
		cursor.line++;
		cursor.ch = 0;
		cm.setCursor(cursor);
	}
};

root.commentLines = function(cm) {
	var startLine = cm.getCursor(true).line;
	var endLine = cm.getCursor(false).line;
	var min = Math.min(startLine, endLine);
	var max = Math.max(startLine, endLine);

	// if all lines start with #, remove this char. Otherwise add this char
	var linesAreCommented = true;
	for (var i = min; i <= max; i++) {
		var line = cm.getLine(i);
		if (line.length == 0 || line.substring(0, 1) != "#") {
			linesAreCommented = false;
			break;
		}
	}
	for (var i = min; i <= max; i++) {
		if (linesAreCommented) {
			// lines are commented, so remove comments
			cm.replaceRange("", {
				line : i,
				ch : 0
			}, {
				line : i,
				ch : 1
			});
		} else {
			// Not all lines are commented, so add comments
			cm.replaceRange("#", {
				line : i,
				ch : 0
			});
		}

	}
};

root.copyLineUp = function(cm) {
	var cursor = cm.getCursor();
	var lineCount = cm.lineCount();
	// First create new empty line at end of text
	cm.replaceRange("\n", {
		line : lineCount - 1,
		ch : cm.getLine(lineCount - 1).length
	});
	// Copy all lines to their next line
	for (var i = lineCount; i > cursor.line; i--) {
		var line = cm.getLine(i - 1);
		cm.replaceRange(line, {
			line : i,
			ch : 0
		}, {
			line : i,
			ch : cm.getLine(i).length
		});
	}
};
root.copyLineDown = function(cm) {
	root.copyLineUp(cm);
	// Make sure cursor goes one down (we are copying downwards)
	var cursor = cm.getCursor();
	cursor.line++;
	cm.setCursor(cursor);
};
root.doAutoFormat = function(cm) {
	if (cm.somethingSelected()) {
		var to = {
			line : cm.getCursor(false).line,
			ch : cm.getSelection().length
		};
		cm.autoFormatRange(cm.getCursor(true), to);
	} else {
		var totalLines = cm.lineCount();
		var totalChars = cm.getTextArea().value.length;
		cm.autoFormatRange({
			line : 0,
			ch : 0
		}, {
			line : totalLines,
			ch : totalChars
		});
	}

};
root.indentTab = function(cm) {
	var indentSpaces = Array(cm.getOption("indentUnit") + 1).join(" ");
	if (cm.somethingSelected()) {
		for (var i = cm.getCursor(true).line; i <= cm.getCursor(false).line; i++) {
			cm.replaceRange(indentSpaces, {
				line : i,
				ch : 0
			});
		}
	} else {
		cm.replaceSelection(indentSpaces, "end", "+input");
	}

};
root.unindentTab = function(cm) {
	
	for (var i = cm.getCursor(true).line; i <= cm.getCursor(false).line; i++) {
		var line = cm.getLine(i);
		var lineAfterCursor = null;
		if (!cm.somethingSelected()) {
			//use this info to make sure our cursor does not jump to end of line;
			lineAfterCursor = line.substring(cm.getCursor().ch);
		}
		
		var lineLength = line.length;
		if (/^\t/.test(line)) {
			line = line.replace(/^\t(.*)/, "$1");
		} else if (/^ /.test(line)) {
			var re = new RegExp("^ {1," + cm.getOption("indentUnit") + "}(.*)",
					"");
			line = line.replace(re, "$1");
		}
		var newCursor = null;
		if (lineAfterCursor) {
			newCursor = {line: i, ch: line.indexOf(lineAfterCursor)};
		}
		
		cm.replaceRange(line, {
			line : i,
			ch : 0
		}, {
			line : i,
			ch : lineLength
		});
		if (newCursor) cm.setCursor(newCursor);
	}

};

root.autoComplete = function(cm) {
	if (cm.somethingSelected()) {
		// do nothing
		
	} else {
		root.showHint(cm, CodeMirror.AutocompletionBase, {
			completeSingle : false,
			closeOnUnfocus : false,
			async : true,
			closeCharacters : /(?=a)b/
		});
	}
};
root.prefixHint = function(cm) {
	// Find the token at the cursor
	var cur = cm.getCursor(), token = cm.getTokenAt(cur);

	var includePreviousTokens = function(token, cur) {
		var prevToken = cm.getTokenAt({
			line : cur.line,
			ch : token.start
		});
		if (prevToken.className == "sp-punct"
				|| prevToken.className == "sp-keyword") {
			token.start = prevToken.start;
			cur.ch = prevToken.start;
			token.string = prevToken.string + token.string;
			return includePreviousTokens(token, cur);// recursively,
			// might have
			// multiple tokens
			// which it should
			// include
		} else {
			return token;
		}
	};

	// not at end of line
	if (cm.getLine(cur.line).length > cur.ch)
		return;

	if (token.className != "sp-ws") {
		// we want to complete token, e.g. when the prefix starts with an a
		// (treated as a token in itself..)
		// but we to avoid including the PREFIX tag. So when we have just
		// typed a space after the prefix tag, don't get the complete token
		token = getCompleteToken(cm);
	}
//	console.log(token);
	// we shouldnt be at the uri part the prefix declaration
	// also check whether current token isnt 'a' (that makes codemirror
	// thing a namespace is a possiblecurrent
	if (!token.string.indexOf("a") == 0 
			&& $.inArray("PNAME_NS", token.state.possibleCurrent) == -1)
		return;

	// First token of line needs to be PREFIX,
	// there should be no trailing text (otherwise, text is wrongly inserted
	// in between)
	var firstToken = getNextNonWsToken(cm, cur.line);
	if (firstToken == null || firstToken.string.toUpperCase() != "PREFIX")
		return;

	// If this is a whitespace, and token is just after PREFIX, proceed
	// using empty string as token
	if (/\s*/.test(token.string) && cm.getTokenAt({
		line : cur.line,
		ch : token.start
	}).string.toUpperCase() == "PREFIX") {
		token = {
			start : cur.ch,
			end : cur.ch,
			string : "",
			state : token.state
		};
	} else {
		// We know we are in a PREFIX line. Now check whether the string
		// starts with a punct or keyword
		// Good example is 'a', which is a valid punct in our grammar.
		// This is parsed as separate token which messes up the token for
		// autocompletion (the part after 'a' is used as separate token)
		// If previous token is in keywords or keywords, prepend this token
		// to current token
		token = includePreviousTokens(token, cur);
	}

	return {
		list : Yasgui.prefixes.complete(token.string),
		from : {
			line : cur.line,
			ch : token.start
		},
		to : {
			line : cur.line,
			ch : token.end
		}
	};
};

/**
 * Check whether typed prefix is declared. If not, automatically add declaration
 * using list from prefix.cc
 * 
 * @param cm
 */
root.appendPrefixIfNeeded = function(cm) {
	var cur = cm.getCursor();
	
	var token = cm.getTokenAt(cur);
	if (token.className == "sp-prefixed") {
		var colonIndex = token.string.indexOf(":");
		if (colonIndex !== -1) {
			// check first token isnt PREFIX, and previous token isnt a '<'
			// (i.e. we are in a uri)
			var firstTokenString = getNextNonWsToken(cm, cur.line).string
					.toUpperCase();
			var previousToken = cm.getTokenAt({
				line : cur.line,
				ch : token.start
			});// needs to be null (beginning of line), or whitespace
			if (firstTokenString != "PREFIX"
					&& (previousToken.className == "sp-ws" || previousToken.className == null)) {
				// check whether it isnt defined already (saves us from looping
				// through the array)
				var currentPrefix = token.string.substring(0, colonIndex + 1);
				var queryPrefixes = getPrefixesFromQuery(cm);
				if (queryPrefixes[currentPrefix] == null) {
					// ok, so it isnt added yet!
					var completions = Yasgui.prefixes.complete(currentPrefix);
					if (completions.length > 0) {
						appendToPrefixes(cm, completions[0]);
					}
				}
			}
		}
	}
};

root.defaults = $.extend(root.defaults, {
	mode : "sparql11",
	value : "SELECT * {?x ?y ?z} \nLIMIT 10",
	highlightSelectionMatches : {
		showToken : /\w/
	},
	tabMode : "indent",
	lineNumbers : true,
	gutters : [ "gutterErrorBar", "CodeMirror-linenumbers" ],
	matchBrackets : true,
	fixedGutter : true,
	extraKeys : {
		"Ctrl-Space" : "autoComplete",
		"Cmd-Space" : "autoComplete",
		"Ctrl-D" : root.deleteLines,
		"Ctrl-K" : root.deleteLine,
		"Cmd-D" : root.deleteLine,
		"Cmd-K" : root.deleteLine,
		"Ctrl-/" : root.commentLines,
		"Cmd-/" : root.commentLines,
		"Ctrl-Alt-Down" : root.copyLineDown,
		"Ctrl-Alt-Up" : root.copyLineUp,
		"Cmd-Alt-Down" : root.copyLineDown,
		"Cmd-Alt-Up" : root.copyLineUp,
		"Shift-Ctrl-F" : root.doAutoFormat,
		"Shift-Cmd-F" : root.doAutoFormat,
		"Tab" : root.indentTab,
		"Shift-Tab" : root.unindentTab
	},
	//non CodeMirror options
	persistency: {
		query: true,
		completions: {
			
		}
	},
});
root.version = {
	"CodeMirror": CodeMirror.version,
	"YASGUI-Query": require("../package.json").version
};

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 * 
 * @param cm
 * @returns {Array}
 */
var getPrefixesFromQuery = function(cm) {
	var queryPrefixes = {};
	var numLines = cm.lineCount();
	for (var i = 0; i < numLines; i++) {
		var firstToken = getNextNonWsToken(cm, i);
		if (firstToken != null && firstToken.string.toUpperCase() == "PREFIX") {
			var prefix = getNextNonWsToken(cm, i, firstToken.end + 1);
			var uri = getNextNonWsToken(cm, i, prefix.end + 1);
			if (prefix != null && prefix.string.length > 0 && uri != null
					&& uri.string.length > 0) {
				uriString = uri.string;
				if (uriString.indexOf("<") == 0 )
					uriString = uriString.substring(1);
				if (uriString.indexOf(">", this.length - suffix.length) !== -1)
					uriString = uriString.substring(0, uriString.length - 1);
				queryPrefixes[prefix.string] = uriString;
			}
		}
	}
	return queryPrefixes;
};

/**
 * Append prefix declaration to list of prefixes in query window.
 * 
 * @param cm
 * @param prefix
 */
var appendToPrefixes = function(cm, prefix) {
	var lastPrefix = null;
	var lastPrefixLine = 0;
	var numLines = cm.lineCount();
	for (var i = 0; i < numLines; i++) {
		var firstToken = getNextNonWsToken(cm, i);
		if (firstToken != null
				&& (firstToken.string == "PREFIX" || firstToken.string == "BASE")) {
			lastPrefix = firstToken;
			lastPrefixLine = i;
		}
	}

	if (lastPrefix == null) {
		cm.replaceRange("PREFIX " + prefix + "\n", {
			line : 0,
			ch : 0
		});
	} else {
		var previousIndent = getIndentFromLine(cm, lastPrefixLine);
		cm.replaceRange("\n" + previousIndent + "PREFIX " + prefix, {
			line : lastPrefixLine
		});
	}
};

/**
 * Get the used indentation for a certain line
 * 
 * @param cm
 * @param line
 * @param charNumber
 * @returns
 */
var getIndentFromLine = function(cm, line, charNumber) {
	if (charNumber == undefined)
		charNumber = 1;
	var token = cm.getTokenAt({
		line : line,
		ch : charNumber
	});
	if (token == null || token == undefined || token.className != "sp-ws") {
		return "";
	} else {
		return token.string + getIndentFromLine(cm, line, token.end + 1);
	}
	;
};

var getCompleteToken = function(editor, token, cur) {
	if (cur == null) {
		cur = editor.getCursor();
	}
	if (token == null) {
		token = editor.getTokenAt(cur);
	}
	// we cannot use token.string alone (e.g. http://bla results in 2
	// tokens: http: and //bla)

	var prevToken = editor.getTokenAt({
		line : cur.line,
		ch : token.start
	});
	if (prevToken.className != null && prevToken.className != "sp-ws") {
		token.start = prevToken.start;
		token.string = prevToken.string + token.string;
		return getCompleteToken(editor, token, {
			line : cur.line,
			ch : prevToken.start
		});// recursively, might have multiple tokens which it should
		// include
	} else {
		return token;
	}
};

var getNextNonWsToken = function(cm, lineNumber, charNumber) {
	if (charNumber == undefined)
		charNumber = 1;
	var token = cm.getTokenAt({
		line : lineNumber,
		ch : charNumber
	});
	if (token == null || token == undefined || token.end < charNumber) {
		return null;
	}
	if (token.className == "sp-ws") {
		return getNextNonWsToken(cm, lineNumber, token.end + 1);
	}
	return token;
};

