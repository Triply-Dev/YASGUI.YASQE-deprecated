'use strict';
//make sure any console statements
window.console = window.console || {
	"log": function() {}
};

/**
 * Load libraries
 */
var $ = require("jquery"),
	CodeMirror = require("codemirror"),
	utils = require('./utils.js'),
	yutils = require('yasgui-utils'),
	imgs = require('./imgs.js');

require("../lib/deparam.js");
require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/fold/brace-fold.js');
require('./prefixFold.js');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/search/searchcursor.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/runmode/runmode.js');
require('codemirror/addon/display/fullscreen.js');
require('../lib/grammar/tokenizer.js');



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
	var rootEl = $("<div>", {
		class: 'yasqe'
	}).appendTo($(parent));
	config = extendConfig(config);
	var yasqe = extendCmInstance(CodeMirror(rootEl[0], config));
	postProcessCmElement(yasqe);
	return yasqe;
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
var extendCmInstance = function(yasqe) {
	//instantiate autocompleters
	yasqe.autocompleters = require('./autocompleters/autocompleterBase.js')(root, yasqe);
	if (yasqe.options.autocompleters) {
		yasqe.options.autocompleters.forEach(function(name) {
			if (root.Autocompleters[name]) yasqe.autocompleters.init(name, root.Autocompleters[name]);
		})
	}
	yasqe.lastQueryDuration = null;
	yasqe.getCompleteToken = function(token, cur) {
		return require('./tokenUtils.js').getCompleteToken(yasqe, token, cur);
	};
	yasqe.getPreviousNonWsToken = function(line, token) {
		return require('./tokenUtils.js').getPreviousNonWsToken(yasqe, line, token);
	};
	yasqe.getNextNonWsToken = function(lineNumber, charNumber) {
		return require('./tokenUtils.js').getNextNonWsToken(yasqe, lineNumber, charNumber);
	};
	yasqe.collapsePrefixes = function(collapse) {
		yasqe.foldCode(require('./prefixFold.js').findFirstPrefixLine(yasqe), YASQE.fold.prefix, (collapse ? "fold" : "unfold"));
	};
	var backdrop = null;
	var animateSpeed = null;
	yasqe.setBackdrop = function(show) {


		if (yasqe.options.backdrop || yasqe.options.backdrop === 0 || yasqe.options.backdrop === '0') {
			if (animateSpeed === null) {
				animateSpeed = +yasqe.options.backdrop;
				if (animateSpeed === 1) {
					//ah, yasqe.options.backdrop was 'true'. Set this to default animate speed 400
					animateSpeed = 400;
				}
			}


			if (!backdrop) {
				backdrop = $('<div>', {
						class: 'backdrop'
					})
					.click(function() {
						$(this).hide();
					})
					.insertAfter($(yasqe.getWrapperElement()));
			}
			if (show) {
				backdrop.show(animateSpeed);
			} else {
				backdrop.hide(animateSpeed);
			}
		}
	};
	/**
	 * Execute query. Pass a callback function, or a configuration object (see
	 * default settings below for possible values) I.e., you can change the
	 * query configuration by either changing the default settings, changing the
	 * settings of this document, or by passing query settings to this function
	 *
	 * @method doc.query
	 * @param function|object
	 */
	yasqe.query = function(callbackOrConfig) {
		root.executeQuery(yasqe, callbackOrConfig);
	};

	yasqe.getUrlArguments = function(config) {
		return root.getUrlArguments(yasqe, config);
	};

	/**
	 * Fetch defined prefixes from query string
	 *
	 * @method doc.getPrefixesFromQuery
	 * @return object
	 */
	yasqe.getPrefixesFromQuery = function() {
		return require('./prefixUtils.js').getPrefixesFromQuery(yasqe);
	};

	yasqe.addPrefixes = function(prefixes) {
		return require('./prefixUtils.js').addPrefixes(yasqe, prefixes);
	};
	yasqe.removePrefixes = function(prefixes) {
		return require('./prefixUtils.js').removePrefixes(yasqe, prefixes);
	};

	yasqe.getValueWithoutComments = function() {
		var cleanedQuery = "";
		root.runMode(yasqe.getValue(), "sparql11", function(stringVal, className) {
			if (className != "comment") {
				cleanedQuery += stringVal;
			}
		});
		return cleanedQuery;
	};
	/**
	 * Fetch the query type (e.g., SELECT||DESCRIBE||INSERT||DELETE||ASK||CONSTRUCT)
	 *
	 * @method doc.getQueryType
	 * @return string
	 *
	 */
	yasqe.getQueryType = function() {
		return yasqe.queryType;
	};
	/**
	 * Fetch the query mode: 'query' or 'update'
	 *
	 * @method doc.getQueryMode
	 * @return string
	 *
	 */
	yasqe.getQueryMode = function() {
		var type = yasqe.getQueryType();
		if (type == "INSERT" || type == "DELETE" || type == "LOAD" || type == "CLEAR" || type == "CREATE" || type == "DROP" || type == "COPY" || type == "MOVE" || type == "ADD") {
			return "update";
		} else {
			return "query";
		}

	};

	yasqe.setCheckSyntaxErrors = function(isEnabled) {
		yasqe.options.syntaxErrorCheck = isEnabled;
		checkSyntax(yasqe);
	};

	yasqe.enableCompleter = function(name) {
		addCompleterToSettings(yasqe.options, name);
		if (root.Autocompleters[name]) yasqe.autocompleters.init(name, root.Autocompleters[name]);
	};
	yasqe.disableCompleter = function(name) {
		removeCompleterFromSettings(yasqe.options, name);
	};
	return yasqe;
};

