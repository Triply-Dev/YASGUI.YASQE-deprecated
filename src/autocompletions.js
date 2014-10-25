var $ = require('jquery'),
	utils = require('./utils.js'),
	Trie = require('../lib/trie.js');

//this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
	"string-2" : "prefixed",
	"atom": "var"
};

/**
 *  get our array of suggestions (strings) in the codemirror hint format
 */
var getSuggestionsAsHintObject = function(yasqe, suggestions, type, token) {
	var hintList = [];
	for (var i = 0; i < suggestions.length; i++) {
		var suggestedString = suggestions[i];
		if (yasqe.options.autocompletions[type].postProcessToken) {
			suggestedString = yasqe.options.autocompletions[type].postProcessToken(yasqe, token, suggestedString);
		}
		hintList.push({
			text : suggestedString,
			displayText : suggestedString,
			hint : selectHint,
			className : type + "Hint"
		});
	}
	
	var cur = yasqe.getCursor();
	var returnObj = {
		completionToken : token.string,
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
	//if we have some autocompletion handlers specified, add these these to the object. Codemirror will take care of firing these
	if (yasqe.options.autocompletions[type].handlers) {
		for ( var handler in yasqe.options.autocompletions[type].handlers) {
			if (yasqe.options.autocompletions[type].handlers[handler]) 
				root.on(returnObj, handler, yasqe.options.autocompletions[type].handlers[handler]);
		}
	}
	return returnObj;
};


var getSuggestionsFromToken = function(yasqe, type, partialToken) {
	var suggestions = [];
	if (yasqe.tries[type]) {
		suggestions = yasqe.tries[type].autoComplete(partialToken.string);
	} else if (typeof yasqe.options.autocompletions[type].get == "function" && yasqe.options.autocompletions[type].async == false) {
		suggestions = yasqe.options.autocompletions[type].get(yasqe, partialToken.string, type);
	} else if (typeof yasqe.options.autocompletions[type].get == "object") {
		var partialTokenLength = partialToken.string.length;
		for (var i = 0; i < yasqe.options.autocompletions[type].get.length; i++) {
			var completion = yasqe.options.autocompletions[type].get[i];
			if (completion.slice(0, partialTokenLength) == partialToken.string) {
				suggestions.push(completion);
			}
		}
	}
	return getSuggestionsAsHintObject(yasqe, suggestions, type, partialToken);
	
};

var postprocessResourceTokenForCompletion = function(yasqe, token, suggestedString) {
	if (token.tokenPrefix && token.uri && token.tokenPrefixUri) {
		// we need to get the suggested string back to prefixed form
		suggestedString = suggestedString.substring(token.tokenPrefixUri.length);
		suggestedString = token.tokenPrefix + suggestedString;
	} else {
		// it is a regular uri. add '<' and '>' to string
		suggestedString = "<" + suggestedString + ">";
	}
	return suggestedString;
};
var preprocessPrefixTokenForCompletion = function(yasqe, token) {
	var previousToken = yasqe.getPreviousNonWsToken(yasqe.getCursor().line, token);
	if (previousToken && previousToken.string && previousToken.string.slice(-1) == ":") {
		//combine both tokens! In this case we have the cursor at the end of line "PREFIX bla: <".
		//we want the token to be "bla: <", en not "<"
		token = {
			start: previousToken.start,
			end: token.end,
			string: previousToken.string + " " + token.string,
			state: token.state
		};
	}
	return token;
};

/**
 * function which fires after the user selects a completion. this function checks whether we actually need to store this one (if completion is same as current token, don't do anything)
 */
var selectHint = function(yasqe, data, completion) {
	if (completion.text != yasqe.getTokenAt(yasqe.getCursor()).string) {
		yasqe.replaceRange(completion.text, data.from, data.to);
	}
};

/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 */
var preprocessResourceTokenForCompletion = function(yasqe, token) {
	var queryPrefixes = yasqe.getPrefixesFromQuery();
	if (!token.string.indexOf("<") == 0) {
		token.tokenPrefix = token.string.substring(0,	token.string.indexOf(":") + 1);

		if (queryPrefixes[token.tokenPrefix] != null) {
			token.tokenPrefixUri = queryPrefixes[token.tokenPrefix];
		}
	}

	token.uri = token.string.trim();
	if (!token.string.indexOf("<") == 0 && token.string.indexOf(":") > -1) {
		// hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
		for (var prefix in queryPrefixes) {
			if (queryPrefixes.hasOwnProperty(prefix)) {
				if (token.string.indexOf(prefix) == 0) {
					token.uri = queryPrefixes[prefix];
					token.uri += token.string.substring(prefix.length);
					break;
				}
			}
		}
	}

	if (token.uri.indexOf("<") == 0)	token.uri = token.uri.substring(1);
	if (token.uri.indexOf(">", token.length - 1) !== -1) token.uri = token.uri.substring(0,	token.uri.length - 1);
	return token;
};


var getCompletionHintsObject = function(yasqe, type, callback) {
	var token = yasqe.getCompleteToken();
	if (yasqe.options.autocompletions[type].preProcessToken) {
		token = yasqe.options.autocompletions[type].preProcessToken(yasqe, token, type);
	}
	
	if (token) {
		// use custom completionhint function, to avoid reaching a loop when the
		// completionhint is the same as the current token
		// regular behaviour would keep changing the codemirror dom, hence
		// constantly calling this callback
		if (yasqe.options.autocompletions[type].async) {
			var wrappedCallback = function(suggestions) {
				callback(getSuggestionsAsHintObject(yasqe, suggestions, type, token));
			};
			yasqe.options.autocompletions[type].get(yasqe, token, type, wrappedCallback);
		} else {
			return getSuggestionsFromToken(yasqe, type, token);

		}
	}
};


/**
 * Fetch property and class autocompletions the Linked Open Vocabulary services. Issues an async autocompletion call
 * 
 * @param doc {YASQE}
 * @param partialToken {object}
 * @param type {"properties" | "classes"}
 * @param callback {function} 
 * 
 * @method YASQE.fetchFromLov
 */
var fetchFromLov = function(yasqe, partialToken, type, callback) {
	
	if (!partialToken || !partialToken.string || partialToken.string.trim().length == 0) {
		if (completionNotifications[type]) {
			completionNotifications[type]
				.empty()
				.append("Nothing to autocomplete yet!");
		}
		return false;
	}
	var maxResults = 50;

	var args = {
		q : partialToken.uri,
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
						if ($.isArray(data.results[i].uri) && data.results[i].uri.length > 0) {
							results.push(data.results[i].uri[0]);
						} else {
							results.push(data.results[i].uri);
						}
						
					}
					if (results.length < data.total_results
							&& results.length < maxResults) {
						increasePage();
						doRequests();
					} else {
						//if notification bar is there, show feedback, or close
						if (completionNotifications[type]) {
							if (results.length > 0) {
								completionNotifications[type].hide();
							} else {
								completionNotifications[type].text("0 matches found...");
							}
						}
						callback(results);
						// requests done! Don't call this function again
					}
				}).fail(function(jqXHR, textStatus, errorThrown) {
					if (completionNotifications[type]) {
						completionNotifications[type]
							.empty()
							.append("Failed fetching suggestions..");
					}
					
		});
	};
	//if notification bar is there, show a loader
	if (completionNotifications[type]) {
		completionNotifications[type]
		.empty()
		.append($("<span>Fetchting autocompletions &nbsp;</span>"))
		.append($(require("yasgui-utils").imgs.getElement({id: "loader", width: "18px", height: "18px"})).css("vertical-align", "middle"));
	}
	doRequests();
};



