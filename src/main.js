'use strict';
var $ = require("jquery");
var CodeMirror = require("codemirror");

require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');

console = console || {"log":function(){}};//make sure any console statements

require('../lib/flint.js');
var Trie = require('../lib/trie.js');

/**
 * Main YASQE constructor
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASQE
 * @return {doc} YASQE document
 */
var root = module.exports = function(parent, config) {
	config = extendConfig(config);
	var cm = extendCmInstance(CodeMirror(parent, config));
	postProcessCmElement(cm);
	return cm;
};

/**
 * Extend config object, which we will pass on to the CM constructor later on.
 * Need this, to make sure our own 'onBlur' etc events do not get overwritten by
 * people who add their own onblur events to the config Additionally, need this
 * to include the CM defaults ourselves. CodeMirror has a method for including
 * defaults, but we can't rely on that one: it assumes flat config object, where
 * we have nested objects (e.g. the persistency option)
 * 
 * @private
 */
var extendConfig = function(config) {
	var extendedConfig = $.extend(true, {}, root.defaults, config);
	// I know, codemirror deals with  default options as well. 
	//However, it does not do this recursively (i.e. the persistency option)
	return extendedConfig;
};
/**
 * Add extra functions to the CM document (i.e. the codemirror instantiated
 * object)
 * 
 * @private
 */
var extendCmInstance = function(cm) {
	/**
	 * Execute query. Pass a callback function, or a configuration object (see
	 * default settings below for possible values) I.e., you can change the
	 * query configuration by either changing the default settings, changing the
	 * settings of this document, or by passing query settings to this function
	 * 
	 * @method doc.query
	 * @param function|object
	 */
	cm.query = function(callbackOrConfig) {
		root.executeQuery(cm, callbackOrConfig);
	};

	/**
	 * Store bulk completions in memory as trie, and store these in localstorage as well (if enabled)
	 * 
	 * @method doc.storeBulkCompletions
	 * @param type {"prefixes", "properties", "classes"}
	 * @param completions {array}
	 */
	cm.storeBulkCompletions = function(type, completions) {
		// store array as trie
		tries[type] = new Trie();
		for (var i = 0; i < completions.length; i++) {
			tries[type].insert(completions[i]);
		}
		// store in localstorage as well
		var storageId = getPersistencyId(cm,
				cm.options.autocompletions[type].persistent);
		if (storageId)
			require("./storage.js").set(storageId, completions, "month");
	};
	return cm;
};

var postProcessCmElement = function(cm) {
	
	/**
	 * Set doc value
	 */
	var storageId = getPersistencyId(cm, cm.options.persistent);
	if (storageId) {
		var valueFromStorage = require("./storage.js").get(storageId);
		if (valueFromStorage)
			cm.setValue(valueFromStorage);
	}
	
	if (cm.options.showQueryButton) root.drawQueryButton(cm);

	/**
	 * Add event handlers
	 */
	cm.on('blur', function(cm, eventInfo) {
		root.storeQuery(cm);
	});
	cm.on('change', function(cm, eventInfo) {
		checkSyntax(cm, true);
		root.autoComplete(cm, true);
		root.appendPrefixIfNeeded(cm);

	});

	checkSyntax(cm, true);// on first load, check as well (our stored or default query might be incorrect as well)

	/**
	 * load bulk completions
	 */
	if (cm.options.autocompletions) {
		for ( var completionType in cm.options.autocompletions) {
			if (cm.options.autocompletions[completionType].bulk) {
				loadBulkCompletions(cm, completionType);
			}
		}
	}
};

/**
 * privates
 */
// used to store bulk autocompletions in
var tries = {};
// this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
	"string-2" : "prefixed",
};
var keyExists = function(objectToTest, key) {
	var exists = false;

	try {
		if (objectToTest[key] !== undefined)
			exists = true;
	} catch (e) {
	}
	return exists;
};


