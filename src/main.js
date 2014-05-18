'use strict';
var $ = require("jquery");
var CodeMirror = require("codemirror");

require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');
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
	 * Store bulk completions
	 * 
	 * @method doc.storeBulkCompletions
	 * @param type {string} Type of completions: ["prefixes", "properties", "classes"]
	 * @param completions {array} Array containing a set of strings (IRIs)
	 */
	cm.storeBulkCompletions = function(type, completions) {
		//store array as trie
		tries[type] = new Trie();
		for (var i = 0; i < completions.length; i++) {
			tries[type].insert(completions[i]);
		}
		
		//store in localstorage as well
		var storageId = getPersistencyId(cm, cm.options.autocompletions[type].persistent);
		if (storageId) require("./storage.js").set(storageId, completions, "month");
	};
	return cm;
};


var postProcessCmElement = function(cm) {
	
	var storageId = getPersistencyId(cm, cm.options.persistent);
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
		root.autoComplete(cm, true);
		root.appendPrefixIfNeeded(cm);
		
	});
	checkSyntax(cm, true);//on first load, check as well (our stored or default query might be incorrect as well)
	
	
	/**
	 * load bulk completions
	 */
	if (cm.options.autocompletions) {
		for (var completionType in cm.options.autocompletions) {
			if (cm.options.autocompletions[completionType].bulk) {
				loadBulkCompletions(cm, completionType);
			}
		}
	}
};


/**
 * privates
 */