/**
 * Check whether typed prefix is declared. If not, automatically add declaration
 * using list from prefix.cc
 * 
 * @param yasqe
 */
var  appendPrefixIfNeeded = function(yasqe) {
	if (!yasqe.tries["prefixes"])
		return;// no prefixed defined. just stop
	var cur = yasqe.getCursor();

	var token = yasqe.getTokenAt(cur);
	if (tokenTypes[token.type] == "prefixed") {
		var colonIndex = token.string.indexOf(":");
		if (colonIndex !== -1) {
			// check first token isnt PREFIX, and previous token isnt a '<'
			// (i.e. we are in a uri)
			var firstTokenString = yasqe.getNextNonWsToken(cur.line).string.toUpperCase();
			var previousToken = yasqe.getTokenAt({
				line : cur.line,
				ch : token.start
			});// needs to be null (beginning of line), or whitespace
			if (firstTokenString != "PREFIX"
					&& (previousToken.type == "ws" || previousToken.type == null)) {
				// check whether it isnt defined already (saves us from looping
				// through the array)
				var currentPrefix = token.string.substring(0, colonIndex + 1);
				var queryPrefixes = yasqe.getPrefixesFromQuery();
				if (queryPrefixes[currentPrefix] == null) {
					// ok, so it isnt added yet!
					var completions = yasqe.tries["prefixes"].autoComplete(currentPrefix);
					if (completions.length > 0) {
						yasqe.addPrefix(completions[0]);
					}
				}
			}
		}
	}
};