var loadBulkCompletions = function(cm, type) {
	var completions = null;
	if (keyExists(cm.options.autocompletions[type], "get"))
		completions = cm.options.autocompletions[type].get;
	if (completions instanceof Array) {
		// we don't care whether the completions are already stored in
		// localstorage. just use this one
		cm.storeBulkCompletions(type, completions);
	} else {
		// if completions are defined in localstorage, use those! (calling the
		// function may come with overhead (e.g. async calls))
		var completionsFromStorage = null;
		if (getPersistencyId(cm, cm.options.autocompletions[type].persistent))
			completionsFromStorage = require("./storage.js").get(
					getPersistencyId(cm,
							cm.options.autocompletions[type].persistent));
		if (completionsFromStorage && completionsFromStorage instanceof Array
				&& completionsFromStorage.length > 0) {
			cm.storeBulkCompletions(type, completionsFromStorage);
		} else {
			// nothing in storage. check whether we have a function via which we
			// can get our prefixes
			if (completions instanceof Function) {
				var functionResult = completions(cm);
				if (functionResult && functionResult instanceof Array
						&& functionResult.length > 0) {
					// function returned an array (if this an async function, we
					// won't get a direct function result)
					cm.storeBulkCompletions(type, functionResult);
				}
			}
		}
	}
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
			if (prefix) {
				var uri = getNextNonWsToken(cm, i, prefix.end + 1);
				if (prefix != null && prefix.string.length > 0 && uri != null
						&& uri.string.length > 0) {
					var uriString = uri.string;
					if (uriString.indexOf("<") == 0)
						uriString = uriString.substring(1);
					if (uriString.slice(-1) == ">")
						uriString = uriString
								.substring(0, uriString.length - 1);
					queryPrefixes[prefix.string] = uriString;
				}
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
	if (token == null || token == undefined || token.type != "ws") {
		return "";
	} else {
		return token.string + getIndentFromLine(cm, line, token.end + 1);
	}
	;
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
	if (token.type == "ws") {
		return getNextNonWsToken(cm, lineNumber, token.end + 1);
	}
	return token;
};

var prevQueryValid = false;
var clearError = null;
var checkSyntax = function(cm, deepcheck) {
	var queryValid = true;

	if (clearError) {
		clearError();
		clearError = null;
	}
	cm.clearGutter("gutterErrorBar");
	var state = null;
	for (var l = 0; l < cm.lineCount(); ++l) {
		var precise = false;
		if (!prevQueryValid) {
			// we don't want cached information in this case, otherwise the
			// previous error sign might still show up,
			// even though the syntax error might be gone already
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
			cm.setGutterMarker(l, "gutterErrorBar", error);
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
				if (stack[0] != "solutionModifier"
						&& stack[0] != "?limitOffsetClauses"
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

/**
 * Draw query button
 * 
 * @method YASQE.drawQueryButton
 * @param {doc} YASQE document
 */
root.drawQueryButton = function(cm) {
	var height = 40;
	var width = 40;
	var svgString = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="' + width + 'px" height="' + height + 'px" viewBox="0 0 80 80" enable-background="new 0 0 80 80" xml:space="preserve"><g id="Layer_1"></g><g id="Layer_2">	<path d="M64.622,2.411H14.995c-6.627,0-12,5.373-12,12v49.897c0,6.627,5.373,12,12,12h49.627c6.627,0,12-5.373,12-12V14.411   C76.622,7.783,71.249,2.411,64.622,2.411z M24.125,63.906V15.093L61,39.168L24.125,63.906z"/></g></svg>';
	var queryButton = $("<div class='yasqe_queryButton'></div>")
	 	.click(function(){
	 		cm.query();
	 	})
	 	.height(height)
	 	.width(width)
	 	.appendTo($(cm.getWrapperElement())).get()[0];
	 var parser = new DOMParser();
	 var dom = parser.parseFromString(svgString, "text/xml");
	 queryButton.appendChild(dom.documentElement);
	 
	 //set the min height in such a way, that we don't lose the query button. takes care of position offset as well
	 $(cm.getWrapperElement()).css("min-height", height + 5);
};
/**
 * Initialize YASQE from an existing text area (see http://codemirror.net/doc/manual.html#fromTextArea for more info)
 * 
 * @method YASQE.fromTextArea
 * @param textArea {DOM element}
 * @param config {object}
 * @returns {doc} YASQE document
 */
root.fromTextArea = function(textAreaEl, config) {
	config = extendConfig(config);
	var cm = extendCmInstance(CodeMirror.fromTextArea(textAreaEl, config));
	postProcessCmElement(cm);
	return cm;
};

/**
 * Fetch prefixes from prefix.cc, and store in the YASQE object
 * 
 * @param doc {YASQE}
 * @method YASQE.fetchFromPrefixCc
 */
root.fetchFromPrefixCc = function(cm) {
	$.get("http://prefix.cc/popular/all.file.json", function(data) {
		var prefixArray = [];
		for ( var prefix in data) {
			if (prefix == "bif")
				continue;// skip this one! see #231
			var completeString = prefix + ": <" + data[prefix] + ">";
			prefixArray.push(completeString);// the array we want to store in
												// localstorage
		}
		cm.storeBulkCompletions("prefixes", prefixArray);
	});
};

/**
 * Determine unique ID of the YASQE object. Useful when several objects are
 * loaded on the same page, and all have 'persistency' enabled. Currently, the
 * ID is determined by selecting the nearest parent in the DOM with an ID set
 * 
 * @param doc {YASQE}
 * @method YASQE.determineId
 */
root.determineId = function(cm) {
	return $(cm.getWrapperElement()).closest('[id]').attr('id');
};

root.storeQuery = function(cm) {
	var storageId = getPersistencyId(cm, cm.options.persistent);
	if (storageId) {
		require("./storage.js").set(storageId, cm.getValue(), "month");
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
		autoFormatRange(cm, cm.getCursor(true), to);
	} else {
		var totalLines = cm.lineCount();
		var totalChars = cm.getTextArea().value.length;
		autoFormatRange(cm, {
			line : 0,
			ch : 0
		}, {
			line : totalLines,
			ch : totalChars
		});
	}

};

root.executeQuery = function(cm, callbackOrConfig) {
	var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig
			: null);
	var config = (typeof callbackOrConfig == "object" ? callbackOrConfig : {});
	if (cm.options.query)
		config = $.extend({}, cm.options.query, config);

	if (!config.endpoint || config.endpoint.length == 0)
		return;// nothing to query!

	/**
	 * initialize ajax config
	 */
	var ajaxConfig = {
		url : config.endpoint,
		type : config.requestMethod,
		data : [ {
			name : "query",
			value : cm.getValue()
		} ],
		headers : {
			Accept : config.acceptHeader
		}
	};

	/**
	 * add complete, beforesend, etc handlers (if specified)
	 */
	var handlerDefined = false;
	if (config.handlers) {
		for ( var handler in config.handlers) {
			if (config.handlers[handler]) {
				handlerDefined = true;
				ajaxConfig[handler] = config.handlers[handler];
			}
		}
	}
	if (!handlerDefined && !callback)
		return; // ok, we can query, but have no callbacks. just stop now
	// if only callback is passed as arg, add that on as 'onComplete' callback
	if (callback)
		ajaxConfig.complete = callback;

	/**
	 * add named graphs to ajax config
	 */
	if (config.namedGraphs && config.namedGraphs.length > 0) {
		for (var i = 0; i < config.namedGraphs.length; i++)
			ajaxConfig.data.push({
				name : "named-graph-uri",
				value : config.namedGraphs[i]
			});
	}
	/**
	 * add default graphs to ajax config
	 */
	if (config.defaultGraphs && config.defaultGraphs.length > 0) {
		for (var i = 0; i < config.defaultGraphs.length; i++)
			ajaxConfig.data.push({
				name : "default-graph-uri",
				value : config.defaultGraphs[i]
			});
	}

	/**
	 * merge additional request headers
	 */
	if (config.headers && !$.isEmptyObject(config.headers))
		$.extend(ajaxConfig.headers, config.headers);
	/**
	 * add additional request args
	 */
	if (config.args && config.args.length > 0)
		$.merge(ajaxConfig.data, config.args);
	$.ajax(ajaxConfig);
};

var validCompletionPosition = {
	properties : function(cm) {
		var token = getCompleteToken(cm);

		if (token.type == "var")
			return false; // we are typing a var
		if ($.inArray("a", token.state.possibleCurrent) >= 0)
			return true;// predicate pos
		var cur = cm.getCursor();
		var previousToken = getPreviousNonWsToken(cm, cur.line, token);
		if (previousToken.string == "rdfs:subPropertyOf")
			return true;

		// hmm, we would like -better- checks here, e.g. checking whether we are
		// in a subject, and whether next item is a rdfs:subpropertyof.
		// difficult though... the grammar we use is unreliable when the query
		// is invalid (i.e. during typing), and often the predicate is not typed
		// yet, when we are busy writing the subject...
		return false;
	},
	classes : function(cm) {
		var token = getCompleteToken(cm);
		if (token.type == "var")
			return false;
		var cur = cm.getCursor();
		var previousToken = getPreviousNonWsToken(cm, cur.line, token);
		if (previousToken.string == "a")
			return true;
		if (previousToken.string == "rdf:type")
			return true;
		if (previousToken.string == "rdfs:domain")
			return true;
		if (previousToken.string == "rdfs:range")
			return true;
		return false;
	},
	prefixes : function(cm) {
		var cur = cm.getCursor(), token = cm.getTokenAt(cur);

		// not at end of line
		if (cm.getLine(cur.line).length > cur.ch)
			return false;

		if (token.type != "ws") {
			// we want to complete token, e.g. when the prefix starts with an a
			// (treated as a token in itself..)
			// but we to avoid including the PREFIX tag. So when we have just
			// typed a space after the prefix tag, don't get the complete token
			token = getCompleteToken(cm);
		}

		// we shouldnt be at the uri part the prefix declaration
		// also check whether current token isnt 'a' (that makes codemirror
		// thing a namespace is a possiblecurrent
		if (!token.string.indexOf("a") == 0
				&& $.inArray("PNAME_NS", token.state.possibleCurrent) == -1)
			return false;

		// First token of line needs to be PREFIX,
		// there should be no trailing text (otherwise, text is wrongly inserted
		// in between)
		var firstToken = getNextNonWsToken(cm, cur.line);
		if (firstToken == null || firstToken.string.toUpperCase() != "PREFIX")
			return false;
		return true;
	}
};

root.autoComplete = function(cm, fromAutoShow) {
	if (cm.somethingSelected())
		return;
	if (!cm.options.autocompletions)
		return;
	var tryHintType = function(type) {
		if (fromAutoShow // from autoShow, i.e. this gets called each time
							// the editor content changes
				&& (!cm.options.autocompletions[type].autoShow // autoshow for  this particular type of autocompletion is -not- enabled
				|| cm.options.autocompletions[type].async) // async is enabled (don't want to re-do ajax-like request for every editor change)
		) {
			return false;
		}

		var hintConfig = {
			closeCharacters : /(?=a)b/,
			type : type,
			completeSingle: false
		};
		if (cm.options.autocompletions[type].async) {
			hintConfig.async = true;
		}
		var result = root.showHint(cm, getHints[type], hintConfig);
		return true;
		return false;
	};
	for ( var type in cm.options.autocompletions) {
		if (!validCompletionPosition[type](cm))
			continue;

		// run valid position handler, if there is one (if it returns false,
		// stop the autocompletion!)
		if (cm.options.autocompletions[type].handlers
				&& cm.options.autocompletions[type].handlers.validPosition) {
			if (cm.options.autocompletions[type].handlers.validPosition(cm) === false)
				continue;
		}

		var success = tryHintType(type);
		if (success)
			break;
	}
};

/**
 * Check whether typed prefix is declared. If not, automatically add declaration
 * using list from prefix.cc
 * 
 * @param cm
 */
root.appendPrefixIfNeeded = function(cm) {
	if (!tries["prefixes"])
		return;// no prefixed defined. just stop
	var cur = cm.getCursor();

	var token = cm.getTokenAt(cur);
	if (tokenTypes[token.type] == "prefixed") {
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
					&& (previousToken.type == "ws" || previousToken.type == null)) {
				// check whether it isnt defined already (saves us from looping
				// through the array)
				var currentPrefix = token.string.substring(0, colonIndex + 1);
				var queryPrefixes = getPrefixesFromQuery(cm);
				if (queryPrefixes[currentPrefix] == null) {
					// ok, so it isnt added yet!
					var completions = tries["prefixes"]
							.autoComplete(currentPrefix);
					if (completions.length > 0) {
						appendToPrefixes(cm, completions[0]);
					}
				}
			}
		}
	}
};

/**
 * When typing a query, this query is sometimes syntactically invalid, causing
 * the current tokens to be incorrect This causes problem for autocompletion.
 * http://bla might result in two tokens: http:// and bla. We'll want to combine
 * these
 */
var getCompleteToken = function(cm, token, cur) {
	if (!cur) {
		cur = cm.getCursor();
	}
	if (!token) {
		token = cm.getTokenAt(cur);
	}
	var prevToken = cm.getTokenAt({
		line : cur.line,
		ch : token.start
	});
	// not start of line, and not whitespace
	if (prevToken.type != null && prevToken.type != "ws") {
		token.start = prevToken.start;
		token.string = prevToken.string + token.string;
		return getCompleteToken(cm, token, {
			line : cur.line,
			ch : prevToken.start
		});// recursively, might have multiple tokens which it should
		// include
	} else {
		return token;
	}
};
function getPreviousNonWsToken(cm, line, token) {
	var previousToken = cm.getTokenAt({
		line : line,
		ch : token.start
	});
	if (previousToken != null && previousToken.type == "ws") {
		previousToken = getPreviousNonWsToken(cm, line, previousToken);
	}
	return previousToken;
}

var preprocessCompletionToken = function(cm, token) {
	var completionToken = null;
	if (token.string.indexOf(":") > -1 || token.string.indexOf("<") == 0) {
		completionToken = {};
		token = getCompleteToken(cm, token);
		var queryPrefixes = getPrefixesFromQuery(cm);
		if (!token.string.indexOf("<") == 0) {
			completionToken.tokenPrefix = token.string.substring(0,
					token.string.indexOf(":") + 1);

			if (queryPrefixes[completionToken.tokenPrefix] != null) {
				completionToken.tokenPrefixUri = queryPrefixes[completionToken.tokenPrefix];
			}
		}

		completionToken.uri = token.string;
		if (!token.string.indexOf("<") == 0 && token.string.indexOf(":") > -1) {
			// hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
			for ( var prefix in queryPrefixes) {
				if (queryPrefixes.hasOwnProperty(prefix)) {
					if (token.string.indexOf(prefix) == 0) {
						completionToken.uri = queryPrefixes[prefix];
						completionToken.uri += token.string.substring(prefix.length);
						break;
					}
				}
			}
		}

		if (completionToken.uri.indexOf("<") == 0)	completionToken.uri = completionToken.uri.substring(1);
		if (completionToken.uri.indexOf(">", completionToken.length - 1) !== -1) completionToken.uri = completionToken.uri.substring(0,	completionToken.uri.length - 1);
	}
	return completionToken;
};

var getSuggestionsFromToken = function(cm, type, partialToken) {

	var suggestions = [];
	if (tries[type]) {
		suggestions = tries[type].autoComplete(partialToken);
	} else if (typeof cm.options.autocompletions[type].get == "function" && cm.options.autocompletions[type].async == false) {
		suggestions = cm.options.autocompletions[type].get(cm, partialToken, type);
	} else if (typeof cm.options.autocompletions[type].get == "object") {
		var partialTokenLength = partialToken.length;
		for (var i = 0; i < cm.options.autocompletions[type].get.length; i++) {
			var completion = cm.options.autocompletions[type].get[i];
			if (completion.slice(0, partialTokenLength) == partialToken) {
				suggestions.push(completion);
			}
		}
	}
	return suggestions;
};

/**
 * Fetch property and class autocompletions the Linked Open Vocabulary services. Issues an async autocompletion call
 * 
 * @param doc {YASQE}
 * @param partialToken {string}
 * @param type {"properties" | "classes"}
 * @param callback {function} 
 * 
 * @method YASQE.fetchFromLov
 */
root.fetchFromLov = function(cm, partialToken, type, callback) {
	var maxResults = 50;

	var args = {
		q : partialToken,
		page : 1
	};
	if (type == "classes") {
		args.type = "class";
	} else {
		args.type = "property";
	}
	var results = [];
	var url = "";
	var updateUrl = function() {
		url = "http://lov.okfn.org/dataset/lov/api/v2/autocomplete/terms?"
				+ $.param(args);
	};
	updateUrl();
	var increasePage = function() {
		args.page++;
		updateUrl();
	};
	var doRequests = function() {
		$.get(
				url,
				function(data) {
					for (var i = 0; i < data.results.length; i++) {
						results.push(data.results[i].uri);
					}
					if (results.length < data.total_results
							&& results.length < maxResults) {
						increasePage();
						doRequests();
					} else {
						callback(results);
						// requests done! Don't call this function again
					}
				}).fail(function(jqXHR, textStatus, errorThrown) {
			console.log(errorThrown);
		});
	};
	doRequests();
};
var selectHint = function(cm, data, completion) {
	if (completion.text != cm.getTokenAt(cm.getCursor()).string) {
		cm.replaceRange(completion.text, data.from, data.to);
	}
};
var getHints = {};
getHints.resourceHints = function(cm, type, callback) {
	var getSuggestionsAsHintObject = function(suggestions) {
		var hintList = [];
		for (var i = 0; i < suggestions.length; i++) {
			var suggestedString = suggestions[i];
			if (completionToken.tokenPrefix != null
					&& completionToken.uri != null) {
				// we need to get the suggested string back to prefixed form
				suggestedString = suggestedString
						.substring(completionToken.tokenPrefixUri.length);
				suggestedString = completionToken.tokenPrefix + suggestedString;
			} else {
				// it is a regular uri. add '<' and '>' to string
				suggestedString = "<" + suggestedString + ">";
			}
			hintList.push({
				text : suggestedString,
				displayText : suggestedString,
				hint : selectHint,
				className : type + "Hint"
			});
		}
		var returnObj = {
			completionToken : completionToken.uri,
			list : hintList,
			from : {
				line : cur.line,
				ch : token.start
			},
			to : {
				line : cur.line,
				ch : token.end
			}
		};
		if (cm.options.autocompletions[type].handlers) {
			for (var handler in cm.options.autocompletions[type].handlers) {
				if (cm.options.autocompletions[type].handlers[handler])
					root.on(returnObj, handler, cm.options.autocompletions[type].handlers[handler]);
			}
		}
		return returnObj;
	};
	var token = getCompleteToken(cm);
	var cur = cm.getCursor();
	var completionToken = preprocessCompletionToken(cm, token);
	if (completionToken) {
		// use custom completionhint function, to avoid reaching a loop when the
		// completionhint is the same as the current token
		// regular behaviour would keep changing the codemirror dom, hence
		// constantly calling this callback
		
		if (cm.options.autocompletions[type].async) {
			var wrappedCallback = function(suggestions) {
				callback(getSuggestionsAsHintObject(suggestions));
			};
			cm.options.autocompletions[type].get(cm, completionToken.uri, type, wrappedCallback);
		} else {
			return getSuggestionsAsHintObject(getSuggestionsFromToken(cm, type,	completionToken.uri));

		}
	}
};
getHints.properties = function(cm, callback) {
	return getHints.resourceHints(cm, "properties", callback);
};
getHints.classes = function(cm, callback, config) {
	return getHints.resourceHints(cm, "classes", callback);
};
getHints.prefixes = function(cm, callback) {
	var type = "prefixes";
	var token = getCompleteToken(cm);
	var cur = cm.getCursor();
	var preprocessPrefixCompletion = function() {
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
			token = getCompleteToken(cm, token, cur);
		}
	};
	var getSuggestionsAsHintObject = function(suggestions) {
		var returnObj = {
			completionToken : token.uri,
			list : suggestions,
			from : {
				line : cur.line,
				ch : token.start
			},
			to : {
				line : cur.line,
				ch : token.end
			}
		};
		if (cm.options.autocompletions[type].handlers) {
			for ( var handler in cm.options.autocompletions[type].handlers) {
				if (cm.options.autocompletions[type].handlers[handler]) 
					root.on(returnObj, handler, cm.options.autocompletions[type].handlers[handler]);
			}
		}
		return returnObj;
	};
	preprocessPrefixCompletion();
	if (token) {
		if (cm.options.autocompletions[type].async) {
			var wrappedCallback = function(suggestions) {
				callback(getSuggestionsAsHintObject(suggestions));
			};
			cm.options.autocompletions[type].get(cm, token.uri, type, wrappedCallback);
		} else {
			return getSuggestionsAsHintObject(getSuggestionsFromToken(cm, type,	token.string));

		}
	}
};

var getPersistencyId = function(cm, persistentIdCreator) {
	var persistencyId = null;

	if (persistentIdCreator) {
		if (typeof persistentIdCreator == "string") {
			persistencyId = persistentIdCreator;
		} else {
			persistencyId = persistentIdCreator(cm);
		}
	}
	return persistencyId;
};

var autoFormatRange = function(cm, from, to) {
	var absStart = cm.indexFromPos(from);
	var absEnd = cm.indexFromPos(to);
	// Insert additional line breaks where necessary according to the
	// mode's syntax
	var res = autoFormatLineBreaks(cm.getValue(), absStart, absEnd);

	// Replace and auto-indent the range
	cm.operation(function() {
		cm.replaceRange(res, from, to);
		var startLine = cm.posFromIndex(absStart).line;
		var endLine = cm.posFromIndex(absStart + res.length).line;
		for (var i = startLine; i <= endLine; i++) {
			cm.indentLine(i, "smart");
		}
	});
};

var autoFormatLineBreaks = function(text, start, end) {
	text = text.substring(start, end);
	var breakAfterArray = [ [ "keyword", "ws", "prefixed", "ws", "uri" ], // i.e. prefix declaration
	[ "keyword", "ws", "uri" ] // i.e. base
	];
	var breakAfterCharacters = [ "{", ".", ";" ];
	var breakBeforeCharacters = [ "}" ];
	var getBreakType = function(stringVal, type) {
		for (var i = 0; i < breakAfterArray.length; i++) {
			if (stackTrace.valueOf().toString() == breakAfterArray[i].valueOf()
					.toString()) {
				return 1;
			}
		}
		for (var i = 0; i < breakAfterCharacters.length; i++) {
			if (stringVal == breakAfterCharacters[i]) {
				return 1;
			}
		}
		for (var i = 0; i < breakBeforeCharacters.length; i++) {
			// don't want to issue 'breakbefore' AND 'breakafter', so check
			// current line
			if ($.trim(currentLine) != ''
					&& stringVal == breakBeforeCharacters[i]) {
				return -1;
			}
		}
		return 0;
	};
	var formattedQuery = "";
	var currentLine = "";
	var stackTrace = [];
	CodeMirror.runMode(text, "sparql11", function(stringVal, type) {
		stackTrace.push(type);
		var breakType = getBreakType(stringVal, type);
		if (breakType != 0) {
			if (breakType == 1) {
				formattedQuery += stringVal + "\n";
				currentLine = "";
			} else {// (-1)
				formattedQuery += "\n" + stringVal;
				currentLine = stringVal;
			}
			stackTrace = [];
		} else {
			currentLine += stringVal;
			formattedQuery += stringVal;
		}
		if (stackTrace.length == 1 && stackTrace[0] == "sp-ws")
			stackTrace = [];
	});
	return $.trim(formattedQuery.replace(/\n\s*\n/g, '\n'));
};

/**
 * The default options of YASQE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting YASQE.defaults, or by
 * passing your own options as second argument to the YASQE constructor
 * 
 * @attribute
 * @attribute YASQE.defaults
 */
root.defaults = $.extend(root.defaults, {
	mode : "sparql11",
	/**
	 * Query string
	 * 
	 * @property value
	 * @type String
	 * @default "SELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10"
	 */
	value : "SELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10",
	highlightSelectionMatches : {
		showToken : /\w/
	},
	tabMode : "indent",
	lineNumbers : true,
	gutters : [ "gutterErrorBar", "CodeMirror-linenumbers" ],
	matchBrackets : true,
	fixedGutter : true,

	/**
	 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
	 * 
	 * @property extraKeys
	 * @type object
	 */
	extraKeys : {
		"Ctrl-Space" : root.autoComplete,
		"Cmd-Space" : root.autoComplete,
		"Ctrl-D" : root.deleteLine,
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
		"Ctrl-]" : root.indentMore,
		"Cmd-]" : root.indentMore,
		"Ctrl-[" : root.indentLess,
		"Cmd-[" : root.indentLess,
		"Ctrl-S" : root.storeQuery,
		"Cmd-S" : root.storeQuery,
		"Ctrl-Enter" : root.executeQuery,
		"Cmd-Enter" : root.executeQuery
	},
	cursorHeight : 0.9,

	// non CodeMirror options
	/**
	 * Show a query button. You don't like it? Then disable this setting, and create your button which calls the query() function of the yasqe document
	 * 
	 * @property showQueryButton
	 * @type boolean
	 * @default false
	 */
	showQueryButton: false,
	
	/**
	 * Change persistency settings for the YASQE query value. Setting the values
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated using the determineID
	 * function, to avoid collissions when using multiple YASQE items on one
	 * page
	 * 
	 * @property persistent
	 * @type function|string
	 */
	persistent : function(cm) {
		return "queryVal_" + root.determineId(cm);
	},

	/**
	 * Types of completions. Setting the value to null, will disable
	 * autocompletion for this particular type. By default, only prefix
	 * autocompletions are fetched from prefix.cc, and property and class
	 * autocompletions are fetched from the Linked Open Vocabularies API
	 * 
	 * @property autocompletions
	 * @type object
	 */
	autocompletions : {
		/**
		 * Prefix autocompletion settings
		 * 
		 * @property autocompletions.prefixes
		 * @type object
		 */
		prefixes : {
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["rdf: <http://....>"]
			 * 
			 * @property autocompletions.prefixes.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param partialToken {string} When bulk is disabled, use this partialtoken to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromPrefixCc)
			 */
			get : root.getFromPrefixCc,
			/**
			 * The get function is asynchronous
			 * 
			 * @property autocompletions.prefixes.async
			 * @type boolean
			 * @default false
			 */
			async : false,
			/**
			 * Use bulk loading of prefixes: all prefixes are retrieved onLoad
			 * using the get() function. Alternatively, disable bulk loading, to
			 * call the get() function whenever a token needs autocompletion (in
			 * this case, the completion token is passed on to the get()
			 * function) Whenever you have an autocompletion list that easily
			 * fits in memory, we advice you to enable bulk for performance
			 * reasons (especially as we store the autocompletions in a trie)
			 * 
			 * @property autocompletions.prefixes.bulk
			 * @type boolean
			 * @default true
			 */
			bulk : true,
			/**
			 * Auto-show the autocompletion dialog. Disabling this requires the
			 * user to press [ctrl|cmd]-space to summon the dialog. Note: this
			 * only works when completions are loaded in memory (i.e. bulk:
			 * true)
			 * 
			 * @property autocompletions.prefixes.autoShow
			 * @type boolean
			 * @default true
			 */
			autoShow : true,
			/**
			 * Auto-add prefix declaration: when prefixes are loaded in memory
			 * (bulk: true), and the user types e.g. 'rdf:' in a triple pattern,
			 * the editor automatically add this particular PREFIX definition to
			 * the query
			 * 
			 * @property autocompletions.prefixes.autoAddDeclaration
			 * @type boolean
			 * @default true
			 */
			autoAddDeclaration : true,
			/**
			 * Automatically store autocompletions in localstorage. This is
			 * particularly useful when the get() function is an expensive ajax
			 * call. Autocompletions are stored for a period of a month. Set
			 * this property to null (or remove it), to disable the use of
			 * localstorage. Otherwise, set a string value (or a function
			 * returning a string val), returning the key in which to store the
			 * data Note: this feature only works combined with completions
			 * loaded in memory (i.e. bulk: true)
			 * 
			 * @property autocompletions.prefixes.persistent
			 * @type string|function
			 * @default "prefixes"
			 */
			persistent : "prefixes",
			/**
			 * A set of handlers. Most, taken from the CodeMirror showhint
			 * plugin: http://codemirror.net/doc/manual.html#addon_show-hint
			 * 
			 * @property autocompletions.prefixes.handlers
			 * @type object
			 */
			handlers : {
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can show this particular type of autocompletion
				 * 
				 * @property autocompletions.classes.handlers.validPosition
				 * @type function
				 * @default null
				 */
				validPosition : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.showHint
				 * @type function
				 * @default null
				 */
				showHint : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.shown
				 * @type function
				 * @default null
				 */
				shown : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.select
				 * @type function
				 * @default null
				 */
				select : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.pick
				 * @type function
				 * @default null
				 */
				pick : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.close
				 * @type function
				 * @default null
				 */
				close : null,
			}
		},
		/**
		 * Property autocompletion settings
		 * 
		 * @property autocompletions.properties
		 * @type object
		 */
		properties : {
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["http://...",....]
			 * 
			 * @property autocompletions.properties.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param partialToken {string} When bulk is disabled, use this partialtoken to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromLov)
			 */
			get : root.fetchFromLov,
			/**
			 * The get function is asynchronous
			 * 
			 * @property autocompletions.properties.async
			 * @type boolean
			 * @default true
			 */
			async : true,
			/**
			 * Use bulk loading of properties: all properties are retrieved
			 * onLoad using the get() function. Alternatively, disable bulk
			 * loading, to call the get() function whenever a token needs
			 * autocompletion (in this case, the completion token is passed on
			 * to the get() function) Whenever you have an autocompletion list
			 * that easily fits in memory, we advice you to enable bulk for
			 * performance reasons (especially as we store the autocompletions
			 * in a trie)
			 * 
			 * @property autocompletions.properties.bulk
			 * @type boolean
			 * @default false
			 */
			bulk : false,
			/**
			 * Auto-show the autocompletion dialog. Disabling this requires the
			 * user to press [ctrl|cmd]-space to summon the dialog. Note: this
			 * only works when completions are loaded in memory (i.e. bulk:
			 * true)
			 * 
			 * @property autocompletions.properties.autoShow
			 * @type boolean
			 * @default false
			 */
			autoShow : false,
			/**
			 * Automatically store autocompletions in localstorage. This is
			 * particularly useful when the get() function is an expensive ajax
			 * call. Autocompletions are stored for a period of a month. Set
			 * this property to null (or remove it), to disable the use of
			 * localstorage. Otherwise, set a string value (or a function
			 * returning a string val), returning the key in which to store the
			 * data Note: this feature only works combined with completions
			 * loaded in memory (i.e. bulk: true)
			 * 
			 * @property autocompletions.properties.persistent
			 * @type string|function
			 * @default "properties"
			 */
			persistent : "properties",
			/**
			 * A set of handlers. Most, taken from the CodeMirror showhint
			 * plugin: http://codemirror.net/doc/manual.html#addon_show-hint
			 * 
			 * @property autocompletions.properties.handlers
			 * @type object
			 */
			handlers : {
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can show this particular type of autocompletion
				 * 
				 * @property autocompletions.classes.handlers.validPosition
				 * @type function
				 * @default null
				 */
				validPosition : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.showHint
				 * @type function
				 * @default null
				 */
				showHint : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.shown
				 * @type function
				 * @default null
				 */
				shown : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.select
				 * @type function
				 * @default null
				 */
				select : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.pick
				 * @type function
				 * @default null
				 */
				pick : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.close
				 * @type function
				 * @default null
				 */
				close : null,
			}
		},
		/**
		 * Class autocompletion settings
		 * 
		 * @property autocompletions.classes
		 * @type object
		 */
		classes : {
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["http://...",....]
			 * 
			 * @property autocompletions.classes.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param partialToken {string} When bulk is disabled, use this partialtoken to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromLov)
			 */
			get : root.fetchFromLov,
			/**
			 * The get function is asynchronous
			 * 
			 * @property autocompletions.classes.async
			 * @type boolean
			 * @default true
			 */
			async : true,
			/**
			 * Use bulk loading of classes: all classes are retrieved onLoad
			 * using the get() function. Alternatively, disable bulk loading, to
			 * call the get() function whenever a token needs autocompletion (in
			 * this case, the completion token is passed on to the get()
			 * function) Whenever you have an autocompletion list that easily
			 * fits in memory, we advice you to enable bulk for performance
			 * reasons (especially as we store the autocompletions in a trie)
			 * 
			 * @property autocompletions.classes.bulk
			 * @type boolean
			 * @default false
			 */
			bulk : false,
			/**
			 * Auto-show the autocompletion dialog. Disabling this requires the
			 * user to press [ctrl|cmd]-space to summon the dialog. Note: this
			 * only works when completions are loaded in memory (i.e. bulk:
			 * true)
			 * 
			 * @property autocompletions.classes.autoShow
			 * @type boolean
			 * @default false
			 */
			autoShow : false,
			/**
			 * Automatically store autocompletions in localstorage. This is
			 * particularly useful when the get() function is an expensive ajax
			 * call. Autocompletions are stored for a period of a month. Set
			 * this property to null (or remove it), to disable the use of
			 * localstorage. Otherwise, set a string value (or a function
			 * returning a string val), returning the key in which to store the
			 * data Note: this feature only works combined with completions
			 * loaded in memory (i.e. bulk: true)
			 * 
			 * @property autocompletions.classes.persistent
			 * @type string|function
			 * @default "classes"
			 */
			persistent : "classes",
			/**
			 * A set of handlers. Most, taken from the CodeMirror showhint
			 * plugin: http://codemirror.net/doc/manual.html#addon_show-hint
			 * 
			 * @property autocompletions.classes.handlers
			 * @type object
			 */
			handlers : {
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can show this particular type of autocompletion
				 * 
				 * @property autocompletions.classes.handlers.validPosition
				 * @type function
				 * @default null
				 */
				validPosition : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.showHint
				 * @type function
				 * @default null
				 */
				showHint : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.shown
				 * @type function
				 * @default null
				 */
				shown : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.select
				 * @type function
				 * @default null
				 */
				select : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.pick
				 * @type function
				 * @default null
				 */
				pick : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.close
				 * @type function
				 * @default null
				 */
				close : null,
			}
		}
	},

	/**
	 * Settings for querying sparql endpoints
	 * 
	 * @property query
	 * @type object
	 */
	query : {
		/**
		 * Endpoint to query
		 * 
		 * @property query.endpoint
		 * @type String
		 * @default "http://dbpedia.org/sparql"
		 */
		endpoint : "http://dbpedia.org/sparql",
		/**
		 * Request method via which to access SPARQL endpoint
		 * 
		 * @property query.requestMethod
		 * @type String
		 * @default "GET"
		 */
		requestMethod : "GET",
		/**
		 * Query accept header
		 * 
		 * @property query.acceptHeader
		 * @type String
		 * @default application/sparql-results+json
		 */
		acceptHeader : "application/sparql-results+json",

		/**
		 * Named graphs to query.
		 * 
		 * @property query.namedGraphs
		 * @type array
		 * @default []
		 */
		namedGraphs : [],
		/**
		 * Default graphs to query.
		 * 
		 * @property query.defaultGraphs
		 * @type array
		 * @default []
		 */
		defaultGraphs : [],

		/**
		 * Additional request arguments. Add them in the form: {name: "name",
		 * value: "value"}
		 * 
		 * @property query.args
		 * @type array
		 * @default []
		 */
		args : [],

		/**
		 * Additional request headers
		 * 
		 * @property query.headers
		 * @type array
		 * @default {}
		 */
		headers : {},

		/**
		 * Set of ajax handlers
		 * 
		 * @property query.handlers
		 * @type object
		 */
		handlers : {
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property query.handlers.beforeSend
			 * @type function
			 * @default null
			 */
			beforeSend : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property query.handlers.complete
			 * @type function
			 * @default null
			 */
			complete : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property query.handlers.error
			 * @type function
			 * @default null
			 */
			error : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property query.handlers.success
			 * @type function
			 * @default null
			 */
			success : null
		}
	}
});
root.version = {
	"CodeMirror" : CodeMirror.version,
	"YASQE" : require("../package.json").version
};

// end with some documentation stuff we'd like to include in the documentation
// (yes, ugly, but easier than messing about and adding it manually to the
// generated html ;))
/**
 * Set query value in editor (see http://codemirror.net/doc/manual.html#setValue)
 * 
 * @method doc.setValue
 * @param query {string}
 */

/**
 * Get query value from editor (see http://codemirror.net/doc/manual.html#getValue)
 * 
 * @method doc.getValue
 * @return query {string}
 */

/**
 * Set size. Use null value to leave width or height unchanged. To resize the editor to fit its content, see http://codemirror.net/demo/resize.html
 * 
 * @param width {number|string}
 * @param height {number|string}
 * @method doc.setSize
 */