//used to store bulk autocompletions in
var tries = {};
//this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
	"string-2": "prefixed",
};
var keyExists = function(objectToTest, key) {
	var exists = false;
	
	try {
	  if (objectToTest[key] !== undefined) exists = true;
	} catch(e) {
	}
	return exists;
};
var loadBulkCompletions = function(cm, type) {
	var completions = null;
	if (keyExists(cm.options.autocompletions[type], "get")) completions = cm.options.autocompletions[type].get;
	if (completions instanceof Array) {
		//we don't care whether the completions are already stored in localstorage. just use this one
		cm.storeBulkCompletions(type, completions);
	} else {
		//if completions are defined in localstorage, use those! (calling the function may come with overhead (e.g. async calls))
		var completionsFromStorage = null;
		if (getPersistencyId(cm, cm.options.autocompletions[type].persistent)) completionsFromStorage = require("./storage.js").get(getPersistencyId(cm, cm.options.autocompletions[type].persistent));
		if (completionsFromStorage && completionsFromStorage instanceof Array && completionsFromStorage.length > 0) {
			cm.storeBulkCompletions(type, completionsFromStorage);
		} else {
			//nothing in storage. check whether we have a function via which we can get our prefixes
			if (completions instanceof Function) {
				var functionResult = completions(cm);
				if (functionResult && functionResult instanceof Array && functionResult.length > 0) {
					//function returned an array (if this an async function, we won't get a direct function result)
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
		cm.storeBulkCompletions("prefixes", prefixArray);
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
		autoFormatRange(cm,{
			line : 0,
			ch : 0
		}, {
			line : totalLines,
			ch : totalChars
		});
	}

};


root.executeQuery = function(cm, callbackOrConfig) {
	var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig: null);
	var config = (typeof callbackOrConfig == "object" ? callbackOrConfig: {});
	if (cm.options.query) config = $.extend({}, cm.options.query, config);
	
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

var validCompletionPosition = {
	properties: function(cm) {
		var token = getCompleteToken(cm);
		
		if (token.type == "var") return false; //we are typing a var
		if ($.inArray("a", token.state.possibleCurrent) >= 0) return true;//predicate pos
		var cur = cm.getCursor();
		var previousToken = getPreviousNonWsToken(cm, cur.line, token);
		if (previousToken.string == "rdfs:subPropertyOf") return true;
		
		//hmm, we would like -better- checks here, e.g. checking whether we are in a subject, and whether next item is a rdfs:subpropertyof.
		//difficult though... the grammar we use is unreliable when the query is invalid (i.e. during typing), and often the predicate is not typed yet, when we are busy writing the subject...
		return false;
	},
	classes: function(cm) {
		var token = getCompleteToken(cm);
		if (token.type == "var") return false;
		var cur = cm.getCursor();
		var previousToken = getPreviousNonWsToken(cm, cur.line, token);
		if (previousToken.string == "a") return true;
		if (previousToken.string == "rdf:type") return true;
		if (previousToken.string == "rdfs:domain") return true;
		if (previousToken.string == "rdfs:range") return true;
		return false;
	},
	prefixes: function(cm) {
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
		if (firstToken == null || firstToken.string.toUpperCase() != "PREFIX") return false;
		return true;
	}
};

root.autoComplete = function(cm, fromAutoShow) {
	if (cm.somethingSelected()) return;
	if (!cm.options.autocompletions) return;
	var tryHintType = function(type) {
		if (fromAutoShow //from autoShow, i.e. this gets called each time the editor content changes 
				&& (!keyExists(cm.options.autocompletions[type], "autoShow") || !cm.options.autocompletions[type].autoShow) //autoshow for this particular type of autocompletion is -not- enabled
				&& (cm.options.autocompletions[type].bulk)//bulk loading should be enabled (don't want to re-do ajax-like request for every editor change)
			) {
			return false;
		}
		var hints = getHints[type](cm);
		if (hints && hints.list.length > 0) {
			
			if (cm.options.autocompletions[type].handlers) {
				hints['_handlers'] = {};
				if (cm.options.autocompletions[type].handlers.close) hints['_handlers'].close = [cm.options.autocompletions[type].handlers.close];
				if (cm.options.autocompletions[type].handlers.select) hints['_handlers'].select = [cm.options.autocompletions[type].handlers.select];
				if (cm.options.autocompletions[type].handlers.shown) hints['_handlers'].shown = [cm.options.autocompletions[type].handlers.shown];
				if (cm.options.autocompletions[type].handlers.pick) hints['_handlers'].pick = [cm.options.autocompletions[type].handlers.pick];
			}
			
			root.showHint(cm, function(){return hints;}, {closeCharacters: /(?=a)b/, shown: function(){console.log("shownnn");}});
			return true;
		}
		return false;
	};
	for (var type in cm.options.autocompletions) {
		if (!validCompletionPosition[type](cm)) continue;
		if (cm.options.autocompletions[type].handlers && cm.options.autocompletions[type].handlers.validPosition) {
			if (cm.options.autocompletions[type].handlers.validPosition(cm) === false) continue;
		}
		var success = tryHintType(type);
		if (success) break;
	}
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

/**
 * When typing a query, this query is sometimes syntactically invalid, causing the current tokens to be incorrect
 * This causes problem for autocompletion. http://bla might result in two tokens: http:// and bla. We'll want to combine these
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
	//not start of line, and not whitespace
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
			completionToken.tokenPrefix = token.string.substring(0, token.string.indexOf(":") + 1);
			
			
			if (queryPrefixes[completionToken.tokenPrefix] != null) {
				completionToken.tokenPrefixUri = queryPrefixes[completionToken.tokenPrefix];
			}
		}
		
		completionToken.uri = token.string;
		if (!token.string.indexOf("<") == 0 && token.string.indexOf(":") > -1) {
			//hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
			for (var prefix in queryPrefixes) {
				if (queryPrefixes.hasOwnProperty(prefix)) {
					if (token.string.indexOf(prefix) == 0) {
						completionToken.uri = queryPrefixes[prefix];
						completionToken.uri += token.string.substring(prefix.length);
						break;
					}
				}
			}
		}
		
		if (completionToken.uri.indexOf("<") == 0)
			completionToken.uri = completionToken.uri.substring(1);
		if (completionToken.uri.indexOf(">", completionToken.length - 1) !== -1)
			completionToken.uri = completionToken.uri.substring(0, completionToken.uri.length - 1);
	}
	return completionToken;
};

var getHints = {};
getHints.resourceHints = function(cm, type) {
	var token = getCompleteToken(cm);
	var cur = cm.getCursor();
	var completionToken = preprocessCompletionToken(cm, token);
	//console.log(completionToken);
	if (completionToken) {
		// use custom completionhint function, to avoid reaching a loop when the
		// completionhint is the same as the current token
		// regular behaviour would keep changing the codemirror dom, hence
		// constantly calling this callback
		var completionHint = function(cm, data, completion) {
			if (completion.text != cm.getTokenAt(cm.getCursor()).string) {
				cm.replaceRange(completion.text, data.from, data.to);
			}
		};
		if (!tries[type]) return;
		var suggestions = tries[type].autoComplete(completionToken.uri);
		
		var hintList = [];
		for ( var i = 0; i < suggestions.length; i++) {
			var suggestedString = suggestions[i];
			if (completionToken.tokenPrefix != null && completionToken.uri != null) {
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
				displayText: suggestedString,
				hint : completionHint,
				className: type + "Hint"
			});
		}
		
		return {
		
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
		
	}
};
getHints.properties = function(cm) {
	return getHints.resourceHints(cm, "properties");
};
getHints.classes = function(cm) {
	return getHints.resourceHints(cm, "classes");
};
getHints.prefixes = function(cm) {
	if (!tries["prefixes"]) return;//no prefix completions defined
	var token = getCompleteToken(cm);
	var cur = cm.getCursor();

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

var autoFormatRange = function (cm, from, to) {
	  var absStart = cm.indexFromPos(from);
	  var absEnd = cm.indexFromPos(to);
	  // Insert additional line breaks where necessary according to the
	  // mode's syntax
	  var res = autoFormatLineBreaks(cm.getValue(), absStart, absEnd);

	  // Replace and auto-indent the range
	  cm.operation(function () {
	    cm.replaceRange(res, from, to);
	    var startLine = cm.posFromIndex(absStart).line;
	    var endLine = cm.posFromIndex(absStart + res.length).line;
	    for (var i = startLine; i <= endLine; i++) {
	      cm.indentLine(i, "smart");
	    }
  });
};

var autoFormatLineBreaks = function (text, start, end) {
	text = text.substring(start, end);
	var breakAfterArray = [
	    ["keyword", "ws", "prefixed", "ws", "uri"], //i.e. prefix declaration
	    ["keyword", "ws", "uri"]//i.e. base
	];
	var breakAfterCharacters = ["{", ".", ";"];
	var breakBeforeCharacters = ["}"];
	var getBreakType = function(stringVal, type) {
		for (var i = 0; i < breakAfterArray.length; i++) {
			if (stackTrace.valueOf().toString() == breakAfterArray[i].valueOf().toString()) {
				return 1;
			}
		}
		for (var i = 0; i < breakAfterCharacters.length; i++) {
			if (stringVal == breakAfterCharacters[i]) {
				return 1;
			}
		}
		for (var i = 0; i < breakBeforeCharacters.length; i++) {
			//don't want to issue 'breakbefore' AND 'breakafter', so check current line
			if ($.trim(currentLine) != '' && stringVal == breakBeforeCharacters[i]) {
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
			} else {//(-1)
				formattedQuery += "\n" + stringVal;
				currentLine = stringVal;
			}
			stackTrace = [];
		} else {
			currentLine += stringVal;
			formattedQuery += stringVal;
		}
		if (stackTrace.length == 1 && stackTrace[0] == "sp-ws") stackTrace = [];
	});
	return $.trim(formattedQuery.replace(/\n\s*\n/g, '\n'));
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
	
	persistent: function(cm){return "queryVal_" + root.determineId(cm);},
	//non CodeMirror options
	/**
	 * Change persistency settings for query and completions. Setting the values to null, will disable persistancy: nothing is stored between browser sessions
	 * Setting the values to a string (or a function which returns a string), will store e.g. the query in localstorage using the specified string.
	 *
	 * @property persistency
	 * @type object
	 */
//	persistency: {
//		/**
//		 * Persistency setting for query. Default ID is dynamically generated using the determineID function, to avoid collissions when using multiple YASGUI-Query items on one page
//		 * 
//		 * @property persistency.query
//		 * @type function|string
//		 * @default YasguiQuery.determineId()'
//		 */
//		query: function(cm){return "queryVal_" + root.determineId(cm);},
//		/**
//		 * Persistency setting for prefixes. Default ID is a static string, i.e., multiple Yasgui-Query instances use the same set of prefixes
//		 * 
//		 * @property persistency.prefixes
//		 * @type function|string
//		 * @default "prefixes" 
//		 */
//		prefixes: "prefixes",
//		/**
//		 * Persistency setting for properties. Default ID is a static string, i.e., multiple Yasgui-Query instances use the same set of properties
//		 * 
//		 * @property persistency.properties
//		 * @type function|string
//		 * @default "properties" 
//		 */
//		
//		/**
//		 * Persistency setting for classes. Default ID is a static string, i.e., multiple Yasgui-Query instances use the same set of classes
//		 * 
//		 * @property persistency.classes
//		 * @type function|string
//		 * @default "classes" 
//		 */
////		classes: "classes",
//	},
	/**
	 * Types of completions. Setting the value to null, will disable autocompletion for this particular type. 
	 * Set the values to an array (or a function which returns an array), and you'll be able to use the specified prefixes. 
	 * An asynchronous function is possible. Just make sure you call doc.storeBulkCompletions() in your callback
	 * By default, only prefix autocompletions are fetched (from prefix.cc)
	 *
	 * @property autocompletions
	 * @type object
	 */
	autocompletions: {
		/**
		 * Persistency setting for classes. Default ID is a static string, i.e., multiple Yasgui-Query instances use the same set of classes
		 * 
		 * @property persistency.classes
		 * @type function|string
		 * @default "classes" 
		 */
		prefixes: {
			bulk: false,//default false
			autoShow: true,
			autoAddDeclaration: true,
			get: root.fetchFromPrefixCc,
			persistent: "prefixes", //only works for bulk loading
			handlers: {
				validPosition: null,
				shown: null,
				select: null,
				pick: null,
				close: null,
			}
		},
		properties: {
			bulk: false,
			get: ["http://blaaat1", "http://blaaaat2", "http://blaaat3"],
			autoShow: true,
			persistent: "properties",
			handlers: {
				validPosition: null,
				shown: null,
				select: null,
				pick: null,
				close: null,
			}
		},
		classes: {
			bulk: true,
			autoShow: true,
			get: function(){return ["http://blaaatclass1", "http://blaaaatclass2", "http://blaaat3class"];},
			handlers: {
				validPosition: null,
				shown: null,
				select: null,
				pick: null,
				close: null,
			}
		}
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