var completionNotifications = {};

/**
 * Show notification
 * 
 * @param doc {YASQE}
 * @param autocompletionType {string}
 * @method YASQE.showCompletionNotification
 */
var showCompletionNotification = function(yasqe, type) {
	//only draw when the user needs to use a keypress to summon autocompletions
	if (!yasqe.options.autocompletions[type].autoshow) {
		if (!completionNotifications[type]) completionNotifications[type] = $("<div class='completionNotification'></div>");
		completionNotifications[type]
			.show()
			.text("Press " + (navigator.userAgent.indexOf('Mac OS X') != -1? "yasqeD": "CTRL") + " - <spacebar> to autocomplete")
			.appendTo($(yasqe.getWrapperElement()));
	}
};

/**
 * Hide completion notification
 * 
 * @param doc {YASQE}
 * @param autocompletionType {string}
 * @method YASQE.hideCompletionNotification
 */
var hideCompletionNotification = function(yasqe, type) {
	if (completionNotifications[type]) {
		completionNotifications[type].hide();
	}
};


var autoComplete = function(yasqe, fromAutoShow) {
	if (yasqe.somethingSelected())
		return;
	if (!yasqe.options.autocompletions)
		return;
	var tryHintType = function(type) {
		if (fromAutoShow // from autoShow, i.e. this gets called each time the editor content changes
				&& (!yasqe.options.autocompletions[type].autoShow // autoshow for  this particular type of autocompletion is -not- enabled
				|| yasqe.options.autocompletions[type].async) // async is enabled (don't want to re-do ajax-like request for every editor change)
		) {
			return false;
		}

		var hintConfig = {
			closeCharacters : /(?=a)b/,
			type : type,
			completeSingle: false
		};
		if (yasqe.options.autocompletions[type].async) {
			hintConfig.async = true;
		}
		var wrappedHintCallback = function(yasqe, callback) {
			return getCompletionHintsObject(yasqe, type, callback);
		};
		var result = YASQE.showHint(yasqe, wrappedHintCallback, hintConfig);
		return true;
	};
	for ( var type in yasqe.options.autocompletions) {
		if (!yasqe.options.autocompletions[type].isValidCompletionPosition) continue; //no way to check whether we are in a valid position
		
		if (!yasqe.options.autocompletions[type].isValidCompletionPosition(yasqe)) {
			//if needed, fire handler for when we are -not- in valid completion position
			if (yasqe.options.autocompletions[type].handlers && yasqe.options.autocompletions[type].handlers.invalidPosition) {
				yasqe.options.autocompletions[type].handlers.invalidPosition(yasqe, type);
			}
			//not in a valid position, so continue to next completion candidate type
			continue;
		}
		// run valid position handler, if there is one (if it returns false, stop the autocompletion!)
		if (yasqe.options.autocompletions[type].handlers && yasqe.options.autocompletions[type].handlers.validPosition) {
			if (yasqe.options.autocompletions[type].handlers.validPosition(yasqe, type) === false)
				continue;
		}

		var success = tryHintType(type);
		if (success)
			break;
	}
};

/**
 * Fetch all the used variables names from this query
 * 
 * @method YASQE.getAllVariableNames
 * @param {doc} YASQE document
 * @param token {object}
 * @returns variableNames {array}
 */

