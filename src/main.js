'use strict';
var $ = require("jquery");
var CodeMirror = require("codemirror");

require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');
require('../lib/formatting.js');
require('../lib/flint.js');
var Trie = require('../lib/trie.js');

/**
 * Main YASGUI-Query constructor
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YasguiQuery
 * @return {doc} YASGUI-query document
 */
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
 * 
 * @private
 */
var extendConfig = function(config) {
	var extendedConfig = $.extend(true, {}, root.defaults, config);//I know, codemirror deals with default options as well. However, it does not do this recursively (i.e. the persistency option)
	
	return extendedConfig;
};
/**
 * Add extra functions to the CM document (i.e. the codemirror instantiated object)
 * @private
 */
var extendCmInstance = function(cm) {
	/**
	 * Execute query. Pass a callback function, or a configuration object (see default settings below for possible values)
	 * I.e., you can change the query configuration by either changing the default settings, changing the settings of this document, or by passing query settings to this function
	 * 
	 * @method doc.query
	 * @param function|object
	 */
	cm.query = function(callbackOrConfig) {
		root.executeQuery(cm, callbackOrConfig);
	};
	
	/**
	 * Store completions
	 * 
	 * @method doc.storeCompletions
	 * @param type {string} Type of completions: ["prefixes", "properties", "classes"]
	 * @param completions {array} Array containing a set of strings (IRIs)
	 */
	cm.storeCompletions = function(type, completions) {
		//store array as trie
		tries[type] = new Trie();
		for (var i = 0; i < completions.length; i++) {
			tries[type].insert(completions[i]);
		}
		
		//store in localstorage as well
		var storageId = getPersistencyId(cm, type);
		if (storageId) require("./storage.js").set(storageId, completions, "month");
	};
	return cm;
};


var postProcessCmElement = function(cm) {
	var storageId = getPersistencyId(cm, "query");
	if (storageId) {
		var valueFromStorage = require("./storage.js").get(storageId);
		if (valueFromStorage) cm.setValue(valueFromStorage);
	}
	
	/**
	 * Add event handlers
	 */
	cm.on('blur',function(cm, eventInfo) {
		root.storeQuery(cm);
	});
	cm.on('change', function(cm, eventInfo) {
		checkSyntax(cm, true);
		root.showHint(cm, root.prefixHint, {closeCharacters: /(?=a)b/});
		root.appendPrefixIfNeeded(cm);
		
	});
	checkSyntax(cm, true);//on first load, check as well (our stored or default query might be incorrect as well)
	
	
	loadPrefixesIfAny(cm);
	
	
	
};


/**
 * privates
 */
