/**
 * The default options of YASHE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting YASHE.defaults, or by
 * passing your own options as second argument to the YASHE constructor
 */
var $ = require("jquery"), YASHE = require("./main.js");
YASHE.defaults = $.extend(true, {}, YASHE.defaults, {
  mode: "sparql11",

  /**
	 *Default shape String
	 */
  value: "PREFIX :       <http://example.org/>\n"+
  "PREFIX schema: <http://schema.org/>\n"+
  "PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>\n\n"+
  
 ":User IRI {\n"+ 
 "  schema:name          xsd:string  ;\n"+
 "  schema:birthDate     xsd:date?  ;\n"+
 "  schema:gender        [ schema:Male schema:Female ] ;\n"+
 "  schema:knows         @:User* ;\n"+
 "}",

  highlightSelectionMatches: {
    showToken: /\w/
  },
  tabMode: "indent",
  lineNumbers: true,
  lineWrapping: true,
  backdrop: false,
  foldGutter: {
    rangeFinder: new YASHE.fold.combine(YASHE.fold.brace, YASHE.fold.prefix)
  },
  collapsePrefixesOnLoad: false,
  gutters: ["gutterErrorBar", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  matchBrackets: true,
  fixedGutter: true,
  syntaxErrorCheck: true,
  onQuotaExceeded: function(e) {
    //fail silently
    console.warn("Could not store in localstorage. Skipping..", e);
  },
  /**
	 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
	 *
	 * @property extraKeys
	 * @type object
	 */
  extraKeys: {
    //					"Ctrl-Space" : function(yashe) {
    //						YASHE.autoComplete(yashe);
    //					},
    "Ctrl-Space": YASHE.autoComplete,

    "Cmd-Space": YASHE.autoComplete,
    "Ctrl-D": YASHE.deleteLine,
    "Ctrl-K": YASHE.deleteLine,
    "Shift-Ctrl-K": YASHE.deleteLine,
    "Cmd-D": YASHE.deleteLine,
    "Cmd-K": YASHE.deleteLine,
    "Ctrl-/": YASHE.commentLines,
    "Cmd-/": YASHE.commentLines,
    "Ctrl-Alt-Down": YASHE.copyLineDown,
    "Ctrl-Alt-Up": YASHE.copyLineUp,
    "Cmd-Alt-Down": YASHE.copyLineDown,
    "Cmd-Alt-Up": YASHE.copyLineUp,
    "Shift-Ctrl-F": YASHE.doAutoFormat,
    "Shift-Cmd-F": YASHE.doAutoFormat,
    "Ctrl-]": YASHE.indentMore,
    "Cmd-]": YASHE.indentMore,
    "Ctrl-[": YASHE.indentLess,
    "Cmd-[": YASHE.indentLess,
    "Ctrl-S": YASHE.storeQuery,
    "Cmd-S": YASHE.storeQuery,
    "Ctrl-Enter": YASHE.executeQuery,
    "Cmd-Enter": YASHE.executeQuery,
    F11: function(yashe) {
      yashe.setOption("fullScreen", !yashe.getOption("fullScreen"));
    },
    Esc: function(yashe) {
      if (yashe.getOption("fullScreen")) yashe.setOption("fullScreen", false);
    }
  },
  cursorHeight: 0.9,

  /**
	 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
	 * By default, this feature is enabled, and the only the query value is appended to the link.
	 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
	 */
  createShareLink: YASHE.createShareLink,

  createShortLink: null,

  /**
	 * Consume links shared by others, by checking the url for arguments coming from a query link. Defaults by only checking the 'query=' argument in the url
	 */
  consumeShareLink: YASHE.consumeShareLink,

  /**
	 * Change persistency settings for the YASHE query value. Setting the values
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated using the closest dom ID, to avoid collissions when using multiple YASHE items on one
	 * page
	 *
	 * @type function|string
	 */
  persistent: function(yashe) {
    return "yashe_" + $(yashe.getWrapperElement()).closest("[id]").attr("id") + "_queryVal";
  },

  /**
	 * Settings for querying sparql endpoints
	 */
  sparql: {
    queryName: function(yashe) {
      return yashe.getQueryMode();
    },
    showQueryButton: false,

    /**f
		 * Endpoint to query
		 *
		 * @property sparql.endpoint
		 * @type String|function
		 */
    endpoint: "http://dbpedia.org/sparql",
    /**
		 * Request method via which to access SPARQL endpoint
		 *
		 * @property sparql.requestMethod
		 * @type String|function
		 */
    requestMethod: "POST",

    /**
		 * @type String|function
		 */
    acceptHeaderGraph: "text/turtle,*/*;q=0.9",
    /**
		 * @type String|function
		 */
    acceptHeaderSelect: "application/sparql-results+json,*/*;q=0.9",
    /**
		 * @type String|function
		 */
    acceptHeaderUpdate: "text/plain,*/*;q=0.9",

    /**
		 * Named graphs to query.
		 */
    namedGraphs: [],
    /**
		 * Default graphs to query.
		 */
    defaultGraphs: [],

    /**
		 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
		 */
    args: [],

    /**
		 * Additional request headers
		 */
    headers: {},

    getQueryForAjax: null,
    /**
		 * Set of ajax callbacks
		 */
    callbacks: {
      beforeSend: null,
      complete: null,
      error: null,
      success: null
    },
    handlers: {} //keep here for backwards compatability
  }
});