var addCompleterToSettings = function(settings, name) {
	if (!settings.autocompleters) settings.autocompleters = [];
	settings.autocompleters.push(name);
};
var removeCompleterFromSettings = function(settings, name) {
	if (typeof settings.autocompleters == "object") {
		var index = $.inArray(name, settings.autocompleters);
		if (index >= 0) {
			settings.autocompleters.splice(index, 1);
			removeCompleterFromSettings(settings, name); //just in case. suppose 1 completer is listed twice
		}
	}
};
var postProcessCmElement = function(yasqe) {
	/**
	 * Set doc value
	 */
	var storageId = utils.getPersistencyId(yasqe, yasqe.options.persistent);
	if (storageId) {
		var valueFromStorage = yutils.storage.get(storageId);
		if (valueFromStorage)
			yasqe.setValue(valueFromStorage);
	}

	root.drawButtons(yasqe);

	/**
	 * Add event handlers
	 */
	yasqe.on('blur', function(yasqe, eventInfo) {
		root.storeQuery(yasqe);
	});
	yasqe.on('change', function(yasqe, eventInfo) {
		checkSyntax(yasqe);
		root.updateQueryButton(yasqe);
		root.positionButtons(yasqe);
	});
	yasqe.on('changes', function() {
		//e.g. on paste
		checkSyntax(yasqe);
		root.updateQueryButton(yasqe);
		root.positionButtons(yasqe);
	});

	yasqe.on('cursorActivity', function(yasqe, eventInfo) {
		updateButtonsTransparency(yasqe);
	});
	yasqe.prevQueryValid = false;
	checkSyntax(yasqe); // on first load, check as well (our stored or default query might be incorrect)
	root.positionButtons(yasqe);

	$(yasqe.getWrapperElement()).on('mouseenter', '.cm-atom', function() {
		var matchText = $(this).text();
		$(yasqe.getWrapperElement()).find('.cm-atom').filter(function() {
			return $(this).text() === matchText;
		}).addClass('matchingVar');
	}).on('mouseleave', '.cm-atom', function() {
		$(yasqe.getWrapperElement()).find('.matchingVar').removeClass('matchingVar');
	});
	/**
	 * check url args and modify yasqe settings if needed
	 */
	if (yasqe.options.consumeShareLink) {
		yasqe.options.consumeShareLink(yasqe, getUrlParams());
		//and: add a hash listener!
		window.addEventListener("hashchange", function() {
			yasqe.options.consumeShareLink(yasqe, getUrlParams());
		});
	}
	if (yasqe.options.collapsePrefixesOnLoad) yasqe.collapsePrefixes(true);
};

/**
 * get url params. first try fetching using hash. If it fails, try the regular query parameters (for backwards compatability)
 */
var getUrlParams = function() {
	//first try hash
	var urlParams = null;
	if (window.location.hash.length > 1) {
		//firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
		//Don't want this. So simply get the hash string ourselves
		urlParams = $.deparam(location.href.split("#")[1])
	}
	if ((!urlParams || !('query' in urlParams)) && window.location.search.length > 1) {
		//ok, then just try regular url params
		urlParams = $.deparam(window.location.search.substring(1));
	}
	return urlParams;
};



/**
 * Update transparency of buttons. Increase transparency when cursor is below buttons
 */

