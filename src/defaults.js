/**
 * The default options of YASQE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting YASQE.defaults, or by
 * passing your own options as second argument to the YASQE constructor
 */
var $ = require('jquery'),
	YASQE = require('./main.js');
YASQE.defaults = $.extend(true, {}, YASQE.defaults, {
	mode: "sparql11",
	/**
	 * Query string
	 */
	value: "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10",
	highlightSelectionMatches: {
		showToken: /\w/
	},
	tabMode: "indent",
	lineNumbers: true,
	lineWrapping: true,
	backdrop: false,
	foldGutter: {
		rangeFinder: new YASQE.fold.combine(YASQE.fold.brace, YASQE.fold.prefix)
	},
	collapsePrefixesOnLoad: false,
	gutters: ["gutterErrorBar", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
	matchBrackets: true,
	fixedGutter: true,
	syntaxErrorCheck: true,
	/**
	 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
	 *
	 * @property extraKeys
	 * @type object
	 */
	extraKeys: {
		//					"Ctrl-Space" : function(yasqe) {
		//						YASQE.autoComplete(yasqe);
		//					},
		"Ctrl-Space": YASQE.autoComplete,

		"Cmd-Space": YASQE.autoComplete,
		"Ctrl-D": YASQE.deleteLine,
		"Ctrl-K": YASQE.deleteLine,
		"Shift-Ctrl-K": YASQE.deleteLine,
		"Cmd-D": YASQE.deleteLine,
		"Cmd-K": YASQE.deleteLine,
		"Ctrl-/": YASQE.commentLines,
		"Cmd-/": YASQE.commentLines,
		"Ctrl-Alt-Down": YASQE.copyLineDown,
		"Ctrl-Alt-Up": YASQE.copyLineUp,
		"Cmd-Alt-Down": YASQE.copyLineDown,
		"Cmd-Alt-Up": YASQE.copyLineUp,
		"Shift-Ctrl-F": YASQE.doAutoFormat,
		"Shift-Cmd-F": YASQE.doAutoFormat,
		"Ctrl-]": YASQE.indentMore,
		"Cmd-]": YASQE.indentMore,
		"Ctrl-[": YASQE.indentLess,
		"Cmd-[": YASQE.indentLess,
		"Ctrl-S": YASQE.storeQuery,
		"Cmd-S": YASQE.storeQuery,
		"Ctrl-Enter": YASQE.executeQuery,
		"Cmd-Enter": YASQE.executeQuery,
		"F11": function(yasqe) {
			yasqe.setOption("fullScreen", !yasqe.getOption("fullScreen"));
		},
		"Esc": function(yasqe) {
			if (yasqe.getOption("fullScreen")) yasqe.setOption("fullScreen", false);
		}
	},
	cursorHeight: 0.9,


	/**
	 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
	 * By default, this feature is enabled, and the only the query value is appended to the link.
	 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
	 */
	createShareLink: YASQE.createShareLink,

	createShortLink: null,

	/**
	 * Consume links shared by others, by checking the url for arguments coming from a query link. Defaults by only checking the 'query=' argument in the url
	 */
	consumeShareLink: YASQE.consumeShareLink,




	/**
	 * Change persistency settings for the YASQE query value. Setting the values
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated using the closest dom ID, to avoid collissions when using multiple YASQE items on one
	 * page
	 *
	 * @type function|string
	 */
	persistent: function(yasqe) {
		return "yasqe_" + $(yasqe.getWrapperElement()).closest('[id]').attr('id') + "_queryVal";
	},


	/**
	 * Settings for querying sparql endpoints
	 */
	sparql: {
		queryName: function(yasqe) {return yasqe.getQueryMode()},
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
	},
});
