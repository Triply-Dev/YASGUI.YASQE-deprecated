!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.YASQE=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
require("../lib/deparam.js");
var CodeMirror = (typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null);

require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');

window.console = window.console || {"log":function(){}};//make sure any console statements

require('../lib/flint.js');
var Trie = require('../lib/trie.js');

/**
 * Main YASQE constructor. Pass a DOM element as argument to append the editor to, and (optionally) pass along config settings (see the YASQE.defaults object below, as well as the regular CodeMirror documentation, for more information on configurability)
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
	 * Fetch defined prefixes from query string
	 * 
	 * @method doc.getPrefixesFromQuery
	 * @return object
	 */
	cm.getPrefixesFromQuery = function() {
		return getPrefixesFromQuery(cm);
	};
	
	/**
	 * Fetch the query type (i.e., SELECT||DESCRIBE||INSERT||DELETE||ASK||CONSTRUCT)
	 * 
	 * @method doc.getQueryType
	 * @return string
	 * 
	 */
	 cm.getQueryType = function() {
		 return cm.queryType;
	 };
	/**
	 * Fetch the query mode: 'query' or 'update'
	 * 
	 * @method doc.getQueryMode
	 * @return string
	 * 
	 */
	 cm.getQueryMode = function() {
		 var type = cm.getQueryType();
		 if (type=="INSERT" || type=="DELETE" || type=="LOAD" || type=="CLEAR" || type=="CREATE" || type=="DROP" || type=="COPY" || type=="MOVE" || type=="ADD") {
			 return "update";
		 } else {
			 return "query";
		 }
				
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
		var storageId = getPersistencyId(cm, cm.options.autocompletions[type].persistent);
		if (storageId) require("yasgui-utils").storage.set(storageId, completions, "month");
	};
	cm.setCheckSyntaxErrors = function(isEnabled) {
		cm.options.syntaxErrorCheck = isEnabled;
		checkSyntax(cm);
	};
	return cm;
};

var postProcessCmElement = function(cm) {
	
	/**
	 * Set doc value
	 */
	var storageId = getPersistencyId(cm, cm.options.persistent);
	if (storageId) {
		var valueFromStorage = require("yasgui-utils").storage.get(storageId);
		if (valueFromStorage)
			cm.setValue(valueFromStorage);
	}
	
	root.drawButtons(cm);

	/**
	 * Add event handlers
	 */
	cm.on('blur', function(cm, eventInfo) {
		root.storeQuery(cm);
	});
	cm.on('change', function(cm, eventInfo) {
		checkSyntax(cm);
		root.appendPrefixIfNeeded(cm);
		root.updateQueryButton(cm);
		root.positionAbsoluteItems(cm);
	});
	
	cm.on('cursorActivity', function(cm, eventInfo) {
		root.autoComplete(cm, true);
		updateButtonsTransparency(cm);
	});
	cm.prevQueryValid = false;
	checkSyntax(cm);// on first load, check as well (our stored or default query might be incorrect as well)
	root.positionAbsoluteItems(cm);
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
	
	/**
	 * check url args and modify yasqe settings if needed
	 */
	if (cm.options.consumeShareLink) {
		var urlParams = $.deparam(window.location.search.substring(1));
		cm.options.consumeShareLink(cm, urlParams);
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
	"atom": "var"
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
			completionsFromStorage = require("yasgui-utils").storage.get(
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
 * Update transparency of buttons. Increase transparency when cursor is below buttons
 */

var updateButtonsTransparency = function(cm) {
	cm.cursor = $(".CodeMirror-cursor");
	if (cm.buttons && cm.buttons.is(":visible") && cm.cursor.length > 0) {
		if (elementsOverlap(cm.cursor, cm.buttons)) {
			cm.buttons.find("svg").attr("opacity", "0.2");
		} else {
			cm.buttons.find("svg").attr("opacity", "1.0");
		}
	}
};


var elementsOverlap = (function () {
    function getPositions( elem ) {
        var pos, width, height;
        pos = $( elem ).offset();
        width = $( elem ).width();
        height = $( elem ).height();
        return [ [ pos.left, pos.left + width ], [ pos.top, pos.top + height ] ];
    }

    function comparePositions( p1, p2 ) {
        var r1, r2;
        r1 = p1[0] < p2[0] ? p1 : p2;
        r2 = p1[0] < p2[0] ? p2 : p1;
        return r1[1] > r2[0] || r1[0] === r2[0];
    }

    return function ( a, b ) {
        var pos1 = getPositions( a ),
            pos2 = getPositions( b );
        return comparePositions( pos1[0], pos2[0] ) && comparePositions( pos1[1], pos2[1] );
    };
})();


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

var clearError = null;
var checkSyntax = function(cm, deepcheck) {
	
	cm.queryValid = true;
	if (clearError) {
		clearError();
		clearError = null;
	}
	cm.clearGutter("gutterErrorBar");
	
	var state = null;
	for (var l = 0; l < cm.lineCount(); ++l) {
		var precise = false;
		if (!cm.prevQueryValid) {
			// we don't want cached information in this case, otherwise the
			// previous error sign might still show up,
			// even though the syntax error might be gone already
			precise = true;
		}
		var token = cm.getTokenAt({
			line : l,
			ch : cm.getLine(l).length
		}, precise);
		var state = token.state;
		cm.queryType = state.queryType;
		if (state.OK == false) {
			if (!cm.options.syntaxErrorCheck) {
				//the library we use already marks everything as being an error. Overwrite this class attribute.
				$(cm.getWrapperElement).find(".sp-error").css("color", "black");
				//we don't want to gutter error, so return
				return;
			}
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
			cm.queryValid = false;
			break;
		}
	}
	cm.prevQueryValid = cm.queryValid;
	if (deepcheck) {
		if (state != null && state.stack != undefined) {
			var stack = state.stack, len = state.stack.length;
			// Because incremental parser doesn't receive end-of-input
			// it can't clear stack, so we have to check that whatever
			// is left on the stack is nillable
			if (len > 1)
				cm.queryValid = false;
			else if (len == 1) {
				if (stack[0] != "solutionModifier"
						&& stack[0] != "?limitOffsetClauses"
						&& stack[0] != "?offsetClause")
					cm.queryValid = false;
			}
		}
	}
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the YASQE object
$.extend(root, CodeMirror);

root.positionAbsoluteItems = function(cm) {
	var scrollBar = $(cm.getWrapperElement()).find(".CodeMirror-vscrollbar");
	var offset = 0;
	if (scrollBar.is(":visible")) {
		offset = scrollBar.outerWidth();
	}
	var completionNotification = $(cm.getWrapperElement()).find(".completionNotification");
	if (completionNotification.is(":visible")) completionNotification.css("right", offset);
	if (cm.buttons.is(":visible")) cm.buttons.css("right", offset);
};

/**
 * Create a share link
 * 
 * @method YASQE.createShareLink
 * @param {doc} YASQE document
 * @default {query: doc.getValue()}
 * @return object
 */
root.createShareLink = function(cm) {
	return {query: cm.getValue()};
};

/**
 * Consume the share link, by parsing the document URL for possible yasqe arguments, and setting the appropriate values in the YASQE doc
 * 
 * @method YASQE.consumeShareLink
 * @param {doc} YASQE document
 */
root.consumeShareLink = function(cm, urlParams) {
	if (urlParams.query) {
		cm.setValue(urlParams.query);
	}
};
root.drawButtons = function(cm) {
	cm.buttons = $("<div class='yasqe_buttons'></div>").appendTo($(cm.getWrapperElement()));
	
	if (cm.options.createShareLink) {
		
		var svgShare = $(require("yasgui-utils").imgs.getElement({id: "share", width: "30px", height: "30px"}));
		svgShare.click(function(event){
			event.stopPropagation();
			var popup = $("<div class='yasqe_sharePopup'></div>").appendTo(cm.buttons);
			$('html').click(function() {
				if (popup) popup.remove();
			});

			popup.click(function(event) {
				event.stopPropagation();
			});
			var textAreaLink = $("<textarea></textarea>").val(location.protocol + '//' + location.host + location.pathname + "?" + $.param(cm.options.createShareLink(cm)));
			
			textAreaLink.focus(function() {
			    var $this = $(this);
			    $this.select();

			    // Work around Chrome's little problem
			    $this.mouseup(function() {
			        // Prevent further mouseup intervention
			        $this.unbind("mouseup");
			        return false;
			    });
			});
			
			popup.empty().append(textAreaLink);
			var positions = svgShare.position();
			popup.css("top", (positions.top + svgShare.outerHeight()) + "px").css("left", ((positions.left + svgShare.outerWidth()) - popup.outerWidth()) + "px");
		})
		.addClass("yasqe_share")
		.attr("title", "Share your query")
		.appendTo(cm.buttons);
		
	}

	if (cm.options.sparql.showQueryButton) {
		var height = 40;
		var width = 40;
		$("<div class='yasqe_queryButton'></div>")
		 	.click(function(){
		 		if ($(this).hasClass("query_busy")) {
		 			if (cm.xhr) cm.xhr.abort();
		 			root.updateQueryButton(cm);
		 		} else {
		 			cm.query();
		 		}
		 	})
		 	.height(height)
		 	.width(width)
		 	.appendTo(cm.buttons);
		root.updateQueryButton(cm);
	}
	
};


var queryButtonIds = {
	"busy": "loader",
	"valid": "query",
	"error": "queryInvalid"
};

/**
 * Update the query button depending on current query status. If no query status is passed via the parameter, it auto-detects the current query status
 * 
 * @param {doc} YASQE document
 * @param status {string|null, "busy"|"valid"|"error"}
 */
root.updateQueryButton = function(cm, status) {
	var queryButton = $(cm.getWrapperElement()).find(".yasqe_queryButton");
	if (queryButton.length == 0) return;//no query button drawn
	
	//detect status
	if (!status) {
		status = "valid";
		if (cm.queryValid === false) status = "error";
	}
	if (status != cm.queryStatus && (status == "busy" || status=="valid" || status == "error")) {
		queryButton
			.empty()
			.removeClass (function (index, classNames) {
				return classNames.split(" ").filter(function(c) {
					//remove classname from previous status
				    return c.indexOf("query_") == 0;
				}).join(" ");
			})
			.addClass("query_" + status)
			.append(require("yasgui-utils").imgs.getElement({id: queryButtonIds[status], width: "100%", height: "100%"}));
		cm.queryStatus = status;
	}
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
 * Fetch all the used variables names from this query
 * 
 * @method YASQE.getAllVariableNames
 * @param {doc} YASQE document
 * @param token {object}
 * @returns variableNames {array}
 */

root.autocompleteVariables = function(cm, token) {
	if (token.trim().length == 0) return [];//nothing to autocomplete
	var distinctVars = {};
	//do this outside of codemirror. I expect jquery to be faster here (just finding dom elements with classnames)
	$(cm.getWrapperElement()).find(".cm-atom").each(function() {
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
			prefixArray.push(completeString);// the array we want to store in localstorage
		}
		
		prefixArray.sort();
		cm.storeBulkCompletions("prefixes", prefixArray);
	});
};
/**
 * Get accept header for this particular query. Get JSON for regular queries, and text/plain for update queries
 * 
 * @param doc {YASQE}
 * @method YASQE.getAcceptHeader
 */
root.getAcceptHeader = function(cm) {
	if (cm.getQueryMode() == "update") {
		return "text/plain";
	} else {
		return "application/sparql-results+json";
	}
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
		require("yasgui-utils").storage.set(storageId, cm.getValue(), "month");
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
	var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig: null);
	var config = (typeof callbackOrConfig == "object" ? callbackOrConfig : {});
	var queryMode = cm.getQueryMode();
	if (cm.options.sparql)
		config = $.extend({}, cm.options.sparql, config);

	if (!config.endpoint || config.endpoint.length == 0)
		return;// nothing to query!

	/**
	 * initialize ajax config
	 */
	var ajaxConfig = {
		url : (typeof config.endpoint == "function"? config.endpoint(cm): config.endpoint),
		type : (typeof config.requestMethod == "function"? config.requestMethod(cm): config.requestMethod),
		data : [{
			name : queryMode,
			value : cm.getValue()
		}],
		headers : {
			Accept : (typeof config.acceptHeader == "function"? config.acceptHeader(cm): config.acceptHeader),
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
		var argName = (queryMode == "query" ? "named-graph-uri": "using-named-graph-uri ");
		for (var i = 0; i < config.namedGraphs.length; i++)
			ajaxConfig.data.push({
				name : argName,
				value : config.namedGraphs[i]
			});
	}
	/**
	 * add default graphs to ajax config
	 */
	if (config.defaultGraphs && config.defaultGraphs.length > 0) {
		var argName = (queryMode == "query" ? "default-graph-uri": "using-graph-uri ");
		for (var i = 0; i < config.defaultGraphs.length; i++)
			ajaxConfig.data.push({
				name : argName,
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
	if (config.args && config.args.length > 0) $.merge(ajaxConfig.data, config.args);
	root.updateQueryButton(cm, "busy");
	
	var updateQueryButton = function() {
		root.updateQueryButton(cm);
	};
	//Make sure the query button is updated again on complete
	if (ajaxConfig.complete) {
		var customComplete = ajaxConfig.complete;
		ajaxConfig.complete = function(arg1, arg2) {
			customComplete(arg1, arg2);
			updateQueryButton();
		};
	} else {
		ajaxConfig.complete = updateQueryButton;
	}
	cm.xhr = $.ajax(ajaxConfig);
};
var completionNotifications = {};

/**
 * Show notification
 * 
 * @param doc {YASQE}
 * @param autocompletionType {string}
 * @method YASQE.showCompletionNotification
 */
root.showCompletionNotification = function(cm, type) {
	//only draw when the user needs to use a keypress to summon autocompletions
	if (!cm.options.autocompletions[type].autoshow) {
		if (!completionNotifications[type]) completionNotifications[type] = $("<div class='completionNotification'></div>");
		completionNotifications[type]
			.show()
			.text("Press " + (navigator.userAgent.indexOf('Mac OS X') != -1? "CMD": "CTRL") + " - <spacebar> to autocomplete")
			.appendTo($(cm.getWrapperElement()));
	}
};

/**
 * Hide completion notification
 * 
 * @param doc {YASQE}
 * @param autocompletionType {string}
 * @method YASQE.hideCompletionNotification
 */
root.hideCompletionNotification = function(cm, type) {
	if (completionNotifications[type]) {
		completionNotifications[type].hide();
	}
};



root.autoComplete = function(cm, fromAutoShow) {
	if (cm.somethingSelected())
		return;
	if (!cm.options.autocompletions)
		return;
	var tryHintType = function(type) {
		if (fromAutoShow // from autoShow, i.e. this gets called each time the editor content changes
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
		var wrappedHintCallback = function(cm, callback) {
			return getCompletionHintsObject(cm, type, callback);
		};
		var result = root.showHint(cm, wrappedHintCallback, hintConfig);
		return true;
	};
	for ( var type in cm.options.autocompletions) {
		if (!cm.options.autocompletions[type].isValidCompletionPosition) continue; //no way to check whether we are in a valid position
		
		if (!cm.options.autocompletions[type].isValidCompletionPosition(cm)) {
			//if needed, fire handler for when we are -not- in valid completion position
			if (cm.options.autocompletions[type].handlers && cm.options.autocompletions[type].handlers.invalidPosition) {
				cm.options.autocompletions[type].handlers.invalidPosition(cm, type);
			}
			//not in a valid position, so continue to next completion candidate type
			continue;
		}
		// run valid position handler, if there is one (if it returns false, stop the autocompletion!)
		if (cm.options.autocompletions[type].handlers && cm.options.autocompletions[type].handlers.validPosition) {
			if (cm.options.autocompletions[type].handlers.validPosition(cm, type) === false)
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
 * When typing a query, this query is sometimes syntactically invalid, causing
 * the current tokens to be incorrect This causes problem for autocompletion.
 * http://bla might result in two tokens: http:// and bla. We'll want to combine
 * these
 * 
 * @param yasqe {doc}
 * @param token {object}
 * @param cursor {object}
 * @return token {object}
 * @method YASQE.getCompleteToken
 */
root.getCompleteToken = function(cm, token, cur) {
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
	if (
			prevToken.type != null && prevToken.type != "ws"
			&& token.type != null && token.type != "ws"
		) {
		token.start = prevToken.start;
		token.string = prevToken.string + token.string;
		return root.getCompleteToken(cm, token, {
			line : cur.line,
			ch : prevToken.start
		});// recursively, might have multiple tokens which it should include
	} else if (token.type != null && token.type == "ws") {
		//always keep 1 char of whitespace between tokens. Otherwise, autocompletions might end up next to the previous node, without whitespace between them
		token.start = token.start + 1;
		token.string = token.string.substring(1);
		return token;
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
root.fetchFromLov = function(cm, partialToken, type, callback) {
	
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
		.append(require("yasgui-utils").imgs.getElement({id: "loader", width: "18px", height: "18px"}).css("vertical-align", "middle"));
	}
	doRequests();
};
/**
 * function which fires after the user selects a completion. this function checks whether we actually need to store this one (if completion is same as current token, don't do anything)
 */
var selectHint = function(cm, data, completion) {
	if (completion.text != cm.getTokenAt(cm.getCursor()).string) {
		cm.replaceRange(completion.text, data.from, data.to);
	}
};

/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 */
var preprocessResourceTokenForCompletion = function(cm, token) {
	var queryPrefixes = getPrefixesFromQuery(cm);
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

var postprocessResourceTokenForCompletion = function(cm, token, suggestedString) {
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
var preprocessPrefixTokenForCompletion = function(cm, token) {
	var previousToken = getPreviousNonWsToken(cm, cm.getCursor().line, token);
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
var getSuggestionsFromToken = function(cm, type, partialToken) {
	var suggestions = [];
	if (tries[type]) {
		suggestions = tries[type].autoComplete(partialToken.string);
	} else if (typeof cm.options.autocompletions[type].get == "function" && cm.options.autocompletions[type].async == false) {
		suggestions = cm.options.autocompletions[type].get(cm, partialToken.string, type);
	} else if (typeof cm.options.autocompletions[type].get == "object") {
		var partialTokenLength = partialToken.string.length;
		for (var i = 0; i < cm.options.autocompletions[type].get.length; i++) {
			var completion = cm.options.autocompletions[type].get[i];
			if (completion.slice(0, partialTokenLength) == partialToken.string) {
				suggestions.push(completion);
			}
		}
	}
	return getSuggestionsAsHintObject(cm, suggestions, type, partialToken);
	
};

/**
 *  get our array of suggestions (strings) in the codemirror hint format
 */
var getSuggestionsAsHintObject = function(cm, suggestions, type, token) {
	var hintList = [];
	for (var i = 0; i < suggestions.length; i++) {
		var suggestedString = suggestions[i];
		if (cm.options.autocompletions[type].postProcessToken) {
			suggestedString = cm.options.autocompletions[type].postProcessToken(cm, token, suggestedString);
		}
		hintList.push({
			text : suggestedString,
			displayText : suggestedString,
			hint : selectHint,
			className : type + "Hint"
		});
	}
	
	var cur = cm.getCursor();
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
	if (cm.options.autocompletions[type].handlers) {
		for ( var handler in cm.options.autocompletions[type].handlers) {
			if (cm.options.autocompletions[type].handlers[handler]) 
				root.on(returnObj, handler, cm.options.autocompletions[type].handlers[handler]);
		}
	}
	return returnObj;
};


var getCompletionHintsObject = function(cm, type, callback) {
	var token = root.getCompleteToken(cm);
	if (cm.options.autocompletions[type].preProcessToken) {
		token = cm.options.autocompletions[type].preProcessToken(cm, token, type);
	}
	
	if (token) {
		// use custom completionhint function, to avoid reaching a loop when the
		// completionhint is the same as the current token
		// regular behaviour would keep changing the codemirror dom, hence
		// constantly calling this callback
		if (cm.options.autocompletions[type].async) {
			var wrappedCallback = function(suggestions) {
				callback(getSuggestionsAsHintObject(cm, suggestions, type, token));
			};
			cm.options.autocompletions[type].get(cm, token, type, wrappedCallback);
		} else {
			return getSuggestionsFromToken(cm, type, token);

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
	syntaxErrorCheck: true,
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
	 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
	 * By default, this feature is enabled, and the only the query value is appended to the link.
	 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
	 * 
	 * @property createShareLink
	 * @type function
	 * @default YASQE.createShareLink
	 */
	createShareLink: root.createShareLink,
	
	/**
	 * Consume links shared by others, by checking the url for arguments coming from a query link. Defaults by only checking the 'query=' argument in the url
	 * 
	 * @property consumeShareLink
	 * @type function
	 * @default YASQE.consumeShareLink
	 */
	consumeShareLink: root.consumeShareLink,
	
	
	
	
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
	 * Settings for querying sparql endpoints
	 * 
	 * @property sparql
	 * @type object
	 */
	sparql : {
		/**
		 * Show a query button. You don't like it? Then disable this setting, and create your button which calls the query() function of the yasqe document
		 * 
		 * @property sparql.showQueryButton
		 * @type boolean
		 * @default false
		 */
		showQueryButton: false,
		
		/**f
		 * Endpoint to query
		 * 
		 * @property sparql.endpoint
		 * @type String|function
		 * @default "http://dbpedia.org/sparql"
		 */
		endpoint : "http://dbpedia.org/sparql",
		/**
		 * Request method via which to access SPARQL endpoint
		 * 
		 * @property sparql.requestMethod
		 * @type String|function
		 * @default "POST"
		 */
		requestMethod : "POST",
		/**
		 * Query accept header
		 * 
		 * @property sparql.acceptHeader
		 * @type String|function
		 * @default YASQE.getAcceptHeader
		 */
		acceptHeader : root.getAcceptHeader,
		
		/**
		 * Named graphs to query.
		 * 
		 * @property sparql.namedGraphs
		 * @type array
		 * @default []
		 */
		namedGraphs : [],
		/**
		 * Default graphs to query.
		 * 
		 * @property sparql.defaultGraphs
		 * @type array
		 * @default []
		 */
		defaultGraphs : [],

		/**
		 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
		 * 
		 * @property sparql.args
		 * @type array
		 * @default []
		 */
		args : [],

		/**
		 * Additional request headers
		 * 
		 * @property sparql.headers
		 * @type array
		 * @default {}
		 */
		headers : {},

		/**
		 * Set of ajax handlers
		 * 
		 * @property sparql.handlers
		 * @type object
		 */
		handlers : {
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property sparql.handlers.beforeSend
			 * @type function
			 * @default null
			 */
			beforeSend : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property sparql.handlers.complete
			 * @type function
			 * @default null
			 */
			complete : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property sparql.handlers.error
			 * @type function
			 * @default null
			 */
			error : null,
			/**
			 * See https://api.jquery.com/jQuery.ajax/ for more information on
			 * these handlers, and their arguments.
			 * 
			 * @property sparql.handlers.success
			 * @type function
			 * @default null
			 */
			success : null
		}
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
			 * Check whether the cursor is in a proper position for this autocompletion.
			 * 
			 * @property autocompletions.prefixes.isValidCompletionPosition
			 * @type function
			 * @param yasqe doc
			 * @return boolean
			 */
			isValidCompletionPosition : function(cm) {
				var cur = cm.getCursor(), token = cm.getTokenAt(cur);

				// not at end of line
				if (cm.getLine(cur.line).length > cur.ch)
					return false;

				if (token.type != "ws") {
					// we want to complete token, e.g. when the prefix starts with an a
					// (treated as a token in itself..)
					// but we to avoid including the PREFIX tag. So when we have just
					// typed a space after the prefix tag, don't get the complete token
					token = root.getCompleteToken(cm);
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
			},
			    
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["rdf: <http://....>"]
			 * 
			 * @property autocompletions.prefixes.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param token {object|string} When bulk is disabled, use this token to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromPrefixCc)
			 */
			get : root.fetchFromPrefixCc,
			
			/**
			 * Preprocesses the codemirror token before matching it with our autocompletions list.
			 * Use this for e.g. autocompleting prefixed resources when your autocompletion list contains only full-length URIs
			 * I.e., foaf:name -> http://xmlns.com/foaf/0.1/name
			 * 
			 * @property autocompletions.properties.preProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @return token {object} Return the same token (possibly with more data added to it, which you can use in the postProcessing step)
			 * @default function
			 */
			preProcessToken: preprocessPrefixTokenForCompletion,
			/**
			 * Postprocesses the autocompletion suggestion.
			 * Use this for e.g. returning a prefixed URI based on a full-length URI suggestion
			 * I.e., http://xmlns.com/foaf/0.1/name -> foaf:name
			 * 
			 * @property autocompletions.properties.postProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @param suggestion {string} The suggestion which you are post processing
			 * @return post-processed suggestion {string}
			 * @default null
			 */
			postProcessToken: null,
			
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
			 * function) whenever you have an autocompletion list that is static, and that easily
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
			 * only works when completions are not fetched asynchronously
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
				 * Fires when a codemirror change occurs in a position where we
				 * can -not- show this particular type of autocompletion
				 * 
				 * @property autocompletions.classes.handlers.invalidPosition
				 * @type function
				 * @default null
				 */
				invalidPosition : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.classes.handlers.showHint
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
			 * Check whether the cursor is in a proper position for this autocompletion.
			 * 
			 * @property autocompletions.properties.isValidCompletionPosition
			 * @type function
			 * @param yasqe doc
			 * @return boolean
			 */
			isValidCompletionPosition : function(cm) {
				
				var token = root.getCompleteToken(cm);
				if (token.string.length == 0) 
					return false; //we want -something- to autocomplete
				if (token.string.indexOf("?") == 0)
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
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["http://...",....]
			 * 
			 * @property autocompletions.properties.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param token {object|string} When bulk is disabled, use this token to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromLov)
			 */
			get : root.fetchFromLov,
			/**
			 * Preprocesses the codemirror token before matching it with our autocompletions list.
			 * Use this for e.g. autocompleting prefixed resources when your autocompletion list contains only full-length URIs
			 * I.e., foaf:name -> http://xmlns.com/foaf/0.1/name
			 * 
			 * @property autocompletions.properties.preProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @return token {object} Return the same token (possibly with more data added to it, which you can use in the postProcessing step)
			 * @default function
			 */
			preProcessToken: preprocessResourceTokenForCompletion,
			/**
			 * Postprocesses the autocompletion suggestion.
			 * Use this for e.g. returning a prefixed URI based on a full-length URI suggestion
			 * I.e., http://xmlns.com/foaf/0.1/name -> foaf:name
			 * 
			 * @property autocompletions.properties.postProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @param suggestion {string} The suggestion which you are post processing
			 * @return post-processed suggestion {string}
			 * @default function
			 */
			postProcessToken: postprocessResourceTokenForCompletion,

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
			 * to the get() function) whenever you have an autocompletion list that is static, and 
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
			 * only works when completions are not fetched asynchronously
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
				 * @property autocompletions.properties.handlers.validPosition
				 * @type function
				 * @default YASQE.showCompletionNotification
				 */
				validPosition : root.showCompletionNotification,
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can -not- show this particular type of autocompletion
				 * 
				 * @property autocompletions.properties.handlers.invalidPosition
				 * @type function
				 * @default YASQE.hideCompletionNotification
				 */
				invalidPosition : root.hideCompletionNotification,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.properties.handlers.shown
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
				 * @property autocompletions.properties.handlers.pick
				 * @type function
				 * @default null
				 */
				pick : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.properties.handlers.close
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
			 * Check whether the cursor is in a proper position for this autocompletion.
			 * 
			 * @property autocompletions.classes.isValidCompletionPosition
			 * @type function
			 * @param yasqe doc
			 * @return boolean
			 */
			isValidCompletionPosition : function(cm) {
				var token = root.getCompleteToken(cm);
				if (token.string.indexOf("?") == 0)
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
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["http://...",....]
			 * 
			 * @property autocompletions.classes.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param token {object|string} When bulk is disabled, use this token to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.fetchFromLov)
			 */
			get : root.fetchFromLov,
			
			/**
			 * Preprocesses the codemirror token before matching it with our autocompletions list.
			 * Use this for e.g. autocompleting prefixed resources when your autocompletion list contains only full-length URIs
			 * I.e., foaf:name -> http://xmlns.com/foaf/0.1/name
			 * 
			 * @property autocompletions.properties.preProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @return token {object} Return the same token (possibly with more data added to it, which you can use in the postProcessing step)
			 * @default function
			 */
			preProcessToken: preprocessResourceTokenForCompletion,
			/**
			 * Postprocesses the autocompletion suggestion.
			 * Use this for e.g. returning a prefixed URI based on a full-length URI suggestion
			 * I.e., http://xmlns.com/foaf/0.1/name -> foaf:name
			 * 
			 * @property autocompletions.properties.postProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @param suggestion {string} The suggestion which you are post processing
			 * @return post-processed suggestion {string}
			 * @default function
			 */
			postProcessToken: postprocessResourceTokenForCompletion,
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
			 * function) whenever you have an autocompletion list that is static, and that easily
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
			 * only works when completions are not fetched asynchronously
			 * 
			 * @property autocompletions.classes.autoShow
			 * @type boolean
			 * @default false
			 */
			autoShow : false,
			/**
			 * Automatically store autocompletions in localstorage (only works when 'bulk' is set to true)
			 * This is particularly useful when the get() function is an expensive ajax
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
				 * @default YASQE.showCompletionNotification
				 */
				validPosition : root.showCompletionNotification,
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can -not- show this particular type of autocompletion
				 * 
				 * @property autocompletions.classes.handlers.invalidPosition
				 * @type function
				 * @default YASQE.hideCompletionNotification
				 */
				invalidPosition : root.hideCompletionNotification,
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
		 * Variable names autocompletion settings
		 * 
		 * @property autocompletions.properties
		 * @type object
		 */
		variableNames : {
			/**
			 * Check whether the cursor is in a proper position for this autocompletion.
			 * 
			 * @property autocompletions.variableNames.isValidCompletionPosition
			 * @type function
			 * @param yasqe {doc}
			 * @return boolean
			 */
			isValidCompletionPosition : function(cm) {
				var token = cm.getTokenAt(cm.getCursor());
				if (token.type != "ws") {
					token = root.getCompleteToken(cm, token);
					if (token && token.string.indexOf("?") == 0) {
						return true;
					}
				}
				return false;
			},
			/**
			 * Get the autocompletions. Either a function which returns an
			 * array, or an actual array. The array should be in the form ["http://...",....]
			 * 
			 * @property autocompletions.variableNames.get
			 * @type function|array
			 * @param doc {YASQE}
			 * @param token {object|string} When bulk is disabled, use this token to autocomplete
			 * @param completionType {string} what type of autocompletion we try to attempt. Classes, properties, or prefixes)
			 * @param callback {function} In case async is enabled, use this callback
			 * @default function (YASQE.autocompleteVariables)
			 */
			get : root.autocompleteVariables,
						
			/**
			 * Preprocesses the codemirror token before matching it with our autocompletions list.
			 * Use this for e.g. autocompleting prefixed resources when your autocompletion list contains only full-length URIs
			 * I.e., foaf:name -> http://xmlns.com/foaf/0.1/name
			 * 
			 * @property autocompletions.variableNames.preProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @return token {object} Return the same token (possibly with more data added to it, which you can use in the postProcessing step)
			 * @default null
			 */
			preProcessToken: null,
			/**
			 * Postprocesses the autocompletion suggestion.
			 * Use this for e.g. returning a prefixed URI based on a full-length URI suggestion
			 * I.e., http://xmlns.com/foaf/0.1/name -> foaf:name
			 * 
			 * @property autocompletions.variableNames.postProcessToken
			 * @type function
			 * @param doc {YASQE}
			 * @param token {object} The CodeMirror token, including the position of this token in the query, as well as the actual string
			 * @param suggestion {string} The suggestion which you are post processing
			 * @return post-processed suggestion {string}
			 * @default null
			 */
			postProcessToken: null,
			/**
			 * The get function is asynchronous
			 * 
			 * @property autocompletions.variableNames.async
			 * @type boolean
			 * @default false
			 */
			async : false,
			/**
			 * Use bulk loading of variableNames: all variable names are retrieved
			 * onLoad using the get() function. Alternatively, disable bulk
			 * loading, to call the get() function whenever a token needs
			 * autocompletion (in this case, the completion token is passed on
			 * to the get() function) whenever you have an autocompletion list that is static, and 
			 * that easily fits in memory, we advice you to enable bulk for
			 * performance reasons (especially as we store the autocompletions
			 * in a trie)
			 * 
			 * @property autocompletions.variableNames.bulk
			 * @type boolean
			 * @default false
			 */
			bulk : false,
			/**
			 * Auto-show the autocompletion dialog. Disabling this requires the
			 * user to press [ctrl|cmd]-space to summon the dialog. Note: this
			 * only works when completions are not fetched asynchronously
			 * 
			 * @property autocompletions.variableNames.autoShow
			 * @type boolean
			 * @default false
			 */
			autoShow : true,
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
			 * @property autocompletions.variableNames.persistent
			 * @type string|function
			 * @default null
			 */
			persistent : null,
			/**
			 * A set of handlers. Most, taken from the CodeMirror showhint
			 * plugin: http://codemirror.net/doc/manual.html#addon_show-hint
			 * 
			 * @property autocompletions.variableNames.handlers
			 * @type object
			 */
			handlers : {
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can show this particular type of autocompletion
				 * 
				 * @property autocompletions.variableNames.handlers.validPosition
				 * @type function
				 * @default null
				 */
				validPosition : null,
				/**
				 * Fires when a codemirror change occurs in a position where we
				 * can -not- show this particular type of autocompletion
				 * 
				 * @property autocompletions.variableNames.handlers.invalidPosition
				 * @type function
				 * @default null
				 */
				invalidPosition : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.variableNames.handlers.shown
				 * @type function
				 * @default null
				 */
				shown : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.variableNames.handlers.select
				 * @type function
				 * @default null
				 */
				select : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.variableNames.handlers.pick
				 * @type function
				 * @default null
				 */
				pick : null,
				/**
				 * See http://codemirror.net/doc/manual.html#addon_show-hint
				 * 
				 * @property autocompletions.variableNames.handlers.close
				 * @type function
				 * @default null
				 */
				close : null,
			}
		},
	}
});
root.version = {
	"CodeMirror" : CodeMirror.version,
	"YASQE" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": require("yasgui-utils").version
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/deparam.js":2,"../lib/flint.js":3,"../lib/trie.js":4,"../package.json":15,"codemirror/addon/edit/matchbrackets.js":5,"codemirror/addon/hint/show-hint.js":6,"codemirror/addon/runmode/runmode.js":7,"codemirror/addon/search/searchcursor.js":8,"yasgui-utils":13}],2:[function(require,module,exports){
(function (global){
/*
  jQuery deparam is an extraction of the deparam method from Ben Alman's jQuery BBQ
  http://benalman.com/projects/jquery-bbq-plugin/
*/
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
$.deparam = function (params, coerce) {
var obj = {},
	coerce_types = { 'true': !0, 'false': !1, 'null': null };
  
// Iterate over all name=value pairs.
$.each(params.replace(/\+/g, ' ').split('&'), function (j,v) {
  var param = v.split('='),
	  key = decodeURIComponent(param[0]),
	  val,
	  cur = obj,
	  i = 0,
		
	  // If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
	  // into its component parts.
	  keys = key.split(']['),
	  keys_last = keys.length - 1;
	
  // If the first keys part contains [ and the last ends with ], then []
  // are correctly balanced.
  if (/\[/.test(keys[0]) && /\]$/.test(keys[keys_last])) {
	// Remove the trailing ] from the last keys part.
	keys[keys_last] = keys[keys_last].replace(/\]$/, '');
	  
	// Split first keys part into two parts on the [ and add them back onto
	// the beginning of the keys array.
	keys = keys.shift().split('[').concat(keys);
	  
	keys_last = keys.length - 1;
  } else {
	// Basic 'foo' style key.
	keys_last = 0;
  }
	
  // Are we dealing with a name=value pair, or just a name?
  if (param.length === 2) {
	val = decodeURIComponent(param[1]);
	  
	// Coerce values.
	if (coerce) {
	  val = val && !isNaN(val)              ? +val              // number
		  : val === 'undefined'             ? undefined         // undefined
		  : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
		  : val;                                                // string
	}
	  
	if ( keys_last ) {
	  // Complex key, build deep object structure based on a few rules:
	  // * The 'cur' pointer starts at the object top-level.
	  // * [] = array push (n is set to array length), [n] = array if n is 
	  //   numeric, otherwise object.
	  // * If at the last keys part, set the value.
	  // * For each keys part, if the current level is undefined create an
	  //   object or array based on the type of the next keys part.
	  // * Move the 'cur' pointer to the next level.
	  // * Rinse & repeat.
	  for (; i <= keys_last; i++) {
		key = keys[i] === '' ? cur.length : keys[i];
		cur = cur[key] = i < keys_last
		  ? cur[key] || (keys[i+1] && isNaN(keys[i+1]) ? {} : [])
		  : val;
	  }
		
	} else {
	  // Simple key, even simpler rules, since only scalars and shallow
	  // arrays are allowed.
		
	  if ($.isArray(obj[key])) {
		// val is already an array, so push on the next value.
		obj[key].push( val );
		  
	  } else if (obj[key] !== undefined) {
		// val isn't an array, but since a second value has been specified,
		// convert val into an array.
		obj[key] = [obj[key], val];
		  
	  } else {
		// val is a scalar.
		obj[key] = val;
	  }
	}
	  
  } else if (key) {
	// No value was defined, so set something meaningful.
	obj[key] = coerce
	  ? undefined
	  : '';
  }
});
  
return obj;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
(function (global){
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  
	CodeMirror.defineMode("sparql11", function(config, parserConfig) {
	
		var indentUnit = config.indentUnit;
	
		// ll1_table is auto-generated from grammar
		// - do not edit manually
		// %%%table%%%
	var ll1_table=
	{
	  "*[&&,valueLogical]" : {
	     "&&": ["[&&,valueLogical]","*[&&,valueLogical]"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     ";": []}, 
	  "*[,,expression]" : {
	     ",": ["[,,expression]","*[,,expression]"], 
	     ")": []}, 
	  "*[,,objectPath]" : {
	     ",": ["[,,objectPath]","*[,,objectPath]"], 
	     ".": [], 
	     ";": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[,,object]" : {
	     ",": ["[,,object]","*[,,object]"], 
	     ".": [], 
	     ";": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "*[/,pathEltOrInverse]" : {
	     "/": ["[/,pathEltOrInverse]","*[/,pathEltOrInverse]"], 
	     "|": [], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "*[;,?[or([verbPath,verbSimple]),objectList]]" : {
	     ";": ["[;,?[or([verbPath,verbSimple]),objectList]]","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     ".": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[;,?[verb,objectList]]" : {
	     ";": ["[;,?[verb,objectList]]","*[;,?[verb,objectList]]"], 
	     ".": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "*[UNION,groupGraphPattern]" : {
	     "UNION": ["[UNION,groupGraphPattern]","*[UNION,groupGraphPattern]"], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     ".": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "*[graphPatternNotTriples,?.,?triplesBlock]" : {
	     "{": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "OPTIONAL": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "MINUS": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "GRAPH": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "SERVICE": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FILTER": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BIND": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VALUES": ["[graphPatternNotTriples,?.,?triplesBlock]","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "}": []}, 
	  "*[quadsNotTriples,?.,?triplesTemplate]" : {
	     "GRAPH": ["[quadsNotTriples,?.,?triplesTemplate]","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "}": []}, 
	  "*[|,pathOneInPropertySet]" : {
	     "|": ["[|,pathOneInPropertySet]","*[|,pathOneInPropertySet]"], 
	     ")": []}, 
	  "*[|,pathSequence]" : {
	     "|": ["[|,pathSequence]","*[|,pathSequence]"], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "*[||,conditionalAndExpression]" : {
	     "||": ["[||,conditionalAndExpression]","*[||,conditionalAndExpression]"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     ";": []}, 
	  "*dataBlockValue" : {
	     "UNDEF": ["dataBlockValue","*dataBlockValue"], 
	     "IRI_REF": ["dataBlockValue","*dataBlockValue"], 
	     "TRUE": ["dataBlockValue","*dataBlockValue"], 
	     "FALSE": ["dataBlockValue","*dataBlockValue"], 
	     "PNAME_LN": ["dataBlockValue","*dataBlockValue"], 
	     "PNAME_NS": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL1": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL2": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL_LONG1": ["dataBlockValue","*dataBlockValue"], 
	     "STRING_LITERAL_LONG2": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE_POSITIVE": ["dataBlockValue","*dataBlockValue"], 
	     "INTEGER_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DECIMAL_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "DOUBLE_NEGATIVE": ["dataBlockValue","*dataBlockValue"], 
	     "}": [], 
	     ")": []}, 
	  "*datasetClause" : {
	     "FROM": ["datasetClause","*datasetClause"], 
	     "WHERE": [], 
	     "{": []}, 
	  "*describeDatasetClause" : {
	     "FROM": ["describeDatasetClause","*describeDatasetClause"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "WHERE": [], 
	     "{": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "*graphNode" : {
	     "(": ["graphNode","*graphNode"], 
	     "[": ["graphNode","*graphNode"], 
	     "VAR1": ["graphNode","*graphNode"], 
	     "VAR2": ["graphNode","*graphNode"], 
	     "NIL": ["graphNode","*graphNode"], 
	     "IRI_REF": ["graphNode","*graphNode"], 
	     "TRUE": ["graphNode","*graphNode"], 
	     "FALSE": ["graphNode","*graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode","*graphNode"], 
	     "ANON": ["graphNode","*graphNode"], 
	     "PNAME_LN": ["graphNode","*graphNode"], 
	     "PNAME_NS": ["graphNode","*graphNode"], 
	     "STRING_LITERAL1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL2": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode","*graphNode"], 
	     "INTEGER": ["graphNode","*graphNode"], 
	     "DECIMAL": ["graphNode","*graphNode"], 
	     "DOUBLE": ["graphNode","*graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode","*graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode","*graphNode"], 
	     ")": []}, 
	  "*graphNodePath" : {
	     "(": ["graphNodePath","*graphNodePath"], 
	     "[": ["graphNodePath","*graphNodePath"], 
	     "VAR1": ["graphNodePath","*graphNodePath"], 
	     "VAR2": ["graphNodePath","*graphNodePath"], 
	     "NIL": ["graphNodePath","*graphNodePath"], 
	     "IRI_REF": ["graphNodePath","*graphNodePath"], 
	     "TRUE": ["graphNodePath","*graphNodePath"], 
	     "FALSE": ["graphNodePath","*graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath","*graphNodePath"], 
	     "ANON": ["graphNodePath","*graphNodePath"], 
	     "PNAME_LN": ["graphNodePath","*graphNodePath"], 
	     "PNAME_NS": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath","*graphNodePath"], 
	     "INTEGER": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     ")": []}, 
	  "*groupCondition" : {
	     "(": ["groupCondition","*groupCondition"], 
	     "STR": ["groupCondition","*groupCondition"], 
	     "LANG": ["groupCondition","*groupCondition"], 
	     "LANGMATCHES": ["groupCondition","*groupCondition"], 
	     "DATATYPE": ["groupCondition","*groupCondition"], 
	     "BOUND": ["groupCondition","*groupCondition"], 
	     "IRI": ["groupCondition","*groupCondition"], 
	     "URI": ["groupCondition","*groupCondition"], 
	     "BNODE": ["groupCondition","*groupCondition"], 
	     "RAND": ["groupCondition","*groupCondition"], 
	     "ABS": ["groupCondition","*groupCondition"], 
	     "CEIL": ["groupCondition","*groupCondition"], 
	     "FLOOR": ["groupCondition","*groupCondition"], 
	     "ROUND": ["groupCondition","*groupCondition"], 
	     "CONCAT": ["groupCondition","*groupCondition"], 
	     "STRLEN": ["groupCondition","*groupCondition"], 
	     "UCASE": ["groupCondition","*groupCondition"], 
	     "LCASE": ["groupCondition","*groupCondition"], 
	     "ENCODE_FOR_URI": ["groupCondition","*groupCondition"], 
	     "CONTAINS": ["groupCondition","*groupCondition"], 
	     "STRSTARTS": ["groupCondition","*groupCondition"], 
	     "STRENDS": ["groupCondition","*groupCondition"], 
	     "STRBEFORE": ["groupCondition","*groupCondition"], 
	     "STRAFTER": ["groupCondition","*groupCondition"], 
	     "YEAR": ["groupCondition","*groupCondition"], 
	     "MONTH": ["groupCondition","*groupCondition"], 
	     "DAY": ["groupCondition","*groupCondition"], 
	     "HOURS": ["groupCondition","*groupCondition"], 
	     "MINUTES": ["groupCondition","*groupCondition"], 
	     "SECONDS": ["groupCondition","*groupCondition"], 
	     "TIMEZONE": ["groupCondition","*groupCondition"], 
	     "TZ": ["groupCondition","*groupCondition"], 
	     "NOW": ["groupCondition","*groupCondition"], 
	     "UUID": ["groupCondition","*groupCondition"], 
	     "STRUUID": ["groupCondition","*groupCondition"], 
	     "MD5": ["groupCondition","*groupCondition"], 
	     "SHA1": ["groupCondition","*groupCondition"], 
	     "SHA256": ["groupCondition","*groupCondition"], 
	     "SHA384": ["groupCondition","*groupCondition"], 
	     "SHA512": ["groupCondition","*groupCondition"], 
	     "COALESCE": ["groupCondition","*groupCondition"], 
	     "IF": ["groupCondition","*groupCondition"], 
	     "STRLANG": ["groupCondition","*groupCondition"], 
	     "STRDT": ["groupCondition","*groupCondition"], 
	     "SAMETERM": ["groupCondition","*groupCondition"], 
	     "ISIRI": ["groupCondition","*groupCondition"], 
	     "ISURI": ["groupCondition","*groupCondition"], 
	     "ISBLANK": ["groupCondition","*groupCondition"], 
	     "ISLITERAL": ["groupCondition","*groupCondition"], 
	     "ISNUMERIC": ["groupCondition","*groupCondition"], 
	     "VAR1": ["groupCondition","*groupCondition"], 
	     "VAR2": ["groupCondition","*groupCondition"], 
	     "SUBSTR": ["groupCondition","*groupCondition"], 
	     "REPLACE": ["groupCondition","*groupCondition"], 
	     "REGEX": ["groupCondition","*groupCondition"], 
	     "EXISTS": ["groupCondition","*groupCondition"], 
	     "NOT": ["groupCondition","*groupCondition"], 
	     "IRI_REF": ["groupCondition","*groupCondition"], 
	     "PNAME_LN": ["groupCondition","*groupCondition"], 
	     "PNAME_NS": ["groupCondition","*groupCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "$": [], 
	     "}": []}, 
	  "*havingCondition" : {
	     "(": ["havingCondition","*havingCondition"], 
	     "STR": ["havingCondition","*havingCondition"], 
	     "LANG": ["havingCondition","*havingCondition"], 
	     "LANGMATCHES": ["havingCondition","*havingCondition"], 
	     "DATATYPE": ["havingCondition","*havingCondition"], 
	     "BOUND": ["havingCondition","*havingCondition"], 
	     "IRI": ["havingCondition","*havingCondition"], 
	     "URI": ["havingCondition","*havingCondition"], 
	     "BNODE": ["havingCondition","*havingCondition"], 
	     "RAND": ["havingCondition","*havingCondition"], 
	     "ABS": ["havingCondition","*havingCondition"], 
	     "CEIL": ["havingCondition","*havingCondition"], 
	     "FLOOR": ["havingCondition","*havingCondition"], 
	     "ROUND": ["havingCondition","*havingCondition"], 
	     "CONCAT": ["havingCondition","*havingCondition"], 
	     "STRLEN": ["havingCondition","*havingCondition"], 
	     "UCASE": ["havingCondition","*havingCondition"], 
	     "LCASE": ["havingCondition","*havingCondition"], 
	     "ENCODE_FOR_URI": ["havingCondition","*havingCondition"], 
	     "CONTAINS": ["havingCondition","*havingCondition"], 
	     "STRSTARTS": ["havingCondition","*havingCondition"], 
	     "STRENDS": ["havingCondition","*havingCondition"], 
	     "STRBEFORE": ["havingCondition","*havingCondition"], 
	     "STRAFTER": ["havingCondition","*havingCondition"], 
	     "YEAR": ["havingCondition","*havingCondition"], 
	     "MONTH": ["havingCondition","*havingCondition"], 
	     "DAY": ["havingCondition","*havingCondition"], 
	     "HOURS": ["havingCondition","*havingCondition"], 
	     "MINUTES": ["havingCondition","*havingCondition"], 
	     "SECONDS": ["havingCondition","*havingCondition"], 
	     "TIMEZONE": ["havingCondition","*havingCondition"], 
	     "TZ": ["havingCondition","*havingCondition"], 
	     "NOW": ["havingCondition","*havingCondition"], 
	     "UUID": ["havingCondition","*havingCondition"], 
	     "STRUUID": ["havingCondition","*havingCondition"], 
	     "MD5": ["havingCondition","*havingCondition"], 
	     "SHA1": ["havingCondition","*havingCondition"], 
	     "SHA256": ["havingCondition","*havingCondition"], 
	     "SHA384": ["havingCondition","*havingCondition"], 
	     "SHA512": ["havingCondition","*havingCondition"], 
	     "COALESCE": ["havingCondition","*havingCondition"], 
	     "IF": ["havingCondition","*havingCondition"], 
	     "STRLANG": ["havingCondition","*havingCondition"], 
	     "STRDT": ["havingCondition","*havingCondition"], 
	     "SAMETERM": ["havingCondition","*havingCondition"], 
	     "ISIRI": ["havingCondition","*havingCondition"], 
	     "ISURI": ["havingCondition","*havingCondition"], 
	     "ISBLANK": ["havingCondition","*havingCondition"], 
	     "ISLITERAL": ["havingCondition","*havingCondition"], 
	     "ISNUMERIC": ["havingCondition","*havingCondition"], 
	     "SUBSTR": ["havingCondition","*havingCondition"], 
	     "REPLACE": ["havingCondition","*havingCondition"], 
	     "REGEX": ["havingCondition","*havingCondition"], 
	     "EXISTS": ["havingCondition","*havingCondition"], 
	     "NOT": ["havingCondition","*havingCondition"], 
	     "IRI_REF": ["havingCondition","*havingCondition"], 
	     "PNAME_LN": ["havingCondition","*havingCondition"], 
	     "PNAME_NS": ["havingCondition","*havingCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "$": [], 
	     "}": []}, 
	  "*or([[ (,*dataBlockValue,)],NIL])" : {
	     "(": ["or([[ (,*dataBlockValue,)],NIL])","*or([[ (,*dataBlockValue,)],NIL])"], 
	     "NIL": ["or([[ (,*dataBlockValue,)],NIL])","*or([[ (,*dataBlockValue,)],NIL])"], 
	     "}": []}, 
	  "*or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["or([[*,unaryExpression],[/,unaryExpression]])","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "/": ["or([[*,unaryExpression],[/,unaryExpression]])","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     ";": []}, 
	  "*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])" : {
	     "+": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "-": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_POSITIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_NEGATIVE": ["or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     ";": []}, 
	  "*or([var,[ (,expression,AS,var,)]])" : {
	     "(": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "WHERE": [], 
	     "{": [], 
	     "FROM": []}, 
	  "*orderCondition" : {
	     "ASC": ["orderCondition","*orderCondition"], 
	     "DESC": ["orderCondition","*orderCondition"], 
	     "VAR1": ["orderCondition","*orderCondition"], 
	     "VAR2": ["orderCondition","*orderCondition"], 
	     "(": ["orderCondition","*orderCondition"], 
	     "STR": ["orderCondition","*orderCondition"], 
	     "LANG": ["orderCondition","*orderCondition"], 
	     "LANGMATCHES": ["orderCondition","*orderCondition"], 
	     "DATATYPE": ["orderCondition","*orderCondition"], 
	     "BOUND": ["orderCondition","*orderCondition"], 
	     "IRI": ["orderCondition","*orderCondition"], 
	     "URI": ["orderCondition","*orderCondition"], 
	     "BNODE": ["orderCondition","*orderCondition"], 
	     "RAND": ["orderCondition","*orderCondition"], 
	     "ABS": ["orderCondition","*orderCondition"], 
	     "CEIL": ["orderCondition","*orderCondition"], 
	     "FLOOR": ["orderCondition","*orderCondition"], 
	     "ROUND": ["orderCondition","*orderCondition"], 
	     "CONCAT": ["orderCondition","*orderCondition"], 
	     "STRLEN": ["orderCondition","*orderCondition"], 
	     "UCASE": ["orderCondition","*orderCondition"], 
	     "LCASE": ["orderCondition","*orderCondition"], 
	     "ENCODE_FOR_URI": ["orderCondition","*orderCondition"], 
	     "CONTAINS": ["orderCondition","*orderCondition"], 
	     "STRSTARTS": ["orderCondition","*orderCondition"], 
	     "STRENDS": ["orderCondition","*orderCondition"], 
	     "STRBEFORE": ["orderCondition","*orderCondition"], 
	     "STRAFTER": ["orderCondition","*orderCondition"], 
	     "YEAR": ["orderCondition","*orderCondition"], 
	     "MONTH": ["orderCondition","*orderCondition"], 
	     "DAY": ["orderCondition","*orderCondition"], 
	     "HOURS": ["orderCondition","*orderCondition"], 
	     "MINUTES": ["orderCondition","*orderCondition"], 
	     "SECONDS": ["orderCondition","*orderCondition"], 
	     "TIMEZONE": ["orderCondition","*orderCondition"], 
	     "TZ": ["orderCondition","*orderCondition"], 
	     "NOW": ["orderCondition","*orderCondition"], 
	     "UUID": ["orderCondition","*orderCondition"], 
	     "STRUUID": ["orderCondition","*orderCondition"], 
	     "MD5": ["orderCondition","*orderCondition"], 
	     "SHA1": ["orderCondition","*orderCondition"], 
	     "SHA256": ["orderCondition","*orderCondition"], 
	     "SHA384": ["orderCondition","*orderCondition"], 
	     "SHA512": ["orderCondition","*orderCondition"], 
	     "COALESCE": ["orderCondition","*orderCondition"], 
	     "IF": ["orderCondition","*orderCondition"], 
	     "STRLANG": ["orderCondition","*orderCondition"], 
	     "STRDT": ["orderCondition","*orderCondition"], 
	     "SAMETERM": ["orderCondition","*orderCondition"], 
	     "ISIRI": ["orderCondition","*orderCondition"], 
	     "ISURI": ["orderCondition","*orderCondition"], 
	     "ISBLANK": ["orderCondition","*orderCondition"], 
	     "ISLITERAL": ["orderCondition","*orderCondition"], 
	     "ISNUMERIC": ["orderCondition","*orderCondition"], 
	     "SUBSTR": ["orderCondition","*orderCondition"], 
	     "REPLACE": ["orderCondition","*orderCondition"], 
	     "REGEX": ["orderCondition","*orderCondition"], 
	     "EXISTS": ["orderCondition","*orderCondition"], 
	     "NOT": ["orderCondition","*orderCondition"], 
	     "IRI_REF": ["orderCondition","*orderCondition"], 
	     "PNAME_LN": ["orderCondition","*orderCondition"], 
	     "PNAME_NS": ["orderCondition","*orderCondition"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "$": [], 
	     "}": []}, 
	  "*prefixDecl" : {
	     "PREFIX": ["prefixDecl","*prefixDecl"], 
	     "$": [], 
	     "CONSTRUCT": [], 
	     "DESCRIBE": [], 
	     "ASK": [], 
	     "INSERT": [], 
	     "DELETE": [], 
	     "SELECT": [], 
	     "LOAD": [], 
	     "CLEAR": [], 
	     "DROP": [], 
	     "ADD": [], 
	     "MOVE": [], 
	     "COPY": [], 
	     "CREATE": [], 
	     "WITH": []}, 
	  "*usingClause" : {
	     "USING": ["usingClause","*usingClause"], 
	     "WHERE": []}, 
	  "*var" : {
	     "VAR1": ["var","*var"], 
	     "VAR2": ["var","*var"], 
	     ")": []}, 
	  "*varOrIRIref" : {
	     "VAR1": ["varOrIRIref","*varOrIRIref"], 
	     "VAR2": ["varOrIRIref","*varOrIRIref"], 
	     "IRI_REF": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_LN": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_NS": ["varOrIRIref","*varOrIRIref"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "WHERE": [], 
	     "{": [], 
	     "FROM": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "+graphNode" : {
	     "(": ["graphNode","*graphNode"], 
	     "[": ["graphNode","*graphNode"], 
	     "VAR1": ["graphNode","*graphNode"], 
	     "VAR2": ["graphNode","*graphNode"], 
	     "NIL": ["graphNode","*graphNode"], 
	     "IRI_REF": ["graphNode","*graphNode"], 
	     "TRUE": ["graphNode","*graphNode"], 
	     "FALSE": ["graphNode","*graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode","*graphNode"], 
	     "ANON": ["graphNode","*graphNode"], 
	     "PNAME_LN": ["graphNode","*graphNode"], 
	     "PNAME_NS": ["graphNode","*graphNode"], 
	     "STRING_LITERAL1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL2": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode","*graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode","*graphNode"], 
	     "INTEGER": ["graphNode","*graphNode"], 
	     "DECIMAL": ["graphNode","*graphNode"], 
	     "DOUBLE": ["graphNode","*graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode","*graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode","*graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode","*graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode","*graphNode"]}, 
	  "+graphNodePath" : {
	     "(": ["graphNodePath","*graphNodePath"], 
	     "[": ["graphNodePath","*graphNodePath"], 
	     "VAR1": ["graphNodePath","*graphNodePath"], 
	     "VAR2": ["graphNodePath","*graphNodePath"], 
	     "NIL": ["graphNodePath","*graphNodePath"], 
	     "IRI_REF": ["graphNodePath","*graphNodePath"], 
	     "TRUE": ["graphNodePath","*graphNodePath"], 
	     "FALSE": ["graphNodePath","*graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath","*graphNodePath"], 
	     "ANON": ["graphNodePath","*graphNodePath"], 
	     "PNAME_LN": ["graphNodePath","*graphNodePath"], 
	     "PNAME_NS": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath","*graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath","*graphNodePath"], 
	     "INTEGER": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath","*graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath","*graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath","*graphNodePath"]}, 
	  "+groupCondition" : {
	     "(": ["groupCondition","*groupCondition"], 
	     "STR": ["groupCondition","*groupCondition"], 
	     "LANG": ["groupCondition","*groupCondition"], 
	     "LANGMATCHES": ["groupCondition","*groupCondition"], 
	     "DATATYPE": ["groupCondition","*groupCondition"], 
	     "BOUND": ["groupCondition","*groupCondition"], 
	     "IRI": ["groupCondition","*groupCondition"], 
	     "URI": ["groupCondition","*groupCondition"], 
	     "BNODE": ["groupCondition","*groupCondition"], 
	     "RAND": ["groupCondition","*groupCondition"], 
	     "ABS": ["groupCondition","*groupCondition"], 
	     "CEIL": ["groupCondition","*groupCondition"], 
	     "FLOOR": ["groupCondition","*groupCondition"], 
	     "ROUND": ["groupCondition","*groupCondition"], 
	     "CONCAT": ["groupCondition","*groupCondition"], 
	     "STRLEN": ["groupCondition","*groupCondition"], 
	     "UCASE": ["groupCondition","*groupCondition"], 
	     "LCASE": ["groupCondition","*groupCondition"], 
	     "ENCODE_FOR_URI": ["groupCondition","*groupCondition"], 
	     "CONTAINS": ["groupCondition","*groupCondition"], 
	     "STRSTARTS": ["groupCondition","*groupCondition"], 
	     "STRENDS": ["groupCondition","*groupCondition"], 
	     "STRBEFORE": ["groupCondition","*groupCondition"], 
	     "STRAFTER": ["groupCondition","*groupCondition"], 
	     "YEAR": ["groupCondition","*groupCondition"], 
	     "MONTH": ["groupCondition","*groupCondition"], 
	     "DAY": ["groupCondition","*groupCondition"], 
	     "HOURS": ["groupCondition","*groupCondition"], 
	     "MINUTES": ["groupCondition","*groupCondition"], 
	     "SECONDS": ["groupCondition","*groupCondition"], 
	     "TIMEZONE": ["groupCondition","*groupCondition"], 
	     "TZ": ["groupCondition","*groupCondition"], 
	     "NOW": ["groupCondition","*groupCondition"], 
	     "UUID": ["groupCondition","*groupCondition"], 
	     "STRUUID": ["groupCondition","*groupCondition"], 
	     "MD5": ["groupCondition","*groupCondition"], 
	     "SHA1": ["groupCondition","*groupCondition"], 
	     "SHA256": ["groupCondition","*groupCondition"], 
	     "SHA384": ["groupCondition","*groupCondition"], 
	     "SHA512": ["groupCondition","*groupCondition"], 
	     "COALESCE": ["groupCondition","*groupCondition"], 
	     "IF": ["groupCondition","*groupCondition"], 
	     "STRLANG": ["groupCondition","*groupCondition"], 
	     "STRDT": ["groupCondition","*groupCondition"], 
	     "SAMETERM": ["groupCondition","*groupCondition"], 
	     "ISIRI": ["groupCondition","*groupCondition"], 
	     "ISURI": ["groupCondition","*groupCondition"], 
	     "ISBLANK": ["groupCondition","*groupCondition"], 
	     "ISLITERAL": ["groupCondition","*groupCondition"], 
	     "ISNUMERIC": ["groupCondition","*groupCondition"], 
	     "VAR1": ["groupCondition","*groupCondition"], 
	     "VAR2": ["groupCondition","*groupCondition"], 
	     "SUBSTR": ["groupCondition","*groupCondition"], 
	     "REPLACE": ["groupCondition","*groupCondition"], 
	     "REGEX": ["groupCondition","*groupCondition"], 
	     "EXISTS": ["groupCondition","*groupCondition"], 
	     "NOT": ["groupCondition","*groupCondition"], 
	     "IRI_REF": ["groupCondition","*groupCondition"], 
	     "PNAME_LN": ["groupCondition","*groupCondition"], 
	     "PNAME_NS": ["groupCondition","*groupCondition"]}, 
	  "+havingCondition" : {
	     "(": ["havingCondition","*havingCondition"], 
	     "STR": ["havingCondition","*havingCondition"], 
	     "LANG": ["havingCondition","*havingCondition"], 
	     "LANGMATCHES": ["havingCondition","*havingCondition"], 
	     "DATATYPE": ["havingCondition","*havingCondition"], 
	     "BOUND": ["havingCondition","*havingCondition"], 
	     "IRI": ["havingCondition","*havingCondition"], 
	     "URI": ["havingCondition","*havingCondition"], 
	     "BNODE": ["havingCondition","*havingCondition"], 
	     "RAND": ["havingCondition","*havingCondition"], 
	     "ABS": ["havingCondition","*havingCondition"], 
	     "CEIL": ["havingCondition","*havingCondition"], 
	     "FLOOR": ["havingCondition","*havingCondition"], 
	     "ROUND": ["havingCondition","*havingCondition"], 
	     "CONCAT": ["havingCondition","*havingCondition"], 
	     "STRLEN": ["havingCondition","*havingCondition"], 
	     "UCASE": ["havingCondition","*havingCondition"], 
	     "LCASE": ["havingCondition","*havingCondition"], 
	     "ENCODE_FOR_URI": ["havingCondition","*havingCondition"], 
	     "CONTAINS": ["havingCondition","*havingCondition"], 
	     "STRSTARTS": ["havingCondition","*havingCondition"], 
	     "STRENDS": ["havingCondition","*havingCondition"], 
	     "STRBEFORE": ["havingCondition","*havingCondition"], 
	     "STRAFTER": ["havingCondition","*havingCondition"], 
	     "YEAR": ["havingCondition","*havingCondition"], 
	     "MONTH": ["havingCondition","*havingCondition"], 
	     "DAY": ["havingCondition","*havingCondition"], 
	     "HOURS": ["havingCondition","*havingCondition"], 
	     "MINUTES": ["havingCondition","*havingCondition"], 
	     "SECONDS": ["havingCondition","*havingCondition"], 
	     "TIMEZONE": ["havingCondition","*havingCondition"], 
	     "TZ": ["havingCondition","*havingCondition"], 
	     "NOW": ["havingCondition","*havingCondition"], 
	     "UUID": ["havingCondition","*havingCondition"], 
	     "STRUUID": ["havingCondition","*havingCondition"], 
	     "MD5": ["havingCondition","*havingCondition"], 
	     "SHA1": ["havingCondition","*havingCondition"], 
	     "SHA256": ["havingCondition","*havingCondition"], 
	     "SHA384": ["havingCondition","*havingCondition"], 
	     "SHA512": ["havingCondition","*havingCondition"], 
	     "COALESCE": ["havingCondition","*havingCondition"], 
	     "IF": ["havingCondition","*havingCondition"], 
	     "STRLANG": ["havingCondition","*havingCondition"], 
	     "STRDT": ["havingCondition","*havingCondition"], 
	     "SAMETERM": ["havingCondition","*havingCondition"], 
	     "ISIRI": ["havingCondition","*havingCondition"], 
	     "ISURI": ["havingCondition","*havingCondition"], 
	     "ISBLANK": ["havingCondition","*havingCondition"], 
	     "ISLITERAL": ["havingCondition","*havingCondition"], 
	     "ISNUMERIC": ["havingCondition","*havingCondition"], 
	     "SUBSTR": ["havingCondition","*havingCondition"], 
	     "REPLACE": ["havingCondition","*havingCondition"], 
	     "REGEX": ["havingCondition","*havingCondition"], 
	     "EXISTS": ["havingCondition","*havingCondition"], 
	     "NOT": ["havingCondition","*havingCondition"], 
	     "IRI_REF": ["havingCondition","*havingCondition"], 
	     "PNAME_LN": ["havingCondition","*havingCondition"], 
	     "PNAME_NS": ["havingCondition","*havingCondition"]}, 
	  "+or([var,[ (,expression,AS,var,)]])" : {
	     "(": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["or([var,[ (,expression,AS,var,)]])","*or([var,[ (,expression,AS,var,)]])"]}, 
	  "+orderCondition" : {
	     "ASC": ["orderCondition","*orderCondition"], 
	     "DESC": ["orderCondition","*orderCondition"], 
	     "VAR1": ["orderCondition","*orderCondition"], 
	     "VAR2": ["orderCondition","*orderCondition"], 
	     "(": ["orderCondition","*orderCondition"], 
	     "STR": ["orderCondition","*orderCondition"], 
	     "LANG": ["orderCondition","*orderCondition"], 
	     "LANGMATCHES": ["orderCondition","*orderCondition"], 
	     "DATATYPE": ["orderCondition","*orderCondition"], 
	     "BOUND": ["orderCondition","*orderCondition"], 
	     "IRI": ["orderCondition","*orderCondition"], 
	     "URI": ["orderCondition","*orderCondition"], 
	     "BNODE": ["orderCondition","*orderCondition"], 
	     "RAND": ["orderCondition","*orderCondition"], 
	     "ABS": ["orderCondition","*orderCondition"], 
	     "CEIL": ["orderCondition","*orderCondition"], 
	     "FLOOR": ["orderCondition","*orderCondition"], 
	     "ROUND": ["orderCondition","*orderCondition"], 
	     "CONCAT": ["orderCondition","*orderCondition"], 
	     "STRLEN": ["orderCondition","*orderCondition"], 
	     "UCASE": ["orderCondition","*orderCondition"], 
	     "LCASE": ["orderCondition","*orderCondition"], 
	     "ENCODE_FOR_URI": ["orderCondition","*orderCondition"], 
	     "CONTAINS": ["orderCondition","*orderCondition"], 
	     "STRSTARTS": ["orderCondition","*orderCondition"], 
	     "STRENDS": ["orderCondition","*orderCondition"], 
	     "STRBEFORE": ["orderCondition","*orderCondition"], 
	     "STRAFTER": ["orderCondition","*orderCondition"], 
	     "YEAR": ["orderCondition","*orderCondition"], 
	     "MONTH": ["orderCondition","*orderCondition"], 
	     "DAY": ["orderCondition","*orderCondition"], 
	     "HOURS": ["orderCondition","*orderCondition"], 
	     "MINUTES": ["orderCondition","*orderCondition"], 
	     "SECONDS": ["orderCondition","*orderCondition"], 
	     "TIMEZONE": ["orderCondition","*orderCondition"], 
	     "TZ": ["orderCondition","*orderCondition"], 
	     "NOW": ["orderCondition","*orderCondition"], 
	     "UUID": ["orderCondition","*orderCondition"], 
	     "STRUUID": ["orderCondition","*orderCondition"], 
	     "MD5": ["orderCondition","*orderCondition"], 
	     "SHA1": ["orderCondition","*orderCondition"], 
	     "SHA256": ["orderCondition","*orderCondition"], 
	     "SHA384": ["orderCondition","*orderCondition"], 
	     "SHA512": ["orderCondition","*orderCondition"], 
	     "COALESCE": ["orderCondition","*orderCondition"], 
	     "IF": ["orderCondition","*orderCondition"], 
	     "STRLANG": ["orderCondition","*orderCondition"], 
	     "STRDT": ["orderCondition","*orderCondition"], 
	     "SAMETERM": ["orderCondition","*orderCondition"], 
	     "ISIRI": ["orderCondition","*orderCondition"], 
	     "ISURI": ["orderCondition","*orderCondition"], 
	     "ISBLANK": ["orderCondition","*orderCondition"], 
	     "ISLITERAL": ["orderCondition","*orderCondition"], 
	     "ISNUMERIC": ["orderCondition","*orderCondition"], 
	     "SUBSTR": ["orderCondition","*orderCondition"], 
	     "REPLACE": ["orderCondition","*orderCondition"], 
	     "REGEX": ["orderCondition","*orderCondition"], 
	     "EXISTS": ["orderCondition","*orderCondition"], 
	     "NOT": ["orderCondition","*orderCondition"], 
	     "IRI_REF": ["orderCondition","*orderCondition"], 
	     "PNAME_LN": ["orderCondition","*orderCondition"], 
	     "PNAME_NS": ["orderCondition","*orderCondition"]}, 
	  "+varOrIRIref" : {
	     "VAR1": ["varOrIRIref","*varOrIRIref"], 
	     "VAR2": ["varOrIRIref","*varOrIRIref"], 
	     "IRI_REF": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_LN": ["varOrIRIref","*varOrIRIref"], 
	     "PNAME_NS": ["varOrIRIref","*varOrIRIref"]}, 
	  "?." : {
	     ".": ["."], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?DISTINCT" : {
	     "DISTINCT": ["DISTINCT"], 
	     "!": [], 
	     "+": [], 
	     "-": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "(": [], 
	     "STR": [], 
	     "LANG": [], 
	     "LANGMATCHES": [], 
	     "DATATYPE": [], 
	     "BOUND": [], 
	     "IRI": [], 
	     "URI": [], 
	     "BNODE": [], 
	     "RAND": [], 
	     "ABS": [], 
	     "CEIL": [], 
	     "FLOOR": [], 
	     "ROUND": [], 
	     "CONCAT": [], 
	     "STRLEN": [], 
	     "UCASE": [], 
	     "LCASE": [], 
	     "ENCODE_FOR_URI": [], 
	     "CONTAINS": [], 
	     "STRSTARTS": [], 
	     "STRENDS": [], 
	     "STRBEFORE": [], 
	     "STRAFTER": [], 
	     "YEAR": [], 
	     "MONTH": [], 
	     "DAY": [], 
	     "HOURS": [], 
	     "MINUTES": [], 
	     "SECONDS": [], 
	     "TIMEZONE": [], 
	     "TZ": [], 
	     "NOW": [], 
	     "UUID": [], 
	     "STRUUID": [], 
	     "MD5": [], 
	     "SHA1": [], 
	     "SHA256": [], 
	     "SHA384": [], 
	     "SHA512": [], 
	     "COALESCE": [], 
	     "IF": [], 
	     "STRLANG": [], 
	     "STRDT": [], 
	     "SAMETERM": [], 
	     "ISIRI": [], 
	     "ISURI": [], 
	     "ISBLANK": [], 
	     "ISLITERAL": [], 
	     "ISNUMERIC": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "COUNT": [], 
	     "SUM": [], 
	     "MIN": [], 
	     "MAX": [], 
	     "AVG": [], 
	     "SAMPLE": [], 
	     "GROUP_CONCAT": [], 
	     "SUBSTR": [], 
	     "REPLACE": [], 
	     "REGEX": [], 
	     "EXISTS": [], 
	     "NOT": [], 
	     "IRI_REF": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "*": []}, 
	  "?GRAPH" : {
	     "GRAPH": ["GRAPH"], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT" : {
	     "SILENT": ["SILENT"], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT_1" : {
	     "SILENT": ["SILENT"], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?SILENT_2" : {
	     "SILENT": ["SILENT"], 
	     "GRAPH": [], 
	     "DEFAULT": [], 
	     "NAMED": [], 
	     "ALL": []}, 
	  "?SILENT_3" : {
	     "SILENT": ["SILENT"], 
	     "GRAPH": []}, 
	  "?SILENT_4" : {
	     "SILENT": ["SILENT"], 
	     "DEFAULT": [], 
	     "GRAPH": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": []}, 
	  "?WHERE" : {
	     "WHERE": ["WHERE"], 
	     "{": []}, 
	  "?[,,expression]" : {
	     ",": ["[,,expression]"], 
	     ")": []}, 
	  "?[.,?constructTriples]" : {
	     ".": ["[.,?constructTriples]"], 
	     "}": []}, 
	  "?[.,?triplesBlock]" : {
	     ".": ["[.,?triplesBlock]"], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?[.,?triplesTemplate]" : {
	     ".": ["[.,?triplesTemplate]"], 
	     "}": [], 
	     "GRAPH": []}, 
	  "?[;,SEPARATOR,=,string]" : {
	     ";": ["[;,SEPARATOR,=,string]"], 
	     ")": []}, 
	  "?[;,update]" : {
	     ";": ["[;,update]"], 
	     "$": []}, 
	  "?[AS,var]" : {
	     "AS": ["[AS,var]"], 
	     ")": []}, 
	  "?[INTO,graphRef]" : {
	     "INTO": ["[INTO,graphRef]"], 
	     ";": [], 
	     "$": []}, 
	  "?[or([verbPath,verbSimple]),objectList]" : {
	     "VAR1": ["[or([verbPath,verbSimple]),objectList]"], 
	     "VAR2": ["[or([verbPath,verbSimple]),objectList]"], 
	     "^": ["[or([verbPath,verbSimple]),objectList]"], 
	     "a": ["[or([verbPath,verbSimple]),objectList]"], 
	     "!": ["[or([verbPath,verbSimple]),objectList]"], 
	     "(": ["[or([verbPath,verbSimple]),objectList]"], 
	     "IRI_REF": ["[or([verbPath,verbSimple]),objectList]"], 
	     "PNAME_LN": ["[or([verbPath,verbSimple]),objectList]"], 
	     "PNAME_NS": ["[or([verbPath,verbSimple]),objectList]"], 
	     ";": [], 
	     ".": [], 
	     "]": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?[pathOneInPropertySet,*[|,pathOneInPropertySet]]" : {
	     "a": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "^": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "IRI_REF": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "PNAME_LN": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     "PNAME_NS": ["[pathOneInPropertySet,*[|,pathOneInPropertySet]]"], 
	     ")": []}, 
	  "?[update1,?[;,update]]" : {
	     "INSERT": ["[update1,?[;,update]]"], 
	     "DELETE": ["[update1,?[;,update]]"], 
	     "LOAD": ["[update1,?[;,update]]"], 
	     "CLEAR": ["[update1,?[;,update]]"], 
	     "DROP": ["[update1,?[;,update]]"], 
	     "ADD": ["[update1,?[;,update]]"], 
	     "MOVE": ["[update1,?[;,update]]"], 
	     "COPY": ["[update1,?[;,update]]"], 
	     "CREATE": ["[update1,?[;,update]]"], 
	     "WITH": ["[update1,?[;,update]]"], 
	     "$": []}, 
	  "?[verb,objectList]" : {
	     "a": ["[verb,objectList]"], 
	     "VAR1": ["[verb,objectList]"], 
	     "VAR2": ["[verb,objectList]"], 
	     "IRI_REF": ["[verb,objectList]"], 
	     "PNAME_LN": ["[verb,objectList]"], 
	     "PNAME_NS": ["[verb,objectList]"], 
	     ";": [], 
	     ".": [], 
	     "]": [], 
	     "}": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "?argList" : {
	     "NIL": ["argList"], 
	     "(": ["argList"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "*": [], 
	     "/": [], 
	     ";": []}, 
	  "?baseDecl" : {
	     "BASE": ["baseDecl"], 
	     "$": [], 
	     "CONSTRUCT": [], 
	     "DESCRIBE": [], 
	     "ASK": [], 
	     "INSERT": [], 
	     "DELETE": [], 
	     "SELECT": [], 
	     "LOAD": [], 
	     "CLEAR": [], 
	     "DROP": [], 
	     "ADD": [], 
	     "MOVE": [], 
	     "COPY": [], 
	     "CREATE": [], 
	     "WITH": [], 
	     "PREFIX": []}, 
	  "?constructTriples" : {
	     "VAR1": ["constructTriples"], 
	     "VAR2": ["constructTriples"], 
	     "NIL": ["constructTriples"], 
	     "(": ["constructTriples"], 
	     "[": ["constructTriples"], 
	     "IRI_REF": ["constructTriples"], 
	     "TRUE": ["constructTriples"], 
	     "FALSE": ["constructTriples"], 
	     "BLANK_NODE_LABEL": ["constructTriples"], 
	     "ANON": ["constructTriples"], 
	     "PNAME_LN": ["constructTriples"], 
	     "PNAME_NS": ["constructTriples"], 
	     "STRING_LITERAL1": ["constructTriples"], 
	     "STRING_LITERAL2": ["constructTriples"], 
	     "STRING_LITERAL_LONG1": ["constructTriples"], 
	     "STRING_LITERAL_LONG2": ["constructTriples"], 
	     "INTEGER": ["constructTriples"], 
	     "DECIMAL": ["constructTriples"], 
	     "DOUBLE": ["constructTriples"], 
	     "INTEGER_POSITIVE": ["constructTriples"], 
	     "DECIMAL_POSITIVE": ["constructTriples"], 
	     "DOUBLE_POSITIVE": ["constructTriples"], 
	     "INTEGER_NEGATIVE": ["constructTriples"], 
	     "DECIMAL_NEGATIVE": ["constructTriples"], 
	     "DOUBLE_NEGATIVE": ["constructTriples"], 
	     "}": []}, 
	  "?groupClause" : {
	     "GROUP": ["groupClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "$": [], 
	     "}": []}, 
	  "?havingClause" : {
	     "HAVING": ["havingClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "ORDER": [], 
	     "$": [], 
	     "}": []}, 
	  "?insertClause" : {
	     "INSERT": ["insertClause"], 
	     "WHERE": [], 
	     "USING": []}, 
	  "?limitClause" : {
	     "LIMIT": ["limitClause"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?limitOffsetClauses" : {
	     "LIMIT": ["limitOffsetClauses"], 
	     "OFFSET": ["limitOffsetClauses"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?offsetClause" : {
	     "OFFSET": ["offsetClause"], 
	     "VALUES": [], 
	     "$": [], 
	     "}": []}, 
	  "?or([DISTINCT,REDUCED])" : {
	     "DISTINCT": ["or([DISTINCT,REDUCED])"], 
	     "REDUCED": ["or([DISTINCT,REDUCED])"], 
	     "*": [], 
	     "(": [], 
	     "VAR1": [], 
	     "VAR2": []}, 
	  "?or([LANGTAG,[^^,iriRef]])" : {
	     "LANGTAG": ["or([LANGTAG,[^^,iriRef]])"], 
	     "^^": ["or([LANGTAG,[^^,iriRef]])"], 
	     "UNDEF": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "a": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "^": [], 
	     "!": [], 
	     "(": [], 
	     ".": [], 
	     ";": [], 
	     ",": [], 
	     "AS": [], 
	     ")": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     "+": [], 
	     "-": [], 
	     "*": [], 
	     "/": [], 
	     "}": [], 
	     "[": [], 
	     "NIL": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "]": [], 
	     "GRAPH": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": []}, 
	  "?or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "/": ["or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "+": [], 
	     "-": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": [], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     "=": [], 
	     "!=": [], 
	     "<": [], 
	     ">": [], 
	     "<=": [], 
	     ">=": [], 
	     "IN": [], 
	     "NOT": [], 
	     ";": []}, 
	  "?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])" : {
	     "=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "!=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "<": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     ">": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "<=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     ">=": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IN": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOT": ["or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "AS": [], 
	     ")": [], 
	     ",": [], 
	     "||": [], 
	     "&&": [], 
	     ";": []}, 
	  "?orderClause" : {
	     "ORDER": ["orderClause"], 
	     "VALUES": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "$": [], 
	     "}": []}, 
	  "?pathMod" : {
	     "*": ["pathMod"], 
	     "?": ["pathMod"], 
	     "+": ["pathMod"], 
	     "{": ["pathMod"], 
	     "|": [], 
	     "/": [], 
	     ")": [], 
	     "(": [], 
	     "[": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "?triplesBlock" : {
	     "VAR1": ["triplesBlock"], 
	     "VAR2": ["triplesBlock"], 
	     "NIL": ["triplesBlock"], 
	     "(": ["triplesBlock"], 
	     "[": ["triplesBlock"], 
	     "IRI_REF": ["triplesBlock"], 
	     "TRUE": ["triplesBlock"], 
	     "FALSE": ["triplesBlock"], 
	     "BLANK_NODE_LABEL": ["triplesBlock"], 
	     "ANON": ["triplesBlock"], 
	     "PNAME_LN": ["triplesBlock"], 
	     "PNAME_NS": ["triplesBlock"], 
	     "STRING_LITERAL1": ["triplesBlock"], 
	     "STRING_LITERAL2": ["triplesBlock"], 
	     "STRING_LITERAL_LONG1": ["triplesBlock"], 
	     "STRING_LITERAL_LONG2": ["triplesBlock"], 
	     "INTEGER": ["triplesBlock"], 
	     "DECIMAL": ["triplesBlock"], 
	     "DOUBLE": ["triplesBlock"], 
	     "INTEGER_POSITIVE": ["triplesBlock"], 
	     "DECIMAL_POSITIVE": ["triplesBlock"], 
	     "DOUBLE_POSITIVE": ["triplesBlock"], 
	     "INTEGER_NEGATIVE": ["triplesBlock"], 
	     "DECIMAL_NEGATIVE": ["triplesBlock"], 
	     "DOUBLE_NEGATIVE": ["triplesBlock"], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "?triplesTemplate" : {
	     "VAR1": ["triplesTemplate"], 
	     "VAR2": ["triplesTemplate"], 
	     "NIL": ["triplesTemplate"], 
	     "(": ["triplesTemplate"], 
	     "[": ["triplesTemplate"], 
	     "IRI_REF": ["triplesTemplate"], 
	     "TRUE": ["triplesTemplate"], 
	     "FALSE": ["triplesTemplate"], 
	     "BLANK_NODE_LABEL": ["triplesTemplate"], 
	     "ANON": ["triplesTemplate"], 
	     "PNAME_LN": ["triplesTemplate"], 
	     "PNAME_NS": ["triplesTemplate"], 
	     "STRING_LITERAL1": ["triplesTemplate"], 
	     "STRING_LITERAL2": ["triplesTemplate"], 
	     "STRING_LITERAL_LONG1": ["triplesTemplate"], 
	     "STRING_LITERAL_LONG2": ["triplesTemplate"], 
	     "INTEGER": ["triplesTemplate"], 
	     "DECIMAL": ["triplesTemplate"], 
	     "DOUBLE": ["triplesTemplate"], 
	     "INTEGER_POSITIVE": ["triplesTemplate"], 
	     "DECIMAL_POSITIVE": ["triplesTemplate"], 
	     "DOUBLE_POSITIVE": ["triplesTemplate"], 
	     "INTEGER_NEGATIVE": ["triplesTemplate"], 
	     "DECIMAL_NEGATIVE": ["triplesTemplate"], 
	     "DOUBLE_NEGATIVE": ["triplesTemplate"], 
	     "}": [], 
	     "GRAPH": []}, 
	  "?whereClause" : {
	     "WHERE": ["whereClause"], 
	     "{": ["whereClause"], 
	     "ORDER": [], 
	     "HAVING": [], 
	     "GROUP": [], 
	     "LIMIT": [], 
	     "OFFSET": [], 
	     "VALUES": [], 
	     "$": []}, 
	  "[ (,*dataBlockValue,)]" : {
	     "(": ["(","*dataBlockValue",")"]}, 
	  "[ (,*var,)]" : {
	     "(": ["(","*var",")"]}, 
	  "[ (,expression,)]" : {
	     "(": ["(","expression",")"]}, 
	  "[ (,expression,AS,var,)]" : {
	     "(": ["(","expression","AS","var",")"]}, 
	  "[!=,numericExpression]" : {
	     "!=": ["!=","numericExpression"]}, 
	  "[&&,valueLogical]" : {
	     "&&": ["&&","valueLogical"]}, 
	  "[*,unaryExpression]" : {
	     "*": ["*","unaryExpression"]}, 
	  "[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]" : {
	     "WHERE": ["*datasetClause","WHERE","{","?triplesTemplate","}","solutionModifier"], 
	     "FROM": ["*datasetClause","WHERE","{","?triplesTemplate","}","solutionModifier"]}, 
	  "[+,multiplicativeExpression]" : {
	     "+": ["+","multiplicativeExpression"]}, 
	  "[,,expression]" : {
	     ",": [",","expression"]}, 
	  "[,,integer,}]" : {
	     ",": [",","integer","}"]}, 
	  "[,,objectPath]" : {
	     ",": [",","objectPath"]}, 
	  "[,,object]" : {
	     ",": [",","object"]}, 
	  "[,,or([},[integer,}]])]" : {
	     ",": [",","or([},[integer,}]])"]}, 
	  "[-,multiplicativeExpression]" : {
	     "-": ["-","multiplicativeExpression"]}, 
	  "[.,?constructTriples]" : {
	     ".": [".","?constructTriples"]}, 
	  "[.,?triplesBlock]" : {
	     ".": [".","?triplesBlock"]}, 
	  "[.,?triplesTemplate]" : {
	     ".": [".","?triplesTemplate"]}, 
	  "[/,pathEltOrInverse]" : {
	     "/": ["/","pathEltOrInverse"]}, 
	  "[/,unaryExpression]" : {
	     "/": ["/","unaryExpression"]}, 
	  "[;,?[or([verbPath,verbSimple]),objectList]]" : {
	     ";": [";","?[or([verbPath,verbSimple]),objectList]"]}, 
	  "[;,?[verb,objectList]]" : {
	     ";": [";","?[verb,objectList]"]}, 
	  "[;,SEPARATOR,=,string]" : {
	     ";": [";","SEPARATOR","=","string"]}, 
	  "[;,update]" : {
	     ";": [";","update"]}, 
	  "[<,numericExpression]" : {
	     "<": ["<","numericExpression"]}, 
	  "[<=,numericExpression]" : {
	     "<=": ["<=","numericExpression"]}, 
	  "[=,numericExpression]" : {
	     "=": ["=","numericExpression"]}, 
	  "[>,numericExpression]" : {
	     ">": [">","numericExpression"]}, 
	  "[>=,numericExpression]" : {
	     ">=": [">=","numericExpression"]}, 
	  "[AS,var]" : {
	     "AS": ["AS","var"]}, 
	  "[IN,expressionList]" : {
	     "IN": ["IN","expressionList"]}, 
	  "[INTO,graphRef]" : {
	     "INTO": ["INTO","graphRef"]}, 
	  "[NAMED,iriRef]" : {
	     "NAMED": ["NAMED","iriRef"]}, 
	  "[NOT,IN,expressionList]" : {
	     "NOT": ["NOT","IN","expressionList"]}, 
	  "[UNION,groupGraphPattern]" : {
	     "UNION": ["UNION","groupGraphPattern"]}, 
	  "[^^,iriRef]" : {
	     "^^": ["^^","iriRef"]}, 
	  "[constructTemplate,*datasetClause,whereClause,solutionModifier]" : {
	     "{": ["constructTemplate","*datasetClause","whereClause","solutionModifier"]}, 
	  "[deleteClause,?insertClause]" : {
	     "DELETE": ["deleteClause","?insertClause"]}, 
	  "[graphPatternNotTriples,?.,?triplesBlock]" : {
	     "{": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "OPTIONAL": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "MINUS": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "GRAPH": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "SERVICE": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "FILTER": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "BIND": ["graphPatternNotTriples","?.","?triplesBlock"], 
	     "VALUES": ["graphPatternNotTriples","?.","?triplesBlock"]}, 
	  "[integer,or([[,,or([},[integer,}]])],}])]" : {
	     "INTEGER": ["integer","or([[,,or([},[integer,}]])],}])"]}, 
	  "[integer,}]" : {
	     "INTEGER": ["integer","}"]}, 
	  "[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]" : {
	     "INTEGER_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_POSITIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_NEGATIVE": ["or([numericLiteralPositive,numericLiteralNegative])","?or([[*,unaryExpression],[/,unaryExpression]])"]}, 
	  "[or([verbPath,verbSimple]),objectList]" : {
	     "VAR1": ["or([verbPath,verbSimple])","objectList"], 
	     "VAR2": ["or([verbPath,verbSimple])","objectList"], 
	     "^": ["or([verbPath,verbSimple])","objectList"], 
	     "a": ["or([verbPath,verbSimple])","objectList"], 
	     "!": ["or([verbPath,verbSimple])","objectList"], 
	     "(": ["or([verbPath,verbSimple])","objectList"], 
	     "IRI_REF": ["or([verbPath,verbSimple])","objectList"], 
	     "PNAME_LN": ["or([verbPath,verbSimple])","objectList"], 
	     "PNAME_NS": ["or([verbPath,verbSimple])","objectList"]}, 
	  "[pathOneInPropertySet,*[|,pathOneInPropertySet]]" : {
	     "a": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "^": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "IRI_REF": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "PNAME_LN": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"], 
	     "PNAME_NS": ["pathOneInPropertySet","*[|,pathOneInPropertySet]"]}, 
	  "[quadsNotTriples,?.,?triplesTemplate]" : {
	     "GRAPH": ["quadsNotTriples","?.","?triplesTemplate"]}, 
	  "[update1,?[;,update]]" : {
	     "INSERT": ["update1","?[;,update]"], 
	     "DELETE": ["update1","?[;,update]"], 
	     "LOAD": ["update1","?[;,update]"], 
	     "CLEAR": ["update1","?[;,update]"], 
	     "DROP": ["update1","?[;,update]"], 
	     "ADD": ["update1","?[;,update]"], 
	     "MOVE": ["update1","?[;,update]"], 
	     "COPY": ["update1","?[;,update]"], 
	     "CREATE": ["update1","?[;,update]"], 
	     "WITH": ["update1","?[;,update]"]}, 
	  "[verb,objectList]" : {
	     "a": ["verb","objectList"], 
	     "VAR1": ["verb","objectList"], 
	     "VAR2": ["verb","objectList"], 
	     "IRI_REF": ["verb","objectList"], 
	     "PNAME_LN": ["verb","objectList"], 
	     "PNAME_NS": ["verb","objectList"]}, 
	  "[|,pathOneInPropertySet]" : {
	     "|": ["|","pathOneInPropertySet"]}, 
	  "[|,pathSequence]" : {
	     "|": ["|","pathSequence"]}, 
	  "[||,conditionalAndExpression]" : {
	     "||": ["||","conditionalAndExpression"]}, 
	  "add" : {
	     "ADD": ["ADD","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "additiveExpression" : {
	     "!": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "+": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "-": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "VAR1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "VAR2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "(": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LANG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LANGMATCHES": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DATATYPE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "BOUND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IRI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "URI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "BNODE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "RAND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ABS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CEIL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "FLOOR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ROUND": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CONCAT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRLEN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "UCASE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "LCASE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ENCODE_FOR_URI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "CONTAINS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRSTARTS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRENDS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRBEFORE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRAFTER": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "YEAR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MONTH": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DAY": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "HOURS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MINUTES": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SECONDS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TIMEZONE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TZ": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "NOW": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "UUID": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRUUID": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MD5": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA256": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA384": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SHA512": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "COALESCE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IF": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRLANG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRDT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SAMETERM": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISIRI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISURI": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISBLANK": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISLITERAL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "ISNUMERIC": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "TRUE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "FALSE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "COUNT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SUM": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MIN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "MAX": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "AVG": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SAMPLE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "GROUP_CONCAT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "SUBSTR": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "REPLACE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "REGEX": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "EXISTS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "NOT": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "IRI_REF": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL_LONG1": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "STRING_LITERAL_LONG2": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_POSITIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "INTEGER_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DECIMAL_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "DOUBLE_NEGATIVE": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "PNAME_LN": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"], 
	     "PNAME_NS": ["multiplicativeExpression","*or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])"]}, 
	  "aggregate" : {
	     "COUNT": ["COUNT","(","?DISTINCT","or([*,expression])",")"], 
	     "SUM": ["SUM","(","?DISTINCT","expression",")"], 
	     "MIN": ["MIN","(","?DISTINCT","expression",")"], 
	     "MAX": ["MAX","(","?DISTINCT","expression",")"], 
	     "AVG": ["AVG","(","?DISTINCT","expression",")"], 
	     "SAMPLE": ["SAMPLE","(","?DISTINCT","expression",")"], 
	     "GROUP_CONCAT": ["GROUP_CONCAT","(","?DISTINCT","expression","?[;,SEPARATOR,=,string]",")"]}, 
	  "allowBnodes" : {
	     "}": []}, 
	  "allowVars" : {
	     "}": []}, 
	  "argList" : {
	     "NIL": ["NIL"], 
	     "(": ["(","?DISTINCT","expression","*[,,expression]",")"]}, 
	  "askQuery" : {
	     "ASK": ["ASK","*datasetClause","whereClause","solutionModifier"]}, 
	  "baseDecl" : {
	     "BASE": ["BASE","IRI_REF"]}, 
	  "bind" : {
	     "BIND": ["BIND","(","expression","AS","var",")"]}, 
	  "blankNode" : {
	     "BLANK_NODE_LABEL": ["BLANK_NODE_LABEL"], 
	     "ANON": ["ANON"]}, 
	  "blankNodePropertyList" : {
	     "[": ["[","propertyListNotEmpty","]"]}, 
	  "blankNodePropertyListPath" : {
	     "[": ["[","propertyListPathNotEmpty","]"]}, 
	  "booleanLiteral" : {
	     "TRUE": ["TRUE"], 
	     "FALSE": ["FALSE"]}, 
	  "brackettedExpression" : {
	     "(": ["(","expression",")"]}, 
	  "builtInCall" : {
	     "STR": ["STR","(","expression",")"], 
	     "LANG": ["LANG","(","expression",")"], 
	     "LANGMATCHES": ["LANGMATCHES","(","expression",",","expression",")"], 
	     "DATATYPE": ["DATATYPE","(","expression",")"], 
	     "BOUND": ["BOUND","(","var",")"], 
	     "IRI": ["IRI","(","expression",")"], 
	     "URI": ["URI","(","expression",")"], 
	     "BNODE": ["BNODE","or([[ (,expression,)],NIL])"], 
	     "RAND": ["RAND","NIL"], 
	     "ABS": ["ABS","(","expression",")"], 
	     "CEIL": ["CEIL","(","expression",")"], 
	     "FLOOR": ["FLOOR","(","expression",")"], 
	     "ROUND": ["ROUND","(","expression",")"], 
	     "CONCAT": ["CONCAT","expressionList"], 
	     "SUBSTR": ["substringExpression"], 
	     "STRLEN": ["STRLEN","(","expression",")"], 
	     "REPLACE": ["strReplaceExpression"], 
	     "UCASE": ["UCASE","(","expression",")"], 
	     "LCASE": ["LCASE","(","expression",")"], 
	     "ENCODE_FOR_URI": ["ENCODE_FOR_URI","(","expression",")"], 
	     "CONTAINS": ["CONTAINS","(","expression",",","expression",")"], 
	     "STRSTARTS": ["STRSTARTS","(","expression",",","expression",")"], 
	     "STRENDS": ["STRENDS","(","expression",",","expression",")"], 
	     "STRBEFORE": ["STRBEFORE","(","expression",",","expression",")"], 
	     "STRAFTER": ["STRAFTER","(","expression",",","expression",")"], 
	     "YEAR": ["YEAR","(","expression",")"], 
	     "MONTH": ["MONTH","(","expression",")"], 
	     "DAY": ["DAY","(","expression",")"], 
	     "HOURS": ["HOURS","(","expression",")"], 
	     "MINUTES": ["MINUTES","(","expression",")"], 
	     "SECONDS": ["SECONDS","(","expression",")"], 
	     "TIMEZONE": ["TIMEZONE","(","expression",")"], 
	     "TZ": ["TZ","(","expression",")"], 
	     "NOW": ["NOW","NIL"], 
	     "UUID": ["UUID","NIL"], 
	     "STRUUID": ["STRUUID","NIL"], 
	     "MD5": ["MD5","(","expression",")"], 
	     "SHA1": ["SHA1","(","expression",")"], 
	     "SHA256": ["SHA256","(","expression",")"], 
	     "SHA384": ["SHA384","(","expression",")"], 
	     "SHA512": ["SHA512","(","expression",")"], 
	     "COALESCE": ["COALESCE","expressionList"], 
	     "IF": ["IF","(","expression",",","expression",",","expression",")"], 
	     "STRLANG": ["STRLANG","(","expression",",","expression",")"], 
	     "STRDT": ["STRDT","(","expression",",","expression",")"], 
	     "SAMETERM": ["SAMETERM","(","expression",",","expression",")"], 
	     "ISIRI": ["ISIRI","(","expression",")"], 
	     "ISURI": ["ISURI","(","expression",")"], 
	     "ISBLANK": ["ISBLANK","(","expression",")"], 
	     "ISLITERAL": ["ISLITERAL","(","expression",")"], 
	     "ISNUMERIC": ["ISNUMERIC","(","expression",")"], 
	     "REGEX": ["regexExpression"], 
	     "EXISTS": ["existsFunc"], 
	     "NOT": ["notExistsFunc"]}, 
	  "clear" : {
	     "CLEAR": ["CLEAR","?SILENT_2","graphRefAll"]}, 
	  "collection" : {
	     "(": ["(","+graphNode",")"]}, 
	  "collectionPath" : {
	     "(": ["(","+graphNodePath",")"]}, 
	  "conditionalAndExpression" : {
	     "!": ["valueLogical","*[&&,valueLogical]"], 
	     "+": ["valueLogical","*[&&,valueLogical]"], 
	     "-": ["valueLogical","*[&&,valueLogical]"], 
	     "VAR1": ["valueLogical","*[&&,valueLogical]"], 
	     "VAR2": ["valueLogical","*[&&,valueLogical]"], 
	     "(": ["valueLogical","*[&&,valueLogical]"], 
	     "STR": ["valueLogical","*[&&,valueLogical]"], 
	     "LANG": ["valueLogical","*[&&,valueLogical]"], 
	     "LANGMATCHES": ["valueLogical","*[&&,valueLogical]"], 
	     "DATATYPE": ["valueLogical","*[&&,valueLogical]"], 
	     "BOUND": ["valueLogical","*[&&,valueLogical]"], 
	     "IRI": ["valueLogical","*[&&,valueLogical]"], 
	     "URI": ["valueLogical","*[&&,valueLogical]"], 
	     "BNODE": ["valueLogical","*[&&,valueLogical]"], 
	     "RAND": ["valueLogical","*[&&,valueLogical]"], 
	     "ABS": ["valueLogical","*[&&,valueLogical]"], 
	     "CEIL": ["valueLogical","*[&&,valueLogical]"], 
	     "FLOOR": ["valueLogical","*[&&,valueLogical]"], 
	     "ROUND": ["valueLogical","*[&&,valueLogical]"], 
	     "CONCAT": ["valueLogical","*[&&,valueLogical]"], 
	     "STRLEN": ["valueLogical","*[&&,valueLogical]"], 
	     "UCASE": ["valueLogical","*[&&,valueLogical]"], 
	     "LCASE": ["valueLogical","*[&&,valueLogical]"], 
	     "ENCODE_FOR_URI": ["valueLogical","*[&&,valueLogical]"], 
	     "CONTAINS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRSTARTS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRENDS": ["valueLogical","*[&&,valueLogical]"], 
	     "STRBEFORE": ["valueLogical","*[&&,valueLogical]"], 
	     "STRAFTER": ["valueLogical","*[&&,valueLogical]"], 
	     "YEAR": ["valueLogical","*[&&,valueLogical]"], 
	     "MONTH": ["valueLogical","*[&&,valueLogical]"], 
	     "DAY": ["valueLogical","*[&&,valueLogical]"], 
	     "HOURS": ["valueLogical","*[&&,valueLogical]"], 
	     "MINUTES": ["valueLogical","*[&&,valueLogical]"], 
	     "SECONDS": ["valueLogical","*[&&,valueLogical]"], 
	     "TIMEZONE": ["valueLogical","*[&&,valueLogical]"], 
	     "TZ": ["valueLogical","*[&&,valueLogical]"], 
	     "NOW": ["valueLogical","*[&&,valueLogical]"], 
	     "UUID": ["valueLogical","*[&&,valueLogical]"], 
	     "STRUUID": ["valueLogical","*[&&,valueLogical]"], 
	     "MD5": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA1": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA256": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA384": ["valueLogical","*[&&,valueLogical]"], 
	     "SHA512": ["valueLogical","*[&&,valueLogical]"], 
	     "COALESCE": ["valueLogical","*[&&,valueLogical]"], 
	     "IF": ["valueLogical","*[&&,valueLogical]"], 
	     "STRLANG": ["valueLogical","*[&&,valueLogical]"], 
	     "STRDT": ["valueLogical","*[&&,valueLogical]"], 
	     "SAMETERM": ["valueLogical","*[&&,valueLogical]"], 
	     "ISIRI": ["valueLogical","*[&&,valueLogical]"], 
	     "ISURI": ["valueLogical","*[&&,valueLogical]"], 
	     "ISBLANK": ["valueLogical","*[&&,valueLogical]"], 
	     "ISLITERAL": ["valueLogical","*[&&,valueLogical]"], 
	     "ISNUMERIC": ["valueLogical","*[&&,valueLogical]"], 
	     "TRUE": ["valueLogical","*[&&,valueLogical]"], 
	     "FALSE": ["valueLogical","*[&&,valueLogical]"], 
	     "COUNT": ["valueLogical","*[&&,valueLogical]"], 
	     "SUM": ["valueLogical","*[&&,valueLogical]"], 
	     "MIN": ["valueLogical","*[&&,valueLogical]"], 
	     "MAX": ["valueLogical","*[&&,valueLogical]"], 
	     "AVG": ["valueLogical","*[&&,valueLogical]"], 
	     "SAMPLE": ["valueLogical","*[&&,valueLogical]"], 
	     "GROUP_CONCAT": ["valueLogical","*[&&,valueLogical]"], 
	     "SUBSTR": ["valueLogical","*[&&,valueLogical]"], 
	     "REPLACE": ["valueLogical","*[&&,valueLogical]"], 
	     "REGEX": ["valueLogical","*[&&,valueLogical]"], 
	     "EXISTS": ["valueLogical","*[&&,valueLogical]"], 
	     "NOT": ["valueLogical","*[&&,valueLogical]"], 
	     "IRI_REF": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL1": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL2": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL_LONG1": ["valueLogical","*[&&,valueLogical]"], 
	     "STRING_LITERAL_LONG2": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE_POSITIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "INTEGER_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DECIMAL_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "DOUBLE_NEGATIVE": ["valueLogical","*[&&,valueLogical]"], 
	     "PNAME_LN": ["valueLogical","*[&&,valueLogical]"], 
	     "PNAME_NS": ["valueLogical","*[&&,valueLogical]"]}, 
	  "conditionalOrExpression" : {
	     "!": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "+": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "-": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "VAR1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "VAR2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "(": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LANG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LANGMATCHES": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DATATYPE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "BOUND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IRI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "URI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "BNODE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "RAND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ABS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CEIL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "FLOOR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ROUND": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CONCAT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRLEN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "UCASE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "LCASE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ENCODE_FOR_URI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "CONTAINS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRSTARTS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRENDS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRBEFORE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRAFTER": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "YEAR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MONTH": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DAY": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "HOURS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MINUTES": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SECONDS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TIMEZONE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TZ": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "NOW": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "UUID": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRUUID": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MD5": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA256": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA384": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SHA512": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "COALESCE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IF": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRLANG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRDT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SAMETERM": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISIRI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISURI": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISBLANK": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISLITERAL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "ISNUMERIC": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "TRUE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "FALSE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "COUNT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SUM": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MIN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "MAX": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "AVG": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SAMPLE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "GROUP_CONCAT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "SUBSTR": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "REPLACE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "REGEX": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "EXISTS": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "NOT": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "IRI_REF": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL_LONG1": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "STRING_LITERAL_LONG2": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE_POSITIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "INTEGER_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DECIMAL_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "DOUBLE_NEGATIVE": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "PNAME_LN": ["conditionalAndExpression","*[||,conditionalAndExpression]"], 
	     "PNAME_NS": ["conditionalAndExpression","*[||,conditionalAndExpression]"]}, 
	  "constraint" : {
	     "(": ["brackettedExpression"], 
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["functionCall"], 
	     "PNAME_LN": ["functionCall"], 
	     "PNAME_NS": ["functionCall"]}, 
	  "constructQuery" : {
	     "CONSTRUCT": ["CONSTRUCT","or([[constructTemplate,*datasetClause,whereClause,solutionModifier],[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]])"]}, 
	  "constructTemplate" : {
	     "{": ["{","?constructTriples","}"]}, 
	  "constructTriples" : {
	     "VAR1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "VAR2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "NIL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "(": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "[": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "IRI_REF": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "TRUE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "FALSE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "ANON": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "PNAME_LN": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "PNAME_NS": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubject","?[.,?constructTriples]"]}, 
	  "copy" : {
	     "COPY": ["COPY","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "create" : {
	     "CREATE": ["CREATE","?SILENT_3","graphRef"]}, 
	  "dataBlock" : {
	     "NIL": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "(": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "VAR1": ["or([inlineDataOneVar,inlineDataFull])"], 
	     "VAR2": ["or([inlineDataOneVar,inlineDataFull])"]}, 
	  "dataBlockValue" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "UNDEF": ["UNDEF"]}, 
	  "datasetClause" : {
	     "FROM": ["FROM","or([defaultGraphClause,namedGraphClause])"]}, 
	  "defaultGraphClause" : {
	     "IRI_REF": ["sourceSelector"], 
	     "PNAME_LN": ["sourceSelector"], 
	     "PNAME_NS": ["sourceSelector"]}, 
	  "delete1" : {
	     "DATA": ["DATA","quadDataNoBnodes"], 
	     "WHERE": ["WHERE","quadPatternNoBnodes"], 
	     "{": ["quadPatternNoBnodes","?insertClause","*usingClause","WHERE","groupGraphPattern"]}, 
	  "deleteClause" : {
	     "DELETE": ["DELETE","quadPattern"]}, 
	  "describeDatasetClause" : {
	     "FROM": ["FROM","or([defaultGraphClause,namedGraphClause])"]}, 
	  "describeQuery" : {
	     "DESCRIBE": ["DESCRIBE","or([+varOrIRIref,*])","*describeDatasetClause","?whereClause","solutionModifier"]}, 
	  "disallowBnodes" : {
	     "}": [], 
	     "GRAPH": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "disallowVars" : {
	     "}": [], 
	     "GRAPH": [], 
	     "VAR1": [], 
	     "VAR2": [], 
	     "NIL": [], 
	     "(": [], 
	     "[": [], 
	     "IRI_REF": [], 
	     "TRUE": [], 
	     "FALSE": [], 
	     "BLANK_NODE_LABEL": [], 
	     "ANON": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "STRING_LITERAL1": [], 
	     "STRING_LITERAL2": [], 
	     "STRING_LITERAL_LONG1": [], 
	     "STRING_LITERAL_LONG2": [], 
	     "INTEGER": [], 
	     "DECIMAL": [], 
	     "DOUBLE": [], 
	     "INTEGER_POSITIVE": [], 
	     "DECIMAL_POSITIVE": [], 
	     "DOUBLE_POSITIVE": [], 
	     "INTEGER_NEGATIVE": [], 
	     "DECIMAL_NEGATIVE": [], 
	     "DOUBLE_NEGATIVE": []}, 
	  "drop" : {
	     "DROP": ["DROP","?SILENT_2","graphRefAll"]}, 
	  "existsFunc" : {
	     "EXISTS": ["EXISTS","groupGraphPattern"]}, 
	  "expression" : {
	     "!": ["conditionalOrExpression"], 
	     "+": ["conditionalOrExpression"], 
	     "-": ["conditionalOrExpression"], 
	     "VAR1": ["conditionalOrExpression"], 
	     "VAR2": ["conditionalOrExpression"], 
	     "(": ["conditionalOrExpression"], 
	     "STR": ["conditionalOrExpression"], 
	     "LANG": ["conditionalOrExpression"], 
	     "LANGMATCHES": ["conditionalOrExpression"], 
	     "DATATYPE": ["conditionalOrExpression"], 
	     "BOUND": ["conditionalOrExpression"], 
	     "IRI": ["conditionalOrExpression"], 
	     "URI": ["conditionalOrExpression"], 
	     "BNODE": ["conditionalOrExpression"], 
	     "RAND": ["conditionalOrExpression"], 
	     "ABS": ["conditionalOrExpression"], 
	     "CEIL": ["conditionalOrExpression"], 
	     "FLOOR": ["conditionalOrExpression"], 
	     "ROUND": ["conditionalOrExpression"], 
	     "CONCAT": ["conditionalOrExpression"], 
	     "STRLEN": ["conditionalOrExpression"], 
	     "UCASE": ["conditionalOrExpression"], 
	     "LCASE": ["conditionalOrExpression"], 
	     "ENCODE_FOR_URI": ["conditionalOrExpression"], 
	     "CONTAINS": ["conditionalOrExpression"], 
	     "STRSTARTS": ["conditionalOrExpression"], 
	     "STRENDS": ["conditionalOrExpression"], 
	     "STRBEFORE": ["conditionalOrExpression"], 
	     "STRAFTER": ["conditionalOrExpression"], 
	     "YEAR": ["conditionalOrExpression"], 
	     "MONTH": ["conditionalOrExpression"], 
	     "DAY": ["conditionalOrExpression"], 
	     "HOURS": ["conditionalOrExpression"], 
	     "MINUTES": ["conditionalOrExpression"], 
	     "SECONDS": ["conditionalOrExpression"], 
	     "TIMEZONE": ["conditionalOrExpression"], 
	     "TZ": ["conditionalOrExpression"], 
	     "NOW": ["conditionalOrExpression"], 
	     "UUID": ["conditionalOrExpression"], 
	     "STRUUID": ["conditionalOrExpression"], 
	     "MD5": ["conditionalOrExpression"], 
	     "SHA1": ["conditionalOrExpression"], 
	     "SHA256": ["conditionalOrExpression"], 
	     "SHA384": ["conditionalOrExpression"], 
	     "SHA512": ["conditionalOrExpression"], 
	     "COALESCE": ["conditionalOrExpression"], 
	     "IF": ["conditionalOrExpression"], 
	     "STRLANG": ["conditionalOrExpression"], 
	     "STRDT": ["conditionalOrExpression"], 
	     "SAMETERM": ["conditionalOrExpression"], 
	     "ISIRI": ["conditionalOrExpression"], 
	     "ISURI": ["conditionalOrExpression"], 
	     "ISBLANK": ["conditionalOrExpression"], 
	     "ISLITERAL": ["conditionalOrExpression"], 
	     "ISNUMERIC": ["conditionalOrExpression"], 
	     "TRUE": ["conditionalOrExpression"], 
	     "FALSE": ["conditionalOrExpression"], 
	     "COUNT": ["conditionalOrExpression"], 
	     "SUM": ["conditionalOrExpression"], 
	     "MIN": ["conditionalOrExpression"], 
	     "MAX": ["conditionalOrExpression"], 
	     "AVG": ["conditionalOrExpression"], 
	     "SAMPLE": ["conditionalOrExpression"], 
	     "GROUP_CONCAT": ["conditionalOrExpression"], 
	     "SUBSTR": ["conditionalOrExpression"], 
	     "REPLACE": ["conditionalOrExpression"], 
	     "REGEX": ["conditionalOrExpression"], 
	     "EXISTS": ["conditionalOrExpression"], 
	     "NOT": ["conditionalOrExpression"], 
	     "IRI_REF": ["conditionalOrExpression"], 
	     "STRING_LITERAL1": ["conditionalOrExpression"], 
	     "STRING_LITERAL2": ["conditionalOrExpression"], 
	     "STRING_LITERAL_LONG1": ["conditionalOrExpression"], 
	     "STRING_LITERAL_LONG2": ["conditionalOrExpression"], 
	     "INTEGER": ["conditionalOrExpression"], 
	     "DECIMAL": ["conditionalOrExpression"], 
	     "DOUBLE": ["conditionalOrExpression"], 
	     "INTEGER_POSITIVE": ["conditionalOrExpression"], 
	     "DECIMAL_POSITIVE": ["conditionalOrExpression"], 
	     "DOUBLE_POSITIVE": ["conditionalOrExpression"], 
	     "INTEGER_NEGATIVE": ["conditionalOrExpression"], 
	     "DECIMAL_NEGATIVE": ["conditionalOrExpression"], 
	     "DOUBLE_NEGATIVE": ["conditionalOrExpression"], 
	     "PNAME_LN": ["conditionalOrExpression"], 
	     "PNAME_NS": ["conditionalOrExpression"]}, 
	  "expressionList" : {
	     "NIL": ["NIL"], 
	     "(": ["(","expression","*[,,expression]",")"]}, 
	  "filter" : {
	     "FILTER": ["FILTER","constraint"]}, 
	  "functionCall" : {
	     "IRI_REF": ["iriRef","argList"], 
	     "PNAME_LN": ["iriRef","argList"], 
	     "PNAME_NS": ["iriRef","argList"]}, 
	  "graphGraphPattern" : {
	     "GRAPH": ["GRAPH","varOrIRIref","groupGraphPattern"]}, 
	  "graphNode" : {
	     "VAR1": ["varOrTerm"], 
	     "VAR2": ["varOrTerm"], 
	     "NIL": ["varOrTerm"], 
	     "IRI_REF": ["varOrTerm"], 
	     "TRUE": ["varOrTerm"], 
	     "FALSE": ["varOrTerm"], 
	     "BLANK_NODE_LABEL": ["varOrTerm"], 
	     "ANON": ["varOrTerm"], 
	     "PNAME_LN": ["varOrTerm"], 
	     "PNAME_NS": ["varOrTerm"], 
	     "STRING_LITERAL1": ["varOrTerm"], 
	     "STRING_LITERAL2": ["varOrTerm"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm"], 
	     "INTEGER": ["varOrTerm"], 
	     "DECIMAL": ["varOrTerm"], 
	     "DOUBLE": ["varOrTerm"], 
	     "INTEGER_POSITIVE": ["varOrTerm"], 
	     "DECIMAL_POSITIVE": ["varOrTerm"], 
	     "DOUBLE_POSITIVE": ["varOrTerm"], 
	     "INTEGER_NEGATIVE": ["varOrTerm"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm"], 
	     "(": ["triplesNode"], 
	     "[": ["triplesNode"]}, 
	  "graphNodePath" : {
	     "VAR1": ["varOrTerm"], 
	     "VAR2": ["varOrTerm"], 
	     "NIL": ["varOrTerm"], 
	     "IRI_REF": ["varOrTerm"], 
	     "TRUE": ["varOrTerm"], 
	     "FALSE": ["varOrTerm"], 
	     "BLANK_NODE_LABEL": ["varOrTerm"], 
	     "ANON": ["varOrTerm"], 
	     "PNAME_LN": ["varOrTerm"], 
	     "PNAME_NS": ["varOrTerm"], 
	     "STRING_LITERAL1": ["varOrTerm"], 
	     "STRING_LITERAL2": ["varOrTerm"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm"], 
	     "INTEGER": ["varOrTerm"], 
	     "DECIMAL": ["varOrTerm"], 
	     "DOUBLE": ["varOrTerm"], 
	     "INTEGER_POSITIVE": ["varOrTerm"], 
	     "DECIMAL_POSITIVE": ["varOrTerm"], 
	     "DOUBLE_POSITIVE": ["varOrTerm"], 
	     "INTEGER_NEGATIVE": ["varOrTerm"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm"], 
	     "(": ["triplesNodePath"], 
	     "[": ["triplesNodePath"]}, 
	  "graphOrDefault" : {
	     "DEFAULT": ["DEFAULT"], 
	     "IRI_REF": ["?GRAPH","iriRef"], 
	     "PNAME_LN": ["?GRAPH","iriRef"], 
	     "PNAME_NS": ["?GRAPH","iriRef"], 
	     "GRAPH": ["?GRAPH","iriRef"]}, 
	  "graphPatternNotTriples" : {
	     "{": ["groupOrUnionGraphPattern"], 
	     "OPTIONAL": ["optionalGraphPattern"], 
	     "MINUS": ["minusGraphPattern"], 
	     "GRAPH": ["graphGraphPattern"], 
	     "SERVICE": ["serviceGraphPattern"], 
	     "FILTER": ["filter"], 
	     "BIND": ["bind"], 
	     "VALUES": ["inlineData"]}, 
	  "graphRef" : {
	     "GRAPH": ["GRAPH","iriRef"]}, 
	  "graphRefAll" : {
	     "GRAPH": ["graphRef"], 
	     "DEFAULT": ["DEFAULT"], 
	     "NAMED": ["NAMED"], 
	     "ALL": ["ALL"]}, 
	  "graphTerm" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "BLANK_NODE_LABEL": ["blankNode"], 
	     "ANON": ["blankNode"], 
	     "NIL": ["NIL"]}, 
	  "groupClause" : {
	     "GROUP": ["GROUP","BY","+groupCondition"]}, 
	  "groupCondition" : {
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["functionCall"], 
	     "PNAME_LN": ["functionCall"], 
	     "PNAME_NS": ["functionCall"], 
	     "(": ["(","expression","?[AS,var]",")"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "groupGraphPattern" : {
	     "{": ["{","or([subSelect,groupGraphPatternSub])","}"]}, 
	  "groupGraphPatternSub" : {
	     "{": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "OPTIONAL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "MINUS": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "GRAPH": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "SERVICE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FILTER": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BIND": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VALUES": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VAR1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "VAR2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "NIL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "(": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "[": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "IRI_REF": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "TRUE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "FALSE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "BLANK_NODE_LABEL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "ANON": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "PNAME_LN": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "PNAME_NS": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG1": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG2": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE_POSITIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "INTEGER_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DECIMAL_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "DOUBLE_NEGATIVE": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"], 
	     "}": ["?triplesBlock","*[graphPatternNotTriples,?.,?triplesBlock]"]}, 
	  "groupOrUnionGraphPattern" : {
	     "{": ["groupGraphPattern","*[UNION,groupGraphPattern]"]}, 
	  "havingClause" : {
	     "HAVING": ["HAVING","+havingCondition"]}, 
	  "havingCondition" : {
	     "(": ["constraint"], 
	     "STR": ["constraint"], 
	     "LANG": ["constraint"], 
	     "LANGMATCHES": ["constraint"], 
	     "DATATYPE": ["constraint"], 
	     "BOUND": ["constraint"], 
	     "IRI": ["constraint"], 
	     "URI": ["constraint"], 
	     "BNODE": ["constraint"], 
	     "RAND": ["constraint"], 
	     "ABS": ["constraint"], 
	     "CEIL": ["constraint"], 
	     "FLOOR": ["constraint"], 
	     "ROUND": ["constraint"], 
	     "CONCAT": ["constraint"], 
	     "STRLEN": ["constraint"], 
	     "UCASE": ["constraint"], 
	     "LCASE": ["constraint"], 
	     "ENCODE_FOR_URI": ["constraint"], 
	     "CONTAINS": ["constraint"], 
	     "STRSTARTS": ["constraint"], 
	     "STRENDS": ["constraint"], 
	     "STRBEFORE": ["constraint"], 
	     "STRAFTER": ["constraint"], 
	     "YEAR": ["constraint"], 
	     "MONTH": ["constraint"], 
	     "DAY": ["constraint"], 
	     "HOURS": ["constraint"], 
	     "MINUTES": ["constraint"], 
	     "SECONDS": ["constraint"], 
	     "TIMEZONE": ["constraint"], 
	     "TZ": ["constraint"], 
	     "NOW": ["constraint"], 
	     "UUID": ["constraint"], 
	     "STRUUID": ["constraint"], 
	     "MD5": ["constraint"], 
	     "SHA1": ["constraint"], 
	     "SHA256": ["constraint"], 
	     "SHA384": ["constraint"], 
	     "SHA512": ["constraint"], 
	     "COALESCE": ["constraint"], 
	     "IF": ["constraint"], 
	     "STRLANG": ["constraint"], 
	     "STRDT": ["constraint"], 
	     "SAMETERM": ["constraint"], 
	     "ISIRI": ["constraint"], 
	     "ISURI": ["constraint"], 
	     "ISBLANK": ["constraint"], 
	     "ISLITERAL": ["constraint"], 
	     "ISNUMERIC": ["constraint"], 
	     "SUBSTR": ["constraint"], 
	     "REPLACE": ["constraint"], 
	     "REGEX": ["constraint"], 
	     "EXISTS": ["constraint"], 
	     "NOT": ["constraint"], 
	     "IRI_REF": ["constraint"], 
	     "PNAME_LN": ["constraint"], 
	     "PNAME_NS": ["constraint"]}, 
	  "inlineData" : {
	     "VALUES": ["VALUES","dataBlock"]}, 
	  "inlineDataFull" : {
	     "NIL": ["or([NIL,[ (,*var,)]])","{","*or([[ (,*dataBlockValue,)],NIL])","}"], 
	     "(": ["or([NIL,[ (,*var,)]])","{","*or([[ (,*dataBlockValue,)],NIL])","}"]}, 
	  "inlineDataOneVar" : {
	     "VAR1": ["var","{","*dataBlockValue","}"], 
	     "VAR2": ["var","{","*dataBlockValue","}"]}, 
	  "insert1" : {
	     "DATA": ["DATA","quadData"], 
	     "{": ["quadPattern","*usingClause","WHERE","groupGraphPattern"]}, 
	  "insertClause" : {
	     "INSERT": ["INSERT","quadPattern"]}, 
	  "integer" : {
	     "INTEGER": ["INTEGER"]}, 
	  "iriRef" : {
	     "IRI_REF": ["IRI_REF"], 
	     "PNAME_LN": ["prefixedName"], 
	     "PNAME_NS": ["prefixedName"]}, 
	  "iriRefOrFunction" : {
	     "IRI_REF": ["iriRef","?argList"], 
	     "PNAME_LN": ["iriRef","?argList"], 
	     "PNAME_NS": ["iriRef","?argList"]}, 
	  "limitClause" : {
	     "LIMIT": ["LIMIT","INTEGER"]}, 
	  "limitOffsetClauses" : {
	     "LIMIT": ["limitClause","?offsetClause"], 
	     "OFFSET": ["offsetClause","?limitClause"]}, 
	  "load" : {
	     "LOAD": ["LOAD","?SILENT_1","iriRef","?[INTO,graphRef]"]}, 
	  "minusGraphPattern" : {
	     "MINUS": ["MINUS","groupGraphPattern"]}, 
	  "modify" : {
	     "WITH": ["WITH","iriRef","or([[deleteClause,?insertClause],insertClause])","*usingClause","WHERE","groupGraphPattern"]}, 
	  "move" : {
	     "MOVE": ["MOVE","?SILENT_4","graphOrDefault","TO","graphOrDefault"]}, 
	  "multiplicativeExpression" : {
	     "!": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "+": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "-": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "VAR1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "VAR2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "(": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LANG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LANGMATCHES": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DATATYPE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "BOUND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IRI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "URI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "BNODE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "RAND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ABS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CEIL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "FLOOR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ROUND": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CONCAT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRLEN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "UCASE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "LCASE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ENCODE_FOR_URI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "CONTAINS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRSTARTS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRENDS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRBEFORE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRAFTER": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "YEAR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MONTH": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DAY": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "HOURS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MINUTES": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SECONDS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TIMEZONE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TZ": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "NOW": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "UUID": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRUUID": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MD5": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA256": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA384": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SHA512": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "COALESCE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IF": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRLANG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRDT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SAMETERM": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISIRI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISURI": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISBLANK": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISLITERAL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "ISNUMERIC": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "TRUE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "FALSE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "COUNT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SUM": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MIN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "MAX": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "AVG": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SAMPLE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "GROUP_CONCAT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "SUBSTR": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "REPLACE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "REGEX": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "EXISTS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "NOT": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "IRI_REF": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL_LONG1": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "STRING_LITERAL_LONG2": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_POSITIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "INTEGER_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DECIMAL_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "DOUBLE_NEGATIVE": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "PNAME_LN": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"], 
	     "PNAME_NS": ["unaryExpression","*or([[*,unaryExpression],[/,unaryExpression]])"]}, 
	  "namedGraphClause" : {
	     "NAMED": ["NAMED","sourceSelector"]}, 
	  "notExistsFunc" : {
	     "NOT": ["NOT","EXISTS","groupGraphPattern"]}, 
	  "numericExpression" : {
	     "!": ["additiveExpression"], 
	     "+": ["additiveExpression"], 
	     "-": ["additiveExpression"], 
	     "VAR1": ["additiveExpression"], 
	     "VAR2": ["additiveExpression"], 
	     "(": ["additiveExpression"], 
	     "STR": ["additiveExpression"], 
	     "LANG": ["additiveExpression"], 
	     "LANGMATCHES": ["additiveExpression"], 
	     "DATATYPE": ["additiveExpression"], 
	     "BOUND": ["additiveExpression"], 
	     "IRI": ["additiveExpression"], 
	     "URI": ["additiveExpression"], 
	     "BNODE": ["additiveExpression"], 
	     "RAND": ["additiveExpression"], 
	     "ABS": ["additiveExpression"], 
	     "CEIL": ["additiveExpression"], 
	     "FLOOR": ["additiveExpression"], 
	     "ROUND": ["additiveExpression"], 
	     "CONCAT": ["additiveExpression"], 
	     "STRLEN": ["additiveExpression"], 
	     "UCASE": ["additiveExpression"], 
	     "LCASE": ["additiveExpression"], 
	     "ENCODE_FOR_URI": ["additiveExpression"], 
	     "CONTAINS": ["additiveExpression"], 
	     "STRSTARTS": ["additiveExpression"], 
	     "STRENDS": ["additiveExpression"], 
	     "STRBEFORE": ["additiveExpression"], 
	     "STRAFTER": ["additiveExpression"], 
	     "YEAR": ["additiveExpression"], 
	     "MONTH": ["additiveExpression"], 
	     "DAY": ["additiveExpression"], 
	     "HOURS": ["additiveExpression"], 
	     "MINUTES": ["additiveExpression"], 
	     "SECONDS": ["additiveExpression"], 
	     "TIMEZONE": ["additiveExpression"], 
	     "TZ": ["additiveExpression"], 
	     "NOW": ["additiveExpression"], 
	     "UUID": ["additiveExpression"], 
	     "STRUUID": ["additiveExpression"], 
	     "MD5": ["additiveExpression"], 
	     "SHA1": ["additiveExpression"], 
	     "SHA256": ["additiveExpression"], 
	     "SHA384": ["additiveExpression"], 
	     "SHA512": ["additiveExpression"], 
	     "COALESCE": ["additiveExpression"], 
	     "IF": ["additiveExpression"], 
	     "STRLANG": ["additiveExpression"], 
	     "STRDT": ["additiveExpression"], 
	     "SAMETERM": ["additiveExpression"], 
	     "ISIRI": ["additiveExpression"], 
	     "ISURI": ["additiveExpression"], 
	     "ISBLANK": ["additiveExpression"], 
	     "ISLITERAL": ["additiveExpression"], 
	     "ISNUMERIC": ["additiveExpression"], 
	     "TRUE": ["additiveExpression"], 
	     "FALSE": ["additiveExpression"], 
	     "COUNT": ["additiveExpression"], 
	     "SUM": ["additiveExpression"], 
	     "MIN": ["additiveExpression"], 
	     "MAX": ["additiveExpression"], 
	     "AVG": ["additiveExpression"], 
	     "SAMPLE": ["additiveExpression"], 
	     "GROUP_CONCAT": ["additiveExpression"], 
	     "SUBSTR": ["additiveExpression"], 
	     "REPLACE": ["additiveExpression"], 
	     "REGEX": ["additiveExpression"], 
	     "EXISTS": ["additiveExpression"], 
	     "NOT": ["additiveExpression"], 
	     "IRI_REF": ["additiveExpression"], 
	     "STRING_LITERAL1": ["additiveExpression"], 
	     "STRING_LITERAL2": ["additiveExpression"], 
	     "STRING_LITERAL_LONG1": ["additiveExpression"], 
	     "STRING_LITERAL_LONG2": ["additiveExpression"], 
	     "INTEGER": ["additiveExpression"], 
	     "DECIMAL": ["additiveExpression"], 
	     "DOUBLE": ["additiveExpression"], 
	     "INTEGER_POSITIVE": ["additiveExpression"], 
	     "DECIMAL_POSITIVE": ["additiveExpression"], 
	     "DOUBLE_POSITIVE": ["additiveExpression"], 
	     "INTEGER_NEGATIVE": ["additiveExpression"], 
	     "DECIMAL_NEGATIVE": ["additiveExpression"], 
	     "DOUBLE_NEGATIVE": ["additiveExpression"], 
	     "PNAME_LN": ["additiveExpression"], 
	     "PNAME_NS": ["additiveExpression"]}, 
	  "numericLiteral" : {
	     "INTEGER": ["numericLiteralUnsigned"], 
	     "DECIMAL": ["numericLiteralUnsigned"], 
	     "DOUBLE": ["numericLiteralUnsigned"], 
	     "INTEGER_POSITIVE": ["numericLiteralPositive"], 
	     "DECIMAL_POSITIVE": ["numericLiteralPositive"], 
	     "DOUBLE_POSITIVE": ["numericLiteralPositive"], 
	     "INTEGER_NEGATIVE": ["numericLiteralNegative"], 
	     "DECIMAL_NEGATIVE": ["numericLiteralNegative"], 
	     "DOUBLE_NEGATIVE": ["numericLiteralNegative"]}, 
	  "numericLiteralNegative" : {
	     "INTEGER_NEGATIVE": ["INTEGER_NEGATIVE"], 
	     "DECIMAL_NEGATIVE": ["DECIMAL_NEGATIVE"], 
	     "DOUBLE_NEGATIVE": ["DOUBLE_NEGATIVE"]}, 
	  "numericLiteralPositive" : {
	     "INTEGER_POSITIVE": ["INTEGER_POSITIVE"], 
	     "DECIMAL_POSITIVE": ["DECIMAL_POSITIVE"], 
	     "DOUBLE_POSITIVE": ["DOUBLE_POSITIVE"]}, 
	  "numericLiteralUnsigned" : {
	     "INTEGER": ["INTEGER"], 
	     "DECIMAL": ["DECIMAL"], 
	     "DOUBLE": ["DOUBLE"]}, 
	  "object" : {
	     "(": ["graphNode"], 
	     "[": ["graphNode"], 
	     "VAR1": ["graphNode"], 
	     "VAR2": ["graphNode"], 
	     "NIL": ["graphNode"], 
	     "IRI_REF": ["graphNode"], 
	     "TRUE": ["graphNode"], 
	     "FALSE": ["graphNode"], 
	     "BLANK_NODE_LABEL": ["graphNode"], 
	     "ANON": ["graphNode"], 
	     "PNAME_LN": ["graphNode"], 
	     "PNAME_NS": ["graphNode"], 
	     "STRING_LITERAL1": ["graphNode"], 
	     "STRING_LITERAL2": ["graphNode"], 
	     "STRING_LITERAL_LONG1": ["graphNode"], 
	     "STRING_LITERAL_LONG2": ["graphNode"], 
	     "INTEGER": ["graphNode"], 
	     "DECIMAL": ["graphNode"], 
	     "DOUBLE": ["graphNode"], 
	     "INTEGER_POSITIVE": ["graphNode"], 
	     "DECIMAL_POSITIVE": ["graphNode"], 
	     "DOUBLE_POSITIVE": ["graphNode"], 
	     "INTEGER_NEGATIVE": ["graphNode"], 
	     "DECIMAL_NEGATIVE": ["graphNode"], 
	     "DOUBLE_NEGATIVE": ["graphNode"]}, 
	  "objectList" : {
	     "(": ["object","*[,,object]"], 
	     "[": ["object","*[,,object]"], 
	     "VAR1": ["object","*[,,object]"], 
	     "VAR2": ["object","*[,,object]"], 
	     "NIL": ["object","*[,,object]"], 
	     "IRI_REF": ["object","*[,,object]"], 
	     "TRUE": ["object","*[,,object]"], 
	     "FALSE": ["object","*[,,object]"], 
	     "BLANK_NODE_LABEL": ["object","*[,,object]"], 
	     "ANON": ["object","*[,,object]"], 
	     "PNAME_LN": ["object","*[,,object]"], 
	     "PNAME_NS": ["object","*[,,object]"], 
	     "STRING_LITERAL1": ["object","*[,,object]"], 
	     "STRING_LITERAL2": ["object","*[,,object]"], 
	     "STRING_LITERAL_LONG1": ["object","*[,,object]"], 
	     "STRING_LITERAL_LONG2": ["object","*[,,object]"], 
	     "INTEGER": ["object","*[,,object]"], 
	     "DECIMAL": ["object","*[,,object]"], 
	     "DOUBLE": ["object","*[,,object]"], 
	     "INTEGER_POSITIVE": ["object","*[,,object]"], 
	     "DECIMAL_POSITIVE": ["object","*[,,object]"], 
	     "DOUBLE_POSITIVE": ["object","*[,,object]"], 
	     "INTEGER_NEGATIVE": ["object","*[,,object]"], 
	     "DECIMAL_NEGATIVE": ["object","*[,,object]"], 
	     "DOUBLE_NEGATIVE": ["object","*[,,object]"]}, 
	  "objectListPath" : {
	     "(": ["objectPath","*[,,objectPath]"], 
	     "[": ["objectPath","*[,,objectPath]"], 
	     "VAR1": ["objectPath","*[,,objectPath]"], 
	     "VAR2": ["objectPath","*[,,objectPath]"], 
	     "NIL": ["objectPath","*[,,objectPath]"], 
	     "IRI_REF": ["objectPath","*[,,objectPath]"], 
	     "TRUE": ["objectPath","*[,,objectPath]"], 
	     "FALSE": ["objectPath","*[,,objectPath]"], 
	     "BLANK_NODE_LABEL": ["objectPath","*[,,objectPath]"], 
	     "ANON": ["objectPath","*[,,objectPath]"], 
	     "PNAME_LN": ["objectPath","*[,,objectPath]"], 
	     "PNAME_NS": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL1": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL2": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL_LONG1": ["objectPath","*[,,objectPath]"], 
	     "STRING_LITERAL_LONG2": ["objectPath","*[,,objectPath]"], 
	     "INTEGER": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE": ["objectPath","*[,,objectPath]"], 
	     "INTEGER_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE_POSITIVE": ["objectPath","*[,,objectPath]"], 
	     "INTEGER_NEGATIVE": ["objectPath","*[,,objectPath]"], 
	     "DECIMAL_NEGATIVE": ["objectPath","*[,,objectPath]"], 
	     "DOUBLE_NEGATIVE": ["objectPath","*[,,objectPath]"]}, 
	  "objectPath" : {
	     "(": ["graphNodePath"], 
	     "[": ["graphNodePath"], 
	     "VAR1": ["graphNodePath"], 
	     "VAR2": ["graphNodePath"], 
	     "NIL": ["graphNodePath"], 
	     "IRI_REF": ["graphNodePath"], 
	     "TRUE": ["graphNodePath"], 
	     "FALSE": ["graphNodePath"], 
	     "BLANK_NODE_LABEL": ["graphNodePath"], 
	     "ANON": ["graphNodePath"], 
	     "PNAME_LN": ["graphNodePath"], 
	     "PNAME_NS": ["graphNodePath"], 
	     "STRING_LITERAL1": ["graphNodePath"], 
	     "STRING_LITERAL2": ["graphNodePath"], 
	     "STRING_LITERAL_LONG1": ["graphNodePath"], 
	     "STRING_LITERAL_LONG2": ["graphNodePath"], 
	     "INTEGER": ["graphNodePath"], 
	     "DECIMAL": ["graphNodePath"], 
	     "DOUBLE": ["graphNodePath"], 
	     "INTEGER_POSITIVE": ["graphNodePath"], 
	     "DECIMAL_POSITIVE": ["graphNodePath"], 
	     "DOUBLE_POSITIVE": ["graphNodePath"], 
	     "INTEGER_NEGATIVE": ["graphNodePath"], 
	     "DECIMAL_NEGATIVE": ["graphNodePath"], 
	     "DOUBLE_NEGATIVE": ["graphNodePath"]}, 
	  "offsetClause" : {
	     "OFFSET": ["OFFSET","INTEGER"]}, 
	  "optionalGraphPattern" : {
	     "OPTIONAL": ["OPTIONAL","groupGraphPattern"]}, 
	  "or([*,expression])" : {
	     "*": ["*"], 
	     "!": ["expression"], 
	     "+": ["expression"], 
	     "-": ["expression"], 
	     "VAR1": ["expression"], 
	     "VAR2": ["expression"], 
	     "(": ["expression"], 
	     "STR": ["expression"], 
	     "LANG": ["expression"], 
	     "LANGMATCHES": ["expression"], 
	     "DATATYPE": ["expression"], 
	     "BOUND": ["expression"], 
	     "IRI": ["expression"], 
	     "URI": ["expression"], 
	     "BNODE": ["expression"], 
	     "RAND": ["expression"], 
	     "ABS": ["expression"], 
	     "CEIL": ["expression"], 
	     "FLOOR": ["expression"], 
	     "ROUND": ["expression"], 
	     "CONCAT": ["expression"], 
	     "STRLEN": ["expression"], 
	     "UCASE": ["expression"], 
	     "LCASE": ["expression"], 
	     "ENCODE_FOR_URI": ["expression"], 
	     "CONTAINS": ["expression"], 
	     "STRSTARTS": ["expression"], 
	     "STRENDS": ["expression"], 
	     "STRBEFORE": ["expression"], 
	     "STRAFTER": ["expression"], 
	     "YEAR": ["expression"], 
	     "MONTH": ["expression"], 
	     "DAY": ["expression"], 
	     "HOURS": ["expression"], 
	     "MINUTES": ["expression"], 
	     "SECONDS": ["expression"], 
	     "TIMEZONE": ["expression"], 
	     "TZ": ["expression"], 
	     "NOW": ["expression"], 
	     "UUID": ["expression"], 
	     "STRUUID": ["expression"], 
	     "MD5": ["expression"], 
	     "SHA1": ["expression"], 
	     "SHA256": ["expression"], 
	     "SHA384": ["expression"], 
	     "SHA512": ["expression"], 
	     "COALESCE": ["expression"], 
	     "IF": ["expression"], 
	     "STRLANG": ["expression"], 
	     "STRDT": ["expression"], 
	     "SAMETERM": ["expression"], 
	     "ISIRI": ["expression"], 
	     "ISURI": ["expression"], 
	     "ISBLANK": ["expression"], 
	     "ISLITERAL": ["expression"], 
	     "ISNUMERIC": ["expression"], 
	     "TRUE": ["expression"], 
	     "FALSE": ["expression"], 
	     "COUNT": ["expression"], 
	     "SUM": ["expression"], 
	     "MIN": ["expression"], 
	     "MAX": ["expression"], 
	     "AVG": ["expression"], 
	     "SAMPLE": ["expression"], 
	     "GROUP_CONCAT": ["expression"], 
	     "SUBSTR": ["expression"], 
	     "REPLACE": ["expression"], 
	     "REGEX": ["expression"], 
	     "EXISTS": ["expression"], 
	     "NOT": ["expression"], 
	     "IRI_REF": ["expression"], 
	     "STRING_LITERAL1": ["expression"], 
	     "STRING_LITERAL2": ["expression"], 
	     "STRING_LITERAL_LONG1": ["expression"], 
	     "STRING_LITERAL_LONG2": ["expression"], 
	     "INTEGER": ["expression"], 
	     "DECIMAL": ["expression"], 
	     "DOUBLE": ["expression"], 
	     "INTEGER_POSITIVE": ["expression"], 
	     "DECIMAL_POSITIVE": ["expression"], 
	     "DOUBLE_POSITIVE": ["expression"], 
	     "INTEGER_NEGATIVE": ["expression"], 
	     "DECIMAL_NEGATIVE": ["expression"], 
	     "DOUBLE_NEGATIVE": ["expression"], 
	     "PNAME_LN": ["expression"], 
	     "PNAME_NS": ["expression"]}, 
	  "or([+or([var,[ (,expression,AS,var,)]]),*])" : {
	     "(": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "VAR1": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "VAR2": ["+or([var,[ (,expression,AS,var,)]])"], 
	     "*": ["*"]}, 
	  "or([+varOrIRIref,*])" : {
	     "VAR1": ["+varOrIRIref"], 
	     "VAR2": ["+varOrIRIref"], 
	     "IRI_REF": ["+varOrIRIref"], 
	     "PNAME_LN": ["+varOrIRIref"], 
	     "PNAME_NS": ["+varOrIRIref"], 
	     "*": ["*"]}, 
	  "or([ASC,DESC])" : {
	     "ASC": ["ASC"], 
	     "DESC": ["DESC"]}, 
	  "or([DISTINCT,REDUCED])" : {
	     "DISTINCT": ["DISTINCT"], 
	     "REDUCED": ["REDUCED"]}, 
	  "or([LANGTAG,[^^,iriRef]])" : {
	     "LANGTAG": ["LANGTAG"], 
	     "^^": ["[^^,iriRef]"]}, 
	  "or([NIL,[ (,*var,)]])" : {
	     "NIL": ["NIL"], 
	     "(": ["[ (,*var,)]"]}, 
	  "or([[ (,*dataBlockValue,)],NIL])" : {
	     "(": ["[ (,*dataBlockValue,)]"], 
	     "NIL": ["NIL"]}, 
	  "or([[ (,expression,)],NIL])" : {
	     "(": ["[ (,expression,)]"], 
	     "NIL": ["NIL"]}, 
	  "or([[*,unaryExpression],[/,unaryExpression]])" : {
	     "*": ["[*,unaryExpression]"], 
	     "/": ["[/,unaryExpression]"]}, 
	  "or([[+,multiplicativeExpression],[-,multiplicativeExpression],[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]])" : {
	     "+": ["[+,multiplicativeExpression]"], 
	     "-": ["[-,multiplicativeExpression]"], 
	     "INTEGER_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DECIMAL_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DOUBLE_POSITIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "INTEGER_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DECIMAL_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"], 
	     "DOUBLE_NEGATIVE": ["[or([numericLiteralPositive,numericLiteralNegative]),?or([[*,unaryExpression],[/,unaryExpression]])]"]}, 
	  "or([[,,or([},[integer,}]])],}])" : {
	     ",": ["[,,or([},[integer,}]])]"], 
	     "}": ["}"]}, 
	  "or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])" : {
	     "=": ["[=,numericExpression]"], 
	     "!=": ["[!=,numericExpression]"], 
	     "<": ["[<,numericExpression]"], 
	     ">": ["[>,numericExpression]"], 
	     "<=": ["[<=,numericExpression]"], 
	     ">=": ["[>=,numericExpression]"], 
	     "IN": ["[IN,expressionList]"], 
	     "NOT": ["[NOT,IN,expressionList]"]}, 
	  "or([[constructTemplate,*datasetClause,whereClause,solutionModifier],[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]])" : {
	     "{": ["[constructTemplate,*datasetClause,whereClause,solutionModifier]"], 
	     "WHERE": ["[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]"], 
	     "FROM": ["[*datasetClause,WHERE,{,?triplesTemplate,},solutionModifier]"]}, 
	  "or([[deleteClause,?insertClause],insertClause])" : {
	     "DELETE": ["[deleteClause,?insertClause]"], 
	     "INSERT": ["insertClause"]}, 
	  "or([[integer,or([[,,or([},[integer,}]])],}])],[,,integer,}]])" : {
	     "INTEGER": ["[integer,or([[,,or([},[integer,}]])],}])]"], 
	     ",": ["[,,integer,}]"]}, 
	  "or([defaultGraphClause,namedGraphClause])" : {
	     "IRI_REF": ["defaultGraphClause"], 
	     "PNAME_LN": ["defaultGraphClause"], 
	     "PNAME_NS": ["defaultGraphClause"], 
	     "NAMED": ["namedGraphClause"]}, 
	  "or([inlineDataOneVar,inlineDataFull])" : {
	     "VAR1": ["inlineDataOneVar"], 
	     "VAR2": ["inlineDataOneVar"], 
	     "NIL": ["inlineDataFull"], 
	     "(": ["inlineDataFull"]}, 
	  "or([iriRef,[NAMED,iriRef]])" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "NAMED": ["[NAMED,iriRef]"]}, 
	  "or([iriRef,a])" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "a": ["a"]}, 
	  "or([numericLiteralPositive,numericLiteralNegative])" : {
	     "INTEGER_POSITIVE": ["numericLiteralPositive"], 
	     "DECIMAL_POSITIVE": ["numericLiteralPositive"], 
	     "DOUBLE_POSITIVE": ["numericLiteralPositive"], 
	     "INTEGER_NEGATIVE": ["numericLiteralNegative"], 
	     "DECIMAL_NEGATIVE": ["numericLiteralNegative"], 
	     "DOUBLE_NEGATIVE": ["numericLiteralNegative"]}, 
	  "or([queryAll,updateAll])" : {
	     "CONSTRUCT": ["queryAll"], 
	     "DESCRIBE": ["queryAll"], 
	     "ASK": ["queryAll"], 
	     "SELECT": ["queryAll"], 
	     "INSERT": ["updateAll"], 
	     "DELETE": ["updateAll"], 
	     "LOAD": ["updateAll"], 
	     "CLEAR": ["updateAll"], 
	     "DROP": ["updateAll"], 
	     "ADD": ["updateAll"], 
	     "MOVE": ["updateAll"], 
	     "COPY": ["updateAll"], 
	     "CREATE": ["updateAll"], 
	     "WITH": ["updateAll"], 
	     "$": ["updateAll"]}, 
	  "or([selectQuery,constructQuery,describeQuery,askQuery])" : {
	     "SELECT": ["selectQuery"], 
	     "CONSTRUCT": ["constructQuery"], 
	     "DESCRIBE": ["describeQuery"], 
	     "ASK": ["askQuery"]}, 
	  "or([subSelect,groupGraphPatternSub])" : {
	     "SELECT": ["subSelect"], 
	     "{": ["groupGraphPatternSub"], 
	     "OPTIONAL": ["groupGraphPatternSub"], 
	     "MINUS": ["groupGraphPatternSub"], 
	     "GRAPH": ["groupGraphPatternSub"], 
	     "SERVICE": ["groupGraphPatternSub"], 
	     "FILTER": ["groupGraphPatternSub"], 
	     "BIND": ["groupGraphPatternSub"], 
	     "VALUES": ["groupGraphPatternSub"], 
	     "VAR1": ["groupGraphPatternSub"], 
	     "VAR2": ["groupGraphPatternSub"], 
	     "NIL": ["groupGraphPatternSub"], 
	     "(": ["groupGraphPatternSub"], 
	     "[": ["groupGraphPatternSub"], 
	     "IRI_REF": ["groupGraphPatternSub"], 
	     "TRUE": ["groupGraphPatternSub"], 
	     "FALSE": ["groupGraphPatternSub"], 
	     "BLANK_NODE_LABEL": ["groupGraphPatternSub"], 
	     "ANON": ["groupGraphPatternSub"], 
	     "PNAME_LN": ["groupGraphPatternSub"], 
	     "PNAME_NS": ["groupGraphPatternSub"], 
	     "STRING_LITERAL1": ["groupGraphPatternSub"], 
	     "STRING_LITERAL2": ["groupGraphPatternSub"], 
	     "STRING_LITERAL_LONG1": ["groupGraphPatternSub"], 
	     "STRING_LITERAL_LONG2": ["groupGraphPatternSub"], 
	     "INTEGER": ["groupGraphPatternSub"], 
	     "DECIMAL": ["groupGraphPatternSub"], 
	     "DOUBLE": ["groupGraphPatternSub"], 
	     "INTEGER_POSITIVE": ["groupGraphPatternSub"], 
	     "DECIMAL_POSITIVE": ["groupGraphPatternSub"], 
	     "DOUBLE_POSITIVE": ["groupGraphPatternSub"], 
	     "INTEGER_NEGATIVE": ["groupGraphPatternSub"], 
	     "DECIMAL_NEGATIVE": ["groupGraphPatternSub"], 
	     "DOUBLE_NEGATIVE": ["groupGraphPatternSub"], 
	     "}": ["groupGraphPatternSub"]}, 
	  "or([var,[ (,expression,AS,var,)]])" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "(": ["[ (,expression,AS,var,)]"]}, 
	  "or([verbPath,verbSimple])" : {
	     "^": ["verbPath"], 
	     "a": ["verbPath"], 
	     "!": ["verbPath"], 
	     "(": ["verbPath"], 
	     "IRI_REF": ["verbPath"], 
	     "PNAME_LN": ["verbPath"], 
	     "PNAME_NS": ["verbPath"], 
	     "VAR1": ["verbSimple"], 
	     "VAR2": ["verbSimple"]}, 
	  "or([},[integer,}]])" : {
	     "}": ["}"], 
	     "INTEGER": ["[integer,}]"]}, 
	  "orderClause" : {
	     "ORDER": ["ORDER","BY","+orderCondition"]}, 
	  "orderCondition" : {
	     "ASC": ["or([ASC,DESC])","brackettedExpression"], 
	     "DESC": ["or([ASC,DESC])","brackettedExpression"], 
	     "(": ["constraint"], 
	     "STR": ["constraint"], 
	     "LANG": ["constraint"], 
	     "LANGMATCHES": ["constraint"], 
	     "DATATYPE": ["constraint"], 
	     "BOUND": ["constraint"], 
	     "IRI": ["constraint"], 
	     "URI": ["constraint"], 
	     "BNODE": ["constraint"], 
	     "RAND": ["constraint"], 
	     "ABS": ["constraint"], 
	     "CEIL": ["constraint"], 
	     "FLOOR": ["constraint"], 
	     "ROUND": ["constraint"], 
	     "CONCAT": ["constraint"], 
	     "STRLEN": ["constraint"], 
	     "UCASE": ["constraint"], 
	     "LCASE": ["constraint"], 
	     "ENCODE_FOR_URI": ["constraint"], 
	     "CONTAINS": ["constraint"], 
	     "STRSTARTS": ["constraint"], 
	     "STRENDS": ["constraint"], 
	     "STRBEFORE": ["constraint"], 
	     "STRAFTER": ["constraint"], 
	     "YEAR": ["constraint"], 
	     "MONTH": ["constraint"], 
	     "DAY": ["constraint"], 
	     "HOURS": ["constraint"], 
	     "MINUTES": ["constraint"], 
	     "SECONDS": ["constraint"], 
	     "TIMEZONE": ["constraint"], 
	     "TZ": ["constraint"], 
	     "NOW": ["constraint"], 
	     "UUID": ["constraint"], 
	     "STRUUID": ["constraint"], 
	     "MD5": ["constraint"], 
	     "SHA1": ["constraint"], 
	     "SHA256": ["constraint"], 
	     "SHA384": ["constraint"], 
	     "SHA512": ["constraint"], 
	     "COALESCE": ["constraint"], 
	     "IF": ["constraint"], 
	     "STRLANG": ["constraint"], 
	     "STRDT": ["constraint"], 
	     "SAMETERM": ["constraint"], 
	     "ISIRI": ["constraint"], 
	     "ISURI": ["constraint"], 
	     "ISBLANK": ["constraint"], 
	     "ISLITERAL": ["constraint"], 
	     "ISNUMERIC": ["constraint"], 
	     "SUBSTR": ["constraint"], 
	     "REPLACE": ["constraint"], 
	     "REGEX": ["constraint"], 
	     "EXISTS": ["constraint"], 
	     "NOT": ["constraint"], 
	     "IRI_REF": ["constraint"], 
	     "PNAME_LN": ["constraint"], 
	     "PNAME_NS": ["constraint"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "path" : {
	     "^": ["pathAlternative"], 
	     "a": ["pathAlternative"], 
	     "!": ["pathAlternative"], 
	     "(": ["pathAlternative"], 
	     "IRI_REF": ["pathAlternative"], 
	     "PNAME_LN": ["pathAlternative"], 
	     "PNAME_NS": ["pathAlternative"]}, 
	  "pathAlternative" : {
	     "^": ["pathSequence","*[|,pathSequence]"], 
	     "a": ["pathSequence","*[|,pathSequence]"], 
	     "!": ["pathSequence","*[|,pathSequence]"], 
	     "(": ["pathSequence","*[|,pathSequence]"], 
	     "IRI_REF": ["pathSequence","*[|,pathSequence]"], 
	     "PNAME_LN": ["pathSequence","*[|,pathSequence]"], 
	     "PNAME_NS": ["pathSequence","*[|,pathSequence]"]}, 
	  "pathElt" : {
	     "a": ["pathPrimary","?pathMod"], 
	     "!": ["pathPrimary","?pathMod"], 
	     "(": ["pathPrimary","?pathMod"], 
	     "IRI_REF": ["pathPrimary","?pathMod"], 
	     "PNAME_LN": ["pathPrimary","?pathMod"], 
	     "PNAME_NS": ["pathPrimary","?pathMod"]}, 
	  "pathEltOrInverse" : {
	     "a": ["pathElt"], 
	     "!": ["pathElt"], 
	     "(": ["pathElt"], 
	     "IRI_REF": ["pathElt"], 
	     "PNAME_LN": ["pathElt"], 
	     "PNAME_NS": ["pathElt"], 
	     "^": ["^","pathElt"]}, 
	  "pathMod" : {
	     "*": ["*"], 
	     "?": ["?"], 
	     "+": ["+"], 
	     "{": ["{","or([[integer,or([[,,or([},[integer,}]])],}])],[,,integer,}]])"]}, 
	  "pathNegatedPropertySet" : {
	     "a": ["pathOneInPropertySet"], 
	     "^": ["pathOneInPropertySet"], 
	     "IRI_REF": ["pathOneInPropertySet"], 
	     "PNAME_LN": ["pathOneInPropertySet"], 
	     "PNAME_NS": ["pathOneInPropertySet"], 
	     "(": ["(","?[pathOneInPropertySet,*[|,pathOneInPropertySet]]",")"]}, 
	  "pathOneInPropertySet" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"], 
	     "a": ["a"], 
	     "^": ["^","or([iriRef,a])"]}, 
	  "pathPrimary" : {
	     "IRI_REF": ["storeProperty","iriRef"], 
	     "PNAME_LN": ["storeProperty","iriRef"], 
	     "PNAME_NS": ["storeProperty","iriRef"], 
	     "a": ["storeProperty","a"], 
	     "!": ["!","pathNegatedPropertySet"], 
	     "(": ["(","path",")"]}, 
	  "pathSequence" : {
	     "^": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "a": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "!": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "(": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "IRI_REF": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "PNAME_LN": ["pathEltOrInverse","*[/,pathEltOrInverse]"], 
	     "PNAME_NS": ["pathEltOrInverse","*[/,pathEltOrInverse]"]}, 
	  "prefixDecl" : {
	     "PREFIX": ["PREFIX","PNAME_NS","IRI_REF"]}, 
	  "prefixedName" : {
	     "PNAME_LN": ["PNAME_LN"], 
	     "PNAME_NS": ["PNAME_NS"]}, 
	  "primaryExpression" : {
	     "(": ["brackettedExpression"], 
	     "STR": ["builtInCall"], 
	     "LANG": ["builtInCall"], 
	     "LANGMATCHES": ["builtInCall"], 
	     "DATATYPE": ["builtInCall"], 
	     "BOUND": ["builtInCall"], 
	     "IRI": ["builtInCall"], 
	     "URI": ["builtInCall"], 
	     "BNODE": ["builtInCall"], 
	     "RAND": ["builtInCall"], 
	     "ABS": ["builtInCall"], 
	     "CEIL": ["builtInCall"], 
	     "FLOOR": ["builtInCall"], 
	     "ROUND": ["builtInCall"], 
	     "CONCAT": ["builtInCall"], 
	     "STRLEN": ["builtInCall"], 
	     "UCASE": ["builtInCall"], 
	     "LCASE": ["builtInCall"], 
	     "ENCODE_FOR_URI": ["builtInCall"], 
	     "CONTAINS": ["builtInCall"], 
	     "STRSTARTS": ["builtInCall"], 
	     "STRENDS": ["builtInCall"], 
	     "STRBEFORE": ["builtInCall"], 
	     "STRAFTER": ["builtInCall"], 
	     "YEAR": ["builtInCall"], 
	     "MONTH": ["builtInCall"], 
	     "DAY": ["builtInCall"], 
	     "HOURS": ["builtInCall"], 
	     "MINUTES": ["builtInCall"], 
	     "SECONDS": ["builtInCall"], 
	     "TIMEZONE": ["builtInCall"], 
	     "TZ": ["builtInCall"], 
	     "NOW": ["builtInCall"], 
	     "UUID": ["builtInCall"], 
	     "STRUUID": ["builtInCall"], 
	     "MD5": ["builtInCall"], 
	     "SHA1": ["builtInCall"], 
	     "SHA256": ["builtInCall"], 
	     "SHA384": ["builtInCall"], 
	     "SHA512": ["builtInCall"], 
	     "COALESCE": ["builtInCall"], 
	     "IF": ["builtInCall"], 
	     "STRLANG": ["builtInCall"], 
	     "STRDT": ["builtInCall"], 
	     "SAMETERM": ["builtInCall"], 
	     "ISIRI": ["builtInCall"], 
	     "ISURI": ["builtInCall"], 
	     "ISBLANK": ["builtInCall"], 
	     "ISLITERAL": ["builtInCall"], 
	     "ISNUMERIC": ["builtInCall"], 
	     "SUBSTR": ["builtInCall"], 
	     "REPLACE": ["builtInCall"], 
	     "REGEX": ["builtInCall"], 
	     "EXISTS": ["builtInCall"], 
	     "NOT": ["builtInCall"], 
	     "IRI_REF": ["iriRefOrFunction"], 
	     "PNAME_LN": ["iriRefOrFunction"], 
	     "PNAME_NS": ["iriRefOrFunction"], 
	     "STRING_LITERAL1": ["rdfLiteral"], 
	     "STRING_LITERAL2": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG1": ["rdfLiteral"], 
	     "STRING_LITERAL_LONG2": ["rdfLiteral"], 
	     "INTEGER": ["numericLiteral"], 
	     "DECIMAL": ["numericLiteral"], 
	     "DOUBLE": ["numericLiteral"], 
	     "INTEGER_POSITIVE": ["numericLiteral"], 
	     "DECIMAL_POSITIVE": ["numericLiteral"], 
	     "DOUBLE_POSITIVE": ["numericLiteral"], 
	     "INTEGER_NEGATIVE": ["numericLiteral"], 
	     "DECIMAL_NEGATIVE": ["numericLiteral"], 
	     "DOUBLE_NEGATIVE": ["numericLiteral"], 
	     "TRUE": ["booleanLiteral"], 
	     "FALSE": ["booleanLiteral"], 
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "COUNT": ["aggregate"], 
	     "SUM": ["aggregate"], 
	     "MIN": ["aggregate"], 
	     "MAX": ["aggregate"], 
	     "AVG": ["aggregate"], 
	     "SAMPLE": ["aggregate"], 
	     "GROUP_CONCAT": ["aggregate"]}, 
	  "prologue" : {
	     "PREFIX": ["?baseDecl","*prefixDecl"], 
	     "BASE": ["?baseDecl","*prefixDecl"], 
	     "$": ["?baseDecl","*prefixDecl"], 
	     "CONSTRUCT": ["?baseDecl","*prefixDecl"], 
	     "DESCRIBE": ["?baseDecl","*prefixDecl"], 
	     "ASK": ["?baseDecl","*prefixDecl"], 
	     "INSERT": ["?baseDecl","*prefixDecl"], 
	     "DELETE": ["?baseDecl","*prefixDecl"], 
	     "SELECT": ["?baseDecl","*prefixDecl"], 
	     "LOAD": ["?baseDecl","*prefixDecl"], 
	     "CLEAR": ["?baseDecl","*prefixDecl"], 
	     "DROP": ["?baseDecl","*prefixDecl"], 
	     "ADD": ["?baseDecl","*prefixDecl"], 
	     "MOVE": ["?baseDecl","*prefixDecl"], 
	     "COPY": ["?baseDecl","*prefixDecl"], 
	     "CREATE": ["?baseDecl","*prefixDecl"], 
	     "WITH": ["?baseDecl","*prefixDecl"]}, 
	  "propertyList" : {
	     "a": ["propertyListNotEmpty"], 
	     "VAR1": ["propertyListNotEmpty"], 
	     "VAR2": ["propertyListNotEmpty"], 
	     "IRI_REF": ["propertyListNotEmpty"], 
	     "PNAME_LN": ["propertyListNotEmpty"], 
	     "PNAME_NS": ["propertyListNotEmpty"], 
	     ".": [], 
	     "}": [], 
	     "GRAPH": []}, 
	  "propertyListNotEmpty" : {
	     "a": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "VAR1": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "VAR2": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "IRI_REF": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "PNAME_LN": ["verb","objectList","*[;,?[verb,objectList]]"], 
	     "PNAME_NS": ["verb","objectList","*[;,?[verb,objectList]]"]}, 
	  "propertyListPath" : {
	     "a": ["propertyListNotEmpty"], 
	     "VAR1": ["propertyListNotEmpty"], 
	     "VAR2": ["propertyListNotEmpty"], 
	     "IRI_REF": ["propertyListNotEmpty"], 
	     "PNAME_LN": ["propertyListNotEmpty"], 
	     "PNAME_NS": ["propertyListNotEmpty"], 
	     ".": [], 
	     "{": [], 
	     "OPTIONAL": [], 
	     "MINUS": [], 
	     "GRAPH": [], 
	     "SERVICE": [], 
	     "FILTER": [], 
	     "BIND": [], 
	     "VALUES": [], 
	     "}": []}, 
	  "propertyListPathNotEmpty" : {
	     "VAR1": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "VAR2": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "^": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "a": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "!": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "(": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "IRI_REF": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "PNAME_LN": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"], 
	     "PNAME_NS": ["or([verbPath,verbSimple])","objectListPath","*[;,?[or([verbPath,verbSimple]),objectList]]"]}, 
	  "quadData" : {
	     "{": ["{","disallowVars","quads","allowVars","}"]}, 
	  "quadDataNoBnodes" : {
	     "{": ["{","disallowBnodes","disallowVars","quads","allowVars","allowBnodes","}"]}, 
	  "quadPattern" : {
	     "{": ["{","quads","}"]}, 
	  "quadPatternNoBnodes" : {
	     "{": ["{","disallowBnodes","quads","allowBnodes","}"]}, 
	  "quads" : {
	     "GRAPH": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "VAR1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "VAR2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "NIL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "(": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "[": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "IRI_REF": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "TRUE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "FALSE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "BLANK_NODE_LABEL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "ANON": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "PNAME_LN": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "PNAME_NS": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG1": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG2": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE_POSITIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "INTEGER_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DECIMAL_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "DOUBLE_NEGATIVE": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"], 
	     "}": ["?triplesTemplate","*[quadsNotTriples,?.,?triplesTemplate]"]}, 
	  "quadsNotTriples" : {
	     "GRAPH": ["GRAPH","varOrIRIref","{","?triplesTemplate","}"]}, 
	  "queryAll" : {
	     "CONSTRUCT": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "DESCRIBE": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "ASK": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"], 
	     "SELECT": ["or([selectQuery,constructQuery,describeQuery,askQuery])","valuesClause"]}, 
	  "rdfLiteral" : {
	     "STRING_LITERAL1": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL2": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL_LONG1": ["string","?or([LANGTAG,[^^,iriRef]])"], 
	     "STRING_LITERAL_LONG2": ["string","?or([LANGTAG,[^^,iriRef]])"]}, 
	  "regexExpression" : {
	     "REGEX": ["REGEX","(","expression",",","expression","?[,,expression]",")"]}, 
	  "relationalExpression" : {
	     "!": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "+": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "-": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "VAR1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "VAR2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "(": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LANG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LANGMATCHES": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DATATYPE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "BOUND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IRI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "URI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "BNODE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "RAND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ABS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CEIL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "FLOOR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ROUND": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CONCAT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRLEN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "UCASE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "LCASE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ENCODE_FOR_URI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "CONTAINS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRSTARTS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRENDS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRBEFORE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRAFTER": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "YEAR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MONTH": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DAY": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "HOURS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MINUTES": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SECONDS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TIMEZONE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TZ": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOW": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "UUID": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRUUID": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MD5": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA256": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA384": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SHA512": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "COALESCE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IF": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRLANG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRDT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SAMETERM": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISIRI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISURI": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISBLANK": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISLITERAL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "ISNUMERIC": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "TRUE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "FALSE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "COUNT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SUM": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MIN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "MAX": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "AVG": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SAMPLE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "GROUP_CONCAT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "SUBSTR": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "REPLACE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "REGEX": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "EXISTS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "NOT": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "IRI_REF": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL_LONG1": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "STRING_LITERAL_LONG2": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE_POSITIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "INTEGER_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DECIMAL_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "DOUBLE_NEGATIVE": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "PNAME_LN": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"], 
	     "PNAME_NS": ["numericExpression","?or([[=,numericExpression],[!=,numericExpression],[<,numericExpression],[>,numericExpression],[<=,numericExpression],[>=,numericExpression],[IN,expressionList],[NOT,IN,expressionList]])"]}, 
	  "selectClause" : {
	     "SELECT": ["SELECT","?or([DISTINCT,REDUCED])","or([+or([var,[ (,expression,AS,var,)]]),*])"]}, 
	  "selectQuery" : {
	     "SELECT": ["selectClause","*datasetClause","whereClause","solutionModifier"]}, 
	  "serviceGraphPattern" : {
	     "SERVICE": ["SERVICE","?SILENT","varOrIRIref","groupGraphPattern"]}, 
	  "solutionModifier" : {
	     "LIMIT": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "OFFSET": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "ORDER": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "HAVING": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "GROUP": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "VALUES": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "$": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"], 
	     "}": ["?groupClause","?havingClause","?orderClause","?limitOffsetClauses"]}, 
	  "sourceSelector" : {
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"]}, 
	  "sparql11" : {
	     "$": ["prologue","or([queryAll,updateAll])","$"], 
	     "CONSTRUCT": ["prologue","or([queryAll,updateAll])","$"], 
	     "DESCRIBE": ["prologue","or([queryAll,updateAll])","$"], 
	     "ASK": ["prologue","or([queryAll,updateAll])","$"], 
	     "INSERT": ["prologue","or([queryAll,updateAll])","$"], 
	     "DELETE": ["prologue","or([queryAll,updateAll])","$"], 
	     "SELECT": ["prologue","or([queryAll,updateAll])","$"], 
	     "LOAD": ["prologue","or([queryAll,updateAll])","$"], 
	     "CLEAR": ["prologue","or([queryAll,updateAll])","$"], 
	     "DROP": ["prologue","or([queryAll,updateAll])","$"], 
	     "ADD": ["prologue","or([queryAll,updateAll])","$"], 
	     "MOVE": ["prologue","or([queryAll,updateAll])","$"], 
	     "COPY": ["prologue","or([queryAll,updateAll])","$"], 
	     "CREATE": ["prologue","or([queryAll,updateAll])","$"], 
	     "WITH": ["prologue","or([queryAll,updateAll])","$"], 
	     "PREFIX": ["prologue","or([queryAll,updateAll])","$"], 
	     "BASE": ["prologue","or([queryAll,updateAll])","$"]}, 
	  "storeProperty" : {
	     "VAR1": [], 
	     "VAR2": [], 
	     "IRI_REF": [], 
	     "PNAME_LN": [], 
	     "PNAME_NS": [], 
	     "a": []}, 
	  "strReplaceExpression" : {
	     "REPLACE": ["REPLACE","(","expression",",","expression",",","expression","?[,,expression]",")"]}, 
	  "string" : {
	     "STRING_LITERAL1": ["STRING_LITERAL1"], 
	     "STRING_LITERAL2": ["STRING_LITERAL2"], 
	     "STRING_LITERAL_LONG1": ["STRING_LITERAL_LONG1"], 
	     "STRING_LITERAL_LONG2": ["STRING_LITERAL_LONG2"]}, 
	  "subSelect" : {
	     "SELECT": ["selectClause","whereClause","solutionModifier","valuesClause"]}, 
	  "substringExpression" : {
	     "SUBSTR": ["SUBSTR","(","expression",",","expression","?[,,expression]",")"]}, 
	  "triplesBlock" : {
	     "VAR1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "VAR2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "NIL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "(": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "[": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "IRI_REF": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "TRUE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "FALSE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "ANON": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "PNAME_LN": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "PNAME_NS": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubjectPath","?[.,?triplesBlock]"]}, 
	  "triplesNode" : {
	     "(": ["collection"], 
	     "[": ["blankNodePropertyList"]}, 
	  "triplesNodePath" : {
	     "(": ["collectionPath"], 
	     "[": ["blankNodePropertyListPath"]}, 
	  "triplesSameSubject" : {
	     "VAR1": ["varOrTerm","propertyListNotEmpty"], 
	     "VAR2": ["varOrTerm","propertyListNotEmpty"], 
	     "NIL": ["varOrTerm","propertyListNotEmpty"], 
	     "IRI_REF": ["varOrTerm","propertyListNotEmpty"], 
	     "TRUE": ["varOrTerm","propertyListNotEmpty"], 
	     "FALSE": ["varOrTerm","propertyListNotEmpty"], 
	     "BLANK_NODE_LABEL": ["varOrTerm","propertyListNotEmpty"], 
	     "ANON": ["varOrTerm","propertyListNotEmpty"], 
	     "PNAME_LN": ["varOrTerm","propertyListNotEmpty"], 
	     "PNAME_NS": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL1": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL2": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm","propertyListNotEmpty"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE_POSITIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "INTEGER_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm","propertyListNotEmpty"], 
	     "(": ["triplesNode","propertyList"], 
	     "[": ["triplesNode","propertyList"]}, 
	  "triplesSameSubjectPath" : {
	     "VAR1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "VAR2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "NIL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "IRI_REF": ["varOrTerm","propertyListPathNotEmpty"], 
	     "TRUE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "FALSE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "BLANK_NODE_LABEL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "ANON": ["varOrTerm","propertyListPathNotEmpty"], 
	     "PNAME_LN": ["varOrTerm","propertyListPathNotEmpty"], 
	     "PNAME_NS": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL_LONG1": ["varOrTerm","propertyListPathNotEmpty"], 
	     "STRING_LITERAL_LONG2": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE_POSITIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "INTEGER_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DECIMAL_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "DOUBLE_NEGATIVE": ["varOrTerm","propertyListPathNotEmpty"], 
	     "(": ["triplesNodePath","propertyListPath"], 
	     "[": ["triplesNodePath","propertyListPath"]}, 
	  "triplesTemplate" : {
	     "VAR1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "VAR2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "NIL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "(": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "[": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "IRI_REF": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "TRUE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "FALSE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "BLANK_NODE_LABEL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "ANON": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "PNAME_LN": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "PNAME_NS": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG1": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "STRING_LITERAL_LONG2": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE_POSITIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "INTEGER_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DECIMAL_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"], 
	     "DOUBLE_NEGATIVE": ["triplesSameSubject","?[.,?triplesTemplate]"]}, 
	  "unaryExpression" : {
	     "!": ["!","primaryExpression"], 
	     "+": ["+","primaryExpression"], 
	     "-": ["-","primaryExpression"], 
	     "VAR1": ["primaryExpression"], 
	     "VAR2": ["primaryExpression"], 
	     "(": ["primaryExpression"], 
	     "STR": ["primaryExpression"], 
	     "LANG": ["primaryExpression"], 
	     "LANGMATCHES": ["primaryExpression"], 
	     "DATATYPE": ["primaryExpression"], 
	     "BOUND": ["primaryExpression"], 
	     "IRI": ["primaryExpression"], 
	     "URI": ["primaryExpression"], 
	     "BNODE": ["primaryExpression"], 
	     "RAND": ["primaryExpression"], 
	     "ABS": ["primaryExpression"], 
	     "CEIL": ["primaryExpression"], 
	     "FLOOR": ["primaryExpression"], 
	     "ROUND": ["primaryExpression"], 
	     "CONCAT": ["primaryExpression"], 
	     "STRLEN": ["primaryExpression"], 
	     "UCASE": ["primaryExpression"], 
	     "LCASE": ["primaryExpression"], 
	     "ENCODE_FOR_URI": ["primaryExpression"], 
	     "CONTAINS": ["primaryExpression"], 
	     "STRSTARTS": ["primaryExpression"], 
	     "STRENDS": ["primaryExpression"], 
	     "STRBEFORE": ["primaryExpression"], 
	     "STRAFTER": ["primaryExpression"], 
	     "YEAR": ["primaryExpression"], 
	     "MONTH": ["primaryExpression"], 
	     "DAY": ["primaryExpression"], 
	     "HOURS": ["primaryExpression"], 
	     "MINUTES": ["primaryExpression"], 
	     "SECONDS": ["primaryExpression"], 
	     "TIMEZONE": ["primaryExpression"], 
	     "TZ": ["primaryExpression"], 
	     "NOW": ["primaryExpression"], 
	     "UUID": ["primaryExpression"], 
	     "STRUUID": ["primaryExpression"], 
	     "MD5": ["primaryExpression"], 
	     "SHA1": ["primaryExpression"], 
	     "SHA256": ["primaryExpression"], 
	     "SHA384": ["primaryExpression"], 
	     "SHA512": ["primaryExpression"], 
	     "COALESCE": ["primaryExpression"], 
	     "IF": ["primaryExpression"], 
	     "STRLANG": ["primaryExpression"], 
	     "STRDT": ["primaryExpression"], 
	     "SAMETERM": ["primaryExpression"], 
	     "ISIRI": ["primaryExpression"], 
	     "ISURI": ["primaryExpression"], 
	     "ISBLANK": ["primaryExpression"], 
	     "ISLITERAL": ["primaryExpression"], 
	     "ISNUMERIC": ["primaryExpression"], 
	     "TRUE": ["primaryExpression"], 
	     "FALSE": ["primaryExpression"], 
	     "COUNT": ["primaryExpression"], 
	     "SUM": ["primaryExpression"], 
	     "MIN": ["primaryExpression"], 
	     "MAX": ["primaryExpression"], 
	     "AVG": ["primaryExpression"], 
	     "SAMPLE": ["primaryExpression"], 
	     "GROUP_CONCAT": ["primaryExpression"], 
	     "SUBSTR": ["primaryExpression"], 
	     "REPLACE": ["primaryExpression"], 
	     "REGEX": ["primaryExpression"], 
	     "EXISTS": ["primaryExpression"], 
	     "NOT": ["primaryExpression"], 
	     "IRI_REF": ["primaryExpression"], 
	     "STRING_LITERAL1": ["primaryExpression"], 
	     "STRING_LITERAL2": ["primaryExpression"], 
	     "STRING_LITERAL_LONG1": ["primaryExpression"], 
	     "STRING_LITERAL_LONG2": ["primaryExpression"], 
	     "INTEGER": ["primaryExpression"], 
	     "DECIMAL": ["primaryExpression"], 
	     "DOUBLE": ["primaryExpression"], 
	     "INTEGER_POSITIVE": ["primaryExpression"], 
	     "DECIMAL_POSITIVE": ["primaryExpression"], 
	     "DOUBLE_POSITIVE": ["primaryExpression"], 
	     "INTEGER_NEGATIVE": ["primaryExpression"], 
	     "DECIMAL_NEGATIVE": ["primaryExpression"], 
	     "DOUBLE_NEGATIVE": ["primaryExpression"], 
	     "PNAME_LN": ["primaryExpression"], 
	     "PNAME_NS": ["primaryExpression"]}, 
	  "update" : {
	     "INSERT": ["prologue","?[update1,?[;,update]]"], 
	     "DELETE": ["prologue","?[update1,?[;,update]]"], 
	     "LOAD": ["prologue","?[update1,?[;,update]]"], 
	     "CLEAR": ["prologue","?[update1,?[;,update]]"], 
	     "DROP": ["prologue","?[update1,?[;,update]]"], 
	     "ADD": ["prologue","?[update1,?[;,update]]"], 
	     "MOVE": ["prologue","?[update1,?[;,update]]"], 
	     "COPY": ["prologue","?[update1,?[;,update]]"], 
	     "CREATE": ["prologue","?[update1,?[;,update]]"], 
	     "WITH": ["prologue","?[update1,?[;,update]]"], 
	     "PREFIX": ["prologue","?[update1,?[;,update]]"], 
	     "BASE": ["prologue","?[update1,?[;,update]]"], 
	     "$": ["prologue","?[update1,?[;,update]]"]}, 
	  "update1" : {
	     "LOAD": ["load"], 
	     "CLEAR": ["clear"], 
	     "DROP": ["drop"], 
	     "ADD": ["add"], 
	     "MOVE": ["move"], 
	     "COPY": ["copy"], 
	     "CREATE": ["create"], 
	     "INSERT": ["INSERT","insert1"], 
	     "DELETE": ["DELETE","delete1"], 
	     "WITH": ["modify"]}, 
	  "updateAll" : {
	     "INSERT": ["?[update1,?[;,update]]"], 
	     "DELETE": ["?[update1,?[;,update]]"], 
	     "LOAD": ["?[update1,?[;,update]]"], 
	     "CLEAR": ["?[update1,?[;,update]]"], 
	     "DROP": ["?[update1,?[;,update]]"], 
	     "ADD": ["?[update1,?[;,update]]"], 
	     "MOVE": ["?[update1,?[;,update]]"], 
	     "COPY": ["?[update1,?[;,update]]"], 
	     "CREATE": ["?[update1,?[;,update]]"], 
	     "WITH": ["?[update1,?[;,update]]"], 
	     "$": ["?[update1,?[;,update]]"]}, 
	  "usingClause" : {
	     "USING": ["USING","or([iriRef,[NAMED,iriRef]])"]}, 
	  "valueLogical" : {
	     "!": ["relationalExpression"], 
	     "+": ["relationalExpression"], 
	     "-": ["relationalExpression"], 
	     "VAR1": ["relationalExpression"], 
	     "VAR2": ["relationalExpression"], 
	     "(": ["relationalExpression"], 
	     "STR": ["relationalExpression"], 
	     "LANG": ["relationalExpression"], 
	     "LANGMATCHES": ["relationalExpression"], 
	     "DATATYPE": ["relationalExpression"], 
	     "BOUND": ["relationalExpression"], 
	     "IRI": ["relationalExpression"], 
	     "URI": ["relationalExpression"], 
	     "BNODE": ["relationalExpression"], 
	     "RAND": ["relationalExpression"], 
	     "ABS": ["relationalExpression"], 
	     "CEIL": ["relationalExpression"], 
	     "FLOOR": ["relationalExpression"], 
	     "ROUND": ["relationalExpression"], 
	     "CONCAT": ["relationalExpression"], 
	     "STRLEN": ["relationalExpression"], 
	     "UCASE": ["relationalExpression"], 
	     "LCASE": ["relationalExpression"], 
	     "ENCODE_FOR_URI": ["relationalExpression"], 
	     "CONTAINS": ["relationalExpression"], 
	     "STRSTARTS": ["relationalExpression"], 
	     "STRENDS": ["relationalExpression"], 
	     "STRBEFORE": ["relationalExpression"], 
	     "STRAFTER": ["relationalExpression"], 
	     "YEAR": ["relationalExpression"], 
	     "MONTH": ["relationalExpression"], 
	     "DAY": ["relationalExpression"], 
	     "HOURS": ["relationalExpression"], 
	     "MINUTES": ["relationalExpression"], 
	     "SECONDS": ["relationalExpression"], 
	     "TIMEZONE": ["relationalExpression"], 
	     "TZ": ["relationalExpression"], 
	     "NOW": ["relationalExpression"], 
	     "UUID": ["relationalExpression"], 
	     "STRUUID": ["relationalExpression"], 
	     "MD5": ["relationalExpression"], 
	     "SHA1": ["relationalExpression"], 
	     "SHA256": ["relationalExpression"], 
	     "SHA384": ["relationalExpression"], 
	     "SHA512": ["relationalExpression"], 
	     "COALESCE": ["relationalExpression"], 
	     "IF": ["relationalExpression"], 
	     "STRLANG": ["relationalExpression"], 
	     "STRDT": ["relationalExpression"], 
	     "SAMETERM": ["relationalExpression"], 
	     "ISIRI": ["relationalExpression"], 
	     "ISURI": ["relationalExpression"], 
	     "ISBLANK": ["relationalExpression"], 
	     "ISLITERAL": ["relationalExpression"], 
	     "ISNUMERIC": ["relationalExpression"], 
	     "TRUE": ["relationalExpression"], 
	     "FALSE": ["relationalExpression"], 
	     "COUNT": ["relationalExpression"], 
	     "SUM": ["relationalExpression"], 
	     "MIN": ["relationalExpression"], 
	     "MAX": ["relationalExpression"], 
	     "AVG": ["relationalExpression"], 
	     "SAMPLE": ["relationalExpression"], 
	     "GROUP_CONCAT": ["relationalExpression"], 
	     "SUBSTR": ["relationalExpression"], 
	     "REPLACE": ["relationalExpression"], 
	     "REGEX": ["relationalExpression"], 
	     "EXISTS": ["relationalExpression"], 
	     "NOT": ["relationalExpression"], 
	     "IRI_REF": ["relationalExpression"], 
	     "STRING_LITERAL1": ["relationalExpression"], 
	     "STRING_LITERAL2": ["relationalExpression"], 
	     "STRING_LITERAL_LONG1": ["relationalExpression"], 
	     "STRING_LITERAL_LONG2": ["relationalExpression"], 
	     "INTEGER": ["relationalExpression"], 
	     "DECIMAL": ["relationalExpression"], 
	     "DOUBLE": ["relationalExpression"], 
	     "INTEGER_POSITIVE": ["relationalExpression"], 
	     "DECIMAL_POSITIVE": ["relationalExpression"], 
	     "DOUBLE_POSITIVE": ["relationalExpression"], 
	     "INTEGER_NEGATIVE": ["relationalExpression"], 
	     "DECIMAL_NEGATIVE": ["relationalExpression"], 
	     "DOUBLE_NEGATIVE": ["relationalExpression"], 
	     "PNAME_LN": ["relationalExpression"], 
	     "PNAME_NS": ["relationalExpression"]}, 
	  "valuesClause" : {
	     "VALUES": ["VALUES","dataBlock"], 
	     "$": [], 
	     "}": []}, 
	  "var" : {
	     "VAR1": ["VAR1"], 
	     "VAR2": ["VAR2"]}, 
	  "varOrIRIref" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "IRI_REF": ["iriRef"], 
	     "PNAME_LN": ["iriRef"], 
	     "PNAME_NS": ["iriRef"]}, 
	  "varOrTerm" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"], 
	     "NIL": ["graphTerm"], 
	     "IRI_REF": ["graphTerm"], 
	     "TRUE": ["graphTerm"], 
	     "FALSE": ["graphTerm"], 
	     "BLANK_NODE_LABEL": ["graphTerm"], 
	     "ANON": ["graphTerm"], 
	     "PNAME_LN": ["graphTerm"], 
	     "PNAME_NS": ["graphTerm"], 
	     "STRING_LITERAL1": ["graphTerm"], 
	     "STRING_LITERAL2": ["graphTerm"], 
	     "STRING_LITERAL_LONG1": ["graphTerm"], 
	     "STRING_LITERAL_LONG2": ["graphTerm"], 
	     "INTEGER": ["graphTerm"], 
	     "DECIMAL": ["graphTerm"], 
	     "DOUBLE": ["graphTerm"], 
	     "INTEGER_POSITIVE": ["graphTerm"], 
	     "DECIMAL_POSITIVE": ["graphTerm"], 
	     "DOUBLE_POSITIVE": ["graphTerm"], 
	     "INTEGER_NEGATIVE": ["graphTerm"], 
	     "DECIMAL_NEGATIVE": ["graphTerm"], 
	     "DOUBLE_NEGATIVE": ["graphTerm"]}, 
	  "verb" : {
	     "VAR1": ["storeProperty","varOrIRIref"], 
	     "VAR2": ["storeProperty","varOrIRIref"], 
	     "IRI_REF": ["storeProperty","varOrIRIref"], 
	     "PNAME_LN": ["storeProperty","varOrIRIref"], 
	     "PNAME_NS": ["storeProperty","varOrIRIref"], 
	     "a": ["storeProperty","a"]}, 
	  "verbPath" : {
	     "^": ["path"], 
	     "a": ["path"], 
	     "!": ["path"], 
	     "(": ["path"], 
	     "IRI_REF": ["path"], 
	     "PNAME_LN": ["path"], 
	     "PNAME_NS": ["path"]}, 
	  "verbSimple" : {
	     "VAR1": ["var"], 
	     "VAR2": ["var"]}, 
	  "whereClause" : {
	     "{": ["?WHERE","groupGraphPattern"], 
	     "WHERE": ["?WHERE","groupGraphPattern"]}
	};
	
	var keywords=/^(GROUP_CONCAT|DATATYPE|BASE|PREFIX|SELECT|CONSTRUCT|DESCRIBE|ASK|FROM|NAMED|ORDER|BY|LIMIT|ASC|DESC|OFFSET|DISTINCT|REDUCED|WHERE|GRAPH|OPTIONAL|UNION|FILTER|GROUP|HAVING|AS|VALUES|LOAD|CLEAR|DROP|CREATE|MOVE|COPY|SILENT|INSERT|DELETE|DATA|WITH|TO|USING|NAMED|MINUS|BIND|LANGMATCHES|LANG|BOUND|SAMETERM|ISIRI|ISURI|ISBLANK|ISLITERAL|REGEX|TRUE|FALSE|UNDEF|ADD|DEFAULT|ALL|SERVICE|INTO|IN|NOT|IRI|URI|BNODE|RAND|ABS|CEIL|FLOOR|ROUND|CONCAT|STRLEN|UCASE|LCASE|ENCODE_FOR_URI|CONTAINS|STRSTARTS|STRENDS|STRBEFORE|STRAFTER|YEAR|MONTH|DAY|HOURS|MINUTES|SECONDS|TIMEZONE|TZ|NOW|UUID|STRUUID|MD5|SHA1|SHA256|SHA384|SHA512|COALESCE|IF|STRLANG|STRDT|ISNUMERIC|SUBSTR|REPLACE|EXISTS|COUNT|SUM|MIN|MAX|AVG|SAMPLE|SEPARATOR|STR)/i ;
	
	var punct=/^(\*|a|\.|\{|\}|,|\(|\)|;|\[|\]|\|\||&&|=|!=|!|<=|>=|<|>|\+|-|\/|\^\^|\?|\||\^)/ ;
	
	var defaultQueryType=null;
	var lexVersion="sparql11";
	var startSymbol="sparql11";
	var acceptEmpty=true;
	
		function getTerminals()
		{
			var IRI_REF = '<[^<>\"\'\|\{\}\^\\\x00-\x20]*>';
			/*
			 * PN_CHARS_BASE =
			 * '[A-Z]|[a-z]|[\\u00C0-\\u00D6]|[\\u00D8-\\u00F6]|[\\u00F8-\\u02FF]|[\\u0370-\\u037D]|[\\u037F-\\u1FFF]|[\\u200C-\\u200D]|[\\u2070-\\u218F]|[\\u2C00-\\u2FEF]|[\\u3001-\\uD7FF]|[\\uF900-\\uFDCF]|[\\uFDF0-\\uFFFD]|[\\u10000-\\uEFFFF]';
			 */
	
			var PN_CHARS_BASE =
				'[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]';
			var PN_CHARS_U = PN_CHARS_BASE+'|_';
	
			var PN_CHARS= '('+PN_CHARS_U+'|-|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])';
			var VARNAME = '('+PN_CHARS_U+'|[0-9])'+
				'('+PN_CHARS_U+'|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])*';
			var VAR1 = '\\?'+VARNAME;
			var VAR2 = '\\$'+VARNAME;
	
			var PN_PREFIX= '('+PN_CHARS_BASE+')((('+PN_CHARS+')|\\.)*('+PN_CHARS+'))?';
	
			var HEX= '[0-9A-Fa-f]';
			var PERCENT='(%'+HEX+HEX+')';
			var PN_LOCAL_ESC='(\\\\[_~\\.\\-!\\$&\'\\(\\)\\*\\+,;=/\\?#@%])';
			var PLX= '('+PERCENT+'|'+PN_LOCAL_ESC+')';
			var PN_LOCAL;
			var BLANK_NODE_LABEL;
			if (lexVersion=="sparql11") {
				PN_LOCAL= '('+PN_CHARS_U+'|:|[0-9]|'+PLX+')(('+PN_CHARS+'|\\.|:|'+PLX+')*('+PN_CHARS+'|:|'+PLX+'))?';
				BLANK_NODE_LABEL = '_:('+PN_CHARS_U+'|[0-9])(('+PN_CHARS+'|\\.)*'+PN_CHARS+')?';
			} else {
				PN_LOCAL= '('+PN_CHARS_U+'|[0-9])((('+PN_CHARS+')|\\.)*('+PN_CHARS+'))?';
				BLANK_NODE_LABEL = '_:'+PN_LOCAL;
			}
			var PNAME_NS = '('+PN_PREFIX+')?:';
			var PNAME_LN = PNAME_NS+PN_LOCAL;
			var LANGTAG = '@[a-zA-Z]+(-[a-zA-Z0-9]+)*';
	
			var EXPONENT = '[eE][\\+-]?[0-9]+';
			var INTEGER = '[0-9]+';
			var DECIMAL = '(([0-9]+\\.[0-9]*)|(\\.[0-9]+))';
			var DOUBLE =
				'(([0-9]+\\.[0-9]*'+EXPONENT+')|'+
				'(\\.[0-9]+'+EXPONENT+')|'+
				'([0-9]+'+EXPONENT+'))';
	
			var INTEGER_POSITIVE = '\\+' + INTEGER;
			var DECIMAL_POSITIVE = '\\+' + DECIMAL;
			var DOUBLE_POSITIVE  = '\\+' + DOUBLE;
			var INTEGER_NEGATIVE = '-' + INTEGER;
			var DECIMAL_NEGATIVE = '-' + DECIMAL;
			var DOUBLE_NEGATIVE  = '-' + DOUBLE;
	
			// var ECHAR = '\\\\[tbnrf\\"\\\']';
			var ECHAR = '\\\\[tbnrf\\\\"\']';
	
			var STRING_LITERAL1 = "'(([^\\x27\\x5C\\x0A\\x0D])|"+ECHAR+")*'";
			var STRING_LITERAL2 = '"(([^\\x22\\x5C\\x0A\\x0D])|'+ECHAR+')*"';
	
			var STRING_LITERAL_LONG1 = "'''(('|'')?([^'\\\\]|"+ECHAR+"))*'''";
			var STRING_LITERAL_LONG2 = '"""(("|"")?([^"\\\\]|'+ECHAR+'))*"""';
	
			var WS    =        '[\\x20\\x09\\x0D\\x0A]';
			// Careful! Code mirror feeds one line at a time with no \n
			// ... but otherwise comment is terminated by \n
			var COMMENT = '#([^\\n\\r]*[\\n\\r]|[^\\n\\r]*$)';
			var WS_OR_COMMENT_STAR = '('+WS+'|('+COMMENT+'))*';
			var NIL   = '\\('+WS_OR_COMMENT_STAR+'\\)';
			var ANON  = '\\['+WS_OR_COMMENT_STAR+'\\]';
	
			var terminals=
				{
					terminal: [
	
						{ name: "WS",
							regex:new RegExp("^"+WS+"+"),
							style:"ws" },
	
						{ name: "COMMENT",
							regex:new RegExp("^"+COMMENT),
							style:"comment" },
	
						{ name: "IRI_REF",
							regex:new RegExp("^"+IRI_REF),
							style:"variable-3" },
	
						{ name: "VAR1",
							regex:new RegExp("^"+VAR1),
							style:"atom"},
	
						{ name: "VAR2",
							regex:new RegExp("^"+VAR2),
							style:"atom"},
	
						{ name: "LANGTAG",
							regex:new RegExp("^"+LANGTAG),
							style:"meta"},
	
						{ name: "DOUBLE",
							regex:new RegExp("^"+DOUBLE),
							style:"number" },
	
						{ name: "DECIMAL",
							regex:new RegExp("^"+DECIMAL),
							style:"number" },
	
						{ name: "INTEGER",
							regex:new RegExp("^"+INTEGER),
							style:"number" },
	
						{ name: "DOUBLE_POSITIVE",
							regex:new RegExp("^"+DOUBLE_POSITIVE),
							style:"number" },
	
						{ name: "DECIMAL_POSITIVE",
							regex:new RegExp("^"+DECIMAL_POSITIVE),
							style:"number" },
	
						{ name: "INTEGER_POSITIVE",
							regex:new RegExp("^"+INTEGER_POSITIVE),
							style:"number" },
	
						{ name: "DOUBLE_NEGATIVE",
							regex:new RegExp("^"+DOUBLE_NEGATIVE),
							style:"number" },
	
						{ name: "DECIMAL_NEGATIVE",
							regex:new RegExp("^"+DECIMAL_NEGATIVE),
							style:"number" },
	
						{ name: "INTEGER_NEGATIVE",
							regex:new RegExp("^"+INTEGER_NEGATIVE),
							style:"number" },
	
						{ name: "STRING_LITERAL_LONG1",
							regex:new RegExp("^"+STRING_LITERAL_LONG1),
							style:"string" },
	
						{ name: "STRING_LITERAL_LONG2",
							regex:new RegExp("^"+STRING_LITERAL_LONG2),
							style:"string" },
	
						{ name: "STRING_LITERAL1",
							regex:new RegExp("^"+STRING_LITERAL1),
							style:"string" },
	
						{ name: "STRING_LITERAL2",
							regex:new RegExp("^"+STRING_LITERAL2),
							style:"string" },
	
						// Enclosed comments won't be highlighted
						{ name: "NIL",
							regex:new RegExp("^"+NIL),
							style:"punc" },
	
						// Enclosed comments won't be highlighted
						{ name: "ANON",
							regex:new RegExp("^"+ANON),
							style:"punc" },
	
						{ name: "PNAME_LN",
							regex:new RegExp("^"+PNAME_LN),
							style:"string-2" },
	
						{ name: "PNAME_NS",
							regex:new RegExp("^"+PNAME_NS),
							style:"string-2" },
	
						{ name: "BLANK_NODE_LABEL",
							regex:new RegExp("^"+BLANK_NODE_LABEL),
							style:"string-2" }
					],
	
				};
			return terminals;
		}
	
		function getPossibles(symbol)
		{
			var possibles=[], possiblesOb=ll1_table[symbol];
			if (possiblesOb!=undefined)
				for (var property in possiblesOb)
					possibles.push(property.toString());
			else
				possibles.push(symbol);
			return possibles;
		}
	
		var tms= getTerminals();
		var terminal=tms.terminal;
	
		function tokenBase(stream, state) {
	
			function nextToken() {
	
				var consumed=null;
				// Tokens defined by individual regular expressions
				for (var i=0; i<terminal.length; ++i) {
					consumed= stream.match(terminal[i].regex,true,false);
					if (consumed)
						return { cat: terminal[i].name,
										 style: terminal[i].style,
										 text: consumed[0]
									 };
				}
	
				// Keywords
				consumed= stream.match(keywords,true,false);
				if (consumed)
					return { cat: stream.current().toUpperCase(),
									 style: "keyword",
									 text: consumed[0]
								 };
	
				// Punctuation
				consumed= stream.match(punct,true,false);
				if (consumed)
					return { cat: stream.current(),
									 style: "punc",
									 text: consumed[0]
								 };
	
				// Token is invalid
				// better consume something anyway, or else we're stuck
				consumed= stream.match(/^.[A-Za-z0-9]*/,true,false);
				return { cat:"<invalid_token>",
								 style: "error",
								 text: consumed[0]
							 };
			}
	
			function recordFailurePos() {
				// tokenOb.style= "sp-invalid";
				var col= stream.column();
				state.errorStartPos= col;
				state.errorEndPos= col+tokenOb.text.length;
			};
	
			function setQueryType(s) {
				if (state.queryType==null) {
					if (s =="SELECT" || s=="CONSTRUCT" || s=="ASK" || s=="DESCRIBE" || s=="INSERT" || s=="DELETE" || s=="LOAD" || s=="CLEAR" || s=="CREATE" || s=="DROP" || s=="COPY" || s=="MOVE" || s=="ADD")
						state.queryType=s;
				}
			}
	
			// Some fake non-terminals are just there to have side-effect on state
			// - i.e. allow or disallow variables and bnodes in certain non-nesting
			// contexts
			function setSideConditions(topSymbol) {
				if (topSymbol=="disallowVars") state.allowVars=false;
				else if (topSymbol=="allowVars") state.allowVars=true;
				else if (topSymbol=="disallowBnodes") state.allowBnodes=false;
				else if (topSymbol=="allowBnodes") state.allowBnodes=true;
				else if (topSymbol=="storeProperty") state.storeProperty=true;
			}
	
			function checkSideConditions(topSymbol) {
				return(
					(state.allowVars || topSymbol!="var") &&
						(state.allowBnodes ||
						 (topSymbol!="blankNode" &&
							topSymbol!="blankNodePropertyList" &&
							topSymbol!="blankNodePropertyListPath")));
			}
	
			// CodeMirror works with one line at a time,
			// but newline should behave like whitespace
			// - i.e. a definite break between tokens (for autocompleter)
			if (stream.pos==0)
				state.possibleCurrent= state.possibleNext;
	
			var tokenOb= nextToken();
	
	
			if (tokenOb.cat=="<invalid_token>") {
				// set error state, and
				if (state.OK==true) {
					state.OK=false;
					recordFailurePos();
				}
				state.complete=false;
				// alert("Invalid:"+tokenOb.text);
				return tokenOb.style;
			}
	
			if (tokenOb.cat == "WS" ||
					tokenOb.cat == "COMMENT") {
				state.possibleCurrent= state.possibleNext;
				return(tokenOb.style);
			}
			// Otherwise, run the parser until the token is digested
			// or failure
			var finished= false;
			var topSymbol;
			var token= tokenOb.cat;
	
			// Incremental LL1 parse
			while(state.stack.length>0 && token && state.OK && !finished ) {
				topSymbol= state.stack.pop();
	
				if (!ll1_table[topSymbol]) {
					// Top symbol is a terminal
					if (topSymbol==token) {
						// Matching terminals
						// - consume token from input stream
						finished=true;
						setQueryType(topSymbol);
						// Check whether $ (end of input token) is poss next
						// for everything on stack
						var allNillable=true;
						for(var sp=state.stack.length;sp>0;--sp) {
							var item=ll1_table[state.stack[sp-1]];
							if (!item || !item["$"])
								allNillable=false;
						}
						state.complete= allNillable;
						if (state.storeProperty && token.cat!="punc") {
								state.lastProperty= tokenOb.text;
								state.storeProperty= false;
							}
					} else {
						state.OK=false;
						state.complete=false;
						recordFailurePos();
					}
				} else {
					// topSymbol is nonterminal
					// - see if there is an entry for topSymbol
					// and nextToken in table
					var nextSymbols= ll1_table[topSymbol][token];
					if (nextSymbols!=undefined
							&& checkSideConditions(topSymbol)
						 )
					{
						// Match - copy RHS of rule to stack
						for (var i=nextSymbols.length-1; i>=0; --i)
							state.stack.push(nextSymbols[i]);
						// Peform any non-grammatical side-effects
						setSideConditions(topSymbol);
					} else {
						// No match in table - fail
						state.OK=false;
						state.complete=false;
						recordFailurePos();
						state.stack.push(topSymbol);  // Shove topSymbol back on stack
					}
				}
			}
			if (!finished && state.OK) { 
				state.OK=false; state.complete=false; recordFailurePos(); 
	    }
	
			state.possibleCurrent= state.possibleNext;
			state.possibleNext= getPossibles(state.stack[state.stack.length-1]);
	
			// alert(token+"="+tokenOb.style+'\n'+state.stack);
			return tokenOb.style;
		}
	
		var indentTop={
			"*[,, object]": 3,
			"*[(,),object]": 3,
			"*[(,),objectPath]": 3,
			"*[/,pathEltOrInverse]": 2,
			"object": 2,
			"objectPath": 2,
			"objectList": 2,
			"objectListPath": 2,
			"storeProperty": 2,
			"pathMod": 2,
			"?pathMod": 2,
			"propertyListNotEmpty": 1,
			"propertyList": 1,
			"propertyListPath": 1,
			"propertyListPathNotEmpty": 1,
			"?[verb,objectList]": 1,
			"?[or([verbPath, verbSimple]),objectList]": 1,
		};
	
		var indentTable={
			"}":1,
			"]":0,
			")":1,
			"{":-1,
			"(":-1,
			"*[;,?[or([verbPath,verbSimple]),objectList]]": 1,
		};
		
	
		function indent(state, textAfter) {
			var n = 0; // indent level
			var i=state.stack.length-1;
	
			if (/^[\}\]\)]/.test(textAfter)) {
				// Skip stack items until after matching bracket
				var closeBracket=textAfter.substr(0,1);
				for( ;i>=0;--i)
				{
					if (state.stack[i]==closeBracket)
					{--i; break;};
				}
			} else {
				// Consider nullable non-terminals if at top of stack
				var dn=indentTop[state.stack[i]];
				if (dn) { 
					n+=dn; --i;
				}
			}
			for( ;i>=0;--i)
			{
				var dn=indentTable[state.stack[i]];
				if (dn) {
					n+=dn;
				}
			}
			return n * config.indentUnit;
		};
	
		return {
			token: tokenBase,
			startState: function(base) {
				return {
					tokenize: tokenBase,
					OK: true,
					complete: acceptEmpty,
					errorStartPos: null,
					errorEndPos: null,
					queryType: defaultQueryType,
					possibleCurrent: getPossibles(startSymbol),
					possibleNext: getPossibles(startSymbol),
					allowVars : true,
					allowBnodes : true,
					storeProperty : false,
					lastProperty : "",
					stack: [startSymbol]
				}; 
			},
			indent: indent,
			electricChars: "}])"
		};
	}
	);
	CodeMirror.defineMIME("application/x-sparql-query", "sparql11");
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
/*
* TRIE implementation in Javascript
* Copyright (c) 2010 Saurabh Odhyan | http://odhyan.com
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* Date: Nov 7, 2010
*/

/*
* A trie, or prefix tree, is a multi-way tree structure useful for storing strings over an alphabet. 
* It has been used to store large dictionaries of English (say) words in spell-checking programs 
* and in natural-language "understanding" programs.    
* @see http://en.wikipedia.org/wiki/Trie
* @see http://www.csse.monash.edu.au/~lloyd/tildeAlgDS/Tree/Trie/
/*

* @class Trie
* @constructor
*/  
module.exports = Trie = function() {
    this.words = 0;
    this.prefixes = 0;
    this.children = [];
};

Trie.prototype = {
    
    /*
    * Insert a word into the dictionary. 
    * Recursively traverse through the trie nodes, and create new node if does not already exist.
    *
    * @method insert
    * @param {String} str Word to insert in the dictionary
    * @param {Integer} pos Current index of the string to be inserted
    * @return {Void}
    */
    insert: function(str, pos) {
        if(str.length == 0) { //blank string cannot be inserted
            return;
        }
        
        var T = this,
            k,
            child;
            
        if(pos === undefined) {
            pos = 0;
        }
        if(pos === str.length) {
            T.words ++;
            return;
        }
        T.prefixes ++;
        k = str[pos];
        if(T.children[k] === undefined) { //if node for this char doesn't exist, create one
            T.children[k] = new Trie();
        }
        child = T.children[k];
        child.insert(str, pos + 1);
    },
    
    /*
    * Remove a word from the dictionary.
    *
    * @method remove
    * @param {String} str Word to be removed
    * @param {Integer} pos Current index of the string to be removed
    * @return {Void}
    */
    remove: function(str, pos) {
        if(str.length == 0) {
            return;
        }
        
        var T = this,
            k,
            child;
        
        if(pos === undefined) {
            pos = 0;
        }   
        if(T === undefined) {
            return;
        }
        if(pos === str.length) {
            T.words --;
            return;
        }
        T.prefixes --;
        k = str[pos];
        child = T.children[k];
        child.remove(str, pos + 1);
    },
    
    /*
    * Update an existing word in the dictionary. 
    * This method removes the old word from the dictionary and inserts the new word.
    *
    * @method update
    * @param {String} strOld The old word to be replaced
    * @param {String} strNew The new word to be inserted
    * @return {Void}
    */
    update: function(strOld, strNew) {
        if(strOld.length == 0 || strNew.length == 0) {
            return;
        }
        this.remove(strOld);
        this.insert(strNew);
    },
    
    /*
    * Count the number of times a given word has been inserted into the dictionary
    *
    * @method countWord
    * @param {String} str Word to get count of
    * @param {Integer} pos Current index of the given word
    * @return {Integer} The number of times a given word exists in the dictionary
    */
    countWord: function(str, pos) {
        if(str.length == 0) {
            return 0;
        }
        
        var T = this,
            k,
            child,
            ret = 0;
        
        if(pos === undefined) {
            pos = 0;
        }   
        if(pos === str.length) {
            return T.words;
        }
        k = str[pos];
        child = T.children[k];
        if(child !== undefined) { //node exists
            ret = child.countWord(str, pos + 1);
        }
        return ret;
    },
    
    /*
    * Count the number of times a given prefix exists in the dictionary
    *
    * @method countPrefix
    * @param {String} str Prefix to get count of
    * @param {Integer} pos Current index of the given prefix
    * @return {Integer} The number of times a given prefix exists in the dictionary
    */
    countPrefix: function(str, pos) {
        if(str.length == 0) {
            return 0;
        }
        
        var T = this,
            k,
            child,
            ret = 0;

        if(pos === undefined) {
            pos = 0;
        }
        if(pos === str.length) {
            return T.prefixes;
        }
        var k = str[pos];
        child = T.children[k];
        if(child !== undefined) { //node exists
            ret = child.countPrefix(str, pos + 1); 
        }
        return ret; 
    },
    
    /*
    * Find a word in the dictionary
    *
    * @method find
    * @param {String} str The word to find in the dictionary
    * @return {Boolean} True if the word exists in the dictionary, else false
    */
    find: function(str) {
        if(str.length == 0) {
            return false;
        }
        
        if(this.countWord(str) > 0) {
            return true;
        } else {
            return false;
        }
    },
    
    /*
    * Get all words in the dictionary
    *
    * @method getAllWords
    * @param {String} str Prefix of current word
    * @return {Array} Array of words in the dictionary
    */
    getAllWords: function(str) {
        var T = this,
            k,
            child,
            ret = [];
        if(str === undefined) {
            str = "";
        }
        if(T === undefined) {
            return [];
        }
        if(T.words > 0) {
            ret.push(str);
        }
        for(k in T.children) {
            child = T.children[k];
            ret = ret.concat(child.getAllWords(str + k));
        }
        return ret;
    },
    
    /*
    * Autocomplete a given prefix
    *
    * @method autoComplete
    * @param {String} str Prefix to be completed based on dictionary entries
    * @param {Integer} pos Current index of the prefix
    * @return {Array} Array of possible suggestions
    */
    autoComplete: function(str, pos) {
        
        
        var T = this,
            k,
            child;
        if(str.length == 0) {
			if (pos === undefined) {
				return T.getAllWords(str);
			} else {
				return [];
			}
        }
        if(pos === undefined) {
            pos = 0;
        }   
        k = str[pos];
        child = T.children[k];
        if(child === undefined) { //node doesn't exist
            return [];
        }
        if(pos === str.length - 1) {
            return child.getAllWords(str);
        }
        return child.autoComplete(str, pos + 1);
    }
};

},{}],5:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.display.input.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
  var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

  // This is the old interface, kept around for now to stay
  // backwards-compatible.
  CodeMirror.showHint = function(cm, getHints, options) {
    if (!getHints) return cm.showHint(options);
    if (options && options.async) getHints.async = true;
    var newOpts = {hint: getHints};
    if (options) for (var prop in options) newOpts[prop] = options[prop];
    return cm.showHint(newOpts);
  };

  CodeMirror.defineExtension("showHint", function(options) {
    // We want a single cursor position.
    if (this.listSelections().length > 1 || this.somethingSelected()) return;

    if (this.state.completionActive) this.state.completionActive.close();
    var completion = this.state.completionActive = new Completion(this, options);
    var getHints = completion.options.hint;
    if (!getHints) return;

    CodeMirror.signal(this, "startCompletion", this);
    if (getHints.async)
      getHints(this, function(hints) { completion.showHints(hints); }, completion.options);
    else
      return completion.showHints(getHints(this, completion.options));
  });

  function Completion(cm, options) {
    this.cm = cm;
    this.options = this.buildOptions(options);
    this.widget = this.onClose = null;
  }

  Completion.prototype = {
    close: function() {
      if (!this.active()) return;
      this.cm.state.completionActive = null;

      if (this.widget) this.widget.close();
      if (this.onClose) this.onClose();
      CodeMirror.signal(this.cm, "endCompletion", this.cm);
    },

    active: function() {
      return this.cm.state.completionActive == this;
    },

    pick: function(data, i) {
      var completion = data.list[i];
      if (completion.hint) completion.hint(this.cm, data, completion);
      else this.cm.replaceRange(getText(completion), completion.from || data.from,
                                completion.to || data.to, "complete");
      CodeMirror.signal(data, "pick", completion);
      this.close();
    },

    showHints: function(data) {
      if (!data || !data.list.length || !this.active()) return this.close();

      if (this.options.completeSingle && data.list.length == 1)
        this.pick(data, 0);
      else
        this.showWidget(data);
    },

    showWidget: function(data) {
      this.widget = new Widget(this, data);
      CodeMirror.signal(data, "shown");

      var debounce = 0, completion = this, finished;
      var closeOn = this.options.closeCharacters;
      var startPos = this.cm.getCursor(), startLen = this.cm.getLine(startPos.line).length;

      var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
        return setTimeout(fn, 1000/60);
      };
      var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

      function done() {
        if (finished) return;
        finished = true;
        completion.close();
        completion.cm.off("cursorActivity", activity);
        if (data) CodeMirror.signal(data, "close");
      }

      function update() {
        if (finished) return;
        CodeMirror.signal(data, "update");
        var getHints = completion.options.hint;
        if (getHints.async)
          getHints(completion.cm, finishUpdate, completion.options);
        else
          finishUpdate(getHints(completion.cm, completion.options));
      }
      function finishUpdate(data_) {
        data = data_;
        if (finished) return;
        if (!data || !data.list.length) return done();
        if (completion.widget) completion.widget.close();
        completion.widget = new Widget(completion, data);
      }

      function clearDebounce() {
        if (debounce) {
          cancelAnimationFrame(debounce);
          debounce = 0;
        }
      }

      function activity() {
        clearDebounce();
        var pos = completion.cm.getCursor(), line = completion.cm.getLine(pos.line);
        if (pos.line != startPos.line || line.length - pos.ch != startLen - startPos.ch ||
            pos.ch < startPos.ch || completion.cm.somethingSelected() ||
            (pos.ch && closeOn.test(line.charAt(pos.ch - 1)))) {
          completion.close();
        } else {
          debounce = requestAnimationFrame(update);
          if (completion.widget) completion.widget.close();
        }
      }
      this.cm.on("cursorActivity", activity);
      this.onClose = done;
    },

    buildOptions: function(options) {
      var editor = this.cm.options.hintOptions;
      var out = {};
      for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
      if (editor) for (var prop in editor)
        if (editor[prop] !== undefined) out[prop] = editor[prop];
      if (options) for (var prop in options)
        if (options[prop] !== undefined) out[prop] = options[prop];
      return out;
    }
  };

  function getText(completion) {
    if (typeof completion == "string") return completion;
    else return completion.text;
  }

  function buildKeyMap(completion, handle) {
    var baseMap = {
      Up: function() {handle.moveFocus(-1);},
      Down: function() {handle.moveFocus(1);},
      PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
      PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
      Home: function() {handle.setFocus(0);},
      End: function() {handle.setFocus(handle.length - 1);},
      Enter: handle.pick,
      Tab: handle.pick,
      Esc: handle.close
    };
    var custom = completion.options.customKeys;
    var ourMap = custom ? {} : baseMap;
    function addBinding(key, val) {
      var bound;
      if (typeof val != "string")
        bound = function(cm) { return val(cm, handle); };
      // This mechanism is deprecated
      else if (baseMap.hasOwnProperty(val))
        bound = baseMap[val];
      else
        bound = val;
      ourMap[key] = bound;
    }
    if (custom)
      for (var key in custom) if (custom.hasOwnProperty(key))
        addBinding(key, custom[key]);
    var extra = completion.options.extraKeys;
    if (extra)
      for (var key in extra) if (extra.hasOwnProperty(key))
        addBinding(key, extra[key]);
    return ourMap;
  }

  function getHintElement(hintsElement, el) {
    while (el && el != hintsElement) {
      if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
      el = el.parentNode;
    }
  }

  function Widget(completion, data) {
    this.completion = completion;
    this.data = data;
    var widget = this, cm = completion.cm;

    var hints = this.hints = document.createElement("ul");
    hints.className = "CodeMirror-hints";
    this.selectedHint = data.selectedHint || 0;

    var completions = data.list;
    for (var i = 0; i < completions.length; ++i) {
      var elt = hints.appendChild(document.createElement("li")), cur = completions[i];
      var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
      if (cur.className != null) className = cur.className + " " + className;
      elt.className = className;
      if (cur.render) cur.render(elt, data, cur);
      else elt.appendChild(document.createTextNode(cur.displayText || getText(cur)));
      elt.hintId = i;
    }

    var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + "px";
    hints.style.top = top + "px";
    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    (completion.options.container || document.body).appendChild(hints);
    var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
    if (overlapY > 0) {
      var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
      if (curTop - height > 0) { // Fits above cursor
        hints.style.top = (top = pos.top - height) + "px";
        below = false;
      } else if (height > winH) {
        hints.style.height = (winH - 5) + "px";
        hints.style.top = (top = pos.bottom - box.top) + "px";
        var cursor = cm.getCursor();
        if (data.from.ch != cursor.ch) {
          pos = cm.cursorCoords(cursor);
          hints.style.left = (left = pos.left) + "px";
          box = hints.getBoundingClientRect();
        }
      }
    }
    var overlapX = box.left - winW;
    if (overlapX > 0) {
      if (box.right - box.left > winW) {
        hints.style.width = (winW - 5) + "px";
        overlapX -= (box.right - box.left) - winW;
      }
      hints.style.left = (left = pos.left - overlapX) + "px";
    }

    cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
      moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
      setFocus: function(n) { widget.changeActive(n); },
      menuSize: function() { return widget.screenAmount(); },
      length: completions.length,
      close: function() { completion.close(); },
      pick: function() { widget.pick(); },
      data: data
    }));

    if (completion.options.closeOnUnfocus) {
      var closingOnBlur;
      cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
      cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
    }

    var startScroll = cm.getScrollInfo();
    cm.on("scroll", this.onScroll = function() {
      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
      var newTop = top + startScroll.top - curScroll.top;
      var point = newTop - (window.pageYOffset || (document.documentElement || document.body).scrollTop);
      if (!below) point += hints.offsetHeight;
      if (point <= editor.top || point >= editor.bottom) return completion.close();
      hints.style.top = newTop + "px";
      hints.style.left = (left + startScroll.left - curScroll.left) + "px";
    });

    CodeMirror.on(hints, "dblclick", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
    });

    CodeMirror.on(hints, "click", function(e) {
      var t = getHintElement(hints, e.target || e.srcElement);
      if (t && t.hintId != null) {
        widget.changeActive(t.hintId);
        if (completion.options.completeOnSingleClick) widget.pick();
      }
    });

    CodeMirror.on(hints, "mousedown", function() {
      setTimeout(function(){cm.focus();}, 20);
    });

    CodeMirror.signal(data, "select", completions[0], hints.firstChild);
    return true;
  }

  Widget.prototype = {
    close: function() {
      if (this.completion.widget != this) return;
      this.completion.widget = null;
      this.hints.parentNode.removeChild(this.hints);
      this.completion.cm.removeKeyMap(this.keyMap);

      var cm = this.completion.cm;
      if (this.completion.options.closeOnUnfocus) {
        cm.off("blur", this.onBlur);
        cm.off("focus", this.onFocus);
      }
      cm.off("scroll", this.onScroll);
    },

    pick: function() {
      this.completion.pick(this.data, this.selectedHint);
    },

    changeActive: function(i, avoidWrap) {
      if (i >= this.data.list.length)
        i = avoidWrap ? this.data.list.length - 1 : 0;
      else if (i < 0)
        i = avoidWrap ? 0  : this.data.list.length - 1;
      if (this.selectedHint == i) return;
      var node = this.hints.childNodes[this.selectedHint];
      node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
      node = this.hints.childNodes[this.selectedHint = i];
      node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
      if (node.offsetTop < this.hints.scrollTop)
        this.hints.scrollTop = node.offsetTop - 3;
      else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
        this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
      CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
    },

    screenAmount: function() {
      return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
    }
  };

  CodeMirror.registerHelper("hint", "auto", function(cm, options) {
    var helpers = cm.getHelpers(cm.getCursor(), "hint"), words;
    if (helpers.length) {
      for (var i = 0; i < helpers.length; i++) {
        var cur = helpers[i](cm, options);
        if (cur && cur.list.length) return cur;
      }
    } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
      if (words) return CodeMirror.hint.fromList(cm, {words: words});
    } else if (CodeMirror.hint.anyword) {
      return CodeMirror.hint.anyword(cm, options);
    }
  });

  CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
    var found = [];
    for (var i = 0; i < options.words.length; i++) {
      var word = options.words[i];
      if (word.slice(0, token.string.length) == token.string)
        found.push(word);
    }

    if (found.length) return {
      list: found,
      from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)
    };
  });

  CodeMirror.commands.autocomplete = CodeMirror.showHint;

  var defaultOptions = {
    hint: CodeMirror.hint.auto,
    completeSingle: true,
    alignWithWord: true,
    closeCharacters: /[\s()\[\]{};:>,]/,
    closeOnUnfocus: true,
    completeOnSingleClick: false,
    container: null,
    customKeys: null,
    extraKeys: null
  };

  CodeMirror.defineOption("hintOptions", null);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.runMode = function(string, modespec, callback, options) {
  var mode = CodeMirror.getMode(CodeMirror.defaults, modespec);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);

  if (callback.nodeType == 1) {
    var tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize;
    var node = callback, col = 0;
    node.innerHTML = "";
    callback = function(text, style) {
      if (text == "\n") {
        // Emitting LF or CRLF on IE8 or earlier results in an incorrect display.
        // Emitting a carriage return makes everything ok.
        node.appendChild(document.createTextNode(ie_lt9 ? '\r' : text));
        col = 0;
        return;
      }
      var content = "";
      // replace tabs
      for (var pos = 0;;) {
        var idx = text.indexOf("\t", pos);
        if (idx == -1) {
          content += text.slice(pos);
          col += text.length - pos;
          break;
        } else {
          col += idx - pos;
          content += text.slice(pos, idx);
          var size = tabSize - col % tabSize;
          col += size;
          for (var i = 0; i < size; ++i) content += " ";
          pos = idx + 1;
        }
      }

      if (style) {
        var sp = node.appendChild(document.createElement("span"));
        sp.className = "cm-" + style.replace(/ +/g, " cm-");
        sp.appendChild(document.createTextNode(content));
      } else {
        node.appendChild(document.createTextNode(content));
      }
    };
  }

  var lines = CodeMirror.splitLines(string), state = (options && options.state) || CodeMirror.startState(mode);
  for (var i = 0, e = lines.length; i < e; ++i) {
    if (i) callback("\n");
    var stream = new CodeMirror.StringStream(lines[i]);
    if (!stream.string && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};

});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  var Pos = CodeMirror.Pos;

  function SearchCursor(doc, query, pos, caseFold) {
    this.atOccurrence = false; this.doc = doc;
    if (caseFold == null && typeof query == "string") caseFold = false;

    pos = pos ? doc.clipPos(pos) : Pos(0, 0);
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") { // Regexp match
      if (!query.global) query = new RegExp(query.source, query.ignoreCase ? "ig" : "g");
      this.matches = function(reverse, pos) {
        if (reverse) {
          query.lastIndex = 0;
          var line = doc.getLine(pos.line).slice(0, pos.ch), cutOff = 0, match, start;
          for (;;) {
            query.lastIndex = cutOff;
            var newMatch = query.exec(line);
            if (!newMatch) break;
            match = newMatch;
            start = match.index;
            cutOff = match.index + (match[0].length || 1);
            if (cutOff == line.length) break;
          }
          var matchLen = (match && match[0].length) || 0;
          if (!matchLen) {
            if (start == 0 && line.length == 0) {match = undefined;}
            else if (start != doc.getLine(pos.line).length) {
              matchLen++;
            }
          }
        } else {
          query.lastIndex = pos.ch;
          var line = doc.getLine(pos.line), match = query.exec(line);
          var matchLen = (match && match[0].length) || 0;
          var start = match && match.index;
          if (start + matchLen != line.length && !matchLen) matchLen = 1;
        }
        if (match && matchLen)
          return {from: Pos(pos.line, start),
                  to: Pos(pos.line, start + matchLen),
                  match: match};
      };
    } else { // String query
      var origQuery = query;
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1) {
        if (!query.length) {
          // Empty string would match anything and never progress, so
          // we define it to match nothing instead.
          this.matches = function() {};
        } else {
          this.matches = function(reverse, pos) {
            if (reverse) {
              var orig = doc.getLine(pos.line).slice(0, pos.ch), line = fold(orig);
              var match = line.lastIndexOf(query);
              if (match > -1) {
                match = adjustPos(orig, line, match);
                return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
              }
             } else {
               var orig = doc.getLine(pos.line).slice(pos.ch), line = fold(orig);
               var match = line.indexOf(query);
               if (match > -1) {
                 match = adjustPos(orig, line, match) + pos.ch;
                 return {from: Pos(pos.line, match), to: Pos(pos.line, match + origQuery.length)};
               }
            }
          };
        }
      } else {
        var origTarget = origQuery.split("\n");
        this.matches = function(reverse, pos) {
          var last = target.length - 1;
          if (reverse) {
            if (pos.line - (target.length - 1) < doc.firstLine()) return;
            if (fold(doc.getLine(pos.line).slice(0, origTarget[last].length)) != target[target.length - 1]) return;
            var to = Pos(pos.line, origTarget[last].length);
            for (var ln = pos.line - 1, i = last - 1; i >= 1; --i, --ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            var line = doc.getLine(ln), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            return {from: Pos(ln, cut), to: to};
          } else {
            if (pos.line + (target.length - 1) > doc.lastLine()) return;
            var line = doc.getLine(pos.line), cut = line.length - origTarget[0].length;
            if (fold(line.slice(cut)) != target[0]) return;
            var from = Pos(pos.line, cut);
            for (var ln = pos.line + 1, i = 1; i < last; ++i, ++ln)
              if (target[i] != fold(doc.getLine(ln))) return;
            if (fold(doc.getLine(ln).slice(0, origTarget[last].length)) != target[last]) return;
            return {from: from, to: Pos(ln, origTarget[last].length)};
          }
        };
      }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.doc.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = Pos(line, 0);
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = Pos(pos.line-1, this.doc.getLine(pos.line-1).length);
        }
        else {
          var maxLine = this.doc.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = Pos(pos.line + 1, 0);
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText) {
      if (!this.atOccurrence) return;
      var lines = CodeMirror.splitLines(newText);
      this.doc.replaceRange(lines, this.pos.from, this.pos.to);
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
    }
  };

  // Maps a position in a case-folded line back to a position in the original line
  // (compensating for codepoints increasing in number during folding)
  function adjustPos(orig, folded, pos) {
    if (orig.length == folded.length) return pos;
    for (var pos1 = Math.min(pos, orig.length);;) {
      var len1 = orig.slice(0, pos1).toLowerCase().length;
      if (len1 < pos) ++pos1;
      else if (len1 > pos) --pos1;
      else return pos1;
    }
  }

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold);
  });
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });

  CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
    var ranges = [], next;
    var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold);
    while (next = cur.findNext()) {
      if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break;
      ranges.push({anchor: cur.from(), head: cur.to()});
    }
    if (ranges.length)
      this.setSelections(ranges, 0);
  });
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		scriptTag = 'script',
		storage

	store.disabled = false
	store.set = function(key, value) {}
	store.get = function(key) {}
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		var val = store.get(key)
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (typeof val == 'undefined') { val = defaultVal || {} }
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}
	store.forEach = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key) { return store.deserialize(storage.getItem(key)) }
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = function(callback) {
			for (var i=0; i<storage.length; i++) {
				var key = storage.key(i)
				callback(key, store.get(key))
			}
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		function withIEStorage(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys cannot start with a digit or contain certain chars.
		// See https://github.com/marcuswestin/store.js/issues/40
		// See https://github.com/marcuswestin/store.js/issues/83
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			return store.deserialize(storage.getAttribute(key))
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = function(storage) {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = withIEStorage(function(storage, callback) {
			var attributes = storage.XMLDocument.documentElement.attributes
			for (var i=0, attr; attr=attributes[i]; ++i) {
				callback(attr.name, store.deserialize(storage.getAttribute(attr.name)))
			}
		})
	}

	try {
		var testKey = '__storejs__'
		store.set(testKey, testKey)
		if (store.get(testKey) != testKey) { store.disabled = true }
		store.remove(testKey)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled

	if (typeof module != 'undefined' && module.exports && this.module !== module) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { win.store = store }

})(Function('return this')());

},{}],10:[function(require,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.3.1",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasgui.github.io/license.txt"
    }
  ],
  "author": {
    "name": "Laurens Rietveld"
  },
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "url": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  },
  "readme": "A simple utils repo for the YASGUI tools\n",
  "readmeFilename": "README.md",
  "_id": "yasgui-utils@1.3.1",
  "_from": "yasgui-utils@1.3.1"
}

},{}],11:[function(require,module,exports){
(function (global){
/**
 * Determine unique ID of the YASQE object. Useful when several objects are
 * loaded on the same page, and all have 'persistency' enabled. Currently, the
 * ID is determined by selecting the nearest parent in the DOM with an ID set
 * 
 * @param doc {YASQE}
 * @method YASQE.determineId
 */
var root = module.exports = function(element) {
	return (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null)(element).closest('[id]').attr('id');
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(require,module,exports){
var root = module.exports = {
	cross: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g>	<path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907   c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686   L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591   c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686   L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>',
	check: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path fill="#000000" d="M14.301,49.982l22.606,17.047L84.361,4.903c2.614-3.733,7.76-4.64,11.493-2.026l0.627,0.462  c3.732,2.614,4.64,7.758,2.025,11.492l-51.783,79.77c-1.955,2.791-3.896,3.762-7.301,3.988c-3.405,0.225-5.464-1.039-7.508-3.084  L2.447,61.814c-3.263-3.262-3.263-8.553,0-11.814l0.041-0.019C5.75,46.718,11.039,46.718,14.301,49.982z"/></svg>',
	unsorted: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path7-9"     d="m 8.8748339,52.571766 16.9382111,-0.222584 4.050851,-0.06665 15.719154,-0.222166 0.27778,-0.04246 0.43276,0.0017 0.41632,-0.06121 0.37532,-0.0611 0.47132,-0.119342 0.27767,-0.08206 0.55244,-0.198047 0.19707,-0.08043 0.61095,-0.259721 0.0988,-0.05825 0.019,-0.01914 0.59303,-0.356548 0.11787,-0.0788 0.49125,-0.337892 0.17994,-0.139779 0.37317,-0.336871 0.21862,-0.219786 0.31311,-0.31479 0.21993,-0.259387 c 0.92402,-1.126057 1.55249,-2.512251 1.78961,-4.016904 l 0.0573,-0.25754 0.0195,-0.374113 0.0179,-0.454719 0.0175,-0.05874 -0.0169,-0.258049 -0.0225,-0.493503 -0.0398,-0.355569 -0.0619,-0.414201 -0.098,-0.414812 -0.083,-0.353334 L 53.23955,41.1484 53.14185,40.850967 52.93977,40.377742 52.84157,40.161628 34.38021,4.2507375 C 33.211567,1.9401875 31.035446,0.48226552 28.639484,0.11316952 l -0.01843,-0.01834 -0.671963,-0.07882 -0.236871,0.0042 L 27.335984,-4.7826577e-7 27.220736,0.00379952 l -0.398804,0.0025 -0.313848,0.04043 -0.594474,0.07724 -0.09611,0.02147 C 23.424549,0.60716252 21.216017,2.1142355 20.013025,4.4296865 L 0.93967491,40.894479 c -2.08310801,3.997178 -0.588125,8.835482 3.35080799,10.819749 1.165535,0.613495 2.43199,0.88731 3.675026,0.864202 l 0.49845,-0.02325 0.410875,0.01658 z M 9.1502369,43.934401 9.0136999,43.910011 27.164145,9.2564625 44.70942,43.42818 l -14.765289,0.214677 -4.031106,0.0468 -16.7627881,0.244744 z" /></svg>',
	sortDesc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,0.12823506 0.09753,0.02006 c 2.39093,0.458209 4.599455,1.96811104 5.80244,4.28639004 L 52.785897,40.894525 c 2.088044,4.002139 0.590949,8.836902 -3.348692,10.821875 -1.329078,0.688721 -2.766603,0.943695 -4.133174,0.841768 l -0.454018,0.02 L 27.910392,52.354171 23.855313,52.281851 8.14393,52.061827 7.862608,52.021477 7.429856,52.021738 7.014241,51.959818 6.638216,51.900838 6.164776,51.779369 5.889216,51.699439 5.338907,51.500691 5.139719,51.419551 4.545064,51.145023 4.430618,51.105123 4.410168,51.084563 3.817138,50.730843 3.693615,50.647783 3.207314,50.310611 3.028071,50.174369 2.652795,49.833957 2.433471,49.613462 2.140099,49.318523 1.901127,49.041407 C 0.97781,47.916059 0.347935,46.528448 0.11153,45.021676 L 0.05352,44.766255 0.05172,44.371683 0.01894,43.936017 0,43.877277 0.01836,43.62206 0.03666,43.122889 0.0765,42.765905 0.13912,42.352413 0.23568,41.940425 0.32288,41.588517 0.481021,41.151945 0.579391,40.853806 0.77369,40.381268 0.876097,40.162336 19.338869,4.2542801 c 1.172169,-2.308419 3.34759,-3.76846504 5.740829,-4.17716604 l 0.01975,0.01985 0.69605,-0.09573 0.218437,0.0225 0.490791,-0.02132 0.39809,0.0046 0.315972,0.03973 0.594462,0.08149 z" /></svg>',
	sortAsc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,0.70898699,-0.70898699,-0.70522156,97.988199,58.704807)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,113.65778 0.09753,-0.0201 c 2.39093,-0.45821 4.599455,-1.96811 5.80244,-4.28639 L 52.785897,72.891487 c 2.088044,-4.002139 0.590949,-8.836902 -3.348692,-10.821875 -1.329078,-0.688721 -2.766603,-0.943695 -4.133174,-0.841768 l -0.454018,-0.02 -16.939621,0.223997 -4.055079,0.07232 -15.711383,0.220024 -0.281322,0.04035 -0.432752,-2.61e-4 -0.415615,0.06192 -0.376025,0.05898 -0.47344,0.121469 -0.27556,0.07993 -0.550309,0.198748 -0.199188,0.08114 -0.594655,0.274528 -0.114446,0.0399 -0.02045,0.02056 -0.59303,0.35372 -0.123523,0.08306 -0.486301,0.337172 -0.179243,0.136242 -0.375276,0.340412 -0.219324,0.220495 -0.293372,0.294939 -0.238972,0.277116 C 0.97781,65.869953 0.347935,67.257564 0.11153,68.764336 L 0.05352,69.019757 0.05172,69.414329 0.01894,69.849995 0,69.908735 l 0.01836,0.255217 0.0183,0.499171 0.03984,0.356984 0.06262,0.413492 0.09656,0.411988 0.0872,0.351908 0.158141,0.436572 0.09837,0.298139 0.194299,0.472538 0.102407,0.218932 18.462772,35.908054 c 1.172169,2.30842 3.34759,3.76847 5.740829,4.17717 l 0.01975,-0.0199 0.69605,0.0957 0.218437,-0.0225 0.490791,0.0213 0.39809,-0.005 0.315972,-0.0397 0.594462,-0.0815 z" /></svg>',
	loader: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%" fill="black">  <circle cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(45 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.125s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(90 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.25s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(135 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.375s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(225 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.625s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(270 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.75s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(315 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.875s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle></svg>',
	query: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 80 80" enable-background="new 0 0 80 80" xml:space="preserve"><g id="Layer_1"></g><g id="Layer_2">	<path d="M64.622,2.411H14.995c-6.627,0-12,5.373-12,12v49.897c0,6.627,5.373,12,12,12h49.627c6.627,0,12-5.373,12-12V14.411   C76.622,7.783,71.249,2.411,64.622,2.411z M24.125,63.906V15.093L61,39.168L24.125,63.906z"/></g></svg>',
	queryInvalid: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 73.627 73.897"   enable-background="new 0 0 80 80"   xml:space="preserve"   ><g     id="Layer_1"     transform="translate(-2.995,-2.411)" /><g     id="Layer_2"     transform="translate(-2.995,-2.411)"><path       d="M 64.622,2.411 H 14.995 c -6.627,0 -12,5.373 -12,12 v 49.897 c 0,6.627 5.373,12 12,12 h 49.627 c 6.627,0 12,-5.373 12,-12 V 14.411 c 0,-6.628 -5.373,-12 -12,-12 z M 24.125,63.906 V 15.093 L 61,39.168 24.125,63.906 z"       id="path6"       inkscape:connector-curvature="0" /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"     id="g3"><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 88.184,81.468 c 1.167,1.167 1.167,3.075 0,4.242 l -2.475,2.475 c -1.167,1.167 -3.076,1.167 -4.242,0 l -69.65,-69.65 c -1.167,-1.167 -1.167,-3.076 0,-4.242 l 2.476,-2.476 c 1.167,-1.167 3.076,-1.167 4.242,0 l 69.649,69.651 z"       id="path5" /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"     id="g7"><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 18.532,88.184 c -1.167,1.166 -3.076,1.166 -4.242,0 l -2.475,-2.475 c -1.167,-1.166 -1.167,-3.076 0,-4.242 l 69.65,-69.651 c 1.167,-1.167 3.075,-1.167 4.242,0 l 2.476,2.476 c 1.166,1.167 1.166,3.076 0,4.242 l -69.651,69.65 z"       id="path9" /></g></svg>',
	download: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="tiny" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" xml:space="preserve"><g id="Captions"></g><g id="Your_Icon">	<path fill-rule="evenodd" fill="#000000" d="M88,84v-2c0-2.961-0.859-4-4-4H16c-2.961,0-4,0.98-4,4v2c0,3.102,1.039,4,4,4h68   C87.02,88,88,87.039,88,84z M58,12H42c-5,0-6,0.941-6,6v22H16l34,34l34-34H64V18C64,12.941,62.939,12,58,12z"/></g></svg>',
	share: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Icons" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" style="enable-background:new 0 0 100 100;" xml:space="preserve"><path id="ShareThis" d="M36.764,50c0,0.308-0.07,0.598-0.088,0.905l32.247,16.119c2.76-2.338,6.293-3.797,10.195-3.797  C87.89,63.228,95,70.338,95,79.109C95,87.89,87.89,95,79.118,95c-8.78,0-15.882-7.11-15.882-15.891c0-0.316,0.07-0.598,0.088-0.905  L31.077,62.085c-2.769,2.329-6.293,3.788-10.195,3.788C12.11,65.873,5,58.771,5,50c0-8.78,7.11-15.891,15.882-15.891  c3.902,0,7.427,1.468,10.195,3.797l32.247-16.119c-0.018-0.308-0.088-0.598-0.088-0.914C63.236,12.11,70.338,5,79.118,5  C87.89,5,95,12.11,95,20.873c0,8.78-7.11,15.891-15.882,15.891c-3.911,0-7.436-1.468-10.195-3.806L36.676,49.086  C36.693,49.394,36.764,49.684,36.764,50z"/></svg>',
	draw: function(parent, config) {
		if (!parent) return;
		var el = root.getElement(config);
		if (el) {
			$(parent).append(el);
		}
	},
	getElement: function(config) {
		var svgString = (config.id? root[config.id]: config.value);
		if (svgString && svgString.indexOf("<svg") == 0) {
			if (!config.width) config.width = "100%";
			if (!config.height) config.height = "100%";
			
			var parser = new DOMParser();
			var dom = parser.parseFromString(svgString, "text/xml");
			var svg = dom.documentElement;
			
			var svgContainer = document.createElement("div");
			svgContainer.style.display = "inline-block";
			svgContainer.style.width = config.width;
			svgContainer.style.height = config.height;
			svgContainer.appendChild(svg);
			return svgContainer;
		}
		return false;
	}
};
},{}],13:[function(require,module,exports){
window.console = window.console || {"log":function(){}};//make sure any console statements don't break IE
module.exports = {
	storage: require("./storage.js"),
	determineId: require("./determineId.js"),
	imgs: require("./imgs.js"),
	version: {
		"yasgui-utils" : require("../package.json").version,
	}
};

},{"../package.json":10,"./determineId.js":11,"./imgs.js":12,"./storage.js":14}],14:[function(require,module,exports){
var store = require("store");
var times = {
	day: function() {
		return 1000 * 3600 * 24;//millis to day
	},
	month: function() {
		times.day() * 30;
	},
	year: function() {
		times.month() * 12;
	}
};

var root = module.exports = {
	set : function(key, val, exp) {
		if (typeof exp == "string") {
			exp = times[exp]();
		}
		store.set(key, {
			val : val,
			exp : exp,
			time : new Date().getTime()
		});
	},
	get : function(key) {
		var info = store.get(key);
		if (!info) {
			return null;
		}
		if (info.exp && new Date().getTime() - info.time > info.exp) {
			return null;
		}
		return info.val;
	}

};
},{"store":9}],15:[function(require,module,exports){
module.exports={
  "name": "yasgui-yasqe",
  "description": "Yet Another SPARQL Query Editor",
  "version": "1.5.1",
  "main": "src/main.js",
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasqe.yasgui.org/license.txt"
    }
  ],
  "author": "Laurens Rietveld",
  "homepage": "http://yasqe.yasgui.org",
  "devDependencies": {
    "browserify": "^6.1.0",
    "gulp": "~3.6.0",
    "gulp-bump": "^0.1.11",
    "gulp-concat": "^2.4.1",
    "gulp-connect": "^2.0.5",
    "gulp-embedlr": "^0.5.2",
    "gulp-filter": "^1.0.2",
    "gulp-git": "^0.5.2",
    "gulp-jsvalidate": "^0.2.0",
    "gulp-livereload": "^1.3.1",
    "gulp-minify-css": "^0.3.0",
    "gulp-notify": "^1.2.5",
    "gulp-rename": "^1.2.0",
    "gulp-streamify": "0.0.5",
    "gulp-tag-version": "^1.1.0",
    "gulp-uglify": "^0.2.1",
    "require-dir": "^0.1.0",
    "run-sequence": "^1.0.1",
    "vinyl-buffer": "0.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4",
    "browserify-shim": "^3.8.0"
  },
  "bugs": "https://github.com/YASGUI/YASQE/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YASGUI/YASQE.git"
  },
  "dependencies": {
    "jquery": "~ 1.11.0",
    "codemirror": "^4.2.0",
    "twitter-bootstrap-3.0.0": "^3.0.0",
    "yasgui-utils": "^1.3.0"
  },
  "browserify-shim": {
    "jquery": "global:jQuery",
    "codemirror": "global:CodeMirror",
    "../../lib/codemirror": "global:CodeMirror"
  }
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi5qcyIsImxpYi9kZXBhcmFtLmpzIiwibGliL2ZsaW50LmpzIiwibGliL3RyaWUuanMiLCJub2RlX21vZHVsZXMvY29kZW1pcnJvci9hZGRvbi9lZGl0L21hdGNoYnJhY2tldHMuanMiLCJub2RlX21vZHVsZXMvY29kZW1pcnJvci9hZGRvbi9oaW50L3Nob3ctaGludC5qcyIsIm5vZGVfbW9kdWxlcy9jb2RlbWlycm9yL2FkZG9uL3J1bm1vZGUvcnVubW9kZS5qcyIsIm5vZGVfbW9kdWxlcy9jb2RlbWlycm9yL2FkZG9uL3NlYXJjaC9zZWFyY2hjdXJzb3IuanMiLCJub2RlX21vZHVsZXMveWFzZ3VpLXV0aWxzL25vZGVfbW9kdWxlcy9zdG9yZS9zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy95YXNndWktdXRpbHMvcGFja2FnZS5qc29uIiwibm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvZGV0ZXJtaW5lSWQuanMiLCJub2RlX21vZHVsZXMveWFzZ3VpLXV0aWxzL3NyYy9pbWdzLmpzIiwibm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy95YXNndWktdXRpbHMvc3JjL3N0b3JhZ2UuanMiLCJwYWNrYWdlLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3gxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDendJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdllBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbid1c2Ugc3RyaWN0JztcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnJlcXVpcmUoXCIuLi9saWIvZGVwYXJhbS5qc1wiKTtcbnZhciBDb2RlTWlycm9yID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpO1xuXG5yZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL2hpbnQvc2hvdy1oaW50LmpzJyk7XG5yZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL3NlYXJjaC9zZWFyY2hjdXJzb3IuanMnKTtcbnJlcXVpcmUoJ2NvZGVtaXJyb3IvYWRkb24vZWRpdC9tYXRjaGJyYWNrZXRzLmpzJyk7XG5yZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL3J1bm1vZGUvcnVubW9kZS5qcycpO1xuXG53aW5kb3cuY29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHtcImxvZ1wiOmZ1bmN0aW9uKCl7fX07Ly9tYWtlIHN1cmUgYW55IGNvbnNvbGUgc3RhdGVtZW50c1xuXG5yZXF1aXJlKCcuLi9saWIvZmxpbnQuanMnKTtcbnZhciBUcmllID0gcmVxdWlyZSgnLi4vbGliL3RyaWUuanMnKTtcblxuLyoqXG4gKiBNYWluIFlBU1FFIGNvbnN0cnVjdG9yLiBQYXNzIGEgRE9NIGVsZW1lbnQgYXMgYXJndW1lbnQgdG8gYXBwZW5kIHRoZSBlZGl0b3IgdG8sIGFuZCAob3B0aW9uYWxseSkgcGFzcyBhbG9uZyBjb25maWcgc2V0dGluZ3MgKHNlZSB0aGUgWUFTUUUuZGVmYXVsdHMgb2JqZWN0IGJlbG93LCBhcyB3ZWxsIGFzIHRoZSByZWd1bGFyIENvZGVNaXJyb3IgZG9jdW1lbnRhdGlvbiwgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gY29uZmlndXJhYmlsaXR5KVxuICogXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RE9NLUVsZW1lbnR9IHBhcmVudCBlbGVtZW50IHRvIGFwcGVuZCBlZGl0b3IgdG8uXG4gKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3NcbiAqIEBjbGFzcyBZQVNRRVxuICogQHJldHVybiB7ZG9jfSBZQVNRRSBkb2N1bWVudFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGFyZW50LCBjb25maWcpIHtcblx0Y29uZmlnID0gZXh0ZW5kQ29uZmlnKGNvbmZpZyk7XG5cdHZhciBjbSA9IGV4dGVuZENtSW5zdGFuY2UoQ29kZU1pcnJvcihwYXJlbnQsIGNvbmZpZykpO1xuXHRwb3N0UHJvY2Vzc0NtRWxlbWVudChjbSk7XG5cdHJldHVybiBjbTtcbn07XG5cbi8qKlxuICogRXh0ZW5kIGNvbmZpZyBvYmplY3QsIHdoaWNoIHdlIHdpbGwgcGFzcyBvbiB0byB0aGUgQ00gY29uc3RydWN0b3IgbGF0ZXIgb24uXG4gKiBOZWVkIHRoaXMsIHRvIG1ha2Ugc3VyZSBvdXIgb3duICdvbkJsdXInIGV0YyBldmVudHMgZG8gbm90IGdldCBvdmVyd3JpdHRlbiBieVxuICogcGVvcGxlIHdobyBhZGQgdGhlaXIgb3duIG9uYmx1ciBldmVudHMgdG8gdGhlIGNvbmZpZyBBZGRpdGlvbmFsbHksIG5lZWQgdGhpc1xuICogdG8gaW5jbHVkZSB0aGUgQ00gZGVmYXVsdHMgb3Vyc2VsdmVzLiBDb2RlTWlycm9yIGhhcyBhIG1ldGhvZCBmb3IgaW5jbHVkaW5nXG4gKiBkZWZhdWx0cywgYnV0IHdlIGNhbid0IHJlbHkgb24gdGhhdCBvbmU6IGl0IGFzc3VtZXMgZmxhdCBjb25maWcgb2JqZWN0LCB3aGVyZVxuICogd2UgaGF2ZSBuZXN0ZWQgb2JqZWN0cyAoZS5nLiB0aGUgcGVyc2lzdGVuY3kgb3B0aW9uKVxuICogXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZXh0ZW5kQ29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG5cdHZhciBleHRlbmRlZENvbmZpZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCByb290LmRlZmF1bHRzLCBjb25maWcpO1xuXHQvLyBJIGtub3csIGNvZGVtaXJyb3IgZGVhbHMgd2l0aCAgZGVmYXVsdCBvcHRpb25zIGFzIHdlbGwuIFxuXHQvL0hvd2V2ZXIsIGl0IGRvZXMgbm90IGRvIHRoaXMgcmVjdXJzaXZlbHkgKGkuZS4gdGhlIHBlcnNpc3RlbmN5IG9wdGlvbilcblx0cmV0dXJuIGV4dGVuZGVkQ29uZmlnO1xufTtcbi8qKlxuICogQWRkIGV4dHJhIGZ1bmN0aW9ucyB0byB0aGUgQ00gZG9jdW1lbnQgKGkuZS4gdGhlIGNvZGVtaXJyb3IgaW5zdGFudGlhdGVkXG4gKiBvYmplY3QpXG4gKiBcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBleHRlbmRDbUluc3RhbmNlID0gZnVuY3Rpb24oY20pIHtcblx0LyoqXG5cdCAqIEV4ZWN1dGUgcXVlcnkuIFBhc3MgYSBjYWxsYmFjayBmdW5jdGlvbiwgb3IgYSBjb25maWd1cmF0aW9uIG9iamVjdCAoc2VlXG5cdCAqIGRlZmF1bHQgc2V0dGluZ3MgYmVsb3cgZm9yIHBvc3NpYmxlIHZhbHVlcykgSS5lLiwgeW91IGNhbiBjaGFuZ2UgdGhlXG5cdCAqIHF1ZXJ5IGNvbmZpZ3VyYXRpb24gYnkgZWl0aGVyIGNoYW5naW5nIHRoZSBkZWZhdWx0IHNldHRpbmdzLCBjaGFuZ2luZyB0aGVcblx0ICogc2V0dGluZ3Mgb2YgdGhpcyBkb2N1bWVudCwgb3IgYnkgcGFzc2luZyBxdWVyeSBzZXR0aW5ncyB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIFxuXHQgKiBAbWV0aG9kIGRvYy5xdWVyeVxuXHQgKiBAcGFyYW0gZnVuY3Rpb258b2JqZWN0XG5cdCAqL1xuXHRjbS5xdWVyeSA9IGZ1bmN0aW9uKGNhbGxiYWNrT3JDb25maWcpIHtcblx0XHRyb290LmV4ZWN1dGVRdWVyeShjbSwgY2FsbGJhY2tPckNvbmZpZyk7XG5cdH07XG5cdFxuXHQvKipcblx0ICogRmV0Y2ggZGVmaW5lZCBwcmVmaXhlcyBmcm9tIHF1ZXJ5IHN0cmluZ1xuXHQgKiBcblx0ICogQG1ldGhvZCBkb2MuZ2V0UHJlZml4ZXNGcm9tUXVlcnlcblx0ICogQHJldHVybiBvYmplY3Rcblx0ICovXG5cdGNtLmdldFByZWZpeGVzRnJvbVF1ZXJ5ID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGdldFByZWZpeGVzRnJvbVF1ZXJ5KGNtKTtcblx0fTtcblx0XG5cdC8qKlxuXHQgKiBGZXRjaCB0aGUgcXVlcnkgdHlwZSAoaS5lLiwgU0VMRUNUfHxERVNDUklCRXx8SU5TRVJUfHxERUxFVEV8fEFTS3x8Q09OU1RSVUNUKVxuXHQgKiBcblx0ICogQG1ldGhvZCBkb2MuZ2V0UXVlcnlUeXBlXG5cdCAqIEByZXR1cm4gc3RyaW5nXG5cdCAqIFxuXHQgKi9cblx0IGNtLmdldFF1ZXJ5VHlwZSA9IGZ1bmN0aW9uKCkge1xuXHRcdCByZXR1cm4gY20ucXVlcnlUeXBlO1xuXHQgfTtcblx0LyoqXG5cdCAqIEZldGNoIHRoZSBxdWVyeSBtb2RlOiAncXVlcnknIG9yICd1cGRhdGUnXG5cdCAqIFxuXHQgKiBAbWV0aG9kIGRvYy5nZXRRdWVyeU1vZGVcblx0ICogQHJldHVybiBzdHJpbmdcblx0ICogXG5cdCAqL1xuXHQgY20uZ2V0UXVlcnlNb2RlID0gZnVuY3Rpb24oKSB7XG5cdFx0IHZhciB0eXBlID0gY20uZ2V0UXVlcnlUeXBlKCk7XG5cdFx0IGlmICh0eXBlPT1cIklOU0VSVFwiIHx8IHR5cGU9PVwiREVMRVRFXCIgfHwgdHlwZT09XCJMT0FEXCIgfHwgdHlwZT09XCJDTEVBUlwiIHx8IHR5cGU9PVwiQ1JFQVRFXCIgfHwgdHlwZT09XCJEUk9QXCIgfHwgdHlwZT09XCJDT1BZXCIgfHwgdHlwZT09XCJNT1ZFXCIgfHwgdHlwZT09XCJBRERcIikge1xuXHRcdFx0IHJldHVybiBcInVwZGF0ZVwiO1xuXHRcdCB9IGVsc2Uge1xuXHRcdFx0IHJldHVybiBcInF1ZXJ5XCI7XG5cdFx0IH1cblx0XHRcdFx0XG5cdCB9O1xuXHQvKipcblx0ICogU3RvcmUgYnVsayBjb21wbGV0aW9ucyBpbiBtZW1vcnkgYXMgdHJpZSwgYW5kIHN0b3JlIHRoZXNlIGluIGxvY2Fsc3RvcmFnZSBhcyB3ZWxsIChpZiBlbmFibGVkKVxuXHQgKiBcblx0ICogQG1ldGhvZCBkb2Muc3RvcmVCdWxrQ29tcGxldGlvbnNcblx0ICogQHBhcmFtIHR5cGUge1wicHJlZml4ZXNcIiwgXCJwcm9wZXJ0aWVzXCIsIFwiY2xhc3Nlc1wifVxuXHQgKiBAcGFyYW0gY29tcGxldGlvbnMge2FycmF5fVxuXHQgKi9cblx0Y20uc3RvcmVCdWxrQ29tcGxldGlvbnMgPSBmdW5jdGlvbih0eXBlLCBjb21wbGV0aW9ucykge1xuXHRcdC8vIHN0b3JlIGFycmF5IGFzIHRyaWVcblx0XHR0cmllc1t0eXBlXSA9IG5ldyBUcmllKCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb21wbGV0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dHJpZXNbdHlwZV0uaW5zZXJ0KGNvbXBsZXRpb25zW2ldKTtcblx0XHR9XG5cdFx0Ly8gc3RvcmUgaW4gbG9jYWxzdG9yYWdlIGFzIHdlbGxcblx0XHR2YXIgc3RvcmFnZUlkID0gZ2V0UGVyc2lzdGVuY3lJZChjbSwgY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0ucGVyc2lzdGVudCk7XG5cdFx0aWYgKHN0b3JhZ2VJZCkgcmVxdWlyZShcInlhc2d1aS11dGlsc1wiKS5zdG9yYWdlLnNldChzdG9yYWdlSWQsIGNvbXBsZXRpb25zLCBcIm1vbnRoXCIpO1xuXHR9O1xuXHRjbS5zZXRDaGVja1N5bnRheEVycm9ycyA9IGZ1bmN0aW9uKGlzRW5hYmxlZCkge1xuXHRcdGNtLm9wdGlvbnMuc3ludGF4RXJyb3JDaGVjayA9IGlzRW5hYmxlZDtcblx0XHRjaGVja1N5bnRheChjbSk7XG5cdH07XG5cdHJldHVybiBjbTtcbn07XG5cbnZhciBwb3N0UHJvY2Vzc0NtRWxlbWVudCA9IGZ1bmN0aW9uKGNtKSB7XG5cdFxuXHQvKipcblx0ICogU2V0IGRvYyB2YWx1ZVxuXHQgKi9cblx0dmFyIHN0b3JhZ2VJZCA9IGdldFBlcnNpc3RlbmN5SWQoY20sIGNtLm9wdGlvbnMucGVyc2lzdGVudCk7XG5cdGlmIChzdG9yYWdlSWQpIHtcblx0XHR2YXIgdmFsdWVGcm9tU3RvcmFnZSA9IHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuc3RvcmFnZS5nZXQoc3RvcmFnZUlkKTtcblx0XHRpZiAodmFsdWVGcm9tU3RvcmFnZSlcblx0XHRcdGNtLnNldFZhbHVlKHZhbHVlRnJvbVN0b3JhZ2UpO1xuXHR9XG5cdFxuXHRyb290LmRyYXdCdXR0b25zKGNtKTtcblxuXHQvKipcblx0ICogQWRkIGV2ZW50IGhhbmRsZXJzXG5cdCAqL1xuXHRjbS5vbignYmx1cicsIGZ1bmN0aW9uKGNtLCBldmVudEluZm8pIHtcblx0XHRyb290LnN0b3JlUXVlcnkoY20pO1xuXHR9KTtcblx0Y20ub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGNtLCBldmVudEluZm8pIHtcblx0XHRjaGVja1N5bnRheChjbSk7XG5cdFx0cm9vdC5hcHBlbmRQcmVmaXhJZk5lZWRlZChjbSk7XG5cdFx0cm9vdC51cGRhdGVRdWVyeUJ1dHRvbihjbSk7XG5cdFx0cm9vdC5wb3NpdGlvbkFic29sdXRlSXRlbXMoY20pO1xuXHR9KTtcblx0XG5cdGNtLm9uKCdjdXJzb3JBY3Rpdml0eScsIGZ1bmN0aW9uKGNtLCBldmVudEluZm8pIHtcblx0XHRyb290LmF1dG9Db21wbGV0ZShjbSwgdHJ1ZSk7XG5cdFx0dXBkYXRlQnV0dG9uc1RyYW5zcGFyZW5jeShjbSk7XG5cdH0pO1xuXHRjbS5wcmV2UXVlcnlWYWxpZCA9IGZhbHNlO1xuXHRjaGVja1N5bnRheChjbSk7Ly8gb24gZmlyc3QgbG9hZCwgY2hlY2sgYXMgd2VsbCAob3VyIHN0b3JlZCBvciBkZWZhdWx0IHF1ZXJ5IG1pZ2h0IGJlIGluY29ycmVjdCBhcyB3ZWxsKVxuXHRyb290LnBvc2l0aW9uQWJzb2x1dGVJdGVtcyhjbSk7XG5cdC8qKlxuXHQgKiBsb2FkIGJ1bGsgY29tcGxldGlvbnNcblx0ICovXG5cdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9ucykge1xuXHRcdGZvciAoIHZhciBjb21wbGV0aW9uVHlwZSBpbiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9ucykge1xuXHRcdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW2NvbXBsZXRpb25UeXBlXS5idWxrKSB7XG5cdFx0XHRcdGxvYWRCdWxrQ29tcGxldGlvbnMoY20sIGNvbXBsZXRpb25UeXBlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBjaGVjayB1cmwgYXJncyBhbmQgbW9kaWZ5IHlhc3FlIHNldHRpbmdzIGlmIG5lZWRlZFxuXHQgKi9cblx0aWYgKGNtLm9wdGlvbnMuY29uc3VtZVNoYXJlTGluaykge1xuXHRcdHZhciB1cmxQYXJhbXMgPSAkLmRlcGFyYW0od2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSkpO1xuXHRcdGNtLm9wdGlvbnMuY29uc3VtZVNoYXJlTGluayhjbSwgdXJsUGFyYW1zKTtcblx0fVxufTtcblxuLyoqXG4gKiBwcml2YXRlc1xuICovXG4vLyB1c2VkIHRvIHN0b3JlIGJ1bGsgYXV0b2NvbXBsZXRpb25zIGluXG52YXIgdHJpZXMgPSB7fTtcbi8vIHRoaXMgaXMgYSBtYXBwaW5nIGZyb20gdGhlIGNsYXNzIG5hbWVzIChnZW5lcmljIG9uZXMsIGZvciBjb21wYXRhYmlsaXR5IHdpdGggY29kZW1pcnJvciB0aGVtZXMpLCB0byB3aGF0IHRoZXkgLWFjdHVhbGx5LSByZXByZXNlbnRcbnZhciB0b2tlblR5cGVzID0ge1xuXHRcInN0cmluZy0yXCIgOiBcInByZWZpeGVkXCIsXG5cdFwiYXRvbVwiOiBcInZhclwiXG59O1xudmFyIGtleUV4aXN0cyA9IGZ1bmN0aW9uKG9iamVjdFRvVGVzdCwga2V5KSB7XG5cdHZhciBleGlzdHMgPSBmYWxzZTtcblxuXHR0cnkge1xuXHRcdGlmIChvYmplY3RUb1Rlc3Rba2V5XSAhPT0gdW5kZWZpbmVkKVxuXHRcdFx0ZXhpc3RzID0gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHR9XG5cdHJldHVybiBleGlzdHM7XG59O1xuXG5cbnZhciBsb2FkQnVsa0NvbXBsZXRpb25zID0gZnVuY3Rpb24oY20sIHR5cGUpIHtcblx0dmFyIGNvbXBsZXRpb25zID0gbnVsbDtcblx0aWYgKGtleUV4aXN0cyhjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXSwgXCJnZXRcIikpXG5cdFx0Y29tcGxldGlvbnMgPSBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXQ7XG5cdGlmIChjb21wbGV0aW9ucyBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0Ly8gd2UgZG9uJ3QgY2FyZSB3aGV0aGVyIHRoZSBjb21wbGV0aW9ucyBhcmUgYWxyZWFkeSBzdG9yZWQgaW5cblx0XHQvLyBsb2NhbHN0b3JhZ2UuIGp1c3QgdXNlIHRoaXMgb25lXG5cdFx0Y20uc3RvcmVCdWxrQ29tcGxldGlvbnModHlwZSwgY29tcGxldGlvbnMpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGlmIGNvbXBsZXRpb25zIGFyZSBkZWZpbmVkIGluIGxvY2Fsc3RvcmFnZSwgdXNlIHRob3NlISAoY2FsbGluZyB0aGVcblx0XHQvLyBmdW5jdGlvbiBtYXkgY29tZSB3aXRoIG92ZXJoZWFkIChlLmcuIGFzeW5jIGNhbGxzKSlcblx0XHR2YXIgY29tcGxldGlvbnNGcm9tU3RvcmFnZSA9IG51bGw7XG5cdFx0aWYgKGdldFBlcnNpc3RlbmN5SWQoY20sIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLnBlcnNpc3RlbnQpKVxuXHRcdFx0Y29tcGxldGlvbnNGcm9tU3RvcmFnZSA9IHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuc3RvcmFnZS5nZXQoXG5cdFx0XHRcdFx0Z2V0UGVyc2lzdGVuY3lJZChjbSxcblx0XHRcdFx0XHRcdFx0Y20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0ucGVyc2lzdGVudCkpO1xuXHRcdGlmIChjb21wbGV0aW9uc0Zyb21TdG9yYWdlICYmIGNvbXBsZXRpb25zRnJvbVN0b3JhZ2UgaW5zdGFuY2VvZiBBcnJheVxuXHRcdFx0XHQmJiBjb21wbGV0aW9uc0Zyb21TdG9yYWdlLmxlbmd0aCA+IDApIHtcblx0XHRcdGNtLnN0b3JlQnVsa0NvbXBsZXRpb25zKHR5cGUsIGNvbXBsZXRpb25zRnJvbVN0b3JhZ2UpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBub3RoaW5nIGluIHN0b3JhZ2UuIGNoZWNrIHdoZXRoZXIgd2UgaGF2ZSBhIGZ1bmN0aW9uIHZpYSB3aGljaCB3ZVxuXHRcdFx0Ly8gY2FuIGdldCBvdXIgcHJlZml4ZXNcblx0XHRcdGlmIChjb21wbGV0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG5cdFx0XHRcdHZhciBmdW5jdGlvblJlc3VsdCA9IGNvbXBsZXRpb25zKGNtKTtcblx0XHRcdFx0aWYgKGZ1bmN0aW9uUmVzdWx0ICYmIGZ1bmN0aW9uUmVzdWx0IGluc3RhbmNlb2YgQXJyYXlcblx0XHRcdFx0XHRcdCYmIGZ1bmN0aW9uUmVzdWx0Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHQvLyBmdW5jdGlvbiByZXR1cm5lZCBhbiBhcnJheSAoaWYgdGhpcyBhbiBhc3luYyBmdW5jdGlvbiwgd2Vcblx0XHRcdFx0XHQvLyB3b24ndCBnZXQgYSBkaXJlY3QgZnVuY3Rpb24gcmVzdWx0KVxuXHRcdFx0XHRcdGNtLnN0b3JlQnVsa0NvbXBsZXRpb25zKHR5cGUsIGZ1bmN0aW9uUmVzdWx0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBHZXQgZGVmaW5lZCBwcmVmaXhlcyBmcm9tIHF1ZXJ5IGFzIGFycmF5LCBpbiBmb3JtYXQge1wicHJlZml4OlwiIFwidXJpXCJ9XG4gKiBcbiAqIEBwYXJhbSBjbVxuICogQHJldHVybnMge0FycmF5fVxuICovXG52YXIgZ2V0UHJlZml4ZXNGcm9tUXVlcnkgPSBmdW5jdGlvbihjbSkge1xuXHR2YXIgcXVlcnlQcmVmaXhlcyA9IHt9O1xuXHR2YXIgbnVtTGluZXMgPSBjbS5saW5lQ291bnQoKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1MaW5lczsgaSsrKSB7XG5cdFx0dmFyIGZpcnN0VG9rZW4gPSBnZXROZXh0Tm9uV3NUb2tlbihjbSwgaSk7XG5cdFx0aWYgKGZpcnN0VG9rZW4gIT0gbnVsbCAmJiBmaXJzdFRva2VuLnN0cmluZy50b1VwcGVyQ2FzZSgpID09IFwiUFJFRklYXCIpIHtcblx0XHRcdHZhciBwcmVmaXggPSBnZXROZXh0Tm9uV3NUb2tlbihjbSwgaSwgZmlyc3RUb2tlbi5lbmQgKyAxKTtcblx0XHRcdGlmIChwcmVmaXgpIHtcblx0XHRcdFx0dmFyIHVyaSA9IGdldE5leHROb25Xc1Rva2VuKGNtLCBpLCBwcmVmaXguZW5kICsgMSk7XG5cdFx0XHRcdGlmIChwcmVmaXggIT0gbnVsbCAmJiBwcmVmaXguc3RyaW5nLmxlbmd0aCA+IDAgJiYgdXJpICE9IG51bGxcblx0XHRcdFx0XHRcdCYmIHVyaS5zdHJpbmcubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdHZhciB1cmlTdHJpbmcgPSB1cmkuc3RyaW5nO1xuXHRcdFx0XHRcdGlmICh1cmlTdHJpbmcuaW5kZXhPZihcIjxcIikgPT0gMClcblx0XHRcdFx0XHRcdHVyaVN0cmluZyA9IHVyaVN0cmluZy5zdWJzdHJpbmcoMSk7XG5cdFx0XHRcdFx0aWYgKHVyaVN0cmluZy5zbGljZSgtMSkgPT0gXCI+XCIpXG5cdFx0XHRcdFx0XHR1cmlTdHJpbmcgPSB1cmlTdHJpbmdcblx0XHRcdFx0XHRcdFx0XHQuc3Vic3RyaW5nKDAsIHVyaVN0cmluZy5sZW5ndGggLSAxKTtcblx0XHRcdFx0XHRxdWVyeVByZWZpeGVzW3ByZWZpeC5zdHJpbmddID0gdXJpU3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBxdWVyeVByZWZpeGVzO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgcHJlZml4IGRlY2xhcmF0aW9uIHRvIGxpc3Qgb2YgcHJlZml4ZXMgaW4gcXVlcnkgd2luZG93LlxuICogXG4gKiBAcGFyYW0gY21cbiAqIEBwYXJhbSBwcmVmaXhcbiAqL1xudmFyIGFwcGVuZFRvUHJlZml4ZXMgPSBmdW5jdGlvbihjbSwgcHJlZml4KSB7XG5cdHZhciBsYXN0UHJlZml4ID0gbnVsbDtcblx0dmFyIGxhc3RQcmVmaXhMaW5lID0gMDtcblx0dmFyIG51bUxpbmVzID0gY20ubGluZUNvdW50KCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbnVtTGluZXM7IGkrKykge1xuXHRcdHZhciBmaXJzdFRva2VuID0gZ2V0TmV4dE5vbldzVG9rZW4oY20sIGkpO1xuXHRcdGlmIChmaXJzdFRva2VuICE9IG51bGxcblx0XHRcdFx0JiYgKGZpcnN0VG9rZW4uc3RyaW5nID09IFwiUFJFRklYXCIgfHwgZmlyc3RUb2tlbi5zdHJpbmcgPT0gXCJCQVNFXCIpKSB7XG5cdFx0XHRsYXN0UHJlZml4ID0gZmlyc3RUb2tlbjtcblx0XHRcdGxhc3RQcmVmaXhMaW5lID0gaTtcblx0XHR9XG5cdH1cblxuXHRpZiAobGFzdFByZWZpeCA9PSBudWxsKSB7XG5cdFx0Y20ucmVwbGFjZVJhbmdlKFwiUFJFRklYIFwiICsgcHJlZml4ICsgXCJcXG5cIiwge1xuXHRcdFx0bGluZSA6IDAsXG5cdFx0XHRjaCA6IDBcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHR2YXIgcHJldmlvdXNJbmRlbnQgPSBnZXRJbmRlbnRGcm9tTGluZShjbSwgbGFzdFByZWZpeExpbmUpO1xuXHRcdGNtLnJlcGxhY2VSYW5nZShcIlxcblwiICsgcHJldmlvdXNJbmRlbnQgKyBcIlBSRUZJWCBcIiArIHByZWZpeCwge1xuXHRcdFx0bGluZSA6IGxhc3RQcmVmaXhMaW5lXG5cdFx0fSk7XG5cdH1cbn07XG4vKipcbiAqIFVwZGF0ZSB0cmFuc3BhcmVuY3kgb2YgYnV0dG9ucy4gSW5jcmVhc2UgdHJhbnNwYXJlbmN5IHdoZW4gY3Vyc29yIGlzIGJlbG93IGJ1dHRvbnNcbiAqL1xuXG52YXIgdXBkYXRlQnV0dG9uc1RyYW5zcGFyZW5jeSA9IGZ1bmN0aW9uKGNtKSB7XG5cdGNtLmN1cnNvciA9ICQoXCIuQ29kZU1pcnJvci1jdXJzb3JcIik7XG5cdGlmIChjbS5idXR0b25zICYmIGNtLmJ1dHRvbnMuaXMoXCI6dmlzaWJsZVwiKSAmJiBjbS5jdXJzb3IubGVuZ3RoID4gMCkge1xuXHRcdGlmIChlbGVtZW50c092ZXJsYXAoY20uY3Vyc29yLCBjbS5idXR0b25zKSkge1xuXHRcdFx0Y20uYnV0dG9ucy5maW5kKFwic3ZnXCIpLmF0dHIoXCJvcGFjaXR5XCIsIFwiMC4yXCIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjbS5idXR0b25zLmZpbmQoXCJzdmdcIikuYXR0cihcIm9wYWNpdHlcIiwgXCIxLjBcIik7XG5cdFx0fVxuXHR9XG59O1xuXG5cbnZhciBlbGVtZW50c092ZXJsYXAgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIGdldFBvc2l0aW9ucyggZWxlbSApIHtcbiAgICAgICAgdmFyIHBvcywgd2lkdGgsIGhlaWdodDtcbiAgICAgICAgcG9zID0gJCggZWxlbSApLm9mZnNldCgpO1xuICAgICAgICB3aWR0aCA9ICQoIGVsZW0gKS53aWR0aCgpO1xuICAgICAgICBoZWlnaHQgPSAkKCBlbGVtICkuaGVpZ2h0KCk7XG4gICAgICAgIHJldHVybiBbIFsgcG9zLmxlZnQsIHBvcy5sZWZ0ICsgd2lkdGggXSwgWyBwb3MudG9wLCBwb3MudG9wICsgaGVpZ2h0IF0gXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21wYXJlUG9zaXRpb25zKCBwMSwgcDIgKSB7XG4gICAgICAgIHZhciByMSwgcjI7XG4gICAgICAgIHIxID0gcDFbMF0gPCBwMlswXSA/IHAxIDogcDI7XG4gICAgICAgIHIyID0gcDFbMF0gPCBwMlswXSA/IHAyIDogcDE7XG4gICAgICAgIHJldHVybiByMVsxXSA+IHIyWzBdIHx8IHIxWzBdID09PSByMlswXTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCBhLCBiICkge1xuICAgICAgICB2YXIgcG9zMSA9IGdldFBvc2l0aW9ucyggYSApLFxuICAgICAgICAgICAgcG9zMiA9IGdldFBvc2l0aW9ucyggYiApO1xuICAgICAgICByZXR1cm4gY29tcGFyZVBvc2l0aW9ucyggcG9zMVswXSwgcG9zMlswXSApICYmIGNvbXBhcmVQb3NpdGlvbnMoIHBvczFbMV0sIHBvczJbMV0gKTtcbiAgICB9O1xufSkoKTtcblxuXG4vKipcbiAqIEdldCB0aGUgdXNlZCBpbmRlbnRhdGlvbiBmb3IgYSBjZXJ0YWluIGxpbmVcbiAqIFxuICogQHBhcmFtIGNtXG4gKiBAcGFyYW0gbGluZVxuICogQHBhcmFtIGNoYXJOdW1iZXJcbiAqIEByZXR1cm5zXG4gKi9cbnZhciBnZXRJbmRlbnRGcm9tTGluZSA9IGZ1bmN0aW9uKGNtLCBsaW5lLCBjaGFyTnVtYmVyKSB7XG5cdGlmIChjaGFyTnVtYmVyID09IHVuZGVmaW5lZClcblx0XHRjaGFyTnVtYmVyID0gMTtcblx0dmFyIHRva2VuID0gY20uZ2V0VG9rZW5BdCh7XG5cdFx0bGluZSA6IGxpbmUsXG5cdFx0Y2ggOiBjaGFyTnVtYmVyXG5cdH0pO1xuXHRpZiAodG9rZW4gPT0gbnVsbCB8fCB0b2tlbiA9PSB1bmRlZmluZWQgfHwgdG9rZW4udHlwZSAhPSBcIndzXCIpIHtcblx0XHRyZXR1cm4gXCJcIjtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdG9rZW4uc3RyaW5nICsgZ2V0SW5kZW50RnJvbUxpbmUoY20sIGxpbmUsIHRva2VuLmVuZCArIDEpO1xuXHR9XG5cdDtcbn07XG5cblxudmFyIGdldE5leHROb25Xc1Rva2VuID0gZnVuY3Rpb24oY20sIGxpbmVOdW1iZXIsIGNoYXJOdW1iZXIpIHtcblx0aWYgKGNoYXJOdW1iZXIgPT0gdW5kZWZpbmVkKVxuXHRcdGNoYXJOdW1iZXIgPSAxO1xuXHR2YXIgdG9rZW4gPSBjbS5nZXRUb2tlbkF0KHtcblx0XHRsaW5lIDogbGluZU51bWJlcixcblx0XHRjaCA6IGNoYXJOdW1iZXJcblx0fSk7XG5cdGlmICh0b2tlbiA9PSBudWxsIHx8IHRva2VuID09IHVuZGVmaW5lZCB8fCB0b2tlbi5lbmQgPCBjaGFyTnVtYmVyKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0aWYgKHRva2VuLnR5cGUgPT0gXCJ3c1wiKSB7XG5cdFx0cmV0dXJuIGdldE5leHROb25Xc1Rva2VuKGNtLCBsaW5lTnVtYmVyLCB0b2tlbi5lbmQgKyAxKTtcblx0fVxuXHRyZXR1cm4gdG9rZW47XG59O1xuXG52YXIgY2xlYXJFcnJvciA9IG51bGw7XG52YXIgY2hlY2tTeW50YXggPSBmdW5jdGlvbihjbSwgZGVlcGNoZWNrKSB7XG5cdFxuXHRjbS5xdWVyeVZhbGlkID0gdHJ1ZTtcblx0aWYgKGNsZWFyRXJyb3IpIHtcblx0XHRjbGVhckVycm9yKCk7XG5cdFx0Y2xlYXJFcnJvciA9IG51bGw7XG5cdH1cblx0Y20uY2xlYXJHdXR0ZXIoXCJndXR0ZXJFcnJvckJhclwiKTtcblx0XG5cdHZhciBzdGF0ZSA9IG51bGw7XG5cdGZvciAodmFyIGwgPSAwOyBsIDwgY20ubGluZUNvdW50KCk7ICsrbCkge1xuXHRcdHZhciBwcmVjaXNlID0gZmFsc2U7XG5cdFx0aWYgKCFjbS5wcmV2UXVlcnlWYWxpZCkge1xuXHRcdFx0Ly8gd2UgZG9uJ3Qgd2FudCBjYWNoZWQgaW5mb3JtYXRpb24gaW4gdGhpcyBjYXNlLCBvdGhlcndpc2UgdGhlXG5cdFx0XHQvLyBwcmV2aW91cyBlcnJvciBzaWduIG1pZ2h0IHN0aWxsIHNob3cgdXAsXG5cdFx0XHQvLyBldmVuIHRob3VnaCB0aGUgc3ludGF4IGVycm9yIG1pZ2h0IGJlIGdvbmUgYWxyZWFkeVxuXHRcdFx0cHJlY2lzZSA9IHRydWU7XG5cdFx0fVxuXHRcdHZhciB0b2tlbiA9IGNtLmdldFRva2VuQXQoe1xuXHRcdFx0bGluZSA6IGwsXG5cdFx0XHRjaCA6IGNtLmdldExpbmUobCkubGVuZ3RoXG5cdFx0fSwgcHJlY2lzZSk7XG5cdFx0dmFyIHN0YXRlID0gdG9rZW4uc3RhdGU7XG5cdFx0Y20ucXVlcnlUeXBlID0gc3RhdGUucXVlcnlUeXBlO1xuXHRcdGlmIChzdGF0ZS5PSyA9PSBmYWxzZSkge1xuXHRcdFx0aWYgKCFjbS5vcHRpb25zLnN5bnRheEVycm9yQ2hlY2spIHtcblx0XHRcdFx0Ly90aGUgbGlicmFyeSB3ZSB1c2UgYWxyZWFkeSBtYXJrcyBldmVyeXRoaW5nIGFzIGJlaW5nIGFuIGVycm9yLiBPdmVyd3JpdGUgdGhpcyBjbGFzcyBhdHRyaWJ1dGUuXG5cdFx0XHRcdCQoY20uZ2V0V3JhcHBlckVsZW1lbnQpLmZpbmQoXCIuc3AtZXJyb3JcIikuY3NzKFwiY29sb3JcIiwgXCJibGFja1wiKTtcblx0XHRcdFx0Ly93ZSBkb24ndCB3YW50IHRvIGd1dHRlciBlcnJvciwgc28gcmV0dXJuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBlcnJvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdGVycm9yLmlubmVySFRNTCA9IFwiJnJhcnI7XCI7XG5cdFx0XHRlcnJvci5jbGFzc05hbWUgPSBcImd1dHRlckVycm9yXCI7XG5cdFx0XHRjbS5zZXRHdXR0ZXJNYXJrZXIobCwgXCJndXR0ZXJFcnJvckJhclwiLCBlcnJvcik7XG5cdFx0XHRjbGVhckVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNtLm1hcmtUZXh0KHtcblx0XHRcdFx0XHRsaW5lIDogbCxcblx0XHRcdFx0XHRjaCA6IHN0YXRlLmVycm9yU3RhcnRQb3Ncblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGxpbmUgOiBsLFxuXHRcdFx0XHRcdGNoIDogc3RhdGUuZXJyb3JFbmRQb3Ncblx0XHRcdFx0fSwgXCJzcC1lcnJvclwiKTtcblx0XHRcdH07XG5cdFx0XHRjbS5xdWVyeVZhbGlkID0gZmFsc2U7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdH1cblx0Y20ucHJldlF1ZXJ5VmFsaWQgPSBjbS5xdWVyeVZhbGlkO1xuXHRpZiAoZGVlcGNoZWNrKSB7XG5cdFx0aWYgKHN0YXRlICE9IG51bGwgJiYgc3RhdGUuc3RhY2sgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR2YXIgc3RhY2sgPSBzdGF0ZS5zdGFjaywgbGVuID0gc3RhdGUuc3RhY2subGVuZ3RoO1xuXHRcdFx0Ly8gQmVjYXVzZSBpbmNyZW1lbnRhbCBwYXJzZXIgZG9lc24ndCByZWNlaXZlIGVuZC1vZi1pbnB1dFxuXHRcdFx0Ly8gaXQgY2FuJ3QgY2xlYXIgc3RhY2ssIHNvIHdlIGhhdmUgdG8gY2hlY2sgdGhhdCB3aGF0ZXZlclxuXHRcdFx0Ly8gaXMgbGVmdCBvbiB0aGUgc3RhY2sgaXMgbmlsbGFibGVcblx0XHRcdGlmIChsZW4gPiAxKVxuXHRcdFx0XHRjbS5xdWVyeVZhbGlkID0gZmFsc2U7XG5cdFx0XHRlbHNlIGlmIChsZW4gPT0gMSkge1xuXHRcdFx0XHRpZiAoc3RhY2tbMF0gIT0gXCJzb2x1dGlvbk1vZGlmaWVyXCJcblx0XHRcdFx0XHRcdCYmIHN0YWNrWzBdICE9IFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXG5cdFx0XHRcdFx0XHQmJiBzdGFja1swXSAhPSBcIj9vZmZzZXRDbGF1c2VcIilcblx0XHRcdFx0XHRjbS5xdWVyeVZhbGlkID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuLyoqXG4gKiBTdGF0aWMgVXRpbHNcbiAqL1xuLy8gZmlyc3QgdGFrZSBhbGwgQ29kZU1pcnJvciByZWZlcmVuY2VzIGFuZCBzdG9yZSB0aGVtIGluIHRoZSBZQVNRRSBvYmplY3RcbiQuZXh0ZW5kKHJvb3QsIENvZGVNaXJyb3IpO1xuXG5yb290LnBvc2l0aW9uQWJzb2x1dGVJdGVtcyA9IGZ1bmN0aW9uKGNtKSB7XG5cdHZhciBzY3JvbGxCYXIgPSAkKGNtLmdldFdyYXBwZXJFbGVtZW50KCkpLmZpbmQoXCIuQ29kZU1pcnJvci12c2Nyb2xsYmFyXCIpO1xuXHR2YXIgb2Zmc2V0ID0gMDtcblx0aWYgKHNjcm9sbEJhci5pcyhcIjp2aXNpYmxlXCIpKSB7XG5cdFx0b2Zmc2V0ID0gc2Nyb2xsQmFyLm91dGVyV2lkdGgoKTtcblx0fVxuXHR2YXIgY29tcGxldGlvbk5vdGlmaWNhdGlvbiA9ICQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkuZmluZChcIi5jb21wbGV0aW9uTm90aWZpY2F0aW9uXCIpO1xuXHRpZiAoY29tcGxldGlvbk5vdGlmaWNhdGlvbi5pcyhcIjp2aXNpYmxlXCIpKSBjb21wbGV0aW9uTm90aWZpY2F0aW9uLmNzcyhcInJpZ2h0XCIsIG9mZnNldCk7XG5cdGlmIChjbS5idXR0b25zLmlzKFwiOnZpc2libGVcIikpIGNtLmJ1dHRvbnMuY3NzKFwicmlnaHRcIiwgb2Zmc2V0KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgc2hhcmUgbGlua1xuICogXG4gKiBAbWV0aG9kIFlBU1FFLmNyZWF0ZVNoYXJlTGlua1xuICogQHBhcmFtIHtkb2N9IFlBU1FFIGRvY3VtZW50XG4gKiBAZGVmYXVsdCB7cXVlcnk6IGRvYy5nZXRWYWx1ZSgpfVxuICogQHJldHVybiBvYmplY3RcbiAqL1xucm9vdC5jcmVhdGVTaGFyZUxpbmsgPSBmdW5jdGlvbihjbSkge1xuXHRyZXR1cm4ge3F1ZXJ5OiBjbS5nZXRWYWx1ZSgpfTtcbn07XG5cbi8qKlxuICogQ29uc3VtZSB0aGUgc2hhcmUgbGluaywgYnkgcGFyc2luZyB0aGUgZG9jdW1lbnQgVVJMIGZvciBwb3NzaWJsZSB5YXNxZSBhcmd1bWVudHMsIGFuZCBzZXR0aW5nIHRoZSBhcHByb3ByaWF0ZSB2YWx1ZXMgaW4gdGhlIFlBU1FFIGRvY1xuICogXG4gKiBAbWV0aG9kIFlBU1FFLmNvbnN1bWVTaGFyZUxpbmtcbiAqIEBwYXJhbSB7ZG9jfSBZQVNRRSBkb2N1bWVudFxuICovXG5yb290LmNvbnN1bWVTaGFyZUxpbmsgPSBmdW5jdGlvbihjbSwgdXJsUGFyYW1zKSB7XG5cdGlmICh1cmxQYXJhbXMucXVlcnkpIHtcblx0XHRjbS5zZXRWYWx1ZSh1cmxQYXJhbXMucXVlcnkpO1xuXHR9XG59O1xucm9vdC5kcmF3QnV0dG9ucyA9IGZ1bmN0aW9uKGNtKSB7XG5cdGNtLmJ1dHRvbnMgPSAkKFwiPGRpdiBjbGFzcz0neWFzcWVfYnV0dG9ucyc+PC9kaXY+XCIpLmFwcGVuZFRvKCQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkpO1xuXHRcblx0aWYgKGNtLm9wdGlvbnMuY3JlYXRlU2hhcmVMaW5rKSB7XG5cdFx0XG5cdFx0dmFyIHN2Z1NoYXJlID0gJChyZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLmltZ3MuZ2V0RWxlbWVudCh7aWQ6IFwic2hhcmVcIiwgd2lkdGg6IFwiMzBweFwiLCBoZWlnaHQ6IFwiMzBweFwifSkpO1xuXHRcdHN2Z1NoYXJlLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXtcblx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0dmFyIHBvcHVwID0gJChcIjxkaXYgY2xhc3M9J3lhc3FlX3NoYXJlUG9wdXAnPjwvZGl2PlwiKS5hcHBlbmRUbyhjbS5idXR0b25zKTtcblx0XHRcdCQoJ2h0bWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHBvcHVwKSBwb3B1cC5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRwb3B1cC5jbGljayhmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdH0pO1xuXHRcdFx0dmFyIHRleHRBcmVhTGluayA9ICQoXCI8dGV4dGFyZWE+PC90ZXh0YXJlYT5cIikudmFsKGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3QgKyBsb2NhdGlvbi5wYXRobmFtZSArIFwiP1wiICsgJC5wYXJhbShjbS5vcHRpb25zLmNyZWF0ZVNoYXJlTGluayhjbSkpKTtcblx0XHRcdFxuXHRcdFx0dGV4dEFyZWFMaW5rLmZvY3VzKGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG5cdFx0XHQgICAgJHRoaXMuc2VsZWN0KCk7XG5cblx0XHRcdCAgICAvLyBXb3JrIGFyb3VuZCBDaHJvbWUncyBsaXR0bGUgcHJvYmxlbVxuXHRcdFx0ICAgICR0aGlzLm1vdXNldXAoZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgICAgIC8vIFByZXZlbnQgZnVydGhlciBtb3VzZXVwIGludGVydmVudGlvblxuXHRcdFx0ICAgICAgICAkdGhpcy51bmJpbmQoXCJtb3VzZXVwXCIpO1xuXHRcdFx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdFx0XHQgICAgfSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cG9wdXAuZW1wdHkoKS5hcHBlbmQodGV4dEFyZWFMaW5rKTtcblx0XHRcdHZhciBwb3NpdGlvbnMgPSBzdmdTaGFyZS5wb3NpdGlvbigpO1xuXHRcdFx0cG9wdXAuY3NzKFwidG9wXCIsIChwb3NpdGlvbnMudG9wICsgc3ZnU2hhcmUub3V0ZXJIZWlnaHQoKSkgKyBcInB4XCIpLmNzcyhcImxlZnRcIiwgKChwb3NpdGlvbnMubGVmdCArIHN2Z1NoYXJlLm91dGVyV2lkdGgoKSkgLSBwb3B1cC5vdXRlcldpZHRoKCkpICsgXCJweFwiKTtcblx0XHR9KVxuXHRcdC5hZGRDbGFzcyhcInlhc3FlX3NoYXJlXCIpXG5cdFx0LmF0dHIoXCJ0aXRsZVwiLCBcIlNoYXJlIHlvdXIgcXVlcnlcIilcblx0XHQuYXBwZW5kVG8oY20uYnV0dG9ucyk7XG5cdFx0XG5cdH1cblxuXHRpZiAoY20ub3B0aW9ucy5zcGFycWwuc2hvd1F1ZXJ5QnV0dG9uKSB7XG5cdFx0dmFyIGhlaWdodCA9IDQwO1xuXHRcdHZhciB3aWR0aCA9IDQwO1xuXHRcdCQoXCI8ZGl2IGNsYXNzPSd5YXNxZV9xdWVyeUJ1dHRvbic+PC9kaXY+XCIpXG5cdFx0IFx0LmNsaWNrKGZ1bmN0aW9uKCl7XG5cdFx0IFx0XHRpZiAoJCh0aGlzKS5oYXNDbGFzcyhcInF1ZXJ5X2J1c3lcIikpIHtcblx0XHQgXHRcdFx0aWYgKGNtLnhocikgY20ueGhyLmFib3J0KCk7XG5cdFx0IFx0XHRcdHJvb3QudXBkYXRlUXVlcnlCdXR0b24oY20pO1xuXHRcdCBcdFx0fSBlbHNlIHtcblx0XHQgXHRcdFx0Y20ucXVlcnkoKTtcblx0XHQgXHRcdH1cblx0XHQgXHR9KVxuXHRcdCBcdC5oZWlnaHQoaGVpZ2h0KVxuXHRcdCBcdC53aWR0aCh3aWR0aClcblx0XHQgXHQuYXBwZW5kVG8oY20uYnV0dG9ucyk7XG5cdFx0cm9vdC51cGRhdGVRdWVyeUJ1dHRvbihjbSk7XG5cdH1cblx0XG59O1xuXG5cbnZhciBxdWVyeUJ1dHRvbklkcyA9IHtcblx0XCJidXN5XCI6IFwibG9hZGVyXCIsXG5cdFwidmFsaWRcIjogXCJxdWVyeVwiLFxuXHRcImVycm9yXCI6IFwicXVlcnlJbnZhbGlkXCJcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBxdWVyeSBidXR0b24gZGVwZW5kaW5nIG9uIGN1cnJlbnQgcXVlcnkgc3RhdHVzLiBJZiBubyBxdWVyeSBzdGF0dXMgaXMgcGFzc2VkIHZpYSB0aGUgcGFyYW1ldGVyLCBpdCBhdXRvLWRldGVjdHMgdGhlIGN1cnJlbnQgcXVlcnkgc3RhdHVzXG4gKiBcbiAqIEBwYXJhbSB7ZG9jfSBZQVNRRSBkb2N1bWVudFxuICogQHBhcmFtIHN0YXR1cyB7c3RyaW5nfG51bGwsIFwiYnVzeVwifFwidmFsaWRcInxcImVycm9yXCJ9XG4gKi9cbnJvb3QudXBkYXRlUXVlcnlCdXR0b24gPSBmdW5jdGlvbihjbSwgc3RhdHVzKSB7XG5cdHZhciBxdWVyeUJ1dHRvbiA9ICQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkuZmluZChcIi55YXNxZV9xdWVyeUJ1dHRvblwiKTtcblx0aWYgKHF1ZXJ5QnV0dG9uLmxlbmd0aCA9PSAwKSByZXR1cm47Ly9ubyBxdWVyeSBidXR0b24gZHJhd25cblx0XG5cdC8vZGV0ZWN0IHN0YXR1c1xuXHRpZiAoIXN0YXR1cykge1xuXHRcdHN0YXR1cyA9IFwidmFsaWRcIjtcblx0XHRpZiAoY20ucXVlcnlWYWxpZCA9PT0gZmFsc2UpIHN0YXR1cyA9IFwiZXJyb3JcIjtcblx0fVxuXHRpZiAoc3RhdHVzICE9IGNtLnF1ZXJ5U3RhdHVzICYmIChzdGF0dXMgPT0gXCJidXN5XCIgfHwgc3RhdHVzPT1cInZhbGlkXCIgfHwgc3RhdHVzID09IFwiZXJyb3JcIikpIHtcblx0XHRxdWVyeUJ1dHRvblxuXHRcdFx0LmVtcHR5KClcblx0XHRcdC5yZW1vdmVDbGFzcyAoZnVuY3Rpb24gKGluZGV4LCBjbGFzc05hbWVzKSB7XG5cdFx0XHRcdHJldHVybiBjbGFzc05hbWVzLnNwbGl0KFwiIFwiKS5maWx0ZXIoZnVuY3Rpb24oYykge1xuXHRcdFx0XHRcdC8vcmVtb3ZlIGNsYXNzbmFtZSBmcm9tIHByZXZpb3VzIHN0YXR1c1xuXHRcdFx0XHQgICAgcmV0dXJuIGMuaW5kZXhPZihcInF1ZXJ5X1wiKSA9PSAwO1xuXHRcdFx0XHR9KS5qb2luKFwiIFwiKTtcblx0XHRcdH0pXG5cdFx0XHQuYWRkQ2xhc3MoXCJxdWVyeV9cIiArIHN0YXR1cylcblx0XHRcdC5hcHBlbmQocmVxdWlyZShcInlhc2d1aS11dGlsc1wiKS5pbWdzLmdldEVsZW1lbnQoe2lkOiBxdWVyeUJ1dHRvbklkc1tzdGF0dXNdLCB3aWR0aDogXCIxMDAlXCIsIGhlaWdodDogXCIxMDAlXCJ9KSk7XG5cdFx0Y20ucXVlcnlTdGF0dXMgPSBzdGF0dXM7XG5cdH1cbn07XG4vKipcbiAqIEluaXRpYWxpemUgWUFTUUUgZnJvbSBhbiBleGlzdGluZyB0ZXh0IGFyZWEgKHNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2Zyb21UZXh0QXJlYSBmb3IgbW9yZSBpbmZvKVxuICogXG4gKiBAbWV0aG9kIFlBU1FFLmZyb21UZXh0QXJlYVxuICogQHBhcmFtIHRleHRBcmVhIHtET00gZWxlbWVudH1cbiAqIEBwYXJhbSBjb25maWcge29iamVjdH1cbiAqIEByZXR1cm5zIHtkb2N9IFlBU1FFIGRvY3VtZW50XG4gKi9cbnJvb3QuZnJvbVRleHRBcmVhID0gZnVuY3Rpb24odGV4dEFyZWFFbCwgY29uZmlnKSB7XG5cdGNvbmZpZyA9IGV4dGVuZENvbmZpZyhjb25maWcpO1xuXHR2YXIgY20gPSBleHRlbmRDbUluc3RhbmNlKENvZGVNaXJyb3IuZnJvbVRleHRBcmVhKHRleHRBcmVhRWwsIGNvbmZpZykpO1xuXHRwb3N0UHJvY2Vzc0NtRWxlbWVudChjbSk7XG5cdHJldHVybiBjbTtcbn07XG5cbi8qKlxuICogRmV0Y2ggYWxsIHRoZSB1c2VkIHZhcmlhYmxlcyBuYW1lcyBmcm9tIHRoaXMgcXVlcnlcbiAqIFxuICogQG1ldGhvZCBZQVNRRS5nZXRBbGxWYXJpYWJsZU5hbWVzXG4gKiBAcGFyYW0ge2RvY30gWUFTUUUgZG9jdW1lbnRcbiAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fVxuICogQHJldHVybnMgdmFyaWFibGVOYW1lcyB7YXJyYXl9XG4gKi9cblxucm9vdC5hdXRvY29tcGxldGVWYXJpYWJsZXMgPSBmdW5jdGlvbihjbSwgdG9rZW4pIHtcblx0aWYgKHRva2VuLnRyaW0oKS5sZW5ndGggPT0gMCkgcmV0dXJuIFtdOy8vbm90aGluZyB0byBhdXRvY29tcGxldGVcblx0dmFyIGRpc3RpbmN0VmFycyA9IHt9O1xuXHQvL2RvIHRoaXMgb3V0c2lkZSBvZiBjb2RlbWlycm9yLiBJIGV4cGVjdCBqcXVlcnkgdG8gYmUgZmFzdGVyIGhlcmUgKGp1c3QgZmluZGluZyBkb20gZWxlbWVudHMgd2l0aCBjbGFzc25hbWVzKVxuXHQkKGNtLmdldFdyYXBwZXJFbGVtZW50KCkpLmZpbmQoXCIuY20tYXRvbVwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdHZhciB2YXJpYWJsZSA9IHRoaXMuaW5uZXJIVE1MO1xuXHRcdGlmICh2YXJpYWJsZS5pbmRleE9mKFwiP1wiKSA9PSAwKSB7XG5cdFx0XHQvL29rLCBsZXRzIGNoZWNrIGlmIHRoZSBuZXh0IGVsZW1lbnQgaW4gdGhlIGRpdiBpcyBhbiBhdG9tIGFzIHdlbGwuIEluIHRoYXQgY2FzZSwgdGhleSBiZWxvbmcgdG9nZXRoZXIgKG1heSBoYXBwZW4gc29tZXRpbWVzIHdoZW4gcXVlcnkgaXMgbm90IHN5bnRhY3RpY2FsbHkgdmFsaWQpXG5cdFx0XHR2YXIgbmV4dEVsID0gJCh0aGlzKS5uZXh0KCk7XG5cdFx0XHR2YXIgbmV4dEVsQ2xhc3MgPSBuZXh0RWwuYXR0cignY2xhc3MnKTtcblx0XHRcdGlmIChuZXh0RWxDbGFzcyAmJiBuZXh0RWwuYXR0cignY2xhc3MnKS5pbmRleE9mKFwiY20tYXRvbVwiKSA+PSAwKSB7XG5cdFx0XHRcdHZhcmlhYmxlICs9IG5leHRFbC50ZXh0KCk7XHRcdFx0XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vc2tpcCBzaW5nbGUgcXVlc3Rpb25tYXJrc1xuXHRcdFx0aWYgKHZhcmlhYmxlLmxlbmd0aCA8PSAxKSByZXR1cm47XG5cdFx0XHRcblx0XHRcdC8vaXQgc2hvdWxkIG1hdGNoIG91ciB0b2tlbiBvZmNvdXJzZVxuXHRcdFx0aWYgKHZhcmlhYmxlLmluZGV4T2YodG9rZW4pICE9PSAwKSByZXR1cm47XG5cdFx0XHRcblx0XHRcdC8vc2tpcCBleGFjdCBtYXRjaGVzXG5cdFx0XHRpZiAodmFyaWFibGUgPT0gdG9rZW4pIHJldHVybjtcblx0XHRcdFxuXHRcdFx0Ly9zdG9yZSBpbiBtYXAgc28gd2UgaGF2ZSBhIHVuaXF1ZSBsaXN0IFxuXHRcdFx0ZGlzdGluY3RWYXJzW3ZhcmlhYmxlXSA9IHRydWU7XG5cdFx0XHRcblx0XHRcdFxuXHRcdH1cblx0fSk7XG5cdHZhciB2YXJpYWJsZXMgPSBbXTtcblx0Zm9yICh2YXIgdmFyaWFibGUgaW4gZGlzdGluY3RWYXJzKSB7XG5cdFx0dmFyaWFibGVzLnB1c2godmFyaWFibGUpO1xuXHR9XG5cdHZhcmlhYmxlcy5zb3J0KCk7XG5cdHJldHVybiB2YXJpYWJsZXM7XG59O1xuLyoqXG4gKiBGZXRjaCBwcmVmaXhlcyBmcm9tIHByZWZpeC5jYywgYW5kIHN0b3JlIGluIHRoZSBZQVNRRSBvYmplY3RcbiAqIFxuICogQHBhcmFtIGRvYyB7WUFTUUV9XG4gKiBAbWV0aG9kIFlBU1FFLmZldGNoRnJvbVByZWZpeENjXG4gKi9cbnJvb3QuZmV0Y2hGcm9tUHJlZml4Q2MgPSBmdW5jdGlvbihjbSkge1xuXHQkLmdldChcImh0dHA6Ly9wcmVmaXguY2MvcG9wdWxhci9hbGwuZmlsZS5qc29uXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHR2YXIgcHJlZml4QXJyYXkgPSBbXTtcblx0XHRmb3IgKCB2YXIgcHJlZml4IGluIGRhdGEpIHtcblx0XHRcdGlmIChwcmVmaXggPT0gXCJiaWZcIilcblx0XHRcdFx0Y29udGludWU7Ly8gc2tpcCB0aGlzIG9uZSEgc2VlICMyMzFcblx0XHRcdHZhciBjb21wbGV0ZVN0cmluZyA9IHByZWZpeCArIFwiOiA8XCIgKyBkYXRhW3ByZWZpeF0gKyBcIj5cIjtcblx0XHRcdHByZWZpeEFycmF5LnB1c2goY29tcGxldGVTdHJpbmcpOy8vIHRoZSBhcnJheSB3ZSB3YW50IHRvIHN0b3JlIGluIGxvY2Fsc3RvcmFnZVxuXHRcdH1cblx0XHRcblx0XHRwcmVmaXhBcnJheS5zb3J0KCk7XG5cdFx0Y20uc3RvcmVCdWxrQ29tcGxldGlvbnMoXCJwcmVmaXhlc1wiLCBwcmVmaXhBcnJheSk7XG5cdH0pO1xufTtcbi8qKlxuICogR2V0IGFjY2VwdCBoZWFkZXIgZm9yIHRoaXMgcGFydGljdWxhciBxdWVyeS4gR2V0IEpTT04gZm9yIHJlZ3VsYXIgcXVlcmllcywgYW5kIHRleHQvcGxhaW4gZm9yIHVwZGF0ZSBxdWVyaWVzXG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQG1ldGhvZCBZQVNRRS5nZXRBY2NlcHRIZWFkZXJcbiAqL1xucm9vdC5nZXRBY2NlcHRIZWFkZXIgPSBmdW5jdGlvbihjbSkge1xuXHRpZiAoY20uZ2V0UXVlcnlNb2RlKCkgPT0gXCJ1cGRhdGVcIikge1xuXHRcdHJldHVybiBcInRleHQvcGxhaW5cIjtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gXCJhcHBsaWNhdGlvbi9zcGFycWwtcmVzdWx0cytqc29uXCI7XG5cdH1cbn07XG4vKipcbiAqIERldGVybWluZSB1bmlxdWUgSUQgb2YgdGhlIFlBU1FFIG9iamVjdC4gVXNlZnVsIHdoZW4gc2V2ZXJhbCBvYmplY3RzIGFyZVxuICogbG9hZGVkIG9uIHRoZSBzYW1lIHBhZ2UsIGFuZCBhbGwgaGF2ZSAncGVyc2lzdGVuY3knIGVuYWJsZWQuIEN1cnJlbnRseSwgdGhlXG4gKiBJRCBpcyBkZXRlcm1pbmVkIGJ5IHNlbGVjdGluZyB0aGUgbmVhcmVzdCBwYXJlbnQgaW4gdGhlIERPTSB3aXRoIGFuIElEIHNldFxuICogXG4gKiBAcGFyYW0gZG9jIHtZQVNRRX1cbiAqIEBtZXRob2QgWUFTUUUuZGV0ZXJtaW5lSWRcbiAqL1xucm9vdC5kZXRlcm1pbmVJZCA9IGZ1bmN0aW9uKGNtKSB7XG5cdHJldHVybiAkKGNtLmdldFdyYXBwZXJFbGVtZW50KCkpLmNsb3Nlc3QoJ1tpZF0nKS5hdHRyKCdpZCcpO1xufTtcblxucm9vdC5zdG9yZVF1ZXJ5ID0gZnVuY3Rpb24oY20pIHtcblx0dmFyIHN0b3JhZ2VJZCA9IGdldFBlcnNpc3RlbmN5SWQoY20sIGNtLm9wdGlvbnMucGVyc2lzdGVudCk7XG5cdGlmIChzdG9yYWdlSWQpIHtcblx0XHRyZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLnN0b3JhZ2Uuc2V0KHN0b3JhZ2VJZCwgY20uZ2V0VmFsdWUoKSwgXCJtb250aFwiKTtcblx0fVxufTtcbnJvb3QuY29tbWVudExpbmVzID0gZnVuY3Rpb24oY20pIHtcblx0dmFyIHN0YXJ0TGluZSA9IGNtLmdldEN1cnNvcih0cnVlKS5saW5lO1xuXHR2YXIgZW5kTGluZSA9IGNtLmdldEN1cnNvcihmYWxzZSkubGluZTtcblx0dmFyIG1pbiA9IE1hdGgubWluKHN0YXJ0TGluZSwgZW5kTGluZSk7XG5cdHZhciBtYXggPSBNYXRoLm1heChzdGFydExpbmUsIGVuZExpbmUpO1xuXHRcblx0Ly8gaWYgYWxsIGxpbmVzIHN0YXJ0IHdpdGggIywgcmVtb3ZlIHRoaXMgY2hhci4gT3RoZXJ3aXNlIGFkZCB0aGlzIGNoYXJcblx0dmFyIGxpbmVzQXJlQ29tbWVudGVkID0gdHJ1ZTtcblx0Zm9yICh2YXIgaSA9IG1pbjsgaSA8PSBtYXg7IGkrKykge1xuXHRcdHZhciBsaW5lID0gY20uZ2V0TGluZShpKTtcblx0XHRpZiAobGluZS5sZW5ndGggPT0gMCB8fCBsaW5lLnN1YnN0cmluZygwLCAxKSAhPSBcIiNcIikge1xuXHRcdFx0bGluZXNBcmVDb21tZW50ZWQgPSBmYWxzZTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRmb3IgKHZhciBpID0gbWluOyBpIDw9IG1heDsgaSsrKSB7XG5cdFx0aWYgKGxpbmVzQXJlQ29tbWVudGVkKSB7XG5cdFx0XHQvLyBsaW5lcyBhcmUgY29tbWVudGVkLCBzbyByZW1vdmUgY29tbWVudHNcblx0XHRcdGNtLnJlcGxhY2VSYW5nZShcIlwiLCB7XG5cdFx0XHRcdGxpbmUgOiBpLFxuXHRcdFx0XHRjaCA6IDBcblx0XHRcdH0sIHtcblx0XHRcdFx0bGluZSA6IGksXG5cdFx0XHRcdGNoIDogMVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIE5vdCBhbGwgbGluZXMgYXJlIGNvbW1lbnRlZCwgc28gYWRkIGNvbW1lbnRzXG5cdFx0XHRjbS5yZXBsYWNlUmFuZ2UoXCIjXCIsIHtcblx0XHRcdFx0bGluZSA6IGksXG5cdFx0XHRcdGNoIDogMFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cbn07XG5cbnJvb3QuY29weUxpbmVVcCA9IGZ1bmN0aW9uKGNtKSB7XG5cdHZhciBjdXJzb3IgPSBjbS5nZXRDdXJzb3IoKTtcblx0dmFyIGxpbmVDb3VudCA9IGNtLmxpbmVDb3VudCgpO1xuXHQvLyBGaXJzdCBjcmVhdGUgbmV3IGVtcHR5IGxpbmUgYXQgZW5kIG9mIHRleHRcblx0Y20ucmVwbGFjZVJhbmdlKFwiXFxuXCIsIHtcblx0XHRsaW5lIDogbGluZUNvdW50IC0gMSxcblx0XHRjaCA6IGNtLmdldExpbmUobGluZUNvdW50IC0gMSkubGVuZ3RoXG5cdH0pO1xuXHQvLyBDb3B5IGFsbCBsaW5lcyB0byB0aGVpciBuZXh0IGxpbmVcblx0Zm9yICh2YXIgaSA9IGxpbmVDb3VudDsgaSA+IGN1cnNvci5saW5lOyBpLS0pIHtcblx0XHR2YXIgbGluZSA9IGNtLmdldExpbmUoaSAtIDEpO1xuXHRcdGNtLnJlcGxhY2VSYW5nZShsaW5lLCB7XG5cdFx0XHRsaW5lIDogaSxcblx0XHRcdGNoIDogMFxuXHRcdH0sIHtcblx0XHRcdGxpbmUgOiBpLFxuXHRcdFx0Y2ggOiBjbS5nZXRMaW5lKGkpLmxlbmd0aFxuXHRcdH0pO1xuXHR9XG59O1xucm9vdC5jb3B5TGluZURvd24gPSBmdW5jdGlvbihjbSkge1xuXHRyb290LmNvcHlMaW5lVXAoY20pO1xuXHQvLyBNYWtlIHN1cmUgY3Vyc29yIGdvZXMgb25lIGRvd24gKHdlIGFyZSBjb3B5aW5nIGRvd253YXJkcylcblx0dmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpO1xuXHRjdXJzb3IubGluZSsrO1xuXHRjbS5zZXRDdXJzb3IoY3Vyc29yKTtcbn07XG5yb290LmRvQXV0b0Zvcm1hdCA9IGZ1bmN0aW9uKGNtKSB7XG5cdGlmIChjbS5zb21ldGhpbmdTZWxlY3RlZCgpKSB7XG5cdFx0dmFyIHRvID0ge1xuXHRcdFx0bGluZSA6IGNtLmdldEN1cnNvcihmYWxzZSkubGluZSxcblx0XHRcdGNoIDogY20uZ2V0U2VsZWN0aW9uKCkubGVuZ3RoXG5cdFx0fTtcblx0XHRhdXRvRm9ybWF0UmFuZ2UoY20sIGNtLmdldEN1cnNvcih0cnVlKSwgdG8pO1xuXHR9IGVsc2Uge1xuXHRcdHZhciB0b3RhbExpbmVzID0gY20ubGluZUNvdW50KCk7XG5cdFx0dmFyIHRvdGFsQ2hhcnMgPSBjbS5nZXRUZXh0QXJlYSgpLnZhbHVlLmxlbmd0aDtcblx0XHRhdXRvRm9ybWF0UmFuZ2UoY20sIHtcblx0XHRcdGxpbmUgOiAwLFxuXHRcdFx0Y2ggOiAwXG5cdFx0fSwge1xuXHRcdFx0bGluZSA6IHRvdGFsTGluZXMsXG5cdFx0XHRjaCA6IHRvdGFsQ2hhcnNcblx0XHR9KTtcblx0fVxuXG59O1xuXG5yb290LmV4ZWN1dGVRdWVyeSA9IGZ1bmN0aW9uKGNtLCBjYWxsYmFja09yQ29uZmlnKSB7XG5cdHZhciBjYWxsYmFjayA9ICh0eXBlb2YgY2FsbGJhY2tPckNvbmZpZyA9PSBcImZ1bmN0aW9uXCIgPyBjYWxsYmFja09yQ29uZmlnOiBudWxsKTtcblx0dmFyIGNvbmZpZyA9ICh0eXBlb2YgY2FsbGJhY2tPckNvbmZpZyA9PSBcIm9iamVjdFwiID8gY2FsbGJhY2tPckNvbmZpZyA6IHt9KTtcblx0dmFyIHF1ZXJ5TW9kZSA9IGNtLmdldFF1ZXJ5TW9kZSgpO1xuXHRpZiAoY20ub3B0aW9ucy5zcGFycWwpXG5cdFx0Y29uZmlnID0gJC5leHRlbmQoe30sIGNtLm9wdGlvbnMuc3BhcnFsLCBjb25maWcpO1xuXG5cdGlmICghY29uZmlnLmVuZHBvaW50IHx8IGNvbmZpZy5lbmRwb2ludC5sZW5ndGggPT0gMClcblx0XHRyZXR1cm47Ly8gbm90aGluZyB0byBxdWVyeSFcblxuXHQvKipcblx0ICogaW5pdGlhbGl6ZSBhamF4IGNvbmZpZ1xuXHQgKi9cblx0dmFyIGFqYXhDb25maWcgPSB7XG5cdFx0dXJsIDogKHR5cGVvZiBjb25maWcuZW5kcG9pbnQgPT0gXCJmdW5jdGlvblwiPyBjb25maWcuZW5kcG9pbnQoY20pOiBjb25maWcuZW5kcG9pbnQpLFxuXHRcdHR5cGUgOiAodHlwZW9mIGNvbmZpZy5yZXF1ZXN0TWV0aG9kID09IFwiZnVuY3Rpb25cIj8gY29uZmlnLnJlcXVlc3RNZXRob2QoY20pOiBjb25maWcucmVxdWVzdE1ldGhvZCksXG5cdFx0ZGF0YSA6IFt7XG5cdFx0XHRuYW1lIDogcXVlcnlNb2RlLFxuXHRcdFx0dmFsdWUgOiBjbS5nZXRWYWx1ZSgpXG5cdFx0fV0sXG5cdFx0aGVhZGVycyA6IHtcblx0XHRcdEFjY2VwdCA6ICh0eXBlb2YgY29uZmlnLmFjY2VwdEhlYWRlciA9PSBcImZ1bmN0aW9uXCI/IGNvbmZpZy5hY2NlcHRIZWFkZXIoY20pOiBjb25maWcuYWNjZXB0SGVhZGVyKSxcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIGFkZCBjb21wbGV0ZSwgYmVmb3Jlc2VuZCwgZXRjIGhhbmRsZXJzIChpZiBzcGVjaWZpZWQpXG5cdCAqL1xuXHR2YXIgaGFuZGxlckRlZmluZWQgPSBmYWxzZTtcblx0aWYgKGNvbmZpZy5oYW5kbGVycykge1xuXHRcdGZvciAoIHZhciBoYW5kbGVyIGluIGNvbmZpZy5oYW5kbGVycykge1xuXHRcdFx0aWYgKGNvbmZpZy5oYW5kbGVyc1toYW5kbGVyXSkge1xuXHRcdFx0XHRoYW5kbGVyRGVmaW5lZCA9IHRydWU7XG5cdFx0XHRcdGFqYXhDb25maWdbaGFuZGxlcl0gPSBjb25maWcuaGFuZGxlcnNbaGFuZGxlcl07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGlmICghaGFuZGxlckRlZmluZWQgJiYgIWNhbGxiYWNrKVxuXHRcdHJldHVybjsgLy8gb2ssIHdlIGNhbiBxdWVyeSwgYnV0IGhhdmUgbm8gY2FsbGJhY2tzLiBqdXN0IHN0b3Agbm93XG5cdFxuXHQvLyBpZiBvbmx5IGNhbGxiYWNrIGlzIHBhc3NlZCBhcyBhcmcsIGFkZCB0aGF0IG9uIGFzICdvbkNvbXBsZXRlJyBjYWxsYmFja1xuXHRpZiAoY2FsbGJhY2spXG5cdFx0YWpheENvbmZpZy5jb21wbGV0ZSA9IGNhbGxiYWNrO1xuXG5cdC8qKlxuXHQgKiBhZGQgbmFtZWQgZ3JhcGhzIHRvIGFqYXggY29uZmlnXG5cdCAqL1xuXHRpZiAoY29uZmlnLm5hbWVkR3JhcGhzICYmIGNvbmZpZy5uYW1lZEdyYXBocy5sZW5ndGggPiAwKSB7XG5cdFx0dmFyIGFyZ05hbWUgPSAocXVlcnlNb2RlID09IFwicXVlcnlcIiA/IFwibmFtZWQtZ3JhcGgtdXJpXCI6IFwidXNpbmctbmFtZWQtZ3JhcGgtdXJpIFwiKTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZpZy5uYW1lZEdyYXBocy5sZW5ndGg7IGkrKylcblx0XHRcdGFqYXhDb25maWcuZGF0YS5wdXNoKHtcblx0XHRcdFx0bmFtZSA6IGFyZ05hbWUsXG5cdFx0XHRcdHZhbHVlIDogY29uZmlnLm5hbWVkR3JhcGhzW2ldXG5cdFx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogYWRkIGRlZmF1bHQgZ3JhcGhzIHRvIGFqYXggY29uZmlnXG5cdCAqL1xuXHRpZiAoY29uZmlnLmRlZmF1bHRHcmFwaHMgJiYgY29uZmlnLmRlZmF1bHRHcmFwaHMubGVuZ3RoID4gMCkge1xuXHRcdHZhciBhcmdOYW1lID0gKHF1ZXJ5TW9kZSA9PSBcInF1ZXJ5XCIgPyBcImRlZmF1bHQtZ3JhcGgtdXJpXCI6IFwidXNpbmctZ3JhcGgtdXJpIFwiKTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZpZy5kZWZhdWx0R3JhcGhzLmxlbmd0aDsgaSsrKVxuXHRcdFx0YWpheENvbmZpZy5kYXRhLnB1c2goe1xuXHRcdFx0XHRuYW1lIDogYXJnTmFtZSxcblx0XHRcdFx0dmFsdWUgOiBjb25maWcuZGVmYXVsdEdyYXBoc1tpXVxuXHRcdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogbWVyZ2UgYWRkaXRpb25hbCByZXF1ZXN0IGhlYWRlcnNcblx0ICovXG5cdGlmIChjb25maWcuaGVhZGVycyAmJiAhJC5pc0VtcHR5T2JqZWN0KGNvbmZpZy5oZWFkZXJzKSlcblx0XHQkLmV4dGVuZChhamF4Q29uZmlnLmhlYWRlcnMsIGNvbmZpZy5oZWFkZXJzKTtcblx0LyoqXG5cdCAqIGFkZCBhZGRpdGlvbmFsIHJlcXVlc3QgYXJnc1xuXHQgKi9cblx0aWYgKGNvbmZpZy5hcmdzICYmIGNvbmZpZy5hcmdzLmxlbmd0aCA+IDApICQubWVyZ2UoYWpheENvbmZpZy5kYXRhLCBjb25maWcuYXJncyk7XG5cdHJvb3QudXBkYXRlUXVlcnlCdXR0b24oY20sIFwiYnVzeVwiKTtcblx0XG5cdHZhciB1cGRhdGVRdWVyeUJ1dHRvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHJvb3QudXBkYXRlUXVlcnlCdXR0b24oY20pO1xuXHR9O1xuXHQvL01ha2Ugc3VyZSB0aGUgcXVlcnkgYnV0dG9uIGlzIHVwZGF0ZWQgYWdhaW4gb24gY29tcGxldGVcblx0aWYgKGFqYXhDb25maWcuY29tcGxldGUpIHtcblx0XHR2YXIgY3VzdG9tQ29tcGxldGUgPSBhamF4Q29uZmlnLmNvbXBsZXRlO1xuXHRcdGFqYXhDb25maWcuY29tcGxldGUgPSBmdW5jdGlvbihhcmcxLCBhcmcyKSB7XG5cdFx0XHRjdXN0b21Db21wbGV0ZShhcmcxLCBhcmcyKTtcblx0XHRcdHVwZGF0ZVF1ZXJ5QnV0dG9uKCk7XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRhamF4Q29uZmlnLmNvbXBsZXRlID0gdXBkYXRlUXVlcnlCdXR0b247XG5cdH1cblx0Y20ueGhyID0gJC5hamF4KGFqYXhDb25maWcpO1xufTtcbnZhciBjb21wbGV0aW9uTm90aWZpY2F0aW9ucyA9IHt9O1xuXG4vKipcbiAqIFNob3cgbm90aWZpY2F0aW9uXG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQHBhcmFtIGF1dG9jb21wbGV0aW9uVHlwZSB7c3RyaW5nfVxuICogQG1ldGhvZCBZQVNRRS5zaG93Q29tcGxldGlvbk5vdGlmaWNhdGlvblxuICovXG5yb290LnNob3dDb21wbGV0aW9uTm90aWZpY2F0aW9uID0gZnVuY3Rpb24oY20sIHR5cGUpIHtcblx0Ly9vbmx5IGRyYXcgd2hlbiB0aGUgdXNlciBuZWVkcyB0byB1c2UgYSBrZXlwcmVzcyB0byBzdW1tb24gYXV0b2NvbXBsZXRpb25zXG5cdGlmICghY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uYXV0b3Nob3cpIHtcblx0XHRpZiAoIWNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdKSBjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSA9ICQoXCI8ZGl2IGNsYXNzPSdjb21wbGV0aW9uTm90aWZpY2F0aW9uJz48L2Rpdj5cIik7XG5cdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV1cblx0XHRcdC5zaG93KClcblx0XHRcdC50ZXh0KFwiUHJlc3MgXCIgKyAobmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNYWMgT1MgWCcpICE9IC0xPyBcIkNNRFwiOiBcIkNUUkxcIikgKyBcIiAtIDxzcGFjZWJhcj4gdG8gYXV0b2NvbXBsZXRlXCIpXG5cdFx0XHQuYXBwZW5kVG8oJChjbS5nZXRXcmFwcGVyRWxlbWVudCgpKSk7XG5cdH1cbn07XG5cbi8qKlxuICogSGlkZSBjb21wbGV0aW9uIG5vdGlmaWNhdGlvblxuICogXG4gKiBAcGFyYW0gZG9jIHtZQVNRRX1cbiAqIEBwYXJhbSBhdXRvY29tcGxldGlvblR5cGUge3N0cmluZ31cbiAqIEBtZXRob2QgWUFTUUUuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb25cbiAqL1xucm9vdC5oaWRlQ29tcGxldGlvbk5vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKGNtLCB0eXBlKSB7XG5cdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkge1xuXHRcdGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdLmhpZGUoKTtcblx0fVxufTtcblxuXG5cbnJvb3QuYXV0b0NvbXBsZXRlID0gZnVuY3Rpb24oY20sIGZyb21BdXRvU2hvdykge1xuXHRpZiAoY20uc29tZXRoaW5nU2VsZWN0ZWQoKSlcblx0XHRyZXR1cm47XG5cdGlmICghY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnMpXG5cdFx0cmV0dXJuO1xuXHR2YXIgdHJ5SGludFR5cGUgPSBmdW5jdGlvbih0eXBlKSB7XG5cdFx0aWYgKGZyb21BdXRvU2hvdyAvLyBmcm9tIGF1dG9TaG93LCBpLmUuIHRoaXMgZ2V0cyBjYWxsZWQgZWFjaCB0aW1lIHRoZSBlZGl0b3IgY29udGVudCBjaGFuZ2VzXG5cdFx0XHRcdCYmICghY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uYXV0b1Nob3cgLy8gYXV0b3Nob3cgZm9yICB0aGlzIHBhcnRpY3VsYXIgdHlwZSBvZiBhdXRvY29tcGxldGlvbiBpcyAtbm90LSBlbmFibGVkXG5cdFx0XHRcdHx8IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmFzeW5jKSAvLyBhc3luYyBpcyBlbmFibGVkIChkb24ndCB3YW50IHRvIHJlLWRvIGFqYXgtbGlrZSByZXF1ZXN0IGZvciBldmVyeSBlZGl0b3IgY2hhbmdlKVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHZhciBoaW50Q29uZmlnID0ge1xuXHRcdFx0Y2xvc2VDaGFyYWN0ZXJzIDogLyg/PWEpYi8sXG5cdFx0XHR0eXBlIDogdHlwZSxcblx0XHRcdGNvbXBsZXRlU2luZ2xlOiBmYWxzZVxuXHRcdH07XG5cdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmFzeW5jKSB7XG5cdFx0XHRoaW50Q29uZmlnLmFzeW5jID0gdHJ1ZTtcblx0XHR9XG5cdFx0dmFyIHdyYXBwZWRIaW50Q2FsbGJhY2sgPSBmdW5jdGlvbihjbSwgY2FsbGJhY2spIHtcblx0XHRcdHJldHVybiBnZXRDb21wbGV0aW9uSGludHNPYmplY3QoY20sIHR5cGUsIGNhbGxiYWNrKTtcblx0XHR9O1xuXHRcdHZhciByZXN1bHQgPSByb290LnNob3dIaW50KGNtLCB3cmFwcGVkSGludENhbGxiYWNrLCBoaW50Q29uZmlnKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblx0Zm9yICggdmFyIHR5cGUgaW4gY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnMpIHtcblx0XHRpZiAoIWNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb24pIGNvbnRpbnVlOyAvL25vIHdheSB0byBjaGVjayB3aGV0aGVyIHdlIGFyZSBpbiBhIHZhbGlkIHBvc2l0aW9uXG5cdFx0XG5cdFx0aWYgKCFjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5pc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uKGNtKSkge1xuXHRcdFx0Ly9pZiBuZWVkZWQsIGZpcmUgaGFuZGxlciBmb3Igd2hlbiB3ZSBhcmUgLW5vdC0gaW4gdmFsaWQgY29tcGxldGlvbiBwb3NpdGlvblxuXHRcdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzICYmIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzLmludmFsaWRQb3NpdGlvbikge1xuXHRcdFx0XHRjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycy5pbnZhbGlkUG9zaXRpb24oY20sIHR5cGUpO1xuXHRcdFx0fVxuXHRcdFx0Ly9ub3QgaW4gYSB2YWxpZCBwb3NpdGlvbiwgc28gY29udGludWUgdG8gbmV4dCBjb21wbGV0aW9uIGNhbmRpZGF0ZSB0eXBlXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0Ly8gcnVuIHZhbGlkIHBvc2l0aW9uIGhhbmRsZXIsIGlmIHRoZXJlIGlzIG9uZSAoaWYgaXQgcmV0dXJucyBmYWxzZSwgc3RvcCB0aGUgYXV0b2NvbXBsZXRpb24hKVxuXHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycyAmJiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycy52YWxpZFBvc2l0aW9uKSB7XG5cdFx0XHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMudmFsaWRQb3NpdGlvbihjbSwgdHlwZSkgPT09IGZhbHNlKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHR2YXIgc3VjY2VzcyA9IHRyeUhpbnRUeXBlKHR5cGUpO1xuXHRcdGlmIChzdWNjZXNzKVxuXHRcdFx0YnJlYWs7XG5cdH1cbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0eXBlZCBwcmVmaXggaXMgZGVjbGFyZWQuIElmIG5vdCwgYXV0b21hdGljYWxseSBhZGQgZGVjbGFyYXRpb25cbiAqIHVzaW5nIGxpc3QgZnJvbSBwcmVmaXguY2NcbiAqIFxuICogQHBhcmFtIGNtXG4gKi9cbnJvb3QuYXBwZW5kUHJlZml4SWZOZWVkZWQgPSBmdW5jdGlvbihjbSkge1xuXHRpZiAoIXRyaWVzW1wicHJlZml4ZXNcIl0pXG5cdFx0cmV0dXJuOy8vIG5vIHByZWZpeGVkIGRlZmluZWQuIGp1c3Qgc3RvcFxuXHR2YXIgY3VyID0gY20uZ2V0Q3Vyc29yKCk7XG5cblx0dmFyIHRva2VuID0gY20uZ2V0VG9rZW5BdChjdXIpO1xuXHRpZiAodG9rZW5UeXBlc1t0b2tlbi50eXBlXSA9PSBcInByZWZpeGVkXCIpIHtcblx0XHR2YXIgY29sb25JbmRleCA9IHRva2VuLnN0cmluZy5pbmRleE9mKFwiOlwiKTtcblx0XHRpZiAoY29sb25JbmRleCAhPT0gLTEpIHtcblx0XHRcdC8vIGNoZWNrIGZpcnN0IHRva2VuIGlzbnQgUFJFRklYLCBhbmQgcHJldmlvdXMgdG9rZW4gaXNudCBhICc8J1xuXHRcdFx0Ly8gKGkuZS4gd2UgYXJlIGluIGEgdXJpKVxuXHRcdFx0dmFyIGZpcnN0VG9rZW5TdHJpbmcgPSBnZXROZXh0Tm9uV3NUb2tlbihjbSwgY3VyLmxpbmUpLnN0cmluZ1xuXHRcdFx0XHRcdC50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0dmFyIHByZXZpb3VzVG9rZW4gPSBjbS5nZXRUb2tlbkF0KHtcblx0XHRcdFx0bGluZSA6IGN1ci5saW5lLFxuXHRcdFx0XHRjaCA6IHRva2VuLnN0YXJ0XG5cdFx0XHR9KTsvLyBuZWVkcyB0byBiZSBudWxsIChiZWdpbm5pbmcgb2YgbGluZSksIG9yIHdoaXRlc3BhY2Vcblx0XHRcdGlmIChmaXJzdFRva2VuU3RyaW5nICE9IFwiUFJFRklYXCJcblx0XHRcdFx0XHQmJiAocHJldmlvdXNUb2tlbi50eXBlID09IFwid3NcIiB8fCBwcmV2aW91c1Rva2VuLnR5cGUgPT0gbnVsbCkpIHtcblx0XHRcdFx0Ly8gY2hlY2sgd2hldGhlciBpdCBpc250IGRlZmluZWQgYWxyZWFkeSAoc2F2ZXMgdXMgZnJvbSBsb29waW5nXG5cdFx0XHRcdC8vIHRocm91Z2ggdGhlIGFycmF5KVxuXHRcdFx0XHR2YXIgY3VycmVudFByZWZpeCA9IHRva2VuLnN0cmluZy5zdWJzdHJpbmcoMCwgY29sb25JbmRleCArIDEpO1xuXHRcdFx0XHR2YXIgcXVlcnlQcmVmaXhlcyA9IGdldFByZWZpeGVzRnJvbVF1ZXJ5KGNtKTtcblx0XHRcdFx0aWYgKHF1ZXJ5UHJlZml4ZXNbY3VycmVudFByZWZpeF0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdC8vIG9rLCBzbyBpdCBpc250IGFkZGVkIHlldCFcblx0XHRcdFx0XHR2YXIgY29tcGxldGlvbnMgPSB0cmllc1tcInByZWZpeGVzXCJdLmF1dG9Db21wbGV0ZShjdXJyZW50UHJlZml4KTtcblx0XHRcdFx0XHRpZiAoY29tcGxldGlvbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0YXBwZW5kVG9QcmVmaXhlcyhjbSwgY29tcGxldGlvbnNbMF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuXG5cbi8qKlxuICogV2hlbiB0eXBpbmcgYSBxdWVyeSwgdGhpcyBxdWVyeSBpcyBzb21ldGltZXMgc3ludGFjdGljYWxseSBpbnZhbGlkLCBjYXVzaW5nXG4gKiB0aGUgY3VycmVudCB0b2tlbnMgdG8gYmUgaW5jb3JyZWN0IFRoaXMgY2F1c2VzIHByb2JsZW0gZm9yIGF1dG9jb21wbGV0aW9uLlxuICogaHR0cDovL2JsYSBtaWdodCByZXN1bHQgaW4gdHdvIHRva2VuczogaHR0cDovLyBhbmQgYmxhLiBXZSdsbCB3YW50IHRvIGNvbWJpbmVcbiAqIHRoZXNlXG4gKiBcbiAqIEBwYXJhbSB5YXNxZSB7ZG9jfVxuICogQHBhcmFtIHRva2VuIHtvYmplY3R9XG4gKiBAcGFyYW0gY3Vyc29yIHtvYmplY3R9XG4gKiBAcmV0dXJuIHRva2VuIHtvYmplY3R9XG4gKiBAbWV0aG9kIFlBU1FFLmdldENvbXBsZXRlVG9rZW5cbiAqL1xucm9vdC5nZXRDb21wbGV0ZVRva2VuID0gZnVuY3Rpb24oY20sIHRva2VuLCBjdXIpIHtcblx0aWYgKCFjdXIpIHtcblx0XHRjdXIgPSBjbS5nZXRDdXJzb3IoKTtcblx0fVxuXHRpZiAoIXRva2VuKSB7XG5cdFx0dG9rZW4gPSBjbS5nZXRUb2tlbkF0KGN1cik7XG5cdH1cblx0dmFyIHByZXZUb2tlbiA9IGNtLmdldFRva2VuQXQoe1xuXHRcdGxpbmUgOiBjdXIubGluZSxcblx0XHRjaCA6IHRva2VuLnN0YXJ0XG5cdH0pO1xuXHQvLyBub3Qgc3RhcnQgb2YgbGluZSwgYW5kIG5vdCB3aGl0ZXNwYWNlXG5cdGlmIChcblx0XHRcdHByZXZUb2tlbi50eXBlICE9IG51bGwgJiYgcHJldlRva2VuLnR5cGUgIT0gXCJ3c1wiXG5cdFx0XHQmJiB0b2tlbi50eXBlICE9IG51bGwgJiYgdG9rZW4udHlwZSAhPSBcIndzXCJcblx0XHQpIHtcblx0XHR0b2tlbi5zdGFydCA9IHByZXZUb2tlbi5zdGFydDtcblx0XHR0b2tlbi5zdHJpbmcgPSBwcmV2VG9rZW4uc3RyaW5nICsgdG9rZW4uc3RyaW5nO1xuXHRcdHJldHVybiByb290LmdldENvbXBsZXRlVG9rZW4oY20sIHRva2VuLCB7XG5cdFx0XHRsaW5lIDogY3VyLmxpbmUsXG5cdFx0XHRjaCA6IHByZXZUb2tlbi5zdGFydFxuXHRcdH0pOy8vIHJlY3Vyc2l2ZWx5LCBtaWdodCBoYXZlIG11bHRpcGxlIHRva2VucyB3aGljaCBpdCBzaG91bGQgaW5jbHVkZVxuXHR9IGVsc2UgaWYgKHRva2VuLnR5cGUgIT0gbnVsbCAmJiB0b2tlbi50eXBlID09IFwid3NcIikge1xuXHRcdC8vYWx3YXlzIGtlZXAgMSBjaGFyIG9mIHdoaXRlc3BhY2UgYmV0d2VlbiB0b2tlbnMuIE90aGVyd2lzZSwgYXV0b2NvbXBsZXRpb25zIG1pZ2h0IGVuZCB1cCBuZXh0IHRvIHRoZSBwcmV2aW91cyBub2RlLCB3aXRob3V0IHdoaXRlc3BhY2UgYmV0d2VlbiB0aGVtXG5cdFx0dG9rZW4uc3RhcnQgPSB0b2tlbi5zdGFydCArIDE7XG5cdFx0dG9rZW4uc3RyaW5nID0gdG9rZW4uc3RyaW5nLnN1YnN0cmluZygxKTtcblx0XHRyZXR1cm4gdG9rZW47XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRva2VuO1xuXHR9XG59O1xuZnVuY3Rpb24gZ2V0UHJldmlvdXNOb25Xc1Rva2VuKGNtLCBsaW5lLCB0b2tlbikge1xuXHR2YXIgcHJldmlvdXNUb2tlbiA9IGNtLmdldFRva2VuQXQoe1xuXHRcdGxpbmUgOiBsaW5lLFxuXHRcdGNoIDogdG9rZW4uc3RhcnRcblx0fSk7XG5cdGlmIChwcmV2aW91c1Rva2VuICE9IG51bGwgJiYgcHJldmlvdXNUb2tlbi50eXBlID09IFwid3NcIikge1xuXHRcdHByZXZpb3VzVG9rZW4gPSBnZXRQcmV2aW91c05vbldzVG9rZW4oY20sIGxpbmUsIHByZXZpb3VzVG9rZW4pO1xuXHR9XG5cdHJldHVybiBwcmV2aW91c1Rva2VuO1xufVxuXG5cbi8qKlxuICogRmV0Y2ggcHJvcGVydHkgYW5kIGNsYXNzIGF1dG9jb21wbGV0aW9ucyB0aGUgTGlua2VkIE9wZW4gVm9jYWJ1bGFyeSBzZXJ2aWNlcy4gSXNzdWVzIGFuIGFzeW5jIGF1dG9jb21wbGV0aW9uIGNhbGxcbiAqIFxuICogQHBhcmFtIGRvYyB7WUFTUUV9XG4gKiBAcGFyYW0gcGFydGlhbFRva2VuIHtvYmplY3R9XG4gKiBAcGFyYW0gdHlwZSB7XCJwcm9wZXJ0aWVzXCIgfCBcImNsYXNzZXNcIn1cbiAqIEBwYXJhbSBjYWxsYmFjayB7ZnVuY3Rpb259IFxuICogXG4gKiBAbWV0aG9kIFlBU1FFLmZldGNoRnJvbUxvdlxuICovXG5yb290LmZldGNoRnJvbUxvdiA9IGZ1bmN0aW9uKGNtLCBwYXJ0aWFsVG9rZW4sIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFxuXHRpZiAoIXBhcnRpYWxUb2tlbiB8fCAhcGFydGlhbFRva2VuLnN0cmluZyB8fCBwYXJ0aWFsVG9rZW4uc3RyaW5nLnRyaW0oKS5sZW5ndGggPT0gMCkge1xuXHRcdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkge1xuXHRcdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV1cblx0XHRcdFx0LmVtcHR5KClcblx0XHRcdFx0LmFwcGVuZChcIk5vdGhpbmcgdG8gYXV0b2NvbXBsZXRlIHlldCFcIik7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHR2YXIgbWF4UmVzdWx0cyA9IDUwO1xuXG5cdHZhciBhcmdzID0ge1xuXHRcdHEgOiBwYXJ0aWFsVG9rZW4udXJpLFxuXHRcdHBhZ2UgOiAxXG5cdH07XG5cdGlmICh0eXBlID09IFwiY2xhc3Nlc1wiKSB7XG5cdFx0YXJncy50eXBlID0gXCJjbGFzc1wiO1xuXHR9IGVsc2Uge1xuXHRcdGFyZ3MudHlwZSA9IFwicHJvcGVydHlcIjtcblx0fVxuXHR2YXIgcmVzdWx0cyA9IFtdO1xuXHR2YXIgdXJsID0gXCJcIjtcblx0dmFyIHVwZGF0ZVVybCA9IGZ1bmN0aW9uKCkge1xuXHRcdHVybCA9IFwiaHR0cDovL2xvdi5va2ZuLm9yZy9kYXRhc2V0L2xvdi9hcGkvdjIvYXV0b2NvbXBsZXRlL3Rlcm1zP1wiXG5cdFx0XHRcdCsgJC5wYXJhbShhcmdzKTtcblx0fTtcblx0dXBkYXRlVXJsKCk7XG5cdHZhciBpbmNyZWFzZVBhZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRhcmdzLnBhZ2UrKztcblx0XHR1cGRhdGVVcmwoKTtcblx0fTtcblx0dmFyIGRvUmVxdWVzdHMgPSBmdW5jdGlvbigpIHtcblx0XHQkLmdldChcblx0XHRcdFx0dXJsLFxuXHRcdFx0XHRmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLnJlc3VsdHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdGlmICgkLmlzQXJyYXkoZGF0YS5yZXN1bHRzW2ldLnVyaSkgJiYgZGF0YS5yZXN1bHRzW2ldLnVyaS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdHMucHVzaChkYXRhLnJlc3VsdHNbaV0udXJpWzBdKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdHMucHVzaChkYXRhLnJlc3VsdHNbaV0udXJpKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPCBkYXRhLnRvdGFsX3Jlc3VsdHNcblx0XHRcdFx0XHRcdFx0JiYgcmVzdWx0cy5sZW5ndGggPCBtYXhSZXN1bHRzKSB7XG5cdFx0XHRcdFx0XHRpbmNyZWFzZVBhZ2UoKTtcblx0XHRcdFx0XHRcdGRvUmVxdWVzdHMoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly9pZiBub3RpZmljYXRpb24gYmFyIGlzIHRoZXJlLCBzaG93IGZlZWRiYWNrLCBvciBjbG9zZVxuXHRcdFx0XHRcdFx0aWYgKGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXN1bHRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHRjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXS5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV0udGV4dChcIjAgbWF0Y2hlcyBmb3VuZC4uLlwiKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2socmVzdWx0cyk7XG5cdFx0XHRcdFx0XHQvLyByZXF1ZXN0cyBkb25lISBEb24ndCBjYWxsIHRoaXMgZnVuY3Rpb24gYWdhaW5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLmZhaWwoZnVuY3Rpb24oanFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSB7XG5cdFx0XHRcdFx0aWYgKGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdKSB7XG5cdFx0XHRcdFx0XHRjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXVxuXHRcdFx0XHRcdFx0XHQuZW1wdHkoKVxuXHRcdFx0XHRcdFx0XHQuYXBwZW5kKFwiRmFpbGVkIGZldGNoaW5nIHN1Z2dlc3Rpb25zLi5cIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdH0pO1xuXHR9O1xuXHQvL2lmIG5vdGlmaWNhdGlvbiBiYXIgaXMgdGhlcmUsIHNob3cgYSBsb2FkZXJcblx0aWYgKGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdKSB7XG5cdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV1cblx0XHQuZW1wdHkoKVxuXHRcdC5hcHBlbmQoJChcIjxzcGFuPkZldGNodGluZyBhdXRvY29tcGxldGlvbnMgJm5ic3A7PC9zcGFuPlwiKSlcblx0XHQuYXBwZW5kKHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuaW1ncy5nZXRFbGVtZW50KHtpZDogXCJsb2FkZXJcIiwgd2lkdGg6IFwiMThweFwiLCBoZWlnaHQ6IFwiMThweFwifSkuY3NzKFwidmVydGljYWwtYWxpZ25cIiwgXCJtaWRkbGVcIikpO1xuXHR9XG5cdGRvUmVxdWVzdHMoKTtcbn07XG4vKipcbiAqIGZ1bmN0aW9uIHdoaWNoIGZpcmVzIGFmdGVyIHRoZSB1c2VyIHNlbGVjdHMgYSBjb21wbGV0aW9uLiB0aGlzIGZ1bmN0aW9uIGNoZWNrcyB3aGV0aGVyIHdlIGFjdHVhbGx5IG5lZWQgdG8gc3RvcmUgdGhpcyBvbmUgKGlmIGNvbXBsZXRpb24gaXMgc2FtZSBhcyBjdXJyZW50IHRva2VuLCBkb24ndCBkbyBhbnl0aGluZylcbiAqL1xudmFyIHNlbGVjdEhpbnQgPSBmdW5jdGlvbihjbSwgZGF0YSwgY29tcGxldGlvbikge1xuXHRpZiAoY29tcGxldGlvbi50ZXh0ICE9IGNtLmdldFRva2VuQXQoY20uZ2V0Q3Vyc29yKCkpLnN0cmluZykge1xuXHRcdGNtLnJlcGxhY2VSYW5nZShjb21wbGV0aW9uLnRleHQsIGRhdGEuZnJvbSwgZGF0YS50byk7XG5cdH1cbn07XG5cbi8qKlxuICogQ29udmVydHMgcmRmOnR5cGUgdG8gaHR0cDovLy4uLi90eXBlIGFuZCBjb252ZXJ0cyA8aHR0cDovLy4uLj4gdG8gaHR0cDovLy4uLlxuICogU3RvcmVzIGFkZGl0aW9uYWwgaW5mbyBzdWNoIGFzIHRoZSB1c2VkIG5hbWVzcGFjZSBhbmQgcHJlZml4IGluIHRoZSB0b2tlbiBvYmplY3RcbiAqL1xudmFyIHByZXByb2Nlc3NSZXNvdXJjZVRva2VuRm9yQ29tcGxldGlvbiA9IGZ1bmN0aW9uKGNtLCB0b2tlbikge1xuXHR2YXIgcXVlcnlQcmVmaXhlcyA9IGdldFByZWZpeGVzRnJvbVF1ZXJ5KGNtKTtcblx0aWYgKCF0b2tlbi5zdHJpbmcuaW5kZXhPZihcIjxcIikgPT0gMCkge1xuXHRcdHRva2VuLnRva2VuUHJlZml4ID0gdG9rZW4uc3RyaW5nLnN1YnN0cmluZygwLFx0dG9rZW4uc3RyaW5nLmluZGV4T2YoXCI6XCIpICsgMSk7XG5cblx0XHRpZiAocXVlcnlQcmVmaXhlc1t0b2tlbi50b2tlblByZWZpeF0gIT0gbnVsbCkge1xuXHRcdFx0dG9rZW4udG9rZW5QcmVmaXhVcmkgPSBxdWVyeVByZWZpeGVzW3Rva2VuLnRva2VuUHJlZml4XTtcblx0XHR9XG5cdH1cblxuXHR0b2tlbi51cmkgPSB0b2tlbi5zdHJpbmcudHJpbSgpO1xuXHRpZiAoIXRva2VuLnN0cmluZy5pbmRleE9mKFwiPFwiKSA9PSAwICYmIHRva2VuLnN0cmluZy5pbmRleE9mKFwiOlwiKSA+IC0xKSB7XG5cdFx0Ly8gaG1tLCB0aGUgdG9rZW4gaXMgcHJlZml4ZWQuIFdlIHN0aWxsIG5lZWQgdGhlIGNvbXBsZXRlIHVyaSBmb3IgYXV0b2NvbXBsZXRpb25zLiBnZW5lcmF0ZSB0aGlzIVxuXHRcdGZvciAodmFyIHByZWZpeCBpbiBxdWVyeVByZWZpeGVzKSB7XG5cdFx0XHRpZiAocXVlcnlQcmVmaXhlcy5oYXNPd25Qcm9wZXJ0eShwcmVmaXgpKSB7XG5cdFx0XHRcdGlmICh0b2tlbi5zdHJpbmcuaW5kZXhPZihwcmVmaXgpID09IDApIHtcblx0XHRcdFx0XHR0b2tlbi51cmkgPSBxdWVyeVByZWZpeGVzW3ByZWZpeF07XG5cdFx0XHRcdFx0dG9rZW4udXJpICs9IHRva2VuLnN0cmluZy5zdWJzdHJpbmcocHJlZml4Lmxlbmd0aCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAodG9rZW4udXJpLmluZGV4T2YoXCI8XCIpID09IDApXHR0b2tlbi51cmkgPSB0b2tlbi51cmkuc3Vic3RyaW5nKDEpO1xuXHRpZiAodG9rZW4udXJpLmluZGV4T2YoXCI+XCIsIHRva2VuLmxlbmd0aCAtIDEpICE9PSAtMSkgdG9rZW4udXJpID0gdG9rZW4udXJpLnN1YnN0cmluZygwLFx0dG9rZW4udXJpLmxlbmd0aCAtIDEpO1xuXHRyZXR1cm4gdG9rZW47XG59O1xuXG52YXIgcG9zdHByb2Nlc3NSZXNvdXJjZVRva2VuRm9yQ29tcGxldGlvbiA9IGZ1bmN0aW9uKGNtLCB0b2tlbiwgc3VnZ2VzdGVkU3RyaW5nKSB7XG5cdGlmICh0b2tlbi50b2tlblByZWZpeCAmJiB0b2tlbi51cmkgJiYgdG9rZW4udG9rZW5QcmVmaXhVcmkpIHtcblx0XHQvLyB3ZSBuZWVkIHRvIGdldCB0aGUgc3VnZ2VzdGVkIHN0cmluZyBiYWNrIHRvIHByZWZpeGVkIGZvcm1cblx0XHRzdWdnZXN0ZWRTdHJpbmcgPSBzdWdnZXN0ZWRTdHJpbmcuc3Vic3RyaW5nKHRva2VuLnRva2VuUHJlZml4VXJpLmxlbmd0aCk7XG5cdFx0c3VnZ2VzdGVkU3RyaW5nID0gdG9rZW4udG9rZW5QcmVmaXggKyBzdWdnZXN0ZWRTdHJpbmc7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gaXQgaXMgYSByZWd1bGFyIHVyaS4gYWRkICc8JyBhbmQgJz4nIHRvIHN0cmluZ1xuXHRcdHN1Z2dlc3RlZFN0cmluZyA9IFwiPFwiICsgc3VnZ2VzdGVkU3RyaW5nICsgXCI+XCI7XG5cdH1cblx0cmV0dXJuIHN1Z2dlc3RlZFN0cmluZztcbn07XG52YXIgcHJlcHJvY2Vzc1ByZWZpeFRva2VuRm9yQ29tcGxldGlvbiA9IGZ1bmN0aW9uKGNtLCB0b2tlbikge1xuXHR2YXIgcHJldmlvdXNUb2tlbiA9IGdldFByZXZpb3VzTm9uV3NUb2tlbihjbSwgY20uZ2V0Q3Vyc29yKCkubGluZSwgdG9rZW4pO1xuXHRpZiAocHJldmlvdXNUb2tlbiAmJiBwcmV2aW91c1Rva2VuLnN0cmluZyAmJiBwcmV2aW91c1Rva2VuLnN0cmluZy5zbGljZSgtMSkgPT0gXCI6XCIpIHtcblx0XHQvL2NvbWJpbmUgYm90aCB0b2tlbnMhIEluIHRoaXMgY2FzZSB3ZSBoYXZlIHRoZSBjdXJzb3IgYXQgdGhlIGVuZCBvZiBsaW5lIFwiUFJFRklYIGJsYTogPFwiLlxuXHRcdC8vd2Ugd2FudCB0aGUgdG9rZW4gdG8gYmUgXCJibGE6IDxcIiwgZW4gbm90IFwiPFwiXG5cdFx0dG9rZW4gPSB7XG5cdFx0XHRzdGFydDogcHJldmlvdXNUb2tlbi5zdGFydCxcblx0XHRcdGVuZDogdG9rZW4uZW5kLFxuXHRcdFx0c3RyaW5nOiBwcmV2aW91c1Rva2VuLnN0cmluZyArIFwiIFwiICsgdG9rZW4uc3RyaW5nLFxuXHRcdFx0c3RhdGU6IHRva2VuLnN0YXRlXG5cdFx0fTtcblx0fVxuXHRyZXR1cm4gdG9rZW47XG59O1xudmFyIGdldFN1Z2dlc3Rpb25zRnJvbVRva2VuID0gZnVuY3Rpb24oY20sIHR5cGUsIHBhcnRpYWxUb2tlbikge1xuXHR2YXIgc3VnZ2VzdGlvbnMgPSBbXTtcblx0aWYgKHRyaWVzW3R5cGVdKSB7XG5cdFx0c3VnZ2VzdGlvbnMgPSB0cmllc1t0eXBlXS5hdXRvQ29tcGxldGUocGFydGlhbFRva2VuLnN0cmluZyk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldCA9PSBcImZ1bmN0aW9uXCIgJiYgY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uYXN5bmMgPT0gZmFsc2UpIHtcblx0XHRzdWdnZXN0aW9ucyA9IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldChjbSwgcGFydGlhbFRva2VuLnN0cmluZywgdHlwZSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldCA9PSBcIm9iamVjdFwiKSB7XG5cdFx0dmFyIHBhcnRpYWxUb2tlbkxlbmd0aCA9IHBhcnRpYWxUb2tlbi5zdHJpbmcubGVuZ3RoO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uZ2V0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY29tcGxldGlvbiA9IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldFtpXTtcblx0XHRcdGlmIChjb21wbGV0aW9uLnNsaWNlKDAsIHBhcnRpYWxUb2tlbkxlbmd0aCkgPT0gcGFydGlhbFRva2VuLnN0cmluZykge1xuXHRcdFx0XHRzdWdnZXN0aW9ucy5wdXNoKGNvbXBsZXRpb24pO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gZ2V0U3VnZ2VzdGlvbnNBc0hpbnRPYmplY3QoY20sIHN1Z2dlc3Rpb25zLCB0eXBlLCBwYXJ0aWFsVG9rZW4pO1xuXHRcbn07XG5cbi8qKlxuICogIGdldCBvdXIgYXJyYXkgb2Ygc3VnZ2VzdGlvbnMgKHN0cmluZ3MpIGluIHRoZSBjb2RlbWlycm9yIGhpbnQgZm9ybWF0XG4gKi9cbnZhciBnZXRTdWdnZXN0aW9uc0FzSGludE9iamVjdCA9IGZ1bmN0aW9uKGNtLCBzdWdnZXN0aW9ucywgdHlwZSwgdG9rZW4pIHtcblx0dmFyIGhpbnRMaXN0ID0gW107XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc3VnZ2VzdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgc3VnZ2VzdGVkU3RyaW5nID0gc3VnZ2VzdGlvbnNbaV07XG5cdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLnBvc3RQcm9jZXNzVG9rZW4pIHtcblx0XHRcdHN1Z2dlc3RlZFN0cmluZyA9IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLnBvc3RQcm9jZXNzVG9rZW4oY20sIHRva2VuLCBzdWdnZXN0ZWRTdHJpbmcpO1xuXHRcdH1cblx0XHRoaW50TGlzdC5wdXNoKHtcblx0XHRcdHRleHQgOiBzdWdnZXN0ZWRTdHJpbmcsXG5cdFx0XHRkaXNwbGF5VGV4dCA6IHN1Z2dlc3RlZFN0cmluZyxcblx0XHRcdGhpbnQgOiBzZWxlY3RIaW50LFxuXHRcdFx0Y2xhc3NOYW1lIDogdHlwZSArIFwiSGludFwiXG5cdFx0fSk7XG5cdH1cblx0XG5cdHZhciBjdXIgPSBjbS5nZXRDdXJzb3IoKTtcblx0dmFyIHJldHVybk9iaiA9IHtcblx0XHRjb21wbGV0aW9uVG9rZW4gOiB0b2tlbi5zdHJpbmcsXG5cdFx0bGlzdCA6IGhpbnRMaXN0LFxuXHRcdGZyb20gOiB7XG5cdFx0XHRsaW5lIDogY3VyLmxpbmUsXG5cdFx0XHRjaCA6IHRva2VuLnN0YXJ0XG5cdFx0fSxcblx0XHR0byA6IHtcblx0XHRcdGxpbmUgOiBjdXIubGluZSxcblx0XHRcdGNoIDogdG9rZW4uZW5kXG5cdFx0fVxuXHR9O1xuXHQvL2lmIHdlIGhhdmUgc29tZSBhdXRvY29tcGxldGlvbiBoYW5kbGVycyBzcGVjaWZpZWQsIGFkZCB0aGVzZSB0aGVzZSB0byB0aGUgb2JqZWN0LiBDb2RlbWlycm9yIHdpbGwgdGFrZSBjYXJlIG9mIGZpcmluZyB0aGVzZVxuXHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMpIHtcblx0XHRmb3IgKCB2YXIgaGFuZGxlciBpbiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycykge1xuXHRcdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzW2hhbmRsZXJdKSBcblx0XHRcdFx0cm9vdC5vbihyZXR1cm5PYmosIGhhbmRsZXIsIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzW2hhbmRsZXJdKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHJldHVybk9iajtcbn07XG5cblxudmFyIGdldENvbXBsZXRpb25IaW50c09iamVjdCA9IGZ1bmN0aW9uKGNtLCB0eXBlLCBjYWxsYmFjaykge1xuXHR2YXIgdG9rZW4gPSByb290LmdldENvbXBsZXRlVG9rZW4oY20pO1xuXHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0ucHJlUHJvY2Vzc1Rva2VuKSB7XG5cdFx0dG9rZW4gPSBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5wcmVQcm9jZXNzVG9rZW4oY20sIHRva2VuLCB0eXBlKTtcblx0fVxuXHRcblx0aWYgKHRva2VuKSB7XG5cdFx0Ly8gdXNlIGN1c3RvbSBjb21wbGV0aW9uaGludCBmdW5jdGlvbiwgdG8gYXZvaWQgcmVhY2hpbmcgYSBsb29wIHdoZW4gdGhlXG5cdFx0Ly8gY29tcGxldGlvbmhpbnQgaXMgdGhlIHNhbWUgYXMgdGhlIGN1cnJlbnQgdG9rZW5cblx0XHQvLyByZWd1bGFyIGJlaGF2aW91ciB3b3VsZCBrZWVwIGNoYW5naW5nIHRoZSBjb2RlbWlycm9yIGRvbSwgaGVuY2Vcblx0XHQvLyBjb25zdGFudGx5IGNhbGxpbmcgdGhpcyBjYWxsYmFja1xuXHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5hc3luYykge1xuXHRcdFx0dmFyIHdyYXBwZWRDYWxsYmFjayA9IGZ1bmN0aW9uKHN1Z2dlc3Rpb25zKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGdldFN1Z2dlc3Rpb25zQXNIaW50T2JqZWN0KGNtLCBzdWdnZXN0aW9ucywgdHlwZSwgdG9rZW4pKTtcblx0XHRcdH07XG5cdFx0XHRjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXQoY20sIHRva2VuLCB0eXBlLCB3cmFwcGVkQ2FsbGJhY2spO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZ2V0U3VnZ2VzdGlvbnNGcm9tVG9rZW4oY20sIHR5cGUsIHRva2VuKTtcblxuXHRcdH1cblx0fVxufTtcblxudmFyIGdldFBlcnNpc3RlbmN5SWQgPSBmdW5jdGlvbihjbSwgcGVyc2lzdGVudElkQ3JlYXRvcikge1xuXHR2YXIgcGVyc2lzdGVuY3lJZCA9IG51bGw7XG5cblx0aWYgKHBlcnNpc3RlbnRJZENyZWF0b3IpIHtcblx0XHRpZiAodHlwZW9mIHBlcnNpc3RlbnRJZENyZWF0b3IgPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0cGVyc2lzdGVuY3lJZCA9IHBlcnNpc3RlbnRJZENyZWF0b3I7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBlcnNpc3RlbmN5SWQgPSBwZXJzaXN0ZW50SWRDcmVhdG9yKGNtKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHBlcnNpc3RlbmN5SWQ7XG59O1xuXG52YXIgYXV0b0Zvcm1hdFJhbmdlID0gZnVuY3Rpb24oY20sIGZyb20sIHRvKSB7XG5cdHZhciBhYnNTdGFydCA9IGNtLmluZGV4RnJvbVBvcyhmcm9tKTtcblx0dmFyIGFic0VuZCA9IGNtLmluZGV4RnJvbVBvcyh0byk7XG5cdC8vIEluc2VydCBhZGRpdGlvbmFsIGxpbmUgYnJlYWtzIHdoZXJlIG5lY2Vzc2FyeSBhY2NvcmRpbmcgdG8gdGhlXG5cdC8vIG1vZGUncyBzeW50YXhcblx0dmFyIHJlcyA9IGF1dG9Gb3JtYXRMaW5lQnJlYWtzKGNtLmdldFZhbHVlKCksIGFic1N0YXJ0LCBhYnNFbmQpO1xuXG5cdC8vIFJlcGxhY2UgYW5kIGF1dG8taW5kZW50IHRoZSByYW5nZVxuXHRjbS5vcGVyYXRpb24oZnVuY3Rpb24oKSB7XG5cdFx0Y20ucmVwbGFjZVJhbmdlKHJlcywgZnJvbSwgdG8pO1xuXHRcdHZhciBzdGFydExpbmUgPSBjbS5wb3NGcm9tSW5kZXgoYWJzU3RhcnQpLmxpbmU7XG5cdFx0dmFyIGVuZExpbmUgPSBjbS5wb3NGcm9tSW5kZXgoYWJzU3RhcnQgKyByZXMubGVuZ3RoKS5saW5lO1xuXHRcdGZvciAodmFyIGkgPSBzdGFydExpbmU7IGkgPD0gZW5kTGluZTsgaSsrKSB7XG5cdFx0XHRjbS5pbmRlbnRMaW5lKGksIFwic21hcnRcIik7XG5cdFx0fVxuXHR9KTtcbn07XG5cbnZhciBhdXRvRm9ybWF0TGluZUJyZWFrcyA9IGZ1bmN0aW9uKHRleHQsIHN0YXJ0LCBlbmQpIHtcblx0dGV4dCA9IHRleHQuc3Vic3RyaW5nKHN0YXJ0LCBlbmQpO1xuXHR2YXIgYnJlYWtBZnRlckFycmF5ID0gWyBbIFwia2V5d29yZFwiLCBcIndzXCIsIFwicHJlZml4ZWRcIiwgXCJ3c1wiLCBcInVyaVwiIF0sIC8vIGkuZS4gcHJlZml4IGRlY2xhcmF0aW9uXG5cdFsgXCJrZXl3b3JkXCIsIFwid3NcIiwgXCJ1cmlcIiBdIC8vIGkuZS4gYmFzZVxuXHRdO1xuXHR2YXIgYnJlYWtBZnRlckNoYXJhY3RlcnMgPSBbIFwie1wiLCBcIi5cIiwgXCI7XCIgXTtcblx0dmFyIGJyZWFrQmVmb3JlQ2hhcmFjdGVycyA9IFsgXCJ9XCIgXTtcblx0dmFyIGdldEJyZWFrVHlwZSA9IGZ1bmN0aW9uKHN0cmluZ1ZhbCwgdHlwZSkge1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYnJlYWtBZnRlckFycmF5Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAoc3RhY2tUcmFjZS52YWx1ZU9mKCkudG9TdHJpbmcoKSA9PSBicmVha0FmdGVyQXJyYXlbaV0udmFsdWVPZigpXG5cdFx0XHRcdFx0LnRvU3RyaW5nKCkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYnJlYWtBZnRlckNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmIChzdHJpbmdWYWwgPT0gYnJlYWtBZnRlckNoYXJhY3RlcnNbaV0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgYnJlYWtCZWZvcmVDaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHQvLyBkb24ndCB3YW50IHRvIGlzc3VlICdicmVha2JlZm9yZScgQU5EICdicmVha2FmdGVyJywgc28gY2hlY2tcblx0XHRcdC8vIGN1cnJlbnQgbGluZVxuXHRcdFx0aWYgKCQudHJpbShjdXJyZW50TGluZSkgIT0gJydcblx0XHRcdFx0XHQmJiBzdHJpbmdWYWwgPT0gYnJlYWtCZWZvcmVDaGFyYWN0ZXJzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIDA7XG5cdH07XG5cdHZhciBmb3JtYXR0ZWRRdWVyeSA9IFwiXCI7XG5cdHZhciBjdXJyZW50TGluZSA9IFwiXCI7XG5cdHZhciBzdGFja1RyYWNlID0gW107XG5cdENvZGVNaXJyb3IucnVuTW9kZSh0ZXh0LCBcInNwYXJxbDExXCIsIGZ1bmN0aW9uKHN0cmluZ1ZhbCwgdHlwZSkge1xuXHRcdHN0YWNrVHJhY2UucHVzaCh0eXBlKTtcblx0XHR2YXIgYnJlYWtUeXBlID0gZ2V0QnJlYWtUeXBlKHN0cmluZ1ZhbCwgdHlwZSk7XG5cdFx0aWYgKGJyZWFrVHlwZSAhPSAwKSB7XG5cdFx0XHRpZiAoYnJlYWtUeXBlID09IDEpIHtcblx0XHRcdFx0Zm9ybWF0dGVkUXVlcnkgKz0gc3RyaW5nVmFsICsgXCJcXG5cIjtcblx0XHRcdFx0Y3VycmVudExpbmUgPSBcIlwiO1xuXHRcdFx0fSBlbHNlIHsvLyAoLTEpXG5cdFx0XHRcdGZvcm1hdHRlZFF1ZXJ5ICs9IFwiXFxuXCIgKyBzdHJpbmdWYWw7XG5cdFx0XHRcdGN1cnJlbnRMaW5lID0gc3RyaW5nVmFsO1xuXHRcdFx0fVxuXHRcdFx0c3RhY2tUcmFjZSA9IFtdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50TGluZSArPSBzdHJpbmdWYWw7XG5cdFx0XHRmb3JtYXR0ZWRRdWVyeSArPSBzdHJpbmdWYWw7XG5cdFx0fVxuXHRcdGlmIChzdGFja1RyYWNlLmxlbmd0aCA9PSAxICYmIHN0YWNrVHJhY2VbMF0gPT0gXCJzcC13c1wiKVxuXHRcdFx0c3RhY2tUcmFjZSA9IFtdO1xuXHR9KTtcblx0cmV0dXJuICQudHJpbShmb3JtYXR0ZWRRdWVyeS5yZXBsYWNlKC9cXG5cXHMqXFxuL2csICdcXG4nKSk7XG59O1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IG9wdGlvbnMgb2YgWUFTUUUgKGNoZWNrIHRoZSBDb2RlTWlycm9yIGRvY3VtZW50YXRpb24gZm9yIGV2ZW5cbiAqIG1vcmUgb3B0aW9ucywgc3VjaCBhcyBkaXNhYmxpbmcgbGluZSBudW1iZXJzLCBvciBjaGFuZ2luZyBrZXlib2FyZCBzaG9ydGN1dFxuICoga2V5cykuIEVpdGhlciBjaGFuZ2UgdGhlIGRlZmF1bHQgb3B0aW9ucyBieSBzZXR0aW5nIFlBU1FFLmRlZmF1bHRzLCBvciBieVxuICogcGFzc2luZyB5b3VyIG93biBvcHRpb25zIGFzIHNlY29uZCBhcmd1bWVudCB0byB0aGUgWUFTUUUgY29uc3RydWN0b3JcbiAqIFxuICogQGF0dHJpYnV0ZVxuICogQGF0dHJpYnV0ZSBZQVNRRS5kZWZhdWx0c1xuICovXG5yb290LmRlZmF1bHRzID0gJC5leHRlbmQocm9vdC5kZWZhdWx0cywge1xuXHRtb2RlIDogXCJzcGFycWwxMVwiLFxuXHQvKipcblx0ICogUXVlcnkgc3RyaW5nXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgdmFsdWVcblx0ICogQHR5cGUgU3RyaW5nXG5cdCAqIEBkZWZhdWx0IFwiU0VMRUNUICogV0hFUkUge1xcbiAgP3N1YiA/cHJlZCA/b2JqIC5cXG59IFxcbkxJTUlUIDEwXCJcblx0ICovXG5cdHZhbHVlIDogXCJTRUxFQ1QgKiBXSEVSRSB7XFxuICA/c3ViID9wcmVkID9vYmogLlxcbn0gXFxuTElNSVQgMTBcIixcblx0aGlnaGxpZ2h0U2VsZWN0aW9uTWF0Y2hlcyA6IHtcblx0XHRzaG93VG9rZW4gOiAvXFx3L1xuXHR9LFxuXHR0YWJNb2RlIDogXCJpbmRlbnRcIixcblx0bGluZU51bWJlcnMgOiB0cnVlLFxuXHRndXR0ZXJzIDogWyBcImd1dHRlckVycm9yQmFyXCIsIFwiQ29kZU1pcnJvci1saW5lbnVtYmVyc1wiIF0sXG5cdG1hdGNoQnJhY2tldHMgOiB0cnVlLFxuXHRmaXhlZEd1dHRlciA6IHRydWUsXG5cdHN5bnRheEVycm9yQ2hlY2s6IHRydWUsXG5cdC8qKlxuXHQgKiBFeHRyYSBzaG9ydGN1dCBrZXlzLiBDaGVjayB0aGUgQ29kZU1pcnJvciBtYW51YWwgb24gaG93IHRvIGFkZCB5b3VyIG93blxuXHQgKiBcblx0ICogQHByb3BlcnR5IGV4dHJhS2V5c1xuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdGV4dHJhS2V5cyA6IHtcblx0XHRcIkN0cmwtU3BhY2VcIiA6IHJvb3QuYXV0b0NvbXBsZXRlLFxuXHRcdFwiQ21kLVNwYWNlXCIgOiByb290LmF1dG9Db21wbGV0ZSxcblx0XHRcIkN0cmwtRFwiIDogcm9vdC5kZWxldGVMaW5lLFxuXHRcdFwiQ3RybC1LXCIgOiByb290LmRlbGV0ZUxpbmUsXG5cdFx0XCJDbWQtRFwiIDogcm9vdC5kZWxldGVMaW5lLFxuXHRcdFwiQ21kLUtcIiA6IHJvb3QuZGVsZXRlTGluZSxcblx0XHRcIkN0cmwtL1wiIDogcm9vdC5jb21tZW50TGluZXMsXG5cdFx0XCJDbWQtL1wiIDogcm9vdC5jb21tZW50TGluZXMsXG5cdFx0XCJDdHJsLUFsdC1Eb3duXCIgOiByb290LmNvcHlMaW5lRG93bixcblx0XHRcIkN0cmwtQWx0LVVwXCIgOiByb290LmNvcHlMaW5lVXAsXG5cdFx0XCJDbWQtQWx0LURvd25cIiA6IHJvb3QuY29weUxpbmVEb3duLFxuXHRcdFwiQ21kLUFsdC1VcFwiIDogcm9vdC5jb3B5TGluZVVwLFxuXHRcdFwiU2hpZnQtQ3RybC1GXCIgOiByb290LmRvQXV0b0Zvcm1hdCxcblx0XHRcIlNoaWZ0LUNtZC1GXCIgOiByb290LmRvQXV0b0Zvcm1hdCxcblx0XHRcIkN0cmwtXVwiIDogcm9vdC5pbmRlbnRNb3JlLFxuXHRcdFwiQ21kLV1cIiA6IHJvb3QuaW5kZW50TW9yZSxcblx0XHRcIkN0cmwtW1wiIDogcm9vdC5pbmRlbnRMZXNzLFxuXHRcdFwiQ21kLVtcIiA6IHJvb3QuaW5kZW50TGVzcyxcblx0XHRcIkN0cmwtU1wiIDogcm9vdC5zdG9yZVF1ZXJ5LFxuXHRcdFwiQ21kLVNcIiA6IHJvb3Quc3RvcmVRdWVyeSxcblx0XHRcIkN0cmwtRW50ZXJcIiA6IHJvb3QuZXhlY3V0ZVF1ZXJ5LFxuXHRcdFwiQ21kLUVudGVyXCIgOiByb290LmV4ZWN1dGVRdWVyeVxuXHR9LFxuXHRjdXJzb3JIZWlnaHQgOiAwLjksXG5cblx0Ly8gbm9uIENvZGVNaXJyb3Igb3B0aW9uc1xuXG5cdFxuXHQvKipcblx0ICogU2hvdyBhIGJ1dHRvbiB3aXRoIHdoaWNoIHVzZXJzIGNhbiBjcmVhdGUgYSBsaW5rIHRvIHRoaXMgcXVlcnkuIFNldCB0aGlzIHZhbHVlIHRvIG51bGwgdG8gZGlzYWJsZSB0aGlzIGZ1bmN0aW9uYWxpdHkuXG5cdCAqIEJ5IGRlZmF1bHQsIHRoaXMgZmVhdHVyZSBpcyBlbmFibGVkLCBhbmQgdGhlIG9ubHkgdGhlIHF1ZXJ5IHZhbHVlIGlzIGFwcGVuZGVkIHRvIHRoZSBsaW5rLlxuXHQgKiBwcy4gVGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIGFuIG9iamVjdCB3aGljaCBpcyBwYXJzZWFibGUgYnkgalF1ZXJ5LnBhcmFtIChodHRwOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LnBhcmFtLylcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBjcmVhdGVTaGFyZUxpbmtcblx0ICogQHR5cGUgZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgWUFTUUUuY3JlYXRlU2hhcmVMaW5rXG5cdCAqL1xuXHRjcmVhdGVTaGFyZUxpbms6IHJvb3QuY3JlYXRlU2hhcmVMaW5rLFxuXHRcblx0LyoqXG5cdCAqIENvbnN1bWUgbGlua3Mgc2hhcmVkIGJ5IG90aGVycywgYnkgY2hlY2tpbmcgdGhlIHVybCBmb3IgYXJndW1lbnRzIGNvbWluZyBmcm9tIGEgcXVlcnkgbGluay4gRGVmYXVsdHMgYnkgb25seSBjaGVja2luZyB0aGUgJ3F1ZXJ5PScgYXJndW1lbnQgaW4gdGhlIHVybFxuXHQgKiBcblx0ICogQHByb3BlcnR5IGNvbnN1bWVTaGFyZUxpbmtcblx0ICogQHR5cGUgZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgWUFTUUUuY29uc3VtZVNoYXJlTGlua1xuXHQgKi9cblx0Y29uc3VtZVNoYXJlTGluazogcm9vdC5jb25zdW1lU2hhcmVMaW5rLFxuXHRcblx0XG5cdFxuXHRcblx0LyoqXG5cdCAqIENoYW5nZSBwZXJzaXN0ZW5jeSBzZXR0aW5ncyBmb3IgdGhlIFlBU1FFIHF1ZXJ5IHZhbHVlLiBTZXR0aW5nIHRoZSB2YWx1ZXNcblx0ICogdG8gbnVsbCwgd2lsbCBkaXNhYmxlIHBlcnNpc3RhbmN5OiBub3RoaW5nIGlzIHN0b3JlZCBiZXR3ZWVuIGJyb3dzZXJcblx0ICogc2Vzc2lvbnMgU2V0dGluZyB0aGUgdmFsdWVzIHRvIGEgc3RyaW5nIChvciBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYVxuXHQgKiBzdHJpbmcpLCB3aWxsIHN0b3JlIHRoZSBxdWVyeSBpbiBsb2NhbHN0b3JhZ2UgdXNpbmcgdGhlIHNwZWNpZmllZCBzdHJpbmcuXG5cdCAqIEJ5IGRlZmF1bHQsIHRoZSBJRCBpcyBkeW5hbWljYWxseSBnZW5lcmF0ZWQgdXNpbmcgdGhlIGRldGVybWluZUlEXG5cdCAqIGZ1bmN0aW9uLCB0byBhdm9pZCBjb2xsaXNzaW9ucyB3aGVuIHVzaW5nIG11bHRpcGxlIFlBU1FFIGl0ZW1zIG9uIG9uZVxuXHQgKiBwYWdlXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgcGVyc2lzdGVudFxuXHQgKiBAdHlwZSBmdW5jdGlvbnxzdHJpbmdcblx0ICovXG5cdHBlcnNpc3RlbnQgOiBmdW5jdGlvbihjbSkge1xuXHRcdHJldHVybiBcInF1ZXJ5VmFsX1wiICsgcm9vdC5kZXRlcm1pbmVJZChjbSk7XG5cdH0sXG5cblx0XG5cdC8qKlxuXHQgKiBTZXR0aW5ncyBmb3IgcXVlcnlpbmcgc3BhcnFsIGVuZHBvaW50c1xuXHQgKiBcblx0ICogQHByb3BlcnR5IHNwYXJxbFxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdHNwYXJxbCA6IHtcblx0XHQvKipcblx0XHQgKiBTaG93IGEgcXVlcnkgYnV0dG9uLiBZb3UgZG9uJ3QgbGlrZSBpdD8gVGhlbiBkaXNhYmxlIHRoaXMgc2V0dGluZywgYW5kIGNyZWF0ZSB5b3VyIGJ1dHRvbiB3aGljaCBjYWxscyB0aGUgcXVlcnkoKSBmdW5jdGlvbiBvZiB0aGUgeWFzcWUgZG9jdW1lbnRcblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLnNob3dRdWVyeUJ1dHRvblxuXHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdCAqL1xuXHRcdHNob3dRdWVyeUJ1dHRvbjogZmFsc2UsXG5cdFx0XG5cdFx0LyoqZlxuXHRcdCAqIEVuZHBvaW50IHRvIHF1ZXJ5XG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5lbmRwb2ludFxuXHRcdCAqIEB0eXBlIFN0cmluZ3xmdW5jdGlvblxuXHRcdCAqIEBkZWZhdWx0IFwiaHR0cDovL2RicGVkaWEub3JnL3NwYXJxbFwiXG5cdFx0ICovXG5cdFx0ZW5kcG9pbnQgOiBcImh0dHA6Ly9kYnBlZGlhLm9yZy9zcGFycWxcIixcblx0XHQvKipcblx0XHQgKiBSZXF1ZXN0IG1ldGhvZCB2aWEgd2hpY2ggdG8gYWNjZXNzIFNQQVJRTCBlbmRwb2ludFxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwucmVxdWVzdE1ldGhvZFxuXHRcdCAqIEB0eXBlIFN0cmluZ3xmdW5jdGlvblxuXHRcdCAqIEBkZWZhdWx0IFwiUE9TVFwiXG5cdFx0ICovXG5cdFx0cmVxdWVzdE1ldGhvZCA6IFwiUE9TVFwiLFxuXHRcdC8qKlxuXHRcdCAqIFF1ZXJ5IGFjY2VwdCBoZWFkZXJcblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLmFjY2VwdEhlYWRlclxuXHRcdCAqIEB0eXBlIFN0cmluZ3xmdW5jdGlvblxuXHRcdCAqIEBkZWZhdWx0IFlBU1FFLmdldEFjY2VwdEhlYWRlclxuXHRcdCAqL1xuXHRcdGFjY2VwdEhlYWRlciA6IHJvb3QuZ2V0QWNjZXB0SGVhZGVyLFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIE5hbWVkIGdyYXBocyB0byBxdWVyeS5cblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLm5hbWVkR3JhcGhzXG5cdFx0ICogQHR5cGUgYXJyYXlcblx0XHQgKiBAZGVmYXVsdCBbXVxuXHRcdCAqL1xuXHRcdG5hbWVkR3JhcGhzIDogW10sXG5cdFx0LyoqXG5cdFx0ICogRGVmYXVsdCBncmFwaHMgdG8gcXVlcnkuXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5kZWZhdWx0R3JhcGhzXG5cdFx0ICogQHR5cGUgYXJyYXlcblx0XHQgKiBAZGVmYXVsdCBbXVxuXHRcdCAqL1xuXHRcdGRlZmF1bHRHcmFwaHMgOiBbXSxcblxuXHRcdC8qKlxuXHRcdCAqIEFkZGl0aW9uYWwgcmVxdWVzdCBhcmd1bWVudHMuIEFkZCB0aGVtIGluIHRoZSBmb3JtOiB7bmFtZTogXCJuYW1lXCIsIHZhbHVlOiBcInZhbHVlXCJ9XG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5hcmdzXG5cdFx0ICogQHR5cGUgYXJyYXlcblx0XHQgKiBAZGVmYXVsdCBbXVxuXHRcdCAqL1xuXHRcdGFyZ3MgOiBbXSxcblxuXHRcdC8qKlxuXHRcdCAqIEFkZGl0aW9uYWwgcmVxdWVzdCBoZWFkZXJzXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5oZWFkZXJzXG5cdFx0ICogQHR5cGUgYXJyYXlcblx0XHQgKiBAZGVmYXVsdCB7fVxuXHRcdCAqL1xuXHRcdGhlYWRlcnMgOiB7fSxcblxuXHRcdC8qKlxuXHRcdCAqIFNldCBvZiBhamF4IGhhbmRsZXJzXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5oYW5kbGVyc1xuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdGhhbmRsZXJzIDoge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBTZWUgaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC8gZm9yIG1vcmUgaW5mb3JtYXRpb24gb25cblx0XHRcdCAqIHRoZXNlIGhhbmRsZXJzLCBhbmQgdGhlaXIgYXJndW1lbnRzLlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLmhhbmRsZXJzLmJlZm9yZVNlbmRcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHQgKi9cblx0XHRcdGJlZm9yZVNlbmQgOiBudWxsLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBTZWUgaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC8gZm9yIG1vcmUgaW5mb3JtYXRpb24gb25cblx0XHRcdCAqIHRoZXNlIGhhbmRsZXJzLCBhbmQgdGhlaXIgYXJndW1lbnRzLlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLmhhbmRsZXJzLmNvbXBsZXRlXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRjb21wbGV0ZSA6IG51bGwsXG5cdFx0XHQvKipcblx0XHRcdCAqIFNlZSBodHRwczovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4LyBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvblxuXHRcdFx0ICogdGhlc2UgaGFuZGxlcnMsIGFuZCB0aGVpciBhcmd1bWVudHMuXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuaGFuZGxlcnMuZXJyb3Jcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHQgKi9cblx0XHRcdGVycm9yIDogbnVsbCxcblx0XHRcdC8qKlxuXHRcdFx0ICogU2VlIGh0dHBzOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uXG5cdFx0XHQgKiB0aGVzZSBoYW5kbGVycywgYW5kIHRoZWlyIGFyZ3VtZW50cy5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IHNwYXJxbC5oYW5kbGVycy5zdWNjZXNzXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRzdWNjZXNzIDogbnVsbFxuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFR5cGVzIG9mIGNvbXBsZXRpb25zLiBTZXR0aW5nIHRoZSB2YWx1ZSB0byBudWxsLCB3aWxsIGRpc2FibGVcblx0ICogYXV0b2NvbXBsZXRpb24gZm9yIHRoaXMgcGFydGljdWxhciB0eXBlLiBCeSBkZWZhdWx0LCBvbmx5IHByZWZpeFxuXHQgKiBhdXRvY29tcGxldGlvbnMgYXJlIGZldGNoZWQgZnJvbSBwcmVmaXguY2MsIGFuZCBwcm9wZXJ0eSBhbmQgY2xhc3Ncblx0ICogYXV0b2NvbXBsZXRpb25zIGFyZSBmZXRjaGVkIGZyb20gdGhlIExpbmtlZCBPcGVuIFZvY2FidWxhcmllcyBBUElcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnNcblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRhdXRvY29tcGxldGlvbnMgOiB7XG5cdFx0LyoqXG5cdFx0ICogUHJlZml4IGF1dG9jb21wbGV0aW9uIHNldHRpbmdzXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlc1xuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdHByZWZpeGVzIDoge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgaW4gYSBwcm9wZXIgcG9zaXRpb24gZm9yIHRoaXMgYXV0b2NvbXBsZXRpb24uXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuaXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSB5YXNxZSBkb2Ncblx0XHRcdCAqIEByZXR1cm4gYm9vbGVhblxuXHRcdFx0ICovXG5cdFx0XHRpc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uIDogZnVuY3Rpb24oY20pIHtcblx0XHRcdFx0dmFyIGN1ciA9IGNtLmdldEN1cnNvcigpLCB0b2tlbiA9IGNtLmdldFRva2VuQXQoY3VyKTtcblxuXHRcdFx0XHQvLyBub3QgYXQgZW5kIG9mIGxpbmVcblx0XHRcdFx0aWYgKGNtLmdldExpbmUoY3VyLmxpbmUpLmxlbmd0aCA+IGN1ci5jaClcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdFx0aWYgKHRva2VuLnR5cGUgIT0gXCJ3c1wiKSB7XG5cdFx0XHRcdFx0Ly8gd2Ugd2FudCB0byBjb21wbGV0ZSB0b2tlbiwgZS5nLiB3aGVuIHRoZSBwcmVmaXggc3RhcnRzIHdpdGggYW4gYVxuXHRcdFx0XHRcdC8vICh0cmVhdGVkIGFzIGEgdG9rZW4gaW4gaXRzZWxmLi4pXG5cdFx0XHRcdFx0Ly8gYnV0IHdlIHRvIGF2b2lkIGluY2x1ZGluZyB0aGUgUFJFRklYIHRhZy4gU28gd2hlbiB3ZSBoYXZlIGp1c3Rcblx0XHRcdFx0XHQvLyB0eXBlZCBhIHNwYWNlIGFmdGVyIHRoZSBwcmVmaXggdGFnLCBkb24ndCBnZXQgdGhlIGNvbXBsZXRlIHRva2VuXG5cdFx0XHRcdFx0dG9rZW4gPSByb290LmdldENvbXBsZXRlVG9rZW4oY20pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gd2Ugc2hvdWxkbnQgYmUgYXQgdGhlIHVyaSBwYXJ0IHRoZSBwcmVmaXggZGVjbGFyYXRpb25cblx0XHRcdFx0Ly8gYWxzbyBjaGVjayB3aGV0aGVyIGN1cnJlbnQgdG9rZW4gaXNudCAnYScgKHRoYXQgbWFrZXMgY29kZW1pcnJvclxuXHRcdFx0XHQvLyB0aGluZyBhIG5hbWVzcGFjZSBpcyBhIHBvc3NpYmxlY3VycmVudFxuXHRcdFx0XHRpZiAoIXRva2VuLnN0cmluZy5pbmRleE9mKFwiYVwiKSA9PSAwXG5cdFx0XHRcdFx0XHQmJiAkLmluQXJyYXkoXCJQTkFNRV9OU1wiLCB0b2tlbi5zdGF0ZS5wb3NzaWJsZUN1cnJlbnQpID09IC0xKVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFx0XHQvLyBGaXJzdCB0b2tlbiBvZiBsaW5lIG5lZWRzIHRvIGJlIFBSRUZJWCxcblx0XHRcdFx0Ly8gdGhlcmUgc2hvdWxkIGJlIG5vIHRyYWlsaW5nIHRleHQgKG90aGVyd2lzZSwgdGV4dCBpcyB3cm9uZ2x5IGluc2VydGVkXG5cdFx0XHRcdC8vIGluIGJldHdlZW4pXG5cdFx0XHRcdHZhciBmaXJzdFRva2VuID0gZ2V0TmV4dE5vbldzVG9rZW4oY20sIGN1ci5saW5lKTtcblx0XHRcdFx0aWYgKGZpcnN0VG9rZW4gPT0gbnVsbCB8fCBmaXJzdFRva2VuLnN0cmluZy50b1VwcGVyQ2FzZSgpICE9IFwiUFJFRklYXCIpXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0sXG5cdFx0XHQgICAgXG5cdFx0XHQvKipcblx0XHRcdCAqIEdldCB0aGUgYXV0b2NvbXBsZXRpb25zLiBFaXRoZXIgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFuXG5cdFx0XHQgKiBhcnJheSwgb3IgYW4gYWN0dWFsIGFycmF5LiBUaGUgYXJyYXkgc2hvdWxkIGJlIGluIHRoZSBmb3JtIFtcInJkZjogPGh0dHA6Ly8uLi4uPlwiXVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByZWZpeGVzLmdldFxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb258YXJyYXlcblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R8c3RyaW5nfSBXaGVuIGJ1bGsgaXMgZGlzYWJsZWQsIHVzZSB0aGlzIHRva2VuIHRvIGF1dG9jb21wbGV0ZVxuXHRcdFx0ICogQHBhcmFtIGNvbXBsZXRpb25UeXBlIHtzdHJpbmd9IHdoYXQgdHlwZSBvZiBhdXRvY29tcGxldGlvbiB3ZSB0cnkgdG8gYXR0ZW1wdC4gQ2xhc3NlcywgcHJvcGVydGllcywgb3IgcHJlZml4ZXMpXG5cdFx0XHQgKiBAcGFyYW0gY2FsbGJhY2sge2Z1bmN0aW9ufSBJbiBjYXNlIGFzeW5jIGlzIGVuYWJsZWQsIHVzZSB0aGlzIGNhbGxiYWNrXG5cdFx0XHQgKiBAZGVmYXVsdCBmdW5jdGlvbiAoWUFTUUUuZmV0Y2hGcm9tUHJlZml4Q2MpXG5cdFx0XHQgKi9cblx0XHRcdGdldCA6IHJvb3QuZmV0Y2hGcm9tUHJlZml4Q2MsXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogUHJlcHJvY2Vzc2VzIHRoZSBjb2RlbWlycm9yIHRva2VuIGJlZm9yZSBtYXRjaGluZyBpdCB3aXRoIG91ciBhdXRvY29tcGxldGlvbnMgbGlzdC5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIGF1dG9jb21wbGV0aW5nIHByZWZpeGVkIHJlc291cmNlcyB3aGVuIHlvdXIgYXV0b2NvbXBsZXRpb24gbGlzdCBjb250YWlucyBvbmx5IGZ1bGwtbGVuZ3RoIFVSSXNcblx0XHRcdCAqIEkuZS4sIGZvYWY6bmFtZSAtPiBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLnByZVByb2Nlc3NUb2tlblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R9IFRoZSBDb2RlTWlycm9yIHRva2VuLCBpbmNsdWRpbmcgdGhlIHBvc2l0aW9uIG9mIHRoaXMgdG9rZW4gaW4gdGhlIHF1ZXJ5LCBhcyB3ZWxsIGFzIHRoZSBhY3R1YWwgc3RyaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHRva2VuIHtvYmplY3R9IFJldHVybiB0aGUgc2FtZSB0b2tlbiAocG9zc2libHkgd2l0aCBtb3JlIGRhdGEgYWRkZWQgdG8gaXQsIHdoaWNoIHlvdSBjYW4gdXNlIGluIHRoZSBwb3N0UHJvY2Vzc2luZyBzdGVwKVxuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb25cblx0XHRcdCAqL1xuXHRcdFx0cHJlUHJvY2Vzc1Rva2VuOiBwcmVwcm9jZXNzUHJlZml4VG9rZW5Gb3JDb21wbGV0aW9uLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQb3N0cHJvY2Vzc2VzIHRoZSBhdXRvY29tcGxldGlvbiBzdWdnZXN0aW9uLlxuXHRcdFx0ICogVXNlIHRoaXMgZm9yIGUuZy4gcmV0dXJuaW5nIGEgcHJlZml4ZWQgVVJJIGJhc2VkIG9uIGEgZnVsbC1sZW5ndGggVVJJIHN1Z2dlc3Rpb25cblx0XHRcdCAqIEkuZS4sIGh0dHA6Ly94bWxucy5jb20vZm9hZi8wLjEvbmFtZSAtPiBmb2FmOm5hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLnBvc3RQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHBhcmFtIHN1Z2dlc3Rpb24ge3N0cmluZ30gVGhlIHN1Z2dlc3Rpb24gd2hpY2ggeW91IGFyZSBwb3N0IHByb2Nlc3Npbmdcblx0XHRcdCAqIEByZXR1cm4gcG9zdC1wcm9jZXNzZWQgc3VnZ2VzdGlvbiB7c3RyaW5nfVxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRwb3N0UHJvY2Vzc1Rva2VuOiBudWxsLFxuXHRcdFx0XG5cdFx0XHQvKipcblx0XHRcdCAqIFRoZSBnZXQgZnVuY3Rpb24gaXMgYXN5bmNocm9ub3VzXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuYXN5bmNcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGFzeW5jIDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIFVzZSBidWxrIGxvYWRpbmcgb2YgcHJlZml4ZXM6IGFsbCBwcmVmaXhlcyBhcmUgcmV0cmlldmVkIG9uTG9hZFxuXHRcdFx0ICogdXNpbmcgdGhlIGdldCgpIGZ1bmN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBkaXNhYmxlIGJ1bGsgbG9hZGluZywgdG9cblx0XHRcdCAqIGNhbGwgdGhlIGdldCgpIGZ1bmN0aW9uIHdoZW5ldmVyIGEgdG9rZW4gbmVlZHMgYXV0b2NvbXBsZXRpb24gKGluXG5cdFx0XHQgKiB0aGlzIGNhc2UsIHRoZSBjb21wbGV0aW9uIHRva2VuIGlzIHBhc3NlZCBvbiB0byB0aGUgZ2V0KClcblx0XHRcdCAqIGZ1bmN0aW9uKSB3aGVuZXZlciB5b3UgaGF2ZSBhbiBhdXRvY29tcGxldGlvbiBsaXN0IHRoYXQgaXMgc3RhdGljLCBhbmQgdGhhdCBlYXNpbHlcblx0XHRcdCAqIGZpdHMgaW4gbWVtb3J5LCB3ZSBhZHZpY2UgeW91IHRvIGVuYWJsZSBidWxrIGZvciBwZXJmb3JtYW5jZVxuXHRcdFx0ICogcmVhc29ucyAoZXNwZWNpYWxseSBhcyB3ZSBzdG9yZSB0aGUgYXV0b2NvbXBsZXRpb25zIGluIGEgdHJpZSlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlcy5idWxrXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCB0cnVlXG5cdFx0XHQgKi9cblx0XHRcdGJ1bGsgOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvLXNob3cgdGhlIGF1dG9jb21wbGV0aW9uIGRpYWxvZy4gRGlzYWJsaW5nIHRoaXMgcmVxdWlyZXMgdGhlXG5cdFx0XHQgKiB1c2VyIHRvIHByZXNzIFtjdHJsfGNtZF0tc3BhY2UgdG8gc3VtbW9uIHRoZSBkaWFsb2cuIE5vdGU6IHRoaXNcblx0XHRcdCAqIG9ubHkgd29ya3Mgd2hlbiBjb21wbGV0aW9ucyBhcmUgbm90IGZldGNoZWQgYXN5bmNocm9ub3VzbHlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlcy5hdXRvU2hvd1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgdHJ1ZVxuXHRcdFx0ICovXG5cdFx0XHRhdXRvU2hvdyA6IHRydWUsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG8tYWRkIHByZWZpeCBkZWNsYXJhdGlvbjogd2hlbiBwcmVmaXhlcyBhcmUgbG9hZGVkIGluIG1lbW9yeVxuXHRcdFx0ICogKGJ1bGs6IHRydWUpLCBhbmQgdGhlIHVzZXIgdHlwZXMgZS5nLiAncmRmOicgaW4gYSB0cmlwbGUgcGF0dGVybixcblx0XHRcdCAqIHRoZSBlZGl0b3IgYXV0b21hdGljYWxseSBhZGQgdGhpcyBwYXJ0aWN1bGFyIFBSRUZJWCBkZWZpbml0aW9uIHRvXG5cdFx0XHQgKiB0aGUgcXVlcnlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlcy5hdXRvQWRkRGVjbGFyYXRpb25cblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IHRydWVcblx0XHRcdCAqL1xuXHRcdFx0YXV0b0FkZERlY2xhcmF0aW9uIDogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQXV0b21hdGljYWxseSBzdG9yZSBhdXRvY29tcGxldGlvbnMgaW4gbG9jYWxzdG9yYWdlLiBUaGlzIGlzXG5cdFx0XHQgKiBwYXJ0aWN1bGFybHkgdXNlZnVsIHdoZW4gdGhlIGdldCgpIGZ1bmN0aW9uIGlzIGFuIGV4cGVuc2l2ZSBhamF4XG5cdFx0XHQgKiBjYWxsLiBBdXRvY29tcGxldGlvbnMgYXJlIHN0b3JlZCBmb3IgYSBwZXJpb2Qgb2YgYSBtb250aC4gU2V0XG5cdFx0XHQgKiB0aGlzIHByb3BlcnR5IHRvIG51bGwgKG9yIHJlbW92ZSBpdCksIHRvIGRpc2FibGUgdGhlIHVzZSBvZlxuXHRcdFx0ICogbG9jYWxzdG9yYWdlLiBPdGhlcndpc2UsIHNldCBhIHN0cmluZyB2YWx1ZSAob3IgYSBmdW5jdGlvblxuXHRcdFx0ICogcmV0dXJuaW5nIGEgc3RyaW5nIHZhbCksIHJldHVybmluZyB0aGUga2V5IGluIHdoaWNoIHRvIHN0b3JlIHRoZVxuXHRcdFx0ICogZGF0YSBOb3RlOiB0aGlzIGZlYXR1cmUgb25seSB3b3JrcyBjb21iaW5lZCB3aXRoIGNvbXBsZXRpb25zXG5cdFx0XHQgKiBsb2FkZWQgaW4gbWVtb3J5IChpLmUuIGJ1bGs6IHRydWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMucGVyc2lzdGVudFxuXHRcdFx0ICogQHR5cGUgc3RyaW5nfGZ1bmN0aW9uXG5cdFx0XHQgKiBAZGVmYXVsdCBcInByZWZpeGVzXCJcblx0XHRcdCAqL1xuXHRcdFx0cGVyc2lzdGVudCA6IFwicHJlZml4ZXNcIixcblx0XHRcdC8qKlxuXHRcdFx0ICogQSBzZXQgb2YgaGFuZGxlcnMuIE1vc3QsIHRha2VuIGZyb20gdGhlIENvZGVNaXJyb3Igc2hvd2hpbnRcblx0XHRcdCAqIHBsdWdpbjogaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlcy5oYW5kbGVyc1xuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdGhhbmRsZXJzIDoge1xuXHRcdFx0XHRcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIEZpcmVzIHdoZW4gYSBjb2RlbWlycm9yIGNoYW5nZSBvY2N1cnMgaW4gYSBwb3NpdGlvbiB3aGVyZSB3ZVxuXHRcdFx0XHQgKiBjYW4gc2hvdyB0aGlzIHBhcnRpY3VsYXIgdHlwZSBvZiBhdXRvY29tcGxldGlvblxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0dmFsaWRQb3NpdGlvbiA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGaXJlcyB3aGVuIGEgY29kZW1pcnJvciBjaGFuZ2Ugb2NjdXJzIGluIGEgcG9zaXRpb24gd2hlcmUgd2Vcblx0XHRcdFx0ICogY2FuIC1ub3QtIHNob3cgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb25cblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5pbnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0aW52YWxpZFBvc2l0aW9uIDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnNob3dIaW50XG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHNob3duIDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnNlbGVjdFxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRzZWxlY3QgOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMucGlja1xuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRwaWNrIDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLmNsb3NlXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdGNsb3NlIDogbnVsbCxcblx0XHRcdH1cblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqIFByb3BlcnR5IGF1dG9jb21wbGV0aW9uIHNldHRpbmdzXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzXG5cdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0ICovXG5cdFx0cHJvcGVydGllcyA6IHtcblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgd2hldGhlciB0aGUgY3Vyc29yIGlzIGluIGEgcHJvcGVyIHBvc2l0aW9uIGZvciB0aGlzIGF1dG9jb21wbGV0aW9uLlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSB5YXNxZSBkb2Ncblx0XHRcdCAqIEByZXR1cm4gYm9vbGVhblxuXHRcdFx0ICovXG5cdFx0XHRpc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uIDogZnVuY3Rpb24oY20pIHtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciB0b2tlbiA9IHJvb3QuZ2V0Q29tcGxldGVUb2tlbihjbSk7XG5cdFx0XHRcdGlmICh0b2tlbi5zdHJpbmcubGVuZ3RoID09IDApIFxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTsgLy93ZSB3YW50IC1zb21ldGhpbmctIHRvIGF1dG9jb21wbGV0ZVxuXHRcdFx0XHRpZiAodG9rZW4uc3RyaW5nLmluZGV4T2YoXCI/XCIpID09IDApXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlOyAvLyB3ZSBhcmUgdHlwaW5nIGEgdmFyXG5cdFx0XHRcdGlmICgkLmluQXJyYXkoXCJhXCIsIHRva2VuLnN0YXRlLnBvc3NpYmxlQ3VycmVudCkgPj0gMClcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTsvLyBwcmVkaWNhdGUgcG9zXG5cdFx0XHRcdHZhciBjdXIgPSBjbS5nZXRDdXJzb3IoKTtcblx0XHRcdFx0dmFyIHByZXZpb3VzVG9rZW4gPSBnZXRQcmV2aW91c05vbldzVG9rZW4oY20sIGN1ci5saW5lLCB0b2tlbik7XG5cdFx0XHRcdGlmIChwcmV2aW91c1Rva2VuLnN0cmluZyA9PSBcInJkZnM6c3ViUHJvcGVydHlPZlwiKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHRcdC8vIGhtbSwgd2Ugd291bGQgbGlrZSAtYmV0dGVyLSBjaGVja3MgaGVyZSwgZS5nLiBjaGVja2luZyB3aGV0aGVyIHdlIGFyZVxuXHRcdFx0XHQvLyBpbiBhIHN1YmplY3QsIGFuZCB3aGV0aGVyIG5leHQgaXRlbSBpcyBhIHJkZnM6c3VicHJvcGVydHlvZi5cblx0XHRcdFx0Ly8gZGlmZmljdWx0IHRob3VnaC4uLiB0aGUgZ3JhbW1hciB3ZSB1c2UgaXMgdW5yZWxpYWJsZSB3aGVuIHRoZSBxdWVyeVxuXHRcdFx0XHQvLyBpcyBpbnZhbGlkIChpLmUuIGR1cmluZyB0eXBpbmcpLCBhbmQgb2Z0ZW4gdGhlIHByZWRpY2F0ZSBpcyBub3QgdHlwZWRcblx0XHRcdFx0Ly8geWV0LCB3aGVuIHdlIGFyZSBidXN5IHdyaXRpbmcgdGhlIHN1YmplY3QuLi5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogR2V0IHRoZSBhdXRvY29tcGxldGlvbnMuIEVpdGhlciBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW5cblx0XHRcdCAqIGFycmF5LCBvciBhbiBhY3R1YWwgYXJyYXkuIFRoZSBhcnJheSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gW1wiaHR0cDovLy4uLlwiLC4uLi5dXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5nZXRcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9ufGFycmF5XG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fHN0cmluZ30gV2hlbiBidWxrIGlzIGRpc2FibGVkLCB1c2UgdGhpcyB0b2tlbiB0byBhdXRvY29tcGxldGVcblx0XHRcdCAqIEBwYXJhbSBjb21wbGV0aW9uVHlwZSB7c3RyaW5nfSB3aGF0IHR5cGUgb2YgYXV0b2NvbXBsZXRpb24gd2UgdHJ5IHRvIGF0dGVtcHQuIENsYXNzZXMsIHByb3BlcnRpZXMsIG9yIHByZWZpeGVzKVxuXHRcdFx0ICogQHBhcmFtIGNhbGxiYWNrIHtmdW5jdGlvbn0gSW4gY2FzZSBhc3luYyBpcyBlbmFibGVkLCB1c2UgdGhpcyBjYWxsYmFja1xuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb24gKFlBU1FFLmZldGNoRnJvbUxvdilcblx0XHRcdCAqL1xuXHRcdFx0Z2V0IDogcm9vdC5mZXRjaEZyb21Mb3YsXG5cdFx0XHQvKipcblx0XHRcdCAqIFByZXByb2Nlc3NlcyB0aGUgY29kZW1pcnJvciB0b2tlbiBiZWZvcmUgbWF0Y2hpbmcgaXQgd2l0aCBvdXIgYXV0b2NvbXBsZXRpb25zIGxpc3QuXG5cdFx0XHQgKiBVc2UgdGhpcyBmb3IgZS5nLiBhdXRvY29tcGxldGluZyBwcmVmaXhlZCByZXNvdXJjZXMgd2hlbiB5b3VyIGF1dG9jb21wbGV0aW9uIGxpc3QgY29udGFpbnMgb25seSBmdWxsLWxlbmd0aCBVUklzXG5cdFx0XHQgKiBJLmUuLCBmb2FmOm5hbWUgLT4gaHR0cDovL3htbG5zLmNvbS9mb2FmLzAuMS9uYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5wcmVQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHJldHVybiB0b2tlbiB7b2JqZWN0fSBSZXR1cm4gdGhlIHNhbWUgdG9rZW4gKHBvc3NpYmx5IHdpdGggbW9yZSBkYXRhIGFkZGVkIHRvIGl0LCB3aGljaCB5b3UgY2FuIHVzZSBpbiB0aGUgcG9zdFByb2Nlc3Npbmcgc3RlcClcblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uXG5cdFx0XHQgKi9cblx0XHRcdHByZVByb2Nlc3NUb2tlbjogcHJlcHJvY2Vzc1Jlc291cmNlVG9rZW5Gb3JDb21wbGV0aW9uLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQb3N0cHJvY2Vzc2VzIHRoZSBhdXRvY29tcGxldGlvbiBzdWdnZXN0aW9uLlxuXHRcdFx0ICogVXNlIHRoaXMgZm9yIGUuZy4gcmV0dXJuaW5nIGEgcHJlZml4ZWQgVVJJIGJhc2VkIG9uIGEgZnVsbC1sZW5ndGggVVJJIHN1Z2dlc3Rpb25cblx0XHRcdCAqIEkuZS4sIGh0dHA6Ly94bWxucy5jb20vZm9hZi8wLjEvbmFtZSAtPiBmb2FmOm5hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLnBvc3RQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHBhcmFtIHN1Z2dlc3Rpb24ge3N0cmluZ30gVGhlIHN1Z2dlc3Rpb24gd2hpY2ggeW91IGFyZSBwb3N0IHByb2Nlc3Npbmdcblx0XHRcdCAqIEByZXR1cm4gcG9zdC1wcm9jZXNzZWQgc3VnZ2VzdGlvbiB7c3RyaW5nfVxuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb25cblx0XHRcdCAqL1xuXHRcdFx0cG9zdFByb2Nlc3NUb2tlbjogcG9zdHByb2Nlc3NSZXNvdXJjZVRva2VuRm9yQ29tcGxldGlvbixcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUaGUgZ2V0IGZ1bmN0aW9uIGlzIGFzeW5jaHJvbm91c1xuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuYXN5bmNcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IHRydWVcblx0XHRcdCAqL1xuXHRcdFx0YXN5bmMgOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBVc2UgYnVsayBsb2FkaW5nIG9mIHByb3BlcnRpZXM6IGFsbCBwcm9wZXJ0aWVzIGFyZSByZXRyaWV2ZWRcblx0XHRcdCAqIG9uTG9hZCB1c2luZyB0aGUgZ2V0KCkgZnVuY3Rpb24uIEFsdGVybmF0aXZlbHksIGRpc2FibGUgYnVsa1xuXHRcdFx0ICogbG9hZGluZywgdG8gY2FsbCB0aGUgZ2V0KCkgZnVuY3Rpb24gd2hlbmV2ZXIgYSB0b2tlbiBuZWVkc1xuXHRcdFx0ICogYXV0b2NvbXBsZXRpb24gKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBsZXRpb24gdG9rZW4gaXMgcGFzc2VkIG9uXG5cdFx0XHQgKiB0byB0aGUgZ2V0KCkgZnVuY3Rpb24pIHdoZW5ldmVyIHlvdSBoYXZlIGFuIGF1dG9jb21wbGV0aW9uIGxpc3QgdGhhdCBpcyBzdGF0aWMsIGFuZCBcblx0XHRcdCAqIHRoYXQgZWFzaWx5IGZpdHMgaW4gbWVtb3J5LCB3ZSBhZHZpY2UgeW91IHRvIGVuYWJsZSBidWxrIGZvclxuXHRcdFx0ICogcGVyZm9ybWFuY2UgcmVhc29ucyAoZXNwZWNpYWxseSBhcyB3ZSBzdG9yZSB0aGUgYXV0b2NvbXBsZXRpb25zXG5cdFx0XHQgKiBpbiBhIHRyaWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5idWxrXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRidWxrIDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG8tc2hvdyB0aGUgYXV0b2NvbXBsZXRpb24gZGlhbG9nLiBEaXNhYmxpbmcgdGhpcyByZXF1aXJlcyB0aGVcblx0XHRcdCAqIHVzZXIgdG8gcHJlc3MgW2N0cmx8Y21kXS1zcGFjZSB0byBzdW1tb24gdGhlIGRpYWxvZy4gTm90ZTogdGhpc1xuXHRcdFx0ICogb25seSB3b3JrcyB3aGVuIGNvbXBsZXRpb25zIGFyZSBub3QgZmV0Y2hlZCBhc3luY2hyb25vdXNseVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuYXV0b1Nob3dcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGF1dG9TaG93IDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG9tYXRpY2FsbHkgc3RvcmUgYXV0b2NvbXBsZXRpb25zIGluIGxvY2Fsc3RvcmFnZS4gVGhpcyBpc1xuXHRcdFx0ICogcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHRoZSBnZXQoKSBmdW5jdGlvbiBpcyBhbiBleHBlbnNpdmUgYWpheFxuXHRcdFx0ICogY2FsbC4gQXV0b2NvbXBsZXRpb25zIGFyZSBzdG9yZWQgZm9yIGEgcGVyaW9kIG9mIGEgbW9udGguIFNldFxuXHRcdFx0ICogdGhpcyBwcm9wZXJ0eSB0byBudWxsIChvciByZW1vdmUgaXQpLCB0byBkaXNhYmxlIHRoZSB1c2Ugb2Zcblx0XHRcdCAqIGxvY2Fsc3RvcmFnZS4gT3RoZXJ3aXNlLCBzZXQgYSBzdHJpbmcgdmFsdWUgKG9yIGEgZnVuY3Rpb25cblx0XHRcdCAqIHJldHVybmluZyBhIHN0cmluZyB2YWwpLCByZXR1cm5pbmcgdGhlIGtleSBpbiB3aGljaCB0byBzdG9yZSB0aGVcblx0XHRcdCAqIGRhdGEgTm90ZTogdGhpcyBmZWF0dXJlIG9ubHkgd29ya3MgY29tYmluZWQgd2l0aCBjb21wbGV0aW9uc1xuXHRcdFx0ICogbG9hZGVkIGluIG1lbW9yeSAoaS5lLiBidWxrOiB0cnVlKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMucGVyc2lzdGVudFxuXHRcdFx0ICogQHR5cGUgc3RyaW5nfGZ1bmN0aW9uXG5cdFx0XHQgKiBAZGVmYXVsdCBcInByb3BlcnRpZXNcIlxuXHRcdFx0ICovXG5cdFx0XHRwZXJzaXN0ZW50IDogXCJwcm9wZXJ0aWVzXCIsXG5cdFx0XHQvKipcblx0XHRcdCAqIEEgc2V0IG9mIGhhbmRsZXJzLiBNb3N0LCB0YWtlbiBmcm9tIHRoZSBDb2RlTWlycm9yIHNob3doaW50XG5cdFx0XHQgKiBwbHVnaW46IGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5oYW5kbGVyc1xuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdGhhbmRsZXJzIDoge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaGFuZGxlcnMudmFsaWRQb3NpdGlvblxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBZQVNRRS5zaG93Q29tcGxldGlvbk5vdGlmaWNhdGlvblxuXHRcdFx0XHQgKi9cblx0XHRcdFx0dmFsaWRQb3NpdGlvbiA6IHJvb3Quc2hvd0NvbXBsZXRpb25Ob3RpZmljYXRpb24sXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGaXJlcyB3aGVuIGEgY29kZW1pcnJvciBjaGFuZ2Ugb2NjdXJzIGluIGEgcG9zaXRpb24gd2hlcmUgd2Vcblx0XHRcdFx0ICogY2FuIC1ub3QtIHNob3cgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb25cblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5oYW5kbGVycy5pbnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgWUFTUUUuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb25cblx0XHRcdFx0ICovXG5cdFx0XHRcdGludmFsaWRQb3NpdGlvbiA6IHJvb3QuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb24sXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5oYW5kbGVycy5zaG93blxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRzaG93biA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5zZWxlY3Rcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2VsZWN0IDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLmhhbmRsZXJzLnBpY2tcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0cGljayA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5oYW5kbGVycy5jbG9zZVxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRjbG9zZSA6IG51bGwsXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKiBDbGFzcyBhdXRvY29tcGxldGlvbiBzZXR0aW5nc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlc1xuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdGNsYXNzZXMgOiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIHdoZXRoZXIgdGhlIGN1cnNvciBpcyBpbiBhIHByb3BlciBwb3NpdGlvbiBmb3IgdGhpcyBhdXRvY29tcGxldGlvbi5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb25cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0geWFzcWUgZG9jXG5cdFx0XHQgKiBAcmV0dXJuIGJvb2xlYW5cblx0XHRcdCAqL1xuXHRcdFx0aXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvbiA6IGZ1bmN0aW9uKGNtKSB7XG5cdFx0XHRcdHZhciB0b2tlbiA9IHJvb3QuZ2V0Q29tcGxldGVUb2tlbihjbSk7XG5cdFx0XHRcdGlmICh0b2tlbi5zdHJpbmcuaW5kZXhPZihcIj9cIikgPT0gMClcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdHZhciBjdXIgPSBjbS5nZXRDdXJzb3IoKTtcblx0XHRcdFx0dmFyIHByZXZpb3VzVG9rZW4gPSBnZXRQcmV2aW91c05vbldzVG9rZW4oY20sIGN1ci5saW5lLCB0b2tlbik7XG5cdFx0XHRcdGlmIChwcmV2aW91c1Rva2VuLnN0cmluZyA9PSBcImFcIilcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0aWYgKHByZXZpb3VzVG9rZW4uc3RyaW5nID09IFwicmRmOnR5cGVcIilcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0aWYgKHByZXZpb3VzVG9rZW4uc3RyaW5nID09IFwicmRmczpkb21haW5cIilcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0aWYgKHByZXZpb3VzVG9rZW4uc3RyaW5nID09IFwicmRmczpyYW5nZVwiKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9LFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHZXQgdGhlIGF1dG9jb21wbGV0aW9ucy4gRWl0aGVyIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhblxuXHRcdFx0ICogYXJyYXksIG9yIGFuIGFjdHVhbCBhcnJheS4gVGhlIGFycmF5IHNob3VsZCBiZSBpbiB0aGUgZm9ybSBbXCJodHRwOi8vLi4uXCIsLi4uLl1cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmdldFxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb258YXJyYXlcblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R8c3RyaW5nfSBXaGVuIGJ1bGsgaXMgZGlzYWJsZWQsIHVzZSB0aGlzIHRva2VuIHRvIGF1dG9jb21wbGV0ZVxuXHRcdFx0ICogQHBhcmFtIGNvbXBsZXRpb25UeXBlIHtzdHJpbmd9IHdoYXQgdHlwZSBvZiBhdXRvY29tcGxldGlvbiB3ZSB0cnkgdG8gYXR0ZW1wdC4gQ2xhc3NlcywgcHJvcGVydGllcywgb3IgcHJlZml4ZXMpXG5cdFx0XHQgKiBAcGFyYW0gY2FsbGJhY2sge2Z1bmN0aW9ufSBJbiBjYXNlIGFzeW5jIGlzIGVuYWJsZWQsIHVzZSB0aGlzIGNhbGxiYWNrXG5cdFx0XHQgKiBAZGVmYXVsdCBmdW5jdGlvbiAoWUFTUUUuZmV0Y2hGcm9tTG92KVxuXHRcdFx0ICovXG5cdFx0XHRnZXQgOiByb290LmZldGNoRnJvbUxvdixcblx0XHRcdFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQcmVwcm9jZXNzZXMgdGhlIGNvZGVtaXJyb3IgdG9rZW4gYmVmb3JlIG1hdGNoaW5nIGl0IHdpdGggb3VyIGF1dG9jb21wbGV0aW9ucyBsaXN0LlxuXHRcdFx0ICogVXNlIHRoaXMgZm9yIGUuZy4gYXV0b2NvbXBsZXRpbmcgcHJlZml4ZWQgcmVzb3VyY2VzIHdoZW4geW91ciBhdXRvY29tcGxldGlvbiBsaXN0IGNvbnRhaW5zIG9ubHkgZnVsbC1sZW5ndGggVVJJc1xuXHRcdFx0ICogSS5lLiwgZm9hZjpuYW1lIC0+IGh0dHA6Ly94bWxucy5jb20vZm9hZi8wLjEvbmFtZVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMucHJlUHJvY2Vzc1Rva2VuXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdH0gVGhlIENvZGVNaXJyb3IgdG9rZW4sIGluY2x1ZGluZyB0aGUgcG9zaXRpb24gb2YgdGhpcyB0b2tlbiBpbiB0aGUgcXVlcnksIGFzIHdlbGwgYXMgdGhlIGFjdHVhbCBzdHJpbmdcblx0XHRcdCAqIEByZXR1cm4gdG9rZW4ge29iamVjdH0gUmV0dXJuIHRoZSBzYW1lIHRva2VuIChwb3NzaWJseSB3aXRoIG1vcmUgZGF0YSBhZGRlZCB0byBpdCwgd2hpY2ggeW91IGNhbiB1c2UgaW4gdGhlIHBvc3RQcm9jZXNzaW5nIHN0ZXApXG5cdFx0XHQgKiBAZGVmYXVsdCBmdW5jdGlvblxuXHRcdFx0ICovXG5cdFx0XHRwcmVQcm9jZXNzVG9rZW46IHByZXByb2Nlc3NSZXNvdXJjZVRva2VuRm9yQ29tcGxldGlvbixcblx0XHRcdC8qKlxuXHRcdFx0ICogUG9zdHByb2Nlc3NlcyB0aGUgYXV0b2NvbXBsZXRpb24gc3VnZ2VzdGlvbi5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIHJldHVybmluZyBhIHByZWZpeGVkIFVSSSBiYXNlZCBvbiBhIGZ1bGwtbGVuZ3RoIFVSSSBzdWdnZXN0aW9uXG5cdFx0XHQgKiBJLmUuLCBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWUgLT4gZm9hZjpuYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5wb3N0UHJvY2Vzc1Rva2VuXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdH0gVGhlIENvZGVNaXJyb3IgdG9rZW4sIGluY2x1ZGluZyB0aGUgcG9zaXRpb24gb2YgdGhpcyB0b2tlbiBpbiB0aGUgcXVlcnksIGFzIHdlbGwgYXMgdGhlIGFjdHVhbCBzdHJpbmdcblx0XHRcdCAqIEBwYXJhbSBzdWdnZXN0aW9uIHtzdHJpbmd9IFRoZSBzdWdnZXN0aW9uIHdoaWNoIHlvdSBhcmUgcG9zdCBwcm9jZXNzaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHBvc3QtcHJvY2Vzc2VkIHN1Z2dlc3Rpb24ge3N0cmluZ31cblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uXG5cdFx0XHQgKi9cblx0XHRcdHBvc3RQcm9jZXNzVG9rZW46IHBvc3Rwcm9jZXNzUmVzb3VyY2VUb2tlbkZvckNvbXBsZXRpb24sXG5cdFx0XHQvKipcblx0XHRcdCAqIFRoZSBnZXQgZnVuY3Rpb24gaXMgYXN5bmNocm9ub3VzXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5hc3luY1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgdHJ1ZVxuXHRcdFx0ICovXG5cdFx0XHRhc3luYyA6IHRydWUsXG5cdFx0XHQvKipcblx0XHRcdCAqIFVzZSBidWxrIGxvYWRpbmcgb2YgY2xhc3NlczogYWxsIGNsYXNzZXMgYXJlIHJldHJpZXZlZCBvbkxvYWRcblx0XHRcdCAqIHVzaW5nIHRoZSBnZXQoKSBmdW5jdGlvbi4gQWx0ZXJuYXRpdmVseSwgZGlzYWJsZSBidWxrIGxvYWRpbmcsIHRvXG5cdFx0XHQgKiBjYWxsIHRoZSBnZXQoKSBmdW5jdGlvbiB3aGVuZXZlciBhIHRva2VuIG5lZWRzIGF1dG9jb21wbGV0aW9uIChpblxuXHRcdFx0ICogdGhpcyBjYXNlLCB0aGUgY29tcGxldGlvbiB0b2tlbiBpcyBwYXNzZWQgb24gdG8gdGhlIGdldCgpXG5cdFx0XHQgKiBmdW5jdGlvbikgd2hlbmV2ZXIgeW91IGhhdmUgYW4gYXV0b2NvbXBsZXRpb24gbGlzdCB0aGF0IGlzIHN0YXRpYywgYW5kIHRoYXQgZWFzaWx5XG5cdFx0XHQgKiBmaXRzIGluIG1lbW9yeSwgd2UgYWR2aWNlIHlvdSB0byBlbmFibGUgYnVsayBmb3IgcGVyZm9ybWFuY2Vcblx0XHRcdCAqIHJlYXNvbnMgKGVzcGVjaWFsbHkgYXMgd2Ugc3RvcmUgdGhlIGF1dG9jb21wbGV0aW9ucyBpbiBhIHRyaWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5idWxrXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRidWxrIDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG8tc2hvdyB0aGUgYXV0b2NvbXBsZXRpb24gZGlhbG9nLiBEaXNhYmxpbmcgdGhpcyByZXF1aXJlcyB0aGVcblx0XHRcdCAqIHVzZXIgdG8gcHJlc3MgW2N0cmx8Y21kXS1zcGFjZSB0byBzdW1tb24gdGhlIGRpYWxvZy4gTm90ZTogdGhpc1xuXHRcdFx0ICogb25seSB3b3JrcyB3aGVuIGNvbXBsZXRpb25zIGFyZSBub3QgZmV0Y2hlZCBhc3luY2hyb25vdXNseVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuYXV0b1Nob3dcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGF1dG9TaG93IDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG9tYXRpY2FsbHkgc3RvcmUgYXV0b2NvbXBsZXRpb25zIGluIGxvY2Fsc3RvcmFnZSAob25seSB3b3JrcyB3aGVuICdidWxrJyBpcyBzZXQgdG8gdHJ1ZSlcblx0XHRcdCAqIFRoaXMgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHRoZSBnZXQoKSBmdW5jdGlvbiBpcyBhbiBleHBlbnNpdmUgYWpheFxuXHRcdFx0ICogY2FsbC4gQXV0b2NvbXBsZXRpb25zIGFyZSBzdG9yZWQgZm9yIGEgcGVyaW9kIG9mIGEgbW9udGguIFNldFxuXHRcdFx0ICogdGhpcyBwcm9wZXJ0eSB0byBudWxsIChvciByZW1vdmUgaXQpLCB0byBkaXNhYmxlIHRoZSB1c2Ugb2Zcblx0XHRcdCAqIGxvY2Fsc3RvcmFnZS4gT3RoZXJ3aXNlLCBzZXQgYSBzdHJpbmcgdmFsdWUgKG9yIGEgZnVuY3Rpb25cblx0XHRcdCAqIHJldHVybmluZyBhIHN0cmluZyB2YWwpLCByZXR1cm5pbmcgdGhlIGtleSBpbiB3aGljaCB0byBzdG9yZSB0aGVcblx0XHRcdCAqIGRhdGEgTm90ZTogdGhpcyBmZWF0dXJlIG9ubHkgd29ya3MgY29tYmluZWQgd2l0aCBjb21wbGV0aW9uc1xuXHRcdFx0ICogbG9hZGVkIGluIG1lbW9yeSAoaS5lLiBidWxrOiB0cnVlKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMucGVyc2lzdGVudFxuXHRcdFx0ICogQHR5cGUgc3RyaW5nfGZ1bmN0aW9uXG5cdFx0XHQgKiBAZGVmYXVsdCBcImNsYXNzZXNcIlxuXHRcdFx0ICovXG5cdFx0XHRwZXJzaXN0ZW50IDogXCJjbGFzc2VzXCIsXG5cdFx0XHQvKipcblx0XHRcdCAqIEEgc2V0IG9mIGhhbmRsZXJzLiBNb3N0LCB0YWtlbiBmcm9tIHRoZSBDb2RlTWlycm9yIHNob3doaW50XG5cdFx0XHQgKiBwbHVnaW46IGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVyc1xuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdGhhbmRsZXJzIDoge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMudmFsaWRQb3NpdGlvblxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBZQVNRRS5zaG93Q29tcGxldGlvbk5vdGlmaWNhdGlvblxuXHRcdFx0XHQgKi9cblx0XHRcdFx0dmFsaWRQb3NpdGlvbiA6IHJvb3Quc2hvd0NvbXBsZXRpb25Ob3RpZmljYXRpb24sXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGaXJlcyB3aGVuIGEgY29kZW1pcnJvciBjaGFuZ2Ugb2NjdXJzIGluIGEgcG9zaXRpb24gd2hlcmUgd2Vcblx0XHRcdFx0ICogY2FuIC1ub3QtIHNob3cgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb25cblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5pbnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgWUFTUUUuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb25cblx0XHRcdFx0ICovXG5cdFx0XHRcdGludmFsaWRQb3NpdGlvbiA6IHJvb3QuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb24sXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5zaG93blxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRzaG93biA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5zZWxlY3Rcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2VsZWN0IDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnBpY2tcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0cGljayA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5jbG9zZVxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRjbG9zZSA6IG51bGwsXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKiBWYXJpYWJsZSBuYW1lcyBhdXRvY29tcGxldGlvbiBzZXR0aW5nc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllc1xuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdHZhcmlhYmxlTmFtZXMgOiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIHdoZXRoZXIgdGhlIGN1cnNvciBpcyBpbiBhIHByb3BlciBwb3NpdGlvbiBmb3IgdGhpcyBhdXRvY29tcGxldGlvbi5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLmlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb25cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0geWFzcWUge2RvY31cblx0XHRcdCAqIEByZXR1cm4gYm9vbGVhblxuXHRcdFx0ICovXG5cdFx0XHRpc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uIDogZnVuY3Rpb24oY20pIHtcblx0XHRcdFx0dmFyIHRva2VuID0gY20uZ2V0VG9rZW5BdChjbS5nZXRDdXJzb3IoKSk7XG5cdFx0XHRcdGlmICh0b2tlbi50eXBlICE9IFwid3NcIikge1xuXHRcdFx0XHRcdHRva2VuID0gcm9vdC5nZXRDb21wbGV0ZVRva2VuKGNtLCB0b2tlbik7XG5cdFx0XHRcdFx0aWYgKHRva2VuICYmIHRva2VuLnN0cmluZy5pbmRleE9mKFwiP1wiKSA9PSAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogR2V0IHRoZSBhdXRvY29tcGxldGlvbnMuIEVpdGhlciBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW5cblx0XHRcdCAqIGFycmF5LCBvciBhbiBhY3R1YWwgYXJyYXkuIFRoZSBhcnJheSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gW1wiaHR0cDovLy4uLlwiLC4uLi5dXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5nZXRcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9ufGFycmF5XG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fHN0cmluZ30gV2hlbiBidWxrIGlzIGRpc2FibGVkLCB1c2UgdGhpcyB0b2tlbiB0byBhdXRvY29tcGxldGVcblx0XHRcdCAqIEBwYXJhbSBjb21wbGV0aW9uVHlwZSB7c3RyaW5nfSB3aGF0IHR5cGUgb2YgYXV0b2NvbXBsZXRpb24gd2UgdHJ5IHRvIGF0dGVtcHQuIENsYXNzZXMsIHByb3BlcnRpZXMsIG9yIHByZWZpeGVzKVxuXHRcdFx0ICogQHBhcmFtIGNhbGxiYWNrIHtmdW5jdGlvbn0gSW4gY2FzZSBhc3luYyBpcyBlbmFibGVkLCB1c2UgdGhpcyBjYWxsYmFja1xuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb24gKFlBU1FFLmF1dG9jb21wbGV0ZVZhcmlhYmxlcylcblx0XHRcdCAqL1xuXHRcdFx0Z2V0IDogcm9vdC5hdXRvY29tcGxldGVWYXJpYWJsZXMsXG5cdFx0XHRcdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogUHJlcHJvY2Vzc2VzIHRoZSBjb2RlbWlycm9yIHRva2VuIGJlZm9yZSBtYXRjaGluZyBpdCB3aXRoIG91ciBhdXRvY29tcGxldGlvbnMgbGlzdC5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIGF1dG9jb21wbGV0aW5nIHByZWZpeGVkIHJlc291cmNlcyB3aGVuIHlvdXIgYXV0b2NvbXBsZXRpb24gbGlzdCBjb250YWlucyBvbmx5IGZ1bGwtbGVuZ3RoIFVSSXNcblx0XHRcdCAqIEkuZS4sIGZvYWY6bmFtZSAtPiBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLnByZVByb2Nlc3NUb2tlblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R9IFRoZSBDb2RlTWlycm9yIHRva2VuLCBpbmNsdWRpbmcgdGhlIHBvc2l0aW9uIG9mIHRoaXMgdG9rZW4gaW4gdGhlIHF1ZXJ5LCBhcyB3ZWxsIGFzIHRoZSBhY3R1YWwgc3RyaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHRva2VuIHtvYmplY3R9IFJldHVybiB0aGUgc2FtZSB0b2tlbiAocG9zc2libHkgd2l0aCBtb3JlIGRhdGEgYWRkZWQgdG8gaXQsIHdoaWNoIHlvdSBjYW4gdXNlIGluIHRoZSBwb3N0UHJvY2Vzc2luZyBzdGVwKVxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRwcmVQcm9jZXNzVG9rZW46IG51bGwsXG5cdFx0XHQvKipcblx0XHRcdCAqIFBvc3Rwcm9jZXNzZXMgdGhlIGF1dG9jb21wbGV0aW9uIHN1Z2dlc3Rpb24uXG5cdFx0XHQgKiBVc2UgdGhpcyBmb3IgZS5nLiByZXR1cm5pbmcgYSBwcmVmaXhlZCBVUkkgYmFzZWQgb24gYSBmdWxsLWxlbmd0aCBVUkkgc3VnZ2VzdGlvblxuXHRcdFx0ICogSS5lLiwgaHR0cDovL3htbG5zLmNvbS9mb2FmLzAuMS9uYW1lIC0+IGZvYWY6bmFtZVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMucG9zdFByb2Nlc3NUb2tlblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R9IFRoZSBDb2RlTWlycm9yIHRva2VuLCBpbmNsdWRpbmcgdGhlIHBvc2l0aW9uIG9mIHRoaXMgdG9rZW4gaW4gdGhlIHF1ZXJ5LCBhcyB3ZWxsIGFzIHRoZSBhY3R1YWwgc3RyaW5nXG5cdFx0XHQgKiBAcGFyYW0gc3VnZ2VzdGlvbiB7c3RyaW5nfSBUaGUgc3VnZ2VzdGlvbiB3aGljaCB5b3UgYXJlIHBvc3QgcHJvY2Vzc2luZ1xuXHRcdFx0ICogQHJldHVybiBwb3N0LXByb2Nlc3NlZCBzdWdnZXN0aW9uIHtzdHJpbmd9XG5cdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHQgKi9cblx0XHRcdHBvc3RQcm9jZXNzVG9rZW46IG51bGwsXG5cdFx0XHQvKipcblx0XHRcdCAqIFRoZSBnZXQgZnVuY3Rpb24gaXMgYXN5bmNocm9ub3VzXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5hc3luY1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgZmFsc2Vcblx0XHRcdCAqL1xuXHRcdFx0YXN5bmMgOiBmYWxzZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogVXNlIGJ1bGsgbG9hZGluZyBvZiB2YXJpYWJsZU5hbWVzOiBhbGwgdmFyaWFibGUgbmFtZXMgYXJlIHJldHJpZXZlZFxuXHRcdFx0ICogb25Mb2FkIHVzaW5nIHRoZSBnZXQoKSBmdW5jdGlvbi4gQWx0ZXJuYXRpdmVseSwgZGlzYWJsZSBidWxrXG5cdFx0XHQgKiBsb2FkaW5nLCB0byBjYWxsIHRoZSBnZXQoKSBmdW5jdGlvbiB3aGVuZXZlciBhIHRva2VuIG5lZWRzXG5cdFx0XHQgKiBhdXRvY29tcGxldGlvbiAoaW4gdGhpcyBjYXNlLCB0aGUgY29tcGxldGlvbiB0b2tlbiBpcyBwYXNzZWQgb25cblx0XHRcdCAqIHRvIHRoZSBnZXQoKSBmdW5jdGlvbikgd2hlbmV2ZXIgeW91IGhhdmUgYW4gYXV0b2NvbXBsZXRpb24gbGlzdCB0aGF0IGlzIHN0YXRpYywgYW5kIFxuXHRcdFx0ICogdGhhdCBlYXNpbHkgZml0cyBpbiBtZW1vcnksIHdlIGFkdmljZSB5b3UgdG8gZW5hYmxlIGJ1bGsgZm9yXG5cdFx0XHQgKiBwZXJmb3JtYW5jZSByZWFzb25zIChlc3BlY2lhbGx5IGFzIHdlIHN0b3JlIHRoZSBhdXRvY29tcGxldGlvbnNcblx0XHRcdCAqIGluIGEgdHJpZSlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLmJ1bGtcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGJ1bGsgOiBmYWxzZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQXV0by1zaG93IHRoZSBhdXRvY29tcGxldGlvbiBkaWFsb2cuIERpc2FibGluZyB0aGlzIHJlcXVpcmVzIHRoZVxuXHRcdFx0ICogdXNlciB0byBwcmVzcyBbY3RybHxjbWRdLXNwYWNlIHRvIHN1bW1vbiB0aGUgZGlhbG9nLiBOb3RlOiB0aGlzXG5cdFx0XHQgKiBvbmx5IHdvcmtzIHdoZW4gY29tcGxldGlvbnMgYXJlIG5vdCBmZXRjaGVkIGFzeW5jaHJvbm91c2x5XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5hdXRvU2hvd1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgZmFsc2Vcblx0XHRcdCAqL1xuXHRcdFx0YXV0b1Nob3cgOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvbWF0aWNhbGx5IHN0b3JlIGF1dG9jb21wbGV0aW9ucyBpbiBsb2NhbHN0b3JhZ2UuIFRoaXMgaXNcblx0XHRcdCAqIHBhcnRpY3VsYXJseSB1c2VmdWwgd2hlbiB0aGUgZ2V0KCkgZnVuY3Rpb24gaXMgYW4gZXhwZW5zaXZlIGFqYXhcblx0XHRcdCAqIGNhbGwuIEF1dG9jb21wbGV0aW9ucyBhcmUgc3RvcmVkIGZvciBhIHBlcmlvZCBvZiBhIG1vbnRoLiBTZXRcblx0XHRcdCAqIHRoaXMgcHJvcGVydHkgdG8gbnVsbCAob3IgcmVtb3ZlIGl0KSwgdG8gZGlzYWJsZSB0aGUgdXNlIG9mXG5cdFx0XHQgKiBsb2NhbHN0b3JhZ2UuIE90aGVyd2lzZSwgc2V0IGEgc3RyaW5nIHZhbHVlIChvciBhIGZ1bmN0aW9uXG5cdFx0XHQgKiByZXR1cm5pbmcgYSBzdHJpbmcgdmFsKSwgcmV0dXJuaW5nIHRoZSBrZXkgaW4gd2hpY2ggdG8gc3RvcmUgdGhlXG5cdFx0XHQgKiBkYXRhIE5vdGU6IHRoaXMgZmVhdHVyZSBvbmx5IHdvcmtzIGNvbWJpbmVkIHdpdGggY29tcGxldGlvbnNcblx0XHRcdCAqIGxvYWRlZCBpbiBtZW1vcnkgKGkuZS4gYnVsazogdHJ1ZSlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLnBlcnNpc3RlbnRcblx0XHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRwZXJzaXN0ZW50IDogbnVsbCxcblx0XHRcdC8qKlxuXHRcdFx0ICogQSBzZXQgb2YgaGFuZGxlcnMuIE1vc3QsIHRha2VuIGZyb20gdGhlIENvZGVNaXJyb3Igc2hvd2hpbnRcblx0XHRcdCAqIHBsdWdpbjogaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLmhhbmRsZXJzXG5cdFx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHRcdCAqL1xuXHRcdFx0aGFuZGxlcnMgOiB7XG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGaXJlcyB3aGVuIGEgY29kZW1pcnJvciBjaGFuZ2Ugb2NjdXJzIGluIGEgcG9zaXRpb24gd2hlcmUgd2Vcblx0XHRcdFx0ICogY2FuIHNob3cgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb25cblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVycy52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhbGlkUG9zaXRpb24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiAtbm90LSBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuaGFuZGxlcnMuaW52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdGludmFsaWRQb3NpdGlvbiA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVycy5zaG93blxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRzaG93biA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVycy5zZWxlY3Rcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2VsZWN0IDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLmhhbmRsZXJzLnBpY2tcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0cGljayA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVycy5jbG9zZVxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRjbG9zZSA6IG51bGwsXG5cdFx0XHR9XG5cdFx0fSxcblx0fVxufSk7XG5yb290LnZlcnNpb24gPSB7XG5cdFwiQ29kZU1pcnJvclwiIDogQ29kZU1pcnJvci52ZXJzaW9uLFxuXHRcIllBU1FFXCIgOiByZXF1aXJlKFwiLi4vcGFja2FnZS5qc29uXCIpLnZlcnNpb24sXG5cdFwianF1ZXJ5XCI6ICQuZm4uanF1ZXJ5LFxuXHRcInlhc2d1aS11dGlsc1wiOiByZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLnZlcnNpb25cbn07XG5cbi8vIGVuZCB3aXRoIHNvbWUgZG9jdW1lbnRhdGlvbiBzdHVmZiB3ZSdkIGxpa2UgdG8gaW5jbHVkZSBpbiB0aGUgZG9jdW1lbnRhdGlvblxuLy8gKHllcywgdWdseSwgYnV0IGVhc2llciB0aGFuIG1lc3NpbmcgYWJvdXQgYW5kIGFkZGluZyBpdCBtYW51YWxseSB0byB0aGVcbi8vIGdlbmVyYXRlZCBodG1sIDspKVxuLyoqXG4gKiBTZXQgcXVlcnkgdmFsdWUgaW4gZWRpdG9yIChzZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNzZXRWYWx1ZSlcbiAqIFxuICogQG1ldGhvZCBkb2Muc2V0VmFsdWVcbiAqIEBwYXJhbSBxdWVyeSB7c3RyaW5nfVxuICovXG5cbi8qKlxuICogR2V0IHF1ZXJ5IHZhbHVlIGZyb20gZWRpdG9yIChzZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNnZXRWYWx1ZSlcbiAqIFxuICogQG1ldGhvZCBkb2MuZ2V0VmFsdWVcbiAqIEByZXR1cm4gcXVlcnkge3N0cmluZ31cbiAqL1xuXG4vKipcbiAqIFNldCBzaXplLiBVc2UgbnVsbCB2YWx1ZSB0byBsZWF2ZSB3aWR0aCBvciBoZWlnaHQgdW5jaGFuZ2VkLiBUbyByZXNpemUgdGhlIGVkaXRvciB0byBmaXQgaXRzIGNvbnRlbnQsIHNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZGVtby9yZXNpemUuaHRtbFxuICogXG4gKiBAcGFyYW0gd2lkdGgge251bWJlcnxzdHJpbmd9XG4gKiBAcGFyYW0gaGVpZ2h0IHtudW1iZXJ8c3RyaW5nfVxuICogQG1ldGhvZCBkb2Muc2V0U2l6ZVxuICovXG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qXG4gIGpRdWVyeSBkZXBhcmFtIGlzIGFuIGV4dHJhY3Rpb24gb2YgdGhlIGRlcGFyYW0gbWV0aG9kIGZyb20gQmVuIEFsbWFuJ3MgalF1ZXJ5IEJCUVxuICBodHRwOi8vYmVuYWxtYW4uY29tL3Byb2plY3RzL2pxdWVyeS1iYnEtcGx1Z2luL1xuKi9cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbiQuZGVwYXJhbSA9IGZ1bmN0aW9uIChwYXJhbXMsIGNvZXJjZSkge1xudmFyIG9iaiA9IHt9LFxuXHRjb2VyY2VfdHlwZXMgPSB7ICd0cnVlJzogITAsICdmYWxzZSc6ICExLCAnbnVsbCc6IG51bGwgfTtcbiAgXG4vLyBJdGVyYXRlIG92ZXIgYWxsIG5hbWU9dmFsdWUgcGFpcnMuXG4kLmVhY2gocGFyYW1zLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChqLHYpIHtcbiAgdmFyIHBhcmFtID0gdi5zcGxpdCgnPScpLFxuXHQgIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJhbVswXSksXG5cdCAgdmFsLFxuXHQgIGN1ciA9IG9iaixcblx0ICBpID0gMCxcblx0XHRcblx0ICAvLyBJZiBrZXkgaXMgbW9yZSBjb21wbGV4IHRoYW4gJ2ZvbycsIGxpa2UgJ2FbXScgb3IgJ2FbYl1bY10nLCBzcGxpdCBpdFxuXHQgIC8vIGludG8gaXRzIGNvbXBvbmVudCBwYXJ0cy5cblx0ICBrZXlzID0ga2V5LnNwbGl0KCddWycpLFxuXHQgIGtleXNfbGFzdCA9IGtleXMubGVuZ3RoIC0gMTtcblx0XG4gIC8vIElmIHRoZSBmaXJzdCBrZXlzIHBhcnQgY29udGFpbnMgWyBhbmQgdGhlIGxhc3QgZW5kcyB3aXRoIF0sIHRoZW4gW11cbiAgLy8gYXJlIGNvcnJlY3RseSBiYWxhbmNlZC5cbiAgaWYgKC9cXFsvLnRlc3Qoa2V5c1swXSkgJiYgL1xcXSQvLnRlc3Qoa2V5c1trZXlzX2xhc3RdKSkge1xuXHQvLyBSZW1vdmUgdGhlIHRyYWlsaW5nIF0gZnJvbSB0aGUgbGFzdCBrZXlzIHBhcnQuXG5cdGtleXNba2V5c19sYXN0XSA9IGtleXNba2V5c19sYXN0XS5yZXBsYWNlKC9cXF0kLywgJycpO1xuXHQgIFxuXHQvLyBTcGxpdCBmaXJzdCBrZXlzIHBhcnQgaW50byB0d28gcGFydHMgb24gdGhlIFsgYW5kIGFkZCB0aGVtIGJhY2sgb250b1xuXHQvLyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBrZXlzIGFycmF5LlxuXHRrZXlzID0ga2V5cy5zaGlmdCgpLnNwbGl0KCdbJykuY29uY2F0KGtleXMpO1xuXHQgIFxuXHRrZXlzX2xhc3QgPSBrZXlzLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSB7XG5cdC8vIEJhc2ljICdmb28nIHN0eWxlIGtleS5cblx0a2V5c19sYXN0ID0gMDtcbiAgfVxuXHRcbiAgLy8gQXJlIHdlIGRlYWxpbmcgd2l0aCBhIG5hbWU9dmFsdWUgcGFpciwgb3IganVzdCBhIG5hbWU/XG4gIGlmIChwYXJhbS5sZW5ndGggPT09IDIpIHtcblx0dmFsID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtWzFdKTtcblx0ICBcblx0Ly8gQ29lcmNlIHZhbHVlcy5cblx0aWYgKGNvZXJjZSkge1xuXHQgIHZhbCA9IHZhbCAmJiAhaXNOYU4odmFsKSAgICAgICAgICAgICAgPyArdmFsICAgICAgICAgICAgICAvLyBudW1iZXJcblx0XHQgIDogdmFsID09PSAndW5kZWZpbmVkJyAgICAgICAgICAgICA/IHVuZGVmaW5lZCAgICAgICAgIC8vIHVuZGVmaW5lZFxuXHRcdCAgOiBjb2VyY2VfdHlwZXNbdmFsXSAhPT0gdW5kZWZpbmVkID8gY29lcmNlX3R5cGVzW3ZhbF0gLy8gdHJ1ZSwgZmFsc2UsIG51bGxcblx0XHQgIDogdmFsOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZ1xuXHR9XG5cdCAgXG5cdGlmICgga2V5c19sYXN0ICkge1xuXHQgIC8vIENvbXBsZXgga2V5LCBidWlsZCBkZWVwIG9iamVjdCBzdHJ1Y3R1cmUgYmFzZWQgb24gYSBmZXcgcnVsZXM6XG5cdCAgLy8gKiBUaGUgJ2N1cicgcG9pbnRlciBzdGFydHMgYXQgdGhlIG9iamVjdCB0b3AtbGV2ZWwuXG5cdCAgLy8gKiBbXSA9IGFycmF5IHB1c2ggKG4gaXMgc2V0IHRvIGFycmF5IGxlbmd0aCksIFtuXSA9IGFycmF5IGlmIG4gaXMgXG5cdCAgLy8gICBudW1lcmljLCBvdGhlcndpc2Ugb2JqZWN0LlxuXHQgIC8vICogSWYgYXQgdGhlIGxhc3Qga2V5cyBwYXJ0LCBzZXQgdGhlIHZhbHVlLlxuXHQgIC8vICogRm9yIGVhY2gga2V5cyBwYXJ0LCBpZiB0aGUgY3VycmVudCBsZXZlbCBpcyB1bmRlZmluZWQgY3JlYXRlIGFuXG5cdCAgLy8gICBvYmplY3Qgb3IgYXJyYXkgYmFzZWQgb24gdGhlIHR5cGUgb2YgdGhlIG5leHQga2V5cyBwYXJ0LlxuXHQgIC8vICogTW92ZSB0aGUgJ2N1cicgcG9pbnRlciB0byB0aGUgbmV4dCBsZXZlbC5cblx0ICAvLyAqIFJpbnNlICYgcmVwZWF0LlxuXHQgIGZvciAoOyBpIDw9IGtleXNfbGFzdDsgaSsrKSB7XG5cdFx0a2V5ID0ga2V5c1tpXSA9PT0gJycgPyBjdXIubGVuZ3RoIDoga2V5c1tpXTtcblx0XHRjdXIgPSBjdXJba2V5XSA9IGkgPCBrZXlzX2xhc3Rcblx0XHQgID8gY3VyW2tleV0gfHwgKGtleXNbaSsxXSAmJiBpc05hTihrZXlzW2krMV0pID8ge30gOiBbXSlcblx0XHQgIDogdmFsO1xuXHQgIH1cblx0XHRcblx0fSBlbHNlIHtcblx0ICAvLyBTaW1wbGUga2V5LCBldmVuIHNpbXBsZXIgcnVsZXMsIHNpbmNlIG9ubHkgc2NhbGFycyBhbmQgc2hhbGxvd1xuXHQgIC8vIGFycmF5cyBhcmUgYWxsb3dlZC5cblx0XHRcblx0ICBpZiAoJC5pc0FycmF5KG9ialtrZXldKSkge1xuXHRcdC8vIHZhbCBpcyBhbHJlYWR5IGFuIGFycmF5LCBzbyBwdXNoIG9uIHRoZSBuZXh0IHZhbHVlLlxuXHRcdG9ialtrZXldLnB1c2goIHZhbCApO1xuXHRcdCAgXG5cdCAgfSBlbHNlIGlmIChvYmpba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gdmFsIGlzbid0IGFuIGFycmF5LCBidXQgc2luY2UgYSBzZWNvbmQgdmFsdWUgaGFzIGJlZW4gc3BlY2lmaWVkLFxuXHRcdC8vIGNvbnZlcnQgdmFsIGludG8gYW4gYXJyYXkuXG5cdFx0b2JqW2tleV0gPSBbb2JqW2tleV0sIHZhbF07XG5cdFx0ICBcblx0ICB9IGVsc2Uge1xuXHRcdC8vIHZhbCBpcyBhIHNjYWxhci5cblx0XHRvYmpba2V5XSA9IHZhbDtcblx0ICB9XG5cdH1cblx0ICBcbiAgfSBlbHNlIGlmIChrZXkpIHtcblx0Ly8gTm8gdmFsdWUgd2FzIGRlZmluZWQsIHNvIHNldCBzb21ldGhpbmcgbWVhbmluZ2Z1bC5cblx0b2JqW2tleV0gPSBjb2VyY2Vcblx0ICA/IHVuZGVmaW5lZFxuXHQgIDogJyc7XG4gIH1cbn0pO1xuICBcbnJldHVybiBvYmo7XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24obW9kKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT0gXCJvYmplY3RcIikgLy8gQ29tbW9uSlNcbiAgICBtb2QoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgLy8gQU1EXG4gICAgZGVmaW5lKFtcImNvZGVtaXJyb3JcIl0sIG1vZCk7XG4gIGVsc2UgLy8gUGxhaW4gYnJvd3NlciBlbnZcbiAgICBtb2QoQ29kZU1pcnJvcik7XG59KShmdW5jdGlvbihDb2RlTWlycm9yKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICBcblx0Q29kZU1pcnJvci5kZWZpbmVNb2RlKFwic3BhcnFsMTFcIiwgZnVuY3Rpb24oY29uZmlnLCBwYXJzZXJDb25maWcpIHtcblx0XG5cdFx0dmFyIGluZGVudFVuaXQgPSBjb25maWcuaW5kZW50VW5pdDtcblx0XG5cdFx0Ly8gbGwxX3RhYmxlIGlzIGF1dG8tZ2VuZXJhdGVkIGZyb20gZ3JhbW1hclxuXHRcdC8vIC0gZG8gbm90IGVkaXQgbWFudWFsbHlcblx0XHQvLyAlJSV0YWJsZSUlJVxuXHR2YXIgbGwxX3RhYmxlPVxuXHR7XG5cdCAgXCIqWyYmLHZhbHVlTG9naWNhbF1cIiA6IHtcblx0ICAgICBcIiYmXCI6IFtcIlsmJix2YWx1ZUxvZ2ljYWxdXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQVNcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIsXCI6IFtdLCBcblx0ICAgICBcInx8XCI6IFtdLCBcblx0ICAgICBcIjtcIjogW119LCBcblx0ICBcIipbLCxleHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCJbLCxleHByZXNzaW9uXVwiLFwiKlssLGV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIipbLCxvYmplY3RQYXRoXVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCJbLCxvYmplY3RQYXRoXVwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXSwgXG5cdCAgICAgXCJdXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiKlssLG9iamVjdF1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiWywsb2JqZWN0XVwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdfSwgXG5cdCAgXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIiA6IHtcblx0ICAgICBcIi9cIjogW1wiWy8scGF0aEVsdE9ySW52ZXJzZV1cIixcIipbLyxwYXRoRWx0T3JJbnZlcnNlXVwiXSwgXG5cdCAgICAgXCJ8XCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiKFwiOiBbXSwgXG5cdCAgICAgXCJbXCI6IFtdLCBcblx0ICAgICBcIlZBUjFcIjogW10sIFxuXHQgICAgIFwiVkFSMlwiOiBbXSwgXG5cdCAgICAgXCJOSUxcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdfSwgXG5cdCAgXCIqWzssP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCJbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCIsXCIqWzssP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXVwiXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqWzssP1t2ZXJiLG9iamVjdExpc3RdXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCJbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCIsXCIqWzssP1t2ZXJiLG9iamVjdExpc3RdXVwiXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdfSwgXG5cdCAgXCIqW1VOSU9OLGdyb3VwR3JhcGhQYXR0ZXJuXVwiIDoge1xuXHQgICAgIFwiVU5JT05cIjogW1wiW1VOSU9OLGdyb3VwR3JhcGhQYXR0ZXJuXVwiLFwiKltVTklPTixncm91cEdyYXBoUGF0dGVybl1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIiA6IHtcblx0ICAgICBcIntcIjogW1wiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXCJbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW1wiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQklORFwiOiBbXCJbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXCJbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCIgOiB7XG5cdCAgICAgXCJHUkFQSFwiOiBbXCJbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCIgOiB7XG5cdCAgICAgXCJ8XCI6IFtcIlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XVwiLFwiKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCIqW3wscGF0aFNlcXVlbmNlXVwiIDoge1xuXHQgICAgIFwifFwiOiBbXCJbfCxwYXRoU2VxdWVuY2VdXCIsXCIqW3wscGF0aFNlcXVlbmNlXVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiVFJVRVwiOiBbXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtdLCBcblx0ICAgICBcIkFOT05cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXX0sIFxuXHQgIFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCJ8fFwiOiBbXCJbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkFTXCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdfSwgXG5cdCAgXCIqZGF0YUJsb2NrVmFsdWVcIiA6IHtcblx0ICAgICBcIlVOREVGXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCIqZGF0YXNldENsYXVzZVwiIDoge1xuXHQgICAgIFwiRlJPTVwiOiBbXCJkYXRhc2V0Q2xhdXNlXCIsXCIqZGF0YXNldENsYXVzZVwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdfSwgXG5cdCAgXCIqZGVzY3JpYmVEYXRhc2V0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJGUk9NXCI6IFtcImRlc2NyaWJlRGF0YXNldENsYXVzZVwiLFwiKmRlc2NyaWJlRGF0YXNldENsYXVzZVwiXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXSwgXG5cdCAgICAgXCJIQVZJTkdcIjogW10sIFxuXHQgICAgIFwiR1JPVVBcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIldIRVJFXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW119LCBcblx0ICBcIipncmFwaE5vZGVcIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiKmdyYXBoTm9kZVBhdGhcIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCIqZ3JvdXBDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIkxJTUlUXCI6IFtdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXSwgXG5cdCAgICAgXCJIQVZJTkdcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqaGF2aW5nQ29uZGl0aW9uXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiT1JERVJcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqb3IoW1sgKCwqZGF0YUJsb2NrVmFsdWUsKV0sTklMXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wib3IoW1sgKCwqZGF0YUJsb2NrVmFsdWUsKV0sTklMXSlcIixcIipvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wib3IoW1sgKCwqZGF0YUJsb2NrVmFsdWUsKV0sTklMXSlcIixcIipvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCIgOiB7XG5cdCAgICAgXCIqXCI6IFtcIm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCIvXCI6IFtcIm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwifHxcIjogW10sIFxuXHQgICAgIFwiJiZcIjogW10sIFxuXHQgICAgIFwiPVwiOiBbXSwgXG5cdCAgICAgXCIhPVwiOiBbXSwgXG5cdCAgICAgXCI8XCI6IFtdLCBcblx0ICAgICBcIj5cIjogW10sIFxuXHQgICAgIFwiPD1cIjogW10sIFxuXHQgICAgIFwiPj1cIjogW10sIFxuXHQgICAgIFwiSU5cIjogW10sIFxuXHQgICAgIFwiTk9UXCI6IFtdLCBcblx0ICAgICBcIitcIjogW10sIFxuXHQgICAgIFwiLVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXX0sIFxuXHQgIFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIgOiB7XG5cdCAgICAgXCIrXCI6IFtcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwifHxcIjogW10sIFxuXHQgICAgIFwiJiZcIjogW10sIFxuXHQgICAgIFwiPVwiOiBbXSwgXG5cdCAgICAgXCIhPVwiOiBbXSwgXG5cdCAgICAgXCI8XCI6IFtdLCBcblx0ICAgICBcIj5cIjogW10sIFxuXHQgICAgIFwiPD1cIjogW10sIFxuXHQgICAgIFwiPj1cIjogW10sIFxuXHQgICAgIFwiSU5cIjogW10sIFxuXHQgICAgIFwiTk9UXCI6IFtdLCBcblx0ICAgICBcIjtcIjogW119LCBcblx0ICBcIipvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIixcIipvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiLFwiKm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIsXCIqb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIkZST01cIjogW119LCBcblx0ICBcIipvcmRlckNvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiQVNDXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREVTQ1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIkxJTUlUXCI6IFtdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipwcmVmaXhEZWNsXCIgOiB7XG5cdCAgICAgXCJQUkVGSVhcIjogW1wicHJlZml4RGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJDT05TVFJVQ1RcIjogW10sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW10sIFxuXHQgICAgIFwiQVNLXCI6IFtdLCBcblx0ICAgICBcIklOU0VSVFwiOiBbXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW10sIFxuXHQgICAgIFwiU0VMRUNUXCI6IFtdLCBcblx0ICAgICBcIkxPQURcIjogW10sIFxuXHQgICAgIFwiQ0xFQVJcIjogW10sIFxuXHQgICAgIFwiRFJPUFwiOiBbXSwgXG5cdCAgICAgXCJBRERcIjogW10sIFxuXHQgICAgIFwiTU9WRVwiOiBbXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtdLCBcblx0ICAgICBcIkNSRUFURVwiOiBbXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtdfSwgXG5cdCAgXCIqdXNpbmdDbGF1c2VcIiA6IHtcblx0ICAgICBcIlVTSU5HXCI6IFtcInVzaW5nQ2xhdXNlXCIsXCIqdXNpbmdDbGF1c2VcIl0sIFxuXHQgICAgIFwiV0hFUkVcIjogW119LCBcblx0ICBcIip2YXJcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyXCIsXCIqdmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCIsXCIqdmFyXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIip2YXJPcklSSXJlZlwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIk9SREVSXCI6IFtdLCBcblx0ICAgICBcIkhBVklOR1wiOiBbXSwgXG5cdCAgICAgXCJHUk9VUFwiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiV0hFUkVcIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJGUk9NXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdfSwgXG5cdCAgXCIrZ3JhcGhOb2RlXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdfSwgXG5cdCAgXCIrZ3JhcGhOb2RlUGF0aFwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdfSwgXG5cdCAgXCIrZ3JvdXBDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl19LCBcblx0ICBcIitoYXZpbmdDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl19LCBcblx0ICBcIitvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIixcIipvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiLFwiKm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIsXCIqb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXX0sIFxuXHQgIFwiK29yZGVyQ29uZGl0aW9uXCIgOiB7XG5cdCAgICAgXCJBU0NcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJERVNDXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXX0sIFxuXHQgIFwiK3Zhck9ySVJJcmVmXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl19LCBcblx0ICBcIj8uXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIi5cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP0RJU1RJTkNUXCIgOiB7XG5cdCAgICAgXCJESVNUSU5DVFwiOiBbXCJESVNUSU5DVFwiXSwgXG5cdCAgICAgXCIhXCI6IFtdLCBcblx0ICAgICBcIitcIjogW10sIFxuXHQgICAgIFwiLVwiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiKFwiOiBbXSwgXG5cdCAgICAgXCJTVFJcIjogW10sIFxuXHQgICAgIFwiTEFOR1wiOiBbXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXSwgXG5cdCAgICAgXCJJUklcIjogW10sIFxuXHQgICAgIFwiVVJJXCI6IFtdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtdLCBcblx0ICAgICBcIlJBTkRcIjogW10sIFxuXHQgICAgIFwiQUJTXCI6IFtdLCBcblx0ICAgICBcIkNFSUxcIjogW10sIFxuXHQgICAgIFwiRkxPT1JcIjogW10sIFxuXHQgICAgIFwiUk9VTkRcIjogW10sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW10sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW10sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW10sIFxuXHQgICAgIFwiWUVBUlwiOiBbXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXSwgXG5cdCAgICAgXCJEQVlcIjogW10sIFxuXHQgICAgIFwiSE9VUlNcIjogW10sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtdLCBcblx0ICAgICBcIlRaXCI6IFtdLCBcblx0ICAgICBcIk5PV1wiOiBbXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW10sIFxuXHQgICAgIFwiTUQ1XCI6IFtdLCBcblx0ICAgICBcIlNIQTFcIjogW10sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW10sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW10sIFxuXHQgICAgIFwiSUZcIjogW10sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW10sIFxuXHQgICAgIFwiVFJVRVwiOiBbXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXSwgXG5cdCAgICAgXCJTVU1cIjogW10sIFxuXHQgICAgIFwiTUlOXCI6IFtdLCBcblx0ICAgICBcIk1BWFwiOiBbXSwgXG5cdCAgICAgXCJBVkdcIjogW10sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW10sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW10sIFxuXHQgICAgIFwiTk9UXCI6IFtdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCIqXCI6IFtdfSwgXG5cdCAgXCI/R1JBUEhcIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcIkdSQVBIXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW119LCBcblx0ICBcIj9TSUxFTlRcIiA6IHtcblx0ICAgICBcIlNJTEVOVFwiOiBbXCJTSUxFTlRcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW119LCBcblx0ICBcIj9TSUxFTlRfMVwiIDoge1xuXHQgICAgIFwiU0lMRU5UXCI6IFtcIlNJTEVOVFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdfSwgXG5cdCAgXCI/U0lMRU5UXzJcIiA6IHtcblx0ICAgICBcIlNJTEVOVFwiOiBbXCJTSUxFTlRcIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiREVGQVVMVFwiOiBbXSwgXG5cdCAgICAgXCJOQU1FRFwiOiBbXSwgXG5cdCAgICAgXCJBTExcIjogW119LCBcblx0ICBcIj9TSUxFTlRfM1wiIDoge1xuXHQgICAgIFwiU0lMRU5UXCI6IFtcIlNJTEVOVFwiXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXX0sIFxuXHQgIFwiP1NJTEVOVF80XCIgOiB7XG5cdCAgICAgXCJTSUxFTlRcIjogW1wiU0lMRU5UXCJdLCBcblx0ICAgICBcIkRFRkFVTFRcIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXX0sIFxuXHQgIFwiP1dIRVJFXCIgOiB7XG5cdCAgICAgXCJXSEVSRVwiOiBbXCJXSEVSRVwiXSwgXG5cdCAgICAgXCJ7XCI6IFtdfSwgXG5cdCAgXCI/WywsZXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiWywsZXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiIDoge1xuXHQgICAgIFwiLlwiOiBbXCJbLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP1suLD90cmlwbGVzQmxvY2tdXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIlsuLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIlsuLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW119LCBcblx0ICBcIj9bOyxTRVBBUkFUT1IsPSxzdHJpbmddXCIgOiB7XG5cdCAgICAgXCI7XCI6IFtcIls7LFNFUEFSQVRPUiw9LHN0cmluZ11cIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiP1s7LHVwZGF0ZV1cIiA6IHtcblx0ICAgICBcIjtcIjogW1wiWzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCIkXCI6IFtdfSwgXG5cdCAgXCI/W0FTLHZhcl1cIiA6IHtcblx0ICAgICBcIkFTXCI6IFtcIltBUyx2YXJdXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIj9bSU5UTyxncmFwaFJlZl1cIiA6IHtcblx0ICAgICBcIklOVE9cIjogW1wiW0lOVE8sZ3JhcGhSZWZdXCJdLCBcblx0ICAgICBcIjtcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXX0sIFxuXHQgIFwiP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJbb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJhXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIiFcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJbb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIjtcIjogW10sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCJdXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP1twYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJbcGF0aE9uZUluUHJvcGVydHlTZXQsKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XV1cIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJbcGF0aE9uZUluUHJvcGVydHlTZXQsKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJbcGF0aE9uZUluUHJvcGVydHlTZXQsKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiW3BhdGhPbmVJblByb3BlcnR5U2V0LCpbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1dXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIltwYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCIgOiB7XG5cdCAgICAgXCJJTlNFUlRcIjogW1wiW3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1wiW3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1wiW3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ09QWVwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCIkXCI6IFtdfSwgXG5cdCAgXCI/W3ZlcmIsb2JqZWN0TGlzdF1cIiA6IHtcblx0ICAgICBcImFcIjogW1wiW3ZlcmIsb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJbdmVyYixvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIlt2ZXJiLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiW3ZlcmIsb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiW3ZlcmIsb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiW3ZlcmIsb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiO1wiOiBbXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdfSwgXG5cdCAgXCI/YXJnTGlzdFwiIDoge1xuXHQgICAgIFwiTklMXCI6IFtcImFyZ0xpc3RcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJhcmdMaXN0XCJdLCBcblx0ICAgICBcIkFTXCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCJ8fFwiOiBbXSwgXG5cdCAgICAgXCImJlwiOiBbXSwgXG5cdCAgICAgXCI9XCI6IFtdLCBcblx0ICAgICBcIiE9XCI6IFtdLCBcblx0ICAgICBcIjxcIjogW10sIFxuXHQgICAgIFwiPlwiOiBbXSwgXG5cdCAgICAgXCI8PVwiOiBbXSwgXG5cdCAgICAgXCI+PVwiOiBbXSwgXG5cdCAgICAgXCJJTlwiOiBbXSwgXG5cdCAgICAgXCJOT1RcIjogW10sIFxuXHQgICAgIFwiK1wiOiBbXSwgXG5cdCAgICAgXCItXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCIqXCI6IFtdLCBcblx0ICAgICBcIi9cIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXX0sIFxuXHQgIFwiP2Jhc2VEZWNsXCIgOiB7XG5cdCAgICAgXCJCQVNFXCI6IFtcImJhc2VEZWNsXCJdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtdLCBcblx0ICAgICBcIkRFU0NSSUJFXCI6IFtdLCBcblx0ICAgICBcIkFTS1wiOiBbXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW10sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtdLCBcblx0ICAgICBcIlNFTEVDVFwiOiBbXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtdLCBcblx0ICAgICBcIkRST1BcIjogW10sIFxuXHQgICAgIFwiQUREXCI6IFtdLCBcblx0ICAgICBcIk1PVkVcIjogW10sIFxuXHQgICAgIFwiQ09QWVwiOiBbXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW10sIFxuXHQgICAgIFwiV0lUSFwiOiBbXSwgXG5cdCAgICAgXCJQUkVGSVhcIjogW119LCBcblx0ICBcIj9jb25zdHJ1Y3RUcmlwbGVzXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIihcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJbXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/Z3JvdXBDbGF1c2VcIiA6IHtcblx0ICAgICBcIkdST1VQXCI6IFtcImdyb3VwQ2xhdXNlXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiT1JERVJcIjogW10sIFxuXHQgICAgIFwiSEFWSU5HXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP2hhdmluZ0NsYXVzZVwiIDoge1xuXHQgICAgIFwiSEFWSU5HXCI6IFtcImhhdmluZ0NsYXVzZVwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIk9SREVSXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP2luc2VydENsYXVzZVwiIDoge1xuXHQgICAgIFwiSU5TRVJUXCI6IFtcImluc2VydENsYXVzZVwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXSwgXG5cdCAgICAgXCJVU0lOR1wiOiBbXX0sIFxuXHQgIFwiP2xpbWl0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJMSU1JVFwiOiBbXCJsaW1pdENsYXVzZVwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/bGltaXRPZmZzZXRDbGF1c2VzXCIgOiB7XG5cdCAgICAgXCJMSU1JVFwiOiBbXCJsaW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtcImxpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/b2Zmc2V0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJPRkZTRVRcIjogW1wib2Zmc2V0Q2xhdXNlXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIj9vcihbRElTVElOQ1QsUkVEVUNFRF0pXCIgOiB7XG5cdCAgICAgXCJESVNUSU5DVFwiOiBbXCJvcihbRElTVElOQ1QsUkVEVUNFRF0pXCJdLCBcblx0ICAgICBcIlJFRFVDRURcIjogW1wib3IoW0RJU1RJTkNULFJFRFVDRURdKVwiXSwgXG5cdCAgICAgXCIqXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdfSwgXG5cdCAgXCI/b3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiIDoge1xuXHQgICAgIFwiTEFOR1RBR1wiOiBbXCJvcihbTEFOR1RBRyxbXl4saXJpUmVmXV0pXCJdLCBcblx0ICAgICBcIl5eXCI6IFtcIm9yKFtMQU5HVEFHLFteXixpcmlSZWZdXSlcIl0sIFxuXHQgICAgIFwiVU5ERUZcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiYVwiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiXlwiOiBbXSwgXG5cdCAgICAgXCIhXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwiQVNcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCJ8fFwiOiBbXSwgXG5cdCAgICAgXCImJlwiOiBbXSwgXG5cdCAgICAgXCI9XCI6IFtdLCBcblx0ICAgICBcIiE9XCI6IFtdLCBcblx0ICAgICBcIjxcIjogW10sIFxuXHQgICAgIFwiPlwiOiBbXSwgXG5cdCAgICAgXCI8PVwiOiBbXSwgXG5cdCAgICAgXCI+PVwiOiBbXSwgXG5cdCAgICAgXCJJTlwiOiBbXSwgXG5cdCAgICAgXCJOT1RcIjogW10sIFxuXHQgICAgIFwiK1wiOiBbXSwgXG5cdCAgICAgXCItXCI6IFtdLCBcblx0ICAgICBcIipcIjogW10sIFxuXHQgICAgIFwiL1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJdXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW119LCBcblx0ICBcIj9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIiA6IHtcblx0ICAgICBcIipcIjogW1wib3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIi9cIjogW1wib3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIitcIjogW10sIFxuXHQgICAgIFwiLVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiQVNcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIsXCI6IFtdLCBcblx0ICAgICBcInx8XCI6IFtdLCBcblx0ICAgICBcIiYmXCI6IFtdLCBcblx0ICAgICBcIj1cIjogW10sIFxuXHQgICAgIFwiIT1cIjogW10sIFxuXHQgICAgIFwiPFwiOiBbXSwgXG5cdCAgICAgXCI+XCI6IFtdLCBcblx0ICAgICBcIjw9XCI6IFtdLCBcblx0ICAgICBcIj49XCI6IFtdLCBcblx0ICAgICBcIklOXCI6IFtdLCBcblx0ICAgICBcIk5PVFwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdfSwgXG5cdCAgXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiIDoge1xuXHQgICAgIFwiPVwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIiE9XCI6IFtcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiPFwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIj5cIjogW1wib3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCI8PVwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIj49XCI6IFtcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSU5cIjogW1wib3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wib3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwifHxcIjogW10sIFxuXHQgICAgIFwiJiZcIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXX0sIFxuXHQgIFwiP29yZGVyQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJPUkRFUlwiOiBbXCJvcmRlckNsYXVzZVwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP3BhdGhNb2RcIiA6IHtcblx0ICAgICBcIipcIjogW1wicGF0aE1vZFwiXSwgXG5cdCAgICAgXCI/XCI6IFtcInBhdGhNb2RcIl0sIFxuXHQgICAgIFwiK1wiOiBbXCJwYXRoTW9kXCJdLCBcblx0ICAgICBcIntcIjogW1wicGF0aE1vZFwiXSwgXG5cdCAgICAgXCJ8XCI6IFtdLCBcblx0ICAgICBcIi9cIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW119LCBcblx0ICBcIj90cmlwbGVzQmxvY2tcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/dHJpcGxlc1RlbXBsYXRlXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW119LCBcblx0ICBcIj93aGVyZUNsYXVzZVwiIDoge1xuXHQgICAgIFwiV0hFUkVcIjogW1wid2hlcmVDbGF1c2VcIl0sIFxuXHQgICAgIFwie1wiOiBbXCJ3aGVyZUNsYXVzZVwiXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXSwgXG5cdCAgICAgXCJIQVZJTkdcIjogW10sIFxuXHQgICAgIFwiR1JPVVBcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdfSwgXG5cdCAgXCJbICgsKmRhdGFCbG9ja1ZhbHVlLCldXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIihcIixcIipkYXRhQmxvY2tWYWx1ZVwiLFwiKVwiXX0sIFxuXHQgIFwiWyAoLCp2YXIsKV1cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiKnZhclwiLFwiKVwiXX0sIFxuXHQgIFwiWyAoLGV4cHJlc3Npb24sKV1cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXX0sIFxuXHQgIFwiWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIihcIixcImV4cHJlc3Npb25cIixcIkFTXCIsXCJ2YXJcIixcIilcIl19LCBcblx0ICBcIlshPSxudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIiE9XCI6IFtcIiE9XCIsXCJudW1lcmljRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWyYmLHZhbHVlTG9naWNhbF1cIiA6IHtcblx0ICAgICBcIiYmXCI6IFtcIiYmXCIsXCJ2YWx1ZUxvZ2ljYWxcIl19LCBcblx0ICBcIlsqLHVuYXJ5RXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIipcIjogW1wiKlwiLFwidW5hcnlFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbKmRhdGFzZXRDbGF1c2UsV0hFUkUseyw/dHJpcGxlc1RlbXBsYXRlLH0sc29sdXRpb25Nb2RpZmllcl1cIiA6IHtcblx0ICAgICBcIldIRVJFXCI6IFtcIipkYXRhc2V0Q2xhdXNlXCIsXCJXSEVSRVwiLFwie1wiLFwiP3RyaXBsZXNUZW1wbGF0ZVwiLFwifVwiLFwic29sdXRpb25Nb2RpZmllclwiXSwgXG5cdCAgICAgXCJGUk9NXCI6IFtcIipkYXRhc2V0Q2xhdXNlXCIsXCJXSEVSRVwiLFwie1wiLFwiP3RyaXBsZXNUZW1wbGF0ZVwiLFwifVwiLFwic29sdXRpb25Nb2RpZmllclwiXX0sIFxuXHQgIFwiWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiK1wiOiBbXCIrXCIsXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIl19LCBcblx0ICBcIlssLGV4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCIsXCI6IFtcIixcIixcImV4cHJlc3Npb25cIl19LCBcblx0ICBcIlssLGludGVnZXIsfV1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiLFwiLFwiaW50ZWdlclwiLFwifVwiXX0sIFxuXHQgIFwiWywsb2JqZWN0UGF0aF1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiLFwiLFwib2JqZWN0UGF0aFwiXX0sIFxuXHQgIFwiWywsb2JqZWN0XVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCIsXCIsXCJvYmplY3RcIl19LCBcblx0ICBcIlssLG9yKFt9LFtpbnRlZ2VyLH1dXSldXCIgOiB7XG5cdCAgICAgXCIsXCI6IFtcIixcIixcIm9yKFt9LFtpbnRlZ2VyLH1dXSlcIl19LCBcblx0ICBcIlstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIi1cIjogW1wiLVwiLFwibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbLiw/Y29uc3RydWN0VHJpcGxlc11cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiLlwiLFwiP2NvbnN0cnVjdFRyaXBsZXNcIl19LCBcblx0ICBcIlsuLD90cmlwbGVzQmxvY2tdXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIi5cIixcIj90cmlwbGVzQmxvY2tcIl19LCBcblx0ICBcIlsuLD90cmlwbGVzVGVtcGxhdGVdXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIi5cIixcIj90cmlwbGVzVGVtcGxhdGVcIl19LCBcblx0ICBcIlsvLHBhdGhFbHRPckludmVyc2VdXCIgOiB7XG5cdCAgICAgXCIvXCI6IFtcIi9cIixcInBhdGhFbHRPckludmVyc2VcIl19LCBcblx0ICBcIlsvLHVuYXJ5RXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIi9cIjogW1wiL1wiLFwidW5hcnlFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCIgOiB7XG5cdCAgICAgXCI7XCI6IFtcIjtcIixcIj9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiXX0sIFxuXHQgIFwiWzssP1t2ZXJiLG9iamVjdExpc3RdXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCI7XCIsXCI/W3ZlcmIsb2JqZWN0TGlzdF1cIl19LCBcblx0ICBcIls7LFNFUEFSQVRPUiw9LHN0cmluZ11cIiA6IHtcblx0ICAgICBcIjtcIjogW1wiO1wiLFwiU0VQQVJBVE9SXCIsXCI9XCIsXCJzdHJpbmdcIl19LCBcblx0ICBcIls7LHVwZGF0ZV1cIiA6IHtcblx0ICAgICBcIjtcIjogW1wiO1wiLFwidXBkYXRlXCJdfSwgXG5cdCAgXCJbPCxudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIjxcIjogW1wiPFwiLFwibnVtZXJpY0V4cHJlc3Npb25cIl19LCBcblx0ICBcIls8PSxudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIjw9XCI6IFtcIjw9XCIsXCJudW1lcmljRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWz0sbnVtZXJpY0V4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCI9XCI6IFtcIj1cIixcIm51bWVyaWNFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbPixudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIj5cIjogW1wiPlwiLFwibnVtZXJpY0V4cHJlc3Npb25cIl19LCBcblx0ICBcIls+PSxudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIj49XCI6IFtcIj49XCIsXCJudW1lcmljRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiW0FTLHZhcl1cIiA6IHtcblx0ICAgICBcIkFTXCI6IFtcIkFTXCIsXCJ2YXJcIl19LCBcblx0ICBcIltJTixleHByZXNzaW9uTGlzdF1cIiA6IHtcblx0ICAgICBcIklOXCI6IFtcIklOXCIsXCJleHByZXNzaW9uTGlzdFwiXX0sIFxuXHQgIFwiW0lOVE8sZ3JhcGhSZWZdXCIgOiB7XG5cdCAgICAgXCJJTlRPXCI6IFtcIklOVE9cIixcImdyYXBoUmVmXCJdfSwgXG5cdCAgXCJbTkFNRUQsaXJpUmVmXVwiIDoge1xuXHQgICAgIFwiTkFNRURcIjogW1wiTkFNRURcIixcImlyaVJlZlwiXX0sIFxuXHQgIFwiW05PVCxJTixleHByZXNzaW9uTGlzdF1cIiA6IHtcblx0ICAgICBcIk5PVFwiOiBbXCJOT1RcIixcIklOXCIsXCJleHByZXNzaW9uTGlzdFwiXX0sIFxuXHQgIFwiW1VOSU9OLGdyb3VwR3JhcGhQYXR0ZXJuXVwiIDoge1xuXHQgICAgIFwiVU5JT05cIjogW1wiVU5JT05cIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJbXl4saXJpUmVmXVwiIDoge1xuXHQgICAgIFwiXl5cIjogW1wiXl5cIixcImlyaVJlZlwiXX0sIFxuXHQgIFwiW2NvbnN0cnVjdFRlbXBsYXRlLCpkYXRhc2V0Q2xhdXNlLHdoZXJlQ2xhdXNlLHNvbHV0aW9uTW9kaWZpZXJdXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcImNvbnN0cnVjdFRlbXBsYXRlXCIsXCIqZGF0YXNldENsYXVzZVwiLFwid2hlcmVDbGF1c2VcIixcInNvbHV0aW9uTW9kaWZpZXJcIl19LCBcblx0ICBcIltkZWxldGVDbGF1c2UsP2luc2VydENsYXVzZV1cIiA6IHtcblx0ICAgICBcIkRFTEVURVwiOiBbXCJkZWxldGVDbGF1c2VcIixcIj9pbnNlcnRDbGF1c2VcIl19LCBcblx0ICBcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkJJTkRcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc0Jsb2NrXCJdfSwgXG5cdCAgXCJbaW50ZWdlcixvcihbWywsb3IoW30sW2ludGVnZXIsfV1dKV0sfV0pXVwiIDoge1xuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJpbnRlZ2VyXCIsXCJvcihbWywsb3IoW30sW2ludGVnZXIsfV1dKV0sfV0pXCJdfSwgXG5cdCAgXCJbaW50ZWdlcix9XVwiIDoge1xuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJpbnRlZ2VyXCIsXCJ9XCJdfSwgXG5cdCAgXCJbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm9yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKVwiLFwiP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm9yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKVwiLFwiP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wib3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pXCIsXCI/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wib3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pXCIsXCI/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wib3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pXCIsXCI/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSlcIixcIj9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl19LCBcblx0ICBcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIl5cIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJhXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIihcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdfSwgXG5cdCAgXCJbcGF0aE9uZUluUHJvcGVydHlTZXQsKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XV1cIiA6IHtcblx0ICAgICBcImFcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIixcIipbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiLFwiKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCIsXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCIsXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCIsXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCJdfSwgXG5cdCAgXCJbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCIgOiB7XG5cdCAgICAgXCJHUkFQSFwiOiBbXCJxdWFkc05vdFRyaXBsZXNcIixcIj8uXCIsXCI/dHJpcGxlc1RlbXBsYXRlXCJdfSwgXG5cdCAgXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIiA6IHtcblx0ICAgICBcIklOU0VSVFwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIldJVEhcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl19LCBcblx0ICBcIlt2ZXJiLG9iamVjdExpc3RdXCIgOiB7XG5cdCAgICAgXCJhXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCJdfSwgXG5cdCAgXCJbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIiA6IHtcblx0ICAgICBcInxcIjogW1wifFwiLFwicGF0aE9uZUluUHJvcGVydHlTZXRcIl19LCBcblx0ICBcIlt8LHBhdGhTZXF1ZW5jZV1cIiA6IHtcblx0ICAgICBcInxcIjogW1wifFwiLFwicGF0aFNlcXVlbmNlXCJdfSwgXG5cdCAgXCJbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwifHxcIjogW1wifHxcIixcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiYWRkXCIgOiB7XG5cdCAgICAgXCJBRERcIjogW1wiQUREXCIsXCI/U0lMRU5UXzRcIixcImdyYXBoT3JEZWZhdWx0XCIsXCJUT1wiLFwiZ3JhcGhPckRlZmF1bHRcIl19LCBcblx0ICBcImFkZGl0aXZlRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCIrXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIi1cIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIihcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklGXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl19LCBcblx0ICBcImFnZ3JlZ2F0ZVwiIDoge1xuXHQgICAgIFwiQ09VTlRcIjogW1wiQ09VTlRcIixcIihcIixcIj9ESVNUSU5DVFwiLFwib3IoWyosZXhwcmVzc2lvbl0pXCIsXCIpXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJTVU1cIixcIihcIixcIj9ESVNUSU5DVFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wiTUlOXCIsXCIoXCIsXCI/RElTVElOQ1RcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcIk1BWFwiLFwiKFwiLFwiP0RJU1RJTkNUXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJBVkdcIixcIihcIixcIj9ESVNUSU5DVFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wiU0FNUExFXCIsXCIoXCIsXCI/RElTVElOQ1RcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcIkdST1VQX0NPTkNBVFwiLFwiKFwiLFwiP0RJU1RJTkNUXCIsXCJleHByZXNzaW9uXCIsXCI/WzssU0VQQVJBVE9SLD0sc3RyaW5nXVwiLFwiKVwiXX0sIFxuXHQgIFwiYWxsb3dCbm9kZXNcIiA6IHtcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcImFsbG93VmFyc1wiIDoge1xuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiYXJnTGlzdFwiIDoge1xuXHQgICAgIFwiTklMXCI6IFtcIk5JTFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIihcIixcIj9ESVNUSU5DVFwiLFwiZXhwcmVzc2lvblwiLFwiKlssLGV4cHJlc3Npb25dXCIsXCIpXCJdfSwgXG5cdCAgXCJhc2tRdWVyeVwiIDoge1xuXHQgICAgIFwiQVNLXCI6IFtcIkFTS1wiLFwiKmRhdGFzZXRDbGF1c2VcIixcIndoZXJlQ2xhdXNlXCIsXCJzb2x1dGlvbk1vZGlmaWVyXCJdfSwgXG5cdCAgXCJiYXNlRGVjbFwiIDoge1xuXHQgICAgIFwiQkFTRVwiOiBbXCJCQVNFXCIsXCJJUklfUkVGXCJdfSwgXG5cdCAgXCJiaW5kXCIgOiB7XG5cdCAgICAgXCJCSU5EXCI6IFtcIkJJTkRcIixcIihcIixcImV4cHJlc3Npb25cIixcIkFTXCIsXCJ2YXJcIixcIilcIl19LCBcblx0ICBcImJsYW5rTm9kZVwiIDoge1xuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJCTEFOS19OT0RFX0xBQkVMXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiQU5PTlwiXX0sIFxuXHQgIFwiYmxhbmtOb2RlUHJvcGVydHlMaXN0XCIgOiB7XG5cdCAgICAgXCJbXCI6IFtcIltcIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCIsXCJdXCJdfSwgXG5cdCAgXCJibGFua05vZGVQcm9wZXJ0eUxpc3RQYXRoXCIgOiB7XG5cdCAgICAgXCJbXCI6IFtcIltcIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiLFwiXVwiXX0sIFxuXHQgIFwiYm9vbGVhbkxpdGVyYWxcIiA6IHtcblx0ICAgICBcIlRSVUVcIjogW1wiVFJVRVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJGQUxTRVwiXX0sIFxuXHQgIFwiYnJhY2tldHRlZEV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXX0sIFxuXHQgIFwiYnVpbHRJbkNhbGxcIiA6IHtcblx0ICAgICBcIlNUUlwiOiBbXCJTVFJcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJMQU5HXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcIkxBTkdNQVRDSEVTXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcIkRBVEFUWVBFXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcIkJPVU5EXCIsXCIoXCIsXCJ2YXJcIixcIilcIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcIklSSVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiVVJJXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcIkJOT0RFXCIsXCJvcihbWyAoLGV4cHJlc3Npb24sKV0sTklMXSlcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJSQU5EXCIsXCJOSUxcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcIkFCU1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcIkNFSUxcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiRkxPT1JcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiUk9VTkRcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcIkNPTkNBVFwiLFwiZXhwcmVzc2lvbkxpc3RcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcInN1YnN0cmluZ0V4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcIlNUUkxFTlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcInN0clJlcGxhY2VFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcIlVDQVNFXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcIkxDQVNFXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcIkVOQ09ERV9GT1JfVVJJXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcIkNPTlRBSU5TXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJTVFJTVEFSVFNcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJTVFJFTkRTXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJTVFJCRUZPUkVcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiU1RSQUZURVJcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJZRUFSXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcIk1PTlRIXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJEQVlcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiSE9VUlNcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJNSU5VVEVTXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiU0VDT05EU1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJUSU1FWk9ORVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJUWlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiTk9XXCIsXCJOSUxcIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJVVUlEXCIsXCJOSUxcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJTVFJVVUlEXCIsXCJOSUxcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcIk1ENVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcIlNIQTFcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcIlNIQTI1NlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiU0hBMzg0XCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJTSEE1MTJcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiQ09BTEVTQ0VcIixcImV4cHJlc3Npb25MaXN0XCJdLCBcblx0ICAgICBcIklGXCI6IFtcIklGXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiU1RSTEFOR1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJTVFJEVFwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJTQU1FVEVSTVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJJU0lSSVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJJU1VSSVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcIklTQkxBTktcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcIklTTElURVJBTFwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiSVNOVU1FUklDXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcInJlZ2V4RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiZXhpc3RzRnVuY1wiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wibm90RXhpc3RzRnVuY1wiXX0sIFxuXHQgIFwiY2xlYXJcIiA6IHtcblx0ICAgICBcIkNMRUFSXCI6IFtcIkNMRUFSXCIsXCI/U0lMRU5UXzJcIixcImdyYXBoUmVmQWxsXCJdfSwgXG5cdCAgXCJjb2xsZWN0aW9uXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIihcIixcIitncmFwaE5vZGVcIixcIilcIl19LCBcblx0ICBcImNvbGxlY3Rpb25QYXRoXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIihcIixcIitncmFwaE5vZGVQYXRoXCIsXCIpXCJdfSwgXG5cdCAgXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIiFcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiK1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCItXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJVUklcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVFpcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdfSwgXG5cdCAgXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCIrXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIi1cIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIihcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl19LCBcblx0ICBcImNvbnN0cmFpbnRcIiA6IHtcblx0ICAgICBcIihcIjogW1wiYnJhY2tldHRlZEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJmdW5jdGlvbkNhbGxcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiZnVuY3Rpb25DYWxsXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImZ1bmN0aW9uQ2FsbFwiXX0sIFxuXHQgIFwiY29uc3RydWN0UXVlcnlcIiA6IHtcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXCJDT05TVFJVQ1RcIixcIm9yKFtbY29uc3RydWN0VGVtcGxhdGUsKmRhdGFzZXRDbGF1c2Usd2hlcmVDbGF1c2Usc29sdXRpb25Nb2RpZmllcl0sWypkYXRhc2V0Q2xhdXNlLFdIRVJFLHssP3RyaXBsZXNUZW1wbGF0ZSx9LHNvbHV0aW9uTW9kaWZpZXJdXSlcIl19LCBcblx0ICBcImNvbnN0cnVjdFRlbXBsYXRlXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIntcIixcIj9jb25zdHJ1Y3RUcmlwbGVzXCIsXCJ9XCJdfSwgXG5cdCAgXCJjb25zdHJ1Y3RUcmlwbGVzXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdfSwgXG5cdCAgXCJjb3B5XCIgOiB7XG5cdCAgICAgXCJDT1BZXCI6IFtcIkNPUFlcIixcIj9TSUxFTlRfNFwiLFwiZ3JhcGhPckRlZmF1bHRcIixcIlRPXCIsXCJncmFwaE9yRGVmYXVsdFwiXX0sIFxuXHQgIFwiY3JlYXRlXCIgOiB7XG5cdCAgICAgXCJDUkVBVEVcIjogW1wiQ1JFQVRFXCIsXCI/U0lMRU5UXzNcIixcImdyYXBoUmVmXCJdfSwgXG5cdCAgXCJkYXRhQmxvY2tcIiA6IHtcblx0ICAgICBcIk5JTFwiOiBbXCJvcihbaW5saW5lRGF0YU9uZVZhcixpbmxpbmVEYXRhRnVsbF0pXCJdLCBcblx0ICAgICBcIihcIjogW1wib3IoW2lubGluZURhdGFPbmVWYXIsaW5saW5lRGF0YUZ1bGxdKVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIm9yKFtpbmxpbmVEYXRhT25lVmFyLGlubGluZURhdGFGdWxsXSlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcihbaW5saW5lRGF0YU9uZVZhcixpbmxpbmVEYXRhRnVsbF0pXCJdfSwgXG5cdCAgXCJkYXRhQmxvY2tWYWx1ZVwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJib29sZWFuTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJib29sZWFuTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJVTkRFRlwiOiBbXCJVTkRFRlwiXX0sIFxuXHQgIFwiZGF0YXNldENsYXVzZVwiIDoge1xuXHQgICAgIFwiRlJPTVwiOiBbXCJGUk9NXCIsXCJvcihbZGVmYXVsdEdyYXBoQ2xhdXNlLG5hbWVkR3JhcGhDbGF1c2VdKVwiXX0sIFxuXHQgIFwiZGVmYXVsdEdyYXBoQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInNvdXJjZVNlbGVjdG9yXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInNvdXJjZVNlbGVjdG9yXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInNvdXJjZVNlbGVjdG9yXCJdfSwgXG5cdCAgXCJkZWxldGUxXCIgOiB7XG5cdCAgICAgXCJEQVRBXCI6IFtcIkRBVEFcIixcInF1YWREYXRhTm9Cbm9kZXNcIl0sIFxuXHQgICAgIFwiV0hFUkVcIjogW1wiV0hFUkVcIixcInF1YWRQYXR0ZXJuTm9Cbm9kZXNcIl0sIFxuXHQgICAgIFwie1wiOiBbXCJxdWFkUGF0dGVybk5vQm5vZGVzXCIsXCI/aW5zZXJ0Q2xhdXNlXCIsXCIqdXNpbmdDbGF1c2VcIixcIldIRVJFXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwiZGVsZXRlQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJERUxFVEVcIjogW1wiREVMRVRFXCIsXCJxdWFkUGF0dGVyblwiXX0sIFxuXHQgIFwiZGVzY3JpYmVEYXRhc2V0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJGUk9NXCI6IFtcIkZST01cIixcIm9yKFtkZWZhdWx0R3JhcGhDbGF1c2UsbmFtZWRHcmFwaENsYXVzZV0pXCJdfSwgXG5cdCAgXCJkZXNjcmliZVF1ZXJ5XCIgOiB7XG5cdCAgICAgXCJERVNDUklCRVwiOiBbXCJERVNDUklCRVwiLFwib3IoWyt2YXJPcklSSXJlZiwqXSlcIixcIipkZXNjcmliZURhdGFzZXRDbGF1c2VcIixcIj93aGVyZUNsYXVzZVwiLFwic29sdXRpb25Nb2RpZmllclwiXX0sIFxuXHQgIFwiZGlzYWxsb3dCbm9kZXNcIiA6IHtcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdfSwgXG5cdCAgXCJkaXNhbGxvd1ZhcnNcIiA6IHtcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdfSwgXG5cdCAgXCJkcm9wXCIgOiB7XG5cdCAgICAgXCJEUk9QXCI6IFtcIkRST1BcIixcIj9TSUxFTlRfMlwiLFwiZ3JhcGhSZWZBbGxcIl19LCBcblx0ICBcImV4aXN0c0Z1bmNcIiA6IHtcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJFWElTVFNcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJleHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIitcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiZXhwcmVzc2lvbkxpc3RcIiA6IHtcblx0ICAgICBcIk5JTFwiOiBbXCJOSUxcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCJleHByZXNzaW9uXCIsXCIqWywsZXhwcmVzc2lvbl1cIixcIilcIl19LCBcblx0ICBcImZpbHRlclwiIDoge1xuXHQgICAgIFwiRklMVEVSXCI6IFtcIkZJTFRFUlwiLFwiY29uc3RyYWludFwiXX0sIFxuXHQgIFwiZnVuY3Rpb25DYWxsXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiLFwiYXJnTGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIixcImFyZ0xpc3RcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCIsXCJhcmdMaXN0XCJdfSwgXG5cdCAgXCJncmFwaEdyYXBoUGF0dGVyblwiIDoge1xuXHQgICAgIFwiR1JBUEhcIjogW1wiR1JBUEhcIixcInZhck9ySVJJcmVmXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwiZ3JhcGhOb2RlXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc05vZGVcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzTm9kZVwiXX0sIFxuXHQgIFwiZ3JhcGhOb2RlUGF0aFwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJbXCI6IFtcInRyaXBsZXNOb2RlUGF0aFwiXX0sIFxuXHQgIFwiZ3JhcGhPckRlZmF1bHRcIiA6IHtcblx0ICAgICBcIkRFRkFVTFRcIjogW1wiREVGQVVMVFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIj9HUkFQSFwiLFwiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIj9HUkFQSFwiLFwiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIj9HUkFQSFwiLFwiaXJpUmVmXCJdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtcIj9HUkFQSFwiLFwiaXJpUmVmXCJdfSwgXG5cdCAgXCJncmFwaFBhdHRlcm5Ob3RUcmlwbGVzXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcImdyb3VwT3JVbmlvbkdyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXCJvcHRpb25hbEdyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXCJtaW51c0dyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXCJncmFwaEdyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtcInNlcnZpY2VHcmFwaFBhdHRlcm5cIl0sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtcImZpbHRlclwiXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtcImJpbmRcIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtcImlubGluZURhdGFcIl19LCBcblx0ICBcImdyYXBoUmVmXCIgOiB7XG5cdCAgICAgXCJHUkFQSFwiOiBbXCJHUkFQSFwiLFwiaXJpUmVmXCJdfSwgXG5cdCAgXCJncmFwaFJlZkFsbFwiIDoge1xuXHQgICAgIFwiR1JBUEhcIjogW1wiZ3JhcGhSZWZcIl0sIFxuXHQgICAgIFwiREVGQVVMVFwiOiBbXCJERUZBVUxUXCJdLCBcblx0ICAgICBcIk5BTUVEXCI6IFtcIk5BTUVEXCJdLCBcblx0ICAgICBcIkFMTFwiOiBbXCJBTExcIl19LCBcblx0ICBcImdyYXBoVGVybVwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJib29sZWFuTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJib29sZWFuTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImJsYW5rTm9kZVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImJsYW5rTm9kZVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiTklMXCJdfSwgXG5cdCAgXCJncm91cENsYXVzZVwiIDoge1xuXHQgICAgIFwiR1JPVVBcIjogW1wiR1JPVVBcIixcIkJZXCIsXCIrZ3JvdXBDb25kaXRpb25cIl19LCBcblx0ICBcImdyb3VwQ29uZGl0aW9uXCIgOiB7XG5cdCAgICAgXCJTVFJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImZ1bmN0aW9uQ2FsbFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJmdW5jdGlvbkNhbGxcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZnVuY3Rpb25DYWxsXCJdLCBcblx0ICAgICBcIihcIjogW1wiKFwiLFwiZXhwcmVzc2lvblwiLFwiP1tBUyx2YXJdXCIsXCIpXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1widmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCJdfSwgXG5cdCAgXCJncm91cEdyYXBoUGF0dGVyblwiIDoge1xuXHQgICAgIFwie1wiOiBbXCJ7XCIsXCJvcihbc3ViU2VsZWN0LGdyb3VwR3JhcGhQYXR0ZXJuU3ViXSlcIixcIn1cIl19LCBcblx0ICBcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiTUlOVVNcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkJJTkRcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXX0sIFxuXHQgIFwiZ3JvdXBPclVuaW9uR3JhcGhQYXR0ZXJuXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuXCIsXCIqW1VOSU9OLGdyb3VwR3JhcGhQYXR0ZXJuXVwiXX0sIFxuXHQgIFwiaGF2aW5nQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJIQVZJTkdcIjogW1wiSEFWSU5HXCIsXCIraGF2aW5nQ29uZGl0aW9uXCJdfSwgXG5cdCAgXCJoYXZpbmdDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJjb25zdHJhaW50XCJdfSwgXG5cdCAgXCJpbmxpbmVEYXRhXCIgOiB7XG5cdCAgICAgXCJWQUxVRVNcIjogW1wiVkFMVUVTXCIsXCJkYXRhQmxvY2tcIl19LCBcblx0ICBcImlubGluZURhdGFGdWxsXCIgOiB7XG5cdCAgICAgXCJOSUxcIjogW1wib3IoW05JTCxbICgsKnZhciwpXV0pXCIsXCJ7XCIsXCIqb3IoW1sgKCwqZGF0YUJsb2NrVmFsdWUsKV0sTklMXSlcIixcIn1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJvcihbTklMLFsgKCwqdmFyLCldXSlcIixcIntcIixcIipvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiLFwifVwiXX0sIFxuXHQgIFwiaW5saW5lRGF0YU9uZVZhclwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIixcIntcIixcIipkYXRhQmxvY2tWYWx1ZVwiLFwifVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhclwiLFwie1wiLFwiKmRhdGFCbG9ja1ZhbHVlXCIsXCJ9XCJdfSwgXG5cdCAgXCJpbnNlcnQxXCIgOiB7XG5cdCAgICAgXCJEQVRBXCI6IFtcIkRBVEFcIixcInF1YWREYXRhXCJdLCBcblx0ICAgICBcIntcIjogW1wicXVhZFBhdHRlcm5cIixcIip1c2luZ0NsYXVzZVwiLFwiV0hFUkVcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJpbnNlcnRDbGF1c2VcIiA6IHtcblx0ICAgICBcIklOU0VSVFwiOiBbXCJJTlNFUlRcIixcInF1YWRQYXR0ZXJuXCJdfSwgXG5cdCAgXCJpbnRlZ2VyXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIklOVEVHRVJcIl19LCBcblx0ICBcImlyaVJlZlwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJJUklfUkVGXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInByZWZpeGVkTmFtZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwcmVmaXhlZE5hbWVcIl19LCBcblx0ICBcImlyaVJlZk9yRnVuY3Rpb25cIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmXCIsXCI/YXJnTGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIixcIj9hcmdMaXN0XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiLFwiP2FyZ0xpc3RcIl19LCBcblx0ICBcImxpbWl0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJMSU1JVFwiOiBbXCJMSU1JVFwiLFwiSU5URUdFUlwiXX0sIFxuXHQgIFwibGltaXRPZmZzZXRDbGF1c2VzXCIgOiB7XG5cdCAgICAgXCJMSU1JVFwiOiBbXCJsaW1pdENsYXVzZVwiLFwiP29mZnNldENsYXVzZVwiXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW1wib2Zmc2V0Q2xhdXNlXCIsXCI/bGltaXRDbGF1c2VcIl19LCBcblx0ICBcImxvYWRcIiA6IHtcblx0ICAgICBcIkxPQURcIjogW1wiTE9BRFwiLFwiP1NJTEVOVF8xXCIsXCJpcmlSZWZcIixcIj9bSU5UTyxncmFwaFJlZl1cIl19LCBcblx0ICBcIm1pbnVzR3JhcGhQYXR0ZXJuXCIgOiB7XG5cdCAgICAgXCJNSU5VU1wiOiBbXCJNSU5VU1wiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcIm1vZGlmeVwiIDoge1xuXHQgICAgIFwiV0lUSFwiOiBbXCJXSVRIXCIsXCJpcmlSZWZcIixcIm9yKFtbZGVsZXRlQ2xhdXNlLD9pbnNlcnRDbGF1c2VdLGluc2VydENsYXVzZV0pXCIsXCIqdXNpbmdDbGF1c2VcIixcIldIRVJFXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwibW92ZVwiIDoge1xuXHQgICAgIFwiTU9WRVwiOiBbXCJNT1ZFXCIsXCI/U0lMRU5UXzRcIixcImdyYXBoT3JEZWZhdWx0XCIsXCJUT1wiLFwiZ3JhcGhPckRlZmF1bHRcIl19LCBcblx0ICBcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiK1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJUklcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdfSwgXG5cdCAgXCJuYW1lZEdyYXBoQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJOQU1FRFwiOiBbXCJOQU1FRFwiLFwic291cmNlU2VsZWN0b3JcIl19LCBcblx0ICBcIm5vdEV4aXN0c0Z1bmNcIiA6IHtcblx0ICAgICBcIk5PVFwiOiBbXCJOT1RcIixcIkVYSVNUU1wiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcIm51bWVyaWNFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIrXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCItXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl19LCBcblx0ICBcIm51bWVyaWNMaXRlcmFsXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm51bWVyaWNMaXRlcmFsVW5zaWduZWRcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJudW1lcmljTGl0ZXJhbFVuc2lnbmVkXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJudW1lcmljTGl0ZXJhbFVuc2lnbmVkXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsUG9zaXRpdmVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsUG9zaXRpdmVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxOZWdhdGl2ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxOZWdhdGl2ZVwiXX0sIFxuXHQgIFwibnVtZXJpY0xpdGVyYWxOZWdhdGl2ZVwiIDoge1xuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJJTlRFR0VSX05FR0FUSVZFXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiREVDSU1BTF9ORUdBVElWRVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiRE9VQkxFX05FR0FUSVZFXCJdfSwgXG5cdCAgXCJudW1lcmljTGl0ZXJhbFBvc2l0aXZlXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIklOVEVHRVJfUE9TSVRJVkVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJERUNJTUFMX1BPU0lUSVZFXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJET1VCTEVfUE9TSVRJVkVcIl19LCBcblx0ICBcIm51bWVyaWNMaXRlcmFsVW5zaWduZWRcIiA6IHtcblx0ICAgICBcIklOVEVHRVJcIjogW1wiSU5URUdFUlwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIkRFQ0lNQUxcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIkRPVUJMRVwiXX0sIFxuXHQgIFwib2JqZWN0XCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCJdfSwgXG5cdCAgXCJvYmplY3RMaXN0XCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXX0sIFxuXHQgIFwib2JqZWN0TGlzdFBhdGhcIiA6IHtcblx0ICAgICBcIihcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIltcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl19LCBcblx0ICBcIm9iamVjdFBhdGhcIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdfSwgXG5cdCAgXCJvZmZzZXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIk9GRlNFVFwiOiBbXCJPRkZTRVRcIixcIklOVEVHRVJcIl19LCBcblx0ICBcIm9wdGlvbmFsR3JhcGhQYXR0ZXJuXCIgOiB7XG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXCJPUFRJT05BTFwiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcIm9yKFsqLGV4cHJlc3Npb25dKVwiIDoge1xuXHQgICAgIFwiKlwiOiBbXCIqXCJdLCBcblx0ICAgICBcIiFcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIrXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImV4cHJlc3Npb25cIl19LCBcblx0ICBcIm9yKFsrb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKSwqXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wiK29yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCIrb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIitvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdLCBcblx0ICAgICBcIipcIjogW1wiKlwiXX0sIFxuXHQgIFwib3IoWyt2YXJPcklSSXJlZiwqXSlcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wiK3Zhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiK3Zhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiK3Zhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIit2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCIrdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiKlwiOiBbXCIqXCJdfSwgXG5cdCAgXCJvcihbQVNDLERFU0NdKVwiIDoge1xuXHQgICAgIFwiQVNDXCI6IFtcIkFTQ1wiXSwgXG5cdCAgICAgXCJERVNDXCI6IFtcIkRFU0NcIl19LCBcblx0ICBcIm9yKFtESVNUSU5DVCxSRURVQ0VEXSlcIiA6IHtcblx0ICAgICBcIkRJU1RJTkNUXCI6IFtcIkRJU1RJTkNUXCJdLCBcblx0ICAgICBcIlJFRFVDRURcIjogW1wiUkVEVUNFRFwiXX0sIFxuXHQgIFwib3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiIDoge1xuXHQgICAgIFwiTEFOR1RBR1wiOiBbXCJMQU5HVEFHXCJdLCBcblx0ICAgICBcIl5eXCI6IFtcIlteXixpcmlSZWZdXCJdfSwgXG5cdCAgXCJvcihbTklMLFsgKCwqdmFyLCldXSlcIiA6IHtcblx0ICAgICBcIk5JTFwiOiBbXCJOSUxcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJbICgsKnZhciwpXVwiXX0sIFxuXHQgIFwib3IoW1sgKCwqZGF0YUJsb2NrVmFsdWUsKV0sTklMXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wiWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiTklMXCJdfSwgXG5cdCAgXCJvcihbWyAoLGV4cHJlc3Npb24sKV0sTklMXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wiWyAoLGV4cHJlc3Npb24sKV1cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcIk5JTFwiXX0sIFxuXHQgIFwib3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCIgOiB7XG5cdCAgICAgXCIqXCI6IFtcIlsqLHVuYXJ5RXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiL1wiOiBbXCJbLyx1bmFyeUV4cHJlc3Npb25dXCJdfSwgXG5cdCAgXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiIDoge1xuXHQgICAgIFwiK1wiOiBbXCJbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIi1cIjogW1wiWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIl19LCBcblx0ICBcIm9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSlcIiA6IHtcblx0ICAgICBcIixcIjogW1wiWywsb3IoW30sW2ludGVnZXIsfV1dKV1cIl0sIFxuXHQgICAgIFwifVwiOiBbXCJ9XCJdfSwgXG5cdCAgXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCIgOiB7XG5cdCAgICAgXCI9XCI6IFtcIls9LG51bWVyaWNFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCIhPVwiOiBbXCJbIT0sbnVtZXJpY0V4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIjxcIjogW1wiWzwsbnVtZXJpY0V4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIj5cIjogW1wiWz4sbnVtZXJpY0V4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIjw9XCI6IFtcIls8PSxudW1lcmljRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiPj1cIjogW1wiWz49LG51bWVyaWNFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJTlwiOiBbXCJbSU4sZXhwcmVzc2lvbkxpc3RdXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJbTk9ULElOLGV4cHJlc3Npb25MaXN0XVwiXX0sIFxuXHQgIFwib3IoW1tjb25zdHJ1Y3RUZW1wbGF0ZSwqZGF0YXNldENsYXVzZSx3aGVyZUNsYXVzZSxzb2x1dGlvbk1vZGlmaWVyXSxbKmRhdGFzZXRDbGF1c2UsV0hFUkUseyw/dHJpcGxlc1RlbXBsYXRlLH0sc29sdXRpb25Nb2RpZmllcl1dKVwiIDoge1xuXHQgICAgIFwie1wiOiBbXCJbY29uc3RydWN0VGVtcGxhdGUsKmRhdGFzZXRDbGF1c2Usd2hlcmVDbGF1c2Usc29sdXRpb25Nb2RpZmllcl1cIl0sIFxuXHQgICAgIFwiV0hFUkVcIjogW1wiWypkYXRhc2V0Q2xhdXNlLFdIRVJFLHssP3RyaXBsZXNUZW1wbGF0ZSx9LHNvbHV0aW9uTW9kaWZpZXJdXCJdLCBcblx0ICAgICBcIkZST01cIjogW1wiWypkYXRhc2V0Q2xhdXNlLFdIRVJFLHssP3RyaXBsZXNUZW1wbGF0ZSx9LHNvbHV0aW9uTW9kaWZpZXJdXCJdfSwgXG5cdCAgXCJvcihbW2RlbGV0ZUNsYXVzZSw/aW5zZXJ0Q2xhdXNlXSxpbnNlcnRDbGF1c2VdKVwiIDoge1xuXHQgICAgIFwiREVMRVRFXCI6IFtcIltkZWxldGVDbGF1c2UsP2luc2VydENsYXVzZV1cIl0sIFxuXHQgICAgIFwiSU5TRVJUXCI6IFtcImluc2VydENsYXVzZVwiXX0sIFxuXHQgIFwib3IoW1tpbnRlZ2VyLG9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSldLFssLGludGVnZXIsfV1dKVwiIDoge1xuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJbaW50ZWdlcixvcihbWywsb3IoW30sW2ludGVnZXIsfV1dKV0sfV0pXVwiXSwgXG5cdCAgICAgXCIsXCI6IFtcIlssLGludGVnZXIsfV1cIl19LCBcblx0ICBcIm9yKFtkZWZhdWx0R3JhcGhDbGF1c2UsbmFtZWRHcmFwaENsYXVzZV0pXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImRlZmF1bHRHcmFwaENsYXVzZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJkZWZhdWx0R3JhcGhDbGF1c2VcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZGVmYXVsdEdyYXBoQ2xhdXNlXCJdLCBcblx0ICAgICBcIk5BTUVEXCI6IFtcIm5hbWVkR3JhcGhDbGF1c2VcIl19LCBcblx0ICBcIm9yKFtpbmxpbmVEYXRhT25lVmFyLGlubGluZURhdGFGdWxsXSlcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wiaW5saW5lRGF0YU9uZVZhclwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImlubGluZURhdGFPbmVWYXJcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcImlubGluZURhdGFGdWxsXCJdLCBcblx0ICAgICBcIihcIjogW1wiaW5saW5lRGF0YUZ1bGxcIl19LCBcblx0ICBcIm9yKFtpcmlSZWYsW05BTUVELGlyaVJlZl1dKVwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJOQU1FRFwiOiBbXCJbTkFNRUQsaXJpUmVmXVwiXX0sIFxuXHQgIFwib3IoW2lyaVJlZixhXSlcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJhXCJdfSwgXG5cdCAgXCJvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSlcIiA6IHtcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsUG9zaXRpdmVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsUG9zaXRpdmVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxOZWdhdGl2ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxOZWdhdGl2ZVwiXX0sIFxuXHQgIFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIgOiB7XG5cdCAgICAgXCJDT05TVFJVQ1RcIjogW1wicXVlcnlBbGxcIl0sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW1wicXVlcnlBbGxcIl0sIFxuXHQgICAgIFwiQVNLXCI6IFtcInF1ZXJ5QWxsXCJdLCBcblx0ICAgICBcIlNFTEVDVFwiOiBbXCJxdWVyeUFsbFwiXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW1widXBkYXRlQWxsXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1widXBkYXRlQWxsXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1widXBkYXRlQWxsXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiQ09QWVwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCIkXCI6IFtcInVwZGF0ZUFsbFwiXX0sIFxuXHQgIFwib3IoW3NlbGVjdFF1ZXJ5LGNvbnN0cnVjdFF1ZXJ5LGRlc2NyaWJlUXVlcnksYXNrUXVlcnldKVwiIDoge1xuXHQgICAgIFwiU0VMRUNUXCI6IFtcInNlbGVjdFF1ZXJ5XCJdLCBcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXCJjb25zdHJ1Y3RRdWVyeVwiXSwgXG5cdCAgICAgXCJERVNDUklCRVwiOiBbXCJkZXNjcmliZVF1ZXJ5XCJdLCBcblx0ICAgICBcIkFTS1wiOiBbXCJhc2tRdWVyeVwiXX0sIFxuXHQgIFwib3IoW3N1YlNlbGVjdCxncm91cEdyYXBoUGF0dGVyblN1Yl0pXCIgOiB7XG5cdCAgICAgXCJTRUxFQ1RcIjogW1wic3ViU2VsZWN0XCJdLCBcblx0ICAgICBcIntcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiTUlOVVNcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiQklORFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIn1cIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl19LCBcblx0ICBcIm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCJdLCBcblx0ICAgICBcIihcIjogW1wiWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXCJdfSwgXG5cdCAgXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIgOiB7XG5cdCAgICAgXCJeXCI6IFtcInZlcmJQYXRoXCJdLCBcblx0ICAgICBcImFcIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJ2ZXJiUGF0aFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInZlcmJQYXRoXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2ZXJiU2ltcGxlXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmVyYlNpbXBsZVwiXX0sIFxuXHQgIFwib3IoW30sW2ludGVnZXIsfV1dKVwiIDoge1xuXHQgICAgIFwifVwiOiBbXCJ9XCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiW2ludGVnZXIsfV1cIl19LCBcblx0ICBcIm9yZGVyQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJPUkRFUlwiOiBbXCJPUkRFUlwiLFwiQllcIixcIitvcmRlckNvbmRpdGlvblwiXX0sIFxuXHQgIFwib3JkZXJDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIkFTQ1wiOiBbXCJvcihbQVNDLERFU0NdKVwiLFwiYnJhY2tldHRlZEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVTQ1wiOiBbXCJvcihbQVNDLERFU0NdKVwiLFwiYnJhY2tldHRlZEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklGXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl19LCBcblx0ICBcInBhdGhcIiA6IHtcblx0ICAgICBcIl5cIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcImFcIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcIihcIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhBbHRlcm5hdGl2ZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl19LCBcblx0ICBcInBhdGhBbHRlcm5hdGl2ZVwiIDoge1xuXHQgICAgIFwiXlwiOiBbXCJwYXRoU2VxdWVuY2VcIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcImFcIjogW1wicGF0aFNlcXVlbmNlXCIsXCIqW3wscGF0aFNlcXVlbmNlXVwiXSwgXG5cdCAgICAgXCIhXCI6IFtcInBhdGhTZXF1ZW5jZVwiLFwiKlt8LHBhdGhTZXF1ZW5jZV1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJwYXRoU2VxdWVuY2VcIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aFNlcXVlbmNlXCIsXCIqW3wscGF0aFNlcXVlbmNlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJwYXRoU2VxdWVuY2VcIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhTZXF1ZW5jZVwiLFwiKlt8LHBhdGhTZXF1ZW5jZV1cIl19LCBcblx0ICBcInBhdGhFbHRcIiA6IHtcblx0ICAgICBcImFcIjogW1wicGF0aFByaW1hcnlcIixcIj9wYXRoTW9kXCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aFByaW1hcnlcIixcIj9wYXRoTW9kXCJdLCBcblx0ICAgICBcIihcIjogW1wicGF0aFByaW1hcnlcIixcIj9wYXRoTW9kXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aFByaW1hcnlcIixcIj9wYXRoTW9kXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhQcmltYXJ5XCIsXCI/cGF0aE1vZFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwYXRoUHJpbWFyeVwiLFwiP3BhdGhNb2RcIl19LCBcblx0ICBcInBhdGhFbHRPckludmVyc2VcIiA6IHtcblx0ICAgICBcImFcIjogW1wicGF0aEVsdFwiXSwgXG5cdCAgICAgXCIhXCI6IFtcInBhdGhFbHRcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJwYXRoRWx0XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aEVsdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJwYXRoRWx0XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhFbHRcIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJeXCIsXCJwYXRoRWx0XCJdfSwgXG5cdCAgXCJwYXRoTW9kXCIgOiB7XG5cdCAgICAgXCIqXCI6IFtcIipcIl0sIFxuXHQgICAgIFwiP1wiOiBbXCI/XCJdLCBcblx0ICAgICBcIitcIjogW1wiK1wiXSwgXG5cdCAgICAgXCJ7XCI6IFtcIntcIixcIm9yKFtbaW50ZWdlcixvcihbWywsb3IoW30sW2ludGVnZXIsfV1dKV0sfV0pXSxbLCxpbnRlZ2VyLH1dXSlcIl19LCBcblx0ICBcInBhdGhOZWdhdGVkUHJvcGVydHlTZXRcIiA6IHtcblx0ICAgICBcImFcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCJdLCBcblx0ICAgICBcIihcIjogW1wiKFwiLFwiP1twYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiLFwiKVwiXX0sIFxuXHQgIFwicGF0aE9uZUluUHJvcGVydHlTZXRcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJhXCJdLCBcblx0ICAgICBcIl5cIjogW1wiXlwiLFwib3IoW2lyaVJlZixhXSlcIl19LCBcblx0ICBcInBhdGhQcmltYXJ5XCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInN0b3JlUHJvcGVydHlcIixcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwiaXJpUmVmXCJdLCBcblx0ICAgICBcImFcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwiYVwiXSwgXG5cdCAgICAgXCIhXCI6IFtcIiFcIixcInBhdGhOZWdhdGVkUHJvcGVydHlTZXRcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCJwYXRoXCIsXCIpXCJdfSwgXG5cdCAgXCJwYXRoU2VxdWVuY2VcIiA6IHtcblx0ICAgICBcIl5cIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcImFcIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcIihcIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhFbHRPckludmVyc2VcIixcIipbLyxwYXRoRWx0T3JJbnZlcnNlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl19LCBcblx0ICBcInByZWZpeERlY2xcIiA6IHtcblx0ICAgICBcIlBSRUZJWFwiOiBbXCJQUkVGSVhcIixcIlBOQU1FX05TXCIsXCJJUklfUkVGXCJdfSwgXG5cdCAgXCJwcmVmaXhlZE5hbWVcIiA6IHtcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIlBOQU1FX0xOXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIlBOQU1FX05TXCJdfSwgXG5cdCAgXCJwcmltYXJ5RXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJicmFja2V0dGVkRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZk9yRnVuY3Rpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmT3JGdW5jdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJpcmlSZWZPckZ1bmN0aW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1widmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcImFnZ3JlZ2F0ZVwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wiYWdncmVnYXRlXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJhZ2dyZWdhdGVcIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcImFnZ3JlZ2F0ZVwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wiYWdncmVnYXRlXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJhZ2dyZWdhdGVcIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcImFnZ3JlZ2F0ZVwiXX0sIFxuXHQgIFwicHJvbG9ndWVcIiA6IHtcblx0ICAgICBcIlBSRUZJWFwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkJBU0VcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCIkXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJBU0tcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJTRUxFQ1RcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl19LCBcblx0ICBcInByb3BlcnR5TGlzdFwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW119LCBcblx0ICBcInByb3BlcnR5TGlzdE5vdEVtcHR5XCIgOiB7XG5cdCAgICAgXCJhXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiLFwiKls7LD9bdmVyYixvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCIsXCIqWzssP1t2ZXJiLG9iamVjdExpc3RdXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdfSwgXG5cdCAgXCJwcm9wZXJ0eUxpc3RQYXRoXCIgOiB7XG5cdCAgICAgXCJhXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIl5cIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcImFcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIiFcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIihcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RQYXRoXCIsXCIqWzssP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl19LCBcblx0ICBcInF1YWREYXRhXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIntcIixcImRpc2FsbG93VmFyc1wiLFwicXVhZHNcIixcImFsbG93VmFyc1wiLFwifVwiXX0sIFxuXHQgIFwicXVhZERhdGFOb0Jub2Rlc1wiIDoge1xuXHQgICAgIFwie1wiOiBbXCJ7XCIsXCJkaXNhbGxvd0Jub2Rlc1wiLFwiZGlzYWxsb3dWYXJzXCIsXCJxdWFkc1wiLFwiYWxsb3dWYXJzXCIsXCJhbGxvd0Jub2Rlc1wiLFwifVwiXX0sIFxuXHQgIFwicXVhZFBhdHRlcm5cIiA6IHtcblx0ICAgICBcIntcIjogW1wie1wiLFwicXVhZHNcIixcIn1cIl19LCBcblx0ICBcInF1YWRQYXR0ZXJuTm9Cbm9kZXNcIiA6IHtcblx0ICAgICBcIntcIjogW1wie1wiLFwiZGlzYWxsb3dCbm9kZXNcIixcInF1YWRzXCIsXCJhbGxvd0Jub2Rlc1wiLFwifVwiXX0sIFxuXHQgIFwicXVhZHNcIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdfSwgXG5cdCAgXCJxdWFkc05vdFRyaXBsZXNcIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcIkdSQVBIXCIsXCJ2YXJPcklSSXJlZlwiLFwie1wiLFwiP3RyaXBsZXNUZW1wbGF0ZVwiLFwifVwiXX0sIFxuXHQgIFwicXVlcnlBbGxcIiA6IHtcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXCJvcihbc2VsZWN0UXVlcnksY29uc3RydWN0UXVlcnksZGVzY3JpYmVRdWVyeSxhc2tRdWVyeV0pXCIsXCJ2YWx1ZXNDbGF1c2VcIl0sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW1wib3IoW3NlbGVjdFF1ZXJ5LGNvbnN0cnVjdFF1ZXJ5LGRlc2NyaWJlUXVlcnksYXNrUXVlcnldKVwiLFwidmFsdWVzQ2xhdXNlXCJdLCBcblx0ICAgICBcIkFTS1wiOiBbXCJvcihbc2VsZWN0UXVlcnksY29uc3RydWN0UXVlcnksZGVzY3JpYmVRdWVyeSxhc2tRdWVyeV0pXCIsXCJ2YWx1ZXNDbGF1c2VcIl0sIFxuXHQgICAgIFwiU0VMRUNUXCI6IFtcIm9yKFtzZWxlY3RRdWVyeSxjb25zdHJ1Y3RRdWVyeSxkZXNjcmliZVF1ZXJ5LGFza1F1ZXJ5XSlcIixcInZhbHVlc0NsYXVzZVwiXX0sIFxuXHQgIFwicmRmTGl0ZXJhbFwiIDoge1xuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInN0cmluZ1wiLFwiP29yKFtMQU5HVEFHLFteXixpcmlSZWZdXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInN0cmluZ1wiLFwiP29yKFtMQU5HVEFHLFteXixpcmlSZWZdXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wic3RyaW5nXCIsXCI/b3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJzdHJpbmdcIixcIj9vcihbTEFOR1RBRyxbXl4saXJpUmVmXV0pXCJdfSwgXG5cdCAgXCJyZWdleEV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIlJFR0VYXCI6IFtcIlJFR0VYXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCI/WywsZXhwcmVzc2lvbl1cIixcIilcIl19LCBcblx0ICBcInJlbGF0aW9uYWxFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCIrXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCItXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklGXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl19LCBcblx0ICBcInNlbGVjdENsYXVzZVwiIDoge1xuXHQgICAgIFwiU0VMRUNUXCI6IFtcIlNFTEVDVFwiLFwiP29yKFtESVNUSU5DVCxSRURVQ0VEXSlcIixcIm9yKFsrb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKSwqXSlcIl19LCBcblx0ICBcInNlbGVjdFF1ZXJ5XCIgOiB7XG5cdCAgICAgXCJTRUxFQ1RcIjogW1wic2VsZWN0Q2xhdXNlXCIsXCIqZGF0YXNldENsYXVzZVwiLFwid2hlcmVDbGF1c2VcIixcInNvbHV0aW9uTW9kaWZpZXJcIl19LCBcblx0ICBcInNlcnZpY2VHcmFwaFBhdHRlcm5cIiA6IHtcblx0ICAgICBcIlNFUlZJQ0VcIjogW1wiU0VSVklDRVwiLFwiP1NJTEVOVFwiLFwidmFyT3JJUklyZWZcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJzb2x1dGlvbk1vZGlmaWVyXCIgOiB7XG5cdCAgICAgXCJMSU1JVFwiOiBbXCI/Z3JvdXBDbGF1c2VcIixcIj9oYXZpbmdDbGF1c2VcIixcIj9vcmRlckNsYXVzZVwiLFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwiT1JERVJcIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwiSEFWSU5HXCI6IFtcIj9ncm91cENsYXVzZVwiLFwiP2hhdmluZ0NsYXVzZVwiLFwiP29yZGVyQ2xhdXNlXCIsXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIkdST1VQXCI6IFtcIj9ncm91cENsYXVzZVwiLFwiP2hhdmluZ0NsYXVzZVwiLFwiP29yZGVyQ2xhdXNlXCIsXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXCI/Z3JvdXBDbGF1c2VcIixcIj9oYXZpbmdDbGF1c2VcIixcIj9vcmRlckNsYXVzZVwiLFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCIkXCI6IFtcIj9ncm91cENsYXVzZVwiLFwiP2hhdmluZ0NsYXVzZVwiLFwiP29yZGVyQ2xhdXNlXCIsXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIn1cIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl19LCBcblx0ICBcInNvdXJjZVNlbGVjdG9yXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCJdfSwgXG5cdCAgXCJzcGFycWwxMVwiIDoge1xuXHQgICAgIFwiJFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkRFU0NSSUJFXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQVNLXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiSU5TRVJUXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiU0VMRUNUXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiRFJPUFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIk1PVkVcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiV0lUSFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIlBSRUZJWFwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkJBU0VcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXX0sIFxuXHQgIFwic3RvcmVQcm9wZXJ0eVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW10sIFxuXHQgICAgIFwiYVwiOiBbXX0sIFxuXHQgIFwic3RyUmVwbGFjZUV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiUkVQTEFDRVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiP1ssLGV4cHJlc3Npb25dXCIsXCIpXCJdfSwgXG5cdCAgXCJzdHJpbmdcIiA6IHtcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJTVFJJTkdfTElURVJBTDFcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcIlNUUklOR19MSVRFUkFMMlwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJTVFJJTkdfTElURVJBTF9MT05HMVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJTVFJJTkdfTElURVJBTF9MT05HMlwiXX0sIFxuXHQgIFwic3ViU2VsZWN0XCIgOiB7XG5cdCAgICAgXCJTRUxFQ1RcIjogW1wic2VsZWN0Q2xhdXNlXCIsXCJ3aGVyZUNsYXVzZVwiLFwic29sdXRpb25Nb2RpZmllclwiLFwidmFsdWVzQ2xhdXNlXCJdfSwgXG5cdCAgXCJzdWJzdHJpbmdFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCJTVUJTVFJcIjogW1wiU1VCU1RSXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCI/WywsZXhwcmVzc2lvbl1cIixcIilcIl19LCBcblx0ICBcInRyaXBsZXNCbG9ja1wiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXX0sIFxuXHQgIFwidHJpcGxlc05vZGVcIiA6IHtcblx0ICAgICBcIihcIjogW1wiY29sbGVjdGlvblwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImJsYW5rTm9kZVByb3BlcnR5TGlzdFwiXX0sIFxuXHQgIFwidHJpcGxlc05vZGVQYXRoXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImNvbGxlY3Rpb25QYXRoXCJdLCBcblx0ICAgICBcIltcIjogW1wiYmxhbmtOb2RlUHJvcGVydHlMaXN0UGF0aFwiXX0sIFxuXHQgIFwidHJpcGxlc1NhbWVTdWJqZWN0XCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzTm9kZVwiLFwicHJvcGVydHlMaXN0XCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc05vZGVcIixcInByb3BlcnR5TGlzdFwiXX0sIFxuXHQgIFwidHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzTm9kZVBhdGhcIixcInByb3BlcnR5TGlzdFBhdGhcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzTm9kZVBhdGhcIixcInByb3BlcnR5TGlzdFBhdGhcIl19LCBcblx0ICBcInRyaXBsZXNUZW1wbGF0ZVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdfSwgXG5cdCAgXCJ1bmFyeUV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIiFcIjogW1wiIVwiLFwicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiK1wiOiBbXCIrXCIsXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCItXCI6IFtcIi1cIixcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJ1cGRhdGVcIiA6IHtcblx0ICAgICBcIklOU0VSVFwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIldJVEhcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiUFJFRklYXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkJBU0VcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiJFwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXX0sIFxuXHQgIFwidXBkYXRlMVwiIDoge1xuXHQgICAgIFwiTE9BRFwiOiBbXCJsb2FkXCJdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtcImNsZWFyXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1wiZHJvcFwiXSwgXG5cdCAgICAgXCJBRERcIjogW1wiYWRkXCJdLCBcblx0ICAgICBcIk1PVkVcIjogW1wibW92ZVwiXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtcImNvcHlcIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcImNyZWF0ZVwiXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW1wiSU5TRVJUXCIsXCJpbnNlcnQxXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCJERUxFVEVcIixcImRlbGV0ZTFcIl0sIFxuXHQgICAgIFwiV0lUSFwiOiBbXCJtb2RpZnlcIl19LCBcblx0ICBcInVwZGF0ZUFsbFwiIDoge1xuXHQgICAgIFwiSU5TRVJUXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiTE9BRFwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiRFJPUFwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIk1PVkVcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiV0lUSFwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIiRcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXX0sIFxuXHQgIFwidXNpbmdDbGF1c2VcIiA6IHtcblx0ICAgICBcIlVTSU5HXCI6IFtcIlVTSU5HXCIsXCJvcihbaXJpUmVmLFtOQU1FRCxpcmlSZWZdXSlcIl19LCBcblx0ICBcInZhbHVlTG9naWNhbFwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIrXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIi1cIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIihcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl19LCBcblx0ICBcInZhbHVlc0NsYXVzZVwiIDoge1xuXHQgICAgIFwiVkFMVUVTXCI6IFtcIlZBTFVFU1wiLFwiZGF0YUJsb2NrXCJdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwidmFyXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcIlZBUjFcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJWQVIyXCJdfSwgXG5cdCAgXCJ2YXJPcklSSXJlZlwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXX0sIFxuXHQgIFwidmFyT3JUZXJtXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZ3JhcGhUZXJtXCJdfSwgXG5cdCAgXCJ2ZXJiXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInN0b3JlUHJvcGVydHlcIixcInZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwidmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJ2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJ2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJ2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJhXCI6IFtcInN0b3JlUHJvcGVydHlcIixcImFcIl19LCBcblx0ICBcInZlcmJQYXRoXCIgOiB7XG5cdCAgICAgXCJeXCI6IFtcInBhdGhcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJwYXRoXCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInBhdGhcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicGF0aFwiXX0sIFxuXHQgIFwidmVyYlNpbXBsZVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl19LCBcblx0ICBcIndoZXJlQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIj9XSEVSRVwiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl0sIFxuXHQgICAgIFwiV0hFUkVcIjogW1wiP1dIRVJFXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX1cblx0fTtcblx0XG5cdHZhciBrZXl3b3Jkcz0vXihHUk9VUF9DT05DQVR8REFUQVRZUEV8QkFTRXxQUkVGSVh8U0VMRUNUfENPTlNUUlVDVHxERVNDUklCRXxBU0t8RlJPTXxOQU1FRHxPUkRFUnxCWXxMSU1JVHxBU0N8REVTQ3xPRkZTRVR8RElTVElOQ1R8UkVEVUNFRHxXSEVSRXxHUkFQSHxPUFRJT05BTHxVTklPTnxGSUxURVJ8R1JPVVB8SEFWSU5HfEFTfFZBTFVFU3xMT0FEfENMRUFSfERST1B8Q1JFQVRFfE1PVkV8Q09QWXxTSUxFTlR8SU5TRVJUfERFTEVURXxEQVRBfFdJVEh8VE98VVNJTkd8TkFNRUR8TUlOVVN8QklORHxMQU5HTUFUQ0hFU3xMQU5HfEJPVU5EfFNBTUVURVJNfElTSVJJfElTVVJJfElTQkxBTkt8SVNMSVRFUkFMfFJFR0VYfFRSVUV8RkFMU0V8VU5ERUZ8QUREfERFRkFVTFR8QUxMfFNFUlZJQ0V8SU5UT3xJTnxOT1R8SVJJfFVSSXxCTk9ERXxSQU5EfEFCU3xDRUlMfEZMT09SfFJPVU5EfENPTkNBVHxTVFJMRU58VUNBU0V8TENBU0V8RU5DT0RFX0ZPUl9VUkl8Q09OVEFJTlN8U1RSU1RBUlRTfFNUUkVORFN8U1RSQkVGT1JFfFNUUkFGVEVSfFlFQVJ8TU9OVEh8REFZfEhPVVJTfE1JTlVURVN8U0VDT05EU3xUSU1FWk9ORXxUWnxOT1d8VVVJRHxTVFJVVUlEfE1ENXxTSEExfFNIQTI1NnxTSEEzODR8U0hBNTEyfENPQUxFU0NFfElGfFNUUkxBTkd8U1RSRFR8SVNOVU1FUklDfFNVQlNUUnxSRVBMQUNFfEVYSVNUU3xDT1VOVHxTVU18TUlOfE1BWHxBVkd8U0FNUExFfFNFUEFSQVRPUnxTVFIpL2kgO1xuXHRcblx0dmFyIHB1bmN0PS9eKFxcKnxhfFxcLnxcXHt8XFx9fCx8XFwofFxcKXw7fFxcW3xcXF18XFx8XFx8fCYmfD18IT18IXw8PXw+PXw8fD58XFwrfC18XFwvfFxcXlxcXnxcXD98XFx8fFxcXikvIDtcblx0XG5cdHZhciBkZWZhdWx0UXVlcnlUeXBlPW51bGw7XG5cdHZhciBsZXhWZXJzaW9uPVwic3BhcnFsMTFcIjtcblx0dmFyIHN0YXJ0U3ltYm9sPVwic3BhcnFsMTFcIjtcblx0dmFyIGFjY2VwdEVtcHR5PXRydWU7XG5cdFxuXHRcdGZ1bmN0aW9uIGdldFRlcm1pbmFscygpXG5cdFx0e1xuXHRcdFx0dmFyIElSSV9SRUYgPSAnPFtePD5cXFwiXFwnXFx8XFx7XFx9XFxeXFxcXFxceDAwLVxceDIwXSo+Jztcblx0XHRcdC8qXG5cdFx0XHQgKiBQTl9DSEFSU19CQVNFID1cblx0XHRcdCAqICdbQS1aXXxbYS16XXxbXFxcXHUwMEMwLVxcXFx1MDBENl18W1xcXFx1MDBEOC1cXFxcdTAwRjZdfFtcXFxcdTAwRjgtXFxcXHUwMkZGXXxbXFxcXHUwMzcwLVxcXFx1MDM3RF18W1xcXFx1MDM3Ri1cXFxcdTFGRkZdfFtcXFxcdTIwMEMtXFxcXHUyMDBEXXxbXFxcXHUyMDcwLVxcXFx1MjE4Rl18W1xcXFx1MkMwMC1cXFxcdTJGRUZdfFtcXFxcdTMwMDEtXFxcXHVEN0ZGXXxbXFxcXHVGOTAwLVxcXFx1RkRDRl18W1xcXFx1RkRGMC1cXFxcdUZGRkRdfFtcXFxcdTEwMDAwLVxcXFx1RUZGRkZdJztcblx0XHRcdCAqL1xuXHRcblx0XHRcdHZhciBQTl9DSEFSU19CQVNFID1cblx0XHRcdFx0J1tBLVphLXpcXFxcdTAwQzAtXFxcXHUwMEQ2XFxcXHUwMEQ4LVxcXFx1MDBGNlxcXFx1MDBGOC1cXFxcdTAyRkZcXFxcdTAzNzAtXFxcXHUwMzdEXFxcXHUwMzdGLVxcXFx1MUZGRlxcXFx1MjAwQy1cXFxcdTIwMERcXFxcdTIwNzAtXFxcXHUyMThGXFxcXHUyQzAwLVxcXFx1MkZFRlxcXFx1MzAwMS1cXFxcdUQ3RkZcXFxcdUY5MDAtXFxcXHVGRENGXFxcXHVGREYwLVxcXFx1RkZGRF0nO1xuXHRcdFx0dmFyIFBOX0NIQVJTX1UgPSBQTl9DSEFSU19CQVNFKyd8Xyc7XG5cdFxuXHRcdFx0dmFyIFBOX0NIQVJTPSAnKCcrUE5fQ0hBUlNfVSsnfC18WzAtOVxcXFx1MDBCN1xcXFx1MDMwMC1cXFxcdTAzNkZcXFxcdTIwM0YtXFxcXHUyMDQwXSknO1xuXHRcdFx0dmFyIFZBUk5BTUUgPSAnKCcrUE5fQ0hBUlNfVSsnfFswLTldKScrXG5cdFx0XHRcdCcoJytQTl9DSEFSU19VKyd8WzAtOVxcXFx1MDBCN1xcXFx1MDMwMC1cXFxcdTAzNkZcXFxcdTIwM0YtXFxcXHUyMDQwXSkqJztcblx0XHRcdHZhciBWQVIxID0gJ1xcXFw/JytWQVJOQU1FO1xuXHRcdFx0dmFyIFZBUjIgPSAnXFxcXCQnK1ZBUk5BTUU7XG5cdFxuXHRcdFx0dmFyIFBOX1BSRUZJWD0gJygnK1BOX0NIQVJTX0JBU0UrJykoKCgnK1BOX0NIQVJTKycpfFxcXFwuKSooJytQTl9DSEFSUysnKSk/Jztcblx0XG5cdFx0XHR2YXIgSEVYPSAnWzAtOUEtRmEtZl0nO1xuXHRcdFx0dmFyIFBFUkNFTlQ9JyglJytIRVgrSEVYKycpJztcblx0XHRcdHZhciBQTl9MT0NBTF9FU0M9JyhcXFxcXFxcXFtfflxcXFwuXFxcXC0hXFxcXCQmXFwnXFxcXChcXFxcKVxcXFwqXFxcXCssOz0vXFxcXD8jQCVdKSc7XG5cdFx0XHR2YXIgUExYPSAnKCcrUEVSQ0VOVCsnfCcrUE5fTE9DQUxfRVNDKycpJztcblx0XHRcdHZhciBQTl9MT0NBTDtcblx0XHRcdHZhciBCTEFOS19OT0RFX0xBQkVMO1xuXHRcdFx0aWYgKGxleFZlcnNpb249PVwic3BhcnFsMTFcIikge1xuXHRcdFx0XHRQTl9MT0NBTD0gJygnK1BOX0NIQVJTX1UrJ3w6fFswLTldfCcrUExYKycpKCgnK1BOX0NIQVJTKyd8XFxcXC58OnwnK1BMWCsnKSooJytQTl9DSEFSUysnfDp8JytQTFgrJykpPyc7XG5cdFx0XHRcdEJMQU5LX05PREVfTEFCRUwgPSAnXzooJytQTl9DSEFSU19VKyd8WzAtOV0pKCgnK1BOX0NIQVJTKyd8XFxcXC4pKicrUE5fQ0hBUlMrJyk/Jztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFBOX0xPQ0FMPSAnKCcrUE5fQ0hBUlNfVSsnfFswLTldKSgoKCcrUE5fQ0hBUlMrJyl8XFxcXC4pKignK1BOX0NIQVJTKycpKT8nO1xuXHRcdFx0XHRCTEFOS19OT0RFX0xBQkVMID0gJ186JytQTl9MT0NBTDtcblx0XHRcdH1cblx0XHRcdHZhciBQTkFNRV9OUyA9ICcoJytQTl9QUkVGSVgrJyk/Oic7XG5cdFx0XHR2YXIgUE5BTUVfTE4gPSBQTkFNRV9OUytQTl9MT0NBTDtcblx0XHRcdHZhciBMQU5HVEFHID0gJ0BbYS16QS1aXSsoLVthLXpBLVowLTldKykqJztcblx0XG5cdFx0XHR2YXIgRVhQT05FTlQgPSAnW2VFXVtcXFxcKy1dP1swLTldKyc7XG5cdFx0XHR2YXIgSU5URUdFUiA9ICdbMC05XSsnO1xuXHRcdFx0dmFyIERFQ0lNQUwgPSAnKChbMC05XStcXFxcLlswLTldKil8KFxcXFwuWzAtOV0rKSknO1xuXHRcdFx0dmFyIERPVUJMRSA9XG5cdFx0XHRcdCcoKFswLTldK1xcXFwuWzAtOV0qJytFWFBPTkVOVCsnKXwnK1xuXHRcdFx0XHQnKFxcXFwuWzAtOV0rJytFWFBPTkVOVCsnKXwnK1xuXHRcdFx0XHQnKFswLTldKycrRVhQT05FTlQrJykpJztcblx0XG5cdFx0XHR2YXIgSU5URUdFUl9QT1NJVElWRSA9ICdcXFxcKycgKyBJTlRFR0VSO1xuXHRcdFx0dmFyIERFQ0lNQUxfUE9TSVRJVkUgPSAnXFxcXCsnICsgREVDSU1BTDtcblx0XHRcdHZhciBET1VCTEVfUE9TSVRJVkUgID0gJ1xcXFwrJyArIERPVUJMRTtcblx0XHRcdHZhciBJTlRFR0VSX05FR0FUSVZFID0gJy0nICsgSU5URUdFUjtcblx0XHRcdHZhciBERUNJTUFMX05FR0FUSVZFID0gJy0nICsgREVDSU1BTDtcblx0XHRcdHZhciBET1VCTEVfTkVHQVRJVkUgID0gJy0nICsgRE9VQkxFO1xuXHRcblx0XHRcdC8vIHZhciBFQ0hBUiA9ICdcXFxcXFxcXFt0Ym5yZlxcXFxcIlxcXFxcXCddJztcblx0XHRcdHZhciBFQ0hBUiA9ICdcXFxcXFxcXFt0Ym5yZlxcXFxcXFxcXCJcXCddJztcblx0XG5cdFx0XHR2YXIgU1RSSU5HX0xJVEVSQUwxID0gXCInKChbXlxcXFx4MjdcXFxceDVDXFxcXHgwQVxcXFx4MERdKXxcIitFQ0hBUitcIikqJ1wiO1xuXHRcdFx0dmFyIFNUUklOR19MSVRFUkFMMiA9ICdcIigoW15cXFxceDIyXFxcXHg1Q1xcXFx4MEFcXFxceDBEXSl8JytFQ0hBUisnKSpcIic7XG5cdFxuXHRcdFx0dmFyIFNUUklOR19MSVRFUkFMX0xPTkcxID0gXCInJycoKCd8JycpPyhbXidcXFxcXFxcXF18XCIrRUNIQVIrXCIpKSonJydcIjtcblx0XHRcdHZhciBTVFJJTkdfTElURVJBTF9MT05HMiA9ICdcIlwiXCIoKFwifFwiXCIpPyhbXlwiXFxcXFxcXFxdfCcrRUNIQVIrJykpKlwiXCJcIic7XG5cdFxuXHRcdFx0dmFyIFdTICAgID0gICAgICAgICdbXFxcXHgyMFxcXFx4MDlcXFxceDBEXFxcXHgwQV0nO1xuXHRcdFx0Ly8gQ2FyZWZ1bCEgQ29kZSBtaXJyb3IgZmVlZHMgb25lIGxpbmUgYXQgYSB0aW1lIHdpdGggbm8gXFxuXG5cdFx0XHQvLyAuLi4gYnV0IG90aGVyd2lzZSBjb21tZW50IGlzIHRlcm1pbmF0ZWQgYnkgXFxuXG5cdFx0XHR2YXIgQ09NTUVOVCA9ICcjKFteXFxcXG5cXFxccl0qW1xcXFxuXFxcXHJdfFteXFxcXG5cXFxccl0qJCknO1xuXHRcdFx0dmFyIFdTX09SX0NPTU1FTlRfU1RBUiA9ICcoJytXUysnfCgnK0NPTU1FTlQrJykpKic7XG5cdFx0XHR2YXIgTklMICAgPSAnXFxcXCgnK1dTX09SX0NPTU1FTlRfU1RBUisnXFxcXCknO1xuXHRcdFx0dmFyIEFOT04gID0gJ1xcXFxbJytXU19PUl9DT01NRU5UX1NUQVIrJ1xcXFxdJztcblx0XG5cdFx0XHR2YXIgdGVybWluYWxzPVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGVybWluYWw6IFtcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiV1NcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitXUytcIitcIiksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwid3NcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJDT01NRU5UXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrQ09NTUVOVCksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwiY29tbWVudFwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIklSSV9SRUZcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitJUklfUkVGKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJ2YXJpYWJsZS0zXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiVkFSMVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1ZBUjEpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcImF0b21cIn0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIlZBUjJcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitWQVIyKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJhdG9tXCJ9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJMQU5HVEFHXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrTEFOR1RBRyksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibWV0YVwifSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiRE9VQkxFXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrRE9VQkxFKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJERUNJTUFMXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrREVDSU1BTCksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiSU5URUdFUlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0lOVEVHRVIpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkRPVUJMRV9QT1NJVElWRVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0RPVUJMRV9QT1NJVElWRSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiREVDSU1BTF9QT1NJVElWRVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0RFQ0lNQUxfUE9TSVRJVkUpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIklOVEVHRVJfUE9TSVRJVkVcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitJTlRFR0VSX1BPU0lUSVZFKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJET1VCTEVfTkVHQVRJVkVcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitET1VCTEVfTkVHQVRJVkUpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkRFQ0lNQUxfTkVHQVRJVkVcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitERUNJTUFMX05FR0FUSVZFKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJJTlRFR0VSX05FR0FUSVZFXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrSU5URUdFUl9ORUdBVElWRSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitTVFJJTkdfTElURVJBTF9MT05HMSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwic3RyaW5nXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitTVFJJTkdfTElURVJBTF9MT05HMiksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwic3RyaW5nXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiU1RSSU5HX0xJVEVSQUwxXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrU1RSSU5HX0xJVEVSQUwxKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJzdHJpbmdcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJTVFJJTkdfTElURVJBTDJcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitTVFJJTkdfTElURVJBTDIpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInN0cmluZ1wiIH0sXG5cdFxuXHRcdFx0XHRcdFx0Ly8gRW5jbG9zZWQgY29tbWVudHMgd29uJ3QgYmUgaGlnaGxpZ2h0ZWRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJOSUxcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitOSUwpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInB1bmNcIiB9LFxuXHRcblx0XHRcdFx0XHRcdC8vIEVuY2xvc2VkIGNvbW1lbnRzIHdvbid0IGJlIGhpZ2hsaWdodGVkXG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiQU5PTlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0FOT04pLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInB1bmNcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJQTkFNRV9MTlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1BOQU1FX0xOKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJzdHJpbmctMlwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIlBOQU1FX05TXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrUE5BTUVfTlMpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInN0cmluZy0yXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiQkxBTktfTk9ERV9MQUJFTFwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0JMQU5LX05PREVfTEFCRUwpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInN0cmluZy0yXCIgfVxuXHRcdFx0XHRcdF0sXG5cdFxuXHRcdFx0XHR9O1xuXHRcdFx0cmV0dXJuIHRlcm1pbmFscztcblx0XHR9XG5cdFxuXHRcdGZ1bmN0aW9uIGdldFBvc3NpYmxlcyhzeW1ib2wpXG5cdFx0e1xuXHRcdFx0dmFyIHBvc3NpYmxlcz1bXSwgcG9zc2libGVzT2I9bGwxX3RhYmxlW3N5bWJvbF07XG5cdFx0XHRpZiAocG9zc2libGVzT2IhPXVuZGVmaW5lZClcblx0XHRcdFx0Zm9yICh2YXIgcHJvcGVydHkgaW4gcG9zc2libGVzT2IpXG5cdFx0XHRcdFx0cG9zc2libGVzLnB1c2gocHJvcGVydHkudG9TdHJpbmcoKSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHBvc3NpYmxlcy5wdXNoKHN5bWJvbCk7XG5cdFx0XHRyZXR1cm4gcG9zc2libGVzO1xuXHRcdH1cblx0XG5cdFx0dmFyIHRtcz0gZ2V0VGVybWluYWxzKCk7XG5cdFx0dmFyIHRlcm1pbmFsPXRtcy50ZXJtaW5hbDtcblx0XG5cdFx0ZnVuY3Rpb24gdG9rZW5CYXNlKHN0cmVhbSwgc3RhdGUpIHtcblx0XG5cdFx0XHRmdW5jdGlvbiBuZXh0VG9rZW4oKSB7XG5cdFxuXHRcdFx0XHR2YXIgY29uc3VtZWQ9bnVsbDtcblx0XHRcdFx0Ly8gVG9rZW5zIGRlZmluZWQgYnkgaW5kaXZpZHVhbCByZWd1bGFyIGV4cHJlc3Npb25zXG5cdFx0XHRcdGZvciAodmFyIGk9MDsgaTx0ZXJtaW5hbC5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHRcdGNvbnN1bWVkPSBzdHJlYW0ubWF0Y2godGVybWluYWxbaV0ucmVnZXgsdHJ1ZSxmYWxzZSk7XG5cdFx0XHRcdFx0aWYgKGNvbnN1bWVkKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHsgY2F0OiB0ZXJtaW5hbFtpXS5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQgc3R5bGU6IHRlcm1pbmFsW2ldLnN0eWxlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQgdGV4dDogY29uc3VtZWRbMF1cblx0XHRcdFx0XHRcdFx0XHRcdCB9O1xuXHRcdFx0XHR9XG5cdFxuXHRcdFx0XHQvLyBLZXl3b3Jkc1xuXHRcdFx0XHRjb25zdW1lZD0gc3RyZWFtLm1hdGNoKGtleXdvcmRzLHRydWUsZmFsc2UpO1xuXHRcdFx0XHRpZiAoY29uc3VtZWQpXG5cdFx0XHRcdFx0cmV0dXJuIHsgY2F0OiBzdHJlYW0uY3VycmVudCgpLnRvVXBwZXJDYXNlKCksXG5cdFx0XHRcdFx0XHRcdFx0XHQgc3R5bGU6IFwia2V5d29yZFwiLFxuXHRcdFx0XHRcdFx0XHRcdFx0IHRleHQ6IGNvbnN1bWVkWzBdXG5cdFx0XHRcdFx0XHRcdFx0IH07XG5cdFxuXHRcdFx0XHQvLyBQdW5jdHVhdGlvblxuXHRcdFx0XHRjb25zdW1lZD0gc3RyZWFtLm1hdGNoKHB1bmN0LHRydWUsZmFsc2UpO1xuXHRcdFx0XHRpZiAoY29uc3VtZWQpXG5cdFx0XHRcdFx0cmV0dXJuIHsgY2F0OiBzdHJlYW0uY3VycmVudCgpLFxuXHRcdFx0XHRcdFx0XHRcdFx0IHN0eWxlOiBcInB1bmNcIixcblx0XHRcdFx0XHRcdFx0XHRcdCB0ZXh0OiBjb25zdW1lZFswXVxuXHRcdFx0XHRcdFx0XHRcdCB9O1xuXHRcblx0XHRcdFx0Ly8gVG9rZW4gaXMgaW52YWxpZFxuXHRcdFx0XHQvLyBiZXR0ZXIgY29uc3VtZSBzb21ldGhpbmcgYW55d2F5LCBvciBlbHNlIHdlJ3JlIHN0dWNrXG5cdFx0XHRcdGNvbnN1bWVkPSBzdHJlYW0ubWF0Y2goL14uW0EtWmEtejAtOV0qLyx0cnVlLGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHsgY2F0OlwiPGludmFsaWRfdG9rZW4+XCIsXG5cdFx0XHRcdFx0XHRcdFx0IHN0eWxlOiBcImVycm9yXCIsXG5cdFx0XHRcdFx0XHRcdFx0IHRleHQ6IGNvbnN1bWVkWzBdXG5cdFx0XHRcdFx0XHRcdCB9O1xuXHRcdFx0fVxuXHRcblx0XHRcdGZ1bmN0aW9uIHJlY29yZEZhaWx1cmVQb3MoKSB7XG5cdFx0XHRcdC8vIHRva2VuT2Iuc3R5bGU9IFwic3AtaW52YWxpZFwiO1xuXHRcdFx0XHR2YXIgY29sPSBzdHJlYW0uY29sdW1uKCk7XG5cdFx0XHRcdHN0YXRlLmVycm9yU3RhcnRQb3M9IGNvbDtcblx0XHRcdFx0c3RhdGUuZXJyb3JFbmRQb3M9IGNvbCt0b2tlbk9iLnRleHQubGVuZ3RoO1xuXHRcdFx0fTtcblx0XG5cdFx0XHRmdW5jdGlvbiBzZXRRdWVyeVR5cGUocykge1xuXHRcdFx0XHRpZiAoc3RhdGUucXVlcnlUeXBlPT1udWxsKSB7XG5cdFx0XHRcdFx0aWYgKHMgPT1cIlNFTEVDVFwiIHx8IHM9PVwiQ09OU1RSVUNUXCIgfHwgcz09XCJBU0tcIiB8fCBzPT1cIkRFU0NSSUJFXCIgfHwgcz09XCJJTlNFUlRcIiB8fCBzPT1cIkRFTEVURVwiIHx8IHM9PVwiTE9BRFwiIHx8IHM9PVwiQ0xFQVJcIiB8fCBzPT1cIkNSRUFURVwiIHx8IHM9PVwiRFJPUFwiIHx8IHM9PVwiQ09QWVwiIHx8IHM9PVwiTU9WRVwiIHx8IHM9PVwiQUREXCIpXG5cdFx0XHRcdFx0XHRzdGF0ZS5xdWVyeVR5cGU9cztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdC8vIFNvbWUgZmFrZSBub24tdGVybWluYWxzIGFyZSBqdXN0IHRoZXJlIHRvIGhhdmUgc2lkZS1lZmZlY3Qgb24gc3RhdGVcblx0XHRcdC8vIC0gaS5lLiBhbGxvdyBvciBkaXNhbGxvdyB2YXJpYWJsZXMgYW5kIGJub2RlcyBpbiBjZXJ0YWluIG5vbi1uZXN0aW5nXG5cdFx0XHQvLyBjb250ZXh0c1xuXHRcdFx0ZnVuY3Rpb24gc2V0U2lkZUNvbmRpdGlvbnModG9wU3ltYm9sKSB7XG5cdFx0XHRcdGlmICh0b3BTeW1ib2w9PVwiZGlzYWxsb3dWYXJzXCIpIHN0YXRlLmFsbG93VmFycz1mYWxzZTtcblx0XHRcdFx0ZWxzZSBpZiAodG9wU3ltYm9sPT1cImFsbG93VmFyc1wiKSBzdGF0ZS5hbGxvd1ZhcnM9dHJ1ZTtcblx0XHRcdFx0ZWxzZSBpZiAodG9wU3ltYm9sPT1cImRpc2FsbG93Qm5vZGVzXCIpIHN0YXRlLmFsbG93Qm5vZGVzPWZhbHNlO1xuXHRcdFx0XHRlbHNlIGlmICh0b3BTeW1ib2w9PVwiYWxsb3dCbm9kZXNcIikgc3RhdGUuYWxsb3dCbm9kZXM9dHJ1ZTtcblx0XHRcdFx0ZWxzZSBpZiAodG9wU3ltYm9sPT1cInN0b3JlUHJvcGVydHlcIikgc3RhdGUuc3RvcmVQcm9wZXJ0eT10cnVlO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZ1bmN0aW9uIGNoZWNrU2lkZUNvbmRpdGlvbnModG9wU3ltYm9sKSB7XG5cdFx0XHRcdHJldHVybihcblx0XHRcdFx0XHQoc3RhdGUuYWxsb3dWYXJzIHx8IHRvcFN5bWJvbCE9XCJ2YXJcIikgJiZcblx0XHRcdFx0XHRcdChzdGF0ZS5hbGxvd0Jub2RlcyB8fFxuXHRcdFx0XHRcdFx0ICh0b3BTeW1ib2whPVwiYmxhbmtOb2RlXCIgJiZcblx0XHRcdFx0XHRcdFx0dG9wU3ltYm9sIT1cImJsYW5rTm9kZVByb3BlcnR5TGlzdFwiICYmXG5cdFx0XHRcdFx0XHRcdHRvcFN5bWJvbCE9XCJibGFua05vZGVQcm9wZXJ0eUxpc3RQYXRoXCIpKSk7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly8gQ29kZU1pcnJvciB3b3JrcyB3aXRoIG9uZSBsaW5lIGF0IGEgdGltZSxcblx0XHRcdC8vIGJ1dCBuZXdsaW5lIHNob3VsZCBiZWhhdmUgbGlrZSB3aGl0ZXNwYWNlXG5cdFx0XHQvLyAtIGkuZS4gYSBkZWZpbml0ZSBicmVhayBiZXR3ZWVuIHRva2VucyAoZm9yIGF1dG9jb21wbGV0ZXIpXG5cdFx0XHRpZiAoc3RyZWFtLnBvcz09MClcblx0XHRcdFx0c3RhdGUucG9zc2libGVDdXJyZW50PSBzdGF0ZS5wb3NzaWJsZU5leHQ7XG5cdFxuXHRcdFx0dmFyIHRva2VuT2I9IG5leHRUb2tlbigpO1xuXHRcblx0XG5cdFx0XHRpZiAodG9rZW5PYi5jYXQ9PVwiPGludmFsaWRfdG9rZW4+XCIpIHtcblx0XHRcdFx0Ly8gc2V0IGVycm9yIHN0YXRlLCBhbmRcblx0XHRcdFx0aWYgKHN0YXRlLk9LPT10cnVlKSB7XG5cdFx0XHRcdFx0c3RhdGUuT0s9ZmFsc2U7XG5cdFx0XHRcdFx0cmVjb3JkRmFpbHVyZVBvcygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN0YXRlLmNvbXBsZXRlPWZhbHNlO1xuXHRcdFx0XHQvLyBhbGVydChcIkludmFsaWQ6XCIrdG9rZW5PYi50ZXh0KTtcblx0XHRcdFx0cmV0dXJuIHRva2VuT2Iuc3R5bGU7XG5cdFx0XHR9XG5cdFxuXHRcdFx0aWYgKHRva2VuT2IuY2F0ID09IFwiV1NcIiB8fFxuXHRcdFx0XHRcdHRva2VuT2IuY2F0ID09IFwiQ09NTUVOVFwiKSB7XG5cdFx0XHRcdHN0YXRlLnBvc3NpYmxlQ3VycmVudD0gc3RhdGUucG9zc2libGVOZXh0O1xuXHRcdFx0XHRyZXR1cm4odG9rZW5PYi5zdHlsZSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBPdGhlcndpc2UsIHJ1biB0aGUgcGFyc2VyIHVudGlsIHRoZSB0b2tlbiBpcyBkaWdlc3RlZFxuXHRcdFx0Ly8gb3IgZmFpbHVyZVxuXHRcdFx0dmFyIGZpbmlzaGVkPSBmYWxzZTtcblx0XHRcdHZhciB0b3BTeW1ib2w7XG5cdFx0XHR2YXIgdG9rZW49IHRva2VuT2IuY2F0O1xuXHRcblx0XHRcdC8vIEluY3JlbWVudGFsIExMMSBwYXJzZVxuXHRcdFx0d2hpbGUoc3RhdGUuc3RhY2subGVuZ3RoPjAgJiYgdG9rZW4gJiYgc3RhdGUuT0sgJiYgIWZpbmlzaGVkICkge1xuXHRcdFx0XHR0b3BTeW1ib2w9IHN0YXRlLnN0YWNrLnBvcCgpO1xuXHRcblx0XHRcdFx0aWYgKCFsbDFfdGFibGVbdG9wU3ltYm9sXSkge1xuXHRcdFx0XHRcdC8vIFRvcCBzeW1ib2wgaXMgYSB0ZXJtaW5hbFxuXHRcdFx0XHRcdGlmICh0b3BTeW1ib2w9PXRva2VuKSB7XG5cdFx0XHRcdFx0XHQvLyBNYXRjaGluZyB0ZXJtaW5hbHNcblx0XHRcdFx0XHRcdC8vIC0gY29uc3VtZSB0b2tlbiBmcm9tIGlucHV0IHN0cmVhbVxuXHRcdFx0XHRcdFx0ZmluaXNoZWQ9dHJ1ZTtcblx0XHRcdFx0XHRcdHNldFF1ZXJ5VHlwZSh0b3BTeW1ib2wpO1xuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgd2hldGhlciAkIChlbmQgb2YgaW5wdXQgdG9rZW4pIGlzIHBvc3MgbmV4dFxuXHRcdFx0XHRcdFx0Ly8gZm9yIGV2ZXJ5dGhpbmcgb24gc3RhY2tcblx0XHRcdFx0XHRcdHZhciBhbGxOaWxsYWJsZT10cnVlO1xuXHRcdFx0XHRcdFx0Zm9yKHZhciBzcD1zdGF0ZS5zdGFjay5sZW5ndGg7c3A+MDstLXNwKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBpdGVtPWxsMV90YWJsZVtzdGF0ZS5zdGFja1tzcC0xXV07XG5cdFx0XHRcdFx0XHRcdGlmICghaXRlbSB8fCAhaXRlbVtcIiRcIl0pXG5cdFx0XHRcdFx0XHRcdFx0YWxsTmlsbGFibGU9ZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRzdGF0ZS5jb21wbGV0ZT0gYWxsTmlsbGFibGU7XG5cdFx0XHRcdFx0XHRpZiAoc3RhdGUuc3RvcmVQcm9wZXJ0eSAmJiB0b2tlbi5jYXQhPVwicHVuY1wiKSB7XG5cdFx0XHRcdFx0XHRcdFx0c3RhdGUubGFzdFByb3BlcnR5PSB0b2tlbk9iLnRleHQ7XG5cdFx0XHRcdFx0XHRcdFx0c3RhdGUuc3RvcmVQcm9wZXJ0eT0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c3RhdGUuT0s9ZmFsc2U7XG5cdFx0XHRcdFx0XHRzdGF0ZS5jb21wbGV0ZT1mYWxzZTtcblx0XHRcdFx0XHRcdHJlY29yZEZhaWx1cmVQb3MoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdG9wU3ltYm9sIGlzIG5vbnRlcm1pbmFsXG5cdFx0XHRcdFx0Ly8gLSBzZWUgaWYgdGhlcmUgaXMgYW4gZW50cnkgZm9yIHRvcFN5bWJvbFxuXHRcdFx0XHRcdC8vIGFuZCBuZXh0VG9rZW4gaW4gdGFibGVcblx0XHRcdFx0XHR2YXIgbmV4dFN5bWJvbHM9IGxsMV90YWJsZVt0b3BTeW1ib2xdW3Rva2VuXTtcblx0XHRcdFx0XHRpZiAobmV4dFN5bWJvbHMhPXVuZGVmaW5lZFxuXHRcdFx0XHRcdFx0XHQmJiBjaGVja1NpZGVDb25kaXRpb25zKHRvcFN5bWJvbClcblx0XHRcdFx0XHRcdCApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gTWF0Y2ggLSBjb3B5IFJIUyBvZiBydWxlIHRvIHN0YWNrXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpPW5leHRTeW1ib2xzLmxlbmd0aC0xOyBpPj0wOyAtLWkpXG5cdFx0XHRcdFx0XHRcdHN0YXRlLnN0YWNrLnB1c2gobmV4dFN5bWJvbHNbaV0pO1xuXHRcdFx0XHRcdFx0Ly8gUGVmb3JtIGFueSBub24tZ3JhbW1hdGljYWwgc2lkZS1lZmZlY3RzXG5cdFx0XHRcdFx0XHRzZXRTaWRlQ29uZGl0aW9ucyh0b3BTeW1ib2wpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBObyBtYXRjaCBpbiB0YWJsZSAtIGZhaWxcblx0XHRcdFx0XHRcdHN0YXRlLk9LPWZhbHNlO1xuXHRcdFx0XHRcdFx0c3RhdGUuY29tcGxldGU9ZmFsc2U7XG5cdFx0XHRcdFx0XHRyZWNvcmRGYWlsdXJlUG9zKCk7XG5cdFx0XHRcdFx0XHRzdGF0ZS5zdGFjay5wdXNoKHRvcFN5bWJvbCk7ICAvLyBTaG92ZSB0b3BTeW1ib2wgYmFjayBvbiBzdGFja1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKCFmaW5pc2hlZCAmJiBzdGF0ZS5PSykgeyBcblx0XHRcdFx0c3RhdGUuT0s9ZmFsc2U7IHN0YXRlLmNvbXBsZXRlPWZhbHNlOyByZWNvcmRGYWlsdXJlUG9zKCk7IFxuXHQgICAgfVxuXHRcblx0XHRcdHN0YXRlLnBvc3NpYmxlQ3VycmVudD0gc3RhdGUucG9zc2libGVOZXh0O1xuXHRcdFx0c3RhdGUucG9zc2libGVOZXh0PSBnZXRQb3NzaWJsZXMoc3RhdGUuc3RhY2tbc3RhdGUuc3RhY2subGVuZ3RoLTFdKTtcblx0XG5cdFx0XHQvLyBhbGVydCh0b2tlbitcIj1cIit0b2tlbk9iLnN0eWxlKydcXG4nK3N0YXRlLnN0YWNrKTtcblx0XHRcdHJldHVybiB0b2tlbk9iLnN0eWxlO1xuXHRcdH1cblx0XG5cdFx0dmFyIGluZGVudFRvcD17XG5cdFx0XHRcIipbLCwgb2JqZWN0XVwiOiAzLFxuXHRcdFx0XCIqWygsKSxvYmplY3RdXCI6IDMsXG5cdFx0XHRcIipbKCwpLG9iamVjdFBhdGhdXCI6IDMsXG5cdFx0XHRcIipbLyxwYXRoRWx0T3JJbnZlcnNlXVwiOiAyLFxuXHRcdFx0XCJvYmplY3RcIjogMixcblx0XHRcdFwib2JqZWN0UGF0aFwiOiAyLFxuXHRcdFx0XCJvYmplY3RMaXN0XCI6IDIsXG5cdFx0XHRcIm9iamVjdExpc3RQYXRoXCI6IDIsXG5cdFx0XHRcInN0b3JlUHJvcGVydHlcIjogMixcblx0XHRcdFwicGF0aE1vZFwiOiAyLFxuXHRcdFx0XCI/cGF0aE1vZFwiOiAyLFxuXHRcdFx0XCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiOiAxLFxuXHRcdFx0XCJwcm9wZXJ0eUxpc3RcIjogMSxcblx0XHRcdFwicHJvcGVydHlMaXN0UGF0aFwiOiAxLFxuXHRcdFx0XCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIjogMSxcblx0XHRcdFwiP1t2ZXJiLG9iamVjdExpc3RdXCI6IDEsXG5cdFx0XHRcIj9bb3IoW3ZlcmJQYXRoLCB2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIjogMSxcblx0XHR9O1xuXHRcblx0XHR2YXIgaW5kZW50VGFibGU9e1xuXHRcdFx0XCJ9XCI6MSxcblx0XHRcdFwiXVwiOjAsXG5cdFx0XHRcIilcIjoxLFxuXHRcdFx0XCJ7XCI6LTEsXG5cdFx0XHRcIihcIjotMSxcblx0XHRcdFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIjogMSxcblx0XHR9O1xuXHRcdFxuXHRcblx0XHRmdW5jdGlvbiBpbmRlbnQoc3RhdGUsIHRleHRBZnRlcikge1xuXHRcdFx0dmFyIG4gPSAwOyAvLyBpbmRlbnQgbGV2ZWxcblx0XHRcdHZhciBpPXN0YXRlLnN0YWNrLmxlbmd0aC0xO1xuXHRcblx0XHRcdGlmICgvXltcXH1cXF1cXCldLy50ZXN0KHRleHRBZnRlcikpIHtcblx0XHRcdFx0Ly8gU2tpcCBzdGFjayBpdGVtcyB1bnRpbCBhZnRlciBtYXRjaGluZyBicmFja2V0XG5cdFx0XHRcdHZhciBjbG9zZUJyYWNrZXQ9dGV4dEFmdGVyLnN1YnN0cigwLDEpO1xuXHRcdFx0XHRmb3IoIDtpPj0wOy0taSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChzdGF0ZS5zdGFja1tpXT09Y2xvc2VCcmFja2V0KVxuXHRcdFx0XHRcdHstLWk7IGJyZWFrO307XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIENvbnNpZGVyIG51bGxhYmxlIG5vbi10ZXJtaW5hbHMgaWYgYXQgdG9wIG9mIHN0YWNrXG5cdFx0XHRcdHZhciBkbj1pbmRlbnRUb3Bbc3RhdGUuc3RhY2tbaV1dO1xuXHRcdFx0XHRpZiAoZG4pIHsgXG5cdFx0XHRcdFx0bis9ZG47IC0taTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Zm9yKCA7aT49MDstLWkpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBkbj1pbmRlbnRUYWJsZVtzdGF0ZS5zdGFja1tpXV07XG5cdFx0XHRcdGlmIChkbikge1xuXHRcdFx0XHRcdG4rPWRuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbiAqIGNvbmZpZy5pbmRlbnRVbml0O1xuXHRcdH07XG5cdFxuXHRcdHJldHVybiB7XG5cdFx0XHR0b2tlbjogdG9rZW5CYXNlLFxuXHRcdFx0c3RhcnRTdGF0ZTogZnVuY3Rpb24oYmFzZSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHRva2VuaXplOiB0b2tlbkJhc2UsXG5cdFx0XHRcdFx0T0s6IHRydWUsXG5cdFx0XHRcdFx0Y29tcGxldGU6IGFjY2VwdEVtcHR5LFxuXHRcdFx0XHRcdGVycm9yU3RhcnRQb3M6IG51bGwsXG5cdFx0XHRcdFx0ZXJyb3JFbmRQb3M6IG51bGwsXG5cdFx0XHRcdFx0cXVlcnlUeXBlOiBkZWZhdWx0UXVlcnlUeXBlLFxuXHRcdFx0XHRcdHBvc3NpYmxlQ3VycmVudDogZ2V0UG9zc2libGVzKHN0YXJ0U3ltYm9sKSxcblx0XHRcdFx0XHRwb3NzaWJsZU5leHQ6IGdldFBvc3NpYmxlcyhzdGFydFN5bWJvbCksXG5cdFx0XHRcdFx0YWxsb3dWYXJzIDogdHJ1ZSxcblx0XHRcdFx0XHRhbGxvd0Jub2RlcyA6IHRydWUsXG5cdFx0XHRcdFx0c3RvcmVQcm9wZXJ0eSA6IGZhbHNlLFxuXHRcdFx0XHRcdGxhc3RQcm9wZXJ0eSA6IFwiXCIsXG5cdFx0XHRcdFx0c3RhY2s6IFtzdGFydFN5bWJvbF1cblx0XHRcdFx0fTsgXG5cdFx0XHR9LFxuXHRcdFx0aW5kZW50OiBpbmRlbnQsXG5cdFx0XHRlbGVjdHJpY0NoYXJzOiBcIn1dKVwiXG5cdFx0fTtcblx0fVxuXHQpO1xuXHRDb2RlTWlycm9yLmRlZmluZU1JTUUoXCJhcHBsaWNhdGlvbi94LXNwYXJxbC1xdWVyeVwiLCBcInNwYXJxbDExXCIpO1xufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qXG4qIFRSSUUgaW1wbGVtZW50YXRpb24gaW4gSmF2YXNjcmlwdFxuKiBDb3B5cmlnaHQgKGMpIDIwMTAgU2F1cmFiaCBPZGh5YW4gfCBodHRwOi8vb2RoeWFuLmNvbVxuKiBcbiogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4qIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiogXG4qIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4qIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuKiBcbiogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4qIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuKiBUSEUgU09GVFdBUkUuXG4qXG4qIERhdGU6IE5vdiA3LCAyMDEwXG4qL1xuXG4vKlxuKiBBIHRyaWUsIG9yIHByZWZpeCB0cmVlLCBpcyBhIG11bHRpLXdheSB0cmVlIHN0cnVjdHVyZSB1c2VmdWwgZm9yIHN0b3Jpbmcgc3RyaW5ncyBvdmVyIGFuIGFscGhhYmV0LiBcbiogSXQgaGFzIGJlZW4gdXNlZCB0byBzdG9yZSBsYXJnZSBkaWN0aW9uYXJpZXMgb2YgRW5nbGlzaCAoc2F5KSB3b3JkcyBpbiBzcGVsbC1jaGVja2luZyBwcm9ncmFtcyBcbiogYW5kIGluIG5hdHVyYWwtbGFuZ3VhZ2UgXCJ1bmRlcnN0YW5kaW5nXCIgcHJvZ3JhbXMuICAgIFxuKiBAc2VlIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVHJpZVxuKiBAc2VlIGh0dHA6Ly93d3cuY3NzZS5tb25hc2guZWR1LmF1L35sbG95ZC90aWxkZUFsZ0RTL1RyZWUvVHJpZS9cbi8qXG5cbiogQGNsYXNzIFRyaWVcbiogQGNvbnN0cnVjdG9yXG4qLyAgXG5tb2R1bGUuZXhwb3J0cyA9IFRyaWUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLndvcmRzID0gMDtcbiAgICB0aGlzLnByZWZpeGVzID0gMDtcbiAgICB0aGlzLmNoaWxkcmVuID0gW107XG59O1xuXG5UcmllLnByb3RvdHlwZSA9IHtcbiAgICBcbiAgICAvKlxuICAgICogSW5zZXJ0IGEgd29yZCBpbnRvIHRoZSBkaWN0aW9uYXJ5LiBcbiAgICAqIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlIHRocm91Z2ggdGhlIHRyaWUgbm9kZXMsIGFuZCBjcmVhdGUgbmV3IG5vZGUgaWYgZG9lcyBub3QgYWxyZWFkeSBleGlzdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGluc2VydFxuICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBXb3JkIHRvIGluc2VydCBpbiB0aGUgZGljdGlvbmFyeVxuICAgICogQHBhcmFtIHtJbnRlZ2VyfSBwb3MgQ3VycmVudCBpbmRleCBvZiB0aGUgc3RyaW5nIHRvIGJlIGluc2VydGVkXG4gICAgKiBAcmV0dXJuIHtWb2lkfVxuICAgICovXG4gICAgaW5zZXJ0OiBmdW5jdGlvbihzdHIsIHBvcykge1xuICAgICAgICBpZihzdHIubGVuZ3RoID09IDApIHsgLy9ibGFuayBzdHJpbmcgY2Fubm90IGJlIGluc2VydGVkXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZihwb3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZihwb3MgPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIFQud29yZHMgKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgVC5wcmVmaXhlcyArKztcbiAgICAgICAgayA9IHN0cltwb3NdO1xuICAgICAgICBpZihULmNoaWxkcmVuW2tdID09PSB1bmRlZmluZWQpIHsgLy9pZiBub2RlIGZvciB0aGlzIGNoYXIgZG9lc24ndCBleGlzdCwgY3JlYXRlIG9uZVxuICAgICAgICAgICAgVC5jaGlsZHJlbltrXSA9IG5ldyBUcmllKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGQgPSBULmNoaWxkcmVuW2tdO1xuICAgICAgICBjaGlsZC5pbnNlcnQoc3RyLCBwb3MgKyAxKTtcbiAgICB9LFxuICAgIFxuICAgIC8qXG4gICAgKiBSZW1vdmUgYSB3b3JkIGZyb20gdGhlIGRpY3Rpb25hcnkuXG4gICAgKlxuICAgICogQG1ldGhvZCByZW1vdmVcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgV29yZCB0byBiZSByZW1vdmVkXG4gICAgKiBAcGFyYW0ge0ludGVnZXJ9IHBvcyBDdXJyZW50IGluZGV4IG9mIHRoZSBzdHJpbmcgdG8gYmUgcmVtb3ZlZFxuICAgICogQHJldHVybiB7Vm9pZH1cbiAgICAqL1xuICAgIHJlbW92ZTogZnVuY3Rpb24oc3RyLCBwb3MpIHtcbiAgICAgICAgaWYoc3RyLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZDtcbiAgICAgICAgXG4gICAgICAgIGlmKHBvcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9ICAgXG4gICAgICAgIGlmKFQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmKHBvcyA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgVC53b3JkcyAtLTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBULnByZWZpeGVzIC0tO1xuICAgICAgICBrID0gc3RyW3Bvc107XG4gICAgICAgIGNoaWxkID0gVC5jaGlsZHJlbltrXTtcbiAgICAgICAgY2hpbGQucmVtb3ZlKHN0ciwgcG9zICsgMSk7XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogVXBkYXRlIGFuIGV4aXN0aW5nIHdvcmQgaW4gdGhlIGRpY3Rpb25hcnkuIFxuICAgICogVGhpcyBtZXRob2QgcmVtb3ZlcyB0aGUgb2xkIHdvcmQgZnJvbSB0aGUgZGljdGlvbmFyeSBhbmQgaW5zZXJ0cyB0aGUgbmV3IHdvcmQuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJPbGQgVGhlIG9sZCB3b3JkIHRvIGJlIHJlcGxhY2VkXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyTmV3IFRoZSBuZXcgd29yZCB0byBiZSBpbnNlcnRlZFxuICAgICogQHJldHVybiB7Vm9pZH1cbiAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24oc3RyT2xkLCBzdHJOZXcpIHtcbiAgICAgICAgaWYoc3RyT2xkLmxlbmd0aCA9PSAwIHx8IHN0ck5ldy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlKHN0ck9sZCk7XG4gICAgICAgIHRoaXMuaW5zZXJ0KHN0ck5ldyk7XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogQ291bnQgdGhlIG51bWJlciBvZiB0aW1lcyBhIGdpdmVuIHdvcmQgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgZGljdGlvbmFyeVxuICAgICpcbiAgICAqIEBtZXRob2QgY291bnRXb3JkXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFdvcmQgdG8gZ2V0IGNvdW50IG9mXG4gICAgKiBAcGFyYW0ge0ludGVnZXJ9IHBvcyBDdXJyZW50IGluZGV4IG9mIHRoZSBnaXZlbiB3b3JkXG4gICAgKiBAcmV0dXJuIHtJbnRlZ2VyfSBUaGUgbnVtYmVyIG9mIHRpbWVzIGEgZ2l2ZW4gd29yZCBleGlzdHMgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqL1xuICAgIGNvdW50V29yZDogZnVuY3Rpb24oc3RyLCBwb3MpIHtcbiAgICAgICAgaWYoc3RyLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIFQgPSB0aGlzLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIGNoaWxkLFxuICAgICAgICAgICAgcmV0ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGlmKHBvcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9ICAgXG4gICAgICAgIGlmKHBvcyA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFQud29yZHM7XG4gICAgICAgIH1cbiAgICAgICAgayA9IHN0cltwb3NdO1xuICAgICAgICBjaGlsZCA9IFQuY2hpbGRyZW5ba107XG4gICAgICAgIGlmKGNoaWxkICE9PSB1bmRlZmluZWQpIHsgLy9ub2RlIGV4aXN0c1xuICAgICAgICAgICAgcmV0ID0gY2hpbGQuY291bnRXb3JkKHN0ciwgcG9zICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIFxuICAgIC8qXG4gICAgKiBDb3VudCB0aGUgbnVtYmVyIG9mIHRpbWVzIGEgZ2l2ZW4gcHJlZml4IGV4aXN0cyBpbiB0aGUgZGljdGlvbmFyeVxuICAgICpcbiAgICAqIEBtZXRob2QgY291bnRQcmVmaXhcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgUHJlZml4IHRvIGdldCBjb3VudCBvZlxuICAgICogQHBhcmFtIHtJbnRlZ2VyfSBwb3MgQ3VycmVudCBpbmRleCBvZiB0aGUgZ2l2ZW4gcHJlZml4XG4gICAgKiBAcmV0dXJuIHtJbnRlZ2VyfSBUaGUgbnVtYmVyIG9mIHRpbWVzIGEgZ2l2ZW4gcHJlZml4IGV4aXN0cyBpbiB0aGUgZGljdGlvbmFyeVxuICAgICovXG4gICAgY291bnRQcmVmaXg6IGZ1bmN0aW9uKHN0ciwgcG9zKSB7XG4gICAgICAgIGlmKHN0ci5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZCxcbiAgICAgICAgICAgIHJldCA9IDA7XG5cbiAgICAgICAgaWYocG9zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYocG9zID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gVC5wcmVmaXhlcztcbiAgICAgICAgfVxuICAgICAgICB2YXIgayA9IHN0cltwb3NdO1xuICAgICAgICBjaGlsZCA9IFQuY2hpbGRyZW5ba107XG4gICAgICAgIGlmKGNoaWxkICE9PSB1bmRlZmluZWQpIHsgLy9ub2RlIGV4aXN0c1xuICAgICAgICAgICAgcmV0ID0gY2hpbGQuY291bnRQcmVmaXgoc3RyLCBwb3MgKyAxKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDsgXG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogRmluZCBhIHdvcmQgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqXG4gICAgKiBAbWV0aG9kIGZpbmRcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIHdvcmQgdG8gZmluZCBpbiB0aGUgZGljdGlvbmFyeVxuICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgd29yZCBleGlzdHMgaW4gdGhlIGRpY3Rpb25hcnksIGVsc2UgZmFsc2VcbiAgICAqL1xuICAgIGZpbmQ6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICBpZihzdHIubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYodGhpcy5jb3VudFdvcmQoc3RyKSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogR2V0IGFsbCB3b3JkcyBpbiB0aGUgZGljdGlvbmFyeVxuICAgICpcbiAgICAqIEBtZXRob2QgZ2V0QWxsV29yZHNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgUHJlZml4IG9mIGN1cnJlbnQgd29yZFxuICAgICogQHJldHVybiB7QXJyYXl9IEFycmF5IG9mIHdvcmRzIGluIHRoZSBkaWN0aW9uYXJ5XG4gICAgKi9cbiAgICBnZXRBbGxXb3JkczogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZCxcbiAgICAgICAgICAgIHJldCA9IFtdO1xuICAgICAgICBpZihzdHIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RyID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBpZihUID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZihULndvcmRzID4gMCkge1xuICAgICAgICAgICAgcmV0LnB1c2goc3RyKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IoayBpbiBULmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjaGlsZCA9IFQuY2hpbGRyZW5ba107XG4gICAgICAgICAgICByZXQgPSByZXQuY29uY2F0KGNoaWxkLmdldEFsbFdvcmRzKHN0ciArIGspKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgXG4gICAgLypcbiAgICAqIEF1dG9jb21wbGV0ZSBhIGdpdmVuIHByZWZpeFxuICAgICpcbiAgICAqIEBtZXRob2QgYXV0b0NvbXBsZXRlXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFByZWZpeCB0byBiZSBjb21wbGV0ZWQgYmFzZWQgb24gZGljdGlvbmFyeSBlbnRyaWVzXG4gICAgKiBAcGFyYW0ge0ludGVnZXJ9IHBvcyBDdXJyZW50IGluZGV4IG9mIHRoZSBwcmVmaXhcbiAgICAqIEByZXR1cm4ge0FycmF5fSBBcnJheSBvZiBwb3NzaWJsZSBzdWdnZXN0aW9uc1xuICAgICovXG4gICAgYXV0b0NvbXBsZXRlOiBmdW5jdGlvbihzdHIsIHBvcykge1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZDtcbiAgICAgICAgaWYoc3RyLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRpZiAocG9zID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIFQuZ2V0QWxsV29yZHMoc3RyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBbXTtcblx0XHRcdH1cbiAgICAgICAgfVxuICAgICAgICBpZihwb3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSAgIFxuICAgICAgICBrID0gc3RyW3Bvc107XG4gICAgICAgIGNoaWxkID0gVC5jaGlsZHJlbltrXTtcbiAgICAgICAgaWYoY2hpbGQgPT09IHVuZGVmaW5lZCkgeyAvL25vZGUgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmKHBvcyA9PT0gc3RyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZC5nZXRBbGxXb3JkcyhzdHIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaGlsZC5hdXRvQ29tcGxldGUoc3RyLCBwb3MgKyAxKTtcbiAgICB9XG59O1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLy8gQ29kZU1pcnJvciwgY29weXJpZ2h0IChjKSBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCBvdGhlcnNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIGFuIE1JVCBsaWNlbnNlOiBodHRwOi8vY29kZW1pcnJvci5uZXQvTElDRU5TRVxuXG4oZnVuY3Rpb24obW9kKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT0gXCJvYmplY3RcIikgLy8gQ29tbW9uSlNcbiAgICBtb2QoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgLy8gQU1EXG4gICAgZGVmaW5lKFtcIi4uLy4uL2xpYi9jb2RlbWlycm9yXCJdLCBtb2QpO1xuICBlbHNlIC8vIFBsYWluIGJyb3dzZXIgZW52XG4gICAgbW9kKENvZGVNaXJyb3IpO1xufSkoZnVuY3Rpb24oQ29kZU1pcnJvcikge1xuICB2YXIgaWVfbHQ4ID0gL01TSUUgXFxkLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmXG4gICAgKGRvY3VtZW50LmRvY3VtZW50TW9kZSA9PSBudWxsIHx8IGRvY3VtZW50LmRvY3VtZW50TW9kZSA8IDgpO1xuXG4gIHZhciBQb3MgPSBDb2RlTWlycm9yLlBvcztcblxuICB2YXIgbWF0Y2hpbmcgPSB7XCIoXCI6IFwiKT5cIiwgXCIpXCI6IFwiKDxcIiwgXCJbXCI6IFwiXT5cIiwgXCJdXCI6IFwiWzxcIiwgXCJ7XCI6IFwifT5cIiwgXCJ9XCI6IFwiezxcIn07XG5cbiAgZnVuY3Rpb24gZmluZE1hdGNoaW5nQnJhY2tldChjbSwgd2hlcmUsIHN0cmljdCwgY29uZmlnKSB7XG4gICAgdmFyIGxpbmUgPSBjbS5nZXRMaW5lSGFuZGxlKHdoZXJlLmxpbmUpLCBwb3MgPSB3aGVyZS5jaCAtIDE7XG4gICAgdmFyIG1hdGNoID0gKHBvcyA+PSAwICYmIG1hdGNoaW5nW2xpbmUudGV4dC5jaGFyQXQocG9zKV0pIHx8IG1hdGNoaW5nW2xpbmUudGV4dC5jaGFyQXQoKytwb3MpXTtcbiAgICBpZiAoIW1hdGNoKSByZXR1cm4gbnVsbDtcbiAgICB2YXIgZGlyID0gbWF0Y2guY2hhckF0KDEpID09IFwiPlwiID8gMSA6IC0xO1xuICAgIGlmIChzdHJpY3QgJiYgKGRpciA+IDApICE9IChwb3MgPT0gd2hlcmUuY2gpKSByZXR1cm4gbnVsbDtcbiAgICB2YXIgc3R5bGUgPSBjbS5nZXRUb2tlblR5cGVBdChQb3Mod2hlcmUubGluZSwgcG9zICsgMSkpO1xuXG4gICAgdmFyIGZvdW5kID0gc2NhbkZvckJyYWNrZXQoY20sIFBvcyh3aGVyZS5saW5lLCBwb3MgKyAoZGlyID4gMCA/IDEgOiAwKSksIGRpciwgc3R5bGUgfHwgbnVsbCwgY29uZmlnKTtcbiAgICBpZiAoZm91bmQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtmcm9tOiBQb3Mod2hlcmUubGluZSwgcG9zKSwgdG86IGZvdW5kICYmIGZvdW5kLnBvcyxcbiAgICAgICAgICAgIG1hdGNoOiBmb3VuZCAmJiBmb3VuZC5jaCA9PSBtYXRjaC5jaGFyQXQoMCksIGZvcndhcmQ6IGRpciA+IDB9O1xuICB9XG5cbiAgLy8gYnJhY2tldFJlZ2V4IGlzIHVzZWQgdG8gc3BlY2lmeSB3aGljaCB0eXBlIG9mIGJyYWNrZXQgdG8gc2NhblxuICAvLyBzaG91bGQgYmUgYSByZWdleHAsIGUuZy4gL1tbXFxdXS9cbiAgLy9cbiAgLy8gTm90ZTogSWYgXCJ3aGVyZVwiIGlzIG9uIGFuIG9wZW4gYnJhY2tldCwgdGhlbiB0aGlzIGJyYWNrZXQgaXMgaWdub3JlZC5cbiAgLy9cbiAgLy8gUmV0dXJucyBmYWxzZSB3aGVuIG5vIGJyYWNrZXQgd2FzIGZvdW5kLCBudWxsIHdoZW4gaXQgcmVhY2hlZFxuICAvLyBtYXhTY2FuTGluZXMgYW5kIGdhdmUgdXBcbiAgZnVuY3Rpb24gc2NhbkZvckJyYWNrZXQoY20sIHdoZXJlLCBkaXIsIHN0eWxlLCBjb25maWcpIHtcbiAgICB2YXIgbWF4U2NhbkxlbiA9IChjb25maWcgJiYgY29uZmlnLm1heFNjYW5MaW5lTGVuZ3RoKSB8fCAxMDAwMDtcbiAgICB2YXIgbWF4U2NhbkxpbmVzID0gKGNvbmZpZyAmJiBjb25maWcubWF4U2NhbkxpbmVzKSB8fCAxMDAwO1xuXG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIHJlID0gY29uZmlnICYmIGNvbmZpZy5icmFja2V0UmVnZXggPyBjb25maWcuYnJhY2tldFJlZ2V4IDogL1soKXt9W1xcXV0vO1xuICAgIHZhciBsaW5lRW5kID0gZGlyID4gMCA/IE1hdGgubWluKHdoZXJlLmxpbmUgKyBtYXhTY2FuTGluZXMsIGNtLmxhc3RMaW5lKCkgKyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgICA6IE1hdGgubWF4KGNtLmZpcnN0TGluZSgpIC0gMSwgd2hlcmUubGluZSAtIG1heFNjYW5MaW5lcyk7XG4gICAgZm9yICh2YXIgbGluZU5vID0gd2hlcmUubGluZTsgbGluZU5vICE9IGxpbmVFbmQ7IGxpbmVObyArPSBkaXIpIHtcbiAgICAgIHZhciBsaW5lID0gY20uZ2V0TGluZShsaW5lTm8pO1xuICAgICAgaWYgKCFsaW5lKSBjb250aW51ZTtcbiAgICAgIHZhciBwb3MgPSBkaXIgPiAwID8gMCA6IGxpbmUubGVuZ3RoIC0gMSwgZW5kID0gZGlyID4gMCA/IGxpbmUubGVuZ3RoIDogLTE7XG4gICAgICBpZiAobGluZS5sZW5ndGggPiBtYXhTY2FuTGVuKSBjb250aW51ZTtcbiAgICAgIGlmIChsaW5lTm8gPT0gd2hlcmUubGluZSkgcG9zID0gd2hlcmUuY2ggLSAoZGlyIDwgMCA/IDEgOiAwKTtcbiAgICAgIGZvciAoOyBwb3MgIT0gZW5kOyBwb3MgKz0gZGlyKSB7XG4gICAgICAgIHZhciBjaCA9IGxpbmUuY2hhckF0KHBvcyk7XG4gICAgICAgIGlmIChyZS50ZXN0KGNoKSAmJiAoc3R5bGUgPT09IHVuZGVmaW5lZCB8fCBjbS5nZXRUb2tlblR5cGVBdChQb3MobGluZU5vLCBwb3MgKyAxKSkgPT0gc3R5bGUpKSB7XG4gICAgICAgICAgdmFyIG1hdGNoID0gbWF0Y2hpbmdbY2hdO1xuICAgICAgICAgIGlmICgobWF0Y2guY2hhckF0KDEpID09IFwiPlwiKSA9PSAoZGlyID4gMCkpIHN0YWNrLnB1c2goY2gpO1xuICAgICAgICAgIGVsc2UgaWYgKCFzdGFjay5sZW5ndGgpIHJldHVybiB7cG9zOiBQb3MobGluZU5vLCBwb3MpLCBjaDogY2h9O1xuICAgICAgICAgIGVsc2Ugc3RhY2sucG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpbmVObyAtIGRpciA9PSAoZGlyID4gMCA/IGNtLmxhc3RMaW5lKCkgOiBjbS5maXJzdExpbmUoKSkgPyBmYWxzZSA6IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBtYXRjaEJyYWNrZXRzKGNtLCBhdXRvY2xlYXIsIGNvbmZpZykge1xuICAgIC8vIERpc2FibGUgYnJhY2UgbWF0Y2hpbmcgaW4gbG9uZyBsaW5lcywgc2luY2UgaXQnbGwgY2F1c2UgaHVnZWx5IHNsb3cgdXBkYXRlc1xuICAgIHZhciBtYXhIaWdobGlnaHRMZW4gPSBjbS5zdGF0ZS5tYXRjaEJyYWNrZXRzLm1heEhpZ2hsaWdodExpbmVMZW5ndGggfHwgMTAwMDtcbiAgICB2YXIgbWFya3MgPSBbXSwgcmFuZ2VzID0gY20ubGlzdFNlbGVjdGlvbnMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG1hdGNoID0gcmFuZ2VzW2ldLmVtcHR5KCkgJiYgZmluZE1hdGNoaW5nQnJhY2tldChjbSwgcmFuZ2VzW2ldLmhlYWQsIGZhbHNlLCBjb25maWcpO1xuICAgICAgaWYgKG1hdGNoICYmIGNtLmdldExpbmUobWF0Y2guZnJvbS5saW5lKS5sZW5ndGggPD0gbWF4SGlnaGxpZ2h0TGVuKSB7XG4gICAgICAgIHZhciBzdHlsZSA9IG1hdGNoLm1hdGNoID8gXCJDb2RlTWlycm9yLW1hdGNoaW5nYnJhY2tldFwiIDogXCJDb2RlTWlycm9yLW5vbm1hdGNoaW5nYnJhY2tldFwiO1xuICAgICAgICBtYXJrcy5wdXNoKGNtLm1hcmtUZXh0KG1hdGNoLmZyb20sIFBvcyhtYXRjaC5mcm9tLmxpbmUsIG1hdGNoLmZyb20uY2ggKyAxKSwge2NsYXNzTmFtZTogc3R5bGV9KSk7XG4gICAgICAgIGlmIChtYXRjaC50byAmJiBjbS5nZXRMaW5lKG1hdGNoLnRvLmxpbmUpLmxlbmd0aCA8PSBtYXhIaWdobGlnaHRMZW4pXG4gICAgICAgICAgbWFya3MucHVzaChjbS5tYXJrVGV4dChtYXRjaC50bywgUG9zKG1hdGNoLnRvLmxpbmUsIG1hdGNoLnRvLmNoICsgMSksIHtjbGFzc05hbWU6IHN0eWxlfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXJrcy5sZW5ndGgpIHtcbiAgICAgIC8vIEtsdWRnZSB0byB3b3JrIGFyb3VuZCB0aGUgSUUgYnVnIGZyb20gaXNzdWUgIzExOTMsIHdoZXJlIHRleHRcbiAgICAgIC8vIGlucHV0IHN0b3BzIGdvaW5nIHRvIHRoZSB0ZXh0YXJlIHdoZXZlciB0aGlzIGZpcmVzLlxuICAgICAgaWYgKGllX2x0OCAmJiBjbS5zdGF0ZS5mb2N1c2VkKSBjbS5kaXNwbGF5LmlucHV0LmZvY3VzKCk7XG5cbiAgICAgIHZhciBjbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjbS5vcGVyYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrcy5sZW5ndGg7IGkrKykgbWFya3NbaV0uY2xlYXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgaWYgKGF1dG9jbGVhcikgc2V0VGltZW91dChjbGVhciwgODAwKTtcbiAgICAgIGVsc2UgcmV0dXJuIGNsZWFyO1xuICAgIH1cbiAgfVxuXG4gIHZhciBjdXJyZW50bHlIaWdobGlnaHRlZCA9IG51bGw7XG4gIGZ1bmN0aW9uIGRvTWF0Y2hCcmFja2V0cyhjbSkge1xuICAgIGNtLm9wZXJhdGlvbihmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjdXJyZW50bHlIaWdobGlnaHRlZCkge2N1cnJlbnRseUhpZ2hsaWdodGVkKCk7IGN1cnJlbnRseUhpZ2hsaWdodGVkID0gbnVsbDt9XG4gICAgICBjdXJyZW50bHlIaWdobGlnaHRlZCA9IG1hdGNoQnJhY2tldHMoY20sIGZhbHNlLCBjbS5zdGF0ZS5tYXRjaEJyYWNrZXRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIENvZGVNaXJyb3IuZGVmaW5lT3B0aW9uKFwibWF0Y2hCcmFja2V0c1wiLCBmYWxzZSwgZnVuY3Rpb24oY20sIHZhbCwgb2xkKSB7XG4gICAgaWYgKG9sZCAmJiBvbGQgIT0gQ29kZU1pcnJvci5Jbml0KVxuICAgICAgY20ub2ZmKFwiY3Vyc29yQWN0aXZpdHlcIiwgZG9NYXRjaEJyYWNrZXRzKTtcbiAgICBpZiAodmFsKSB7XG4gICAgICBjbS5zdGF0ZS5tYXRjaEJyYWNrZXRzID0gdHlwZW9mIHZhbCA9PSBcIm9iamVjdFwiID8gdmFsIDoge307XG4gICAgICBjbS5vbihcImN1cnNvckFjdGl2aXR5XCIsIGRvTWF0Y2hCcmFja2V0cyk7XG4gICAgfVxuICB9KTtcblxuICBDb2RlTWlycm9yLmRlZmluZUV4dGVuc2lvbihcIm1hdGNoQnJhY2tldHNcIiwgZnVuY3Rpb24oKSB7bWF0Y2hCcmFja2V0cyh0aGlzLCB0cnVlKTt9KTtcbiAgQ29kZU1pcnJvci5kZWZpbmVFeHRlbnNpb24oXCJmaW5kTWF0Y2hpbmdCcmFja2V0XCIsIGZ1bmN0aW9uKHBvcywgc3RyaWN0LCBjb25maWcpe1xuICAgIHJldHVybiBmaW5kTWF0Y2hpbmdCcmFja2V0KHRoaXMsIHBvcywgc3RyaWN0LCBjb25maWcpO1xuICB9KTtcbiAgQ29kZU1pcnJvci5kZWZpbmVFeHRlbnNpb24oXCJzY2FuRm9yQnJhY2tldFwiLCBmdW5jdGlvbihwb3MsIGRpciwgc3R5bGUsIGNvbmZpZyl7XG4gICAgcmV0dXJuIHNjYW5Gb3JCcmFja2V0KHRoaXMsIHBvcywgZGlyLCBzdHlsZSwgY29uZmlnKTtcbiAgfSk7XG59KTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLy8gQ29kZU1pcnJvciwgY29weXJpZ2h0IChjKSBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCBvdGhlcnNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIGFuIE1JVCBsaWNlbnNlOiBodHRwOi8vY29kZW1pcnJvci5uZXQvTElDRU5TRVxuXG4oZnVuY3Rpb24obW9kKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT0gXCJvYmplY3RcIikgLy8gQ29tbW9uSlNcbiAgICBtb2QoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgLy8gQU1EXG4gICAgZGVmaW5lKFtcIi4uLy4uL2xpYi9jb2RlbWlycm9yXCJdLCBtb2QpO1xuICBlbHNlIC8vIFBsYWluIGJyb3dzZXIgZW52XG4gICAgbW9kKENvZGVNaXJyb3IpO1xufSkoZnVuY3Rpb24oQ29kZU1pcnJvcikge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgSElOVF9FTEVNRU5UX0NMQVNTICAgICAgICA9IFwiQ29kZU1pcnJvci1oaW50XCI7XG4gIHZhciBBQ1RJVkVfSElOVF9FTEVNRU5UX0NMQVNTID0gXCJDb2RlTWlycm9yLWhpbnQtYWN0aXZlXCI7XG5cbiAgLy8gVGhpcyBpcyB0aGUgb2xkIGludGVyZmFjZSwga2VwdCBhcm91bmQgZm9yIG5vdyB0byBzdGF5XG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmxlLlxuICBDb2RlTWlycm9yLnNob3dIaW50ID0gZnVuY3Rpb24oY20sIGdldEhpbnRzLCBvcHRpb25zKSB7XG4gICAgaWYgKCFnZXRIaW50cykgcmV0dXJuIGNtLnNob3dIaW50KG9wdGlvbnMpO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuYXN5bmMpIGdldEhpbnRzLmFzeW5jID0gdHJ1ZTtcbiAgICB2YXIgbmV3T3B0cyA9IHtoaW50OiBnZXRIaW50c307XG4gICAgaWYgKG9wdGlvbnMpIGZvciAodmFyIHByb3AgaW4gb3B0aW9ucykgbmV3T3B0c1twcm9wXSA9IG9wdGlvbnNbcHJvcF07XG4gICAgcmV0dXJuIGNtLnNob3dIaW50KG5ld09wdHMpO1xuICB9O1xuXG4gIENvZGVNaXJyb3IuZGVmaW5lRXh0ZW5zaW9uKFwic2hvd0hpbnRcIiwgZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIC8vIFdlIHdhbnQgYSBzaW5nbGUgY3Vyc29yIHBvc2l0aW9uLlxuICAgIGlmICh0aGlzLmxpc3RTZWxlY3Rpb25zKCkubGVuZ3RoID4gMSB8fCB0aGlzLnNvbWV0aGluZ1NlbGVjdGVkKCkpIHJldHVybjtcblxuICAgIGlmICh0aGlzLnN0YXRlLmNvbXBsZXRpb25BY3RpdmUpIHRoaXMuc3RhdGUuY29tcGxldGlvbkFjdGl2ZS5jbG9zZSgpO1xuICAgIHZhciBjb21wbGV0aW9uID0gdGhpcy5zdGF0ZS5jb21wbGV0aW9uQWN0aXZlID0gbmV3IENvbXBsZXRpb24odGhpcywgb3B0aW9ucyk7XG4gICAgdmFyIGdldEhpbnRzID0gY29tcGxldGlvbi5vcHRpb25zLmhpbnQ7XG4gICAgaWYgKCFnZXRIaW50cykgcmV0dXJuO1xuXG4gICAgQ29kZU1pcnJvci5zaWduYWwodGhpcywgXCJzdGFydENvbXBsZXRpb25cIiwgdGhpcyk7XG4gICAgaWYgKGdldEhpbnRzLmFzeW5jKVxuICAgICAgZ2V0SGludHModGhpcywgZnVuY3Rpb24oaGludHMpIHsgY29tcGxldGlvbi5zaG93SGludHMoaGludHMpOyB9LCBjb21wbGV0aW9uLm9wdGlvbnMpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBjb21wbGV0aW9uLnNob3dIaW50cyhnZXRIaW50cyh0aGlzLCBjb21wbGV0aW9uLm9wdGlvbnMpKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gQ29tcGxldGlvbihjbSwgb3B0aW9ucykge1xuICAgIHRoaXMuY20gPSBjbTtcbiAgICB0aGlzLm9wdGlvbnMgPSB0aGlzLmJ1aWxkT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLndpZGdldCA9IHRoaXMub25DbG9zZSA9IG51bGw7XG4gIH1cblxuICBDb21wbGV0aW9uLnByb3RvdHlwZSA9IHtcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXRoaXMuYWN0aXZlKCkpIHJldHVybjtcbiAgICAgIHRoaXMuY20uc3RhdGUuY29tcGxldGlvbkFjdGl2ZSA9IG51bGw7XG5cbiAgICAgIGlmICh0aGlzLndpZGdldCkgdGhpcy53aWRnZXQuY2xvc2UoKTtcbiAgICAgIGlmICh0aGlzLm9uQ2xvc2UpIHRoaXMub25DbG9zZSgpO1xuICAgICAgQ29kZU1pcnJvci5zaWduYWwodGhpcy5jbSwgXCJlbmRDb21wbGV0aW9uXCIsIHRoaXMuY20pO1xuICAgIH0sXG5cbiAgICBhY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY20uc3RhdGUuY29tcGxldGlvbkFjdGl2ZSA9PSB0aGlzO1xuICAgIH0sXG5cbiAgICBwaWNrOiBmdW5jdGlvbihkYXRhLCBpKSB7XG4gICAgICB2YXIgY29tcGxldGlvbiA9IGRhdGEubGlzdFtpXTtcbiAgICAgIGlmIChjb21wbGV0aW9uLmhpbnQpIGNvbXBsZXRpb24uaGludCh0aGlzLmNtLCBkYXRhLCBjb21wbGV0aW9uKTtcbiAgICAgIGVsc2UgdGhpcy5jbS5yZXBsYWNlUmFuZ2UoZ2V0VGV4dChjb21wbGV0aW9uKSwgY29tcGxldGlvbi5mcm9tIHx8IGRhdGEuZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbi50byB8fCBkYXRhLnRvLCBcImNvbXBsZXRlXCIpO1xuICAgICAgQ29kZU1pcnJvci5zaWduYWwoZGF0YSwgXCJwaWNrXCIsIGNvbXBsZXRpb24pO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0sXG5cbiAgICBzaG93SGludHM6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5saXN0Lmxlbmd0aCB8fCAhdGhpcy5hY3RpdmUoKSkgcmV0dXJuIHRoaXMuY2xvc2UoKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb21wbGV0ZVNpbmdsZSAmJiBkYXRhLmxpc3QubGVuZ3RoID09IDEpXG4gICAgICAgIHRoaXMucGljayhkYXRhLCAwKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5zaG93V2lkZ2V0KGRhdGEpO1xuICAgIH0sXG5cbiAgICBzaG93V2lkZ2V0OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICB0aGlzLndpZGdldCA9IG5ldyBXaWRnZXQodGhpcywgZGF0YSk7XG4gICAgICBDb2RlTWlycm9yLnNpZ25hbChkYXRhLCBcInNob3duXCIpO1xuXG4gICAgICB2YXIgZGVib3VuY2UgPSAwLCBjb21wbGV0aW9uID0gdGhpcywgZmluaXNoZWQ7XG4gICAgICB2YXIgY2xvc2VPbiA9IHRoaXMub3B0aW9ucy5jbG9zZUNoYXJhY3RlcnM7XG4gICAgICB2YXIgc3RhcnRQb3MgPSB0aGlzLmNtLmdldEN1cnNvcigpLCBzdGFydExlbiA9IHRoaXMuY20uZ2V0TGluZShzdGFydFBvcy5saW5lKS5sZW5ndGg7XG5cbiAgICAgIHZhciByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZuLCAxMDAwLzYwKTtcbiAgICAgIH07XG4gICAgICB2YXIgY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgY2xlYXJUaW1lb3V0O1xuXG4gICAgICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgICBpZiAoZmluaXNoZWQpIHJldHVybjtcbiAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuICAgICAgICBjb21wbGV0aW9uLmNsb3NlKCk7XG4gICAgICAgIGNvbXBsZXRpb24uY20ub2ZmKFwiY3Vyc29yQWN0aXZpdHlcIiwgYWN0aXZpdHkpO1xuICAgICAgICBpZiAoZGF0YSkgQ29kZU1pcnJvci5zaWduYWwoZGF0YSwgXCJjbG9zZVwiKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICBpZiAoZmluaXNoZWQpIHJldHVybjtcbiAgICAgICAgQ29kZU1pcnJvci5zaWduYWwoZGF0YSwgXCJ1cGRhdGVcIik7XG4gICAgICAgIHZhciBnZXRIaW50cyA9IGNvbXBsZXRpb24ub3B0aW9ucy5oaW50O1xuICAgICAgICBpZiAoZ2V0SGludHMuYXN5bmMpXG4gICAgICAgICAgZ2V0SGludHMoY29tcGxldGlvbi5jbSwgZmluaXNoVXBkYXRlLCBjb21wbGV0aW9uLm9wdGlvbnMpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgZmluaXNoVXBkYXRlKGdldEhpbnRzKGNvbXBsZXRpb24uY20sIGNvbXBsZXRpb24ub3B0aW9ucykpO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gZmluaXNoVXBkYXRlKGRhdGFfKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhXztcbiAgICAgICAgaWYgKGZpbmlzaGVkKSByZXR1cm47XG4gICAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5saXN0Lmxlbmd0aCkgcmV0dXJuIGRvbmUoKTtcbiAgICAgICAgaWYgKGNvbXBsZXRpb24ud2lkZ2V0KSBjb21wbGV0aW9uLndpZGdldC5jbG9zZSgpO1xuICAgICAgICBjb21wbGV0aW9uLndpZGdldCA9IG5ldyBXaWRnZXQoY29tcGxldGlvbiwgZGF0YSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNsZWFyRGVib3VuY2UoKSB7XG4gICAgICAgIGlmIChkZWJvdW5jZSkge1xuICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKGRlYm91bmNlKTtcbiAgICAgICAgICBkZWJvdW5jZSA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYWN0aXZpdHkoKSB7XG4gICAgICAgIGNsZWFyRGVib3VuY2UoKTtcbiAgICAgICAgdmFyIHBvcyA9IGNvbXBsZXRpb24uY20uZ2V0Q3Vyc29yKCksIGxpbmUgPSBjb21wbGV0aW9uLmNtLmdldExpbmUocG9zLmxpbmUpO1xuICAgICAgICBpZiAocG9zLmxpbmUgIT0gc3RhcnRQb3MubGluZSB8fCBsaW5lLmxlbmd0aCAtIHBvcy5jaCAhPSBzdGFydExlbiAtIHN0YXJ0UG9zLmNoIHx8XG4gICAgICAgICAgICBwb3MuY2ggPCBzdGFydFBvcy5jaCB8fCBjb21wbGV0aW9uLmNtLnNvbWV0aGluZ1NlbGVjdGVkKCkgfHxcbiAgICAgICAgICAgIChwb3MuY2ggJiYgY2xvc2VPbi50ZXN0KGxpbmUuY2hhckF0KHBvcy5jaCAtIDEpKSkpIHtcbiAgICAgICAgICBjb21wbGV0aW9uLmNsb3NlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVib3VuY2UgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbiAgICAgICAgICBpZiAoY29tcGxldGlvbi53aWRnZXQpIGNvbXBsZXRpb24ud2lkZ2V0LmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuY20ub24oXCJjdXJzb3JBY3Rpdml0eVwiLCBhY3Rpdml0eSk7XG4gICAgICB0aGlzLm9uQ2xvc2UgPSBkb25lO1xuICAgIH0sXG5cbiAgICBidWlsZE9wdGlvbnM6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHZhciBlZGl0b3IgPSB0aGlzLmNtLm9wdGlvbnMuaGludE9wdGlvbnM7XG4gICAgICB2YXIgb3V0ID0ge307XG4gICAgICBmb3IgKHZhciBwcm9wIGluIGRlZmF1bHRPcHRpb25zKSBvdXRbcHJvcF0gPSBkZWZhdWx0T3B0aW9uc1twcm9wXTtcbiAgICAgIGlmIChlZGl0b3IpIGZvciAodmFyIHByb3AgaW4gZWRpdG9yKVxuICAgICAgICBpZiAoZWRpdG9yW3Byb3BdICE9PSB1bmRlZmluZWQpIG91dFtwcm9wXSA9IGVkaXRvcltwcm9wXTtcbiAgICAgIGlmIChvcHRpb25zKSBmb3IgKHZhciBwcm9wIGluIG9wdGlvbnMpXG4gICAgICAgIGlmIChvcHRpb25zW3Byb3BdICE9PSB1bmRlZmluZWQpIG91dFtwcm9wXSA9IG9wdGlvbnNbcHJvcF07XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBnZXRUZXh0KGNvbXBsZXRpb24pIHtcbiAgICBpZiAodHlwZW9mIGNvbXBsZXRpb24gPT0gXCJzdHJpbmdcIikgcmV0dXJuIGNvbXBsZXRpb247XG4gICAgZWxzZSByZXR1cm4gY29tcGxldGlvbi50ZXh0O1xuICB9XG5cbiAgZnVuY3Rpb24gYnVpbGRLZXlNYXAoY29tcGxldGlvbiwgaGFuZGxlKSB7XG4gICAgdmFyIGJhc2VNYXAgPSB7XG4gICAgICBVcDogZnVuY3Rpb24oKSB7aGFuZGxlLm1vdmVGb2N1cygtMSk7fSxcbiAgICAgIERvd246IGZ1bmN0aW9uKCkge2hhbmRsZS5tb3ZlRm9jdXMoMSk7fSxcbiAgICAgIFBhZ2VVcDogZnVuY3Rpb24oKSB7aGFuZGxlLm1vdmVGb2N1cygtaGFuZGxlLm1lbnVTaXplKCkgKyAxLCB0cnVlKTt9LFxuICAgICAgUGFnZURvd246IGZ1bmN0aW9uKCkge2hhbmRsZS5tb3ZlRm9jdXMoaGFuZGxlLm1lbnVTaXplKCkgLSAxLCB0cnVlKTt9LFxuICAgICAgSG9tZTogZnVuY3Rpb24oKSB7aGFuZGxlLnNldEZvY3VzKDApO30sXG4gICAgICBFbmQ6IGZ1bmN0aW9uKCkge2hhbmRsZS5zZXRGb2N1cyhoYW5kbGUubGVuZ3RoIC0gMSk7fSxcbiAgICAgIEVudGVyOiBoYW5kbGUucGljayxcbiAgICAgIFRhYjogaGFuZGxlLnBpY2ssXG4gICAgICBFc2M6IGhhbmRsZS5jbG9zZVxuICAgIH07XG4gICAgdmFyIGN1c3RvbSA9IGNvbXBsZXRpb24ub3B0aW9ucy5jdXN0b21LZXlzO1xuICAgIHZhciBvdXJNYXAgPSBjdXN0b20gPyB7fSA6IGJhc2VNYXA7XG4gICAgZnVuY3Rpb24gYWRkQmluZGluZyhrZXksIHZhbCkge1xuICAgICAgdmFyIGJvdW5kO1xuICAgICAgaWYgKHR5cGVvZiB2YWwgIT0gXCJzdHJpbmdcIilcbiAgICAgICAgYm91bmQgPSBmdW5jdGlvbihjbSkgeyByZXR1cm4gdmFsKGNtLCBoYW5kbGUpOyB9O1xuICAgICAgLy8gVGhpcyBtZWNoYW5pc20gaXMgZGVwcmVjYXRlZFxuICAgICAgZWxzZSBpZiAoYmFzZU1hcC5oYXNPd25Qcm9wZXJ0eSh2YWwpKVxuICAgICAgICBib3VuZCA9IGJhc2VNYXBbdmFsXTtcbiAgICAgIGVsc2VcbiAgICAgICAgYm91bmQgPSB2YWw7XG4gICAgICBvdXJNYXBba2V5XSA9IGJvdW5kO1xuICAgIH1cbiAgICBpZiAoY3VzdG9tKVxuICAgICAgZm9yICh2YXIga2V5IGluIGN1c3RvbSkgaWYgKGN1c3RvbS5oYXNPd25Qcm9wZXJ0eShrZXkpKVxuICAgICAgICBhZGRCaW5kaW5nKGtleSwgY3VzdG9tW2tleV0pO1xuICAgIHZhciBleHRyYSA9IGNvbXBsZXRpb24ub3B0aW9ucy5leHRyYUtleXM7XG4gICAgaWYgKGV4dHJhKVxuICAgICAgZm9yICh2YXIga2V5IGluIGV4dHJhKSBpZiAoZXh0cmEuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgICAgYWRkQmluZGluZyhrZXksIGV4dHJhW2tleV0pO1xuICAgIHJldHVybiBvdXJNYXA7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRIaW50RWxlbWVudChoaW50c0VsZW1lbnQsIGVsKSB7XG4gICAgd2hpbGUgKGVsICYmIGVsICE9IGhpbnRzRWxlbWVudCkge1xuICAgICAgaWYgKGVsLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09IFwiTElcIiAmJiBlbC5wYXJlbnROb2RlID09IGhpbnRzRWxlbWVudCkgcmV0dXJuIGVsO1xuICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIFdpZGdldChjb21wbGV0aW9uLCBkYXRhKSB7XG4gICAgdGhpcy5jb21wbGV0aW9uID0gY29tcGxldGlvbjtcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIHZhciB3aWRnZXQgPSB0aGlzLCBjbSA9IGNvbXBsZXRpb24uY207XG5cbiAgICB2YXIgaGludHMgPSB0aGlzLmhpbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpO1xuICAgIGhpbnRzLmNsYXNzTmFtZSA9IFwiQ29kZU1pcnJvci1oaW50c1wiO1xuICAgIHRoaXMuc2VsZWN0ZWRIaW50ID0gZGF0YS5zZWxlY3RlZEhpbnQgfHwgMDtcblxuICAgIHZhciBjb21wbGV0aW9ucyA9IGRhdGEubGlzdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBsZXRpb25zLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgZWx0ID0gaGludHMuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpKSwgY3VyID0gY29tcGxldGlvbnNbaV07XG4gICAgICB2YXIgY2xhc3NOYW1lID0gSElOVF9FTEVNRU5UX0NMQVNTICsgKGkgIT0gdGhpcy5zZWxlY3RlZEhpbnQgPyBcIlwiIDogXCIgXCIgKyBBQ1RJVkVfSElOVF9FTEVNRU5UX0NMQVNTKTtcbiAgICAgIGlmIChjdXIuY2xhc3NOYW1lICE9IG51bGwpIGNsYXNzTmFtZSA9IGN1ci5jbGFzc05hbWUgKyBcIiBcIiArIGNsYXNzTmFtZTtcbiAgICAgIGVsdC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gICAgICBpZiAoY3VyLnJlbmRlcikgY3VyLnJlbmRlcihlbHQsIGRhdGEsIGN1cik7XG4gICAgICBlbHNlIGVsdC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjdXIuZGlzcGxheVRleHQgfHwgZ2V0VGV4dChjdXIpKSk7XG4gICAgICBlbHQuaGludElkID0gaTtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gY20uY3Vyc29yQ29vcmRzKGNvbXBsZXRpb24ub3B0aW9ucy5hbGlnbldpdGhXb3JkID8gZGF0YS5mcm9tIDogbnVsbCk7XG4gICAgdmFyIGxlZnQgPSBwb3MubGVmdCwgdG9wID0gcG9zLmJvdHRvbSwgYmVsb3cgPSB0cnVlO1xuICAgIGhpbnRzLnN0eWxlLmxlZnQgPSBsZWZ0ICsgXCJweFwiO1xuICAgIGhpbnRzLnN0eWxlLnRvcCA9IHRvcCArIFwicHhcIjtcbiAgICAvLyBJZiB3ZSdyZSBhdCB0aGUgZWRnZSBvZiB0aGUgc2NyZWVuLCB0aGVuIHdlIHdhbnQgdGhlIG1lbnUgdG8gYXBwZWFyIG9uIHRoZSBsZWZ0IG9mIHRoZSBjdXJzb3IuXG4gICAgdmFyIHdpblcgPSB3aW5kb3cuaW5uZXJXaWR0aCB8fCBNYXRoLm1heChkb2N1bWVudC5ib2R5Lm9mZnNldFdpZHRoLCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0V2lkdGgpO1xuICAgIHZhciB3aW5IID0gd2luZG93LmlubmVySGVpZ2h0IHx8IE1hdGgubWF4KGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0LCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0KTtcbiAgICAoY29tcGxldGlvbi5vcHRpb25zLmNvbnRhaW5lciB8fCBkb2N1bWVudC5ib2R5KS5hcHBlbmRDaGlsZChoaW50cyk7XG4gICAgdmFyIGJveCA9IGhpbnRzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLCBvdmVybGFwWSA9IGJveC5ib3R0b20gLSB3aW5IO1xuICAgIGlmIChvdmVybGFwWSA+IDApIHtcbiAgICAgIHZhciBoZWlnaHQgPSBib3guYm90dG9tIC0gYm94LnRvcCwgY3VyVG9wID0gcG9zLnRvcCAtIChwb3MuYm90dG9tIC0gYm94LnRvcCk7XG4gICAgICBpZiAoY3VyVG9wIC0gaGVpZ2h0ID4gMCkgeyAvLyBGaXRzIGFib3ZlIGN1cnNvclxuICAgICAgICBoaW50cy5zdHlsZS50b3AgPSAodG9wID0gcG9zLnRvcCAtIGhlaWdodCkgKyBcInB4XCI7XG4gICAgICAgIGJlbG93ID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGhlaWdodCA+IHdpbkgpIHtcbiAgICAgICAgaGludHMuc3R5bGUuaGVpZ2h0ID0gKHdpbkggLSA1KSArIFwicHhcIjtcbiAgICAgICAgaGludHMuc3R5bGUudG9wID0gKHRvcCA9IHBvcy5ib3R0b20gLSBib3gudG9wKSArIFwicHhcIjtcbiAgICAgICAgdmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpO1xuICAgICAgICBpZiAoZGF0YS5mcm9tLmNoICE9IGN1cnNvci5jaCkge1xuICAgICAgICAgIHBvcyA9IGNtLmN1cnNvckNvb3JkcyhjdXJzb3IpO1xuICAgICAgICAgIGhpbnRzLnN0eWxlLmxlZnQgPSAobGVmdCA9IHBvcy5sZWZ0KSArIFwicHhcIjtcbiAgICAgICAgICBib3ggPSBoaW50cy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgb3ZlcmxhcFggPSBib3gubGVmdCAtIHdpblc7XG4gICAgaWYgKG92ZXJsYXBYID4gMCkge1xuICAgICAgaWYgKGJveC5yaWdodCAtIGJveC5sZWZ0ID4gd2luVykge1xuICAgICAgICBoaW50cy5zdHlsZS53aWR0aCA9ICh3aW5XIC0gNSkgKyBcInB4XCI7XG4gICAgICAgIG92ZXJsYXBYIC09IChib3gucmlnaHQgLSBib3gubGVmdCkgLSB3aW5XO1xuICAgICAgfVxuICAgICAgaGludHMuc3R5bGUubGVmdCA9IChsZWZ0ID0gcG9zLmxlZnQgLSBvdmVybGFwWCkgKyBcInB4XCI7XG4gICAgfVxuXG4gICAgY20uYWRkS2V5TWFwKHRoaXMua2V5TWFwID0gYnVpbGRLZXlNYXAoY29tcGxldGlvbiwge1xuICAgICAgbW92ZUZvY3VzOiBmdW5jdGlvbihuLCBhdm9pZFdyYXApIHsgd2lkZ2V0LmNoYW5nZUFjdGl2ZSh3aWRnZXQuc2VsZWN0ZWRIaW50ICsgbiwgYXZvaWRXcmFwKTsgfSxcbiAgICAgIHNldEZvY3VzOiBmdW5jdGlvbihuKSB7IHdpZGdldC5jaGFuZ2VBY3RpdmUobik7IH0sXG4gICAgICBtZW51U2l6ZTogZnVuY3Rpb24oKSB7IHJldHVybiB3aWRnZXQuc2NyZWVuQW1vdW50KCk7IH0sXG4gICAgICBsZW5ndGg6IGNvbXBsZXRpb25zLmxlbmd0aCxcbiAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgY29tcGxldGlvbi5jbG9zZSgpOyB9LFxuICAgICAgcGljazogZnVuY3Rpb24oKSB7IHdpZGdldC5waWNrKCk7IH0sXG4gICAgICBkYXRhOiBkYXRhXG4gICAgfSkpO1xuXG4gICAgaWYgKGNvbXBsZXRpb24ub3B0aW9ucy5jbG9zZU9uVW5mb2N1cykge1xuICAgICAgdmFyIGNsb3NpbmdPbkJsdXI7XG4gICAgICBjbS5vbihcImJsdXJcIiwgdGhpcy5vbkJsdXIgPSBmdW5jdGlvbigpIHsgY2xvc2luZ09uQmx1ciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNvbXBsZXRpb24uY2xvc2UoKTsgfSwgMTAwKTsgfSk7XG4gICAgICBjbS5vbihcImZvY3VzXCIsIHRoaXMub25Gb2N1cyA9IGZ1bmN0aW9uKCkgeyBjbGVhclRpbWVvdXQoY2xvc2luZ09uQmx1cik7IH0pO1xuICAgIH1cblxuICAgIHZhciBzdGFydFNjcm9sbCA9IGNtLmdldFNjcm9sbEluZm8oKTtcbiAgICBjbS5vbihcInNjcm9sbFwiLCB0aGlzLm9uU2Nyb2xsID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3VyU2Nyb2xsID0gY20uZ2V0U2Nyb2xsSW5mbygpLCBlZGl0b3IgPSBjbS5nZXRXcmFwcGVyRWxlbWVudCgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIG5ld1RvcCA9IHRvcCArIHN0YXJ0U2Nyb2xsLnRvcCAtIGN1clNjcm9sbC50b3A7XG4gICAgICB2YXIgcG9pbnQgPSBuZXdUb3AgLSAod2luZG93LnBhZ2VZT2Zmc2V0IHx8IChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keSkuc2Nyb2xsVG9wKTtcbiAgICAgIGlmICghYmVsb3cpIHBvaW50ICs9IGhpbnRzLm9mZnNldEhlaWdodDtcbiAgICAgIGlmIChwb2ludCA8PSBlZGl0b3IudG9wIHx8IHBvaW50ID49IGVkaXRvci5ib3R0b20pIHJldHVybiBjb21wbGV0aW9uLmNsb3NlKCk7XG4gICAgICBoaW50cy5zdHlsZS50b3AgPSBuZXdUb3AgKyBcInB4XCI7XG4gICAgICBoaW50cy5zdHlsZS5sZWZ0ID0gKGxlZnQgKyBzdGFydFNjcm9sbC5sZWZ0IC0gY3VyU2Nyb2xsLmxlZnQpICsgXCJweFwiO1xuICAgIH0pO1xuXG4gICAgQ29kZU1pcnJvci5vbihoaW50cywgXCJkYmxjbGlja1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgdCA9IGdldEhpbnRFbGVtZW50KGhpbnRzLCBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQpO1xuICAgICAgaWYgKHQgJiYgdC5oaW50SWQgIT0gbnVsbCkge3dpZGdldC5jaGFuZ2VBY3RpdmUodC5oaW50SWQpOyB3aWRnZXQucGljaygpO31cbiAgICB9KTtcblxuICAgIENvZGVNaXJyb3Iub24oaGludHMsIFwiY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIHQgPSBnZXRIaW50RWxlbWVudChoaW50cywgZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50KTtcbiAgICAgIGlmICh0ICYmIHQuaGludElkICE9IG51bGwpIHtcbiAgICAgICAgd2lkZ2V0LmNoYW5nZUFjdGl2ZSh0LmhpbnRJZCk7XG4gICAgICAgIGlmIChjb21wbGV0aW9uLm9wdGlvbnMuY29tcGxldGVPblNpbmdsZUNsaWNrKSB3aWRnZXQucGljaygpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgQ29kZU1pcnJvci5vbihoaW50cywgXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Y20uZm9jdXMoKTt9LCAyMCk7XG4gICAgfSk7XG5cbiAgICBDb2RlTWlycm9yLnNpZ25hbChkYXRhLCBcInNlbGVjdFwiLCBjb21wbGV0aW9uc1swXSwgaGludHMuZmlyc3RDaGlsZCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBXaWRnZXQucHJvdG90eXBlID0ge1xuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmNvbXBsZXRpb24ud2lkZ2V0ICE9IHRoaXMpIHJldHVybjtcbiAgICAgIHRoaXMuY29tcGxldGlvbi53aWRnZXQgPSBudWxsO1xuICAgICAgdGhpcy5oaW50cy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuaGludHMpO1xuICAgICAgdGhpcy5jb21wbGV0aW9uLmNtLnJlbW92ZUtleU1hcCh0aGlzLmtleU1hcCk7XG5cbiAgICAgIHZhciBjbSA9IHRoaXMuY29tcGxldGlvbi5jbTtcbiAgICAgIGlmICh0aGlzLmNvbXBsZXRpb24ub3B0aW9ucy5jbG9zZU9uVW5mb2N1cykge1xuICAgICAgICBjbS5vZmYoXCJibHVyXCIsIHRoaXMub25CbHVyKTtcbiAgICAgICAgY20ub2ZmKFwiZm9jdXNcIiwgdGhpcy5vbkZvY3VzKTtcbiAgICAgIH1cbiAgICAgIGNtLm9mZihcInNjcm9sbFwiLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB9LFxuXG4gICAgcGljazogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNvbXBsZXRpb24ucGljayh0aGlzLmRhdGEsIHRoaXMuc2VsZWN0ZWRIaW50KTtcbiAgICB9LFxuXG4gICAgY2hhbmdlQWN0aXZlOiBmdW5jdGlvbihpLCBhdm9pZFdyYXApIHtcbiAgICAgIGlmIChpID49IHRoaXMuZGF0YS5saXN0Lmxlbmd0aClcbiAgICAgICAgaSA9IGF2b2lkV3JhcCA/IHRoaXMuZGF0YS5saXN0Lmxlbmd0aCAtIDEgOiAwO1xuICAgICAgZWxzZSBpZiAoaSA8IDApXG4gICAgICAgIGkgPSBhdm9pZFdyYXAgPyAwICA6IHRoaXMuZGF0YS5saXN0Lmxlbmd0aCAtIDE7XG4gICAgICBpZiAodGhpcy5zZWxlY3RlZEhpbnQgPT0gaSkgcmV0dXJuO1xuICAgICAgdmFyIG5vZGUgPSB0aGlzLmhpbnRzLmNoaWxkTm9kZXNbdGhpcy5zZWxlY3RlZEhpbnRdO1xuICAgICAgbm9kZS5jbGFzc05hbWUgPSBub2RlLmNsYXNzTmFtZS5yZXBsYWNlKFwiIFwiICsgQUNUSVZFX0hJTlRfRUxFTUVOVF9DTEFTUywgXCJcIik7XG4gICAgICBub2RlID0gdGhpcy5oaW50cy5jaGlsZE5vZGVzW3RoaXMuc2VsZWN0ZWRIaW50ID0gaV07XG4gICAgICBub2RlLmNsYXNzTmFtZSArPSBcIiBcIiArIEFDVElWRV9ISU5UX0VMRU1FTlRfQ0xBU1M7XG4gICAgICBpZiAobm9kZS5vZmZzZXRUb3AgPCB0aGlzLmhpbnRzLnNjcm9sbFRvcClcbiAgICAgICAgdGhpcy5oaW50cy5zY3JvbGxUb3AgPSBub2RlLm9mZnNldFRvcCAtIDM7XG4gICAgICBlbHNlIGlmIChub2RlLm9mZnNldFRvcCArIG5vZGUub2Zmc2V0SGVpZ2h0ID4gdGhpcy5oaW50cy5zY3JvbGxUb3AgKyB0aGlzLmhpbnRzLmNsaWVudEhlaWdodClcbiAgICAgICAgdGhpcy5oaW50cy5zY3JvbGxUb3AgPSBub2RlLm9mZnNldFRvcCArIG5vZGUub2Zmc2V0SGVpZ2h0IC0gdGhpcy5oaW50cy5jbGllbnRIZWlnaHQgKyAzO1xuICAgICAgQ29kZU1pcnJvci5zaWduYWwodGhpcy5kYXRhLCBcInNlbGVjdFwiLCB0aGlzLmRhdGEubGlzdFt0aGlzLnNlbGVjdGVkSGludF0sIG5vZGUpO1xuICAgIH0sXG5cbiAgICBzY3JlZW5BbW91bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5oaW50cy5jbGllbnRIZWlnaHQgLyB0aGlzLmhpbnRzLmZpcnN0Q2hpbGQub2Zmc2V0SGVpZ2h0KSB8fCAxO1xuICAgIH1cbiAgfTtcblxuICBDb2RlTWlycm9yLnJlZ2lzdGVySGVscGVyKFwiaGludFwiLCBcImF1dG9cIiwgZnVuY3Rpb24oY20sIG9wdGlvbnMpIHtcbiAgICB2YXIgaGVscGVycyA9IGNtLmdldEhlbHBlcnMoY20uZ2V0Q3Vyc29yKCksIFwiaGludFwiKSwgd29yZHM7XG4gICAgaWYgKGhlbHBlcnMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhlbHBlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGN1ciA9IGhlbHBlcnNbaV0oY20sIG9wdGlvbnMpO1xuICAgICAgICBpZiAoY3VyICYmIGN1ci5saXN0Lmxlbmd0aCkgcmV0dXJuIGN1cjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHdvcmRzID0gY20uZ2V0SGVscGVyKGNtLmdldEN1cnNvcigpLCBcImhpbnRXb3Jkc1wiKSkge1xuICAgICAgaWYgKHdvcmRzKSByZXR1cm4gQ29kZU1pcnJvci5oaW50LmZyb21MaXN0KGNtLCB7d29yZHM6IHdvcmRzfSk7XG4gICAgfSBlbHNlIGlmIChDb2RlTWlycm9yLmhpbnQuYW55d29yZCkge1xuICAgICAgcmV0dXJuIENvZGVNaXJyb3IuaGludC5hbnl3b3JkKGNtLCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xuXG4gIENvZGVNaXJyb3IucmVnaXN0ZXJIZWxwZXIoXCJoaW50XCIsIFwiZnJvbUxpc3RcIiwgZnVuY3Rpb24oY20sIG9wdGlvbnMpIHtcbiAgICB2YXIgY3VyID0gY20uZ2V0Q3Vyc29yKCksIHRva2VuID0gY20uZ2V0VG9rZW5BdChjdXIpO1xuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy53b3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHdvcmQgPSBvcHRpb25zLndvcmRzW2ldO1xuICAgICAgaWYgKHdvcmQuc2xpY2UoMCwgdG9rZW4uc3RyaW5nLmxlbmd0aCkgPT0gdG9rZW4uc3RyaW5nKVxuICAgICAgICBmb3VuZC5wdXNoKHdvcmQpO1xuICAgIH1cblxuICAgIGlmIChmb3VuZC5sZW5ndGgpIHJldHVybiB7XG4gICAgICBsaXN0OiBmb3VuZCxcbiAgICAgIGZyb206IENvZGVNaXJyb3IuUG9zKGN1ci5saW5lLCB0b2tlbi5zdGFydCksXG4gICAgICAgICAgICB0bzogQ29kZU1pcnJvci5Qb3MoY3VyLmxpbmUsIHRva2VuLmVuZClcbiAgICB9O1xuICB9KTtcblxuICBDb2RlTWlycm9yLmNvbW1hbmRzLmF1dG9jb21wbGV0ZSA9IENvZGVNaXJyb3Iuc2hvd0hpbnQ7XG5cbiAgdmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICAgIGhpbnQ6IENvZGVNaXJyb3IuaGludC5hdXRvLFxuICAgIGNvbXBsZXRlU2luZ2xlOiB0cnVlLFxuICAgIGFsaWduV2l0aFdvcmQ6IHRydWUsXG4gICAgY2xvc2VDaGFyYWN0ZXJzOiAvW1xccygpXFxbXFxde307Oj4sXS8sXG4gICAgY2xvc2VPblVuZm9jdXM6IHRydWUsXG4gICAgY29tcGxldGVPblNpbmdsZUNsaWNrOiBmYWxzZSxcbiAgICBjb250YWluZXI6IG51bGwsXG4gICAgY3VzdG9tS2V5czogbnVsbCxcbiAgICBleHRyYUtleXM6IG51bGxcbiAgfTtcblxuICBDb2RlTWlycm9yLmRlZmluZU9wdGlvbihcImhpbnRPcHRpb25zXCIsIG51bGwpO1xufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8vIENvZGVNaXJyb3IsIGNvcHlyaWdodCAoYykgYnkgTWFyaWpuIEhhdmVyYmVrZSBhbmQgb3RoZXJzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBhbiBNSVQgbGljZW5zZTogaHR0cDovL2NvZGVtaXJyb3IubmV0L0xJQ0VOU0VcblxuKGZ1bmN0aW9uKG1vZCkge1xuICBpZiAodHlwZW9mIGV4cG9ydHMgPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgbW9kdWxlID09IFwib2JqZWN0XCIpIC8vIENvbW1vbkpTXG4gICAgbW9kKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkNvZGVNaXJyb3IgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkNvZGVNaXJyb3IgOiBudWxsKSk7XG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIC8vIEFNRFxuICAgIGRlZmluZShbXCIuLi8uLi9saWIvY29kZW1pcnJvclwiXSwgbW9kKTtcbiAgZWxzZSAvLyBQbGFpbiBicm93c2VyIGVudlxuICAgIG1vZChDb2RlTWlycm9yKTtcbn0pKGZ1bmN0aW9uKENvZGVNaXJyb3IpIHtcblwidXNlIHN0cmljdFwiO1xuXG5Db2RlTWlycm9yLnJ1bk1vZGUgPSBmdW5jdGlvbihzdHJpbmcsIG1vZGVzcGVjLCBjYWxsYmFjaywgb3B0aW9ucykge1xuICB2YXIgbW9kZSA9IENvZGVNaXJyb3IuZ2V0TW9kZShDb2RlTWlycm9yLmRlZmF1bHRzLCBtb2Rlc3BlYyk7XG4gIHZhciBpZSA9IC9NU0lFIFxcZC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgdmFyIGllX2x0OSA9IGllICYmIChkb2N1bWVudC5kb2N1bWVudE1vZGUgPT0gbnVsbCB8fCBkb2N1bWVudC5kb2N1bWVudE1vZGUgPCA5KTtcblxuICBpZiAoY2FsbGJhY2subm9kZVR5cGUgPT0gMSkge1xuICAgIHZhciB0YWJTaXplID0gKG9wdGlvbnMgJiYgb3B0aW9ucy50YWJTaXplKSB8fCBDb2RlTWlycm9yLmRlZmF1bHRzLnRhYlNpemU7XG4gICAgdmFyIG5vZGUgPSBjYWxsYmFjaywgY29sID0gMDtcbiAgICBub2RlLmlubmVySFRNTCA9IFwiXCI7XG4gICAgY2FsbGJhY2sgPSBmdW5jdGlvbih0ZXh0LCBzdHlsZSkge1xuICAgICAgaWYgKHRleHQgPT0gXCJcXG5cIikge1xuICAgICAgICAvLyBFbWl0dGluZyBMRiBvciBDUkxGIG9uIElFOCBvciBlYXJsaWVyIHJlc3VsdHMgaW4gYW4gaW5jb3JyZWN0IGRpc3BsYXkuXG4gICAgICAgIC8vIEVtaXR0aW5nIGEgY2FycmlhZ2UgcmV0dXJuIG1ha2VzIGV2ZXJ5dGhpbmcgb2suXG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoaWVfbHQ5ID8gJ1xccicgOiB0ZXh0KSk7XG4gICAgICAgIGNvbCA9IDA7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgIC8vIHJlcGxhY2UgdGFic1xuICAgICAgZm9yICh2YXIgcG9zID0gMDs7KSB7XG4gICAgICAgIHZhciBpZHggPSB0ZXh0LmluZGV4T2YoXCJcXHRcIiwgcG9zKTtcbiAgICAgICAgaWYgKGlkeCA9PSAtMSkge1xuICAgICAgICAgIGNvbnRlbnQgKz0gdGV4dC5zbGljZShwb3MpO1xuICAgICAgICAgIGNvbCArPSB0ZXh0Lmxlbmd0aCAtIHBvcztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb2wgKz0gaWR4IC0gcG9zO1xuICAgICAgICAgIGNvbnRlbnQgKz0gdGV4dC5zbGljZShwb3MsIGlkeCk7XG4gICAgICAgICAgdmFyIHNpemUgPSB0YWJTaXplIC0gY29sICUgdGFiU2l6ZTtcbiAgICAgICAgICBjb2wgKz0gc2l6ZTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7ICsraSkgY29udGVudCArPSBcIiBcIjtcbiAgICAgICAgICBwb3MgPSBpZHggKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChzdHlsZSkge1xuICAgICAgICB2YXIgc3AgPSBub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpKTtcbiAgICAgICAgc3AuY2xhc3NOYW1lID0gXCJjbS1cIiArIHN0eWxlLnJlcGxhY2UoLyArL2csIFwiIGNtLVwiKTtcbiAgICAgICAgc3AuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY29udGVudCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjb250ZW50KSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBsaW5lcyA9IENvZGVNaXJyb3Iuc3BsaXRMaW5lcyhzdHJpbmcpLCBzdGF0ZSA9IChvcHRpb25zICYmIG9wdGlvbnMuc3RhdGUpIHx8IENvZGVNaXJyb3Iuc3RhcnRTdGF0ZShtb2RlKTtcbiAgZm9yICh2YXIgaSA9IDAsIGUgPSBsaW5lcy5sZW5ndGg7IGkgPCBlOyArK2kpIHtcbiAgICBpZiAoaSkgY2FsbGJhY2soXCJcXG5cIik7XG4gICAgdmFyIHN0cmVhbSA9IG5ldyBDb2RlTWlycm9yLlN0cmluZ1N0cmVhbShsaW5lc1tpXSk7XG4gICAgaWYgKCFzdHJlYW0uc3RyaW5nICYmIG1vZGUuYmxhbmtMaW5lKSBtb2RlLmJsYW5rTGluZShzdGF0ZSk7XG4gICAgd2hpbGUgKCFzdHJlYW0uZW9sKCkpIHtcbiAgICAgIHZhciBzdHlsZSA9IG1vZGUudG9rZW4oc3RyZWFtLCBzdGF0ZSk7XG4gICAgICBjYWxsYmFjayhzdHJlYW0uY3VycmVudCgpLCBzdHlsZSwgaSwgc3RyZWFtLnN0YXJ0LCBzdGF0ZSk7XG4gICAgICBzdHJlYW0uc3RhcnQgPSBzdHJlYW0ucG9zO1xuICAgIH1cbiAgfVxufTtcblxufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8vIENvZGVNaXJyb3IsIGNvcHlyaWdodCAoYykgYnkgTWFyaWpuIEhhdmVyYmVrZSBhbmQgb3RoZXJzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBhbiBNSVQgbGljZW5zZTogaHR0cDovL2NvZGVtaXJyb3IubmV0L0xJQ0VOU0VcblxuKGZ1bmN0aW9uKG1vZCkge1xuICBpZiAodHlwZW9mIGV4cG9ydHMgPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgbW9kdWxlID09IFwib2JqZWN0XCIpIC8vIENvbW1vbkpTXG4gICAgbW9kKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkNvZGVNaXJyb3IgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkNvZGVNaXJyb3IgOiBudWxsKSk7XG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIC8vIEFNRFxuICAgIGRlZmluZShbXCIuLi8uLi9saWIvY29kZW1pcnJvclwiXSwgbW9kKTtcbiAgZWxzZSAvLyBQbGFpbiBicm93c2VyIGVudlxuICAgIG1vZChDb2RlTWlycm9yKTtcbn0pKGZ1bmN0aW9uKENvZGVNaXJyb3IpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBQb3MgPSBDb2RlTWlycm9yLlBvcztcblxuICBmdW5jdGlvbiBTZWFyY2hDdXJzb3IoZG9jLCBxdWVyeSwgcG9zLCBjYXNlRm9sZCkge1xuICAgIHRoaXMuYXRPY2N1cnJlbmNlID0gZmFsc2U7IHRoaXMuZG9jID0gZG9jO1xuICAgIGlmIChjYXNlRm9sZCA9PSBudWxsICYmIHR5cGVvZiBxdWVyeSA9PSBcInN0cmluZ1wiKSBjYXNlRm9sZCA9IGZhbHNlO1xuXG4gICAgcG9zID0gcG9zID8gZG9jLmNsaXBQb3MocG9zKSA6IFBvcygwLCAwKTtcbiAgICB0aGlzLnBvcyA9IHtmcm9tOiBwb3MsIHRvOiBwb3N9O1xuXG4gICAgLy8gVGhlIG1hdGNoZXMgbWV0aG9kIGlzIGZpbGxlZCBpbiBiYXNlZCBvbiB0aGUgdHlwZSBvZiBxdWVyeS5cbiAgICAvLyBJdCB0YWtlcyBhIHBvc2l0aW9uIGFuZCBhIGRpcmVjdGlvbiwgYW5kIHJldHVybnMgYW4gb2JqZWN0XG4gICAgLy8gZGVzY3JpYmluZyB0aGUgbmV4dCBvY2N1cnJlbmNlIG9mIHRoZSBxdWVyeSwgb3IgbnVsbCBpZiBub1xuICAgIC8vIG1vcmUgbWF0Y2hlcyB3ZXJlIGZvdW5kLlxuICAgIGlmICh0eXBlb2YgcXVlcnkgIT0gXCJzdHJpbmdcIikgeyAvLyBSZWdleHAgbWF0Y2hcbiAgICAgIGlmICghcXVlcnkuZ2xvYmFsKSBxdWVyeSA9IG5ldyBSZWdFeHAocXVlcnkuc291cmNlLCBxdWVyeS5pZ25vcmVDYXNlID8gXCJpZ1wiIDogXCJnXCIpO1xuICAgICAgdGhpcy5tYXRjaGVzID0gZnVuY3Rpb24ocmV2ZXJzZSwgcG9zKSB7XG4gICAgICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAgICAgcXVlcnkubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICB2YXIgbGluZSA9IGRvYy5nZXRMaW5lKHBvcy5saW5lKS5zbGljZSgwLCBwb3MuY2gpLCBjdXRPZmYgPSAwLCBtYXRjaCwgc3RhcnQ7XG4gICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgcXVlcnkubGFzdEluZGV4ID0gY3V0T2ZmO1xuICAgICAgICAgICAgdmFyIG5ld01hdGNoID0gcXVlcnkuZXhlYyhsaW5lKTtcbiAgICAgICAgICAgIGlmICghbmV3TWF0Y2gpIGJyZWFrO1xuICAgICAgICAgICAgbWF0Y2ggPSBuZXdNYXRjaDtcbiAgICAgICAgICAgIHN0YXJ0ID0gbWF0Y2guaW5kZXg7XG4gICAgICAgICAgICBjdXRPZmYgPSBtYXRjaC5pbmRleCArIChtYXRjaFswXS5sZW5ndGggfHwgMSk7XG4gICAgICAgICAgICBpZiAoY3V0T2ZmID09IGxpbmUubGVuZ3RoKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIG1hdGNoTGVuID0gKG1hdGNoICYmIG1hdGNoWzBdLmxlbmd0aCkgfHwgMDtcbiAgICAgICAgICBpZiAoIW1hdGNoTGVuKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnQgPT0gMCAmJiBsaW5lLmxlbmd0aCA9PSAwKSB7bWF0Y2ggPSB1bmRlZmluZWQ7fVxuICAgICAgICAgICAgZWxzZSBpZiAoc3RhcnQgIT0gZG9jLmdldExpbmUocG9zLmxpbmUpLmxlbmd0aCkge1xuICAgICAgICAgICAgICBtYXRjaExlbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxdWVyeS5sYXN0SW5kZXggPSBwb3MuY2g7XG4gICAgICAgICAgdmFyIGxpbmUgPSBkb2MuZ2V0TGluZShwb3MubGluZSksIG1hdGNoID0gcXVlcnkuZXhlYyhsaW5lKTtcbiAgICAgICAgICB2YXIgbWF0Y2hMZW4gPSAobWF0Y2ggJiYgbWF0Y2hbMF0ubGVuZ3RoKSB8fCAwO1xuICAgICAgICAgIHZhciBzdGFydCA9IG1hdGNoICYmIG1hdGNoLmluZGV4O1xuICAgICAgICAgIGlmIChzdGFydCArIG1hdGNoTGVuICE9IGxpbmUubGVuZ3RoICYmICFtYXRjaExlbikgbWF0Y2hMZW4gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaExlbilcbiAgICAgICAgICByZXR1cm4ge2Zyb206IFBvcyhwb3MubGluZSwgc3RhcnQpLFxuICAgICAgICAgICAgICAgICAgdG86IFBvcyhwb3MubGluZSwgc3RhcnQgKyBtYXRjaExlbiksXG4gICAgICAgICAgICAgICAgICBtYXRjaDogbWF0Y2h9O1xuICAgICAgfTtcbiAgICB9IGVsc2UgeyAvLyBTdHJpbmcgcXVlcnlcbiAgICAgIHZhciBvcmlnUXVlcnkgPSBxdWVyeTtcbiAgICAgIGlmIChjYXNlRm9sZCkgcXVlcnkgPSBxdWVyeS50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIGZvbGQgPSBjYXNlRm9sZCA/IGZ1bmN0aW9uKHN0cil7cmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpO30gOiBmdW5jdGlvbihzdHIpe3JldHVybiBzdHI7fTtcbiAgICAgIHZhciB0YXJnZXQgPSBxdWVyeS5zcGxpdChcIlxcblwiKTtcbiAgICAgIC8vIERpZmZlcmVudCBtZXRob2RzIGZvciBzaW5nbGUtbGluZSBhbmQgbXVsdGktbGluZSBxdWVyaWVzXG4gICAgICBpZiAodGFyZ2V0Lmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIGlmICghcXVlcnkubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gRW1wdHkgc3RyaW5nIHdvdWxkIG1hdGNoIGFueXRoaW5nIGFuZCBuZXZlciBwcm9ncmVzcywgc29cbiAgICAgICAgICAvLyB3ZSBkZWZpbmUgaXQgdG8gbWF0Y2ggbm90aGluZyBpbnN0ZWFkLlxuICAgICAgICAgIHRoaXMubWF0Y2hlcyA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5tYXRjaGVzID0gZnVuY3Rpb24ocmV2ZXJzZSwgcG9zKSB7XG4gICAgICAgICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICAgICAgICB2YXIgb3JpZyA9IGRvYy5nZXRMaW5lKHBvcy5saW5lKS5zbGljZSgwLCBwb3MuY2gpLCBsaW5lID0gZm9sZChvcmlnKTtcbiAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbGluZS5sYXN0SW5kZXhPZihxdWVyeSk7XG4gICAgICAgICAgICAgIGlmIChtYXRjaCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSBhZGp1c3RQb3Mob3JpZywgbGluZSwgbWF0Y2gpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7ZnJvbTogUG9zKHBvcy5saW5lLCBtYXRjaCksIHRvOiBQb3MocG9zLmxpbmUsIG1hdGNoICsgb3JpZ1F1ZXJ5Lmxlbmd0aCl9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHZhciBvcmlnID0gZG9jLmdldExpbmUocG9zLmxpbmUpLnNsaWNlKHBvcy5jaCksIGxpbmUgPSBmb2xkKG9yaWcpO1xuICAgICAgICAgICAgICAgdmFyIG1hdGNoID0gbGluZS5pbmRleE9mKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgIGlmIChtYXRjaCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgIG1hdGNoID0gYWRqdXN0UG9zKG9yaWcsIGxpbmUsIG1hdGNoKSArIHBvcy5jaDtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIHtmcm9tOiBQb3MocG9zLmxpbmUsIG1hdGNoKSwgdG86IFBvcyhwb3MubGluZSwgbWF0Y2ggKyBvcmlnUXVlcnkubGVuZ3RoKX07XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9yaWdUYXJnZXQgPSBvcmlnUXVlcnkuc3BsaXQoXCJcXG5cIik7XG4gICAgICAgIHRoaXMubWF0Y2hlcyA9IGZ1bmN0aW9uKHJldmVyc2UsIHBvcykge1xuICAgICAgICAgIHZhciBsYXN0ID0gdGFyZ2V0Lmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICAgIGlmIChwb3MubGluZSAtICh0YXJnZXQubGVuZ3RoIC0gMSkgPCBkb2MuZmlyc3RMaW5lKCkpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChmb2xkKGRvYy5nZXRMaW5lKHBvcy5saW5lKS5zbGljZSgwLCBvcmlnVGFyZ2V0W2xhc3RdLmxlbmd0aCkpICE9IHRhcmdldFt0YXJnZXQubGVuZ3RoIC0gMV0pIHJldHVybjtcbiAgICAgICAgICAgIHZhciB0byA9IFBvcyhwb3MubGluZSwgb3JpZ1RhcmdldFtsYXN0XS5sZW5ndGgpO1xuICAgICAgICAgICAgZm9yICh2YXIgbG4gPSBwb3MubGluZSAtIDEsIGkgPSBsYXN0IC0gMTsgaSA+PSAxOyAtLWksIC0tbG4pXG4gICAgICAgICAgICAgIGlmICh0YXJnZXRbaV0gIT0gZm9sZChkb2MuZ2V0TGluZShsbikpKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgbGluZSA9IGRvYy5nZXRMaW5lKGxuKSwgY3V0ID0gbGluZS5sZW5ndGggLSBvcmlnVGFyZ2V0WzBdLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChmb2xkKGxpbmUuc2xpY2UoY3V0KSkgIT0gdGFyZ2V0WzBdKSByZXR1cm47XG4gICAgICAgICAgICByZXR1cm4ge2Zyb206IFBvcyhsbiwgY3V0KSwgdG86IHRvfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBvcy5saW5lICsgKHRhcmdldC5sZW5ndGggLSAxKSA+IGRvYy5sYXN0TGluZSgpKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgbGluZSA9IGRvYy5nZXRMaW5lKHBvcy5saW5lKSwgY3V0ID0gbGluZS5sZW5ndGggLSBvcmlnVGFyZ2V0WzBdLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChmb2xkKGxpbmUuc2xpY2UoY3V0KSkgIT0gdGFyZ2V0WzBdKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgZnJvbSA9IFBvcyhwb3MubGluZSwgY3V0KTtcbiAgICAgICAgICAgIGZvciAodmFyIGxuID0gcG9zLmxpbmUgKyAxLCBpID0gMTsgaSA8IGxhc3Q7ICsraSwgKytsbilcbiAgICAgICAgICAgICAgaWYgKHRhcmdldFtpXSAhPSBmb2xkKGRvYy5nZXRMaW5lKGxuKSkpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChmb2xkKGRvYy5nZXRMaW5lKGxuKS5zbGljZSgwLCBvcmlnVGFyZ2V0W2xhc3RdLmxlbmd0aCkpICE9IHRhcmdldFtsYXN0XSkgcmV0dXJuO1xuICAgICAgICAgICAgcmV0dXJuIHtmcm9tOiBmcm9tLCB0bzogUG9zKGxuLCBvcmlnVGFyZ2V0W2xhc3RdLmxlbmd0aCl9O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBTZWFyY2hDdXJzb3IucHJvdG90eXBlID0ge1xuICAgIGZpbmROZXh0OiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5maW5kKGZhbHNlKTt9LFxuICAgIGZpbmRQcmV2aW91czogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuZmluZCh0cnVlKTt9LFxuXG4gICAgZmluZDogZnVuY3Rpb24ocmV2ZXJzZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzLCBwb3MgPSB0aGlzLmRvYy5jbGlwUG9zKHJldmVyc2UgPyB0aGlzLnBvcy5mcm9tIDogdGhpcy5wb3MudG8pO1xuICAgICAgZnVuY3Rpb24gc2F2ZVBvc0FuZEZhaWwobGluZSkge1xuICAgICAgICB2YXIgcG9zID0gUG9zKGxpbmUsIDApO1xuICAgICAgICBzZWxmLnBvcyA9IHtmcm9tOiBwb3MsIHRvOiBwb3N9O1xuICAgICAgICBzZWxmLmF0T2NjdXJyZW5jZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGZvciAoOzspIHtcbiAgICAgICAgaWYgKHRoaXMucG9zID0gdGhpcy5tYXRjaGVzKHJldmVyc2UsIHBvcykpIHtcbiAgICAgICAgICB0aGlzLmF0T2NjdXJyZW5jZSA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucG9zLm1hdGNoIHx8IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgICBpZiAoIXBvcy5saW5lKSByZXR1cm4gc2F2ZVBvc0FuZEZhaWwoMCk7XG4gICAgICAgICAgcG9zID0gUG9zKHBvcy5saW5lLTEsIHRoaXMuZG9jLmdldExpbmUocG9zLmxpbmUtMSkubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB2YXIgbWF4TGluZSA9IHRoaXMuZG9jLmxpbmVDb3VudCgpO1xuICAgICAgICAgIGlmIChwb3MubGluZSA9PSBtYXhMaW5lIC0gMSkgcmV0dXJuIHNhdmVQb3NBbmRGYWlsKG1heExpbmUpO1xuICAgICAgICAgIHBvcyA9IFBvcyhwb3MubGluZSArIDEsIDApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIGZyb206IGZ1bmN0aW9uKCkge2lmICh0aGlzLmF0T2NjdXJyZW5jZSkgcmV0dXJuIHRoaXMucG9zLmZyb207fSxcbiAgICB0bzogZnVuY3Rpb24oKSB7aWYgKHRoaXMuYXRPY2N1cnJlbmNlKSByZXR1cm4gdGhpcy5wb3MudG87fSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uKG5ld1RleHQpIHtcbiAgICAgIGlmICghdGhpcy5hdE9jY3VycmVuY2UpIHJldHVybjtcbiAgICAgIHZhciBsaW5lcyA9IENvZGVNaXJyb3Iuc3BsaXRMaW5lcyhuZXdUZXh0KTtcbiAgICAgIHRoaXMuZG9jLnJlcGxhY2VSYW5nZShsaW5lcywgdGhpcy5wb3MuZnJvbSwgdGhpcy5wb3MudG8pO1xuICAgICAgdGhpcy5wb3MudG8gPSBQb3ModGhpcy5wb3MuZnJvbS5saW5lICsgbGluZXMubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdLmxlbmd0aCArIChsaW5lcy5sZW5ndGggPT0gMSA/IHRoaXMucG9zLmZyb20uY2ggOiAwKSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIE1hcHMgYSBwb3NpdGlvbiBpbiBhIGNhc2UtZm9sZGVkIGxpbmUgYmFjayB0byBhIHBvc2l0aW9uIGluIHRoZSBvcmlnaW5hbCBsaW5lXG4gIC8vIChjb21wZW5zYXRpbmcgZm9yIGNvZGVwb2ludHMgaW5jcmVhc2luZyBpbiBudW1iZXIgZHVyaW5nIGZvbGRpbmcpXG4gIGZ1bmN0aW9uIGFkanVzdFBvcyhvcmlnLCBmb2xkZWQsIHBvcykge1xuICAgIGlmIChvcmlnLmxlbmd0aCA9PSBmb2xkZWQubGVuZ3RoKSByZXR1cm4gcG9zO1xuICAgIGZvciAodmFyIHBvczEgPSBNYXRoLm1pbihwb3MsIG9yaWcubGVuZ3RoKTs7KSB7XG4gICAgICB2YXIgbGVuMSA9IG9yaWcuc2xpY2UoMCwgcG9zMSkudG9Mb3dlckNhc2UoKS5sZW5ndGg7XG4gICAgICBpZiAobGVuMSA8IHBvcykgKytwb3MxO1xuICAgICAgZWxzZSBpZiAobGVuMSA+IHBvcykgLS1wb3MxO1xuICAgICAgZWxzZSByZXR1cm4gcG9zMTtcbiAgICB9XG4gIH1cblxuICBDb2RlTWlycm9yLmRlZmluZUV4dGVuc2lvbihcImdldFNlYXJjaEN1cnNvclwiLCBmdW5jdGlvbihxdWVyeSwgcG9zLCBjYXNlRm9sZCkge1xuICAgIHJldHVybiBuZXcgU2VhcmNoQ3Vyc29yKHRoaXMuZG9jLCBxdWVyeSwgcG9zLCBjYXNlRm9sZCk7XG4gIH0pO1xuICBDb2RlTWlycm9yLmRlZmluZURvY0V4dGVuc2lvbihcImdldFNlYXJjaEN1cnNvclwiLCBmdW5jdGlvbihxdWVyeSwgcG9zLCBjYXNlRm9sZCkge1xuICAgIHJldHVybiBuZXcgU2VhcmNoQ3Vyc29yKHRoaXMsIHF1ZXJ5LCBwb3MsIGNhc2VGb2xkKTtcbiAgfSk7XG5cbiAgQ29kZU1pcnJvci5kZWZpbmVFeHRlbnNpb24oXCJzZWxlY3RNYXRjaGVzXCIsIGZ1bmN0aW9uKHF1ZXJ5LCBjYXNlRm9sZCkge1xuICAgIHZhciByYW5nZXMgPSBbXSwgbmV4dDtcbiAgICB2YXIgY3VyID0gdGhpcy5nZXRTZWFyY2hDdXJzb3IocXVlcnksIHRoaXMuZ2V0Q3Vyc29yKFwiZnJvbVwiKSwgY2FzZUZvbGQpO1xuICAgIHdoaWxlIChuZXh0ID0gY3VyLmZpbmROZXh0KCkpIHtcbiAgICAgIGlmIChDb2RlTWlycm9yLmNtcFBvcyhjdXIudG8oKSwgdGhpcy5nZXRDdXJzb3IoXCJ0b1wiKSkgPiAwKSBicmVhaztcbiAgICAgIHJhbmdlcy5wdXNoKHthbmNob3I6IGN1ci5mcm9tKCksIGhlYWQ6IGN1ci50bygpfSk7XG4gICAgfVxuICAgIGlmIChyYW5nZXMubGVuZ3RoKVxuICAgICAgdGhpcy5zZXRTZWxlY3Rpb25zKHJhbmdlcywgMCk7XG4gIH0pO1xufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIjsoZnVuY3Rpb24od2luKXtcblx0dmFyIHN0b3JlID0ge30sXG5cdFx0ZG9jID0gd2luLmRvY3VtZW50LFxuXHRcdGxvY2FsU3RvcmFnZU5hbWUgPSAnbG9jYWxTdG9yYWdlJyxcblx0XHRzY3JpcHRUYWcgPSAnc2NyaXB0Jyxcblx0XHRzdG9yYWdlXG5cblx0c3RvcmUuZGlzYWJsZWQgPSBmYWxzZVxuXHRzdG9yZS5zZXQgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7fVxuXHRzdG9yZS5nZXQgPSBmdW5jdGlvbihrZXkpIHt9XG5cdHN0b3JlLnJlbW92ZSA9IGZ1bmN0aW9uKGtleSkge31cblx0c3RvcmUuY2xlYXIgPSBmdW5jdGlvbigpIHt9XG5cdHN0b3JlLnRyYW5zYWN0ID0gZnVuY3Rpb24oa2V5LCBkZWZhdWx0VmFsLCB0cmFuc2FjdGlvbkZuKSB7XG5cdFx0dmFyIHZhbCA9IHN0b3JlLmdldChrZXkpXG5cdFx0aWYgKHRyYW5zYWN0aW9uRm4gPT0gbnVsbCkge1xuXHRcdFx0dHJhbnNhY3Rpb25GbiA9IGRlZmF1bHRWYWxcblx0XHRcdGRlZmF1bHRWYWwgPSBudWxsXG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdmFsID09ICd1bmRlZmluZWQnKSB7IHZhbCA9IGRlZmF1bHRWYWwgfHwge30gfVxuXHRcdHRyYW5zYWN0aW9uRm4odmFsKVxuXHRcdHN0b3JlLnNldChrZXksIHZhbClcblx0fVxuXHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbigpIHt9XG5cdHN0b3JlLmZvckVhY2ggPSBmdW5jdGlvbigpIHt9XG5cblx0c3RvcmUuc2VyaWFsaXplID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG5cdH1cblx0c3RvcmUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHsgcmV0dXJuIHVuZGVmaW5lZCB9XG5cdFx0dHJ5IHsgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpIH1cblx0XHRjYXRjaChlKSB7IHJldHVybiB2YWx1ZSB8fCB1bmRlZmluZWQgfVxuXHR9XG5cblx0Ly8gRnVuY3Rpb25zIHRvIGVuY2Fwc3VsYXRlIHF1ZXN0aW9uYWJsZSBGaXJlRm94IDMuNi4xMyBiZWhhdmlvclxuXHQvLyB3aGVuIGFib3V0LmNvbmZpZzo6ZG9tLnN0b3JhZ2UuZW5hYmxlZCA9PT0gZmFsc2Vcblx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJjdXN3ZXN0aW4vc3RvcmUuanMvaXNzdWVzI2lzc3VlLzEzXG5cdGZ1bmN0aW9uIGlzTG9jYWxTdG9yYWdlTmFtZVN1cHBvcnRlZCgpIHtcblx0XHR0cnkgeyByZXR1cm4gKGxvY2FsU3RvcmFnZU5hbWUgaW4gd2luICYmIHdpbltsb2NhbFN0b3JhZ2VOYW1lXSkgfVxuXHRcdGNhdGNoKGVycikgeyByZXR1cm4gZmFsc2UgfVxuXHR9XG5cblx0aWYgKGlzTG9jYWxTdG9yYWdlTmFtZVN1cHBvcnRlZCgpKSB7XG5cdFx0c3RvcmFnZSA9IHdpbltsb2NhbFN0b3JhZ2VOYW1lXVxuXHRcdHN0b3JlLnNldCA9IGZ1bmN0aW9uKGtleSwgdmFsKSB7XG5cdFx0XHRpZiAodmFsID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIHN0b3JlLnJlbW92ZShrZXkpIH1cblx0XHRcdHN0b3JhZ2Uuc2V0SXRlbShrZXksIHN0b3JlLnNlcmlhbGl6ZSh2YWwpKVxuXHRcdFx0cmV0dXJuIHZhbFxuXHRcdH1cblx0XHRzdG9yZS5nZXQgPSBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHN0b3JlLmRlc2VyaWFsaXplKHN0b3JhZ2UuZ2V0SXRlbShrZXkpKSB9XG5cdFx0c3RvcmUucmVtb3ZlID0gZnVuY3Rpb24oa2V5KSB7IHN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpIH1cblx0XHRzdG9yZS5jbGVhciA9IGZ1bmN0aW9uKCkgeyBzdG9yYWdlLmNsZWFyKCkgfVxuXHRcdHN0b3JlLmdldEFsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJldCA9IHt9XG5cdFx0XHRzdG9yZS5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgdmFsKSB7XG5cdFx0XHRcdHJldFtrZXldID0gdmFsXG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblx0XHRzdG9yZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdGZvciAodmFyIGk9MDsgaTxzdG9yYWdlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBrZXkgPSBzdG9yYWdlLmtleShpKVxuXHRcdFx0XHRjYWxsYmFjayhrZXksIHN0b3JlLmdldChrZXkpKVxuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIGlmIChkb2MuZG9jdW1lbnRFbGVtZW50LmFkZEJlaGF2aW9yKSB7XG5cdFx0dmFyIHN0b3JhZ2VPd25lcixcblx0XHRcdHN0b3JhZ2VDb250YWluZXJcblx0XHQvLyBTaW5jZSAjdXNlckRhdGEgc3RvcmFnZSBhcHBsaWVzIG9ubHkgdG8gc3BlY2lmaWMgcGF0aHMsIHdlIG5lZWQgdG9cblx0XHQvLyBzb21laG93IGxpbmsgb3VyIGRhdGEgdG8gYSBzcGVjaWZpYyBwYXRoLiAgV2UgY2hvb3NlIC9mYXZpY29uLmljb1xuXHRcdC8vIGFzIGEgcHJldHR5IHNhZmUgb3B0aW9uLCBzaW5jZSBhbGwgYnJvd3NlcnMgYWxyZWFkeSBtYWtlIGEgcmVxdWVzdCB0b1xuXHRcdC8vIHRoaXMgVVJMIGFueXdheSBhbmQgYmVpbmcgYSA0MDQgd2lsbCBub3QgaHVydCB1cyBoZXJlLiAgV2Ugd3JhcCBhblxuXHRcdC8vIGlmcmFtZSBwb2ludGluZyB0byB0aGUgZmF2aWNvbiBpbiBhbiBBY3RpdmVYT2JqZWN0KGh0bWxmaWxlKSBvYmplY3Rcblx0XHQvLyAoc2VlOiBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvYWE3NTI1NzQodj1WUy44NSkuYXNweClcblx0XHQvLyBzaW5jZSB0aGUgaWZyYW1lIGFjY2VzcyBydWxlcyBhcHBlYXIgdG8gYWxsb3cgZGlyZWN0IGFjY2VzcyBhbmRcblx0XHQvLyBtYW5pcHVsYXRpb24gb2YgdGhlIGRvY3VtZW50IGVsZW1lbnQsIGV2ZW4gZm9yIGEgNDA0IHBhZ2UuICBUaGlzXG5cdFx0Ly8gZG9jdW1lbnQgY2FuIGJlIHVzZWQgaW5zdGVhZCBvZiB0aGUgY3VycmVudCBkb2N1bWVudCAod2hpY2ggd291bGRcblx0XHQvLyBoYXZlIGJlZW4gbGltaXRlZCB0byB0aGUgY3VycmVudCBwYXRoKSB0byBwZXJmb3JtICN1c2VyRGF0YSBzdG9yYWdlLlxuXHRcdHRyeSB7XG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyID0gbmV3IEFjdGl2ZVhPYmplY3QoJ2h0bWxmaWxlJylcblx0XHRcdHN0b3JhZ2VDb250YWluZXIub3BlbigpXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyLndyaXRlKCc8JytzY3JpcHRUYWcrJz5kb2N1bWVudC53PXdpbmRvdzwvJytzY3JpcHRUYWcrJz48aWZyYW1lIHNyYz1cIi9mYXZpY29uLmljb1wiPjwvaWZyYW1lPicpXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyLmNsb3NlKClcblx0XHRcdHN0b3JhZ2VPd25lciA9IHN0b3JhZ2VDb250YWluZXIudy5mcmFtZXNbMF0uZG9jdW1lbnRcblx0XHRcdHN0b3JhZ2UgPSBzdG9yYWdlT3duZXIuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdC8vIHNvbWVob3cgQWN0aXZlWE9iamVjdCBpbnN0YW50aWF0aW9uIGZhaWxlZCAocGVyaGFwcyBzb21lIHNwZWNpYWxcblx0XHRcdC8vIHNlY3VyaXR5IHNldHRpbmdzIG9yIG90aGVyd3NlKSwgZmFsbCBiYWNrIHRvIHBlci1wYXRoIHN0b3JhZ2Vcblx0XHRcdHN0b3JhZ2UgPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRcdHN0b3JhZ2VPd25lciA9IGRvYy5ib2R5XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHdpdGhJRVN0b3JhZ2Uoc3RvcmVGdW5jdGlvbikge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMClcblx0XHRcdFx0YXJncy51bnNoaWZ0KHN0b3JhZ2UpXG5cdFx0XHRcdC8vIFNlZSBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXM1MzEwODEodj1WUy44NSkuYXNweFxuXHRcdFx0XHQvLyBhbmQgaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTMxNDI0KHY9VlMuODUpLmFzcHhcblx0XHRcdFx0c3RvcmFnZU93bmVyLmFwcGVuZENoaWxkKHN0b3JhZ2UpXG5cdFx0XHRcdHN0b3JhZ2UuYWRkQmVoYXZpb3IoJyNkZWZhdWx0I3VzZXJEYXRhJylcblx0XHRcdFx0c3RvcmFnZS5sb2FkKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0XHRcdHZhciByZXN1bHQgPSBzdG9yZUZ1bmN0aW9uLmFwcGx5KHN0b3JlLCBhcmdzKVxuXHRcdFx0XHRzdG9yYWdlT3duZXIucmVtb3ZlQ2hpbGQoc3RvcmFnZSlcblx0XHRcdFx0cmV0dXJuIHJlc3VsdFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEluIElFNywga2V5cyBjYW5ub3Qgc3RhcnQgd2l0aCBhIGRpZ2l0IG9yIGNvbnRhaW4gY2VydGFpbiBjaGFycy5cblx0XHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21hcmN1c3dlc3Rpbi9zdG9yZS5qcy9pc3N1ZXMvNDBcblx0XHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21hcmN1c3dlc3Rpbi9zdG9yZS5qcy9pc3N1ZXMvODNcblx0XHR2YXIgZm9yYmlkZGVuQ2hhcnNSZWdleCA9IG5ldyBSZWdFeHAoXCJbIVxcXCIjJCUmJygpKissL1xcXFxcXFxcOjs8PT4/QFtcXFxcXV5ge3x9fl1cIiwgXCJnXCIpXG5cdFx0ZnVuY3Rpb24gaWVLZXlGaXgoa2V5KSB7XG5cdFx0XHRyZXR1cm4ga2V5LnJlcGxhY2UoL15kLywgJ19fXyQmJykucmVwbGFjZShmb3JiaWRkZW5DaGFyc1JlZ2V4LCAnX19fJylcblx0XHR9XG5cdFx0c3RvcmUuc2V0ID0gd2l0aElFU3RvcmFnZShmdW5jdGlvbihzdG9yYWdlLCBrZXksIHZhbCkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiBzdG9yZS5yZW1vdmUoa2V5KSB9XG5cdFx0XHRzdG9yYWdlLnNldEF0dHJpYnV0ZShrZXksIHN0b3JlLnNlcmlhbGl6ZSh2YWwpKVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0XHRyZXR1cm4gdmFsXG5cdFx0fSlcblx0XHRzdG9yZS5nZXQgPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGtleSkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0cmV0dXJuIHN0b3JlLmRlc2VyaWFsaXplKHN0b3JhZ2UuZ2V0QXR0cmlidXRlKGtleSkpXG5cdFx0fSlcblx0XHRzdG9yZS5yZW1vdmUgPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGtleSkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoa2V5KVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5jbGVhciA9IHdpdGhJRVN0b3JhZ2UoZnVuY3Rpb24oc3RvcmFnZSkge1xuXHRcdFx0dmFyIGF0dHJpYnV0ZXMgPSBzdG9yYWdlLlhNTERvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRyaWJ1dGVzXG5cdFx0XHRzdG9yYWdlLmxvYWQobG9jYWxTdG9yYWdlTmFtZSlcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyBpKyspIHtcblx0XHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuXHRcdFx0fVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbihzdG9yYWdlKSB7XG5cdFx0XHR2YXIgcmV0ID0ge31cblx0XHRcdHN0b3JlLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWwpIHtcblx0XHRcdFx0cmV0W2tleV0gPSB2YWxcblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXHRcdHN0b3JlLmZvckVhY2ggPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgYXR0cmlidXRlcyA9IHN0b3JhZ2UuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXNcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyArK2kpIHtcblx0XHRcdFx0Y2FsbGJhY2soYXR0ci5uYW1lLCBzdG9yZS5kZXNlcmlhbGl6ZShzdG9yYWdlLmdldEF0dHJpYnV0ZShhdHRyLm5hbWUpKSlcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0dHJ5IHtcblx0XHR2YXIgdGVzdEtleSA9ICdfX3N0b3JlanNfXydcblx0XHRzdG9yZS5zZXQodGVzdEtleSwgdGVzdEtleSlcblx0XHRpZiAoc3RvcmUuZ2V0KHRlc3RLZXkpICE9IHRlc3RLZXkpIHsgc3RvcmUuZGlzYWJsZWQgPSB0cnVlIH1cblx0XHRzdG9yZS5yZW1vdmUodGVzdEtleSlcblx0fSBjYXRjaChlKSB7XG5cdFx0c3RvcmUuZGlzYWJsZWQgPSB0cnVlXG5cdH1cblx0c3RvcmUuZW5hYmxlZCA9ICFzdG9yZS5kaXNhYmxlZFxuXG5cdGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICYmIHRoaXMubW9kdWxlICE9PSBtb2R1bGUpIHsgbW9kdWxlLmV4cG9ydHMgPSBzdG9yZSB9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkgeyBkZWZpbmUoc3RvcmUpIH1cblx0ZWxzZSB7IHdpbi5zdG9yZSA9IHN0b3JlIH1cblxufSkoRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKSk7XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInlhc2d1aS11dGlsc1wiLFxuICBcInZlcnNpb25cIjogXCIxLjMuMVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiVXRpbHMgZm9yIFlBU0dVSSBsaWJzXCIsXG4gIFwibWFpblwiOiBcInNyYy9tYWluLmpzXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQ6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlscy5naXRcIlxuICB9LFxuICBcImxpY2Vuc2VzXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJNSVRcIixcbiAgICAgIFwidXJsXCI6IFwiaHR0cDovL3lhc2d1aS5naXRodWIuaW8vbGljZW5zZS50eHRcIlxuICAgIH1cbiAgXSxcbiAgXCJhdXRob3JcIjoge1xuICAgIFwibmFtZVwiOiBcIkxhdXJlbnMgUmlldHZlbGRcIlxuICB9LFxuICBcIm1haW50YWluZXJzXCI6IFtcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJMYXVyZW5zIFJpZXR2ZWxkXCIsXG4gICAgICBcImVtYWlsXCI6IFwibGF1cmVucy5yaWV0dmVsZEBnbWFpbC5jb21cIixcbiAgICAgIFwidXJsXCI6IFwiaHR0cDovL2xhdXJlbnNyaWV0dmVsZC5ubFwiXG4gICAgfVxuICBdLFxuICBcImJ1Z3NcIjoge1xuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlscy9pc3N1ZXNcIlxuICB9LFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlsc1wiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJzdG9yZVwiOiBcIl4xLjMuMTRcIlxuICB9LFxuICBcInJlYWRtZVwiOiBcIkEgc2ltcGxlIHV0aWxzIHJlcG8gZm9yIHRoZSBZQVNHVUkgdG9vbHNcXG5cIixcbiAgXCJyZWFkbWVGaWxlbmFtZVwiOiBcIlJFQURNRS5tZFwiLFxuICBcIl9pZFwiOiBcInlhc2d1aS11dGlsc0AxLjMuMVwiLFxuICBcIl9mcm9tXCI6IFwieWFzZ3VpLXV0aWxzQDEuMy4xXCJcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qKlxuICogRGV0ZXJtaW5lIHVuaXF1ZSBJRCBvZiB0aGUgWUFTUUUgb2JqZWN0LiBVc2VmdWwgd2hlbiBzZXZlcmFsIG9iamVjdHMgYXJlXG4gKiBsb2FkZWQgb24gdGhlIHNhbWUgcGFnZSwgYW5kIGFsbCBoYXZlICdwZXJzaXN0ZW5jeScgZW5hYmxlZC4gQ3VycmVudGx5LCB0aGVcbiAqIElEIGlzIGRldGVybWluZWQgYnkgc2VsZWN0aW5nIHRoZSBuZWFyZXN0IHBhcmVudCBpbiB0aGUgRE9NIHdpdGggYW4gSUQgc2V0XG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQG1ldGhvZCBZQVNRRS5kZXRlcm1pbmVJZFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCkge1xuXHRyZXR1cm4gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKShlbGVtZW50KS5jbG9zZXN0KCdbaWRdJykuYXR0cignaWQnKTtcbn07XG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHRjcm9zczogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMzBweFwiIGhlaWdodD1cIjMwcHhcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGc+XHQ8cGF0aCBkPVwiTTgzLjI4OCw4OC4xM2MtMi4xMTQsMi4xMTItNS41NzUsMi4xMTItNy42ODksMEw1My42NTksNjYuMTg4Yy0yLjExNC0yLjExMi01LjU3My0yLjExMi03LjY4NywwTDI0LjI1MSw4Ny45MDcgICBjLTIuMTEzLDIuMTE0LTUuNTcxLDIuMTE0LTcuNjg2LDBsLTQuNjkzLTQuNjkxYy0yLjExNC0yLjExNC0yLjExNC01LjU3MywwLTcuNjg4bDIxLjcxOS0yMS43MjFjMi4xMTMtMi4xMTQsMi4xMTMtNS41NzMsMC03LjY4NiAgIEwxMS44NzIsMjQuNGMtMi4xMTQtMi4xMTMtMi4xMTQtNS41NzEsMC03LjY4Nmw0Ljg0Mi00Ljg0MmMyLjExMy0yLjExNCw1LjU3MS0yLjExNCw3LjY4NiwwTDQ2LjEyLDMzLjU5MSAgIGMyLjExNCwyLjExNCw1LjU3MiwyLjExNCw3LjY4OCwwbDIxLjcyMS0yMS43MTljMi4xMTQtMi4xMTQsNS41NzMtMi4xMTQsNy42ODcsMGw0LjY5NSw0LjY5NWMyLjExMSwyLjExMywyLjExMSw1LjU3MS0wLjAwMyw3LjY4NiAgIEw2Ni4xODgsNDUuOTczYy0yLjExMiwyLjExNC0yLjExMiw1LjU3MywwLDcuNjg2TDg4LjEzLDc1LjYwMmMyLjExMiwyLjExMSwyLjExMiw1LjU3MiwwLDcuNjg3TDgzLjI4OCw4OC4xM3pcIi8+PC9nPjwvc3ZnPicsXG5cdGNoZWNrOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIzMHB4XCIgaGVpZ2h0PVwiMzBweFwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48cGF0aCBmaWxsPVwiIzAwMDAwMFwiIGQ9XCJNMTQuMzAxLDQ5Ljk4MmwyMi42MDYsMTcuMDQ3TDg0LjM2MSw0LjkwM2MyLjYxNC0zLjczMyw3Ljc2LTQuNjQsMTEuNDkzLTIuMDI2bDAuNjI3LDAuNDYyICBjMy43MzIsMi42MTQsNC42NCw3Ljc1OCwyLjAyNSwxMS40OTJsLTUxLjc4Myw3OS43N2MtMS45NTUsMi43OTEtMy44OTYsMy43NjItNy4zMDEsMy45ODhjLTMuNDA1LDAuMjI1LTUuNDY0LTEuMDM5LTcuNTA4LTMuMDg0ICBMMi40NDcsNjEuODE0Yy0zLjI2My0zLjI2Mi0zLjI2My04LjU1MywwLTExLjgxNGwwLjA0MS0wLjAxOUM1Ljc1LDQ2LjcxOCwxMS4wMzksNDYuNzE4LDE0LjMwMSw0OS45ODJ6XCIvPjwvc3ZnPicsXG5cdHVuc29ydGVkOiAnPHN2ZyAgIHhtbG5zOmRjPVwiaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS9cIiAgIHhtbG5zOmNjPVwiaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjXCIgICB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCIgICB4bWxuczpzdmc9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM6c29kaXBvZGk9XCJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZFwiICAgeG1sbnM6aW5rc2NhcGU9XCJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlXCIgICB2ZXJzaW9uPVwiMS4xXCIgICBpZD1cIkxheWVyXzFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA1NC41NTI3MTEgMTEzLjc4NDc4XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiICAgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyAgICAgaWQ9XCJnNVwiICAgICB0cmFuc2Zvcm09XCJtYXRyaXgoLTAuNzA1MjIxNTYsLTAuNzA4OTg2OTksLTAuNzA4OTg2OTksMC43MDUyMjE1Niw5Ny45ODgxOTksNTUuMDgxMjA1KVwiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBpZD1cInBhdGg3XCIgICAgICAgZD1cIk0gNTcuOTExLDY2LjkxNSA0NS44MDgsNTUuMDYzIDQyLjkwNCw1Mi4yMzggMzEuNjYxLDQxLjI1IDMxLjQzNSw0MS4wODMgMzEuMTMxLDQwLjc3NSAzMC43OTQsNDAuNTIzIDMwLjQ4Niw0MC4zIDMwLjA2OSw0MC4wNSAyOS44MTUsMzkuOTExIDI5LjI4NSwzOS42NTkgMjkuMDg5LDM5LjU3NiAyOC40NzQsMzkuMzI2IDI4LjM2MywzOS4yOTcgSCAyOC4zMzYgTCAyNy42NjUsMzkuMTI4IDI3LjUyNiwzOS4xIDI2Ljk0LDM4Ljk5IDI2LjcxNCwzOC45NjEgMjYuMjEyLDM4LjkzNCBoIC0wLjMxIC0wLjQ0NCBsIC0wLjMzOSwwLjAyNyBjIC0xLjQ1LDAuMTM5IC0yLjg3NiwwLjY3MSAtNC4xMSwxLjU2NCBsIC0wLjIyMywwLjE0MSAtMC4yNzksMC4yNSAtMC4zMzUsMC4zMDggLTAuMDU0LDAuMDI5IC0wLjE3MSwwLjE5NCAtMC4zMzQsMC4zNjQgLTAuMjI0LDAuMjc5IC0wLjI1LDAuMzM2IC0wLjIyNSwwLjM2MiAtMC4xOTIsMC4zMDggLTAuMTk3LDAuNDIxIC0wLjE0MiwwLjI3OSAtMC4xOTMsMC40NzcgLTAuMDg0LDAuMjIyIC0xMi40NDEsMzguNDE0IGMgLTAuODE0LDIuNDU4IC0wLjMxMyw1LjAyOSAxLjExNSw2Ljk4OCB2IDAuMDI2IGwgMC40MTgsMC41MzIgMC4xNywwLjE2NSAwLjI1MSwwLjI4MSAwLjA4NCwwLjA3OSAwLjI4MywwLjI4MSAwLjI1LDAuMTk0IDAuNDc0LDAuMzY3IDAuMDgzLDAuMDUzIGMgMi4wMTUsMS4zNzEgNC42NDEsMS44NzQgNy4xMzEsMS4wOTQgTCA1NS4yMjgsODAuNzc2IGMgNC4zMDMsLTEuMzQyIDYuNjc5LC01LjgxNCA1LjMwOCwtMTAuMDA2IC0wLjM4NywtMS4yNTkgLTEuMDg2LC0yLjM1IC0xLjk3OSwtMy4yMTUgbCAtMC4zNjgsLTAuMzM3IC0wLjI3OCwtMC4zMDMgeiBtIC02LjMxOCw1Ljg5NiAwLjA3OSwwLjExNCAtMzcuMzY5LDExLjU3IDExLjg1NCwtMzYuNTM4IDEwLjU2NSwxMC4zMTcgMi44NzYsMi44MjUgMTEuOTk1LDExLjcxMiB6XCIgLz48L2c+PHBhdGggICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgIGlkPVwicGF0aDctOVwiICAgICBkPVwibSA4Ljg3NDgzMzksNTIuNTcxNzY2IDE2LjkzODIxMTEsLTAuMjIyNTg0IDQuMDUwODUxLC0wLjA2NjY1IDE1LjcxOTE1NCwtMC4yMjIxNjYgMC4yNzc3OCwtMC4wNDI0NiAwLjQzMjc2LDAuMDAxNyAwLjQxNjMyLC0wLjA2MTIxIDAuMzc1MzIsLTAuMDYxMSAwLjQ3MTMyLC0wLjExOTM0MiAwLjI3NzY3LC0wLjA4MjA2IDAuNTUyNDQsLTAuMTk4MDQ3IDAuMTk3MDcsLTAuMDgwNDMgMC42MTA5NSwtMC4yNTk3MjEgMC4wOTg4LC0wLjA1ODI1IDAuMDE5LC0wLjAxOTE0IDAuNTkzMDMsLTAuMzU2NTQ4IDAuMTE3ODcsLTAuMDc4OCAwLjQ5MTI1LC0wLjMzNzg5MiAwLjE3OTk0LC0wLjEzOTc3OSAwLjM3MzE3LC0wLjMzNjg3MSAwLjIxODYyLC0wLjIxOTc4NiAwLjMxMzExLC0wLjMxNDc5IDAuMjE5OTMsLTAuMjU5Mzg3IGMgMC45MjQwMiwtMS4xMjYwNTcgMS41NTI0OSwtMi41MTIyNTEgMS43ODk2MSwtNC4wMTY5MDQgbCAwLjA1NzMsLTAuMjU3NTQgMC4wMTk1LC0wLjM3NDExMyAwLjAxNzksLTAuNDU0NzE5IDAuMDE3NSwtMC4wNTg3NCAtMC4wMTY5LC0wLjI1ODA0OSAtMC4wMjI1LC0wLjQ5MzUwMyAtMC4wMzk4LC0wLjM1NTU2OSAtMC4wNjE5LC0wLjQxNDIwMSAtMC4wOTgsLTAuNDE0ODEyIC0wLjA4MywtMC4zNTMzMzQgTCA1My4yMzk1NSw0MS4xNDg0IDUzLjE0MTg1LDQwLjg1MDk2NyA1Mi45Mzk3Nyw0MC4zNzc3NDIgNTIuODQxNTcsNDAuMTYxNjI4IDM0LjM4MDIxLDQuMjUwNzM3NSBDIDMzLjIxMTU2NywxLjk0MDE4NzUgMzEuMDM1NDQ2LDAuNDgyMjY1NTIgMjguNjM5NDg0LDAuMTEzMTY5NTIgbCAtMC4wMTg0MywtMC4wMTgzNCAtMC42NzE5NjMsLTAuMDc4ODIgLTAuMjM2ODcxLDAuMDA0MiBMIDI3LjMzNTk4NCwtNC43ODI2NTc3ZS03IDI3LjIyMDczNiwwLjAwMzc5OTUyIGwgLTAuMzk4ODA0LDAuMDAyNSAtMC4zMTM4NDgsMC4wNDA0MyAtMC41OTQ0NzQsMC4wNzcyNCAtMC4wOTYxMSwwLjAyMTQ3IEMgMjMuNDI0NTQ5LDAuNjA3MTYyNTIgMjEuMjE2MDE3LDIuMTE0MjM1NSAyMC4wMTMwMjUsNC40Mjk2ODY1IEwgMC45Mzk2NzQ5MSw0MC44OTQ0NzkgYyAtMi4wODMxMDgwMSwzLjk5NzE3OCAtMC41ODgxMjUsOC44MzU0ODIgMy4zNTA4MDc5OSwxMC44MTk3NDkgMS4xNjU1MzUsMC42MTM0OTUgMi40MzE5OSwwLjg4NzMxIDMuNjc1MDI2LDAuODY0MjAyIGwgMC40OTg0NSwtMC4wMjMyNSAwLjQxMDg3NSwwLjAxNjU4IHogTSA5LjE1MDIzNjksNDMuOTM0NDAxIDkuMDEzNjk5OSw0My45MTAwMTEgMjcuMTY0MTQ1LDkuMjU2NDYyNSA0NC43MDk0Miw0My40MjgxOCBsIC0xNC43NjUyODksMC4yMTQ2NzcgLTQuMDMxMTA2LDAuMDQ2OCAtMTYuNzYyNzg4MSwwLjI0NDc0NCB6XCIgLz48L3N2Zz4nLFxuXHRzb3J0RGVzYzogJzxzdmcgICB4bWxuczpkYz1cImh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvXCIgICB4bWxuczpjYz1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zI1wiICAgeG1sbnM6cmRmPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zI1wiICAgeG1sbnM6c3ZnPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zOnNvZGlwb2RpPVwiaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGRcIiAgIHhtbG5zOmlua3NjYXBlPVwiaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZVwiICAgdmVyc2lvbj1cIjEuMVwiICAgaWQ9XCJMYXllcl8xXCIgICB4PVwiMHB4XCIgICB5PVwiMHB4XCIgICB3aWR0aD1cIjEwMCVcIiAgIGhlaWdodD1cIjEwMCVcIiAgIHZpZXdCb3g9XCIwIDAgNTQuNTUyNzExIDExMy43ODQ3OFwiICAgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDEwMCAxMDBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgICAgIGlkPVwiZzVcIiAgICAgdHJhbnNmb3JtPVwibWF0cml4KC0wLjcwNTIyMTU2LC0wLjcwODk4Njk5LC0wLjcwODk4Njk5LDAuNzA1MjIxNTYsOTcuOTg4MTk5LDU1LjA4MTIwNSlcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgaWQ9XCJwYXRoN1wiICAgICAgIGQ9XCJNIDU3LjkxMSw2Ni45MTUgNDUuODA4LDU1LjA2MyA0Mi45MDQsNTIuMjM4IDMxLjY2MSw0MS4yNSAzMS40MzUsNDEuMDgzIDMxLjEzMSw0MC43NzUgMzAuNzk0LDQwLjUyMyAzMC40ODYsNDAuMyAzMC4wNjksNDAuMDUgMjkuODE1LDM5LjkxMSAyOS4yODUsMzkuNjU5IDI5LjA4OSwzOS41NzYgMjguNDc0LDM5LjMyNiAyOC4zNjMsMzkuMjk3IEggMjguMzM2IEwgMjcuNjY1LDM5LjEyOCAyNy41MjYsMzkuMSAyNi45NCwzOC45OSAyNi43MTQsMzguOTYxIDI2LjIxMiwzOC45MzQgaCAtMC4zMSAtMC40NDQgbCAtMC4zMzksMC4wMjcgYyAtMS40NSwwLjEzOSAtMi44NzYsMC42NzEgLTQuMTEsMS41NjQgbCAtMC4yMjMsMC4xNDEgLTAuMjc5LDAuMjUgLTAuMzM1LDAuMzA4IC0wLjA1NCwwLjAyOSAtMC4xNzEsMC4xOTQgLTAuMzM0LDAuMzY0IC0wLjIyNCwwLjI3OSAtMC4yNSwwLjMzNiAtMC4yMjUsMC4zNjIgLTAuMTkyLDAuMzA4IC0wLjE5NywwLjQyMSAtMC4xNDIsMC4yNzkgLTAuMTkzLDAuNDc3IC0wLjA4NCwwLjIyMiAtMTIuNDQxLDM4LjQxNCBjIC0wLjgxNCwyLjQ1OCAtMC4zMTMsNS4wMjkgMS4xMTUsNi45ODggdiAwLjAyNiBsIDAuNDE4LDAuNTMyIDAuMTcsMC4xNjUgMC4yNTEsMC4yODEgMC4wODQsMC4wNzkgMC4yODMsMC4yODEgMC4yNSwwLjE5NCAwLjQ3NCwwLjM2NyAwLjA4MywwLjA1MyBjIDIuMDE1LDEuMzcxIDQuNjQxLDEuODc0IDcuMTMxLDEuMDk0IEwgNTUuMjI4LDgwLjc3NiBjIDQuMzAzLC0xLjM0MiA2LjY3OSwtNS44MTQgNS4zMDgsLTEwLjAwNiAtMC4zODcsLTEuMjU5IC0xLjA4NiwtMi4zNSAtMS45NzksLTMuMjE1IGwgLTAuMzY4LC0wLjMzNyAtMC4yNzgsLTAuMzAzIHogbSAtNi4zMTgsNS44OTYgMC4wNzksMC4xMTQgLTM3LjM2OSwxMS41NyAxMS44NTQsLTM2LjUzOCAxMC41NjUsMTAuMzE3IDIuODc2LDIuODI1IDExLjk5NSwxMS43MTIgelwiIC8+PC9nPjxwYXRoICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICBpZD1cInBhdGg5XCIgICAgIGQ9XCJtIDI3LjgxMzI3MywwLjEyODIzNTA2IDAuMDk3NTMsMC4wMjAwNiBjIDIuMzkwOTMsMC40NTgyMDkgNC41OTk0NTUsMS45NjgxMTEwNCA1LjgwMjQ0LDQuMjg2MzkwMDQgTCA1Mi43ODU4OTcsNDAuODk0NTI1IGMgMi4wODgwNDQsNC4wMDIxMzkgMC41OTA5NDksOC44MzY5MDIgLTMuMzQ4NjkyLDEwLjgyMTg3NSAtMS4zMjkwNzgsMC42ODg3MjEgLTIuNzY2NjAzLDAuOTQzNjk1IC00LjEzMzE3NCwwLjg0MTc2OCBsIC0wLjQ1NDAxOCwwLjAyIEwgMjcuOTEwMzkyLDUyLjM1NDE3MSAyMy44NTUzMTMsNTIuMjgxODUxIDguMTQzOTMsNTIuMDYxODI3IDcuODYyNjA4LDUyLjAyMTQ3NyA3LjQyOTg1Niw1Mi4wMjE3MzggNy4wMTQyNDEsNTEuOTU5ODE4IDYuNjM4MjE2LDUxLjkwMDgzOCA2LjE2NDc3Niw1MS43NzkzNjkgNS44ODkyMTYsNTEuNjk5NDM5IDUuMzM4OTA3LDUxLjUwMDY5MSA1LjEzOTcxOSw1MS40MTk1NTEgNC41NDUwNjQsNTEuMTQ1MDIzIDQuNDMwNjE4LDUxLjEwNTEyMyA0LjQxMDE2OCw1MS4wODQ1NjMgMy44MTcxMzgsNTAuNzMwODQzIDMuNjkzNjE1LDUwLjY0Nzc4MyAzLjIwNzMxNCw1MC4zMTA2MTEgMy4wMjgwNzEsNTAuMTc0MzY5IDIuNjUyNzk1LDQ5LjgzMzk1NyAyLjQzMzQ3MSw0OS42MTM0NjIgMi4xNDAwOTksNDkuMzE4NTIzIDEuOTAxMTI3LDQ5LjA0MTQwNyBDIDAuOTc3ODEsNDcuOTE2MDU5IDAuMzQ3OTM1LDQ2LjUyODQ0OCAwLjExMTUzLDQ1LjAyMTY3NiBMIDAuMDUzNTIsNDQuNzY2MjU1IDAuMDUxNzIsNDQuMzcxNjgzIDAuMDE4OTQsNDMuOTM2MDE3IDAsNDMuODc3Mjc3IDAuMDE4MzYsNDMuNjIyMDYgMC4wMzY2Niw0My4xMjI4ODkgMC4wNzY1LDQyLjc2NTkwNSAwLjEzOTEyLDQyLjM1MjQxMyAwLjIzNTY4LDQxLjk0MDQyNSAwLjMyMjg4LDQxLjU4ODUxNyAwLjQ4MTAyMSw0MS4xNTE5NDUgMC41NzkzOTEsNDAuODUzODA2IDAuNzczNjksNDAuMzgxMjY4IDAuODc2MDk3LDQwLjE2MjMzNiAxOS4zMzg4NjksNC4yNTQyODAxIGMgMS4xNzIxNjksLTIuMzA4NDE5IDMuMzQ3NTksLTMuNzY4NDY1MDQgNS43NDA4MjksLTQuMTc3MTY2MDQgbCAwLjAxOTc1LDAuMDE5ODUgMC42OTYwNSwtMC4wOTU3MyAwLjIxODQzNywwLjAyMjUgMC40OTA3OTEsLTAuMDIxMzIgMC4zOTgwOSwwLjAwNDYgMC4zMTU5NzIsMC4wMzk3MyAwLjU5NDQ2MiwwLjA4MTQ5IHpcIiAvPjwvc3ZnPicsXG5cdHNvcnRBc2M6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIGlkPVwiTGF5ZXJfMVwiICAgeD1cIjBweFwiICAgeT1cIjBweFwiICAgd2lkdGg9XCIxMDAlXCIgICBoZWlnaHQ9XCIxMDAlXCIgICB2aWV3Qm94PVwiMCAwIDU0LjU1MjcxMSAxMTMuNzg0NzhcIiAgIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgICB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxnICAgICBpZD1cImc1XCIgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgtMC43MDUyMjE1NiwwLjcwODk4Njk5LC0wLjcwODk4Njk5LC0wLjcwNTIyMTU2LDk3Ljk4ODE5OSw1OC43MDQ4MDcpXCI+PHBhdGggICAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICAgIGlkPVwicGF0aDdcIiAgICAgICBkPVwiTSA1Ny45MTEsNjYuOTE1IDQ1LjgwOCw1NS4wNjMgNDIuOTA0LDUyLjIzOCAzMS42NjEsNDEuMjUgMzEuNDM1LDQxLjA4MyAzMS4xMzEsNDAuNzc1IDMwLjc5NCw0MC41MjMgMzAuNDg2LDQwLjMgMzAuMDY5LDQwLjA1IDI5LjgxNSwzOS45MTEgMjkuMjg1LDM5LjY1OSAyOS4wODksMzkuNTc2IDI4LjQ3NCwzOS4zMjYgMjguMzYzLDM5LjI5NyBIIDI4LjMzNiBMIDI3LjY2NSwzOS4xMjggMjcuNTI2LDM5LjEgMjYuOTQsMzguOTkgMjYuNzE0LDM4Ljk2MSAyNi4yMTIsMzguOTM0IGggLTAuMzEgLTAuNDQ0IGwgLTAuMzM5LDAuMDI3IGMgLTEuNDUsMC4xMzkgLTIuODc2LDAuNjcxIC00LjExLDEuNTY0IGwgLTAuMjIzLDAuMTQxIC0wLjI3OSwwLjI1IC0wLjMzNSwwLjMwOCAtMC4wNTQsMC4wMjkgLTAuMTcxLDAuMTk0IC0wLjMzNCwwLjM2NCAtMC4yMjQsMC4yNzkgLTAuMjUsMC4zMzYgLTAuMjI1LDAuMzYyIC0wLjE5MiwwLjMwOCAtMC4xOTcsMC40MjEgLTAuMTQyLDAuMjc5IC0wLjE5MywwLjQ3NyAtMC4wODQsMC4yMjIgLTEyLjQ0MSwzOC40MTQgYyAtMC44MTQsMi40NTggLTAuMzEzLDUuMDI5IDEuMTE1LDYuOTg4IHYgMC4wMjYgbCAwLjQxOCwwLjUzMiAwLjE3LDAuMTY1IDAuMjUxLDAuMjgxIDAuMDg0LDAuMDc5IDAuMjgzLDAuMjgxIDAuMjUsMC4xOTQgMC40NzQsMC4zNjcgMC4wODMsMC4wNTMgYyAyLjAxNSwxLjM3MSA0LjY0MSwxLjg3NCA3LjEzMSwxLjA5NCBMIDU1LjIyOCw4MC43NzYgYyA0LjMwMywtMS4zNDIgNi42NzksLTUuODE0IDUuMzA4LC0xMC4wMDYgLTAuMzg3LC0xLjI1OSAtMS4wODYsLTIuMzUgLTEuOTc5LC0zLjIxNSBsIC0wLjM2OCwtMC4zMzcgLTAuMjc4LC0wLjMwMyB6IG0gLTYuMzE4LDUuODk2IDAuMDc5LDAuMTE0IC0zNy4zNjksMTEuNTcgMTEuODU0LC0zNi41MzggMTAuNTY1LDEwLjMxNyAyLjg3NiwyLjgyNSAxMS45OTUsMTEuNzEyIHpcIiAvPjwvZz48cGF0aCAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgaWQ9XCJwYXRoOVwiICAgICBkPVwibSAyNy44MTMyNzMsMTEzLjY1Nzc4IDAuMDk3NTMsLTAuMDIwMSBjIDIuMzkwOTMsLTAuNDU4MjEgNC41OTk0NTUsLTEuOTY4MTEgNS44MDI0NCwtNC4yODYzOSBMIDUyLjc4NTg5Nyw3Mi44OTE0ODcgYyAyLjA4ODA0NCwtNC4wMDIxMzkgMC41OTA5NDksLTguODM2OTAyIC0zLjM0ODY5MiwtMTAuODIxODc1IC0xLjMyOTA3OCwtMC42ODg3MjEgLTIuNzY2NjAzLC0wLjk0MzY5NSAtNC4xMzMxNzQsLTAuODQxNzY4IGwgLTAuNDU0MDE4LC0wLjAyIC0xNi45Mzk2MjEsMC4yMjM5OTcgLTQuMDU1MDc5LDAuMDcyMzIgLTE1LjcxMTM4MywwLjIyMDAyNCAtMC4yODEzMjIsMC4wNDAzNSAtMC40MzI3NTIsLTIuNjFlLTQgLTAuNDE1NjE1LDAuMDYxOTIgLTAuMzc2MDI1LDAuMDU4OTggLTAuNDczNDQsMC4xMjE0NjkgLTAuMjc1NTYsMC4wNzk5MyAtMC41NTAzMDksMC4xOTg3NDggLTAuMTk5MTg4LDAuMDgxMTQgLTAuNTk0NjU1LDAuMjc0NTI4IC0wLjExNDQ0NiwwLjAzOTkgLTAuMDIwNDUsMC4wMjA1NiAtMC41OTMwMywwLjM1MzcyIC0wLjEyMzUyMywwLjA4MzA2IC0wLjQ4NjMwMSwwLjMzNzE3MiAtMC4xNzkyNDMsMC4xMzYyNDIgLTAuMzc1Mjc2LDAuMzQwNDEyIC0wLjIxOTMyNCwwLjIyMDQ5NSAtMC4yOTMzNzIsMC4yOTQ5MzkgLTAuMjM4OTcyLDAuMjc3MTE2IEMgMC45Nzc4MSw2NS44Njk5NTMgMC4zNDc5MzUsNjcuMjU3NTY0IDAuMTExNTMsNjguNzY0MzM2IEwgMC4wNTM1Miw2OS4wMTk3NTcgMC4wNTE3Miw2OS40MTQzMjkgMC4wMTg5NCw2OS44NDk5OTUgMCw2OS45MDg3MzUgbCAwLjAxODM2LDAuMjU1MjE3IDAuMDE4MywwLjQ5OTE3MSAwLjAzOTg0LDAuMzU2OTg0IDAuMDYyNjIsMC40MTM0OTIgMC4wOTY1NiwwLjQxMTk4OCAwLjA4NzIsMC4zNTE5MDggMC4xNTgxNDEsMC40MzY1NzIgMC4wOTgzNywwLjI5ODEzOSAwLjE5NDI5OSwwLjQ3MjUzOCAwLjEwMjQwNywwLjIxODkzMiAxOC40NjI3NzIsMzUuOTA4MDU0IGMgMS4xNzIxNjksMi4zMDg0MiAzLjM0NzU5LDMuNzY4NDcgNS43NDA4MjksNC4xNzcxNyBsIDAuMDE5NzUsLTAuMDE5OSAwLjY5NjA1LDAuMDk1NyAwLjIxODQzNywtMC4wMjI1IDAuNDkwNzkxLDAuMDIxMyAwLjM5ODA5LC0wLjAwNSAwLjMxNTk3MiwtMC4wMzk3IDAuNTk0NDYyLC0wLjA4MTUgelwiIC8+PC9zdmc+Jyxcblx0bG9hZGVyOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAzMiAzMlwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmaWxsPVwiYmxhY2tcIj4gIDxjaXJjbGUgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSg0NSAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuMTI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoOTAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoMTM1IDE2IDE2KVwiIGN4PVwiMTZcIiBjeT1cIjNcIiByPVwiMFwiPiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIHZhbHVlcz1cIjA7MzswOzBcIiBkdXI9XCIxc1wiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiIGJlZ2luPVwiMC4zNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgxODAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgyMjUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjYyNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDI3MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgzMTUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjg3NXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDE4MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT48L3N2Zz4nLFxuXHRxdWVyeTogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDgwIDgwXCIgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDgwIDgwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyBpZD1cIkxheWVyXzFcIj48L2c+PGcgaWQ9XCJMYXllcl8yXCI+XHQ8cGF0aCBkPVwiTTY0LjYyMiwyLjQxMUgxNC45OTVjLTYuNjI3LDAtMTIsNS4zNzMtMTIsMTJ2NDkuODk3YzAsNi42MjcsNS4zNzMsMTIsMTIsMTJoNDkuNjI3YzYuNjI3LDAsMTItNS4zNzMsMTItMTJWMTQuNDExICAgQzc2LjYyMiw3Ljc4Myw3MS4yNDksMi40MTEsNjQuNjIyLDIuNDExeiBNMjQuMTI1LDYzLjkwNlYxNS4wOTNMNjEsMzkuMTY4TDI0LjEyNSw2My45MDZ6XCIvPjwvZz48L3N2Zz4nLFxuXHRxdWVyeUludmFsaWQ6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA3My42MjcgNzMuODk3XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgODAgODBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgICA+PGcgICAgIGlkPVwiTGF5ZXJfMVwiICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoLTIuOTk1LC0yLjQxMSlcIiAvPjxnICAgICBpZD1cIkxheWVyXzJcIiAgICAgdHJhbnNmb3JtPVwidHJhbnNsYXRlKC0yLjk5NSwtMi40MTEpXCI+PHBhdGggICAgICAgZD1cIk0gNjQuNjIyLDIuNDExIEggMTQuOTk1IGMgLTYuNjI3LDAgLTEyLDUuMzczIC0xMiwxMiB2IDQ5Ljg5NyBjIDAsNi42MjcgNS4zNzMsMTIgMTIsMTIgaCA0OS42MjcgYyA2LjYyNywwIDEyLC01LjM3MyAxMiwtMTIgViAxNC40MTEgYyAwLC02LjYyOCAtNS4zNzMsLTEyIC0xMiwtMTIgeiBNIDI0LjEyNSw2My45MDYgViAxNS4wOTMgTCA2MSwzOS4xNjggMjQuMTI1LDYzLjkwNiB6XCIgICAgICAgaWQ9XCJwYXRoNlwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgLz48L2c+PGcgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgwLjc2ODA1NDA4LDAsMCwwLjc2ODA1NDA4LC0wLjkwMjMxOTU0LC0yLjAwNjA4OTUpXCIgICAgIGlkPVwiZzNcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6I2MwMjYwODtmaWxsLW9wYWNpdHk6MVwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgZD1cIm0gODguMTg0LDgxLjQ2OCBjIDEuMTY3LDEuMTY3IDEuMTY3LDMuMDc1IDAsNC4yNDIgbCAtMi40NzUsMi40NzUgYyAtMS4xNjcsMS4xNjcgLTMuMDc2LDEuMTY3IC00LjI0MiwwIGwgLTY5LjY1LC02OS42NSBjIC0xLjE2NywtMS4xNjcgLTEuMTY3LC0zLjA3NiAwLC00LjI0MiBsIDIuNDc2LC0yLjQ3NiBjIDEuMTY3LC0xLjE2NyAzLjA3NiwtMS4xNjcgNC4yNDIsMCBsIDY5LjY0OSw2OS42NTEgelwiICAgICAgIGlkPVwicGF0aDVcIiAvPjwvZz48ZyAgICAgdHJhbnNmb3JtPVwibWF0cml4KDAuNzY4MDU0MDgsMCwwLDAuNzY4MDU0MDgsLTAuOTAyMzE5NTQsLTIuMDA2MDg5NSlcIiAgICAgaWQ9XCJnN1wiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojYzAyNjA4O2ZpbGwtb3BhY2l0eToxXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBkPVwibSAxOC41MzIsODguMTg0IGMgLTEuMTY3LDEuMTY2IC0zLjA3NiwxLjE2NiAtNC4yNDIsMCBsIC0yLjQ3NSwtMi40NzUgYyAtMS4xNjcsLTEuMTY2IC0xLjE2NywtMy4wNzYgMCwtNC4yNDIgbCA2OS42NSwtNjkuNjUxIGMgMS4xNjcsLTEuMTY3IDMuMDc1LC0xLjE2NyA0LjI0MiwwIGwgMi40NzYsMi40NzYgYyAxLjE2NiwxLjE2NyAxLjE2NiwzLjA3NiAwLDQuMjQyIGwgLTY5LjY1MSw2OS42NSB6XCIgICAgICAgaWQ9XCJwYXRoOVwiIC8+PC9nPjwvc3ZnPicsXG5cdGRvd25sb2FkOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGJhc2VQcm9maWxlPVwidGlueVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgaWQ9XCJDYXB0aW9uc1wiPjwvZz48ZyBpZD1cIllvdXJfSWNvblwiPlx0PHBhdGggZmlsbC1ydWxlPVwiZXZlbm9kZFwiIGZpbGw9XCIjMDAwMDAwXCIgZD1cIk04OCw4NHYtMmMwLTIuOTYxLTAuODU5LTQtNC00SDE2Yy0yLjk2MSwwLTQsMC45OC00LDR2MmMwLDMuMTAyLDEuMDM5LDQsNCw0aDY4ICAgQzg3LjAyLDg4LDg4LDg3LjAzOSw4OCw4NHogTTU4LDEySDQyYy01LDAtNiwwLjk0MS02LDZ2MjJIMTZsMzQsMzRsMzQtMzRINjRWMThDNjQsMTIuOTQxLDYyLjkzOSwxMiw1OCwxMnpcIi8+PC9nPjwvc3ZnPicsXG5cdHNoYXJlOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGlkPVwiSWNvbnNcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBzdHlsZT1cImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTAwIDEwMDtcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxwYXRoIGlkPVwiU2hhcmVUaGlzXCIgZD1cIk0zNi43NjQsNTBjMCwwLjMwOC0wLjA3LDAuNTk4LTAuMDg4LDAuOTA1bDMyLjI0NywxNi4xMTljMi43Ni0yLjMzOCw2LjI5My0zLjc5NywxMC4xOTUtMy43OTcgIEM4Ny44OSw2My4yMjgsOTUsNzAuMzM4LDk1LDc5LjEwOUM5NSw4Ny44OSw4Ny44OSw5NSw3OS4xMTgsOTVjLTguNzgsMC0xNS44ODItNy4xMS0xNS44ODItMTUuODkxYzAtMC4zMTYsMC4wNy0wLjU5OCwwLjA4OC0wLjkwNSAgTDMxLjA3Nyw2Mi4wODVjLTIuNzY5LDIuMzI5LTYuMjkzLDMuNzg4LTEwLjE5NSwzLjc4OEMxMi4xMSw2NS44NzMsNSw1OC43NzEsNSw1MGMwLTguNzgsNy4xMS0xNS44OTEsMTUuODgyLTE1Ljg5MSAgYzMuOTAyLDAsNy40MjcsMS40NjgsMTAuMTk1LDMuNzk3bDMyLjI0Ny0xNi4xMTljLTAuMDE4LTAuMzA4LTAuMDg4LTAuNTk4LTAuMDg4LTAuOTE0QzYzLjIzNiwxMi4xMSw3MC4zMzgsNSw3OS4xMTgsNSAgQzg3Ljg5LDUsOTUsMTIuMTEsOTUsMjAuODczYzAsOC43OC03LjExLDE1Ljg5MS0xNS44ODIsMTUuODkxYy0zLjkxMSwwLTcuNDM2LTEuNDY4LTEwLjE5NS0zLjgwNkwzNi42NzYsNDkuMDg2ICBDMzYuNjkzLDQ5LjM5NCwzNi43NjQsNDkuNjg0LDM2Ljc2NCw1MHpcIi8+PC9zdmc+Jyxcblx0ZHJhdzogZnVuY3Rpb24ocGFyZW50LCBjb25maWcpIHtcblx0XHRpZiAoIXBhcmVudCkgcmV0dXJuO1xuXHRcdHZhciBlbCA9IHJvb3QuZ2V0RWxlbWVudChjb25maWcpO1xuXHRcdGlmIChlbCkge1xuXHRcdFx0JChwYXJlbnQpLmFwcGVuZChlbCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRFbGVtZW50OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHR2YXIgc3ZnU3RyaW5nID0gKGNvbmZpZy5pZD8gcm9vdFtjb25maWcuaWRdOiBjb25maWcudmFsdWUpO1xuXHRcdGlmIChzdmdTdHJpbmcgJiYgc3ZnU3RyaW5nLmluZGV4T2YoXCI8c3ZnXCIpID09IDApIHtcblx0XHRcdGlmICghY29uZmlnLndpZHRoKSBjb25maWcud2lkdGggPSBcIjEwMCVcIjtcblx0XHRcdGlmICghY29uZmlnLmhlaWdodCkgY29uZmlnLmhlaWdodCA9IFwiMTAwJVwiO1xuXHRcdFx0XG5cdFx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0dmFyIGRvbSA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoc3ZnU3RyaW5nLCBcInRleHQveG1sXCIpO1xuXHRcdFx0dmFyIHN2ZyA9IGRvbS5kb2N1bWVudEVsZW1lbnQ7XG5cdFx0XHRcblx0XHRcdHZhciBzdmdDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLndpZHRoID0gY29uZmlnLndpZHRoO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGNvbmZpZy5oZWlnaHQ7XG5cdFx0XHRzdmdDb250YWluZXIuYXBwZW5kQ2hpbGQoc3ZnKTtcblx0XHRcdHJldHVybiBzdmdDb250YWluZXI7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTsiLCJ3aW5kb3cuY29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHtcImxvZ1wiOmZ1bmN0aW9uKCl7fX07Ly9tYWtlIHN1cmUgYW55IGNvbnNvbGUgc3RhdGVtZW50cyBkb24ndCBicmVhayBJRVxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHN0b3JhZ2U6IHJlcXVpcmUoXCIuL3N0b3JhZ2UuanNcIiksXG5cdGRldGVybWluZUlkOiByZXF1aXJlKFwiLi9kZXRlcm1pbmVJZC5qc1wiKSxcblx0aW1nczogcmVxdWlyZShcIi4vaW1ncy5qc1wiKSxcblx0dmVyc2lvbjoge1xuXHRcdFwieWFzZ3VpLXV0aWxzXCIgOiByZXF1aXJlKFwiLi4vcGFja2FnZS5qc29uXCIpLnZlcnNpb24sXG5cdH1cbn07XG4iLCJ2YXIgc3RvcmUgPSByZXF1aXJlKFwic3RvcmVcIik7XG52YXIgdGltZXMgPSB7XG5cdGRheTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIDEwMDAgKiAzNjAwICogMjQ7Ly9taWxsaXMgdG8gZGF5XG5cdH0sXG5cdG1vbnRoOiBmdW5jdGlvbigpIHtcblx0XHR0aW1lcy5kYXkoKSAqIDMwO1xuXHR9LFxuXHR5ZWFyOiBmdW5jdGlvbigpIHtcblx0XHR0aW1lcy5tb250aCgpICogMTI7XG5cdH1cbn07XG5cbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNldCA6IGZ1bmN0aW9uKGtleSwgdmFsLCBleHApIHtcblx0XHRpZiAodHlwZW9mIGV4cCA9PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRleHAgPSB0aW1lc1tleHBdKCk7XG5cdFx0fVxuXHRcdHN0b3JlLnNldChrZXksIHtcblx0XHRcdHZhbCA6IHZhbCxcblx0XHRcdGV4cCA6IGV4cCxcblx0XHRcdHRpbWUgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXHRcdH0pO1xuXHR9LFxuXHRnZXQgOiBmdW5jdGlvbihrZXkpIHtcblx0XHR2YXIgaW5mbyA9IHN0b3JlLmdldChrZXkpO1xuXHRcdGlmICghaW5mbykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGlmIChpbmZvLmV4cCAmJiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGluZm8udGltZSA+IGluZm8uZXhwKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0cmV0dXJuIGluZm8udmFsO1xuXHR9XG5cbn07IiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJ5YXNndWkteWFzcWVcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIllldCBBbm90aGVyIFNQQVJRTCBRdWVyeSBFZGl0b3JcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMS41LjFcIixcbiAgXCJtYWluXCI6IFwic3JjL21haW4uanNcIixcbiAgXCJsaWNlbnNlc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwiTUlUXCIsXG4gICAgICBcInVybFwiOiBcImh0dHA6Ly95YXNxZS55YXNndWkub3JnL2xpY2Vuc2UudHh0XCJcbiAgICB9XG4gIF0sXG4gIFwiYXV0aG9yXCI6IFwiTGF1cmVucyBSaWV0dmVsZFwiLFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cDovL3lhc3FlLnlhc2d1aS5vcmdcIixcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYnJvd3NlcmlmeVwiOiBcIl42LjEuMFwiLFxuICAgIFwiZ3VscFwiOiBcIn4zLjYuMFwiLFxuICAgIFwiZ3VscC1idW1wXCI6IFwiXjAuMS4xMVwiLFxuICAgIFwiZ3VscC1jb25jYXRcIjogXCJeMi40LjFcIixcbiAgICBcImd1bHAtY29ubmVjdFwiOiBcIl4yLjAuNVwiLFxuICAgIFwiZ3VscC1lbWJlZGxyXCI6IFwiXjAuNS4yXCIsXG4gICAgXCJndWxwLWZpbHRlclwiOiBcIl4xLjAuMlwiLFxuICAgIFwiZ3VscC1naXRcIjogXCJeMC41LjJcIixcbiAgICBcImd1bHAtanN2YWxpZGF0ZVwiOiBcIl4wLjIuMFwiLFxuICAgIFwiZ3VscC1saXZlcmVsb2FkXCI6IFwiXjEuMy4xXCIsXG4gICAgXCJndWxwLW1pbmlmeS1jc3NcIjogXCJeMC4zLjBcIixcbiAgICBcImd1bHAtbm90aWZ5XCI6IFwiXjEuMi41XCIsXG4gICAgXCJndWxwLXJlbmFtZVwiOiBcIl4xLjIuMFwiLFxuICAgIFwiZ3VscC1zdHJlYW1pZnlcIjogXCIwLjAuNVwiLFxuICAgIFwiZ3VscC10YWctdmVyc2lvblwiOiBcIl4xLjEuMFwiLFxuICAgIFwiZ3VscC11Z2xpZnlcIjogXCJeMC4yLjFcIixcbiAgICBcInJlcXVpcmUtZGlyXCI6IFwiXjAuMS4wXCIsXG4gICAgXCJydW4tc2VxdWVuY2VcIjogXCJeMS4wLjFcIixcbiAgICBcInZpbnlsLWJ1ZmZlclwiOiBcIjAuMC4wXCIsXG4gICAgXCJ2aW55bC1zb3VyY2Utc3RyZWFtXCI6IFwifjAuMS4xXCIsXG4gICAgXCJ3YXRjaGlmeVwiOiBcIl4wLjYuNFwiLFxuICAgIFwiYnJvd3NlcmlmeS1zaGltXCI6IFwiXjMuOC4wXCJcbiAgfSxcbiAgXCJidWdzXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9ZQVNRRS9pc3N1ZXMvXCIsXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwiSmF2YVNjcmlwdFwiLFxuICAgIFwiU1BBUlFMXCIsXG4gICAgXCJFZGl0b3JcIixcbiAgICBcIlNlbWFudGljIFdlYlwiLFxuICAgIFwiTGlua2VkIERhdGFcIlxuICBdLFxuICBcIm1haW50YWluZXJzXCI6IFtcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJMYXVyZW5zIFJpZXR2ZWxkXCIsXG4gICAgICBcImVtYWlsXCI6IFwibGF1cmVucy5yaWV0dmVsZEBnbWFpbC5jb21cIixcbiAgICAgIFwid2ViXCI6IFwiaHR0cDovL2xhdXJlbnNyaWV0dmVsZC5ubFwiXG4gICAgfVxuICBdLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9ZQVNRRS5naXRcIlxuICB9LFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJqcXVlcnlcIjogXCJ+IDEuMTEuMFwiLFxuICAgIFwiY29kZW1pcnJvclwiOiBcIl40LjIuMFwiLFxuICAgIFwidHdpdHRlci1ib290c3RyYXAtMy4wLjBcIjogXCJeMy4wLjBcIixcbiAgICBcInlhc2d1aS11dGlsc1wiOiBcIl4xLjMuMFwiXG4gIH0sXG4gIFwiYnJvd3NlcmlmeS1zaGltXCI6IHtcbiAgICBcImpxdWVyeVwiOiBcImdsb2JhbDpqUXVlcnlcIixcbiAgICBcImNvZGVtaXJyb3JcIjogXCJnbG9iYWw6Q29kZU1pcnJvclwiLFxuICAgIFwiLi4vLi4vbGliL2NvZGVtaXJyb3JcIjogXCJnbG9iYWw6Q29kZU1pcnJvclwiXG4gIH1cbn1cbiJdfQ==