var updateButtonsTransparency = function(yasqe) {
	yasqe.cursor = $(".CodeMirror-cursor");
	if (yasqe.buttons && yasqe.buttons.is(":visible") && yasqe.cursor.length > 0) {
		if (utils.elementsOverlap(yasqe.cursor, yasqe.buttons)) {
			yasqe.buttons.find("svg").attr("opacity", "0.2");
		} else {
			yasqe.buttons.find("svg").attr("opacity", "1.0");
		}
	}
};









var clearError = null;
var checkSyntax = function(yasqe, deepcheck) {

	yasqe.queryValid = true;

	yasqe.clearGutter("gutterErrorBar");

	var state = null;
	for (var l = 0; l < yasqe.lineCount(); ++l) {
		var precise = false;
		if (!yasqe.prevQueryValid) {
			// we don't want cached information in this case, otherwise the
			// previous error sign might still show up,
			// even though the syntax error might be gone already
			precise = true;
		}

		var token = yasqe.getTokenAt({
			line: l,
			ch: yasqe.getLine(l).length
		}, precise);
		var state = token.state;
		yasqe.queryType = state.queryType;
		if (state.OK == false) {
			if (!yasqe.options.syntaxErrorCheck) {
				//the library we use already marks everything as being an error. Overwrite this class attribute.
				$(yasqe.getWrapperElement).find(".sp-error").css("color", "black");
				//we don't want to gutter error, so return
				return;
			}

			var warningEl = yutils.svg.getElement(imgs.warning);
			if (state.possibleCurrent && state.possibleCurrent.length > 0) {
				//				warningEl.style.zIndex = "99999999";
				require('./tooltip')(yasqe, warningEl, function() {
					var expectedEncoded = [];
					state.possibleCurrent.forEach(function(expected) {
						expectedEncoded.push("<strong style='text-decoration:underline'>" + $("<div/>").text(expected).html() + "</strong>");
					});
					return "This line is invalid. Expected: " + expectedEncoded.join(", ");
				});
			}
			warningEl.style.marginTop = "2px";
			warningEl.style.marginLeft = "2px";
			warningEl.className = 'parseErrorIcon';
			yasqe.setGutterMarker(l, "gutterErrorBar", warningEl);

			yasqe.queryValid = false;
			break;
		}
	}
	yasqe.prevQueryValid = yasqe.queryValid;
	if (deepcheck) {
		if (state != null && state.stack != undefined) {
			var stack = state.stack,
				len = state.stack.length;
			// Because incremental parser doesn't receive end-of-input
			// it can't clear stack, so we have to check that whatever
			// is left on the stack is nillable
			if (len > 1)
				yasqe.queryValid = false;
			else if (len == 1) {
				if (stack[0] != "solutionModifier" && stack[0] != "?limitOffsetClauses" && stack[0] != "?offsetClause")
					yasqe.queryValid = false;
			}
		}
	}
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the YASQE object
$.extend(root, CodeMirror);


//add registrar for autocompleters
root.Autocompleters = {};
root.registerAutocompleter = function(name, constructor) {
	root.Autocompleters[name] = constructor;
	addCompleterToSettings(root.defaults, name);
}

root.autoComplete = function(yasqe) {
	//this function gets called when pressing the keyboard shortcut. I.e., autoShow = false
	yasqe.autocompleters.autoComplete(false);
};
//include the autocompleters we provide out-of-the-box
root.registerAutocompleter("prefixes", require("./autocompleters/prefixes.js"));
root.registerAutocompleter("properties", require("./autocompleters/properties.js"));
root.registerAutocompleter("classes", require("./autocompleters/classes.js"));
root.registerAutocompleter("variables", require("./autocompleters/variables.js"));


root.positionButtons = function(yasqe) {
	var scrollBar = $(yasqe.getWrapperElement()).find(".CodeMirror-vscrollbar");
	var offset = 0;
	if (scrollBar.is(":visible")) {
		offset = scrollBar.outerWidth();
	}
	if (yasqe.buttons.is(":visible")) yasqe.buttons.css("right", offset + 4);
};

/**
 * Create a share link
 *
 * @method YASQE.createShareLink
 * @param {doc} YASQE document
 * @default {query: doc.getValue()}
 * @return object
 */
root.createShareLink = function(yasqe) {
	//extend existing link, so first fetch current arguments
	var urlParams = {};
	if (window.location.hash.length > 1) urlParams = $.deparam(window.location.hash.substring(1));
	urlParams['query'] = yasqe.getValue();
	return urlParams;
};
root.getAsCurl = function(yasqe, ajaxConfig) {
	var curl = require('./curl.js');
	return curl.createCurlString(yasqe, ajaxConfig);
};
/**
 * Consume the share link, by parsing the document URL for possible yasqe arguments, and setting the appropriate values in the YASQE doc
 *
 * @method YASQE.consumeShareLink
 * @param {doc} YASQE document
 */
root.consumeShareLink = function(yasqe, urlParams) {
	if (urlParams && urlParams.query) {
		yasqe.setValue(urlParams.query);
	}
};
root.drawButtons = function(yasqe) {
	yasqe.buttons = $("<div class='yasqe_buttons'></div>").appendTo($(yasqe.getWrapperElement()));

	/**
	 * draw share link button
	 */
	if (yasqe.options.createShareLink) {

		var svgShare = $(yutils.svg.getElement(imgs.share));
		svgShare.click(function(event) {
				event.stopPropagation();
				var popup = $("<div class='yasqe_sharePopup'></div>").appendTo(yasqe.buttons);
				$('html').click(function() {
					if (popup) popup.remove();
				});

				popup.click(function(event) {
					event.stopPropagation();
				});
				var $input = $("<input>").val(location.protocol + '//' + location.host + location.pathname + location.search + "#" + $.param(yasqe.options.createShareLink(yasqe)));

				$input.focus(function() {
					var $this = $(this);
					$this.select();

					// Work around Chrome's little problem
					$this.mouseup(function() {
						// Prevent further mouseup intervention
						$this.unbind("mouseup");
						return false;
					});
				});

				popup.empty().append($('<div>', {class:'inputWrapper'}).append($input));
				if (yasqe.options.createShortLink) {
					popup.addClass('enableShort');
					$('<button>Shorten</button>')
						.addClass('yasqe_btn yasqe_btn-sm yasqe_btn-primary')
						.click(function() {
							$(this).parent().find('button').attr('disabled', 'disabled');
							yasqe.options.createShortLink($input.val(), function(errString, shortLink) {
								if (errString) {
									$input.remove();
									popup.find('.inputWrapper').append($('<span>', {class:"shortlinkErr"}).text(errString));
								} else {
									$input.val(shortLink).focus();
								}
							})
						}).appendTo(popup);
				}
				$('<button>CURL</button>')
					.addClass('yasqe_btn yasqe_btn-sm yasqe_btn-primary')
					.click(function() {

						$(this).parent().find('button').attr('disabled', 'disabled');
						$input.val(root.getAsCurl(yasqe)).focus();
					}).appendTo(popup);
				var positions = svgShare.position();
				popup.css("top", (positions.top + svgShare.outerHeight() + parseInt(popup.css('padding-top')) ) + "px").css("left", ((positions.left + svgShare.outerWidth()) - popup.outerWidth()) + "px");
				$input.focus();
			})
			.addClass("yasqe_share")
			.attr("title", "Share your query")
			.appendTo(yasqe.buttons);

	}


	/**
	 * draw fullscreen button
	 */

	var toggleFullscreen = $('<div>', {
			class: 'fullscreenToggleBtns'
		})
		.append($(yutils.svg.getElement(imgs.fullscreen))
			.addClass("yasqe_fullscreenBtn")
			.attr("title", "Set editor full screen")
			.click(function() {
				yasqe.setOption("fullScreen", true);
			}))
		.append($(yutils.svg.getElement(imgs.smallscreen))
			.addClass("yasqe_smallscreenBtn")
			.attr("title", "Set editor to normale size")
			.click(function() {
				yasqe.setOption("fullScreen", false);
			}))
	yasqe.buttons.append(toggleFullscreen);


	if (yasqe.options.sparql.showQueryButton) {
		$("<div>", {
				class: 'yasqe_queryButton'
			})
			.click(function() {
				if ($(this).hasClass("query_busy")) {
					if (yasqe.xhr) yasqe.xhr.abort();
					root.updateQueryButton(yasqe);
				} else {
					yasqe.query();
				}
			})
			.appendTo(yasqe.buttons);
		root.updateQueryButton(yasqe);
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
root.updateQueryButton = function(yasqe, status) {
	var queryButton = $(yasqe.getWrapperElement()).find(".yasqe_queryButton");
	if (queryButton.length == 0) return; //no query button drawn

	//detect status
	if (!status) {
		status = "valid";
		if (yasqe.queryValid === false) status = "error";
	}

	if (status != yasqe.queryStatus) {
		queryButton
			.empty()
			.removeClass(function(index, classNames) {
				return classNames.split(" ").filter(function(c) {
					//remove classname from previous status
					return c.indexOf("query_") == 0;
				}).join(" ");
			});

		if (status == "busy") {
			queryButton.append($('<div>', {
				class: 'loader',
			}));
			yasqe.queryStatus = status;
		} else if (status == "valid" || status == "error") {
			queryButton.addClass("query_" + status);
			yutils.svg.draw(queryButton, imgs[queryButtonIds[status]]);
			yasqe.queryStatus = status;
		}
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
	//add yasqe div as parent (needed for styles to be manageable and scoped).
	//In this case, I -also- put it as parent el of the text area. This is wrapped in a div now
	var rootEl = $("<div>", {
		class: 'yasqe'
	}).insertBefore($(textAreaEl)).append($(textAreaEl));
	var yasqe = extendCmInstance(CodeMirror.fromTextArea(textAreaEl, config));
	postProcessCmElement(yasqe);
	return yasqe;
};


root.storeQuery = function(yasqe) {
	var storageId = utils.getPersistencyId(yasqe, yasqe.options.persistent);
	if (storageId) {
		yutils.storage.set(storageId, yasqe.getValue(), "month");
	}
};
root.commentLines = function(yasqe) {
	var startLine = yasqe.getCursor(true).line;
	var endLine = yasqe.getCursor(false).line;
	var min = Math.min(startLine, endLine);
	var max = Math.max(startLine, endLine);

	// if all lines start with #, remove this char. Otherwise add this char
	var linesAreCommented = true;
	for (var i = min; i <= max; i++) {
		var line = yasqe.getLine(i);
		if (line.length == 0 || line.substring(0, 1) != "#") {
			linesAreCommented = false;
			break;
		}
	}
	for (var i = min; i <= max; i++) {
		if (linesAreCommented) {
			// lines are commented, so remove comments
			yasqe.replaceRange("", {
				line: i,
				ch: 0
			}, {
				line: i,
				ch: 1
			});
		} else {
			// Not all lines are commented, so add comments
			yasqe.replaceRange("#", {
				line: i,
				ch: 0
			});
		}

	}
};

root.copyLineUp = function(yasqe) {
	var cursor = yasqe.getCursor();
	var lineCount = yasqe.lineCount();
	// First create new empty line at end of text
	yasqe.replaceRange("\n", {
		line: lineCount - 1,
		ch: yasqe.getLine(lineCount - 1).length
	});
	// Copy all lines to their next line
	for (var i = lineCount; i > cursor.line; i--) {
		var line = yasqe.getLine(i - 1);
		yasqe.replaceRange(line, {
			line: i,
			ch: 0
		}, {
			line: i,
			ch: yasqe.getLine(i).length
		});
	}
};
root.copyLineDown = function(yasqe) {
	root.copyLineUp(yasqe);
	// Make sure cursor goes one down (we are copying downwards)
	var cursor = yasqe.getCursor();
	cursor.line++;
	yasqe.setCursor(cursor);
};
root.doAutoFormat = function(yasqe) {
	if (yasqe.somethingSelected()) {
		var to = {
			line: yasqe.getCursor(false).line,
			ch: yasqe.getSelection().length
		};
		autoFormatRange(yasqe, yasqe.getCursor(true), to);
	} else {
		var totalLines = yasqe.lineCount();
		var totalChars = yasqe.getTextArea().value.length;
		autoFormatRange(yasqe, {
			line: 0,
			ch: 0
		}, {
			line: totalLines,
			ch: totalChars
		});
	}

};


var autoFormatRange = function(yasqe, from, to) {
	var absStart = yasqe.indexFromPos(from);
	var absEnd = yasqe.indexFromPos(to);
	// Insert additional line breaks where necessary according to the
	// mode's syntax
	var res = autoFormatLineBreaks(yasqe.getValue(), absStart, absEnd);

	// Replace and auto-indent the range
	yasqe.operation(function() {
		yasqe.replaceRange(res, from, to);
		var startLine = yasqe.posFromIndex(absStart).line;
		var endLine = yasqe.posFromIndex(absStart + res.length).line;
		for (var i = startLine; i <= endLine; i++) {
			yasqe.indentLine(i, "smart");
		}
	});
};

var autoFormatLineBreaks = function(text, start, end) {
	text = text.substring(start, end);
	var breakAfterArray = [
		["keyword", "ws", "prefixed", "ws", "uri"], // i.e. prefix declaration
		["keyword", "ws", "uri"] // i.e. base
	];
	var breakAfterCharacters = ["{", ".", ";"];
	var breakBeforeCharacters = ["}"];
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
			} else { // (-1)
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

require('./sparql.js'),
	require('./defaults.js');
root.$ = $;
root.version = {
	"CodeMirror": CodeMirror.version,
	"YASQE": require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": yutils.version
};
