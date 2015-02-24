"use strict";
var CodeMirror = require('codemirror');
CodeMirror.defineMode("sparql11", function(config, parserConfig) {

	var indentUnit = config.indentUnit;

	var grammar = require('./_tokenizer-table.js');
	var ll1_table = grammar.table;

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
		var PN_LOCAL= '('+PN_CHARS_U+'|:|[0-9]|'+PLX+')(('+PN_CHARS+'|\\.|:|'+PLX+')*('+PN_CHARS+'|:|'+PLX+'))?';
		var BLANK_NODE_LABEL = '_:('+PN_CHARS_U+'|[0-9])(('+PN_CHARS+'|\\.)*'+PN_CHARS+')?';
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

		var ECHAR = '\\\\[tbnrf\\\\"\']';
		
		
		 //IMPORTANT: this unicode rule is not in the official grammar.
	      //Reason: https://github.com/YASGUI/YASQE/issues/49
	      //unicode escape sequences (which the sparql spec considers part of the pre-processing of sparql queries)
	      //are marked as invalid. We have little choice (other than adding a layer of complixity) than to modify the grammar accordingly
	      //however, for now only allow these escape sequences in literals (where actually, this should be allows in e.g. prefixes as well)
		var hex4 = HEX + '{4}'
		var unicode = '(\\\\u' + hex4 +'|\\\\U00(10|0' + HEX + ')'+ hex4 + ')';

		var STRING_LITERAL1 = "'(([^\\x27\\x5C\\x0A\\x0D])|"+ECHAR+"|" + unicode + ")*'";
		var STRING_LITERAL2 = '"(([^\\x22\\x5C\\x0A\\x0D])|'+ECHAR+'|' + unicode + ')*"';

		var STRING_LITERAL_LONG1 = "'''(('|'')?([^'\\\\]|"+ECHAR+"|"+unicode+"))*'''";
		var STRING_LITERAL_LONG2 = '"""(("|"")?([^"\\\\]|'+ECHAR+'|'+unicode+'))*"""';

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
			consumed= stream.match(grammar.keywords,true,false);
			if (consumed)
				return { cat: stream.current().toUpperCase(),
								 style: "keyword",
								 text: consumed[0]
							 };

			// Punctuation
			consumed= stream.match(grammar.punct,true,false);
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
				complete: grammar.acceptEmpty,
				errorStartPos: null,
				errorEndPos: null,
				queryType: null,
				possibleCurrent: getPossibles(grammar.startSymbol),
				possibleNext: getPossibles(grammar.startSymbol),
				allowVars : true,
				allowBnodes : true,
				storeProperty : false,
				lastProperty : "",
				stack: [grammar.startSymbol]
			}; 
		},
		indent: indent,
		electricChars: "}])"
	};
}
);
CodeMirror.defineMIME("application/x-sparql-query", "sparql11");
