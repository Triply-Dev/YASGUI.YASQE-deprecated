"use strict";
//make sure any console statements
window.console = window.console || {
  log: function() {}
};

/**
 * Load libraries
 */
var $ = require("jquery"),
  CodeMirror = require("codemirror"),
  utils = require("./utils.js"),
  yutils = require("yasgui-utils"),
  imgs = require("./imgs.js");

require("../lib/deparam.js");
require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");
require("./prefixFold.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/search/searchcursor.js");
require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/runmode/runmode.js");
require("codemirror/addon/display/fullscreen.js");
require("../lib/grammar/tokenizer.js");

/**
 * Main YASHE constructor. Pass a DOM element as argument to append the editor to, and (optionally) pass along config settings (see the YASHE.defaults object below, as well as the regular CodeMirror documentation, for more information on configurability)
 *
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASHE
 * @return {doc} YASHE document
 */
var root = (module.exports = function(parent, config) {
  var rootEl = $("<div>", {
    class: "yashe"
  }).appendTo($(parent));
  config = extendConfig(config);
  var yashe = extendCmInstance(CodeMirror(rootEl[0], config));
  postProcessCmElement(yashe);
  return yashe;
});

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
var extendCmInstance = function(yashe) {
  //instantiate autocompleters
  yashe.autocompleters = require("./autocompleters/autocompleterBase.js")(root, yashe);
  if (yashe.options.autocompleters) {
    yashe.options.autocompleters.forEach(function(name) {
      if (root.Autocompleters[name]) yashe.autocompleters.init(name, root.Autocompleters[name]);
    });
  }
  yashe.emit = function(event, data) {
    root.signal(yashe, event, data)
  }
  yashe.lastQueryDuration = null;
  yashe.getCompleteToken = function(token, cur) {
    return require("./tokenUtils.js").getCompleteToken(yashe, token, cur);
  };
  yashe.getPreviousNonWsToken = function(line, token) {
    return require("./tokenUtils.js").getPreviousNonWsToken(yashe, line, token);
  };
  yashe.getNextNonWsToken = function(lineNumber, charNumber) {
    return require("./tokenUtils.js").getNextNonWsToken(yashe, lineNumber, charNumber);
  };
  yashe.collapsePrefixes = function(collapse) {
    if (collapse === undefined) collapse = true;
    yashe.foldCode(
      require("./prefixFold.js").findFirstPrefixLine(yashe),
      root.fold.prefix,
      collapse ? "fold" : "unfold"
    );
  };
  var backdrop = null;
  var animateSpeed = null;
  yashe.setBackdrop = function(show) {
    if (yashe.options.backdrop || yashe.options.backdrop === 0 || yashe.options.backdrop === "0") {
      if (animateSpeed === null) {
        animateSpeed = +yashe.options.backdrop;
        if (animateSpeed === 1) {
          //ah, yashe.options.backdrop was 'true'. Set this to default animate speed 400
          animateSpeed = 400;
        }
      }

      if (!backdrop) {
        backdrop = $("<div>", {
          class: "backdrop"
        })
          .click(function() {
            $(this).hide();
          })
          .insertAfter($(yashe.getWrapperElement()));
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
  yashe.query = function(callbackOrConfig) {
    root.executeQuery(yashe, callbackOrConfig);
  };

  yashe.getUrlArguments = function(config) {
    return root.getUrlArguments(yashe, config);
  };

  /**
	 * Fetch defined prefixes from query string
	 *
	 * @method doc.getPrefixesFromQuery
	 * @return object
	 */
  yashe.getPrefixesFromQuery = function() {
    return require("./prefixUtils.js").getPrefixesFromQuery(yashe);
  };

  yashe.addPrefixes = function(prefixes) {
    return require("./prefixUtils.js").addPrefixes(yashe, prefixes);
  };
  yashe.removePrefixes = function(prefixes) {
    return require("./prefixUtils.js").removePrefixes(yashe, prefixes);
  };
  yashe.getVariablesFromQuery = function() {
    //Use precise here. We want to be sure we use the most up to date state. If we're
    //not, we might get outdated info from the current query (creating loops such
    //as https://github.com/OpenTriply/YASGUI/issues/84)
    //on caveat: this function won't work when query is invalid (i.e. when typing)
    return $.map(yashe.getTokenAt({ line: yashe.lastLine(), ch: yashe.getLine(yashe.lastLine()).length }, true).state.variables, function(val,key) {return key});
  }
  //values in the form of {?var: 'value'}, or [{?var: 'value'}]
  yashe.getQueryWithValues = function(values) {
    if (!values) return yashe.getValue();
    var injectString;
    if (typeof values === 'string') {
      injectString = values;
    } else {
      //start building inject string
      if (!Array.isArray(values)) values = [values];
      var variables = values.reduce(function(vars, valueObj) {
        for (var v in valueObj) {
          vars[v] = v;
        }
        return vars;
      }, {})
      var varArray = [];
      for (var v in variables) {
        varArray.push(v);
      }

      if (!varArray.length) return yashe.getValue() ;
      //ok, we've got enough info to start building the string now
      injectString = "VALUES (" + varArray.join(' ') + ") {\n";
      values.forEach(function(valueObj) {
        injectString += "( ";
        varArray.forEach(function(variable) {
          injectString += valueObj[variable] || "UNDEF"
        })
        injectString += " )\n"
      })
      injectString += "}\n"
    }
    if (!injectString) return yashe.getValue();

    var newQuery = ""
    var injected = false;
    var gotSelect = false;
    root.runMode(yashe.getValue(), "sparql11", function(stringVal, className, row, col, state) {
      if (className === "keyword" && stringVal.toLowerCase() === 'select') gotSelect = true;
      newQuery += stringVal;
      if (gotSelect && !injected && className === "punc" && stringVal === "{") {
        injected = true;
        //start injecting
        newQuery += "\n" + injectString;
      }
    });
    return newQuery
  }

  yashe.getValueWithoutComments = function() {
    var cleanedQuery = "";
    root.runMode(yashe.getValue(), "sparql11", function(stringVal, className) {
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
  yashe.getQueryType = function() {
    return yashe.queryType;
  };
  /**
	 * Fetch the query mode: 'query' or 'update'
	 *
	 * @method doc.getQueryMode
	 * @return string
	 *
	 */
  yashe.getQueryMode = function() {
    var type = yashe.getQueryType();
    if (
      type == "INSERT" ||
      type == "DELETE" ||
      type == "LOAD" ||
      type == "CLEAR" ||
      type == "CREATE" ||
      type == "DROP" ||
      type == "COPY" ||
      type == "MOVE" ||
      type == "ADD"
    ) {
      return "update";
    } else {
      return "query";
    }
  };

  yashe.setCheckSyntaxErrors = function(isEnabled) {
    yashe.options.syntaxErrorCheck = isEnabled;
    checkSyntax(yashe);
  };

  yashe.enableCompleter = function(name) {
    addCompleterToSettings(yashe.options, name);
    if (root.Autocompleters[name]) yashe.autocompleters.init(name, root.Autocompleters[name]);
  };
  yashe.disableCompleter = function(name) {
    removeCompleterFromSettings(yashe.options, name);
  };
  return yashe;
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
var postProcessCmElement = function(yashe) {
  /**
	 * Set doc value
	 */
  var storageId = utils.getPersistencyId(yashe, yashe.options.persistent);
  if (storageId) {
    var valueFromStorage = yutils.storage.get(storageId);
    if (valueFromStorage) yashe.setValue(valueFromStorage);
  }

  root.drawButtons(yashe);

  /**
	 * Add event handlers
	 */
  yashe.on("blur", function(yashe, eventInfo) {
    root.storeQuery(yashe);
  });
  yashe.on("change", function(yashe, eventInfo) {
    checkSyntax(yashe);
    root.updateQueryButton(yashe);
    root.positionButtons(yashe);
  });
  yashe.on("changes", function() {
    //e.g. on paste
    checkSyntax(yashe);
    root.updateQueryButton(yashe);
    root.positionButtons(yashe);
  });

  yashe.on("cursorActivity", function(yashe, eventInfo) {
    updateButtonsTransparency(yashe);
  });
  yashe.prevQueryValid = false;
  checkSyntax(yashe); // on first load, check as well (our stored or default query might be incorrect)
  root.positionButtons(yashe);

  $(yashe.getWrapperElement())
    .on("mouseenter", ".cm-atom", function() {
      var matchText = $(this).text();
      $(yashe.getWrapperElement())
        .find(".cm-atom")
        .filter(function() {
          return $(this).text() === matchText;
        })
        .addClass("matchingVar");
    })
    .on("mouseleave", ".cm-atom", function() {
      $(yashe.getWrapperElement()).find(".matchingVar").removeClass("matchingVar");
    });
  /**
	 * check url args and modify yashe settings if needed
	 */
  if (yashe.options.consumeShareLink) {
    yashe.options.consumeShareLink(yashe, getUrlParams());
    //and: add a hash listener!
    window.addEventListener("hashchange", function() {
      yashe.options.consumeShareLink(yashe, getUrlParams());
    });
  }
  if (yashe.options.collapsePrefixesOnLoad) yashe.collapsePrefixes(true);
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
    urlParams = $.deparam(location.href.split("#")[1]);
  }
  if ((!urlParams || !("query" in urlParams)) && window.location.search.length > 1) {
    //ok, then just try regular url params
    urlParams = $.deparam(window.location.search.substring(1));
  }
  return urlParams;
};

/**
 * Update transparency of buttons. Increase transparency when cursor is below buttons
 */

var updateButtonsTransparency = function(yashe) {
  yashe.cursor = $(".CodeMirror-cursor");
  if (yashe.buttons && yashe.buttons.is(":visible") && yashe.cursor.length > 0) {
    if (utils.elementsOverlap(yashe.cursor, yashe.buttons)) {
      yashe.buttons.find("svg").attr("opacity", "0.2");
    } else {
      yashe.buttons.find("svg").attr("opacity", "1.0");
    }
  }
};

var clearError = null;
var checkSyntax = function(yashe, deepcheck) {
  yashe.queryValid = true;

  yashe.clearGutter("gutterErrorBar");

  var state = null;
  for (var l = 0; l < yashe.lineCount(); ++l) {
    var precise = false;
    if (!yashe.prevQueryValid) {
      // we don't want cached information in this case, otherwise the
      // previous error sign might still show up,
      // even though the syntax error might be gone already
      precise = true;
    }

    var token = yashe.getTokenAt(
      {
        line: l,
        ch: yashe.getLine(l).length
      },
      precise
    );
    var state = token.state;
    yashe.queryType = state.queryType;
    if (state.OK == false) {
      if (!yashe.options.syntaxErrorCheck) {
        //the library we use already marks everything as being an error. Overwrite this class attribute.
        $(yashe.getWrapperElement()).find(".sp-error").css("color", "black");
        //we don't want to gutter error, so return
        return;
      }

      var warningEl = yutils.svg.getElement(imgs.warning);
      if (state.errorMsg) {
        require("./tooltip")(yashe, warningEl, function() {
          return $("<div/>").text(token.state.errorMsg).html();
        });
      } else if (state.possibleCurrent && state.possibleCurrent.length > 0) {
        //				warningEl.style.zIndex = "99999999";
        require("./tooltip")(yashe, warningEl, function() {
          var expectedEncoded = [];
          state.possibleCurrent.forEach(function(expected) {
            expectedEncoded.push(
              "<strong style='text-decoration:underline'>" + $("<div/>").text(expected).html() + "</strong>"
            );
          });
          return "This line is invalid. Expected: " + expectedEncoded.join(", ");
        });
      }
      warningEl.style.marginTop = "2px";
      warningEl.style.marginLeft = "2px";
      warningEl.className = "parseErrorIcon";
      yashe.setGutterMarker(l, "gutterErrorBar", warningEl);

      yashe.queryValid = false;
      break;
    }
  }
  yashe.prevQueryValid = yashe.queryValid;
  if (deepcheck) {
    if (state != null && state.stack != undefined) {
      var stack = state.stack, len = state.stack.length;
      // Because incremental parser doesn't receive end-of-input
      // it can't clear stack, so we have to check that whatever
      // is left on the stack is nillable
      if (len > 1) yashe.queryValid = false;
      else if (len == 1) {
        if (stack[0] != "solutionModifier" && stack[0] != "?limitOffsetClauses" && stack[0] != "?offsetClause")
          yashe.queryValid = false;
      }
    }
  }
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the YASHE object
$.extend(root, CodeMirror);

//add registrar for autocompleters
root.Autocompleters = {};
root.registerAutocompleter = function(name, constructor) {
  root.Autocompleters[name] = constructor;
  addCompleterToSettings(root.defaults, name);
};

root.autoComplete = function(yashe) {
  //this function gets called when pressing the keyboard shortcut. I.e., autoShow = false
  yashe.autocompleters.autoComplete(false);
};
//include the autocompleters we provide out-of-the-box
root.registerAutocompleter("prefixes", require("./autocompleters/prefixes.js"));
root.registerAutocompleter("properties", require("./autocompleters/properties.js"));
root.registerAutocompleter("classes", require("./autocompleters/classes.js"));
root.registerAutocompleter("variables", require("./autocompleters/variables.js"));

root.positionButtons = function(yashe) {
  var scrollBar = $(yashe.getWrapperElement()).find(".CodeMirror-vscrollbar");
  var offset = 0;
  if (scrollBar.is(":visible")) {
    offset = scrollBar.outerWidth();
  }
  if (yashe.buttons.is(":visible")) yashe.buttons.css("right", offset + 4);
};

/**
 * Create a share link
 *
 * @method YASHE.createShareLink
 * @param {doc} YASHE document
 * @default {query: doc.getValue()}
 * @return object
 */
root.createShareLink = function(yashe) {
  //extend existing link, so first fetch current arguments
  var urlParams = {};
  if (window.location.hash.length > 1) urlParams = $.deparam(window.location.hash.substring(1));
  urlParams["query"] = yashe.getValue();
  return urlParams;
};
root.getAsCurl = function(yashe, ajaxConfig) {
  var curl = require("./curl.js");
  return curl.createCurlString(yashe, ajaxConfig);
};
/**
 * Consume the share link, by parsing the document URL for possible yashe arguments, and setting the appropriate values in the YASHE doc
 *
 * @method YASHE.consumeShareLink
 * @param {doc} YASHE document
 */
root.consumeShareLink = function(yashe, urlParams) {
  if (urlParams && urlParams.query) {
    yashe.setValue(urlParams.query);
  }
};
root.drawButtons = function(yashe) {
  yashe.buttons = $("<div class='yashe_buttons'></div>").appendTo($(yashe.getWrapperElement()));

  /**
	 * draw share link button
	 */
  if (yashe.options.createShareLink) {
    var svgShare = $(yutils.svg.getElement(imgs.share));
    svgShare
      .click(function(event) {
        event.stopPropagation();
        var popup = $("<div class='yashe_sharePopup'></div>").appendTo(yashe.buttons);
        $("html").click(function() {
          if (popup) popup.remove();
        });

        popup.click(function(event) {
          event.stopPropagation();
        });
        var $input = $("<input>").val(
          location.protocol +
            "//" +
            location.host +
            location.pathname +
            location.search +
            "#" +
            $.param(yashe.options.createShareLink(yashe))
        );

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

        popup.empty().append($("<div>", { class: "inputWrapper" }).append($input));
        if (yashe.options.createShortLink) {
          popup.addClass("enableShort");
          $("<button>Shorten</button>")
            .addClass("yashe_btn yashe_btn-sm yashe_btn-primary")
            .click(function() {
              $(this).parent().find("button").attr("disabled", "disabled");
              yashe.options.createShortLink($input.val(), function(errString, shortLink) {
                if (errString) {
                  $input.remove();
                  popup.find(".inputWrapper").append($("<span>", { class: "shortlinkErr" }).text(errString));
                } else {
                  $input.val(shortLink).focus();
                }
              });
            })
            .appendTo(popup);
        }
        $("<button>CURL</button>")
          .addClass("yashe_btn yashe_btn-sm yashe_btn-primary")
          .click(function() {
            $(this).parent().find("button").attr("disabled", "disabled");
            $input.val(root.getAsCurl(yashe)).focus();
          })
          .appendTo(popup);
        var positions = svgShare.position();
        popup
          .css("top", positions.top + svgShare.outerHeight() + parseInt(popup.css("padding-top")) + "px")
          .css("left", positions.left + svgShare.outerWidth() - popup.outerWidth() + "px");
        $input.focus();
      })
      .addClass("yashe_share")
      .attr("title", "Share your query")
      .appendTo(yashe.buttons);
  }

  /**
	 * draw fullscreen button
	 */

  var toggleFullscreen = $("<div>", {
    class: "fullscreenToggleBtns"
  })
    .append(
      $(yutils.svg.getElement(imgs.fullscreen))
        .addClass("yashe_fullscreenBtn")
        .attr("title", "Set editor full screen")
        .click(function() {
          yashe.setOption("fullScreen", true);
          yashe.emit('fullscreen-enter')
        })
    )
    .append(
      $(yutils.svg.getElement(imgs.smallscreen))
        .addClass("yashe_smallscreenBtn")
        .attr("title", "Set editor to normal size")
        .click(function() {
          yashe.setOption("fullScreen", false);
          yashe.emit('fullscreen-leave')
        })
    );
  yashe.buttons.append(toggleFullscreen);

  if (yashe.options.sparql.showQueryButton) {
    $("<div>", {
      class: "yashe_queryButton"
    })
      .click(function() {
        if ($(this).hasClass("query_busy")) {
          if (yashe.xhr) yashe.xhr.abort();
          root.updateQueryButton(yashe);
        } else {
          yashe.query();
        }
      })
      .appendTo(yashe.buttons);
    root.updateQueryButton(yashe);
  }
};

var queryButtonIds = {
  busy: "loader",
  valid: "query",
  error: "queryInvalid"
};

/**
 * Update the query button depending on current query status. If no query status is passed via the parameter, it auto-detects the current query status
 *
 * @param {doc} YASHE document
 * @param status {string|null, "busy"|"valid"|"error"}
 */
root.updateQueryButton = function(yashe, status) {
  var queryButton = $(yashe.getWrapperElement()).find(".yashe_queryButton");
  if (queryButton.length == 0) return; //no query button drawn

  //detect status
  if (!status) {
    status = "valid";
    if (yashe.queryValid === false) status = "error";
  }

  if (status != yashe.queryStatus) {
    queryButton.empty().removeClass(function(index, classNames) {
      return classNames
        .split(" ")
        .filter(function(c) {
          //remove classname from previous status
          return c.indexOf("query_") == 0;
        })
        .join(" ");
    });

    if (status == "busy") {
      queryButton.append(
        $("<div>", {
          class: "loader"
        })
      );
      yashe.queryStatus = status;
    } else if (status == "valid" || status == "error") {
      queryButton.addClass("query_" + status);
      yutils.svg.draw(queryButton, imgs[queryButtonIds[status]]);
      yashe.queryStatus = status;
    }
  }
};
/**
 * Initialize YASHE from an existing text area (see http://codemirror.net/doc/manual.html#fromTextArea for more info)
 *
 * @method YASHE.fromTextArea
 * @param textArea {DOM element}
 * @param config {object}
 * @returns {doc} YASHE document
 */
root.fromTextArea = function(textAreaEl, config) {
  config = extendConfig(config);
  //add yashe div as parent (needed for styles to be manageable and scoped).
  //In this case, I -also- put it as parent el of the text area. This is wrapped in a div now
  var rootEl = $("<div>", {
    class: "yashe"
  })
    .insertBefore($(textAreaEl))
    .append($(textAreaEl));
  var yashe = extendCmInstance(CodeMirror.fromTextArea(textAreaEl, config));
  postProcessCmElement(yashe);
  return yashe;
};

root.storeQuery = function(yashe) {
  var storageId = utils.getPersistencyId(yashe, yashe.options.persistent);
  if (storageId) {
    yutils.storage.set(storageId, yashe.getValue(), "month", yashe.options.onQuotaExceeded);
  }
};
root.commentLines = function(yashe) {
  var startLine = yashe.getCursor(true).line;
  var endLine = yashe.getCursor(false).line;
  var min = Math.min(startLine, endLine);
  var max = Math.max(startLine, endLine);

  // if all lines start with #, remove this char. Otherwise add this char
  var linesAreCommented = true;
  for (var i = min; i <= max; i++) {
    var line = yashe.getLine(i);
    if (line.length == 0 || line.substring(0, 1) != "#") {
      linesAreCommented = false;
      break;
    }
  }
  for (var i = min; i <= max; i++) {
    if (linesAreCommented) {
      // lines are commented, so remove comments
      yashe.replaceRange(
        "",
        {
          line: i,
          ch: 0
        },
        {
          line: i,
          ch: 1
        }
      );
    } else {
      // Not all lines are commented, so add comments
      yashe.replaceRange("#", {
        line: i,
        ch: 0
      });
    }
  }
};

root.copyLineUp = function(yashe) {
  var cursor = yashe.getCursor();
  var lineCount = yashe.lineCount();
  // First create new empty line at end of text
  yashe.replaceRange("\n", {
    line: lineCount - 1,
    ch: yashe.getLine(lineCount - 1).length
  });
  // Copy all lines to their next line
  for (var i = lineCount; i > cursor.line; i--) {
    var line = yashe.getLine(i - 1);
    yashe.replaceRange(
      line,
      {
        line: i,
        ch: 0
      },
      {
        line: i,
        ch: yashe.getLine(i).length
      }
    );
  }
};
root.copyLineDown = function(yashe) {
  root.copyLineUp(yashe);
  // Make sure cursor goes one down (we are copying downwards)
  var cursor = yashe.getCursor();
  cursor.line++;
  yashe.setCursor(cursor);
};
root.doAutoFormat = function(yashe) {
  if (!yashe.somethingSelected()) yashe.execCommand("selectAll");
  var to = {
    line: yashe.getCursor(false).line,
    ch: yashe.getSelection().length
  };
  autoFormatRange(yashe, yashe.getCursor(true), to);
};

var autoFormatRange = function(yashe, from, to) {
  var absStart = yashe.indexFromPos(from);
  var absEnd = yashe.indexFromPos(to);
  // Insert additional line breaks where necessary according to the
  // mode's syntax
  var res = autoFormatLineBreaks(yashe.getValue(), absStart, absEnd);

  // Replace and auto-indent the range
  yashe.operation(function() {
    yashe.replaceRange(res, from, to);
    var startLine = yashe.posFromIndex(absStart).line;
    var endLine = yashe.posFromIndex(absStart + res.length).line;
    for (var i = startLine; i <= endLine; i++) {
      yashe.indentLine(i, "smart");
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
      // don't want to issue 'breakbefore' AND 'breakafter', so check
      // current line
      if ($.trim(currentLine) != "" && stringVal == breakBeforeCharacters[i]) {
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
      } else {
        // (-1)
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
  return $.trim(formattedQuery.replace(/\n\s*\n/g, "\n"));
};

require("./sparql.js"), require("./defaults.js");
root.$ = $;
root.version = {
  CodeMirror: CodeMirror.version,
  YASHE: require("../package.json").version,
  jquery: $.fn.jquery,
  "yasgui-utils": yutils.version
};