//used to store autocompletions in
var tries = {};
//this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
	"string-2": "prefixed",
};
var loadPrefixesIfAny = function(cm) {
	var prefixes = null;
	if (cm.getOption("autocompletions")) prefixes = cm.getOption("autocompletions").prefixes;
	if (prefixes instanceof Array) {
		//we don't care whether the prefixes are already stored in localstorage. just use this one
		cm.storeCompletions("prefixes", prefixes);
	} else {
		//if prefixes are defined in localstorage, use that one! (calling the function may come with overhead (e.g. async calls))
		var prefixesFromStorage = null;
		if (getPersistencyId(cm, "prefixes")) prefixesFromStorage = require("./storage.js").get(getPersistencyId(cm, "prefixes"));
		if (prefixesFromStorage && prefixesFromStorage instanceof Array && prefixesFromStorage.length > 0) {
			cm.storeCompletions("prefixes", prefixesFromStorage);
		} else {
			//nothing in storage. check whether we have a function via which we can get our prefixes
			if (prefixes instanceof Function) {
				var functionResult = prefixes(cm);
				if (functionResult && functionResult instanceof Array && functionResult.length > 0) {
					//function returned an array (if this an async function, we won't get a direct function result)
					cm.storeCompletions("prefixes", functionResult);
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
					if (uriString.indexOf("<") == 0 )
						uriString = uriString.substring(1);
					if (uriString.slice(-1) == ">")
						uriString = uriString.substring(0, uriString.length - 1);
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
		cm.replaceRange("\n" + previousIndent + "PREFIX " + prefix , {
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
	if (prevToken.type != null && prevToken.type != "ws") {
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

/**
 * Fetch prefixes from prefix.cc, and store in the YASGUI-Query object
 * 
 * @param doc {Yasgui-Query} 
 * @method YasguiQuery.fetchFromPrefixCc
 */
root.fetchFromPrefixCc = function(cm) {
	$.get("http://prefix.cc/popular/all.file.json", function(data) {
		var prefixArray = [];
		for (var prefix in data) {
			if (prefix == "bif") continue;//skip this one! see #231
			var completeString = prefix + ": <" + data[prefix] + ">";
			prefixArray.push(completeString);//the array we want to store in localstorage
		}
		cm.storeCompletions("prefixes", prefixArray);
	});
};

/**
 * Determine unique ID of the YASGUI-Query object. Useful when several objects are loaded on the same page, and all have 'persistency' enabled.
 * Currently, the ID is determined by selecting the nearest parent in the DOM with an ID set
 * 
 * @param doc {Yasgui-Query} 
 * @method YasguiQuery.fetchFromPrefixCc
 */
root.determineId = function(cm) {
	return $(cm.getWrapperElement()).closest('[id]').attr('id');
};


root.storeQuery = function(cm) {
	var storageId = getPersistencyId(cm, "query");
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
root.executeQuery = function(cm, callbackOrConfig) {
	var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig: null);
	var config = (typeof callbackOrConfig == "object" ? callbackOrConfig: {});
	if (cm.getOption("query")) config = $.extend({}, cm.getOption("query"), config);
	
	if (!config.endpoint || config.endpoint.length == 0) return;//nothing to query!
	
	/**
	 * initialize ajax config
	 */
	var ajaxConfig = {
		url: config.endpoint,
		type: config.requestMethod,
		data: [{name: "query", value: cm.getValue()}],
		headers: {
			Accept: config.acceptHeader
		}
	};
	
	/**
	 * add complete, beforesend, etc handlers (if specified)
	 */
	var handlerDefined = false;
	if (config.handlers) {
		for (var handler in config.handlers) {
			if (config.handlers[handler]) {
				handlerDefined = true;
				ajaxConfig[handler] = config.handlers[handler];
			}
		}
	}
	if (!handlerDefined && !callback) return; //ok, we can query, but have no callbacks. just stop now
	//if only callback is passed as arg, add that on as 'onComplete' callback
	if (callback) ajaxConfig.complete = callback;
	
	/**
	 * add named graphs to ajax config
	 */
	if (config.namedGraphs && config.namedGraphs.length > 0) {
		for (var i = 0; i < config.namedGraphs.length; i++) ajaxConfig.data.push({name: "named-graph-uri", value: config.namedGraphs[i]});
	}
	/**
	 * add default graphs to ajax config
	 */
	if (config.defaultGraphs && config.defaultGraphs.length > 0) {
		for (var i = 0; i < config.defaultGraphs.length; i++) ajaxConfig.data.push({name: "default-graph-uri", value: config.defaultGraphs[i]});
	}
	
	/**
	 * merge additional request headers
	 */
	if (config.headers && !$.isEmptyObject(config.headers)) $.extend(ajaxConfig.headers, config.headers);
	/**
	 * add additional request args
	 */
	if (config.args && config.args.length > 0) $.merge(ajaxConfig.data, config.args);
	$.ajax(ajaxConfig);
};
root.prefixHint = function(cm) {
	if (!tries["prefixes"]) return;//no prefixed defined. just stop
	// Find the token at the cursor
	var cur = cm.getCursor(), token = cm.getTokenAt(cur);
	var includePreviousTokens = function(token, cur) {
		var prevToken = cm.getTokenAt({
			line : cur.line,
			ch : token.start
		});
		if (prevToken.type == "sp-punct"
				|| prevToken.type == "sp-keyword") {
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
		list : tries["prefixes"].autoComplete(token.string),
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
	if (!tries["prefixes"]) return;//no prefixed defined. just stop
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
					var completions = tries["prefixes"].autoComplete(currentPrefix);
					if (completions.length > 0) {
						appendToPrefixes(cm, completions[0]);
					}
				}
			}
		}
	}
};
var getPersistencyId = function(cm, key) {
	var persistencyId = null;
	var persistencyIds = cm.getOption("persistency");
	
	if (persistencyIds && persistencyIds[key]) {
		if (typeof persistencyIds[key] == "string") {
			persistencyId = persistencyIds[key];
		} else {
			persistencyId = persistencyIds[key](cm);
		}
	}
	return persistencyId;
};


/**
 * The default options of Yasgui-Query (check the CodeMirror documentation for even more options, such as disabling line numbers, or changing keyboard shortcut keys). 
 * Either change the default options by setting YasguiQuery.defaults, or by passing your own options as second argument to the YasguiQuery constructor
 *
 * @attribute
 * @attribute YasguiQuery.defaults
 */
root.defaults = $.extend(root.defaults, {
	mode : "sparql11",
	/**
	 * Query string
	 *
	 * @property value
	 * @type String
	 * @default "SELECT * {?x ?y ?z} \nLIMIT 10"
	 */
	value : "SELECT * {?x ?y ?z} \nLIMIT 10",
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
		"Ctrl-]": root.indentMore,
		"Cmd-]": root.indentMore,
		"Ctrl-[": root.indentLess,
		"Cmd-[": root.indentLess,
		"Ctrl-S": root.storeQuery,
		"Cmd-S": root.storeQuery,
		"Ctrl-Enter": root.executeQuery,
		"Cmd-Enter": root.executeQuery
	},
	
	//non CodeMirror options
	/**
	 * Change persistency settings for query and completions. Setting the values to null, will disable persistancy: nothing is stored between browser sessions
	 * Setting the values to a string (or a function which returns a string), will store e.g. the query in localstorage using the specified string.
	 *
	 * @property persistency
	 * @type object
	 */
	persistency: {
		/**
		 * Persistency setting for query. Default ID is dynamically generated using the determineID function, to avoid collissions when using multiple YASGUI-Query items on one page
		 * 
		 * @property persistency.query
		 * @type function|string
		 * @default YasguiQuery.determineId()'
		 */
		query: function(cm){return "queryVal_" + root.determineId(cm);},
		/**
		 * Persistency setting for query. Default ID is a static string, i.e., multiple Yasgui-Query instances use the same set of prefixes
		 * 
		 * @property persistency.prefixes
		 * @type function|string
		 * @default "prefixes" 
		 */
		prefixes: "prefixes",
	},
	/**
	 * Types of completions. Possible keys: "prefixes". Setting the value to null, will disable autocompletion for this particular type. 
	 * Set the values to an array (or a function which returns an array), and you'll be able to use the specified prefixes. 
	 * An asynchronous function is possible. Just make sure you call doc.storeCompletions() in your callback
	 * By default, only prefix autocompletions are fetched (from prefix.cc)
	 *
	 * @property autocompletions
	 * @type object
	 */
	autocompletions: {
		prefixes: root.fetchFromPrefixCc
	},
	
	/**
	 * Settings for querying sparql endpoints
	 *
	 * @property query
	 * @type object
	 */
	query: {
		/**
		 * Endpoint to query
		 * 
		 * @property query.endpoint
		 * @type String
		 * @default "http://dbpedia.org/sparql"
		 */
		endpoint: "http://dbpedia.org/sparql",
		/**
		 * Request method via which to access SPARQL endpoint
		 * 
		 * @property query.requestMethod
		 * @type String
		 * @default "GET"
		 */
		requestMethod: "GET",
		/**
		 * Query accept header
		 * 
		 * @property query.acceptHeader
		 * @type String
		 * @default application/sparql-results+json
		 */
		acceptHeader: "application/sparql-results+json",
		
		/**
		 * Named graphs to query.
		 * 
		 * @property query.namedGraphs
		 * @type array
		 * @default []
		 */
		namedGraphs: [],
		/**
		 * Default graphs to query.
		 * 
		 * @property query.defaultGraphs
		 * @type array
		 * @default []
		 */
		defaultGraphs: [],
		
		/**
		 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
		 * 
		 * @property query.args
		 * @type array
		 * @default []
		 */
		args: [],
		
		/**
		 * Additional request headers
		 * 
		 * @property query.headers
		 * @type array
		 * @default {}
		 */
		headers: {},
		
		
		/**
		 * Handlers to execute query. Possible keys beforeSend, complete, error, success. See https://api.jquery.com/jQuery.ajax/ for more information on these handlers, and their arguments.
		 * 
		 * @property query.handlers
		 * @type object
		 */
		handlers: {
			beforeSend: null,
			complete: null,
			error: null,
			success: null
		}
	}
});
root.version = {
	"CodeMirror": CodeMirror.version,
	"YASGUI-Query": require("../package.json").version
};




//end with some documentation stuff we'd like to include in the documentation (yes, ugly, but easier than messing about and adding it manually to the generated html ;))
/**
 * Set query (CodeMirror)
 * 
 * @method doc.setValue
 * @param query {string} 
 */

/**
 * Get value (CodeMirror)
 * 
 * @method doc.getValue
 * @return query {string} 
 */

/**
 * Set size (CodeMirror). Use null value to leave width or height unchanged. To resize the editor to fit its content, check out http://codemirror.net/demo/resize.html
 * 
 * @param width {number|string}
 * @param height: {number|string}
 * @method doc.setSize
 */
