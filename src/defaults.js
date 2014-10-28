/**
 * The default options of YASQE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting YASQE.defaults, or by
 * passing your own options as second argument to the YASQE constructor
 */
var $ = require('jquery'),
	autocompletions = require('./autocompletions.js'),
	sparql = require('./sparql.js'),
	utils = require('./utils.js');
module.exports = {
	use: function(YASQE) {
		YASQE.defaults = $.extend(YASQE.defaults, {
				mode : "sparql11",
				/**
				 * Query string
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
					"Ctrl-Space" : autocompletions.autoComplete,
					"Cmd-Space" : autocompletions.autoComplete,
					"Ctrl-D" : YASQE.deleteLine,
					"Ctrl-K" : YASQE.deleteLine,
					"Cmd-D" : YASQE.deleteLine,
					"Cmd-K" : YASQE.deleteLine,
					"Ctrl-/" : YASQE.commentLines,
					"Cmd-/" : YASQE.commentLines,
					"Ctrl-Alt-Down" : YASQE.copyLineDown,
					"Ctrl-Alt-Up" : YASQE.copyLineUp,
					"Cmd-Alt-Down" : YASQE.copyLineDown,
					"Cmd-Alt-Up" : YASQE.copyLineUp,
					"Shift-Ctrl-F" : YASQE.doAutoFormat,
					"Shift-Cmd-F" : YASQE.doAutoFormat,
					"Ctrl-]" : YASQE.indentMore,
					"Cmd-]" : YASQE.indentMore,
					"Ctrl-[" : YASQE.indentLess,
					"Cmd-[" : YASQE.indentLess,
					"Ctrl-S" : YASQE.storeQuery,
					"Cmd-S" : YASQE.storeQuery,
					"Ctrl-Enter" : sparql.executeQuery,
					"Cmd-Enter" : sparql.executeQuery,
					"F11": function(yasqe) {
				          yasqe.setOption("fullScreen", !yasqe.getOption("fullScreen"));
			        },
			        "Esc": function(yasqe) {
			          if (yasqe.getOption("fullScreen")) yasqe.setOption("fullScreen", false);
			        }
				},
				cursorHeight : 0.9,

				
				/**
				 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
				 * By default, this feature is enabled, and the only the query value is appended to the link.
				 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
				 */
				createShareLink: YASQE.createShareLink,
				
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
				persistent : function(yasqe) {
					return "queryVal_" + $(yasqe.getWrapperElement()).closest('[id]').attr('id');
				},

				
				/**
				 * Settings for querying sparql endpoints
				 */
				sparql : {
					showQueryButton: false,
					
					/**f
					 * Endpoint to query
					 * 
					 * @property sparql.endpoint
					 * @type String|function
					 */
					endpoint : "http://dbpedia.org/sparql",
					/**
					 * Request method via which to access SPARQL endpoint
					 * 
					 * @property sparql.requestMethod
					 * @type String|function
					 */
					requestMethod : "POST",
					
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
					namedGraphs : [],
					/**
					 * Default graphs to query.
					 */
					defaultGraphs : [],

					/**
					 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
					 */
					args : [],

					/**
					 * Additional request headers
					 */
					headers : {},

					/**
					 * Set of ajax handlers
					 */
					handlers : {
						beforeSend : null,
						complete : null,
						error : null,
						success : null
					}
				},
				/**
				 * Types of completions. Setting the value to null, will disable
				 * autocompletion for this particular type. By default, only prefix
				 * autocompletions are fetched from prefix.cc, and property and class
				 * autocompletions are fetched from the Linked Open Vocabularies API
				 */
				autocompletions : {
					/**
					 * Prefix autocompletion settings
					 */
					prefixes : {
						isValidCompletionPosition : function(yasqe) {
							var cur = yasqe.getCursor(), token = yasqe.getTokenAt(cur);

							// not at end of line
							if (yasqe.getLine(cur.line).length > cur.ch)
								return false;

							if (token.type != "ws") {
								// we want to complete token, e.g. when the prefix starts with an a
								// (treated as a token in itself..)
								// but we to avoid including the PREFIX tag. So when we have just
								// typed a space after the prefix tag, don't get the complete token
								token = yasqe.getCompleteToken();
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
							var firstToken = yasqe.getNextNonWsToken(cur.line);
							if (firstToken == null || firstToken.string.toUpperCase() != "PREFIX")
								return false;
							return true;
						},
						get : autocompletions.fetchFromPrefixCc,
						preProcessToken: autocompletions.preprocessPrefixTokenForCompletion,
						postProcessToken: null,
						async : true,
						bulk : true,
						autoShow : true,
						autoAddDeclaration : true,
						persistent : "prefixes",
						handlers : {
							validPosition : null,
							invalidPosition : null,
							shown : null,
							select : null,
							pick : null,
							close : null,
						}
					},
					/**
					 * Property autocompletion settings
					 */
					properties : {
						isValidCompletionPosition : function(yasqe) {
							var token = yasqe.getCompleteToken();
							if (token.string.length == 0) 
								return false; //we want -something- to autocomplete
							if (token.string.indexOf("?") == 0)
								return false; // we are typing a var
							if ($.inArray("a", token.state.possibleCurrent) >= 0)
								return true;// predicate pos
							var cur = yasqe.getCursor();
							var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
							if (previousToken.string == "rdfs:subPropertyOf")
								return true;

							// hmm, we would like -better- checks here, e.g. checking whether we are
							// in a subject, and whether next item is a rdfs:subpropertyof.
							// difficult though... the grammar we use is unreliable when the query
							// is invalid (i.e. during typing), and often the predicate is not typed
							// yet, when we are busy writing the subject...
							return false;
						},
						get : autocompletions.fetchFromLov,
						preProcessToken: autocompletions.preprocessResourceTokenForCompletion,
						postProcessToken: autocompletions.postprocessResourceTokenForCompletion,
						async : true,
						bulk : false,
						autoShow : false,
						persistent : "properties",
						handlers : {
							validPosition : autocompletions.showCompletionNotification,
							invalidPosition : autocompletions.hideCompletionNotification,
							shown : null,
							select : null,
							pick : null,
							close : null,
						}
					},
					/**
					 * Class autocompletion settings
					 */
					classes : {
						isValidCompletionPosition : function(yasqe) {
							var token = yasqe.getCompleteToken();
							if (token.string.indexOf("?") == 0)
								return false;
							var cur = yasqe.getCursor();
							var previousToken = yasqe.getPreviousNonWsToken(cur.line, token);
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
						get : autocompletions.fetchFromLov,
						preProcessToken: autocompletions.preprocessResourceTokenForCompletion,
						postProcessToken: autocompletions.postprocessResourceTokenForCompletion,
						async : true,
						bulk : false,
						autoShow : false,
						persistent : "classes",
						handlers : {
							validPosition : autocompletions.showCompletionNotification,
							invalidPosition : autocompletions.hideCompletionNotification,
							shown : null,
							select : null,
							pick : null,
							close : null,
						}
					},
					/**
					 * Variable names autocompletion settings
					 */
					variableNames : {
						isValidCompletionPosition : function(yasqe) {
							var token = yasqe.getTokenAt(yasqe.getCursor());
							if (token.type != "ws") {
								token = yasqe.getCompleteToken(token);
								if (token && token.string.indexOf("?") == 0) {
									return true;
								}
							}
							return false;
						},
						get : autocompletions.autocompleteVariables,
						preProcessToken: null,
						postProcessToken: null,
						async : false,
						bulk : false,
						autoShow : true,
						persistent : null,
						handlers : {
							validPosition : null,
							invalidPosition : null,
							shown : null,
							select : null,
							pick : null,
							close : null,
						}
					},
				}
			});
	}
};