var autocompleteVariables = function(yasqe, token) {
	if (token.trim().length == 0) return [];//nothing to autocomplete
	var distinctVars = {};
	//do this outside of codemirror. I expect jquery to be faster here (just finding dom elements with classnames)
	$(yasqe.getWrapperElement()).find(".yasqe-atom").each(function() {
		var variable = this.innerHTML;
		if (variable.indexOf("?") == 0) {
			//ok, lets check if the next element in the div is an atom as well. In that case, they belong together (may happen sometimes when query is not syntactically valid)
			var nextEl = $(this).next();
			var nextElClass = nextEl.attr('class');
			if (nextElClass && nextEl.attr('class').indexOf("yasqe-atom") >= 0) {
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
};
/**
 * Fetch prefixes from prefix.cc, and store in the YASQE object
 * 
 * @param doc {YASQE}
 * @method YASQE.fetchFromPrefixCc
 */
var fetchFromPrefixCc = function(yasqe) {
	$.get("http://prefix.cc/popular/all.file.json", function(data) {
		var prefixArray = [];
		for ( var prefix in data) {
			if (prefix == "bif")
				continue;// skip this one! see #231
			var completeString = prefix + ": <" + data[prefix] + ">";
			prefixArray.push(completeString);// the array we want to store in localstorage
		}
		
		prefixArray.sort();
		storeBulkCompletions(yasqe, "prefixes", prefixArray);
	});
};

/**
 * Store bulk completions in memory as trie, and store these in localstorage as well (if enabled)
 * 
 * @method doc.storeBulkCompletions
 * @param type {"prefixes", "properties", "classes"}
 * @param completions {array}
 */
var storeBulkCompletions = function(yasqe, type, completions) {
	// store array as trie
	yasqe.tries[type] = new Trie();
	for (var i = 0; i < completions.length; i++) {
		yasqe.tries[type].insert(completions[i]);
	}
	// store in localstorage as well
	var storageId = utils.getPersistencyId(yasqe, yasqe.options.autocompletions[type].persistent);
	if (storageId) require("yasgui-utils").storage.set(storageId, completions, "month");
};
var loadBulkCompletions = function(yasqe, type) {
	var completions = null;
	if (utils.keyExists(yasqe.options.autocompletions[type], "get"))
		completions = yasqe.options.autocompletions[type].get;
	if (completions instanceof Array) {
		// we don't care whether the completions are already stored in
		// localstorage. just use this one
		storeBulkCompletions(yasqe, type, completions);
	} else {
		// if completions are defined in localstorage, use those! (calling the
		// function may come with overhead (e.g. async calls))
		var completionsFromStorage = null;
		if (utils.getPersistencyId(yasqe, yasqe.options.autocompletions[type].persistent))
			completionsFromStorage = require("yasgui-utils").storage.get(utils.getPersistencyId(yasqe, yasqe.options.autocompletions[type].persistent));
		if (completionsFromStorage && completionsFromStorage instanceof Array && completionsFromStorage.length > 0) {
			storeBulkCompletions(yasqe, type, completionsFromStorage);
		} else {
			// nothing in storage. check whether we have a function via which we
			// can get our prefixes
			if (completions instanceof Function) {
				var functionResult = completions(yasqe);
				if (functionResult && functionResult instanceof Array
						&& functionResult.length > 0) {
					// function returned an array (if this an async function, we
					// won't get a direct function result)
					storeBulkCompletions(yasqe, type, functionResult);
				}
			}
		}
	}
};



module.exports = {
	preprocessPrefixTokenForCompletion: preprocessPrefixTokenForCompletion,
	postprocessResourceTokenForCompletion: postprocessResourceTokenForCompletion,
	preprocessResourceTokenForCompletion: preprocessResourceTokenForCompletion,
	showCompletionNotification: showCompletionNotification,
	hideCompletionNotification: hideCompletionNotification,
	autoComplete: autoComplete,
	autocompleteVariables: autocompleteVariables,
	fetchFromPrefixCc: fetchFromPrefixCc,
	fetchFromLov: fetchFromLov,
//	storeBulkCompletions: storeBulkCompletions,
	loadBulkCompletions: loadBulkCompletions,
	appendPrefixIfNeeded: appendPrefixIfNeeded,
};