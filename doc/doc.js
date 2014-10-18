(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
$ = jQuery = require("jquery");

require("../node_modules/twitter-bootstrap-3.0.0/dist/js/bootstrap.js");



},{"../node_modules/twitter-bootstrap-3.0.0/dist/js/bootstrap.js":3,"jquery":2}],2:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v1.11.1
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-05-01T17:42Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//

var deletedIds = [];

var slice = deletedIds.slice;

var concat = deletedIds.concat;

var push = deletedIds.push;

var indexOf = deletedIds.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};



var
	version = "1.11.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1, IE<9
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: deletedIds.sort,
	splice: deletedIds.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var src, copyIsArray, copy, name, options, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		/* jshint eqeqeq: false */
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		return !jQuery.isArray( obj ) && obj - parseFloat( obj ) >= 0;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	isPlainObject: function( obj ) {
		var key;

		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!hasOwn.call(obj, "constructor") &&
				!hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Support: IE<9
		// Handle iteration over inherited properties before own properties.
		if ( support.ownLast ) {
			for ( key in obj ) {
				return hasOwn.call( obj, key );
			}
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		for ( key in obj ) {}

		return key === undefined || hasOwn.call( obj, key );
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && jQuery.trim( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1, IE<9
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( indexOf ) {
				return indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		while ( j < len ) {
			first[ i++ ] = second[ j++ ];
		}

		// Support: IE<9
		// Workaround casting of .length to NaN on otherwise arraylike objects (e.g., NodeLists)
		if ( len !== len ) {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var args, proxy, tmp;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: function() {
		return +( new Date() );
	},

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v1.10.19
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-04-18
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + characterEncoding + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName ) && assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select msallowclip=''><option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowclip^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome<14
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			ret = [],
			self = this,
			len = self.length;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				ret = jQuery.unique( ret );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				ret = ret.reverse();
			}
		}

		return this.pushStack( ret );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,
		// Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );

					} else if ( !(--remaining) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready );
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.triggerHandler ) {
			jQuery( document ).triggerHandler( "ready" );
			jQuery( document ).off( "ready" );
		}
	}
});

/**
 * Clean-up method for dom ready events
 */
function detach() {
	if ( document.addEventListener ) {
		document.removeEventListener( "DOMContentLoaded", completed, false );
		window.removeEventListener( "load", completed, false );

	} else {
		document.detachEvent( "onreadystatechange", completed );
		window.detachEvent( "onload", completed );
	}
}

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	// readyState === "complete" is good enough for us to call the dom ready in oldIE
	if ( document.addEventListener || event.type === "load" || document.readyState === "complete" ) {
		detach();
		jQuery.ready();
	}
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", completed );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", completed );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// detach all dom ready events
						detach();

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};


var strundefined = typeof undefined;



// Support: IE<9
// Iteration over object's inherited properties before its own
var i;
for ( i in jQuery( support ) ) {
	break;
}
support.ownLast = i !== "0";

// Note: most support tests are defined in their respective modules.
// false until the test is run
support.inlineBlockNeedsLayout = false;

// Execute ASAP in case we need to set body.style.zoom
jQuery(function() {
	// Minified: var a,b,c,d
	var val, div, body, container;

	body = document.getElementsByTagName( "body" )[ 0 ];
	if ( !body || !body.style ) {
		// Return for frameset docs that don't have a body
		return;
	}

	// Setup
	div = document.createElement( "div" );
	container = document.createElement( "div" );
	container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
	body.appendChild( container ).appendChild( div );

	if ( typeof div.style.zoom !== strundefined ) {
		// Support: IE<8
		// Check if natively block-level elements act like inline-block
		// elements when setting their display to 'inline' and giving
		// them layout
		div.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1";

		support.inlineBlockNeedsLayout = val = div.offsetWidth === 3;
		if ( val ) {
			// Prevent IE 6 from affecting layout for positioned elements #11048
			// Prevent IE from shrinking the body in IE 7 mode #12869
			// Support: IE<8
			body.style.zoom = 1;
		}
	}

	body.removeChild( container );
});




(function() {
	var div = document.createElement( "div" );

	// Execute the test only if not already executed in another module.
	if (support.deleteExpando == null) {
		// Support: IE<9
		support.deleteExpando = true;
		try {
			delete div.test;
		} catch( e ) {
			support.deleteExpando = false;
		}
	}

	// Null elements to avoid leaks in IE.
	div = null;
})();


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( elem ) {
	var noData = jQuery.noData[ (elem.nodeName + " ").toLowerCase() ],
		nodeType = +elem.nodeType || 1;

	// Do not set data on non-element DOM nodes because it will not be cleared (#8335).
	return nodeType !== 1 && nodeType !== 9 ?
		false :

		// Nodes accept data unless otherwise specified; rejection can be conditional
		!noData || noData !== true && elem.getAttribute("classid") === noData;
};


var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}

function internalData( elem, name, data, pvt /* Internal Use Only */ ) {
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var ret, thisCache,
		internalKey = jQuery.expando,

		// We have to handle DOM nodes and JS objects differently because IE6-7
		// can't GC object references properly across the DOM-JS boundary
		isNode = elem.nodeType,

		// Only DOM nodes need the global jQuery cache; JS object data is
		// attached directly to the object so GC can occur automatically
		cache = isNode ? jQuery.cache : elem,

		// Only defining an ID for JS objects if its cache already exists allows
		// the code to shortcut on the same path as a DOM node with no cache
		id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

	// Avoid doing any more work than we need to when trying to get data on an
	// object that has no data at all
	if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && data === undefined && typeof name === "string" ) {
		return;
	}

	if ( !id ) {
		// Only DOM nodes need a new unique ID for each element since their data
		// ends up in the global cache
		if ( isNode ) {
			id = elem[ internalKey ] = deletedIds.pop() || jQuery.guid++;
		} else {
			id = internalKey;
		}
	}

	if ( !cache[ id ] ) {
		// Avoid exposing jQuery metadata on plain JS objects when the object
		// is serialized using JSON.stringify
		cache[ id ] = isNode ? {} : { toJSON: jQuery.noop };
	}

	// An object can be passed to jQuery.data instead of a key/value pair; this gets
	// shallow copied over onto the existing cache
	if ( typeof name === "object" || typeof name === "function" ) {
		if ( pvt ) {
			cache[ id ] = jQuery.extend( cache[ id ], name );
		} else {
			cache[ id ].data = jQuery.extend( cache[ id ].data, name );
		}
	}

	thisCache = cache[ id ];

	// jQuery data() is stored in a separate object inside the object's internal data
	// cache in order to avoid key collisions between internal data and user-defined
	// data.
	if ( !pvt ) {
		if ( !thisCache.data ) {
			thisCache.data = {};
		}

		thisCache = thisCache.data;
	}

	if ( data !== undefined ) {
		thisCache[ jQuery.camelCase( name ) ] = data;
	}

	// Check for both converted-to-camel and non-converted data property names
	// If a data property was specified
	if ( typeof name === "string" ) {

		// First Try to find as-is property data
		ret = thisCache[ name ];

		// Test for null|undefined property data
		if ( ret == null ) {

			// Try to find the camelCased property
			ret = thisCache[ jQuery.camelCase( name ) ];
		}
	} else {
		ret = thisCache;
	}

	return ret;
}

function internalRemoveData( elem, name, pvt ) {
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var thisCache, i,
		isNode = elem.nodeType,

		// See jQuery.data for more information
		cache = isNode ? jQuery.cache : elem,
		id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

	// If there is already no cache entry for this object, there is no
	// purpose in continuing
	if ( !cache[ id ] ) {
		return;
	}

	if ( name ) {

		thisCache = pvt ? cache[ id ] : cache[ id ].data;

		if ( thisCache ) {

			// Support array or space separated string names for data keys
			if ( !jQuery.isArray( name ) ) {

				// try the string as a key before any manipulation
				if ( name in thisCache ) {
					name = [ name ];
				} else {

					// split the camel cased version by spaces unless a key with the spaces exists
					name = jQuery.camelCase( name );
					if ( name in thisCache ) {
						name = [ name ];
					} else {
						name = name.split(" ");
					}
				}
			} else {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = name.concat( jQuery.map( name, jQuery.camelCase ) );
			}

			i = name.length;
			while ( i-- ) {
				delete thisCache[ name[i] ];
			}

			// If there is no data left in the cache, we want to continue
			// and let the cache object itself get destroyed
			if ( pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache) ) {
				return;
			}
		}
	}

	// See jQuery.data for more information
	if ( !pvt ) {
		delete cache[ id ].data;

		// Don't destroy the parent cache unless the internal data object
		// had been the only thing left in it
		if ( !isEmptyDataObject( cache[ id ] ) ) {
			return;
		}
	}

	// Destroy the cache
	if ( isNode ) {
		jQuery.cleanData( [ elem ], true );

	// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
	/* jshint eqeqeq: false */
	} else if ( support.deleteExpando || cache != cache.window ) {
		/* jshint eqeqeq: true */
		delete cache[ id ];

	// When all else fails, null
	} else {
		cache[ id ] = null;
	}
}

jQuery.extend({
	cache: {},

	// The following elements (space-suffixed to avoid Object.prototype collisions)
	// throw uncatchable exceptions if you attempt to set expando properties
	noData: {
		"applet ": true,
		"embed ": true,
		// ...but Flash objects (which have this classid) *can* handle expandos
		"object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data ) {
		return internalData( elem, name, data );
	},

	removeData: function( elem, name ) {
		return internalRemoveData( elem, name );
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return internalData( elem, name, data, true );
	},

	_removeData: function( elem, name ) {
		return internalRemoveData( elem, name, true );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[0],
			attrs = elem && elem.attributes;

		// Special expections of .data basically thwart jQuery.access,
		// so implement the relevant behavior ourselves

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice(5) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		return arguments.length > 1 ?

			// Sets one value
			this.each(function() {
				jQuery.data( this, key, value );
			}) :

			// Gets one value
			// Try to fetch any internally stored data first
			elem ? dataAttr( elem, key, jQuery.data( elem, key ) ) : undefined;
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery._removeData( elem, type + "queue" );
				jQuery._removeData( elem, key );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};



// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		length = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < length; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			length ? fn( elems[0], key ) : emptyGet;
};
var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	// Minified: var a,b,c
	var input = document.createElement( "input" ),
		div = document.createElement( "div" ),
		fragment = document.createDocumentFragment();

	// Setup
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

	// IE strips leading whitespace when .innerHTML is used
	support.leadingWhitespace = div.firstChild.nodeType === 3;

	// Make sure that tbody elements aren't automatically inserted
	// IE will insert them into empty tables
	support.tbody = !div.getElementsByTagName( "tbody" ).length;

	// Make sure that link elements get serialized correctly by innerHTML
	// This requires a wrapper element in IE
	support.htmlSerialize = !!div.getElementsByTagName( "link" ).length;

	// Makes sure cloning an html5 element does not cause problems
	// Where outerHTML is undefined, this still works
	support.html5Clone =
		document.createElement( "nav" ).cloneNode( true ).outerHTML !== "<:nav></:nav>";

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	input.type = "checkbox";
	input.checked = true;
	fragment.appendChild( input );
	support.appendChecked = input.checked;

	// Make sure textarea (and checkbox) defaultValue is properly cloned
	// Support: IE6-IE11+
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// #11217 - WebKit loses check when the name is after the checked attribute
	fragment.appendChild( div );
	div.innerHTML = "<input type='radio' checked='checked' name='t'/>";

	// Support: Safari 5.1, iOS 5.1, Android 4.x, Android 2.3
	// old WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<9
	// Opera does not clone events (and typeof div.attachEvent === undefined).
	// IE9-10 clones events bound via attachEvent, but they don't trigger with .click()
	support.noCloneEvent = true;
	if ( div.attachEvent ) {
		div.attachEvent( "onclick", function() {
			support.noCloneEvent = false;
		});

		div.cloneNode( true ).click();
	}

	// Execute the test only if not already executed in another module.
	if (support.deleteExpando == null) {
		// Support: IE<9
		support.deleteExpando = true;
		try {
			delete div.test;
		} catch( e ) {
			support.deleteExpando = false;
		}
	}
})();


(function() {
	var i, eventName,
		div = document.createElement( "div" );

	// Support: IE<9 (lack submit/change bubble), Firefox 23+ (lack focusin event)
	for ( i in { submit: true, change: true, focusin: true }) {
		eventName = "on" + i;

		if ( !(support[ i + "Bubbles" ] = eventName in window) ) {
			// Beware of CSP restrictions (https://developer.mozilla.org/en/Security/CSP)
			div.setAttribute( eventName, "t" );
			support[ i + "Bubbles" ] = div.attributes[ eventName ].expando === false;
		}
	}

	// Null elements to avoid leaks in IE.
	div = null;
})();


var rformElems = /^(?:input|select|textarea)$/i,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {
		var tmp, events, t, handleObjIn,
			special, eventHandle, handleObj,
			handlers, type, namespaces, origType,
			elemData = jQuery._data( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {
		var j, handleObj, tmp,
			origCount, t, events,
			special, handlers, type,
			namespaces, origType,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery._removeData( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		var handle, ontype, cur,
			bubbleType, special, tmp, i,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && elem[ type ] && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					try {
						elem[ type ]();
					} catch ( e ) {
						// IE<9 dies on focus/blur to hidden element (#1486,#12518)
						// only reproducible on winXP IE8 native, not IE9 in IE8 mode
					}
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, ret, handleObj, matched, j,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( jQuery._data( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var sel, handleObj, matches, i,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			/* jshint eqeqeq: false */
			for ( ; cur != this; cur = cur.parentNode || this ) {
				/* jshint eqeqeq: true */

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && (cur.disabled !== true || event.type !== "click") ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: IE<9
		// Fix target property (#1925)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Support: Chrome 23+, Safari?
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// Support: IE<9
		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328)
		event.metaKey = !!event.metaKey;

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var body, eventDoc, doc,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					try {
						this.focus();
						return false;
					} catch ( e ) {
						// Support: IE<9
						// If we error on focus to hidden element (#1486, #12518),
						// let .trigger() run the handlers
					}
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( jQuery.nodeName( this, "input" ) && this.type === "checkbox" && this.click ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === strundefined ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: IE < 9, Android < 4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;
		if ( !e ) {
			return;
		}

		// If preventDefault exists, run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// Support: IE
		// Otherwise set the returnValue property of the original event to false
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;
		if ( !e ) {
			return;
		}
		// If stopPropagation exists, run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}

		// Support: IE
		// Set the cancelBubble property of the original event to true
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && e.stopImmediatePropagation ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "submitBubbles" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "submitBubbles", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "changeBubbles" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "changeBubbles", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = jQuery._data( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				jQuery._data( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = jQuery._data( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					jQuery._removeData( doc, fix );
				} else {
					jQuery._data( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var type, origFn;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
		safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		area: [ 1, "<map>", "</map>" ],
		param: [ 1, "<object>", "</object>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
		// unless wrapped in a div with non-breaking characters in front of it.
		_default: support.htmlSerialize ? [ 0, "", "" ] : [ 1, "X<div>", "</div>"  ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

function getAll( context, tag ) {
	var elems, elem,
		i = 0,
		found = typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName( tag || "*" ) :
			typeof context.querySelectorAll !== strundefined ? context.querySelectorAll( tag || "*" ) :
			undefined;

	if ( !found ) {
		for ( found = [], elems = context.childNodes || context; (elem = elems[i]) != null; i++ ) {
			if ( !tag || jQuery.nodeName( elem, tag ) ) {
				found.push( elem );
			} else {
				jQuery.merge( found, getAll( elem, tag ) );
			}
		}
	}

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], found ) :
		found;
}

// Used in buildFragment, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

// Support: IE<8
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (jQuery.find.attr( elem, "type" ) !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );
	if ( match ) {
		elem.type = match[1];
	} else {
		elem.removeAttribute("type");
	}
	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var elem,
		i = 0;
	for ( ; (elem = elems[i]) != null; i++ ) {
		jQuery._data( elem, "globalEval", !refElements || jQuery._data( refElements[i], "globalEval" ) );
	}
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function fixCloneNodeIssues( src, dest ) {
	var nodeName, e, data;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	nodeName = dest.nodeName.toLowerCase();

	// IE6-8 copies events bound via attachEvent when using cloneNode.
	if ( !support.noCloneEvent && dest[ jQuery.expando ] ) {
		data = jQuery._data( dest );

		for ( e in data.events ) {
			jQuery.removeEvent( dest, e, data.handle );
		}

		// Event data gets referenced instead of copied if the expando gets copied too
		dest.removeAttribute( jQuery.expando );
	}

	// IE blanks contents when cloning scripts, and tries to evaluate newly-set text
	if ( nodeName === "script" && dest.text !== src.text ) {
		disableScript( dest ).text = src.text;
		restoreScript( dest );

	// IE6-10 improperly clones children of object elements using classid.
	// IE10 throws NoModificationAllowedError if parent is null, #12132.
	} else if ( nodeName === "object" ) {
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( support.html5Clone && ( src.innerHTML && !jQuery.trim(dest.innerHTML) ) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.defaultSelected = dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var destElements, node, clone, i, srcElements,
			inPage = jQuery.contains( elem.ownerDocument, elem );

		if ( support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!support.noCloneEvent || !support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			// Fix all IE cloning issues
			for ( i = 0; (node = srcElements[i]) != null; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					fixCloneNodeIssues( node, destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0; (node = srcElements[i]) != null; i++ ) {
					cloneCopyEvent( node, destElements[i] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		destElements = srcElements = node = null;

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var j, elem, contains,
			tmp, tag, tbody, wrap,
			l = elems.length,

			// Ensure a safe fragment
			safe = createSafeFragment( context ),

			nodes = [],
			i = 0;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || safe.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = (rtagName.exec( elem ) || [ "", "" ])[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;

					tmp.innerHTML = wrap[1] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[2];

					// Descend through wrappers to the right content
					j = wrap[0];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Manually add leading whitespace removed by IE
					if ( !support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						nodes.push( context.createTextNode( rleadingWhitespace.exec( elem )[0] ) );
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						elem = tag === "table" && !rtbody.test( elem ) ?
							tmp.firstChild :

							// String was a bare <thead> or <tfoot>
							wrap[1] === "<table>" && !rtbody.test( elem ) ?
								tmp :
								0;

						j = elem && elem.childNodes.length;
						while ( j-- ) {
							if ( jQuery.nodeName( (tbody = elem.childNodes[j]), "tbody" ) && !tbody.childNodes.length ) {
								elem.removeChild( tbody );
							}
						}
					}

					jQuery.merge( nodes, tmp.childNodes );

					// Fix #12392 for WebKit and IE > 9
					tmp.textContent = "";

					// Fix #12392 for oldIE
					while ( tmp.firstChild ) {
						tmp.removeChild( tmp.firstChild );
					}

					// Remember the top-level container for proper cleanup
					tmp = safe.lastChild;
				}
			}
		}

		// Fix #11356: Clear elements from fragment
		if ( tmp ) {
			safe.removeChild( tmp );
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !support.appendChecked ) {
			jQuery.grep( getAll( nodes, "input" ), fixDefaultChecked );
		}

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( safe.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		tmp = null;

		return safe;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var elem, type, id, data,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( typeof elem.removeAttribute !== strundefined ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						deletedIds.push( id );
					}
				}
			}
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem, false ) );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}

			// If this is a select, ensure that it displays empty (#12336)
			// Support: IE<9
			if ( elem.options && jQuery.nodeName( elem, "select" ) ) {
				elem.options.length = 0;
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ (rtagName.exec( value ) || [ "", "" ])[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var first, node, hasScripts,
			scripts, doc, fragment,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[0],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[0] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[i], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!jQuery._data( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( ( node.text || node.textContent || node.innerHTML || "" ).replace( rcleanScript, "" ) );
							}
						}
					}
				}

				// Fix #11809: Avoid leaking memory
				fragment = first = null;
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone(true);
			jQuery( insert[i] )[ original ]( elems );

			// Modern browsers can apply jQuery collections as arrays, but oldIE needs a .get()
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var style,
		elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?

			// Use of this method is a temporary fix (more like optmization) until something better comes along,
			// since it was removed from specification and supported only in FF
			style.display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = ( iframe[ 0 ].contentWindow || iframe[ 0 ].contentDocument ).document;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}


(function() {
	var shrinkWrapBlocksVal;

	support.shrinkWrapBlocks = function() {
		if ( shrinkWrapBlocksVal != null ) {
			return shrinkWrapBlocksVal;
		}

		// Will be changed later if needed.
		shrinkWrapBlocksVal = false;

		// Minified: var b,c,d
		var div, body, container;

		body = document.getElementsByTagName( "body" )[ 0 ];
		if ( !body || !body.style ) {
			// Test fired too early or in an unsupported environment, exit.
			return;
		}

		// Setup
		div = document.createElement( "div" );
		container = document.createElement( "div" );
		container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
		body.appendChild( container ).appendChild( div );

		// Support: IE6
		// Check if elements with layout shrink-wrap their children
		if ( typeof div.style.zoom !== strundefined ) {
			// Reset CSS: box-sizing; display; margin; border
			div.style.cssText =
				// Support: Firefox<29, Android 2.3
				// Vendor-prefix box-sizing
				"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
				"box-sizing:content-box;display:block;margin:0;border:0;" +
				"padding:1px;width:1px;zoom:1";
			div.appendChild( document.createElement( "div" ) ).style.width = "5px";
			shrinkWrapBlocksVal = div.offsetWidth !== 3;
		}

		body.removeChild( container );

		return shrinkWrapBlocksVal;
	};

})();
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );



var getStyles, curCSS,
	rposition = /^(top|right|bottom|left)$/;

if ( window.getComputedStyle ) {
	getStyles = function( elem ) {
		return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
	};

	curCSS = function( elem, name, computed ) {
		var width, minWidth, maxWidth, ret,
			style = elem.style;

		computed = computed || getStyles( elem );

		// getPropertyValue is only needed for .css('filter') in IE9, see #12537
		ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined;

		if ( computed ) {

			if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
				ret = jQuery.style( elem, name );
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
			// Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
			// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
			if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

				// Remember the original values
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				// Put in the new values to get a computed value out
				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				// Revert the changed values
				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		// Support: IE
		// IE returns zIndex value as an integer.
		return ret === undefined ?
			ret :
			ret + "";
	};
} else if ( document.documentElement.currentStyle ) {
	getStyles = function( elem ) {
		return elem.currentStyle;
	};

	curCSS = function( elem, name, computed ) {
		var left, rs, rsLeft, ret,
			style = elem.style;

		computed = computed || getStyles( elem );
		ret = computed ? computed[ name ] : undefined;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && style[ name ] ) {
			ret = style[ name ];
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		// but not position css attributes, as those are proportional to the parent element instead
		// and we can't measure the parent instead because it might trigger a "stacking dolls" problem
		if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

			// Remember the original values
			left = style.left;
			rs = elem.runtimeStyle;
			rsLeft = rs && rs.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				rs.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				rs.left = rsLeft;
			}
		}

		// Support: IE
		// IE returns zIndex value as an integer.
		return ret === undefined ?
			ret :
			ret + "" || "auto";
	};
}




function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			var condition = conditionFn();

			if ( condition == null ) {
				// The test was not ready at this point; screw the hook this time
				// but check again when needed next time.
				return;
			}

			if ( condition ) {
				// Hook not needed (or it's not possible to use it due to missing dependency),
				// remove it.
				// Since there are no other hooks for marginRight, remove the whole object.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.

			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	// Minified: var b,c,d,e,f,g, h,i
	var div, style, a, pixelPositionVal, boxSizingReliableVal,
		reliableHiddenOffsetsVal, reliableMarginRightVal;

	// Setup
	div = document.createElement( "div" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
	a = div.getElementsByTagName( "a" )[ 0 ];
	style = a && a.style;

	// Finish early in limited (non-browser) environments
	if ( !style ) {
		return;
	}

	style.cssText = "float:left;opacity:.5";

	// Support: IE<9
	// Make sure that element opacity exists (as opposed to filter)
	support.opacity = style.opacity === "0.5";

	// Verify style float existence
	// (IE uses styleFloat instead of cssFloat)
	support.cssFloat = !!style.cssFloat;

	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	// Support: Firefox<29, Android 2.3
	// Vendor-prefix box-sizing
	support.boxSizing = style.boxSizing === "" || style.MozBoxSizing === "" ||
		style.WebkitBoxSizing === "";

	jQuery.extend(support, {
		reliableHiddenOffsets: function() {
			if ( reliableHiddenOffsetsVal == null ) {
				computeStyleTests();
			}
			return reliableHiddenOffsetsVal;
		},

		boxSizingReliable: function() {
			if ( boxSizingReliableVal == null ) {
				computeStyleTests();
			}
			return boxSizingReliableVal;
		},

		pixelPosition: function() {
			if ( pixelPositionVal == null ) {
				computeStyleTests();
			}
			return pixelPositionVal;
		},

		// Support: Android 2.3
		reliableMarginRight: function() {
			if ( reliableMarginRightVal == null ) {
				computeStyleTests();
			}
			return reliableMarginRightVal;
		}
	});

	function computeStyleTests() {
		// Minified: var b,c,d,j
		var div, body, container, contents;

		body = document.getElementsByTagName( "body" )[ 0 ];
		if ( !body || !body.style ) {
			// Test fired too early or in an unsupported environment, exit.
			return;
		}

		// Setup
		div = document.createElement( "div" );
		container = document.createElement( "div" );
		container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
		body.appendChild( container ).appendChild( div );

		div.style.cssText =
			// Support: Firefox<29, Android 2.3
			// Vendor-prefix box-sizing
			"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +
			"border:1px;padding:1px;width:4px;position:absolute";

		// Support: IE<9
		// Assume reasonable values in the absence of getComputedStyle
		pixelPositionVal = boxSizingReliableVal = false;
		reliableMarginRightVal = true;

		// Check for getComputedStyle so that this code is not run in IE<9.
		if ( window.getComputedStyle ) {
			pixelPositionVal = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
			boxSizingReliableVal =
				( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

			// Support: Android 2.3
			// Div with explicit width and no margin-right incorrectly
			// gets computed margin-right based on width of container (#3333)
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			contents = div.appendChild( document.createElement( "div" ) );

			// Reset CSS: box-sizing; display; margin; border; padding
			contents.style.cssText = div.style.cssText =
				// Support: Firefox<29, Android 2.3
				// Vendor-prefix box-sizing
				"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
				"box-sizing:content-box;display:block;margin:0;border:0;padding:0";
			contents.style.marginRight = contents.style.width = "0";
			div.style.width = "1px";

			reliableMarginRightVal =
				!parseFloat( ( window.getComputedStyle( contents, null ) || {} ).marginRight );
		}

		// Support: IE8
		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
		contents = div.getElementsByTagName( "td" );
		contents[ 0 ].style.cssText = "margin:0;border:0;padding:0;display:none";
		reliableHiddenOffsetsVal = contents[ 0 ].offsetHeight === 0;
		if ( reliableHiddenOffsetsVal ) {
			contents[ 0 ].style.display = "";
			contents[ 1 ].style.display = "none";
			reliableHiddenOffsetsVal = contents[ 0 ].offsetHeight === 0;
		}

		body.removeChild( container );
	}

})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
		ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity\s*=\s*([^)]*)/,

	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];


// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name.charAt(0).toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = jQuery._data( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = jQuery._data( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {
			hidden = isHidden( elem );

			if ( display && display !== "none" || !hidden ) {
				jQuery._data( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && ( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set. See: #7116
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Fixes #8908, it can be done more correctly by specifing setters in cssHooks,
			// but it would mean to define eight (for every problematic property) identical functions
			if ( !support.clearCloneStyle && value === "" && name.indexOf("background") === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {

				// Support: IE
				// Swallow errors from 'invalid' CSS values (#5509)
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var num, val, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

if ( !support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			// if value === "", then remove inline opacity #12685
			if ( ( value >= 1 || value === "" ) &&
					jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
					style.removeAttribute ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there is no filter style applied in a css rule or unset inline opacity, we are done
				if ( value === "" || currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			// Work around by temporarily setting element display to inline-block
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9
// Panic based approach to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*
					// Use a string for doubling factor so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur()
				// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// we're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = jQuery._data( elem, "fxshow" );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );

		// Test default display if display is currently "none"
		checkDisplay = display === "none" ?
			jQuery._data( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

		if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !support.inlineBlockNeedsLayout || defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";
			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !support.shrinkWrapBlocks() ) {
			anim.always(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

		// Any non-fx value stops us from restoring the original display value
		} else {
			display = undefined;
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = jQuery._data( elem, "fxshow", {} );
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			jQuery._removeData( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}

	// If this is a noop like .hide().hide(), restore an overwritten display value
	} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {
		style.display = display;
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {
	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || jQuery._data( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = jQuery._data( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,
		i = 0;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	// Minified: var a,b,c,d,e
	var input, div, select, a, opt;

	// Setup
	div = document.createElement( "div" );
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
	a = div.getElementsByTagName("a")[ 0 ];

	// First batch of tests.
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	a.style.cssText = "top:1px";

	// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
	support.getSetAttribute = div.className !== "t";

	// Get the style information from getAttribute
	// (IE uses .cssText instead)
	support.style = /top/.test( a.getAttribute("style") );

	// Make sure that URLs aren't manipulated
	// (IE normalizes it by default)
	support.hrefNormalized = a.getAttribute("href") === "/a";

	// Check the default checkbox/radio value ("" on WebKit; "on" elsewhere)
	support.checkOn = !!input.value;

	// Make sure that a selected-by-default option has a working selected property.
	// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
	support.optSelected = opt.selected;

	// Tests for enctype support on a form (#6743)
	support.enctype = !!document.createElement("form").enctype;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE8 only
	// Check if we can trust getAttribute("value")
	input = document.createElement( "input" );
	input.setAttribute( "value", "" );
	support.input = input.getAttribute( "value" ) === "";

	// Check if an input maintains its value after becoming a radio
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";
})();


var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					// Support: IE10-11+
					// option.text throws exceptions (#14686, #14858)
					jQuery.trim( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// oldIE doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					if ( jQuery.inArray( jQuery.valHooks.option.get( option ), values ) >= 0 ) {

						// Support: IE6
						// When new option element is added to select box we need to
						// force reflow of newly added node in order to workaround delay
						// of initialization properties
						try {
							option.selected = optionSet = true;

						} catch ( _ ) {

							// Will be executed only in IE6
							option.scrollHeight;
						}

					} else {
						option.selected = false;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}

				return options;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle,
	ruseDefault = /^(?:checked|selected)$/i,
	getSetAttribute = support.getSetAttribute,
	getSetInput = support.input;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
						elem[ propName ] = false;
					// Support: IE<9
					// Also clear defaultChecked/defaultSelected (if appropriate)
					} else {
						elem[ jQuery.camelCase( "default-" + name ) ] =
							elem[ propName ] = false;
					}

				// See #9699 for explanation of this approach (setting first, then removal)
				} else {
					jQuery.attr( elem, name, "" );
				}

				elem.removeAttribute( getSetAttribute ? name : propName );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hook for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
			// IE<8 needs the *property* name
			elem.setAttribute( !getSetAttribute && jQuery.propFix[ name ] || name, name );

		// Use defaultChecked and defaultSelected for oldIE
		} else {
			elem[ jQuery.camelCase( "default-" + name ) ] = elem[ name ] = true;
		}

		return name;
	}
};

// Retrieve booleans specially
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {

	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = getSetInput && getSetAttribute || !ruseDefault.test( name ) ?
		function( elem, name, isXML ) {
			var ret, handle;
			if ( !isXML ) {
				// Avoid an infinite loop by temporarily removing this function from the getter
				handle = attrHandle[ name ];
				attrHandle[ name ] = ret;
				ret = getter( elem, name, isXML ) != null ?
					name.toLowerCase() :
					null;
				attrHandle[ name ] = handle;
			}
			return ret;
		} :
		function( elem, name, isXML ) {
			if ( !isXML ) {
				return elem[ jQuery.camelCase( "default-" + name ) ] ?
					name.toLowerCase() :
					null;
			}
		};
});

// fix oldIE attroperties
if ( !getSetInput || !getSetAttribute ) {
	jQuery.attrHooks.value = {
		set: function( elem, value, name ) {
			if ( jQuery.nodeName( elem, "input" ) ) {
				// Does not return so that setAttribute is also used
				elem.defaultValue = value;
			} else {
				// Use nodeHook if defined (#1954); otherwise setAttribute is fine
				return nodeHook && nodeHook.set( elem, value, name );
			}
		}
	};
}

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = {
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				elem.setAttributeNode(
					(ret = elem.ownerDocument.createAttribute( name ))
				);
			}

			ret.value = value += "";

			// Break association with cloned elements by also using setAttribute (#9646)
			if ( name === "value" || value === elem.getAttribute( name ) ) {
				return value;
			}
		}
	};

	// Some attributes are constructed with empty-string values when not defined
	attrHandle.id = attrHandle.name = attrHandle.coords =
		function( elem, name, isXML ) {
			var ret;
			if ( !isXML ) {
				return (ret = elem.getAttributeNode( name )) && ret.value !== "" ?
					ret.value :
					null;
			}
		};

	// Fixing value retrieval on a button requires this module
	jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret = elem.getAttributeNode( name );
			if ( ret && ret.specified ) {
				return ret.value;
			}
		},
		set: nodeHook.set
	};

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		set: function( elem, value, name ) {
			nodeHook.set( elem, value === "" ? false : value, name );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		};
	});
}

if ( !support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Note: IE uppercases css property names, but if we were to .toLowerCase()
			// .cssText, that would destroy case senstitivity in URL's, like in "background"
			return elem.style.cssText || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = value + "" );
		}
	};
}




var rfocusable = /^(?:input|select|textarea|button|object)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				return tabindex ?
					parseInt( tabindex, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						-1;
			}
		}
	}
});

// Some attributes require a special call on IE
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !support.hrefNormalized ) {
	// href/src property should get the full normalized URL (#10299/#12915)
	jQuery.each([ "href", "src" ], function( i, name ) {
		jQuery.propHooks[ name ] = {
			get: function( elem ) {
				return elem.getAttribute( name, 4 );
			}
		};
	});
}

// Support: Safari, IE9+
// mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});

// IE6/7 call enctype encoding
if ( !support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			i = 0,
			len = this.length,
			proceed = typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			i = 0,
			len = this.length,
			proceed = arguments.length === 0 || typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



var rvalidtokens = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;

jQuery.parseJSON = function( data ) {
	// Attempt to parse using the native JSON parser first
	if ( window.JSON && window.JSON.parse ) {
		// Support: Android 2.3
		// Workaround failure to string-cast null input
		return window.JSON.parse( data + "" );
	}

	var requireNonComma,
		depth = null,
		str = jQuery.trim( data + "" );

	// Guard against invalid (and possibly dangerous) input by ensuring that nothing remains
	// after removing valid tokens
	return str && !jQuery.trim( str.replace( rvalidtokens, function( token, comma, open, close ) {

		// Force termination if we see a misplaced comma
		if ( requireNonComma && comma ) {
			depth = 0;
		}

		// Perform no more replacements after returning to outermost depth
		if ( depth === 0 ) {
			return token;
		}

		// Commas must not follow "[", "{", or ","
		requireNonComma = open || comma;

		// Determine new depth
		// array/object open ("[" or "{"): depth += true - false (increment)
		// array/object close ("]" or "}"): depth += false - true (decrement)
		// other cases ("," or primitive): depth += true - true (numeric cast)
		depth += !close - !open;

		// Remove this token
		return "";
	}) ) ?
		( Function( "return " + str ) )() :
		jQuery.error( "Invalid JSON: " + data );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	try {
		if ( window.DOMParser ) { // Standard
			tmp = new DOMParser();
			xml = tmp.parseFromString( data, "text/xml" );
		} else { // IE
			xml = new ActiveXObject( "Microsoft.XMLDOM" );
			xml.async = "false";
			xml.loadXML( data );
		}
	} catch( e ) {
		xml = undefined;
	}
	if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType.charAt( 0 ) === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var deep, key,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {
	var firstDataType, ct, finalDataType, type,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // Cross-domain detection vars
			parts,
			// Loop variable
			i,
			// URL without anti-cache param
			cacheURL,
			// Response headers as string
			responseHeadersString,
			// timeout handle
			timeoutTimer,

			// To know if global events are to be dispatched
			fireGlobals,

			transport,
			// Response headers
			responseHeaders,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 ||
		(!support.reliableHiddenOffsets() &&
			((elem.style && elem.style.display) || jQuery.css( elem, "display" )) === "none");
};

jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;
			// Use .is(":disabled") so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject !== undefined ?
	// Support: IE6+
	function() {

		// XHR cannot access local files, always use ActiveX for that case
		return !this.isLocal &&

			// Support: IE7-8
			// oldIE XHR does not support non-RFC2616 methods (#13240)
			// See http://msdn.microsoft.com/en-us/library/ie/ms536648(v=vs.85).aspx
			// and http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9
			// Although this check for six methods instead of eight
			// since IE also does not support "trace" and "connect"
			/^(get|post|head|put|delete|options)$/i.test( this.type ) &&

			createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

var xhrId = 0,
	xhrCallbacks = {},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE<10
// Open requests must be manually aborted on unload (#5280)
if ( window.ActiveXObject ) {
	jQuery( window ).on( "unload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( undefined, true );
		}
	});
}

// Determine support properties
support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
xhrSupported = support.ajax = !!xhrSupported;

// Create transport if the browser can provide an xhr
if ( xhrSupported ) {

	jQuery.ajaxTransport(function( options ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !options.crossDomain || support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {
					var i,
						xhr = options.xhr(),
						id = ++xhrId;

					// Open the socket
					xhr.open( options.type, options.url, options.async, options.username, options.password );

					// Apply custom fields if provided
					if ( options.xhrFields ) {
						for ( i in options.xhrFields ) {
							xhr[ i ] = options.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( options.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( options.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !options.crossDomain && !headers["X-Requested-With"] ) {
						headers["X-Requested-With"] = "XMLHttpRequest";
					}

					// Set headers
					for ( i in headers ) {
						// Support: IE<9
						// IE's ActiveXObject throws a 'Type Mismatch' exception when setting
						// request header to a null-value.
						//
						// To keep consistent with other XHR implementations, cast the value
						// to string and ignore `undefined`.
						if ( headers[ i ] !== undefined ) {
							xhr.setRequestHeader( i, headers[ i ] + "" );
						}
					}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( options.hasContent && options.data ) || null );

					// Listener
					callback = function( _, isAbort ) {
						var status, statusText, responses;

						// Was never called and is aborted or complete
						if ( callback && ( isAbort || xhr.readyState === 4 ) ) {
							// Clean up
							delete xhrCallbacks[ id ];
							callback = undefined;
							xhr.onreadystatechange = jQuery.noop;

							// Abort manually if needed
							if ( isAbort ) {
								if ( xhr.readyState !== 4 ) {
									xhr.abort();
								}
							} else {
								responses = {};
								status = xhr.status;

								// Support: IE<10
								// Accessing binary-data responseText throws an exception
								// (#11426)
								if ( typeof xhr.responseText === "string" ) {
									responses.text = xhr.responseText;
								}

								// Firefox throws an exception when accessing
								// statusText for faulty cross-domain requests
								try {
									statusText = xhr.statusText;
								} catch( e ) {
									// We normalize with Webkit giving an empty statusText
									statusText = "";
								}

								// Filter status for non standard behaviors

								// If the request is local and we have data: assume a success
								// (success with no data won't get notified, that's the best we
								// can do given current implementations)
								if ( !status && options.isLocal && !options.crossDomain ) {
									status = responses.text ? 200 : 404;
								// IE - #1450: sometimes returns 1223 when it should be 204
								} else if ( status === 1223 ) {
									status = 204;
								}
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, xhr.getAllResponseHeaders() );
						}
					};

					if ( !options.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback );
					} else {
						// Add to the list of active xhr callbacks
						xhr.onreadystatechange = xhrCallbacks[ id ] = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback( undefined, true );
					}
				}
			};
		}
	});
}

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || jQuery("head")[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement("script");

				script.async = true;

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( script.parentNode ) {
							script.parentNode.removeChild( script );
						}

						// Dereference the script
						script = null;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};

				// Circumvent IE6 bugs with base elements (#2709 and #4378) by prepending
				// Use native DOM manipulation to avoid our domManip AJAX trickery
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( undefined, true );
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, response, type,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = jQuery.trim( url.slice( off, url.length ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};





var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			jQuery.inArray("auto", [ curCSSTop, curCSSLeft ] ) > -1;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			box = { top: 0, left: 0 },
			elem = this[ 0 ],
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// If we don't have gBCR, just use 0,0 rather than error
		// BlackBerry 5, iOS 3 (original iPhone)
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top  + ( win.pageYOffset || docElem.scrollTop )  - ( docElem.clientTop  || 0 ),
			left: box.left + ( win.pageXOffset || docElem.scrollLeft ) - ( docElem.clientLeft || 0 )
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			parentOffset = { top: 0, left: 0 },
			elem = this[ 0 ];

		// fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// we assume that getBoundingClientRect is available when computed position is fixed
			offset = elem.getBoundingClientRect();
		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top  += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		return {
			top:  offset.top  - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true)
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// getComputedStyle returns percent when specified for top/left/bottom/right
// rather than make the css module depend on the offset module, we just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// if curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in
// AMD (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

},{}],3:[function(require,module,exports){
/**
* Bootstrap v3.0.0 by @fat and @mdo
* Copyright 2013 Twitter Inc.
* Licensed under http://www.apache.org/licenses/LICENSE-2.0.
*
* Designed and built with all the love in the world by @mdo and @fat.
*/
if (!jQuery) { throw new Error("Bootstrap requires jQuery") }

/* ========================================================================
 * Bootstrap: transition.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#transitions
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================

  function transitionEnd() {
    var el = document.createElement('bootstrap')

    var transEndEventNames = {
      'WebkitTransition' : 'webkitTransitionEnd'
    , 'MozTransition'    : 'transitionend'
    , 'OTransition'      : 'oTransitionEnd otransitionend'
    , 'transition'       : 'transitionend'
    }

    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] }
      }
    }
  }

  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false, $el = this
    $(this).one($.support.transition.end, function () { called = true })
    var callback = function () { if (!called) $($el).trigger($.support.transition.end) }
    setTimeout(callback, duration)
    return this
  }

  $(function () {
    $.support.transition = transitionEnd()
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#alerts
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // ALERT CLASS DEFINITION
  // ======================

  var dismiss = '[data-dismiss="alert"]'
  var Alert   = function (el) {
    $(el).on('click', dismiss, this.close)
  }

  Alert.prototype.close = function (e) {
    var $this    = $(this)
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = $(selector)

    if (e) e.preventDefault()

    if (!$parent.length) {
      $parent = $this.hasClass('alert') ? $this : $this.parent()
    }

    $parent.trigger(e = $.Event('close.bs.alert'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      $parent.trigger('closed.bs.alert').remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent
        .one($.support.transition.end, removeElement)
        .emulateTransitionEnd(150) :
      removeElement()
  }


  // ALERT PLUGIN DEFINITION
  // =======================

  var old = $.fn.alert

  $.fn.alert = function (option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.alert')

      if (!data) $this.data('bs.alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.alert.Constructor = Alert


  // ALERT NO CONFLICT
  // =================

  $.fn.alert.noConflict = function () {
    $.fn.alert = old
    return this
  }


  // ALERT DATA-API
  // ==============

  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(window.jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#buttons
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================

  var Button = function (element, options) {
    this.$element = $(element)
    this.options  = $.extend({}, Button.DEFAULTS, options)
  }

  Button.DEFAULTS = {
    loadingText: 'loading...'
  }

  Button.prototype.setState = function (state) {
    var d    = 'disabled'
    var $el  = this.$element
    var val  = $el.is('input') ? 'val' : 'html'
    var data = $el.data()

    state = state + 'Text'

    if (!data.resetText) $el.data('resetText', $el[val]())

    $el[val](data[state] || this.options[state])

    // push to event loop to allow forms to submit
    setTimeout(function () {
      state == 'loadingText' ?
        $el.addClass(d).attr(d, d) :
        $el.removeClass(d).removeAttr(d);
    }, 0)
  }

  Button.prototype.toggle = function () {
    var $parent = this.$element.closest('[data-toggle="buttons"]')

    if ($parent.length) {
      var $input = this.$element.find('input')
        .prop('checked', !this.$element.hasClass('active'))
        .trigger('change')
      if ($input.prop('type') === 'radio') $parent.find('.active').removeClass('active')
    }

    this.$element.toggleClass('active')
  }


  // BUTTON PLUGIN DEFINITION
  // ========================

  var old = $.fn.button

  $.fn.button = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.button')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.button', (data = new Button(this, options)))

      if (option == 'toggle') data.toggle()
      else if (option) data.setState(option)
    })
  }

  $.fn.button.Constructor = Button


  // BUTTON NO CONFLICT
  // ==================

  $.fn.button.noConflict = function () {
    $.fn.button = old
    return this
  }


  // BUTTON DATA-API
  // ===============

  $(document).on('click.bs.button.data-api', '[data-toggle^=button]', function (e) {
    var $btn = $(e.target)
    if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
    $btn.button('toggle')
    e.preventDefault()
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#carousel
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // CAROUSEL CLASS DEFINITION
  // =========================

  var Carousel = function (element, options) {
    this.$element    = $(element)
    this.$indicators = this.$element.find('.carousel-indicators')
    this.options     = options
    this.paused      =
    this.sliding     =
    this.interval    =
    this.$active     =
    this.$items      = null

    this.options.pause == 'hover' && this.$element
      .on('mouseenter', $.proxy(this.pause, this))
      .on('mouseleave', $.proxy(this.cycle, this))
  }

  Carousel.DEFAULTS = {
    interval: 5000
  , pause: 'hover'
  , wrap: true
  }

  Carousel.prototype.cycle =  function (e) {
    e || (this.paused = false)

    this.interval && clearInterval(this.interval)

    this.options.interval
      && !this.paused
      && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

    return this
  }

  Carousel.prototype.getActiveIndex = function () {
    this.$active = this.$element.find('.item.active')
    this.$items  = this.$active.parent().children()

    return this.$items.index(this.$active)
  }

  Carousel.prototype.to = function (pos) {
    var that        = this
    var activeIndex = this.getActiveIndex()

    if (pos > (this.$items.length - 1) || pos < 0) return

    if (this.sliding)       return this.$element.one('slid', function () { that.to(pos) })
    if (activeIndex == pos) return this.pause().cycle()

    return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]))
  }

  Carousel.prototype.pause = function (e) {
    e || (this.paused = true)

    if (this.$element.find('.next, .prev').length && $.support.transition.end) {
      this.$element.trigger($.support.transition.end)
      this.cycle(true)
    }

    this.interval = clearInterval(this.interval)

    return this
  }

  Carousel.prototype.next = function () {
    if (this.sliding) return
    return this.slide('next')
  }

  Carousel.prototype.prev = function () {
    if (this.sliding) return
    return this.slide('prev')
  }

  Carousel.prototype.slide = function (type, next) {
    var $active   = this.$element.find('.item.active')
    var $next     = next || $active[type]()
    var isCycling = this.interval
    var direction = type == 'next' ? 'left' : 'right'
    var fallback  = type == 'next' ? 'first' : 'last'
    var that      = this

    if (!$next.length) {
      if (!this.options.wrap) return
      $next = this.$element.find('.item')[fallback]()
    }

    this.sliding = true

    isCycling && this.pause()

    var e = $.Event('slide.bs.carousel', { relatedTarget: $next[0], direction: direction })

    if ($next.hasClass('active')) return

    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active')
      this.$element.one('slid', function () {
        var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()])
        $nextIndicator && $nextIndicator.addClass('active')
      })
    }

    if ($.support.transition && this.$element.hasClass('slide')) {
      this.$element.trigger(e)
      if (e.isDefaultPrevented()) return
      $next.addClass(type)
      $next[0].offsetWidth // force reflow
      $active.addClass(direction)
      $next.addClass(direction)
      $active
        .one($.support.transition.end, function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () { that.$element.trigger('slid') }, 0)
        })
        .emulateTransitionEnd(600)
    } else {
      this.$element.trigger(e)
      if (e.isDefaultPrevented()) return
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger('slid')
    }

    isCycling && this.cycle()

    return this
  }


  // CAROUSEL PLUGIN DEFINITION
  // ==========================

  var old = $.fn.carousel

  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.carousel')
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
      var action  = typeof option == 'string' ? option : options.slide

      if (!data) $this.data('bs.carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (action) data[action]()
      else if (options.interval) data.pause().cycle()
    })
  }

  $.fn.carousel.Constructor = Carousel


  // CAROUSEL NO CONFLICT
  // ====================

  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old
    return this
  }


  // CAROUSEL DATA-API
  // =================

  $(document).on('click.bs.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
    var $this   = $(this), href
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
    var options = $.extend({}, $target.data(), $this.data())
    var slideIndex = $this.attr('data-slide-to')
    if (slideIndex) options.interval = false

    $target.carousel(options)

    if (slideIndex = $this.attr('data-slide-to')) {
      $target.data('bs.carousel').to(slideIndex)
    }

    e.preventDefault()
  })

  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this)
      $carousel.carousel($carousel.data())
    })
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#collapse
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================

  var Collapse = function (element, options) {
    this.$element      = $(element)
    this.options       = $.extend({}, Collapse.DEFAULTS, options)
    this.transitioning = null

    if (this.options.parent) this.$parent = $(this.options.parent)
    if (this.options.toggle) this.toggle()
  }

  Collapse.DEFAULTS = {
    toggle: true
  }

  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width')
    return hasWidth ? 'width' : 'height'
  }

  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in')) return

    var startEvent = $.Event('show.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var actives = this.$parent && this.$parent.find('> .panel > .in')

    if (actives && actives.length) {
      var hasData = actives.data('bs.collapse')
      if (hasData && hasData.transitioning) return
      actives.collapse('hide')
      hasData || actives.data('bs.collapse', null)
    }

    var dimension = this.dimension()

    this.$element
      .removeClass('collapse')
      .addClass('collapsing')
      [dimension](0)

    this.transitioning = 1

    var complete = function () {
      this.$element
        .removeClass('collapsing')
        .addClass('in')
        [dimension]('auto')
      this.transitioning = 0
      this.$element.trigger('shown.bs.collapse')
    }

    if (!$.support.transition) return complete.call(this)

    var scrollSize = $.camelCase(['scroll', dimension].join('-'))

    this.$element
      .one($.support.transition.end, $.proxy(complete, this))
      .emulateTransitionEnd(350)
      [dimension](this.$element[0][scrollSize])
  }

  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in')) return

    var startEvent = $.Event('hide.bs.collapse')
    this.$element.trigger(startEvent)
    if (startEvent.isDefaultPrevented()) return

    var dimension = this.dimension()

    this.$element
      [dimension](this.$element[dimension]())
      [0].offsetHeight

    this.$element
      .addClass('collapsing')
      .removeClass('collapse')
      .removeClass('in')

    this.transitioning = 1

    var complete = function () {
      this.transitioning = 0
      this.$element
        .trigger('hidden.bs.collapse')
        .removeClass('collapsing')
        .addClass('collapse')
    }

    if (!$.support.transition) return complete.call(this)

    this.$element
      [dimension](0)
      .one($.support.transition.end, $.proxy(complete, this))
      .emulateTransitionEnd(350)
  }

  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']()
  }


  // COLLAPSE PLUGIN DEFINITION
  // ==========================

  var old = $.fn.collapse

  $.fn.collapse = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.collapse')
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.collapse.Constructor = Collapse


  // COLLAPSE NO CONFLICT
  // ====================

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


  // COLLAPSE DATA-API
  // =================

  $(document).on('click.bs.collapse.data-api', '[data-toggle=collapse]', function (e) {
    var $this   = $(this), href
    var target  = $this.attr('data-target')
        || e.preventDefault()
        || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') //strip for ie7
    var $target = $(target)
    var data    = $target.data('bs.collapse')
    var option  = data ? 'toggle' : $this.data()
    var parent  = $this.attr('data-parent')
    var $parent = parent && $(parent)

    if (!data || !data.transitioning) {
      if ($parent) $parent.find('[data-toggle=collapse][data-parent="' + parent + '"]').not($this).addClass('collapsed')
      $this[$target.hasClass('in') ? 'addClass' : 'removeClass']('collapsed')
    }

    $target.collapse(option)
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#dropdowns
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // DROPDOWN CLASS DEFINITION
  // =========================

  var backdrop = '.dropdown-backdrop'
  var toggle   = '[data-toggle=dropdown]'
  var Dropdown = function (element) {
    var $el = $(element).on('click.bs.dropdown', this.toggle)
  }

  Dropdown.prototype.toggle = function (e) {
    var $this = $(this)

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    clearMenus()

    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we we use a backdrop because click events don't delegate
        $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus)
      }

      $parent.trigger(e = $.Event('show.bs.dropdown'))

      if (e.isDefaultPrevented()) return

      $parent
        .toggleClass('open')
        .trigger('shown.bs.dropdown')

      $this.focus()
    }

    return false
  }

  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27)/.test(e.keyCode)) return

    var $this = $(this)

    e.preventDefault()
    e.stopPropagation()

    if ($this.is('.disabled, :disabled')) return

    var $parent  = getParent($this)
    var isActive = $parent.hasClass('open')

    if (!isActive || (isActive && e.keyCode == 27)) {
      if (e.which == 27) $parent.find(toggle).focus()
      return $this.click()
    }

    var $items = $('[role=menu] li:not(.divider):visible a', $parent)

    if (!$items.length) return

    var index = $items.index($items.filter(':focus'))

    if (e.keyCode == 38 && index > 0)                 index--                        // up
    if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
    if (!~index)                                      index=0

    $items.eq(index).focus()
  }

  function clearMenus() {
    $(backdrop).remove()
    $(toggle).each(function (e) {
      var $parent = getParent($(this))
      if (!$parent.hasClass('open')) return
      $parent.trigger(e = $.Event('hide.bs.dropdown'))
      if (e.isDefaultPrevented()) return
      $parent.removeClass('open').trigger('hidden.bs.dropdown')
    })
  }

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }


  // DROPDOWN PLUGIN DEFINITION
  // ==========================

  var old = $.fn.dropdown

  $.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('dropdown')

      if (!data) $this.data('dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.dropdown.Constructor = Dropdown


  // DROPDOWN NO CONFLICT
  // ====================

  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old
    return this
  }


  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================

  $(document)
    .on('click.bs.dropdown.data-api', clearMenus)
    .on('click.bs.dropdown.data-api', '.dropdown form', function (e) { e.stopPropagation() })
    .on('click.bs.dropdown.data-api'  , toggle, Dropdown.prototype.toggle)
    .on('keydown.bs.dropdown.data-api', toggle + ', [role=menu]' , Dropdown.prototype.keydown)

}(window.jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#modals
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options   = options
    this.$element  = $(element)
    this.$backdrop =
    this.isShown   = null

    if (this.options.remote) this.$element.load(this.options.remote)
  }

  Modal.DEFAULTS = {
      backdrop: true
    , keyboard: true
    , show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this[!this.isShown ? 'show' : 'hide'](_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.escape()

    this.$element.on('click.dismiss.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(document.body) // don't move modals dom position
      }

      that.$element.show()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element
        .addClass('in')
        .attr('aria-hidden', false)

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$element.find('.modal-dialog') // wait for modal to slide in
          .one($.support.transition.end, function () {
            that.$element.focus().trigger(e)
          })
          .emulateTransitionEnd(300) :
        that.$element.focus().trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .attr('aria-hidden', true)
      .off('click.dismiss.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one($.support.transition.end, $.proxy(this.hideModal, this))
        .emulateTransitionEnd(300) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
          this.$element.focus()
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keyup.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keyup.dismiss.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.removeBackdrop()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that    = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(document.body)

      this.$element.on('click.dismiss.modal', $.proxy(function (e) {
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus.call(this.$element[0])
          : this.hide.call(this)
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one($.support.transition.end, callback)
          .emulateTransitionEnd(150) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      $.support.transition && this.$element.hasClass('fade')?
        this.$backdrop
          .one($.support.transition.end, callback)
          .emulateTransitionEnd(150) :
        callback()

    } else if (callback) {
      callback()
    }
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  var old = $.fn.modal

  $.fn.modal = function (option, _relatedTarget) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this   = $(this)
    var href    = $this.attr('href')
    var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
    var option  = $target.data('modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    e.preventDefault()

    $target
      .modal(option, this)
      .one('hide', function () {
        $this.is(':visible') && $this.focus()
      })
  })

  $(document)
    .on('show.bs.modal',  '.modal', function () { $(document.body).addClass('modal-open') })
    .on('hidden.bs.modal', '.modal', function () { $(document.body).removeClass('modal-open') })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================

  var Tooltip = function (element, options) {
    this.type       =
    this.options    =
    this.enabled    =
    this.timeout    =
    this.hoverState =
    this.$element   = null

    this.init('tooltip', element, options)
  }

  Tooltip.DEFAULTS = {
    animation: true
  , placement: 'top'
  , selector: false
  , template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
  , trigger: 'hover focus'
  , title: ''
  , delay: 0
  , html: false
  , container: false
  }

  Tooltip.prototype.init = function (type, element, options) {
    this.enabled  = true
    this.type     = type
    this.$element = $(element)
    this.options  = this.getOptions(options)

    var triggers = this.options.trigger.split(' ')

    for (var i = triggers.length; i--;) {
      var trigger = triggers[i]

      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
      } else if (trigger != 'manual') {
        var eventIn  = trigger == 'hover' ? 'mouseenter' : 'focus'
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'blur'

        this.$element.on(eventIn  + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
      }
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS
  }

  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options)

    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay
      , hide: options.delay
      }
    }

    return options
  }

  Tooltip.prototype.getDelegateOptions = function () {
    var options  = {}
    var defaults = this.getDefaults()

    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value) options[key] = value
    })

    return options
  }

  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type)

    clearTimeout(self.timeout)

    self.hoverState = 'in'

    if (!self.options.delay || !self.options.delay.show) return self.show()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in') self.show()
    }, self.options.delay.show)
  }

  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ?
      obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type)

    clearTimeout(self.timeout)

    self.hoverState = 'out'

    if (!self.options.delay || !self.options.delay.hide) return self.hide()

    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out') self.hide()
    }, self.options.delay.hide)
  }

  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.'+ this.type)

    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e)

      if (e.isDefaultPrevented()) return

      var $tip = this.tip()

      this.setContent()

      if (this.options.animation) $tip.addClass('fade')

      var placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      var autoToken = /\s?auto?\s?/i
      var autoPlace = autoToken.test(placement)
      if (autoPlace) placement = placement.replace(autoToken, '') || 'top'

      $tip
        .detach()
        .css({ top: 0, left: 0, display: 'block' })
        .addClass(placement)

      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

      var pos          = this.getPosition()
      var actualWidth  = $tip[0].offsetWidth
      var actualHeight = $tip[0].offsetHeight

      if (autoPlace) {
        var $parent = this.$element.parent()

        var orgPlacement = placement
        var docScroll    = document.documentElement.scrollTop || document.body.scrollTop
        var parentWidth  = this.options.container == 'body' ? window.innerWidth  : $parent.outerWidth()
        var parentHeight = this.options.container == 'body' ? window.innerHeight : $parent.outerHeight()
        var parentLeft   = this.options.container == 'body' ? 0 : $parent.offset().left

        placement = placement == 'bottom' && pos.top   + pos.height  + actualHeight - docScroll > parentHeight  ? 'top'    :
                    placement == 'top'    && pos.top   - docScroll   - actualHeight < 0                         ? 'bottom' :
                    placement == 'right'  && pos.right + actualWidth > parentWidth                              ? 'left'   :
                    placement == 'left'   && pos.left  - actualWidth < parentLeft                               ? 'right'  :
                    placement

        $tip
          .removeClass(orgPlacement)
          .addClass(placement)
      }

      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

      this.applyPlacement(calculatedOffset, placement)
      this.$element.trigger('shown.bs.' + this.type)
    }
  }

  Tooltip.prototype.applyPlacement = function(offset, placement) {
    var replace
    var $tip   = this.tip()
    var width  = $tip[0].offsetWidth
    var height = $tip[0].offsetHeight

    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10)
    var marginLeft = parseInt($tip.css('margin-left'), 10)

    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))  marginTop  = 0
    if (isNaN(marginLeft)) marginLeft = 0

    offset.top  = offset.top  + marginTop
    offset.left = offset.left + marginLeft

    $tip
      .offset(offset)
      .addClass('in')

    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth  = $tip[0].offsetWidth
    var actualHeight = $tip[0].offsetHeight

    if (placement == 'top' && actualHeight != height) {
      replace = true
      offset.top = offset.top + height - actualHeight
    }

    if (/bottom|top/.test(placement)) {
      var delta = 0

      if (offset.left < 0) {
        delta       = offset.left * -2
        offset.left = 0

        $tip.offset(offset)

        actualWidth  = $tip[0].offsetWidth
        actualHeight = $tip[0].offsetHeight
      }

      this.replaceArrow(delta - width + actualWidth, actualWidth, 'left')
    } else {
      this.replaceArrow(actualHeight - height, actualHeight, 'top')
    }

    if (replace) $tip.offset(offset)
  }

  Tooltip.prototype.replaceArrow = function(delta, dimension, position) {
    this.arrow().css(position, delta ? (50 * (1 - delta / dimension) + "%") : '')
  }

  Tooltip.prototype.setContent = function () {
    var $tip  = this.tip()
    var title = this.getTitle()

    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  Tooltip.prototype.hide = function () {
    var that = this
    var $tip = this.tip()
    var e    = $.Event('hide.bs.' + this.type)

    function complete() {
      if (that.hoverState != 'in') $tip.detach()
    }

    this.$element.trigger(e)

    if (e.isDefaultPrevented()) return

    $tip.removeClass('in')

    $.support.transition && this.$tip.hasClass('fade') ?
      $tip
        .one($.support.transition.end, complete)
        .emulateTransitionEnd(150) :
      complete()

    this.$element.trigger('hidden.bs.' + this.type)

    return this
  }

  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element
    if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
    }
  }

  Tooltip.prototype.hasContent = function () {
    return this.getTitle()
  }

  Tooltip.prototype.getPosition = function () {
    var el = this.$element[0]
    return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
      width: el.offsetWidth
    , height: el.offsetHeight
    }, this.$element.offset())
  }

  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2  } :
           placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
        /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width   }
  }

  Tooltip.prototype.getTitle = function () {
    var title
    var $e = this.$element
    var o  = this.options

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  Tooltip.prototype.tip = function () {
    return this.$tip = this.$tip || $(this.options.template)
  }

  Tooltip.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow')
  }

  Tooltip.prototype.validate = function () {
    if (!this.$element[0].parentNode) {
      this.hide()
      this.$element = null
      this.options  = null
    }
  }

  Tooltip.prototype.enable = function () {
    this.enabled = true
  }

  Tooltip.prototype.disable = function () {
    this.enabled = false
  }

  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled
  }

  Tooltip.prototype.toggle = function (e) {
    var self = e ? $(e.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type) : this
    self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
  }

  Tooltip.prototype.destroy = function () {
    this.hide().$element.off('.' + this.type).removeData('bs.' + this.type)
  }


  // TOOLTIP PLUGIN DEFINITION
  // =========================

  var old = $.fn.tooltip

  $.fn.tooltip = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.tooltip')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tooltip.Constructor = Tooltip


  // TOOLTIP NO CONFLICT
  // ===================

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old
    return this
  }

}(window.jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#popovers
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================

  var Popover = function (element, options) {
    this.init('popover', element, options)
  }

  if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js')

  Popover.DEFAULTS = $.extend({} , $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right'
  , trigger: 'click'
  , content: ''
  , template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  })


  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

  Popover.prototype.constructor = Popover

  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS
  }

  Popover.prototype.setContent = function () {
    var $tip    = this.tip()
    var title   = this.getTitle()
    var content = this.getContent()

    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
    $tip.find('.popover-content')[this.options.html ? 'html' : 'text'](content)

    $tip.removeClass('fade top bottom left right in')

    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html()) $tip.find('.popover-title').hide()
  }

  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent()
  }

  Popover.prototype.getContent = function () {
    var $e = this.$element
    var o  = this.options

    return $e.attr('data-content')
      || (typeof o.content == 'function' ?
            o.content.call($e[0]) :
            o.content)
  }

  Popover.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.arrow')
  }

  Popover.prototype.tip = function () {
    if (!this.$tip) this.$tip = $(this.options.template)
    return this.$tip
  }


  // POPOVER PLUGIN DEFINITION
  // =========================

  var old = $.fn.popover

  $.fn.popover = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.popover')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.popover.Constructor = Popover


  // POPOVER NO CONFLICT
  // ===================

  $.fn.popover.noConflict = function () {
    $.fn.popover = old
    return this
  }

}(window.jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#scrollspy
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // SCROLLSPY CLASS DEFINITION
  // ==========================

  function ScrollSpy(element, options) {
    var href
    var process  = $.proxy(this.process, this)

    this.$element       = $(element).is('body') ? $(window) : $(element)
    this.$body          = $('body')
    this.$scrollElement = this.$element.on('scroll.bs.scroll-spy.data-api', process)
    this.options        = $.extend({}, ScrollSpy.DEFAULTS, options)
    this.selector       = (this.options.target
      || ((href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
      || '') + ' .nav li > a'
    this.offsets        = $([])
    this.targets        = $([])
    this.activeTarget   = null

    this.refresh()
    this.process()
  }

  ScrollSpy.DEFAULTS = {
    offset: 10
  }

  ScrollSpy.prototype.refresh = function () {
    var offsetMethod = this.$element[0] == window ? 'offset' : 'position'

    this.offsets = $([])
    this.targets = $([])

    var self     = this
    var $targets = this.$body
      .find(this.selector)
      .map(function () {
        var $el   = $(this)
        var href  = $el.data('target') || $el.attr('href')
        var $href = /^#\w/.test(href) && $(href)

        return ($href
          && $href.length
          && [[ $href[offsetMethod]().top + (!$.isWindow(self.$scrollElement.get(0)) && self.$scrollElement.scrollTop()), href ]]) || null
      })
      .sort(function (a, b) { return a[0] - b[0] })
      .each(function () {
        self.offsets.push(this[0])
        self.targets.push(this[1])
      })
  }

  ScrollSpy.prototype.process = function () {
    var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset
    var scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight
    var maxScroll    = scrollHeight - this.$scrollElement.height()
    var offsets      = this.offsets
    var targets      = this.targets
    var activeTarget = this.activeTarget
    var i

    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets.last()[0]) && this.activate(i)
    }

    for (i = offsets.length; i--;) {
      activeTarget != targets[i]
        && scrollTop >= offsets[i]
        && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
        && this.activate( targets[i] )
    }
  }

  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target

    $(this.selector)
      .parents('.active')
      .removeClass('active')

    var selector = this.selector
      + '[data-target="' + target + '"],'
      + this.selector + '[href="' + target + '"]'

    var active = $(selector)
      .parents('li')
      .addClass('active')

    if (active.parent('.dropdown-menu').length)  {
      active = active
        .closest('li.dropdown')
        .addClass('active')
    }

    active.trigger('activate')
  }


  // SCROLLSPY PLUGIN DEFINITION
  // ===========================

  var old = $.fn.scrollspy

  $.fn.scrollspy = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.scrollspy')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.scrollspy.Constructor = ScrollSpy


  // SCROLLSPY NO CONFLICT
  // =====================

  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old
    return this
  }


  // SCROLLSPY DATA-API
  // ==================

  $(window).on('load', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      $spy.scrollspy($spy.data())
    })
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#tabs
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // TAB CLASS DEFINITION
  // ====================

  var Tab = function (element) {
    this.element = $(element)
  }

  Tab.prototype.show = function () {
    var $this    = this.element
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    if ($this.parent('li').hasClass('active')) return

    var previous = $ul.find('.active:last a')[0]
    var e        = $.Event('show.bs.tab', {
      relatedTarget: previous
    })

    $this.trigger(e)

    if (e.isDefaultPrevented()) return

    var $target = $(selector)

    this.activate($this.parent('li'), $ul)
    this.activate($target, $target.parent(), function () {
      $this.trigger({
        type: 'shown.bs.tab'
      , relatedTarget: previous
      })
    })
  }

  Tab.prototype.activate = function (element, container, callback) {
    var $active    = container.find('> .active')
    var transition = callback
      && $.support.transition
      && $active.hasClass('fade')

    function next() {
      $active
        .removeClass('active')
        .find('> .dropdown-menu > .active')
        .removeClass('active')

      element.addClass('active')

      if (transition) {
        element[0].offsetWidth // reflow for transition
        element.addClass('in')
      } else {
        element.removeClass('fade')
      }

      if (element.parent('.dropdown-menu')) {
        element.closest('li.dropdown').addClass('active')
      }

      callback && callback()
    }

    transition ?
      $active
        .one($.support.transition.end, next)
        .emulateTransitionEnd(150) :
      next()

    $active.removeClass('in')
  }


  // TAB PLUGIN DEFINITION
  // =====================

  var old = $.fn.tab

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
      var data  = $this.data('bs.tab')

      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tab.Constructor = Tab


  // TAB NO CONFLICT
  // ===============

  $.fn.tab.noConflict = function () {
    $.fn.tab = old
    return this
  }


  // TAB DATA-API
  // ============

  $(document).on('click.bs.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

}(window.jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#affix
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */


+function ($) { "use strict";

  // AFFIX CLASS DEFINITION
  // ======================

  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options)
    this.$window = $(window)
      .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
      .on('click.bs.affix.data-api',  $.proxy(this.checkPositionWithEventLoop, this))

    this.$element = $(element)
    this.affixed  =
    this.unpin    = null

    this.checkPosition()
  }

  Affix.RESET = 'affix affix-top affix-bottom'

  Affix.DEFAULTS = {
    offset: 0
  }

  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1)
  }

  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var scrollHeight = $(document).height()
    var scrollTop    = this.$window.scrollTop()
    var position     = this.$element.offset()
    var offset       = this.options.offset
    var offsetTop    = offset.top
    var offsetBottom = offset.bottom

    if (typeof offset != 'object')         offsetBottom = offsetTop = offset
    if (typeof offsetTop == 'function')    offsetTop    = offset.top()
    if (typeof offsetBottom == 'function') offsetBottom = offset.bottom()

    var affix = this.unpin   != null && (scrollTop + this.unpin <= position.top) ? false :
                offsetBottom != null && (position.top + this.$element.height() >= scrollHeight - offsetBottom) ? 'bottom' :
                offsetTop    != null && (scrollTop <= offsetTop) ? 'top' : false

    if (this.affixed === affix) return
    if (this.unpin) this.$element.css('top', '')

    this.affixed = affix
    this.unpin   = affix == 'bottom' ? position.top - scrollTop : null

    this.$element.removeClass(Affix.RESET).addClass('affix' + (affix ? '-' + affix : ''))

    if (affix == 'bottom') {
      this.$element.offset({ top: document.body.offsetHeight - offsetBottom - this.$element.height() })
    }
  }


  // AFFIX PLUGIN DEFINITION
  // =======================

  var old = $.fn.affix

  $.fn.affix = function (option) {
    return this.each(function () {
      var $this   = $(this)
      var data    = $this.data('bs.affix')
      var options = typeof option == 'object' && option

      if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.affix.Constructor = Affix


  // AFFIX NO CONFLICT
  // =================

  $.fn.affix.noConflict = function () {
    $.fn.affix = old
    return this
  }


  // AFFIX DATA-API
  // ==============

  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this)
      var data = $spy.data()

      data.offset = data.offset || {}

      if (data.offsetBottom) data.offset.bottom = data.offsetBottom
      if (data.offsetTop)    data.offset.top    = data.offsetTop

      $spy.affix(data)
    })
  })

}(window.jQuery);

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkb2MvbWFpbi5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnkvZGlzdC9qcXVlcnkuanMiLCJub2RlX21vZHVsZXMvdHdpdHRlci1ib290c3RyYXAtMy4wLjAvZGlzdC9qcy9ib290c3RyYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGtVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIkID0galF1ZXJ5ID0gcmVxdWlyZShcImpxdWVyeVwiKTtcblxucmVxdWlyZShcIi4uL25vZGVfbW9kdWxlcy90d2l0dGVyLWJvb3RzdHJhcC0zLjAuMC9kaXN0L2pzL2Jvb3RzdHJhcC5qc1wiKTtcblxuXG4iLCIvKiFcbiAqIGpRdWVyeSBKYXZhU2NyaXB0IExpYnJhcnkgdjEuMTEuMVxuICogaHR0cDovL2pxdWVyeS5jb20vXG4gKlxuICogSW5jbHVkZXMgU2l6emxlLmpzXG4gKiBodHRwOi8vc2l6emxlanMuY29tL1xuICpcbiAqIENvcHlyaWdodCAyMDA1LCAyMDE0IGpRdWVyeSBGb3VuZGF0aW9uLCBJbmMuIGFuZCBvdGhlciBjb250cmlidXRvcnNcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogaHR0cDovL2pxdWVyeS5vcmcvbGljZW5zZVxuICpcbiAqIERhdGU6IDIwMTQtMDUtMDFUMTc6NDJaXG4gKi9cblxuKGZ1bmN0aW9uKCBnbG9iYWwsIGZhY3RvcnkgKSB7XG5cblx0aWYgKCB0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gXCJvYmplY3RcIiApIHtcblx0XHQvLyBGb3IgQ29tbW9uSlMgYW5kIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHdoZXJlIGEgcHJvcGVyIHdpbmRvdyBpcyBwcmVzZW50LFxuXHRcdC8vIGV4ZWN1dGUgdGhlIGZhY3RvcnkgYW5kIGdldCBqUXVlcnlcblx0XHQvLyBGb3IgZW52aXJvbm1lbnRzIHRoYXQgZG8gbm90IGluaGVyZW50bHkgcG9zc2VzIGEgd2luZG93IHdpdGggYSBkb2N1bWVudFxuXHRcdC8vIChzdWNoIGFzIE5vZGUuanMpLCBleHBvc2UgYSBqUXVlcnktbWFraW5nIGZhY3RvcnkgYXMgbW9kdWxlLmV4cG9ydHNcblx0XHQvLyBUaGlzIGFjY2VudHVhdGVzIHRoZSBuZWVkIGZvciB0aGUgY3JlYXRpb24gb2YgYSByZWFsIHdpbmRvd1xuXHRcdC8vIGUuZy4gdmFyIGpRdWVyeSA9IHJlcXVpcmUoXCJqcXVlcnlcIikod2luZG93KTtcblx0XHQvLyBTZWUgdGlja2V0ICMxNDU0OSBmb3IgbW9yZSBpbmZvXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBnbG9iYWwuZG9jdW1lbnQgP1xuXHRcdFx0ZmFjdG9yeSggZ2xvYmFsLCB0cnVlICkgOlxuXHRcdFx0ZnVuY3Rpb24oIHcgKSB7XG5cdFx0XHRcdGlmICggIXcuZG9jdW1lbnQgKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcImpRdWVyeSByZXF1aXJlcyBhIHdpbmRvdyB3aXRoIGEgZG9jdW1lbnRcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBmYWN0b3J5KCB3ICk7XG5cdFx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdGZhY3RvcnkoIGdsb2JhbCApO1xuXHR9XG5cbi8vIFBhc3MgdGhpcyBpZiB3aW5kb3cgaXMgbm90IGRlZmluZWQgeWV0XG59KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB0aGlzLCBmdW5jdGlvbiggd2luZG93LCBub0dsb2JhbCApIHtcblxuLy8gQ2FuJ3QgZG8gdGhpcyBiZWNhdXNlIHNldmVyYWwgYXBwcyBpbmNsdWRpbmcgQVNQLk5FVCB0cmFjZVxuLy8gdGhlIHN0YWNrIHZpYSBhcmd1bWVudHMuY2FsbGVyLmNhbGxlZSBhbmQgRmlyZWZveCBkaWVzIGlmXG4vLyB5b3UgdHJ5IHRvIHRyYWNlIHRocm91Z2ggXCJ1c2Ugc3RyaWN0XCIgY2FsbCBjaGFpbnMuICgjMTMzMzUpXG4vLyBTdXBwb3J0OiBGaXJlZm94IDE4K1xuLy9cblxudmFyIGRlbGV0ZWRJZHMgPSBbXTtcblxudmFyIHNsaWNlID0gZGVsZXRlZElkcy5zbGljZTtcblxudmFyIGNvbmNhdCA9IGRlbGV0ZWRJZHMuY29uY2F0O1xuXG52YXIgcHVzaCA9IGRlbGV0ZWRJZHMucHVzaDtcblxudmFyIGluZGV4T2YgPSBkZWxldGVkSWRzLmluZGV4T2Y7XG5cbnZhciBjbGFzczJ0eXBlID0ge307XG5cbnZhciB0b1N0cmluZyA9IGNsYXNzMnR5cGUudG9TdHJpbmc7XG5cbnZhciBoYXNPd24gPSBjbGFzczJ0eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgc3VwcG9ydCA9IHt9O1xuXG5cblxudmFyXG5cdHZlcnNpb24gPSBcIjEuMTEuMVwiLFxuXG5cdC8vIERlZmluZSBhIGxvY2FsIGNvcHkgb2YgalF1ZXJ5XG5cdGpRdWVyeSA9IGZ1bmN0aW9uKCBzZWxlY3RvciwgY29udGV4dCApIHtcblx0XHQvLyBUaGUgalF1ZXJ5IG9iamVjdCBpcyBhY3R1YWxseSBqdXN0IHRoZSBpbml0IGNvbnN0cnVjdG9yICdlbmhhbmNlZCdcblx0XHQvLyBOZWVkIGluaXQgaWYgalF1ZXJ5IGlzIGNhbGxlZCAoanVzdCBhbGxvdyBlcnJvciB0byBiZSB0aHJvd24gaWYgbm90IGluY2x1ZGVkKVxuXHRcdHJldHVybiBuZXcgalF1ZXJ5LmZuLmluaXQoIHNlbGVjdG9yLCBjb250ZXh0ICk7XG5cdH0sXG5cblx0Ly8gU3VwcG9ydDogQW5kcm9pZDw0LjEsIElFPDlcblx0Ly8gTWFrZSBzdXJlIHdlIHRyaW0gQk9NIGFuZCBOQlNQXG5cdHJ0cmltID0gL15bXFxzXFx1RkVGRlxceEEwXSt8W1xcc1xcdUZFRkZcXHhBMF0rJC9nLFxuXG5cdC8vIE1hdGNoZXMgZGFzaGVkIHN0cmluZyBmb3IgY2FtZWxpemluZ1xuXHRybXNQcmVmaXggPSAvXi1tcy0vLFxuXHRyZGFzaEFscGhhID0gLy0oW1xcZGEtel0pL2dpLFxuXG5cdC8vIFVzZWQgYnkgalF1ZXJ5LmNhbWVsQ2FzZSBhcyBjYWxsYmFjayB0byByZXBsYWNlKClcblx0ZmNhbWVsQ2FzZSA9IGZ1bmN0aW9uKCBhbGwsIGxldHRlciApIHtcblx0XHRyZXR1cm4gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdH07XG5cbmpRdWVyeS5mbiA9IGpRdWVyeS5wcm90b3R5cGUgPSB7XG5cdC8vIFRoZSBjdXJyZW50IHZlcnNpb24gb2YgalF1ZXJ5IGJlaW5nIHVzZWRcblx0anF1ZXJ5OiB2ZXJzaW9uLFxuXG5cdGNvbnN0cnVjdG9yOiBqUXVlcnksXG5cblx0Ly8gU3RhcnQgd2l0aCBhbiBlbXB0eSBzZWxlY3RvclxuXHRzZWxlY3RvcjogXCJcIixcblxuXHQvLyBUaGUgZGVmYXVsdCBsZW5ndGggb2YgYSBqUXVlcnkgb2JqZWN0IGlzIDBcblx0bGVuZ3RoOiAwLFxuXG5cdHRvQXJyYXk6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBzbGljZS5jYWxsKCB0aGlzICk7XG5cdH0sXG5cblx0Ly8gR2V0IHRoZSBOdGggZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBlbGVtZW50IHNldCBPUlxuXHQvLyBHZXQgdGhlIHdob2xlIG1hdGNoZWQgZWxlbWVudCBzZXQgYXMgYSBjbGVhbiBhcnJheVxuXHRnZXQ6IGZ1bmN0aW9uKCBudW0gKSB7XG5cdFx0cmV0dXJuIG51bSAhPSBudWxsID9cblxuXHRcdFx0Ly8gUmV0dXJuIGp1c3QgdGhlIG9uZSBlbGVtZW50IGZyb20gdGhlIHNldFxuXHRcdFx0KCBudW0gPCAwID8gdGhpc1sgbnVtICsgdGhpcy5sZW5ndGggXSA6IHRoaXNbIG51bSBdICkgOlxuXG5cdFx0XHQvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBpbiBhIGNsZWFuIGFycmF5XG5cdFx0XHRzbGljZS5jYWxsKCB0aGlzICk7XG5cdH0sXG5cblx0Ly8gVGFrZSBhbiBhcnJheSBvZiBlbGVtZW50cyBhbmQgcHVzaCBpdCBvbnRvIHRoZSBzdGFja1xuXHQvLyAocmV0dXJuaW5nIHRoZSBuZXcgbWF0Y2hlZCBlbGVtZW50IHNldClcblx0cHVzaFN0YWNrOiBmdW5jdGlvbiggZWxlbXMgKSB7XG5cblx0XHQvLyBCdWlsZCBhIG5ldyBqUXVlcnkgbWF0Y2hlZCBlbGVtZW50IHNldFxuXHRcdHZhciByZXQgPSBqUXVlcnkubWVyZ2UoIHRoaXMuY29uc3RydWN0b3IoKSwgZWxlbXMgKTtcblxuXHRcdC8vIEFkZCB0aGUgb2xkIG9iamVjdCBvbnRvIHRoZSBzdGFjayAoYXMgYSByZWZlcmVuY2UpXG5cdFx0cmV0LnByZXZPYmplY3QgPSB0aGlzO1xuXHRcdHJldC5jb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuXG5cdFx0Ly8gUmV0dXJuIHRoZSBuZXdseS1mb3JtZWQgZWxlbWVudCBzZXRcblx0XHRyZXR1cm4gcmV0O1xuXHR9LFxuXG5cdC8vIEV4ZWN1dGUgYSBjYWxsYmFjayBmb3IgZXZlcnkgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG5cdC8vIChZb3UgY2FuIHNlZWQgdGhlIGFyZ3VtZW50cyB3aXRoIGFuIGFycmF5IG9mIGFyZ3MsIGJ1dCB0aGlzIGlzXG5cdC8vIG9ubHkgdXNlZCBpbnRlcm5hbGx5Lilcblx0ZWFjaDogZnVuY3Rpb24oIGNhbGxiYWNrLCBhcmdzICkge1xuXHRcdHJldHVybiBqUXVlcnkuZWFjaCggdGhpcywgY2FsbGJhY2ssIGFyZ3MgKTtcblx0fSxcblxuXHRtYXA6IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGpRdWVyeS5tYXAodGhpcywgZnVuY3Rpb24oIGVsZW0sIGkgKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2suY2FsbCggZWxlbSwgaSwgZWxlbSApO1xuXHRcdH0pKTtcblx0fSxcblxuXHRzbGljZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMucHVzaFN0YWNrKCBzbGljZS5hcHBseSggdGhpcywgYXJndW1lbnRzICkgKTtcblx0fSxcblxuXHRmaXJzdDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXEoIDAgKTtcblx0fSxcblxuXHRsYXN0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5lcSggLTEgKTtcblx0fSxcblxuXHRlcTogZnVuY3Rpb24oIGkgKSB7XG5cdFx0dmFyIGxlbiA9IHRoaXMubGVuZ3RoLFxuXHRcdFx0aiA9ICtpICsgKCBpIDwgMCA/IGxlbiA6IDAgKTtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGogPj0gMCAmJiBqIDwgbGVuID8gWyB0aGlzW2pdIF0gOiBbXSApO1xuXHR9LFxuXG5cdGVuZDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJldk9iamVjdCB8fCB0aGlzLmNvbnN0cnVjdG9yKG51bGwpO1xuXHR9LFxuXG5cdC8vIEZvciBpbnRlcm5hbCB1c2Ugb25seS5cblx0Ly8gQmVoYXZlcyBsaWtlIGFuIEFycmF5J3MgbWV0aG9kLCBub3QgbGlrZSBhIGpRdWVyeSBtZXRob2QuXG5cdHB1c2g6IHB1c2gsXG5cdHNvcnQ6IGRlbGV0ZWRJZHMuc29ydCxcblx0c3BsaWNlOiBkZWxldGVkSWRzLnNwbGljZVxufTtcblxualF1ZXJ5LmV4dGVuZCA9IGpRdWVyeS5mbi5leHRlbmQgPSBmdW5jdGlvbigpIHtcblx0dmFyIHNyYywgY29weUlzQXJyYXksIGNvcHksIG5hbWUsIG9wdGlvbnMsIGNsb25lLFxuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fSxcblx0XHRpID0gMSxcblx0XHRsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHRcdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICggdHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIgKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblxuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbIGkgXSB8fCB7fTtcblx0XHRpKys7XG5cdH1cblxuXHQvLyBIYW5kbGUgY2FzZSB3aGVuIHRhcmdldCBpcyBhIHN0cmluZyBvciBzb21ldGhpbmcgKHBvc3NpYmxlIGluIGRlZXAgY29weSlcblx0aWYgKCB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiICYmICFqUXVlcnkuaXNGdW5jdGlvbih0YXJnZXQpICkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Ly8gZXh0ZW5kIGpRdWVyeSBpdHNlbGYgaWYgb25seSBvbmUgYXJndW1lbnQgaXMgcGFzc2VkXG5cdGlmICggaSA9PT0gbGVuZ3RoICkge1xuXHRcdHRhcmdldCA9IHRoaXM7XG5cdFx0aS0tO1xuXHR9XG5cblx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICggKG9wdGlvbnMgPSBhcmd1bWVudHNbIGkgXSkgIT0gbnVsbCApIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAoIG5hbWUgaW4gb3B0aW9ucyApIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0WyBuYW1lIF07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zWyBuYW1lIF07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAoIHRhcmdldCA9PT0gY29weSApIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoIGRlZXAgJiYgY29weSAmJiAoIGpRdWVyeS5pc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IGpRdWVyeS5pc0FycmF5KGNvcHkpKSApICkge1xuXHRcdFx0XHRcdGlmICggY29weUlzQXJyYXkgKSB7XG5cdFx0XHRcdFx0XHRjb3B5SXNBcnJheSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGRlZXAsIGNsb25lLCBjb3B5ICk7XG5cblx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBjb3B5ICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0dGFyZ2V0WyBuYW1lIF0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbmpRdWVyeS5leHRlbmQoe1xuXHQvLyBVbmlxdWUgZm9yIGVhY2ggY29weSBvZiBqUXVlcnkgb24gdGhlIHBhZ2Vcblx0ZXhwYW5kbzogXCJqUXVlcnlcIiArICggdmVyc2lvbiArIE1hdGgucmFuZG9tKCkgKS5yZXBsYWNlKCAvXFxEL2csIFwiXCIgKSxcblxuXHQvLyBBc3N1bWUgalF1ZXJ5IGlzIHJlYWR5IHdpdGhvdXQgdGhlIHJlYWR5IG1vZHVsZVxuXHRpc1JlYWR5OiB0cnVlLFxuXG5cdGVycm9yOiBmdW5jdGlvbiggbXNnICkge1xuXHRcdHRocm93IG5ldyBFcnJvciggbXNnICk7XG5cdH0sXG5cblx0bm9vcDogZnVuY3Rpb24oKSB7fSxcblxuXHQvLyBTZWUgdGVzdC91bml0L2NvcmUuanMgZm9yIGRldGFpbHMgY29uY2VybmluZyBpc0Z1bmN0aW9uLlxuXHQvLyBTaW5jZSB2ZXJzaW9uIDEuMywgRE9NIG1ldGhvZHMgYW5kIGZ1bmN0aW9ucyBsaWtlIGFsZXJ0XG5cdC8vIGFyZW4ndCBzdXBwb3J0ZWQuIFRoZXkgcmV0dXJuIGZhbHNlIG9uIElFICgjMjk2OCkuXG5cdGlzRnVuY3Rpb246IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiZnVuY3Rpb25cIjtcblx0fSxcblxuXHRpc0FycmF5OiBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiYXJyYXlcIjtcblx0fSxcblxuXHRpc1dpbmRvdzogZnVuY3Rpb24oIG9iaiApIHtcblx0XHQvKiBqc2hpbnQgZXFlcWVxOiBmYWxzZSAqL1xuXHRcdHJldHVybiBvYmogIT0gbnVsbCAmJiBvYmogPT0gb2JqLndpbmRvdztcblx0fSxcblxuXHRpc051bWVyaWM6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0Ly8gcGFyc2VGbG9hdCBOYU5zIG51bWVyaWMtY2FzdCBmYWxzZSBwb3NpdGl2ZXMgKG51bGx8dHJ1ZXxmYWxzZXxcIlwiKVxuXHRcdC8vIC4uLmJ1dCBtaXNpbnRlcnByZXRzIGxlYWRpbmctbnVtYmVyIHN0cmluZ3MsIHBhcnRpY3VsYXJseSBoZXggbGl0ZXJhbHMgKFwiMHguLi5cIilcblx0XHQvLyBzdWJ0cmFjdGlvbiBmb3JjZXMgaW5maW5pdGllcyB0byBOYU5cblx0XHRyZXR1cm4gIWpRdWVyeS5pc0FycmF5KCBvYmogKSAmJiBvYmogLSBwYXJzZUZsb2F0KCBvYmogKSA+PSAwO1xuXHR9LFxuXG5cdGlzRW1wdHlPYmplY3Q6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0dmFyIG5hbWU7XG5cdFx0Zm9yICggbmFtZSBpbiBvYmogKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0dmFyIGtleTtcblxuXHRcdC8vIE11c3QgYmUgYW4gT2JqZWN0LlxuXHRcdC8vIEJlY2F1c2Ugb2YgSUUsIHdlIGFsc28gaGF2ZSB0byBjaGVjayB0aGUgcHJlc2VuY2Ugb2YgdGhlIGNvbnN0cnVjdG9yIHByb3BlcnR5LlxuXHRcdC8vIE1ha2Ugc3VyZSB0aGF0IERPTSBub2RlcyBhbmQgd2luZG93IG9iamVjdHMgZG9uJ3QgcGFzcyB0aHJvdWdoLCBhcyB3ZWxsXG5cdFx0aWYgKCAhb2JqIHx8IGpRdWVyeS50eXBlKG9iaikgIT09IFwib2JqZWN0XCIgfHwgb2JqLm5vZGVUeXBlIHx8IGpRdWVyeS5pc1dpbmRvdyggb2JqICkgKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0XHRcdGlmICggb2JqLmNvbnN0cnVjdG9yICYmXG5cdFx0XHRcdCFoYXNPd24uY2FsbChvYmosIFwiY29uc3RydWN0b3JcIikgJiZcblx0XHRcdFx0IWhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsIFwiaXNQcm90b3R5cGVPZlwiKSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0Ly8gSUU4LDkgV2lsbCB0aHJvdyBleGNlcHRpb25zIG9uIGNlcnRhaW4gaG9zdCBvYmplY3RzICM5ODk3XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydDogSUU8OVxuXHRcdC8vIEhhbmRsZSBpdGVyYXRpb24gb3ZlciBpbmhlcml0ZWQgcHJvcGVydGllcyBiZWZvcmUgb3duIHByb3BlcnRpZXMuXG5cdFx0aWYgKCBzdXBwb3J0Lm93bkxhc3QgKSB7XG5cdFx0XHRmb3IgKCBrZXkgaW4gb2JqICkge1xuXHRcdFx0XHRyZXR1cm4gaGFzT3duLmNhbGwoIG9iaiwga2V5ICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdFx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdFx0Zm9yICgga2V5IGluIG9iaiApIHt9XG5cblx0XHRyZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgfHwgaGFzT3duLmNhbGwoIG9iaiwga2V5ICk7XG5cdH0sXG5cblx0dHlwZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRpZiAoIG9iaiA9PSBudWxsICkge1xuXHRcdFx0cmV0dXJuIG9iaiArIFwiXCI7XG5cdFx0fVxuXHRcdHJldHVybiB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBvYmogPT09IFwiZnVuY3Rpb25cIiA/XG5cdFx0XHRjbGFzczJ0eXBlWyB0b1N0cmluZy5jYWxsKG9iaikgXSB8fCBcIm9iamVjdFwiIDpcblx0XHRcdHR5cGVvZiBvYmo7XG5cdH0sXG5cblx0Ly8gRXZhbHVhdGVzIGEgc2NyaXB0IGluIGEgZ2xvYmFsIGNvbnRleHRcblx0Ly8gV29ya2Fyb3VuZHMgYmFzZWQgb24gZmluZGluZ3MgYnkgSmltIERyaXNjb2xsXG5cdC8vIGh0dHA6Ly93ZWJsb2dzLmphdmEubmV0L2Jsb2cvZHJpc2NvbGwvYXJjaGl2ZS8yMDA5LzA5LzA4L2V2YWwtamF2YXNjcmlwdC1nbG9iYWwtY29udGV4dFxuXHRnbG9iYWxFdmFsOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRpZiAoIGRhdGEgJiYgalF1ZXJ5LnRyaW0oIGRhdGEgKSApIHtcblx0XHRcdC8vIFdlIHVzZSBleGVjU2NyaXB0IG9uIEludGVybmV0IEV4cGxvcmVyXG5cdFx0XHQvLyBXZSB1c2UgYW4gYW5vbnltb3VzIGZ1bmN0aW9uIHNvIHRoYXQgY29udGV4dCBpcyB3aW5kb3dcblx0XHRcdC8vIHJhdGhlciB0aGFuIGpRdWVyeSBpbiBGaXJlZm94XG5cdFx0XHQoIHdpbmRvdy5leGVjU2NyaXB0IHx8IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHR3aW5kb3dbIFwiZXZhbFwiIF0uY2FsbCggd2luZG93LCBkYXRhICk7XG5cdFx0XHR9ICkoIGRhdGEgKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gQ29udmVydCBkYXNoZWQgdG8gY2FtZWxDYXNlOyB1c2VkIGJ5IHRoZSBjc3MgYW5kIGRhdGEgbW9kdWxlc1xuXHQvLyBNaWNyb3NvZnQgZm9yZ290IHRvIGh1bXAgdGhlaXIgdmVuZG9yIHByZWZpeCAoIzk1NzIpXG5cdGNhbWVsQ2FzZTogZnVuY3Rpb24oIHN0cmluZyApIHtcblx0XHRyZXR1cm4gc3RyaW5nLnJlcGxhY2UoIHJtc1ByZWZpeCwgXCJtcy1cIiApLnJlcGxhY2UoIHJkYXNoQWxwaGEsIGZjYW1lbENhc2UgKTtcblx0fSxcblxuXHRub2RlTmFtZTogZnVuY3Rpb24oIGVsZW0sIG5hbWUgKSB7XG5cdFx0cmV0dXJuIGVsZW0ubm9kZU5hbWUgJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cdH0sXG5cblx0Ly8gYXJncyBpcyBmb3IgaW50ZXJuYWwgdXNhZ2Ugb25seVxuXHRlYWNoOiBmdW5jdGlvbiggb2JqLCBjYWxsYmFjaywgYXJncyApIHtcblx0XHR2YXIgdmFsdWUsXG5cdFx0XHRpID0gMCxcblx0XHRcdGxlbmd0aCA9IG9iai5sZW5ndGgsXG5cdFx0XHRpc0FycmF5ID0gaXNBcnJheWxpa2UoIG9iaiApO1xuXG5cdFx0aWYgKCBhcmdzICkge1xuXHRcdFx0aWYgKCBpc0FycmF5ICkge1xuXHRcdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGNhbGxiYWNrLmFwcGx5KCBvYmpbIGkgXSwgYXJncyApO1xuXG5cdFx0XHRcdFx0aWYgKCB2YWx1ZSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIGkgaW4gb2JqICkge1xuXHRcdFx0XHRcdHZhbHVlID0gY2FsbGJhY2suYXBwbHkoIG9ialsgaSBdLCBhcmdzICk7XG5cblx0XHRcdFx0XHRpZiAoIHZhbHVlID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0Ly8gQSBzcGVjaWFsLCBmYXN0LCBjYXNlIGZvciB0aGUgbW9zdCBjb21tb24gdXNlIG9mIGVhY2hcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCBpc0FycmF5ICkge1xuXHRcdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGNhbGxiYWNrLmNhbGwoIG9ialsgaSBdLCBpLCBvYmpbIGkgXSApO1xuXG5cdFx0XHRcdFx0aWYgKCB2YWx1ZSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIGkgaW4gb2JqICkge1xuXHRcdFx0XHRcdHZhbHVlID0gY2FsbGJhY2suY2FsbCggb2JqWyBpIF0sIGksIG9ialsgaSBdICk7XG5cblx0XHRcdFx0XHRpZiAoIHZhbHVlID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBvYmo7XG5cdH0sXG5cblx0Ly8gU3VwcG9ydDogQW5kcm9pZDw0LjEsIElFPDlcblx0dHJpbTogZnVuY3Rpb24oIHRleHQgKSB7XG5cdFx0cmV0dXJuIHRleHQgPT0gbnVsbCA/XG5cdFx0XHRcIlwiIDpcblx0XHRcdCggdGV4dCArIFwiXCIgKS5yZXBsYWNlKCBydHJpbSwgXCJcIiApO1xuXHR9LFxuXG5cdC8vIHJlc3VsdHMgaXMgZm9yIGludGVybmFsIHVzYWdlIG9ubHlcblx0bWFrZUFycmF5OiBmdW5jdGlvbiggYXJyLCByZXN1bHRzICkge1xuXHRcdHZhciByZXQgPSByZXN1bHRzIHx8IFtdO1xuXG5cdFx0aWYgKCBhcnIgIT0gbnVsbCApIHtcblx0XHRcdGlmICggaXNBcnJheWxpa2UoIE9iamVjdChhcnIpICkgKSB7XG5cdFx0XHRcdGpRdWVyeS5tZXJnZSggcmV0LFxuXHRcdFx0XHRcdHR5cGVvZiBhcnIgPT09IFwic3RyaW5nXCIgP1xuXHRcdFx0XHRcdFsgYXJyIF0gOiBhcnJcblx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHB1c2guY2FsbCggcmV0LCBhcnIgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0O1xuXHR9LFxuXG5cdGluQXJyYXk6IGZ1bmN0aW9uKCBlbGVtLCBhcnIsIGkgKSB7XG5cdFx0dmFyIGxlbjtcblxuXHRcdGlmICggYXJyICkge1xuXHRcdFx0aWYgKCBpbmRleE9mICkge1xuXHRcdFx0XHRyZXR1cm4gaW5kZXhPZi5jYWxsKCBhcnIsIGVsZW0sIGkgKTtcblx0XHRcdH1cblxuXHRcdFx0bGVuID0gYXJyLmxlbmd0aDtcblx0XHRcdGkgPSBpID8gaSA8IDAgPyBNYXRoLm1heCggMCwgbGVuICsgaSApIDogaSA6IDA7XG5cblx0XHRcdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHQvLyBTa2lwIGFjY2Vzc2luZyBpbiBzcGFyc2UgYXJyYXlzXG5cdFx0XHRcdGlmICggaSBpbiBhcnIgJiYgYXJyWyBpIF0gPT09IGVsZW0gKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gLTE7XG5cdH0sXG5cblx0bWVyZ2U6IGZ1bmN0aW9uKCBmaXJzdCwgc2Vjb25kICkge1xuXHRcdHZhciBsZW4gPSArc2Vjb25kLmxlbmd0aCxcblx0XHRcdGogPSAwLFxuXHRcdFx0aSA9IGZpcnN0Lmxlbmd0aDtcblxuXHRcdHdoaWxlICggaiA8IGxlbiApIHtcblx0XHRcdGZpcnN0WyBpKysgXSA9IHNlY29uZFsgaisrIF07XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydDogSUU8OVxuXHRcdC8vIFdvcmthcm91bmQgY2FzdGluZyBvZiAubGVuZ3RoIHRvIE5hTiBvbiBvdGhlcndpc2UgYXJyYXlsaWtlIG9iamVjdHMgKGUuZy4sIE5vZGVMaXN0cylcblx0XHRpZiAoIGxlbiAhPT0gbGVuICkge1xuXHRcdFx0d2hpbGUgKCBzZWNvbmRbal0gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0Zmlyc3RbIGkrKyBdID0gc2Vjb25kWyBqKysgXTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmaXJzdC5sZW5ndGggPSBpO1xuXG5cdFx0cmV0dXJuIGZpcnN0O1xuXHR9LFxuXG5cdGdyZXA6IGZ1bmN0aW9uKCBlbGVtcywgY2FsbGJhY2ssIGludmVydCApIHtcblx0XHR2YXIgY2FsbGJhY2tJbnZlcnNlLFxuXHRcdFx0bWF0Y2hlcyA9IFtdLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW5ndGggPSBlbGVtcy5sZW5ndGgsXG5cdFx0XHRjYWxsYmFja0V4cGVjdCA9ICFpbnZlcnQ7XG5cblx0XHQvLyBHbyB0aHJvdWdoIHRoZSBhcnJheSwgb25seSBzYXZpbmcgdGhlIGl0ZW1zXG5cdFx0Ly8gdGhhdCBwYXNzIHRoZSB2YWxpZGF0b3IgZnVuY3Rpb25cblx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdGNhbGxiYWNrSW52ZXJzZSA9ICFjYWxsYmFjayggZWxlbXNbIGkgXSwgaSApO1xuXHRcdFx0aWYgKCBjYWxsYmFja0ludmVyc2UgIT09IGNhbGxiYWNrRXhwZWN0ICkge1xuXHRcdFx0XHRtYXRjaGVzLnB1c2goIGVsZW1zWyBpIF0gKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbWF0Y2hlcztcblx0fSxcblxuXHQvLyBhcmcgaXMgZm9yIGludGVybmFsIHVzYWdlIG9ubHlcblx0bWFwOiBmdW5jdGlvbiggZWxlbXMsIGNhbGxiYWNrLCBhcmcgKSB7XG5cdFx0dmFyIHZhbHVlLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW5ndGggPSBlbGVtcy5sZW5ndGgsXG5cdFx0XHRpc0FycmF5ID0gaXNBcnJheWxpa2UoIGVsZW1zICksXG5cdFx0XHRyZXQgPSBbXTtcblxuXHRcdC8vIEdvIHRocm91Z2ggdGhlIGFycmF5LCB0cmFuc2xhdGluZyBlYWNoIG9mIHRoZSBpdGVtcyB0byB0aGVpciBuZXcgdmFsdWVzXG5cdFx0aWYgKCBpc0FycmF5ICkge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdHZhbHVlID0gY2FsbGJhY2soIGVsZW1zWyBpIF0sIGksIGFyZyApO1xuXG5cdFx0XHRcdGlmICggdmFsdWUgIT0gbnVsbCApIHtcblx0XHRcdFx0XHRyZXQucHVzaCggdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0Ly8gR28gdGhyb3VnaCBldmVyeSBrZXkgb24gdGhlIG9iamVjdCxcblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggaSBpbiBlbGVtcyApIHtcblx0XHRcdFx0dmFsdWUgPSBjYWxsYmFjayggZWxlbXNbIGkgXSwgaSwgYXJnICk7XG5cblx0XHRcdFx0aWYgKCB2YWx1ZSAhPSBudWxsICkge1xuXHRcdFx0XHRcdHJldC5wdXNoKCB2YWx1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRmxhdHRlbiBhbnkgbmVzdGVkIGFycmF5c1xuXHRcdHJldHVybiBjb25jYXQuYXBwbHkoIFtdLCByZXQgKTtcblx0fSxcblxuXHQvLyBBIGdsb2JhbCBHVUlEIGNvdW50ZXIgZm9yIG9iamVjdHNcblx0Z3VpZDogMSxcblxuXHQvLyBCaW5kIGEgZnVuY3Rpb24gdG8gYSBjb250ZXh0LCBvcHRpb25hbGx5IHBhcnRpYWxseSBhcHBseWluZyBhbnlcblx0Ly8gYXJndW1lbnRzLlxuXHRwcm94eTogZnVuY3Rpb24oIGZuLCBjb250ZXh0ICkge1xuXHRcdHZhciBhcmdzLCBwcm94eSwgdG1wO1xuXG5cdFx0aWYgKCB0eXBlb2YgY29udGV4dCA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHRtcCA9IGZuWyBjb250ZXh0IF07XG5cdFx0XHRjb250ZXh0ID0gZm47XG5cdFx0XHRmbiA9IHRtcDtcblx0XHR9XG5cblx0XHQvLyBRdWljayBjaGVjayB0byBkZXRlcm1pbmUgaWYgdGFyZ2V0IGlzIGNhbGxhYmxlLCBpbiB0aGUgc3BlY1xuXHRcdC8vIHRoaXMgdGhyb3dzIGEgVHlwZUVycm9yLCBidXQgd2Ugd2lsbCBqdXN0IHJldHVybiB1bmRlZmluZWQuXG5cdFx0aWYgKCAhalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdC8vIFNpbXVsYXRlZCBiaW5kXG5cdFx0YXJncyA9IHNsaWNlLmNhbGwoIGFyZ3VtZW50cywgMiApO1xuXHRcdHByb3h5ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gZm4uYXBwbHkoIGNvbnRleHQgfHwgdGhpcywgYXJncy5jb25jYXQoIHNsaWNlLmNhbGwoIGFyZ3VtZW50cyApICkgKTtcblx0XHR9O1xuXG5cdFx0Ly8gU2V0IHRoZSBndWlkIG9mIHVuaXF1ZSBoYW5kbGVyIHRvIHRoZSBzYW1lIG9mIG9yaWdpbmFsIGhhbmRsZXIsIHNvIGl0IGNhbiBiZSByZW1vdmVkXG5cdFx0cHJveHkuZ3VpZCA9IGZuLmd1aWQgPSBmbi5ndWlkIHx8IGpRdWVyeS5ndWlkKys7XG5cblx0XHRyZXR1cm4gcHJveHk7XG5cdH0sXG5cblx0bm93OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKyggbmV3IERhdGUoKSApO1xuXHR9LFxuXG5cdC8vIGpRdWVyeS5zdXBwb3J0IGlzIG5vdCB1c2VkIGluIENvcmUgYnV0IG90aGVyIHByb2plY3RzIGF0dGFjaCB0aGVpclxuXHQvLyBwcm9wZXJ0aWVzIHRvIGl0IHNvIGl0IG5lZWRzIHRvIGV4aXN0LlxuXHRzdXBwb3J0OiBzdXBwb3J0XG59KTtcblxuLy8gUG9wdWxhdGUgdGhlIGNsYXNzMnR5cGUgbWFwXG5qUXVlcnkuZWFjaChcIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3QgRXJyb3JcIi5zcGxpdChcIiBcIiksIGZ1bmN0aW9uKGksIG5hbWUpIHtcblx0Y2xhc3MydHlwZVsgXCJbb2JqZWN0IFwiICsgbmFtZSArIFwiXVwiIF0gPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuZnVuY3Rpb24gaXNBcnJheWxpa2UoIG9iaiApIHtcblx0dmFyIGxlbmd0aCA9IG9iai5sZW5ndGgsXG5cdFx0dHlwZSA9IGpRdWVyeS50eXBlKCBvYmogKTtcblxuXHRpZiAoIHR5cGUgPT09IFwiZnVuY3Rpb25cIiB8fCBqUXVlcnkuaXNXaW5kb3coIG9iaiApICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGlmICggb2JqLm5vZGVUeXBlID09PSAxICYmIGxlbmd0aCApIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiB0eXBlID09PSBcImFycmF5XCIgfHwgbGVuZ3RoID09PSAwIHx8XG5cdFx0dHlwZW9mIGxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiBsZW5ndGggPiAwICYmICggbGVuZ3RoIC0gMSApIGluIG9iajtcbn1cbnZhciBTaXp6bGUgPVxuLyohXG4gKiBTaXp6bGUgQ1NTIFNlbGVjdG9yIEVuZ2luZSB2MS4xMC4xOVxuICogaHR0cDovL3NpenpsZWpzLmNvbS9cbiAqXG4gKiBDb3B5cmlnaHQgMjAxMyBqUXVlcnkgRm91bmRhdGlvbiwgSW5jLiBhbmQgb3RoZXIgY29udHJpYnV0b3JzXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHA6Ly9qcXVlcnkub3JnL2xpY2Vuc2VcbiAqXG4gKiBEYXRlOiAyMDE0LTA0LTE4XG4gKi9cbihmdW5jdGlvbiggd2luZG93ICkge1xuXG52YXIgaSxcblx0c3VwcG9ydCxcblx0RXhwcixcblx0Z2V0VGV4dCxcblx0aXNYTUwsXG5cdHRva2VuaXplLFxuXHRjb21waWxlLFxuXHRzZWxlY3QsXG5cdG91dGVybW9zdENvbnRleHQsXG5cdHNvcnRJbnB1dCxcblx0aGFzRHVwbGljYXRlLFxuXG5cdC8vIExvY2FsIGRvY3VtZW50IHZhcnNcblx0c2V0RG9jdW1lbnQsXG5cdGRvY3VtZW50LFxuXHRkb2NFbGVtLFxuXHRkb2N1bWVudElzSFRNTCxcblx0cmJ1Z2d5UVNBLFxuXHRyYnVnZ3lNYXRjaGVzLFxuXHRtYXRjaGVzLFxuXHRjb250YWlucyxcblxuXHQvLyBJbnN0YW5jZS1zcGVjaWZpYyBkYXRhXG5cdGV4cGFuZG8gPSBcInNpenpsZVwiICsgLShuZXcgRGF0ZSgpKSxcblx0cHJlZmVycmVkRG9jID0gd2luZG93LmRvY3VtZW50LFxuXHRkaXJydW5zID0gMCxcblx0ZG9uZSA9IDAsXG5cdGNsYXNzQ2FjaGUgPSBjcmVhdGVDYWNoZSgpLFxuXHR0b2tlbkNhY2hlID0gY3JlYXRlQ2FjaGUoKSxcblx0Y29tcGlsZXJDYWNoZSA9IGNyZWF0ZUNhY2hlKCksXG5cdHNvcnRPcmRlciA9IGZ1bmN0aW9uKCBhLCBiICkge1xuXHRcdGlmICggYSA9PT0gYiApIHtcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9LFxuXG5cdC8vIEdlbmVyYWwtcHVycG9zZSBjb25zdGFudHNcblx0c3RydW5kZWZpbmVkID0gdHlwZW9mIHVuZGVmaW5lZCxcblx0TUFYX05FR0FUSVZFID0gMSA8PCAzMSxcblxuXHQvLyBJbnN0YW5jZSBtZXRob2RzXG5cdGhhc093biA9ICh7fSkuaGFzT3duUHJvcGVydHksXG5cdGFyciA9IFtdLFxuXHRwb3AgPSBhcnIucG9wLFxuXHRwdXNoX25hdGl2ZSA9IGFyci5wdXNoLFxuXHRwdXNoID0gYXJyLnB1c2gsXG5cdHNsaWNlID0gYXJyLnNsaWNlLFxuXHQvLyBVc2UgYSBzdHJpcHBlZC1kb3duIGluZGV4T2YgaWYgd2UgY2FuJ3QgdXNlIGEgbmF0aXZlIG9uZVxuXHRpbmRleE9mID0gYXJyLmluZGV4T2YgfHwgZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0dmFyIGkgPSAwLFxuXHRcdFx0bGVuID0gdGhpcy5sZW5ndGg7XG5cdFx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0XHRpZiAoIHRoaXNbaV0gPT09IGVsZW0gKSB7XG5cdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gLTE7XG5cdH0sXG5cblx0Ym9vbGVhbnMgPSBcImNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGRpc2FibGVkfGhpZGRlbnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVhZG9ubHl8cmVxdWlyZWR8c2NvcGVkXCIsXG5cblx0Ly8gUmVndWxhciBleHByZXNzaW9uc1xuXG5cdC8vIFdoaXRlc3BhY2UgY2hhcmFjdGVycyBodHRwOi8vd3d3LnczLm9yZy9UUi9jc3MzLXNlbGVjdG9ycy8jd2hpdGVzcGFjZVxuXHR3aGl0ZXNwYWNlID0gXCJbXFxcXHgyMFxcXFx0XFxcXHJcXFxcblxcXFxmXVwiLFxuXHQvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9jc3MzLXN5bnRheC8jY2hhcmFjdGVyc1xuXHRjaGFyYWN0ZXJFbmNvZGluZyA9IFwiKD86XFxcXFxcXFwufFtcXFxcdy1dfFteXFxcXHgwMC1cXFxceGEwXSkrXCIsXG5cblx0Ly8gTG9vc2VseSBtb2RlbGVkIG9uIENTUyBpZGVudGlmaWVyIGNoYXJhY3RlcnNcblx0Ly8gQW4gdW5xdW90ZWQgdmFsdWUgc2hvdWxkIGJlIGEgQ1NTIGlkZW50aWZpZXIgaHR0cDovL3d3dy53My5vcmcvVFIvY3NzMy1zZWxlY3RvcnMvI2F0dHJpYnV0ZS1zZWxlY3RvcnNcblx0Ly8gUHJvcGVyIHN5bnRheDogaHR0cDovL3d3dy53My5vcmcvVFIvQ1NTMjEvc3luZGF0YS5odG1sI3ZhbHVlLWRlZi1pZGVudGlmaWVyXG5cdGlkZW50aWZpZXIgPSBjaGFyYWN0ZXJFbmNvZGluZy5yZXBsYWNlKCBcIndcIiwgXCJ3I1wiICksXG5cblx0Ly8gQXR0cmlidXRlIHNlbGVjdG9yczogaHR0cDovL3d3dy53My5vcmcvVFIvc2VsZWN0b3JzLyNhdHRyaWJ1dGUtc2VsZWN0b3JzXG5cdGF0dHJpYnV0ZXMgPSBcIlxcXFxbXCIgKyB3aGl0ZXNwYWNlICsgXCIqKFwiICsgY2hhcmFjdGVyRW5jb2RpbmcgKyBcIikoPzpcIiArIHdoaXRlc3BhY2UgK1xuXHRcdC8vIE9wZXJhdG9yIChjYXB0dXJlIDIpXG5cdFx0XCIqKFsqXiR8IX5dPz0pXCIgKyB3aGl0ZXNwYWNlICtcblx0XHQvLyBcIkF0dHJpYnV0ZSB2YWx1ZXMgbXVzdCBiZSBDU1MgaWRlbnRpZmllcnMgW2NhcHR1cmUgNV0gb3Igc3RyaW5ncyBbY2FwdHVyZSAzIG9yIGNhcHR1cmUgNF1cIlxuXHRcdFwiKig/OicoKD86XFxcXFxcXFwufFteXFxcXFxcXFwnXSkqKSd8XFxcIigoPzpcXFxcXFxcXC58W15cXFxcXFxcXFxcXCJdKSopXFxcInwoXCIgKyBpZGVudGlmaWVyICsgXCIpKXwpXCIgKyB3aGl0ZXNwYWNlICtcblx0XHRcIipcXFxcXVwiLFxuXG5cdHBzZXVkb3MgPSBcIjooXCIgKyBjaGFyYWN0ZXJFbmNvZGluZyArIFwiKSg/OlxcXFwoKFwiICtcblx0XHQvLyBUbyByZWR1Y2UgdGhlIG51bWJlciBvZiBzZWxlY3RvcnMgbmVlZGluZyB0b2tlbml6ZSBpbiB0aGUgcHJlRmlsdGVyLCBwcmVmZXIgYXJndW1lbnRzOlxuXHRcdC8vIDEuIHF1b3RlZCAoY2FwdHVyZSAzOyBjYXB0dXJlIDQgb3IgY2FwdHVyZSA1KVxuXHRcdFwiKCcoKD86XFxcXFxcXFwufFteXFxcXFxcXFwnXSkqKSd8XFxcIigoPzpcXFxcXFxcXC58W15cXFxcXFxcXFxcXCJdKSopXFxcIil8XCIgK1xuXHRcdC8vIDIuIHNpbXBsZSAoY2FwdHVyZSA2KVxuXHRcdFwiKCg/OlxcXFxcXFxcLnxbXlxcXFxcXFxcKClbXFxcXF1dfFwiICsgYXR0cmlidXRlcyArIFwiKSopfFwiICtcblx0XHQvLyAzLiBhbnl0aGluZyBlbHNlIChjYXB0dXJlIDIpXG5cdFx0XCIuKlwiICtcblx0XHRcIilcXFxcKXwpXCIsXG5cblx0Ly8gTGVhZGluZyBhbmQgbm9uLWVzY2FwZWQgdHJhaWxpbmcgd2hpdGVzcGFjZSwgY2FwdHVyaW5nIHNvbWUgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVycyBwcmVjZWRpbmcgdGhlIGxhdHRlclxuXHRydHJpbSA9IG5ldyBSZWdFeHAoIFwiXlwiICsgd2hpdGVzcGFjZSArIFwiK3woKD86XnxbXlxcXFxcXFxcXSkoPzpcXFxcXFxcXC4pKilcIiArIHdoaXRlc3BhY2UgKyBcIiskXCIsIFwiZ1wiICksXG5cblx0cmNvbW1hID0gbmV3IFJlZ0V4cCggXCJeXCIgKyB3aGl0ZXNwYWNlICsgXCIqLFwiICsgd2hpdGVzcGFjZSArIFwiKlwiICksXG5cdHJjb21iaW5hdG9ycyA9IG5ldyBSZWdFeHAoIFwiXlwiICsgd2hpdGVzcGFjZSArIFwiKihbPit+XXxcIiArIHdoaXRlc3BhY2UgKyBcIilcIiArIHdoaXRlc3BhY2UgKyBcIipcIiApLFxuXG5cdHJhdHRyaWJ1dGVRdW90ZXMgPSBuZXcgUmVnRXhwKCBcIj1cIiArIHdoaXRlc3BhY2UgKyBcIiooW15cXFxcXSdcXFwiXSo/KVwiICsgd2hpdGVzcGFjZSArIFwiKlxcXFxdXCIsIFwiZ1wiICksXG5cblx0cnBzZXVkbyA9IG5ldyBSZWdFeHAoIHBzZXVkb3MgKSxcblx0cmlkZW50aWZpZXIgPSBuZXcgUmVnRXhwKCBcIl5cIiArIGlkZW50aWZpZXIgKyBcIiRcIiApLFxuXG5cdG1hdGNoRXhwciA9IHtcblx0XHRcIklEXCI6IG5ldyBSZWdFeHAoIFwiXiMoXCIgKyBjaGFyYWN0ZXJFbmNvZGluZyArIFwiKVwiICksXG5cdFx0XCJDTEFTU1wiOiBuZXcgUmVnRXhwKCBcIl5cXFxcLihcIiArIGNoYXJhY3RlckVuY29kaW5nICsgXCIpXCIgKSxcblx0XHRcIlRBR1wiOiBuZXcgUmVnRXhwKCBcIl4oXCIgKyBjaGFyYWN0ZXJFbmNvZGluZy5yZXBsYWNlKCBcIndcIiwgXCJ3KlwiICkgKyBcIilcIiApLFxuXHRcdFwiQVRUUlwiOiBuZXcgUmVnRXhwKCBcIl5cIiArIGF0dHJpYnV0ZXMgKSxcblx0XHRcIlBTRVVET1wiOiBuZXcgUmVnRXhwKCBcIl5cIiArIHBzZXVkb3MgKSxcblx0XHRcIkNISUxEXCI6IG5ldyBSZWdFeHAoIFwiXjoob25seXxmaXJzdHxsYXN0fG50aHxudGgtbGFzdCktKGNoaWxkfG9mLXR5cGUpKD86XFxcXChcIiArIHdoaXRlc3BhY2UgK1xuXHRcdFx0XCIqKGV2ZW58b2RkfCgoWystXXwpKFxcXFxkKilufClcIiArIHdoaXRlc3BhY2UgKyBcIiooPzooWystXXwpXCIgKyB3aGl0ZXNwYWNlICtcblx0XHRcdFwiKihcXFxcZCspfCkpXCIgKyB3aGl0ZXNwYWNlICsgXCIqXFxcXCl8KVwiLCBcImlcIiApLFxuXHRcdFwiYm9vbFwiOiBuZXcgUmVnRXhwKCBcIl4oPzpcIiArIGJvb2xlYW5zICsgXCIpJFwiLCBcImlcIiApLFxuXHRcdC8vIEZvciB1c2UgaW4gbGlicmFyaWVzIGltcGxlbWVudGluZyAuaXMoKVxuXHRcdC8vIFdlIHVzZSB0aGlzIGZvciBQT1MgbWF0Y2hpbmcgaW4gYHNlbGVjdGBcblx0XHRcIm5lZWRzQ29udGV4dFwiOiBuZXcgUmVnRXhwKCBcIl5cIiArIHdoaXRlc3BhY2UgKyBcIipbPit+XXw6KGV2ZW58b2RkfGVxfGd0fGx0fG50aHxmaXJzdHxsYXN0KSg/OlxcXFwoXCIgK1xuXHRcdFx0d2hpdGVzcGFjZSArIFwiKigoPzotXFxcXGQpP1xcXFxkKilcIiArIHdoaXRlc3BhY2UgKyBcIipcXFxcKXwpKD89W14tXXwkKVwiLCBcImlcIiApXG5cdH0sXG5cblx0cmlucHV0cyA9IC9eKD86aW5wdXR8c2VsZWN0fHRleHRhcmVhfGJ1dHRvbikkL2ksXG5cdHJoZWFkZXIgPSAvXmhcXGQkL2ksXG5cblx0cm5hdGl2ZSA9IC9eW157XStcXHtcXHMqXFxbbmF0aXZlIFxcdy8sXG5cblx0Ly8gRWFzaWx5LXBhcnNlYWJsZS9yZXRyaWV2YWJsZSBJRCBvciBUQUcgb3IgQ0xBU1Mgc2VsZWN0b3JzXG5cdHJxdWlja0V4cHIgPSAvXig/OiMoW1xcdy1dKyl8KFxcdyspfFxcLihbXFx3LV0rKSkkLyxcblxuXHRyc2libGluZyA9IC9bK35dLyxcblx0cmVzY2FwZSA9IC8nfFxcXFwvZyxcblxuXHQvLyBDU1MgZXNjYXBlcyBodHRwOi8vd3d3LnczLm9yZy9UUi9DU1MyMS9zeW5kYXRhLmh0bWwjZXNjYXBlZC1jaGFyYWN0ZXJzXG5cdHJ1bmVzY2FwZSA9IG5ldyBSZWdFeHAoIFwiXFxcXFxcXFwoW1xcXFxkYS1mXXsxLDZ9XCIgKyB3aGl0ZXNwYWNlICsgXCI/fChcIiArIHdoaXRlc3BhY2UgKyBcIil8LilcIiwgXCJpZ1wiICksXG5cdGZ1bmVzY2FwZSA9IGZ1bmN0aW9uKCBfLCBlc2NhcGVkLCBlc2NhcGVkV2hpdGVzcGFjZSApIHtcblx0XHR2YXIgaGlnaCA9IFwiMHhcIiArIGVzY2FwZWQgLSAweDEwMDAwO1xuXHRcdC8vIE5hTiBtZWFucyBub24tY29kZXBvaW50XG5cdFx0Ly8gU3VwcG9ydDogRmlyZWZveDwyNFxuXHRcdC8vIFdvcmthcm91bmQgZXJyb25lb3VzIG51bWVyaWMgaW50ZXJwcmV0YXRpb24gb2YgK1wiMHhcIlxuXHRcdHJldHVybiBoaWdoICE9PSBoaWdoIHx8IGVzY2FwZWRXaGl0ZXNwYWNlID9cblx0XHRcdGVzY2FwZWQgOlxuXHRcdFx0aGlnaCA8IDAgP1xuXHRcdFx0XHQvLyBCTVAgY29kZXBvaW50XG5cdFx0XHRcdFN0cmluZy5mcm9tQ2hhckNvZGUoIGhpZ2ggKyAweDEwMDAwICkgOlxuXHRcdFx0XHQvLyBTdXBwbGVtZW50YWwgUGxhbmUgY29kZXBvaW50IChzdXJyb2dhdGUgcGFpcilcblx0XHRcdFx0U3RyaW5nLmZyb21DaGFyQ29kZSggaGlnaCA+PiAxMCB8IDB4RDgwMCwgaGlnaCAmIDB4M0ZGIHwgMHhEQzAwICk7XG5cdH07XG5cbi8vIE9wdGltaXplIGZvciBwdXNoLmFwcGx5KCBfLCBOb2RlTGlzdCApXG50cnkge1xuXHRwdXNoLmFwcGx5KFxuXHRcdChhcnIgPSBzbGljZS5jYWxsKCBwcmVmZXJyZWREb2MuY2hpbGROb2RlcyApKSxcblx0XHRwcmVmZXJyZWREb2MuY2hpbGROb2Rlc1xuXHQpO1xuXHQvLyBTdXBwb3J0OiBBbmRyb2lkPDQuMFxuXHQvLyBEZXRlY3Qgc2lsZW50bHkgZmFpbGluZyBwdXNoLmFwcGx5XG5cdGFyclsgcHJlZmVycmVkRG9jLmNoaWxkTm9kZXMubGVuZ3RoIF0ubm9kZVR5cGU7XG59IGNhdGNoICggZSApIHtcblx0cHVzaCA9IHsgYXBwbHk6IGFyci5sZW5ndGggP1xuXG5cdFx0Ly8gTGV2ZXJhZ2Ugc2xpY2UgaWYgcG9zc2libGVcblx0XHRmdW5jdGlvbiggdGFyZ2V0LCBlbHMgKSB7XG5cdFx0XHRwdXNoX25hdGl2ZS5hcHBseSggdGFyZ2V0LCBzbGljZS5jYWxsKGVscykgKTtcblx0XHR9IDpcblxuXHRcdC8vIFN1cHBvcnQ6IElFPDlcblx0XHQvLyBPdGhlcndpc2UgYXBwZW5kIGRpcmVjdGx5XG5cdFx0ZnVuY3Rpb24oIHRhcmdldCwgZWxzICkge1xuXHRcdFx0dmFyIGogPSB0YXJnZXQubGVuZ3RoLFxuXHRcdFx0XHRpID0gMDtcblx0XHRcdC8vIENhbid0IHRydXN0IE5vZGVMaXN0Lmxlbmd0aFxuXHRcdFx0d2hpbGUgKCAodGFyZ2V0W2orK10gPSBlbHNbaSsrXSkgKSB7fVxuXHRcdFx0dGFyZ2V0Lmxlbmd0aCA9IGogLSAxO1xuXHRcdH1cblx0fTtcbn1cblxuZnVuY3Rpb24gU2l6emxlKCBzZWxlY3RvciwgY29udGV4dCwgcmVzdWx0cywgc2VlZCApIHtcblx0dmFyIG1hdGNoLCBlbGVtLCBtLCBub2RlVHlwZSxcblx0XHQvLyBRU0EgdmFyc1xuXHRcdGksIGdyb3Vwcywgb2xkLCBuaWQsIG5ld0NvbnRleHQsIG5ld1NlbGVjdG9yO1xuXG5cdGlmICggKCBjb250ZXh0ID8gY29udGV4dC5vd25lckRvY3VtZW50IHx8IGNvbnRleHQgOiBwcmVmZXJyZWREb2MgKSAhPT0gZG9jdW1lbnQgKSB7XG5cdFx0c2V0RG9jdW1lbnQoIGNvbnRleHQgKTtcblx0fVxuXG5cdGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuXHRyZXN1bHRzID0gcmVzdWx0cyB8fCBbXTtcblxuXHRpZiAoICFzZWxlY3RvciB8fCB0eXBlb2Ygc2VsZWN0b3IgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRpZiAoIChub2RlVHlwZSA9IGNvbnRleHQubm9kZVR5cGUpICE9PSAxICYmIG5vZGVUeXBlICE9PSA5ICkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdGlmICggZG9jdW1lbnRJc0hUTUwgJiYgIXNlZWQgKSB7XG5cblx0XHQvLyBTaG9ydGN1dHNcblx0XHRpZiAoIChtYXRjaCA9IHJxdWlja0V4cHIuZXhlYyggc2VsZWN0b3IgKSkgKSB7XG5cdFx0XHQvLyBTcGVlZC11cDogU2l6emxlKFwiI0lEXCIpXG5cdFx0XHRpZiAoIChtID0gbWF0Y2hbMV0pICkge1xuXHRcdFx0XHRpZiAoIG5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHRcdGVsZW0gPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKCBtICk7XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgcGFyZW50Tm9kZSB0byBjYXRjaCB3aGVuIEJsYWNrYmVycnkgNC42IHJldHVybnNcblx0XHRcdFx0XHQvLyBub2RlcyB0aGF0IGFyZSBubyBsb25nZXIgaW4gdGhlIGRvY3VtZW50IChqUXVlcnkgIzY5NjMpXG5cdFx0XHRcdFx0aWYgKCBlbGVtICYmIGVsZW0ucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0XHRcdC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSBJRSwgT3BlcmEsIGFuZCBXZWJraXQgcmV0dXJuIGl0ZW1zXG5cdFx0XHRcdFx0XHQvLyBieSBuYW1lIGluc3RlYWQgb2YgSURcblx0XHRcdFx0XHRcdGlmICggZWxlbS5pZCA9PT0gbSApIHtcblx0XHRcdFx0XHRcdFx0cmVzdWx0cy5wdXNoKCBlbGVtICk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXN1bHRzO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gQ29udGV4dCBpcyBub3QgYSBkb2N1bWVudFxuXHRcdFx0XHRcdGlmICggY29udGV4dC5vd25lckRvY3VtZW50ICYmIChlbGVtID0gY29udGV4dC5vd25lckRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBtICkpICYmXG5cdFx0XHRcdFx0XHRjb250YWlucyggY29udGV4dCwgZWxlbSApICYmIGVsZW0uaWQgPT09IG0gKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHRzLnB1c2goIGVsZW0gKTtcblx0XHRcdFx0XHRcdHJldHVybiByZXN1bHRzO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHQvLyBTcGVlZC11cDogU2l6emxlKFwiVEFHXCIpXG5cdFx0XHR9IGVsc2UgaWYgKCBtYXRjaFsyXSApIHtcblx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgY29udGV4dC5nZXRFbGVtZW50c0J5VGFnTmFtZSggc2VsZWN0b3IgKSApO1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcblxuXHRcdFx0Ly8gU3BlZWQtdXA6IFNpenpsZShcIi5DTEFTU1wiKVxuXHRcdFx0fSBlbHNlIGlmICggKG0gPSBtYXRjaFszXSkgJiYgc3VwcG9ydC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lICYmIGNvbnRleHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSApIHtcblx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgY29udGV4dC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCBtICkgKTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gUVNBIHBhdGhcblx0XHRpZiAoIHN1cHBvcnQucXNhICYmICghcmJ1Z2d5UVNBIHx8ICFyYnVnZ3lRU0EudGVzdCggc2VsZWN0b3IgKSkgKSB7XG5cdFx0XHRuaWQgPSBvbGQgPSBleHBhbmRvO1xuXHRcdFx0bmV3Q29udGV4dCA9IGNvbnRleHQ7XG5cdFx0XHRuZXdTZWxlY3RvciA9IG5vZGVUeXBlID09PSA5ICYmIHNlbGVjdG9yO1xuXG5cdFx0XHQvLyBxU0Egd29ya3Mgc3RyYW5nZWx5IG9uIEVsZW1lbnQtcm9vdGVkIHF1ZXJpZXNcblx0XHRcdC8vIFdlIGNhbiB3b3JrIGFyb3VuZCB0aGlzIGJ5IHNwZWNpZnlpbmcgYW4gZXh0cmEgSUQgb24gdGhlIHJvb3Rcblx0XHRcdC8vIGFuZCB3b3JraW5nIHVwIGZyb20gdGhlcmUgKFRoYW5rcyB0byBBbmRyZXcgRHVwb250IGZvciB0aGUgdGVjaG5pcXVlKVxuXHRcdFx0Ly8gSUUgOCBkb2Vzbid0IHdvcmsgb24gb2JqZWN0IGVsZW1lbnRzXG5cdFx0XHRpZiAoIG5vZGVUeXBlID09PSAxICYmIGNvbnRleHQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRcdFx0Z3JvdXBzID0gdG9rZW5pemUoIHNlbGVjdG9yICk7XG5cblx0XHRcdFx0aWYgKCAob2xkID0gY29udGV4dC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSkgKSB7XG5cdFx0XHRcdFx0bmlkID0gb2xkLnJlcGxhY2UoIHJlc2NhcGUsIFwiXFxcXCQmXCIgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjb250ZXh0LnNldEF0dHJpYnV0ZSggXCJpZFwiLCBuaWQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRuaWQgPSBcIltpZD0nXCIgKyBuaWQgKyBcIiddIFwiO1xuXG5cdFx0XHRcdGkgPSBncm91cHMubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdFx0XHRncm91cHNbaV0gPSBuaWQgKyB0b1NlbGVjdG9yKCBncm91cHNbaV0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRuZXdDb250ZXh0ID0gcnNpYmxpbmcudGVzdCggc2VsZWN0b3IgKSAmJiB0ZXN0Q29udGV4dCggY29udGV4dC5wYXJlbnROb2RlICkgfHwgY29udGV4dDtcblx0XHRcdFx0bmV3U2VsZWN0b3IgPSBncm91cHMuam9pbihcIixcIik7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggbmV3U2VsZWN0b3IgKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cyxcblx0XHRcdFx0XHRcdG5ld0NvbnRleHQucXVlcnlTZWxlY3RvckFsbCggbmV3U2VsZWN0b3IgKVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0XHRcdH0gY2F0Y2gocXNhRXJyb3IpIHtcblx0XHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0XHRpZiAoICFvbGQgKSB7XG5cdFx0XHRcdFx0XHRjb250ZXh0LnJlbW92ZUF0dHJpYnV0ZShcImlkXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIEFsbCBvdGhlcnNcblx0cmV0dXJuIHNlbGVjdCggc2VsZWN0b3IucmVwbGFjZSggcnRyaW0sIFwiJDFcIiApLCBjb250ZXh0LCByZXN1bHRzLCBzZWVkICk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGtleS12YWx1ZSBjYWNoZXMgb2YgbGltaXRlZCBzaXplXG4gKiBAcmV0dXJucyB7RnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBSZXR1cm5zIHRoZSBPYmplY3QgZGF0YSBhZnRlciBzdG9yaW5nIGl0IG9uIGl0c2VsZiB3aXRoXG4gKlx0cHJvcGVydHkgbmFtZSB0aGUgKHNwYWNlLXN1ZmZpeGVkKSBzdHJpbmcgYW5kIChpZiB0aGUgY2FjaGUgaXMgbGFyZ2VyIHRoYW4gRXhwci5jYWNoZUxlbmd0aClcbiAqXHRkZWxldGluZyB0aGUgb2xkZXN0IGVudHJ5XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNhY2hlKCkge1xuXHR2YXIga2V5cyA9IFtdO1xuXG5cdGZ1bmN0aW9uIGNhY2hlKCBrZXksIHZhbHVlICkge1xuXHRcdC8vIFVzZSAoa2V5ICsgXCIgXCIpIHRvIGF2b2lkIGNvbGxpc2lvbiB3aXRoIG5hdGl2ZSBwcm90b3R5cGUgcHJvcGVydGllcyAoc2VlIElzc3VlICMxNTcpXG5cdFx0aWYgKCBrZXlzLnB1c2goIGtleSArIFwiIFwiICkgPiBFeHByLmNhY2hlTGVuZ3RoICkge1xuXHRcdFx0Ly8gT25seSBrZWVwIHRoZSBtb3N0IHJlY2VudCBlbnRyaWVzXG5cdFx0XHRkZWxldGUgY2FjaGVbIGtleXMuc2hpZnQoKSBdO1xuXHRcdH1cblx0XHRyZXR1cm4gKGNhY2hlWyBrZXkgKyBcIiBcIiBdID0gdmFsdWUpO1xuXHR9XG5cdHJldHVybiBjYWNoZTtcbn1cblxuLyoqXG4gKiBNYXJrIGEgZnVuY3Rpb24gZm9yIHNwZWNpYWwgdXNlIGJ5IFNpenpsZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIG1hcmtcbiAqL1xuZnVuY3Rpb24gbWFya0Z1bmN0aW9uKCBmbiApIHtcblx0Zm5bIGV4cGFuZG8gXSA9IHRydWU7XG5cdHJldHVybiBmbjtcbn1cblxuLyoqXG4gKiBTdXBwb3J0IHRlc3RpbmcgdXNpbmcgYW4gZWxlbWVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gUGFzc2VkIHRoZSBjcmVhdGVkIGRpdiBhbmQgZXhwZWN0cyBhIGJvb2xlYW4gcmVzdWx0XG4gKi9cbmZ1bmN0aW9uIGFzc2VydCggZm4gKSB7XG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXG5cdHRyeSB7XG5cdFx0cmV0dXJuICEhZm4oIGRpdiApO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9IGZpbmFsbHkge1xuXHRcdC8vIFJlbW92ZSBmcm9tIGl0cyBwYXJlbnQgYnkgZGVmYXVsdFxuXHRcdGlmICggZGl2LnBhcmVudE5vZGUgKSB7XG5cdFx0XHRkaXYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCggZGl2ICk7XG5cdFx0fVxuXHRcdC8vIHJlbGVhc2UgbWVtb3J5IGluIElFXG5cdFx0ZGl2ID0gbnVsbDtcblx0fVxufVxuXG4vKipcbiAqIEFkZHMgdGhlIHNhbWUgaGFuZGxlciBmb3IgYWxsIG9mIHRoZSBzcGVjaWZpZWQgYXR0cnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBhdHRycyBQaXBlLXNlcGFyYXRlZCBsaXN0IG9mIGF0dHJpYnV0ZXNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXIgVGhlIG1ldGhvZCB0aGF0IHdpbGwgYmUgYXBwbGllZFxuICovXG5mdW5jdGlvbiBhZGRIYW5kbGUoIGF0dHJzLCBoYW5kbGVyICkge1xuXHR2YXIgYXJyID0gYXR0cnMuc3BsaXQoXCJ8XCIpLFxuXHRcdGkgPSBhdHRycy5sZW5ndGg7XG5cblx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0RXhwci5hdHRySGFuZGxlWyBhcnJbaV0gXSA9IGhhbmRsZXI7XG5cdH1cbn1cblxuLyoqXG4gKiBDaGVja3MgZG9jdW1lbnQgb3JkZXIgb2YgdHdvIHNpYmxpbmdzXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGFcbiAqIEBwYXJhbSB7RWxlbWVudH0gYlxuICogQHJldHVybnMge051bWJlcn0gUmV0dXJucyBsZXNzIHRoYW4gMCBpZiBhIHByZWNlZGVzIGIsIGdyZWF0ZXIgdGhhbiAwIGlmIGEgZm9sbG93cyBiXG4gKi9cbmZ1bmN0aW9uIHNpYmxpbmdDaGVjayggYSwgYiApIHtcblx0dmFyIGN1ciA9IGIgJiYgYSxcblx0XHRkaWZmID0gY3VyICYmIGEubm9kZVR5cGUgPT09IDEgJiYgYi5ub2RlVHlwZSA9PT0gMSAmJlxuXHRcdFx0KCB+Yi5zb3VyY2VJbmRleCB8fCBNQVhfTkVHQVRJVkUgKSAtXG5cdFx0XHQoIH5hLnNvdXJjZUluZGV4IHx8IE1BWF9ORUdBVElWRSApO1xuXG5cdC8vIFVzZSBJRSBzb3VyY2VJbmRleCBpZiBhdmFpbGFibGUgb24gYm90aCBub2Rlc1xuXHRpZiAoIGRpZmYgKSB7XG5cdFx0cmV0dXJuIGRpZmY7XG5cdH1cblxuXHQvLyBDaGVjayBpZiBiIGZvbGxvd3MgYVxuXHRpZiAoIGN1ciApIHtcblx0XHR3aGlsZSAoIChjdXIgPSBjdXIubmV4dFNpYmxpbmcpICkge1xuXHRcdFx0aWYgKCBjdXIgPT09IGIgKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYSA/IDEgOiAtMTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdG8gdXNlIGluIHBzZXVkb3MgZm9yIGlucHV0IHR5cGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICovXG5mdW5jdGlvbiBjcmVhdGVJbnB1dFBzZXVkbyggdHlwZSApIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHZhciBuYW1lID0gZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdHJldHVybiBuYW1lID09PSBcImlucHV0XCIgJiYgZWxlbS50eXBlID09PSB0eXBlO1xuXHR9O1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0byB1c2UgaW4gcHNldWRvcyBmb3IgYnV0dG9uc1xuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqL1xuZnVuY3Rpb24gY3JlYXRlQnV0dG9uUHNldWRvKCB0eXBlICkge1xuXHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0dmFyIG5hbWUgPSBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0cmV0dXJuIChuYW1lID09PSBcImlucHV0XCIgfHwgbmFtZSA9PT0gXCJidXR0b25cIikgJiYgZWxlbS50eXBlID09PSB0eXBlO1xuXHR9O1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmdW5jdGlvbiB0byB1c2UgaW4gcHNldWRvcyBmb3IgcG9zaXRpb25hbHNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBvc2l0aW9uYWxQc2V1ZG8oIGZuICkge1xuXHRyZXR1cm4gbWFya0Z1bmN0aW9uKGZ1bmN0aW9uKCBhcmd1bWVudCApIHtcblx0XHRhcmd1bWVudCA9ICthcmd1bWVudDtcblx0XHRyZXR1cm4gbWFya0Z1bmN0aW9uKGZ1bmN0aW9uKCBzZWVkLCBtYXRjaGVzICkge1xuXHRcdFx0dmFyIGosXG5cdFx0XHRcdG1hdGNoSW5kZXhlcyA9IGZuKCBbXSwgc2VlZC5sZW5ndGgsIGFyZ3VtZW50ICksXG5cdFx0XHRcdGkgPSBtYXRjaEluZGV4ZXMubGVuZ3RoO1xuXG5cdFx0XHQvLyBNYXRjaCBlbGVtZW50cyBmb3VuZCBhdCB0aGUgc3BlY2lmaWVkIGluZGV4ZXNcblx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRpZiAoIHNlZWRbIChqID0gbWF0Y2hJbmRleGVzW2ldKSBdICkge1xuXHRcdFx0XHRcdHNlZWRbal0gPSAhKG1hdGNoZXNbal0gPSBzZWVkW2pdKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLyoqXG4gKiBDaGVja3MgYSBub2RlIGZvciB2YWxpZGl0eSBhcyBhIFNpenpsZSBjb250ZXh0XG4gKiBAcGFyYW0ge0VsZW1lbnR8T2JqZWN0PX0gY29udGV4dFxuICogQHJldHVybnMge0VsZW1lbnR8T2JqZWN0fEJvb2xlYW59IFRoZSBpbnB1dCBub2RlIGlmIGFjY2VwdGFibGUsIG90aGVyd2lzZSBhIGZhbHN5IHZhbHVlXG4gKi9cbmZ1bmN0aW9uIHRlc3RDb250ZXh0KCBjb250ZXh0ICkge1xuXHRyZXR1cm4gY29udGV4dCAmJiB0eXBlb2YgY29udGV4dC5nZXRFbGVtZW50c0J5VGFnTmFtZSAhPT0gc3RydW5kZWZpbmVkICYmIGNvbnRleHQ7XG59XG5cbi8vIEV4cG9zZSBzdXBwb3J0IHZhcnMgZm9yIGNvbnZlbmllbmNlXG5zdXBwb3J0ID0gU2l6emxlLnN1cHBvcnQgPSB7fTtcblxuLyoqXG4gKiBEZXRlY3RzIFhNTCBub2Rlc1xuICogQHBhcmFtIHtFbGVtZW50fE9iamVjdH0gZWxlbSBBbiBlbGVtZW50IG9yIGEgZG9jdW1lbnRcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmZiBlbGVtIGlzIGEgbm9uLUhUTUwgWE1MIG5vZGVcbiAqL1xuaXNYTUwgPSBTaXp6bGUuaXNYTUwgPSBmdW5jdGlvbiggZWxlbSApIHtcblx0Ly8gZG9jdW1lbnRFbGVtZW50IGlzIHZlcmlmaWVkIGZvciBjYXNlcyB3aGVyZSBpdCBkb2Vzbid0IHlldCBleGlzdFxuXHQvLyAoc3VjaCBhcyBsb2FkaW5nIGlmcmFtZXMgaW4gSUUgLSAjNDgzMylcblx0dmFyIGRvY3VtZW50RWxlbWVudCA9IGVsZW0gJiYgKGVsZW0ub3duZXJEb2N1bWVudCB8fCBlbGVtKS5kb2N1bWVudEVsZW1lbnQ7XG5cdHJldHVybiBkb2N1bWVudEVsZW1lbnQgPyBkb2N1bWVudEVsZW1lbnQubm9kZU5hbWUgIT09IFwiSFRNTFwiIDogZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldHMgZG9jdW1lbnQtcmVsYXRlZCB2YXJpYWJsZXMgb25jZSBiYXNlZCBvbiB0aGUgY3VycmVudCBkb2N1bWVudFxuICogQHBhcmFtIHtFbGVtZW50fE9iamVjdH0gW2RvY10gQW4gZWxlbWVudCBvciBkb2N1bWVudCBvYmplY3QgdG8gdXNlIHRvIHNldCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGN1cnJlbnQgZG9jdW1lbnRcbiAqL1xuc2V0RG9jdW1lbnQgPSBTaXp6bGUuc2V0RG9jdW1lbnQgPSBmdW5jdGlvbiggbm9kZSApIHtcblx0dmFyIGhhc0NvbXBhcmUsXG5cdFx0ZG9jID0gbm9kZSA/IG5vZGUub3duZXJEb2N1bWVudCB8fCBub2RlIDogcHJlZmVycmVkRG9jLFxuXHRcdHBhcmVudCA9IGRvYy5kZWZhdWx0VmlldztcblxuXHQvLyBJZiBubyBkb2N1bWVudCBhbmQgZG9jdW1lbnRFbGVtZW50IGlzIGF2YWlsYWJsZSwgcmV0dXJuXG5cdGlmICggZG9jID09PSBkb2N1bWVudCB8fCBkb2Mubm9kZVR5cGUgIT09IDkgfHwgIWRvYy5kb2N1bWVudEVsZW1lbnQgKSB7XG5cdFx0cmV0dXJuIGRvY3VtZW50O1xuXHR9XG5cblx0Ly8gU2V0IG91ciBkb2N1bWVudFxuXHRkb2N1bWVudCA9IGRvYztcblx0ZG9jRWxlbSA9IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG5cblx0Ly8gU3VwcG9ydCB0ZXN0c1xuXHRkb2N1bWVudElzSFRNTCA9ICFpc1hNTCggZG9jICk7XG5cblx0Ly8gU3VwcG9ydDogSUU+OFxuXHQvLyBJZiBpZnJhbWUgZG9jdW1lbnQgaXMgYXNzaWduZWQgdG8gXCJkb2N1bWVudFwiIHZhcmlhYmxlIGFuZCBpZiBpZnJhbWUgaGFzIGJlZW4gcmVsb2FkZWQsXG5cdC8vIElFIHdpbGwgdGhyb3cgXCJwZXJtaXNzaW9uIGRlbmllZFwiIGVycm9yIHdoZW4gYWNjZXNzaW5nIFwiZG9jdW1lbnRcIiB2YXJpYWJsZSwgc2VlIGpRdWVyeSAjMTM5MzZcblx0Ly8gSUU2LTggZG8gbm90IHN1cHBvcnQgdGhlIGRlZmF1bHRWaWV3IHByb3BlcnR5IHNvIHBhcmVudCB3aWxsIGJlIHVuZGVmaW5lZFxuXHRpZiAoIHBhcmVudCAmJiBwYXJlbnQgIT09IHBhcmVudC50b3AgKSB7XG5cdFx0Ly8gSUUxMSBkb2VzIG5vdCBoYXZlIGF0dGFjaEV2ZW50LCBzbyBhbGwgbXVzdCBzdWZmZXJcblx0XHRpZiAoIHBhcmVudC5hZGRFdmVudExpc3RlbmVyICkge1xuXHRcdFx0cGFyZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwidW5sb2FkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZXREb2N1bWVudCgpO1xuXHRcdFx0fSwgZmFsc2UgKTtcblx0XHR9IGVsc2UgaWYgKCBwYXJlbnQuYXR0YWNoRXZlbnQgKSB7XG5cdFx0XHRwYXJlbnQuYXR0YWNoRXZlbnQoIFwib251bmxvYWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNldERvY3VtZW50KCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHQvKiBBdHRyaWJ1dGVzXG5cdC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuXHQvLyBTdXBwb3J0OiBJRTw4XG5cdC8vIFZlcmlmeSB0aGF0IGdldEF0dHJpYnV0ZSByZWFsbHkgcmV0dXJucyBhdHRyaWJ1dGVzIGFuZCBub3QgcHJvcGVydGllcyAoZXhjZXB0aW5nIElFOCBib29sZWFucylcblx0c3VwcG9ydC5hdHRyaWJ1dGVzID0gYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiaVwiO1xuXHRcdHJldHVybiAhZGl2LmdldEF0dHJpYnV0ZShcImNsYXNzTmFtZVwiKTtcblx0fSk7XG5cblx0LyogZ2V0RWxlbWVudChzKUJ5KlxuXHQtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cblx0Ly8gQ2hlY2sgaWYgZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCIqXCIpIHJldHVybnMgb25seSBlbGVtZW50c1xuXHRzdXBwb3J0LmdldEVsZW1lbnRzQnlUYWdOYW1lID0gYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdFx0ZGl2LmFwcGVuZENoaWxkKCBkb2MuY3JlYXRlQ29tbWVudChcIlwiKSApO1xuXHRcdHJldHVybiAhZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiKlwiKS5sZW5ndGg7XG5cdH0pO1xuXG5cdC8vIENoZWNrIGlmIGdldEVsZW1lbnRzQnlDbGFzc05hbWUgY2FuIGJlIHRydXN0ZWRcblx0c3VwcG9ydC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lID0gcm5hdGl2ZS50ZXN0KCBkb2MuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSApICYmIGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xuXHRcdGRpdi5pbm5lckhUTUwgPSBcIjxkaXYgY2xhc3M9J2EnPjwvZGl2PjxkaXYgY2xhc3M9J2EgaSc+PC9kaXY+XCI7XG5cblx0XHQvLyBTdXBwb3J0OiBTYWZhcmk8NFxuXHRcdC8vIENhdGNoIGNsYXNzIG92ZXItY2FjaGluZ1xuXHRcdGRpdi5maXJzdENoaWxkLmNsYXNzTmFtZSA9IFwiaVwiO1xuXHRcdC8vIFN1cHBvcnQ6IE9wZXJhPDEwXG5cdFx0Ly8gQ2F0Y2ggZ0VCQ04gZmFpbHVyZSB0byBmaW5kIG5vbi1sZWFkaW5nIGNsYXNzZXNcblx0XHRyZXR1cm4gZGl2LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJpXCIpLmxlbmd0aCA9PT0gMjtcblx0fSk7XG5cblx0Ly8gU3VwcG9ydDogSUU8MTBcblx0Ly8gQ2hlY2sgaWYgZ2V0RWxlbWVudEJ5SWQgcmV0dXJucyBlbGVtZW50cyBieSBuYW1lXG5cdC8vIFRoZSBicm9rZW4gZ2V0RWxlbWVudEJ5SWQgbWV0aG9kcyBkb24ndCBwaWNrIHVwIHByb2dyYW1hdGljYWxseS1zZXQgbmFtZXMsXG5cdC8vIHNvIHVzZSBhIHJvdW5kYWJvdXQgZ2V0RWxlbWVudHNCeU5hbWUgdGVzdFxuXHRzdXBwb3J0LmdldEJ5SWQgPSBhc3NlcnQoZnVuY3Rpb24oIGRpdiApIHtcblx0XHRkb2NFbGVtLmFwcGVuZENoaWxkKCBkaXYgKS5pZCA9IGV4cGFuZG87XG5cdFx0cmV0dXJuICFkb2MuZ2V0RWxlbWVudHNCeU5hbWUgfHwgIWRvYy5nZXRFbGVtZW50c0J5TmFtZSggZXhwYW5kbyApLmxlbmd0aDtcblx0fSk7XG5cblx0Ly8gSUQgZmluZCBhbmQgZmlsdGVyXG5cdGlmICggc3VwcG9ydC5nZXRCeUlkICkge1xuXHRcdEV4cHIuZmluZFtcIklEXCJdID0gZnVuY3Rpb24oIGlkLCBjb250ZXh0ICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgY29udGV4dC5nZXRFbGVtZW50QnlJZCAhPT0gc3RydW5kZWZpbmVkICYmIGRvY3VtZW50SXNIVE1MICkge1xuXHRcdFx0XHR2YXIgbSA9IGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQoIGlkICk7XG5cdFx0XHRcdC8vIENoZWNrIHBhcmVudE5vZGUgdG8gY2F0Y2ggd2hlbiBCbGFja2JlcnJ5IDQuNiByZXR1cm5zXG5cdFx0XHRcdC8vIG5vZGVzIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgZG9jdW1lbnQgIzY5NjNcblx0XHRcdFx0cmV0dXJuIG0gJiYgbS5wYXJlbnROb2RlID8gWyBtIF0gOiBbXTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdEV4cHIuZmlsdGVyW1wiSURcIl0gPSBmdW5jdGlvbiggaWQgKSB7XG5cdFx0XHR2YXIgYXR0cklkID0gaWQucmVwbGFjZSggcnVuZXNjYXBlLCBmdW5lc2NhcGUgKTtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0cmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwiaWRcIikgPT09IGF0dHJJZDtcblx0XHRcdH07XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHQvLyBTdXBwb3J0OiBJRTYvN1xuXHRcdC8vIGdldEVsZW1lbnRCeUlkIGlzIG5vdCByZWxpYWJsZSBhcyBhIGZpbmQgc2hvcnRjdXRcblx0XHRkZWxldGUgRXhwci5maW5kW1wiSURcIl07XG5cblx0XHRFeHByLmZpbHRlcltcIklEXCJdID0gIGZ1bmN0aW9uKCBpZCApIHtcblx0XHRcdHZhciBhdHRySWQgPSBpZC5yZXBsYWNlKCBydW5lc2NhcGUsIGZ1bmVzY2FwZSApO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0XHR2YXIgbm9kZSA9IHR5cGVvZiBlbGVtLmdldEF0dHJpYnV0ZU5vZGUgIT09IHN0cnVuZGVmaW5lZCAmJiBlbGVtLmdldEF0dHJpYnV0ZU5vZGUoXCJpZFwiKTtcblx0XHRcdFx0cmV0dXJuIG5vZGUgJiYgbm9kZS52YWx1ZSA9PT0gYXR0cklkO1xuXHRcdFx0fTtcblx0XHR9O1xuXHR9XG5cblx0Ly8gVGFnXG5cdEV4cHIuZmluZFtcIlRBR1wiXSA9IHN1cHBvcnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUgP1xuXHRcdGZ1bmN0aW9uKCB0YWcsIGNvbnRleHQgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lICE9PSBzdHJ1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHJldHVybiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCB0YWcgKTtcblx0XHRcdH1cblx0XHR9IDpcblx0XHRmdW5jdGlvbiggdGFnLCBjb250ZXh0ICkge1xuXHRcdFx0dmFyIGVsZW0sXG5cdFx0XHRcdHRtcCA9IFtdLFxuXHRcdFx0XHRpID0gMCxcblx0XHRcdFx0cmVzdWx0cyA9IGNvbnRleHQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIHRhZyApO1xuXG5cdFx0XHQvLyBGaWx0ZXIgb3V0IHBvc3NpYmxlIGNvbW1lbnRzXG5cdFx0XHRpZiAoIHRhZyA9PT0gXCIqXCIgKSB7XG5cdFx0XHRcdHdoaWxlICggKGVsZW0gPSByZXN1bHRzW2krK10pICkge1xuXHRcdFx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA9PT0gMSApIHtcblx0XHRcdFx0XHRcdHRtcC5wdXNoKCBlbGVtICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHRtcDtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHRzO1xuXHRcdH07XG5cblx0Ly8gQ2xhc3Ncblx0RXhwci5maW5kW1wiQ0xBU1NcIl0gPSBzdXBwb3J0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUgJiYgZnVuY3Rpb24oIGNsYXNzTmFtZSwgY29udGV4dCApIHtcblx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUgIT09IHN0cnVuZGVmaW5lZCAmJiBkb2N1bWVudElzSFRNTCApIHtcblx0XHRcdHJldHVybiBjb250ZXh0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoIGNsYXNzTmFtZSApO1xuXHRcdH1cblx0fTtcblxuXHQvKiBRU0EvbWF0Y2hlc1NlbGVjdG9yXG5cdC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuXHQvLyBRU0EgYW5kIG1hdGNoZXNTZWxlY3RvciBzdXBwb3J0XG5cblx0Ly8gbWF0Y2hlc1NlbGVjdG9yKDphY3RpdmUpIHJlcG9ydHMgZmFsc2Ugd2hlbiB0cnVlIChJRTkvT3BlcmEgMTEuNSlcblx0cmJ1Z2d5TWF0Y2hlcyA9IFtdO1xuXG5cdC8vIHFTYSg6Zm9jdXMpIHJlcG9ydHMgZmFsc2Ugd2hlbiB0cnVlIChDaHJvbWUgMjEpXG5cdC8vIFdlIGFsbG93IHRoaXMgYmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRTgvOSB0aGF0IHRocm93cyBhbiBlcnJvclxuXHQvLyB3aGVuZXZlciBgZG9jdW1lbnQuYWN0aXZlRWxlbWVudGAgaXMgYWNjZXNzZWQgb24gYW4gaWZyYW1lXG5cdC8vIFNvLCB3ZSBhbGxvdyA6Zm9jdXMgdG8gcGFzcyB0aHJvdWdoIFFTQSBhbGwgdGhlIHRpbWUgdG8gYXZvaWQgdGhlIElFIGVycm9yXG5cdC8vIFNlZSBodHRwOi8vYnVncy5qcXVlcnkuY29tL3RpY2tldC8xMzM3OFxuXHRyYnVnZ3lRU0EgPSBbXTtcblxuXHRpZiAoIChzdXBwb3J0LnFzYSA9IHJuYXRpdmUudGVzdCggZG9jLnF1ZXJ5U2VsZWN0b3JBbGwgKSkgKSB7XG5cdFx0Ly8gQnVpbGQgUVNBIHJlZ2V4XG5cdFx0Ly8gUmVnZXggc3RyYXRlZ3kgYWRvcHRlZCBmcm9tIERpZWdvIFBlcmluaVxuXHRcdGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xuXHRcdFx0Ly8gU2VsZWN0IGlzIHNldCB0byBlbXB0eSBzdHJpbmcgb24gcHVycG9zZVxuXHRcdFx0Ly8gVGhpcyBpcyB0byB0ZXN0IElFJ3MgdHJlYXRtZW50IG9mIG5vdCBleHBsaWNpdGx5XG5cdFx0XHQvLyBzZXR0aW5nIGEgYm9vbGVhbiBjb250ZW50IGF0dHJpYnV0ZSxcblx0XHRcdC8vIHNpbmNlIGl0cyBwcmVzZW5jZSBzaG91bGQgYmUgZW5vdWdoXG5cdFx0XHQvLyBodHRwOi8vYnVncy5qcXVlcnkuY29tL3RpY2tldC8xMjM1OVxuXHRcdFx0ZGl2LmlubmVySFRNTCA9IFwiPHNlbGVjdCBtc2FsbG93Y2xpcD0nJz48b3B0aW9uIHNlbGVjdGVkPScnPjwvb3B0aW9uPjwvc2VsZWN0PlwiO1xuXG5cdFx0XHQvLyBTdXBwb3J0OiBJRTgsIE9wZXJhIDExLTEyLjE2XG5cdFx0XHQvLyBOb3RoaW5nIHNob3VsZCBiZSBzZWxlY3RlZCB3aGVuIGVtcHR5IHN0cmluZ3MgZm9sbG93IF49IG9yICQ9IG9yICo9XG5cdFx0XHQvLyBUaGUgdGVzdCBhdHRyaWJ1dGUgbXVzdCBiZSB1bmtub3duIGluIE9wZXJhIGJ1dCBcInNhZmVcIiBmb3IgV2luUlRcblx0XHRcdC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9oaDQ2NTM4OC5hc3B4I2F0dHJpYnV0ZV9zZWN0aW9uXG5cdFx0XHRpZiAoIGRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiW21zYWxsb3djbGlwXj0nJ11cIikubGVuZ3RoICkge1xuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaCggXCJbKl4kXT1cIiArIHdoaXRlc3BhY2UgKyBcIiooPzonJ3xcXFwiXFxcIilcIiApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdXBwb3J0OiBJRThcblx0XHRcdC8vIEJvb2xlYW4gYXR0cmlidXRlcyBhbmQgXCJ2YWx1ZVwiIGFyZSBub3QgdHJlYXRlZCBjb3JyZWN0bHlcblx0XHRcdGlmICggIWRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiW3NlbGVjdGVkXVwiKS5sZW5ndGggKSB7XG5cdFx0XHRcdHJidWdneVFTQS5wdXNoKCBcIlxcXFxbXCIgKyB3aGl0ZXNwYWNlICsgXCIqKD86dmFsdWV8XCIgKyBib29sZWFucyArIFwiKVwiICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFdlYmtpdC9PcGVyYSAtIDpjaGVja2VkIHNob3VsZCByZXR1cm4gc2VsZWN0ZWQgb3B0aW9uIGVsZW1lbnRzXG5cdFx0XHQvLyBodHRwOi8vd3d3LnczLm9yZy9UUi8yMDExL1JFQy1jc3MzLXNlbGVjdG9ycy0yMDExMDkyOS8jY2hlY2tlZFxuXHRcdFx0Ly8gSUU4IHRocm93cyBlcnJvciBoZXJlIGFuZCB3aWxsIG5vdCBzZWUgbGF0ZXIgdGVzdHNcblx0XHRcdGlmICggIWRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiOmNoZWNrZWRcIikubGVuZ3RoICkge1xuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaChcIjpjaGVja2VkXCIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0YXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdFx0XHQvLyBTdXBwb3J0OiBXaW5kb3dzIDggTmF0aXZlIEFwcHNcblx0XHRcdC8vIFRoZSB0eXBlIGFuZCBuYW1lIGF0dHJpYnV0ZXMgYXJlIHJlc3RyaWN0ZWQgZHVyaW5nIC5pbm5lckhUTUwgYXNzaWdubWVudFxuXHRcdFx0dmFyIGlucHV0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcblx0XHRcdGlucHV0LnNldEF0dHJpYnV0ZSggXCJ0eXBlXCIsIFwiaGlkZGVuXCIgKTtcblx0XHRcdGRpdi5hcHBlbmRDaGlsZCggaW5wdXQgKS5zZXRBdHRyaWJ1dGUoIFwibmFtZVwiLCBcIkRcIiApO1xuXG5cdFx0XHQvLyBTdXBwb3J0OiBJRThcblx0XHRcdC8vIEVuZm9yY2UgY2FzZS1zZW5zaXRpdml0eSBvZiBuYW1lIGF0dHJpYnV0ZVxuXHRcdFx0aWYgKCBkaXYucXVlcnlTZWxlY3RvckFsbChcIltuYW1lPWRdXCIpLmxlbmd0aCApIHtcblx0XHRcdFx0cmJ1Z2d5UVNBLnB1c2goIFwibmFtZVwiICsgd2hpdGVzcGFjZSArIFwiKlsqXiR8IX5dPz1cIiApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGRiAzLjUgLSA6ZW5hYmxlZC86ZGlzYWJsZWQgYW5kIGhpZGRlbiBlbGVtZW50cyAoaGlkZGVuIGVsZW1lbnRzIGFyZSBzdGlsbCBlbmFibGVkKVxuXHRcdFx0Ly8gSUU4IHRocm93cyBlcnJvciBoZXJlIGFuZCB3aWxsIG5vdCBzZWUgbGF0ZXIgdGVzdHNcblx0XHRcdGlmICggIWRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiOmVuYWJsZWRcIikubGVuZ3RoICkge1xuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaCggXCI6ZW5hYmxlZFwiLCBcIjpkaXNhYmxlZFwiICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE9wZXJhIDEwLTExIGRvZXMgbm90IHRocm93IG9uIHBvc3QtY29tbWEgaW52YWxpZCBwc2V1ZG9zXG5cdFx0XHRkaXYucXVlcnlTZWxlY3RvckFsbChcIiosOnhcIik7XG5cdFx0XHRyYnVnZ3lRU0EucHVzaChcIiwuKjpcIik7XG5cdFx0fSk7XG5cdH1cblxuXHRpZiAoIChzdXBwb3J0Lm1hdGNoZXNTZWxlY3RvciA9IHJuYXRpdmUudGVzdCggKG1hdGNoZXMgPSBkb2NFbGVtLm1hdGNoZXMgfHxcblx0XHRkb2NFbGVtLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuXHRcdGRvY0VsZW0ubW96TWF0Y2hlc1NlbGVjdG9yIHx8XG5cdFx0ZG9jRWxlbS5vTWF0Y2hlc1NlbGVjdG9yIHx8XG5cdFx0ZG9jRWxlbS5tc01hdGNoZXNTZWxlY3RvcikgKSkgKSB7XG5cblx0XHRhc3NlcnQoZnVuY3Rpb24oIGRpdiApIHtcblx0XHRcdC8vIENoZWNrIHRvIHNlZSBpZiBpdCdzIHBvc3NpYmxlIHRvIGRvIG1hdGNoZXNTZWxlY3RvclxuXHRcdFx0Ly8gb24gYSBkaXNjb25uZWN0ZWQgbm9kZSAoSUUgOSlcblx0XHRcdHN1cHBvcnQuZGlzY29ubmVjdGVkTWF0Y2ggPSBtYXRjaGVzLmNhbGwoIGRpdiwgXCJkaXZcIiApO1xuXG5cdFx0XHQvLyBUaGlzIHNob3VsZCBmYWlsIHdpdGggYW4gZXhjZXB0aW9uXG5cdFx0XHQvLyBHZWNrbyBkb2VzIG5vdCBlcnJvciwgcmV0dXJucyBmYWxzZSBpbnN0ZWFkXG5cdFx0XHRtYXRjaGVzLmNhbGwoIGRpdiwgXCJbcyE9JyddOnhcIiApO1xuXHRcdFx0cmJ1Z2d5TWF0Y2hlcy5wdXNoKCBcIiE9XCIsIHBzZXVkb3MgKTtcblx0XHR9KTtcblx0fVxuXG5cdHJidWdneVFTQSA9IHJidWdneVFTQS5sZW5ndGggJiYgbmV3IFJlZ0V4cCggcmJ1Z2d5UVNBLmpvaW4oXCJ8XCIpICk7XG5cdHJidWdneU1hdGNoZXMgPSByYnVnZ3lNYXRjaGVzLmxlbmd0aCAmJiBuZXcgUmVnRXhwKCByYnVnZ3lNYXRjaGVzLmpvaW4oXCJ8XCIpICk7XG5cblx0LyogQ29udGFpbnNcblx0LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXHRoYXNDb21wYXJlID0gcm5hdGl2ZS50ZXN0KCBkb2NFbGVtLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uICk7XG5cblx0Ly8gRWxlbWVudCBjb250YWlucyBhbm90aGVyXG5cdC8vIFB1cnBvc2VmdWxseSBkb2VzIG5vdCBpbXBsZW1lbnQgaW5jbHVzaXZlIGRlc2NlbmRlbnRcblx0Ly8gQXMgaW4sIGFuIGVsZW1lbnQgZG9lcyBub3QgY29udGFpbiBpdHNlbGZcblx0Y29udGFpbnMgPSBoYXNDb21wYXJlIHx8IHJuYXRpdmUudGVzdCggZG9jRWxlbS5jb250YWlucyApID9cblx0XHRmdW5jdGlvbiggYSwgYiApIHtcblx0XHRcdHZhciBhZG93biA9IGEubm9kZVR5cGUgPT09IDkgPyBhLmRvY3VtZW50RWxlbWVudCA6IGEsXG5cdFx0XHRcdGJ1cCA9IGIgJiYgYi5wYXJlbnROb2RlO1xuXHRcdFx0cmV0dXJuIGEgPT09IGJ1cCB8fCAhISggYnVwICYmIGJ1cC5ub2RlVHlwZSA9PT0gMSAmJiAoXG5cdFx0XHRcdGFkb3duLmNvbnRhaW5zID9cblx0XHRcdFx0XHRhZG93bi5jb250YWlucyggYnVwICkgOlxuXHRcdFx0XHRcdGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24gJiYgYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiggYnVwICkgJiAxNlxuXHRcdFx0KSk7XG5cdFx0fSA6XG5cdFx0ZnVuY3Rpb24oIGEsIGIgKSB7XG5cdFx0XHRpZiAoIGIgKSB7XG5cdFx0XHRcdHdoaWxlICggKGIgPSBiLnBhcmVudE5vZGUpICkge1xuXHRcdFx0XHRcdGlmICggYiA9PT0gYSApIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cblx0LyogU29ydGluZ1xuXHQtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cblx0Ly8gRG9jdW1lbnQgb3JkZXIgc29ydGluZ1xuXHRzb3J0T3JkZXIgPSBoYXNDb21wYXJlID9cblx0ZnVuY3Rpb24oIGEsIGIgKSB7XG5cblx0XHQvLyBGbGFnIGZvciBkdXBsaWNhdGUgcmVtb3ZhbFxuXHRcdGlmICggYSA9PT0gYiApIHtcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHQvLyBTb3J0IG9uIG1ldGhvZCBleGlzdGVuY2UgaWYgb25seSBvbmUgaW5wdXQgaGFzIGNvbXBhcmVEb2N1bWVudFBvc2l0aW9uXG5cdFx0dmFyIGNvbXBhcmUgPSAhYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiAtICFiLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uO1xuXHRcdGlmICggY29tcGFyZSApIHtcblx0XHRcdHJldHVybiBjb21wYXJlO1xuXHRcdH1cblxuXHRcdC8vIENhbGN1bGF0ZSBwb3NpdGlvbiBpZiBib3RoIGlucHV0cyBiZWxvbmcgdG8gdGhlIHNhbWUgZG9jdW1lbnRcblx0XHRjb21wYXJlID0gKCBhLm93bmVyRG9jdW1lbnQgfHwgYSApID09PSAoIGIub3duZXJEb2N1bWVudCB8fCBiICkgP1xuXHRcdFx0YS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiggYiApIDpcblxuXHRcdFx0Ly8gT3RoZXJ3aXNlIHdlIGtub3cgdGhleSBhcmUgZGlzY29ubmVjdGVkXG5cdFx0XHQxO1xuXG5cdFx0Ly8gRGlzY29ubmVjdGVkIG5vZGVzXG5cdFx0aWYgKCBjb21wYXJlICYgMSB8fFxuXHRcdFx0KCFzdXBwb3J0LnNvcnREZXRhY2hlZCAmJiBiLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKCBhICkgPT09IGNvbXBhcmUpICkge1xuXG5cdFx0XHQvLyBDaG9vc2UgdGhlIGZpcnN0IGVsZW1lbnQgdGhhdCBpcyByZWxhdGVkIHRvIG91ciBwcmVmZXJyZWQgZG9jdW1lbnRcblx0XHRcdGlmICggYSA9PT0gZG9jIHx8IGEub3duZXJEb2N1bWVudCA9PT0gcHJlZmVycmVkRG9jICYmIGNvbnRhaW5zKHByZWZlcnJlZERvYywgYSkgKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHRcdGlmICggYiA9PT0gZG9jIHx8IGIub3duZXJEb2N1bWVudCA9PT0gcHJlZmVycmVkRG9jICYmIGNvbnRhaW5zKHByZWZlcnJlZERvYywgYikgKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYWludGFpbiBvcmlnaW5hbCBvcmRlclxuXHRcdFx0cmV0dXJuIHNvcnRJbnB1dCA/XG5cdFx0XHRcdCggaW5kZXhPZi5jYWxsKCBzb3J0SW5wdXQsIGEgKSAtIGluZGV4T2YuY2FsbCggc29ydElucHV0LCBiICkgKSA6XG5cdFx0XHRcdDA7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNvbXBhcmUgJiA0ID8gLTEgOiAxO1xuXHR9IDpcblx0ZnVuY3Rpb24oIGEsIGIgKSB7XG5cdFx0Ly8gRXhpdCBlYXJseSBpZiB0aGUgbm9kZXMgYXJlIGlkZW50aWNhbFxuXHRcdGlmICggYSA9PT0gYiApIHtcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHR2YXIgY3VyLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRhdXAgPSBhLnBhcmVudE5vZGUsXG5cdFx0XHRidXAgPSBiLnBhcmVudE5vZGUsXG5cdFx0XHRhcCA9IFsgYSBdLFxuXHRcdFx0YnAgPSBbIGIgXTtcblxuXHRcdC8vIFBhcmVudGxlc3Mgbm9kZXMgYXJlIGVpdGhlciBkb2N1bWVudHMgb3IgZGlzY29ubmVjdGVkXG5cdFx0aWYgKCAhYXVwIHx8ICFidXAgKSB7XG5cdFx0XHRyZXR1cm4gYSA9PT0gZG9jID8gLTEgOlxuXHRcdFx0XHRiID09PSBkb2MgPyAxIDpcblx0XHRcdFx0YXVwID8gLTEgOlxuXHRcdFx0XHRidXAgPyAxIDpcblx0XHRcdFx0c29ydElucHV0ID9cblx0XHRcdFx0KCBpbmRleE9mLmNhbGwoIHNvcnRJbnB1dCwgYSApIC0gaW5kZXhPZi5jYWxsKCBzb3J0SW5wdXQsIGIgKSApIDpcblx0XHRcdFx0MDtcblxuXHRcdC8vIElmIHRoZSBub2RlcyBhcmUgc2libGluZ3MsIHdlIGNhbiBkbyBhIHF1aWNrIGNoZWNrXG5cdFx0fSBlbHNlIGlmICggYXVwID09PSBidXAgKSB7XG5cdFx0XHRyZXR1cm4gc2libGluZ0NoZWNrKCBhLCBiICk7XG5cdFx0fVxuXG5cdFx0Ly8gT3RoZXJ3aXNlIHdlIG5lZWQgZnVsbCBsaXN0cyBvZiB0aGVpciBhbmNlc3RvcnMgZm9yIGNvbXBhcmlzb25cblx0XHRjdXIgPSBhO1xuXHRcdHdoaWxlICggKGN1ciA9IGN1ci5wYXJlbnROb2RlKSApIHtcblx0XHRcdGFwLnVuc2hpZnQoIGN1ciApO1xuXHRcdH1cblx0XHRjdXIgPSBiO1xuXHRcdHdoaWxlICggKGN1ciA9IGN1ci5wYXJlbnROb2RlKSApIHtcblx0XHRcdGJwLnVuc2hpZnQoIGN1ciApO1xuXHRcdH1cblxuXHRcdC8vIFdhbGsgZG93biB0aGUgdHJlZSBsb29raW5nIGZvciBhIGRpc2NyZXBhbmN5XG5cdFx0d2hpbGUgKCBhcFtpXSA9PT0gYnBbaV0gKSB7XG5cdFx0XHRpKys7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGkgP1xuXHRcdFx0Ly8gRG8gYSBzaWJsaW5nIGNoZWNrIGlmIHRoZSBub2RlcyBoYXZlIGEgY29tbW9uIGFuY2VzdG9yXG5cdFx0XHRzaWJsaW5nQ2hlY2soIGFwW2ldLCBicFtpXSApIDpcblxuXHRcdFx0Ly8gT3RoZXJ3aXNlIG5vZGVzIGluIG91ciBkb2N1bWVudCBzb3J0IGZpcnN0XG5cdFx0XHRhcFtpXSA9PT0gcHJlZmVycmVkRG9jID8gLTEgOlxuXHRcdFx0YnBbaV0gPT09IHByZWZlcnJlZERvYyA/IDEgOlxuXHRcdFx0MDtcblx0fTtcblxuXHRyZXR1cm4gZG9jO1xufTtcblxuU2l6emxlLm1hdGNoZXMgPSBmdW5jdGlvbiggZXhwciwgZWxlbWVudHMgKSB7XG5cdHJldHVybiBTaXp6bGUoIGV4cHIsIG51bGwsIG51bGwsIGVsZW1lbnRzICk7XG59O1xuXG5TaXp6bGUubWF0Y2hlc1NlbGVjdG9yID0gZnVuY3Rpb24oIGVsZW0sIGV4cHIgKSB7XG5cdC8vIFNldCBkb2N1bWVudCB2YXJzIGlmIG5lZWRlZFxuXHRpZiAoICggZWxlbS5vd25lckRvY3VtZW50IHx8IGVsZW0gKSAhPT0gZG9jdW1lbnQgKSB7XG5cdFx0c2V0RG9jdW1lbnQoIGVsZW0gKTtcblx0fVxuXG5cdC8vIE1ha2Ugc3VyZSB0aGF0IGF0dHJpYnV0ZSBzZWxlY3RvcnMgYXJlIHF1b3RlZFxuXHRleHByID0gZXhwci5yZXBsYWNlKCByYXR0cmlidXRlUXVvdGVzLCBcIj0nJDEnXVwiICk7XG5cblx0aWYgKCBzdXBwb3J0Lm1hdGNoZXNTZWxlY3RvciAmJiBkb2N1bWVudElzSFRNTCAmJlxuXHRcdCggIXJidWdneU1hdGNoZXMgfHwgIXJidWdneU1hdGNoZXMudGVzdCggZXhwciApICkgJiZcblx0XHQoICFyYnVnZ3lRU0EgICAgIHx8ICFyYnVnZ3lRU0EudGVzdCggZXhwciApICkgKSB7XG5cblx0XHR0cnkge1xuXHRcdFx0dmFyIHJldCA9IG1hdGNoZXMuY2FsbCggZWxlbSwgZXhwciApO1xuXG5cdFx0XHQvLyBJRSA5J3MgbWF0Y2hlc1NlbGVjdG9yIHJldHVybnMgZmFsc2Ugb24gZGlzY29ubmVjdGVkIG5vZGVzXG5cdFx0XHRpZiAoIHJldCB8fCBzdXBwb3J0LmRpc2Nvbm5lY3RlZE1hdGNoIHx8XG5cdFx0XHRcdFx0Ly8gQXMgd2VsbCwgZGlzY29ubmVjdGVkIG5vZGVzIGFyZSBzYWlkIHRvIGJlIGluIGEgZG9jdW1lbnRcblx0XHRcdFx0XHQvLyBmcmFnbWVudCBpbiBJRSA5XG5cdFx0XHRcdFx0ZWxlbS5kb2N1bWVudCAmJiBlbGVtLmRvY3VtZW50Lm5vZGVUeXBlICE9PSAxMSApIHtcblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdH1cblx0XHR9IGNhdGNoKGUpIHt9XG5cdH1cblxuXHRyZXR1cm4gU2l6emxlKCBleHByLCBkb2N1bWVudCwgbnVsbCwgWyBlbGVtIF0gKS5sZW5ndGggPiAwO1xufTtcblxuU2l6emxlLmNvbnRhaW5zID0gZnVuY3Rpb24oIGNvbnRleHQsIGVsZW0gKSB7XG5cdC8vIFNldCBkb2N1bWVudCB2YXJzIGlmIG5lZWRlZFxuXHRpZiAoICggY29udGV4dC5vd25lckRvY3VtZW50IHx8IGNvbnRleHQgKSAhPT0gZG9jdW1lbnQgKSB7XG5cdFx0c2V0RG9jdW1lbnQoIGNvbnRleHQgKTtcblx0fVxuXHRyZXR1cm4gY29udGFpbnMoIGNvbnRleHQsIGVsZW0gKTtcbn07XG5cblNpenpsZS5hdHRyID0gZnVuY3Rpb24oIGVsZW0sIG5hbWUgKSB7XG5cdC8vIFNldCBkb2N1bWVudCB2YXJzIGlmIG5lZWRlZFxuXHRpZiAoICggZWxlbS5vd25lckRvY3VtZW50IHx8IGVsZW0gKSAhPT0gZG9jdW1lbnQgKSB7XG5cdFx0c2V0RG9jdW1lbnQoIGVsZW0gKTtcblx0fVxuXG5cdHZhciBmbiA9IEV4cHIuYXR0ckhhbmRsZVsgbmFtZS50b0xvd2VyQ2FzZSgpIF0sXG5cdFx0Ly8gRG9uJ3QgZ2V0IGZvb2xlZCBieSBPYmplY3QucHJvdG90eXBlIHByb3BlcnRpZXMgKGpRdWVyeSAjMTM4MDcpXG5cdFx0dmFsID0gZm4gJiYgaGFzT3duLmNhbGwoIEV4cHIuYXR0ckhhbmRsZSwgbmFtZS50b0xvd2VyQ2FzZSgpICkgP1xuXHRcdFx0Zm4oIGVsZW0sIG5hbWUsICFkb2N1bWVudElzSFRNTCApIDpcblx0XHRcdHVuZGVmaW5lZDtcblxuXHRyZXR1cm4gdmFsICE9PSB1bmRlZmluZWQgP1xuXHRcdHZhbCA6XG5cdFx0c3VwcG9ydC5hdHRyaWJ1dGVzIHx8ICFkb2N1bWVudElzSFRNTCA/XG5cdFx0XHRlbGVtLmdldEF0dHJpYnV0ZSggbmFtZSApIDpcblx0XHRcdCh2YWwgPSBlbGVtLmdldEF0dHJpYnV0ZU5vZGUobmFtZSkpICYmIHZhbC5zcGVjaWZpZWQgP1xuXHRcdFx0XHR2YWwudmFsdWUgOlxuXHRcdFx0XHRudWxsO1xufTtcblxuU2l6emxlLmVycm9yID0gZnVuY3Rpb24oIG1zZyApIHtcblx0dGhyb3cgbmV3IEVycm9yKCBcIlN5bnRheCBlcnJvciwgdW5yZWNvZ25pemVkIGV4cHJlc3Npb246IFwiICsgbXNnICk7XG59O1xuXG4vKipcbiAqIERvY3VtZW50IHNvcnRpbmcgYW5kIHJlbW92aW5nIGR1cGxpY2F0ZXNcbiAqIEBwYXJhbSB7QXJyYXlMaWtlfSByZXN1bHRzXG4gKi9cblNpenpsZS51bmlxdWVTb3J0ID0gZnVuY3Rpb24oIHJlc3VsdHMgKSB7XG5cdHZhciBlbGVtLFxuXHRcdGR1cGxpY2F0ZXMgPSBbXSxcblx0XHRqID0gMCxcblx0XHRpID0gMDtcblxuXHQvLyBVbmxlc3Mgd2UgKmtub3cqIHdlIGNhbiBkZXRlY3QgZHVwbGljYXRlcywgYXNzdW1lIHRoZWlyIHByZXNlbmNlXG5cdGhhc0R1cGxpY2F0ZSA9ICFzdXBwb3J0LmRldGVjdER1cGxpY2F0ZXM7XG5cdHNvcnRJbnB1dCA9ICFzdXBwb3J0LnNvcnRTdGFibGUgJiYgcmVzdWx0cy5zbGljZSggMCApO1xuXHRyZXN1bHRzLnNvcnQoIHNvcnRPcmRlciApO1xuXG5cdGlmICggaGFzRHVwbGljYXRlICkge1xuXHRcdHdoaWxlICggKGVsZW0gPSByZXN1bHRzW2krK10pICkge1xuXHRcdFx0aWYgKCBlbGVtID09PSByZXN1bHRzWyBpIF0gKSB7XG5cdFx0XHRcdGogPSBkdXBsaWNhdGVzLnB1c2goIGkgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0d2hpbGUgKCBqLS0gKSB7XG5cdFx0XHRyZXN1bHRzLnNwbGljZSggZHVwbGljYXRlc1sgaiBdLCAxICk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2xlYXIgaW5wdXQgYWZ0ZXIgc29ydGluZyB0byByZWxlYXNlIG9iamVjdHNcblx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvc2l6emxlL3B1bGwvMjI1XG5cdHNvcnRJbnB1dCA9IG51bGw7XG5cblx0cmV0dXJuIHJlc3VsdHM7XG59O1xuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb24gZm9yIHJldHJpZXZpbmcgdGhlIHRleHQgdmFsdWUgb2YgYW4gYXJyYXkgb2YgRE9NIG5vZGVzXG4gKiBAcGFyYW0ge0FycmF5fEVsZW1lbnR9IGVsZW1cbiAqL1xuZ2V0VGV4dCA9IFNpenpsZS5nZXRUZXh0ID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdHZhciBub2RlLFxuXHRcdHJldCA9IFwiXCIsXG5cdFx0aSA9IDAsXG5cdFx0bm9kZVR5cGUgPSBlbGVtLm5vZGVUeXBlO1xuXG5cdGlmICggIW5vZGVUeXBlICkge1xuXHRcdC8vIElmIG5vIG5vZGVUeXBlLCB0aGlzIGlzIGV4cGVjdGVkIHRvIGJlIGFuIGFycmF5XG5cdFx0d2hpbGUgKCAobm9kZSA9IGVsZW1baSsrXSkgKSB7XG5cdFx0XHQvLyBEbyBub3QgdHJhdmVyc2UgY29tbWVudCBub2Rlc1xuXHRcdFx0cmV0ICs9IGdldFRleHQoIG5vZGUgKTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoIG5vZGVUeXBlID09PSAxIHx8IG5vZGVUeXBlID09PSA5IHx8IG5vZGVUeXBlID09PSAxMSApIHtcblx0XHQvLyBVc2UgdGV4dENvbnRlbnQgZm9yIGVsZW1lbnRzXG5cdFx0Ly8gaW5uZXJUZXh0IHVzYWdlIHJlbW92ZWQgZm9yIGNvbnNpc3RlbmN5IG9mIG5ldyBsaW5lcyAoalF1ZXJ5ICMxMTE1Mylcblx0XHRpZiAoIHR5cGVvZiBlbGVtLnRleHRDb250ZW50ID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0cmV0dXJuIGVsZW0udGV4dENvbnRlbnQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFRyYXZlcnNlIGl0cyBjaGlsZHJlblxuXHRcdFx0Zm9yICggZWxlbSA9IGVsZW0uZmlyc3RDaGlsZDsgZWxlbTsgZWxlbSA9IGVsZW0ubmV4dFNpYmxpbmcgKSB7XG5cdFx0XHRcdHJldCArPSBnZXRUZXh0KCBlbGVtICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgaWYgKCBub2RlVHlwZSA9PT0gMyB8fCBub2RlVHlwZSA9PT0gNCApIHtcblx0XHRyZXR1cm4gZWxlbS5ub2RlVmFsdWU7XG5cdH1cblx0Ly8gRG8gbm90IGluY2x1ZGUgY29tbWVudCBvciBwcm9jZXNzaW5nIGluc3RydWN0aW9uIG5vZGVzXG5cblx0cmV0dXJuIHJldDtcbn07XG5cbkV4cHIgPSBTaXp6bGUuc2VsZWN0b3JzID0ge1xuXG5cdC8vIENhbiBiZSBhZGp1c3RlZCBieSB0aGUgdXNlclxuXHRjYWNoZUxlbmd0aDogNTAsXG5cblx0Y3JlYXRlUHNldWRvOiBtYXJrRnVuY3Rpb24sXG5cblx0bWF0Y2g6IG1hdGNoRXhwcixcblxuXHRhdHRySGFuZGxlOiB7fSxcblxuXHRmaW5kOiB7fSxcblxuXHRyZWxhdGl2ZToge1xuXHRcdFwiPlwiOiB7IGRpcjogXCJwYXJlbnROb2RlXCIsIGZpcnN0OiB0cnVlIH0sXG5cdFx0XCIgXCI6IHsgZGlyOiBcInBhcmVudE5vZGVcIiB9LFxuXHRcdFwiK1wiOiB7IGRpcjogXCJwcmV2aW91c1NpYmxpbmdcIiwgZmlyc3Q6IHRydWUgfSxcblx0XHRcIn5cIjogeyBkaXI6IFwicHJldmlvdXNTaWJsaW5nXCIgfVxuXHR9LFxuXG5cdHByZUZpbHRlcjoge1xuXHRcdFwiQVRUUlwiOiBmdW5jdGlvbiggbWF0Y2ggKSB7XG5cdFx0XHRtYXRjaFsxXSA9IG1hdGNoWzFdLnJlcGxhY2UoIHJ1bmVzY2FwZSwgZnVuZXNjYXBlICk7XG5cblx0XHRcdC8vIE1vdmUgdGhlIGdpdmVuIHZhbHVlIHRvIG1hdGNoWzNdIHdoZXRoZXIgcXVvdGVkIG9yIHVucXVvdGVkXG5cdFx0XHRtYXRjaFszXSA9ICggbWF0Y2hbM10gfHwgbWF0Y2hbNF0gfHwgbWF0Y2hbNV0gfHwgXCJcIiApLnJlcGxhY2UoIHJ1bmVzY2FwZSwgZnVuZXNjYXBlICk7XG5cblx0XHRcdGlmICggbWF0Y2hbMl0gPT09IFwifj1cIiApIHtcblx0XHRcdFx0bWF0Y2hbM10gPSBcIiBcIiArIG1hdGNoWzNdICsgXCIgXCI7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBtYXRjaC5zbGljZSggMCwgNCApO1xuXHRcdH0sXG5cblx0XHRcIkNISUxEXCI6IGZ1bmN0aW9uKCBtYXRjaCApIHtcblx0XHRcdC8qIG1hdGNoZXMgZnJvbSBtYXRjaEV4cHJbXCJDSElMRFwiXVxuXHRcdFx0XHQxIHR5cGUgKG9ubHl8bnRofC4uLilcblx0XHRcdFx0MiB3aGF0IChjaGlsZHxvZi10eXBlKVxuXHRcdFx0XHQzIGFyZ3VtZW50IChldmVufG9kZHxcXGQqfFxcZCpuKFsrLV1cXGQrKT98Li4uKVxuXHRcdFx0XHQ0IHhuLWNvbXBvbmVudCBvZiB4bit5IGFyZ3VtZW50IChbKy1dP1xcZCpufClcblx0XHRcdFx0NSBzaWduIG9mIHhuLWNvbXBvbmVudFxuXHRcdFx0XHQ2IHggb2YgeG4tY29tcG9uZW50XG5cdFx0XHRcdDcgc2lnbiBvZiB5LWNvbXBvbmVudFxuXHRcdFx0XHQ4IHkgb2YgeS1jb21wb25lbnRcblx0XHRcdCovXG5cdFx0XHRtYXRjaFsxXSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRcdGlmICggbWF0Y2hbMV0uc2xpY2UoIDAsIDMgKSA9PT0gXCJudGhcIiApIHtcblx0XHRcdFx0Ly8gbnRoLSogcmVxdWlyZXMgYXJndW1lbnRcblx0XHRcdFx0aWYgKCAhbWF0Y2hbM10gKSB7XG5cdFx0XHRcdFx0U2l6emxlLmVycm9yKCBtYXRjaFswXSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gbnVtZXJpYyB4IGFuZCB5IHBhcmFtZXRlcnMgZm9yIEV4cHIuZmlsdGVyLkNISUxEXG5cdFx0XHRcdC8vIHJlbWVtYmVyIHRoYXQgZmFsc2UvdHJ1ZSBjYXN0IHJlc3BlY3RpdmVseSB0byAwLzFcblx0XHRcdFx0bWF0Y2hbNF0gPSArKCBtYXRjaFs0XSA/IG1hdGNoWzVdICsgKG1hdGNoWzZdIHx8IDEpIDogMiAqICggbWF0Y2hbM10gPT09IFwiZXZlblwiIHx8IG1hdGNoWzNdID09PSBcIm9kZFwiICkgKTtcblx0XHRcdFx0bWF0Y2hbNV0gPSArKCAoIG1hdGNoWzddICsgbWF0Y2hbOF0gKSB8fCBtYXRjaFszXSA9PT0gXCJvZGRcIiApO1xuXG5cdFx0XHQvLyBvdGhlciB0eXBlcyBwcm9oaWJpdCBhcmd1bWVudHNcblx0XHRcdH0gZWxzZSBpZiAoIG1hdGNoWzNdICkge1xuXHRcdFx0XHRTaXp6bGUuZXJyb3IoIG1hdGNoWzBdICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9LFxuXG5cdFx0XCJQU0VVRE9cIjogZnVuY3Rpb24oIG1hdGNoICkge1xuXHRcdFx0dmFyIGV4Y2Vzcyxcblx0XHRcdFx0dW5xdW90ZWQgPSAhbWF0Y2hbNl0gJiYgbWF0Y2hbMl07XG5cblx0XHRcdGlmICggbWF0Y2hFeHByW1wiQ0hJTERcIl0udGVzdCggbWF0Y2hbMF0gKSApIHtcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFjY2VwdCBxdW90ZWQgYXJndW1lbnRzIGFzLWlzXG5cdFx0XHRpZiAoIG1hdGNoWzNdICkge1xuXHRcdFx0XHRtYXRjaFsyXSA9IG1hdGNoWzRdIHx8IG1hdGNoWzVdIHx8IFwiXCI7XG5cblx0XHRcdC8vIFN0cmlwIGV4Y2VzcyBjaGFyYWN0ZXJzIGZyb20gdW5xdW90ZWQgYXJndW1lbnRzXG5cdFx0XHR9IGVsc2UgaWYgKCB1bnF1b3RlZCAmJiBycHNldWRvLnRlc3QoIHVucXVvdGVkICkgJiZcblx0XHRcdFx0Ly8gR2V0IGV4Y2VzcyBmcm9tIHRva2VuaXplIChyZWN1cnNpdmVseSlcblx0XHRcdFx0KGV4Y2VzcyA9IHRva2VuaXplKCB1bnF1b3RlZCwgdHJ1ZSApKSAmJlxuXHRcdFx0XHQvLyBhZHZhbmNlIHRvIHRoZSBuZXh0IGNsb3NpbmcgcGFyZW50aGVzaXNcblx0XHRcdFx0KGV4Y2VzcyA9IHVucXVvdGVkLmluZGV4T2YoIFwiKVwiLCB1bnF1b3RlZC5sZW5ndGggLSBleGNlc3MgKSAtIHVucXVvdGVkLmxlbmd0aCkgKSB7XG5cblx0XHRcdFx0Ly8gZXhjZXNzIGlzIGEgbmVnYXRpdmUgaW5kZXhcblx0XHRcdFx0bWF0Y2hbMF0gPSBtYXRjaFswXS5zbGljZSggMCwgZXhjZXNzICk7XG5cdFx0XHRcdG1hdGNoWzJdID0gdW5xdW90ZWQuc2xpY2UoIDAsIGV4Y2VzcyApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZXR1cm4gb25seSBjYXB0dXJlcyBuZWVkZWQgYnkgdGhlIHBzZXVkbyBmaWx0ZXIgbWV0aG9kICh0eXBlIGFuZCBhcmd1bWVudClcblx0XHRcdHJldHVybiBtYXRjaC5zbGljZSggMCwgMyApO1xuXHRcdH1cblx0fSxcblxuXHRmaWx0ZXI6IHtcblxuXHRcdFwiVEFHXCI6IGZ1bmN0aW9uKCBub2RlTmFtZVNlbGVjdG9yICkge1xuXHRcdFx0dmFyIG5vZGVOYW1lID0gbm9kZU5hbWVTZWxlY3Rvci5yZXBsYWNlKCBydW5lc2NhcGUsIGZ1bmVzY2FwZSApLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRyZXR1cm4gbm9kZU5hbWVTZWxlY3RvciA9PT0gXCIqXCIgP1xuXHRcdFx0XHRmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH0gOlxuXHRcdFx0XHRmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0XHRyZXR1cm4gZWxlbS5ub2RlTmFtZSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5vZGVOYW1lO1xuXHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRcIkNMQVNTXCI6IGZ1bmN0aW9uKCBjbGFzc05hbWUgKSB7XG5cdFx0XHR2YXIgcGF0dGVybiA9IGNsYXNzQ2FjaGVbIGNsYXNzTmFtZSArIFwiIFwiIF07XG5cblx0XHRcdHJldHVybiBwYXR0ZXJuIHx8XG5cdFx0XHRcdChwYXR0ZXJuID0gbmV3IFJlZ0V4cCggXCIoXnxcIiArIHdoaXRlc3BhY2UgKyBcIilcIiArIGNsYXNzTmFtZSArIFwiKFwiICsgd2hpdGVzcGFjZSArIFwifCQpXCIgKSkgJiZcblx0XHRcdFx0Y2xhc3NDYWNoZSggY2xhc3NOYW1lLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KCB0eXBlb2YgZWxlbS5jbGFzc05hbWUgPT09IFwic3RyaW5nXCIgJiYgZWxlbS5jbGFzc05hbWUgfHwgdHlwZW9mIGVsZW0uZ2V0QXR0cmlidXRlICE9PSBzdHJ1bmRlZmluZWQgJiYgZWxlbS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRcIkFUVFJcIjogZnVuY3Rpb24oIG5hbWUsIG9wZXJhdG9yLCBjaGVjayApIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0dmFyIHJlc3VsdCA9IFNpenpsZS5hdHRyKCBlbGVtLCBuYW1lICk7XG5cblx0XHRcdFx0aWYgKCByZXN1bHQgPT0gbnVsbCApIHtcblx0XHRcdFx0XHRyZXR1cm4gb3BlcmF0b3IgPT09IFwiIT1cIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICFvcGVyYXRvciApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlc3VsdCArPSBcIlwiO1xuXG5cdFx0XHRcdHJldHVybiBvcGVyYXRvciA9PT0gXCI9XCIgPyByZXN1bHQgPT09IGNoZWNrIDpcblx0XHRcdFx0XHRvcGVyYXRvciA9PT0gXCIhPVwiID8gcmVzdWx0ICE9PSBjaGVjayA6XG5cdFx0XHRcdFx0b3BlcmF0b3IgPT09IFwiXj1cIiA/IGNoZWNrICYmIHJlc3VsdC5pbmRleE9mKCBjaGVjayApID09PSAwIDpcblx0XHRcdFx0XHRvcGVyYXRvciA9PT0gXCIqPVwiID8gY2hlY2sgJiYgcmVzdWx0LmluZGV4T2YoIGNoZWNrICkgPiAtMSA6XG5cdFx0XHRcdFx0b3BlcmF0b3IgPT09IFwiJD1cIiA/IGNoZWNrICYmIHJlc3VsdC5zbGljZSggLWNoZWNrLmxlbmd0aCApID09PSBjaGVjayA6XG5cdFx0XHRcdFx0b3BlcmF0b3IgPT09IFwifj1cIiA/ICggXCIgXCIgKyByZXN1bHQgKyBcIiBcIiApLmluZGV4T2YoIGNoZWNrICkgPiAtMSA6XG5cdFx0XHRcdFx0b3BlcmF0b3IgPT09IFwifD1cIiA/IHJlc3VsdCA9PT0gY2hlY2sgfHwgcmVzdWx0LnNsaWNlKCAwLCBjaGVjay5sZW5ndGggKyAxICkgPT09IGNoZWNrICsgXCItXCIgOlxuXHRcdFx0XHRcdGZhbHNlO1xuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0XCJDSElMRFwiOiBmdW5jdGlvbiggdHlwZSwgd2hhdCwgYXJndW1lbnQsIGZpcnN0LCBsYXN0ICkge1xuXHRcdFx0dmFyIHNpbXBsZSA9IHR5cGUuc2xpY2UoIDAsIDMgKSAhPT0gXCJudGhcIixcblx0XHRcdFx0Zm9yd2FyZCA9IHR5cGUuc2xpY2UoIC00ICkgIT09IFwibGFzdFwiLFxuXHRcdFx0XHRvZlR5cGUgPSB3aGF0ID09PSBcIm9mLXR5cGVcIjtcblxuXHRcdFx0cmV0dXJuIGZpcnN0ID09PSAxICYmIGxhc3QgPT09IDAgP1xuXG5cdFx0XHRcdC8vIFNob3J0Y3V0IGZvciA6bnRoLSoobilcblx0XHRcdFx0ZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdFx0cmV0dXJuICEhZWxlbS5wYXJlbnROb2RlO1xuXHRcdFx0XHR9IDpcblxuXHRcdFx0XHRmdW5jdGlvbiggZWxlbSwgY29udGV4dCwgeG1sICkge1xuXHRcdFx0XHRcdHZhciBjYWNoZSwgb3V0ZXJDYWNoZSwgbm9kZSwgZGlmZiwgbm9kZUluZGV4LCBzdGFydCxcblx0XHRcdFx0XHRcdGRpciA9IHNpbXBsZSAhPT0gZm9yd2FyZCA/IFwibmV4dFNpYmxpbmdcIiA6IFwicHJldmlvdXNTaWJsaW5nXCIsXG5cdFx0XHRcdFx0XHRwYXJlbnQgPSBlbGVtLnBhcmVudE5vZGUsXG5cdFx0XHRcdFx0XHRuYW1lID0gb2ZUeXBlICYmIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSxcblx0XHRcdFx0XHRcdHVzZUNhY2hlID0gIXhtbCAmJiAhb2ZUeXBlO1xuXG5cdFx0XHRcdFx0aWYgKCBwYXJlbnQgKSB7XG5cblx0XHRcdFx0XHRcdC8vIDooZmlyc3R8bGFzdHxvbmx5KS0oY2hpbGR8b2YtdHlwZSlcblx0XHRcdFx0XHRcdGlmICggc2ltcGxlICkge1xuXHRcdFx0XHRcdFx0XHR3aGlsZSAoIGRpciApIHtcblx0XHRcdFx0XHRcdFx0XHRub2RlID0gZWxlbTtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gbm9kZVsgZGlyIF0pICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCBvZlR5cGUgPyBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUgOiBub2RlLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdC8vIFJldmVyc2UgZGlyZWN0aW9uIGZvciA6b25seS0qIChpZiB3ZSBoYXZlbid0IHlldCBkb25lIHNvKVxuXHRcdFx0XHRcdFx0XHRcdHN0YXJ0ID0gZGlyID0gdHlwZSA9PT0gXCJvbmx5XCIgJiYgIXN0YXJ0ICYmIFwibmV4dFNpYmxpbmdcIjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c3RhcnQgPSBbIGZvcndhcmQgPyBwYXJlbnQuZmlyc3RDaGlsZCA6IHBhcmVudC5sYXN0Q2hpbGQgXTtcblxuXHRcdFx0XHRcdFx0Ly8gbm9uLXhtbCA6bnRoLWNoaWxkKC4uLikgc3RvcmVzIGNhY2hlIGRhdGEgb24gYHBhcmVudGBcblx0XHRcdFx0XHRcdGlmICggZm9yd2FyZCAmJiB1c2VDYWNoZSApIHtcblx0XHRcdFx0XHRcdFx0Ly8gU2VlayBgZWxlbWAgZnJvbSBhIHByZXZpb3VzbHktY2FjaGVkIGluZGV4XG5cdFx0XHRcdFx0XHRcdG91dGVyQ2FjaGUgPSBwYXJlbnRbIGV4cGFuZG8gXSB8fCAocGFyZW50WyBleHBhbmRvIF0gPSB7fSk7XG5cdFx0XHRcdFx0XHRcdGNhY2hlID0gb3V0ZXJDYWNoZVsgdHlwZSBdIHx8IFtdO1xuXHRcdFx0XHRcdFx0XHRub2RlSW5kZXggPSBjYWNoZVswXSA9PT0gZGlycnVucyAmJiBjYWNoZVsxXTtcblx0XHRcdFx0XHRcdFx0ZGlmZiA9IGNhY2hlWzBdID09PSBkaXJydW5zICYmIGNhY2hlWzJdO1xuXHRcdFx0XHRcdFx0XHRub2RlID0gbm9kZUluZGV4ICYmIHBhcmVudC5jaGlsZE5vZGVzWyBub2RlSW5kZXggXTtcblxuXHRcdFx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gKytub2RlSW5kZXggJiYgbm9kZSAmJiBub2RlWyBkaXIgXSB8fFxuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gc2Vla2luZyBgZWxlbWAgZnJvbSB0aGUgc3RhcnRcblx0XHRcdFx0XHRcdFx0XHQoZGlmZiA9IG5vZGVJbmRleCA9IDApIHx8IHN0YXJ0LnBvcCgpKSApIHtcblxuXHRcdFx0XHRcdFx0XHRcdC8vIFdoZW4gZm91bmQsIGNhY2hlIGluZGV4ZXMgb24gYHBhcmVudGAgYW5kIGJyZWFrXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAxICYmICsrZGlmZiAmJiBub2RlID09PSBlbGVtICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0b3V0ZXJDYWNoZVsgdHlwZSBdID0gWyBkaXJydW5zLCBub2RlSW5kZXgsIGRpZmYgXTtcblx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBVc2UgcHJldmlvdXNseS1jYWNoZWQgZWxlbWVudCBpbmRleCBpZiBhdmFpbGFibGVcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIHVzZUNhY2hlICYmIChjYWNoZSA9IChlbGVtWyBleHBhbmRvIF0gfHwgKGVsZW1bIGV4cGFuZG8gXSA9IHt9KSlbIHR5cGUgXSkgJiYgY2FjaGVbMF0gPT09IGRpcnJ1bnMgKSB7XG5cdFx0XHRcdFx0XHRcdGRpZmYgPSBjYWNoZVsxXTtcblxuXHRcdFx0XHRcdFx0Ly8geG1sIDpudGgtY2hpbGQoLi4uKSBvciA6bnRoLWxhc3QtY2hpbGQoLi4uKSBvciA6bnRoKC1sYXN0KT8tb2YtdHlwZSguLi4pXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQvLyBVc2UgdGhlIHNhbWUgbG9vcCBhcyBhYm92ZSB0byBzZWVrIGBlbGVtYCBmcm9tIHRoZSBzdGFydFxuXHRcdFx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gKytub2RlSW5kZXggJiYgbm9kZSAmJiBub2RlWyBkaXIgXSB8fFxuXHRcdFx0XHRcdFx0XHRcdChkaWZmID0gbm9kZUluZGV4ID0gMCkgfHwgc3RhcnQucG9wKCkpICkge1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAoIG9mVHlwZSA/IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZSA6IG5vZGUubm9kZVR5cGUgPT09IDEgKSAmJiArK2RpZmYgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBDYWNoZSB0aGUgaW5kZXggb2YgZWFjaCBlbmNvdW50ZXJlZCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHVzZUNhY2hlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQobm9kZVsgZXhwYW5kbyBdIHx8IChub2RlWyBleHBhbmRvIF0gPSB7fSkpWyB0eXBlIF0gPSBbIGRpcnJ1bnMsIGRpZmYgXTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCBub2RlID09PSBlbGVtICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gSW5jb3Jwb3JhdGUgdGhlIG9mZnNldCwgdGhlbiBjaGVjayBhZ2FpbnN0IGN5Y2xlIHNpemVcblx0XHRcdFx0XHRcdGRpZmYgLT0gbGFzdDtcblx0XHRcdFx0XHRcdHJldHVybiBkaWZmID09PSBmaXJzdCB8fCAoIGRpZmYgJSBmaXJzdCA9PT0gMCAmJiBkaWZmIC8gZmlyc3QgPj0gMCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0XCJQU0VVRE9cIjogZnVuY3Rpb24oIHBzZXVkbywgYXJndW1lbnQgKSB7XG5cdFx0XHQvLyBwc2V1ZG8tY2xhc3MgbmFtZXMgYXJlIGNhc2UtaW5zZW5zaXRpdmVcblx0XHRcdC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL3NlbGVjdG9ycy8jcHNldWRvLWNsYXNzZXNcblx0XHRcdC8vIFByaW9yaXRpemUgYnkgY2FzZSBzZW5zaXRpdml0eSBpbiBjYXNlIGN1c3RvbSBwc2V1ZG9zIGFyZSBhZGRlZCB3aXRoIHVwcGVyY2FzZSBsZXR0ZXJzXG5cdFx0XHQvLyBSZW1lbWJlciB0aGF0IHNldEZpbHRlcnMgaW5oZXJpdHMgZnJvbSBwc2V1ZG9zXG5cdFx0XHR2YXIgYXJncyxcblx0XHRcdFx0Zm4gPSBFeHByLnBzZXVkb3NbIHBzZXVkbyBdIHx8IEV4cHIuc2V0RmlsdGVyc1sgcHNldWRvLnRvTG93ZXJDYXNlKCkgXSB8fFxuXHRcdFx0XHRcdFNpenpsZS5lcnJvciggXCJ1bnN1cHBvcnRlZCBwc2V1ZG86IFwiICsgcHNldWRvICk7XG5cblx0XHRcdC8vIFRoZSB1c2VyIG1heSB1c2UgY3JlYXRlUHNldWRvIHRvIGluZGljYXRlIHRoYXRcblx0XHRcdC8vIGFyZ3VtZW50cyBhcmUgbmVlZGVkIHRvIGNyZWF0ZSB0aGUgZmlsdGVyIGZ1bmN0aW9uXG5cdFx0XHQvLyBqdXN0IGFzIFNpenpsZSBkb2VzXG5cdFx0XHRpZiAoIGZuWyBleHBhbmRvIF0gKSB7XG5cdFx0XHRcdHJldHVybiBmbiggYXJndW1lbnQgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQnV0IG1haW50YWluIHN1cHBvcnQgZm9yIG9sZCBzaWduYXR1cmVzXG5cdFx0XHRpZiAoIGZuLmxlbmd0aCA+IDEgKSB7XG5cdFx0XHRcdGFyZ3MgPSBbIHBzZXVkbywgcHNldWRvLCBcIlwiLCBhcmd1bWVudCBdO1xuXHRcdFx0XHRyZXR1cm4gRXhwci5zZXRGaWx0ZXJzLmhhc093blByb3BlcnR5KCBwc2V1ZG8udG9Mb3dlckNhc2UoKSApID9cblx0XHRcdFx0XHRtYXJrRnVuY3Rpb24oZnVuY3Rpb24oIHNlZWQsIG1hdGNoZXMgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaWR4LFxuXHRcdFx0XHRcdFx0XHRtYXRjaGVkID0gZm4oIHNlZWQsIGFyZ3VtZW50ICksXG5cdFx0XHRcdFx0XHRcdGkgPSBtYXRjaGVkLmxlbmd0aDtcblx0XHRcdFx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRcdFx0XHRpZHggPSBpbmRleE9mLmNhbGwoIHNlZWQsIG1hdGNoZWRbaV0gKTtcblx0XHRcdFx0XHRcdFx0c2VlZFsgaWR4IF0gPSAhKCBtYXRjaGVzWyBpZHggXSA9IG1hdGNoZWRbaV0gKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KSA6XG5cdFx0XHRcdFx0ZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZm4oIGVsZW0sIDAsIGFyZ3MgKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZm47XG5cdFx0fVxuXHR9LFxuXG5cdHBzZXVkb3M6IHtcblx0XHQvLyBQb3RlbnRpYWxseSBjb21wbGV4IHBzZXVkb3Ncblx0XHRcIm5vdFwiOiBtYXJrRnVuY3Rpb24oZnVuY3Rpb24oIHNlbGVjdG9yICkge1xuXHRcdFx0Ly8gVHJpbSB0aGUgc2VsZWN0b3IgcGFzc2VkIHRvIGNvbXBpbGVcblx0XHRcdC8vIHRvIGF2b2lkIHRyZWF0aW5nIGxlYWRpbmcgYW5kIHRyYWlsaW5nXG5cdFx0XHQvLyBzcGFjZXMgYXMgY29tYmluYXRvcnNcblx0XHRcdHZhciBpbnB1dCA9IFtdLFxuXHRcdFx0XHRyZXN1bHRzID0gW10sXG5cdFx0XHRcdG1hdGNoZXIgPSBjb21waWxlKCBzZWxlY3Rvci5yZXBsYWNlKCBydHJpbSwgXCIkMVwiICkgKTtcblxuXHRcdFx0cmV0dXJuIG1hdGNoZXJbIGV4cGFuZG8gXSA/XG5cdFx0XHRcdG1hcmtGdW5jdGlvbihmdW5jdGlvbiggc2VlZCwgbWF0Y2hlcywgY29udGV4dCwgeG1sICkge1xuXHRcdFx0XHRcdHZhciBlbGVtLFxuXHRcdFx0XHRcdFx0dW5tYXRjaGVkID0gbWF0Y2hlciggc2VlZCwgbnVsbCwgeG1sLCBbXSApLFxuXHRcdFx0XHRcdFx0aSA9IHNlZWQubGVuZ3RoO1xuXG5cdFx0XHRcdFx0Ly8gTWF0Y2ggZWxlbWVudHMgdW5tYXRjaGVkIGJ5IGBtYXRjaGVyYFxuXHRcdFx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRcdFx0aWYgKCAoZWxlbSA9IHVubWF0Y2hlZFtpXSkgKSB7XG5cdFx0XHRcdFx0XHRcdHNlZWRbaV0gPSAhKG1hdGNoZXNbaV0gPSBlbGVtKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pIDpcblx0XHRcdFx0ZnVuY3Rpb24oIGVsZW0sIGNvbnRleHQsIHhtbCApIHtcblx0XHRcdFx0XHRpbnB1dFswXSA9IGVsZW07XG5cdFx0XHRcdFx0bWF0Y2hlciggaW5wdXQsIG51bGwsIHhtbCwgcmVzdWx0cyApO1xuXHRcdFx0XHRcdHJldHVybiAhcmVzdWx0cy5wb3AoKTtcblx0XHRcdFx0fTtcblx0XHR9KSxcblxuXHRcdFwiaGFzXCI6IG1hcmtGdW5jdGlvbihmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdHJldHVybiBTaXp6bGUoIHNlbGVjdG9yLCBlbGVtICkubGVuZ3RoID4gMDtcblx0XHRcdH07XG5cdFx0fSksXG5cblx0XHRcImNvbnRhaW5zXCI6IG1hcmtGdW5jdGlvbihmdW5jdGlvbiggdGV4dCApIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0cmV0dXJuICggZWxlbS50ZXh0Q29udGVudCB8fCBlbGVtLmlubmVyVGV4dCB8fCBnZXRUZXh0KCBlbGVtICkgKS5pbmRleE9mKCB0ZXh0ICkgPiAtMTtcblx0XHRcdH07XG5cdFx0fSksXG5cblx0XHQvLyBcIldoZXRoZXIgYW4gZWxlbWVudCBpcyByZXByZXNlbnRlZCBieSBhIDpsYW5nKCkgc2VsZWN0b3Jcblx0XHQvLyBpcyBiYXNlZCBzb2xlbHkgb24gdGhlIGVsZW1lbnQncyBsYW5ndWFnZSB2YWx1ZVxuXHRcdC8vIGJlaW5nIGVxdWFsIHRvIHRoZSBpZGVudGlmaWVyIEMsXG5cdFx0Ly8gb3IgYmVnaW5uaW5nIHdpdGggdGhlIGlkZW50aWZpZXIgQyBpbW1lZGlhdGVseSBmb2xsb3dlZCBieSBcIi1cIi5cblx0XHQvLyBUaGUgbWF0Y2hpbmcgb2YgQyBhZ2FpbnN0IHRoZSBlbGVtZW50J3MgbGFuZ3VhZ2UgdmFsdWUgaXMgcGVyZm9ybWVkIGNhc2UtaW5zZW5zaXRpdmVseS5cblx0XHQvLyBUaGUgaWRlbnRpZmllciBDIGRvZXMgbm90IGhhdmUgdG8gYmUgYSB2YWxpZCBsYW5ndWFnZSBuYW1lLlwiXG5cdFx0Ly8gaHR0cDovL3d3dy53My5vcmcvVFIvc2VsZWN0b3JzLyNsYW5nLXBzZXVkb1xuXHRcdFwibGFuZ1wiOiBtYXJrRnVuY3Rpb24oIGZ1bmN0aW9uKCBsYW5nICkge1xuXHRcdFx0Ly8gbGFuZyB2YWx1ZSBtdXN0IGJlIGEgdmFsaWQgaWRlbnRpZmllclxuXHRcdFx0aWYgKCAhcmlkZW50aWZpZXIudGVzdChsYW5nIHx8IFwiXCIpICkge1xuXHRcdFx0XHRTaXp6bGUuZXJyb3IoIFwidW5zdXBwb3J0ZWQgbGFuZzogXCIgKyBsYW5nICk7XG5cdFx0XHR9XG5cdFx0XHRsYW5nID0gbGFuZy5yZXBsYWNlKCBydW5lc2NhcGUsIGZ1bmVzY2FwZSApLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdHZhciBlbGVtTGFuZztcblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdGlmICggKGVsZW1MYW5nID0gZG9jdW1lbnRJc0hUTUwgP1xuXHRcdFx0XHRcdFx0ZWxlbS5sYW5nIDpcblx0XHRcdFx0XHRcdGVsZW0uZ2V0QXR0cmlidXRlKFwieG1sOmxhbmdcIikgfHwgZWxlbS5nZXRBdHRyaWJ1dGUoXCJsYW5nXCIpKSApIHtcblxuXHRcdFx0XHRcdFx0ZWxlbUxhbmcgPSBlbGVtTGFuZy50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVsZW1MYW5nID09PSBsYW5nIHx8IGVsZW1MYW5nLmluZGV4T2YoIGxhbmcgKyBcIi1cIiApID09PSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSB3aGlsZSAoIChlbGVtID0gZWxlbS5wYXJlbnROb2RlKSAmJiBlbGVtLm5vZGVUeXBlID09PSAxICk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH07XG5cdFx0fSksXG5cblx0XHQvLyBNaXNjZWxsYW5lb3VzXG5cdFx0XCJ0YXJnZXRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHR2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbiAmJiB3aW5kb3cubG9jYXRpb24uaGFzaDtcblx0XHRcdHJldHVybiBoYXNoICYmIGhhc2guc2xpY2UoIDEgKSA9PT0gZWxlbS5pZDtcblx0XHR9LFxuXG5cdFx0XCJyb290XCI6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0gPT09IGRvY0VsZW07XG5cdFx0fSxcblxuXHRcdFwiZm9jdXNcIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbSA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiAoIWRvY3VtZW50Lmhhc0ZvY3VzIHx8IGRvY3VtZW50Lmhhc0ZvY3VzKCkpICYmICEhKGVsZW0udHlwZSB8fCBlbGVtLmhyZWYgfHwgfmVsZW0udGFiSW5kZXgpO1xuXHRcdH0sXG5cblx0XHQvLyBCb29sZWFuIHByb3BlcnRpZXNcblx0XHRcImVuYWJsZWRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5kaXNhYmxlZCA9PT0gZmFsc2U7XG5cdFx0fSxcblxuXHRcdFwiZGlzYWJsZWRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5kaXNhYmxlZCA9PT0gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJjaGVja2VkXCI6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0Ly8gSW4gQ1NTMywgOmNoZWNrZWQgc2hvdWxkIHJldHVybiBib3RoIGNoZWNrZWQgYW5kIHNlbGVjdGVkIGVsZW1lbnRzXG5cdFx0XHQvLyBodHRwOi8vd3d3LnczLm9yZy9UUi8yMDExL1JFQy1jc3MzLXNlbGVjdG9ycy0yMDExMDkyOS8jY2hlY2tlZFxuXHRcdFx0dmFyIG5vZGVOYW1lID0gZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0cmV0dXJuIChub2RlTmFtZSA9PT0gXCJpbnB1dFwiICYmICEhZWxlbS5jaGVja2VkKSB8fCAobm9kZU5hbWUgPT09IFwib3B0aW9uXCIgJiYgISFlbGVtLnNlbGVjdGVkKTtcblx0XHR9LFxuXG5cdFx0XCJzZWxlY3RlZFwiOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdC8vIEFjY2Vzc2luZyB0aGlzIHByb3BlcnR5IG1ha2VzIHNlbGVjdGVkLWJ5LWRlZmF1bHRcblx0XHRcdC8vIG9wdGlvbnMgaW4gU2FmYXJpIHdvcmsgcHJvcGVybHlcblx0XHRcdGlmICggZWxlbS5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRlbGVtLnBhcmVudE5vZGUuc2VsZWN0ZWRJbmRleDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGVsZW0uc2VsZWN0ZWQgPT09IHRydWU7XG5cdFx0fSxcblxuXHRcdC8vIENvbnRlbnRzXG5cdFx0XCJlbXB0eVwiOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL3NlbGVjdG9ycy8jZW1wdHktcHNldWRvXG5cdFx0XHQvLyA6ZW1wdHkgaXMgbmVnYXRlZCBieSBlbGVtZW50ICgxKSBvciBjb250ZW50IG5vZGVzICh0ZXh0OiAzOyBjZGF0YTogNDsgZW50aXR5IHJlZjogNSksXG5cdFx0XHQvLyAgIGJ1dCBub3QgYnkgb3RoZXJzIChjb21tZW50OiA4OyBwcm9jZXNzaW5nIGluc3RydWN0aW9uOiA3OyBldGMuKVxuXHRcdFx0Ly8gbm9kZVR5cGUgPCA2IHdvcmtzIGJlY2F1c2UgYXR0cmlidXRlcyAoMikgZG8gbm90IGFwcGVhciBhcyBjaGlsZHJlblxuXHRcdFx0Zm9yICggZWxlbSA9IGVsZW0uZmlyc3RDaGlsZDsgZWxlbTsgZWxlbSA9IGVsZW0ubmV4dFNpYmxpbmcgKSB7XG5cdFx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA8IDYgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0XCJwYXJlbnRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gIUV4cHIucHNldWRvc1tcImVtcHR5XCJdKCBlbGVtICk7XG5cdFx0fSxcblxuXHRcdC8vIEVsZW1lbnQvaW5wdXQgdHlwZXNcblx0XHRcImhlYWRlclwiOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiByaGVhZGVyLnRlc3QoIGVsZW0ubm9kZU5hbWUgKTtcblx0XHR9LFxuXG5cdFx0XCJpbnB1dFwiOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiByaW5wdXRzLnRlc3QoIGVsZW0ubm9kZU5hbWUgKTtcblx0XHR9LFxuXG5cdFx0XCJidXR0b25cIjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHR2YXIgbmFtZSA9IGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdHJldHVybiBuYW1lID09PSBcImlucHV0XCIgJiYgZWxlbS50eXBlID09PSBcImJ1dHRvblwiIHx8IG5hbWUgPT09IFwiYnV0dG9uXCI7XG5cdFx0fSxcblxuXHRcdFwidGV4dFwiOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHZhciBhdHRyO1xuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJpbnB1dFwiICYmXG5cdFx0XHRcdGVsZW0udHlwZSA9PT0gXCJ0ZXh0XCIgJiZcblxuXHRcdFx0XHQvLyBTdXBwb3J0OiBJRTw4XG5cdFx0XHRcdC8vIE5ldyBIVE1MNSBhdHRyaWJ1dGUgdmFsdWVzIChlLmcuLCBcInNlYXJjaFwiKSBhcHBlYXIgd2l0aCBlbGVtLnR5cGUgPT09IFwidGV4dFwiXG5cdFx0XHRcdCggKGF0dHIgPSBlbGVtLmdldEF0dHJpYnV0ZShcInR5cGVcIikpID09IG51bGwgfHwgYXR0ci50b0xvd2VyQ2FzZSgpID09PSBcInRleHRcIiApO1xuXHRcdH0sXG5cblx0XHQvLyBQb3NpdGlvbi1pbi1jb2xsZWN0aW9uXG5cdFx0XCJmaXJzdFwiOiBjcmVhdGVQb3NpdGlvbmFsUHNldWRvKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIFsgMCBdO1xuXHRcdH0pLFxuXG5cdFx0XCJsYXN0XCI6IGNyZWF0ZVBvc2l0aW9uYWxQc2V1ZG8oZnVuY3Rpb24oIG1hdGNoSW5kZXhlcywgbGVuZ3RoICkge1xuXHRcdFx0cmV0dXJuIFsgbGVuZ3RoIC0gMSBdO1xuXHRcdH0pLFxuXG5cdFx0XCJlcVwiOiBjcmVhdGVQb3NpdGlvbmFsUHNldWRvKGZ1bmN0aW9uKCBtYXRjaEluZGV4ZXMsIGxlbmd0aCwgYXJndW1lbnQgKSB7XG5cdFx0XHRyZXR1cm4gWyBhcmd1bWVudCA8IDAgPyBhcmd1bWVudCArIGxlbmd0aCA6IGFyZ3VtZW50IF07XG5cdFx0fSksXG5cblx0XHRcImV2ZW5cIjogY3JlYXRlUG9zaXRpb25hbFBzZXVkbyhmdW5jdGlvbiggbWF0Y2hJbmRleGVzLCBsZW5ndGggKSB7XG5cdFx0XHR2YXIgaSA9IDA7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkgKz0gMiApIHtcblx0XHRcdFx0bWF0Y2hJbmRleGVzLnB1c2goIGkgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBtYXRjaEluZGV4ZXM7XG5cdFx0fSksXG5cblx0XHRcIm9kZFwiOiBjcmVhdGVQb3NpdGlvbmFsUHNldWRvKGZ1bmN0aW9uKCBtYXRjaEluZGV4ZXMsIGxlbmd0aCApIHtcblx0XHRcdHZhciBpID0gMTtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSArPSAyICkge1xuXHRcdFx0XHRtYXRjaEluZGV4ZXMucHVzaCggaSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1hdGNoSW5kZXhlcztcblx0XHR9KSxcblxuXHRcdFwibHRcIjogY3JlYXRlUG9zaXRpb25hbFBzZXVkbyhmdW5jdGlvbiggbWF0Y2hJbmRleGVzLCBsZW5ndGgsIGFyZ3VtZW50ICkge1xuXHRcdFx0dmFyIGkgPSBhcmd1bWVudCA8IDAgPyBhcmd1bWVudCArIGxlbmd0aCA6IGFyZ3VtZW50O1xuXHRcdFx0Zm9yICggOyAtLWkgPj0gMDsgKSB7XG5cdFx0XHRcdG1hdGNoSW5kZXhlcy5wdXNoKCBpICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbWF0Y2hJbmRleGVzO1xuXHRcdH0pLFxuXG5cdFx0XCJndFwiOiBjcmVhdGVQb3NpdGlvbmFsUHNldWRvKGZ1bmN0aW9uKCBtYXRjaEluZGV4ZXMsIGxlbmd0aCwgYXJndW1lbnQgKSB7XG5cdFx0XHR2YXIgaSA9IGFyZ3VtZW50IDwgMCA/IGFyZ3VtZW50ICsgbGVuZ3RoIDogYXJndW1lbnQ7XG5cdFx0XHRmb3IgKCA7ICsraSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdG1hdGNoSW5kZXhlcy5wdXNoKCBpICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbWF0Y2hJbmRleGVzO1xuXHRcdH0pXG5cdH1cbn07XG5cbkV4cHIucHNldWRvc1tcIm50aFwiXSA9IEV4cHIucHNldWRvc1tcImVxXCJdO1xuXG4vLyBBZGQgYnV0dG9uL2lucHV0IHR5cGUgcHNldWRvc1xuZm9yICggaSBpbiB7IHJhZGlvOiB0cnVlLCBjaGVja2JveDogdHJ1ZSwgZmlsZTogdHJ1ZSwgcGFzc3dvcmQ6IHRydWUsIGltYWdlOiB0cnVlIH0gKSB7XG5cdEV4cHIucHNldWRvc1sgaSBdID0gY3JlYXRlSW5wdXRQc2V1ZG8oIGkgKTtcbn1cbmZvciAoIGkgaW4geyBzdWJtaXQ6IHRydWUsIHJlc2V0OiB0cnVlIH0gKSB7XG5cdEV4cHIucHNldWRvc1sgaSBdID0gY3JlYXRlQnV0dG9uUHNldWRvKCBpICk7XG59XG5cbi8vIEVhc3kgQVBJIGZvciBjcmVhdGluZyBuZXcgc2V0RmlsdGVyc1xuZnVuY3Rpb24gc2V0RmlsdGVycygpIHt9XG5zZXRGaWx0ZXJzLnByb3RvdHlwZSA9IEV4cHIuZmlsdGVycyA9IEV4cHIucHNldWRvcztcbkV4cHIuc2V0RmlsdGVycyA9IG5ldyBzZXRGaWx0ZXJzKCk7XG5cbnRva2VuaXplID0gU2l6emxlLnRva2VuaXplID0gZnVuY3Rpb24oIHNlbGVjdG9yLCBwYXJzZU9ubHkgKSB7XG5cdHZhciBtYXRjaGVkLCBtYXRjaCwgdG9rZW5zLCB0eXBlLFxuXHRcdHNvRmFyLCBncm91cHMsIHByZUZpbHRlcnMsXG5cdFx0Y2FjaGVkID0gdG9rZW5DYWNoZVsgc2VsZWN0b3IgKyBcIiBcIiBdO1xuXG5cdGlmICggY2FjaGVkICkge1xuXHRcdHJldHVybiBwYXJzZU9ubHkgPyAwIDogY2FjaGVkLnNsaWNlKCAwICk7XG5cdH1cblxuXHRzb0ZhciA9IHNlbGVjdG9yO1xuXHRncm91cHMgPSBbXTtcblx0cHJlRmlsdGVycyA9IEV4cHIucHJlRmlsdGVyO1xuXG5cdHdoaWxlICggc29GYXIgKSB7XG5cblx0XHQvLyBDb21tYSBhbmQgZmlyc3QgcnVuXG5cdFx0aWYgKCAhbWF0Y2hlZCB8fCAobWF0Y2ggPSByY29tbWEuZXhlYyggc29GYXIgKSkgKSB7XG5cdFx0XHRpZiAoIG1hdGNoICkge1xuXHRcdFx0XHQvLyBEb24ndCBjb25zdW1lIHRyYWlsaW5nIGNvbW1hcyBhcyB2YWxpZFxuXHRcdFx0XHRzb0ZhciA9IHNvRmFyLnNsaWNlKCBtYXRjaFswXS5sZW5ndGggKSB8fCBzb0Zhcjtcblx0XHRcdH1cblx0XHRcdGdyb3Vwcy5wdXNoKCAodG9rZW5zID0gW10pICk7XG5cdFx0fVxuXG5cdFx0bWF0Y2hlZCA9IGZhbHNlO1xuXG5cdFx0Ly8gQ29tYmluYXRvcnNcblx0XHRpZiAoIChtYXRjaCA9IHJjb21iaW5hdG9ycy5leGVjKCBzb0ZhciApKSApIHtcblx0XHRcdG1hdGNoZWQgPSBtYXRjaC5zaGlmdCgpO1xuXHRcdFx0dG9rZW5zLnB1c2goe1xuXHRcdFx0XHR2YWx1ZTogbWF0Y2hlZCxcblx0XHRcdFx0Ly8gQ2FzdCBkZXNjZW5kYW50IGNvbWJpbmF0b3JzIHRvIHNwYWNlXG5cdFx0XHRcdHR5cGU6IG1hdGNoWzBdLnJlcGxhY2UoIHJ0cmltLCBcIiBcIiApXG5cdFx0XHR9KTtcblx0XHRcdHNvRmFyID0gc29GYXIuc2xpY2UoIG1hdGNoZWQubGVuZ3RoICk7XG5cdFx0fVxuXG5cdFx0Ly8gRmlsdGVyc1xuXHRcdGZvciAoIHR5cGUgaW4gRXhwci5maWx0ZXIgKSB7XG5cdFx0XHRpZiAoIChtYXRjaCA9IG1hdGNoRXhwclsgdHlwZSBdLmV4ZWMoIHNvRmFyICkpICYmICghcHJlRmlsdGVyc1sgdHlwZSBdIHx8XG5cdFx0XHRcdChtYXRjaCA9IHByZUZpbHRlcnNbIHR5cGUgXSggbWF0Y2ggKSkpICkge1xuXHRcdFx0XHRtYXRjaGVkID0gbWF0Y2guc2hpZnQoKTtcblx0XHRcdFx0dG9rZW5zLnB1c2goe1xuXHRcdFx0XHRcdHZhbHVlOiBtYXRjaGVkLFxuXHRcdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdFx0bWF0Y2hlczogbWF0Y2hcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNvRmFyID0gc29GYXIuc2xpY2UoIG1hdGNoZWQubGVuZ3RoICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCAhbWF0Y2hlZCApIHtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbGVuZ3RoIG9mIHRoZSBpbnZhbGlkIGV4Y2Vzc1xuXHQvLyBpZiB3ZSdyZSBqdXN0IHBhcnNpbmdcblx0Ly8gT3RoZXJ3aXNlLCB0aHJvdyBhbiBlcnJvciBvciByZXR1cm4gdG9rZW5zXG5cdHJldHVybiBwYXJzZU9ubHkgP1xuXHRcdHNvRmFyLmxlbmd0aCA6XG5cdFx0c29GYXIgP1xuXHRcdFx0U2l6emxlLmVycm9yKCBzZWxlY3RvciApIDpcblx0XHRcdC8vIENhY2hlIHRoZSB0b2tlbnNcblx0XHRcdHRva2VuQ2FjaGUoIHNlbGVjdG9yLCBncm91cHMgKS5zbGljZSggMCApO1xufTtcblxuZnVuY3Rpb24gdG9TZWxlY3RvciggdG9rZW5zICkge1xuXHR2YXIgaSA9IDAsXG5cdFx0bGVuID0gdG9rZW5zLmxlbmd0aCxcblx0XHRzZWxlY3RvciA9IFwiXCI7XG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdHNlbGVjdG9yICs9IHRva2Vuc1tpXS52YWx1ZTtcblx0fVxuXHRyZXR1cm4gc2VsZWN0b3I7XG59XG5cbmZ1bmN0aW9uIGFkZENvbWJpbmF0b3IoIG1hdGNoZXIsIGNvbWJpbmF0b3IsIGJhc2UgKSB7XG5cdHZhciBkaXIgPSBjb21iaW5hdG9yLmRpcixcblx0XHRjaGVja05vbkVsZW1lbnRzID0gYmFzZSAmJiBkaXIgPT09IFwicGFyZW50Tm9kZVwiLFxuXHRcdGRvbmVOYW1lID0gZG9uZSsrO1xuXG5cdHJldHVybiBjb21iaW5hdG9yLmZpcnN0ID9cblx0XHQvLyBDaGVjayBhZ2FpbnN0IGNsb3Nlc3QgYW5jZXN0b3IvcHJlY2VkaW5nIGVsZW1lbnRcblx0XHRmdW5jdGlvbiggZWxlbSwgY29udGV4dCwgeG1sICkge1xuXHRcdFx0d2hpbGUgKCAoZWxlbSA9IGVsZW1bIGRpciBdKSApIHtcblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxIHx8IGNoZWNrTm9uRWxlbWVudHMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoZXIoIGVsZW0sIGNvbnRleHQsIHhtbCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSA6XG5cblx0XHQvLyBDaGVjayBhZ2FpbnN0IGFsbCBhbmNlc3Rvci9wcmVjZWRpbmcgZWxlbWVudHNcblx0XHRmdW5jdGlvbiggZWxlbSwgY29udGV4dCwgeG1sICkge1xuXHRcdFx0dmFyIG9sZENhY2hlLCBvdXRlckNhY2hlLFxuXHRcdFx0XHRuZXdDYWNoZSA9IFsgZGlycnVucywgZG9uZU5hbWUgXTtcblxuXHRcdFx0Ly8gV2UgY2FuJ3Qgc2V0IGFyYml0cmFyeSBkYXRhIG9uIFhNTCBub2Rlcywgc28gdGhleSBkb24ndCBiZW5lZml0IGZyb20gZGlyIGNhY2hpbmdcblx0XHRcdGlmICggeG1sICkge1xuXHRcdFx0XHR3aGlsZSAoIChlbGVtID0gZWxlbVsgZGlyIF0pICkge1xuXHRcdFx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA9PT0gMSB8fCBjaGVja05vbkVsZW1lbnRzICkge1xuXHRcdFx0XHRcdFx0aWYgKCBtYXRjaGVyKCBlbGVtLCBjb250ZXh0LCB4bWwgKSApIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3aGlsZSAoIChlbGVtID0gZWxlbVsgZGlyIF0pICkge1xuXHRcdFx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA9PT0gMSB8fCBjaGVja05vbkVsZW1lbnRzICkge1xuXHRcdFx0XHRcdFx0b3V0ZXJDYWNoZSA9IGVsZW1bIGV4cGFuZG8gXSB8fCAoZWxlbVsgZXhwYW5kbyBdID0ge30pO1xuXHRcdFx0XHRcdFx0aWYgKCAob2xkQ2FjaGUgPSBvdXRlckNhY2hlWyBkaXIgXSkgJiZcblx0XHRcdFx0XHRcdFx0b2xkQ2FjaGVbIDAgXSA9PT0gZGlycnVucyAmJiBvbGRDYWNoZVsgMSBdID09PSBkb25lTmFtZSApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBBc3NpZ24gdG8gbmV3Q2FjaGUgc28gcmVzdWx0cyBiYWNrLXByb3BhZ2F0ZSB0byBwcmV2aW91cyBlbGVtZW50c1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKG5ld0NhY2hlWyAyIF0gPSBvbGRDYWNoZVsgMiBdKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdC8vIFJldXNlIG5ld2NhY2hlIHNvIHJlc3VsdHMgYmFjay1wcm9wYWdhdGUgdG8gcHJldmlvdXMgZWxlbWVudHNcblx0XHRcdFx0XHRcdFx0b3V0ZXJDYWNoZVsgZGlyIF0gPSBuZXdDYWNoZTtcblxuXHRcdFx0XHRcdFx0XHQvLyBBIG1hdGNoIG1lYW5zIHdlJ3JlIGRvbmU7IGEgZmFpbCBtZWFucyB3ZSBoYXZlIHRvIGtlZXAgY2hlY2tpbmdcblx0XHRcdFx0XHRcdFx0aWYgKCAobmV3Q2FjaGVbIDIgXSA9IG1hdGNoZXIoIGVsZW0sIGNvbnRleHQsIHhtbCApKSApIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG59XG5cbmZ1bmN0aW9uIGVsZW1lbnRNYXRjaGVyKCBtYXRjaGVycyApIHtcblx0cmV0dXJuIG1hdGNoZXJzLmxlbmd0aCA+IDEgP1xuXHRcdGZ1bmN0aW9uKCBlbGVtLCBjb250ZXh0LCB4bWwgKSB7XG5cdFx0XHR2YXIgaSA9IG1hdGNoZXJzLmxlbmd0aDtcblx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRpZiAoICFtYXRjaGVyc1tpXSggZWxlbSwgY29udGV4dCwgeG1sICkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IDpcblx0XHRtYXRjaGVyc1swXTtcbn1cblxuZnVuY3Rpb24gbXVsdGlwbGVDb250ZXh0cyggc2VsZWN0b3IsIGNvbnRleHRzLCByZXN1bHRzICkge1xuXHR2YXIgaSA9IDAsXG5cdFx0bGVuID0gY29udGV4dHMubGVuZ3RoO1xuXHRmb3IgKCA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRTaXp6bGUoIHNlbGVjdG9yLCBjb250ZXh0c1tpXSwgcmVzdWx0cyApO1xuXHR9XG5cdHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBjb25kZW5zZSggdW5tYXRjaGVkLCBtYXAsIGZpbHRlciwgY29udGV4dCwgeG1sICkge1xuXHR2YXIgZWxlbSxcblx0XHRuZXdVbm1hdGNoZWQgPSBbXSxcblx0XHRpID0gMCxcblx0XHRsZW4gPSB1bm1hdGNoZWQubGVuZ3RoLFxuXHRcdG1hcHBlZCA9IG1hcCAhPSBudWxsO1xuXG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdGlmICggKGVsZW0gPSB1bm1hdGNoZWRbaV0pICkge1xuXHRcdFx0aWYgKCAhZmlsdGVyIHx8IGZpbHRlciggZWxlbSwgY29udGV4dCwgeG1sICkgKSB7XG5cdFx0XHRcdG5ld1VubWF0Y2hlZC5wdXNoKCBlbGVtICk7XG5cdFx0XHRcdGlmICggbWFwcGVkICkge1xuXHRcdFx0XHRcdG1hcC5wdXNoKCBpICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbmV3VW5tYXRjaGVkO1xufVxuXG5mdW5jdGlvbiBzZXRNYXRjaGVyKCBwcmVGaWx0ZXIsIHNlbGVjdG9yLCBtYXRjaGVyLCBwb3N0RmlsdGVyLCBwb3N0RmluZGVyLCBwb3N0U2VsZWN0b3IgKSB7XG5cdGlmICggcG9zdEZpbHRlciAmJiAhcG9zdEZpbHRlclsgZXhwYW5kbyBdICkge1xuXHRcdHBvc3RGaWx0ZXIgPSBzZXRNYXRjaGVyKCBwb3N0RmlsdGVyICk7XG5cdH1cblx0aWYgKCBwb3N0RmluZGVyICYmICFwb3N0RmluZGVyWyBleHBhbmRvIF0gKSB7XG5cdFx0cG9zdEZpbmRlciA9IHNldE1hdGNoZXIoIHBvc3RGaW5kZXIsIHBvc3RTZWxlY3RvciApO1xuXHR9XG5cdHJldHVybiBtYXJrRnVuY3Rpb24oZnVuY3Rpb24oIHNlZWQsIHJlc3VsdHMsIGNvbnRleHQsIHhtbCApIHtcblx0XHR2YXIgdGVtcCwgaSwgZWxlbSxcblx0XHRcdHByZU1hcCA9IFtdLFxuXHRcdFx0cG9zdE1hcCA9IFtdLFxuXHRcdFx0cHJlZXhpc3RpbmcgPSByZXN1bHRzLmxlbmd0aCxcblxuXHRcdFx0Ly8gR2V0IGluaXRpYWwgZWxlbWVudHMgZnJvbSBzZWVkIG9yIGNvbnRleHRcblx0XHRcdGVsZW1zID0gc2VlZCB8fCBtdWx0aXBsZUNvbnRleHRzKCBzZWxlY3RvciB8fCBcIipcIiwgY29udGV4dC5ub2RlVHlwZSA/IFsgY29udGV4dCBdIDogY29udGV4dCwgW10gKSxcblxuXHRcdFx0Ly8gUHJlZmlsdGVyIHRvIGdldCBtYXRjaGVyIGlucHV0LCBwcmVzZXJ2aW5nIGEgbWFwIGZvciBzZWVkLXJlc3VsdHMgc3luY2hyb25pemF0aW9uXG5cdFx0XHRtYXRjaGVySW4gPSBwcmVGaWx0ZXIgJiYgKCBzZWVkIHx8ICFzZWxlY3RvciApID9cblx0XHRcdFx0Y29uZGVuc2UoIGVsZW1zLCBwcmVNYXAsIHByZUZpbHRlciwgY29udGV4dCwgeG1sICkgOlxuXHRcdFx0XHRlbGVtcyxcblxuXHRcdFx0bWF0Y2hlck91dCA9IG1hdGNoZXIgP1xuXHRcdFx0XHQvLyBJZiB3ZSBoYXZlIGEgcG9zdEZpbmRlciwgb3IgZmlsdGVyZWQgc2VlZCwgb3Igbm9uLXNlZWQgcG9zdEZpbHRlciBvciBwcmVleGlzdGluZyByZXN1bHRzLFxuXHRcdFx0XHRwb3N0RmluZGVyIHx8ICggc2VlZCA/IHByZUZpbHRlciA6IHByZWV4aXN0aW5nIHx8IHBvc3RGaWx0ZXIgKSA/XG5cblx0XHRcdFx0XHQvLyAuLi5pbnRlcm1lZGlhdGUgcHJvY2Vzc2luZyBpcyBuZWNlc3Nhcnlcblx0XHRcdFx0XHRbXSA6XG5cblx0XHRcdFx0XHQvLyAuLi5vdGhlcndpc2UgdXNlIHJlc3VsdHMgZGlyZWN0bHlcblx0XHRcdFx0XHRyZXN1bHRzIDpcblx0XHRcdFx0bWF0Y2hlckluO1xuXG5cdFx0Ly8gRmluZCBwcmltYXJ5IG1hdGNoZXNcblx0XHRpZiAoIG1hdGNoZXIgKSB7XG5cdFx0XHRtYXRjaGVyKCBtYXRjaGVySW4sIG1hdGNoZXJPdXQsIGNvbnRleHQsIHhtbCApO1xuXHRcdH1cblxuXHRcdC8vIEFwcGx5IHBvc3RGaWx0ZXJcblx0XHRpZiAoIHBvc3RGaWx0ZXIgKSB7XG5cdFx0XHR0ZW1wID0gY29uZGVuc2UoIG1hdGNoZXJPdXQsIHBvc3RNYXAgKTtcblx0XHRcdHBvc3RGaWx0ZXIoIHRlbXAsIFtdLCBjb250ZXh0LCB4bWwgKTtcblxuXHRcdFx0Ly8gVW4tbWF0Y2ggZmFpbGluZyBlbGVtZW50cyBieSBtb3ZpbmcgdGhlbSBiYWNrIHRvIG1hdGNoZXJJblxuXHRcdFx0aSA9IHRlbXAubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0XHRcdGlmICggKGVsZW0gPSB0ZW1wW2ldKSApIHtcblx0XHRcdFx0XHRtYXRjaGVyT3V0WyBwb3N0TWFwW2ldIF0gPSAhKG1hdGNoZXJJblsgcG9zdE1hcFtpXSBdID0gZWxlbSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoIHNlZWQgKSB7XG5cdFx0XHRpZiAoIHBvc3RGaW5kZXIgfHwgcHJlRmlsdGVyICkge1xuXHRcdFx0XHRpZiAoIHBvc3RGaW5kZXIgKSB7XG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBmaW5hbCBtYXRjaGVyT3V0IGJ5IGNvbmRlbnNpbmcgdGhpcyBpbnRlcm1lZGlhdGUgaW50byBwb3N0RmluZGVyIGNvbnRleHRzXG5cdFx0XHRcdFx0dGVtcCA9IFtdO1xuXHRcdFx0XHRcdGkgPSBtYXRjaGVyT3V0Lmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdFx0XHRcdGlmICggKGVsZW0gPSBtYXRjaGVyT3V0W2ldKSApIHtcblx0XHRcdFx0XHRcdFx0Ly8gUmVzdG9yZSBtYXRjaGVySW4gc2luY2UgZWxlbSBpcyBub3QgeWV0IGEgZmluYWwgbWF0Y2hcblx0XHRcdFx0XHRcdFx0dGVtcC5wdXNoKCAobWF0Y2hlckluW2ldID0gZWxlbSkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cG9zdEZpbmRlciggbnVsbCwgKG1hdGNoZXJPdXQgPSBbXSksIHRlbXAsIHhtbCApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTW92ZSBtYXRjaGVkIGVsZW1lbnRzIGZyb20gc2VlZCB0byByZXN1bHRzIHRvIGtlZXAgdGhlbSBzeW5jaHJvbml6ZWRcblx0XHRcdFx0aSA9IG1hdGNoZXJPdXQubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdFx0XHRpZiAoIChlbGVtID0gbWF0Y2hlck91dFtpXSkgJiZcblx0XHRcdFx0XHRcdCh0ZW1wID0gcG9zdEZpbmRlciA/IGluZGV4T2YuY2FsbCggc2VlZCwgZWxlbSApIDogcHJlTWFwW2ldKSA+IC0xICkge1xuXG5cdFx0XHRcdFx0XHRzZWVkW3RlbXBdID0gIShyZXN1bHRzW3RlbXBdID0gZWxlbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHQvLyBBZGQgZWxlbWVudHMgdG8gcmVzdWx0cywgdGhyb3VnaCBwb3N0RmluZGVyIGlmIGRlZmluZWRcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWF0Y2hlck91dCA9IGNvbmRlbnNlKFxuXHRcdFx0XHRtYXRjaGVyT3V0ID09PSByZXN1bHRzID9cblx0XHRcdFx0XHRtYXRjaGVyT3V0LnNwbGljZSggcHJlZXhpc3RpbmcsIG1hdGNoZXJPdXQubGVuZ3RoICkgOlxuXHRcdFx0XHRcdG1hdGNoZXJPdXRcblx0XHRcdCk7XG5cdFx0XHRpZiAoIHBvc3RGaW5kZXIgKSB7XG5cdFx0XHRcdHBvc3RGaW5kZXIoIG51bGwsIHJlc3VsdHMsIG1hdGNoZXJPdXQsIHhtbCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgbWF0Y2hlck91dCApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIG1hdGNoZXJGcm9tVG9rZW5zKCB0b2tlbnMgKSB7XG5cdHZhciBjaGVja0NvbnRleHQsIG1hdGNoZXIsIGosXG5cdFx0bGVuID0gdG9rZW5zLmxlbmd0aCxcblx0XHRsZWFkaW5nUmVsYXRpdmUgPSBFeHByLnJlbGF0aXZlWyB0b2tlbnNbMF0udHlwZSBdLFxuXHRcdGltcGxpY2l0UmVsYXRpdmUgPSBsZWFkaW5nUmVsYXRpdmUgfHwgRXhwci5yZWxhdGl2ZVtcIiBcIl0sXG5cdFx0aSA9IGxlYWRpbmdSZWxhdGl2ZSA/IDEgOiAwLFxuXG5cdFx0Ly8gVGhlIGZvdW5kYXRpb25hbCBtYXRjaGVyIGVuc3VyZXMgdGhhdCBlbGVtZW50cyBhcmUgcmVhY2hhYmxlIGZyb20gdG9wLWxldmVsIGNvbnRleHQocylcblx0XHRtYXRjaENvbnRleHQgPSBhZGRDb21iaW5hdG9yKCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiBlbGVtID09PSBjaGVja0NvbnRleHQ7XG5cdFx0fSwgaW1wbGljaXRSZWxhdGl2ZSwgdHJ1ZSApLFxuXHRcdG1hdGNoQW55Q29udGV4dCA9IGFkZENvbWJpbmF0b3IoIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGluZGV4T2YuY2FsbCggY2hlY2tDb250ZXh0LCBlbGVtICkgPiAtMTtcblx0XHR9LCBpbXBsaWNpdFJlbGF0aXZlLCB0cnVlICksXG5cdFx0bWF0Y2hlcnMgPSBbIGZ1bmN0aW9uKCBlbGVtLCBjb250ZXh0LCB4bWwgKSB7XG5cdFx0XHRyZXR1cm4gKCAhbGVhZGluZ1JlbGF0aXZlICYmICggeG1sIHx8IGNvbnRleHQgIT09IG91dGVybW9zdENvbnRleHQgKSApIHx8IChcblx0XHRcdFx0KGNoZWNrQ29udGV4dCA9IGNvbnRleHQpLm5vZGVUeXBlID9cblx0XHRcdFx0XHRtYXRjaENvbnRleHQoIGVsZW0sIGNvbnRleHQsIHhtbCApIDpcblx0XHRcdFx0XHRtYXRjaEFueUNvbnRleHQoIGVsZW0sIGNvbnRleHQsIHhtbCApICk7XG5cdFx0fSBdO1xuXG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdGlmICggKG1hdGNoZXIgPSBFeHByLnJlbGF0aXZlWyB0b2tlbnNbaV0udHlwZSBdKSApIHtcblx0XHRcdG1hdGNoZXJzID0gWyBhZGRDb21iaW5hdG9yKGVsZW1lbnRNYXRjaGVyKCBtYXRjaGVycyApLCBtYXRjaGVyKSBdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtYXRjaGVyID0gRXhwci5maWx0ZXJbIHRva2Vuc1tpXS50eXBlIF0uYXBwbHkoIG51bGwsIHRva2Vuc1tpXS5tYXRjaGVzICk7XG5cblx0XHRcdC8vIFJldHVybiBzcGVjaWFsIHVwb24gc2VlaW5nIGEgcG9zaXRpb25hbCBtYXRjaGVyXG5cdFx0XHRpZiAoIG1hdGNoZXJbIGV4cGFuZG8gXSApIHtcblx0XHRcdFx0Ly8gRmluZCB0aGUgbmV4dCByZWxhdGl2ZSBvcGVyYXRvciAoaWYgYW55KSBmb3IgcHJvcGVyIGhhbmRsaW5nXG5cdFx0XHRcdGogPSArK2k7XG5cdFx0XHRcdGZvciAoIDsgaiA8IGxlbjsgaisrICkge1xuXHRcdFx0XHRcdGlmICggRXhwci5yZWxhdGl2ZVsgdG9rZW5zW2pdLnR5cGUgXSApIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gc2V0TWF0Y2hlcihcblx0XHRcdFx0XHRpID4gMSAmJiBlbGVtZW50TWF0Y2hlciggbWF0Y2hlcnMgKSxcblx0XHRcdFx0XHRpID4gMSAmJiB0b1NlbGVjdG9yKFxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhlIHByZWNlZGluZyB0b2tlbiB3YXMgYSBkZXNjZW5kYW50IGNvbWJpbmF0b3IsIGluc2VydCBhbiBpbXBsaWNpdCBhbnktZWxlbWVudCBgKmBcblx0XHRcdFx0XHRcdHRva2Vucy5zbGljZSggMCwgaSAtIDEgKS5jb25jYXQoeyB2YWx1ZTogdG9rZW5zWyBpIC0gMiBdLnR5cGUgPT09IFwiIFwiID8gXCIqXCIgOiBcIlwiIH0pXG5cdFx0XHRcdFx0KS5yZXBsYWNlKCBydHJpbSwgXCIkMVwiICksXG5cdFx0XHRcdFx0bWF0Y2hlcixcblx0XHRcdFx0XHRpIDwgaiAmJiBtYXRjaGVyRnJvbVRva2VucyggdG9rZW5zLnNsaWNlKCBpLCBqICkgKSxcblx0XHRcdFx0XHRqIDwgbGVuICYmIG1hdGNoZXJGcm9tVG9rZW5zKCAodG9rZW5zID0gdG9rZW5zLnNsaWNlKCBqICkpICksXG5cdFx0XHRcdFx0aiA8IGxlbiAmJiB0b1NlbGVjdG9yKCB0b2tlbnMgKVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdFx0bWF0Y2hlcnMucHVzaCggbWF0Y2hlciApO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBlbGVtZW50TWF0Y2hlciggbWF0Y2hlcnMgKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlckZyb21Hcm91cE1hdGNoZXJzKCBlbGVtZW50TWF0Y2hlcnMsIHNldE1hdGNoZXJzICkge1xuXHR2YXIgYnlTZXQgPSBzZXRNYXRjaGVycy5sZW5ndGggPiAwLFxuXHRcdGJ5RWxlbWVudCA9IGVsZW1lbnRNYXRjaGVycy5sZW5ndGggPiAwLFxuXHRcdHN1cGVyTWF0Y2hlciA9IGZ1bmN0aW9uKCBzZWVkLCBjb250ZXh0LCB4bWwsIHJlc3VsdHMsIG91dGVybW9zdCApIHtcblx0XHRcdHZhciBlbGVtLCBqLCBtYXRjaGVyLFxuXHRcdFx0XHRtYXRjaGVkQ291bnQgPSAwLFxuXHRcdFx0XHRpID0gXCIwXCIsXG5cdFx0XHRcdHVubWF0Y2hlZCA9IHNlZWQgJiYgW10sXG5cdFx0XHRcdHNldE1hdGNoZWQgPSBbXSxcblx0XHRcdFx0Y29udGV4dEJhY2t1cCA9IG91dGVybW9zdENvbnRleHQsXG5cdFx0XHRcdC8vIFdlIG11c3QgYWx3YXlzIGhhdmUgZWl0aGVyIHNlZWQgZWxlbWVudHMgb3Igb3V0ZXJtb3N0IGNvbnRleHRcblx0XHRcdFx0ZWxlbXMgPSBzZWVkIHx8IGJ5RWxlbWVudCAmJiBFeHByLmZpbmRbXCJUQUdcIl0oIFwiKlwiLCBvdXRlcm1vc3QgKSxcblx0XHRcdFx0Ly8gVXNlIGludGVnZXIgZGlycnVucyBpZmYgdGhpcyBpcyB0aGUgb3V0ZXJtb3N0IG1hdGNoZXJcblx0XHRcdFx0ZGlycnVuc1VuaXF1ZSA9IChkaXJydW5zICs9IGNvbnRleHRCYWNrdXAgPT0gbnVsbCA/IDEgOiBNYXRoLnJhbmRvbSgpIHx8IDAuMSksXG5cdFx0XHRcdGxlbiA9IGVsZW1zLmxlbmd0aDtcblxuXHRcdFx0aWYgKCBvdXRlcm1vc3QgKSB7XG5cdFx0XHRcdG91dGVybW9zdENvbnRleHQgPSBjb250ZXh0ICE9PSBkb2N1bWVudCAmJiBjb250ZXh0O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgZWxlbWVudHMgcGFzc2luZyBlbGVtZW50TWF0Y2hlcnMgZGlyZWN0bHkgdG8gcmVzdWx0c1xuXHRcdFx0Ly8gS2VlcCBgaWAgYSBzdHJpbmcgaWYgdGhlcmUgYXJlIG5vIGVsZW1lbnRzIHNvIGBtYXRjaGVkQ291bnRgIHdpbGwgYmUgXCIwMFwiIGJlbG93XG5cdFx0XHQvLyBTdXBwb3J0OiBJRTw5LCBTYWZhcmlcblx0XHRcdC8vIFRvbGVyYXRlIE5vZGVMaXN0IHByb3BlcnRpZXMgKElFOiBcImxlbmd0aFwiOyBTYWZhcmk6IDxudW1iZXI+KSBtYXRjaGluZyBlbGVtZW50cyBieSBpZFxuXHRcdFx0Zm9yICggOyBpICE9PSBsZW4gJiYgKGVsZW0gPSBlbGVtc1tpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIGJ5RWxlbWVudCAmJiBlbGVtICkge1xuXHRcdFx0XHRcdGogPSAwO1xuXHRcdFx0XHRcdHdoaWxlICggKG1hdGNoZXIgPSBlbGVtZW50TWF0Y2hlcnNbaisrXSkgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIG1hdGNoZXIoIGVsZW0sIGNvbnRleHQsIHhtbCApICkge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHRzLnB1c2goIGVsZW0gKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggb3V0ZXJtb3N0ICkge1xuXHRcdFx0XHRcdFx0ZGlycnVucyA9IGRpcnJ1bnNVbmlxdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gVHJhY2sgdW5tYXRjaGVkIGVsZW1lbnRzIGZvciBzZXQgZmlsdGVyc1xuXHRcdFx0XHRpZiAoIGJ5U2V0ICkge1xuXHRcdFx0XHRcdC8vIFRoZXkgd2lsbCBoYXZlIGdvbmUgdGhyb3VnaCBhbGwgcG9zc2libGUgbWF0Y2hlcnNcblx0XHRcdFx0XHRpZiAoIChlbGVtID0gIW1hdGNoZXIgJiYgZWxlbSkgKSB7XG5cdFx0XHRcdFx0XHRtYXRjaGVkQ291bnQtLTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBMZW5ndGhlbiB0aGUgYXJyYXkgZm9yIGV2ZXJ5IGVsZW1lbnQsIG1hdGNoZWQgb3Igbm90XG5cdFx0XHRcdFx0aWYgKCBzZWVkICkge1xuXHRcdFx0XHRcdFx0dW5tYXRjaGVkLnB1c2goIGVsZW0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQXBwbHkgc2V0IGZpbHRlcnMgdG8gdW5tYXRjaGVkIGVsZW1lbnRzXG5cdFx0XHRtYXRjaGVkQ291bnQgKz0gaTtcblx0XHRcdGlmICggYnlTZXQgJiYgaSAhPT0gbWF0Y2hlZENvdW50ICkge1xuXHRcdFx0XHRqID0gMDtcblx0XHRcdFx0d2hpbGUgKCAobWF0Y2hlciA9IHNldE1hdGNoZXJzW2orK10pICkge1xuXHRcdFx0XHRcdG1hdGNoZXIoIHVubWF0Y2hlZCwgc2V0TWF0Y2hlZCwgY29udGV4dCwgeG1sICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIHNlZWQgKSB7XG5cdFx0XHRcdFx0Ly8gUmVpbnRlZ3JhdGUgZWxlbWVudCBtYXRjaGVzIHRvIGVsaW1pbmF0ZSB0aGUgbmVlZCBmb3Igc29ydGluZ1xuXHRcdFx0XHRcdGlmICggbWF0Y2hlZENvdW50ID4gMCApIHtcblx0XHRcdFx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICEodW5tYXRjaGVkW2ldIHx8IHNldE1hdGNoZWRbaV0pICkge1xuXHRcdFx0XHRcdFx0XHRcdHNldE1hdGNoZWRbaV0gPSBwb3AuY2FsbCggcmVzdWx0cyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gRGlzY2FyZCBpbmRleCBwbGFjZWhvbGRlciB2YWx1ZXMgdG8gZ2V0IG9ubHkgYWN0dWFsIG1hdGNoZXNcblx0XHRcdFx0XHRzZXRNYXRjaGVkID0gY29uZGVuc2UoIHNldE1hdGNoZWQgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEFkZCBtYXRjaGVzIHRvIHJlc3VsdHNcblx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgc2V0TWF0Y2hlZCApO1xuXG5cdFx0XHRcdC8vIFNlZWRsZXNzIHNldCBtYXRjaGVzIHN1Y2NlZWRpbmcgbXVsdGlwbGUgc3VjY2Vzc2Z1bCBtYXRjaGVycyBzdGlwdWxhdGUgc29ydGluZ1xuXHRcdFx0XHRpZiAoIG91dGVybW9zdCAmJiAhc2VlZCAmJiBzZXRNYXRjaGVkLmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHQoIG1hdGNoZWRDb3VudCArIHNldE1hdGNoZXJzLmxlbmd0aCApID4gMSApIHtcblxuXHRcdFx0XHRcdFNpenpsZS51bmlxdWVTb3J0KCByZXN1bHRzICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gT3ZlcnJpZGUgbWFuaXB1bGF0aW9uIG9mIGdsb2JhbHMgYnkgbmVzdGVkIG1hdGNoZXJzXG5cdFx0XHRpZiAoIG91dGVybW9zdCApIHtcblx0XHRcdFx0ZGlycnVucyA9IGRpcnJ1bnNVbmlxdWU7XG5cdFx0XHRcdG91dGVybW9zdENvbnRleHQgPSBjb250ZXh0QmFja3VwO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdW5tYXRjaGVkO1xuXHRcdH07XG5cblx0cmV0dXJuIGJ5U2V0ID9cblx0XHRtYXJrRnVuY3Rpb24oIHN1cGVyTWF0Y2hlciApIDpcblx0XHRzdXBlck1hdGNoZXI7XG59XG5cbmNvbXBpbGUgPSBTaXp6bGUuY29tcGlsZSA9IGZ1bmN0aW9uKCBzZWxlY3RvciwgbWF0Y2ggLyogSW50ZXJuYWwgVXNlIE9ubHkgKi8gKSB7XG5cdHZhciBpLFxuXHRcdHNldE1hdGNoZXJzID0gW10sXG5cdFx0ZWxlbWVudE1hdGNoZXJzID0gW10sXG5cdFx0Y2FjaGVkID0gY29tcGlsZXJDYWNoZVsgc2VsZWN0b3IgKyBcIiBcIiBdO1xuXG5cdGlmICggIWNhY2hlZCApIHtcblx0XHQvLyBHZW5lcmF0ZSBhIGZ1bmN0aW9uIG9mIHJlY3Vyc2l2ZSBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgdXNlZCB0byBjaGVjayBlYWNoIGVsZW1lbnRcblx0XHRpZiAoICFtYXRjaCApIHtcblx0XHRcdG1hdGNoID0gdG9rZW5pemUoIHNlbGVjdG9yICk7XG5cdFx0fVxuXHRcdGkgPSBtYXRjaC5sZW5ndGg7XG5cdFx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0XHRjYWNoZWQgPSBtYXRjaGVyRnJvbVRva2VucyggbWF0Y2hbaV0gKTtcblx0XHRcdGlmICggY2FjaGVkWyBleHBhbmRvIF0gKSB7XG5cdFx0XHRcdHNldE1hdGNoZXJzLnB1c2goIGNhY2hlZCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWxlbWVudE1hdGNoZXJzLnB1c2goIGNhY2hlZCApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENhY2hlIHRoZSBjb21waWxlZCBmdW5jdGlvblxuXHRcdGNhY2hlZCA9IGNvbXBpbGVyQ2FjaGUoIHNlbGVjdG9yLCBtYXRjaGVyRnJvbUdyb3VwTWF0Y2hlcnMoIGVsZW1lbnRNYXRjaGVycywgc2V0TWF0Y2hlcnMgKSApO1xuXG5cdFx0Ly8gU2F2ZSBzZWxlY3RvciBhbmQgdG9rZW5pemF0aW9uXG5cdFx0Y2FjaGVkLnNlbGVjdG9yID0gc2VsZWN0b3I7XG5cdH1cblx0cmV0dXJuIGNhY2hlZDtcbn07XG5cbi8qKlxuICogQSBsb3ctbGV2ZWwgc2VsZWN0aW9uIGZ1bmN0aW9uIHRoYXQgd29ya3Mgd2l0aCBTaXp6bGUncyBjb21waWxlZFxuICogIHNlbGVjdG9yIGZ1bmN0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd8RnVuY3Rpb259IHNlbGVjdG9yIEEgc2VsZWN0b3Igb3IgYSBwcmUtY29tcGlsZWRcbiAqICBzZWxlY3RvciBmdW5jdGlvbiBidWlsdCB3aXRoIFNpenpsZS5jb21waWxlXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGNvbnRleHRcbiAqIEBwYXJhbSB7QXJyYXl9IFtyZXN1bHRzXVxuICogQHBhcmFtIHtBcnJheX0gW3NlZWRdIEEgc2V0IG9mIGVsZW1lbnRzIHRvIG1hdGNoIGFnYWluc3RcbiAqL1xuc2VsZWN0ID0gU2l6emxlLnNlbGVjdCA9IGZ1bmN0aW9uKCBzZWxlY3RvciwgY29udGV4dCwgcmVzdWx0cywgc2VlZCApIHtcblx0dmFyIGksIHRva2VucywgdG9rZW4sIHR5cGUsIGZpbmQsXG5cdFx0Y29tcGlsZWQgPSB0eXBlb2Ygc2VsZWN0b3IgPT09IFwiZnVuY3Rpb25cIiAmJiBzZWxlY3Rvcixcblx0XHRtYXRjaCA9ICFzZWVkICYmIHRva2VuaXplKCAoc2VsZWN0b3IgPSBjb21waWxlZC5zZWxlY3RvciB8fCBzZWxlY3RvcikgKTtcblxuXHRyZXN1bHRzID0gcmVzdWx0cyB8fCBbXTtcblxuXHQvLyBUcnkgdG8gbWluaW1pemUgb3BlcmF0aW9ucyBpZiB0aGVyZSBpcyBubyBzZWVkIGFuZCBvbmx5IG9uZSBncm91cFxuXHRpZiAoIG1hdGNoLmxlbmd0aCA9PT0gMSApIHtcblxuXHRcdC8vIFRha2UgYSBzaG9ydGN1dCBhbmQgc2V0IHRoZSBjb250ZXh0IGlmIHRoZSByb290IHNlbGVjdG9yIGlzIGFuIElEXG5cdFx0dG9rZW5zID0gbWF0Y2hbMF0gPSBtYXRjaFswXS5zbGljZSggMCApO1xuXHRcdGlmICggdG9rZW5zLmxlbmd0aCA+IDIgJiYgKHRva2VuID0gdG9rZW5zWzBdKS50eXBlID09PSBcIklEXCIgJiZcblx0XHRcdFx0c3VwcG9ydC5nZXRCeUlkICYmIGNvbnRleHQubm9kZVR5cGUgPT09IDkgJiYgZG9jdW1lbnRJc0hUTUwgJiZcblx0XHRcdFx0RXhwci5yZWxhdGl2ZVsgdG9rZW5zWzFdLnR5cGUgXSApIHtcblxuXHRcdFx0Y29udGV4dCA9ICggRXhwci5maW5kW1wiSURcIl0oIHRva2VuLm1hdGNoZXNbMF0ucmVwbGFjZShydW5lc2NhcGUsIGZ1bmVzY2FwZSksIGNvbnRleHQgKSB8fCBbXSApWzBdO1xuXHRcdFx0aWYgKCAhY29udGV4dCApIHtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cblx0XHRcdC8vIFByZWNvbXBpbGVkIG1hdGNoZXJzIHdpbGwgc3RpbGwgdmVyaWZ5IGFuY2VzdHJ5LCBzbyBzdGVwIHVwIGEgbGV2ZWxcblx0XHRcdH0gZWxzZSBpZiAoIGNvbXBpbGVkICkge1xuXHRcdFx0XHRjb250ZXh0ID0gY29udGV4dC5wYXJlbnROb2RlO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxlY3RvciA9IHNlbGVjdG9yLnNsaWNlKCB0b2tlbnMuc2hpZnQoKS52YWx1ZS5sZW5ndGggKTtcblx0XHR9XG5cblx0XHQvLyBGZXRjaCBhIHNlZWQgc2V0IGZvciByaWdodC10by1sZWZ0IG1hdGNoaW5nXG5cdFx0aSA9IG1hdGNoRXhwcltcIm5lZWRzQ29udGV4dFwiXS50ZXN0KCBzZWxlY3RvciApID8gMCA6IHRva2Vucy5sZW5ndGg7XG5cdFx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0XHR0b2tlbiA9IHRva2Vuc1tpXTtcblxuXHRcdFx0Ly8gQWJvcnQgaWYgd2UgaGl0IGEgY29tYmluYXRvclxuXHRcdFx0aWYgKCBFeHByLnJlbGF0aXZlWyAodHlwZSA9IHRva2VuLnR5cGUpIF0gKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAoZmluZCA9IEV4cHIuZmluZFsgdHlwZSBdKSApIHtcblx0XHRcdFx0Ly8gU2VhcmNoLCBleHBhbmRpbmcgY29udGV4dCBmb3IgbGVhZGluZyBzaWJsaW5nIGNvbWJpbmF0b3JzXG5cdFx0XHRcdGlmICggKHNlZWQgPSBmaW5kKFxuXHRcdFx0XHRcdHRva2VuLm1hdGNoZXNbMF0ucmVwbGFjZSggcnVuZXNjYXBlLCBmdW5lc2NhcGUgKSxcblx0XHRcdFx0XHRyc2libGluZy50ZXN0KCB0b2tlbnNbMF0udHlwZSApICYmIHRlc3RDb250ZXh0KCBjb250ZXh0LnBhcmVudE5vZGUgKSB8fCBjb250ZXh0XG5cdFx0XHRcdCkpICkge1xuXG5cdFx0XHRcdFx0Ly8gSWYgc2VlZCBpcyBlbXB0eSBvciBubyB0b2tlbnMgcmVtYWluLCB3ZSBjYW4gcmV0dXJuIGVhcmx5XG5cdFx0XHRcdFx0dG9rZW5zLnNwbGljZSggaSwgMSApO1xuXHRcdFx0XHRcdHNlbGVjdG9yID0gc2VlZC5sZW5ndGggJiYgdG9TZWxlY3RvciggdG9rZW5zICk7XG5cdFx0XHRcdFx0aWYgKCAhc2VsZWN0b3IgKSB7XG5cdFx0XHRcdFx0XHRwdXNoLmFwcGx5KCByZXN1bHRzLCBzZWVkICk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIENvbXBpbGUgYW5kIGV4ZWN1dGUgYSBmaWx0ZXJpbmcgZnVuY3Rpb24gaWYgb25lIGlzIG5vdCBwcm92aWRlZFxuXHQvLyBQcm92aWRlIGBtYXRjaGAgdG8gYXZvaWQgcmV0b2tlbml6YXRpb24gaWYgd2UgbW9kaWZpZWQgdGhlIHNlbGVjdG9yIGFib3ZlXG5cdCggY29tcGlsZWQgfHwgY29tcGlsZSggc2VsZWN0b3IsIG1hdGNoICkgKShcblx0XHRzZWVkLFxuXHRcdGNvbnRleHQsXG5cdFx0IWRvY3VtZW50SXNIVE1MLFxuXHRcdHJlc3VsdHMsXG5cdFx0cnNpYmxpbmcudGVzdCggc2VsZWN0b3IgKSAmJiB0ZXN0Q29udGV4dCggY29udGV4dC5wYXJlbnROb2RlICkgfHwgY29udGV4dFxuXHQpO1xuXHRyZXR1cm4gcmVzdWx0cztcbn07XG5cbi8vIE9uZS10aW1lIGFzc2lnbm1lbnRzXG5cbi8vIFNvcnQgc3RhYmlsaXR5XG5zdXBwb3J0LnNvcnRTdGFibGUgPSBleHBhbmRvLnNwbGl0KFwiXCIpLnNvcnQoIHNvcnRPcmRlciApLmpvaW4oXCJcIikgPT09IGV4cGFuZG87XG5cbi8vIFN1cHBvcnQ6IENocm9tZTwxNFxuLy8gQWx3YXlzIGFzc3VtZSBkdXBsaWNhdGVzIGlmIHRoZXkgYXJlbid0IHBhc3NlZCB0byB0aGUgY29tcGFyaXNvbiBmdW5jdGlvblxuc3VwcG9ydC5kZXRlY3REdXBsaWNhdGVzID0gISFoYXNEdXBsaWNhdGU7XG5cbi8vIEluaXRpYWxpemUgYWdhaW5zdCB0aGUgZGVmYXVsdCBkb2N1bWVudFxuc2V0RG9jdW1lbnQoKTtcblxuLy8gU3VwcG9ydDogV2Via2l0PDUzNy4zMiAtIFNhZmFyaSA2LjAuMy9DaHJvbWUgMjUgKGZpeGVkIGluIENocm9tZSAyNylcbi8vIERldGFjaGVkIG5vZGVzIGNvbmZvdW5kaW5nbHkgZm9sbG93ICplYWNoIG90aGVyKlxuc3VwcG9ydC5zb3J0RGV0YWNoZWQgPSBhc3NlcnQoZnVuY3Rpb24oIGRpdjEgKSB7XG5cdC8vIFNob3VsZCByZXR1cm4gMSwgYnV0IHJldHVybnMgNCAoZm9sbG93aW5nKVxuXHRyZXR1cm4gZGl2MS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiggZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSApICYgMTtcbn0pO1xuXG4vLyBTdXBwb3J0OiBJRTw4XG4vLyBQcmV2ZW50IGF0dHJpYnV0ZS9wcm9wZXJ0eSBcImludGVycG9sYXRpb25cIlxuLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTM2NDI5JTI4VlMuODUlMjkuYXNweFxuaWYgKCAhYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdGRpdi5pbm5lckhUTUwgPSBcIjxhIGhyZWY9JyMnPjwvYT5cIjtcblx0cmV0dXJuIGRpdi5maXJzdENoaWxkLmdldEF0dHJpYnV0ZShcImhyZWZcIikgPT09IFwiI1wiIDtcbn0pICkge1xuXHRhZGRIYW5kbGUoIFwidHlwZXxocmVmfGhlaWdodHx3aWR0aFwiLCBmdW5jdGlvbiggZWxlbSwgbmFtZSwgaXNYTUwgKSB7XG5cdFx0aWYgKCAhaXNYTUwgKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoIG5hbWUsIG5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJ0eXBlXCIgPyAxIDogMiApO1xuXHRcdH1cblx0fSk7XG59XG5cbi8vIFN1cHBvcnQ6IElFPDlcbi8vIFVzZSBkZWZhdWx0VmFsdWUgaW4gcGxhY2Ugb2YgZ2V0QXR0cmlidXRlKFwidmFsdWVcIilcbmlmICggIXN1cHBvcnQuYXR0cmlidXRlcyB8fCAhYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdGRpdi5pbm5lckhUTUwgPSBcIjxpbnB1dC8+XCI7XG5cdGRpdi5maXJzdENoaWxkLnNldEF0dHJpYnV0ZSggXCJ2YWx1ZVwiLCBcIlwiICk7XG5cdHJldHVybiBkaXYuZmlyc3RDaGlsZC5nZXRBdHRyaWJ1dGUoIFwidmFsdWVcIiApID09PSBcIlwiO1xufSkgKSB7XG5cdGFkZEhhbmRsZSggXCJ2YWx1ZVwiLCBmdW5jdGlvbiggZWxlbSwgbmFtZSwgaXNYTUwgKSB7XG5cdFx0aWYgKCAhaXNYTUwgJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImlucHV0XCIgKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5kZWZhdWx0VmFsdWU7XG5cdFx0fVxuXHR9KTtcbn1cblxuLy8gU3VwcG9ydDogSUU8OVxuLy8gVXNlIGdldEF0dHJpYnV0ZU5vZGUgdG8gZmV0Y2ggYm9vbGVhbnMgd2hlbiBnZXRBdHRyaWJ1dGUgbGllc1xuaWYgKCAhYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XG5cdHJldHVybiBkaXYuZ2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIikgPT0gbnVsbDtcbn0pICkge1xuXHRhZGRIYW5kbGUoIGJvb2xlYW5zLCBmdW5jdGlvbiggZWxlbSwgbmFtZSwgaXNYTUwgKSB7XG5cdFx0dmFyIHZhbDtcblx0XHRpZiAoICFpc1hNTCApIHtcblx0XHRcdHJldHVybiBlbGVtWyBuYW1lIF0gPT09IHRydWUgPyBuYW1lLnRvTG93ZXJDYXNlKCkgOlxuXHRcdFx0XHRcdCh2YWwgPSBlbGVtLmdldEF0dHJpYnV0ZU5vZGUoIG5hbWUgKSkgJiYgdmFsLnNwZWNpZmllZCA/XG5cdFx0XHRcdFx0dmFsLnZhbHVlIDpcblx0XHRcdFx0bnVsbDtcblx0XHR9XG5cdH0pO1xufVxuXG5yZXR1cm4gU2l6emxlO1xuXG59KSggd2luZG93ICk7XG5cblxuXG5qUXVlcnkuZmluZCA9IFNpenpsZTtcbmpRdWVyeS5leHByID0gU2l6emxlLnNlbGVjdG9ycztcbmpRdWVyeS5leHByW1wiOlwiXSA9IGpRdWVyeS5leHByLnBzZXVkb3M7XG5qUXVlcnkudW5pcXVlID0gU2l6emxlLnVuaXF1ZVNvcnQ7XG5qUXVlcnkudGV4dCA9IFNpenpsZS5nZXRUZXh0O1xualF1ZXJ5LmlzWE1MRG9jID0gU2l6emxlLmlzWE1MO1xualF1ZXJ5LmNvbnRhaW5zID0gU2l6emxlLmNvbnRhaW5zO1xuXG5cblxudmFyIHJuZWVkc0NvbnRleHQgPSBqUXVlcnkuZXhwci5tYXRjaC5uZWVkc0NvbnRleHQ7XG5cbnZhciByc2luZ2xlVGFnID0gKC9ePChcXHcrKVxccypcXC8/Pig/OjxcXC9cXDE+fCkkLyk7XG5cblxuXG52YXIgcmlzU2ltcGxlID0gL14uW146I1xcW1xcLixdKiQvO1xuXG4vLyBJbXBsZW1lbnQgdGhlIGlkZW50aWNhbCBmdW5jdGlvbmFsaXR5IGZvciBmaWx0ZXIgYW5kIG5vdFxuZnVuY3Rpb24gd2lubm93KCBlbGVtZW50cywgcXVhbGlmaWVyLCBub3QgKSB7XG5cdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIHF1YWxpZmllciApICkge1xuXHRcdHJldHVybiBqUXVlcnkuZ3JlcCggZWxlbWVudHMsIGZ1bmN0aW9uKCBlbGVtLCBpICkge1xuXHRcdFx0LyoganNoaW50IC1XMDE4ICovXG5cdFx0XHRyZXR1cm4gISFxdWFsaWZpZXIuY2FsbCggZWxlbSwgaSwgZWxlbSApICE9PSBub3Q7XG5cdFx0fSk7XG5cblx0fVxuXG5cdGlmICggcXVhbGlmaWVyLm5vZGVUeXBlICkge1xuXHRcdHJldHVybiBqUXVlcnkuZ3JlcCggZWxlbWVudHMsIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuICggZWxlbSA9PT0gcXVhbGlmaWVyICkgIT09IG5vdDtcblx0XHR9KTtcblxuXHR9XG5cblx0aWYgKCB0eXBlb2YgcXVhbGlmaWVyID09PSBcInN0cmluZ1wiICkge1xuXHRcdGlmICggcmlzU2ltcGxlLnRlc3QoIHF1YWxpZmllciApICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeS5maWx0ZXIoIHF1YWxpZmllciwgZWxlbWVudHMsIG5vdCApO1xuXHRcdH1cblxuXHRcdHF1YWxpZmllciA9IGpRdWVyeS5maWx0ZXIoIHF1YWxpZmllciwgZWxlbWVudHMgKTtcblx0fVxuXG5cdHJldHVybiBqUXVlcnkuZ3JlcCggZWxlbWVudHMsIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiAoIGpRdWVyeS5pbkFycmF5KCBlbGVtLCBxdWFsaWZpZXIgKSA+PSAwICkgIT09IG5vdDtcblx0fSk7XG59XG5cbmpRdWVyeS5maWx0ZXIgPSBmdW5jdGlvbiggZXhwciwgZWxlbXMsIG5vdCApIHtcblx0dmFyIGVsZW0gPSBlbGVtc1sgMCBdO1xuXG5cdGlmICggbm90ICkge1xuXHRcdGV4cHIgPSBcIjpub3QoXCIgKyBleHByICsgXCIpXCI7XG5cdH1cblxuXHRyZXR1cm4gZWxlbXMubGVuZ3RoID09PSAxICYmIGVsZW0ubm9kZVR5cGUgPT09IDEgP1xuXHRcdGpRdWVyeS5maW5kLm1hdGNoZXNTZWxlY3RvciggZWxlbSwgZXhwciApID8gWyBlbGVtIF0gOiBbXSA6XG5cdFx0alF1ZXJ5LmZpbmQubWF0Y2hlcyggZXhwciwgalF1ZXJ5LmdyZXAoIGVsZW1zLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiBlbGVtLm5vZGVUeXBlID09PSAxO1xuXHRcdH0pKTtcbn07XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRmaW5kOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGksXG5cdFx0XHRyZXQgPSBbXSxcblx0XHRcdHNlbGYgPSB0aGlzLFxuXHRcdFx0bGVuID0gc2VsZi5sZW5ndGg7XG5cblx0XHRpZiAoIHR5cGVvZiBzZWxlY3RvciAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHJldHVybiB0aGlzLnB1c2hTdGFjayggalF1ZXJ5KCBzZWxlY3RvciApLmZpbHRlcihmdW5jdGlvbigpIHtcblx0XHRcdFx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5jb250YWlucyggc2VsZlsgaSBdLCB0aGlzICkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pICk7XG5cdFx0fVxuXG5cdFx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdGpRdWVyeS5maW5kKCBzZWxlY3Rvciwgc2VsZlsgaSBdLCByZXQgKTtcblx0XHR9XG5cblx0XHQvLyBOZWVkZWQgYmVjYXVzZSAkKCBzZWxlY3RvciwgY29udGV4dCApIGJlY29tZXMgJCggY29udGV4dCApLmZpbmQoIHNlbGVjdG9yIClcblx0XHRyZXQgPSB0aGlzLnB1c2hTdGFjayggbGVuID4gMSA/IGpRdWVyeS51bmlxdWUoIHJldCApIDogcmV0ICk7XG5cdFx0cmV0LnNlbGVjdG9yID0gdGhpcy5zZWxlY3RvciA/IHRoaXMuc2VsZWN0b3IgKyBcIiBcIiArIHNlbGVjdG9yIDogc2VsZWN0b3I7XG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblx0ZmlsdGVyOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0cmV0dXJuIHRoaXMucHVzaFN0YWNrKCB3aW5ub3codGhpcywgc2VsZWN0b3IgfHwgW10sIGZhbHNlKSApO1xuXHR9LFxuXHRub3Q6IGZ1bmN0aW9uKCBzZWxlY3RvciApIHtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIHdpbm5vdyh0aGlzLCBzZWxlY3RvciB8fCBbXSwgdHJ1ZSkgKTtcblx0fSxcblx0aXM6IGZ1bmN0aW9uKCBzZWxlY3RvciApIHtcblx0XHRyZXR1cm4gISF3aW5ub3coXG5cdFx0XHR0aGlzLFxuXG5cdFx0XHQvLyBJZiB0aGlzIGlzIGEgcG9zaXRpb25hbC9yZWxhdGl2ZSBzZWxlY3RvciwgY2hlY2sgbWVtYmVyc2hpcCBpbiB0aGUgcmV0dXJuZWQgc2V0XG5cdFx0XHQvLyBzbyAkKFwicDpmaXJzdFwiKS5pcyhcInA6bGFzdFwiKSB3b24ndCByZXR1cm4gdHJ1ZSBmb3IgYSBkb2Mgd2l0aCB0d28gXCJwXCIuXG5cdFx0XHR0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIgJiYgcm5lZWRzQ29udGV4dC50ZXN0KCBzZWxlY3RvciApID9cblx0XHRcdFx0alF1ZXJ5KCBzZWxlY3RvciApIDpcblx0XHRcdFx0c2VsZWN0b3IgfHwgW10sXG5cdFx0XHRmYWxzZVxuXHRcdCkubGVuZ3RoO1xuXHR9XG59KTtcblxuXG4vLyBJbml0aWFsaXplIGEgalF1ZXJ5IG9iamVjdFxuXG5cbi8vIEEgY2VudHJhbCByZWZlcmVuY2UgdG8gdGhlIHJvb3QgalF1ZXJ5KGRvY3VtZW50KVxudmFyIHJvb3RqUXVlcnksXG5cblx0Ly8gVXNlIHRoZSBjb3JyZWN0IGRvY3VtZW50IGFjY29yZGluZ2x5IHdpdGggd2luZG93IGFyZ3VtZW50IChzYW5kYm94KVxuXHRkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCxcblxuXHQvLyBBIHNpbXBsZSB3YXkgdG8gY2hlY2sgZm9yIEhUTUwgc3RyaW5nc1xuXHQvLyBQcmlvcml0aXplICNpZCBvdmVyIDx0YWc+IHRvIGF2b2lkIFhTUyB2aWEgbG9jYXRpb24uaGFzaCAoIzk1MjEpXG5cdC8vIFN0cmljdCBIVE1MIHJlY29nbml0aW9uICgjMTEyOTA6IG11c3Qgc3RhcnQgd2l0aCA8KVxuXHRycXVpY2tFeHByID0gL14oPzpcXHMqKDxbXFx3XFxXXSs+KVtePl0qfCMoW1xcdy1dKikpJC8sXG5cblx0aW5pdCA9IGpRdWVyeS5mbi5pbml0ID0gZnVuY3Rpb24oIHNlbGVjdG9yLCBjb250ZXh0ICkge1xuXHRcdHZhciBtYXRjaCwgZWxlbTtcblxuXHRcdC8vIEhBTkRMRTogJChcIlwiKSwgJChudWxsKSwgJCh1bmRlZmluZWQpLCAkKGZhbHNlKVxuXHRcdGlmICggIXNlbGVjdG9yICkge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0Ly8gSGFuZGxlIEhUTUwgc3RyaW5nc1xuXHRcdGlmICggdHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0aWYgKCBzZWxlY3Rvci5jaGFyQXQoMCkgPT09IFwiPFwiICYmIHNlbGVjdG9yLmNoYXJBdCggc2VsZWN0b3IubGVuZ3RoIC0gMSApID09PSBcIj5cIiAmJiBzZWxlY3Rvci5sZW5ndGggPj0gMyApIHtcblx0XHRcdFx0Ly8gQXNzdW1lIHRoYXQgc3RyaW5ncyB0aGF0IHN0YXJ0IGFuZCBlbmQgd2l0aCA8PiBhcmUgSFRNTCBhbmQgc2tpcCB0aGUgcmVnZXggY2hlY2tcblx0XHRcdFx0bWF0Y2ggPSBbIG51bGwsIHNlbGVjdG9yLCBudWxsIF07XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1hdGNoID0gcnF1aWNrRXhwci5leGVjKCBzZWxlY3RvciApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYXRjaCBodG1sIG9yIG1ha2Ugc3VyZSBubyBjb250ZXh0IGlzIHNwZWNpZmllZCBmb3IgI2lkXG5cdFx0XHRpZiAoIG1hdGNoICYmIChtYXRjaFsxXSB8fCAhY29udGV4dCkgKSB7XG5cblx0XHRcdFx0Ly8gSEFORExFOiAkKGh0bWwpIC0+ICQoYXJyYXkpXG5cdFx0XHRcdGlmICggbWF0Y2hbMV0gKSB7XG5cdFx0XHRcdFx0Y29udGV4dCA9IGNvbnRleHQgaW5zdGFuY2VvZiBqUXVlcnkgPyBjb250ZXh0WzBdIDogY29udGV4dDtcblxuXHRcdFx0XHRcdC8vIHNjcmlwdHMgaXMgdHJ1ZSBmb3IgYmFjay1jb21wYXRcblx0XHRcdFx0XHQvLyBJbnRlbnRpb25hbGx5IGxldCB0aGUgZXJyb3IgYmUgdGhyb3duIGlmIHBhcnNlSFRNTCBpcyBub3QgcHJlc2VudFxuXHRcdFx0XHRcdGpRdWVyeS5tZXJnZSggdGhpcywgalF1ZXJ5LnBhcnNlSFRNTChcblx0XHRcdFx0XHRcdG1hdGNoWzFdLFxuXHRcdFx0XHRcdFx0Y29udGV4dCAmJiBjb250ZXh0Lm5vZGVUeXBlID8gY29udGV4dC5vd25lckRvY3VtZW50IHx8IGNvbnRleHQgOiBkb2N1bWVudCxcblx0XHRcdFx0XHRcdHRydWVcblx0XHRcdFx0XHQpICk7XG5cblx0XHRcdFx0XHQvLyBIQU5ETEU6ICQoaHRtbCwgcHJvcHMpXG5cdFx0XHRcdFx0aWYgKCByc2luZ2xlVGFnLnRlc3QoIG1hdGNoWzFdICkgJiYgalF1ZXJ5LmlzUGxhaW5PYmplY3QoIGNvbnRleHQgKSApIHtcblx0XHRcdFx0XHRcdGZvciAoIG1hdGNoIGluIGNvbnRleHQgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIFByb3BlcnRpZXMgb2YgY29udGV4dCBhcmUgY2FsbGVkIGFzIG1ldGhvZHMgaWYgcG9zc2libGVcblx0XHRcdFx0XHRcdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggdGhpc1sgbWF0Y2ggXSApICkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXNbIG1hdGNoIF0oIGNvbnRleHRbIG1hdGNoIF0gKTtcblxuXHRcdFx0XHRcdFx0XHQvLyAuLi5hbmQgb3RoZXJ3aXNlIHNldCBhcyBhdHRyaWJ1dGVzXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5hdHRyKCBtYXRjaCwgY29udGV4dFsgbWF0Y2ggXSApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHRcdFx0Ly8gSEFORExFOiAkKCNpZClcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIG1hdGNoWzJdICk7XG5cblx0XHRcdFx0XHQvLyBDaGVjayBwYXJlbnROb2RlIHRvIGNhdGNoIHdoZW4gQmxhY2tiZXJyeSA0LjYgcmV0dXJuc1xuXHRcdFx0XHRcdC8vIG5vZGVzIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgZG9jdW1lbnQgIzY5NjNcblx0XHRcdFx0XHRpZiAoIGVsZW0gJiYgZWxlbS5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRcdFx0Ly8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIElFIGFuZCBPcGVyYSByZXR1cm4gaXRlbXNcblx0XHRcdFx0XHRcdC8vIGJ5IG5hbWUgaW5zdGVhZCBvZiBJRFxuXHRcdFx0XHRcdFx0aWYgKCBlbGVtLmlkICE9PSBtYXRjaFsyXSApIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHJvb3RqUXVlcnkuZmluZCggc2VsZWN0b3IgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCB3ZSBpbmplY3QgdGhlIGVsZW1lbnQgZGlyZWN0bHkgaW50byB0aGUgalF1ZXJ5IG9iamVjdFxuXHRcdFx0XHRcdFx0dGhpcy5sZW5ndGggPSAxO1xuXHRcdFx0XHRcdFx0dGhpc1swXSA9IGVsZW07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhpcy5jb250ZXh0ID0gZG9jdW1lbnQ7XG5cdFx0XHRcdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9XG5cblx0XHRcdC8vIEhBTkRMRTogJChleHByLCAkKC4uLikpXG5cdFx0XHR9IGVsc2UgaWYgKCAhY29udGV4dCB8fCBjb250ZXh0LmpxdWVyeSApIHtcblx0XHRcdFx0cmV0dXJuICggY29udGV4dCB8fCByb290alF1ZXJ5ICkuZmluZCggc2VsZWN0b3IgKTtcblxuXHRcdFx0Ly8gSEFORExFOiAkKGV4cHIsIGNvbnRleHQpXG5cdFx0XHQvLyAod2hpY2ggaXMganVzdCBlcXVpdmFsZW50IHRvOiAkKGNvbnRleHQpLmZpbmQoZXhwcilcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9yKCBjb250ZXh0ICkuZmluZCggc2VsZWN0b3IgKTtcblx0XHRcdH1cblxuXHRcdC8vIEhBTkRMRTogJChET01FbGVtZW50KVxuXHRcdH0gZWxzZSBpZiAoIHNlbGVjdG9yLm5vZGVUeXBlICkge1xuXHRcdFx0dGhpcy5jb250ZXh0ID0gdGhpc1swXSA9IHNlbGVjdG9yO1xuXHRcdFx0dGhpcy5sZW5ndGggPSAxO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHQvLyBIQU5ETEU6ICQoZnVuY3Rpb24pXG5cdFx0Ly8gU2hvcnRjdXQgZm9yIGRvY3VtZW50IHJlYWR5XG5cdFx0fSBlbHNlIGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIHNlbGVjdG9yICkgKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIHJvb3RqUXVlcnkucmVhZHkgIT09IFwidW5kZWZpbmVkXCIgP1xuXHRcdFx0XHRyb290alF1ZXJ5LnJlYWR5KCBzZWxlY3RvciApIDpcblx0XHRcdFx0Ly8gRXhlY3V0ZSBpbW1lZGlhdGVseSBpZiByZWFkeSBpcyBub3QgcHJlc2VudFxuXHRcdFx0XHRzZWxlY3RvciggalF1ZXJ5ICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBzZWxlY3Rvci5zZWxlY3RvciAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0dGhpcy5zZWxlY3RvciA9IHNlbGVjdG9yLnNlbGVjdG9yO1xuXHRcdFx0dGhpcy5jb250ZXh0ID0gc2VsZWN0b3IuY29udGV4dDtcblx0XHR9XG5cblx0XHRyZXR1cm4galF1ZXJ5Lm1ha2VBcnJheSggc2VsZWN0b3IsIHRoaXMgKTtcblx0fTtcblxuLy8gR2l2ZSB0aGUgaW5pdCBmdW5jdGlvbiB0aGUgalF1ZXJ5IHByb3RvdHlwZSBmb3IgbGF0ZXIgaW5zdGFudGlhdGlvblxuaW5pdC5wcm90b3R5cGUgPSBqUXVlcnkuZm47XG5cbi8vIEluaXRpYWxpemUgY2VudHJhbCByZWZlcmVuY2VcbnJvb3RqUXVlcnkgPSBqUXVlcnkoIGRvY3VtZW50ICk7XG5cblxudmFyIHJwYXJlbnRzcHJldiA9IC9eKD86cGFyZW50c3xwcmV2KD86VW50aWx8QWxsKSkvLFxuXHQvLyBtZXRob2RzIGd1YXJhbnRlZWQgdG8gcHJvZHVjZSBhIHVuaXF1ZSBzZXQgd2hlbiBzdGFydGluZyBmcm9tIGEgdW5pcXVlIHNldFxuXHRndWFyYW50ZWVkVW5pcXVlID0ge1xuXHRcdGNoaWxkcmVuOiB0cnVlLFxuXHRcdGNvbnRlbnRzOiB0cnVlLFxuXHRcdG5leHQ6IHRydWUsXG5cdFx0cHJldjogdHJ1ZVxuXHR9O1xuXG5qUXVlcnkuZXh0ZW5kKHtcblx0ZGlyOiBmdW5jdGlvbiggZWxlbSwgZGlyLCB1bnRpbCApIHtcblx0XHR2YXIgbWF0Y2hlZCA9IFtdLFxuXHRcdFx0Y3VyID0gZWxlbVsgZGlyIF07XG5cblx0XHR3aGlsZSAoIGN1ciAmJiBjdXIubm9kZVR5cGUgIT09IDkgJiYgKHVudGlsID09PSB1bmRlZmluZWQgfHwgY3VyLm5vZGVUeXBlICE9PSAxIHx8ICFqUXVlcnkoIGN1ciApLmlzKCB1bnRpbCApKSApIHtcblx0XHRcdGlmICggY3VyLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRtYXRjaGVkLnB1c2goIGN1ciApO1xuXHRcdFx0fVxuXHRcdFx0Y3VyID0gY3VyW2Rpcl07XG5cdFx0fVxuXHRcdHJldHVybiBtYXRjaGVkO1xuXHR9LFxuXG5cdHNpYmxpbmc6IGZ1bmN0aW9uKCBuLCBlbGVtICkge1xuXHRcdHZhciByID0gW107XG5cblx0XHRmb3IgKCA7IG47IG4gPSBuLm5leHRTaWJsaW5nICkge1xuXHRcdFx0aWYgKCBuLm5vZGVUeXBlID09PSAxICYmIG4gIT09IGVsZW0gKSB7XG5cdFx0XHRcdHIucHVzaCggbiApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByO1xuXHR9XG59KTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdGhhczogZnVuY3Rpb24oIHRhcmdldCApIHtcblx0XHR2YXIgaSxcblx0XHRcdHRhcmdldHMgPSBqUXVlcnkoIHRhcmdldCwgdGhpcyApLFxuXHRcdFx0bGVuID0gdGFyZ2V0cy5sZW5ndGg7XG5cblx0XHRyZXR1cm4gdGhpcy5maWx0ZXIoZnVuY3Rpb24oKSB7XG5cdFx0XHRmb3IgKCBpID0gMDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRpZiAoIGpRdWVyeS5jb250YWlucyggdGhpcywgdGFyZ2V0c1tpXSApICkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0Y2xvc2VzdDogZnVuY3Rpb24oIHNlbGVjdG9ycywgY29udGV4dCApIHtcblx0XHR2YXIgY3VyLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsID0gdGhpcy5sZW5ndGgsXG5cdFx0XHRtYXRjaGVkID0gW10sXG5cdFx0XHRwb3MgPSBybmVlZHNDb250ZXh0LnRlc3QoIHNlbGVjdG9ycyApIHx8IHR5cGVvZiBzZWxlY3RvcnMgIT09IFwic3RyaW5nXCIgP1xuXHRcdFx0XHRqUXVlcnkoIHNlbGVjdG9ycywgY29udGV4dCB8fCB0aGlzLmNvbnRleHQgKSA6XG5cdFx0XHRcdDA7XG5cblx0XHRmb3IgKCA7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRmb3IgKCBjdXIgPSB0aGlzW2ldOyBjdXIgJiYgY3VyICE9PSBjb250ZXh0OyBjdXIgPSBjdXIucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0Ly8gQWx3YXlzIHNraXAgZG9jdW1lbnQgZnJhZ21lbnRzXG5cdFx0XHRcdGlmICggY3VyLm5vZGVUeXBlIDwgMTEgJiYgKHBvcyA/XG5cdFx0XHRcdFx0cG9zLmluZGV4KGN1cikgPiAtMSA6XG5cblx0XHRcdFx0XHQvLyBEb24ndCBwYXNzIG5vbi1lbGVtZW50cyB0byBTaXp6bGVcblx0XHRcdFx0XHRjdXIubm9kZVR5cGUgPT09IDEgJiZcblx0XHRcdFx0XHRcdGpRdWVyeS5maW5kLm1hdGNoZXNTZWxlY3RvcihjdXIsIHNlbGVjdG9ycykpICkge1xuXG5cdFx0XHRcdFx0bWF0Y2hlZC5wdXNoKCBjdXIgKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnB1c2hTdGFjayggbWF0Y2hlZC5sZW5ndGggPiAxID8galF1ZXJ5LnVuaXF1ZSggbWF0Y2hlZCApIDogbWF0Y2hlZCApO1xuXHR9LFxuXG5cdC8vIERldGVybWluZSB0aGUgcG9zaXRpb24gb2YgYW4gZWxlbWVudCB3aXRoaW5cblx0Ly8gdGhlIG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzXG5cdGluZGV4OiBmdW5jdGlvbiggZWxlbSApIHtcblxuXHRcdC8vIE5vIGFyZ3VtZW50LCByZXR1cm4gaW5kZXggaW4gcGFyZW50XG5cdFx0aWYgKCAhZWxlbSApIHtcblx0XHRcdHJldHVybiAoIHRoaXNbMF0gJiYgdGhpc1swXS5wYXJlbnROb2RlICkgPyB0aGlzLmZpcnN0KCkucHJldkFsbCgpLmxlbmd0aCA6IC0xO1xuXHRcdH1cblxuXHRcdC8vIGluZGV4IGluIHNlbGVjdG9yXG5cdFx0aWYgKCB0eXBlb2YgZWxlbSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHJldHVybiBqUXVlcnkuaW5BcnJheSggdGhpc1swXSwgalF1ZXJ5KCBlbGVtICkgKTtcblx0XHR9XG5cblx0XHQvLyBMb2NhdGUgdGhlIHBvc2l0aW9uIG9mIHRoZSBkZXNpcmVkIGVsZW1lbnRcblx0XHRyZXR1cm4galF1ZXJ5LmluQXJyYXkoXG5cdFx0XHQvLyBJZiBpdCByZWNlaXZlcyBhIGpRdWVyeSBvYmplY3QsIHRoZSBmaXJzdCBlbGVtZW50IGlzIHVzZWRcblx0XHRcdGVsZW0uanF1ZXJ5ID8gZWxlbVswXSA6IGVsZW0sIHRoaXMgKTtcblx0fSxcblxuXHRhZGQ6IGZ1bmN0aW9uKCBzZWxlY3RvciwgY29udGV4dCApIHtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soXG5cdFx0XHRqUXVlcnkudW5pcXVlKFxuXHRcdFx0XHRqUXVlcnkubWVyZ2UoIHRoaXMuZ2V0KCksIGpRdWVyeSggc2VsZWN0b3IsIGNvbnRleHQgKSApXG5cdFx0XHQpXG5cdFx0KTtcblx0fSxcblxuXHRhZGRCYWNrOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0cmV0dXJuIHRoaXMuYWRkKCBzZWxlY3RvciA9PSBudWxsID9cblx0XHRcdHRoaXMucHJldk9iamVjdCA6IHRoaXMucHJldk9iamVjdC5maWx0ZXIoc2VsZWN0b3IpXG5cdFx0KTtcblx0fVxufSk7XG5cbmZ1bmN0aW9uIHNpYmxpbmcoIGN1ciwgZGlyICkge1xuXHRkbyB7XG5cdFx0Y3VyID0gY3VyWyBkaXIgXTtcblx0fSB3aGlsZSAoIGN1ciAmJiBjdXIubm9kZVR5cGUgIT09IDEgKTtcblxuXHRyZXR1cm4gY3VyO1xufVxuXG5qUXVlcnkuZWFjaCh7XG5cdHBhcmVudDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0dmFyIHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcblx0XHRyZXR1cm4gcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSAhPT0gMTEgPyBwYXJlbnQgOiBudWxsO1xuXHR9LFxuXHRwYXJlbnRzOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LmRpciggZWxlbSwgXCJwYXJlbnROb2RlXCIgKTtcblx0fSxcblx0cGFyZW50c1VudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicGFyZW50Tm9kZVwiLCB1bnRpbCApO1xuXHR9LFxuXHRuZXh0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4gc2libGluZyggZWxlbSwgXCJuZXh0U2libGluZ1wiICk7XG5cdH0sXG5cdHByZXY6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBzaWJsaW5nKCBlbGVtLCBcInByZXZpb3VzU2libGluZ1wiICk7XG5cdH0sXG5cdG5leHRBbGw6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkuZGlyKCBlbGVtLCBcIm5leHRTaWJsaW5nXCIgKTtcblx0fSxcblx0cHJldkFsbDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicHJldmlvdXNTaWJsaW5nXCIgKTtcblx0fSxcblx0bmV4dFVudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwibmV4dFNpYmxpbmdcIiwgdW50aWwgKTtcblx0fSxcblx0cHJldlVudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicHJldmlvdXNTaWJsaW5nXCIsIHVudGlsICk7XG5cdH0sXG5cdHNpYmxpbmdzOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LnNpYmxpbmcoICggZWxlbS5wYXJlbnROb2RlIHx8IHt9ICkuZmlyc3RDaGlsZCwgZWxlbSApO1xuXHR9LFxuXHRjaGlsZHJlbjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5zaWJsaW5nKCBlbGVtLmZpcnN0Q2hpbGQgKTtcblx0fSxcblx0Y29udGVudHM6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkubm9kZU5hbWUoIGVsZW0sIFwiaWZyYW1lXCIgKSA/XG5cdFx0XHRlbGVtLmNvbnRlbnREb2N1bWVudCB8fCBlbGVtLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQgOlxuXHRcdFx0alF1ZXJ5Lm1lcmdlKCBbXSwgZWxlbS5jaGlsZE5vZGVzICk7XG5cdH1cbn0sIGZ1bmN0aW9uKCBuYW1lLCBmbiApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggdW50aWwsIHNlbGVjdG9yICkge1xuXHRcdHZhciByZXQgPSBqUXVlcnkubWFwKCB0aGlzLCBmbiwgdW50aWwgKTtcblxuXHRcdGlmICggbmFtZS5zbGljZSggLTUgKSAhPT0gXCJVbnRpbFwiICkge1xuXHRcdFx0c2VsZWN0b3IgPSB1bnRpbDtcblx0XHR9XG5cblx0XHRpZiAoIHNlbGVjdG9yICYmIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHJldCA9IGpRdWVyeS5maWx0ZXIoIHNlbGVjdG9yLCByZXQgKTtcblx0XHR9XG5cblx0XHRpZiAoIHRoaXMubGVuZ3RoID4gMSApIHtcblx0XHRcdC8vIFJlbW92ZSBkdXBsaWNhdGVzXG5cdFx0XHRpZiAoICFndWFyYW50ZWVkVW5pcXVlWyBuYW1lIF0gKSB7XG5cdFx0XHRcdHJldCA9IGpRdWVyeS51bmlxdWUoIHJldCApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZXZlcnNlIG9yZGVyIGZvciBwYXJlbnRzKiBhbmQgcHJldi1kZXJpdmF0aXZlc1xuXHRcdFx0aWYgKCBycGFyZW50c3ByZXYudGVzdCggbmFtZSApICkge1xuXHRcdFx0XHRyZXQgPSByZXQucmV2ZXJzZSgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLnB1c2hTdGFjayggcmV0ICk7XG5cdH07XG59KTtcbnZhciBybm90d2hpdGUgPSAoL1xcUysvZyk7XG5cblxuXG4vLyBTdHJpbmcgdG8gT2JqZWN0IG9wdGlvbnMgZm9ybWF0IGNhY2hlXG52YXIgb3B0aW9uc0NhY2hlID0ge307XG5cbi8vIENvbnZlcnQgU3RyaW5nLWZvcm1hdHRlZCBvcHRpb25zIGludG8gT2JqZWN0LWZvcm1hdHRlZCBvbmVzIGFuZCBzdG9yZSBpbiBjYWNoZVxuZnVuY3Rpb24gY3JlYXRlT3B0aW9ucyggb3B0aW9ucyApIHtcblx0dmFyIG9iamVjdCA9IG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdID0ge307XG5cdGpRdWVyeS5lYWNoKCBvcHRpb25zLm1hdGNoKCBybm90d2hpdGUgKSB8fCBbXSwgZnVuY3Rpb24oIF8sIGZsYWcgKSB7XG5cdFx0b2JqZWN0WyBmbGFnIF0gPSB0cnVlO1xuXHR9KTtcblx0cmV0dXJuIG9iamVjdDtcbn1cblxuLypcbiAqIENyZWF0ZSBhIGNhbGxiYWNrIGxpc3QgdXNpbmcgdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICpcbiAqXHRvcHRpb25zOiBhbiBvcHRpb25hbCBsaXN0IG9mIHNwYWNlLXNlcGFyYXRlZCBvcHRpb25zIHRoYXQgd2lsbCBjaGFuZ2UgaG93XG4gKlx0XHRcdHRoZSBjYWxsYmFjayBsaXN0IGJlaGF2ZXMgb3IgYSBtb3JlIHRyYWRpdGlvbmFsIG9wdGlvbiBvYmplY3RcbiAqXG4gKiBCeSBkZWZhdWx0IGEgY2FsbGJhY2sgbGlzdCB3aWxsIGFjdCBsaWtlIGFuIGV2ZW50IGNhbGxiYWNrIGxpc3QgYW5kIGNhbiBiZVxuICogXCJmaXJlZFwiIG11bHRpcGxlIHRpbWVzLlxuICpcbiAqIFBvc3NpYmxlIG9wdGlvbnM6XG4gKlxuICpcdG9uY2U6XHRcdFx0d2lsbCBlbnN1cmUgdGhlIGNhbGxiYWNrIGxpc3QgY2FuIG9ubHkgYmUgZmlyZWQgb25jZSAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHRtZW1vcnk6XHRcdFx0d2lsbCBrZWVwIHRyYWNrIG9mIHByZXZpb3VzIHZhbHVlcyBhbmQgd2lsbCBjYWxsIGFueSBjYWxsYmFjayBhZGRlZFxuICpcdFx0XHRcdFx0YWZ0ZXIgdGhlIGxpc3QgaGFzIGJlZW4gZmlyZWQgcmlnaHQgYXdheSB3aXRoIHRoZSBsYXRlc3QgXCJtZW1vcml6ZWRcIlxuICpcdFx0XHRcdFx0dmFsdWVzIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdHVuaXF1ZTpcdFx0XHR3aWxsIGVuc3VyZSBhIGNhbGxiYWNrIGNhbiBvbmx5IGJlIGFkZGVkIG9uY2UgKG5vIGR1cGxpY2F0ZSBpbiB0aGUgbGlzdClcbiAqXG4gKlx0c3RvcE9uRmFsc2U6XHRpbnRlcnJ1cHQgY2FsbGluZ3Mgd2hlbiBhIGNhbGxiYWNrIHJldHVybnMgZmFsc2VcbiAqXG4gKi9cbmpRdWVyeS5DYWxsYmFja3MgPSBmdW5jdGlvbiggb3B0aW9ucyApIHtcblxuXHQvLyBDb252ZXJ0IG9wdGlvbnMgZnJvbSBTdHJpbmctZm9ybWF0dGVkIHRvIE9iamVjdC1mb3JtYXR0ZWQgaWYgbmVlZGVkXG5cdC8vICh3ZSBjaGVjayBpbiBjYWNoZSBmaXJzdClcblx0b3B0aW9ucyA9IHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiID9cblx0XHQoIG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdIHx8IGNyZWF0ZU9wdGlvbnMoIG9wdGlvbnMgKSApIDpcblx0XHRqUXVlcnkuZXh0ZW5kKCB7fSwgb3B0aW9ucyApO1xuXG5cdHZhciAvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCBpcyBjdXJyZW50bHkgZmlyaW5nXG5cdFx0ZmlyaW5nLFxuXHRcdC8vIExhc3QgZmlyZSB2YWx1ZSAoZm9yIG5vbi1mb3JnZXR0YWJsZSBsaXN0cylcblx0XHRtZW1vcnksXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3Qgd2FzIGFscmVhZHkgZmlyZWRcblx0XHRmaXJlZCxcblx0XHQvLyBFbmQgb2YgdGhlIGxvb3Agd2hlbiBmaXJpbmdcblx0XHRmaXJpbmdMZW5ndGgsXG5cdFx0Ly8gSW5kZXggb2YgY3VycmVudGx5IGZpcmluZyBjYWxsYmFjayAobW9kaWZpZWQgYnkgcmVtb3ZlIGlmIG5lZWRlZClcblx0XHRmaXJpbmdJbmRleCxcblx0XHQvLyBGaXJzdCBjYWxsYmFjayB0byBmaXJlICh1c2VkIGludGVybmFsbHkgYnkgYWRkIGFuZCBmaXJlV2l0aClcblx0XHRmaXJpbmdTdGFydCxcblx0XHQvLyBBY3R1YWwgY2FsbGJhY2sgbGlzdFxuXHRcdGxpc3QgPSBbXSxcblx0XHQvLyBTdGFjayBvZiBmaXJlIGNhbGxzIGZvciByZXBlYXRhYmxlIGxpc3RzXG5cdFx0c3RhY2sgPSAhb3B0aW9ucy5vbmNlICYmIFtdLFxuXHRcdC8vIEZpcmUgY2FsbGJhY2tzXG5cdFx0ZmlyZSA9IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0bWVtb3J5ID0gb3B0aW9ucy5tZW1vcnkgJiYgZGF0YTtcblx0XHRcdGZpcmVkID0gdHJ1ZTtcblx0XHRcdGZpcmluZ0luZGV4ID0gZmlyaW5nU3RhcnQgfHwgMDtcblx0XHRcdGZpcmluZ1N0YXJ0ID0gMDtcblx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0ZmlyaW5nID0gdHJ1ZTtcblx0XHRcdGZvciAoIDsgbGlzdCAmJiBmaXJpbmdJbmRleCA8IGZpcmluZ0xlbmd0aDsgZmlyaW5nSW5kZXgrKyApIHtcblx0XHRcdFx0aWYgKCBsaXN0WyBmaXJpbmdJbmRleCBdLmFwcGx5KCBkYXRhWyAwIF0sIGRhdGFbIDEgXSApID09PSBmYWxzZSAmJiBvcHRpb25zLnN0b3BPbkZhbHNlICkge1xuXHRcdFx0XHRcdG1lbW9yeSA9IGZhbHNlOyAvLyBUbyBwcmV2ZW50IGZ1cnRoZXIgY2FsbHMgdXNpbmcgYWRkXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGZpcmluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrICkge1xuXHRcdFx0XHRcdGlmICggc3RhY2subGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZmlyZSggc3RhY2suc2hpZnQoKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Ly8gQWN0dWFsIENhbGxiYWNrcyBvYmplY3Rcblx0XHRzZWxmID0ge1xuXHRcdFx0Ly8gQWRkIGEgY2FsbGJhY2sgb3IgYSBjb2xsZWN0aW9uIG9mIGNhbGxiYWNrcyB0byB0aGUgbGlzdFxuXHRcdFx0YWRkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdC8vIEZpcnN0LCB3ZSBzYXZlIHRoZSBjdXJyZW50IGxlbmd0aFxuXHRcdFx0XHRcdHZhciBzdGFydCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdChmdW5jdGlvbiBhZGQoIGFyZ3MgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJncywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBqUXVlcnkudHlwZSggYXJnICk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggIW9wdGlvbnMudW5pcXVlIHx8ICFzZWxmLmhhcyggYXJnICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRsaXN0LnB1c2goIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggYXJnICYmIGFyZy5sZW5ndGggJiYgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbnNwZWN0IHJlY3Vyc2l2ZWx5XG5cdFx0XHRcdFx0XHRcdFx0YWRkKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSkoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdC8vIERvIHdlIG5lZWQgdG8gYWRkIHRoZSBjYWxsYmFja3MgdG8gdGhlXG5cdFx0XHRcdFx0Ly8gY3VycmVudCBmaXJpbmcgYmF0Y2g/XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQvLyBXaXRoIG1lbW9yeSwgaWYgd2UncmUgbm90IGZpcmluZyB0aGVuXG5cdFx0XHRcdFx0Ly8gd2Ugc2hvdWxkIGNhbGwgcmlnaHQgYXdheVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRcdGZpcmluZ1N0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRcdFx0XHRmaXJlKCBtZW1vcnkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGEgY2FsbGJhY2sgZnJvbSB0aGUgbGlzdFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmd1bWVudHMsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaW5kZXg7XG5cdFx0XHRcdFx0XHR3aGlsZSAoICggaW5kZXggPSBqUXVlcnkuaW5BcnJheSggYXJnLCBsaXN0LCBpbmRleCApICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0bGlzdC5zcGxpY2UoIGluZGV4LCAxICk7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBmaXJpbmcgaW5kZXhlc1xuXHRcdFx0XHRcdFx0XHRpZiAoIGZpcmluZyApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0xlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGZpcmluZ0xlbmd0aC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoIGluZGV4IDw9IGZpcmluZ0luZGV4ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nSW5kZXgtLTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBDaGVjayBpZiBhIGdpdmVuIGNhbGxiYWNrIGlzIGluIHRoZSBsaXN0LlxuXHRcdFx0Ly8gSWYgbm8gYXJndW1lbnQgaXMgZ2l2ZW4sIHJldHVybiB3aGV0aGVyIG9yIG5vdCBsaXN0IGhhcyBjYWxsYmFja3MgYXR0YWNoZWQuXG5cdFx0XHRoYXM6IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdFx0cmV0dXJuIGZuID8galF1ZXJ5LmluQXJyYXkoIGZuLCBsaXN0ICkgPiAtMSA6ICEhKCBsaXN0ICYmIGxpc3QubGVuZ3RoICk7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBjYWxsYmFja3MgZnJvbSB0aGUgbGlzdFxuXHRcdFx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdGZpcmluZ0xlbmd0aCA9IDA7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIEhhdmUgdGhlIGxpc3QgZG8gbm90aGluZyBhbnltb3JlXG5cdFx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IHN0YWNrID0gbWVtb3J5ID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBkaXNhYmxlZD9cblx0XHRcdGRpc2FibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICFsaXN0O1xuXHRcdFx0fSxcblx0XHRcdC8vIExvY2sgdGhlIGxpc3QgaW4gaXRzIGN1cnJlbnQgc3RhdGVcblx0XHRcdGxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdGFjayA9IHVuZGVmaW5lZDtcblx0XHRcdFx0aWYgKCAhbWVtb3J5ICkge1xuXHRcdFx0XHRcdHNlbGYuZGlzYWJsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIElzIGl0IGxvY2tlZD9cblx0XHRcdGxvY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhc3RhY2s7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gQ2FsbCBhbGwgY2FsbGJhY2tzIHdpdGggdGhlIGdpdmVuIGNvbnRleHQgYW5kIGFyZ3VtZW50c1xuXHRcdFx0ZmlyZVdpdGg6IGZ1bmN0aW9uKCBjb250ZXh0LCBhcmdzICkge1xuXHRcdFx0XHRpZiAoIGxpc3QgJiYgKCAhZmlyZWQgfHwgc3RhY2sgKSApIHtcblx0XHRcdFx0XHRhcmdzID0gYXJncyB8fCBbXTtcblx0XHRcdFx0XHRhcmdzID0gWyBjb250ZXh0LCBhcmdzLnNsaWNlID8gYXJncy5zbGljZSgpIDogYXJncyBdO1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0c3RhY2sucHVzaCggYXJncyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBhcmdzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIHRoZSBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gYXJndW1lbnRzXG5cdFx0XHRmaXJlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5maXJlV2l0aCggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFRvIGtub3cgaWYgdGhlIGNhbGxiYWNrcyBoYXZlIGFscmVhZHkgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZVxuXHRcdFx0ZmlyZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gISFmaXJlZDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdHJldHVybiBzZWxmO1xufTtcblxuXG5qUXVlcnkuZXh0ZW5kKHtcblxuXHREZWZlcnJlZDogZnVuY3Rpb24oIGZ1bmMgKSB7XG5cdFx0dmFyIHR1cGxlcyA9IFtcblx0XHRcdFx0Ly8gYWN0aW9uLCBhZGQgbGlzdGVuZXIsIGxpc3RlbmVyIGxpc3QsIGZpbmFsIHN0YXRlXG5cdFx0XHRcdFsgXCJyZXNvbHZlXCIsIFwiZG9uZVwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVzb2x2ZWRcIiBdLFxuXHRcdFx0XHRbIFwicmVqZWN0XCIsIFwiZmFpbFwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVqZWN0ZWRcIiBdLFxuXHRcdFx0XHRbIFwibm90aWZ5XCIsIFwicHJvZ3Jlc3NcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm1lbW9yeVwiKSBdXG5cdFx0XHRdLFxuXHRcdFx0c3RhdGUgPSBcInBlbmRpbmdcIixcblx0XHRcdHByb21pc2UgPSB7XG5cdFx0XHRcdHN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsd2F5czogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZSggYXJndW1lbnRzICkuZmFpbCggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRoZW46IGZ1bmN0aW9uKCAvKiBmbkRvbmUsIGZuRmFpbCwgZm5Qcm9ncmVzcyAqLyApIHtcblx0XHRcdFx0XHR2YXIgZm5zID0gYXJndW1lbnRzO1xuXHRcdFx0XHRcdHJldHVybiBqUXVlcnkuRGVmZXJyZWQoZnVuY3Rpb24oIG5ld0RlZmVyICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgZm4gPSBqUXVlcnkuaXNGdW5jdGlvbiggZm5zWyBpIF0gKSAmJiBmbnNbIGkgXTtcblx0XHRcdFx0XHRcdFx0Ly8gZGVmZXJyZWRbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSBmb3IgZm9yd2FyZGluZyBhY3Rpb25zIHRvIG5ld0RlZmVyXG5cdFx0XHRcdFx0XHRcdGRlZmVycmVkWyB0dXBsZVsxXSBdKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciByZXR1cm5lZCA9IGZuICYmIGZuLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIHJldHVybmVkICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXR1cm5lZC5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0LmRvbmUoIG5ld0RlZmVyLnJlc29sdmUgKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQuZmFpbCggbmV3RGVmZXIucmVqZWN0IClcblx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIHR1cGxlWyAwIF0gKyBcIldpdGhcIiBdKCB0aGlzID09PSBwcm9taXNlID8gbmV3RGVmZXIucHJvbWlzZSgpIDogdGhpcywgZm4gPyBbIHJldHVybmVkIF0gOiBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRmbnMgPSBudWxsO1xuXHRcdFx0XHRcdH0pLnByb21pc2UoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gR2V0IGEgcHJvbWlzZSBmb3IgdGhpcyBkZWZlcnJlZFxuXHRcdFx0XHQvLyBJZiBvYmogaXMgcHJvdmlkZWQsIHRoZSBwcm9taXNlIGFzcGVjdCBpcyBhZGRlZCB0byB0aGUgb2JqZWN0XG5cdFx0XHRcdHByb21pc2U6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9iaiAhPSBudWxsID8galF1ZXJ5LmV4dGVuZCggb2JqLCBwcm9taXNlICkgOiBwcm9taXNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZGVmZXJyZWQgPSB7fTtcblxuXHRcdC8vIEtlZXAgcGlwZSBmb3IgYmFjay1jb21wYXRcblx0XHRwcm9taXNlLnBpcGUgPSBwcm9taXNlLnRoZW47XG5cblx0XHQvLyBBZGQgbGlzdC1zcGVjaWZpYyBtZXRob2RzXG5cdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0dmFyIGxpc3QgPSB0dXBsZVsgMiBdLFxuXHRcdFx0XHRzdGF0ZVN0cmluZyA9IHR1cGxlWyAzIF07XG5cblx0XHRcdC8vIHByb21pc2VbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSA9IGxpc3QuYWRkXG5cdFx0XHRwcm9taXNlWyB0dXBsZVsxXSBdID0gbGlzdC5hZGQ7XG5cblx0XHRcdC8vIEhhbmRsZSBzdGF0ZVxuXHRcdFx0aWYgKCBzdGF0ZVN0cmluZyApIHtcblx0XHRcdFx0bGlzdC5hZGQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gc3RhdGUgPSBbIHJlc29sdmVkIHwgcmVqZWN0ZWQgXVxuXHRcdFx0XHRcdHN0YXRlID0gc3RhdGVTdHJpbmc7XG5cblx0XHRcdFx0Ly8gWyByZWplY3RfbGlzdCB8IHJlc29sdmVfbGlzdCBdLmRpc2FibGU7IHByb2dyZXNzX2xpc3QubG9ja1xuXHRcdFx0XHR9LCB0dXBsZXNbIGkgXiAxIF1bIDIgXS5kaXNhYmxlLCB0dXBsZXNbIDIgXVsgMiBdLmxvY2sgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZGVmZXJyZWRbIHJlc29sdmUgfCByZWplY3QgfCBub3RpZnkgXVxuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdIF0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdICsgXCJXaXRoXCIgXSggdGhpcyA9PT0gZGVmZXJyZWQgPyBwcm9taXNlIDogdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fTtcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSArIFwiV2l0aFwiIF0gPSBsaXN0LmZpcmVXaXRoO1xuXHRcdH0pO1xuXG5cdFx0Ly8gTWFrZSB0aGUgZGVmZXJyZWQgYSBwcm9taXNlXG5cdFx0cHJvbWlzZS5wcm9taXNlKCBkZWZlcnJlZCApO1xuXG5cdFx0Ly8gQ2FsbCBnaXZlbiBmdW5jIGlmIGFueVxuXHRcdGlmICggZnVuYyApIHtcblx0XHRcdGZ1bmMuY2FsbCggZGVmZXJyZWQsIGRlZmVycmVkICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGRvbmUhXG5cdFx0cmV0dXJuIGRlZmVycmVkO1xuXHR9LFxuXG5cdC8vIERlZmVycmVkIGhlbHBlclxuXHR3aGVuOiBmdW5jdGlvbiggc3Vib3JkaW5hdGUgLyogLCAuLi4sIHN1Ym9yZGluYXRlTiAqLyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXNvbHZlVmFsdWVzID0gc2xpY2UuY2FsbCggYXJndW1lbnRzICksXG5cdFx0XHRsZW5ndGggPSByZXNvbHZlVmFsdWVzLmxlbmd0aCxcblxuXHRcdFx0Ly8gdGhlIGNvdW50IG9mIHVuY29tcGxldGVkIHN1Ym9yZGluYXRlc1xuXHRcdFx0cmVtYWluaW5nID0gbGVuZ3RoICE9PSAxIHx8ICggc3Vib3JkaW5hdGUgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHN1Ym9yZGluYXRlLnByb21pc2UgKSApID8gbGVuZ3RoIDogMCxcblxuXHRcdFx0Ly8gdGhlIG1hc3RlciBEZWZlcnJlZC4gSWYgcmVzb2x2ZVZhbHVlcyBjb25zaXN0IG9mIG9ubHkgYSBzaW5nbGUgRGVmZXJyZWQsIGp1c3QgdXNlIHRoYXQuXG5cdFx0XHRkZWZlcnJlZCA9IHJlbWFpbmluZyA9PT0gMSA/IHN1Ym9yZGluYXRlIDogalF1ZXJ5LkRlZmVycmVkKCksXG5cblx0XHRcdC8vIFVwZGF0ZSBmdW5jdGlvbiBmb3IgYm90aCByZXNvbHZlIGFuZCBwcm9ncmVzcyB2YWx1ZXNcblx0XHRcdHVwZGF0ZUZ1bmMgPSBmdW5jdGlvbiggaSwgY29udGV4dHMsIHZhbHVlcyApIHtcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRcdFx0XHRjb250ZXh0c1sgaSBdID0gdGhpcztcblx0XHRcdFx0XHR2YWx1ZXNbIGkgXSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gc2xpY2UuY2FsbCggYXJndW1lbnRzICkgOiB2YWx1ZTtcblx0XHRcdFx0XHRpZiAoIHZhbHVlcyA9PT0gcHJvZ3Jlc3NWYWx1ZXMgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAhKC0tcmVtYWluaW5nKSApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjb250ZXh0cywgdmFsdWVzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMsIHByb2dyZXNzQ29udGV4dHMsIHJlc29sdmVDb250ZXh0cztcblxuXHRcdC8vIGFkZCBsaXN0ZW5lcnMgdG8gRGVmZXJyZWQgc3Vib3JkaW5hdGVzOyB0cmVhdCBvdGhlcnMgYXMgcmVzb2x2ZWRcblx0XHRpZiAoIGxlbmd0aCA+IDEgKSB7XG5cdFx0XHRwcm9ncmVzc1ZhbHVlcyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRwcm9ncmVzc0NvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHJlc29sdmVDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0aWYgKCByZXNvbHZlVmFsdWVzWyBpIF0gJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlICkgKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UoKVxuXHRcdFx0XHRcdFx0LmRvbmUoIHVwZGF0ZUZ1bmMoIGksIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApIClcblx0XHRcdFx0XHRcdC5mYWlsKCBkZWZlcnJlZC5yZWplY3QgKVxuXHRcdFx0XHRcdFx0LnByb2dyZXNzKCB1cGRhdGVGdW5jKCBpLCBwcm9ncmVzc0NvbnRleHRzLCBwcm9ncmVzc1ZhbHVlcyApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0LS1yZW1haW5pbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBpZiB3ZSdyZSBub3Qgd2FpdGluZyBvbiBhbnl0aGluZywgcmVzb2x2ZSB0aGUgbWFzdGVyXG5cdFx0aWYgKCAhcmVtYWluaW5nICkge1xuXHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIHJlc29sdmVDb250ZXh0cywgcmVzb2x2ZVZhbHVlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XG5cdH1cbn0pO1xuXG5cbi8vIFRoZSBkZWZlcnJlZCB1c2VkIG9uIERPTSByZWFkeVxudmFyIHJlYWR5TGlzdDtcblxualF1ZXJ5LmZuLnJlYWR5ID0gZnVuY3Rpb24oIGZuICkge1xuXHQvLyBBZGQgdGhlIGNhbGxiYWNrXG5cdGpRdWVyeS5yZWFkeS5wcm9taXNlKCkuZG9uZSggZm4gKTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbmpRdWVyeS5leHRlbmQoe1xuXHQvLyBJcyB0aGUgRE9NIHJlYWR5IHRvIGJlIHVzZWQ/IFNldCB0byB0cnVlIG9uY2UgaXQgb2NjdXJzLlxuXHRpc1JlYWR5OiBmYWxzZSxcblxuXHQvLyBBIGNvdW50ZXIgdG8gdHJhY2sgaG93IG1hbnkgaXRlbXMgdG8gd2FpdCBmb3IgYmVmb3JlXG5cdC8vIHRoZSByZWFkeSBldmVudCBmaXJlcy4gU2VlICM2NzgxXG5cdHJlYWR5V2FpdDogMSxcblxuXHQvLyBIb2xkIChvciByZWxlYXNlKSB0aGUgcmVhZHkgZXZlbnRcblx0aG9sZFJlYWR5OiBmdW5jdGlvbiggaG9sZCApIHtcblx0XHRpZiAoIGhvbGQgKSB7XG5cdFx0XHRqUXVlcnkucmVhZHlXYWl0Kys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGpRdWVyeS5yZWFkeSggdHJ1ZSApO1xuXHRcdH1cblx0fSxcblxuXHQvLyBIYW5kbGUgd2hlbiB0aGUgRE9NIGlzIHJlYWR5XG5cdHJlYWR5OiBmdW5jdGlvbiggd2FpdCApIHtcblxuXHRcdC8vIEFib3J0IGlmIHRoZXJlIGFyZSBwZW5kaW5nIGhvbGRzIG9yIHdlJ3JlIGFscmVhZHkgcmVhZHlcblx0XHRpZiAoIHdhaXQgPT09IHRydWUgPyAtLWpRdWVyeS5yZWFkeVdhaXQgOiBqUXVlcnkuaXNSZWFkeSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBNYWtlIHN1cmUgYm9keSBleGlzdHMsIGF0IGxlYXN0LCBpbiBjYXNlIElFIGdldHMgYSBsaXR0bGUgb3ZlcnplYWxvdXMgKHRpY2tldCAjNTQ0MykuXG5cdFx0aWYgKCAhZG9jdW1lbnQuYm9keSApIHtcblx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCBqUXVlcnkucmVhZHkgKTtcblx0XHR9XG5cblx0XHQvLyBSZW1lbWJlciB0aGF0IHRoZSBET00gaXMgcmVhZHlcblx0XHRqUXVlcnkuaXNSZWFkeSA9IHRydWU7XG5cblx0XHQvLyBJZiBhIG5vcm1hbCBET00gUmVhZHkgZXZlbnQgZmlyZWQsIGRlY3JlbWVudCwgYW5kIHdhaXQgaWYgbmVlZCBiZVxuXHRcdGlmICggd2FpdCAhPT0gdHJ1ZSAmJiAtLWpRdWVyeS5yZWFkeVdhaXQgPiAwICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIElmIHRoZXJlIGFyZSBmdW5jdGlvbnMgYm91bmQsIHRvIGV4ZWN1dGVcblx0XHRyZWFkeUxpc3QucmVzb2x2ZVdpdGgoIGRvY3VtZW50LCBbIGpRdWVyeSBdICk7XG5cblx0XHQvLyBUcmlnZ2VyIGFueSBib3VuZCByZWFkeSBldmVudHNcblx0XHRpZiAoIGpRdWVyeS5mbi50cmlnZ2VySGFuZGxlciApIHtcblx0XHRcdGpRdWVyeSggZG9jdW1lbnQgKS50cmlnZ2VySGFuZGxlciggXCJyZWFkeVwiICk7XG5cdFx0XHRqUXVlcnkoIGRvY3VtZW50ICkub2ZmKCBcInJlYWR5XCIgKTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIENsZWFuLXVwIG1ldGhvZCBmb3IgZG9tIHJlYWR5IGV2ZW50c1xuICovXG5mdW5jdGlvbiBkZXRhY2goKSB7XG5cdGlmICggZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciApIHtcblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgY29tcGxldGVkLCBmYWxzZSApO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCBcImxvYWRcIiwgY29tcGxldGVkLCBmYWxzZSApO1xuXG5cdH0gZWxzZSB7XG5cdFx0ZG9jdW1lbnQuZGV0YWNoRXZlbnQoIFwib25yZWFkeXN0YXRlY2hhbmdlXCIsIGNvbXBsZXRlZCApO1xuXHRcdHdpbmRvdy5kZXRhY2hFdmVudCggXCJvbmxvYWRcIiwgY29tcGxldGVkICk7XG5cdH1cbn1cblxuLyoqXG4gKiBUaGUgcmVhZHkgZXZlbnQgaGFuZGxlciBhbmQgc2VsZiBjbGVhbnVwIG1ldGhvZFxuICovXG5mdW5jdGlvbiBjb21wbGV0ZWQoKSB7XG5cdC8vIHJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiBpcyBnb29kIGVub3VnaCBmb3IgdXMgdG8gY2FsbCB0aGUgZG9tIHJlYWR5IGluIG9sZElFXG5cdGlmICggZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciB8fCBldmVudC50eXBlID09PSBcImxvYWRcIiB8fCBkb2N1bWVudC5yZWFkeVN0YXRlID09PSBcImNvbXBsZXRlXCIgKSB7XG5cdFx0ZGV0YWNoKCk7XG5cdFx0alF1ZXJ5LnJlYWR5KCk7XG5cdH1cbn1cblxualF1ZXJ5LnJlYWR5LnByb21pc2UgPSBmdW5jdGlvbiggb2JqICkge1xuXHRpZiAoICFyZWFkeUxpc3QgKSB7XG5cblx0XHRyZWFkeUxpc3QgPSBqUXVlcnkuRGVmZXJyZWQoKTtcblxuXHRcdC8vIENhdGNoIGNhc2VzIHdoZXJlICQoZG9jdW1lbnQpLnJlYWR5KCkgaXMgY2FsbGVkIGFmdGVyIHRoZSBicm93c2VyIGV2ZW50IGhhcyBhbHJlYWR5IG9jY3VycmVkLlxuXHRcdC8vIHdlIG9uY2UgdHJpZWQgdG8gdXNlIHJlYWR5U3RhdGUgXCJpbnRlcmFjdGl2ZVwiIGhlcmUsIGJ1dCBpdCBjYXVzZWQgaXNzdWVzIGxpa2UgdGhlIG9uZVxuXHRcdC8vIGRpc2NvdmVyZWQgYnkgQ2hyaXNTIGhlcmU6IGh0dHA6Ly9idWdzLmpxdWVyeS5jb20vdGlja2V0LzEyMjgyI2NvbW1lbnQ6MTVcblx0XHRpZiAoIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiApIHtcblx0XHRcdC8vIEhhbmRsZSBpdCBhc3luY2hyb25vdXNseSB0byBhbGxvdyBzY3JpcHRzIHRoZSBvcHBvcnR1bml0eSB0byBkZWxheSByZWFkeVxuXHRcdFx0c2V0VGltZW91dCggalF1ZXJ5LnJlYWR5ICk7XG5cblx0XHQvLyBTdGFuZGFyZHMtYmFzZWQgYnJvd3NlcnMgc3VwcG9ydCBET01Db250ZW50TG9hZGVkXG5cdFx0fSBlbHNlIGlmICggZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciApIHtcblx0XHRcdC8vIFVzZSB0aGUgaGFuZHkgZXZlbnQgY2FsbGJhY2tcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwiRE9NQ29udGVudExvYWRlZFwiLCBjb21wbGV0ZWQsIGZhbHNlICk7XG5cblx0XHRcdC8vIEEgZmFsbGJhY2sgdG8gd2luZG93Lm9ubG9hZCwgdGhhdCB3aWxsIGFsd2F5cyB3b3JrXG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggXCJsb2FkXCIsIGNvbXBsZXRlZCwgZmFsc2UgKTtcblxuXHRcdC8vIElmIElFIGV2ZW50IG1vZGVsIGlzIHVzZWRcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gRW5zdXJlIGZpcmluZyBiZWZvcmUgb25sb2FkLCBtYXliZSBsYXRlIGJ1dCBzYWZlIGFsc28gZm9yIGlmcmFtZXNcblx0XHRcdGRvY3VtZW50LmF0dGFjaEV2ZW50KCBcIm9ucmVhZHlzdGF0ZWNoYW5nZVwiLCBjb21wbGV0ZWQgKTtcblxuXHRcdFx0Ly8gQSBmYWxsYmFjayB0byB3aW5kb3cub25sb2FkLCB0aGF0IHdpbGwgYWx3YXlzIHdvcmtcblx0XHRcdHdpbmRvdy5hdHRhY2hFdmVudCggXCJvbmxvYWRcIiwgY29tcGxldGVkICk7XG5cblx0XHRcdC8vIElmIElFIGFuZCBub3QgYSBmcmFtZVxuXHRcdFx0Ly8gY29udGludWFsbHkgY2hlY2sgdG8gc2VlIGlmIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuXHRcdFx0dmFyIHRvcCA9IGZhbHNlO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0b3AgPSB3aW5kb3cuZnJhbWVFbGVtZW50ID09IG51bGwgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXHRcdFx0fSBjYXRjaChlKSB7fVxuXG5cdFx0XHRpZiAoIHRvcCAmJiB0b3AuZG9TY3JvbGwgKSB7XG5cdFx0XHRcdChmdW5jdGlvbiBkb1Njcm9sbENoZWNrKCkge1xuXHRcdFx0XHRcdGlmICggIWpRdWVyeS5pc1JlYWR5ICkge1xuXG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHQvLyBVc2UgdGhlIHRyaWNrIGJ5IERpZWdvIFBlcmluaVxuXHRcdFx0XHRcdFx0XHQvLyBodHRwOi8vamF2YXNjcmlwdC5ud2JveC5jb20vSUVDb250ZW50TG9hZGVkL1xuXHRcdFx0XHRcdFx0XHR0b3AuZG9TY3JvbGwoXCJsZWZ0XCIpO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCBkb1Njcm9sbENoZWNrLCA1MCApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBkZXRhY2ggYWxsIGRvbSByZWFkeSBldmVudHNcblx0XHRcdFx0XHRcdGRldGFjaCgpO1xuXG5cdFx0XHRcdFx0XHQvLyBhbmQgZXhlY3V0ZSBhbnkgd2FpdGluZyBmdW5jdGlvbnNcblx0XHRcdFx0XHRcdGpRdWVyeS5yZWFkeSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlYWR5TGlzdC5wcm9taXNlKCBvYmogKTtcbn07XG5cblxudmFyIHN0cnVuZGVmaW5lZCA9IHR5cGVvZiB1bmRlZmluZWQ7XG5cblxuXG4vLyBTdXBwb3J0OiBJRTw5XG4vLyBJdGVyYXRpb24gb3ZlciBvYmplY3QncyBpbmhlcml0ZWQgcHJvcGVydGllcyBiZWZvcmUgaXRzIG93blxudmFyIGk7XG5mb3IgKCBpIGluIGpRdWVyeSggc3VwcG9ydCApICkge1xuXHRicmVhaztcbn1cbnN1cHBvcnQub3duTGFzdCA9IGkgIT09IFwiMFwiO1xuXG4vLyBOb3RlOiBtb3N0IHN1cHBvcnQgdGVzdHMgYXJlIGRlZmluZWQgaW4gdGhlaXIgcmVzcGVjdGl2ZSBtb2R1bGVzLlxuLy8gZmFsc2UgdW50aWwgdGhlIHRlc3QgaXMgcnVuXG5zdXBwb3J0LmlubGluZUJsb2NrTmVlZHNMYXlvdXQgPSBmYWxzZTtcblxuLy8gRXhlY3V0ZSBBU0FQIGluIGNhc2Ugd2UgbmVlZCB0byBzZXQgYm9keS5zdHlsZS56b29tXG5qUXVlcnkoZnVuY3Rpb24oKSB7XG5cdC8vIE1pbmlmaWVkOiB2YXIgYSxiLGMsZFxuXHR2YXIgdmFsLCBkaXYsIGJvZHksIGNvbnRhaW5lcjtcblxuXHRib2R5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiYm9keVwiIClbIDAgXTtcblx0aWYgKCAhYm9keSB8fCAhYm9keS5zdHlsZSApIHtcblx0XHQvLyBSZXR1cm4gZm9yIGZyYW1lc2V0IGRvY3MgdGhhdCBkb24ndCBoYXZlIGEgYm9keVxuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIFNldHVwXG5cdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZGl2XCIgKTtcblx0Y29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJkaXZcIiApO1xuXHRjb250YWluZXIuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246YWJzb2x1dGU7Ym9yZGVyOjA7d2lkdGg6MDtoZWlnaHQ6MDt0b3A6MDtsZWZ0Oi05OTk5cHhcIjtcblx0Ym9keS5hcHBlbmRDaGlsZCggY29udGFpbmVyICkuYXBwZW5kQ2hpbGQoIGRpdiApO1xuXG5cdGlmICggdHlwZW9mIGRpdi5zdHlsZS56b29tICE9PSBzdHJ1bmRlZmluZWQgKSB7XG5cdFx0Ly8gU3VwcG9ydDogSUU8OFxuXHRcdC8vIENoZWNrIGlmIG5hdGl2ZWx5IGJsb2NrLWxldmVsIGVsZW1lbnRzIGFjdCBsaWtlIGlubGluZS1ibG9ja1xuXHRcdC8vIGVsZW1lbnRzIHdoZW4gc2V0dGluZyB0aGVpciBkaXNwbGF5IHRvICdpbmxpbmUnIGFuZCBnaXZpbmdcblx0XHQvLyB0aGVtIGxheW91dFxuXHRcdGRpdi5zdHlsZS5jc3NUZXh0ID0gXCJkaXNwbGF5OmlubGluZTttYXJnaW46MDtib3JkZXI6MDtwYWRkaW5nOjFweDt3aWR0aDoxcHg7em9vbToxXCI7XG5cblx0XHRzdXBwb3J0LmlubGluZUJsb2NrTmVlZHNMYXlvdXQgPSB2YWwgPSBkaXYub2Zmc2V0V2lkdGggPT09IDM7XG5cdFx0aWYgKCB2YWwgKSB7XG5cdFx0XHQvLyBQcmV2ZW50IElFIDYgZnJvbSBhZmZlY3RpbmcgbGF5b3V0IGZvciBwb3NpdGlvbmVkIGVsZW1lbnRzICMxMTA0OFxuXHRcdFx0Ly8gUHJldmVudCBJRSBmcm9tIHNocmlua2luZyB0aGUgYm9keSBpbiBJRSA3IG1vZGUgIzEyODY5XG5cdFx0XHQvLyBTdXBwb3J0OiBJRTw4XG5cdFx0XHRib2R5LnN0eWxlLnpvb20gPSAxO1xuXHRcdH1cblx0fVxuXG5cdGJvZHkucmVtb3ZlQ2hpbGQoIGNvbnRhaW5lciApO1xufSk7XG5cblxuXG5cbihmdW5jdGlvbigpIHtcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZGl2XCIgKTtcblxuXHQvLyBFeGVjdXRlIHRoZSB0ZXN0IG9ubHkgaWYgbm90IGFscmVhZHkgZXhlY3V0ZWQgaW4gYW5vdGhlciBtb2R1bGUuXG5cdGlmIChzdXBwb3J0LmRlbGV0ZUV4cGFuZG8gPT0gbnVsbCkge1xuXHRcdC8vIFN1cHBvcnQ6IElFPDlcblx0XHRzdXBwb3J0LmRlbGV0ZUV4cGFuZG8gPSB0cnVlO1xuXHRcdHRyeSB7XG5cdFx0XHRkZWxldGUgZGl2LnRlc3Q7XG5cdFx0fSBjYXRjaCggZSApIHtcblx0XHRcdHN1cHBvcnQuZGVsZXRlRXhwYW5kbyA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdC8vIE51bGwgZWxlbWVudHMgdG8gYXZvaWQgbGVha3MgaW4gSUUuXG5cdGRpdiA9IG51bGw7XG59KSgpO1xuXG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGFuIG9iamVjdCBjYW4gaGF2ZSBkYXRhXG4gKi9cbmpRdWVyeS5hY2NlcHREYXRhID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdHZhciBub0RhdGEgPSBqUXVlcnkubm9EYXRhWyAoZWxlbS5ub2RlTmFtZSArIFwiIFwiKS50b0xvd2VyQ2FzZSgpIF0sXG5cdFx0bm9kZVR5cGUgPSArZWxlbS5ub2RlVHlwZSB8fCAxO1xuXG5cdC8vIERvIG5vdCBzZXQgZGF0YSBvbiBub24tZWxlbWVudCBET00gbm9kZXMgYmVjYXVzZSBpdCB3aWxsIG5vdCBiZSBjbGVhcmVkICgjODMzNSkuXG5cdHJldHVybiBub2RlVHlwZSAhPT0gMSAmJiBub2RlVHlwZSAhPT0gOSA/XG5cdFx0ZmFsc2UgOlxuXG5cdFx0Ly8gTm9kZXMgYWNjZXB0IGRhdGEgdW5sZXNzIG90aGVyd2lzZSBzcGVjaWZpZWQ7IHJlamVjdGlvbiBjYW4gYmUgY29uZGl0aW9uYWxcblx0XHQhbm9EYXRhIHx8IG5vRGF0YSAhPT0gdHJ1ZSAmJiBlbGVtLmdldEF0dHJpYnV0ZShcImNsYXNzaWRcIikgPT09IG5vRGF0YTtcbn07XG5cblxudmFyIHJicmFjZSA9IC9eKD86XFx7W1xcd1xcV10qXFx9fFxcW1tcXHdcXFddKlxcXSkkLyxcblx0cm11bHRpRGFzaCA9IC8oW0EtWl0pL2c7XG5cbmZ1bmN0aW9uIGRhdGFBdHRyKCBlbGVtLCBrZXksIGRhdGEgKSB7XG5cdC8vIElmIG5vdGhpbmcgd2FzIGZvdW5kIGludGVybmFsbHksIHRyeSB0byBmZXRjaCBhbnlcblx0Ly8gZGF0YSBmcm9tIHRoZSBIVE1MNSBkYXRhLSogYXR0cmlidXRlXG5cdGlmICggZGF0YSA9PT0gdW5kZWZpbmVkICYmIGVsZW0ubm9kZVR5cGUgPT09IDEgKSB7XG5cblx0XHR2YXIgbmFtZSA9IFwiZGF0YS1cIiArIGtleS5yZXBsYWNlKCBybXVsdGlEYXNoLCBcIi0kMVwiICkudG9Mb3dlckNhc2UoKTtcblxuXHRcdGRhdGEgPSBlbGVtLmdldEF0dHJpYnV0ZSggbmFtZSApO1xuXG5cdFx0aWYgKCB0eXBlb2YgZGF0YSA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGRhdGEgPSBkYXRhID09PSBcInRydWVcIiA/IHRydWUgOlxuXHRcdFx0XHRcdGRhdGEgPT09IFwiZmFsc2VcIiA/IGZhbHNlIDpcblx0XHRcdFx0XHRkYXRhID09PSBcIm51bGxcIiA/IG51bGwgOlxuXHRcdFx0XHRcdC8vIE9ubHkgY29udmVydCB0byBhIG51bWJlciBpZiBpdCBkb2Vzbid0IGNoYW5nZSB0aGUgc3RyaW5nXG5cdFx0XHRcdFx0K2RhdGEgKyBcIlwiID09PSBkYXRhID8gK2RhdGEgOlxuXHRcdFx0XHRcdHJicmFjZS50ZXN0KCBkYXRhICkgPyBqUXVlcnkucGFyc2VKU09OKCBkYXRhICkgOlxuXHRcdFx0XHRcdGRhdGE7XG5cdFx0XHR9IGNhdGNoKCBlICkge31cblxuXHRcdFx0Ly8gTWFrZSBzdXJlIHdlIHNldCB0aGUgZGF0YSBzbyBpdCBpc24ndCBjaGFuZ2VkIGxhdGVyXG5cdFx0XHRqUXVlcnkuZGF0YSggZWxlbSwga2V5LCBkYXRhICk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGF0YSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn1cblxuLy8gY2hlY2tzIGEgY2FjaGUgb2JqZWN0IGZvciBlbXB0aW5lc3NcbmZ1bmN0aW9uIGlzRW1wdHlEYXRhT2JqZWN0KCBvYmogKSB7XG5cdHZhciBuYW1lO1xuXHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblxuXHRcdC8vIGlmIHRoZSBwdWJsaWMgZGF0YSBvYmplY3QgaXMgZW1wdHksIHRoZSBwcml2YXRlIGlzIHN0aWxsIGVtcHR5XG5cdFx0aWYgKCBuYW1lID09PSBcImRhdGFcIiAmJiBqUXVlcnkuaXNFbXB0eU9iamVjdCggb2JqW25hbWVdICkgKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0aWYgKCBuYW1lICE9PSBcInRvSlNPTlwiICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBpbnRlcm5hbERhdGEoIGVsZW0sIG5hbWUsIGRhdGEsIHB2dCAvKiBJbnRlcm5hbCBVc2UgT25seSAqLyApIHtcblx0aWYgKCAhalF1ZXJ5LmFjY2VwdERhdGEoIGVsZW0gKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgcmV0LCB0aGlzQ2FjaGUsXG5cdFx0aW50ZXJuYWxLZXkgPSBqUXVlcnkuZXhwYW5kbyxcblxuXHRcdC8vIFdlIGhhdmUgdG8gaGFuZGxlIERPTSBub2RlcyBhbmQgSlMgb2JqZWN0cyBkaWZmZXJlbnRseSBiZWNhdXNlIElFNi03XG5cdFx0Ly8gY2FuJ3QgR0Mgb2JqZWN0IHJlZmVyZW5jZXMgcHJvcGVybHkgYWNyb3NzIHRoZSBET00tSlMgYm91bmRhcnlcblx0XHRpc05vZGUgPSBlbGVtLm5vZGVUeXBlLFxuXG5cdFx0Ly8gT25seSBET00gbm9kZXMgbmVlZCB0aGUgZ2xvYmFsIGpRdWVyeSBjYWNoZTsgSlMgb2JqZWN0IGRhdGEgaXNcblx0XHQvLyBhdHRhY2hlZCBkaXJlY3RseSB0byB0aGUgb2JqZWN0IHNvIEdDIGNhbiBvY2N1ciBhdXRvbWF0aWNhbGx5XG5cdFx0Y2FjaGUgPSBpc05vZGUgPyBqUXVlcnkuY2FjaGUgOiBlbGVtLFxuXG5cdFx0Ly8gT25seSBkZWZpbmluZyBhbiBJRCBmb3IgSlMgb2JqZWN0cyBpZiBpdHMgY2FjaGUgYWxyZWFkeSBleGlzdHMgYWxsb3dzXG5cdFx0Ly8gdGhlIGNvZGUgdG8gc2hvcnRjdXQgb24gdGhlIHNhbWUgcGF0aCBhcyBhIERPTSBub2RlIHdpdGggbm8gY2FjaGVcblx0XHRpZCA9IGlzTm9kZSA/IGVsZW1bIGludGVybmFsS2V5IF0gOiBlbGVtWyBpbnRlcm5hbEtleSBdICYmIGludGVybmFsS2V5O1xuXG5cdC8vIEF2b2lkIGRvaW5nIGFueSBtb3JlIHdvcmsgdGhhbiB3ZSBuZWVkIHRvIHdoZW4gdHJ5aW5nIHRvIGdldCBkYXRhIG9uIGFuXG5cdC8vIG9iamVjdCB0aGF0IGhhcyBubyBkYXRhIGF0IGFsbFxuXHRpZiAoICghaWQgfHwgIWNhY2hlW2lkXSB8fCAoIXB2dCAmJiAhY2FjaGVbaWRdLmRhdGEpKSAmJiBkYXRhID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG5hbWUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKCAhaWQgKSB7XG5cdFx0Ly8gT25seSBET00gbm9kZXMgbmVlZCBhIG5ldyB1bmlxdWUgSUQgZm9yIGVhY2ggZWxlbWVudCBzaW5jZSB0aGVpciBkYXRhXG5cdFx0Ly8gZW5kcyB1cCBpbiB0aGUgZ2xvYmFsIGNhY2hlXG5cdFx0aWYgKCBpc05vZGUgKSB7XG5cdFx0XHRpZCA9IGVsZW1bIGludGVybmFsS2V5IF0gPSBkZWxldGVkSWRzLnBvcCgpIHx8IGpRdWVyeS5ndWlkKys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlkID0gaW50ZXJuYWxLZXk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCAhY2FjaGVbIGlkIF0gKSB7XG5cdFx0Ly8gQXZvaWQgZXhwb3NpbmcgalF1ZXJ5IG1ldGFkYXRhIG9uIHBsYWluIEpTIG9iamVjdHMgd2hlbiB0aGUgb2JqZWN0XG5cdFx0Ly8gaXMgc2VyaWFsaXplZCB1c2luZyBKU09OLnN0cmluZ2lmeVxuXHRcdGNhY2hlWyBpZCBdID0gaXNOb2RlID8ge30gOiB7IHRvSlNPTjogalF1ZXJ5Lm5vb3AgfTtcblx0fVxuXG5cdC8vIEFuIG9iamVjdCBjYW4gYmUgcGFzc2VkIHRvIGpRdWVyeS5kYXRhIGluc3RlYWQgb2YgYSBrZXkvdmFsdWUgcGFpcjsgdGhpcyBnZXRzXG5cdC8vIHNoYWxsb3cgY29waWVkIG92ZXIgb250byB0aGUgZXhpc3RpbmcgY2FjaGVcblx0aWYgKCB0eXBlb2YgbmFtZSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdGlmICggcHZ0ICkge1xuXHRcdFx0Y2FjaGVbIGlkIF0gPSBqUXVlcnkuZXh0ZW5kKCBjYWNoZVsgaWQgXSwgbmFtZSApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYWNoZVsgaWQgXS5kYXRhID0galF1ZXJ5LmV4dGVuZCggY2FjaGVbIGlkIF0uZGF0YSwgbmFtZSApO1xuXHRcdH1cblx0fVxuXG5cdHRoaXNDYWNoZSA9IGNhY2hlWyBpZCBdO1xuXG5cdC8vIGpRdWVyeSBkYXRhKCkgaXMgc3RvcmVkIGluIGEgc2VwYXJhdGUgb2JqZWN0IGluc2lkZSB0aGUgb2JqZWN0J3MgaW50ZXJuYWwgZGF0YVxuXHQvLyBjYWNoZSBpbiBvcmRlciB0byBhdm9pZCBrZXkgY29sbGlzaW9ucyBiZXR3ZWVuIGludGVybmFsIGRhdGEgYW5kIHVzZXItZGVmaW5lZFxuXHQvLyBkYXRhLlxuXHRpZiAoICFwdnQgKSB7XG5cdFx0aWYgKCAhdGhpc0NhY2hlLmRhdGEgKSB7XG5cdFx0XHR0aGlzQ2FjaGUuZGF0YSA9IHt9O1xuXHRcdH1cblxuXHRcdHRoaXNDYWNoZSA9IHRoaXNDYWNoZS5kYXRhO1xuXHR9XG5cblx0aWYgKCBkYXRhICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0dGhpc0NhY2hlWyBqUXVlcnkuY2FtZWxDYXNlKCBuYW1lICkgXSA9IGRhdGE7XG5cdH1cblxuXHQvLyBDaGVjayBmb3IgYm90aCBjb252ZXJ0ZWQtdG8tY2FtZWwgYW5kIG5vbi1jb252ZXJ0ZWQgZGF0YSBwcm9wZXJ0eSBuYW1lc1xuXHQvLyBJZiBhIGRhdGEgcHJvcGVydHkgd2FzIHNwZWNpZmllZFxuXHRpZiAoIHR5cGVvZiBuYW1lID09PSBcInN0cmluZ1wiICkge1xuXG5cdFx0Ly8gRmlyc3QgVHJ5IHRvIGZpbmQgYXMtaXMgcHJvcGVydHkgZGF0YVxuXHRcdHJldCA9IHRoaXNDYWNoZVsgbmFtZSBdO1xuXG5cdFx0Ly8gVGVzdCBmb3IgbnVsbHx1bmRlZmluZWQgcHJvcGVydHkgZGF0YVxuXHRcdGlmICggcmV0ID09IG51bGwgKSB7XG5cblx0XHRcdC8vIFRyeSB0byBmaW5kIHRoZSBjYW1lbENhc2VkIHByb3BlcnR5XG5cdFx0XHRyZXQgPSB0aGlzQ2FjaGVbIGpRdWVyeS5jYW1lbENhc2UoIG5hbWUgKSBdO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRyZXQgPSB0aGlzQ2FjaGU7XG5cdH1cblxuXHRyZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBpbnRlcm5hbFJlbW92ZURhdGEoIGVsZW0sIG5hbWUsIHB2dCApIHtcblx0aWYgKCAhalF1ZXJ5LmFjY2VwdERhdGEoIGVsZW0gKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgdGhpc0NhY2hlLCBpLFxuXHRcdGlzTm9kZSA9IGVsZW0ubm9kZVR5cGUsXG5cblx0XHQvLyBTZWUgalF1ZXJ5LmRhdGEgZm9yIG1vcmUgaW5mb3JtYXRpb25cblx0XHRjYWNoZSA9IGlzTm9kZSA/IGpRdWVyeS5jYWNoZSA6IGVsZW0sXG5cdFx0aWQgPSBpc05vZGUgPyBlbGVtWyBqUXVlcnkuZXhwYW5kbyBdIDogalF1ZXJ5LmV4cGFuZG87XG5cblx0Ly8gSWYgdGhlcmUgaXMgYWxyZWFkeSBubyBjYWNoZSBlbnRyeSBmb3IgdGhpcyBvYmplY3QsIHRoZXJlIGlzIG5vXG5cdC8vIHB1cnBvc2UgaW4gY29udGludWluZ1xuXHRpZiAoICFjYWNoZVsgaWQgXSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIG5hbWUgKSB7XG5cblx0XHR0aGlzQ2FjaGUgPSBwdnQgPyBjYWNoZVsgaWQgXSA6IGNhY2hlWyBpZCBdLmRhdGE7XG5cblx0XHRpZiAoIHRoaXNDYWNoZSApIHtcblxuXHRcdFx0Ly8gU3VwcG9ydCBhcnJheSBvciBzcGFjZSBzZXBhcmF0ZWQgc3RyaW5nIG5hbWVzIGZvciBkYXRhIGtleXNcblx0XHRcdGlmICggIWpRdWVyeS5pc0FycmF5KCBuYW1lICkgKSB7XG5cblx0XHRcdFx0Ly8gdHJ5IHRoZSBzdHJpbmcgYXMgYSBrZXkgYmVmb3JlIGFueSBtYW5pcHVsYXRpb25cblx0XHRcdFx0aWYgKCBuYW1lIGluIHRoaXNDYWNoZSApIHtcblx0XHRcdFx0XHRuYW1lID0gWyBuYW1lIF07XG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHQvLyBzcGxpdCB0aGUgY2FtZWwgY2FzZWQgdmVyc2lvbiBieSBzcGFjZXMgdW5sZXNzIGEga2V5IHdpdGggdGhlIHNwYWNlcyBleGlzdHNcblx0XHRcdFx0XHRuYW1lID0galF1ZXJ5LmNhbWVsQ2FzZSggbmFtZSApO1xuXHRcdFx0XHRcdGlmICggbmFtZSBpbiB0aGlzQ2FjaGUgKSB7XG5cdFx0XHRcdFx0XHRuYW1lID0gWyBuYW1lIF07XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG5hbWUgPSBuYW1lLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIElmIFwibmFtZVwiIGlzIGFuIGFycmF5IG9mIGtleXMuLi5cblx0XHRcdFx0Ly8gV2hlbiBkYXRhIGlzIGluaXRpYWxseSBjcmVhdGVkLCB2aWEgKFwia2V5XCIsIFwidmFsXCIpIHNpZ25hdHVyZSxcblx0XHRcdFx0Ly8ga2V5cyB3aWxsIGJlIGNvbnZlcnRlZCB0byBjYW1lbENhc2UuXG5cdFx0XHRcdC8vIFNpbmNlIHRoZXJlIGlzIG5vIHdheSB0byB0ZWxsIF9ob3dfIGEga2V5IHdhcyBhZGRlZCwgcmVtb3ZlXG5cdFx0XHRcdC8vIGJvdGggcGxhaW4ga2V5IGFuZCBjYW1lbENhc2Uga2V5LiAjMTI3ODZcblx0XHRcdFx0Ly8gVGhpcyB3aWxsIG9ubHkgcGVuYWxpemUgdGhlIGFycmF5IGFyZ3VtZW50IHBhdGguXG5cdFx0XHRcdG5hbWUgPSBuYW1lLmNvbmNhdCggalF1ZXJ5Lm1hcCggbmFtZSwgalF1ZXJ5LmNhbWVsQ2FzZSApICk7XG5cdFx0XHR9XG5cblx0XHRcdGkgPSBuYW1lLmxlbmd0aDtcblx0XHRcdHdoaWxlICggaS0tICkge1xuXHRcdFx0XHRkZWxldGUgdGhpc0NhY2hlWyBuYW1lW2ldIF07XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHRoZXJlIGlzIG5vIGRhdGEgbGVmdCBpbiB0aGUgY2FjaGUsIHdlIHdhbnQgdG8gY29udGludWVcblx0XHRcdC8vIGFuZCBsZXQgdGhlIGNhY2hlIG9iamVjdCBpdHNlbGYgZ2V0IGRlc3Ryb3llZFxuXHRcdFx0aWYgKCBwdnQgPyAhaXNFbXB0eURhdGFPYmplY3QodGhpc0NhY2hlKSA6ICFqUXVlcnkuaXNFbXB0eU9iamVjdCh0aGlzQ2FjaGUpICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gU2VlIGpRdWVyeS5kYXRhIGZvciBtb3JlIGluZm9ybWF0aW9uXG5cdGlmICggIXB2dCApIHtcblx0XHRkZWxldGUgY2FjaGVbIGlkIF0uZGF0YTtcblxuXHRcdC8vIERvbid0IGRlc3Ryb3kgdGhlIHBhcmVudCBjYWNoZSB1bmxlc3MgdGhlIGludGVybmFsIGRhdGEgb2JqZWN0XG5cdFx0Ly8gaGFkIGJlZW4gdGhlIG9ubHkgdGhpbmcgbGVmdCBpbiBpdFxuXHRcdGlmICggIWlzRW1wdHlEYXRhT2JqZWN0KCBjYWNoZVsgaWQgXSApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdC8vIERlc3Ryb3kgdGhlIGNhY2hlXG5cdGlmICggaXNOb2RlICkge1xuXHRcdGpRdWVyeS5jbGVhbkRhdGEoIFsgZWxlbSBdLCB0cnVlICk7XG5cblx0Ly8gVXNlIGRlbGV0ZSB3aGVuIHN1cHBvcnRlZCBmb3IgZXhwYW5kb3Mgb3IgYGNhY2hlYCBpcyBub3QgYSB3aW5kb3cgcGVyIGlzV2luZG93ICgjMTAwODApXG5cdC8qIGpzaGludCBlcWVxZXE6IGZhbHNlICovXG5cdH0gZWxzZSBpZiAoIHN1cHBvcnQuZGVsZXRlRXhwYW5kbyB8fCBjYWNoZSAhPSBjYWNoZS53aW5kb3cgKSB7XG5cdFx0LyoganNoaW50IGVxZXFlcTogdHJ1ZSAqL1xuXHRcdGRlbGV0ZSBjYWNoZVsgaWQgXTtcblxuXHQvLyBXaGVuIGFsbCBlbHNlIGZhaWxzLCBudWxsXG5cdH0gZWxzZSB7XG5cdFx0Y2FjaGVbIGlkIF0gPSBudWxsO1xuXHR9XG59XG5cbmpRdWVyeS5leHRlbmQoe1xuXHRjYWNoZToge30sXG5cblx0Ly8gVGhlIGZvbGxvd2luZyBlbGVtZW50cyAoc3BhY2Utc3VmZml4ZWQgdG8gYXZvaWQgT2JqZWN0LnByb3RvdHlwZSBjb2xsaXNpb25zKVxuXHQvLyB0aHJvdyB1bmNhdGNoYWJsZSBleGNlcHRpb25zIGlmIHlvdSBhdHRlbXB0IHRvIHNldCBleHBhbmRvIHByb3BlcnRpZXNcblx0bm9EYXRhOiB7XG5cdFx0XCJhcHBsZXQgXCI6IHRydWUsXG5cdFx0XCJlbWJlZCBcIjogdHJ1ZSxcblx0XHQvLyAuLi5idXQgRmxhc2ggb2JqZWN0cyAod2hpY2ggaGF2ZSB0aGlzIGNsYXNzaWQpICpjYW4qIGhhbmRsZSBleHBhbmRvc1xuXHRcdFwib2JqZWN0IFwiOiBcImNsc2lkOkQyN0NEQjZFLUFFNkQtMTFjZi05NkI4LTQ0NDU1MzU0MDAwMFwiXG5cdH0sXG5cblx0aGFzRGF0YTogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0ZWxlbSA9IGVsZW0ubm9kZVR5cGUgPyBqUXVlcnkuY2FjaGVbIGVsZW1balF1ZXJ5LmV4cGFuZG9dIF0gOiBlbGVtWyBqUXVlcnkuZXhwYW5kbyBdO1xuXHRcdHJldHVybiAhIWVsZW0gJiYgIWlzRW1wdHlEYXRhT2JqZWN0KCBlbGVtICk7XG5cdH0sXG5cblx0ZGF0YTogZnVuY3Rpb24oIGVsZW0sIG5hbWUsIGRhdGEgKSB7XG5cdFx0cmV0dXJuIGludGVybmFsRGF0YSggZWxlbSwgbmFtZSwgZGF0YSApO1xuXHR9LFxuXG5cdHJlbW92ZURhdGE6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lICkge1xuXHRcdHJldHVybiBpbnRlcm5hbFJlbW92ZURhdGEoIGVsZW0sIG5hbWUgKTtcblx0fSxcblxuXHQvLyBGb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG5cdF9kYXRhOiBmdW5jdGlvbiggZWxlbSwgbmFtZSwgZGF0YSApIHtcblx0XHRyZXR1cm4gaW50ZXJuYWxEYXRhKCBlbGVtLCBuYW1lLCBkYXRhLCB0cnVlICk7XG5cdH0sXG5cblx0X3JlbW92ZURhdGE6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lICkge1xuXHRcdHJldHVybiBpbnRlcm5hbFJlbW92ZURhdGEoIGVsZW0sIG5hbWUsIHRydWUgKTtcblx0fVxufSk7XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRkYXRhOiBmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcblx0XHR2YXIgaSwgbmFtZSwgZGF0YSxcblx0XHRcdGVsZW0gPSB0aGlzWzBdLFxuXHRcdFx0YXR0cnMgPSBlbGVtICYmIGVsZW0uYXR0cmlidXRlcztcblxuXHRcdC8vIFNwZWNpYWwgZXhwZWN0aW9ucyBvZiAuZGF0YSBiYXNpY2FsbHkgdGh3YXJ0IGpRdWVyeS5hY2Nlc3MsXG5cdFx0Ly8gc28gaW1wbGVtZW50IHRoZSByZWxldmFudCBiZWhhdmlvciBvdXJzZWx2ZXNcblxuXHRcdC8vIEdldHMgYWxsIHZhbHVlc1xuXHRcdGlmICgga2V5ID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRpZiAoIHRoaXMubGVuZ3RoICkge1xuXHRcdFx0XHRkYXRhID0galF1ZXJ5LmRhdGEoIGVsZW0gKTtcblxuXHRcdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgIWpRdWVyeS5fZGF0YSggZWxlbSwgXCJwYXJzZWRBdHRyc1wiICkgKSB7XG5cdFx0XHRcdFx0aSA9IGF0dHJzLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoIGktLSApIHtcblxuXHRcdFx0XHRcdFx0Ly8gU3VwcG9ydDogSUUxMStcblx0XHRcdFx0XHRcdC8vIFRoZSBhdHRycyBlbGVtZW50cyBjYW4gYmUgbnVsbCAoIzE0ODk0KVxuXHRcdFx0XHRcdFx0aWYgKCBhdHRyc1sgaSBdICkge1xuXHRcdFx0XHRcdFx0XHRuYW1lID0gYXR0cnNbIGkgXS5uYW1lO1xuXHRcdFx0XHRcdFx0XHRpZiAoIG5hbWUuaW5kZXhPZiggXCJkYXRhLVwiICkgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRcdFx0bmFtZSA9IGpRdWVyeS5jYW1lbENhc2UoIG5hbWUuc2xpY2UoNSkgKTtcblx0XHRcdFx0XHRcdFx0XHRkYXRhQXR0ciggZWxlbSwgbmFtZSwgZGF0YVsgbmFtZSBdICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0alF1ZXJ5Ll9kYXRhKCBlbGVtLCBcInBhcnNlZEF0dHJzXCIsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9XG5cblx0XHQvLyBTZXRzIG11bHRpcGxlIHZhbHVlc1xuXHRcdGlmICggdHlwZW9mIGtleSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGpRdWVyeS5kYXRhKCB0aGlzLCBrZXkgKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMSA/XG5cblx0XHRcdC8vIFNldHMgb25lIHZhbHVlXG5cdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGpRdWVyeS5kYXRhKCB0aGlzLCBrZXksIHZhbHVlICk7XG5cdFx0XHR9KSA6XG5cblx0XHRcdC8vIEdldHMgb25lIHZhbHVlXG5cdFx0XHQvLyBUcnkgdG8gZmV0Y2ggYW55IGludGVybmFsbHkgc3RvcmVkIGRhdGEgZmlyc3Rcblx0XHRcdGVsZW0gPyBkYXRhQXR0ciggZWxlbSwga2V5LCBqUXVlcnkuZGF0YSggZWxlbSwga2V5ICkgKSA6IHVuZGVmaW5lZDtcblx0fSxcblxuXHRyZW1vdmVEYXRhOiBmdW5jdGlvbigga2V5ICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRqUXVlcnkucmVtb3ZlRGF0YSggdGhpcywga2V5ICk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5cbmpRdWVyeS5leHRlbmQoe1xuXHRxdWV1ZTogZnVuY3Rpb24oIGVsZW0sIHR5cGUsIGRhdGEgKSB7XG5cdFx0dmFyIHF1ZXVlO1xuXG5cdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0dHlwZSA9ICggdHlwZSB8fCBcImZ4XCIgKSArIFwicXVldWVcIjtcblx0XHRcdHF1ZXVlID0galF1ZXJ5Ll9kYXRhKCBlbGVtLCB0eXBlICk7XG5cblx0XHRcdC8vIFNwZWVkIHVwIGRlcXVldWUgYnkgZ2V0dGluZyBvdXQgcXVpY2tseSBpZiB0aGlzIGlzIGp1c3QgYSBsb29rdXBcblx0XHRcdGlmICggZGF0YSApIHtcblx0XHRcdFx0aWYgKCAhcXVldWUgfHwgalF1ZXJ5LmlzQXJyYXkoZGF0YSkgKSB7XG5cdFx0XHRcdFx0cXVldWUgPSBqUXVlcnkuX2RhdGEoIGVsZW0sIHR5cGUsIGpRdWVyeS5tYWtlQXJyYXkoZGF0YSkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRxdWV1ZS5wdXNoKCBkYXRhICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBxdWV1ZSB8fCBbXTtcblx0XHR9XG5cdH0sXG5cblx0ZGVxdWV1ZTogZnVuY3Rpb24oIGVsZW0sIHR5cGUgKSB7XG5cdFx0dHlwZSA9IHR5cGUgfHwgXCJmeFwiO1xuXG5cdFx0dmFyIHF1ZXVlID0galF1ZXJ5LnF1ZXVlKCBlbGVtLCB0eXBlICksXG5cdFx0XHRzdGFydExlbmd0aCA9IHF1ZXVlLmxlbmd0aCxcblx0XHRcdGZuID0gcXVldWUuc2hpZnQoKSxcblx0XHRcdGhvb2tzID0galF1ZXJ5Ll9xdWV1ZUhvb2tzKCBlbGVtLCB0eXBlICksXG5cdFx0XHRuZXh0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGpRdWVyeS5kZXF1ZXVlKCBlbGVtLCB0eXBlICk7XG5cdFx0XHR9O1xuXG5cdFx0Ly8gSWYgdGhlIGZ4IHF1ZXVlIGlzIGRlcXVldWVkLCBhbHdheXMgcmVtb3ZlIHRoZSBwcm9ncmVzcyBzZW50aW5lbFxuXHRcdGlmICggZm4gPT09IFwiaW5wcm9ncmVzc1wiICkge1xuXHRcdFx0Zm4gPSBxdWV1ZS5zaGlmdCgpO1xuXHRcdFx0c3RhcnRMZW5ndGgtLTtcblx0XHR9XG5cblx0XHRpZiAoIGZuICkge1xuXG5cdFx0XHQvLyBBZGQgYSBwcm9ncmVzcyBzZW50aW5lbCB0byBwcmV2ZW50IHRoZSBmeCBxdWV1ZSBmcm9tIGJlaW5nXG5cdFx0XHQvLyBhdXRvbWF0aWNhbGx5IGRlcXVldWVkXG5cdFx0XHRpZiAoIHR5cGUgPT09IFwiZnhcIiApIHtcblx0XHRcdFx0cXVldWUudW5zaGlmdCggXCJpbnByb2dyZXNzXCIgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2xlYXIgdXAgdGhlIGxhc3QgcXVldWUgc3RvcCBmdW5jdGlvblxuXHRcdFx0ZGVsZXRlIGhvb2tzLnN0b3A7XG5cdFx0XHRmbi5jYWxsKCBlbGVtLCBuZXh0LCBob29rcyApO1xuXHRcdH1cblxuXHRcdGlmICggIXN0YXJ0TGVuZ3RoICYmIGhvb2tzICkge1xuXHRcdFx0aG9va3MuZW1wdHkuZmlyZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvLyBub3QgaW50ZW5kZWQgZm9yIHB1YmxpYyBjb25zdW1wdGlvbiAtIGdlbmVyYXRlcyBhIHF1ZXVlSG9va3Mgb2JqZWN0LCBvciByZXR1cm5zIHRoZSBjdXJyZW50IG9uZVxuXHRfcXVldWVIb29rczogZnVuY3Rpb24oIGVsZW0sIHR5cGUgKSB7XG5cdFx0dmFyIGtleSA9IHR5cGUgKyBcInF1ZXVlSG9va3NcIjtcblx0XHRyZXR1cm4galF1ZXJ5Ll9kYXRhKCBlbGVtLCBrZXkgKSB8fCBqUXVlcnkuX2RhdGEoIGVsZW0sIGtleSwge1xuXHRcdFx0ZW1wdHk6IGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKS5hZGQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGpRdWVyeS5fcmVtb3ZlRGF0YSggZWxlbSwgdHlwZSArIFwicXVldWVcIiApO1xuXHRcdFx0XHRqUXVlcnkuX3JlbW92ZURhdGEoIGVsZW0sIGtleSApO1xuXHRcdFx0fSlcblx0XHR9KTtcblx0fVxufSk7XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRxdWV1ZTogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKSB7XG5cdFx0dmFyIHNldHRlciA9IDI7XG5cblx0XHRpZiAoIHR5cGVvZiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0ZGF0YSA9IHR5cGU7XG5cdFx0XHR0eXBlID0gXCJmeFwiO1xuXHRcdFx0c2V0dGVyLS07XG5cdFx0fVxuXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoIDwgc2V0dGVyICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeS5xdWV1ZSggdGhpc1swXSwgdHlwZSApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkYXRhID09PSB1bmRlZmluZWQgP1xuXHRcdFx0dGhpcyA6XG5cdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBxdWV1ZSA9IGpRdWVyeS5xdWV1ZSggdGhpcywgdHlwZSwgZGF0YSApO1xuXG5cdFx0XHRcdC8vIGVuc3VyZSBhIGhvb2tzIGZvciB0aGlzIHF1ZXVlXG5cdFx0XHRcdGpRdWVyeS5fcXVldWVIb29rcyggdGhpcywgdHlwZSApO1xuXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmeFwiICYmIHF1ZXVlWzBdICE9PSBcImlucHJvZ3Jlc3NcIiApIHtcblx0XHRcdFx0XHRqUXVlcnkuZGVxdWV1ZSggdGhpcywgdHlwZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0fSxcblx0ZGVxdWV1ZTogZnVuY3Rpb24oIHR5cGUgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5kZXF1ZXVlKCB0aGlzLCB0eXBlICk7XG5cdFx0fSk7XG5cdH0sXG5cdGNsZWFyUXVldWU6IGZ1bmN0aW9uKCB0eXBlICkge1xuXHRcdHJldHVybiB0aGlzLnF1ZXVlKCB0eXBlIHx8IFwiZnhcIiwgW10gKTtcblx0fSxcblx0Ly8gR2V0IGEgcHJvbWlzZSByZXNvbHZlZCB3aGVuIHF1ZXVlcyBvZiBhIGNlcnRhaW4gdHlwZVxuXHQvLyBhcmUgZW1wdGllZCAoZnggaXMgdGhlIHR5cGUgYnkgZGVmYXVsdClcblx0cHJvbWlzZTogZnVuY3Rpb24oIHR5cGUsIG9iaiApIHtcblx0XHR2YXIgdG1wLFxuXHRcdFx0Y291bnQgPSAxLFxuXHRcdFx0ZGVmZXIgPSBqUXVlcnkuRGVmZXJyZWQoKSxcblx0XHRcdGVsZW1lbnRzID0gdGhpcyxcblx0XHRcdGkgPSB0aGlzLmxlbmd0aCxcblx0XHRcdHJlc29sdmUgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAhKCAtLWNvdW50ICkgKSB7XG5cdFx0XHRcdFx0ZGVmZXIucmVzb2x2ZVdpdGgoIGVsZW1lbnRzLCBbIGVsZW1lbnRzIF0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdGlmICggdHlwZW9mIHR5cGUgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRvYmogPSB0eXBlO1xuXHRcdFx0dHlwZSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0dHlwZSA9IHR5cGUgfHwgXCJmeFwiO1xuXG5cdFx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0XHR0bXAgPSBqUXVlcnkuX2RhdGEoIGVsZW1lbnRzWyBpIF0sIHR5cGUgKyBcInF1ZXVlSG9va3NcIiApO1xuXHRcdFx0aWYgKCB0bXAgJiYgdG1wLmVtcHR5ICkge1xuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0XHR0bXAuZW1wdHkuYWRkKCByZXNvbHZlICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJlc29sdmUoKTtcblx0XHRyZXR1cm4gZGVmZXIucHJvbWlzZSggb2JqICk7XG5cdH1cbn0pO1xudmFyIHBudW0gPSAoL1srLV0/KD86XFxkKlxcLnwpXFxkKyg/OltlRV1bKy1dP1xcZCt8KS8pLnNvdXJjZTtcblxudmFyIGNzc0V4cGFuZCA9IFsgXCJUb3BcIiwgXCJSaWdodFwiLCBcIkJvdHRvbVwiLCBcIkxlZnRcIiBdO1xuXG52YXIgaXNIaWRkZW4gPSBmdW5jdGlvbiggZWxlbSwgZWwgKSB7XG5cdFx0Ly8gaXNIaWRkZW4gbWlnaHQgYmUgY2FsbGVkIGZyb20galF1ZXJ5I2ZpbHRlciBmdW5jdGlvbjtcblx0XHQvLyBpbiB0aGF0IGNhc2UsIGVsZW1lbnQgd2lsbCBiZSBzZWNvbmQgYXJndW1lbnRcblx0XHRlbGVtID0gZWwgfHwgZWxlbTtcblx0XHRyZXR1cm4galF1ZXJ5LmNzcyggZWxlbSwgXCJkaXNwbGF5XCIgKSA9PT0gXCJub25lXCIgfHwgIWpRdWVyeS5jb250YWlucyggZWxlbS5vd25lckRvY3VtZW50LCBlbGVtICk7XG5cdH07XG5cblxuXG4vLyBNdWx0aWZ1bmN0aW9uYWwgbWV0aG9kIHRvIGdldCBhbmQgc2V0IHZhbHVlcyBvZiBhIGNvbGxlY3Rpb25cbi8vIFRoZSB2YWx1ZS9zIGNhbiBvcHRpb25hbGx5IGJlIGV4ZWN1dGVkIGlmIGl0J3MgYSBmdW5jdGlvblxudmFyIGFjY2VzcyA9IGpRdWVyeS5hY2Nlc3MgPSBmdW5jdGlvbiggZWxlbXMsIGZuLCBrZXksIHZhbHVlLCBjaGFpbmFibGUsIGVtcHR5R2V0LCByYXcgKSB7XG5cdHZhciBpID0gMCxcblx0XHRsZW5ndGggPSBlbGVtcy5sZW5ndGgsXG5cdFx0YnVsayA9IGtleSA9PSBudWxsO1xuXG5cdC8vIFNldHMgbWFueSB2YWx1ZXNcblx0aWYgKCBqUXVlcnkudHlwZSgga2V5ICkgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0Y2hhaW5hYmxlID0gdHJ1ZTtcblx0XHRmb3IgKCBpIGluIGtleSApIHtcblx0XHRcdGpRdWVyeS5hY2Nlc3MoIGVsZW1zLCBmbiwgaSwga2V5W2ldLCB0cnVlLCBlbXB0eUdldCwgcmF3ICk7XG5cdFx0fVxuXG5cdC8vIFNldHMgb25lIHZhbHVlXG5cdH0gZWxzZSBpZiAoIHZhbHVlICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0Y2hhaW5hYmxlID0gdHJ1ZTtcblxuXHRcdGlmICggIWpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApICkge1xuXHRcdFx0cmF3ID0gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoIGJ1bGsgKSB7XG5cdFx0XHQvLyBCdWxrIG9wZXJhdGlvbnMgcnVuIGFnYWluc3QgdGhlIGVudGlyZSBzZXRcblx0XHRcdGlmICggcmF3ICkge1xuXHRcdFx0XHRmbi5jYWxsKCBlbGVtcywgdmFsdWUgKTtcblx0XHRcdFx0Zm4gPSBudWxsO1xuXG5cdFx0XHQvLyAuLi5leGNlcHQgd2hlbiBleGVjdXRpbmcgZnVuY3Rpb24gdmFsdWVzXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRidWxrID0gZm47XG5cdFx0XHRcdGZuID0gZnVuY3Rpb24oIGVsZW0sIGtleSwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGJ1bGsuY2FsbCggalF1ZXJ5KCBlbGVtICksIHZhbHVlICk7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCBmbiApIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRmbiggZWxlbXNbaV0sIGtleSwgcmF3ID8gdmFsdWUgOiB2YWx1ZS5jYWxsKCBlbGVtc1tpXSwgaSwgZm4oIGVsZW1zW2ldLCBrZXkgKSApICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNoYWluYWJsZSA/XG5cdFx0ZWxlbXMgOlxuXG5cdFx0Ly8gR2V0c1xuXHRcdGJ1bGsgP1xuXHRcdFx0Zm4uY2FsbCggZWxlbXMgKSA6XG5cdFx0XHRsZW5ndGggPyBmbiggZWxlbXNbMF0sIGtleSApIDogZW1wdHlHZXQ7XG59O1xudmFyIHJjaGVja2FibGVUeXBlID0gKC9eKD86Y2hlY2tib3h8cmFkaW8pJC9pKTtcblxuXG5cbihmdW5jdGlvbigpIHtcblx0Ly8gTWluaWZpZWQ6IHZhciBhLGIsY1xuXHR2YXIgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImlucHV0XCIgKSxcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImRpdlwiICksXG5cdFx0ZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cblx0Ly8gU2V0dXBcblx0ZGl2LmlubmVySFRNTCA9IFwiICA8bGluay8+PHRhYmxlPjwvdGFibGU+PGEgaHJlZj0nL2EnPmE8L2E+PGlucHV0IHR5cGU9J2NoZWNrYm94Jy8+XCI7XG5cblx0Ly8gSUUgc3RyaXBzIGxlYWRpbmcgd2hpdGVzcGFjZSB3aGVuIC5pbm5lckhUTUwgaXMgdXNlZFxuXHRzdXBwb3J0LmxlYWRpbmdXaGl0ZXNwYWNlID0gZGl2LmZpcnN0Q2hpbGQubm9kZVR5cGUgPT09IDM7XG5cblx0Ly8gTWFrZSBzdXJlIHRoYXQgdGJvZHkgZWxlbWVudHMgYXJlbid0IGF1dG9tYXRpY2FsbHkgaW5zZXJ0ZWRcblx0Ly8gSUUgd2lsbCBpbnNlcnQgdGhlbSBpbnRvIGVtcHR5IHRhYmxlc1xuXHRzdXBwb3J0LnRib2R5ID0gIWRpdi5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJ0Ym9keVwiICkubGVuZ3RoO1xuXG5cdC8vIE1ha2Ugc3VyZSB0aGF0IGxpbmsgZWxlbWVudHMgZ2V0IHNlcmlhbGl6ZWQgY29ycmVjdGx5IGJ5IGlubmVySFRNTFxuXHQvLyBUaGlzIHJlcXVpcmVzIGEgd3JhcHBlciBlbGVtZW50IGluIElFXG5cdHN1cHBvcnQuaHRtbFNlcmlhbGl6ZSA9ICEhZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcImxpbmtcIiApLmxlbmd0aDtcblxuXHQvLyBNYWtlcyBzdXJlIGNsb25pbmcgYW4gaHRtbDUgZWxlbWVudCBkb2VzIG5vdCBjYXVzZSBwcm9ibGVtc1xuXHQvLyBXaGVyZSBvdXRlckhUTUwgaXMgdW5kZWZpbmVkLCB0aGlzIHN0aWxsIHdvcmtzXG5cdHN1cHBvcnQuaHRtbDVDbG9uZSA9XG5cdFx0ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJuYXZcIiApLmNsb25lTm9kZSggdHJ1ZSApLm91dGVySFRNTCAhPT0gXCI8Om5hdj48LzpuYXY+XCI7XG5cblx0Ly8gQ2hlY2sgaWYgYSBkaXNjb25uZWN0ZWQgY2hlY2tib3ggd2lsbCByZXRhaW4gaXRzIGNoZWNrZWRcblx0Ly8gdmFsdWUgb2YgdHJ1ZSBhZnRlciBhcHBlbmRlZCB0byB0aGUgRE9NIChJRTYvNylcblx0aW5wdXQudHlwZSA9IFwiY2hlY2tib3hcIjtcblx0aW5wdXQuY2hlY2tlZCA9IHRydWU7XG5cdGZyYWdtZW50LmFwcGVuZENoaWxkKCBpbnB1dCApO1xuXHRzdXBwb3J0LmFwcGVuZENoZWNrZWQgPSBpbnB1dC5jaGVja2VkO1xuXG5cdC8vIE1ha2Ugc3VyZSB0ZXh0YXJlYSAoYW5kIGNoZWNrYm94KSBkZWZhdWx0VmFsdWUgaXMgcHJvcGVybHkgY2xvbmVkXG5cdC8vIFN1cHBvcnQ6IElFNi1JRTExK1xuXHRkaXYuaW5uZXJIVE1MID0gXCI8dGV4dGFyZWE+eDwvdGV4dGFyZWE+XCI7XG5cdHN1cHBvcnQubm9DbG9uZUNoZWNrZWQgPSAhIWRpdi5jbG9uZU5vZGUoIHRydWUgKS5sYXN0Q2hpbGQuZGVmYXVsdFZhbHVlO1xuXG5cdC8vICMxMTIxNyAtIFdlYktpdCBsb3NlcyBjaGVjayB3aGVuIHRoZSBuYW1lIGlzIGFmdGVyIHRoZSBjaGVja2VkIGF0dHJpYnV0ZVxuXHRmcmFnbWVudC5hcHBlbmRDaGlsZCggZGl2ICk7XG5cdGRpdi5pbm5lckhUTUwgPSBcIjxpbnB1dCB0eXBlPSdyYWRpbycgY2hlY2tlZD0nY2hlY2tlZCcgbmFtZT0ndCcvPlwiO1xuXG5cdC8vIFN1cHBvcnQ6IFNhZmFyaSA1LjEsIGlPUyA1LjEsIEFuZHJvaWQgNC54LCBBbmRyb2lkIDIuM1xuXHQvLyBvbGQgV2ViS2l0IGRvZXNuJ3QgY2xvbmUgY2hlY2tlZCBzdGF0ZSBjb3JyZWN0bHkgaW4gZnJhZ21lbnRzXG5cdHN1cHBvcnQuY2hlY2tDbG9uZSA9IGRpdi5jbG9uZU5vZGUoIHRydWUgKS5jbG9uZU5vZGUoIHRydWUgKS5sYXN0Q2hpbGQuY2hlY2tlZDtcblxuXHQvLyBTdXBwb3J0OiBJRTw5XG5cdC8vIE9wZXJhIGRvZXMgbm90IGNsb25lIGV2ZW50cyAoYW5kIHR5cGVvZiBkaXYuYXR0YWNoRXZlbnQgPT09IHVuZGVmaW5lZCkuXG5cdC8vIElFOS0xMCBjbG9uZXMgZXZlbnRzIGJvdW5kIHZpYSBhdHRhY2hFdmVudCwgYnV0IHRoZXkgZG9uJ3QgdHJpZ2dlciB3aXRoIC5jbGljaygpXG5cdHN1cHBvcnQubm9DbG9uZUV2ZW50ID0gdHJ1ZTtcblx0aWYgKCBkaXYuYXR0YWNoRXZlbnQgKSB7XG5cdFx0ZGl2LmF0dGFjaEV2ZW50KCBcIm9uY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzdXBwb3J0Lm5vQ2xvbmVFdmVudCA9IGZhbHNlO1xuXHRcdH0pO1xuXG5cdFx0ZGl2LmNsb25lTm9kZSggdHJ1ZSApLmNsaWNrKCk7XG5cdH1cblxuXHQvLyBFeGVjdXRlIHRoZSB0ZXN0IG9ubHkgaWYgbm90IGFscmVhZHkgZXhlY3V0ZWQgaW4gYW5vdGhlciBtb2R1bGUuXG5cdGlmIChzdXBwb3J0LmRlbGV0ZUV4cGFuZG8gPT0gbnVsbCkge1xuXHRcdC8vIFN1cHBvcnQ6IElFPDlcblx0XHRzdXBwb3J0LmRlbGV0ZUV4cGFuZG8gPSB0cnVlO1xuXHRcdHRyeSB7XG5cdFx0XHRkZWxldGUgZGl2LnRlc3Q7XG5cdFx0fSBjYXRjaCggZSApIHtcblx0XHRcdHN1cHBvcnQuZGVsZXRlRXhwYW5kbyA9IGZhbHNlO1xuXHRcdH1cblx0fVxufSkoKTtcblxuXG4oZnVuY3Rpb24oKSB7XG5cdHZhciBpLCBldmVudE5hbWUsXG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJkaXZcIiApO1xuXG5cdC8vIFN1cHBvcnQ6IElFPDkgKGxhY2sgc3VibWl0L2NoYW5nZSBidWJibGUpLCBGaXJlZm94IDIzKyAobGFjayBmb2N1c2luIGV2ZW50KVxuXHRmb3IgKCBpIGluIHsgc3VibWl0OiB0cnVlLCBjaGFuZ2U6IHRydWUsIGZvY3VzaW46IHRydWUgfSkge1xuXHRcdGV2ZW50TmFtZSA9IFwib25cIiArIGk7XG5cblx0XHRpZiAoICEoc3VwcG9ydFsgaSArIFwiQnViYmxlc1wiIF0gPSBldmVudE5hbWUgaW4gd2luZG93KSApIHtcblx0XHRcdC8vIEJld2FyZSBvZiBDU1AgcmVzdHJpY3Rpb25zIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9TZWN1cml0eS9DU1ApXG5cdFx0XHRkaXYuc2V0QXR0cmlidXRlKCBldmVudE5hbWUsIFwidFwiICk7XG5cdFx0XHRzdXBwb3J0WyBpICsgXCJCdWJibGVzXCIgXSA9IGRpdi5hdHRyaWJ1dGVzWyBldmVudE5hbWUgXS5leHBhbmRvID09PSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHQvLyBOdWxsIGVsZW1lbnRzIHRvIGF2b2lkIGxlYWtzIGluIElFLlxuXHRkaXYgPSBudWxsO1xufSkoKTtcblxuXG52YXIgcmZvcm1FbGVtcyA9IC9eKD86aW5wdXR8c2VsZWN0fHRleHRhcmVhKSQvaSxcblx0cmtleUV2ZW50ID0gL15rZXkvLFxuXHRybW91c2VFdmVudCA9IC9eKD86bW91c2V8cG9pbnRlcnxjb250ZXh0bWVudSl8Y2xpY2svLFxuXHRyZm9jdXNNb3JwaCA9IC9eKD86Zm9jdXNpbmZvY3VzfGZvY3Vzb3V0Ymx1cikkLyxcblx0cnR5cGVuYW1lc3BhY2UgPSAvXihbXi5dKikoPzpcXC4oLispfCkkLztcblxuZnVuY3Rpb24gcmV0dXJuVHJ1ZSgpIHtcblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJldHVybkZhbHNlKCkge1xuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNhZmVBY3RpdmVFbGVtZW50KCkge1xuXHR0cnkge1xuXHRcdHJldHVybiBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuXHR9IGNhdGNoICggZXJyICkgeyB9XG59XG5cbi8qXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBtYW5hZ2luZyBldmVudHMgLS0gbm90IHBhcnQgb2YgdGhlIHB1YmxpYyBpbnRlcmZhY2UuXG4gKiBQcm9wcyB0byBEZWFuIEVkd2FyZHMnIGFkZEV2ZW50IGxpYnJhcnkgZm9yIG1hbnkgb2YgdGhlIGlkZWFzLlxuICovXG5qUXVlcnkuZXZlbnQgPSB7XG5cblx0Z2xvYmFsOiB7fSxcblxuXHRhZGQ6IGZ1bmN0aW9uKCBlbGVtLCB0eXBlcywgaGFuZGxlciwgZGF0YSwgc2VsZWN0b3IgKSB7XG5cdFx0dmFyIHRtcCwgZXZlbnRzLCB0LCBoYW5kbGVPYmpJbixcblx0XHRcdHNwZWNpYWwsIGV2ZW50SGFuZGxlLCBoYW5kbGVPYmosXG5cdFx0XHRoYW5kbGVycywgdHlwZSwgbmFtZXNwYWNlcywgb3JpZ1R5cGUsXG5cdFx0XHRlbGVtRGF0YSA9IGpRdWVyeS5fZGF0YSggZWxlbSApO1xuXG5cdFx0Ly8gRG9uJ3QgYXR0YWNoIGV2ZW50cyB0byBub0RhdGEgb3IgdGV4dC9jb21tZW50IG5vZGVzIChidXQgYWxsb3cgcGxhaW4gb2JqZWN0cylcblx0XHRpZiAoICFlbGVtRGF0YSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBDYWxsZXIgY2FuIHBhc3MgaW4gYW4gb2JqZWN0IG9mIGN1c3RvbSBkYXRhIGluIGxpZXUgb2YgdGhlIGhhbmRsZXJcblx0XHRpZiAoIGhhbmRsZXIuaGFuZGxlciApIHtcblx0XHRcdGhhbmRsZU9iakluID0gaGFuZGxlcjtcblx0XHRcdGhhbmRsZXIgPSBoYW5kbGVPYmpJbi5oYW5kbGVyO1xuXHRcdFx0c2VsZWN0b3IgPSBoYW5kbGVPYmpJbi5zZWxlY3Rvcjtcblx0XHR9XG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCB0aGUgaGFuZGxlciBoYXMgYSB1bmlxdWUgSUQsIHVzZWQgdG8gZmluZC9yZW1vdmUgaXQgbGF0ZXJcblx0XHRpZiAoICFoYW5kbGVyLmd1aWQgKSB7XG5cdFx0XHRoYW5kbGVyLmd1aWQgPSBqUXVlcnkuZ3VpZCsrO1xuXHRcdH1cblxuXHRcdC8vIEluaXQgdGhlIGVsZW1lbnQncyBldmVudCBzdHJ1Y3R1cmUgYW5kIG1haW4gaGFuZGxlciwgaWYgdGhpcyBpcyB0aGUgZmlyc3Rcblx0XHRpZiAoICEoZXZlbnRzID0gZWxlbURhdGEuZXZlbnRzKSApIHtcblx0XHRcdGV2ZW50cyA9IGVsZW1EYXRhLmV2ZW50cyA9IHt9O1xuXHRcdH1cblx0XHRpZiAoICEoZXZlbnRIYW5kbGUgPSBlbGVtRGF0YS5oYW5kbGUpICkge1xuXHRcdFx0ZXZlbnRIYW5kbGUgPSBlbGVtRGF0YS5oYW5kbGUgPSBmdW5jdGlvbiggZSApIHtcblx0XHRcdFx0Ly8gRGlzY2FyZCB0aGUgc2Vjb25kIGV2ZW50IG9mIGEgalF1ZXJ5LmV2ZW50LnRyaWdnZXIoKSBhbmRcblx0XHRcdFx0Ly8gd2hlbiBhbiBldmVudCBpcyBjYWxsZWQgYWZ0ZXIgYSBwYWdlIGhhcyB1bmxvYWRlZFxuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIGpRdWVyeSAhPT0gc3RydW5kZWZpbmVkICYmICghZSB8fCBqUXVlcnkuZXZlbnQudHJpZ2dlcmVkICE9PSBlLnR5cGUpID9cblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQuZGlzcGF0Y2guYXBwbHkoIGV2ZW50SGFuZGxlLmVsZW0sIGFyZ3VtZW50cyApIDpcblx0XHRcdFx0XHR1bmRlZmluZWQ7XG5cdFx0XHR9O1xuXHRcdFx0Ly8gQWRkIGVsZW0gYXMgYSBwcm9wZXJ0eSBvZiB0aGUgaGFuZGxlIGZuIHRvIHByZXZlbnQgYSBtZW1vcnkgbGVhayB3aXRoIElFIG5vbi1uYXRpdmUgZXZlbnRzXG5cdFx0XHRldmVudEhhbmRsZS5lbGVtID0gZWxlbTtcblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgbXVsdGlwbGUgZXZlbnRzIHNlcGFyYXRlZCBieSBhIHNwYWNlXG5cdFx0dHlwZXMgPSAoIHR5cGVzIHx8IFwiXCIgKS5tYXRjaCggcm5vdHdoaXRlICkgfHwgWyBcIlwiIF07XG5cdFx0dCA9IHR5cGVzLmxlbmd0aDtcblx0XHR3aGlsZSAoIHQtLSApIHtcblx0XHRcdHRtcCA9IHJ0eXBlbmFtZXNwYWNlLmV4ZWMoIHR5cGVzW3RdICkgfHwgW107XG5cdFx0XHR0eXBlID0gb3JpZ1R5cGUgPSB0bXBbMV07XG5cdFx0XHRuYW1lc3BhY2VzID0gKCB0bXBbMl0gfHwgXCJcIiApLnNwbGl0KCBcIi5cIiApLnNvcnQoKTtcblxuXHRcdFx0Ly8gVGhlcmUgKm11c3QqIGJlIGEgdHlwZSwgbm8gYXR0YWNoaW5nIG5hbWVzcGFjZS1vbmx5IGhhbmRsZXJzXG5cdFx0XHRpZiAoICF0eXBlICkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgZXZlbnQgY2hhbmdlcyBpdHMgdHlwZSwgdXNlIHRoZSBzcGVjaWFsIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgY2hhbmdlZCB0eXBlXG5cdFx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWxbIHR5cGUgXSB8fCB7fTtcblxuXHRcdFx0Ly8gSWYgc2VsZWN0b3IgZGVmaW5lZCwgZGV0ZXJtaW5lIHNwZWNpYWwgZXZlbnQgYXBpIHR5cGUsIG90aGVyd2lzZSBnaXZlbiB0eXBlXG5cdFx0XHR0eXBlID0gKCBzZWxlY3RvciA/IHNwZWNpYWwuZGVsZWdhdGVUeXBlIDogc3BlY2lhbC5iaW5kVHlwZSApIHx8IHR5cGU7XG5cblx0XHRcdC8vIFVwZGF0ZSBzcGVjaWFsIGJhc2VkIG9uIG5ld2x5IHJlc2V0IHR5cGVcblx0XHRcdHNwZWNpYWwgPSBqUXVlcnkuZXZlbnQuc3BlY2lhbFsgdHlwZSBdIHx8IHt9O1xuXG5cdFx0XHQvLyBoYW5kbGVPYmogaXMgcGFzc2VkIHRvIGFsbCBldmVudCBoYW5kbGVyc1xuXHRcdFx0aGFuZGxlT2JqID0galF1ZXJ5LmV4dGVuZCh7XG5cdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdG9yaWdUeXBlOiBvcmlnVHlwZSxcblx0XHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdFx0aGFuZGxlcjogaGFuZGxlcixcblx0XHRcdFx0Z3VpZDogaGFuZGxlci5ndWlkLFxuXHRcdFx0XHRzZWxlY3Rvcjogc2VsZWN0b3IsXG5cdFx0XHRcdG5lZWRzQ29udGV4dDogc2VsZWN0b3IgJiYgalF1ZXJ5LmV4cHIubWF0Y2gubmVlZHNDb250ZXh0LnRlc3QoIHNlbGVjdG9yICksXG5cdFx0XHRcdG5hbWVzcGFjZTogbmFtZXNwYWNlcy5qb2luKFwiLlwiKVxuXHRcdFx0fSwgaGFuZGxlT2JqSW4gKTtcblxuXHRcdFx0Ly8gSW5pdCB0aGUgZXZlbnQgaGFuZGxlciBxdWV1ZSBpZiB3ZSdyZSB0aGUgZmlyc3Rcblx0XHRcdGlmICggIShoYW5kbGVycyA9IGV2ZW50c1sgdHlwZSBdKSApIHtcblx0XHRcdFx0aGFuZGxlcnMgPSBldmVudHNbIHR5cGUgXSA9IFtdO1xuXHRcdFx0XHRoYW5kbGVycy5kZWxlZ2F0ZUNvdW50ID0gMDtcblxuXHRcdFx0XHQvLyBPbmx5IHVzZSBhZGRFdmVudExpc3RlbmVyL2F0dGFjaEV2ZW50IGlmIHRoZSBzcGVjaWFsIGV2ZW50cyBoYW5kbGVyIHJldHVybnMgZmFsc2Vcblx0XHRcdFx0aWYgKCAhc3BlY2lhbC5zZXR1cCB8fCBzcGVjaWFsLnNldHVwLmNhbGwoIGVsZW0sIGRhdGEsIG5hbWVzcGFjZXMsIGV2ZW50SGFuZGxlICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdC8vIEJpbmQgdGhlIGdsb2JhbCBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG5cdFx0XHRcdFx0aWYgKCBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgKSB7XG5cdFx0XHRcdFx0XHRlbGVtLmFkZEV2ZW50TGlzdGVuZXIoIHR5cGUsIGV2ZW50SGFuZGxlLCBmYWxzZSApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggZWxlbS5hdHRhY2hFdmVudCApIHtcblx0XHRcdFx0XHRcdGVsZW0uYXR0YWNoRXZlbnQoIFwib25cIiArIHR5cGUsIGV2ZW50SGFuZGxlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggc3BlY2lhbC5hZGQgKSB7XG5cdFx0XHRcdHNwZWNpYWwuYWRkLmNhbGwoIGVsZW0sIGhhbmRsZU9iaiApO1xuXG5cdFx0XHRcdGlmICggIWhhbmRsZU9iai5oYW5kbGVyLmd1aWQgKSB7XG5cdFx0XHRcdFx0aGFuZGxlT2JqLmhhbmRsZXIuZ3VpZCA9IGhhbmRsZXIuZ3VpZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgdG8gdGhlIGVsZW1lbnQncyBoYW5kbGVyIGxpc3QsIGRlbGVnYXRlcyBpbiBmcm9udFxuXHRcdFx0aWYgKCBzZWxlY3RvciApIHtcblx0XHRcdFx0aGFuZGxlcnMuc3BsaWNlKCBoYW5kbGVycy5kZWxlZ2F0ZUNvdW50KyssIDAsIGhhbmRsZU9iaiApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aGFuZGxlcnMucHVzaCggaGFuZGxlT2JqICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEtlZXAgdHJhY2sgb2Ygd2hpY2ggZXZlbnRzIGhhdmUgZXZlciBiZWVuIHVzZWQsIGZvciBldmVudCBvcHRpbWl6YXRpb25cblx0XHRcdGpRdWVyeS5ldmVudC5nbG9iYWxbIHR5cGUgXSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gTnVsbGlmeSBlbGVtIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzIGluIElFXG5cdFx0ZWxlbSA9IG51bGw7XG5cdH0sXG5cblx0Ly8gRGV0YWNoIGFuIGV2ZW50IG9yIHNldCBvZiBldmVudHMgZnJvbSBhbiBlbGVtZW50XG5cdHJlbW92ZTogZnVuY3Rpb24oIGVsZW0sIHR5cGVzLCBoYW5kbGVyLCBzZWxlY3RvciwgbWFwcGVkVHlwZXMgKSB7XG5cdFx0dmFyIGosIGhhbmRsZU9iaiwgdG1wLFxuXHRcdFx0b3JpZ0NvdW50LCB0LCBldmVudHMsXG5cdFx0XHRzcGVjaWFsLCBoYW5kbGVycywgdHlwZSxcblx0XHRcdG5hbWVzcGFjZXMsIG9yaWdUeXBlLFxuXHRcdFx0ZWxlbURhdGEgPSBqUXVlcnkuaGFzRGF0YSggZWxlbSApICYmIGpRdWVyeS5fZGF0YSggZWxlbSApO1xuXG5cdFx0aWYgKCAhZWxlbURhdGEgfHwgIShldmVudHMgPSBlbGVtRGF0YS5ldmVudHMpICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIE9uY2UgZm9yIGVhY2ggdHlwZS5uYW1lc3BhY2UgaW4gdHlwZXM7IHR5cGUgbWF5IGJlIG9taXR0ZWRcblx0XHR0eXBlcyA9ICggdHlwZXMgfHwgXCJcIiApLm1hdGNoKCBybm90d2hpdGUgKSB8fCBbIFwiXCIgXTtcblx0XHR0ID0gdHlwZXMubGVuZ3RoO1xuXHRcdHdoaWxlICggdC0tICkge1xuXHRcdFx0dG1wID0gcnR5cGVuYW1lc3BhY2UuZXhlYyggdHlwZXNbdF0gKSB8fCBbXTtcblx0XHRcdHR5cGUgPSBvcmlnVHlwZSA9IHRtcFsxXTtcblx0XHRcdG5hbWVzcGFjZXMgPSAoIHRtcFsyXSB8fCBcIlwiICkuc3BsaXQoIFwiLlwiICkuc29ydCgpO1xuXG5cdFx0XHQvLyBVbmJpbmQgYWxsIGV2ZW50cyAob24gdGhpcyBuYW1lc3BhY2UsIGlmIHByb3ZpZGVkKSBmb3IgdGhlIGVsZW1lbnRcblx0XHRcdGlmICggIXR5cGUgKSB7XG5cdFx0XHRcdGZvciAoIHR5cGUgaW4gZXZlbnRzICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5yZW1vdmUoIGVsZW0sIHR5cGUgKyB0eXBlc1sgdCBdLCBoYW5kbGVyLCBzZWxlY3RvciwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWxbIHR5cGUgXSB8fCB7fTtcblx0XHRcdHR5cGUgPSAoIHNlbGVjdG9yID8gc3BlY2lhbC5kZWxlZ2F0ZVR5cGUgOiBzcGVjaWFsLmJpbmRUeXBlICkgfHwgdHlwZTtcblx0XHRcdGhhbmRsZXJzID0gZXZlbnRzWyB0eXBlIF0gfHwgW107XG5cdFx0XHR0bXAgPSB0bXBbMl0gJiYgbmV3IFJlZ0V4cCggXCIoXnxcXFxcLilcIiArIG5hbWVzcGFjZXMuam9pbihcIlxcXFwuKD86LipcXFxcLnwpXCIpICsgXCIoXFxcXC58JClcIiApO1xuXG5cdFx0XHQvLyBSZW1vdmUgbWF0Y2hpbmcgZXZlbnRzXG5cdFx0XHRvcmlnQ291bnQgPSBqID0gaGFuZGxlcnMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKCBqLS0gKSB7XG5cdFx0XHRcdGhhbmRsZU9iaiA9IGhhbmRsZXJzWyBqIF07XG5cblx0XHRcdFx0aWYgKCAoIG1hcHBlZFR5cGVzIHx8IG9yaWdUeXBlID09PSBoYW5kbGVPYmoub3JpZ1R5cGUgKSAmJlxuXHRcdFx0XHRcdCggIWhhbmRsZXIgfHwgaGFuZGxlci5ndWlkID09PSBoYW5kbGVPYmouZ3VpZCApICYmXG5cdFx0XHRcdFx0KCAhdG1wIHx8IHRtcC50ZXN0KCBoYW5kbGVPYmoubmFtZXNwYWNlICkgKSAmJlxuXHRcdFx0XHRcdCggIXNlbGVjdG9yIHx8IHNlbGVjdG9yID09PSBoYW5kbGVPYmouc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09IFwiKipcIiAmJiBoYW5kbGVPYmouc2VsZWN0b3IgKSApIHtcblx0XHRcdFx0XHRoYW5kbGVycy5zcGxpY2UoIGosIDEgKTtcblxuXHRcdFx0XHRcdGlmICggaGFuZGxlT2JqLnNlbGVjdG9yICkge1xuXHRcdFx0XHRcdFx0aGFuZGxlcnMuZGVsZWdhdGVDb3VudC0tO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHNwZWNpYWwucmVtb3ZlICkge1xuXHRcdFx0XHRcdFx0c3BlY2lhbC5yZW1vdmUuY2FsbCggZWxlbSwgaGFuZGxlT2JqICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlbW92ZSBnZW5lcmljIGV2ZW50IGhhbmRsZXIgaWYgd2UgcmVtb3ZlZCBzb21ldGhpbmcgYW5kIG5vIG1vcmUgaGFuZGxlcnMgZXhpc3Rcblx0XHRcdC8vIChhdm9pZHMgcG90ZW50aWFsIGZvciBlbmRsZXNzIHJlY3Vyc2lvbiBkdXJpbmcgcmVtb3ZhbCBvZiBzcGVjaWFsIGV2ZW50IGhhbmRsZXJzKVxuXHRcdFx0aWYgKCBvcmlnQ291bnQgJiYgIWhhbmRsZXJzLmxlbmd0aCApIHtcblx0XHRcdFx0aWYgKCAhc3BlY2lhbC50ZWFyZG93biB8fCBzcGVjaWFsLnRlYXJkb3duLmNhbGwoIGVsZW0sIG5hbWVzcGFjZXMsIGVsZW1EYXRhLmhhbmRsZSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRqUXVlcnkucmVtb3ZlRXZlbnQoIGVsZW0sIHR5cGUsIGVsZW1EYXRhLmhhbmRsZSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGVsZXRlIGV2ZW50c1sgdHlwZSBdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSB0aGUgZXhwYW5kbyBpZiBpdCdzIG5vIGxvbmdlciB1c2VkXG5cdFx0aWYgKCBqUXVlcnkuaXNFbXB0eU9iamVjdCggZXZlbnRzICkgKSB7XG5cdFx0XHRkZWxldGUgZWxlbURhdGEuaGFuZGxlO1xuXG5cdFx0XHQvLyByZW1vdmVEYXRhIGFsc28gY2hlY2tzIGZvciBlbXB0aW5lc3MgYW5kIGNsZWFycyB0aGUgZXhwYW5kbyBpZiBlbXB0eVxuXHRcdFx0Ly8gc28gdXNlIGl0IGluc3RlYWQgb2YgZGVsZXRlXG5cdFx0XHRqUXVlcnkuX3JlbW92ZURhdGEoIGVsZW0sIFwiZXZlbnRzXCIgKTtcblx0XHR9XG5cdH0sXG5cblx0dHJpZ2dlcjogZnVuY3Rpb24oIGV2ZW50LCBkYXRhLCBlbGVtLCBvbmx5SGFuZGxlcnMgKSB7XG5cdFx0dmFyIGhhbmRsZSwgb250eXBlLCBjdXIsXG5cdFx0XHRidWJibGVUeXBlLCBzcGVjaWFsLCB0bXAsIGksXG5cdFx0XHRldmVudFBhdGggPSBbIGVsZW0gfHwgZG9jdW1lbnQgXSxcblx0XHRcdHR5cGUgPSBoYXNPd24uY2FsbCggZXZlbnQsIFwidHlwZVwiICkgPyBldmVudC50eXBlIDogZXZlbnQsXG5cdFx0XHRuYW1lc3BhY2VzID0gaGFzT3duLmNhbGwoIGV2ZW50LCBcIm5hbWVzcGFjZVwiICkgPyBldmVudC5uYW1lc3BhY2Uuc3BsaXQoXCIuXCIpIDogW107XG5cblx0XHRjdXIgPSB0bXAgPSBlbGVtID0gZWxlbSB8fCBkb2N1bWVudDtcblxuXHRcdC8vIERvbid0IGRvIGV2ZW50cyBvbiB0ZXh0IGFuZCBjb21tZW50IG5vZGVzXG5cdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAzIHx8IGVsZW0ubm9kZVR5cGUgPT09IDggKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gZm9jdXMvYmx1ciBtb3JwaHMgdG8gZm9jdXNpbi9vdXQ7IGVuc3VyZSB3ZSdyZSBub3QgZmlyaW5nIHRoZW0gcmlnaHQgbm93XG5cdFx0aWYgKCByZm9jdXNNb3JwaC50ZXN0KCB0eXBlICsgalF1ZXJ5LmV2ZW50LnRyaWdnZXJlZCApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZS5pbmRleE9mKFwiLlwiKSA+PSAwICkge1xuXHRcdFx0Ly8gTmFtZXNwYWNlZCB0cmlnZ2VyOyBjcmVhdGUgYSByZWdleHAgdG8gbWF0Y2ggZXZlbnQgdHlwZSBpbiBoYW5kbGUoKVxuXHRcdFx0bmFtZXNwYWNlcyA9IHR5cGUuc3BsaXQoXCIuXCIpO1xuXHRcdFx0dHlwZSA9IG5hbWVzcGFjZXMuc2hpZnQoKTtcblx0XHRcdG5hbWVzcGFjZXMuc29ydCgpO1xuXHRcdH1cblx0XHRvbnR5cGUgPSB0eXBlLmluZGV4T2YoXCI6XCIpIDwgMCAmJiBcIm9uXCIgKyB0eXBlO1xuXG5cdFx0Ly8gQ2FsbGVyIGNhbiBwYXNzIGluIGEgalF1ZXJ5LkV2ZW50IG9iamVjdCwgT2JqZWN0LCBvciBqdXN0IGFuIGV2ZW50IHR5cGUgc3RyaW5nXG5cdFx0ZXZlbnQgPSBldmVudFsgalF1ZXJ5LmV4cGFuZG8gXSA/XG5cdFx0XHRldmVudCA6XG5cdFx0XHRuZXcgalF1ZXJ5LkV2ZW50KCB0eXBlLCB0eXBlb2YgZXZlbnQgPT09IFwib2JqZWN0XCIgJiYgZXZlbnQgKTtcblxuXHRcdC8vIFRyaWdnZXIgYml0bWFzazogJiAxIGZvciBuYXRpdmUgaGFuZGxlcnM7ICYgMiBmb3IgalF1ZXJ5IChhbHdheXMgdHJ1ZSlcblx0XHRldmVudC5pc1RyaWdnZXIgPSBvbmx5SGFuZGxlcnMgPyAyIDogMztcblx0XHRldmVudC5uYW1lc3BhY2UgPSBuYW1lc3BhY2VzLmpvaW4oXCIuXCIpO1xuXHRcdGV2ZW50Lm5hbWVzcGFjZV9yZSA9IGV2ZW50Lm5hbWVzcGFjZSA/XG5cdFx0XHRuZXcgUmVnRXhwKCBcIihefFxcXFwuKVwiICsgbmFtZXNwYWNlcy5qb2luKFwiXFxcXC4oPzouKlxcXFwufClcIikgKyBcIihcXFxcLnwkKVwiICkgOlxuXHRcdFx0bnVsbDtcblxuXHRcdC8vIENsZWFuIHVwIHRoZSBldmVudCBpbiBjYXNlIGl0IGlzIGJlaW5nIHJldXNlZFxuXHRcdGV2ZW50LnJlc3VsdCA9IHVuZGVmaW5lZDtcblx0XHRpZiAoICFldmVudC50YXJnZXQgKSB7XG5cdFx0XHRldmVudC50YXJnZXQgPSBlbGVtO1xuXHRcdH1cblxuXHRcdC8vIENsb25lIGFueSBpbmNvbWluZyBkYXRhIGFuZCBwcmVwZW5kIHRoZSBldmVudCwgY3JlYXRpbmcgdGhlIGhhbmRsZXIgYXJnIGxpc3Rcblx0XHRkYXRhID0gZGF0YSA9PSBudWxsID9cblx0XHRcdFsgZXZlbnQgXSA6XG5cdFx0XHRqUXVlcnkubWFrZUFycmF5KCBkYXRhLCBbIGV2ZW50IF0gKTtcblxuXHRcdC8vIEFsbG93IHNwZWNpYWwgZXZlbnRzIHRvIGRyYXcgb3V0c2lkZSB0aGUgbGluZXNcblx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWxbIHR5cGUgXSB8fCB7fTtcblx0XHRpZiAoICFvbmx5SGFuZGxlcnMgJiYgc3BlY2lhbC50cmlnZ2VyICYmIHNwZWNpYWwudHJpZ2dlci5hcHBseSggZWxlbSwgZGF0YSApID09PSBmYWxzZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBEZXRlcm1pbmUgZXZlbnQgcHJvcGFnYXRpb24gcGF0aCBpbiBhZHZhbmNlLCBwZXIgVzNDIGV2ZW50cyBzcGVjICgjOTk1MSlcblx0XHQvLyBCdWJibGUgdXAgdG8gZG9jdW1lbnQsIHRoZW4gdG8gd2luZG93OyB3YXRjaCBmb3IgYSBnbG9iYWwgb3duZXJEb2N1bWVudCB2YXIgKCM5NzI0KVxuXHRcdGlmICggIW9ubHlIYW5kbGVycyAmJiAhc3BlY2lhbC5ub0J1YmJsZSAmJiAhalF1ZXJ5LmlzV2luZG93KCBlbGVtICkgKSB7XG5cblx0XHRcdGJ1YmJsZVR5cGUgPSBzcGVjaWFsLmRlbGVnYXRlVHlwZSB8fCB0eXBlO1xuXHRcdFx0aWYgKCAhcmZvY3VzTW9ycGgudGVzdCggYnViYmxlVHlwZSArIHR5cGUgKSApIHtcblx0XHRcdFx0Y3VyID0gY3VyLnBhcmVudE5vZGU7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKCA7IGN1cjsgY3VyID0gY3VyLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdGV2ZW50UGF0aC5wdXNoKCBjdXIgKTtcblx0XHRcdFx0dG1wID0gY3VyO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBPbmx5IGFkZCB3aW5kb3cgaWYgd2UgZ290IHRvIGRvY3VtZW50IChlLmcuLCBub3QgcGxhaW4gb2JqIG9yIGRldGFjaGVkIERPTSlcblx0XHRcdGlmICggdG1wID09PSAoZWxlbS5vd25lckRvY3VtZW50IHx8IGRvY3VtZW50KSApIHtcblx0XHRcdFx0ZXZlbnRQYXRoLnB1c2goIHRtcC5kZWZhdWx0VmlldyB8fCB0bXAucGFyZW50V2luZG93IHx8IHdpbmRvdyApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEZpcmUgaGFuZGxlcnMgb24gdGhlIGV2ZW50IHBhdGhcblx0XHRpID0gMDtcblx0XHR3aGlsZSAoIChjdXIgPSBldmVudFBhdGhbaSsrXSkgJiYgIWV2ZW50LmlzUHJvcGFnYXRpb25TdG9wcGVkKCkgKSB7XG5cblx0XHRcdGV2ZW50LnR5cGUgPSBpID4gMSA/XG5cdFx0XHRcdGJ1YmJsZVR5cGUgOlxuXHRcdFx0XHRzcGVjaWFsLmJpbmRUeXBlIHx8IHR5cGU7XG5cblx0XHRcdC8vIGpRdWVyeSBoYW5kbGVyXG5cdFx0XHRoYW5kbGUgPSAoIGpRdWVyeS5fZGF0YSggY3VyLCBcImV2ZW50c1wiICkgfHwge30gKVsgZXZlbnQudHlwZSBdICYmIGpRdWVyeS5fZGF0YSggY3VyLCBcImhhbmRsZVwiICk7XG5cdFx0XHRpZiAoIGhhbmRsZSApIHtcblx0XHRcdFx0aGFuZGxlLmFwcGx5KCBjdXIsIGRhdGEgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTmF0aXZlIGhhbmRsZXJcblx0XHRcdGhhbmRsZSA9IG9udHlwZSAmJiBjdXJbIG9udHlwZSBdO1xuXHRcdFx0aWYgKCBoYW5kbGUgJiYgaGFuZGxlLmFwcGx5ICYmIGpRdWVyeS5hY2NlcHREYXRhKCBjdXIgKSApIHtcblx0XHRcdFx0ZXZlbnQucmVzdWx0ID0gaGFuZGxlLmFwcGx5KCBjdXIsIGRhdGEgKTtcblx0XHRcdFx0aWYgKCBldmVudC5yZXN1bHQgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IHR5cGU7XG5cblx0XHQvLyBJZiBub2JvZHkgcHJldmVudGVkIHRoZSBkZWZhdWx0IGFjdGlvbiwgZG8gaXQgbm93XG5cdFx0aWYgKCAhb25seUhhbmRsZXJzICYmICFldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblxuXHRcdFx0aWYgKCAoIXNwZWNpYWwuX2RlZmF1bHQgfHwgc3BlY2lhbC5fZGVmYXVsdC5hcHBseSggZXZlbnRQYXRoLnBvcCgpLCBkYXRhICkgPT09IGZhbHNlKSAmJlxuXHRcdFx0XHRqUXVlcnkuYWNjZXB0RGF0YSggZWxlbSApICkge1xuXG5cdFx0XHRcdC8vIENhbGwgYSBuYXRpdmUgRE9NIG1ldGhvZCBvbiB0aGUgdGFyZ2V0IHdpdGggdGhlIHNhbWUgbmFtZSBuYW1lIGFzIHRoZSBldmVudC5cblx0XHRcdFx0Ly8gQ2FuJ3QgdXNlIGFuIC5pc0Z1bmN0aW9uKCkgY2hlY2sgaGVyZSBiZWNhdXNlIElFNi83IGZhaWxzIHRoYXQgdGVzdC5cblx0XHRcdFx0Ly8gRG9uJ3QgZG8gZGVmYXVsdCBhY3Rpb25zIG9uIHdpbmRvdywgdGhhdCdzIHdoZXJlIGdsb2JhbCB2YXJpYWJsZXMgYmUgKCM2MTcwKVxuXHRcdFx0XHRpZiAoIG9udHlwZSAmJiBlbGVtWyB0eXBlIF0gJiYgIWpRdWVyeS5pc1dpbmRvdyggZWxlbSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgcmUtdHJpZ2dlciBhbiBvbkZPTyBldmVudCB3aGVuIHdlIGNhbGwgaXRzIEZPTygpIG1ldGhvZFxuXHRcdFx0XHRcdHRtcCA9IGVsZW1bIG9udHlwZSBdO1xuXG5cdFx0XHRcdFx0aWYgKCB0bXAgKSB7XG5cdFx0XHRcdFx0XHRlbGVtWyBvbnR5cGUgXSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUHJldmVudCByZS10cmlnZ2VyaW5nIG9mIHRoZSBzYW1lIGV2ZW50LCBzaW5jZSB3ZSBhbHJlYWR5IGJ1YmJsZWQgaXQgYWJvdmVcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQudHJpZ2dlcmVkID0gdHlwZTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZWxlbVsgdHlwZSBdKCk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdFx0XHQvLyBJRTw5IGRpZXMgb24gZm9jdXMvYmx1ciB0byBoaWRkZW4gZWxlbWVudCAoIzE0ODYsIzEyNTE4KVxuXHRcdFx0XHRcdFx0Ly8gb25seSByZXByb2R1Y2libGUgb24gd2luWFAgSUU4IG5hdGl2ZSwgbm90IElFOSBpbiBJRTggbW9kZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQudHJpZ2dlcmVkID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdFx0aWYgKCB0bXAgKSB7XG5cdFx0XHRcdFx0XHRlbGVtWyBvbnR5cGUgXSA9IHRtcDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZXZlbnQucmVzdWx0O1xuXHR9LFxuXG5cdGRpc3BhdGNoOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHQvLyBNYWtlIGEgd3JpdGFibGUgalF1ZXJ5LkV2ZW50IGZyb20gdGhlIG5hdGl2ZSBldmVudCBvYmplY3Rcblx0XHRldmVudCA9IGpRdWVyeS5ldmVudC5maXgoIGV2ZW50ICk7XG5cblx0XHR2YXIgaSwgcmV0LCBoYW5kbGVPYmosIG1hdGNoZWQsIGosXG5cdFx0XHRoYW5kbGVyUXVldWUgPSBbXSxcblx0XHRcdGFyZ3MgPSBzbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdGhhbmRsZXJzID0gKCBqUXVlcnkuX2RhdGEoIHRoaXMsIFwiZXZlbnRzXCIgKSB8fCB7fSApWyBldmVudC50eXBlIF0gfHwgW10sXG5cdFx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWxbIGV2ZW50LnR5cGUgXSB8fCB7fTtcblxuXHRcdC8vIFVzZSB0aGUgZml4LWVkIGpRdWVyeS5FdmVudCByYXRoZXIgdGhhbiB0aGUgKHJlYWQtb25seSkgbmF0aXZlIGV2ZW50XG5cdFx0YXJnc1swXSA9IGV2ZW50O1xuXHRcdGV2ZW50LmRlbGVnYXRlVGFyZ2V0ID0gdGhpcztcblxuXHRcdC8vIENhbGwgdGhlIHByZURpc3BhdGNoIGhvb2sgZm9yIHRoZSBtYXBwZWQgdHlwZSwgYW5kIGxldCBpdCBiYWlsIGlmIGRlc2lyZWRcblx0XHRpZiAoIHNwZWNpYWwucHJlRGlzcGF0Y2ggJiYgc3BlY2lhbC5wcmVEaXNwYXRjaC5jYWxsKCB0aGlzLCBldmVudCApID09PSBmYWxzZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBEZXRlcm1pbmUgaGFuZGxlcnNcblx0XHRoYW5kbGVyUXVldWUgPSBqUXVlcnkuZXZlbnQuaGFuZGxlcnMuY2FsbCggdGhpcywgZXZlbnQsIGhhbmRsZXJzICk7XG5cblx0XHQvLyBSdW4gZGVsZWdhdGVzIGZpcnN0OyB0aGV5IG1heSB3YW50IHRvIHN0b3AgcHJvcGFnYXRpb24gYmVuZWF0aCB1c1xuXHRcdGkgPSAwO1xuXHRcdHdoaWxlICggKG1hdGNoZWQgPSBoYW5kbGVyUXVldWVbIGkrKyBdKSAmJiAhZXZlbnQuaXNQcm9wYWdhdGlvblN0b3BwZWQoKSApIHtcblx0XHRcdGV2ZW50LmN1cnJlbnRUYXJnZXQgPSBtYXRjaGVkLmVsZW07XG5cblx0XHRcdGogPSAwO1xuXHRcdFx0d2hpbGUgKCAoaGFuZGxlT2JqID0gbWF0Y2hlZC5oYW5kbGVyc1sgaisrIF0pICYmICFldmVudC5pc0ltbWVkaWF0ZVByb3BhZ2F0aW9uU3RvcHBlZCgpICkge1xuXG5cdFx0XHRcdC8vIFRyaWdnZXJlZCBldmVudCBtdXN0IGVpdGhlciAxKSBoYXZlIG5vIG5hbWVzcGFjZSwgb3Jcblx0XHRcdFx0Ly8gMikgaGF2ZSBuYW1lc3BhY2UocykgYSBzdWJzZXQgb3IgZXF1YWwgdG8gdGhvc2UgaW4gdGhlIGJvdW5kIGV2ZW50IChib3RoIGNhbiBoYXZlIG5vIG5hbWVzcGFjZSkuXG5cdFx0XHRcdGlmICggIWV2ZW50Lm5hbWVzcGFjZV9yZSB8fCBldmVudC5uYW1lc3BhY2VfcmUudGVzdCggaGFuZGxlT2JqLm5hbWVzcGFjZSApICkge1xuXG5cdFx0XHRcdFx0ZXZlbnQuaGFuZGxlT2JqID0gaGFuZGxlT2JqO1xuXHRcdFx0XHRcdGV2ZW50LmRhdGEgPSBoYW5kbGVPYmouZGF0YTtcblxuXHRcdFx0XHRcdHJldCA9ICggKGpRdWVyeS5ldmVudC5zcGVjaWFsWyBoYW5kbGVPYmoub3JpZ1R5cGUgXSB8fCB7fSkuaGFuZGxlIHx8IGhhbmRsZU9iai5oYW5kbGVyIClcblx0XHRcdFx0XHRcdFx0LmFwcGx5KCBtYXRjaGVkLmVsZW0sIGFyZ3MgKTtcblxuXHRcdFx0XHRcdGlmICggcmV0ICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIChldmVudC5yZXN1bHQgPSByZXQpID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQ2FsbCB0aGUgcG9zdERpc3BhdGNoIGhvb2sgZm9yIHRoZSBtYXBwZWQgdHlwZVxuXHRcdGlmICggc3BlY2lhbC5wb3N0RGlzcGF0Y2ggKSB7XG5cdFx0XHRzcGVjaWFsLnBvc3REaXNwYXRjaC5jYWxsKCB0aGlzLCBldmVudCApO1xuXHRcdH1cblxuXHRcdHJldHVybiBldmVudC5yZXN1bHQ7XG5cdH0sXG5cblx0aGFuZGxlcnM6IGZ1bmN0aW9uKCBldmVudCwgaGFuZGxlcnMgKSB7XG5cdFx0dmFyIHNlbCwgaGFuZGxlT2JqLCBtYXRjaGVzLCBpLFxuXHRcdFx0aGFuZGxlclF1ZXVlID0gW10sXG5cdFx0XHRkZWxlZ2F0ZUNvdW50ID0gaGFuZGxlcnMuZGVsZWdhdGVDb3VudCxcblx0XHRcdGN1ciA9IGV2ZW50LnRhcmdldDtcblxuXHRcdC8vIEZpbmQgZGVsZWdhdGUgaGFuZGxlcnNcblx0XHQvLyBCbGFjay1ob2xlIFNWRyA8dXNlPiBpbnN0YW5jZSB0cmVlcyAoIzEzMTgwKVxuXHRcdC8vIEF2b2lkIG5vbi1sZWZ0LWNsaWNrIGJ1YmJsaW5nIGluIEZpcmVmb3ggKCMzODYxKVxuXHRcdGlmICggZGVsZWdhdGVDb3VudCAmJiBjdXIubm9kZVR5cGUgJiYgKCFldmVudC5idXR0b24gfHwgZXZlbnQudHlwZSAhPT0gXCJjbGlja1wiKSApIHtcblxuXHRcdFx0LyoganNoaW50IGVxZXFlcTogZmFsc2UgKi9cblx0XHRcdGZvciAoIDsgY3VyICE9IHRoaXM7IGN1ciA9IGN1ci5wYXJlbnROb2RlIHx8IHRoaXMgKSB7XG5cdFx0XHRcdC8qIGpzaGludCBlcWVxZXE6IHRydWUgKi9cblxuXHRcdFx0XHQvLyBEb24ndCBjaGVjayBub24tZWxlbWVudHMgKCMxMzIwOClcblx0XHRcdFx0Ly8gRG9uJ3QgcHJvY2VzcyBjbGlja3Mgb24gZGlzYWJsZWQgZWxlbWVudHMgKCM2OTExLCAjODE2NSwgIzExMzgyLCAjMTE3NjQpXG5cdFx0XHRcdGlmICggY3VyLm5vZGVUeXBlID09PSAxICYmIChjdXIuZGlzYWJsZWQgIT09IHRydWUgfHwgZXZlbnQudHlwZSAhPT0gXCJjbGlja1wiKSApIHtcblx0XHRcdFx0XHRtYXRjaGVzID0gW107XG5cdFx0XHRcdFx0Zm9yICggaSA9IDA7IGkgPCBkZWxlZ2F0ZUNvdW50OyBpKysgKSB7XG5cdFx0XHRcdFx0XHRoYW5kbGVPYmogPSBoYW5kbGVyc1sgaSBdO1xuXG5cdFx0XHRcdFx0XHQvLyBEb24ndCBjb25mbGljdCB3aXRoIE9iamVjdC5wcm90b3R5cGUgcHJvcGVydGllcyAoIzEzMjAzKVxuXHRcdFx0XHRcdFx0c2VsID0gaGFuZGxlT2JqLnNlbGVjdG9yICsgXCIgXCI7XG5cblx0XHRcdFx0XHRcdGlmICggbWF0Y2hlc1sgc2VsIF0gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRcdFx0bWF0Y2hlc1sgc2VsIF0gPSBoYW5kbGVPYmoubmVlZHNDb250ZXh0ID9cblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkoIHNlbCwgdGhpcyApLmluZGV4KCBjdXIgKSA+PSAwIDpcblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkuZmluZCggc2VsLCB0aGlzLCBudWxsLCBbIGN1ciBdICkubGVuZ3RoO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCBtYXRjaGVzWyBzZWwgXSApIHtcblx0XHRcdFx0XHRcdFx0bWF0Y2hlcy5wdXNoKCBoYW5kbGVPYmogKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCBtYXRjaGVzLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGhhbmRsZXJRdWV1ZS5wdXNoKHsgZWxlbTogY3VyLCBoYW5kbGVyczogbWF0Y2hlcyB9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBBZGQgdGhlIHJlbWFpbmluZyAoZGlyZWN0bHktYm91bmQpIGhhbmRsZXJzXG5cdFx0aWYgKCBkZWxlZ2F0ZUNvdW50IDwgaGFuZGxlcnMubGVuZ3RoICkge1xuXHRcdFx0aGFuZGxlclF1ZXVlLnB1c2goeyBlbGVtOiB0aGlzLCBoYW5kbGVyczogaGFuZGxlcnMuc2xpY2UoIGRlbGVnYXRlQ291bnQgKSB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gaGFuZGxlclF1ZXVlO1xuXHR9LFxuXG5cdGZpeDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGlmICggZXZlbnRbIGpRdWVyeS5leHBhbmRvIF0gKSB7XG5cdFx0XHRyZXR1cm4gZXZlbnQ7XG5cdFx0fVxuXG5cdFx0Ly8gQ3JlYXRlIGEgd3JpdGFibGUgY29weSBvZiB0aGUgZXZlbnQgb2JqZWN0IGFuZCBub3JtYWxpemUgc29tZSBwcm9wZXJ0aWVzXG5cdFx0dmFyIGksIHByb3AsIGNvcHksXG5cdFx0XHR0eXBlID0gZXZlbnQudHlwZSxcblx0XHRcdG9yaWdpbmFsRXZlbnQgPSBldmVudCxcblx0XHRcdGZpeEhvb2sgPSB0aGlzLmZpeEhvb2tzWyB0eXBlIF07XG5cblx0XHRpZiAoICFmaXhIb29rICkge1xuXHRcdFx0dGhpcy5maXhIb29rc1sgdHlwZSBdID0gZml4SG9vayA9XG5cdFx0XHRcdHJtb3VzZUV2ZW50LnRlc3QoIHR5cGUgKSA/IHRoaXMubW91c2VIb29rcyA6XG5cdFx0XHRcdHJrZXlFdmVudC50ZXN0KCB0eXBlICkgPyB0aGlzLmtleUhvb2tzIDpcblx0XHRcdFx0e307XG5cdFx0fVxuXHRcdGNvcHkgPSBmaXhIb29rLnByb3BzID8gdGhpcy5wcm9wcy5jb25jYXQoIGZpeEhvb2sucHJvcHMgKSA6IHRoaXMucHJvcHM7XG5cblx0XHRldmVudCA9IG5ldyBqUXVlcnkuRXZlbnQoIG9yaWdpbmFsRXZlbnQgKTtcblxuXHRcdGkgPSBjb3B5Lmxlbmd0aDtcblx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdHByb3AgPSBjb3B5WyBpIF07XG5cdFx0XHRldmVudFsgcHJvcCBdID0gb3JpZ2luYWxFdmVudFsgcHJvcCBdO1xuXHRcdH1cblxuXHRcdC8vIFN1cHBvcnQ6IElFPDlcblx0XHQvLyBGaXggdGFyZ2V0IHByb3BlcnR5ICgjMTkyNSlcblx0XHRpZiAoICFldmVudC50YXJnZXQgKSB7XG5cdFx0XHRldmVudC50YXJnZXQgPSBvcmlnaW5hbEV2ZW50LnNyY0VsZW1lbnQgfHwgZG9jdW1lbnQ7XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydDogQ2hyb21lIDIzKywgU2FmYXJpP1xuXHRcdC8vIFRhcmdldCBzaG91bGQgbm90IGJlIGEgdGV4dCBub2RlICgjNTA0LCAjMTMxNDMpXG5cdFx0aWYgKCBldmVudC50YXJnZXQubm9kZVR5cGUgPT09IDMgKSB7XG5cdFx0XHRldmVudC50YXJnZXQgPSBldmVudC50YXJnZXQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHQvLyBTdXBwb3J0OiBJRTw5XG5cdFx0Ly8gRm9yIG1vdXNlL2tleSBldmVudHMsIG1ldGFLZXk9PWZhbHNlIGlmIGl0J3MgdW5kZWZpbmVkICgjMzM2OCwgIzExMzI4KVxuXHRcdGV2ZW50Lm1ldGFLZXkgPSAhIWV2ZW50Lm1ldGFLZXk7XG5cblx0XHRyZXR1cm4gZml4SG9vay5maWx0ZXIgPyBmaXhIb29rLmZpbHRlciggZXZlbnQsIG9yaWdpbmFsRXZlbnQgKSA6IGV2ZW50O1xuXHR9LFxuXG5cdC8vIEluY2x1ZGVzIHNvbWUgZXZlbnQgcHJvcHMgc2hhcmVkIGJ5IEtleUV2ZW50IGFuZCBNb3VzZUV2ZW50XG5cdHByb3BzOiBcImFsdEtleSBidWJibGVzIGNhbmNlbGFibGUgY3RybEtleSBjdXJyZW50VGFyZ2V0IGV2ZW50UGhhc2UgbWV0YUtleSByZWxhdGVkVGFyZ2V0IHNoaWZ0S2V5IHRhcmdldCB0aW1lU3RhbXAgdmlldyB3aGljaFwiLnNwbGl0KFwiIFwiKSxcblxuXHRmaXhIb29rczoge30sXG5cblx0a2V5SG9va3M6IHtcblx0XHRwcm9wczogXCJjaGFyIGNoYXJDb2RlIGtleSBrZXlDb2RlXCIuc3BsaXQoXCIgXCIpLFxuXHRcdGZpbHRlcjogZnVuY3Rpb24oIGV2ZW50LCBvcmlnaW5hbCApIHtcblxuXHRcdFx0Ly8gQWRkIHdoaWNoIGZvciBrZXkgZXZlbnRzXG5cdFx0XHRpZiAoIGV2ZW50LndoaWNoID09IG51bGwgKSB7XG5cdFx0XHRcdGV2ZW50LndoaWNoID0gb3JpZ2luYWwuY2hhckNvZGUgIT0gbnVsbCA/IG9yaWdpbmFsLmNoYXJDb2RlIDogb3JpZ2luYWwua2V5Q29kZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGV2ZW50O1xuXHRcdH1cblx0fSxcblxuXHRtb3VzZUhvb2tzOiB7XG5cdFx0cHJvcHM6IFwiYnV0dG9uIGJ1dHRvbnMgY2xpZW50WCBjbGllbnRZIGZyb21FbGVtZW50IG9mZnNldFggb2Zmc2V0WSBwYWdlWCBwYWdlWSBzY3JlZW5YIHNjcmVlblkgdG9FbGVtZW50XCIuc3BsaXQoXCIgXCIpLFxuXHRcdGZpbHRlcjogZnVuY3Rpb24oIGV2ZW50LCBvcmlnaW5hbCApIHtcblx0XHRcdHZhciBib2R5LCBldmVudERvYywgZG9jLFxuXHRcdFx0XHRidXR0b24gPSBvcmlnaW5hbC5idXR0b24sXG5cdFx0XHRcdGZyb21FbGVtZW50ID0gb3JpZ2luYWwuZnJvbUVsZW1lbnQ7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBwYWdlWC9ZIGlmIG1pc3NpbmcgYW5kIGNsaWVudFgvWSBhdmFpbGFibGVcblx0XHRcdGlmICggZXZlbnQucGFnZVggPT0gbnVsbCAmJiBvcmlnaW5hbC5jbGllbnRYICE9IG51bGwgKSB7XG5cdFx0XHRcdGV2ZW50RG9jID0gZXZlbnQudGFyZ2V0Lm93bmVyRG9jdW1lbnQgfHwgZG9jdW1lbnQ7XG5cdFx0XHRcdGRvYyA9IGV2ZW50RG9jLmRvY3VtZW50RWxlbWVudDtcblx0XHRcdFx0Ym9keSA9IGV2ZW50RG9jLmJvZHk7XG5cblx0XHRcdFx0ZXZlbnQucGFnZVggPSBvcmlnaW5hbC5jbGllbnRYICsgKCBkb2MgJiYgZG9jLnNjcm9sbExlZnQgfHwgYm9keSAmJiBib2R5LnNjcm9sbExlZnQgfHwgMCApIC0gKCBkb2MgJiYgZG9jLmNsaWVudExlZnQgfHwgYm9keSAmJiBib2R5LmNsaWVudExlZnQgfHwgMCApO1xuXHRcdFx0XHRldmVudC5wYWdlWSA9IG9yaWdpbmFsLmNsaWVudFkgKyAoIGRvYyAmJiBkb2Muc2Nyb2xsVG9wICB8fCBib2R5ICYmIGJvZHkuc2Nyb2xsVG9wICB8fCAwICkgLSAoIGRvYyAmJiBkb2MuY2xpZW50VG9wICB8fCBib2R5ICYmIGJvZHkuY2xpZW50VG9wICB8fCAwICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCByZWxhdGVkVGFyZ2V0LCBpZiBuZWNlc3Nhcnlcblx0XHRcdGlmICggIWV2ZW50LnJlbGF0ZWRUYXJnZXQgJiYgZnJvbUVsZW1lbnQgKSB7XG5cdFx0XHRcdGV2ZW50LnJlbGF0ZWRUYXJnZXQgPSBmcm9tRWxlbWVudCA9PT0gZXZlbnQudGFyZ2V0ID8gb3JpZ2luYWwudG9FbGVtZW50IDogZnJvbUVsZW1lbnQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCB3aGljaCBmb3IgY2xpY2s6IDEgPT09IGxlZnQ7IDIgPT09IG1pZGRsZTsgMyA9PT0gcmlnaHRcblx0XHRcdC8vIE5vdGU6IGJ1dHRvbiBpcyBub3Qgbm9ybWFsaXplZCwgc28gZG9uJ3QgdXNlIGl0XG5cdFx0XHRpZiAoICFldmVudC53aGljaCAmJiBidXR0b24gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0ZXZlbnQud2hpY2ggPSAoIGJ1dHRvbiAmIDEgPyAxIDogKCBidXR0b24gJiAyID8gMyA6ICggYnV0dG9uICYgNCA/IDIgOiAwICkgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZXZlbnQ7XG5cdFx0fVxuXHR9LFxuXG5cdHNwZWNpYWw6IHtcblx0XHRsb2FkOiB7XG5cdFx0XHQvLyBQcmV2ZW50IHRyaWdnZXJlZCBpbWFnZS5sb2FkIGV2ZW50cyBmcm9tIGJ1YmJsaW5nIHRvIHdpbmRvdy5sb2FkXG5cdFx0XHRub0J1YmJsZTogdHJ1ZVxuXHRcdH0sXG5cdFx0Zm9jdXM6IHtcblx0XHRcdC8vIEZpcmUgbmF0aXZlIGV2ZW50IGlmIHBvc3NpYmxlIHNvIGJsdXIvZm9jdXMgc2VxdWVuY2UgaXMgY29ycmVjdFxuXHRcdFx0dHJpZ2dlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggdGhpcyAhPT0gc2FmZUFjdGl2ZUVsZW1lbnQoKSAmJiB0aGlzLmZvY3VzICkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHR0aGlzLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdFx0XHQvLyBTdXBwb3J0OiBJRTw5XG5cdFx0XHRcdFx0XHQvLyBJZiB3ZSBlcnJvciBvbiBmb2N1cyB0byBoaWRkZW4gZWxlbWVudCAoIzE0ODYsICMxMjUxOCksXG5cdFx0XHRcdFx0XHQvLyBsZXQgLnRyaWdnZXIoKSBydW4gdGhlIGhhbmRsZXJzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZGVsZWdhdGVUeXBlOiBcImZvY3VzaW5cIlxuXHRcdH0sXG5cdFx0Ymx1cjoge1xuXHRcdFx0dHJpZ2dlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggdGhpcyA9PT0gc2FmZUFjdGl2ZUVsZW1lbnQoKSAmJiB0aGlzLmJsdXIgKSB7XG5cdFx0XHRcdFx0dGhpcy5ibHVyKCk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZGVsZWdhdGVUeXBlOiBcImZvY3Vzb3V0XCJcblx0XHR9LFxuXHRcdGNsaWNrOiB7XG5cdFx0XHQvLyBGb3IgY2hlY2tib3gsIGZpcmUgbmF0aXZlIGV2ZW50IHNvIGNoZWNrZWQgc3RhdGUgd2lsbCBiZSByaWdodFxuXHRcdFx0dHJpZ2dlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggalF1ZXJ5Lm5vZGVOYW1lKCB0aGlzLCBcImlucHV0XCIgKSAmJiB0aGlzLnR5cGUgPT09IFwiY2hlY2tib3hcIiAmJiB0aGlzLmNsaWNrICkge1xuXHRcdFx0XHRcdHRoaXMuY2xpY2soKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8vIEZvciBjcm9zcy1icm93c2VyIGNvbnNpc3RlbmN5LCBkb24ndCBmaXJlIG5hdGl2ZSAuY2xpY2soKSBvbiBsaW5rc1xuXHRcdFx0X2RlZmF1bHQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0cmV0dXJuIGpRdWVyeS5ub2RlTmFtZSggZXZlbnQudGFyZ2V0LCBcImFcIiApO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRiZWZvcmV1bmxvYWQ6IHtcblx0XHRcdHBvc3REaXNwYXRjaDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXG5cdFx0XHRcdC8vIFN1cHBvcnQ6IEZpcmVmb3ggMjArXG5cdFx0XHRcdC8vIEZpcmVmb3ggZG9lc24ndCBhbGVydCBpZiB0aGUgcmV0dXJuVmFsdWUgZmllbGQgaXMgbm90IHNldC5cblx0XHRcdFx0aWYgKCBldmVudC5yZXN1bHQgIT09IHVuZGVmaW5lZCAmJiBldmVudC5vcmlnaW5hbEV2ZW50ICkge1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQucmV0dXJuVmFsdWUgPSBldmVudC5yZXN1bHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0c2ltdWxhdGU6IGZ1bmN0aW9uKCB0eXBlLCBlbGVtLCBldmVudCwgYnViYmxlICkge1xuXHRcdC8vIFBpZ2d5YmFjayBvbiBhIGRvbm9yIGV2ZW50IHRvIHNpbXVsYXRlIGEgZGlmZmVyZW50IG9uZS5cblx0XHQvLyBGYWtlIG9yaWdpbmFsRXZlbnQgdG8gYXZvaWQgZG9ub3IncyBzdG9wUHJvcGFnYXRpb24sIGJ1dCBpZiB0aGVcblx0XHQvLyBzaW11bGF0ZWQgZXZlbnQgcHJldmVudHMgZGVmYXVsdCB0aGVuIHdlIGRvIHRoZSBzYW1lIG9uIHRoZSBkb25vci5cblx0XHR2YXIgZSA9IGpRdWVyeS5leHRlbmQoXG5cdFx0XHRuZXcgalF1ZXJ5LkV2ZW50KCksXG5cdFx0XHRldmVudCxcblx0XHRcdHtcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0aXNTaW11bGF0ZWQ6IHRydWUsXG5cdFx0XHRcdG9yaWdpbmFsRXZlbnQ6IHt9XG5cdFx0XHR9XG5cdFx0KTtcblx0XHRpZiAoIGJ1YmJsZSApIHtcblx0XHRcdGpRdWVyeS5ldmVudC50cmlnZ2VyKCBlLCBudWxsLCBlbGVtICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGpRdWVyeS5ldmVudC5kaXNwYXRjaC5jYWxsKCBlbGVtLCBlICk7XG5cdFx0fVxuXHRcdGlmICggZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXHR9XG59O1xuXG5qUXVlcnkucmVtb3ZlRXZlbnQgPSBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyID9cblx0ZnVuY3Rpb24oIGVsZW0sIHR5cGUsIGhhbmRsZSApIHtcblx0XHRpZiAoIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lciApIHtcblx0XHRcdGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lciggdHlwZSwgaGFuZGxlLCBmYWxzZSApO1xuXHRcdH1cblx0fSA6XG5cdGZ1bmN0aW9uKCBlbGVtLCB0eXBlLCBoYW5kbGUgKSB7XG5cdFx0dmFyIG5hbWUgPSBcIm9uXCIgKyB0eXBlO1xuXG5cdFx0aWYgKCBlbGVtLmRldGFjaEV2ZW50ICkge1xuXG5cdFx0XHQvLyAjODU0NSwgIzcwNTQsIHByZXZlbnRpbmcgbWVtb3J5IGxlYWtzIGZvciBjdXN0b20gZXZlbnRzIGluIElFNi04XG5cdFx0XHQvLyBkZXRhY2hFdmVudCBuZWVkZWQgcHJvcGVydHkgb24gZWxlbWVudCwgYnkgbmFtZSBvZiB0aGF0IGV2ZW50LCB0byBwcm9wZXJseSBleHBvc2UgaXQgdG8gR0Ncblx0XHRcdGlmICggdHlwZW9mIGVsZW1bIG5hbWUgXSA9PT0gc3RydW5kZWZpbmVkICkge1xuXHRcdFx0XHRlbGVtWyBuYW1lIF0gPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtLmRldGFjaEV2ZW50KCBuYW1lLCBoYW5kbGUgKTtcblx0XHR9XG5cdH07XG5cbmpRdWVyeS5FdmVudCA9IGZ1bmN0aW9uKCBzcmMsIHByb3BzICkge1xuXHQvLyBBbGxvdyBpbnN0YW50aWF0aW9uIHdpdGhvdXQgdGhlICduZXcnIGtleXdvcmRcblx0aWYgKCAhKHRoaXMgaW5zdGFuY2VvZiBqUXVlcnkuRXZlbnQpICkge1xuXHRcdHJldHVybiBuZXcgalF1ZXJ5LkV2ZW50KCBzcmMsIHByb3BzICk7XG5cdH1cblxuXHQvLyBFdmVudCBvYmplY3Rcblx0aWYgKCBzcmMgJiYgc3JjLnR5cGUgKSB7XG5cdFx0dGhpcy5vcmlnaW5hbEV2ZW50ID0gc3JjO1xuXHRcdHRoaXMudHlwZSA9IHNyYy50eXBlO1xuXG5cdFx0Ly8gRXZlbnRzIGJ1YmJsaW5nIHVwIHRoZSBkb2N1bWVudCBtYXkgaGF2ZSBiZWVuIG1hcmtlZCBhcyBwcmV2ZW50ZWRcblx0XHQvLyBieSBhIGhhbmRsZXIgbG93ZXIgZG93biB0aGUgdHJlZTsgcmVmbGVjdCB0aGUgY29ycmVjdCB2YWx1ZS5cblx0XHR0aGlzLmlzRGVmYXVsdFByZXZlbnRlZCA9IHNyYy5kZWZhdWx0UHJldmVudGVkIHx8XG5cdFx0XHRcdHNyYy5kZWZhdWx0UHJldmVudGVkID09PSB1bmRlZmluZWQgJiZcblx0XHRcdFx0Ly8gU3VwcG9ydDogSUUgPCA5LCBBbmRyb2lkIDwgNC4wXG5cdFx0XHRcdHNyYy5yZXR1cm5WYWx1ZSA9PT0gZmFsc2UgP1xuXHRcdFx0cmV0dXJuVHJ1ZSA6XG5cdFx0XHRyZXR1cm5GYWxzZTtcblxuXHQvLyBFdmVudCB0eXBlXG5cdH0gZWxzZSB7XG5cdFx0dGhpcy50eXBlID0gc3JjO1xuXHR9XG5cblx0Ly8gUHV0IGV4cGxpY2l0bHkgcHJvdmlkZWQgcHJvcGVydGllcyBvbnRvIHRoZSBldmVudCBvYmplY3Rcblx0aWYgKCBwcm9wcyApIHtcblx0XHRqUXVlcnkuZXh0ZW5kKCB0aGlzLCBwcm9wcyApO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgdGltZXN0YW1wIGlmIGluY29taW5nIGV2ZW50IGRvZXNuJ3QgaGF2ZSBvbmVcblx0dGhpcy50aW1lU3RhbXAgPSBzcmMgJiYgc3JjLnRpbWVTdGFtcCB8fCBqUXVlcnkubm93KCk7XG5cblx0Ly8gTWFyayBpdCBhcyBmaXhlZFxuXHR0aGlzWyBqUXVlcnkuZXhwYW5kbyBdID0gdHJ1ZTtcbn07XG5cbi8vIGpRdWVyeS5FdmVudCBpcyBiYXNlZCBvbiBET00zIEV2ZW50cyBhcyBzcGVjaWZpZWQgYnkgdGhlIEVDTUFTY3JpcHQgTGFuZ3VhZ2UgQmluZGluZ1xuLy8gaHR0cDovL3d3dy53My5vcmcvVFIvMjAwMy9XRC1ET00tTGV2ZWwtMy1FdmVudHMtMjAwMzAzMzEvZWNtYS1zY3JpcHQtYmluZGluZy5odG1sXG5qUXVlcnkuRXZlbnQucHJvdG90eXBlID0ge1xuXHRpc0RlZmF1bHRQcmV2ZW50ZWQ6IHJldHVybkZhbHNlLFxuXHRpc1Byb3BhZ2F0aW9uU3RvcHBlZDogcmV0dXJuRmFsc2UsXG5cdGlzSW1tZWRpYXRlUHJvcGFnYXRpb25TdG9wcGVkOiByZXR1cm5GYWxzZSxcblxuXHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGUgPSB0aGlzLm9yaWdpbmFsRXZlbnQ7XG5cblx0XHR0aGlzLmlzRGVmYXVsdFByZXZlbnRlZCA9IHJldHVyblRydWU7XG5cdFx0aWYgKCAhZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBJZiBwcmV2ZW50RGVmYXVsdCBleGlzdHMsIHJ1biBpdCBvbiB0aGUgb3JpZ2luYWwgZXZlbnRcblx0XHRpZiAoIGUucHJldmVudERlZmF1bHQgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHQvLyBTdXBwb3J0OiBJRVxuXHRcdC8vIE90aGVyd2lzZSBzZXQgdGhlIHJldHVyblZhbHVlIHByb3BlcnR5IG9mIHRoZSBvcmlnaW5hbCBldmVudCB0byBmYWxzZVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRlLnJldHVyblZhbHVlID0gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXHRzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBlID0gdGhpcy5vcmlnaW5hbEV2ZW50O1xuXG5cdFx0dGhpcy5pc1Byb3BhZ2F0aW9uU3RvcHBlZCA9IHJldHVyblRydWU7XG5cdFx0aWYgKCAhZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly8gSWYgc3RvcFByb3BhZ2F0aW9uIGV4aXN0cywgcnVuIGl0IG9uIHRoZSBvcmlnaW5hbCBldmVudFxuXHRcdGlmICggZS5zdG9wUHJvcGFnYXRpb24gKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblxuXHRcdC8vIFN1cHBvcnQ6IElFXG5cdFx0Ly8gU2V0IHRoZSBjYW5jZWxCdWJibGUgcHJvcGVydHkgb2YgdGhlIG9yaWdpbmFsIGV2ZW50IHRvIHRydWVcblx0XHRlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG5cdH0sXG5cdHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGUgPSB0aGlzLm9yaWdpbmFsRXZlbnQ7XG5cblx0XHR0aGlzLmlzSW1tZWRpYXRlUHJvcGFnYXRpb25TdG9wcGVkID0gcmV0dXJuVHJ1ZTtcblxuXHRcdGlmICggZSAmJiBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiApIHtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zdG9wUHJvcGFnYXRpb24oKTtcblx0fVxufTtcblxuLy8gQ3JlYXRlIG1vdXNlZW50ZXIvbGVhdmUgZXZlbnRzIHVzaW5nIG1vdXNlb3Zlci9vdXQgYW5kIGV2ZW50LXRpbWUgY2hlY2tzXG5qUXVlcnkuZWFjaCh7XG5cdG1vdXNlZW50ZXI6IFwibW91c2VvdmVyXCIsXG5cdG1vdXNlbGVhdmU6IFwibW91c2VvdXRcIixcblx0cG9pbnRlcmVudGVyOiBcInBvaW50ZXJvdmVyXCIsXG5cdHBvaW50ZXJsZWF2ZTogXCJwb2ludGVyb3V0XCJcbn0sIGZ1bmN0aW9uKCBvcmlnLCBmaXggKSB7XG5cdGpRdWVyeS5ldmVudC5zcGVjaWFsWyBvcmlnIF0gPSB7XG5cdFx0ZGVsZWdhdGVUeXBlOiBmaXgsXG5cdFx0YmluZFR5cGU6IGZpeCxcblxuXHRcdGhhbmRsZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHJldCxcblx0XHRcdFx0dGFyZ2V0ID0gdGhpcyxcblx0XHRcdFx0cmVsYXRlZCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQsXG5cdFx0XHRcdGhhbmRsZU9iaiA9IGV2ZW50LmhhbmRsZU9iajtcblxuXHRcdFx0Ly8gRm9yIG1vdXNlbnRlci9sZWF2ZSBjYWxsIHRoZSBoYW5kbGVyIGlmIHJlbGF0ZWQgaXMgb3V0c2lkZSB0aGUgdGFyZ2V0LlxuXHRcdFx0Ly8gTkI6IE5vIHJlbGF0ZWRUYXJnZXQgaWYgdGhlIG1vdXNlIGxlZnQvZW50ZXJlZCB0aGUgYnJvd3NlciB3aW5kb3dcblx0XHRcdGlmICggIXJlbGF0ZWQgfHwgKHJlbGF0ZWQgIT09IHRhcmdldCAmJiAhalF1ZXJ5LmNvbnRhaW5zKCB0YXJnZXQsIHJlbGF0ZWQgKSkgKSB7XG5cdFx0XHRcdGV2ZW50LnR5cGUgPSBoYW5kbGVPYmoub3JpZ1R5cGU7XG5cdFx0XHRcdHJldCA9IGhhbmRsZU9iai5oYW5kbGVyLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0ZXZlbnQudHlwZSA9IGZpeDtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fVxuXHR9O1xufSk7XG5cbi8vIElFIHN1Ym1pdCBkZWxlZ2F0aW9uXG5pZiAoICFzdXBwb3J0LnN1Ym1pdEJ1YmJsZXMgKSB7XG5cblx0alF1ZXJ5LmV2ZW50LnNwZWNpYWwuc3VibWl0ID0ge1xuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIE9ubHkgbmVlZCB0aGlzIGZvciBkZWxlZ2F0ZWQgZm9ybSBzdWJtaXQgZXZlbnRzXG5cdFx0XHRpZiAoIGpRdWVyeS5ub2RlTmFtZSggdGhpcywgXCJmb3JtXCIgKSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBMYXp5LWFkZCBhIHN1Ym1pdCBoYW5kbGVyIHdoZW4gYSBkZXNjZW5kYW50IGZvcm0gbWF5IHBvdGVudGlhbGx5IGJlIHN1Ym1pdHRlZFxuXHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggdGhpcywgXCJjbGljay5fc3VibWl0IGtleXByZXNzLl9zdWJtaXRcIiwgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRcdC8vIE5vZGUgbmFtZSBjaGVjayBhdm9pZHMgYSBWTUwtcmVsYXRlZCBjcmFzaCBpbiBJRSAoIzk4MDcpXG5cdFx0XHRcdHZhciBlbGVtID0gZS50YXJnZXQsXG5cdFx0XHRcdFx0Zm9ybSA9IGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJpbnB1dFwiICkgfHwgalF1ZXJ5Lm5vZGVOYW1lKCBlbGVtLCBcImJ1dHRvblwiICkgPyBlbGVtLmZvcm0gOiB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmICggZm9ybSAmJiAhalF1ZXJ5Ll9kYXRhKCBmb3JtLCBcInN1Ym1pdEJ1YmJsZXNcIiApICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIGZvcm0sIFwic3VibWl0Ll9zdWJtaXRcIiwgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQuX3N1Ym1pdF9idWJibGUgPSB0cnVlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGpRdWVyeS5fZGF0YSggZm9ybSwgXCJzdWJtaXRCdWJibGVzXCIsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyByZXR1cm4gdW5kZWZpbmVkIHNpbmNlIHdlIGRvbid0IG5lZWQgYW4gZXZlbnQgbGlzdGVuZXJcblx0XHR9LFxuXG5cdFx0cG9zdERpc3BhdGNoOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyBJZiBmb3JtIHdhcyBzdWJtaXR0ZWQgYnkgdGhlIHVzZXIsIGJ1YmJsZSB0aGUgZXZlbnQgdXAgdGhlIHRyZWVcblx0XHRcdGlmICggZXZlbnQuX3N1Ym1pdF9idWJibGUgKSB7XG5cdFx0XHRcdGRlbGV0ZSBldmVudC5fc3VibWl0X2J1YmJsZTtcblx0XHRcdFx0aWYgKCB0aGlzLnBhcmVudE5vZGUgJiYgIWV2ZW50LmlzVHJpZ2dlciApIHtcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQuc2ltdWxhdGUoIFwic3VibWl0XCIsIHRoaXMucGFyZW50Tm9kZSwgZXZlbnQsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBPbmx5IG5lZWQgdGhpcyBmb3IgZGVsZWdhdGVkIGZvcm0gc3VibWl0IGV2ZW50c1xuXHRcdFx0aWYgKCBqUXVlcnkubm9kZU5hbWUoIHRoaXMsIFwiZm9ybVwiICkgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGRlbGVnYXRlZCBoYW5kbGVyczsgY2xlYW5EYXRhIGV2ZW50dWFsbHkgcmVhcHMgc3VibWl0IGhhbmRsZXJzIGF0dGFjaGVkIGFib3ZlXG5cdFx0XHRqUXVlcnkuZXZlbnQucmVtb3ZlKCB0aGlzLCBcIi5fc3VibWl0XCIgKTtcblx0XHR9XG5cdH07XG59XG5cbi8vIElFIGNoYW5nZSBkZWxlZ2F0aW9uIGFuZCBjaGVja2JveC9yYWRpbyBmaXhcbmlmICggIXN1cHBvcnQuY2hhbmdlQnViYmxlcyApIHtcblxuXHRqUXVlcnkuZXZlbnQuc3BlY2lhbC5jaGFuZ2UgPSB7XG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggcmZvcm1FbGVtcy50ZXN0KCB0aGlzLm5vZGVOYW1lICkgKSB7XG5cdFx0XHRcdC8vIElFIGRvZXNuJ3QgZmlyZSBjaGFuZ2Ugb24gYSBjaGVjay9yYWRpbyB1bnRpbCBibHVyOyB0cmlnZ2VyIGl0IG9uIGNsaWNrXG5cdFx0XHRcdC8vIGFmdGVyIGEgcHJvcGVydHljaGFuZ2UuIEVhdCB0aGUgYmx1ci1jaGFuZ2UgaW4gc3BlY2lhbC5jaGFuZ2UuaGFuZGxlLlxuXHRcdFx0XHQvLyBUaGlzIHN0aWxsIGZpcmVzIG9uY2hhbmdlIGEgc2Vjb25kIHRpbWUgZm9yIGNoZWNrL3JhZGlvIGFmdGVyIGJsdXIuXG5cdFx0XHRcdGlmICggdGhpcy50eXBlID09PSBcImNoZWNrYm94XCIgfHwgdGhpcy50eXBlID09PSBcInJhZGlvXCIgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggdGhpcywgXCJwcm9wZXJ0eWNoYW5nZS5fY2hhbmdlXCIsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRcdGlmICggZXZlbnQub3JpZ2luYWxFdmVudC5wcm9wZXJ0eU5hbWUgPT09IFwiY2hlY2tlZFwiICkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9qdXN0X2NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIHRoaXMsIFwiY2xpY2suX2NoYW5nZVwiLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIHRoaXMuX2p1c3RfY2hhbmdlZCAmJiAhZXZlbnQuaXNUcmlnZ2VyICkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9qdXN0X2NoYW5nZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIEFsbG93IHRyaWdnZXJlZCwgc2ltdWxhdGVkIGNoYW5nZSBldmVudHMgKCMxMTUwMClcblx0XHRcdFx0XHRcdGpRdWVyeS5ldmVudC5zaW11bGF0ZSggXCJjaGFuZ2VcIiwgdGhpcywgZXZlbnQsIHRydWUgKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHQvLyBEZWxlZ2F0ZWQgZXZlbnQ7IGxhenktYWRkIGEgY2hhbmdlIGhhbmRsZXIgb24gZGVzY2VuZGFudCBpbnB1dHNcblx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIHRoaXMsIFwiYmVmb3JlYWN0aXZhdGUuX2NoYW5nZVwiLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdFx0dmFyIGVsZW0gPSBlLnRhcmdldDtcblxuXHRcdFx0XHRpZiAoIHJmb3JtRWxlbXMudGVzdCggZWxlbS5ub2RlTmFtZSApICYmICFqUXVlcnkuX2RhdGEoIGVsZW0sIFwiY2hhbmdlQnViYmxlc1wiICkgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggZWxlbSwgXCJjaGFuZ2UuX2NoYW5nZVwiLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIHRoaXMucGFyZW50Tm9kZSAmJiAhZXZlbnQuaXNTaW11bGF0ZWQgJiYgIWV2ZW50LmlzVHJpZ2dlciApIHtcblx0XHRcdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LnNpbXVsYXRlKCBcImNoYW5nZVwiLCB0aGlzLnBhcmVudE5vZGUsIGV2ZW50LCB0cnVlICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0alF1ZXJ5Ll9kYXRhKCBlbGVtLCBcImNoYW5nZUJ1YmJsZXNcIiwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0aGFuZGxlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZWxlbSA9IGV2ZW50LnRhcmdldDtcblxuXHRcdFx0Ly8gU3dhbGxvdyBuYXRpdmUgY2hhbmdlIGV2ZW50cyBmcm9tIGNoZWNrYm94L3JhZGlvLCB3ZSBhbHJlYWR5IHRyaWdnZXJlZCB0aGVtIGFib3ZlXG5cdFx0XHRpZiAoIHRoaXMgIT09IGVsZW0gfHwgZXZlbnQuaXNTaW11bGF0ZWQgfHwgZXZlbnQuaXNUcmlnZ2VyIHx8IChlbGVtLnR5cGUgIT09IFwicmFkaW9cIiAmJiBlbGVtLnR5cGUgIT09IFwiY2hlY2tib3hcIikgKSB7XG5cdFx0XHRcdHJldHVybiBldmVudC5oYW5kbGVPYmouaGFuZGxlci5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5ldmVudC5yZW1vdmUoIHRoaXMsIFwiLl9jaGFuZ2VcIiApO1xuXG5cdFx0XHRyZXR1cm4gIXJmb3JtRWxlbXMudGVzdCggdGhpcy5ub2RlTmFtZSApO1xuXHRcdH1cblx0fTtcbn1cblxuLy8gQ3JlYXRlIFwiYnViYmxpbmdcIiBmb2N1cyBhbmQgYmx1ciBldmVudHNcbmlmICggIXN1cHBvcnQuZm9jdXNpbkJ1YmJsZXMgKSB7XG5cdGpRdWVyeS5lYWNoKHsgZm9jdXM6IFwiZm9jdXNpblwiLCBibHVyOiBcImZvY3Vzb3V0XCIgfSwgZnVuY3Rpb24oIG9yaWcsIGZpeCApIHtcblxuXHRcdC8vIEF0dGFjaCBhIHNpbmdsZSBjYXB0dXJpbmcgaGFuZGxlciBvbiB0aGUgZG9jdW1lbnQgd2hpbGUgc29tZW9uZSB3YW50cyBmb2N1c2luL2ZvY3Vzb3V0XG5cdFx0dmFyIGhhbmRsZXIgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdGpRdWVyeS5ldmVudC5zaW11bGF0ZSggZml4LCBldmVudC50YXJnZXQsIGpRdWVyeS5ldmVudC5maXgoIGV2ZW50ICksIHRydWUgKTtcblx0XHRcdH07XG5cblx0XHRqUXVlcnkuZXZlbnQuc3BlY2lhbFsgZml4IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkb2MgPSB0aGlzLm93bmVyRG9jdW1lbnQgfHwgdGhpcyxcblx0XHRcdFx0XHRhdHRhY2hlcyA9IGpRdWVyeS5fZGF0YSggZG9jLCBmaXggKTtcblxuXHRcdFx0XHRpZiAoICFhdHRhY2hlcyApIHtcblx0XHRcdFx0XHRkb2MuYWRkRXZlbnRMaXN0ZW5lciggb3JpZywgaGFuZGxlciwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGpRdWVyeS5fZGF0YSggZG9jLCBmaXgsICggYXR0YWNoZXMgfHwgMCApICsgMSApO1xuXHRcdFx0fSxcblx0XHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRvYyA9IHRoaXMub3duZXJEb2N1bWVudCB8fCB0aGlzLFxuXHRcdFx0XHRcdGF0dGFjaGVzID0galF1ZXJ5Ll9kYXRhKCBkb2MsIGZpeCApIC0gMTtcblxuXHRcdFx0XHRpZiAoICFhdHRhY2hlcyApIHtcblx0XHRcdFx0XHRkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lciggb3JpZywgaGFuZGxlciwgdHJ1ZSApO1xuXHRcdFx0XHRcdGpRdWVyeS5fcmVtb3ZlRGF0YSggZG9jLCBmaXggKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRqUXVlcnkuX2RhdGEoIGRvYywgZml4LCBhdHRhY2hlcyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXG5cdG9uOiBmdW5jdGlvbiggdHlwZXMsIHNlbGVjdG9yLCBkYXRhLCBmbiwgLypJTlRFUk5BTCovIG9uZSApIHtcblx0XHR2YXIgdHlwZSwgb3JpZ0ZuO1xuXG5cdFx0Ly8gVHlwZXMgY2FuIGJlIGEgbWFwIG9mIHR5cGVzL2hhbmRsZXJzXG5cdFx0aWYgKCB0eXBlb2YgdHlwZXMgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHQvLyAoIHR5cGVzLU9iamVjdCwgc2VsZWN0b3IsIGRhdGEgKVxuXHRcdFx0aWYgKCB0eXBlb2Ygc2VsZWN0b3IgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdC8vICggdHlwZXMtT2JqZWN0LCBkYXRhIClcblx0XHRcdFx0ZGF0YSA9IGRhdGEgfHwgc2VsZWN0b3I7XG5cdFx0XHRcdHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICggdHlwZSBpbiB0eXBlcyApIHtcblx0XHRcdFx0dGhpcy5vbiggdHlwZSwgc2VsZWN0b3IsIGRhdGEsIHR5cGVzWyB0eXBlIF0sIG9uZSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0aWYgKCBkYXRhID09IG51bGwgJiYgZm4gPT0gbnVsbCApIHtcblx0XHRcdC8vICggdHlwZXMsIGZuIClcblx0XHRcdGZuID0gc2VsZWN0b3I7XG5cdFx0XHRkYXRhID0gc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG5cdFx0fSBlbHNlIGlmICggZm4gPT0gbnVsbCApIHtcblx0XHRcdGlmICggdHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHQvLyAoIHR5cGVzLCBzZWxlY3RvciwgZm4gKVxuXHRcdFx0XHRmbiA9IGRhdGE7XG5cdFx0XHRcdGRhdGEgPSB1bmRlZmluZWQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyAoIHR5cGVzLCBkYXRhLCBmbiApXG5cdFx0XHRcdGZuID0gZGF0YTtcblx0XHRcdFx0ZGF0YSA9IHNlbGVjdG9yO1xuXHRcdFx0XHRzZWxlY3RvciA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKCBmbiA9PT0gZmFsc2UgKSB7XG5cdFx0XHRmbiA9IHJldHVybkZhbHNlO1xuXHRcdH0gZWxzZSBpZiAoICFmbiApIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdGlmICggb25lID09PSAxICkge1xuXHRcdFx0b3JpZ0ZuID0gZm47XG5cdFx0XHRmbiA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0Ly8gQ2FuIHVzZSBhbiBlbXB0eSBzZXQsIHNpbmNlIGV2ZW50IGNvbnRhaW5zIHRoZSBpbmZvXG5cdFx0XHRcdGpRdWVyeSgpLm9mZiggZXZlbnQgKTtcblx0XHRcdFx0cmV0dXJuIG9yaWdGbi5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR9O1xuXHRcdFx0Ly8gVXNlIHNhbWUgZ3VpZCBzbyBjYWxsZXIgY2FuIHJlbW92ZSB1c2luZyBvcmlnRm5cblx0XHRcdGZuLmd1aWQgPSBvcmlnRm4uZ3VpZCB8fCAoIG9yaWdGbi5ndWlkID0galF1ZXJ5Lmd1aWQrKyApO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIHRoaXMsIHR5cGVzLCBmbiwgZGF0YSwgc2VsZWN0b3IgKTtcblx0XHR9KTtcblx0fSxcblx0b25lOiBmdW5jdGlvbiggdHlwZXMsIHNlbGVjdG9yLCBkYXRhLCBmbiApIHtcblx0XHRyZXR1cm4gdGhpcy5vbiggdHlwZXMsIHNlbGVjdG9yLCBkYXRhLCBmbiwgMSApO1xuXHR9LFxuXHRvZmY6IGZ1bmN0aW9uKCB0eXBlcywgc2VsZWN0b3IsIGZuICkge1xuXHRcdHZhciBoYW5kbGVPYmosIHR5cGU7XG5cdFx0aWYgKCB0eXBlcyAmJiB0eXBlcy5wcmV2ZW50RGVmYXVsdCAmJiB0eXBlcy5oYW5kbGVPYmogKSB7XG5cdFx0XHQvLyAoIGV2ZW50ICkgIGRpc3BhdGNoZWQgalF1ZXJ5LkV2ZW50XG5cdFx0XHRoYW5kbGVPYmogPSB0eXBlcy5oYW5kbGVPYmo7XG5cdFx0XHRqUXVlcnkoIHR5cGVzLmRlbGVnYXRlVGFyZ2V0ICkub2ZmKFxuXHRcdFx0XHRoYW5kbGVPYmoubmFtZXNwYWNlID8gaGFuZGxlT2JqLm9yaWdUeXBlICsgXCIuXCIgKyBoYW5kbGVPYmoubmFtZXNwYWNlIDogaGFuZGxlT2JqLm9yaWdUeXBlLFxuXHRcdFx0XHRoYW5kbGVPYmouc2VsZWN0b3IsXG5cdFx0XHRcdGhhbmRsZU9iai5oYW5kbGVyXG5cdFx0XHQpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIHR5cGVzID09PSBcIm9iamVjdFwiICkge1xuXHRcdFx0Ly8gKCB0eXBlcy1vYmplY3QgWywgc2VsZWN0b3JdIClcblx0XHRcdGZvciAoIHR5cGUgaW4gdHlwZXMgKSB7XG5cdFx0XHRcdHRoaXMub2ZmKCB0eXBlLCBzZWxlY3RvciwgdHlwZXNbIHR5cGUgXSApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdGlmICggc2VsZWN0b3IgPT09IGZhbHNlIHx8IHR5cGVvZiBzZWxlY3RvciA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0Ly8gKCB0eXBlcyBbLCBmbl0gKVxuXHRcdFx0Zm4gPSBzZWxlY3Rvcjtcblx0XHRcdHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHRpZiAoIGZuID09PSBmYWxzZSApIHtcblx0XHRcdGZuID0gcmV0dXJuRmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRqUXVlcnkuZXZlbnQucmVtb3ZlKCB0aGlzLCB0eXBlcywgZm4sIHNlbGVjdG9yICk7XG5cdFx0fSk7XG5cdH0sXG5cblx0dHJpZ2dlcjogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5ldmVudC50cmlnZ2VyKCB0eXBlLCBkYXRhLCB0aGlzICk7XG5cdFx0fSk7XG5cdH0sXG5cdHRyaWdnZXJIYW5kbGVyOiBmdW5jdGlvbiggdHlwZSwgZGF0YSApIHtcblx0XHR2YXIgZWxlbSA9IHRoaXNbMF07XG5cdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeS5ldmVudC50cmlnZ2VyKCB0eXBlLCBkYXRhLCBlbGVtLCB0cnVlICk7XG5cdFx0fVxuXHR9XG59KTtcblxuXG5mdW5jdGlvbiBjcmVhdGVTYWZlRnJhZ21lbnQoIGRvY3VtZW50ICkge1xuXHR2YXIgbGlzdCA9IG5vZGVOYW1lcy5zcGxpdCggXCJ8XCIgKSxcblx0XHRzYWZlRnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuXHRpZiAoIHNhZmVGcmFnLmNyZWF0ZUVsZW1lbnQgKSB7XG5cdFx0d2hpbGUgKCBsaXN0Lmxlbmd0aCApIHtcblx0XHRcdHNhZmVGcmFnLmNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdGxpc3QucG9wKClcblx0XHRcdCk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBzYWZlRnJhZztcbn1cblxudmFyIG5vZGVOYW1lcyA9IFwiYWJicnxhcnRpY2xlfGFzaWRlfGF1ZGlvfGJkaXxjYW52YXN8ZGF0YXxkYXRhbGlzdHxkZXRhaWxzfGZpZ2NhcHRpb258ZmlndXJlfGZvb3RlcnxcIiArXG5cdFx0XCJoZWFkZXJ8aGdyb3VwfG1hcmt8bWV0ZXJ8bmF2fG91dHB1dHxwcm9ncmVzc3xzZWN0aW9ufHN1bW1hcnl8dGltZXx2aWRlb1wiLFxuXHRyaW5saW5lalF1ZXJ5ID0gLyBqUXVlcnlcXGQrPVwiKD86bnVsbHxcXGQrKVwiL2csXG5cdHJub3NoaW1jYWNoZSA9IG5ldyBSZWdFeHAoXCI8KD86XCIgKyBub2RlTmFtZXMgKyBcIilbXFxcXHMvPl1cIiwgXCJpXCIpLFxuXHRybGVhZGluZ1doaXRlc3BhY2UgPSAvXlxccysvLFxuXHRyeGh0bWxUYWcgPSAvPCg/IWFyZWF8YnJ8Y29sfGVtYmVkfGhyfGltZ3xpbnB1dHxsaW5rfG1ldGF8cGFyYW0pKChbXFx3Ol0rKVtePl0qKVxcLz4vZ2ksXG5cdHJ0YWdOYW1lID0gLzwoW1xcdzpdKykvLFxuXHRydGJvZHkgPSAvPHRib2R5L2ksXG5cdHJodG1sID0gLzx8JiM/XFx3KzsvLFxuXHRybm9Jbm5lcmh0bWwgPSAvPCg/OnNjcmlwdHxzdHlsZXxsaW5rKS9pLFxuXHQvLyBjaGVja2VkPVwiY2hlY2tlZFwiIG9yIGNoZWNrZWRcblx0cmNoZWNrZWQgPSAvY2hlY2tlZFxccyooPzpbXj1dfD1cXHMqLmNoZWNrZWQuKS9pLFxuXHRyc2NyaXB0VHlwZSA9IC9eJHxcXC8oPzpqYXZhfGVjbWEpc2NyaXB0L2ksXG5cdHJzY3JpcHRUeXBlTWFza2VkID0gL150cnVlXFwvKC4qKS8sXG5cdHJjbGVhblNjcmlwdCA9IC9eXFxzKjwhKD86XFxbQ0RBVEFcXFt8LS0pfCg/OlxcXVxcXXwtLSk+XFxzKiQvZyxcblxuXHQvLyBXZSBoYXZlIHRvIGNsb3NlIHRoZXNlIHRhZ3MgdG8gc3VwcG9ydCBYSFRNTCAoIzEzMjAwKVxuXHR3cmFwTWFwID0ge1xuXHRcdG9wdGlvbjogWyAxLCBcIjxzZWxlY3QgbXVsdGlwbGU9J211bHRpcGxlJz5cIiwgXCI8L3NlbGVjdD5cIiBdLFxuXHRcdGxlZ2VuZDogWyAxLCBcIjxmaWVsZHNldD5cIiwgXCI8L2ZpZWxkc2V0PlwiIF0sXG5cdFx0YXJlYTogWyAxLCBcIjxtYXA+XCIsIFwiPC9tYXA+XCIgXSxcblx0XHRwYXJhbTogWyAxLCBcIjxvYmplY3Q+XCIsIFwiPC9vYmplY3Q+XCIgXSxcblx0XHR0aGVhZDogWyAxLCBcIjx0YWJsZT5cIiwgXCI8L3RhYmxlPlwiIF0sXG5cdFx0dHI6IFsgMiwgXCI8dGFibGU+PHRib2R5PlwiLCBcIjwvdGJvZHk+PC90YWJsZT5cIiBdLFxuXHRcdGNvbDogWyAyLCBcIjx0YWJsZT48dGJvZHk+PC90Ym9keT48Y29sZ3JvdXA+XCIsIFwiPC9jb2xncm91cD48L3RhYmxlPlwiIF0sXG5cdFx0dGQ6IFsgMywgXCI8dGFibGU+PHRib2R5Pjx0cj5cIiwgXCI8L3RyPjwvdGJvZHk+PC90YWJsZT5cIiBdLFxuXG5cdFx0Ly8gSUU2LTggY2FuJ3Qgc2VyaWFsaXplIGxpbmssIHNjcmlwdCwgc3R5bGUsIG9yIGFueSBodG1sNSAoTm9TY29wZSkgdGFncyxcblx0XHQvLyB1bmxlc3Mgd3JhcHBlZCBpbiBhIGRpdiB3aXRoIG5vbi1icmVha2luZyBjaGFyYWN0ZXJzIGluIGZyb250IG9mIGl0LlxuXHRcdF9kZWZhdWx0OiBzdXBwb3J0Lmh0bWxTZXJpYWxpemUgPyBbIDAsIFwiXCIsIFwiXCIgXSA6IFsgMSwgXCJYPGRpdj5cIiwgXCI8L2Rpdj5cIiAgXVxuXHR9LFxuXHRzYWZlRnJhZ21lbnQgPSBjcmVhdGVTYWZlRnJhZ21lbnQoIGRvY3VtZW50ICksXG5cdGZyYWdtZW50RGl2ID0gc2FmZUZyYWdtZW50LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpICk7XG5cbndyYXBNYXAub3B0Z3JvdXAgPSB3cmFwTWFwLm9wdGlvbjtcbndyYXBNYXAudGJvZHkgPSB3cmFwTWFwLnRmb290ID0gd3JhcE1hcC5jb2xncm91cCA9IHdyYXBNYXAuY2FwdGlvbiA9IHdyYXBNYXAudGhlYWQ7XG53cmFwTWFwLnRoID0gd3JhcE1hcC50ZDtcblxuZnVuY3Rpb24gZ2V0QWxsKCBjb250ZXh0LCB0YWcgKSB7XG5cdHZhciBlbGVtcywgZWxlbSxcblx0XHRpID0gMCxcblx0XHRmb3VuZCA9IHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lICE9PSBzdHJ1bmRlZmluZWQgPyBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCB0YWcgfHwgXCIqXCIgKSA6XG5cdFx0XHR0eXBlb2YgY29udGV4dC5xdWVyeVNlbGVjdG9yQWxsICE9PSBzdHJ1bmRlZmluZWQgPyBjb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoIHRhZyB8fCBcIipcIiApIDpcblx0XHRcdHVuZGVmaW5lZDtcblxuXHRpZiAoICFmb3VuZCApIHtcblx0XHRmb3IgKCBmb3VuZCA9IFtdLCBlbGVtcyA9IGNvbnRleHQuY2hpbGROb2RlcyB8fCBjb250ZXh0OyAoZWxlbSA9IGVsZW1zW2ldKSAhPSBudWxsOyBpKysgKSB7XG5cdFx0XHRpZiAoICF0YWcgfHwgalF1ZXJ5Lm5vZGVOYW1lKCBlbGVtLCB0YWcgKSApIHtcblx0XHRcdFx0Zm91bmQucHVzaCggZWxlbSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0alF1ZXJ5Lm1lcmdlKCBmb3VuZCwgZ2V0QWxsKCBlbGVtLCB0YWcgKSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0YWcgPT09IHVuZGVmaW5lZCB8fCB0YWcgJiYgalF1ZXJ5Lm5vZGVOYW1lKCBjb250ZXh0LCB0YWcgKSA/XG5cdFx0alF1ZXJ5Lm1lcmdlKCBbIGNvbnRleHQgXSwgZm91bmQgKSA6XG5cdFx0Zm91bmQ7XG59XG5cbi8vIFVzZWQgaW4gYnVpbGRGcmFnbWVudCwgZml4ZXMgdGhlIGRlZmF1bHRDaGVja2VkIHByb3BlcnR5XG5mdW5jdGlvbiBmaXhEZWZhdWx0Q2hlY2tlZCggZWxlbSApIHtcblx0aWYgKCByY2hlY2thYmxlVHlwZS50ZXN0KCBlbGVtLnR5cGUgKSApIHtcblx0XHRlbGVtLmRlZmF1bHRDaGVja2VkID0gZWxlbS5jaGVja2VkO1xuXHR9XG59XG5cbi8vIFN1cHBvcnQ6IElFPDhcbi8vIE1hbmlwdWxhdGluZyB0YWJsZXMgcmVxdWlyZXMgYSB0Ym9keVxuZnVuY3Rpb24gbWFuaXB1bGF0aW9uVGFyZ2V0KCBlbGVtLCBjb250ZW50ICkge1xuXHRyZXR1cm4galF1ZXJ5Lm5vZGVOYW1lKCBlbGVtLCBcInRhYmxlXCIgKSAmJlxuXHRcdGpRdWVyeS5ub2RlTmFtZSggY29udGVudC5ub2RlVHlwZSAhPT0gMTEgPyBjb250ZW50IDogY29udGVudC5maXJzdENoaWxkLCBcInRyXCIgKSA/XG5cblx0XHRlbGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGJvZHlcIilbMF0gfHxcblx0XHRcdGVsZW0uYXBwZW5kQ2hpbGQoIGVsZW0ub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGJvZHlcIikgKSA6XG5cdFx0ZWxlbTtcbn1cblxuLy8gUmVwbGFjZS9yZXN0b3JlIHRoZSB0eXBlIGF0dHJpYnV0ZSBvZiBzY3JpcHQgZWxlbWVudHMgZm9yIHNhZmUgRE9NIG1hbmlwdWxhdGlvblxuZnVuY3Rpb24gZGlzYWJsZVNjcmlwdCggZWxlbSApIHtcblx0ZWxlbS50eXBlID0gKGpRdWVyeS5maW5kLmF0dHIoIGVsZW0sIFwidHlwZVwiICkgIT09IG51bGwpICsgXCIvXCIgKyBlbGVtLnR5cGU7XG5cdHJldHVybiBlbGVtO1xufVxuZnVuY3Rpb24gcmVzdG9yZVNjcmlwdCggZWxlbSApIHtcblx0dmFyIG1hdGNoID0gcnNjcmlwdFR5cGVNYXNrZWQuZXhlYyggZWxlbS50eXBlICk7XG5cdGlmICggbWF0Y2ggKSB7XG5cdFx0ZWxlbS50eXBlID0gbWF0Y2hbMV07XG5cdH0gZWxzZSB7XG5cdFx0ZWxlbS5yZW1vdmVBdHRyaWJ1dGUoXCJ0eXBlXCIpO1xuXHR9XG5cdHJldHVybiBlbGVtO1xufVxuXG4vLyBNYXJrIHNjcmlwdHMgYXMgaGF2aW5nIGFscmVhZHkgYmVlbiBldmFsdWF0ZWRcbmZ1bmN0aW9uIHNldEdsb2JhbEV2YWwoIGVsZW1zLCByZWZFbGVtZW50cyApIHtcblx0dmFyIGVsZW0sXG5cdFx0aSA9IDA7XG5cdGZvciAoIDsgKGVsZW0gPSBlbGVtc1tpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdGpRdWVyeS5fZGF0YSggZWxlbSwgXCJnbG9iYWxFdmFsXCIsICFyZWZFbGVtZW50cyB8fCBqUXVlcnkuX2RhdGEoIHJlZkVsZW1lbnRzW2ldLCBcImdsb2JhbEV2YWxcIiApICk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2xvbmVDb3B5RXZlbnQoIHNyYywgZGVzdCApIHtcblxuXHRpZiAoIGRlc3Qubm9kZVR5cGUgIT09IDEgfHwgIWpRdWVyeS5oYXNEYXRhKCBzcmMgKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHR2YXIgdHlwZSwgaSwgbCxcblx0XHRvbGREYXRhID0galF1ZXJ5Ll9kYXRhKCBzcmMgKSxcblx0XHRjdXJEYXRhID0galF1ZXJ5Ll9kYXRhKCBkZXN0LCBvbGREYXRhICksXG5cdFx0ZXZlbnRzID0gb2xkRGF0YS5ldmVudHM7XG5cblx0aWYgKCBldmVudHMgKSB7XG5cdFx0ZGVsZXRlIGN1ckRhdGEuaGFuZGxlO1xuXHRcdGN1ckRhdGEuZXZlbnRzID0ge307XG5cblx0XHRmb3IgKCB0eXBlIGluIGV2ZW50cyApIHtcblx0XHRcdGZvciAoIGkgPSAwLCBsID0gZXZlbnRzWyB0eXBlIF0ubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRqUXVlcnkuZXZlbnQuYWRkKCBkZXN0LCB0eXBlLCBldmVudHNbIHR5cGUgXVsgaSBdICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gbWFrZSB0aGUgY2xvbmVkIHB1YmxpYyBkYXRhIG9iamVjdCBhIGNvcHkgZnJvbSB0aGUgb3JpZ2luYWxcblx0aWYgKCBjdXJEYXRhLmRhdGEgKSB7XG5cdFx0Y3VyRGF0YS5kYXRhID0galF1ZXJ5LmV4dGVuZCgge30sIGN1ckRhdGEuZGF0YSApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGZpeENsb25lTm9kZUlzc3Vlcyggc3JjLCBkZXN0ICkge1xuXHR2YXIgbm9kZU5hbWUsIGUsIGRhdGE7XG5cblx0Ly8gV2UgZG8gbm90IG5lZWQgdG8gZG8gYW55dGhpbmcgZm9yIG5vbi1FbGVtZW50c1xuXHRpZiAoIGRlc3Qubm9kZVR5cGUgIT09IDEgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0bm9kZU5hbWUgPSBkZXN0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG5cblx0Ly8gSUU2LTggY29waWVzIGV2ZW50cyBib3VuZCB2aWEgYXR0YWNoRXZlbnQgd2hlbiB1c2luZyBjbG9uZU5vZGUuXG5cdGlmICggIXN1cHBvcnQubm9DbG9uZUV2ZW50ICYmIGRlc3RbIGpRdWVyeS5leHBhbmRvIF0gKSB7XG5cdFx0ZGF0YSA9IGpRdWVyeS5fZGF0YSggZGVzdCApO1xuXG5cdFx0Zm9yICggZSBpbiBkYXRhLmV2ZW50cyApIHtcblx0XHRcdGpRdWVyeS5yZW1vdmVFdmVudCggZGVzdCwgZSwgZGF0YS5oYW5kbGUgKTtcblx0XHR9XG5cblx0XHQvLyBFdmVudCBkYXRhIGdldHMgcmVmZXJlbmNlZCBpbnN0ZWFkIG9mIGNvcGllZCBpZiB0aGUgZXhwYW5kbyBnZXRzIGNvcGllZCB0b29cblx0XHRkZXN0LnJlbW92ZUF0dHJpYnV0ZSggalF1ZXJ5LmV4cGFuZG8gKTtcblx0fVxuXG5cdC8vIElFIGJsYW5rcyBjb250ZW50cyB3aGVuIGNsb25pbmcgc2NyaXB0cywgYW5kIHRyaWVzIHRvIGV2YWx1YXRlIG5ld2x5LXNldCB0ZXh0XG5cdGlmICggbm9kZU5hbWUgPT09IFwic2NyaXB0XCIgJiYgZGVzdC50ZXh0ICE9PSBzcmMudGV4dCApIHtcblx0XHRkaXNhYmxlU2NyaXB0KCBkZXN0ICkudGV4dCA9IHNyYy50ZXh0O1xuXHRcdHJlc3RvcmVTY3JpcHQoIGRlc3QgKTtcblxuXHQvLyBJRTYtMTAgaW1wcm9wZXJseSBjbG9uZXMgY2hpbGRyZW4gb2Ygb2JqZWN0IGVsZW1lbnRzIHVzaW5nIGNsYXNzaWQuXG5cdC8vIElFMTAgdGhyb3dzIE5vTW9kaWZpY2F0aW9uQWxsb3dlZEVycm9yIGlmIHBhcmVudCBpcyBudWxsLCAjMTIxMzIuXG5cdH0gZWxzZSBpZiAoIG5vZGVOYW1lID09PSBcIm9iamVjdFwiICkge1xuXHRcdGlmICggZGVzdC5wYXJlbnROb2RlICkge1xuXHRcdFx0ZGVzdC5vdXRlckhUTUwgPSBzcmMub3V0ZXJIVE1MO1xuXHRcdH1cblxuXHRcdC8vIFRoaXMgcGF0aCBhcHBlYXJzIHVuYXZvaWRhYmxlIGZvciBJRTkuIFdoZW4gY2xvbmluZyBhbiBvYmplY3Rcblx0XHQvLyBlbGVtZW50IGluIElFOSwgdGhlIG91dGVySFRNTCBzdHJhdGVneSBhYm92ZSBpcyBub3Qgc3VmZmljaWVudC5cblx0XHQvLyBJZiB0aGUgc3JjIGhhcyBpbm5lckhUTUwgYW5kIHRoZSBkZXN0aW5hdGlvbiBkb2VzIG5vdCxcblx0XHQvLyBjb3B5IHRoZSBzcmMuaW5uZXJIVE1MIGludG8gdGhlIGRlc3QuaW5uZXJIVE1MLiAjMTAzMjRcblx0XHRpZiAoIHN1cHBvcnQuaHRtbDVDbG9uZSAmJiAoIHNyYy5pbm5lckhUTUwgJiYgIWpRdWVyeS50cmltKGRlc3QuaW5uZXJIVE1MKSApICkge1xuXHRcdFx0ZGVzdC5pbm5lckhUTUwgPSBzcmMuaW5uZXJIVE1MO1xuXHRcdH1cblxuXHR9IGVsc2UgaWYgKCBub2RlTmFtZSA9PT0gXCJpbnB1dFwiICYmIHJjaGVja2FibGVUeXBlLnRlc3QoIHNyYy50eXBlICkgKSB7XG5cdFx0Ly8gSUU2LTggZmFpbHMgdG8gcGVyc2lzdCB0aGUgY2hlY2tlZCBzdGF0ZSBvZiBhIGNsb25lZCBjaGVja2JveFxuXHRcdC8vIG9yIHJhZGlvIGJ1dHRvbi4gV29yc2UsIElFNi03IGZhaWwgdG8gZ2l2ZSB0aGUgY2xvbmVkIGVsZW1lbnRcblx0XHQvLyBhIGNoZWNrZWQgYXBwZWFyYW5jZSBpZiB0aGUgZGVmYXVsdENoZWNrZWQgdmFsdWUgaXNuJ3QgYWxzbyBzZXRcblxuXHRcdGRlc3QuZGVmYXVsdENoZWNrZWQgPSBkZXN0LmNoZWNrZWQgPSBzcmMuY2hlY2tlZDtcblxuXHRcdC8vIElFNi03IGdldCBjb25mdXNlZCBhbmQgZW5kIHVwIHNldHRpbmcgdGhlIHZhbHVlIG9mIGEgY2xvbmVkXG5cdFx0Ly8gY2hlY2tib3gvcmFkaW8gYnV0dG9uIHRvIGFuIGVtcHR5IHN0cmluZyBpbnN0ZWFkIG9mIFwib25cIlxuXHRcdGlmICggZGVzdC52YWx1ZSAhPT0gc3JjLnZhbHVlICkge1xuXHRcdFx0ZGVzdC52YWx1ZSA9IHNyYy52YWx1ZTtcblx0XHR9XG5cblx0Ly8gSUU2LTggZmFpbHMgdG8gcmV0dXJuIHRoZSBzZWxlY3RlZCBvcHRpb24gdG8gdGhlIGRlZmF1bHQgc2VsZWN0ZWRcblx0Ly8gc3RhdGUgd2hlbiBjbG9uaW5nIG9wdGlvbnNcblx0fSBlbHNlIGlmICggbm9kZU5hbWUgPT09IFwib3B0aW9uXCIgKSB7XG5cdFx0ZGVzdC5kZWZhdWx0U2VsZWN0ZWQgPSBkZXN0LnNlbGVjdGVkID0gc3JjLmRlZmF1bHRTZWxlY3RlZDtcblxuXHQvLyBJRTYtOCBmYWlscyB0byBzZXQgdGhlIGRlZmF1bHRWYWx1ZSB0byB0aGUgY29ycmVjdCB2YWx1ZSB3aGVuXG5cdC8vIGNsb25pbmcgb3RoZXIgdHlwZXMgb2YgaW5wdXQgZmllbGRzXG5cdH0gZWxzZSBpZiAoIG5vZGVOYW1lID09PSBcImlucHV0XCIgfHwgbm9kZU5hbWUgPT09IFwidGV4dGFyZWFcIiApIHtcblx0XHRkZXN0LmRlZmF1bHRWYWx1ZSA9IHNyYy5kZWZhdWx0VmFsdWU7XG5cdH1cbn1cblxualF1ZXJ5LmV4dGVuZCh7XG5cdGNsb25lOiBmdW5jdGlvbiggZWxlbSwgZGF0YUFuZEV2ZW50cywgZGVlcERhdGFBbmRFdmVudHMgKSB7XG5cdFx0dmFyIGRlc3RFbGVtZW50cywgbm9kZSwgY2xvbmUsIGksIHNyY0VsZW1lbnRzLFxuXHRcdFx0aW5QYWdlID0galF1ZXJ5LmNvbnRhaW5zKCBlbGVtLm93bmVyRG9jdW1lbnQsIGVsZW0gKTtcblxuXHRcdGlmICggc3VwcG9ydC5odG1sNUNsb25lIHx8IGpRdWVyeS5pc1hNTERvYyhlbGVtKSB8fCAhcm5vc2hpbWNhY2hlLnRlc3QoIFwiPFwiICsgZWxlbS5ub2RlTmFtZSArIFwiPlwiICkgKSB7XG5cdFx0XHRjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKCB0cnVlICk7XG5cblx0XHQvLyBJRTw9OCBkb2VzIG5vdCBwcm9wZXJseSBjbG9uZSBkZXRhY2hlZCwgdW5rbm93biBlbGVtZW50IG5vZGVzXG5cdFx0fSBlbHNlIHtcblx0XHRcdGZyYWdtZW50RGl2LmlubmVySFRNTCA9IGVsZW0ub3V0ZXJIVE1MO1xuXHRcdFx0ZnJhZ21lbnREaXYucmVtb3ZlQ2hpbGQoIGNsb25lID0gZnJhZ21lbnREaXYuZmlyc3RDaGlsZCApO1xuXHRcdH1cblxuXHRcdGlmICggKCFzdXBwb3J0Lm5vQ2xvbmVFdmVudCB8fCAhc3VwcG9ydC5ub0Nsb25lQ2hlY2tlZCkgJiZcblx0XHRcdFx0KGVsZW0ubm9kZVR5cGUgPT09IDEgfHwgZWxlbS5ub2RlVHlwZSA9PT0gMTEpICYmICFqUXVlcnkuaXNYTUxEb2MoZWxlbSkgKSB7XG5cblx0XHRcdC8vIFdlIGVzY2hldyBTaXp6bGUgaGVyZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uczogaHR0cDovL2pzcGVyZi5jb20vZ2V0YWxsLXZzLXNpenpsZS8yXG5cdFx0XHRkZXN0RWxlbWVudHMgPSBnZXRBbGwoIGNsb25lICk7XG5cdFx0XHRzcmNFbGVtZW50cyA9IGdldEFsbCggZWxlbSApO1xuXG5cdFx0XHQvLyBGaXggYWxsIElFIGNsb25pbmcgaXNzdWVzXG5cdFx0XHRmb3IgKCBpID0gMDsgKG5vZGUgPSBzcmNFbGVtZW50c1tpXSkgIT0gbnVsbDsgKytpICkge1xuXHRcdFx0XHQvLyBFbnN1cmUgdGhhdCB0aGUgZGVzdGluYXRpb24gbm9kZSBpcyBub3QgbnVsbDsgRml4ZXMgIzk1ODdcblx0XHRcdFx0aWYgKCBkZXN0RWxlbWVudHNbaV0gKSB7XG5cdFx0XHRcdFx0Zml4Q2xvbmVOb2RlSXNzdWVzKCBub2RlLCBkZXN0RWxlbWVudHNbaV0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENvcHkgdGhlIGV2ZW50cyBmcm9tIHRoZSBvcmlnaW5hbCB0byB0aGUgY2xvbmVcblx0XHRpZiAoIGRhdGFBbmRFdmVudHMgKSB7XG5cdFx0XHRpZiAoIGRlZXBEYXRhQW5kRXZlbnRzICkge1xuXHRcdFx0XHRzcmNFbGVtZW50cyA9IHNyY0VsZW1lbnRzIHx8IGdldEFsbCggZWxlbSApO1xuXHRcdFx0XHRkZXN0RWxlbWVudHMgPSBkZXN0RWxlbWVudHMgfHwgZ2V0QWxsKCBjbG9uZSApO1xuXG5cdFx0XHRcdGZvciAoIGkgPSAwOyAobm9kZSA9IHNyY0VsZW1lbnRzW2ldKSAhPSBudWxsOyBpKysgKSB7XG5cdFx0XHRcdFx0Y2xvbmVDb3B5RXZlbnQoIG5vZGUsIGRlc3RFbGVtZW50c1tpXSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjbG9uZUNvcHlFdmVudCggZWxlbSwgY2xvbmUgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBQcmVzZXJ2ZSBzY3JpcHQgZXZhbHVhdGlvbiBoaXN0b3J5XG5cdFx0ZGVzdEVsZW1lbnRzID0gZ2V0QWxsKCBjbG9uZSwgXCJzY3JpcHRcIiApO1xuXHRcdGlmICggZGVzdEVsZW1lbnRzLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRzZXRHbG9iYWxFdmFsKCBkZXN0RWxlbWVudHMsICFpblBhZ2UgJiYgZ2V0QWxsKCBlbGVtLCBcInNjcmlwdFwiICkgKTtcblx0XHR9XG5cblx0XHRkZXN0RWxlbWVudHMgPSBzcmNFbGVtZW50cyA9IG5vZGUgPSBudWxsO1xuXG5cdFx0Ly8gUmV0dXJuIHRoZSBjbG9uZWQgc2V0XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9LFxuXG5cdGJ1aWxkRnJhZ21lbnQ6IGZ1bmN0aW9uKCBlbGVtcywgY29udGV4dCwgc2NyaXB0cywgc2VsZWN0aW9uICkge1xuXHRcdHZhciBqLCBlbGVtLCBjb250YWlucyxcblx0XHRcdHRtcCwgdGFnLCB0Ym9keSwgd3JhcCxcblx0XHRcdGwgPSBlbGVtcy5sZW5ndGgsXG5cblx0XHRcdC8vIEVuc3VyZSBhIHNhZmUgZnJhZ21lbnRcblx0XHRcdHNhZmUgPSBjcmVhdGVTYWZlRnJhZ21lbnQoIGNvbnRleHQgKSxcblxuXHRcdFx0bm9kZXMgPSBbXSxcblx0XHRcdGkgPSAwO1xuXG5cdFx0Zm9yICggOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0ZWxlbSA9IGVsZW1zWyBpIF07XG5cblx0XHRcdGlmICggZWxlbSB8fCBlbGVtID09PSAwICkge1xuXG5cdFx0XHRcdC8vIEFkZCBub2RlcyBkaXJlY3RseVxuXHRcdFx0XHRpZiAoIGpRdWVyeS50eXBlKCBlbGVtICkgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5Lm1lcmdlKCBub2RlcywgZWxlbS5ub2RlVHlwZSA/IFsgZWxlbSBdIDogZWxlbSApO1xuXG5cdFx0XHRcdC8vIENvbnZlcnQgbm9uLWh0bWwgaW50byBhIHRleHQgbm9kZVxuXHRcdFx0XHR9IGVsc2UgaWYgKCAhcmh0bWwudGVzdCggZWxlbSApICkge1xuXHRcdFx0XHRcdG5vZGVzLnB1c2goIGNvbnRleHQuY3JlYXRlVGV4dE5vZGUoIGVsZW0gKSApO1xuXG5cdFx0XHRcdC8vIENvbnZlcnQgaHRtbCBpbnRvIERPTSBub2Rlc1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRtcCA9IHRtcCB8fCBzYWZlLmFwcGVuZENoaWxkKCBjb250ZXh0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikgKTtcblxuXHRcdFx0XHRcdC8vIERlc2VyaWFsaXplIGEgc3RhbmRhcmQgcmVwcmVzZW50YXRpb25cblx0XHRcdFx0XHR0YWcgPSAocnRhZ05hbWUuZXhlYyggZWxlbSApIHx8IFsgXCJcIiwgXCJcIiBdKVsgMSBdLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0d3JhcCA9IHdyYXBNYXBbIHRhZyBdIHx8IHdyYXBNYXAuX2RlZmF1bHQ7XG5cblx0XHRcdFx0XHR0bXAuaW5uZXJIVE1MID0gd3JhcFsxXSArIGVsZW0ucmVwbGFjZSggcnhodG1sVGFnLCBcIjwkMT48LyQyPlwiICkgKyB3cmFwWzJdO1xuXG5cdFx0XHRcdFx0Ly8gRGVzY2VuZCB0aHJvdWdoIHdyYXBwZXJzIHRvIHRoZSByaWdodCBjb250ZW50XG5cdFx0XHRcdFx0aiA9IHdyYXBbMF07XG5cdFx0XHRcdFx0d2hpbGUgKCBqLS0gKSB7XG5cdFx0XHRcdFx0XHR0bXAgPSB0bXAubGFzdENoaWxkO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE1hbnVhbGx5IGFkZCBsZWFkaW5nIHdoaXRlc3BhY2UgcmVtb3ZlZCBieSBJRVxuXHRcdFx0XHRcdGlmICggIXN1cHBvcnQubGVhZGluZ1doaXRlc3BhY2UgJiYgcmxlYWRpbmdXaGl0ZXNwYWNlLnRlc3QoIGVsZW0gKSApIHtcblx0XHRcdFx0XHRcdG5vZGVzLnB1c2goIGNvbnRleHQuY3JlYXRlVGV4dE5vZGUoIHJsZWFkaW5nV2hpdGVzcGFjZS5leGVjKCBlbGVtIClbMF0gKSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFJlbW92ZSBJRSdzIGF1dG9pbnNlcnRlZCA8dGJvZHk+IGZyb20gdGFibGUgZnJhZ21lbnRzXG5cdFx0XHRcdFx0aWYgKCAhc3VwcG9ydC50Ym9keSApIHtcblxuXHRcdFx0XHRcdFx0Ly8gU3RyaW5nIHdhcyBhIDx0YWJsZT4sICptYXkqIGhhdmUgc3B1cmlvdXMgPHRib2R5PlxuXHRcdFx0XHRcdFx0ZWxlbSA9IHRhZyA9PT0gXCJ0YWJsZVwiICYmICFydGJvZHkudGVzdCggZWxlbSApID9cblx0XHRcdFx0XHRcdFx0dG1wLmZpcnN0Q2hpbGQgOlxuXG5cdFx0XHRcdFx0XHRcdC8vIFN0cmluZyB3YXMgYSBiYXJlIDx0aGVhZD4gb3IgPHRmb290PlxuXHRcdFx0XHRcdFx0XHR3cmFwWzFdID09PSBcIjx0YWJsZT5cIiAmJiAhcnRib2R5LnRlc3QoIGVsZW0gKSA/XG5cdFx0XHRcdFx0XHRcdFx0dG1wIDpcblx0XHRcdFx0XHRcdFx0XHQwO1xuXG5cdFx0XHRcdFx0XHRqID0gZWxlbSAmJiBlbGVtLmNoaWxkTm9kZXMubGVuZ3RoO1xuXHRcdFx0XHRcdFx0d2hpbGUgKCBqLS0gKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggalF1ZXJ5Lm5vZGVOYW1lKCAodGJvZHkgPSBlbGVtLmNoaWxkTm9kZXNbal0pLCBcInRib2R5XCIgKSAmJiAhdGJvZHkuY2hpbGROb2Rlcy5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZWxlbS5yZW1vdmVDaGlsZCggdGJvZHkgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGpRdWVyeS5tZXJnZSggbm9kZXMsIHRtcC5jaGlsZE5vZGVzICk7XG5cblx0XHRcdFx0XHQvLyBGaXggIzEyMzkyIGZvciBXZWJLaXQgYW5kIElFID4gOVxuXHRcdFx0XHRcdHRtcC50ZXh0Q29udGVudCA9IFwiXCI7XG5cblx0XHRcdFx0XHQvLyBGaXggIzEyMzkyIGZvciBvbGRJRVxuXHRcdFx0XHRcdHdoaWxlICggdG1wLmZpcnN0Q2hpbGQgKSB7XG5cdFx0XHRcdFx0XHR0bXAucmVtb3ZlQ2hpbGQoIHRtcC5maXJzdENoaWxkICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUmVtZW1iZXIgdGhlIHRvcC1sZXZlbCBjb250YWluZXIgZm9yIHByb3BlciBjbGVhbnVwXG5cdFx0XHRcdFx0dG1wID0gc2FmZS5sYXN0Q2hpbGQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBGaXggIzExMzU2OiBDbGVhciBlbGVtZW50cyBmcm9tIGZyYWdtZW50XG5cdFx0aWYgKCB0bXAgKSB7XG5cdFx0XHRzYWZlLnJlbW92ZUNoaWxkKCB0bXAgKTtcblx0XHR9XG5cblx0XHQvLyBSZXNldCBkZWZhdWx0Q2hlY2tlZCBmb3IgYW55IHJhZGlvcyBhbmQgY2hlY2tib3hlc1xuXHRcdC8vIGFib3V0IHRvIGJlIGFwcGVuZGVkIHRvIHRoZSBET00gaW4gSUUgNi83ICgjODA2MClcblx0XHRpZiAoICFzdXBwb3J0LmFwcGVuZENoZWNrZWQgKSB7XG5cdFx0XHRqUXVlcnkuZ3JlcCggZ2V0QWxsKCBub2RlcywgXCJpbnB1dFwiICksIGZpeERlZmF1bHRDaGVja2VkICk7XG5cdFx0fVxuXG5cdFx0aSA9IDA7XG5cdFx0d2hpbGUgKCAoZWxlbSA9IG5vZGVzWyBpKysgXSkgKSB7XG5cblx0XHRcdC8vICM0MDg3IC0gSWYgb3JpZ2luIGFuZCBkZXN0aW5hdGlvbiBlbGVtZW50cyBhcmUgdGhlIHNhbWUsIGFuZCB0aGlzIGlzXG5cdFx0XHQvLyB0aGF0IGVsZW1lbnQsIGRvIG5vdCBkbyBhbnl0aGluZ1xuXHRcdFx0aWYgKCBzZWxlY3Rpb24gJiYgalF1ZXJ5LmluQXJyYXkoIGVsZW0sIHNlbGVjdGlvbiApICE9PSAtMSApIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnRhaW5zID0galF1ZXJ5LmNvbnRhaW5zKCBlbGVtLm93bmVyRG9jdW1lbnQsIGVsZW0gKTtcblxuXHRcdFx0Ly8gQXBwZW5kIHRvIGZyYWdtZW50XG5cdFx0XHR0bXAgPSBnZXRBbGwoIHNhZmUuYXBwZW5kQ2hpbGQoIGVsZW0gKSwgXCJzY3JpcHRcIiApO1xuXG5cdFx0XHQvLyBQcmVzZXJ2ZSBzY3JpcHQgZXZhbHVhdGlvbiBoaXN0b3J5XG5cdFx0XHRpZiAoIGNvbnRhaW5zICkge1xuXHRcdFx0XHRzZXRHbG9iYWxFdmFsKCB0bXAgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2FwdHVyZSBleGVjdXRhYmxlc1xuXHRcdFx0aWYgKCBzY3JpcHRzICkge1xuXHRcdFx0XHRqID0gMDtcblx0XHRcdFx0d2hpbGUgKCAoZWxlbSA9IHRtcFsgaisrIF0pICkge1xuXHRcdFx0XHRcdGlmICggcnNjcmlwdFR5cGUudGVzdCggZWxlbS50eXBlIHx8IFwiXCIgKSApIHtcblx0XHRcdFx0XHRcdHNjcmlwdHMucHVzaCggZWxlbSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRtcCA9IG51bGw7XG5cblx0XHRyZXR1cm4gc2FmZTtcblx0fSxcblxuXHRjbGVhbkRhdGE6IGZ1bmN0aW9uKCBlbGVtcywgLyogaW50ZXJuYWwgKi8gYWNjZXB0RGF0YSApIHtcblx0XHR2YXIgZWxlbSwgdHlwZSwgaWQsIGRhdGEsXG5cdFx0XHRpID0gMCxcblx0XHRcdGludGVybmFsS2V5ID0galF1ZXJ5LmV4cGFuZG8sXG5cdFx0XHRjYWNoZSA9IGpRdWVyeS5jYWNoZSxcblx0XHRcdGRlbGV0ZUV4cGFuZG8gPSBzdXBwb3J0LmRlbGV0ZUV4cGFuZG8sXG5cdFx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWw7XG5cblx0XHRmb3IgKCA7IChlbGVtID0gZWxlbXNbaV0pICE9IG51bGw7IGkrKyApIHtcblx0XHRcdGlmICggYWNjZXB0RGF0YSB8fCBqUXVlcnkuYWNjZXB0RGF0YSggZWxlbSApICkge1xuXG5cdFx0XHRcdGlkID0gZWxlbVsgaW50ZXJuYWxLZXkgXTtcblx0XHRcdFx0ZGF0YSA9IGlkICYmIGNhY2hlWyBpZCBdO1xuXG5cdFx0XHRcdGlmICggZGF0YSApIHtcblx0XHRcdFx0XHRpZiAoIGRhdGEuZXZlbnRzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggdHlwZSBpbiBkYXRhLmV2ZW50cyApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCBzcGVjaWFsWyB0eXBlIF0gKSB7XG5cdFx0XHRcdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LnJlbW92ZSggZWxlbSwgdHlwZSApO1xuXG5cdFx0XHRcdFx0XHRcdC8vIFRoaXMgaXMgYSBzaG9ydGN1dCB0byBhdm9pZCBqUXVlcnkuZXZlbnQucmVtb3ZlJ3Mgb3ZlcmhlYWRcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkucmVtb3ZlRXZlbnQoIGVsZW0sIHR5cGUsIGRhdGEuaGFuZGxlICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBSZW1vdmUgY2FjaGUgb25seSBpZiBpdCB3YXMgbm90IGFscmVhZHkgcmVtb3ZlZCBieSBqUXVlcnkuZXZlbnQucmVtb3ZlXG5cdFx0XHRcdFx0aWYgKCBjYWNoZVsgaWQgXSApIHtcblxuXHRcdFx0XHRcdFx0ZGVsZXRlIGNhY2hlWyBpZCBdO1xuXG5cdFx0XHRcdFx0XHQvLyBJRSBkb2VzIG5vdCBhbGxvdyB1cyB0byBkZWxldGUgZXhwYW5kbyBwcm9wZXJ0aWVzIGZyb20gbm9kZXMsXG5cdFx0XHRcdFx0XHQvLyBub3IgZG9lcyBpdCBoYXZlIGEgcmVtb3ZlQXR0cmlidXRlIGZ1bmN0aW9uIG9uIERvY3VtZW50IG5vZGVzO1xuXHRcdFx0XHRcdFx0Ly8gd2UgbXVzdCBoYW5kbGUgYWxsIG9mIHRoZXNlIGNhc2VzXG5cdFx0XHRcdFx0XHRpZiAoIGRlbGV0ZUV4cGFuZG8gKSB7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBlbGVtWyBpbnRlcm5hbEtleSBdO1xuXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCB0eXBlb2YgZWxlbS5yZW1vdmVBdHRyaWJ1dGUgIT09IHN0cnVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRcdFx0ZWxlbS5yZW1vdmVBdHRyaWJ1dGUoIGludGVybmFsS2V5ICk7XG5cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGVsZW1bIGludGVybmFsS2V5IF0gPSBudWxsO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRkZWxldGVkSWRzLnB1c2goIGlkICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdHRleHQ6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRyZXR1cm4gYWNjZXNzKCB0aGlzLCBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRyZXR1cm4gdmFsdWUgPT09IHVuZGVmaW5lZCA/XG5cdFx0XHRcdGpRdWVyeS50ZXh0KCB0aGlzICkgOlxuXHRcdFx0XHR0aGlzLmVtcHR5KCkuYXBwZW5kKCAoIHRoaXNbMF0gJiYgdGhpc1swXS5vd25lckRvY3VtZW50IHx8IGRvY3VtZW50ICkuY3JlYXRlVGV4dE5vZGUoIHZhbHVlICkgKTtcblx0XHR9LCBudWxsLCB2YWx1ZSwgYXJndW1lbnRzLmxlbmd0aCApO1xuXHR9LFxuXG5cdGFwcGVuZDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZG9tTWFuaXAoIGFyZ3VtZW50cywgZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRpZiAoIHRoaXMubm9kZVR5cGUgPT09IDEgfHwgdGhpcy5ub2RlVHlwZSA9PT0gMTEgfHwgdGhpcy5ub2RlVHlwZSA9PT0gOSApIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9IG1hbmlwdWxhdGlvblRhcmdldCggdGhpcywgZWxlbSApO1xuXHRcdFx0XHR0YXJnZXQuYXBwZW5kQ2hpbGQoIGVsZW0gKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRwcmVwZW5kOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5kb21NYW5pcCggYXJndW1lbnRzLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdGlmICggdGhpcy5ub2RlVHlwZSA9PT0gMSB8fCB0aGlzLm5vZGVUeXBlID09PSAxMSB8fCB0aGlzLm5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gbWFuaXB1bGF0aW9uVGFyZ2V0KCB0aGlzLCBlbGVtICk7XG5cdFx0XHRcdHRhcmdldC5pbnNlcnRCZWZvcmUoIGVsZW0sIHRhcmdldC5maXJzdENoaWxkICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YmVmb3JlOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5kb21NYW5pcCggYXJndW1lbnRzLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdGlmICggdGhpcy5wYXJlbnROb2RlICkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKCBlbGVtLCB0aGlzICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0YWZ0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmRvbU1hbmlwKCBhcmd1bWVudHMsIGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0aWYgKCB0aGlzLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoIGVsZW0sIHRoaXMubmV4dFNpYmxpbmcgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRyZW1vdmU6IGZ1bmN0aW9uKCBzZWxlY3Rvciwga2VlcERhdGEgLyogSW50ZXJuYWwgVXNlIE9ubHkgKi8gKSB7XG5cdFx0dmFyIGVsZW0sXG5cdFx0XHRlbGVtcyA9IHNlbGVjdG9yID8galF1ZXJ5LmZpbHRlciggc2VsZWN0b3IsIHRoaXMgKSA6IHRoaXMsXG5cdFx0XHRpID0gMDtcblxuXHRcdGZvciAoIDsgKGVsZW0gPSBlbGVtc1tpXSkgIT0gbnVsbDsgaSsrICkge1xuXG5cdFx0XHRpZiAoICFrZWVwRGF0YSAmJiBlbGVtLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRqUXVlcnkuY2xlYW5EYXRhKCBnZXRBbGwoIGVsZW0gKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGVsZW0ucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0aWYgKCBrZWVwRGF0YSAmJiBqUXVlcnkuY29udGFpbnMoIGVsZW0ub3duZXJEb2N1bWVudCwgZWxlbSApICkge1xuXHRcdFx0XHRcdHNldEdsb2JhbEV2YWwoIGdldEFsbCggZWxlbSwgXCJzY3JpcHRcIiApICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxlbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCBlbGVtICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZW1wdHk6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBlbGVtLFxuXHRcdFx0aSA9IDA7XG5cblx0XHRmb3IgKCA7IChlbGVtID0gdGhpc1tpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdFx0Ly8gUmVtb3ZlIGVsZW1lbnQgbm9kZXMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG5cdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdGpRdWVyeS5jbGVhbkRhdGEoIGdldEFsbCggZWxlbSwgZmFsc2UgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZW1vdmUgYW55IHJlbWFpbmluZyBub2Rlc1xuXHRcdFx0d2hpbGUgKCBlbGVtLmZpcnN0Q2hpbGQgKSB7XG5cdFx0XHRcdGVsZW0ucmVtb3ZlQ2hpbGQoIGVsZW0uZmlyc3RDaGlsZCApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiB0aGlzIGlzIGEgc2VsZWN0LCBlbnN1cmUgdGhhdCBpdCBkaXNwbGF5cyBlbXB0eSAoIzEyMzM2KVxuXHRcdFx0Ly8gU3VwcG9ydDogSUU8OVxuXHRcdFx0aWYgKCBlbGVtLm9wdGlvbnMgJiYgalF1ZXJ5Lm5vZGVOYW1lKCBlbGVtLCBcInNlbGVjdFwiICkgKSB7XG5cdFx0XHRcdGVsZW0ub3B0aW9ucy5sZW5ndGggPSAwO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGNsb25lOiBmdW5jdGlvbiggZGF0YUFuZEV2ZW50cywgZGVlcERhdGFBbmRFdmVudHMgKSB7XG5cdFx0ZGF0YUFuZEV2ZW50cyA9IGRhdGFBbmRFdmVudHMgPT0gbnVsbCA/IGZhbHNlIDogZGF0YUFuZEV2ZW50cztcblx0XHRkZWVwRGF0YUFuZEV2ZW50cyA9IGRlZXBEYXRhQW5kRXZlbnRzID09IG51bGwgPyBkYXRhQW5kRXZlbnRzIDogZGVlcERhdGFBbmRFdmVudHM7XG5cblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4galF1ZXJ5LmNsb25lKCB0aGlzLCBkYXRhQW5kRXZlbnRzLCBkZWVwRGF0YUFuZEV2ZW50cyApO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGh0bWw6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRyZXR1cm4gYWNjZXNzKCB0aGlzLCBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHR2YXIgZWxlbSA9IHRoaXNbIDAgXSB8fCB7fSxcblx0XHRcdFx0aSA9IDAsXG5cdFx0XHRcdGwgPSB0aGlzLmxlbmd0aDtcblxuXHRcdFx0aWYgKCB2YWx1ZSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbS5ub2RlVHlwZSA9PT0gMSA/XG5cdFx0XHRcdFx0ZWxlbS5pbm5lckhUTUwucmVwbGFjZSggcmlubGluZWpRdWVyeSwgXCJcIiApIDpcblx0XHRcdFx0XHR1bmRlZmluZWQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNlZSBpZiB3ZSBjYW4gdGFrZSBhIHNob3J0Y3V0IGFuZCBqdXN0IHVzZSBpbm5lckhUTUxcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmICFybm9Jbm5lcmh0bWwudGVzdCggdmFsdWUgKSAmJlxuXHRcdFx0XHQoIHN1cHBvcnQuaHRtbFNlcmlhbGl6ZSB8fCAhcm5vc2hpbWNhY2hlLnRlc3QoIHZhbHVlICkgICkgJiZcblx0XHRcdFx0KCBzdXBwb3J0LmxlYWRpbmdXaGl0ZXNwYWNlIHx8ICFybGVhZGluZ1doaXRlc3BhY2UudGVzdCggdmFsdWUgKSApICYmXG5cdFx0XHRcdCF3cmFwTWFwWyAocnRhZ05hbWUuZXhlYyggdmFsdWUgKSB8fCBbIFwiXCIsIFwiXCIgXSlbIDEgXS50b0xvd2VyQ2FzZSgpIF0gKSB7XG5cblx0XHRcdFx0dmFsdWUgPSB2YWx1ZS5yZXBsYWNlKCByeGh0bWxUYWcsIFwiPCQxPjwvJDI+XCIgKTtcblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZvciAoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGVsZW1lbnQgbm9kZXMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG5cdFx0XHRcdFx0XHRlbGVtID0gdGhpc1tpXSB8fCB7fTtcblx0XHRcdFx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA9PT0gMSApIHtcblx0XHRcdFx0XHRcdFx0alF1ZXJ5LmNsZWFuRGF0YSggZ2V0QWxsKCBlbGVtLCBmYWxzZSApICk7XG5cdFx0XHRcdFx0XHRcdGVsZW0uaW5uZXJIVE1MID0gdmFsdWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZWxlbSA9IDA7XG5cblx0XHRcdFx0Ly8gSWYgdXNpbmcgaW5uZXJIVE1MIHRocm93cyBhbiBleGNlcHRpb24sIHVzZSB0aGUgZmFsbGJhY2sgbWV0aG9kXG5cdFx0XHRcdH0gY2F0Y2goZSkge31cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0XHR0aGlzLmVtcHR5KCkuYXBwZW5kKCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0sIG51bGwsIHZhbHVlLCBhcmd1bWVudHMubGVuZ3RoICk7XG5cdH0sXG5cblx0cmVwbGFjZVdpdGg6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBhcmcgPSBhcmd1bWVudHNbIDAgXTtcblxuXHRcdC8vIE1ha2UgdGhlIGNoYW5nZXMsIHJlcGxhY2luZyBlYWNoIGNvbnRleHQgZWxlbWVudCB3aXRoIHRoZSBuZXcgY29udGVudFxuXHRcdHRoaXMuZG9tTWFuaXAoIGFyZ3VtZW50cywgZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRhcmcgPSB0aGlzLnBhcmVudE5vZGU7XG5cblx0XHRcdGpRdWVyeS5jbGVhbkRhdGEoIGdldEFsbCggdGhpcyApICk7XG5cblx0XHRcdGlmICggYXJnICkge1xuXHRcdFx0XHRhcmcucmVwbGFjZUNoaWxkKCBlbGVtLCB0aGlzICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBGb3JjZSByZW1vdmFsIGlmIHRoZXJlIHdhcyBubyBuZXcgY29udGVudCAoZS5nLiwgZnJvbSBlbXB0eSBhcmd1bWVudHMpXG5cdFx0cmV0dXJuIGFyZyAmJiAoYXJnLmxlbmd0aCB8fCBhcmcubm9kZVR5cGUpID8gdGhpcyA6IHRoaXMucmVtb3ZlKCk7XG5cdH0sXG5cblx0ZGV0YWNoOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKCBzZWxlY3RvciwgdHJ1ZSApO1xuXHR9LFxuXG5cdGRvbU1hbmlwOiBmdW5jdGlvbiggYXJncywgY2FsbGJhY2sgKSB7XG5cblx0XHQvLyBGbGF0dGVuIGFueSBuZXN0ZWQgYXJyYXlzXG5cdFx0YXJncyA9IGNvbmNhdC5hcHBseSggW10sIGFyZ3MgKTtcblxuXHRcdHZhciBmaXJzdCwgbm9kZSwgaGFzU2NyaXB0cyxcblx0XHRcdHNjcmlwdHMsIGRvYywgZnJhZ21lbnQsXG5cdFx0XHRpID0gMCxcblx0XHRcdGwgPSB0aGlzLmxlbmd0aCxcblx0XHRcdHNldCA9IHRoaXMsXG5cdFx0XHRpTm9DbG9uZSA9IGwgLSAxLFxuXHRcdFx0dmFsdWUgPSBhcmdzWzBdLFxuXHRcdFx0aXNGdW5jdGlvbiA9IGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApO1xuXG5cdFx0Ly8gV2UgY2FuJ3QgY2xvbmVOb2RlIGZyYWdtZW50cyB0aGF0IGNvbnRhaW4gY2hlY2tlZCwgaW4gV2ViS2l0XG5cdFx0aWYgKCBpc0Z1bmN0aW9uIHx8XG5cdFx0XHRcdCggbCA+IDEgJiYgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmXG5cdFx0XHRcdFx0IXN1cHBvcnQuY2hlY2tDbG9uZSAmJiByY2hlY2tlZC50ZXN0KCB2YWx1ZSApICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRcdFx0dmFyIHNlbGYgPSBzZXQuZXEoIGluZGV4ICk7XG5cdFx0XHRcdGlmICggaXNGdW5jdGlvbiApIHtcblx0XHRcdFx0XHRhcmdzWzBdID0gdmFsdWUuY2FsbCggdGhpcywgaW5kZXgsIHNlbGYuaHRtbCgpICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5kb21NYW5pcCggYXJncywgY2FsbGJhY2sgKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICggbCApIHtcblx0XHRcdGZyYWdtZW50ID0galF1ZXJ5LmJ1aWxkRnJhZ21lbnQoIGFyZ3MsIHRoaXNbIDAgXS5vd25lckRvY3VtZW50LCBmYWxzZSwgdGhpcyApO1xuXHRcdFx0Zmlyc3QgPSBmcmFnbWVudC5maXJzdENoaWxkO1xuXG5cdFx0XHRpZiAoIGZyYWdtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxICkge1xuXHRcdFx0XHRmcmFnbWVudCA9IGZpcnN0O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGZpcnN0ICkge1xuXHRcdFx0XHRzY3JpcHRzID0galF1ZXJ5Lm1hcCggZ2V0QWxsKCBmcmFnbWVudCwgXCJzY3JpcHRcIiApLCBkaXNhYmxlU2NyaXB0ICk7XG5cdFx0XHRcdGhhc1NjcmlwdHMgPSBzY3JpcHRzLmxlbmd0aDtcblxuXHRcdFx0XHQvLyBVc2UgdGhlIG9yaWdpbmFsIGZyYWdtZW50IGZvciB0aGUgbGFzdCBpdGVtIGluc3RlYWQgb2YgdGhlIGZpcnN0IGJlY2F1c2UgaXQgY2FuIGVuZCB1cFxuXHRcdFx0XHQvLyBiZWluZyBlbXB0aWVkIGluY29ycmVjdGx5IGluIGNlcnRhaW4gc2l0dWF0aW9ucyAoIzgwNzApLlxuXHRcdFx0XHRmb3IgKCA7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRcdFx0bm9kZSA9IGZyYWdtZW50O1xuXG5cdFx0XHRcdFx0aWYgKCBpICE9PSBpTm9DbG9uZSApIHtcblx0XHRcdFx0XHRcdG5vZGUgPSBqUXVlcnkuY2xvbmUoIG5vZGUsIHRydWUsIHRydWUgKTtcblxuXHRcdFx0XHRcdFx0Ly8gS2VlcCByZWZlcmVuY2VzIHRvIGNsb25lZCBzY3JpcHRzIGZvciBsYXRlciByZXN0b3JhdGlvblxuXHRcdFx0XHRcdFx0aWYgKCBoYXNTY3JpcHRzICkge1xuXHRcdFx0XHRcdFx0XHRqUXVlcnkubWVyZ2UoIHNjcmlwdHMsIGdldEFsbCggbm9kZSwgXCJzY3JpcHRcIiApICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y2FsbGJhY2suY2FsbCggdGhpc1tpXSwgbm9kZSwgaSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBoYXNTY3JpcHRzICkge1xuXHRcdFx0XHRcdGRvYyA9IHNjcmlwdHNbIHNjcmlwdHMubGVuZ3RoIC0gMSBdLm93bmVyRG9jdW1lbnQ7XG5cblx0XHRcdFx0XHQvLyBSZWVuYWJsZSBzY3JpcHRzXG5cdFx0XHRcdFx0alF1ZXJ5Lm1hcCggc2NyaXB0cywgcmVzdG9yZVNjcmlwdCApO1xuXG5cdFx0XHRcdFx0Ly8gRXZhbHVhdGUgZXhlY3V0YWJsZSBzY3JpcHRzIG9uIGZpcnN0IGRvY3VtZW50IGluc2VydGlvblxuXHRcdFx0XHRcdGZvciAoIGkgPSAwOyBpIDwgaGFzU2NyaXB0czsgaSsrICkge1xuXHRcdFx0XHRcdFx0bm9kZSA9IHNjcmlwdHNbIGkgXTtcblx0XHRcdFx0XHRcdGlmICggcnNjcmlwdFR5cGUudGVzdCggbm9kZS50eXBlIHx8IFwiXCIgKSAmJlxuXHRcdFx0XHRcdFx0XHQhalF1ZXJ5Ll9kYXRhKCBub2RlLCBcImdsb2JhbEV2YWxcIiApICYmIGpRdWVyeS5jb250YWlucyggZG9jLCBub2RlICkgKSB7XG5cblx0XHRcdFx0XHRcdFx0aWYgKCBub2RlLnNyYyApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBPcHRpb25hbCBBSkFYIGRlcGVuZGVuY3ksIGJ1dCB3b24ndCBydW4gc2NyaXB0cyBpZiBub3QgcHJlc2VudFxuXHRcdFx0XHRcdFx0XHRcdGlmICggalF1ZXJ5Ll9ldmFsVXJsICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0alF1ZXJ5Ll9ldmFsVXJsKCBub2RlLnNyYyApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkuZ2xvYmFsRXZhbCggKCBub2RlLnRleHQgfHwgbm9kZS50ZXh0Q29udGVudCB8fCBub2RlLmlubmVySFRNTCB8fCBcIlwiICkucmVwbGFjZSggcmNsZWFuU2NyaXB0LCBcIlwiICkgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEZpeCAjMTE4MDk6IEF2b2lkIGxlYWtpbmcgbWVtb3J5XG5cdFx0XHRcdGZyYWdtZW50ID0gZmlyc3QgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxualF1ZXJ5LmVhY2goe1xuXHRhcHBlbmRUbzogXCJhcHBlbmRcIixcblx0cHJlcGVuZFRvOiBcInByZXBlbmRcIixcblx0aW5zZXJ0QmVmb3JlOiBcImJlZm9yZVwiLFxuXHRpbnNlcnRBZnRlcjogXCJhZnRlclwiLFxuXHRyZXBsYWNlQWxsOiBcInJlcGxhY2VXaXRoXCJcbn0sIGZ1bmN0aW9uKCBuYW1lLCBvcmlnaW5hbCApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGVsZW1zLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRyZXQgPSBbXSxcblx0XHRcdGluc2VydCA9IGpRdWVyeSggc2VsZWN0b3IgKSxcblx0XHRcdGxhc3QgPSBpbnNlcnQubGVuZ3RoIC0gMTtcblxuXHRcdGZvciAoIDsgaSA8PSBsYXN0OyBpKysgKSB7XG5cdFx0XHRlbGVtcyA9IGkgPT09IGxhc3QgPyB0aGlzIDogdGhpcy5jbG9uZSh0cnVlKTtcblx0XHRcdGpRdWVyeSggaW5zZXJ0W2ldIClbIG9yaWdpbmFsIF0oIGVsZW1zICk7XG5cblx0XHRcdC8vIE1vZGVybiBicm93c2VycyBjYW4gYXBwbHkgalF1ZXJ5IGNvbGxlY3Rpb25zIGFzIGFycmF5cywgYnV0IG9sZElFIG5lZWRzIGEgLmdldCgpXG5cdFx0XHRwdXNoLmFwcGx5KCByZXQsIGVsZW1zLmdldCgpICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMucHVzaFN0YWNrKCByZXQgKTtcblx0fTtcbn0pO1xuXG5cbnZhciBpZnJhbWUsXG5cdGVsZW1kaXNwbGF5ID0ge307XG5cbi8qKlxuICogUmV0cmlldmUgdGhlIGFjdHVhbCBkaXNwbGF5IG9mIGEgZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbm9kZU5hbWUgb2YgdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgRG9jdW1lbnQgb2JqZWN0XG4gKi9cbi8vIENhbGxlZCBvbmx5IGZyb20gd2l0aGluIGRlZmF1bHREaXNwbGF5XG5mdW5jdGlvbiBhY3R1YWxEaXNwbGF5KCBuYW1lLCBkb2MgKSB7XG5cdHZhciBzdHlsZSxcblx0XHRlbGVtID0galF1ZXJ5KCBkb2MuY3JlYXRlRWxlbWVudCggbmFtZSApICkuYXBwZW5kVG8oIGRvYy5ib2R5ICksXG5cblx0XHQvLyBnZXREZWZhdWx0Q29tcHV0ZWRTdHlsZSBtaWdodCBiZSByZWxpYWJseSB1c2VkIG9ubHkgb24gYXR0YWNoZWQgZWxlbWVudFxuXHRcdGRpc3BsYXkgPSB3aW5kb3cuZ2V0RGVmYXVsdENvbXB1dGVkU3R5bGUgJiYgKCBzdHlsZSA9IHdpbmRvdy5nZXREZWZhdWx0Q29tcHV0ZWRTdHlsZSggZWxlbVsgMCBdICkgKSA/XG5cblx0XHRcdC8vIFVzZSBvZiB0aGlzIG1ldGhvZCBpcyBhIHRlbXBvcmFyeSBmaXggKG1vcmUgbGlrZSBvcHRtaXphdGlvbikgdW50aWwgc29tZXRoaW5nIGJldHRlciBjb21lcyBhbG9uZyxcblx0XHRcdC8vIHNpbmNlIGl0IHdhcyByZW1vdmVkIGZyb20gc3BlY2lmaWNhdGlvbiBhbmQgc3VwcG9ydGVkIG9ubHkgaW4gRkZcblx0XHRcdHN0eWxlLmRpc3BsYXkgOiBqUXVlcnkuY3NzKCBlbGVtWyAwIF0sIFwiZGlzcGxheVwiICk7XG5cblx0Ly8gV2UgZG9uJ3QgaGF2ZSBhbnkgZGF0YSBzdG9yZWQgb24gdGhlIGVsZW1lbnQsXG5cdC8vIHNvIHVzZSBcImRldGFjaFwiIG1ldGhvZCBhcyBmYXN0IHdheSB0byBnZXQgcmlkIG9mIHRoZSBlbGVtZW50XG5cdGVsZW0uZGV0YWNoKCk7XG5cblx0cmV0dXJuIGRpc3BsYXk7XG59XG5cbi8qKlxuICogVHJ5IHRvIGRldGVybWluZSB0aGUgZGVmYXVsdCBkaXNwbGF5IHZhbHVlIG9mIGFuIGVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBub2RlTmFtZVxuICovXG5mdW5jdGlvbiBkZWZhdWx0RGlzcGxheSggbm9kZU5hbWUgKSB7XG5cdHZhciBkb2MgPSBkb2N1bWVudCxcblx0XHRkaXNwbGF5ID0gZWxlbWRpc3BsYXlbIG5vZGVOYW1lIF07XG5cblx0aWYgKCAhZGlzcGxheSApIHtcblx0XHRkaXNwbGF5ID0gYWN0dWFsRGlzcGxheSggbm9kZU5hbWUsIGRvYyApO1xuXG5cdFx0Ly8gSWYgdGhlIHNpbXBsZSB3YXkgZmFpbHMsIHJlYWQgZnJvbSBpbnNpZGUgYW4gaWZyYW1lXG5cdFx0aWYgKCBkaXNwbGF5ID09PSBcIm5vbmVcIiB8fCAhZGlzcGxheSApIHtcblxuXHRcdFx0Ly8gVXNlIHRoZSBhbHJlYWR5LWNyZWF0ZWQgaWZyYW1lIGlmIHBvc3NpYmxlXG5cdFx0XHRpZnJhbWUgPSAoaWZyYW1lIHx8IGpRdWVyeSggXCI8aWZyYW1lIGZyYW1lYm9yZGVyPScwJyB3aWR0aD0nMCcgaGVpZ2h0PScwJy8+XCIgKSkuYXBwZW5kVG8oIGRvYy5kb2N1bWVudEVsZW1lbnQgKTtcblxuXHRcdFx0Ly8gQWx3YXlzIHdyaXRlIGEgbmV3IEhUTUwgc2tlbGV0b24gc28gV2Via2l0IGFuZCBGaXJlZm94IGRvbid0IGNob2tlIG9uIHJldXNlXG5cdFx0XHRkb2MgPSAoIGlmcmFtZVsgMCBdLmNvbnRlbnRXaW5kb3cgfHwgaWZyYW1lWyAwIF0uY29udGVudERvY3VtZW50ICkuZG9jdW1lbnQ7XG5cblx0XHRcdC8vIFN1cHBvcnQ6IElFXG5cdFx0XHRkb2Mud3JpdGUoKTtcblx0XHRcdGRvYy5jbG9zZSgpO1xuXG5cdFx0XHRkaXNwbGF5ID0gYWN0dWFsRGlzcGxheSggbm9kZU5hbWUsIGRvYyApO1xuXHRcdFx0aWZyYW1lLmRldGFjaCgpO1xuXHRcdH1cblxuXHRcdC8vIFN0b3JlIHRoZSBjb3JyZWN0IGRlZmF1bHQgZGlzcGxheVxuXHRcdGVsZW1kaXNwbGF5WyBub2RlTmFtZSBdID0gZGlzcGxheTtcblx0fVxuXG5cdHJldHVybiBkaXNwbGF5O1xufVxuXG5cbihmdW5jdGlvbigpIHtcblx0dmFyIHNocmlua1dyYXBCbG9ja3NWYWw7XG5cblx0c3VwcG9ydC5zaHJpbmtXcmFwQmxvY2tzID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCBzaHJpbmtXcmFwQmxvY2tzVmFsICE9IG51bGwgKSB7XG5cdFx0XHRyZXR1cm4gc2hyaW5rV3JhcEJsb2Nrc1ZhbDtcblx0XHR9XG5cblx0XHQvLyBXaWxsIGJlIGNoYW5nZWQgbGF0ZXIgaWYgbmVlZGVkLlxuXHRcdHNocmlua1dyYXBCbG9ja3NWYWwgPSBmYWxzZTtcblxuXHRcdC8vIE1pbmlmaWVkOiB2YXIgYixjLGRcblx0XHR2YXIgZGl2LCBib2R5LCBjb250YWluZXI7XG5cblx0XHRib2R5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiYm9keVwiIClbIDAgXTtcblx0XHRpZiAoICFib2R5IHx8ICFib2R5LnN0eWxlICkge1xuXHRcdFx0Ly8gVGVzdCBmaXJlZCB0b28gZWFybHkgb3IgaW4gYW4gdW5zdXBwb3J0ZWQgZW52aXJvbm1lbnQsIGV4aXQuXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gU2V0dXBcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImRpdlwiICk7XG5cdFx0Y29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJkaXZcIiApO1xuXHRcdGNvbnRhaW5lci5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjphYnNvbHV0ZTtib3JkZXI6MDt3aWR0aDowO2hlaWdodDowO3RvcDowO2xlZnQ6LTk5OTlweFwiO1xuXHRcdGJvZHkuYXBwZW5kQ2hpbGQoIGNvbnRhaW5lciApLmFwcGVuZENoaWxkKCBkaXYgKTtcblxuXHRcdC8vIFN1cHBvcnQ6IElFNlxuXHRcdC8vIENoZWNrIGlmIGVsZW1lbnRzIHdpdGggbGF5b3V0IHNocmluay13cmFwIHRoZWlyIGNoaWxkcmVuXG5cdFx0aWYgKCB0eXBlb2YgZGl2LnN0eWxlLnpvb20gIT09IHN0cnVuZGVmaW5lZCApIHtcblx0XHRcdC8vIFJlc2V0IENTUzogYm94LXNpemluZzsgZGlzcGxheTsgbWFyZ2luOyBib3JkZXJcblx0XHRcdGRpdi5zdHlsZS5jc3NUZXh0ID1cblx0XHRcdFx0Ly8gU3VwcG9ydDogRmlyZWZveDwyOSwgQW5kcm9pZCAyLjNcblx0XHRcdFx0Ly8gVmVuZG9yLXByZWZpeCBib3gtc2l6aW5nXG5cdFx0XHRcdFwiLXdlYmtpdC1ib3gtc2l6aW5nOmNvbnRlbnQtYm94Oy1tb3otYm94LXNpemluZzpjb250ZW50LWJveDtcIiArXG5cdFx0XHRcdFwiYm94LXNpemluZzpjb250ZW50LWJveDtkaXNwbGF5OmJsb2NrO21hcmdpbjowO2JvcmRlcjowO1wiICtcblx0XHRcdFx0XCJwYWRkaW5nOjFweDt3aWR0aDoxcHg7em9vbToxXCI7XG5cdFx0XHRkaXYuYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZGl2XCIgKSApLnN0eWxlLndpZHRoID0gXCI1cHhcIjtcblx0XHRcdHNocmlua1dyYXBCbG9ja3NWYWwgPSBkaXYub2Zmc2V0V2lkdGggIT09IDM7XG5cdFx0fVxuXG5cdFx0Ym9keS5yZW1vdmVDaGlsZCggY29udGFpbmVyICk7XG5cblx0XHRyZXR1cm4gc2hyaW5rV3JhcEJsb2Nrc1ZhbDtcblx0fTtcblxufSkoKTtcbnZhciBybWFyZ2luID0gKC9ebWFyZ2luLyk7XG5cbnZhciBybnVtbm9ucHggPSBuZXcgUmVnRXhwKCBcIl4oXCIgKyBwbnVtICsgXCIpKD8hcHgpW2EteiVdKyRcIiwgXCJpXCIgKTtcblxuXG5cbnZhciBnZXRTdHlsZXMsIGN1ckNTUyxcblx0cnBvc2l0aW9uID0gL14odG9wfHJpZ2h0fGJvdHRvbXxsZWZ0KSQvO1xuXG5pZiAoIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlICkge1xuXHRnZXRTdHlsZXMgPSBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4gZWxlbS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUoIGVsZW0sIG51bGwgKTtcblx0fTtcblxuXHRjdXJDU1MgPSBmdW5jdGlvbiggZWxlbSwgbmFtZSwgY29tcHV0ZWQgKSB7XG5cdFx0dmFyIHdpZHRoLCBtaW5XaWR0aCwgbWF4V2lkdGgsIHJldCxcblx0XHRcdHN0eWxlID0gZWxlbS5zdHlsZTtcblxuXHRcdGNvbXB1dGVkID0gY29tcHV0ZWQgfHwgZ2V0U3R5bGVzKCBlbGVtICk7XG5cblx0XHQvLyBnZXRQcm9wZXJ0eVZhbHVlIGlzIG9ubHkgbmVlZGVkIGZvciAuY3NzKCdmaWx0ZXInKSBpbiBJRTksIHNlZSAjMTI1Mzdcblx0XHRyZXQgPSBjb21wdXRlZCA/IGNvbXB1dGVkLmdldFByb3BlcnR5VmFsdWUoIG5hbWUgKSB8fCBjb21wdXRlZFsgbmFtZSBdIDogdW5kZWZpbmVkO1xuXG5cdFx0aWYgKCBjb21wdXRlZCApIHtcblxuXHRcdFx0aWYgKCByZXQgPT09IFwiXCIgJiYgIWpRdWVyeS5jb250YWlucyggZWxlbS5vd25lckRvY3VtZW50LCBlbGVtICkgKSB7XG5cdFx0XHRcdHJldCA9IGpRdWVyeS5zdHlsZSggZWxlbSwgbmFtZSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBIHRyaWJ1dGUgdG8gdGhlIFwiYXdlc29tZSBoYWNrIGJ5IERlYW4gRWR3YXJkc1wiXG5cdFx0XHQvLyBDaHJvbWUgPCAxNyBhbmQgU2FmYXJpIDUuMCB1c2VzIFwiY29tcHV0ZWQgdmFsdWVcIiBpbnN0ZWFkIG9mIFwidXNlZCB2YWx1ZVwiIGZvciBtYXJnaW4tcmlnaHRcblx0XHRcdC8vIFNhZmFyaSA1LjEuNyAoYXQgbGVhc3QpIHJldHVybnMgcGVyY2VudGFnZSBmb3IgYSBsYXJnZXIgc2V0IG9mIHZhbHVlcywgYnV0IHdpZHRoIHNlZW1zIHRvIGJlIHJlbGlhYmx5IHBpeGVsc1xuXHRcdFx0Ly8gdGhpcyBpcyBhZ2FpbnN0IHRoZSBDU1NPTSBkcmFmdCBzcGVjOiBodHRwOi8vZGV2LnczLm9yZy9jc3N3Zy9jc3NvbS8jcmVzb2x2ZWQtdmFsdWVzXG5cdFx0XHRpZiAoIHJudW1ub25weC50ZXN0KCByZXQgKSAmJiBybWFyZ2luLnRlc3QoIG5hbWUgKSApIHtcblxuXHRcdFx0XHQvLyBSZW1lbWJlciB0aGUgb3JpZ2luYWwgdmFsdWVzXG5cdFx0XHRcdHdpZHRoID0gc3R5bGUud2lkdGg7XG5cdFx0XHRcdG1pbldpZHRoID0gc3R5bGUubWluV2lkdGg7XG5cdFx0XHRcdG1heFdpZHRoID0gc3R5bGUubWF4V2lkdGg7XG5cblx0XHRcdFx0Ly8gUHV0IGluIHRoZSBuZXcgdmFsdWVzIHRvIGdldCBhIGNvbXB1dGVkIHZhbHVlIG91dFxuXHRcdFx0XHRzdHlsZS5taW5XaWR0aCA9IHN0eWxlLm1heFdpZHRoID0gc3R5bGUud2lkdGggPSByZXQ7XG5cdFx0XHRcdHJldCA9IGNvbXB1dGVkLndpZHRoO1xuXG5cdFx0XHRcdC8vIFJldmVydCB0aGUgY2hhbmdlZCB2YWx1ZXNcblx0XHRcdFx0c3R5bGUud2lkdGggPSB3aWR0aDtcblx0XHRcdFx0c3R5bGUubWluV2lkdGggPSBtaW5XaWR0aDtcblx0XHRcdFx0c3R5bGUubWF4V2lkdGggPSBtYXhXaWR0aDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdXBwb3J0OiBJRVxuXHRcdC8vIElFIHJldHVybnMgekluZGV4IHZhbHVlIGFzIGFuIGludGVnZXIuXG5cdFx0cmV0dXJuIHJldCA9PT0gdW5kZWZpbmVkID9cblx0XHRcdHJldCA6XG5cdFx0XHRyZXQgKyBcIlwiO1xuXHR9O1xufSBlbHNlIGlmICggZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmN1cnJlbnRTdHlsZSApIHtcblx0Z2V0U3R5bGVzID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuIGVsZW0uY3VycmVudFN0eWxlO1xuXHR9O1xuXG5cdGN1ckNTUyA9IGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCBjb21wdXRlZCApIHtcblx0XHR2YXIgbGVmdCwgcnMsIHJzTGVmdCwgcmV0LFxuXHRcdFx0c3R5bGUgPSBlbGVtLnN0eWxlO1xuXG5cdFx0Y29tcHV0ZWQgPSBjb21wdXRlZCB8fCBnZXRTdHlsZXMoIGVsZW0gKTtcblx0XHRyZXQgPSBjb21wdXRlZCA/IGNvbXB1dGVkWyBuYW1lIF0gOiB1bmRlZmluZWQ7XG5cblx0XHQvLyBBdm9pZCBzZXR0aW5nIHJldCB0byBlbXB0eSBzdHJpbmcgaGVyZVxuXHRcdC8vIHNvIHdlIGRvbid0IGRlZmF1bHQgdG8gYXV0b1xuXHRcdGlmICggcmV0ID09IG51bGwgJiYgc3R5bGUgJiYgc3R5bGVbIG5hbWUgXSApIHtcblx0XHRcdHJldCA9IHN0eWxlWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0Ly8gRnJvbSB0aGUgYXdlc29tZSBoYWNrIGJ5IERlYW4gRWR3YXJkc1xuXHRcdC8vIGh0dHA6Ly9lcmlrLmVhZS5uZXQvYXJjaGl2ZXMvMjAwNy8wNy8yNy8xOC41NC4xNS8jY29tbWVudC0xMDIyOTFcblxuXHRcdC8vIElmIHdlJ3JlIG5vdCBkZWFsaW5nIHdpdGggYSByZWd1bGFyIHBpeGVsIG51bWJlclxuXHRcdC8vIGJ1dCBhIG51bWJlciB0aGF0IGhhcyBhIHdlaXJkIGVuZGluZywgd2UgbmVlZCB0byBjb252ZXJ0IGl0IHRvIHBpeGVsc1xuXHRcdC8vIGJ1dCBub3QgcG9zaXRpb24gY3NzIGF0dHJpYnV0ZXMsIGFzIHRob3NlIGFyZSBwcm9wb3J0aW9uYWwgdG8gdGhlIHBhcmVudCBlbGVtZW50IGluc3RlYWRcblx0XHQvLyBhbmQgd2UgY2FuJ3QgbWVhc3VyZSB0aGUgcGFyZW50IGluc3RlYWQgYmVjYXVzZSBpdCBtaWdodCB0cmlnZ2VyIGEgXCJzdGFja2luZyBkb2xsc1wiIHByb2JsZW1cblx0XHRpZiAoIHJudW1ub25weC50ZXN0KCByZXQgKSAmJiAhcnBvc2l0aW9uLnRlc3QoIG5hbWUgKSApIHtcblxuXHRcdFx0Ly8gUmVtZW1iZXIgdGhlIG9yaWdpbmFsIHZhbHVlc1xuXHRcdFx0bGVmdCA9IHN0eWxlLmxlZnQ7XG5cdFx0XHRycyA9IGVsZW0ucnVudGltZVN0eWxlO1xuXHRcdFx0cnNMZWZ0ID0gcnMgJiYgcnMubGVmdDtcblxuXHRcdFx0Ly8gUHV0IGluIHRoZSBuZXcgdmFsdWVzIHRvIGdldCBhIGNvbXB1dGVkIHZhbHVlIG91dFxuXHRcdFx0aWYgKCByc0xlZnQgKSB7XG5cdFx0XHRcdHJzLmxlZnQgPSBlbGVtLmN1cnJlbnRTdHlsZS5sZWZ0O1xuXHRcdFx0fVxuXHRcdFx0c3R5bGUubGVmdCA9IG5hbWUgPT09IFwiZm9udFNpemVcIiA/IFwiMWVtXCIgOiByZXQ7XG5cdFx0XHRyZXQgPSBzdHlsZS5waXhlbExlZnQgKyBcInB4XCI7XG5cblx0XHRcdC8vIFJldmVydCB0aGUgY2hhbmdlZCB2YWx1ZXNcblx0XHRcdHN0eWxlLmxlZnQgPSBsZWZ0O1xuXHRcdFx0aWYgKCByc0xlZnQgKSB7XG5cdFx0XHRcdHJzLmxlZnQgPSByc0xlZnQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gU3VwcG9ydDogSUVcblx0XHQvLyBJRSByZXR1cm5zIHpJbmRleCB2YWx1ZSBhcyBhbiBpbnRlZ2VyLlxuXHRcdHJldHVybiByZXQgPT09IHVuZGVmaW5lZCA/XG5cdFx0XHRyZXQgOlxuXHRcdFx0cmV0ICsgXCJcIiB8fCBcImF1dG9cIjtcblx0fTtcbn1cblxuXG5cblxuZnVuY3Rpb24gYWRkR2V0SG9va0lmKCBjb25kaXRpb25GbiwgaG9va0ZuICkge1xuXHQvLyBEZWZpbmUgdGhlIGhvb2ssIHdlJ2xsIGNoZWNrIG9uIHRoZSBmaXJzdCBydW4gaWYgaXQncyByZWFsbHkgbmVlZGVkLlxuXHRyZXR1cm4ge1xuXHRcdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY29uZGl0aW9uID0gY29uZGl0aW9uRm4oKTtcblxuXHRcdFx0aWYgKCBjb25kaXRpb24gPT0gbnVsbCApIHtcblx0XHRcdFx0Ly8gVGhlIHRlc3Qgd2FzIG5vdCByZWFkeSBhdCB0aGlzIHBvaW50OyBzY3JldyB0aGUgaG9vayB0aGlzIHRpbWVcblx0XHRcdFx0Ly8gYnV0IGNoZWNrIGFnYWluIHdoZW4gbmVlZGVkIG5leHQgdGltZS5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbmRpdGlvbiApIHtcblx0XHRcdFx0Ly8gSG9vayBub3QgbmVlZGVkIChvciBpdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgaXQgZHVlIHRvIG1pc3NpbmcgZGVwZW5kZW5jeSksXG5cdFx0XHRcdC8vIHJlbW92ZSBpdC5cblx0XHRcdFx0Ly8gU2luY2UgdGhlcmUgYXJlIG5vIG90aGVyIGhvb2tzIGZvciBtYXJnaW5SaWdodCwgcmVtb3ZlIHRoZSB3aG9sZSBvYmplY3QuXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLmdldDtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBIb29rIG5lZWRlZDsgcmVkZWZpbmUgaXQgc28gdGhhdCB0aGUgc3VwcG9ydCB0ZXN0IGlzIG5vdCBleGVjdXRlZCBhZ2Fpbi5cblxuXHRcdFx0cmV0dXJuICh0aGlzLmdldCA9IGhvb2tGbikuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdH1cblx0fTtcbn1cblxuXG4oZnVuY3Rpb24oKSB7XG5cdC8vIE1pbmlmaWVkOiB2YXIgYixjLGQsZSxmLGcsIGgsaVxuXHR2YXIgZGl2LCBzdHlsZSwgYSwgcGl4ZWxQb3NpdGlvblZhbCwgYm94U2l6aW5nUmVsaWFibGVWYWwsXG5cdFx0cmVsaWFibGVIaWRkZW5PZmZzZXRzVmFsLCByZWxpYWJsZU1hcmdpblJpZ2h0VmFsO1xuXG5cdC8vIFNldHVwXG5cdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZGl2XCIgKTtcblx0ZGl2LmlubmVySFRNTCA9IFwiICA8bGluay8+PHRhYmxlPjwvdGFibGU+PGEgaHJlZj0nL2EnPmE8L2E+PGlucHV0IHR5cGU9J2NoZWNrYm94Jy8+XCI7XG5cdGEgPSBkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiYVwiIClbIDAgXTtcblx0c3R5bGUgPSBhICYmIGEuc3R5bGU7XG5cblx0Ly8gRmluaXNoIGVhcmx5IGluIGxpbWl0ZWQgKG5vbi1icm93c2VyKSBlbnZpcm9ubWVudHNcblx0aWYgKCAhc3R5bGUgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0c3R5bGUuY3NzVGV4dCA9IFwiZmxvYXQ6bGVmdDtvcGFjaXR5Oi41XCI7XG5cblx0Ly8gU3VwcG9ydDogSUU8OVxuXHQvLyBNYWtlIHN1cmUgdGhhdCBlbGVtZW50IG9wYWNpdHkgZXhpc3RzIChhcyBvcHBvc2VkIHRvIGZpbHRlcilcblx0c3VwcG9ydC5vcGFjaXR5ID0gc3R5bGUub3BhY2l0eSA9PT0gXCIwLjVcIjtcblxuXHQvLyBWZXJpZnkgc3R5bGUgZmxvYXQgZXhpc3RlbmNlXG5cdC8vIChJRSB1c2VzIHN0eWxlRmxvYXQgaW5zdGVhZCBvZiBjc3NGbG9hdClcblx0c3VwcG9ydC5jc3NGbG9hdCA9ICEhc3R5bGUuY3NzRmxvYXQ7XG5cblx0ZGl2LnN0eWxlLmJhY2tncm91bmRDbGlwID0gXCJjb250ZW50LWJveFwiO1xuXHRkaXYuY2xvbmVOb2RlKCB0cnVlICkuc3R5bGUuYmFja2dyb3VuZENsaXAgPSBcIlwiO1xuXHRzdXBwb3J0LmNsZWFyQ2xvbmVTdHlsZSA9IGRpdi5zdHlsZS5iYWNrZ3JvdW5kQ2xpcCA9PT0gXCJjb250ZW50LWJveFwiO1xuXG5cdC8vIFN1cHBvcnQ6IEZpcmVmb3g8MjksIEFuZHJvaWQgMi4zXG5cdC8vIFZlbmRvci1wcmVmaXggYm94LXNpemluZ1xuXHRzdXBwb3J0LmJveFNpemluZyA9IHN0eWxlLmJveFNpemluZyA9PT0gXCJcIiB8fCBzdHlsZS5Nb3pCb3hTaXppbmcgPT09IFwiXCIgfHxcblx0XHRzdHlsZS5XZWJraXRCb3hTaXppbmcgPT09IFwiXCI7XG5cblx0alF1ZXJ5LmV4dGVuZChzdXBwb3J0LCB7XG5cdFx0cmVsaWFibGVIaWRkZW5PZmZzZXRzOiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggcmVsaWFibGVIaWRkZW5PZmZzZXRzVmFsID09IG51bGwgKSB7XG5cdFx0XHRcdGNvbXB1dGVTdHlsZVRlc3RzKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVsaWFibGVIaWRkZW5PZmZzZXRzVmFsO1xuXHRcdH0sXG5cblx0XHRib3hTaXppbmdSZWxpYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIGJveFNpemluZ1JlbGlhYmxlVmFsID09IG51bGwgKSB7XG5cdFx0XHRcdGNvbXB1dGVTdHlsZVRlc3RzKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYm94U2l6aW5nUmVsaWFibGVWYWw7XG5cdFx0fSxcblxuXHRcdHBpeGVsUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBwaXhlbFBvc2l0aW9uVmFsID09IG51bGwgKSB7XG5cdFx0XHRcdGNvbXB1dGVTdHlsZVRlc3RzKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcGl4ZWxQb3NpdGlvblZhbDtcblx0XHR9LFxuXG5cdFx0Ly8gU3VwcG9ydDogQW5kcm9pZCAyLjNcblx0XHRyZWxpYWJsZU1hcmdpblJpZ2h0OiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggcmVsaWFibGVNYXJnaW5SaWdodFZhbCA9PSBudWxsICkge1xuXHRcdFx0XHRjb21wdXRlU3R5bGVUZXN0cygpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlbGlhYmxlTWFyZ2luUmlnaHRWYWw7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiBjb21wdXRlU3R5bGVUZXN0cygpIHtcblx0XHQvLyBNaW5pZmllZDogdmFyIGIsYyxkLGpcblx0XHR2YXIgZGl2LCBib2R5LCBjb250YWluZXIsIGNvbnRlbnRzO1xuXG5cdFx0Ym9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcImJvZHlcIiApWyAwIF07XG5cdFx0aWYgKCAhYm9keSB8fCAhYm9keS5zdHlsZSApIHtcblx0XHRcdC8vIFRlc3QgZmlyZWQgdG9vIGVhcmx5IG9yIGluIGFuIHVuc3VwcG9ydGVkIGVudmlyb25tZW50LCBleGl0LlxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFNldHVwXG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJkaXZcIiApO1xuXHRcdGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiZGl2XCIgKTtcblx0XHRjb250YWluZXIuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246YWJzb2x1dGU7Ym9yZGVyOjA7d2lkdGg6MDtoZWlnaHQ6MDt0b3A6MDtsZWZ0Oi05OTk5cHhcIjtcblx0XHRib2R5LmFwcGVuZENoaWxkKCBjb250YWluZXIgKS5hcHBlbmRDaGlsZCggZGl2ICk7XG5cblx0XHRkaXYuc3R5bGUuY3NzVGV4dCA9XG5cdFx0XHQvLyBTdXBwb3J0OiBGaXJlZm94PDI5LCBBbmRyb2lkIDIuM1xuXHRcdFx0Ly8gVmVuZG9yLXByZWZpeCBib3gtc2l6aW5nXG5cdFx0XHRcIi13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94Oy1tb3otYm94LXNpemluZzpib3JkZXItYm94O1wiICtcblx0XHRcdFwiYm94LXNpemluZzpib3JkZXItYm94O2Rpc3BsYXk6YmxvY2s7bWFyZ2luLXRvcDoxJTt0b3A6MSU7XCIgK1xuXHRcdFx0XCJib3JkZXI6MXB4O3BhZGRpbmc6MXB4O3dpZHRoOjRweDtwb3NpdGlvbjphYnNvbHV0ZVwiO1xuXG5cdFx0Ly8gU3VwcG9ydDogSUU8OVxuXHRcdC8vIEFzc3VtZSByZWFzb25hYmxlIHZhbHVlcyBpbiB0aGUgYWJzZW5jZSBvZiBnZXRDb21wdXRlZFN0eWxlXG5cdFx0cGl4ZWxQb3NpdGlvblZhbCA9IGJveFNpemluZ1JlbGlhYmxlVmFsID0gZmFsc2U7XG5cdFx0cmVsaWFibGVNYXJnaW5SaWdodFZhbCA9IHRydWU7XG5cblx0XHQvLyBDaGVjayBmb3IgZ2V0Q29tcHV0ZWRTdHlsZSBzbyB0aGF0IHRoaXMgY29kZSBpcyBub3QgcnVuIGluIElFPDkuXG5cdFx0aWYgKCB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSApIHtcblx0XHRcdHBpeGVsUG9zaXRpb25WYWwgPSAoIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCBkaXYsIG51bGwgKSB8fCB7fSApLnRvcCAhPT0gXCIxJVwiO1xuXHRcdFx0Ym94U2l6aW5nUmVsaWFibGVWYWwgPVxuXHRcdFx0XHQoIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCBkaXYsIG51bGwgKSB8fCB7IHdpZHRoOiBcIjRweFwiIH0gKS53aWR0aCA9PT0gXCI0cHhcIjtcblxuXHRcdFx0Ly8gU3VwcG9ydDogQW5kcm9pZCAyLjNcblx0XHRcdC8vIERpdiB3aXRoIGV4cGxpY2l0IHdpZHRoIGFuZCBubyBtYXJnaW4tcmlnaHQgaW5jb3JyZWN0bHlcblx0XHRcdC8vIGdldHMgY29tcHV0ZWQgbWFyZ2luLXJpZ2h0IGJhc2VkIG9uIHdpZHRoIG9mIGNvbnRhaW5lciAoIzMzMzMpXG5cdFx0XHQvLyBXZWJLaXQgQnVnIDEzMzQzIC0gZ2V0Q29tcHV0ZWRTdHlsZSByZXR1cm5zIHdyb25nIHZhbHVlIGZvciBtYXJnaW4tcmlnaHRcblx0XHRcdGNvbnRlbnRzID0gZGl2LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImRpdlwiICkgKTtcblxuXHRcdFx0Ly8gUmVzZXQgQ1NTOiBib3gtc2l6aW5nOyBkaXNwbGF5OyBtYXJnaW47IGJvcmRlcjsgcGFkZGluZ1xuXHRcdFx0Y29udGVudHMuc3R5bGUuY3NzVGV4dCA9IGRpdi5zdHlsZS5jc3NUZXh0ID1cblx0XHRcdFx0Ly8gU3VwcG9ydDogRmlyZWZveDwyOSwgQW5kcm9pZCAyLjNcblx0XHRcdFx0Ly8gVmVuZG9yLXByZWZpeCBib3gtc2l6aW5nXG5cdFx0XHRcdFwiLXdlYmtpdC1ib3gtc2l6aW5nOmNvbnRlbnQtYm94Oy1tb3otYm94LXNpemluZzpjb250ZW50LWJveDtcIiArXG5cdFx0XHRcdFwiYm94LXNpemluZzpjb250ZW50LWJveDtkaXNwbGF5OmJsb2NrO21hcmdpbjowO2JvcmRlcjowO3BhZGRpbmc6MFwiO1xuXHRcdFx0Y29udGVudHMuc3R5bGUubWFyZ2luUmlnaHQgPSBjb250ZW50cy5zdHlsZS53aWR0aCA9IFwiMFwiO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gXCIxcHhcIjtcblxuXHRcdFx0cmVsaWFibGVNYXJnaW5SaWdodFZhbCA9XG5cdFx0XHRcdCFwYXJzZUZsb2F0KCAoIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCBjb250ZW50cywgbnVsbCApIHx8IHt9ICkubWFyZ2luUmlnaHQgKTtcblx0XHR9XG5cblx0XHQvLyBTdXBwb3J0OiBJRThcblx0XHQvLyBDaGVjayBpZiB0YWJsZSBjZWxscyBzdGlsbCBoYXZlIG9mZnNldFdpZHRoL0hlaWdodCB3aGVuIHRoZXkgYXJlIHNldFxuXHRcdC8vIHRvIGRpc3BsYXk6bm9uZSBhbmQgdGhlcmUgYXJlIHN0aWxsIG90aGVyIHZpc2libGUgdGFibGUgY2VsbHMgaW4gYVxuXHRcdC8vIHRhYmxlIHJvdzsgaWYgc28sIG9mZnNldFdpZHRoL0hlaWdodCBhcmUgbm90IHJlbGlhYmxlIGZvciB1c2Ugd2hlblxuXHRcdC8vIGRldGVybWluaW5nIGlmIGFuIGVsZW1lbnQgaGFzIGJlZW4gaGlkZGVuIGRpcmVjdGx5IHVzaW5nXG5cdFx0Ly8gZGlzcGxheTpub25lIChpdCBpcyBzdGlsbCBzYWZlIHRvIHVzZSBvZmZzZXRzIGlmIGEgcGFyZW50IGVsZW1lbnQgaXNcblx0XHQvLyBoaWRkZW47IGRvbiBzYWZldHkgZ29nZ2xlcyBhbmQgc2VlIGJ1ZyAjNDUxMiBmb3IgbW9yZSBpbmZvcm1hdGlvbikuXG5cdFx0ZGl2LmlubmVySFRNTCA9IFwiPHRhYmxlPjx0cj48dGQ+PC90ZD48dGQ+dDwvdGQ+PC90cj48L3RhYmxlPlwiO1xuXHRcdGNvbnRlbnRzID0gZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcInRkXCIgKTtcblx0XHRjb250ZW50c1sgMCBdLnN0eWxlLmNzc1RleHQgPSBcIm1hcmdpbjowO2JvcmRlcjowO3BhZGRpbmc6MDtkaXNwbGF5Om5vbmVcIjtcblx0XHRyZWxpYWJsZUhpZGRlbk9mZnNldHNWYWwgPSBjb250ZW50c1sgMCBdLm9mZnNldEhlaWdodCA9PT0gMDtcblx0XHRpZiAoIHJlbGlhYmxlSGlkZGVuT2Zmc2V0c1ZhbCApIHtcblx0XHRcdGNvbnRlbnRzWyAwIF0uc3R5bGUuZGlzcGxheSA9IFwiXCI7XG5cdFx0XHRjb250ZW50c1sgMSBdLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblx0XHRcdHJlbGlhYmxlSGlkZGVuT2Zmc2V0c1ZhbCA9IGNvbnRlbnRzWyAwIF0ub2Zmc2V0SGVpZ2h0ID09PSAwO1xuXHRcdH1cblxuXHRcdGJvZHkucmVtb3ZlQ2hpbGQoIGNvbnRhaW5lciApO1xuXHR9XG5cbn0pKCk7XG5cblxuLy8gQSBtZXRob2QgZm9yIHF1aWNrbHkgc3dhcHBpbmcgaW4vb3V0IENTUyBwcm9wZXJ0aWVzIHRvIGdldCBjb3JyZWN0IGNhbGN1bGF0aW9ucy5cbmpRdWVyeS5zd2FwID0gZnVuY3Rpb24oIGVsZW0sIG9wdGlvbnMsIGNhbGxiYWNrLCBhcmdzICkge1xuXHR2YXIgcmV0LCBuYW1lLFxuXHRcdG9sZCA9IHt9O1xuXG5cdC8vIFJlbWVtYmVyIHRoZSBvbGQgdmFsdWVzLCBhbmQgaW5zZXJ0IHRoZSBuZXcgb25lc1xuXHRmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG5cdFx0b2xkWyBuYW1lIF0gPSBlbGVtLnN0eWxlWyBuYW1lIF07XG5cdFx0ZWxlbS5zdHlsZVsgbmFtZSBdID0gb3B0aW9uc1sgbmFtZSBdO1xuXHR9XG5cblx0cmV0ID0gY2FsbGJhY2suYXBwbHkoIGVsZW0sIGFyZ3MgfHwgW10gKTtcblxuXHQvLyBSZXZlcnQgdGhlIG9sZCB2YWx1ZXNcblx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdGVsZW0uc3R5bGVbIG5hbWUgXSA9IG9sZFsgbmFtZSBdO1xuXHR9XG5cblx0cmV0dXJuIHJldDtcbn07XG5cblxudmFyXG5cdFx0cmFscGhhID0gL2FscGhhXFwoW14pXSpcXCkvaSxcblx0cm9wYWNpdHkgPSAvb3BhY2l0eVxccyo9XFxzKihbXildKikvLFxuXG5cdC8vIHN3YXBwYWJsZSBpZiBkaXNwbGF5IGlzIG5vbmUgb3Igc3RhcnRzIHdpdGggdGFibGUgZXhjZXB0IFwidGFibGVcIiwgXCJ0YWJsZS1jZWxsXCIsIG9yIFwidGFibGUtY2FwdGlvblwiXG5cdC8vIHNlZSBoZXJlIGZvciBkaXNwbGF5IHZhbHVlczogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9DU1MvZGlzcGxheVxuXHRyZGlzcGxheXN3YXAgPSAvXihub25lfHRhYmxlKD8hLWNbZWFdKS4rKS8sXG5cdHJudW1zcGxpdCA9IG5ldyBSZWdFeHAoIFwiXihcIiArIHBudW0gKyBcIikoLiopJFwiLCBcImlcIiApLFxuXHRycmVsTnVtID0gbmV3IFJlZ0V4cCggXCJeKFsrLV0pPShcIiArIHBudW0gKyBcIilcIiwgXCJpXCIgKSxcblxuXHRjc3NTaG93ID0geyBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLCB2aXNpYmlsaXR5OiBcImhpZGRlblwiLCBkaXNwbGF5OiBcImJsb2NrXCIgfSxcblx0Y3NzTm9ybWFsVHJhbnNmb3JtID0ge1xuXHRcdGxldHRlclNwYWNpbmc6IFwiMFwiLFxuXHRcdGZvbnRXZWlnaHQ6IFwiNDAwXCJcblx0fSxcblxuXHRjc3NQcmVmaXhlcyA9IFsgXCJXZWJraXRcIiwgXCJPXCIsIFwiTW96XCIsIFwibXNcIiBdO1xuXG5cbi8vIHJldHVybiBhIGNzcyBwcm9wZXJ0eSBtYXBwZWQgdG8gYSBwb3RlbnRpYWxseSB2ZW5kb3IgcHJlZml4ZWQgcHJvcGVydHlcbmZ1bmN0aW9uIHZlbmRvclByb3BOYW1lKCBzdHlsZSwgbmFtZSApIHtcblxuXHQvLyBzaG9ydGN1dCBmb3IgbmFtZXMgdGhhdCBhcmUgbm90IHZlbmRvciBwcmVmaXhlZFxuXHRpZiAoIG5hbWUgaW4gc3R5bGUgKSB7XG5cdFx0cmV0dXJuIG5hbWU7XG5cdH1cblxuXHQvLyBjaGVjayBmb3IgdmVuZG9yIHByZWZpeGVkIG5hbWVzXG5cdHZhciBjYXBOYW1lID0gbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSksXG5cdFx0b3JpZ05hbWUgPSBuYW1lLFxuXHRcdGkgPSBjc3NQcmVmaXhlcy5sZW5ndGg7XG5cblx0d2hpbGUgKCBpLS0gKSB7XG5cdFx0bmFtZSA9IGNzc1ByZWZpeGVzWyBpIF0gKyBjYXBOYW1lO1xuXHRcdGlmICggbmFtZSBpbiBzdHlsZSApIHtcblx0XHRcdHJldHVybiBuYW1lO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBvcmlnTmFtZTtcbn1cblxuZnVuY3Rpb24gc2hvd0hpZGUoIGVsZW1lbnRzLCBzaG93ICkge1xuXHR2YXIgZGlzcGxheSwgZWxlbSwgaGlkZGVuLFxuXHRcdHZhbHVlcyA9IFtdLFxuXHRcdGluZGV4ID0gMCxcblx0XHRsZW5ndGggPSBlbGVtZW50cy5sZW5ndGg7XG5cblx0Zm9yICggOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKyApIHtcblx0XHRlbGVtID0gZWxlbWVudHNbIGluZGV4IF07XG5cdFx0aWYgKCAhZWxlbS5zdHlsZSApIHtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdHZhbHVlc1sgaW5kZXggXSA9IGpRdWVyeS5fZGF0YSggZWxlbSwgXCJvbGRkaXNwbGF5XCIgKTtcblx0XHRkaXNwbGF5ID0gZWxlbS5zdHlsZS5kaXNwbGF5O1xuXHRcdGlmICggc2hvdyApIHtcblx0XHRcdC8vIFJlc2V0IHRoZSBpbmxpbmUgZGlzcGxheSBvZiB0aGlzIGVsZW1lbnQgdG8gbGVhcm4gaWYgaXQgaXNcblx0XHRcdC8vIGJlaW5nIGhpZGRlbiBieSBjYXNjYWRlZCBydWxlcyBvciBub3Rcblx0XHRcdGlmICggIXZhbHVlc1sgaW5kZXggXSAmJiBkaXNwbGF5ID09PSBcIm5vbmVcIiApIHtcblx0XHRcdFx0ZWxlbS5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IGVsZW1lbnRzIHdoaWNoIGhhdmUgYmVlbiBvdmVycmlkZGVuIHdpdGggZGlzcGxheTogbm9uZVxuXHRcdFx0Ly8gaW4gYSBzdHlsZXNoZWV0IHRvIHdoYXRldmVyIHRoZSBkZWZhdWx0IGJyb3dzZXIgc3R5bGUgaXNcblx0XHRcdC8vIGZvciBzdWNoIGFuIGVsZW1lbnRcblx0XHRcdGlmICggZWxlbS5zdHlsZS5kaXNwbGF5ID09PSBcIlwiICYmIGlzSGlkZGVuKCBlbGVtICkgKSB7XG5cdFx0XHRcdHZhbHVlc1sgaW5kZXggXSA9IGpRdWVyeS5fZGF0YSggZWxlbSwgXCJvbGRkaXNwbGF5XCIsIGRlZmF1bHREaXNwbGF5KGVsZW0ubm9kZU5hbWUpICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGhpZGRlbiA9IGlzSGlkZGVuKCBlbGVtICk7XG5cblx0XHRcdGlmICggZGlzcGxheSAmJiBkaXNwbGF5ICE9PSBcIm5vbmVcIiB8fCAhaGlkZGVuICkge1xuXHRcdFx0XHRqUXVlcnkuX2RhdGEoIGVsZW0sIFwib2xkZGlzcGxheVwiLCBoaWRkZW4gPyBkaXNwbGF5IDogalF1ZXJ5LmNzcyggZWxlbSwgXCJkaXNwbGF5XCIgKSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFNldCB0aGUgZGlzcGxheSBvZiBtb3N0IG9mIHRoZSBlbGVtZW50cyBpbiBhIHNlY29uZCBsb29wXG5cdC8vIHRvIGF2b2lkIHRoZSBjb25zdGFudCByZWZsb3dcblx0Zm9yICggaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKyApIHtcblx0XHRlbGVtID0gZWxlbWVudHNbIGluZGV4IF07XG5cdFx0aWYgKCAhZWxlbS5zdHlsZSApIHtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblx0XHRpZiAoICFzaG93IHx8IGVsZW0uc3R5bGUuZGlzcGxheSA9PT0gXCJub25lXCIgfHwgZWxlbS5zdHlsZS5kaXNwbGF5ID09PSBcIlwiICkge1xuXHRcdFx0ZWxlbS5zdHlsZS5kaXNwbGF5ID0gc2hvdyA/IHZhbHVlc1sgaW5kZXggXSB8fCBcIlwiIDogXCJub25lXCI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGVsZW1lbnRzO1xufVxuXG5mdW5jdGlvbiBzZXRQb3NpdGl2ZU51bWJlciggZWxlbSwgdmFsdWUsIHN1YnRyYWN0ICkge1xuXHR2YXIgbWF0Y2hlcyA9IHJudW1zcGxpdC5leGVjKCB2YWx1ZSApO1xuXHRyZXR1cm4gbWF0Y2hlcyA/XG5cdFx0Ly8gR3VhcmQgYWdhaW5zdCB1bmRlZmluZWQgXCJzdWJ0cmFjdFwiLCBlLmcuLCB3aGVuIHVzZWQgYXMgaW4gY3NzSG9va3Ncblx0XHRNYXRoLm1heCggMCwgbWF0Y2hlc1sgMSBdIC0gKCBzdWJ0cmFjdCB8fCAwICkgKSArICggbWF0Y2hlc1sgMiBdIHx8IFwicHhcIiApIDpcblx0XHR2YWx1ZTtcbn1cblxuZnVuY3Rpb24gYXVnbWVudFdpZHRoT3JIZWlnaHQoIGVsZW0sIG5hbWUsIGV4dHJhLCBpc0JvcmRlckJveCwgc3R5bGVzICkge1xuXHR2YXIgaSA9IGV4dHJhID09PSAoIGlzQm9yZGVyQm94ID8gXCJib3JkZXJcIiA6IFwiY29udGVudFwiICkgP1xuXHRcdC8vIElmIHdlIGFscmVhZHkgaGF2ZSB0aGUgcmlnaHQgbWVhc3VyZW1lbnQsIGF2b2lkIGF1Z21lbnRhdGlvblxuXHRcdDQgOlxuXHRcdC8vIE90aGVyd2lzZSBpbml0aWFsaXplIGZvciBob3Jpem9udGFsIG9yIHZlcnRpY2FsIHByb3BlcnRpZXNcblx0XHRuYW1lID09PSBcIndpZHRoXCIgPyAxIDogMCxcblxuXHRcdHZhbCA9IDA7XG5cblx0Zm9yICggOyBpIDwgNDsgaSArPSAyICkge1xuXHRcdC8vIGJvdGggYm94IG1vZGVscyBleGNsdWRlIG1hcmdpbiwgc28gYWRkIGl0IGlmIHdlIHdhbnQgaXRcblx0XHRpZiAoIGV4dHJhID09PSBcIm1hcmdpblwiICkge1xuXHRcdFx0dmFsICs9IGpRdWVyeS5jc3MoIGVsZW0sIGV4dHJhICsgY3NzRXhwYW5kWyBpIF0sIHRydWUsIHN0eWxlcyApO1xuXHRcdH1cblxuXHRcdGlmICggaXNCb3JkZXJCb3ggKSB7XG5cdFx0XHQvLyBib3JkZXItYm94IGluY2x1ZGVzIHBhZGRpbmcsIHNvIHJlbW92ZSBpdCBpZiB3ZSB3YW50IGNvbnRlbnRcblx0XHRcdGlmICggZXh0cmEgPT09IFwiY29udGVudFwiICkge1xuXHRcdFx0XHR2YWwgLT0galF1ZXJ5LmNzcyggZWxlbSwgXCJwYWRkaW5nXCIgKyBjc3NFeHBhbmRbIGkgXSwgdHJ1ZSwgc3R5bGVzICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGF0IHRoaXMgcG9pbnQsIGV4dHJhIGlzbid0IGJvcmRlciBub3IgbWFyZ2luLCBzbyByZW1vdmUgYm9yZGVyXG5cdFx0XHRpZiAoIGV4dHJhICE9PSBcIm1hcmdpblwiICkge1xuXHRcdFx0XHR2YWwgLT0galF1ZXJ5LmNzcyggZWxlbSwgXCJib3JkZXJcIiArIGNzc0V4cGFuZFsgaSBdICsgXCJXaWR0aFwiLCB0cnVlLCBzdHlsZXMgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gYXQgdGhpcyBwb2ludCwgZXh0cmEgaXNuJ3QgY29udGVudCwgc28gYWRkIHBhZGRpbmdcblx0XHRcdHZhbCArPSBqUXVlcnkuY3NzKCBlbGVtLCBcInBhZGRpbmdcIiArIGNzc0V4cGFuZFsgaSBdLCB0cnVlLCBzdHlsZXMgKTtcblxuXHRcdFx0Ly8gYXQgdGhpcyBwb2ludCwgZXh0cmEgaXNuJ3QgY29udGVudCBub3IgcGFkZGluZywgc28gYWRkIGJvcmRlclxuXHRcdFx0aWYgKCBleHRyYSAhPT0gXCJwYWRkaW5nXCIgKSB7XG5cdFx0XHRcdHZhbCArPSBqUXVlcnkuY3NzKCBlbGVtLCBcImJvcmRlclwiICsgY3NzRXhwYW5kWyBpIF0gKyBcIldpZHRoXCIsIHRydWUsIHN0eWxlcyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB2YWw7XG59XG5cbmZ1bmN0aW9uIGdldFdpZHRoT3JIZWlnaHQoIGVsZW0sIG5hbWUsIGV4dHJhICkge1xuXG5cdC8vIFN0YXJ0IHdpdGggb2Zmc2V0IHByb3BlcnR5LCB3aGljaCBpcyBlcXVpdmFsZW50IHRvIHRoZSBib3JkZXItYm94IHZhbHVlXG5cdHZhciB2YWx1ZUlzQm9yZGVyQm94ID0gdHJ1ZSxcblx0XHR2YWwgPSBuYW1lID09PSBcIndpZHRoXCIgPyBlbGVtLm9mZnNldFdpZHRoIDogZWxlbS5vZmZzZXRIZWlnaHQsXG5cdFx0c3R5bGVzID0gZ2V0U3R5bGVzKCBlbGVtICksXG5cdFx0aXNCb3JkZXJCb3ggPSBzdXBwb3J0LmJveFNpemluZyAmJiBqUXVlcnkuY3NzKCBlbGVtLCBcImJveFNpemluZ1wiLCBmYWxzZSwgc3R5bGVzICkgPT09IFwiYm9yZGVyLWJveFwiO1xuXG5cdC8vIHNvbWUgbm9uLWh0bWwgZWxlbWVudHMgcmV0dXJuIHVuZGVmaW5lZCBmb3Igb2Zmc2V0V2lkdGgsIHNvIGNoZWNrIGZvciBudWxsL3VuZGVmaW5lZFxuXHQvLyBzdmcgLSBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02NDkyODVcblx0Ly8gTWF0aE1MIC0gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NDkxNjY4XG5cdGlmICggdmFsIDw9IDAgfHwgdmFsID09IG51bGwgKSB7XG5cdFx0Ly8gRmFsbCBiYWNrIHRvIGNvbXB1dGVkIHRoZW4gdW5jb21wdXRlZCBjc3MgaWYgbmVjZXNzYXJ5XG5cdFx0dmFsID0gY3VyQ1NTKCBlbGVtLCBuYW1lLCBzdHlsZXMgKTtcblx0XHRpZiAoIHZhbCA8IDAgfHwgdmFsID09IG51bGwgKSB7XG5cdFx0XHR2YWwgPSBlbGVtLnN0eWxlWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0Ly8gQ29tcHV0ZWQgdW5pdCBpcyBub3QgcGl4ZWxzLiBTdG9wIGhlcmUgYW5kIHJldHVybi5cblx0XHRpZiAoIHJudW1ub25weC50ZXN0KHZhbCkgKSB7XG5cdFx0XHRyZXR1cm4gdmFsO1xuXHRcdH1cblxuXHRcdC8vIHdlIG5lZWQgdGhlIGNoZWNrIGZvciBzdHlsZSBpbiBjYXNlIGEgYnJvd3NlciB3aGljaCByZXR1cm5zIHVucmVsaWFibGUgdmFsdWVzXG5cdFx0Ly8gZm9yIGdldENvbXB1dGVkU3R5bGUgc2lsZW50bHkgZmFsbHMgYmFjayB0byB0aGUgcmVsaWFibGUgZWxlbS5zdHlsZVxuXHRcdHZhbHVlSXNCb3JkZXJCb3ggPSBpc0JvcmRlckJveCAmJiAoIHN1cHBvcnQuYm94U2l6aW5nUmVsaWFibGUoKSB8fCB2YWwgPT09IGVsZW0uc3R5bGVbIG5hbWUgXSApO1xuXG5cdFx0Ly8gTm9ybWFsaXplIFwiXCIsIGF1dG8sIGFuZCBwcmVwYXJlIGZvciBleHRyYVxuXHRcdHZhbCA9IHBhcnNlRmxvYXQoIHZhbCApIHx8IDA7XG5cdH1cblxuXHQvLyB1c2UgdGhlIGFjdGl2ZSBib3gtc2l6aW5nIG1vZGVsIHRvIGFkZC9zdWJ0cmFjdCBpcnJlbGV2YW50IHN0eWxlc1xuXHRyZXR1cm4gKCB2YWwgK1xuXHRcdGF1Z21lbnRXaWR0aE9ySGVpZ2h0KFxuXHRcdFx0ZWxlbSxcblx0XHRcdG5hbWUsXG5cdFx0XHRleHRyYSB8fCAoIGlzQm9yZGVyQm94ID8gXCJib3JkZXJcIiA6IFwiY29udGVudFwiICksXG5cdFx0XHR2YWx1ZUlzQm9yZGVyQm94LFxuXHRcdFx0c3R5bGVzXG5cdFx0KVxuXHQpICsgXCJweFwiO1xufVxuXG5qUXVlcnkuZXh0ZW5kKHtcblx0Ly8gQWRkIGluIHN0eWxlIHByb3BlcnR5IGhvb2tzIGZvciBvdmVycmlkaW5nIHRoZSBkZWZhdWx0XG5cdC8vIGJlaGF2aW9yIG9mIGdldHRpbmcgYW5kIHNldHRpbmcgYSBzdHlsZSBwcm9wZXJ0eVxuXHRjc3NIb29rczoge1xuXHRcdG9wYWNpdHk6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oIGVsZW0sIGNvbXB1dGVkICkge1xuXHRcdFx0XHRpZiAoIGNvbXB1dGVkICkge1xuXHRcdFx0XHRcdC8vIFdlIHNob3VsZCBhbHdheXMgZ2V0IGEgbnVtYmVyIGJhY2sgZnJvbSBvcGFjaXR5XG5cdFx0XHRcdFx0dmFyIHJldCA9IGN1ckNTUyggZWxlbSwgXCJvcGFjaXR5XCIgKTtcblx0XHRcdFx0XHRyZXR1cm4gcmV0ID09PSBcIlwiID8gXCIxXCIgOiByZXQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Ly8gRG9uJ3QgYXV0b21hdGljYWxseSBhZGQgXCJweFwiIHRvIHRoZXNlIHBvc3NpYmx5LXVuaXRsZXNzIHByb3BlcnRpZXNcblx0Y3NzTnVtYmVyOiB7XG5cdFx0XCJjb2x1bW5Db3VudFwiOiB0cnVlLFxuXHRcdFwiZmlsbE9wYWNpdHlcIjogdHJ1ZSxcblx0XHRcImZsZXhHcm93XCI6IHRydWUsXG5cdFx0XCJmbGV4U2hyaW5rXCI6IHRydWUsXG5cdFx0XCJmb250V2VpZ2h0XCI6IHRydWUsXG5cdFx0XCJsaW5lSGVpZ2h0XCI6IHRydWUsXG5cdFx0XCJvcGFjaXR5XCI6IHRydWUsXG5cdFx0XCJvcmRlclwiOiB0cnVlLFxuXHRcdFwib3JwaGFuc1wiOiB0cnVlLFxuXHRcdFwid2lkb3dzXCI6IHRydWUsXG5cdFx0XCJ6SW5kZXhcIjogdHJ1ZSxcblx0XHRcInpvb21cIjogdHJ1ZVxuXHR9LFxuXG5cdC8vIEFkZCBpbiBwcm9wZXJ0aWVzIHdob3NlIG5hbWVzIHlvdSB3aXNoIHRvIGZpeCBiZWZvcmVcblx0Ly8gc2V0dGluZyBvciBnZXR0aW5nIHRoZSB2YWx1ZVxuXHRjc3NQcm9wczoge1xuXHRcdC8vIG5vcm1hbGl6ZSBmbG9hdCBjc3MgcHJvcGVydHlcblx0XHRcImZsb2F0XCI6IHN1cHBvcnQuY3NzRmxvYXQgPyBcImNzc0Zsb2F0XCIgOiBcInN0eWxlRmxvYXRcIlxuXHR9LFxuXG5cdC8vIEdldCBhbmQgc2V0IHRoZSBzdHlsZSBwcm9wZXJ0eSBvbiBhIERPTSBOb2RlXG5cdHN0eWxlOiBmdW5jdGlvbiggZWxlbSwgbmFtZSwgdmFsdWUsIGV4dHJhICkge1xuXHRcdC8vIERvbid0IHNldCBzdHlsZXMgb24gdGV4dCBhbmQgY29tbWVudCBub2Rlc1xuXHRcdGlmICggIWVsZW0gfHwgZWxlbS5ub2RlVHlwZSA9PT0gMyB8fCBlbGVtLm5vZGVUeXBlID09PSA4IHx8ICFlbGVtLnN0eWxlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIE1ha2Ugc3VyZSB0aGF0IHdlJ3JlIHdvcmtpbmcgd2l0aCB0aGUgcmlnaHQgbmFtZVxuXHRcdHZhciByZXQsIHR5cGUsIGhvb2tzLFxuXHRcdFx0b3JpZ05hbWUgPSBqUXVlcnkuY2FtZWxDYXNlKCBuYW1lICksXG5cdFx0XHRzdHlsZSA9IGVsZW0uc3R5bGU7XG5cblx0XHRuYW1lID0galF1ZXJ5LmNzc1Byb3BzWyBvcmlnTmFtZSBdIHx8ICggalF1ZXJ5LmNzc1Byb3BzWyBvcmlnTmFtZSBdID0gdmVuZG9yUHJvcE5hbWUoIHN0eWxlLCBvcmlnTmFtZSApICk7XG5cblx0XHQvLyBnZXRzIGhvb2sgZm9yIHRoZSBwcmVmaXhlZCB2ZXJzaW9uXG5cdFx0Ly8gZm9sbG93ZWQgYnkgdGhlIHVucHJlZml4ZWQgdmVyc2lvblxuXHRcdGhvb2tzID0galF1ZXJ5LmNzc0hvb2tzWyBuYW1lIF0gfHwgalF1ZXJ5LmNzc0hvb2tzWyBvcmlnTmFtZSBdO1xuXG5cdFx0Ly8gQ2hlY2sgaWYgd2UncmUgc2V0dGluZyBhIHZhbHVlXG5cdFx0aWYgKCB2YWx1ZSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0dHlwZSA9IHR5cGVvZiB2YWx1ZTtcblxuXHRcdFx0Ly8gY29udmVydCByZWxhdGl2ZSBudW1iZXIgc3RyaW5ncyAoKz0gb3IgLT0pIHRvIHJlbGF0aXZlIG51bWJlcnMuICM3MzQ1XG5cdFx0XHRpZiAoIHR5cGUgPT09IFwic3RyaW5nXCIgJiYgKHJldCA9IHJyZWxOdW0uZXhlYyggdmFsdWUgKSkgKSB7XG5cdFx0XHRcdHZhbHVlID0gKCByZXRbMV0gKyAxICkgKiByZXRbMl0gKyBwYXJzZUZsb2F0KCBqUXVlcnkuY3NzKCBlbGVtLCBuYW1lICkgKTtcblx0XHRcdFx0Ly8gRml4ZXMgYnVnICM5MjM3XG5cdFx0XHRcdHR5cGUgPSBcIm51bWJlclwiO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCBudWxsIGFuZCBOYU4gdmFsdWVzIGFyZW4ndCBzZXQuIFNlZTogIzcxMTZcblx0XHRcdGlmICggdmFsdWUgPT0gbnVsbCB8fCB2YWx1ZSAhPT0gdmFsdWUgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYSBudW1iZXIgd2FzIHBhc3NlZCBpbiwgYWRkICdweCcgdG8gdGhlIChleGNlcHQgZm9yIGNlcnRhaW4gQ1NTIHByb3BlcnRpZXMpXG5cdFx0XHRpZiAoIHR5cGUgPT09IFwibnVtYmVyXCIgJiYgIWpRdWVyeS5jc3NOdW1iZXJbIG9yaWdOYW1lIF0gKSB7XG5cdFx0XHRcdHZhbHVlICs9IFwicHhcIjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRml4ZXMgIzg5MDgsIGl0IGNhbiBiZSBkb25lIG1vcmUgY29ycmVjdGx5IGJ5IHNwZWNpZmluZyBzZXR0ZXJzIGluIGNzc0hvb2tzLFxuXHRcdFx0Ly8gYnV0IGl0IHdvdWxkIG1lYW4gdG8gZGVmaW5lIGVpZ2h0IChmb3IgZXZlcnkgcHJvYmxlbWF0aWMgcHJvcGVydHkpIGlkZW50aWNhbCBmdW5jdGlvbnNcblx0XHRcdGlmICggIXN1cHBvcnQuY2xlYXJDbG9uZVN0eWxlICYmIHZhbHVlID09PSBcIlwiICYmIG5hbWUuaW5kZXhPZihcImJhY2tncm91bmRcIikgPT09IDAgKSB7XG5cdFx0XHRcdHN0eWxlWyBuYW1lIF0gPSBcImluaGVyaXRcIjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYSBob29rIHdhcyBwcm92aWRlZCwgdXNlIHRoYXQgdmFsdWUsIG90aGVyd2lzZSBqdXN0IHNldCB0aGUgc3BlY2lmaWVkIHZhbHVlXG5cdFx0XHRpZiAoICFob29rcyB8fCAhKFwic2V0XCIgaW4gaG9va3MpIHx8ICh2YWx1ZSA9IGhvb2tzLnNldCggZWxlbSwgdmFsdWUsIGV4dHJhICkpICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdFx0Ly8gU3VwcG9ydDogSUVcblx0XHRcdFx0Ly8gU3dhbGxvdyBlcnJvcnMgZnJvbSAnaW52YWxpZCcgQ1NTIHZhbHVlcyAoIzU1MDkpXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0c3R5bGVbIG5hbWUgXSA9IHZhbHVlO1xuXHRcdFx0XHR9IGNhdGNoKGUpIHt9XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gSWYgYSBob29rIHdhcyBwcm92aWRlZCBnZXQgdGhlIG5vbi1jb21wdXRlZCB2YWx1ZSBmcm9tIHRoZXJlXG5cdFx0XHRpZiAoIGhvb2tzICYmIFwiZ2V0XCIgaW4gaG9va3MgJiYgKHJldCA9IGhvb2tzLmdldCggZWxlbSwgZmFsc2UsIGV4dHJhICkpICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE90aGVyd2lzZSBqdXN0IGdldCB0aGUgdmFsdWUgZnJvbSB0aGUgc3R5bGUgb2JqZWN0XG5cdFx0XHRyZXR1cm4gc3R5bGVbIG5hbWUgXTtcblx0XHR9XG5cdH0sXG5cblx0Y3NzOiBmdW5jdGlvbiggZWxlbSwgbmFtZSwgZXh0cmEsIHN0eWxlcyApIHtcblx0XHR2YXIgbnVtLCB2YWwsIGhvb2tzLFxuXHRcdFx0b3JpZ05hbWUgPSBqUXVlcnkuY2FtZWxDYXNlKCBuYW1lICk7XG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCB3ZSdyZSB3b3JraW5nIHdpdGggdGhlIHJpZ2h0IG5hbWVcblx0XHRuYW1lID0galF1ZXJ5LmNzc1Byb3BzWyBvcmlnTmFtZSBdIHx8ICggalF1ZXJ5LmNzc1Byb3BzWyBvcmlnTmFtZSBdID0gdmVuZG9yUHJvcE5hbWUoIGVsZW0uc3R5bGUsIG9yaWdOYW1lICkgKTtcblxuXHRcdC8vIGdldHMgaG9vayBmb3IgdGhlIHByZWZpeGVkIHZlcnNpb25cblx0XHQvLyBmb2xsb3dlZCBieSB0aGUgdW5wcmVmaXhlZCB2ZXJzaW9uXG5cdFx0aG9va3MgPSBqUXVlcnkuY3NzSG9va3NbIG5hbWUgXSB8fCBqUXVlcnkuY3NzSG9va3NbIG9yaWdOYW1lIF07XG5cblx0XHQvLyBJZiBhIGhvb2sgd2FzIHByb3ZpZGVkIGdldCB0aGUgY29tcHV0ZWQgdmFsdWUgZnJvbSB0aGVyZVxuXHRcdGlmICggaG9va3MgJiYgXCJnZXRcIiBpbiBob29rcyApIHtcblx0XHRcdHZhbCA9IGhvb2tzLmdldCggZWxlbSwgdHJ1ZSwgZXh0cmEgKTtcblx0XHR9XG5cblx0XHQvLyBPdGhlcndpc2UsIGlmIGEgd2F5IHRvIGdldCB0aGUgY29tcHV0ZWQgdmFsdWUgZXhpc3RzLCB1c2UgdGhhdFxuXHRcdGlmICggdmFsID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHR2YWwgPSBjdXJDU1MoIGVsZW0sIG5hbWUsIHN0eWxlcyApO1xuXHRcdH1cblxuXHRcdC8vY29udmVydCBcIm5vcm1hbFwiIHRvIGNvbXB1dGVkIHZhbHVlXG5cdFx0aWYgKCB2YWwgPT09IFwibm9ybWFsXCIgJiYgbmFtZSBpbiBjc3NOb3JtYWxUcmFuc2Zvcm0gKSB7XG5cdFx0XHR2YWwgPSBjc3NOb3JtYWxUcmFuc2Zvcm1bIG5hbWUgXTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4sIGNvbnZlcnRpbmcgdG8gbnVtYmVyIGlmIGZvcmNlZCBvciBhIHF1YWxpZmllciB3YXMgcHJvdmlkZWQgYW5kIHZhbCBsb29rcyBudW1lcmljXG5cdFx0aWYgKCBleHRyYSA9PT0gXCJcIiB8fCBleHRyYSApIHtcblx0XHRcdG51bSA9IHBhcnNlRmxvYXQoIHZhbCApO1xuXHRcdFx0cmV0dXJuIGV4dHJhID09PSB0cnVlIHx8IGpRdWVyeS5pc051bWVyaWMoIG51bSApID8gbnVtIHx8IDAgOiB2YWw7XG5cdFx0fVxuXHRcdHJldHVybiB2YWw7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZWFjaChbIFwiaGVpZ2h0XCIsIFwid2lkdGhcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0alF1ZXJ5LmNzc0hvb2tzWyBuYW1lIF0gPSB7XG5cdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSwgY29tcHV0ZWQsIGV4dHJhICkge1xuXHRcdFx0aWYgKCBjb21wdXRlZCApIHtcblx0XHRcdFx0Ly8gY2VydGFpbiBlbGVtZW50cyBjYW4gaGF2ZSBkaW1lbnNpb24gaW5mbyBpZiB3ZSBpbnZpc2libHkgc2hvdyB0aGVtXG5cdFx0XHRcdC8vIGhvd2V2ZXIsIGl0IG11c3QgaGF2ZSBhIGN1cnJlbnQgZGlzcGxheSBzdHlsZSB0aGF0IHdvdWxkIGJlbmVmaXQgZnJvbSB0aGlzXG5cdFx0XHRcdHJldHVybiByZGlzcGxheXN3YXAudGVzdCggalF1ZXJ5LmNzcyggZWxlbSwgXCJkaXNwbGF5XCIgKSApICYmIGVsZW0ub2Zmc2V0V2lkdGggPT09IDAgP1xuXHRcdFx0XHRcdGpRdWVyeS5zd2FwKCBlbGVtLCBjc3NTaG93LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHJldHVybiBnZXRXaWR0aE9ySGVpZ2h0KCBlbGVtLCBuYW1lLCBleHRyYSApO1xuXHRcdFx0XHRcdH0pIDpcblx0XHRcdFx0XHRnZXRXaWR0aE9ySGVpZ2h0KCBlbGVtLCBuYW1lLCBleHRyYSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSwgZXh0cmEgKSB7XG5cdFx0XHR2YXIgc3R5bGVzID0gZXh0cmEgJiYgZ2V0U3R5bGVzKCBlbGVtICk7XG5cdFx0XHRyZXR1cm4gc2V0UG9zaXRpdmVOdW1iZXIoIGVsZW0sIHZhbHVlLCBleHRyYSA/XG5cdFx0XHRcdGF1Z21lbnRXaWR0aE9ySGVpZ2h0KFxuXHRcdFx0XHRcdGVsZW0sXG5cdFx0XHRcdFx0bmFtZSxcblx0XHRcdFx0XHRleHRyYSxcblx0XHRcdFx0XHRzdXBwb3J0LmJveFNpemluZyAmJiBqUXVlcnkuY3NzKCBlbGVtLCBcImJveFNpemluZ1wiLCBmYWxzZSwgc3R5bGVzICkgPT09IFwiYm9yZGVyLWJveFwiLFxuXHRcdFx0XHRcdHN0eWxlc1xuXHRcdFx0XHQpIDogMFxuXHRcdFx0KTtcblx0XHR9XG5cdH07XG59KTtcblxuaWYgKCAhc3VwcG9ydC5vcGFjaXR5ICkge1xuXHRqUXVlcnkuY3NzSG9va3Mub3BhY2l0eSA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtLCBjb21wdXRlZCApIHtcblx0XHRcdC8vIElFIHVzZXMgZmlsdGVycyBmb3Igb3BhY2l0eVxuXHRcdFx0cmV0dXJuIHJvcGFjaXR5LnRlc3QoIChjb21wdXRlZCAmJiBlbGVtLmN1cnJlbnRTdHlsZSA/IGVsZW0uY3VycmVudFN0eWxlLmZpbHRlciA6IGVsZW0uc3R5bGUuZmlsdGVyKSB8fCBcIlwiICkgP1xuXHRcdFx0XHQoIDAuMDEgKiBwYXJzZUZsb2F0KCBSZWdFeHAuJDEgKSApICsgXCJcIiA6XG5cdFx0XHRcdGNvbXB1dGVkID8gXCIxXCIgOiBcIlwiO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSApIHtcblx0XHRcdHZhciBzdHlsZSA9IGVsZW0uc3R5bGUsXG5cdFx0XHRcdGN1cnJlbnRTdHlsZSA9IGVsZW0uY3VycmVudFN0eWxlLFxuXHRcdFx0XHRvcGFjaXR5ID0galF1ZXJ5LmlzTnVtZXJpYyggdmFsdWUgKSA/IFwiYWxwaGEob3BhY2l0eT1cIiArIHZhbHVlICogMTAwICsgXCIpXCIgOiBcIlwiLFxuXHRcdFx0XHRmaWx0ZXIgPSBjdXJyZW50U3R5bGUgJiYgY3VycmVudFN0eWxlLmZpbHRlciB8fCBzdHlsZS5maWx0ZXIgfHwgXCJcIjtcblxuXHRcdFx0Ly8gSUUgaGFzIHRyb3VibGUgd2l0aCBvcGFjaXR5IGlmIGl0IGRvZXMgbm90IGhhdmUgbGF5b3V0XG5cdFx0XHQvLyBGb3JjZSBpdCBieSBzZXR0aW5nIHRoZSB6b29tIGxldmVsXG5cdFx0XHRzdHlsZS56b29tID0gMTtcblxuXHRcdFx0Ly8gaWYgc2V0dGluZyBvcGFjaXR5IHRvIDEsIGFuZCBubyBvdGhlciBmaWx0ZXJzIGV4aXN0IC0gYXR0ZW1wdCB0byByZW1vdmUgZmlsdGVyIGF0dHJpYnV0ZSAjNjY1MlxuXHRcdFx0Ly8gaWYgdmFsdWUgPT09IFwiXCIsIHRoZW4gcmVtb3ZlIGlubGluZSBvcGFjaXR5ICMxMjY4NVxuXHRcdFx0aWYgKCAoIHZhbHVlID49IDEgfHwgdmFsdWUgPT09IFwiXCIgKSAmJlxuXHRcdFx0XHRcdGpRdWVyeS50cmltKCBmaWx0ZXIucmVwbGFjZSggcmFscGhhLCBcIlwiICkgKSA9PT0gXCJcIiAmJlxuXHRcdFx0XHRcdHN0eWxlLnJlbW92ZUF0dHJpYnV0ZSApIHtcblxuXHRcdFx0XHQvLyBTZXR0aW5nIHN0eWxlLmZpbHRlciB0byBudWxsLCBcIlwiICYgXCIgXCIgc3RpbGwgbGVhdmUgXCJmaWx0ZXI6XCIgaW4gdGhlIGNzc1RleHRcblx0XHRcdFx0Ly8gaWYgXCJmaWx0ZXI6XCIgaXMgcHJlc2VudCBhdCBhbGwsIGNsZWFyVHlwZSBpcyBkaXNhYmxlZCwgd2Ugd2FudCB0byBhdm9pZCB0aGlzXG5cdFx0XHRcdC8vIHN0eWxlLnJlbW92ZUF0dHJpYnV0ZSBpcyBJRSBPbmx5LCBidXQgc28gYXBwYXJlbnRseSBpcyB0aGlzIGNvZGUgcGF0aC4uLlxuXHRcdFx0XHRzdHlsZS5yZW1vdmVBdHRyaWJ1dGUoIFwiZmlsdGVyXCIgKTtcblxuXHRcdFx0XHQvLyBpZiB0aGVyZSBpcyBubyBmaWx0ZXIgc3R5bGUgYXBwbGllZCBpbiBhIGNzcyBydWxlIG9yIHVuc2V0IGlubGluZSBvcGFjaXR5LCB3ZSBhcmUgZG9uZVxuXHRcdFx0XHRpZiAoIHZhbHVlID09PSBcIlwiIHx8IGN1cnJlbnRTdHlsZSAmJiAhY3VycmVudFN0eWxlLmZpbHRlciApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gb3RoZXJ3aXNlLCBzZXQgbmV3IGZpbHRlciB2YWx1ZXNcblx0XHRcdHN0eWxlLmZpbHRlciA9IHJhbHBoYS50ZXN0KCBmaWx0ZXIgKSA/XG5cdFx0XHRcdGZpbHRlci5yZXBsYWNlKCByYWxwaGEsIG9wYWNpdHkgKSA6XG5cdFx0XHRcdGZpbHRlciArIFwiIFwiICsgb3BhY2l0eTtcblx0XHR9XG5cdH07XG59XG5cbmpRdWVyeS5jc3NIb29rcy5tYXJnaW5SaWdodCA9IGFkZEdldEhvb2tJZiggc3VwcG9ydC5yZWxpYWJsZU1hcmdpblJpZ2h0LFxuXHRmdW5jdGlvbiggZWxlbSwgY29tcHV0ZWQgKSB7XG5cdFx0aWYgKCBjb21wdXRlZCApIHtcblx0XHRcdC8vIFdlYktpdCBCdWcgMTMzNDMgLSBnZXRDb21wdXRlZFN0eWxlIHJldHVybnMgd3JvbmcgdmFsdWUgZm9yIG1hcmdpbi1yaWdodFxuXHRcdFx0Ly8gV29yayBhcm91bmQgYnkgdGVtcG9yYXJpbHkgc2V0dGluZyBlbGVtZW50IGRpc3BsYXkgdG8gaW5saW5lLWJsb2NrXG5cdFx0XHRyZXR1cm4galF1ZXJ5LnN3YXAoIGVsZW0sIHsgXCJkaXNwbGF5XCI6IFwiaW5saW5lLWJsb2NrXCIgfSxcblx0XHRcdFx0Y3VyQ1NTLCBbIGVsZW0sIFwibWFyZ2luUmlnaHRcIiBdICk7XG5cdFx0fVxuXHR9XG4pO1xuXG4vLyBUaGVzZSBob29rcyBhcmUgdXNlZCBieSBhbmltYXRlIHRvIGV4cGFuZCBwcm9wZXJ0aWVzXG5qUXVlcnkuZWFjaCh7XG5cdG1hcmdpbjogXCJcIixcblx0cGFkZGluZzogXCJcIixcblx0Ym9yZGVyOiBcIldpZHRoXCJcbn0sIGZ1bmN0aW9uKCBwcmVmaXgsIHN1ZmZpeCApIHtcblx0alF1ZXJ5LmNzc0hvb2tzWyBwcmVmaXggKyBzdWZmaXggXSA9IHtcblx0XHRleHBhbmQ6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRcdHZhciBpID0gMCxcblx0XHRcdFx0ZXhwYW5kZWQgPSB7fSxcblxuXHRcdFx0XHQvLyBhc3N1bWVzIGEgc2luZ2xlIG51bWJlciBpZiBub3QgYSBzdHJpbmdcblx0XHRcdFx0cGFydHMgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyB2YWx1ZS5zcGxpdChcIiBcIikgOiBbIHZhbHVlIF07XG5cblx0XHRcdGZvciAoIDsgaSA8IDQ7IGkrKyApIHtcblx0XHRcdFx0ZXhwYW5kZWRbIHByZWZpeCArIGNzc0V4cGFuZFsgaSBdICsgc3VmZml4IF0gPVxuXHRcdFx0XHRcdHBhcnRzWyBpIF0gfHwgcGFydHNbIGkgLSAyIF0gfHwgcGFydHNbIDAgXTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGV4cGFuZGVkO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoICFybWFyZ2luLnRlc3QoIHByZWZpeCApICkge1xuXHRcdGpRdWVyeS5jc3NIb29rc1sgcHJlZml4ICsgc3VmZml4IF0uc2V0ID0gc2V0UG9zaXRpdmVOdW1iZXI7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0Y3NzOiBmdW5jdGlvbiggbmFtZSwgdmFsdWUgKSB7XG5cdFx0cmV0dXJuIGFjY2VzcyggdGhpcywgZnVuY3Rpb24oIGVsZW0sIG5hbWUsIHZhbHVlICkge1xuXHRcdFx0dmFyIHN0eWxlcywgbGVuLFxuXHRcdFx0XHRtYXAgPSB7fSxcblx0XHRcdFx0aSA9IDA7XG5cblx0XHRcdGlmICggalF1ZXJ5LmlzQXJyYXkoIG5hbWUgKSApIHtcblx0XHRcdFx0c3R5bGVzID0gZ2V0U3R5bGVzKCBlbGVtICk7XG5cdFx0XHRcdGxlbiA9IG5hbWUubGVuZ3RoO1xuXG5cdFx0XHRcdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRcdG1hcFsgbmFtZVsgaSBdIF0gPSBqUXVlcnkuY3NzKCBlbGVtLCBuYW1lWyBpIF0sIGZhbHNlLCBzdHlsZXMgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkID9cblx0XHRcdFx0alF1ZXJ5LnN0eWxlKCBlbGVtLCBuYW1lLCB2YWx1ZSApIDpcblx0XHRcdFx0alF1ZXJ5LmNzcyggZWxlbSwgbmFtZSApO1xuXHRcdH0sIG5hbWUsIHZhbHVlLCBhcmd1bWVudHMubGVuZ3RoID4gMSApO1xuXHR9LFxuXHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2hvd0hpZGUoIHRoaXMsIHRydWUgKTtcblx0fSxcblx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHNob3dIaWRlKCB0aGlzICk7XG5cdH0sXG5cdHRvZ2dsZTogZnVuY3Rpb24oIHN0YXRlICkge1xuXHRcdGlmICggdHlwZW9mIHN0YXRlID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRcdHJldHVybiBzdGF0ZSA/IHRoaXMuc2hvdygpIDogdGhpcy5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGlmICggaXNIaWRkZW4oIHRoaXMgKSApIHtcblx0XHRcdFx0alF1ZXJ5KCB0aGlzICkuc2hvdygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0alF1ZXJ5KCB0aGlzICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcblxuXG5mdW5jdGlvbiBUd2VlbiggZWxlbSwgb3B0aW9ucywgcHJvcCwgZW5kLCBlYXNpbmcgKSB7XG5cdHJldHVybiBuZXcgVHdlZW4ucHJvdG90eXBlLmluaXQoIGVsZW0sIG9wdGlvbnMsIHByb3AsIGVuZCwgZWFzaW5nICk7XG59XG5qUXVlcnkuVHdlZW4gPSBUd2VlbjtcblxuVHdlZW4ucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogVHdlZW4sXG5cdGluaXQ6IGZ1bmN0aW9uKCBlbGVtLCBvcHRpb25zLCBwcm9wLCBlbmQsIGVhc2luZywgdW5pdCApIHtcblx0XHR0aGlzLmVsZW0gPSBlbGVtO1xuXHRcdHRoaXMucHJvcCA9IHByb3A7XG5cdFx0dGhpcy5lYXNpbmcgPSBlYXNpbmcgfHwgXCJzd2luZ1wiO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5zdGFydCA9IHRoaXMubm93ID0gdGhpcy5jdXIoKTtcblx0XHR0aGlzLmVuZCA9IGVuZDtcblx0XHR0aGlzLnVuaXQgPSB1bml0IHx8ICggalF1ZXJ5LmNzc051bWJlclsgcHJvcCBdID8gXCJcIiA6IFwicHhcIiApO1xuXHR9LFxuXHRjdXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBob29rcyA9IFR3ZWVuLnByb3BIb29rc1sgdGhpcy5wcm9wIF07XG5cblx0XHRyZXR1cm4gaG9va3MgJiYgaG9va3MuZ2V0ID9cblx0XHRcdGhvb2tzLmdldCggdGhpcyApIDpcblx0XHRcdFR3ZWVuLnByb3BIb29rcy5fZGVmYXVsdC5nZXQoIHRoaXMgKTtcblx0fSxcblx0cnVuOiBmdW5jdGlvbiggcGVyY2VudCApIHtcblx0XHR2YXIgZWFzZWQsXG5cdFx0XHRob29rcyA9IFR3ZWVuLnByb3BIb29rc1sgdGhpcy5wcm9wIF07XG5cblx0XHRpZiAoIHRoaXMub3B0aW9ucy5kdXJhdGlvbiApIHtcblx0XHRcdHRoaXMucG9zID0gZWFzZWQgPSBqUXVlcnkuZWFzaW5nWyB0aGlzLmVhc2luZyBdKFxuXHRcdFx0XHRwZXJjZW50LCB0aGlzLm9wdGlvbnMuZHVyYXRpb24gKiBwZXJjZW50LCAwLCAxLCB0aGlzLm9wdGlvbnMuZHVyYXRpb25cblx0XHRcdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMucG9zID0gZWFzZWQgPSBwZXJjZW50O1xuXHRcdH1cblx0XHR0aGlzLm5vdyA9ICggdGhpcy5lbmQgLSB0aGlzLnN0YXJ0ICkgKiBlYXNlZCArIHRoaXMuc3RhcnQ7XG5cblx0XHRpZiAoIHRoaXMub3B0aW9ucy5zdGVwICkge1xuXHRcdFx0dGhpcy5vcHRpb25zLnN0ZXAuY2FsbCggdGhpcy5lbGVtLCB0aGlzLm5vdywgdGhpcyApO1xuXHRcdH1cblxuXHRcdGlmICggaG9va3MgJiYgaG9va3Muc2V0ICkge1xuXHRcdFx0aG9va3Muc2V0KCB0aGlzICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFR3ZWVuLnByb3BIb29rcy5fZGVmYXVsdC5zZXQoIHRoaXMgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn07XG5cblR3ZWVuLnByb3RvdHlwZS5pbml0LnByb3RvdHlwZSA9IFR3ZWVuLnByb3RvdHlwZTtcblxuVHdlZW4ucHJvcEhvb2tzID0ge1xuXHRfZGVmYXVsdDoge1xuXHRcdGdldDogZnVuY3Rpb24oIHR3ZWVuICkge1xuXHRcdFx0dmFyIHJlc3VsdDtcblxuXHRcdFx0aWYgKCB0d2Vlbi5lbGVtWyB0d2Vlbi5wcm9wIF0gIT0gbnVsbCAmJlxuXHRcdFx0XHQoIXR3ZWVuLmVsZW0uc3R5bGUgfHwgdHdlZW4uZWxlbS5zdHlsZVsgdHdlZW4ucHJvcCBdID09IG51bGwpICkge1xuXHRcdFx0XHRyZXR1cm4gdHdlZW4uZWxlbVsgdHdlZW4ucHJvcCBdO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBwYXNzaW5nIGFuIGVtcHR5IHN0cmluZyBhcyBhIDNyZCBwYXJhbWV0ZXIgdG8gLmNzcyB3aWxsIGF1dG9tYXRpY2FsbHlcblx0XHRcdC8vIGF0dGVtcHQgYSBwYXJzZUZsb2F0IGFuZCBmYWxsYmFjayB0byBhIHN0cmluZyBpZiB0aGUgcGFyc2UgZmFpbHNcblx0XHRcdC8vIHNvLCBzaW1wbGUgdmFsdWVzIHN1Y2ggYXMgXCIxMHB4XCIgYXJlIHBhcnNlZCB0byBGbG9hdC5cblx0XHRcdC8vIGNvbXBsZXggdmFsdWVzIHN1Y2ggYXMgXCJyb3RhdGUoMXJhZClcIiBhcmUgcmV0dXJuZWQgYXMgaXMuXG5cdFx0XHRyZXN1bHQgPSBqUXVlcnkuY3NzKCB0d2Vlbi5lbGVtLCB0d2Vlbi5wcm9wLCBcIlwiICk7XG5cdFx0XHQvLyBFbXB0eSBzdHJpbmdzLCBudWxsLCB1bmRlZmluZWQgYW5kIFwiYXV0b1wiIGFyZSBjb252ZXJ0ZWQgdG8gMC5cblx0XHRcdHJldHVybiAhcmVzdWx0IHx8IHJlc3VsdCA9PT0gXCJhdXRvXCIgPyAwIDogcmVzdWx0O1xuXHRcdH0sXG5cdFx0c2V0OiBmdW5jdGlvbiggdHdlZW4gKSB7XG5cdFx0XHQvLyB1c2Ugc3RlcCBob29rIGZvciBiYWNrIGNvbXBhdCAtIHVzZSBjc3NIb29rIGlmIGl0cyB0aGVyZSAtIHVzZSAuc3R5bGUgaWYgaXRzXG5cdFx0XHQvLyBhdmFpbGFibGUgYW5kIHVzZSBwbGFpbiBwcm9wZXJ0aWVzIHdoZXJlIGF2YWlsYWJsZVxuXHRcdFx0aWYgKCBqUXVlcnkuZnguc3RlcFsgdHdlZW4ucHJvcCBdICkge1xuXHRcdFx0XHRqUXVlcnkuZnguc3RlcFsgdHdlZW4ucHJvcCBdKCB0d2VlbiApO1xuXHRcdFx0fSBlbHNlIGlmICggdHdlZW4uZWxlbS5zdHlsZSAmJiAoIHR3ZWVuLmVsZW0uc3R5bGVbIGpRdWVyeS5jc3NQcm9wc1sgdHdlZW4ucHJvcCBdIF0gIT0gbnVsbCB8fCBqUXVlcnkuY3NzSG9va3NbIHR3ZWVuLnByb3AgXSApICkge1xuXHRcdFx0XHRqUXVlcnkuc3R5bGUoIHR3ZWVuLmVsZW0sIHR3ZWVuLnByb3AsIHR3ZWVuLm5vdyArIHR3ZWVuLnVuaXQgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHR3ZWVuLmVsZW1bIHR3ZWVuLnByb3AgXSA9IHR3ZWVuLm5vdztcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbi8vIFN1cHBvcnQ6IElFIDw9OVxuLy8gUGFuaWMgYmFzZWQgYXBwcm9hY2ggdG8gc2V0dGluZyB0aGluZ3Mgb24gZGlzY29ubmVjdGVkIG5vZGVzXG5cblR3ZWVuLnByb3BIb29rcy5zY3JvbGxUb3AgPSBUd2Vlbi5wcm9wSG9va3Muc2Nyb2xsTGVmdCA9IHtcblx0c2V0OiBmdW5jdGlvbiggdHdlZW4gKSB7XG5cdFx0aWYgKCB0d2Vlbi5lbGVtLm5vZGVUeXBlICYmIHR3ZWVuLmVsZW0ucGFyZW50Tm9kZSApIHtcblx0XHRcdHR3ZWVuLmVsZW1bIHR3ZWVuLnByb3AgXSA9IHR3ZWVuLm5vdztcblx0XHR9XG5cdH1cbn07XG5cbmpRdWVyeS5lYXNpbmcgPSB7XG5cdGxpbmVhcjogZnVuY3Rpb24oIHAgKSB7XG5cdFx0cmV0dXJuIHA7XG5cdH0sXG5cdHN3aW5nOiBmdW5jdGlvbiggcCApIHtcblx0XHRyZXR1cm4gMC41IC0gTWF0aC5jb3MoIHAgKiBNYXRoLlBJICkgLyAyO1xuXHR9XG59O1xuXG5qUXVlcnkuZnggPSBUd2Vlbi5wcm90b3R5cGUuaW5pdDtcblxuLy8gQmFjayBDb21wYXQgPDEuOCBleHRlbnNpb24gcG9pbnRcbmpRdWVyeS5meC5zdGVwID0ge307XG5cblxuXG5cbnZhclxuXHRmeE5vdywgdGltZXJJZCxcblx0cmZ4dHlwZXMgPSAvXig/OnRvZ2dsZXxzaG93fGhpZGUpJC8sXG5cdHJmeG51bSA9IG5ldyBSZWdFeHAoIFwiXig/OihbKy1dKT18KShcIiArIHBudW0gKyBcIikoW2EteiVdKikkXCIsIFwiaVwiICksXG5cdHJydW4gPSAvcXVldWVIb29rcyQvLFxuXHRhbmltYXRpb25QcmVmaWx0ZXJzID0gWyBkZWZhdWx0UHJlZmlsdGVyIF0sXG5cdHR3ZWVuZXJzID0ge1xuXHRcdFwiKlwiOiBbIGZ1bmN0aW9uKCBwcm9wLCB2YWx1ZSApIHtcblx0XHRcdHZhciB0d2VlbiA9IHRoaXMuY3JlYXRlVHdlZW4oIHByb3AsIHZhbHVlICksXG5cdFx0XHRcdHRhcmdldCA9IHR3ZWVuLmN1cigpLFxuXHRcdFx0XHRwYXJ0cyA9IHJmeG51bS5leGVjKCB2YWx1ZSApLFxuXHRcdFx0XHR1bml0ID0gcGFydHMgJiYgcGFydHNbIDMgXSB8fCAoIGpRdWVyeS5jc3NOdW1iZXJbIHByb3AgXSA/IFwiXCIgOiBcInB4XCIgKSxcblxuXHRcdFx0XHQvLyBTdGFydGluZyB2YWx1ZSBjb21wdXRhdGlvbiBpcyByZXF1aXJlZCBmb3IgcG90ZW50aWFsIHVuaXQgbWlzbWF0Y2hlc1xuXHRcdFx0XHRzdGFydCA9ICggalF1ZXJ5LmNzc051bWJlclsgcHJvcCBdIHx8IHVuaXQgIT09IFwicHhcIiAmJiArdGFyZ2V0ICkgJiZcblx0XHRcdFx0XHRyZnhudW0uZXhlYyggalF1ZXJ5LmNzcyggdHdlZW4uZWxlbSwgcHJvcCApICksXG5cdFx0XHRcdHNjYWxlID0gMSxcblx0XHRcdFx0bWF4SXRlcmF0aW9ucyA9IDIwO1xuXG5cdFx0XHRpZiAoIHN0YXJ0ICYmIHN0YXJ0WyAzIF0gIT09IHVuaXQgKSB7XG5cdFx0XHRcdC8vIFRydXN0IHVuaXRzIHJlcG9ydGVkIGJ5IGpRdWVyeS5jc3Ncblx0XHRcdFx0dW5pdCA9IHVuaXQgfHwgc3RhcnRbIDMgXTtcblxuXHRcdFx0XHQvLyBNYWtlIHN1cmUgd2UgdXBkYXRlIHRoZSB0d2VlbiBwcm9wZXJ0aWVzIGxhdGVyIG9uXG5cdFx0XHRcdHBhcnRzID0gcGFydHMgfHwgW107XG5cblx0XHRcdFx0Ly8gSXRlcmF0aXZlbHkgYXBwcm94aW1hdGUgZnJvbSBhIG5vbnplcm8gc3RhcnRpbmcgcG9pbnRcblx0XHRcdFx0c3RhcnQgPSArdGFyZ2V0IHx8IDE7XG5cblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdC8vIElmIHByZXZpb3VzIGl0ZXJhdGlvbiB6ZXJvZWQgb3V0LCBkb3VibGUgdW50aWwgd2UgZ2V0ICpzb21ldGhpbmcqXG5cdFx0XHRcdFx0Ly8gVXNlIGEgc3RyaW5nIGZvciBkb3VibGluZyBmYWN0b3Igc28gd2UgZG9uJ3QgYWNjaWRlbnRhbGx5IHNlZSBzY2FsZSBhcyB1bmNoYW5nZWQgYmVsb3dcblx0XHRcdFx0XHRzY2FsZSA9IHNjYWxlIHx8IFwiLjVcIjtcblxuXHRcdFx0XHRcdC8vIEFkanVzdCBhbmQgYXBwbHlcblx0XHRcdFx0XHRzdGFydCA9IHN0YXJ0IC8gc2NhbGU7XG5cdFx0XHRcdFx0alF1ZXJ5LnN0eWxlKCB0d2Vlbi5lbGVtLCBwcm9wLCBzdGFydCArIHVuaXQgKTtcblxuXHRcdFx0XHQvLyBVcGRhdGUgc2NhbGUsIHRvbGVyYXRpbmcgemVybyBvciBOYU4gZnJvbSB0d2Vlbi5jdXIoKVxuXHRcdFx0XHQvLyBBbmQgYnJlYWtpbmcgdGhlIGxvb3AgaWYgc2NhbGUgaXMgdW5jaGFuZ2VkIG9yIHBlcmZlY3QsIG9yIGlmIHdlJ3ZlIGp1c3QgaGFkIGVub3VnaFxuXHRcdFx0XHR9IHdoaWxlICggc2NhbGUgIT09IChzY2FsZSA9IHR3ZWVuLmN1cigpIC8gdGFyZ2V0KSAmJiBzY2FsZSAhPT0gMSAmJiAtLW1heEl0ZXJhdGlvbnMgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIHR3ZWVuIHByb3BlcnRpZXNcblx0XHRcdGlmICggcGFydHMgKSB7XG5cdFx0XHRcdHN0YXJ0ID0gdHdlZW4uc3RhcnQgPSArc3RhcnQgfHwgK3RhcmdldCB8fCAwO1xuXHRcdFx0XHR0d2Vlbi51bml0ID0gdW5pdDtcblx0XHRcdFx0Ly8gSWYgYSArPS8tPSB0b2tlbiB3YXMgcHJvdmlkZWQsIHdlJ3JlIGRvaW5nIGEgcmVsYXRpdmUgYW5pbWF0aW9uXG5cdFx0XHRcdHR3ZWVuLmVuZCA9IHBhcnRzWyAxIF0gP1xuXHRcdFx0XHRcdHN0YXJ0ICsgKCBwYXJ0c1sgMSBdICsgMSApICogcGFydHNbIDIgXSA6XG5cdFx0XHRcdFx0K3BhcnRzWyAyIF07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0d2Vlbjtcblx0XHR9IF1cblx0fTtcblxuLy8gQW5pbWF0aW9ucyBjcmVhdGVkIHN5bmNocm9ub3VzbHkgd2lsbCBydW4gc3luY2hyb25vdXNseVxuZnVuY3Rpb24gY3JlYXRlRnhOb3coKSB7XG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0ZnhOb3cgPSB1bmRlZmluZWQ7XG5cdH0pO1xuXHRyZXR1cm4gKCBmeE5vdyA9IGpRdWVyeS5ub3coKSApO1xufVxuXG4vLyBHZW5lcmF0ZSBwYXJhbWV0ZXJzIHRvIGNyZWF0ZSBhIHN0YW5kYXJkIGFuaW1hdGlvblxuZnVuY3Rpb24gZ2VuRngoIHR5cGUsIGluY2x1ZGVXaWR0aCApIHtcblx0dmFyIHdoaWNoLFxuXHRcdGF0dHJzID0geyBoZWlnaHQ6IHR5cGUgfSxcblx0XHRpID0gMDtcblxuXHQvLyBpZiB3ZSBpbmNsdWRlIHdpZHRoLCBzdGVwIHZhbHVlIGlzIDEgdG8gZG8gYWxsIGNzc0V4cGFuZCB2YWx1ZXMsXG5cdC8vIGlmIHdlIGRvbid0IGluY2x1ZGUgd2lkdGgsIHN0ZXAgdmFsdWUgaXMgMiB0byBza2lwIG92ZXIgTGVmdCBhbmQgUmlnaHRcblx0aW5jbHVkZVdpZHRoID0gaW5jbHVkZVdpZHRoID8gMSA6IDA7XG5cdGZvciAoIDsgaSA8IDQgOyBpICs9IDIgLSBpbmNsdWRlV2lkdGggKSB7XG5cdFx0d2hpY2ggPSBjc3NFeHBhbmRbIGkgXTtcblx0XHRhdHRyc1sgXCJtYXJnaW5cIiArIHdoaWNoIF0gPSBhdHRyc1sgXCJwYWRkaW5nXCIgKyB3aGljaCBdID0gdHlwZTtcblx0fVxuXG5cdGlmICggaW5jbHVkZVdpZHRoICkge1xuXHRcdGF0dHJzLm9wYWNpdHkgPSBhdHRycy53aWR0aCA9IHR5cGU7XG5cdH1cblxuXHRyZXR1cm4gYXR0cnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVR3ZWVuKCB2YWx1ZSwgcHJvcCwgYW5pbWF0aW9uICkge1xuXHR2YXIgdHdlZW4sXG5cdFx0Y29sbGVjdGlvbiA9ICggdHdlZW5lcnNbIHByb3AgXSB8fCBbXSApLmNvbmNhdCggdHdlZW5lcnNbIFwiKlwiIF0gKSxcblx0XHRpbmRleCA9IDAsXG5cdFx0bGVuZ3RoID0gY29sbGVjdGlvbi5sZW5ndGg7XG5cdGZvciAoIDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KysgKSB7XG5cdFx0aWYgKCAodHdlZW4gPSBjb2xsZWN0aW9uWyBpbmRleCBdLmNhbGwoIGFuaW1hdGlvbiwgcHJvcCwgdmFsdWUgKSkgKSB7XG5cblx0XHRcdC8vIHdlJ3JlIGRvbmUgd2l0aCB0aGlzIHByb3BlcnR5XG5cdFx0XHRyZXR1cm4gdHdlZW47XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRQcmVmaWx0ZXIoIGVsZW0sIHByb3BzLCBvcHRzICkge1xuXHQvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cdHZhciBwcm9wLCB2YWx1ZSwgdG9nZ2xlLCB0d2VlbiwgaG9va3MsIG9sZGZpcmUsIGRpc3BsYXksIGNoZWNrRGlzcGxheSxcblx0XHRhbmltID0gdGhpcyxcblx0XHRvcmlnID0ge30sXG5cdFx0c3R5bGUgPSBlbGVtLnN0eWxlLFxuXHRcdGhpZGRlbiA9IGVsZW0ubm9kZVR5cGUgJiYgaXNIaWRkZW4oIGVsZW0gKSxcblx0XHRkYXRhU2hvdyA9IGpRdWVyeS5fZGF0YSggZWxlbSwgXCJmeHNob3dcIiApO1xuXG5cdC8vIGhhbmRsZSBxdWV1ZTogZmFsc2UgcHJvbWlzZXNcblx0aWYgKCAhb3B0cy5xdWV1ZSApIHtcblx0XHRob29rcyA9IGpRdWVyeS5fcXVldWVIb29rcyggZWxlbSwgXCJmeFwiICk7XG5cdFx0aWYgKCBob29rcy51bnF1ZXVlZCA9PSBudWxsICkge1xuXHRcdFx0aG9va3MudW5xdWV1ZWQgPSAwO1xuXHRcdFx0b2xkZmlyZSA9IGhvb2tzLmVtcHR5LmZpcmU7XG5cdFx0XHRob29rcy5lbXB0eS5maXJlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggIWhvb2tzLnVucXVldWVkICkge1xuXHRcdFx0XHRcdG9sZGZpcmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cdFx0aG9va3MudW5xdWV1ZWQrKztcblxuXHRcdGFuaW0uYWx3YXlzKGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZG9pbmcgdGhpcyBtYWtlcyBzdXJlIHRoYXQgdGhlIGNvbXBsZXRlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWRcblx0XHRcdC8vIGJlZm9yZSB0aGlzIGNvbXBsZXRlc1xuXHRcdFx0YW5pbS5hbHdheXMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGhvb2tzLnVucXVldWVkLS07XG5cdFx0XHRcdGlmICggIWpRdWVyeS5xdWV1ZSggZWxlbSwgXCJmeFwiICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdGhvb2tzLmVtcHR5LmZpcmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBoZWlnaHQvd2lkdGggb3ZlcmZsb3cgcGFzc1xuXHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgKCBcImhlaWdodFwiIGluIHByb3BzIHx8IFwid2lkdGhcIiBpbiBwcm9wcyApICkge1xuXHRcdC8vIE1ha2Ugc3VyZSB0aGF0IG5vdGhpbmcgc25lYWtzIG91dFxuXHRcdC8vIFJlY29yZCBhbGwgMyBvdmVyZmxvdyBhdHRyaWJ1dGVzIGJlY2F1c2UgSUUgZG9lcyBub3Rcblx0XHQvLyBjaGFuZ2UgdGhlIG92ZXJmbG93IGF0dHJpYnV0ZSB3aGVuIG92ZXJmbG93WCBhbmRcblx0XHQvLyBvdmVyZmxvd1kgYXJlIHNldCB0byB0aGUgc2FtZSB2YWx1ZVxuXHRcdG9wdHMub3ZlcmZsb3cgPSBbIHN0eWxlLm92ZXJmbG93LCBzdHlsZS5vdmVyZmxvd1gsIHN0eWxlLm92ZXJmbG93WSBdO1xuXG5cdFx0Ly8gU2V0IGRpc3BsYXkgcHJvcGVydHkgdG8gaW5saW5lLWJsb2NrIGZvciBoZWlnaHQvd2lkdGhcblx0XHQvLyBhbmltYXRpb25zIG9uIGlubGluZSBlbGVtZW50cyB0aGF0IGFyZSBoYXZpbmcgd2lkdGgvaGVpZ2h0IGFuaW1hdGVkXG5cdFx0ZGlzcGxheSA9IGpRdWVyeS5jc3MoIGVsZW0sIFwiZGlzcGxheVwiICk7XG5cblx0XHQvLyBUZXN0IGRlZmF1bHQgZGlzcGxheSBpZiBkaXNwbGF5IGlzIGN1cnJlbnRseSBcIm5vbmVcIlxuXHRcdGNoZWNrRGlzcGxheSA9IGRpc3BsYXkgPT09IFwibm9uZVwiID9cblx0XHRcdGpRdWVyeS5fZGF0YSggZWxlbSwgXCJvbGRkaXNwbGF5XCIgKSB8fCBkZWZhdWx0RGlzcGxheSggZWxlbS5ub2RlTmFtZSApIDogZGlzcGxheTtcblxuXHRcdGlmICggY2hlY2tEaXNwbGF5ID09PSBcImlubGluZVwiICYmIGpRdWVyeS5jc3MoIGVsZW0sIFwiZmxvYXRcIiApID09PSBcIm5vbmVcIiApIHtcblxuXHRcdFx0Ly8gaW5saW5lLWxldmVsIGVsZW1lbnRzIGFjY2VwdCBpbmxpbmUtYmxvY2s7XG5cdFx0XHQvLyBibG9jay1sZXZlbCBlbGVtZW50cyBuZWVkIHRvIGJlIGlubGluZSB3aXRoIGxheW91dFxuXHRcdFx0aWYgKCAhc3VwcG9ydC5pbmxpbmVCbG9ja05lZWRzTGF5b3V0IHx8IGRlZmF1bHREaXNwbGF5KCBlbGVtLm5vZGVOYW1lICkgPT09IFwiaW5saW5lXCIgKSB7XG5cdFx0XHRcdHN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c3R5bGUuem9vbSA9IDE7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKCBvcHRzLm92ZXJmbG93ICkge1xuXHRcdHN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcblx0XHRpZiAoICFzdXBwb3J0LnNocmlua1dyYXBCbG9ja3MoKSApIHtcblx0XHRcdGFuaW0uYWx3YXlzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzdHlsZS5vdmVyZmxvdyA9IG9wdHMub3ZlcmZsb3dbIDAgXTtcblx0XHRcdFx0c3R5bGUub3ZlcmZsb3dYID0gb3B0cy5vdmVyZmxvd1sgMSBdO1xuXHRcdFx0XHRzdHlsZS5vdmVyZmxvd1kgPSBvcHRzLm92ZXJmbG93WyAyIF07XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHQvLyBzaG93L2hpZGUgcGFzc1xuXHRmb3IgKCBwcm9wIGluIHByb3BzICkge1xuXHRcdHZhbHVlID0gcHJvcHNbIHByb3AgXTtcblx0XHRpZiAoIHJmeHR5cGVzLmV4ZWMoIHZhbHVlICkgKSB7XG5cdFx0XHRkZWxldGUgcHJvcHNbIHByb3AgXTtcblx0XHRcdHRvZ2dsZSA9IHRvZ2dsZSB8fCB2YWx1ZSA9PT0gXCJ0b2dnbGVcIjtcblx0XHRcdGlmICggdmFsdWUgPT09ICggaGlkZGVuID8gXCJoaWRlXCIgOiBcInNob3dcIiApICkge1xuXG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIGRhdGFTaG93IGxlZnQgb3ZlciBmcm9tIGEgc3RvcHBlZCBoaWRlIG9yIHNob3cgYW5kIHdlIGFyZSBnb2luZyB0byBwcm9jZWVkIHdpdGggc2hvdywgd2Ugc2hvdWxkIHByZXRlbmQgdG8gYmUgaGlkZGVuXG5cdFx0XHRcdGlmICggdmFsdWUgPT09IFwic2hvd1wiICYmIGRhdGFTaG93ICYmIGRhdGFTaG93WyBwcm9wIF0gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRoaWRkZW4gPSB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRvcmlnWyBwcm9wIF0gPSBkYXRhU2hvdyAmJiBkYXRhU2hvd1sgcHJvcCBdIHx8IGpRdWVyeS5zdHlsZSggZWxlbSwgcHJvcCApO1xuXG5cdFx0Ly8gQW55IG5vbi1meCB2YWx1ZSBzdG9wcyB1cyBmcm9tIHJlc3RvcmluZyB0aGUgb3JpZ2luYWwgZGlzcGxheSB2YWx1ZVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRkaXNwbGF5ID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0fVxuXG5cdGlmICggIWpRdWVyeS5pc0VtcHR5T2JqZWN0KCBvcmlnICkgKSB7XG5cdFx0aWYgKCBkYXRhU2hvdyApIHtcblx0XHRcdGlmICggXCJoaWRkZW5cIiBpbiBkYXRhU2hvdyApIHtcblx0XHRcdFx0aGlkZGVuID0gZGF0YVNob3cuaGlkZGVuO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRkYXRhU2hvdyA9IGpRdWVyeS5fZGF0YSggZWxlbSwgXCJmeHNob3dcIiwge30gKTtcblx0XHR9XG5cblx0XHQvLyBzdG9yZSBzdGF0ZSBpZiBpdHMgdG9nZ2xlIC0gZW5hYmxlcyAuc3RvcCgpLnRvZ2dsZSgpIHRvIFwicmV2ZXJzZVwiXG5cdFx0aWYgKCB0b2dnbGUgKSB7XG5cdFx0XHRkYXRhU2hvdy5oaWRkZW4gPSAhaGlkZGVuO1xuXHRcdH1cblx0XHRpZiAoIGhpZGRlbiApIHtcblx0XHRcdGpRdWVyeSggZWxlbSApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YW5pbS5kb25lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRqUXVlcnkoIGVsZW0gKS5oaWRlKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0YW5pbS5kb25lKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHByb3A7XG5cdFx0XHRqUXVlcnkuX3JlbW92ZURhdGEoIGVsZW0sIFwiZnhzaG93XCIgKTtcblx0XHRcdGZvciAoIHByb3AgaW4gb3JpZyApIHtcblx0XHRcdFx0alF1ZXJ5LnN0eWxlKCBlbGVtLCBwcm9wLCBvcmlnWyBwcm9wIF0gKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRmb3IgKCBwcm9wIGluIG9yaWcgKSB7XG5cdFx0XHR0d2VlbiA9IGNyZWF0ZVR3ZWVuKCBoaWRkZW4gPyBkYXRhU2hvd1sgcHJvcCBdIDogMCwgcHJvcCwgYW5pbSApO1xuXG5cdFx0XHRpZiAoICEoIHByb3AgaW4gZGF0YVNob3cgKSApIHtcblx0XHRcdFx0ZGF0YVNob3dbIHByb3AgXSA9IHR3ZWVuLnN0YXJ0O1xuXHRcdFx0XHRpZiAoIGhpZGRlbiApIHtcblx0XHRcdFx0XHR0d2Vlbi5lbmQgPSB0d2Vlbi5zdGFydDtcblx0XHRcdFx0XHR0d2Vlbi5zdGFydCA9IHByb3AgPT09IFwid2lkdGhcIiB8fCBwcm9wID09PSBcImhlaWdodFwiID8gMSA6IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0Ly8gSWYgdGhpcyBpcyBhIG5vb3AgbGlrZSAuaGlkZSgpLmhpZGUoKSwgcmVzdG9yZSBhbiBvdmVyd3JpdHRlbiBkaXNwbGF5IHZhbHVlXG5cdH0gZWxzZSBpZiAoIChkaXNwbGF5ID09PSBcIm5vbmVcIiA/IGRlZmF1bHREaXNwbGF5KCBlbGVtLm5vZGVOYW1lICkgOiBkaXNwbGF5KSA9PT0gXCJpbmxpbmVcIiApIHtcblx0XHRzdHlsZS5kaXNwbGF5ID0gZGlzcGxheTtcblx0fVxufVxuXG5mdW5jdGlvbiBwcm9wRmlsdGVyKCBwcm9wcywgc3BlY2lhbEVhc2luZyApIHtcblx0dmFyIGluZGV4LCBuYW1lLCBlYXNpbmcsIHZhbHVlLCBob29rcztcblxuXHQvLyBjYW1lbENhc2UsIHNwZWNpYWxFYXNpbmcgYW5kIGV4cGFuZCBjc3NIb29rIHBhc3Ncblx0Zm9yICggaW5kZXggaW4gcHJvcHMgKSB7XG5cdFx0bmFtZSA9IGpRdWVyeS5jYW1lbENhc2UoIGluZGV4ICk7XG5cdFx0ZWFzaW5nID0gc3BlY2lhbEVhc2luZ1sgbmFtZSBdO1xuXHRcdHZhbHVlID0gcHJvcHNbIGluZGV4IF07XG5cdFx0aWYgKCBqUXVlcnkuaXNBcnJheSggdmFsdWUgKSApIHtcblx0XHRcdGVhc2luZyA9IHZhbHVlWyAxIF07XG5cdFx0XHR2YWx1ZSA9IHByb3BzWyBpbmRleCBdID0gdmFsdWVbIDAgXTtcblx0XHR9XG5cblx0XHRpZiAoIGluZGV4ICE9PSBuYW1lICkge1xuXHRcdFx0cHJvcHNbIG5hbWUgXSA9IHZhbHVlO1xuXHRcdFx0ZGVsZXRlIHByb3BzWyBpbmRleCBdO1xuXHRcdH1cblxuXHRcdGhvb2tzID0galF1ZXJ5LmNzc0hvb2tzWyBuYW1lIF07XG5cdFx0aWYgKCBob29rcyAmJiBcImV4cGFuZFwiIGluIGhvb2tzICkge1xuXHRcdFx0dmFsdWUgPSBob29rcy5leHBhbmQoIHZhbHVlICk7XG5cdFx0XHRkZWxldGUgcHJvcHNbIG5hbWUgXTtcblxuXHRcdFx0Ly8gbm90IHF1aXRlICQuZXh0ZW5kLCB0aGlzIHdvbnQgb3ZlcndyaXRlIGtleXMgYWxyZWFkeSBwcmVzZW50LlxuXHRcdFx0Ly8gYWxzbyAtIHJldXNpbmcgJ2luZGV4JyBmcm9tIGFib3ZlIGJlY2F1c2Ugd2UgaGF2ZSB0aGUgY29ycmVjdCBcIm5hbWVcIlxuXHRcdFx0Zm9yICggaW5kZXggaW4gdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggISggaW5kZXggaW4gcHJvcHMgKSApIHtcblx0XHRcdFx0XHRwcm9wc1sgaW5kZXggXSA9IHZhbHVlWyBpbmRleCBdO1xuXHRcdFx0XHRcdHNwZWNpYWxFYXNpbmdbIGluZGV4IF0gPSBlYXNpbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0c3BlY2lhbEVhc2luZ1sgbmFtZSBdID0gZWFzaW5nO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBBbmltYXRpb24oIGVsZW0sIHByb3BlcnRpZXMsIG9wdGlvbnMgKSB7XG5cdHZhciByZXN1bHQsXG5cdFx0c3RvcHBlZCxcblx0XHRpbmRleCA9IDAsXG5cdFx0bGVuZ3RoID0gYW5pbWF0aW9uUHJlZmlsdGVycy5sZW5ndGgsXG5cdFx0ZGVmZXJyZWQgPSBqUXVlcnkuRGVmZXJyZWQoKS5hbHdheXMoIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZG9uJ3QgbWF0Y2ggZWxlbSBpbiB0aGUgOmFuaW1hdGVkIHNlbGVjdG9yXG5cdFx0XHRkZWxldGUgdGljay5lbGVtO1xuXHRcdH0pLFxuXHRcdHRpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggc3RvcHBlZCApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gZnhOb3cgfHwgY3JlYXRlRnhOb3coKSxcblx0XHRcdFx0cmVtYWluaW5nID0gTWF0aC5tYXgoIDAsIGFuaW1hdGlvbi5zdGFydFRpbWUgKyBhbmltYXRpb24uZHVyYXRpb24gLSBjdXJyZW50VGltZSApLFxuXHRcdFx0XHQvLyBhcmNoYWljIGNyYXNoIGJ1ZyB3b24ndCBhbGxvdyB1cyB0byB1c2UgMSAtICggMC41IHx8IDAgKSAoIzEyNDk3KVxuXHRcdFx0XHR0ZW1wID0gcmVtYWluaW5nIC8gYW5pbWF0aW9uLmR1cmF0aW9uIHx8IDAsXG5cdFx0XHRcdHBlcmNlbnQgPSAxIC0gdGVtcCxcblx0XHRcdFx0aW5kZXggPSAwLFxuXHRcdFx0XHRsZW5ndGggPSBhbmltYXRpb24udHdlZW5zLmxlbmd0aDtcblxuXHRcdFx0Zm9yICggOyBpbmRleCA8IGxlbmd0aCA7IGluZGV4KysgKSB7XG5cdFx0XHRcdGFuaW1hdGlvbi50d2VlbnNbIGluZGV4IF0ucnVuKCBwZXJjZW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdGRlZmVycmVkLm5vdGlmeVdpdGgoIGVsZW0sIFsgYW5pbWF0aW9uLCBwZXJjZW50LCByZW1haW5pbmcgXSk7XG5cblx0XHRcdGlmICggcGVyY2VudCA8IDEgJiYgbGVuZ3RoICkge1xuXHRcdFx0XHRyZXR1cm4gcmVtYWluaW5nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIGVsZW0sIFsgYW5pbWF0aW9uIF0gKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YW5pbWF0aW9uID0gZGVmZXJyZWQucHJvbWlzZSh7XG5cdFx0XHRlbGVtOiBlbGVtLFxuXHRcdFx0cHJvcHM6IGpRdWVyeS5leHRlbmQoIHt9LCBwcm9wZXJ0aWVzICksXG5cdFx0XHRvcHRzOiBqUXVlcnkuZXh0ZW5kKCB0cnVlLCB7IHNwZWNpYWxFYXNpbmc6IHt9IH0sIG9wdGlvbnMgKSxcblx0XHRcdG9yaWdpbmFsUHJvcGVydGllczogcHJvcGVydGllcyxcblx0XHRcdG9yaWdpbmFsT3B0aW9uczogb3B0aW9ucyxcblx0XHRcdHN0YXJ0VGltZTogZnhOb3cgfHwgY3JlYXRlRnhOb3coKSxcblx0XHRcdGR1cmF0aW9uOiBvcHRpb25zLmR1cmF0aW9uLFxuXHRcdFx0dHdlZW5zOiBbXSxcblx0XHRcdGNyZWF0ZVR3ZWVuOiBmdW5jdGlvbiggcHJvcCwgZW5kICkge1xuXHRcdFx0XHR2YXIgdHdlZW4gPSBqUXVlcnkuVHdlZW4oIGVsZW0sIGFuaW1hdGlvbi5vcHRzLCBwcm9wLCBlbmQsXG5cdFx0XHRcdFx0XHRhbmltYXRpb24ub3B0cy5zcGVjaWFsRWFzaW5nWyBwcm9wIF0gfHwgYW5pbWF0aW9uLm9wdHMuZWFzaW5nICk7XG5cdFx0XHRcdGFuaW1hdGlvbi50d2VlbnMucHVzaCggdHdlZW4gKTtcblx0XHRcdFx0cmV0dXJuIHR3ZWVuO1xuXHRcdFx0fSxcblx0XHRcdHN0b3A6IGZ1bmN0aW9uKCBnb3RvRW5kICkge1xuXHRcdFx0XHR2YXIgaW5kZXggPSAwLFxuXHRcdFx0XHRcdC8vIGlmIHdlIGFyZSBnb2luZyB0byB0aGUgZW5kLCB3ZSB3YW50IHRvIHJ1biBhbGwgdGhlIHR3ZWVuc1xuXHRcdFx0XHRcdC8vIG90aGVyd2lzZSB3ZSBza2lwIHRoaXMgcGFydFxuXHRcdFx0XHRcdGxlbmd0aCA9IGdvdG9FbmQgPyBhbmltYXRpb24udHdlZW5zLmxlbmd0aCA6IDA7XG5cdFx0XHRcdGlmICggc3RvcHBlZCApIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fVxuXHRcdFx0XHRzdG9wcGVkID0gdHJ1ZTtcblx0XHRcdFx0Zm9yICggOyBpbmRleCA8IGxlbmd0aCA7IGluZGV4KysgKSB7XG5cdFx0XHRcdFx0YW5pbWF0aW9uLnR3ZWVuc1sgaW5kZXggXS5ydW4oIDEgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJlc29sdmUgd2hlbiB3ZSBwbGF5ZWQgdGhlIGxhc3QgZnJhbWVcblx0XHRcdFx0Ly8gb3RoZXJ3aXNlLCByZWplY3Rcblx0XHRcdFx0aWYgKCBnb3RvRW5kICkge1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBlbGVtLCBbIGFuaW1hdGlvbiwgZ290b0VuZCBdICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0V2l0aCggZWxlbSwgWyBhbmltYXRpb24sIGdvdG9FbmQgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXHRcdH0pLFxuXHRcdHByb3BzID0gYW5pbWF0aW9uLnByb3BzO1xuXG5cdHByb3BGaWx0ZXIoIHByb3BzLCBhbmltYXRpb24ub3B0cy5zcGVjaWFsRWFzaW5nICk7XG5cblx0Zm9yICggOyBpbmRleCA8IGxlbmd0aCA7IGluZGV4KysgKSB7XG5cdFx0cmVzdWx0ID0gYW5pbWF0aW9uUHJlZmlsdGVyc1sgaW5kZXggXS5jYWxsKCBhbmltYXRpb24sIGVsZW0sIHByb3BzLCBhbmltYXRpb24ub3B0cyApO1xuXHRcdGlmICggcmVzdWx0ICkge1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblxuXHRqUXVlcnkubWFwKCBwcm9wcywgY3JlYXRlVHdlZW4sIGFuaW1hdGlvbiApO1xuXG5cdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIGFuaW1hdGlvbi5vcHRzLnN0YXJ0ICkgKSB7XG5cdFx0YW5pbWF0aW9uLm9wdHMuc3RhcnQuY2FsbCggZWxlbSwgYW5pbWF0aW9uICk7XG5cdH1cblxuXHRqUXVlcnkuZngudGltZXIoXG5cdFx0alF1ZXJ5LmV4dGVuZCggdGljaywge1xuXHRcdFx0ZWxlbTogZWxlbSxcblx0XHRcdGFuaW06IGFuaW1hdGlvbixcblx0XHRcdHF1ZXVlOiBhbmltYXRpb24ub3B0cy5xdWV1ZVxuXHRcdH0pXG5cdCk7XG5cblx0Ly8gYXR0YWNoIGNhbGxiYWNrcyBmcm9tIG9wdGlvbnNcblx0cmV0dXJuIGFuaW1hdGlvbi5wcm9ncmVzcyggYW5pbWF0aW9uLm9wdHMucHJvZ3Jlc3MgKVxuXHRcdC5kb25lKCBhbmltYXRpb24ub3B0cy5kb25lLCBhbmltYXRpb24ub3B0cy5jb21wbGV0ZSApXG5cdFx0LmZhaWwoIGFuaW1hdGlvbi5vcHRzLmZhaWwgKVxuXHRcdC5hbHdheXMoIGFuaW1hdGlvbi5vcHRzLmFsd2F5cyApO1xufVxuXG5qUXVlcnkuQW5pbWF0aW9uID0galF1ZXJ5LmV4dGVuZCggQW5pbWF0aW9uLCB7XG5cdHR3ZWVuZXI6IGZ1bmN0aW9uKCBwcm9wcywgY2FsbGJhY2sgKSB7XG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggcHJvcHMgKSApIHtcblx0XHRcdGNhbGxiYWNrID0gcHJvcHM7XG5cdFx0XHRwcm9wcyA9IFsgXCIqXCIgXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cHJvcHMgPSBwcm9wcy5zcGxpdChcIiBcIik7XG5cdFx0fVxuXG5cdFx0dmFyIHByb3AsXG5cdFx0XHRpbmRleCA9IDAsXG5cdFx0XHRsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG5cblx0XHRmb3IgKCA7IGluZGV4IDwgbGVuZ3RoIDsgaW5kZXgrKyApIHtcblx0XHRcdHByb3AgPSBwcm9wc1sgaW5kZXggXTtcblx0XHRcdHR3ZWVuZXJzWyBwcm9wIF0gPSB0d2VlbmVyc1sgcHJvcCBdIHx8IFtdO1xuXHRcdFx0dHdlZW5lcnNbIHByb3AgXS51bnNoaWZ0KCBjYWxsYmFjayApO1xuXHRcdH1cblx0fSxcblxuXHRwcmVmaWx0ZXI6IGZ1bmN0aW9uKCBjYWxsYmFjaywgcHJlcGVuZCApIHtcblx0XHRpZiAoIHByZXBlbmQgKSB7XG5cdFx0XHRhbmltYXRpb25QcmVmaWx0ZXJzLnVuc2hpZnQoIGNhbGxiYWNrICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFuaW1hdGlvblByZWZpbHRlcnMucHVzaCggY2FsbGJhY2sgKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5qUXVlcnkuc3BlZWQgPSBmdW5jdGlvbiggc3BlZWQsIGVhc2luZywgZm4gKSB7XG5cdHZhciBvcHQgPSBzcGVlZCAmJiB0eXBlb2Ygc3BlZWQgPT09IFwib2JqZWN0XCIgPyBqUXVlcnkuZXh0ZW5kKCB7fSwgc3BlZWQgKSA6IHtcblx0XHRjb21wbGV0ZTogZm4gfHwgIWZuICYmIGVhc2luZyB8fFxuXHRcdFx0alF1ZXJ5LmlzRnVuY3Rpb24oIHNwZWVkICkgJiYgc3BlZWQsXG5cdFx0ZHVyYXRpb246IHNwZWVkLFxuXHRcdGVhc2luZzogZm4gJiYgZWFzaW5nIHx8IGVhc2luZyAmJiAhalF1ZXJ5LmlzRnVuY3Rpb24oIGVhc2luZyApICYmIGVhc2luZ1xuXHR9O1xuXG5cdG9wdC5kdXJhdGlvbiA9IGpRdWVyeS5meC5vZmYgPyAwIDogdHlwZW9mIG9wdC5kdXJhdGlvbiA9PT0gXCJudW1iZXJcIiA/IG9wdC5kdXJhdGlvbiA6XG5cdFx0b3B0LmR1cmF0aW9uIGluIGpRdWVyeS5meC5zcGVlZHMgPyBqUXVlcnkuZnguc3BlZWRzWyBvcHQuZHVyYXRpb24gXSA6IGpRdWVyeS5meC5zcGVlZHMuX2RlZmF1bHQ7XG5cblx0Ly8gbm9ybWFsaXplIG9wdC5xdWV1ZSAtIHRydWUvdW5kZWZpbmVkL251bGwgLT4gXCJmeFwiXG5cdGlmICggb3B0LnF1ZXVlID09IG51bGwgfHwgb3B0LnF1ZXVlID09PSB0cnVlICkge1xuXHRcdG9wdC5xdWV1ZSA9IFwiZnhcIjtcblx0fVxuXG5cdC8vIFF1ZXVlaW5nXG5cdG9wdC5vbGQgPSBvcHQuY29tcGxldGU7XG5cblx0b3B0LmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggb3B0Lm9sZCApICkge1xuXHRcdFx0b3B0Lm9sZC5jYWxsKCB0aGlzICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBvcHQucXVldWUgKSB7XG5cdFx0XHRqUXVlcnkuZGVxdWV1ZSggdGhpcywgb3B0LnF1ZXVlICk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiBvcHQ7XG59O1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0ZmFkZVRvOiBmdW5jdGlvbiggc3BlZWQsIHRvLCBlYXNpbmcsIGNhbGxiYWNrICkge1xuXG5cdFx0Ly8gc2hvdyBhbnkgaGlkZGVuIGVsZW1lbnRzIGFmdGVyIHNldHRpbmcgb3BhY2l0eSB0byAwXG5cdFx0cmV0dXJuIHRoaXMuZmlsdGVyKCBpc0hpZGRlbiApLmNzcyggXCJvcGFjaXR5XCIsIDAgKS5zaG93KClcblxuXHRcdFx0Ly8gYW5pbWF0ZSB0byB0aGUgdmFsdWUgc3BlY2lmaWVkXG5cdFx0XHQuZW5kKCkuYW5pbWF0ZSh7IG9wYWNpdHk6IHRvIH0sIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICk7XG5cdH0sXG5cdGFuaW1hdGU6IGZ1bmN0aW9uKCBwcm9wLCBzcGVlZCwgZWFzaW5nLCBjYWxsYmFjayApIHtcblx0XHR2YXIgZW1wdHkgPSBqUXVlcnkuaXNFbXB0eU9iamVjdCggcHJvcCApLFxuXHRcdFx0b3B0YWxsID0galF1ZXJ5LnNwZWVkKCBzcGVlZCwgZWFzaW5nLCBjYWxsYmFjayApLFxuXHRcdFx0ZG9BbmltYXRpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gT3BlcmF0ZSBvbiBhIGNvcHkgb2YgcHJvcCBzbyBwZXItcHJvcGVydHkgZWFzaW5nIHdvbid0IGJlIGxvc3Rcblx0XHRcdFx0dmFyIGFuaW0gPSBBbmltYXRpb24oIHRoaXMsIGpRdWVyeS5leHRlbmQoIHt9LCBwcm9wICksIG9wdGFsbCApO1xuXG5cdFx0XHRcdC8vIEVtcHR5IGFuaW1hdGlvbnMsIG9yIGZpbmlzaGluZyByZXNvbHZlcyBpbW1lZGlhdGVseVxuXHRcdFx0XHRpZiAoIGVtcHR5IHx8IGpRdWVyeS5fZGF0YSggdGhpcywgXCJmaW5pc2hcIiApICkge1xuXHRcdFx0XHRcdGFuaW0uc3RvcCggdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0ZG9BbmltYXRpb24uZmluaXNoID0gZG9BbmltYXRpb247XG5cblx0XHRyZXR1cm4gZW1wdHkgfHwgb3B0YWxsLnF1ZXVlID09PSBmYWxzZSA/XG5cdFx0XHR0aGlzLmVhY2goIGRvQW5pbWF0aW9uICkgOlxuXHRcdFx0dGhpcy5xdWV1ZSggb3B0YWxsLnF1ZXVlLCBkb0FuaW1hdGlvbiApO1xuXHR9LFxuXHRzdG9wOiBmdW5jdGlvbiggdHlwZSwgY2xlYXJRdWV1ZSwgZ290b0VuZCApIHtcblx0XHR2YXIgc3RvcFF1ZXVlID0gZnVuY3Rpb24oIGhvb2tzICkge1xuXHRcdFx0dmFyIHN0b3AgPSBob29rcy5zdG9wO1xuXHRcdFx0ZGVsZXRlIGhvb2tzLnN0b3A7XG5cdFx0XHRzdG9wKCBnb3RvRW5kICk7XG5cdFx0fTtcblxuXHRcdGlmICggdHlwZW9mIHR5cGUgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRnb3RvRW5kID0gY2xlYXJRdWV1ZTtcblx0XHRcdGNsZWFyUXVldWUgPSB0eXBlO1xuXHRcdFx0dHlwZSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdFx0aWYgKCBjbGVhclF1ZXVlICYmIHR5cGUgIT09IGZhbHNlICkge1xuXHRcdFx0dGhpcy5xdWV1ZSggdHlwZSB8fCBcImZ4XCIsIFtdICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkZXF1ZXVlID0gdHJ1ZSxcblx0XHRcdFx0aW5kZXggPSB0eXBlICE9IG51bGwgJiYgdHlwZSArIFwicXVldWVIb29rc1wiLFxuXHRcdFx0XHR0aW1lcnMgPSBqUXVlcnkudGltZXJzLFxuXHRcdFx0XHRkYXRhID0galF1ZXJ5Ll9kYXRhKCB0aGlzICk7XG5cblx0XHRcdGlmICggaW5kZXggKSB7XG5cdFx0XHRcdGlmICggZGF0YVsgaW5kZXggXSAmJiBkYXRhWyBpbmRleCBdLnN0b3AgKSB7XG5cdFx0XHRcdFx0c3RvcFF1ZXVlKCBkYXRhWyBpbmRleCBdICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIGluZGV4IGluIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCBkYXRhWyBpbmRleCBdICYmIGRhdGFbIGluZGV4IF0uc3RvcCAmJiBycnVuLnRlc3QoIGluZGV4ICkgKSB7XG5cdFx0XHRcdFx0XHRzdG9wUXVldWUoIGRhdGFbIGluZGV4IF0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Zm9yICggaW5kZXggPSB0aW1lcnMubGVuZ3RoOyBpbmRleC0tOyApIHtcblx0XHRcdFx0aWYgKCB0aW1lcnNbIGluZGV4IF0uZWxlbSA9PT0gdGhpcyAmJiAodHlwZSA9PSBudWxsIHx8IHRpbWVyc1sgaW5kZXggXS5xdWV1ZSA9PT0gdHlwZSkgKSB7XG5cdFx0XHRcdFx0dGltZXJzWyBpbmRleCBdLmFuaW0uc3RvcCggZ290b0VuZCApO1xuXHRcdFx0XHRcdGRlcXVldWUgPSBmYWxzZTtcblx0XHRcdFx0XHR0aW1lcnMuc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0YXJ0IHRoZSBuZXh0IGluIHRoZSBxdWV1ZSBpZiB0aGUgbGFzdCBzdGVwIHdhc24ndCBmb3JjZWRcblx0XHRcdC8vIHRpbWVycyBjdXJyZW50bHkgd2lsbCBjYWxsIHRoZWlyIGNvbXBsZXRlIGNhbGxiYWNrcywgd2hpY2ggd2lsbCBkZXF1ZXVlXG5cdFx0XHQvLyBidXQgb25seSBpZiB0aGV5IHdlcmUgZ290b0VuZFxuXHRcdFx0aWYgKCBkZXF1ZXVlIHx8ICFnb3RvRW5kICkge1xuXHRcdFx0XHRqUXVlcnkuZGVxdWV1ZSggdGhpcywgdHlwZSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRmaW5pc2g6IGZ1bmN0aW9uKCB0eXBlICkge1xuXHRcdGlmICggdHlwZSAhPT0gZmFsc2UgKSB7XG5cdFx0XHR0eXBlID0gdHlwZSB8fCBcImZ4XCI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5kZXgsXG5cdFx0XHRcdGRhdGEgPSBqUXVlcnkuX2RhdGEoIHRoaXMgKSxcblx0XHRcdFx0cXVldWUgPSBkYXRhWyB0eXBlICsgXCJxdWV1ZVwiIF0sXG5cdFx0XHRcdGhvb2tzID0gZGF0YVsgdHlwZSArIFwicXVldWVIb29rc1wiIF0sXG5cdFx0XHRcdHRpbWVycyA9IGpRdWVyeS50aW1lcnMsXG5cdFx0XHRcdGxlbmd0aCA9IHF1ZXVlID8gcXVldWUubGVuZ3RoIDogMDtcblxuXHRcdFx0Ly8gZW5hYmxlIGZpbmlzaGluZyBmbGFnIG9uIHByaXZhdGUgZGF0YVxuXHRcdFx0ZGF0YS5maW5pc2ggPSB0cnVlO1xuXG5cdFx0XHQvLyBlbXB0eSB0aGUgcXVldWUgZmlyc3Rcblx0XHRcdGpRdWVyeS5xdWV1ZSggdGhpcywgdHlwZSwgW10gKTtcblxuXHRcdFx0aWYgKCBob29rcyAmJiBob29rcy5zdG9wICkge1xuXHRcdFx0XHRob29rcy5zdG9wLmNhbGwoIHRoaXMsIHRydWUgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gbG9vayBmb3IgYW55IGFjdGl2ZSBhbmltYXRpb25zLCBhbmQgZmluaXNoIHRoZW1cblx0XHRcdGZvciAoIGluZGV4ID0gdGltZXJzLmxlbmd0aDsgaW5kZXgtLTsgKSB7XG5cdFx0XHRcdGlmICggdGltZXJzWyBpbmRleCBdLmVsZW0gPT09IHRoaXMgJiYgdGltZXJzWyBpbmRleCBdLnF1ZXVlID09PSB0eXBlICkge1xuXHRcdFx0XHRcdHRpbWVyc1sgaW5kZXggXS5hbmltLnN0b3AoIHRydWUgKTtcblx0XHRcdFx0XHR0aW1lcnMuc3BsaWNlKCBpbmRleCwgMSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGxvb2sgZm9yIGFueSBhbmltYXRpb25zIGluIHRoZSBvbGQgcXVldWUgYW5kIGZpbmlzaCB0aGVtXG5cdFx0XHRmb3IgKCBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrICkge1xuXHRcdFx0XHRpZiAoIHF1ZXVlWyBpbmRleCBdICYmIHF1ZXVlWyBpbmRleCBdLmZpbmlzaCApIHtcblx0XHRcdFx0XHRxdWV1ZVsgaW5kZXggXS5maW5pc2guY2FsbCggdGhpcyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIHR1cm4gb2ZmIGZpbmlzaGluZyBmbGFnXG5cdFx0XHRkZWxldGUgZGF0YS5maW5pc2g7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZWFjaChbIFwidG9nZ2xlXCIsIFwic2hvd1wiLCBcImhpZGVcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0dmFyIGNzc0ZuID0galF1ZXJ5LmZuWyBuYW1lIF07XG5cdGpRdWVyeS5mblsgbmFtZSBdID0gZnVuY3Rpb24oIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICkge1xuXHRcdHJldHVybiBzcGVlZCA9PSBudWxsIHx8IHR5cGVvZiBzcGVlZCA9PT0gXCJib29sZWFuXCIgP1xuXHRcdFx0Y3NzRm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApIDpcblx0XHRcdHRoaXMuYW5pbWF0ZSggZ2VuRngoIG5hbWUsIHRydWUgKSwgc3BlZWQsIGVhc2luZywgY2FsbGJhY2sgKTtcblx0fTtcbn0pO1xuXG4vLyBHZW5lcmF0ZSBzaG9ydGN1dHMgZm9yIGN1c3RvbSBhbmltYXRpb25zXG5qUXVlcnkuZWFjaCh7XG5cdHNsaWRlRG93bjogZ2VuRngoXCJzaG93XCIpLFxuXHRzbGlkZVVwOiBnZW5GeChcImhpZGVcIiksXG5cdHNsaWRlVG9nZ2xlOiBnZW5GeChcInRvZ2dsZVwiKSxcblx0ZmFkZUluOiB7IG9wYWNpdHk6IFwic2hvd1wiIH0sXG5cdGZhZGVPdXQ6IHsgb3BhY2l0eTogXCJoaWRlXCIgfSxcblx0ZmFkZVRvZ2dsZTogeyBvcGFjaXR5OiBcInRvZ2dsZVwiIH1cbn0sIGZ1bmN0aW9uKCBuYW1lLCBwcm9wcyApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggc3BlZWQsIGVhc2luZywgY2FsbGJhY2sgKSB7XG5cdFx0cmV0dXJuIHRoaXMuYW5pbWF0ZSggcHJvcHMsIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICk7XG5cdH07XG59KTtcblxualF1ZXJ5LnRpbWVycyA9IFtdO1xualF1ZXJ5LmZ4LnRpY2sgPSBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVyLFxuXHRcdHRpbWVycyA9IGpRdWVyeS50aW1lcnMsXG5cdFx0aSA9IDA7XG5cblx0ZnhOb3cgPSBqUXVlcnkubm93KCk7XG5cblx0Zm9yICggOyBpIDwgdGltZXJzLmxlbmd0aDsgaSsrICkge1xuXHRcdHRpbWVyID0gdGltZXJzWyBpIF07XG5cdFx0Ly8gQ2hlY2tzIHRoZSB0aW1lciBoYXMgbm90IGFscmVhZHkgYmVlbiByZW1vdmVkXG5cdFx0aWYgKCAhdGltZXIoKSAmJiB0aW1lcnNbIGkgXSA9PT0gdGltZXIgKSB7XG5cdFx0XHR0aW1lcnMuc3BsaWNlKCBpLS0sIDEgKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoICF0aW1lcnMubGVuZ3RoICkge1xuXHRcdGpRdWVyeS5meC5zdG9wKCk7XG5cdH1cblx0ZnhOb3cgPSB1bmRlZmluZWQ7XG59O1xuXG5qUXVlcnkuZngudGltZXIgPSBmdW5jdGlvbiggdGltZXIgKSB7XG5cdGpRdWVyeS50aW1lcnMucHVzaCggdGltZXIgKTtcblx0aWYgKCB0aW1lcigpICkge1xuXHRcdGpRdWVyeS5meC5zdGFydCgpO1xuXHR9IGVsc2Uge1xuXHRcdGpRdWVyeS50aW1lcnMucG9wKCk7XG5cdH1cbn07XG5cbmpRdWVyeS5meC5pbnRlcnZhbCA9IDEzO1xuXG5qUXVlcnkuZnguc3RhcnQgPSBmdW5jdGlvbigpIHtcblx0aWYgKCAhdGltZXJJZCApIHtcblx0XHR0aW1lcklkID0gc2V0SW50ZXJ2YWwoIGpRdWVyeS5meC50aWNrLCBqUXVlcnkuZnguaW50ZXJ2YWwgKTtcblx0fVxufTtcblxualF1ZXJ5LmZ4LnN0b3AgPSBmdW5jdGlvbigpIHtcblx0Y2xlYXJJbnRlcnZhbCggdGltZXJJZCApO1xuXHR0aW1lcklkID0gbnVsbDtcbn07XG5cbmpRdWVyeS5meC5zcGVlZHMgPSB7XG5cdHNsb3c6IDYwMCxcblx0ZmFzdDogMjAwLFxuXHQvLyBEZWZhdWx0IHNwZWVkXG5cdF9kZWZhdWx0OiA0MDBcbn07XG5cblxuLy8gQmFzZWQgb2ZmIG9mIHRoZSBwbHVnaW4gYnkgQ2xpbnQgSGVsZmVycywgd2l0aCBwZXJtaXNzaW9uLlxuLy8gaHR0cDovL2JsaW5kc2lnbmFscy5jb20vaW5kZXgucGhwLzIwMDkvMDcvanF1ZXJ5LWRlbGF5L1xualF1ZXJ5LmZuLmRlbGF5ID0gZnVuY3Rpb24oIHRpbWUsIHR5cGUgKSB7XG5cdHRpbWUgPSBqUXVlcnkuZnggPyBqUXVlcnkuZnguc3BlZWRzWyB0aW1lIF0gfHwgdGltZSA6IHRpbWU7XG5cdHR5cGUgPSB0eXBlIHx8IFwiZnhcIjtcblxuXHRyZXR1cm4gdGhpcy5xdWV1ZSggdHlwZSwgZnVuY3Rpb24oIG5leHQsIGhvb2tzICkge1xuXHRcdHZhciB0aW1lb3V0ID0gc2V0VGltZW91dCggbmV4dCwgdGltZSApO1xuXHRcdGhvb2tzLnN0b3AgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdH07XG5cdH0pO1xufTtcblxuXG4oZnVuY3Rpb24oKSB7XG5cdC8vIE1pbmlmaWVkOiB2YXIgYSxiLGMsZCxlXG5cdHZhciBpbnB1dCwgZGl2LCBzZWxlY3QsIGEsIG9wdDtcblxuXHQvLyBTZXR1cFxuXHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImRpdlwiICk7XG5cdGRpdi5zZXRBdHRyaWJ1dGUoIFwiY2xhc3NOYW1lXCIsIFwidFwiICk7XG5cdGRpdi5pbm5lckhUTUwgPSBcIiAgPGxpbmsvPjx0YWJsZT48L3RhYmxlPjxhIGhyZWY9Jy9hJz5hPC9hPjxpbnB1dCB0eXBlPSdjaGVja2JveCcvPlwiO1xuXHRhID0gZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYVwiKVsgMCBdO1xuXG5cdC8vIEZpcnN0IGJhdGNoIG9mIHRlc3RzLlxuXHRzZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuXHRvcHQgPSBzZWxlY3QuYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIikgKTtcblx0aW5wdXQgPSBkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKVsgMCBdO1xuXG5cdGEuc3R5bGUuY3NzVGV4dCA9IFwidG9wOjFweFwiO1xuXG5cdC8vIFRlc3Qgc2V0QXR0cmlidXRlIG9uIGNhbWVsQ2FzZSBjbGFzcy4gSWYgaXQgd29ya3MsIHdlIG5lZWQgYXR0ckZpeGVzIHdoZW4gZG9pbmcgZ2V0L3NldEF0dHJpYnV0ZSAoaWU2LzcpXG5cdHN1cHBvcnQuZ2V0U2V0QXR0cmlidXRlID0gZGl2LmNsYXNzTmFtZSAhPT0gXCJ0XCI7XG5cblx0Ly8gR2V0IHRoZSBzdHlsZSBpbmZvcm1hdGlvbiBmcm9tIGdldEF0dHJpYnV0ZVxuXHQvLyAoSUUgdXNlcyAuY3NzVGV4dCBpbnN0ZWFkKVxuXHRzdXBwb3J0LnN0eWxlID0gL3RvcC8udGVzdCggYS5nZXRBdHRyaWJ1dGUoXCJzdHlsZVwiKSApO1xuXG5cdC8vIE1ha2Ugc3VyZSB0aGF0IFVSTHMgYXJlbid0IG1hbmlwdWxhdGVkXG5cdC8vIChJRSBub3JtYWxpemVzIGl0IGJ5IGRlZmF1bHQpXG5cdHN1cHBvcnQuaHJlZk5vcm1hbGl6ZWQgPSBhLmdldEF0dHJpYnV0ZShcImhyZWZcIikgPT09IFwiL2FcIjtcblxuXHQvLyBDaGVjayB0aGUgZGVmYXVsdCBjaGVja2JveC9yYWRpbyB2YWx1ZSAoXCJcIiBvbiBXZWJLaXQ7IFwib25cIiBlbHNld2hlcmUpXG5cdHN1cHBvcnQuY2hlY2tPbiA9ICEhaW5wdXQudmFsdWU7XG5cblx0Ly8gTWFrZSBzdXJlIHRoYXQgYSBzZWxlY3RlZC1ieS1kZWZhdWx0IG9wdGlvbiBoYXMgYSB3b3JraW5nIHNlbGVjdGVkIHByb3BlcnR5LlxuXHQvLyAoV2ViS2l0IGRlZmF1bHRzIHRvIGZhbHNlIGluc3RlYWQgb2YgdHJ1ZSwgSUUgdG9vLCBpZiBpdCdzIGluIGFuIG9wdGdyb3VwKVxuXHRzdXBwb3J0Lm9wdFNlbGVjdGVkID0gb3B0LnNlbGVjdGVkO1xuXG5cdC8vIFRlc3RzIGZvciBlbmN0eXBlIHN1cHBvcnQgb24gYSBmb3JtICgjNjc0Mylcblx0c3VwcG9ydC5lbmN0eXBlID0gISFkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiKS5lbmN0eXBlO1xuXG5cdC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBvcHRpb25zIGluc2lkZSBkaXNhYmxlZCBzZWxlY3RzIGFyZW4ndCBtYXJrZWQgYXMgZGlzYWJsZWRcblx0Ly8gKFdlYktpdCBtYXJrcyB0aGVtIGFzIGRpc2FibGVkKVxuXHRzZWxlY3QuZGlzYWJsZWQgPSB0cnVlO1xuXHRzdXBwb3J0Lm9wdERpc2FibGVkID0gIW9wdC5kaXNhYmxlZDtcblxuXHQvLyBTdXBwb3J0OiBJRTggb25seVxuXHQvLyBDaGVjayBpZiB3ZSBjYW4gdHJ1c3QgZ2V0QXR0cmlidXRlKFwidmFsdWVcIilcblx0aW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImlucHV0XCIgKTtcblx0aW5wdXQuc2V0QXR0cmlidXRlKCBcInZhbHVlXCIsIFwiXCIgKTtcblx0c3VwcG9ydC5pbnB1dCA9IGlucHV0LmdldEF0dHJpYnV0ZSggXCJ2YWx1ZVwiICkgPT09IFwiXCI7XG5cblx0Ly8gQ2hlY2sgaWYgYW4gaW5wdXQgbWFpbnRhaW5zIGl0cyB2YWx1ZSBhZnRlciBiZWNvbWluZyBhIHJhZGlvXG5cdGlucHV0LnZhbHVlID0gXCJ0XCI7XG5cdGlucHV0LnNldEF0dHJpYnV0ZSggXCJ0eXBlXCIsIFwicmFkaW9cIiApO1xuXHRzdXBwb3J0LnJhZGlvVmFsdWUgPSBpbnB1dC52YWx1ZSA9PT0gXCJ0XCI7XG59KSgpO1xuXG5cbnZhciBycmV0dXJuID0gL1xcci9nO1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0dmFsOiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0dmFyIGhvb2tzLCByZXQsIGlzRnVuY3Rpb24sXG5cdFx0XHRlbGVtID0gdGhpc1swXTtcblxuXHRcdGlmICggIWFyZ3VtZW50cy5sZW5ndGggKSB7XG5cdFx0XHRpZiAoIGVsZW0gKSB7XG5cdFx0XHRcdGhvb2tzID0galF1ZXJ5LnZhbEhvb2tzWyBlbGVtLnR5cGUgXSB8fCBqUXVlcnkudmFsSG9va3NbIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSBdO1xuXG5cdFx0XHRcdGlmICggaG9va3MgJiYgXCJnZXRcIiBpbiBob29rcyAmJiAocmV0ID0gaG9va3MuZ2V0KCBlbGVtLCBcInZhbHVlXCIgKSkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRyZXR1cm4gcmV0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0ID0gZWxlbS52YWx1ZTtcblxuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIHJldCA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0XHRcdFx0Ly8gaGFuZGxlIG1vc3QgY29tbW9uIHN0cmluZyBjYXNlc1xuXHRcdFx0XHRcdHJldC5yZXBsYWNlKHJyZXR1cm4sIFwiXCIpIDpcblx0XHRcdFx0XHQvLyBoYW5kbGUgY2FzZXMgd2hlcmUgdmFsdWUgaXMgbnVsbC91bmRlZiBvciBudW1iZXJcblx0XHRcdFx0XHRyZXQgPT0gbnVsbCA/IFwiXCIgOiByZXQ7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpc0Z1bmN0aW9uID0galF1ZXJ5LmlzRnVuY3Rpb24oIHZhbHVlICk7XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0dmFyIHZhbDtcblxuXHRcdFx0aWYgKCB0aGlzLm5vZGVUeXBlICE9PSAxICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggaXNGdW5jdGlvbiApIHtcblx0XHRcdFx0dmFsID0gdmFsdWUuY2FsbCggdGhpcywgaSwgalF1ZXJ5KCB0aGlzICkudmFsKCkgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbCA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUcmVhdCBudWxsL3VuZGVmaW5lZCBhcyBcIlwiOyBjb252ZXJ0IG51bWJlcnMgdG8gc3RyaW5nXG5cdFx0XHRpZiAoIHZhbCA9PSBudWxsICkge1xuXHRcdFx0XHR2YWwgPSBcIlwiO1xuXHRcdFx0fSBlbHNlIGlmICggdHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIiApIHtcblx0XHRcdFx0dmFsICs9IFwiXCI7XG5cdFx0XHR9IGVsc2UgaWYgKCBqUXVlcnkuaXNBcnJheSggdmFsICkgKSB7XG5cdFx0XHRcdHZhbCA9IGpRdWVyeS5tYXAoIHZhbCwgZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0XHRcdHJldHVybiB2YWx1ZSA9PSBudWxsID8gXCJcIiA6IHZhbHVlICsgXCJcIjtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGhvb2tzID0galF1ZXJ5LnZhbEhvb2tzWyB0aGlzLnR5cGUgXSB8fCBqUXVlcnkudmFsSG9va3NbIHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSBdO1xuXG5cdFx0XHQvLyBJZiBzZXQgcmV0dXJucyB1bmRlZmluZWQsIGZhbGwgYmFjayB0byBub3JtYWwgc2V0dGluZ1xuXHRcdFx0aWYgKCAhaG9va3MgfHwgIShcInNldFwiIGluIGhvb2tzKSB8fCBob29rcy5zZXQoIHRoaXMsIHZhbCwgXCJ2YWx1ZVwiICkgPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0dGhpcy52YWx1ZSA9IHZhbDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cbmpRdWVyeS5leHRlbmQoe1xuXHR2YWxIb29rczoge1xuXHRcdG9wdGlvbjoge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0dmFyIHZhbCA9IGpRdWVyeS5maW5kLmF0dHIoIGVsZW0sIFwidmFsdWVcIiApO1xuXHRcdFx0XHRyZXR1cm4gdmFsICE9IG51bGwgP1xuXHRcdFx0XHRcdHZhbCA6XG5cdFx0XHRcdFx0Ly8gU3VwcG9ydDogSUUxMC0xMStcblx0XHRcdFx0XHQvLyBvcHRpb24udGV4dCB0aHJvd3MgZXhjZXB0aW9ucyAoIzE0Njg2LCAjMTQ4NTgpXG5cdFx0XHRcdFx0alF1ZXJ5LnRyaW0oIGpRdWVyeS50ZXh0KCBlbGVtICkgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHNlbGVjdDoge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0dmFyIHZhbHVlLCBvcHRpb24sXG5cdFx0XHRcdFx0b3B0aW9ucyA9IGVsZW0ub3B0aW9ucyxcblx0XHRcdFx0XHRpbmRleCA9IGVsZW0uc2VsZWN0ZWRJbmRleCxcblx0XHRcdFx0XHRvbmUgPSBlbGVtLnR5cGUgPT09IFwic2VsZWN0LW9uZVwiIHx8IGluZGV4IDwgMCxcblx0XHRcdFx0XHR2YWx1ZXMgPSBvbmUgPyBudWxsIDogW10sXG5cdFx0XHRcdFx0bWF4ID0gb25lID8gaW5kZXggKyAxIDogb3B0aW9ucy5sZW5ndGgsXG5cdFx0XHRcdFx0aSA9IGluZGV4IDwgMCA/XG5cdFx0XHRcdFx0XHRtYXggOlxuXHRcdFx0XHRcdFx0b25lID8gaW5kZXggOiAwO1xuXG5cdFx0XHRcdC8vIExvb3AgdGhyb3VnaCBhbGwgdGhlIHNlbGVjdGVkIG9wdGlvbnNcblx0XHRcdFx0Zm9yICggOyBpIDwgbWF4OyBpKysgKSB7XG5cdFx0XHRcdFx0b3B0aW9uID0gb3B0aW9uc1sgaSBdO1xuXG5cdFx0XHRcdFx0Ly8gb2xkSUUgZG9lc24ndCB1cGRhdGUgc2VsZWN0ZWQgYWZ0ZXIgZm9ybSByZXNldCAoIzI1NTEpXG5cdFx0XHRcdFx0aWYgKCAoIG9wdGlvbi5zZWxlY3RlZCB8fCBpID09PSBpbmRleCApICYmXG5cdFx0XHRcdFx0XHRcdC8vIERvbid0IHJldHVybiBvcHRpb25zIHRoYXQgYXJlIGRpc2FibGVkIG9yIGluIGEgZGlzYWJsZWQgb3B0Z3JvdXBcblx0XHRcdFx0XHRcdFx0KCBzdXBwb3J0Lm9wdERpc2FibGVkID8gIW9wdGlvbi5kaXNhYmxlZCA6IG9wdGlvbi5nZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiKSA9PT0gbnVsbCApICYmXG5cdFx0XHRcdFx0XHRcdCggIW9wdGlvbi5wYXJlbnROb2RlLmRpc2FibGVkIHx8ICFqUXVlcnkubm9kZU5hbWUoIG9wdGlvbi5wYXJlbnROb2RlLCBcIm9wdGdyb3VwXCIgKSApICkge1xuXG5cdFx0XHRcdFx0XHQvLyBHZXQgdGhlIHNwZWNpZmljIHZhbHVlIGZvciB0aGUgb3B0aW9uXG5cdFx0XHRcdFx0XHR2YWx1ZSA9IGpRdWVyeSggb3B0aW9uICkudmFsKCk7XG5cblx0XHRcdFx0XHRcdC8vIFdlIGRvbid0IG5lZWQgYW4gYXJyYXkgZm9yIG9uZSBzZWxlY3RzXG5cdFx0XHRcdFx0XHRpZiAoIG9uZSApIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBNdWx0aS1TZWxlY3RzIHJldHVybiBhbiBhcnJheVxuXHRcdFx0XHRcdFx0dmFsdWVzLnB1c2goIHZhbHVlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHZhbHVlcztcblx0XHRcdH0sXG5cblx0XHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdFx0XHR2YXIgb3B0aW9uU2V0LCBvcHRpb24sXG5cdFx0XHRcdFx0b3B0aW9ucyA9IGVsZW0ub3B0aW9ucyxcblx0XHRcdFx0XHR2YWx1ZXMgPSBqUXVlcnkubWFrZUFycmF5KCB2YWx1ZSApLFxuXHRcdFx0XHRcdGkgPSBvcHRpb25zLmxlbmd0aDtcblxuXHRcdFx0XHR3aGlsZSAoIGktLSApIHtcblx0XHRcdFx0XHRvcHRpb24gPSBvcHRpb25zWyBpIF07XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5pbkFycmF5KCBqUXVlcnkudmFsSG9va3Mub3B0aW9uLmdldCggb3B0aW9uICksIHZhbHVlcyApID49IDAgKSB7XG5cblx0XHRcdFx0XHRcdC8vIFN1cHBvcnQ6IElFNlxuXHRcdFx0XHRcdFx0Ly8gV2hlbiBuZXcgb3B0aW9uIGVsZW1lbnQgaXMgYWRkZWQgdG8gc2VsZWN0IGJveCB3ZSBuZWVkIHRvXG5cdFx0XHRcdFx0XHQvLyBmb3JjZSByZWZsb3cgb2YgbmV3bHkgYWRkZWQgbm9kZSBpbiBvcmRlciB0byB3b3JrYXJvdW5kIGRlbGF5XG5cdFx0XHRcdFx0XHQvLyBvZiBpbml0aWFsaXphdGlvbiBwcm9wZXJ0aWVzXG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRvcHRpb24uc2VsZWN0ZWQgPSBvcHRpb25TZXQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHR9IGNhdGNoICggXyApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBXaWxsIGJlIGV4ZWN1dGVkIG9ubHkgaW4gSUU2XG5cdFx0XHRcdFx0XHRcdG9wdGlvbi5zY3JvbGxIZWlnaHQ7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0b3B0aW9uLnNlbGVjdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRm9yY2UgYnJvd3NlcnMgdG8gYmVoYXZlIGNvbnNpc3RlbnRseSB3aGVuIG5vbi1tYXRjaGluZyB2YWx1ZSBpcyBzZXRcblx0XHRcdFx0aWYgKCAhb3B0aW9uU2V0ICkge1xuXHRcdFx0XHRcdGVsZW0uc2VsZWN0ZWRJbmRleCA9IC0xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIG9wdGlvbnM7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gUmFkaW9zIGFuZCBjaGVja2JveGVzIGdldHRlci9zZXR0ZXJcbmpRdWVyeS5lYWNoKFsgXCJyYWRpb1wiLCBcImNoZWNrYm94XCIgXSwgZnVuY3Rpb24oKSB7XG5cdGpRdWVyeS52YWxIb29rc1sgdGhpcyBdID0ge1xuXHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdFx0aWYgKCBqUXVlcnkuaXNBcnJheSggdmFsdWUgKSApIHtcblx0XHRcdFx0cmV0dXJuICggZWxlbS5jaGVja2VkID0galF1ZXJ5LmluQXJyYXkoIGpRdWVyeShlbGVtKS52YWwoKSwgdmFsdWUgKSA+PSAwICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRpZiAoICFzdXBwb3J0LmNoZWNrT24gKSB7XG5cdFx0alF1ZXJ5LnZhbEhvb2tzWyB0aGlzIF0uZ2V0ID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHQvLyBTdXBwb3J0OiBXZWJraXRcblx0XHRcdC8vIFwiXCIgaXMgcmV0dXJuZWQgaW5zdGVhZCBvZiBcIm9uXCIgaWYgYSB2YWx1ZSBpc24ndCBzcGVjaWZpZWRcblx0XHRcdHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpID09PSBudWxsID8gXCJvblwiIDogZWxlbS52YWx1ZTtcblx0XHR9O1xuXHR9XG59KTtcblxuXG5cblxudmFyIG5vZGVIb29rLCBib29sSG9vayxcblx0YXR0ckhhbmRsZSA9IGpRdWVyeS5leHByLmF0dHJIYW5kbGUsXG5cdHJ1c2VEZWZhdWx0ID0gL14oPzpjaGVja2VkfHNlbGVjdGVkKSQvaSxcblx0Z2V0U2V0QXR0cmlidXRlID0gc3VwcG9ydC5nZXRTZXRBdHRyaWJ1dGUsXG5cdGdldFNldElucHV0ID0gc3VwcG9ydC5pbnB1dDtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdGF0dHI6IGZ1bmN0aW9uKCBuYW1lLCB2YWx1ZSApIHtcblx0XHRyZXR1cm4gYWNjZXNzKCB0aGlzLCBqUXVlcnkuYXR0ciwgbmFtZSwgdmFsdWUsIGFyZ3VtZW50cy5sZW5ndGggPiAxICk7XG5cdH0sXG5cblx0cmVtb3ZlQXR0cjogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5yZW1vdmVBdHRyKCB0aGlzLCBuYW1lICk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZXh0ZW5kKHtcblx0YXR0cjogZnVuY3Rpb24oIGVsZW0sIG5hbWUsIHZhbHVlICkge1xuXHRcdHZhciBob29rcywgcmV0LFxuXHRcdFx0blR5cGUgPSBlbGVtLm5vZGVUeXBlO1xuXG5cdFx0Ly8gZG9uJ3QgZ2V0L3NldCBhdHRyaWJ1dGVzIG9uIHRleHQsIGNvbW1lbnQgYW5kIGF0dHJpYnV0ZSBub2Rlc1xuXHRcdGlmICggIWVsZW0gfHwgblR5cGUgPT09IDMgfHwgblR5cGUgPT09IDggfHwgblR5cGUgPT09IDIgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gRmFsbGJhY2sgdG8gcHJvcCB3aGVuIGF0dHJpYnV0ZXMgYXJlIG5vdCBzdXBwb3J0ZWRcblx0XHRpZiAoIHR5cGVvZiBlbGVtLmdldEF0dHJpYnV0ZSA9PT0gc3RydW5kZWZpbmVkICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeS5wcm9wKCBlbGVtLCBuYW1lLCB2YWx1ZSApO1xuXHRcdH1cblxuXHRcdC8vIEFsbCBhdHRyaWJ1dGVzIGFyZSBsb3dlcmNhc2Vcblx0XHQvLyBHcmFiIG5lY2Vzc2FyeSBob29rIGlmIG9uZSBpcyBkZWZpbmVkXG5cdFx0aWYgKCBuVHlwZSAhPT0gMSB8fCAhalF1ZXJ5LmlzWE1MRG9jKCBlbGVtICkgKSB7XG5cdFx0XHRuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0aG9va3MgPSBqUXVlcnkuYXR0ckhvb2tzWyBuYW1lIF0gfHxcblx0XHRcdFx0KCBqUXVlcnkuZXhwci5tYXRjaC5ib29sLnRlc3QoIG5hbWUgKSA/IGJvb2xIb29rIDogbm9kZUhvb2sgKTtcblx0XHR9XG5cblx0XHRpZiAoIHZhbHVlICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdGlmICggdmFsdWUgPT09IG51bGwgKSB7XG5cdFx0XHRcdGpRdWVyeS5yZW1vdmVBdHRyKCBlbGVtLCBuYW1lICk7XG5cblx0XHRcdH0gZWxzZSBpZiAoIGhvb2tzICYmIFwic2V0XCIgaW4gaG9va3MgJiYgKHJldCA9IGhvb2tzLnNldCggZWxlbSwgdmFsdWUsIG5hbWUgKSkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0cmV0dXJuIHJldDtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoIG5hbWUsIHZhbHVlICsgXCJcIiApO1xuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKCBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIG5hbWUgKSkgIT09IG51bGwgKSB7XG5cdFx0XHRyZXR1cm4gcmV0O1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldCA9IGpRdWVyeS5maW5kLmF0dHIoIGVsZW0sIG5hbWUgKTtcblxuXHRcdFx0Ly8gTm9uLWV4aXN0ZW50IGF0dHJpYnV0ZXMgcmV0dXJuIG51bGwsIHdlIG5vcm1hbGl6ZSB0byB1bmRlZmluZWRcblx0XHRcdHJldHVybiByZXQgPT0gbnVsbCA/XG5cdFx0XHRcdHVuZGVmaW5lZCA6XG5cdFx0XHRcdHJldDtcblx0XHR9XG5cdH0sXG5cblx0cmVtb3ZlQXR0cjogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdHZhciBuYW1lLCBwcm9wTmFtZSxcblx0XHRcdGkgPSAwLFxuXHRcdFx0YXR0ck5hbWVzID0gdmFsdWUgJiYgdmFsdWUubWF0Y2goIHJub3R3aGl0ZSApO1xuXG5cdFx0aWYgKCBhdHRyTmFtZXMgJiYgZWxlbS5ub2RlVHlwZSA9PT0gMSApIHtcblx0XHRcdHdoaWxlICggKG5hbWUgPSBhdHRyTmFtZXNbaSsrXSkgKSB7XG5cdFx0XHRcdHByb3BOYW1lID0galF1ZXJ5LnByb3BGaXhbIG5hbWUgXSB8fCBuYW1lO1xuXG5cdFx0XHRcdC8vIEJvb2xlYW4gYXR0cmlidXRlcyBnZXQgc3BlY2lhbCB0cmVhdG1lbnQgKCMxMDg3MClcblx0XHRcdFx0aWYgKCBqUXVlcnkuZXhwci5tYXRjaC5ib29sLnRlc3QoIG5hbWUgKSApIHtcblx0XHRcdFx0XHQvLyBTZXQgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSB0byBmYWxzZVxuXHRcdFx0XHRcdGlmICggZ2V0U2V0SW5wdXQgJiYgZ2V0U2V0QXR0cmlidXRlIHx8ICFydXNlRGVmYXVsdC50ZXN0KCBuYW1lICkgKSB7XG5cdFx0XHRcdFx0XHRlbGVtWyBwcm9wTmFtZSBdID0gZmFsc2U7XG5cdFx0XHRcdFx0Ly8gU3VwcG9ydDogSUU8OVxuXHRcdFx0XHRcdC8vIEFsc28gY2xlYXIgZGVmYXVsdENoZWNrZWQvZGVmYXVsdFNlbGVjdGVkIChpZiBhcHByb3ByaWF0ZSlcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZWxlbVsgalF1ZXJ5LmNhbWVsQ2FzZSggXCJkZWZhdWx0LVwiICsgbmFtZSApIF0gPVxuXHRcdFx0XHRcdFx0XHRlbGVtWyBwcm9wTmFtZSBdID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFNlZSAjOTY5OSBmb3IgZXhwbGFuYXRpb24gb2YgdGhpcyBhcHByb2FjaCAoc2V0dGluZyBmaXJzdCwgdGhlbiByZW1vdmFsKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGpRdWVyeS5hdHRyKCBlbGVtLCBuYW1lLCBcIlwiICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbGVtLnJlbW92ZUF0dHJpYnV0ZSggZ2V0U2V0QXR0cmlidXRlID8gbmFtZSA6IHByb3BOYW1lICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdGF0dHJIb29rczoge1xuXHRcdHR5cGU6IHtcblx0XHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICFzdXBwb3J0LnJhZGlvVmFsdWUgJiYgdmFsdWUgPT09IFwicmFkaW9cIiAmJiBqUXVlcnkubm9kZU5hbWUoZWxlbSwgXCJpbnB1dFwiKSApIHtcblx0XHRcdFx0XHQvLyBTZXR0aW5nIHRoZSB0eXBlIG9uIGEgcmFkaW8gYnV0dG9uIGFmdGVyIHRoZSB2YWx1ZSByZXNldHMgdGhlIHZhbHVlIGluIElFNi05XG5cdFx0XHRcdFx0Ly8gUmVzZXQgdmFsdWUgdG8gZGVmYXVsdCBpbiBjYXNlIHR5cGUgaXMgc2V0IGFmdGVyIHZhbHVlIGR1cmluZyBjcmVhdGlvblxuXHRcdFx0XHRcdHZhciB2YWwgPSBlbGVtLnZhbHVlO1xuXHRcdFx0XHRcdGVsZW0uc2V0QXR0cmlidXRlKCBcInR5cGVcIiwgdmFsdWUgKTtcblx0XHRcdFx0XHRpZiAoIHZhbCApIHtcblx0XHRcdFx0XHRcdGVsZW0udmFsdWUgPSB2YWw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbi8vIEhvb2sgZm9yIGJvb2xlYW4gYXR0cmlidXRlc1xuYm9vbEhvb2sgPSB7XG5cdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlLCBuYW1lICkge1xuXHRcdGlmICggdmFsdWUgPT09IGZhbHNlICkge1xuXHRcdFx0Ly8gUmVtb3ZlIGJvb2xlYW4gYXR0cmlidXRlcyB3aGVuIHNldCB0byBmYWxzZVxuXHRcdFx0alF1ZXJ5LnJlbW92ZUF0dHIoIGVsZW0sIG5hbWUgKTtcblx0XHR9IGVsc2UgaWYgKCBnZXRTZXRJbnB1dCAmJiBnZXRTZXRBdHRyaWJ1dGUgfHwgIXJ1c2VEZWZhdWx0LnRlc3QoIG5hbWUgKSApIHtcblx0XHRcdC8vIElFPDggbmVlZHMgdGhlICpwcm9wZXJ0eSogbmFtZVxuXHRcdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoICFnZXRTZXRBdHRyaWJ1dGUgJiYgalF1ZXJ5LnByb3BGaXhbIG5hbWUgXSB8fCBuYW1lLCBuYW1lICk7XG5cblx0XHQvLyBVc2UgZGVmYXVsdENoZWNrZWQgYW5kIGRlZmF1bHRTZWxlY3RlZCBmb3Igb2xkSUVcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZWxlbVsgalF1ZXJ5LmNhbWVsQ2FzZSggXCJkZWZhdWx0LVwiICsgbmFtZSApIF0gPSBlbGVtWyBuYW1lIF0gPSB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBuYW1lO1xuXHR9XG59O1xuXG4vLyBSZXRyaWV2ZSBib29sZWFucyBzcGVjaWFsbHlcbmpRdWVyeS5lYWNoKCBqUXVlcnkuZXhwci5tYXRjaC5ib29sLnNvdXJjZS5tYXRjaCggL1xcdysvZyApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHR2YXIgZ2V0dGVyID0gYXR0ckhhbmRsZVsgbmFtZSBdIHx8IGpRdWVyeS5maW5kLmF0dHI7XG5cblx0YXR0ckhhbmRsZVsgbmFtZSBdID0gZ2V0U2V0SW5wdXQgJiYgZ2V0U2V0QXR0cmlidXRlIHx8ICFydXNlRGVmYXVsdC50ZXN0KCBuYW1lICkgP1xuXHRcdGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCBpc1hNTCApIHtcblx0XHRcdHZhciByZXQsIGhhbmRsZTtcblx0XHRcdGlmICggIWlzWE1MICkge1xuXHRcdFx0XHQvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wIGJ5IHRlbXBvcmFyaWx5IHJlbW92aW5nIHRoaXMgZnVuY3Rpb24gZnJvbSB0aGUgZ2V0dGVyXG5cdFx0XHRcdGhhbmRsZSA9IGF0dHJIYW5kbGVbIG5hbWUgXTtcblx0XHRcdFx0YXR0ckhhbmRsZVsgbmFtZSBdID0gcmV0O1xuXHRcdFx0XHRyZXQgPSBnZXR0ZXIoIGVsZW0sIG5hbWUsIGlzWE1MICkgIT0gbnVsbCA/XG5cdFx0XHRcdFx0bmFtZS50b0xvd2VyQ2FzZSgpIDpcblx0XHRcdFx0XHRudWxsO1xuXHRcdFx0XHRhdHRySGFuZGxlWyBuYW1lIF0gPSBoYW5kbGU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmV0O1xuXHRcdH0gOlxuXHRcdGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCBpc1hNTCApIHtcblx0XHRcdGlmICggIWlzWE1MICkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbVsgalF1ZXJ5LmNhbWVsQ2FzZSggXCJkZWZhdWx0LVwiICsgbmFtZSApIF0gP1xuXHRcdFx0XHRcdG5hbWUudG9Mb3dlckNhc2UoKSA6XG5cdFx0XHRcdFx0bnVsbDtcblx0XHRcdH1cblx0XHR9O1xufSk7XG5cbi8vIGZpeCBvbGRJRSBhdHRyb3BlcnRpZXNcbmlmICggIWdldFNldElucHV0IHx8ICFnZXRTZXRBdHRyaWJ1dGUgKSB7XG5cdGpRdWVyeS5hdHRySG9va3MudmFsdWUgPSB7XG5cdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUsIG5hbWUgKSB7XG5cdFx0XHRpZiAoIGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJpbnB1dFwiICkgKSB7XG5cdFx0XHRcdC8vIERvZXMgbm90IHJldHVybiBzbyB0aGF0IHNldEF0dHJpYnV0ZSBpcyBhbHNvIHVzZWRcblx0XHRcdFx0ZWxlbS5kZWZhdWx0VmFsdWUgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFVzZSBub2RlSG9vayBpZiBkZWZpbmVkICgjMTk1NCk7IG90aGVyd2lzZSBzZXRBdHRyaWJ1dGUgaXMgZmluZVxuXHRcdFx0XHRyZXR1cm4gbm9kZUhvb2sgJiYgbm9kZUhvb2suc2V0KCBlbGVtLCB2YWx1ZSwgbmFtZSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn1cblxuLy8gSUU2LzcgZG8gbm90IHN1cHBvcnQgZ2V0dGluZy9zZXR0aW5nIHNvbWUgYXR0cmlidXRlcyB3aXRoIGdldC9zZXRBdHRyaWJ1dGVcbmlmICggIWdldFNldEF0dHJpYnV0ZSApIHtcblxuXHQvLyBVc2UgdGhpcyBmb3IgYW55IGF0dHJpYnV0ZSBpbiBJRTYvN1xuXHQvLyBUaGlzIGZpeGVzIGFsbW9zdCBldmVyeSBJRTYvNyBpc3N1ZVxuXHRub2RlSG9vayA9IHtcblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSwgbmFtZSApIHtcblx0XHRcdC8vIFNldCB0aGUgZXhpc3Rpbmcgb3IgY3JlYXRlIGEgbmV3IGF0dHJpYnV0ZSBub2RlXG5cdFx0XHR2YXIgcmV0ID0gZWxlbS5nZXRBdHRyaWJ1dGVOb2RlKCBuYW1lICk7XG5cdFx0XHRpZiAoICFyZXQgKSB7XG5cdFx0XHRcdGVsZW0uc2V0QXR0cmlidXRlTm9kZShcblx0XHRcdFx0XHQocmV0ID0gZWxlbS5vd25lckRvY3VtZW50LmNyZWF0ZUF0dHJpYnV0ZSggbmFtZSApKVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXQudmFsdWUgPSB2YWx1ZSArPSBcIlwiO1xuXG5cdFx0XHQvLyBCcmVhayBhc3NvY2lhdGlvbiB3aXRoIGNsb25lZCBlbGVtZW50cyBieSBhbHNvIHVzaW5nIHNldEF0dHJpYnV0ZSAoIzk2NDYpXG5cdFx0XHRpZiAoIG5hbWUgPT09IFwidmFsdWVcIiB8fCB2YWx1ZSA9PT0gZWxlbS5nZXRBdHRyaWJ1dGUoIG5hbWUgKSApIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBTb21lIGF0dHJpYnV0ZXMgYXJlIGNvbnN0cnVjdGVkIHdpdGggZW1wdHktc3RyaW5nIHZhbHVlcyB3aGVuIG5vdCBkZWZpbmVkXG5cdGF0dHJIYW5kbGUuaWQgPSBhdHRySGFuZGxlLm5hbWUgPSBhdHRySGFuZGxlLmNvb3JkcyA9XG5cdFx0ZnVuY3Rpb24oIGVsZW0sIG5hbWUsIGlzWE1MICkge1xuXHRcdFx0dmFyIHJldDtcblx0XHRcdGlmICggIWlzWE1MICkge1xuXHRcdFx0XHRyZXR1cm4gKHJldCA9IGVsZW0uZ2V0QXR0cmlidXRlTm9kZSggbmFtZSApKSAmJiByZXQudmFsdWUgIT09IFwiXCIgP1xuXHRcdFx0XHRcdHJldC52YWx1ZSA6XG5cdFx0XHRcdFx0bnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdC8vIEZpeGluZyB2YWx1ZSByZXRyaWV2YWwgb24gYSBidXR0b24gcmVxdWlyZXMgdGhpcyBtb2R1bGVcblx0alF1ZXJ5LnZhbEhvb2tzLmJ1dHRvbiA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lICkge1xuXHRcdFx0dmFyIHJldCA9IGVsZW0uZ2V0QXR0cmlidXRlTm9kZSggbmFtZSApO1xuXHRcdFx0aWYgKCByZXQgJiYgcmV0LnNwZWNpZmllZCApIHtcblx0XHRcdFx0cmV0dXJuIHJldC52YWx1ZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHNldDogbm9kZUhvb2suc2V0XG5cdH07XG5cblx0Ly8gU2V0IGNvbnRlbnRlZGl0YWJsZSB0byBmYWxzZSBvbiByZW1vdmFscygjMTA0MjkpXG5cdC8vIFNldHRpbmcgdG8gZW1wdHkgc3RyaW5nIHRocm93cyBhbiBlcnJvciBhcyBhbiBpbnZhbGlkIHZhbHVlXG5cdGpRdWVyeS5hdHRySG9va3MuY29udGVudGVkaXRhYmxlID0ge1xuXHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlLCBuYW1lICkge1xuXHRcdFx0bm9kZUhvb2suc2V0KCBlbGVtLCB2YWx1ZSA9PT0gXCJcIiA/IGZhbHNlIDogdmFsdWUsIG5hbWUgKTtcblx0XHR9XG5cdH07XG5cblx0Ly8gU2V0IHdpZHRoIGFuZCBoZWlnaHQgdG8gYXV0byBpbnN0ZWFkIG9mIDAgb24gZW1wdHkgc3RyaW5nKCBCdWcgIzgxNTAgKVxuXHQvLyBUaGlzIGlzIGZvciByZW1vdmFsc1xuXHRqUXVlcnkuZWFjaChbIFwid2lkdGhcIiwgXCJoZWlnaHRcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0XHRqUXVlcnkuYXR0ckhvb2tzWyBuYW1lIF0gPSB7XG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCB2YWx1ZSA9PT0gXCJcIiApIHtcblx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSggbmFtZSwgXCJhdXRvXCIgKTtcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn1cblxuaWYgKCAhc3VwcG9ydC5zdHlsZSApIHtcblx0alF1ZXJ5LmF0dHJIb29rcy5zdHlsZSA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0Ly8gUmV0dXJuIHVuZGVmaW5lZCBpbiB0aGUgY2FzZSBvZiBlbXB0eSBzdHJpbmdcblx0XHRcdC8vIE5vdGU6IElFIHVwcGVyY2FzZXMgY3NzIHByb3BlcnR5IG5hbWVzLCBidXQgaWYgd2Ugd2VyZSB0byAudG9Mb3dlckNhc2UoKVxuXHRcdFx0Ly8gLmNzc1RleHQsIHRoYXQgd291bGQgZGVzdHJveSBjYXNlIHNlbnN0aXRpdml0eSBpbiBVUkwncywgbGlrZSBpbiBcImJhY2tncm91bmRcIlxuXHRcdFx0cmV0dXJuIGVsZW0uc3R5bGUuY3NzVGV4dCB8fCB1bmRlZmluZWQ7XG5cdFx0fSxcblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSApIHtcblx0XHRcdHJldHVybiAoIGVsZW0uc3R5bGUuY3NzVGV4dCA9IHZhbHVlICsgXCJcIiApO1xuXHRcdH1cblx0fTtcbn1cblxuXG5cblxudmFyIHJmb2N1c2FibGUgPSAvXig/OmlucHV0fHNlbGVjdHx0ZXh0YXJlYXxidXR0b258b2JqZWN0KSQvaSxcblx0cmNsaWNrYWJsZSA9IC9eKD86YXxhcmVhKSQvaTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdHByb3A6IGZ1bmN0aW9uKCBuYW1lLCB2YWx1ZSApIHtcblx0XHRyZXR1cm4gYWNjZXNzKCB0aGlzLCBqUXVlcnkucHJvcCwgbmFtZSwgdmFsdWUsIGFyZ3VtZW50cy5sZW5ndGggPiAxICk7XG5cdH0sXG5cblx0cmVtb3ZlUHJvcDogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0bmFtZSA9IGpRdWVyeS5wcm9wRml4WyBuYW1lIF0gfHwgbmFtZTtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdHJ5L2NhdGNoIGhhbmRsZXMgY2FzZXMgd2hlcmUgSUUgYmFsa3MgKHN1Y2ggYXMgcmVtb3ZpbmcgYSBwcm9wZXJ0eSBvbiB3aW5kb3cpXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzWyBuYW1lIF0gPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzWyBuYW1lIF07XG5cdFx0XHR9IGNhdGNoKCBlICkge31cblx0XHR9KTtcblx0fVxufSk7XG5cbmpRdWVyeS5leHRlbmQoe1xuXHRwcm9wRml4OiB7XG5cdFx0XCJmb3JcIjogXCJodG1sRm9yXCIsXG5cdFx0XCJjbGFzc1wiOiBcImNsYXNzTmFtZVwiXG5cdH0sXG5cblx0cHJvcDogZnVuY3Rpb24oIGVsZW0sIG5hbWUsIHZhbHVlICkge1xuXHRcdHZhciByZXQsIGhvb2tzLCBub3R4bWwsXG5cdFx0XHRuVHlwZSA9IGVsZW0ubm9kZVR5cGU7XG5cblx0XHQvLyBkb24ndCBnZXQvc2V0IHByb3BlcnRpZXMgb24gdGV4dCwgY29tbWVudCBhbmQgYXR0cmlidXRlIG5vZGVzXG5cdFx0aWYgKCAhZWxlbSB8fCBuVHlwZSA9PT0gMyB8fCBuVHlwZSA9PT0gOCB8fCBuVHlwZSA9PT0gMiApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRub3R4bWwgPSBuVHlwZSAhPT0gMSB8fCAhalF1ZXJ5LmlzWE1MRG9jKCBlbGVtICk7XG5cblx0XHRpZiAoIG5vdHhtbCApIHtcblx0XHRcdC8vIEZpeCBuYW1lIGFuZCBhdHRhY2ggaG9va3Ncblx0XHRcdG5hbWUgPSBqUXVlcnkucHJvcEZpeFsgbmFtZSBdIHx8IG5hbWU7XG5cdFx0XHRob29rcyA9IGpRdWVyeS5wcm9wSG9va3NbIG5hbWUgXTtcblx0XHR9XG5cblx0XHRpZiAoIHZhbHVlICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRyZXR1cm4gaG9va3MgJiYgXCJzZXRcIiBpbiBob29rcyAmJiAocmV0ID0gaG9va3Muc2V0KCBlbGVtLCB2YWx1ZSwgbmFtZSApKSAhPT0gdW5kZWZpbmVkID9cblx0XHRcdFx0cmV0IDpcblx0XHRcdFx0KCBlbGVtWyBuYW1lIF0gPSB2YWx1ZSApO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIG5hbWUgKSkgIT09IG51bGwgP1xuXHRcdFx0XHRyZXQgOlxuXHRcdFx0XHRlbGVtWyBuYW1lIF07XG5cdFx0fVxuXHR9LFxuXG5cdHByb3BIb29rczoge1xuXHRcdHRhYkluZGV4OiB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0XHQvLyBlbGVtLnRhYkluZGV4IGRvZXNuJ3QgYWx3YXlzIHJldHVybiB0aGUgY29ycmVjdCB2YWx1ZSB3aGVuIGl0IGhhc24ndCBiZWVuIGV4cGxpY2l0bHkgc2V0XG5cdFx0XHRcdC8vIGh0dHA6Ly9mbHVpZHByb2plY3Qub3JnL2Jsb2cvMjAwOC8wMS8wOS9nZXR0aW5nLXNldHRpbmctYW5kLXJlbW92aW5nLXRhYmluZGV4LXZhbHVlcy13aXRoLWphdmFzY3JpcHQvXG5cdFx0XHRcdC8vIFVzZSBwcm9wZXIgYXR0cmlidXRlIHJldHJpZXZhbCgjMTIwNzIpXG5cdFx0XHRcdHZhciB0YWJpbmRleCA9IGpRdWVyeS5maW5kLmF0dHIoIGVsZW0sIFwidGFiaW5kZXhcIiApO1xuXG5cdFx0XHRcdHJldHVybiB0YWJpbmRleCA/XG5cdFx0XHRcdFx0cGFyc2VJbnQoIHRhYmluZGV4LCAxMCApIDpcblx0XHRcdFx0XHRyZm9jdXNhYmxlLnRlc3QoIGVsZW0ubm9kZU5hbWUgKSB8fCByY2xpY2thYmxlLnRlc3QoIGVsZW0ubm9kZU5hbWUgKSAmJiBlbGVtLmhyZWYgP1xuXHRcdFx0XHRcdFx0MCA6XG5cdFx0XHRcdFx0XHQtMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBTb21lIGF0dHJpYnV0ZXMgcmVxdWlyZSBhIHNwZWNpYWwgY2FsbCBvbiBJRVxuLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTM2NDI5JTI4VlMuODUlMjkuYXNweFxuaWYgKCAhc3VwcG9ydC5ocmVmTm9ybWFsaXplZCApIHtcblx0Ly8gaHJlZi9zcmMgcHJvcGVydHkgc2hvdWxkIGdldCB0aGUgZnVsbCBub3JtYWxpemVkIFVSTCAoIzEwMjk5LyMxMjkxNSlcblx0alF1ZXJ5LmVhY2goWyBcImhyZWZcIiwgXCJzcmNcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0XHRqUXVlcnkucHJvcEhvb2tzWyBuYW1lIF0gPSB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoIG5hbWUsIDQgKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn1cblxuLy8gU3VwcG9ydDogU2FmYXJpLCBJRTkrXG4vLyBtaXMtcmVwb3J0cyB0aGUgZGVmYXVsdCBzZWxlY3RlZCBwcm9wZXJ0eSBvZiBhbiBvcHRpb25cbi8vIEFjY2Vzc2luZyB0aGUgcGFyZW50J3Mgc2VsZWN0ZWRJbmRleCBwcm9wZXJ0eSBmaXhlcyBpdFxuaWYgKCAhc3VwcG9ydC5vcHRTZWxlY3RlZCApIHtcblx0alF1ZXJ5LnByb3BIb29rcy5zZWxlY3RlZCA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0dmFyIHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcblxuXHRcdFx0aWYgKCBwYXJlbnQgKSB7XG5cdFx0XHRcdHBhcmVudC5zZWxlY3RlZEluZGV4O1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGl0IGFsc28gd29ya3Mgd2l0aCBvcHRncm91cHMsIHNlZSAjNTcwMVxuXHRcdFx0XHRpZiAoIHBhcmVudC5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRcdHBhcmVudC5wYXJlbnROb2RlLnNlbGVjdGVkSW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0fTtcbn1cblxualF1ZXJ5LmVhY2goW1xuXHRcInRhYkluZGV4XCIsXG5cdFwicmVhZE9ubHlcIixcblx0XCJtYXhMZW5ndGhcIixcblx0XCJjZWxsU3BhY2luZ1wiLFxuXHRcImNlbGxQYWRkaW5nXCIsXG5cdFwicm93U3BhblwiLFxuXHRcImNvbFNwYW5cIixcblx0XCJ1c2VNYXBcIixcblx0XCJmcmFtZUJvcmRlclwiLFxuXHRcImNvbnRlbnRFZGl0YWJsZVwiXG5dLCBmdW5jdGlvbigpIHtcblx0alF1ZXJ5LnByb3BGaXhbIHRoaXMudG9Mb3dlckNhc2UoKSBdID0gdGhpcztcbn0pO1xuXG4vLyBJRTYvNyBjYWxsIGVuY3R5cGUgZW5jb2RpbmdcbmlmICggIXN1cHBvcnQuZW5jdHlwZSApIHtcblx0alF1ZXJ5LnByb3BGaXguZW5jdHlwZSA9IFwiZW5jb2RpbmdcIjtcbn1cblxuXG5cblxudmFyIHJjbGFzcyA9IC9bXFx0XFxyXFxuXFxmXS9nO1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0YWRkQ2xhc3M6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHR2YXIgY2xhc3NlcywgZWxlbSwgY3VyLCBjbGF6eiwgaiwgZmluYWxWYWx1ZSxcblx0XHRcdGkgPSAwLFxuXHRcdFx0bGVuID0gdGhpcy5sZW5ndGgsXG5cdFx0XHRwcm9jZWVkID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlO1xuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggdmFsdWUgKSApIHtcblx0XHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oIGogKSB7XG5cdFx0XHRcdGpRdWVyeSggdGhpcyApLmFkZENsYXNzKCB2YWx1ZS5jYWxsKCB0aGlzLCBqLCB0aGlzLmNsYXNzTmFtZSApICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIHByb2NlZWQgKSB7XG5cdFx0XHQvLyBUaGUgZGlzanVuY3Rpb24gaGVyZSBpcyBmb3IgYmV0dGVyIGNvbXByZXNzaWJpbGl0eSAoc2VlIHJlbW92ZUNsYXNzKVxuXHRcdFx0Y2xhc3NlcyA9ICggdmFsdWUgfHwgXCJcIiApLm1hdGNoKCBybm90d2hpdGUgKSB8fCBbXTtcblxuXHRcdFx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0XHRcdGVsZW0gPSB0aGlzWyBpIF07XG5cdFx0XHRcdGN1ciA9IGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgKCBlbGVtLmNsYXNzTmFtZSA/XG5cdFx0XHRcdFx0KCBcIiBcIiArIGVsZW0uY2xhc3NOYW1lICsgXCIgXCIgKS5yZXBsYWNlKCByY2xhc3MsIFwiIFwiICkgOlxuXHRcdFx0XHRcdFwiIFwiXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKCBjdXIgKSB7XG5cdFx0XHRcdFx0aiA9IDA7XG5cdFx0XHRcdFx0d2hpbGUgKCAoY2xhenogPSBjbGFzc2VzW2orK10pICkge1xuXHRcdFx0XHRcdFx0aWYgKCBjdXIuaW5kZXhPZiggXCIgXCIgKyBjbGF6eiArIFwiIFwiICkgPCAwICkge1xuXHRcdFx0XHRcdFx0XHRjdXIgKz0gY2xhenogKyBcIiBcIjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBvbmx5IGFzc2lnbiBpZiBkaWZmZXJlbnQgdG8gYXZvaWQgdW5uZWVkZWQgcmVuZGVyaW5nLlxuXHRcdFx0XHRcdGZpbmFsVmFsdWUgPSBqUXVlcnkudHJpbSggY3VyICk7XG5cdFx0XHRcdFx0aWYgKCBlbGVtLmNsYXNzTmFtZSAhPT0gZmluYWxWYWx1ZSApIHtcblx0XHRcdFx0XHRcdGVsZW0uY2xhc3NOYW1lID0gZmluYWxWYWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZW1vdmVDbGFzczogZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdHZhciBjbGFzc2VzLCBlbGVtLCBjdXIsIGNsYXp6LCBqLCBmaW5hbFZhbHVlLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW4gPSB0aGlzLmxlbmd0aCxcblx0XHRcdHByb2NlZWQgPSBhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZTtcblxuXHRcdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIHZhbHVlICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCBqICkge1xuXHRcdFx0XHRqUXVlcnkoIHRoaXMgKS5yZW1vdmVDbGFzcyggdmFsdWUuY2FsbCggdGhpcywgaiwgdGhpcy5jbGFzc05hbWUgKSApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmICggcHJvY2VlZCApIHtcblx0XHRcdGNsYXNzZXMgPSAoIHZhbHVlIHx8IFwiXCIgKS5tYXRjaCggcm5vdHdoaXRlICkgfHwgW107XG5cblx0XHRcdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHRlbGVtID0gdGhpc1sgaSBdO1xuXHRcdFx0XHQvLyBUaGlzIGV4cHJlc3Npb24gaXMgaGVyZSBmb3IgYmV0dGVyIGNvbXByZXNzaWJpbGl0eSAoc2VlIGFkZENsYXNzKVxuXHRcdFx0XHRjdXIgPSBlbGVtLm5vZGVUeXBlID09PSAxICYmICggZWxlbS5jbGFzc05hbWUgP1xuXHRcdFx0XHRcdCggXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiICkucmVwbGFjZSggcmNsYXNzLCBcIiBcIiApIDpcblx0XHRcdFx0XHRcIlwiXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKCBjdXIgKSB7XG5cdFx0XHRcdFx0aiA9IDA7XG5cdFx0XHRcdFx0d2hpbGUgKCAoY2xhenogPSBjbGFzc2VzW2orK10pICkge1xuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlICphbGwqIGluc3RhbmNlc1xuXHRcdFx0XHRcdFx0d2hpbGUgKCBjdXIuaW5kZXhPZiggXCIgXCIgKyBjbGF6eiArIFwiIFwiICkgPj0gMCApIHtcblx0XHRcdFx0XHRcdFx0Y3VyID0gY3VyLnJlcGxhY2UoIFwiIFwiICsgY2xhenogKyBcIiBcIiwgXCIgXCIgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBvbmx5IGFzc2lnbiBpZiBkaWZmZXJlbnQgdG8gYXZvaWQgdW5uZWVkZWQgcmVuZGVyaW5nLlxuXHRcdFx0XHRcdGZpbmFsVmFsdWUgPSB2YWx1ZSA/IGpRdWVyeS50cmltKCBjdXIgKSA6IFwiXCI7XG5cdFx0XHRcdFx0aWYgKCBlbGVtLmNsYXNzTmFtZSAhPT0gZmluYWxWYWx1ZSApIHtcblx0XHRcdFx0XHRcdGVsZW0uY2xhc3NOYW1lID0gZmluYWxWYWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHR0b2dnbGVDbGFzczogZnVuY3Rpb24oIHZhbHVlLCBzdGF0ZVZhbCApIHtcblx0XHR2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcblxuXHRcdGlmICggdHlwZW9mIHN0YXRlVmFsID09PSBcImJvb2xlYW5cIiAmJiB0eXBlID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0cmV0dXJuIHN0YXRlVmFsID8gdGhpcy5hZGRDbGFzcyggdmFsdWUgKSA6IHRoaXMucmVtb3ZlQ2xhc3MoIHZhbHVlICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggdmFsdWUgKSApIHtcblx0XHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdGpRdWVyeSggdGhpcyApLnRvZ2dsZUNsYXNzKCB2YWx1ZS5jYWxsKHRoaXMsIGksIHRoaXMuY2xhc3NOYW1lLCBzdGF0ZVZhbCksIHN0YXRlVmFsICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCB0eXBlID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHQvLyB0b2dnbGUgaW5kaXZpZHVhbCBjbGFzcyBuYW1lc1xuXHRcdFx0XHR2YXIgY2xhc3NOYW1lLFxuXHRcdFx0XHRcdGkgPSAwLFxuXHRcdFx0XHRcdHNlbGYgPSBqUXVlcnkoIHRoaXMgKSxcblx0XHRcdFx0XHRjbGFzc05hbWVzID0gdmFsdWUubWF0Y2goIHJub3R3aGl0ZSApIHx8IFtdO1xuXG5cdFx0XHRcdHdoaWxlICggKGNsYXNzTmFtZSA9IGNsYXNzTmFtZXNbIGkrKyBdKSApIHtcblx0XHRcdFx0XHQvLyBjaGVjayBlYWNoIGNsYXNzTmFtZSBnaXZlbiwgc3BhY2Ugc2VwYXJhdGVkIGxpc3Rcblx0XHRcdFx0XHRpZiAoIHNlbGYuaGFzQ2xhc3MoIGNsYXNzTmFtZSApICkge1xuXHRcdFx0XHRcdFx0c2VsZi5yZW1vdmVDbGFzcyggY2xhc3NOYW1lICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNlbGYuYWRkQ2xhc3MoIGNsYXNzTmFtZSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHQvLyBUb2dnbGUgd2hvbGUgY2xhc3MgbmFtZVxuXHRcdFx0fSBlbHNlIGlmICggdHlwZSA9PT0gc3RydW5kZWZpbmVkIHx8IHR5cGUgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdFx0XHRpZiAoIHRoaXMuY2xhc3NOYW1lICkge1xuXHRcdFx0XHRcdC8vIHN0b3JlIGNsYXNzTmFtZSBpZiBzZXRcblx0XHRcdFx0XHRqUXVlcnkuX2RhdGEoIHRoaXMsIFwiX19jbGFzc05hbWVfX1wiLCB0aGlzLmNsYXNzTmFtZSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSWYgdGhlIGVsZW1lbnQgaGFzIGEgY2xhc3MgbmFtZSBvciBpZiB3ZSdyZSBwYXNzZWQgXCJmYWxzZVwiLFxuXHRcdFx0XHQvLyB0aGVuIHJlbW92ZSB0aGUgd2hvbGUgY2xhc3NuYW1lIChpZiB0aGVyZSB3YXMgb25lLCB0aGUgYWJvdmUgc2F2ZWQgaXQpLlxuXHRcdFx0XHQvLyBPdGhlcndpc2UgYnJpbmcgYmFjayB3aGF0ZXZlciB3YXMgcHJldmlvdXNseSBzYXZlZCAoaWYgYW55dGhpbmcpLFxuXHRcdFx0XHQvLyBmYWxsaW5nIGJhY2sgdG8gdGhlIGVtcHR5IHN0cmluZyBpZiBub3RoaW5nIHdhcyBzdG9yZWQuXG5cdFx0XHRcdHRoaXMuY2xhc3NOYW1lID0gdGhpcy5jbGFzc05hbWUgfHwgdmFsdWUgPT09IGZhbHNlID8gXCJcIiA6IGpRdWVyeS5fZGF0YSggdGhpcywgXCJfX2NsYXNzTmFtZV9fXCIgKSB8fCBcIlwiO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGhhc0NsYXNzOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IFwiIFwiICsgc2VsZWN0b3IgKyBcIiBcIixcblx0XHRcdGkgPSAwLFxuXHRcdFx0bCA9IHRoaXMubGVuZ3RoO1xuXHRcdGZvciAoIDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdGlmICggdGhpc1tpXS5ub2RlVHlwZSA9PT0gMSAmJiAoXCIgXCIgKyB0aGlzW2ldLmNsYXNzTmFtZSArIFwiIFwiKS5yZXBsYWNlKHJjbGFzcywgXCIgXCIpLmluZGV4T2YoIGNsYXNzTmFtZSApID49IDAgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufSk7XG5cblxuXG5cbi8vIFJldHVybiBqUXVlcnkgZm9yIGF0dHJpYnV0ZXMtb25seSBpbmNsdXNpb25cblxuXG5qUXVlcnkuZWFjaCggKFwiYmx1ciBmb2N1cyBmb2N1c2luIGZvY3Vzb3V0IGxvYWQgcmVzaXplIHNjcm9sbCB1bmxvYWQgY2xpY2sgZGJsY2xpY2sgXCIgK1xuXHRcIm1vdXNlZG93biBtb3VzZXVwIG1vdXNlbW92ZSBtb3VzZW92ZXIgbW91c2VvdXQgbW91c2VlbnRlciBtb3VzZWxlYXZlIFwiICtcblx0XCJjaGFuZ2Ugc2VsZWN0IHN1Ym1pdCBrZXlkb3duIGtleXByZXNzIGtleXVwIGVycm9yIGNvbnRleHRtZW51XCIpLnNwbGl0KFwiIFwiKSwgZnVuY3Rpb24oIGksIG5hbWUgKSB7XG5cblx0Ly8gSGFuZGxlIGV2ZW50IGJpbmRpbmdcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggZGF0YSwgZm4gKSB7XG5cdFx0cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAwID9cblx0XHRcdHRoaXMub24oIG5hbWUsIG51bGwsIGRhdGEsIGZuICkgOlxuXHRcdFx0dGhpcy50cmlnZ2VyKCBuYW1lICk7XG5cdH07XG59KTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdGhvdmVyOiBmdW5jdGlvbiggZm5PdmVyLCBmbk91dCApIHtcblx0XHRyZXR1cm4gdGhpcy5tb3VzZWVudGVyKCBmbk92ZXIgKS5tb3VzZWxlYXZlKCBmbk91dCB8fCBmbk92ZXIgKTtcblx0fSxcblxuXHRiaW5kOiBmdW5jdGlvbiggdHlwZXMsIGRhdGEsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlcywgbnVsbCwgZGF0YSwgZm4gKTtcblx0fSxcblx0dW5iaW5kOiBmdW5jdGlvbiggdHlwZXMsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9mZiggdHlwZXMsIG51bGwsIGZuICk7XG5cdH0sXG5cblx0ZGVsZWdhdGU6IGZ1bmN0aW9uKCBzZWxlY3RvciwgdHlwZXMsIGRhdGEsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlcywgc2VsZWN0b3IsIGRhdGEsIGZuICk7XG5cdH0sXG5cdHVuZGVsZWdhdGU6IGZ1bmN0aW9uKCBzZWxlY3RvciwgdHlwZXMsIGZuICkge1xuXHRcdC8vICggbmFtZXNwYWNlICkgb3IgKCBzZWxlY3RvciwgdHlwZXMgWywgZm5dIClcblx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IHRoaXMub2ZmKCBzZWxlY3RvciwgXCIqKlwiICkgOiB0aGlzLm9mZiggdHlwZXMsIHNlbGVjdG9yIHx8IFwiKipcIiwgZm4gKTtcblx0fVxufSk7XG5cblxudmFyIG5vbmNlID0galF1ZXJ5Lm5vdygpO1xuXG52YXIgcnF1ZXJ5ID0gKC9cXD8vKTtcblxuXG5cbnZhciBydmFsaWR0b2tlbnMgPSAvKCwpfChcXFt8eyl8KH18XSl8XCIoPzpbXlwiXFxcXFxcclxcbl18XFxcXFtcIlxcXFxcXC9iZm5ydF18XFxcXHVbXFxkYS1mQS1GXXs0fSkqXCJcXHMqOj98dHJ1ZXxmYWxzZXxudWxsfC0/KD8hMFxcZClcXGQrKD86XFwuXFxkK3wpKD86W2VFXVsrLV0/XFxkK3wpL2c7XG5cbmpRdWVyeS5wYXJzZUpTT04gPSBmdW5jdGlvbiggZGF0YSApIHtcblx0Ly8gQXR0ZW1wdCB0byBwYXJzZSB1c2luZyB0aGUgbmF0aXZlIEpTT04gcGFyc2VyIGZpcnN0XG5cdGlmICggd2luZG93LkpTT04gJiYgd2luZG93LkpTT04ucGFyc2UgKSB7XG5cdFx0Ly8gU3VwcG9ydDogQW5kcm9pZCAyLjNcblx0XHQvLyBXb3JrYXJvdW5kIGZhaWx1cmUgdG8gc3RyaW5nLWNhc3QgbnVsbCBpbnB1dFxuXHRcdHJldHVybiB3aW5kb3cuSlNPTi5wYXJzZSggZGF0YSArIFwiXCIgKTtcblx0fVxuXG5cdHZhciByZXF1aXJlTm9uQ29tbWEsXG5cdFx0ZGVwdGggPSBudWxsLFxuXHRcdHN0ciA9IGpRdWVyeS50cmltKCBkYXRhICsgXCJcIiApO1xuXG5cdC8vIEd1YXJkIGFnYWluc3QgaW52YWxpZCAoYW5kIHBvc3NpYmx5IGRhbmdlcm91cykgaW5wdXQgYnkgZW5zdXJpbmcgdGhhdCBub3RoaW5nIHJlbWFpbnNcblx0Ly8gYWZ0ZXIgcmVtb3ZpbmcgdmFsaWQgdG9rZW5zXG5cdHJldHVybiBzdHIgJiYgIWpRdWVyeS50cmltKCBzdHIucmVwbGFjZSggcnZhbGlkdG9rZW5zLCBmdW5jdGlvbiggdG9rZW4sIGNvbW1hLCBvcGVuLCBjbG9zZSApIHtcblxuXHRcdC8vIEZvcmNlIHRlcm1pbmF0aW9uIGlmIHdlIHNlZSBhIG1pc3BsYWNlZCBjb21tYVxuXHRcdGlmICggcmVxdWlyZU5vbkNvbW1hICYmIGNvbW1hICkge1xuXHRcdFx0ZGVwdGggPSAwO1xuXHRcdH1cblxuXHRcdC8vIFBlcmZvcm0gbm8gbW9yZSByZXBsYWNlbWVudHMgYWZ0ZXIgcmV0dXJuaW5nIHRvIG91dGVybW9zdCBkZXB0aFxuXHRcdGlmICggZGVwdGggPT09IDAgKSB7XG5cdFx0XHRyZXR1cm4gdG9rZW47XG5cdFx0fVxuXG5cdFx0Ly8gQ29tbWFzIG11c3Qgbm90IGZvbGxvdyBcIltcIiwgXCJ7XCIsIG9yIFwiLFwiXG5cdFx0cmVxdWlyZU5vbkNvbW1hID0gb3BlbiB8fCBjb21tYTtcblxuXHRcdC8vIERldGVybWluZSBuZXcgZGVwdGhcblx0XHQvLyBhcnJheS9vYmplY3Qgb3BlbiAoXCJbXCIgb3IgXCJ7XCIpOiBkZXB0aCArPSB0cnVlIC0gZmFsc2UgKGluY3JlbWVudClcblx0XHQvLyBhcnJheS9vYmplY3QgY2xvc2UgKFwiXVwiIG9yIFwifVwiKTogZGVwdGggKz0gZmFsc2UgLSB0cnVlIChkZWNyZW1lbnQpXG5cdFx0Ly8gb3RoZXIgY2FzZXMgKFwiLFwiIG9yIHByaW1pdGl2ZSk6IGRlcHRoICs9IHRydWUgLSB0cnVlIChudW1lcmljIGNhc3QpXG5cdFx0ZGVwdGggKz0gIWNsb3NlIC0gIW9wZW47XG5cblx0XHQvLyBSZW1vdmUgdGhpcyB0b2tlblxuXHRcdHJldHVybiBcIlwiO1xuXHR9KSApID9cblx0XHQoIEZ1bmN0aW9uKCBcInJldHVybiBcIiArIHN0ciApICkoKSA6XG5cdFx0alF1ZXJ5LmVycm9yKCBcIkludmFsaWQgSlNPTjogXCIgKyBkYXRhICk7XG59O1xuXG5cbi8vIENyb3NzLWJyb3dzZXIgeG1sIHBhcnNpbmdcbmpRdWVyeS5wYXJzZVhNTCA9IGZ1bmN0aW9uKCBkYXRhICkge1xuXHR2YXIgeG1sLCB0bXA7XG5cdGlmICggIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0dHJ5IHtcblx0XHRpZiAoIHdpbmRvdy5ET01QYXJzZXIgKSB7IC8vIFN0YW5kYXJkXG5cdFx0XHR0bXAgPSBuZXcgRE9NUGFyc2VyKCk7XG5cdFx0XHR4bWwgPSB0bXAucGFyc2VGcm9tU3RyaW5nKCBkYXRhLCBcInRleHQveG1sXCIgKTtcblx0XHR9IGVsc2UgeyAvLyBJRVxuXHRcdFx0eG1sID0gbmV3IEFjdGl2ZVhPYmplY3QoIFwiTWljcm9zb2Z0LlhNTERPTVwiICk7XG5cdFx0XHR4bWwuYXN5bmMgPSBcImZhbHNlXCI7XG5cdFx0XHR4bWwubG9hZFhNTCggZGF0YSApO1xuXHRcdH1cblx0fSBjYXRjaCggZSApIHtcblx0XHR4bWwgPSB1bmRlZmluZWQ7XG5cdH1cblx0aWYgKCAheG1sIHx8ICF4bWwuZG9jdW1lbnRFbGVtZW50IHx8IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCJwYXJzZXJlcnJvclwiICkubGVuZ3RoICkge1xuXHRcdGpRdWVyeS5lcnJvciggXCJJbnZhbGlkIFhNTDogXCIgKyBkYXRhICk7XG5cdH1cblx0cmV0dXJuIHhtbDtcbn07XG5cblxudmFyXG5cdC8vIERvY3VtZW50IGxvY2F0aW9uXG5cdGFqYXhMb2NQYXJ0cyxcblx0YWpheExvY2F0aW9uLFxuXG5cdHJoYXNoID0gLyMuKiQvLFxuXHRydHMgPSAvKFs/Jl0pXz1bXiZdKi8sXG5cdHJoZWFkZXJzID0gL14oLio/KTpbIFxcdF0qKFteXFxyXFxuXSopXFxyPyQvbWcsIC8vIElFIGxlYXZlcyBhbiBcXHIgY2hhcmFjdGVyIGF0IEVPTFxuXHQvLyAjNzY1MywgIzgxMjUsICM4MTUyOiBsb2NhbCBwcm90b2NvbCBkZXRlY3Rpb25cblx0cmxvY2FsUHJvdG9jb2wgPSAvXig/OmFib3V0fGFwcHxhcHAtc3RvcmFnZXwuKy1leHRlbnNpb258ZmlsZXxyZXN8d2lkZ2V0KTokLyxcblx0cm5vQ29udGVudCA9IC9eKD86R0VUfEhFQUQpJC8sXG5cdHJwcm90b2NvbCA9IC9eXFwvXFwvLyxcblx0cnVybCA9IC9eKFtcXHcuKy1dKzopKD86XFwvXFwvKD86W15cXC8/I10qQHwpKFteXFwvPyM6XSopKD86OihcXGQrKXwpfCkvLFxuXG5cdC8qIFByZWZpbHRlcnNcblx0ICogMSkgVGhleSBhcmUgdXNlZnVsIHRvIGludHJvZHVjZSBjdXN0b20gZGF0YVR5cGVzIChzZWUgYWpheC9qc29ucC5qcyBmb3IgYW4gZXhhbXBsZSlcblx0ICogMikgVGhlc2UgYXJlIGNhbGxlZDpcblx0ICogICAgLSBCRUZPUkUgYXNraW5nIGZvciBhIHRyYW5zcG9ydFxuXHQgKiAgICAtIEFGVEVSIHBhcmFtIHNlcmlhbGl6YXRpb24gKHMuZGF0YSBpcyBhIHN0cmluZyBpZiBzLnByb2Nlc3NEYXRhIGlzIHRydWUpXG5cdCAqIDMpIGtleSBpcyB0aGUgZGF0YVR5cGVcblx0ICogNCkgdGhlIGNhdGNoYWxsIHN5bWJvbCBcIipcIiBjYW4gYmUgdXNlZFxuXHQgKiA1KSBleGVjdXRpb24gd2lsbCBzdGFydCB3aXRoIHRyYW5zcG9ydCBkYXRhVHlwZSBhbmQgVEhFTiBjb250aW51ZSBkb3duIHRvIFwiKlwiIGlmIG5lZWRlZFxuXHQgKi9cblx0cHJlZmlsdGVycyA9IHt9LFxuXG5cdC8qIFRyYW5zcG9ydHMgYmluZGluZ3Ncblx0ICogMSkga2V5IGlzIHRoZSBkYXRhVHlwZVxuXHQgKiAyKSB0aGUgY2F0Y2hhbGwgc3ltYm9sIFwiKlwiIGNhbiBiZSB1c2VkXG5cdCAqIDMpIHNlbGVjdGlvbiB3aWxsIHN0YXJ0IHdpdGggdHJhbnNwb3J0IGRhdGFUeXBlIGFuZCBUSEVOIGdvIHRvIFwiKlwiIGlmIG5lZWRlZFxuXHQgKi9cblx0dHJhbnNwb3J0cyA9IHt9LFxuXG5cdC8vIEF2b2lkIGNvbW1lbnQtcHJvbG9nIGNoYXIgc2VxdWVuY2UgKCMxMDA5OCk7IG11c3QgYXBwZWFzZSBsaW50IGFuZCBldmFkZSBjb21wcmVzc2lvblxuXHRhbGxUeXBlcyA9IFwiKi9cIi5jb25jYXQoXCIqXCIpO1xuXG4vLyAjODEzOCwgSUUgbWF5IHRocm93IGFuIGV4Y2VwdGlvbiB3aGVuIGFjY2Vzc2luZ1xuLy8gYSBmaWVsZCBmcm9tIHdpbmRvdy5sb2NhdGlvbiBpZiBkb2N1bWVudC5kb21haW4gaGFzIGJlZW4gc2V0XG50cnkge1xuXHRhamF4TG9jYXRpb24gPSBsb2NhdGlvbi5ocmVmO1xufSBjYXRjaCggZSApIHtcblx0Ly8gVXNlIHRoZSBocmVmIGF0dHJpYnV0ZSBvZiBhbiBBIGVsZW1lbnRcblx0Ly8gc2luY2UgSUUgd2lsbCBtb2RpZnkgaXQgZ2l2ZW4gZG9jdW1lbnQubG9jYXRpb25cblx0YWpheExvY2F0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggXCJhXCIgKTtcblx0YWpheExvY2F0aW9uLmhyZWYgPSBcIlwiO1xuXHRhamF4TG9jYXRpb24gPSBhamF4TG9jYXRpb24uaHJlZjtcbn1cblxuLy8gU2VnbWVudCBsb2NhdGlvbiBpbnRvIHBhcnRzXG5hamF4TG9jUGFydHMgPSBydXJsLmV4ZWMoIGFqYXhMb2NhdGlvbi50b0xvd2VyQ2FzZSgpICkgfHwgW107XG5cbi8vIEJhc2UgXCJjb25zdHJ1Y3RvclwiIGZvciBqUXVlcnkuYWpheFByZWZpbHRlciBhbmQgalF1ZXJ5LmFqYXhUcmFuc3BvcnRcbmZ1bmN0aW9uIGFkZFRvUHJlZmlsdGVyc09yVHJhbnNwb3J0cyggc3RydWN0dXJlICkge1xuXG5cdC8vIGRhdGFUeXBlRXhwcmVzc2lvbiBpcyBvcHRpb25hbCBhbmQgZGVmYXVsdHMgdG8gXCIqXCJcblx0cmV0dXJuIGZ1bmN0aW9uKCBkYXRhVHlwZUV4cHJlc3Npb24sIGZ1bmMgKSB7XG5cblx0XHRpZiAoIHR5cGVvZiBkYXRhVHlwZUV4cHJlc3Npb24gIT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRmdW5jID0gZGF0YVR5cGVFeHByZXNzaW9uO1xuXHRcdFx0ZGF0YVR5cGVFeHByZXNzaW9uID0gXCIqXCI7XG5cdFx0fVxuXG5cdFx0dmFyIGRhdGFUeXBlLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRkYXRhVHlwZXMgPSBkYXRhVHlwZUV4cHJlc3Npb24udG9Mb3dlckNhc2UoKS5tYXRjaCggcm5vdHdoaXRlICkgfHwgW107XG5cblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBmdW5jICkgKSB7XG5cdFx0XHQvLyBGb3IgZWFjaCBkYXRhVHlwZSBpbiB0aGUgZGF0YVR5cGVFeHByZXNzaW9uXG5cdFx0XHR3aGlsZSAoIChkYXRhVHlwZSA9IGRhdGFUeXBlc1tpKytdKSApIHtcblx0XHRcdFx0Ly8gUHJlcGVuZCBpZiByZXF1ZXN0ZWRcblx0XHRcdFx0aWYgKCBkYXRhVHlwZS5jaGFyQXQoIDAgKSA9PT0gXCIrXCIgKSB7XG5cdFx0XHRcdFx0ZGF0YVR5cGUgPSBkYXRhVHlwZS5zbGljZSggMSApIHx8IFwiKlwiO1xuXHRcdFx0XHRcdChzdHJ1Y3R1cmVbIGRhdGFUeXBlIF0gPSBzdHJ1Y3R1cmVbIGRhdGFUeXBlIF0gfHwgW10pLnVuc2hpZnQoIGZ1bmMgKTtcblxuXHRcdFx0XHQvLyBPdGhlcndpc2UgYXBwZW5kXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0KHN0cnVjdHVyZVsgZGF0YVR5cGUgXSA9IHN0cnVjdHVyZVsgZGF0YVR5cGUgXSB8fCBbXSkucHVzaCggZnVuYyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vLyBCYXNlIGluc3BlY3Rpb24gZnVuY3Rpb24gZm9yIHByZWZpbHRlcnMgYW5kIHRyYW5zcG9ydHNcbmZ1bmN0aW9uIGluc3BlY3RQcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBzdHJ1Y3R1cmUsIG9wdGlvbnMsIG9yaWdpbmFsT3B0aW9ucywganFYSFIgKSB7XG5cblx0dmFyIGluc3BlY3RlZCA9IHt9LFxuXHRcdHNlZWtpbmdUcmFuc3BvcnQgPSAoIHN0cnVjdHVyZSA9PT0gdHJhbnNwb3J0cyApO1xuXG5cdGZ1bmN0aW9uIGluc3BlY3QoIGRhdGFUeXBlICkge1xuXHRcdHZhciBzZWxlY3RlZDtcblx0XHRpbnNwZWN0ZWRbIGRhdGFUeXBlIF0gPSB0cnVlO1xuXHRcdGpRdWVyeS5lYWNoKCBzdHJ1Y3R1cmVbIGRhdGFUeXBlIF0gfHwgW10sIGZ1bmN0aW9uKCBfLCBwcmVmaWx0ZXJPckZhY3RvcnkgKSB7XG5cdFx0XHR2YXIgZGF0YVR5cGVPclRyYW5zcG9ydCA9IHByZWZpbHRlck9yRmFjdG9yeSggb3B0aW9ucywgb3JpZ2luYWxPcHRpb25zLCBqcVhIUiApO1xuXHRcdFx0aWYgKCB0eXBlb2YgZGF0YVR5cGVPclRyYW5zcG9ydCA9PT0gXCJzdHJpbmdcIiAmJiAhc2Vla2luZ1RyYW5zcG9ydCAmJiAhaW5zcGVjdGVkWyBkYXRhVHlwZU9yVHJhbnNwb3J0IF0gKSB7XG5cdFx0XHRcdG9wdGlvbnMuZGF0YVR5cGVzLnVuc2hpZnQoIGRhdGFUeXBlT3JUcmFuc3BvcnQgKTtcblx0XHRcdFx0aW5zcGVjdCggZGF0YVR5cGVPclRyYW5zcG9ydCApO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9IGVsc2UgaWYgKCBzZWVraW5nVHJhbnNwb3J0ICkge1xuXHRcdFx0XHRyZXR1cm4gISggc2VsZWN0ZWQgPSBkYXRhVHlwZU9yVHJhbnNwb3J0ICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHNlbGVjdGVkO1xuXHR9XG5cblx0cmV0dXJuIGluc3BlY3QoIG9wdGlvbnMuZGF0YVR5cGVzWyAwIF0gKSB8fCAhaW5zcGVjdGVkWyBcIipcIiBdICYmIGluc3BlY3QoIFwiKlwiICk7XG59XG5cbi8vIEEgc3BlY2lhbCBleHRlbmQgZm9yIGFqYXggb3B0aW9uc1xuLy8gdGhhdCB0YWtlcyBcImZsYXRcIiBvcHRpb25zIChub3QgdG8gYmUgZGVlcCBleHRlbmRlZClcbi8vIEZpeGVzICM5ODg3XG5mdW5jdGlvbiBhamF4RXh0ZW5kKCB0YXJnZXQsIHNyYyApIHtcblx0dmFyIGRlZXAsIGtleSxcblx0XHRmbGF0T3B0aW9ucyA9IGpRdWVyeS5hamF4U2V0dGluZ3MuZmxhdE9wdGlvbnMgfHwge307XG5cblx0Zm9yICgga2V5IGluIHNyYyApIHtcblx0XHRpZiAoIHNyY1sga2V5IF0gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdCggZmxhdE9wdGlvbnNbIGtleSBdID8gdGFyZ2V0IDogKCBkZWVwIHx8IChkZWVwID0ge30pICkgKVsga2V5IF0gPSBzcmNbIGtleSBdO1xuXHRcdH1cblx0fVxuXHRpZiAoIGRlZXAgKSB7XG5cdFx0alF1ZXJ5LmV4dGVuZCggdHJ1ZSwgdGFyZ2V0LCBkZWVwICk7XG5cdH1cblxuXHRyZXR1cm4gdGFyZ2V0O1xufVxuXG4vKiBIYW5kbGVzIHJlc3BvbnNlcyB0byBhbiBhamF4IHJlcXVlc3Q6XG4gKiAtIGZpbmRzIHRoZSByaWdodCBkYXRhVHlwZSAobWVkaWF0ZXMgYmV0d2VlbiBjb250ZW50LXR5cGUgYW5kIGV4cGVjdGVkIGRhdGFUeXBlKVxuICogLSByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHJlc3BvbnNlXG4gKi9cbmZ1bmN0aW9uIGFqYXhIYW5kbGVSZXNwb25zZXMoIHMsIGpxWEhSLCByZXNwb25zZXMgKSB7XG5cdHZhciBmaXJzdERhdGFUeXBlLCBjdCwgZmluYWxEYXRhVHlwZSwgdHlwZSxcblx0XHRjb250ZW50cyA9IHMuY29udGVudHMsXG5cdFx0ZGF0YVR5cGVzID0gcy5kYXRhVHlwZXM7XG5cblx0Ly8gUmVtb3ZlIGF1dG8gZGF0YVR5cGUgYW5kIGdldCBjb250ZW50LXR5cGUgaW4gdGhlIHByb2Nlc3Ncblx0d2hpbGUgKCBkYXRhVHlwZXNbIDAgXSA9PT0gXCIqXCIgKSB7XG5cdFx0ZGF0YVR5cGVzLnNoaWZ0KCk7XG5cdFx0aWYgKCBjdCA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0Y3QgPSBzLm1pbWVUeXBlIHx8IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGlmIHdlJ3JlIGRlYWxpbmcgd2l0aCBhIGtub3duIGNvbnRlbnQtdHlwZVxuXHRpZiAoIGN0ICkge1xuXHRcdGZvciAoIHR5cGUgaW4gY29udGVudHMgKSB7XG5cdFx0XHRpZiAoIGNvbnRlbnRzWyB0eXBlIF0gJiYgY29udGVudHNbIHR5cGUgXS50ZXN0KCBjdCApICkge1xuXHRcdFx0XHRkYXRhVHlwZXMudW5zaGlmdCggdHlwZSApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBDaGVjayB0byBzZWUgaWYgd2UgaGF2ZSBhIHJlc3BvbnNlIGZvciB0aGUgZXhwZWN0ZWQgZGF0YVR5cGVcblx0aWYgKCBkYXRhVHlwZXNbIDAgXSBpbiByZXNwb25zZXMgKSB7XG5cdFx0ZmluYWxEYXRhVHlwZSA9IGRhdGFUeXBlc1sgMCBdO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFRyeSBjb252ZXJ0aWJsZSBkYXRhVHlwZXNcblx0XHRmb3IgKCB0eXBlIGluIHJlc3BvbnNlcyApIHtcblx0XHRcdGlmICggIWRhdGFUeXBlc1sgMCBdIHx8IHMuY29udmVydGVyc1sgdHlwZSArIFwiIFwiICsgZGF0YVR5cGVzWzBdIF0gKSB7XG5cdFx0XHRcdGZpbmFsRGF0YVR5cGUgPSB0eXBlO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmICggIWZpcnN0RGF0YVR5cGUgKSB7XG5cdFx0XHRcdGZpcnN0RGF0YVR5cGUgPSB0eXBlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBPciBqdXN0IHVzZSBmaXJzdCBvbmVcblx0XHRmaW5hbERhdGFUeXBlID0gZmluYWxEYXRhVHlwZSB8fCBmaXJzdERhdGFUeXBlO1xuXHR9XG5cblx0Ly8gSWYgd2UgZm91bmQgYSBkYXRhVHlwZVxuXHQvLyBXZSBhZGQgdGhlIGRhdGFUeXBlIHRvIHRoZSBsaXN0IGlmIG5lZWRlZFxuXHQvLyBhbmQgcmV0dXJuIHRoZSBjb3JyZXNwb25kaW5nIHJlc3BvbnNlXG5cdGlmICggZmluYWxEYXRhVHlwZSApIHtcblx0XHRpZiAoIGZpbmFsRGF0YVR5cGUgIT09IGRhdGFUeXBlc1sgMCBdICkge1xuXHRcdFx0ZGF0YVR5cGVzLnVuc2hpZnQoIGZpbmFsRGF0YVR5cGUgKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3BvbnNlc1sgZmluYWxEYXRhVHlwZSBdO1xuXHR9XG59XG5cbi8qIENoYWluIGNvbnZlcnNpb25zIGdpdmVuIHRoZSByZXF1ZXN0IGFuZCB0aGUgb3JpZ2luYWwgcmVzcG9uc2VcbiAqIEFsc28gc2V0cyB0aGUgcmVzcG9uc2VYWFggZmllbGRzIG9uIHRoZSBqcVhIUiBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBhamF4Q29udmVydCggcywgcmVzcG9uc2UsIGpxWEhSLCBpc1N1Y2Nlc3MgKSB7XG5cdHZhciBjb252MiwgY3VycmVudCwgY29udiwgdG1wLCBwcmV2LFxuXHRcdGNvbnZlcnRlcnMgPSB7fSxcblx0XHQvLyBXb3JrIHdpdGggYSBjb3B5IG9mIGRhdGFUeXBlcyBpbiBjYXNlIHdlIG5lZWQgdG8gbW9kaWZ5IGl0IGZvciBjb252ZXJzaW9uXG5cdFx0ZGF0YVR5cGVzID0gcy5kYXRhVHlwZXMuc2xpY2UoKTtcblxuXHQvLyBDcmVhdGUgY29udmVydGVycyBtYXAgd2l0aCBsb3dlcmNhc2VkIGtleXNcblx0aWYgKCBkYXRhVHlwZXNbIDEgXSApIHtcblx0XHRmb3IgKCBjb252IGluIHMuY29udmVydGVycyApIHtcblx0XHRcdGNvbnZlcnRlcnNbIGNvbnYudG9Mb3dlckNhc2UoKSBdID0gcy5jb252ZXJ0ZXJzWyBjb252IF07XG5cdFx0fVxuXHR9XG5cblx0Y3VycmVudCA9IGRhdGFUeXBlcy5zaGlmdCgpO1xuXG5cdC8vIENvbnZlcnQgdG8gZWFjaCBzZXF1ZW50aWFsIGRhdGFUeXBlXG5cdHdoaWxlICggY3VycmVudCApIHtcblxuXHRcdGlmICggcy5yZXNwb25zZUZpZWxkc1sgY3VycmVudCBdICkge1xuXHRcdFx0anFYSFJbIHMucmVzcG9uc2VGaWVsZHNbIGN1cnJlbnQgXSBdID0gcmVzcG9uc2U7XG5cdFx0fVxuXG5cdFx0Ly8gQXBwbHkgdGhlIGRhdGFGaWx0ZXIgaWYgcHJvdmlkZWRcblx0XHRpZiAoICFwcmV2ICYmIGlzU3VjY2VzcyAmJiBzLmRhdGFGaWx0ZXIgKSB7XG5cdFx0XHRyZXNwb25zZSA9IHMuZGF0YUZpbHRlciggcmVzcG9uc2UsIHMuZGF0YVR5cGUgKTtcblx0XHR9XG5cblx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRjdXJyZW50ID0gZGF0YVR5cGVzLnNoaWZ0KCk7XG5cblx0XHRpZiAoIGN1cnJlbnQgKSB7XG5cblx0XHRcdC8vIFRoZXJlJ3Mgb25seSB3b3JrIHRvIGRvIGlmIGN1cnJlbnQgZGF0YVR5cGUgaXMgbm9uLWF1dG9cblx0XHRcdGlmICggY3VycmVudCA9PT0gXCIqXCIgKSB7XG5cblx0XHRcdFx0Y3VycmVudCA9IHByZXY7XG5cblx0XHRcdC8vIENvbnZlcnQgcmVzcG9uc2UgaWYgcHJldiBkYXRhVHlwZSBpcyBub24tYXV0byBhbmQgZGlmZmVycyBmcm9tIGN1cnJlbnRcblx0XHRcdH0gZWxzZSBpZiAoIHByZXYgIT09IFwiKlwiICYmIHByZXYgIT09IGN1cnJlbnQgKSB7XG5cblx0XHRcdFx0Ly8gU2VlayBhIGRpcmVjdCBjb252ZXJ0ZXJcblx0XHRcdFx0Y29udiA9IGNvbnZlcnRlcnNbIHByZXYgKyBcIiBcIiArIGN1cnJlbnQgXSB8fCBjb252ZXJ0ZXJzWyBcIiogXCIgKyBjdXJyZW50IF07XG5cblx0XHRcdFx0Ly8gSWYgbm9uZSBmb3VuZCwgc2VlayBhIHBhaXJcblx0XHRcdFx0aWYgKCAhY29udiApIHtcblx0XHRcdFx0XHRmb3IgKCBjb252MiBpbiBjb252ZXJ0ZXJzICkge1xuXG5cdFx0XHRcdFx0XHQvLyBJZiBjb252MiBvdXRwdXRzIGN1cnJlbnRcblx0XHRcdFx0XHRcdHRtcCA9IGNvbnYyLnNwbGl0KCBcIiBcIiApO1xuXHRcdFx0XHRcdFx0aWYgKCB0bXBbIDEgXSA9PT0gY3VycmVudCApIHtcblxuXHRcdFx0XHRcdFx0XHQvLyBJZiBwcmV2IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYWNjZXB0ZWQgaW5wdXRcblx0XHRcdFx0XHRcdFx0Y29udiA9IGNvbnZlcnRlcnNbIHByZXYgKyBcIiBcIiArIHRtcFsgMCBdIF0gfHxcblx0XHRcdFx0XHRcdFx0XHRjb252ZXJ0ZXJzWyBcIiogXCIgKyB0bXBbIDAgXSBdO1xuXHRcdFx0XHRcdFx0XHRpZiAoIGNvbnYgKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gQ29uZGVuc2UgZXF1aXZhbGVuY2UgY29udmVydGVyc1xuXHRcdFx0XHRcdFx0XHRcdGlmICggY29udiA9PT0gdHJ1ZSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnYgPSBjb252ZXJ0ZXJzWyBjb252MiBdO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBpbnNlcnQgdGhlIGludGVybWVkaWF0ZSBkYXRhVHlwZVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGNvbnZlcnRlcnNbIGNvbnYyIF0gIT09IHRydWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjdXJyZW50ID0gdG1wWyAwIF07XG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhVHlwZXMudW5zaGlmdCggdG1wWyAxIF0gKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBBcHBseSBjb252ZXJ0ZXIgKGlmIG5vdCBhbiBlcXVpdmFsZW5jZSlcblx0XHRcdFx0aWYgKCBjb252ICE9PSB0cnVlICkge1xuXG5cdFx0XHRcdFx0Ly8gVW5sZXNzIGVycm9ycyBhcmUgYWxsb3dlZCB0byBidWJibGUsIGNhdGNoIGFuZCByZXR1cm4gdGhlbVxuXHRcdFx0XHRcdGlmICggY29udiAmJiBzWyBcInRocm93c1wiIF0gKSB7XG5cdFx0XHRcdFx0XHRyZXNwb25zZSA9IGNvbnYoIHJlc3BvbnNlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdHJlc3BvbnNlID0gY29udiggcmVzcG9uc2UgKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4geyBzdGF0ZTogXCJwYXJzZXJlcnJvclwiLCBlcnJvcjogY29udiA/IGUgOiBcIk5vIGNvbnZlcnNpb24gZnJvbSBcIiArIHByZXYgKyBcIiB0byBcIiArIGN1cnJlbnQgfTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4geyBzdGF0ZTogXCJzdWNjZXNzXCIsIGRhdGE6IHJlc3BvbnNlIH07XG59XG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdC8vIENvdW50ZXIgZm9yIGhvbGRpbmcgdGhlIG51bWJlciBvZiBhY3RpdmUgcXVlcmllc1xuXHRhY3RpdmU6IDAsXG5cblx0Ly8gTGFzdC1Nb2RpZmllZCBoZWFkZXIgY2FjaGUgZm9yIG5leHQgcmVxdWVzdFxuXHRsYXN0TW9kaWZpZWQ6IHt9LFxuXHRldGFnOiB7fSxcblxuXHRhamF4U2V0dGluZ3M6IHtcblx0XHR1cmw6IGFqYXhMb2NhdGlvbixcblx0XHR0eXBlOiBcIkdFVFwiLFxuXHRcdGlzTG9jYWw6IHJsb2NhbFByb3RvY29sLnRlc3QoIGFqYXhMb2NQYXJ0c1sgMSBdICksXG5cdFx0Z2xvYmFsOiB0cnVlLFxuXHRcdHByb2Nlc3NEYXRhOiB0cnVlLFxuXHRcdGFzeW5jOiB0cnVlLFxuXHRcdGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuXHRcdC8qXG5cdFx0dGltZW91dDogMCxcblx0XHRkYXRhOiBudWxsLFxuXHRcdGRhdGFUeXBlOiBudWxsLFxuXHRcdHVzZXJuYW1lOiBudWxsLFxuXHRcdHBhc3N3b3JkOiBudWxsLFxuXHRcdGNhY2hlOiBudWxsLFxuXHRcdHRocm93czogZmFsc2UsXG5cdFx0dHJhZGl0aW9uYWw6IGZhbHNlLFxuXHRcdGhlYWRlcnM6IHt9LFxuXHRcdCovXG5cblx0XHRhY2NlcHRzOiB7XG5cdFx0XHRcIipcIjogYWxsVHlwZXMsXG5cdFx0XHR0ZXh0OiBcInRleHQvcGxhaW5cIixcblx0XHRcdGh0bWw6IFwidGV4dC9odG1sXCIsXG5cdFx0XHR4bWw6IFwiYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbFwiLFxuXHRcdFx0anNvbjogXCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHRcIlxuXHRcdH0sXG5cblx0XHRjb250ZW50czoge1xuXHRcdFx0eG1sOiAveG1sLyxcblx0XHRcdGh0bWw6IC9odG1sLyxcblx0XHRcdGpzb246IC9qc29uL1xuXHRcdH0sXG5cblx0XHRyZXNwb25zZUZpZWxkczoge1xuXHRcdFx0eG1sOiBcInJlc3BvbnNlWE1MXCIsXG5cdFx0XHR0ZXh0OiBcInJlc3BvbnNlVGV4dFwiLFxuXHRcdFx0anNvbjogXCJyZXNwb25zZUpTT05cIlxuXHRcdH0sXG5cblx0XHQvLyBEYXRhIGNvbnZlcnRlcnNcblx0XHQvLyBLZXlzIHNlcGFyYXRlIHNvdXJjZSAob3IgY2F0Y2hhbGwgXCIqXCIpIGFuZCBkZXN0aW5hdGlvbiB0eXBlcyB3aXRoIGEgc2luZ2xlIHNwYWNlXG5cdFx0Y29udmVydGVyczoge1xuXG5cdFx0XHQvLyBDb252ZXJ0IGFueXRoaW5nIHRvIHRleHRcblx0XHRcdFwiKiB0ZXh0XCI6IFN0cmluZyxcblxuXHRcdFx0Ly8gVGV4dCB0byBodG1sICh0cnVlID0gbm8gdHJhbnNmb3JtYXRpb24pXG5cdFx0XHRcInRleHQgaHRtbFwiOiB0cnVlLFxuXG5cdFx0XHQvLyBFdmFsdWF0ZSB0ZXh0IGFzIGEganNvbiBleHByZXNzaW9uXG5cdFx0XHRcInRleHQganNvblwiOiBqUXVlcnkucGFyc2VKU09OLFxuXG5cdFx0XHQvLyBQYXJzZSB0ZXh0IGFzIHhtbFxuXHRcdFx0XCJ0ZXh0IHhtbFwiOiBqUXVlcnkucGFyc2VYTUxcblx0XHR9LFxuXG5cdFx0Ly8gRm9yIG9wdGlvbnMgdGhhdCBzaG91bGRuJ3QgYmUgZGVlcCBleHRlbmRlZDpcblx0XHQvLyB5b3UgY2FuIGFkZCB5b3VyIG93biBjdXN0b20gb3B0aW9ucyBoZXJlIGlmXG5cdFx0Ly8gYW5kIHdoZW4geW91IGNyZWF0ZSBvbmUgdGhhdCBzaG91bGRuJ3QgYmVcblx0XHQvLyBkZWVwIGV4dGVuZGVkIChzZWUgYWpheEV4dGVuZClcblx0XHRmbGF0T3B0aW9uczoge1xuXHRcdFx0dXJsOiB0cnVlLFxuXHRcdFx0Y29udGV4dDogdHJ1ZVxuXHRcdH1cblx0fSxcblxuXHQvLyBDcmVhdGVzIGEgZnVsbCBmbGVkZ2VkIHNldHRpbmdzIG9iamVjdCBpbnRvIHRhcmdldFxuXHQvLyB3aXRoIGJvdGggYWpheFNldHRpbmdzIGFuZCBzZXR0aW5ncyBmaWVsZHMuXG5cdC8vIElmIHRhcmdldCBpcyBvbWl0dGVkLCB3cml0ZXMgaW50byBhamF4U2V0dGluZ3MuXG5cdGFqYXhTZXR1cDogZnVuY3Rpb24oIHRhcmdldCwgc2V0dGluZ3MgKSB7XG5cdFx0cmV0dXJuIHNldHRpbmdzID9cblxuXHRcdFx0Ly8gQnVpbGRpbmcgYSBzZXR0aW5ncyBvYmplY3Rcblx0XHRcdGFqYXhFeHRlbmQoIGFqYXhFeHRlbmQoIHRhcmdldCwgalF1ZXJ5LmFqYXhTZXR0aW5ncyApLCBzZXR0aW5ncyApIDpcblxuXHRcdFx0Ly8gRXh0ZW5kaW5nIGFqYXhTZXR0aW5nc1xuXHRcdFx0YWpheEV4dGVuZCggalF1ZXJ5LmFqYXhTZXR0aW5ncywgdGFyZ2V0ICk7XG5cdH0sXG5cblx0YWpheFByZWZpbHRlcjogYWRkVG9QcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBwcmVmaWx0ZXJzICksXG5cdGFqYXhUcmFuc3BvcnQ6IGFkZFRvUHJlZmlsdGVyc09yVHJhbnNwb3J0cyggdHJhbnNwb3J0cyApLFxuXG5cdC8vIE1haW4gbWV0aG9kXG5cdGFqYXg6IGZ1bmN0aW9uKCB1cmwsIG9wdGlvbnMgKSB7XG5cblx0XHQvLyBJZiB1cmwgaXMgYW4gb2JqZWN0LCBzaW11bGF0ZSBwcmUtMS41IHNpZ25hdHVyZVxuXHRcdGlmICggdHlwZW9mIHVybCA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdG9wdGlvbnMgPSB1cmw7XG5cdFx0XHR1cmwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gRm9yY2Ugb3B0aW9ucyB0byBiZSBhbiBvYmplY3Rcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdHZhciAvLyBDcm9zcy1kb21haW4gZGV0ZWN0aW9uIHZhcnNcblx0XHRcdHBhcnRzLFxuXHRcdFx0Ly8gTG9vcCB2YXJpYWJsZVxuXHRcdFx0aSxcblx0XHRcdC8vIFVSTCB3aXRob3V0IGFudGktY2FjaGUgcGFyYW1cblx0XHRcdGNhY2hlVVJMLFxuXHRcdFx0Ly8gUmVzcG9uc2UgaGVhZGVycyBhcyBzdHJpbmdcblx0XHRcdHJlc3BvbnNlSGVhZGVyc1N0cmluZyxcblx0XHRcdC8vIHRpbWVvdXQgaGFuZGxlXG5cdFx0XHR0aW1lb3V0VGltZXIsXG5cblx0XHRcdC8vIFRvIGtub3cgaWYgZ2xvYmFsIGV2ZW50cyBhcmUgdG8gYmUgZGlzcGF0Y2hlZFxuXHRcdFx0ZmlyZUdsb2JhbHMsXG5cblx0XHRcdHRyYW5zcG9ydCxcblx0XHRcdC8vIFJlc3BvbnNlIGhlYWRlcnNcblx0XHRcdHJlc3BvbnNlSGVhZGVycyxcblx0XHRcdC8vIENyZWF0ZSB0aGUgZmluYWwgb3B0aW9ucyBvYmplY3Rcblx0XHRcdHMgPSBqUXVlcnkuYWpheFNldHVwKCB7fSwgb3B0aW9ucyApLFxuXHRcdFx0Ly8gQ2FsbGJhY2tzIGNvbnRleHRcblx0XHRcdGNhbGxiYWNrQ29udGV4dCA9IHMuY29udGV4dCB8fCBzLFxuXHRcdFx0Ly8gQ29udGV4dCBmb3IgZ2xvYmFsIGV2ZW50cyBpcyBjYWxsYmFja0NvbnRleHQgaWYgaXQgaXMgYSBET00gbm9kZSBvciBqUXVlcnkgY29sbGVjdGlvblxuXHRcdFx0Z2xvYmFsRXZlbnRDb250ZXh0ID0gcy5jb250ZXh0ICYmICggY2FsbGJhY2tDb250ZXh0Lm5vZGVUeXBlIHx8IGNhbGxiYWNrQ29udGV4dC5qcXVlcnkgKSA/XG5cdFx0XHRcdGpRdWVyeSggY2FsbGJhY2tDb250ZXh0ICkgOlxuXHRcdFx0XHRqUXVlcnkuZXZlbnQsXG5cdFx0XHQvLyBEZWZlcnJlZHNcblx0XHRcdGRlZmVycmVkID0galF1ZXJ5LkRlZmVycmVkKCksXG5cdFx0XHRjb21wbGV0ZURlZmVycmVkID0galF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLFxuXHRcdFx0Ly8gU3RhdHVzLWRlcGVuZGVudCBjYWxsYmFja3Ncblx0XHRcdHN0YXR1c0NvZGUgPSBzLnN0YXR1c0NvZGUgfHwge30sXG5cdFx0XHQvLyBIZWFkZXJzICh0aGV5IGFyZSBzZW50IGFsbCBhdCBvbmNlKVxuXHRcdFx0cmVxdWVzdEhlYWRlcnMgPSB7fSxcblx0XHRcdHJlcXVlc3RIZWFkZXJzTmFtZXMgPSB7fSxcblx0XHRcdC8vIFRoZSBqcVhIUiBzdGF0ZVxuXHRcdFx0c3RhdGUgPSAwLFxuXHRcdFx0Ly8gRGVmYXVsdCBhYm9ydCBtZXNzYWdlXG5cdFx0XHRzdHJBYm9ydCA9IFwiY2FuY2VsZWRcIixcblx0XHRcdC8vIEZha2UgeGhyXG5cdFx0XHRqcVhIUiA9IHtcblx0XHRcdFx0cmVhZHlTdGF0ZTogMCxcblxuXHRcdFx0XHQvLyBCdWlsZHMgaGVhZGVycyBoYXNodGFibGUgaWYgbmVlZGVkXG5cdFx0XHRcdGdldFJlc3BvbnNlSGVhZGVyOiBmdW5jdGlvbigga2V5ICkge1xuXHRcdFx0XHRcdHZhciBtYXRjaDtcblx0XHRcdFx0XHRpZiAoIHN0YXRlID09PSAyICkge1xuXHRcdFx0XHRcdFx0aWYgKCAhcmVzcG9uc2VIZWFkZXJzICkge1xuXHRcdFx0XHRcdFx0XHRyZXNwb25zZUhlYWRlcnMgPSB7fTtcblx0XHRcdFx0XHRcdFx0d2hpbGUgKCAobWF0Y2ggPSByaGVhZGVycy5leGVjKCByZXNwb25zZUhlYWRlcnNTdHJpbmcgKSkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2VIZWFkZXJzWyBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpIF0gPSBtYXRjaFsgMiBdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRtYXRjaCA9IHJlc3BvbnNlSGVhZGVyc1sga2V5LnRvTG93ZXJDYXNlKCkgXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoID09IG51bGwgPyBudWxsIDogbWF0Y2g7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gUmF3IHN0cmluZ1xuXHRcdFx0XHRnZXRBbGxSZXNwb25zZUhlYWRlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZSA9PT0gMiA/IHJlc3BvbnNlSGVhZGVyc1N0cmluZyA6IG51bGw7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gQ2FjaGVzIHRoZSBoZWFkZXJcblx0XHRcdFx0c2V0UmVxdWVzdEhlYWRlcjogZnVuY3Rpb24oIG5hbWUsIHZhbHVlICkge1xuXHRcdFx0XHRcdHZhciBsbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHRpZiAoICFzdGF0ZSApIHtcblx0XHRcdFx0XHRcdG5hbWUgPSByZXF1ZXN0SGVhZGVyc05hbWVzWyBsbmFtZSBdID0gcmVxdWVzdEhlYWRlcnNOYW1lc1sgbG5hbWUgXSB8fCBuYW1lO1xuXHRcdFx0XHRcdFx0cmVxdWVzdEhlYWRlcnNbIG5hbWUgXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvLyBPdmVycmlkZXMgcmVzcG9uc2UgY29udGVudC10eXBlIGhlYWRlclxuXHRcdFx0XHRvdmVycmlkZU1pbWVUeXBlOiBmdW5jdGlvbiggdHlwZSApIHtcblx0XHRcdFx0XHRpZiAoICFzdGF0ZSApIHtcblx0XHRcdFx0XHRcdHMubWltZVR5cGUgPSB0eXBlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvLyBTdGF0dXMtZGVwZW5kZW50IGNhbGxiYWNrc1xuXHRcdFx0XHRzdGF0dXNDb2RlOiBmdW5jdGlvbiggbWFwICkge1xuXHRcdFx0XHRcdHZhciBjb2RlO1xuXHRcdFx0XHRcdGlmICggbWFwICkge1xuXHRcdFx0XHRcdFx0aWYgKCBzdGF0ZSA8IDIgKSB7XG5cdFx0XHRcdFx0XHRcdGZvciAoIGNvZGUgaW4gbWFwICkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIExhenktYWRkIHRoZSBuZXcgY2FsbGJhY2sgaW4gYSB3YXkgdGhhdCBwcmVzZXJ2ZXMgb2xkIG9uZXNcblx0XHRcdFx0XHRcdFx0XHRzdGF0dXNDb2RlWyBjb2RlIF0gPSBbIHN0YXR1c0NvZGVbIGNvZGUgXSwgbWFwWyBjb2RlIF0gXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gRXhlY3V0ZSB0aGUgYXBwcm9wcmlhdGUgY2FsbGJhY2tzXG5cdFx0XHRcdFx0XHRcdGpxWEhSLmFsd2F5cyggbWFwWyBqcVhIUi5zdGF0dXMgXSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblxuXHRcdFx0XHQvLyBDYW5jZWwgdGhlIHJlcXVlc3Rcblx0XHRcdFx0YWJvcnQ6IGZ1bmN0aW9uKCBzdGF0dXNUZXh0ICkge1xuXHRcdFx0XHRcdHZhciBmaW5hbFRleHQgPSBzdGF0dXNUZXh0IHx8IHN0ckFib3J0O1xuXHRcdFx0XHRcdGlmICggdHJhbnNwb3J0ICkge1xuXHRcdFx0XHRcdFx0dHJhbnNwb3J0LmFib3J0KCBmaW5hbFRleHQgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZG9uZSggMCwgZmluYWxUZXh0ICk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHQvLyBBdHRhY2ggZGVmZXJyZWRzXG5cdFx0ZGVmZXJyZWQucHJvbWlzZSgganFYSFIgKS5jb21wbGV0ZSA9IGNvbXBsZXRlRGVmZXJyZWQuYWRkO1xuXHRcdGpxWEhSLnN1Y2Nlc3MgPSBqcVhIUi5kb25lO1xuXHRcdGpxWEhSLmVycm9yID0ganFYSFIuZmFpbDtcblxuXHRcdC8vIFJlbW92ZSBoYXNoIGNoYXJhY3RlciAoIzc1MzE6IGFuZCBzdHJpbmcgcHJvbW90aW9uKVxuXHRcdC8vIEFkZCBwcm90b2NvbCBpZiBub3QgcHJvdmlkZWQgKCM1ODY2OiBJRTcgaXNzdWUgd2l0aCBwcm90b2NvbC1sZXNzIHVybHMpXG5cdFx0Ly8gSGFuZGxlIGZhbHN5IHVybCBpbiB0aGUgc2V0dGluZ3Mgb2JqZWN0ICgjMTAwOTM6IGNvbnNpc3RlbmN5IHdpdGggb2xkIHNpZ25hdHVyZSlcblx0XHQvLyBXZSBhbHNvIHVzZSB0aGUgdXJsIHBhcmFtZXRlciBpZiBhdmFpbGFibGVcblx0XHRzLnVybCA9ICggKCB1cmwgfHwgcy51cmwgfHwgYWpheExvY2F0aW9uICkgKyBcIlwiICkucmVwbGFjZSggcmhhc2gsIFwiXCIgKS5yZXBsYWNlKCBycHJvdG9jb2wsIGFqYXhMb2NQYXJ0c1sgMSBdICsgXCIvL1wiICk7XG5cblx0XHQvLyBBbGlhcyBtZXRob2Qgb3B0aW9uIHRvIHR5cGUgYXMgcGVyIHRpY2tldCAjMTIwMDRcblx0XHRzLnR5cGUgPSBvcHRpb25zLm1ldGhvZCB8fCBvcHRpb25zLnR5cGUgfHwgcy5tZXRob2QgfHwgcy50eXBlO1xuXG5cdFx0Ly8gRXh0cmFjdCBkYXRhVHlwZXMgbGlzdFxuXHRcdHMuZGF0YVR5cGVzID0galF1ZXJ5LnRyaW0oIHMuZGF0YVR5cGUgfHwgXCIqXCIgKS50b0xvd2VyQ2FzZSgpLm1hdGNoKCBybm90d2hpdGUgKSB8fCBbIFwiXCIgXTtcblxuXHRcdC8vIEEgY3Jvc3MtZG9tYWluIHJlcXVlc3QgaXMgaW4gb3JkZXIgd2hlbiB3ZSBoYXZlIGEgcHJvdG9jb2w6aG9zdDpwb3J0IG1pc21hdGNoXG5cdFx0aWYgKCBzLmNyb3NzRG9tYWluID09IG51bGwgKSB7XG5cdFx0XHRwYXJ0cyA9IHJ1cmwuZXhlYyggcy51cmwudG9Mb3dlckNhc2UoKSApO1xuXHRcdFx0cy5jcm9zc0RvbWFpbiA9ICEhKCBwYXJ0cyAmJlxuXHRcdFx0XHQoIHBhcnRzWyAxIF0gIT09IGFqYXhMb2NQYXJ0c1sgMSBdIHx8IHBhcnRzWyAyIF0gIT09IGFqYXhMb2NQYXJ0c1sgMiBdIHx8XG5cdFx0XHRcdFx0KCBwYXJ0c1sgMyBdIHx8ICggcGFydHNbIDEgXSA9PT0gXCJodHRwOlwiID8gXCI4MFwiIDogXCI0NDNcIiApICkgIT09XG5cdFx0XHRcdFx0XHQoIGFqYXhMb2NQYXJ0c1sgMyBdIHx8ICggYWpheExvY1BhcnRzWyAxIF0gPT09IFwiaHR0cDpcIiA/IFwiODBcIiA6IFwiNDQzXCIgKSApIClcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ29udmVydCBkYXRhIGlmIG5vdCBhbHJlYWR5IGEgc3RyaW5nXG5cdFx0aWYgKCBzLmRhdGEgJiYgcy5wcm9jZXNzRGF0YSAmJiB0eXBlb2Ygcy5kYXRhICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0cy5kYXRhID0galF1ZXJ5LnBhcmFtKCBzLmRhdGEsIHMudHJhZGl0aW9uYWwgKTtcblx0XHR9XG5cblx0XHQvLyBBcHBseSBwcmVmaWx0ZXJzXG5cdFx0aW5zcGVjdFByZWZpbHRlcnNPclRyYW5zcG9ydHMoIHByZWZpbHRlcnMsIHMsIG9wdGlvbnMsIGpxWEhSICk7XG5cblx0XHQvLyBJZiByZXF1ZXN0IHdhcyBhYm9ydGVkIGluc2lkZSBhIHByZWZpbHRlciwgc3RvcCB0aGVyZVxuXHRcdGlmICggc3RhdGUgPT09IDIgKSB7XG5cdFx0XHRyZXR1cm4ganFYSFI7XG5cdFx0fVxuXG5cdFx0Ly8gV2UgY2FuIGZpcmUgZ2xvYmFsIGV2ZW50cyBhcyBvZiBub3cgaWYgYXNrZWQgdG9cblx0XHRmaXJlR2xvYmFscyA9IHMuZ2xvYmFsO1xuXG5cdFx0Ly8gV2F0Y2ggZm9yIGEgbmV3IHNldCBvZiByZXF1ZXN0c1xuXHRcdGlmICggZmlyZUdsb2JhbHMgJiYgalF1ZXJ5LmFjdGl2ZSsrID09PSAwICkge1xuXHRcdFx0alF1ZXJ5LmV2ZW50LnRyaWdnZXIoXCJhamF4U3RhcnRcIik7XG5cdFx0fVxuXG5cdFx0Ly8gVXBwZXJjYXNlIHRoZSB0eXBlXG5cdFx0cy50eXBlID0gcy50eXBlLnRvVXBwZXJDYXNlKCk7XG5cblx0XHQvLyBEZXRlcm1pbmUgaWYgcmVxdWVzdCBoYXMgY29udGVudFxuXHRcdHMuaGFzQ29udGVudCA9ICFybm9Db250ZW50LnRlc3QoIHMudHlwZSApO1xuXG5cdFx0Ly8gU2F2ZSB0aGUgVVJMIGluIGNhc2Ugd2UncmUgdG95aW5nIHdpdGggdGhlIElmLU1vZGlmaWVkLVNpbmNlXG5cdFx0Ly8gYW5kL29yIElmLU5vbmUtTWF0Y2ggaGVhZGVyIGxhdGVyIG9uXG5cdFx0Y2FjaGVVUkwgPSBzLnVybDtcblxuXHRcdC8vIE1vcmUgb3B0aW9ucyBoYW5kbGluZyBmb3IgcmVxdWVzdHMgd2l0aCBubyBjb250ZW50XG5cdFx0aWYgKCAhcy5oYXNDb250ZW50ICkge1xuXG5cdFx0XHQvLyBJZiBkYXRhIGlzIGF2YWlsYWJsZSwgYXBwZW5kIGRhdGEgdG8gdXJsXG5cdFx0XHRpZiAoIHMuZGF0YSApIHtcblx0XHRcdFx0Y2FjaGVVUkwgPSAoIHMudXJsICs9ICggcnF1ZXJ5LnRlc3QoIGNhY2hlVVJMICkgPyBcIiZcIiA6IFwiP1wiICkgKyBzLmRhdGEgKTtcblx0XHRcdFx0Ly8gIzk2ODI6IHJlbW92ZSBkYXRhIHNvIHRoYXQgaXQncyBub3QgdXNlZCBpbiBhbiBldmVudHVhbCByZXRyeVxuXHRcdFx0XHRkZWxldGUgcy5kYXRhO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgYW50aS1jYWNoZSBpbiB1cmwgaWYgbmVlZGVkXG5cdFx0XHRpZiAoIHMuY2FjaGUgPT09IGZhbHNlICkge1xuXHRcdFx0XHRzLnVybCA9IHJ0cy50ZXN0KCBjYWNoZVVSTCApID9cblxuXHRcdFx0XHRcdC8vIElmIHRoZXJlIGlzIGFscmVhZHkgYSAnXycgcGFyYW1ldGVyLCBzZXQgaXRzIHZhbHVlXG5cdFx0XHRcdFx0Y2FjaGVVUkwucmVwbGFjZSggcnRzLCBcIiQxXz1cIiArIG5vbmNlKysgKSA6XG5cblx0XHRcdFx0XHQvLyBPdGhlcndpc2UgYWRkIG9uZSB0byB0aGUgZW5kXG5cdFx0XHRcdFx0Y2FjaGVVUkwgKyAoIHJxdWVyeS50ZXN0KCBjYWNoZVVSTCApID8gXCImXCIgOiBcIj9cIiApICsgXCJfPVwiICsgbm9uY2UrKztcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIElmLU1vZGlmaWVkLVNpbmNlIGFuZC9vciBJZi1Ob25lLU1hdGNoIGhlYWRlciwgaWYgaW4gaWZNb2RpZmllZCBtb2RlLlxuXHRcdGlmICggcy5pZk1vZGlmaWVkICkge1xuXHRcdFx0aWYgKCBqUXVlcnkubGFzdE1vZGlmaWVkWyBjYWNoZVVSTCBdICkge1xuXHRcdFx0XHRqcVhIUi5zZXRSZXF1ZXN0SGVhZGVyKCBcIklmLU1vZGlmaWVkLVNpbmNlXCIsIGpRdWVyeS5sYXN0TW9kaWZpZWRbIGNhY2hlVVJMIF0gKTtcblx0XHRcdH1cblx0XHRcdGlmICggalF1ZXJ5LmV0YWdbIGNhY2hlVVJMIF0gKSB7XG5cdFx0XHRcdGpxWEhSLnNldFJlcXVlc3RIZWFkZXIoIFwiSWYtTm9uZS1NYXRjaFwiLCBqUXVlcnkuZXRhZ1sgY2FjaGVVUkwgXSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFNldCB0aGUgY29ycmVjdCBoZWFkZXIsIGlmIGRhdGEgaXMgYmVpbmcgc2VudFxuXHRcdGlmICggcy5kYXRhICYmIHMuaGFzQ29udGVudCAmJiBzLmNvbnRlbnRUeXBlICE9PSBmYWxzZSB8fCBvcHRpb25zLmNvbnRlbnRUeXBlICkge1xuXHRcdFx0anFYSFIuc2V0UmVxdWVzdEhlYWRlciggXCJDb250ZW50LVR5cGVcIiwgcy5jb250ZW50VHlwZSApO1xuXHRcdH1cblxuXHRcdC8vIFNldCB0aGUgQWNjZXB0cyBoZWFkZXIgZm9yIHRoZSBzZXJ2ZXIsIGRlcGVuZGluZyBvbiB0aGUgZGF0YVR5cGVcblx0XHRqcVhIUi5zZXRSZXF1ZXN0SGVhZGVyKFxuXHRcdFx0XCJBY2NlcHRcIixcblx0XHRcdHMuZGF0YVR5cGVzWyAwIF0gJiYgcy5hY2NlcHRzWyBzLmRhdGFUeXBlc1swXSBdID9cblx0XHRcdFx0cy5hY2NlcHRzWyBzLmRhdGFUeXBlc1swXSBdICsgKCBzLmRhdGFUeXBlc1sgMCBdICE9PSBcIipcIiA/IFwiLCBcIiArIGFsbFR5cGVzICsgXCI7IHE9MC4wMVwiIDogXCJcIiApIDpcblx0XHRcdFx0cy5hY2NlcHRzWyBcIipcIiBdXG5cdFx0KTtcblxuXHRcdC8vIENoZWNrIGZvciBoZWFkZXJzIG9wdGlvblxuXHRcdGZvciAoIGkgaW4gcy5oZWFkZXJzICkge1xuXHRcdFx0anFYSFIuc2V0UmVxdWVzdEhlYWRlciggaSwgcy5oZWFkZXJzWyBpIF0gKTtcblx0XHR9XG5cblx0XHQvLyBBbGxvdyBjdXN0b20gaGVhZGVycy9taW1ldHlwZXMgYW5kIGVhcmx5IGFib3J0XG5cdFx0aWYgKCBzLmJlZm9yZVNlbmQgJiYgKCBzLmJlZm9yZVNlbmQuY2FsbCggY2FsbGJhY2tDb250ZXh0LCBqcVhIUiwgcyApID09PSBmYWxzZSB8fCBzdGF0ZSA9PT0gMiApICkge1xuXHRcdFx0Ly8gQWJvcnQgaWYgbm90IGRvbmUgYWxyZWFkeSBhbmQgcmV0dXJuXG5cdFx0XHRyZXR1cm4ganFYSFIuYWJvcnQoKTtcblx0XHR9XG5cblx0XHQvLyBhYm9ydGluZyBpcyBubyBsb25nZXIgYSBjYW5jZWxsYXRpb25cblx0XHRzdHJBYm9ydCA9IFwiYWJvcnRcIjtcblxuXHRcdC8vIEluc3RhbGwgY2FsbGJhY2tzIG9uIGRlZmVycmVkc1xuXHRcdGZvciAoIGkgaW4geyBzdWNjZXNzOiAxLCBlcnJvcjogMSwgY29tcGxldGU6IDEgfSApIHtcblx0XHRcdGpxWEhSWyBpIF0oIHNbIGkgXSApO1xuXHRcdH1cblxuXHRcdC8vIEdldCB0cmFuc3BvcnRcblx0XHR0cmFuc3BvcnQgPSBpbnNwZWN0UHJlZmlsdGVyc09yVHJhbnNwb3J0cyggdHJhbnNwb3J0cywgcywgb3B0aW9ucywganFYSFIgKTtcblxuXHRcdC8vIElmIG5vIHRyYW5zcG9ydCwgd2UgYXV0by1hYm9ydFxuXHRcdGlmICggIXRyYW5zcG9ydCApIHtcblx0XHRcdGRvbmUoIC0xLCBcIk5vIFRyYW5zcG9ydFwiICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGpxWEhSLnJlYWR5U3RhdGUgPSAxO1xuXG5cdFx0XHQvLyBTZW5kIGdsb2JhbCBldmVudFxuXHRcdFx0aWYgKCBmaXJlR2xvYmFscyApIHtcblx0XHRcdFx0Z2xvYmFsRXZlbnRDb250ZXh0LnRyaWdnZXIoIFwiYWpheFNlbmRcIiwgWyBqcVhIUiwgcyBdICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBUaW1lb3V0XG5cdFx0XHRpZiAoIHMuYXN5bmMgJiYgcy50aW1lb3V0ID4gMCApIHtcblx0XHRcdFx0dGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRqcVhIUi5hYm9ydChcInRpbWVvdXRcIik7XG5cdFx0XHRcdH0sIHMudGltZW91dCApO1xuXHRcdFx0fVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzdGF0ZSA9IDE7XG5cdFx0XHRcdHRyYW5zcG9ydC5zZW5kKCByZXF1ZXN0SGVhZGVycywgZG9uZSApO1xuXHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdC8vIFByb3BhZ2F0ZSBleGNlcHRpb24gYXMgZXJyb3IgaWYgbm90IGRvbmVcblx0XHRcdFx0aWYgKCBzdGF0ZSA8IDIgKSB7XG5cdFx0XHRcdFx0ZG9uZSggLTEsIGUgKTtcblx0XHRcdFx0Ly8gU2ltcGx5IHJldGhyb3cgb3RoZXJ3aXNlXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhyb3cgZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENhbGxiYWNrIGZvciB3aGVuIGV2ZXJ5dGhpbmcgaXMgZG9uZVxuXHRcdGZ1bmN0aW9uIGRvbmUoIHN0YXR1cywgbmF0aXZlU3RhdHVzVGV4dCwgcmVzcG9uc2VzLCBoZWFkZXJzICkge1xuXHRcdFx0dmFyIGlzU3VjY2Vzcywgc3VjY2VzcywgZXJyb3IsIHJlc3BvbnNlLCBtb2RpZmllZCxcblx0XHRcdFx0c3RhdHVzVGV4dCA9IG5hdGl2ZVN0YXR1c1RleHQ7XG5cblx0XHRcdC8vIENhbGxlZCBvbmNlXG5cdFx0XHRpZiAoIHN0YXRlID09PSAyICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0YXRlIGlzIFwiZG9uZVwiIG5vd1xuXHRcdFx0c3RhdGUgPSAyO1xuXG5cdFx0XHQvLyBDbGVhciB0aW1lb3V0IGlmIGl0IGV4aXN0c1xuXHRcdFx0aWYgKCB0aW1lb3V0VGltZXIgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dFRpbWVyICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIERlcmVmZXJlbmNlIHRyYW5zcG9ydCBmb3IgZWFybHkgZ2FyYmFnZSBjb2xsZWN0aW9uXG5cdFx0XHQvLyAobm8gbWF0dGVyIGhvdyBsb25nIHRoZSBqcVhIUiBvYmplY3Qgd2lsbCBiZSB1c2VkKVxuXHRcdFx0dHJhbnNwb3J0ID0gdW5kZWZpbmVkO1xuXG5cdFx0XHQvLyBDYWNoZSByZXNwb25zZSBoZWFkZXJzXG5cdFx0XHRyZXNwb25zZUhlYWRlcnNTdHJpbmcgPSBoZWFkZXJzIHx8IFwiXCI7XG5cblx0XHRcdC8vIFNldCByZWFkeVN0YXRlXG5cdFx0XHRqcVhIUi5yZWFkeVN0YXRlID0gc3RhdHVzID4gMCA/IDQgOiAwO1xuXG5cdFx0XHQvLyBEZXRlcm1pbmUgaWYgc3VjY2Vzc2Z1bFxuXHRcdFx0aXNTdWNjZXNzID0gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDAgfHwgc3RhdHVzID09PSAzMDQ7XG5cblx0XHRcdC8vIEdldCByZXNwb25zZSBkYXRhXG5cdFx0XHRpZiAoIHJlc3BvbnNlcyApIHtcblx0XHRcdFx0cmVzcG9uc2UgPSBhamF4SGFuZGxlUmVzcG9uc2VzKCBzLCBqcVhIUiwgcmVzcG9uc2VzICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbnZlcnQgbm8gbWF0dGVyIHdoYXQgKHRoYXQgd2F5IHJlc3BvbnNlWFhYIGZpZWxkcyBhcmUgYWx3YXlzIHNldClcblx0XHRcdHJlc3BvbnNlID0gYWpheENvbnZlcnQoIHMsIHJlc3BvbnNlLCBqcVhIUiwgaXNTdWNjZXNzICk7XG5cblx0XHRcdC8vIElmIHN1Y2Nlc3NmdWwsIGhhbmRsZSB0eXBlIGNoYWluaW5nXG5cdFx0XHRpZiAoIGlzU3VjY2VzcyApIHtcblxuXHRcdFx0XHQvLyBTZXQgdGhlIElmLU1vZGlmaWVkLVNpbmNlIGFuZC9vciBJZi1Ob25lLU1hdGNoIGhlYWRlciwgaWYgaW4gaWZNb2RpZmllZCBtb2RlLlxuXHRcdFx0XHRpZiAoIHMuaWZNb2RpZmllZCApIHtcblx0XHRcdFx0XHRtb2RpZmllZCA9IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKFwiTGFzdC1Nb2RpZmllZFwiKTtcblx0XHRcdFx0XHRpZiAoIG1vZGlmaWVkICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5Lmxhc3RNb2RpZmllZFsgY2FjaGVVUkwgXSA9IG1vZGlmaWVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtb2RpZmllZCA9IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKFwiZXRhZ1wiKTtcblx0XHRcdFx0XHRpZiAoIG1vZGlmaWVkICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmV0YWdbIGNhY2hlVVJMIF0gPSBtb2RpZmllZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBpZiBubyBjb250ZW50XG5cdFx0XHRcdGlmICggc3RhdHVzID09PSAyMDQgfHwgcy50eXBlID09PSBcIkhFQURcIiApIHtcblx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gXCJub2NvbnRlbnRcIjtcblxuXHRcdFx0XHQvLyBpZiBub3QgbW9kaWZpZWRcblx0XHRcdFx0fSBlbHNlIGlmICggc3RhdHVzID09PSAzMDQgKSB7XG5cdFx0XHRcdFx0c3RhdHVzVGV4dCA9IFwibm90bW9kaWZpZWRcIjtcblxuXHRcdFx0XHQvLyBJZiB3ZSBoYXZlIGRhdGEsIGxldCdzIGNvbnZlcnQgaXRcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gcmVzcG9uc2Uuc3RhdGU7XG5cdFx0XHRcdFx0c3VjY2VzcyA9IHJlc3BvbnNlLmRhdGE7XG5cdFx0XHRcdFx0ZXJyb3IgPSByZXNwb25zZS5lcnJvcjtcblx0XHRcdFx0XHRpc1N1Y2Nlc3MgPSAhZXJyb3I7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFdlIGV4dHJhY3QgZXJyb3IgZnJvbSBzdGF0dXNUZXh0XG5cdFx0XHRcdC8vIHRoZW4gbm9ybWFsaXplIHN0YXR1c1RleHQgYW5kIHN0YXR1cyBmb3Igbm9uLWFib3J0c1xuXHRcdFx0XHRlcnJvciA9IHN0YXR1c1RleHQ7XG5cdFx0XHRcdGlmICggc3RhdHVzIHx8ICFzdGF0dXNUZXh0ICkge1xuXHRcdFx0XHRcdHN0YXR1c1RleHQgPSBcImVycm9yXCI7XG5cdFx0XHRcdFx0aWYgKCBzdGF0dXMgPCAwICkge1xuXHRcdFx0XHRcdFx0c3RhdHVzID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IGRhdGEgZm9yIHRoZSBmYWtlIHhociBvYmplY3Rcblx0XHRcdGpxWEhSLnN0YXR1cyA9IHN0YXR1cztcblx0XHRcdGpxWEhSLnN0YXR1c1RleHQgPSAoIG5hdGl2ZVN0YXR1c1RleHQgfHwgc3RhdHVzVGV4dCApICsgXCJcIjtcblxuXHRcdFx0Ly8gU3VjY2Vzcy9FcnJvclxuXHRcdFx0aWYgKCBpc1N1Y2Nlc3MgKSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBjYWxsYmFja0NvbnRleHQsIFsgc3VjY2Vzcywgc3RhdHVzVGV4dCwganFYSFIgXSApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0V2l0aCggY2FsbGJhY2tDb250ZXh0LCBbIGpxWEhSLCBzdGF0dXNUZXh0LCBlcnJvciBdICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0YXR1cy1kZXBlbmRlbnQgY2FsbGJhY2tzXG5cdFx0XHRqcVhIUi5zdGF0dXNDb2RlKCBzdGF0dXNDb2RlICk7XG5cdFx0XHRzdGF0dXNDb2RlID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoIGZpcmVHbG9iYWxzICkge1xuXHRcdFx0XHRnbG9iYWxFdmVudENvbnRleHQudHJpZ2dlciggaXNTdWNjZXNzID8gXCJhamF4U3VjY2Vzc1wiIDogXCJhamF4RXJyb3JcIixcblx0XHRcdFx0XHRbIGpxWEhSLCBzLCBpc1N1Y2Nlc3MgPyBzdWNjZXNzIDogZXJyb3IgXSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDb21wbGV0ZVxuXHRcdFx0Y29tcGxldGVEZWZlcnJlZC5maXJlV2l0aCggY2FsbGJhY2tDb250ZXh0LCBbIGpxWEhSLCBzdGF0dXNUZXh0IF0gKTtcblxuXHRcdFx0aWYgKCBmaXJlR2xvYmFscyApIHtcblx0XHRcdFx0Z2xvYmFsRXZlbnRDb250ZXh0LnRyaWdnZXIoIFwiYWpheENvbXBsZXRlXCIsIFsganFYSFIsIHMgXSApO1xuXHRcdFx0XHQvLyBIYW5kbGUgdGhlIGdsb2JhbCBBSkFYIGNvdW50ZXJcblx0XHRcdFx0aWYgKCAhKCAtLWpRdWVyeS5hY3RpdmUgKSApIHtcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQudHJpZ2dlcihcImFqYXhTdG9wXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGpxWEhSO1xuXHR9LFxuXG5cdGdldEpTT046IGZ1bmN0aW9uKCB1cmwsIGRhdGEsIGNhbGxiYWNrICkge1xuXHRcdHJldHVybiBqUXVlcnkuZ2V0KCB1cmwsIGRhdGEsIGNhbGxiYWNrLCBcImpzb25cIiApO1xuXHR9LFxuXG5cdGdldFNjcmlwdDogZnVuY3Rpb24oIHVybCwgY2FsbGJhY2sgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5nZXQoIHVybCwgdW5kZWZpbmVkLCBjYWxsYmFjaywgXCJzY3JpcHRcIiApO1xuXHR9XG59KTtcblxualF1ZXJ5LmVhY2goIFsgXCJnZXRcIiwgXCJwb3N0XCIgXSwgZnVuY3Rpb24oIGksIG1ldGhvZCApIHtcblx0alF1ZXJ5WyBtZXRob2QgXSA9IGZ1bmN0aW9uKCB1cmwsIGRhdGEsIGNhbGxiYWNrLCB0eXBlICkge1xuXHRcdC8vIHNoaWZ0IGFyZ3VtZW50cyBpZiBkYXRhIGFyZ3VtZW50IHdhcyBvbWl0dGVkXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggZGF0YSApICkge1xuXHRcdFx0dHlwZSA9IHR5cGUgfHwgY2FsbGJhY2s7XG5cdFx0XHRjYWxsYmFjayA9IGRhdGE7XG5cdFx0XHRkYXRhID0gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJldHVybiBqUXVlcnkuYWpheCh7XG5cdFx0XHR1cmw6IHVybCxcblx0XHRcdHR5cGU6IG1ldGhvZCxcblx0XHRcdGRhdGFUeXBlOiB0eXBlLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3M6IGNhbGxiYWNrXG5cdFx0fSk7XG5cdH07XG59KTtcblxuLy8gQXR0YWNoIGEgYnVuY2ggb2YgZnVuY3Rpb25zIGZvciBoYW5kbGluZyBjb21tb24gQUpBWCBldmVudHNcbmpRdWVyeS5lYWNoKCBbIFwiYWpheFN0YXJ0XCIsIFwiYWpheFN0b3BcIiwgXCJhamF4Q29tcGxldGVcIiwgXCJhamF4RXJyb3JcIiwgXCJhamF4U3VjY2Vzc1wiLCBcImFqYXhTZW5kXCIgXSwgZnVuY3Rpb24oIGksIHR5cGUgKSB7XG5cdGpRdWVyeS5mblsgdHlwZSBdID0gZnVuY3Rpb24oIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlLCBmbiApO1xuXHR9O1xufSk7XG5cblxualF1ZXJ5Ll9ldmFsVXJsID0gZnVuY3Rpb24oIHVybCApIHtcblx0cmV0dXJuIGpRdWVyeS5hamF4KHtcblx0XHR1cmw6IHVybCxcblx0XHR0eXBlOiBcIkdFVFwiLFxuXHRcdGRhdGFUeXBlOiBcInNjcmlwdFwiLFxuXHRcdGFzeW5jOiBmYWxzZSxcblx0XHRnbG9iYWw6IGZhbHNlLFxuXHRcdFwidGhyb3dzXCI6IHRydWVcblx0fSk7XG59O1xuXG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHR3cmFwQWxsOiBmdW5jdGlvbiggaHRtbCApIHtcblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBodG1sICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGkpIHtcblx0XHRcdFx0alF1ZXJ5KHRoaXMpLndyYXBBbGwoIGh0bWwuY2FsbCh0aGlzLCBpKSApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzWzBdICkge1xuXHRcdFx0Ly8gVGhlIGVsZW1lbnRzIHRvIHdyYXAgdGhlIHRhcmdldCBhcm91bmRcblx0XHRcdHZhciB3cmFwID0galF1ZXJ5KCBodG1sLCB0aGlzWzBdLm93bmVyRG9jdW1lbnQgKS5lcSgwKS5jbG9uZSh0cnVlKTtcblxuXHRcdFx0aWYgKCB0aGlzWzBdLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdHdyYXAuaW5zZXJ0QmVmb3JlKCB0aGlzWzBdICk7XG5cdFx0XHR9XG5cblx0XHRcdHdyYXAubWFwKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZWxlbSA9IHRoaXM7XG5cblx0XHRcdFx0d2hpbGUgKCBlbGVtLmZpcnN0Q2hpbGQgJiYgZWxlbS5maXJzdENoaWxkLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdGVsZW0gPSBlbGVtLmZpcnN0Q2hpbGQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZWxlbTtcblx0XHRcdH0pLmFwcGVuZCggdGhpcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHdyYXBJbm5lcjogZnVuY3Rpb24oIGh0bWwgKSB7XG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggaHRtbCApICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbihpKSB7XG5cdFx0XHRcdGpRdWVyeSh0aGlzKS53cmFwSW5uZXIoIGh0bWwuY2FsbCh0aGlzLCBpKSApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0galF1ZXJ5KCB0aGlzICksXG5cdFx0XHRcdGNvbnRlbnRzID0gc2VsZi5jb250ZW50cygpO1xuXG5cdFx0XHRpZiAoIGNvbnRlbnRzLmxlbmd0aCApIHtcblx0XHRcdFx0Y29udGVudHMud3JhcEFsbCggaHRtbCApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLmFwcGVuZCggaHRtbCApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdHdyYXA6IGZ1bmN0aW9uKCBodG1sICkge1xuXHRcdHZhciBpc0Z1bmN0aW9uID0galF1ZXJ5LmlzRnVuY3Rpb24oIGh0bWwgKTtcblxuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oaSkge1xuXHRcdFx0alF1ZXJ5KCB0aGlzICkud3JhcEFsbCggaXNGdW5jdGlvbiA/IGh0bWwuY2FsbCh0aGlzLCBpKSA6IGh0bWwgKTtcblx0XHR9KTtcblx0fSxcblxuXHR1bndyYXA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLnBhcmVudCgpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICFqUXVlcnkubm9kZU5hbWUoIHRoaXMsIFwiYm9keVwiICkgKSB7XG5cdFx0XHRcdGpRdWVyeSggdGhpcyApLnJlcGxhY2VXaXRoKCB0aGlzLmNoaWxkTm9kZXMgKTtcblx0XHRcdH1cblx0XHR9KS5lbmQoKTtcblx0fVxufSk7XG5cblxualF1ZXJ5LmV4cHIuZmlsdGVycy5oaWRkZW4gPSBmdW5jdGlvbiggZWxlbSApIHtcblx0Ly8gU3VwcG9ydDogT3BlcmEgPD0gMTIuMTJcblx0Ly8gT3BlcmEgcmVwb3J0cyBvZmZzZXRXaWR0aHMgYW5kIG9mZnNldEhlaWdodHMgbGVzcyB0aGFuIHplcm8gb24gc29tZSBlbGVtZW50c1xuXHRyZXR1cm4gZWxlbS5vZmZzZXRXaWR0aCA8PSAwICYmIGVsZW0ub2Zmc2V0SGVpZ2h0IDw9IDAgfHxcblx0XHQoIXN1cHBvcnQucmVsaWFibGVIaWRkZW5PZmZzZXRzKCkgJiZcblx0XHRcdCgoZWxlbS5zdHlsZSAmJiBlbGVtLnN0eWxlLmRpc3BsYXkpIHx8IGpRdWVyeS5jc3MoIGVsZW0sIFwiZGlzcGxheVwiICkpID09PSBcIm5vbmVcIik7XG59O1xuXG5qUXVlcnkuZXhwci5maWx0ZXJzLnZpc2libGUgPSBmdW5jdGlvbiggZWxlbSApIHtcblx0cmV0dXJuICFqUXVlcnkuZXhwci5maWx0ZXJzLmhpZGRlbiggZWxlbSApO1xufTtcblxuXG5cblxudmFyIHIyMCA9IC8lMjAvZyxcblx0cmJyYWNrZXQgPSAvXFxbXFxdJC8sXG5cdHJDUkxGID0gL1xccj9cXG4vZyxcblx0cnN1Ym1pdHRlclR5cGVzID0gL14oPzpzdWJtaXR8YnV0dG9ufGltYWdlfHJlc2V0fGZpbGUpJC9pLFxuXHRyc3VibWl0dGFibGUgPSAvXig/OmlucHV0fHNlbGVjdHx0ZXh0YXJlYXxrZXlnZW4pL2k7XG5cbmZ1bmN0aW9uIGJ1aWxkUGFyYW1zKCBwcmVmaXgsIG9iaiwgdHJhZGl0aW9uYWwsIGFkZCApIHtcblx0dmFyIG5hbWU7XG5cblx0aWYgKCBqUXVlcnkuaXNBcnJheSggb2JqICkgKSB7XG5cdFx0Ly8gU2VyaWFsaXplIGFycmF5IGl0ZW0uXG5cdFx0alF1ZXJ5LmVhY2goIG9iaiwgZnVuY3Rpb24oIGksIHYgKSB7XG5cdFx0XHRpZiAoIHRyYWRpdGlvbmFsIHx8IHJicmFja2V0LnRlc3QoIHByZWZpeCApICkge1xuXHRcdFx0XHQvLyBUcmVhdCBlYWNoIGFycmF5IGl0ZW0gYXMgYSBzY2FsYXIuXG5cdFx0XHRcdGFkZCggcHJlZml4LCB2ICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEl0ZW0gaXMgbm9uLXNjYWxhciAoYXJyYXkgb3Igb2JqZWN0KSwgZW5jb2RlIGl0cyBudW1lcmljIGluZGV4LlxuXHRcdFx0XHRidWlsZFBhcmFtcyggcHJlZml4ICsgXCJbXCIgKyAoIHR5cGVvZiB2ID09PSBcIm9iamVjdFwiID8gaSA6IFwiXCIgKSArIFwiXVwiLCB2LCB0cmFkaXRpb25hbCwgYWRkICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0fSBlbHNlIGlmICggIXRyYWRpdGlvbmFsICYmIGpRdWVyeS50eXBlKCBvYmogKSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHQvLyBTZXJpYWxpemUgb2JqZWN0IGl0ZW0uXG5cdFx0Zm9yICggbmFtZSBpbiBvYmogKSB7XG5cdFx0XHRidWlsZFBhcmFtcyggcHJlZml4ICsgXCJbXCIgKyBuYW1lICsgXCJdXCIsIG9ialsgbmFtZSBdLCB0cmFkaXRpb25hbCwgYWRkICk7XG5cdFx0fVxuXG5cdH0gZWxzZSB7XG5cdFx0Ly8gU2VyaWFsaXplIHNjYWxhciBpdGVtLlxuXHRcdGFkZCggcHJlZml4LCBvYmogKTtcblx0fVxufVxuXG4vLyBTZXJpYWxpemUgYW4gYXJyYXkgb2YgZm9ybSBlbGVtZW50cyBvciBhIHNldCBvZlxuLy8ga2V5L3ZhbHVlcyBpbnRvIGEgcXVlcnkgc3RyaW5nXG5qUXVlcnkucGFyYW0gPSBmdW5jdGlvbiggYSwgdHJhZGl0aW9uYWwgKSB7XG5cdHZhciBwcmVmaXgsXG5cdFx0cyA9IFtdLFxuXHRcdGFkZCA9IGZ1bmN0aW9uKCBrZXksIHZhbHVlICkge1xuXHRcdFx0Ly8gSWYgdmFsdWUgaXMgYSBmdW5jdGlvbiwgaW52b2tlIGl0IGFuZCByZXR1cm4gaXRzIHZhbHVlXG5cdFx0XHR2YWx1ZSA9IGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApID8gdmFsdWUoKSA6ICggdmFsdWUgPT0gbnVsbCA/IFwiXCIgOiB2YWx1ZSApO1xuXHRcdFx0c1sgcy5sZW5ndGggXSA9IGVuY29kZVVSSUNvbXBvbmVudCgga2V5ICkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCggdmFsdWUgKTtcblx0XHR9O1xuXG5cdC8vIFNldCB0cmFkaXRpb25hbCB0byB0cnVlIGZvciBqUXVlcnkgPD0gMS4zLjIgYmVoYXZpb3IuXG5cdGlmICggdHJhZGl0aW9uYWwgPT09IHVuZGVmaW5lZCApIHtcblx0XHR0cmFkaXRpb25hbCA9IGpRdWVyeS5hamF4U2V0dGluZ3MgJiYgalF1ZXJ5LmFqYXhTZXR0aW5ncy50cmFkaXRpb25hbDtcblx0fVxuXG5cdC8vIElmIGFuIGFycmF5IHdhcyBwYXNzZWQgaW4sIGFzc3VtZSB0aGF0IGl0IGlzIGFuIGFycmF5IG9mIGZvcm0gZWxlbWVudHMuXG5cdGlmICggalF1ZXJ5LmlzQXJyYXkoIGEgKSB8fCAoIGEuanF1ZXJ5ICYmICFqUXVlcnkuaXNQbGFpbk9iamVjdCggYSApICkgKSB7XG5cdFx0Ly8gU2VyaWFsaXplIHRoZSBmb3JtIGVsZW1lbnRzXG5cdFx0alF1ZXJ5LmVhY2goIGEsIGZ1bmN0aW9uKCkge1xuXHRcdFx0YWRkKCB0aGlzLm5hbWUsIHRoaXMudmFsdWUgKTtcblx0XHR9KTtcblxuXHR9IGVsc2Uge1xuXHRcdC8vIElmIHRyYWRpdGlvbmFsLCBlbmNvZGUgdGhlIFwib2xkXCIgd2F5ICh0aGUgd2F5IDEuMy4yIG9yIG9sZGVyXG5cdFx0Ly8gZGlkIGl0KSwgb3RoZXJ3aXNlIGVuY29kZSBwYXJhbXMgcmVjdXJzaXZlbHkuXG5cdFx0Zm9yICggcHJlZml4IGluIGEgKSB7XG5cdFx0XHRidWlsZFBhcmFtcyggcHJlZml4LCBhWyBwcmVmaXggXSwgdHJhZGl0aW9uYWwsIGFkZCApO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgcmVzdWx0aW5nIHNlcmlhbGl6YXRpb25cblx0cmV0dXJuIHMuam9pbiggXCImXCIgKS5yZXBsYWNlKCByMjAsIFwiK1wiICk7XG59O1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0c2VyaWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4galF1ZXJ5LnBhcmFtKCB0aGlzLnNlcmlhbGl6ZUFycmF5KCkgKTtcblx0fSxcblx0c2VyaWFsaXplQXJyYXk6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLm1hcChmdW5jdGlvbigpIHtcblx0XHRcdC8vIENhbiBhZGQgcHJvcEhvb2sgZm9yIFwiZWxlbWVudHNcIiB0byBmaWx0ZXIgb3IgYWRkIGZvcm0gZWxlbWVudHNcblx0XHRcdHZhciBlbGVtZW50cyA9IGpRdWVyeS5wcm9wKCB0aGlzLCBcImVsZW1lbnRzXCIgKTtcblx0XHRcdHJldHVybiBlbGVtZW50cyA/IGpRdWVyeS5tYWtlQXJyYXkoIGVsZW1lbnRzICkgOiB0aGlzO1xuXHRcdH0pXG5cdFx0LmZpbHRlcihmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0eXBlID0gdGhpcy50eXBlO1xuXHRcdFx0Ly8gVXNlIC5pcyhcIjpkaXNhYmxlZFwiKSBzbyB0aGF0IGZpZWxkc2V0W2Rpc2FibGVkXSB3b3Jrc1xuXHRcdFx0cmV0dXJuIHRoaXMubmFtZSAmJiAhalF1ZXJ5KCB0aGlzICkuaXMoIFwiOmRpc2FibGVkXCIgKSAmJlxuXHRcdFx0XHRyc3VibWl0dGFibGUudGVzdCggdGhpcy5ub2RlTmFtZSApICYmICFyc3VibWl0dGVyVHlwZXMudGVzdCggdHlwZSApICYmXG5cdFx0XHRcdCggdGhpcy5jaGVja2VkIHx8ICFyY2hlY2thYmxlVHlwZS50ZXN0KCB0eXBlICkgKTtcblx0XHR9KVxuXHRcdC5tYXAoZnVuY3Rpb24oIGksIGVsZW0gKSB7XG5cdFx0XHR2YXIgdmFsID0galF1ZXJ5KCB0aGlzICkudmFsKCk7XG5cblx0XHRcdHJldHVybiB2YWwgPT0gbnVsbCA/XG5cdFx0XHRcdG51bGwgOlxuXHRcdFx0XHRqUXVlcnkuaXNBcnJheSggdmFsICkgP1xuXHRcdFx0XHRcdGpRdWVyeS5tYXAoIHZhbCwgZnVuY3Rpb24oIHZhbCApIHtcblx0XHRcdFx0XHRcdHJldHVybiB7IG5hbWU6IGVsZW0ubmFtZSwgdmFsdWU6IHZhbC5yZXBsYWNlKCByQ1JMRiwgXCJcXHJcXG5cIiApIH07XG5cdFx0XHRcdFx0fSkgOlxuXHRcdFx0XHRcdHsgbmFtZTogZWxlbS5uYW1lLCB2YWx1ZTogdmFsLnJlcGxhY2UoIHJDUkxGLCBcIlxcclxcblwiICkgfTtcblx0XHR9KS5nZXQoKTtcblx0fVxufSk7XG5cblxuLy8gQ3JlYXRlIHRoZSByZXF1ZXN0IG9iamVjdFxuLy8gKFRoaXMgaXMgc3RpbGwgYXR0YWNoZWQgdG8gYWpheFNldHRpbmdzIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxualF1ZXJ5LmFqYXhTZXR0aW5ncy54aHIgPSB3aW5kb3cuQWN0aXZlWE9iamVjdCAhPT0gdW5kZWZpbmVkID9cblx0Ly8gU3VwcG9ydDogSUU2K1xuXHRmdW5jdGlvbigpIHtcblxuXHRcdC8vIFhIUiBjYW5ub3QgYWNjZXNzIGxvY2FsIGZpbGVzLCBhbHdheXMgdXNlIEFjdGl2ZVggZm9yIHRoYXQgY2FzZVxuXHRcdHJldHVybiAhdGhpcy5pc0xvY2FsICYmXG5cblx0XHRcdC8vIFN1cHBvcnQ6IElFNy04XG5cdFx0XHQvLyBvbGRJRSBYSFIgZG9lcyBub3Qgc3VwcG9ydCBub24tUkZDMjYxNiBtZXRob2RzICgjMTMyNDApXG5cdFx0XHQvLyBTZWUgaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL21zNTM2NjQ4KHY9dnMuODUpLmFzcHhcblx0XHRcdC8vIGFuZCBodHRwOi8vd3d3LnczLm9yZy9Qcm90b2NvbHMvcmZjMjYxNi9yZmMyNjE2LXNlYzkuaHRtbCNzZWM5XG5cdFx0XHQvLyBBbHRob3VnaCB0aGlzIGNoZWNrIGZvciBzaXggbWV0aG9kcyBpbnN0ZWFkIG9mIGVpZ2h0XG5cdFx0XHQvLyBzaW5jZSBJRSBhbHNvIGRvZXMgbm90IHN1cHBvcnQgXCJ0cmFjZVwiIGFuZCBcImNvbm5lY3RcIlxuXHRcdFx0L14oZ2V0fHBvc3R8aGVhZHxwdXR8ZGVsZXRlfG9wdGlvbnMpJC9pLnRlc3QoIHRoaXMudHlwZSApICYmXG5cblx0XHRcdGNyZWF0ZVN0YW5kYXJkWEhSKCkgfHwgY3JlYXRlQWN0aXZlWEhSKCk7XG5cdH0gOlxuXHQvLyBGb3IgYWxsIG90aGVyIGJyb3dzZXJzLCB1c2UgdGhlIHN0YW5kYXJkIFhNTEh0dHBSZXF1ZXN0IG9iamVjdFxuXHRjcmVhdGVTdGFuZGFyZFhIUjtcblxudmFyIHhocklkID0gMCxcblx0eGhyQ2FsbGJhY2tzID0ge30sXG5cdHhoclN1cHBvcnRlZCA9IGpRdWVyeS5hamF4U2V0dGluZ3MueGhyKCk7XG5cbi8vIFN1cHBvcnQ6IElFPDEwXG4vLyBPcGVuIHJlcXVlc3RzIG11c3QgYmUgbWFudWFsbHkgYWJvcnRlZCBvbiB1bmxvYWQgKCM1MjgwKVxuaWYgKCB3aW5kb3cuQWN0aXZlWE9iamVjdCApIHtcblx0alF1ZXJ5KCB3aW5kb3cgKS5vbiggXCJ1bmxvYWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0Zm9yICggdmFyIGtleSBpbiB4aHJDYWxsYmFja3MgKSB7XG5cdFx0XHR4aHJDYWxsYmFja3NbIGtleSBdKCB1bmRlZmluZWQsIHRydWUgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBEZXRlcm1pbmUgc3VwcG9ydCBwcm9wZXJ0aWVzXG5zdXBwb3J0LmNvcnMgPSAhIXhoclN1cHBvcnRlZCAmJiAoIFwid2l0aENyZWRlbnRpYWxzXCIgaW4geGhyU3VwcG9ydGVkICk7XG54aHJTdXBwb3J0ZWQgPSBzdXBwb3J0LmFqYXggPSAhIXhoclN1cHBvcnRlZDtcblxuLy8gQ3JlYXRlIHRyYW5zcG9ydCBpZiB0aGUgYnJvd3NlciBjYW4gcHJvdmlkZSBhbiB4aHJcbmlmICggeGhyU3VwcG9ydGVkICkge1xuXG5cdGpRdWVyeS5hamF4VHJhbnNwb3J0KGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXHRcdC8vIENyb3NzIGRvbWFpbiBvbmx5IGFsbG93ZWQgaWYgc3VwcG9ydGVkIHRocm91Z2ggWE1MSHR0cFJlcXVlc3Rcblx0XHRpZiAoICFvcHRpb25zLmNyb3NzRG9tYWluIHx8IHN1cHBvcnQuY29ycyApIHtcblxuXHRcdFx0dmFyIGNhbGxiYWNrO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzZW5kOiBmdW5jdGlvbiggaGVhZGVycywgY29tcGxldGUgKSB7XG5cdFx0XHRcdFx0dmFyIGksXG5cdFx0XHRcdFx0XHR4aHIgPSBvcHRpb25zLnhocigpLFxuXHRcdFx0XHRcdFx0aWQgPSArK3hocklkO1xuXG5cdFx0XHRcdFx0Ly8gT3BlbiB0aGUgc29ja2V0XG5cdFx0XHRcdFx0eGhyLm9wZW4oIG9wdGlvbnMudHlwZSwgb3B0aW9ucy51cmwsIG9wdGlvbnMuYXN5bmMsIG9wdGlvbnMudXNlcm5hbWUsIG9wdGlvbnMucGFzc3dvcmQgKTtcblxuXHRcdFx0XHRcdC8vIEFwcGx5IGN1c3RvbSBmaWVsZHMgaWYgcHJvdmlkZWRcblx0XHRcdFx0XHRpZiAoIG9wdGlvbnMueGhyRmllbGRzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggaSBpbiBvcHRpb25zLnhockZpZWxkcyApIHtcblx0XHRcdFx0XHRcdFx0eGhyWyBpIF0gPSBvcHRpb25zLnhockZpZWxkc1sgaSBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE92ZXJyaWRlIG1pbWUgdHlwZSBpZiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIG9wdGlvbnMubWltZVR5cGUgJiYgeGhyLm92ZXJyaWRlTWltZVR5cGUgKSB7XG5cdFx0XHRcdFx0XHR4aHIub3ZlcnJpZGVNaW1lVHlwZSggb3B0aW9ucy5taW1lVHlwZSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFgtUmVxdWVzdGVkLVdpdGggaGVhZGVyXG5cdFx0XHRcdFx0Ly8gRm9yIGNyb3NzLWRvbWFpbiByZXF1ZXN0cywgc2VlaW5nIGFzIGNvbmRpdGlvbnMgZm9yIGEgcHJlZmxpZ2h0IGFyZVxuXHRcdFx0XHRcdC8vIGFraW4gdG8gYSBqaWdzYXcgcHV6emxlLCB3ZSBzaW1wbHkgbmV2ZXIgc2V0IGl0IHRvIGJlIHN1cmUuXG5cdFx0XHRcdFx0Ly8gKGl0IGNhbiBhbHdheXMgYmUgc2V0IG9uIGEgcGVyLXJlcXVlc3QgYmFzaXMgb3IgZXZlbiB1c2luZyBhamF4U2V0dXApXG5cdFx0XHRcdFx0Ly8gRm9yIHNhbWUtZG9tYWluIHJlcXVlc3RzLCB3b24ndCBjaGFuZ2UgaGVhZGVyIGlmIGFscmVhZHkgcHJvdmlkZWQuXG5cdFx0XHRcdFx0aWYgKCAhb3B0aW9ucy5jcm9zc0RvbWFpbiAmJiAhaGVhZGVyc1tcIlgtUmVxdWVzdGVkLVdpdGhcIl0gKSB7XG5cdFx0XHRcdFx0XHRoZWFkZXJzW1wiWC1SZXF1ZXN0ZWQtV2l0aFwiXSA9IFwiWE1MSHR0cFJlcXVlc3RcIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBTZXQgaGVhZGVyc1xuXHRcdFx0XHRcdGZvciAoIGkgaW4gaGVhZGVycyApIHtcblx0XHRcdFx0XHRcdC8vIFN1cHBvcnQ6IElFPDlcblx0XHRcdFx0XHRcdC8vIElFJ3MgQWN0aXZlWE9iamVjdCB0aHJvd3MgYSAnVHlwZSBNaXNtYXRjaCcgZXhjZXB0aW9uIHdoZW4gc2V0dGluZ1xuXHRcdFx0XHRcdFx0Ly8gcmVxdWVzdCBoZWFkZXIgdG8gYSBudWxsLXZhbHVlLlxuXHRcdFx0XHRcdFx0Ly9cblx0XHRcdFx0XHRcdC8vIFRvIGtlZXAgY29uc2lzdGVudCB3aXRoIG90aGVyIFhIUiBpbXBsZW1lbnRhdGlvbnMsIGNhc3QgdGhlIHZhbHVlXG5cdFx0XHRcdFx0XHQvLyB0byBzdHJpbmcgYW5kIGlnbm9yZSBgdW5kZWZpbmVkYC5cblx0XHRcdFx0XHRcdGlmICggaGVhZGVyc1sgaSBdICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKCBpLCBoZWFkZXJzWyBpIF0gKyBcIlwiICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gRG8gc2VuZCB0aGUgcmVxdWVzdFxuXHRcdFx0XHRcdC8vIFRoaXMgbWF5IHJhaXNlIGFuIGV4Y2VwdGlvbiB3aGljaCBpcyBhY3R1YWxseVxuXHRcdFx0XHRcdC8vIGhhbmRsZWQgaW4galF1ZXJ5LmFqYXggKHNvIG5vIHRyeS9jYXRjaCBoZXJlKVxuXHRcdFx0XHRcdHhoci5zZW5kKCAoIG9wdGlvbnMuaGFzQ29udGVudCAmJiBvcHRpb25zLmRhdGEgKSB8fCBudWxsICk7XG5cblx0XHRcdFx0XHQvLyBMaXN0ZW5lclxuXHRcdFx0XHRcdGNhbGxiYWNrID0gZnVuY3Rpb24oIF8sIGlzQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHR2YXIgc3RhdHVzLCBzdGF0dXNUZXh0LCByZXNwb25zZXM7XG5cblx0XHRcdFx0XHRcdC8vIFdhcyBuZXZlciBjYWxsZWQgYW5kIGlzIGFib3J0ZWQgb3IgY29tcGxldGVcblx0XHRcdFx0XHRcdGlmICggY2FsbGJhY2sgJiYgKCBpc0Fib3J0IHx8IHhoci5yZWFkeVN0YXRlID09PSA0ICkgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIENsZWFuIHVwXG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSB4aHJDYWxsYmFja3NbIGlkIF07XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0galF1ZXJ5Lm5vb3A7XG5cblx0XHRcdFx0XHRcdFx0Ly8gQWJvcnQgbWFudWFsbHkgaWYgbmVlZGVkXG5cdFx0XHRcdFx0XHRcdGlmICggaXNBYm9ydCApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIHhoci5yZWFkeVN0YXRlICE9PSA0ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0eGhyLmFib3J0KCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlcyA9IHt9O1xuXHRcdFx0XHRcdFx0XHRcdHN0YXR1cyA9IHhoci5zdGF0dXM7XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBTdXBwb3J0OiBJRTwxMFxuXHRcdFx0XHRcdFx0XHRcdC8vIEFjY2Vzc2luZyBiaW5hcnktZGF0YSByZXNwb25zZVRleHQgdGhyb3dzIGFuIGV4Y2VwdGlvblxuXHRcdFx0XHRcdFx0XHRcdC8vICgjMTE0MjYpXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgeGhyLnJlc3BvbnNlVGV4dCA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlcy50ZXh0ID0geGhyLnJlc3BvbnNlVGV4dDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBGaXJlZm94IHRocm93cyBhbiBleGNlcHRpb24gd2hlbiBhY2Nlc3Npbmdcblx0XHRcdFx0XHRcdFx0XHQvLyBzdGF0dXNUZXh0IGZvciBmYXVsdHkgY3Jvc3MtZG9tYWluIHJlcXVlc3RzXG5cdFx0XHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c1RleHQgPSB4aHIuc3RhdHVzVGV4dDtcblx0XHRcdFx0XHRcdFx0XHR9IGNhdGNoKCBlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gV2Ugbm9ybWFsaXplIHdpdGggV2Via2l0IGdpdmluZyBhbiBlbXB0eSBzdGF0dXNUZXh0XG5cdFx0XHRcdFx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gXCJcIjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBGaWx0ZXIgc3RhdHVzIGZvciBub24gc3RhbmRhcmQgYmVoYXZpb3JzXG5cblx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgcmVxdWVzdCBpcyBsb2NhbCBhbmQgd2UgaGF2ZSBkYXRhOiBhc3N1bWUgYSBzdWNjZXNzXG5cdFx0XHRcdFx0XHRcdFx0Ly8gKHN1Y2Nlc3Mgd2l0aCBubyBkYXRhIHdvbid0IGdldCBub3RpZmllZCwgdGhhdCdzIHRoZSBiZXN0IHdlXG5cdFx0XHRcdFx0XHRcdFx0Ly8gY2FuIGRvIGdpdmVuIGN1cnJlbnQgaW1wbGVtZW50YXRpb25zKVxuXHRcdFx0XHRcdFx0XHRcdGlmICggIXN0YXR1cyAmJiBvcHRpb25zLmlzTG9jYWwgJiYgIW9wdGlvbnMuY3Jvc3NEb21haW4gKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdGF0dXMgPSByZXNwb25zZXMudGV4dCA/IDIwMCA6IDQwNDtcblx0XHRcdFx0XHRcdFx0XHQvLyBJRSAtICMxNDUwOiBzb21ldGltZXMgcmV0dXJucyAxMjIzIHdoZW4gaXQgc2hvdWxkIGJlIDIwNFxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIHN0YXR1cyA9PT0gMTIyMyApIHtcblx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1cyA9IDIwNDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gQ2FsbCBjb21wbGV0ZSBpZiBuZWVkZWRcblx0XHRcdFx0XHRcdGlmICggcmVzcG9uc2VzICkge1xuXHRcdFx0XHRcdFx0XHRjb21wbGV0ZSggc3RhdHVzLCBzdGF0dXNUZXh0LCByZXNwb25zZXMsIHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRpZiAoICFvcHRpb25zLmFzeW5jICkge1xuXHRcdFx0XHRcdFx0Ly8gaWYgd2UncmUgaW4gc3luYyBtb2RlIHdlIGZpcmUgdGhlIGNhbGxiYWNrXG5cdFx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIHhoci5yZWFkeVN0YXRlID09PSA0ICkge1xuXHRcdFx0XHRcdFx0Ly8gKElFNiAmIElFNykgaWYgaXQncyBpbiBjYWNoZSBhbmQgaGFzIGJlZW5cblx0XHRcdFx0XHRcdC8vIHJldHJpZXZlZCBkaXJlY3RseSB3ZSBuZWVkIHRvIGZpcmUgdGhlIGNhbGxiYWNrXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCBjYWxsYmFjayApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBBZGQgdG8gdGhlIGxpc3Qgb2YgYWN0aXZlIHhociBjYWxsYmFja3Ncblx0XHRcdFx0XHRcdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB4aHJDYWxsYmFja3NbIGlkIF0gPSBjYWxsYmFjaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0YWJvcnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICggY2FsbGJhY2sgKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjayggdW5kZWZpbmVkLCB0cnVlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblx0fSk7XG59XG5cbi8vIEZ1bmN0aW9ucyB0byBjcmVhdGUgeGhyc1xuZnVuY3Rpb24gY3JlYXRlU3RhbmRhcmRYSFIoKSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0fSBjYXRjaCggZSApIHt9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUFjdGl2ZVhIUigpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gbmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KCBcIk1pY3Jvc29mdC5YTUxIVFRQXCIgKTtcblx0fSBjYXRjaCggZSApIHt9XG59XG5cblxuXG5cbi8vIEluc3RhbGwgc2NyaXB0IGRhdGFUeXBlXG5qUXVlcnkuYWpheFNldHVwKHtcblx0YWNjZXB0czoge1xuXHRcdHNjcmlwdDogXCJ0ZXh0L2phdmFzY3JpcHQsIGFwcGxpY2F0aW9uL2phdmFzY3JpcHQsIGFwcGxpY2F0aW9uL2VjbWFzY3JpcHQsIGFwcGxpY2F0aW9uL3gtZWNtYXNjcmlwdFwiXG5cdH0sXG5cdGNvbnRlbnRzOiB7XG5cdFx0c2NyaXB0OiAvKD86amF2YXxlY21hKXNjcmlwdC9cblx0fSxcblx0Y29udmVydGVyczoge1xuXHRcdFwidGV4dCBzY3JpcHRcIjogZnVuY3Rpb24oIHRleHQgKSB7XG5cdFx0XHRqUXVlcnkuZ2xvYmFsRXZhbCggdGV4dCApO1xuXHRcdFx0cmV0dXJuIHRleHQ7XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gSGFuZGxlIGNhY2hlJ3Mgc3BlY2lhbCBjYXNlIGFuZCBnbG9iYWxcbmpRdWVyeS5hamF4UHJlZmlsdGVyKCBcInNjcmlwdFwiLCBmdW5jdGlvbiggcyApIHtcblx0aWYgKCBzLmNhY2hlID09PSB1bmRlZmluZWQgKSB7XG5cdFx0cy5jYWNoZSA9IGZhbHNlO1xuXHR9XG5cdGlmICggcy5jcm9zc0RvbWFpbiApIHtcblx0XHRzLnR5cGUgPSBcIkdFVFwiO1xuXHRcdHMuZ2xvYmFsID0gZmFsc2U7XG5cdH1cbn0pO1xuXG4vLyBCaW5kIHNjcmlwdCB0YWcgaGFjayB0cmFuc3BvcnRcbmpRdWVyeS5hamF4VHJhbnNwb3J0KCBcInNjcmlwdFwiLCBmdW5jdGlvbihzKSB7XG5cblx0Ly8gVGhpcyB0cmFuc3BvcnQgb25seSBkZWFscyB3aXRoIGNyb3NzIGRvbWFpbiByZXF1ZXN0c1xuXHRpZiAoIHMuY3Jvc3NEb21haW4gKSB7XG5cblx0XHR2YXIgc2NyaXB0LFxuXHRcdFx0aGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgalF1ZXJ5KFwiaGVhZFwiKVswXSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRzZW5kOiBmdW5jdGlvbiggXywgY2FsbGJhY2sgKSB7XG5cblx0XHRcdFx0c2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcblxuXHRcdFx0XHRzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG5cdFx0XHRcdGlmICggcy5zY3JpcHRDaGFyc2V0ICkge1xuXHRcdFx0XHRcdHNjcmlwdC5jaGFyc2V0ID0gcy5zY3JpcHRDaGFyc2V0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2NyaXB0LnNyYyA9IHMudXJsO1xuXG5cdFx0XHRcdC8vIEF0dGFjaCBoYW5kbGVycyBmb3IgYWxsIGJyb3dzZXJzXG5cdFx0XHRcdHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oIF8sIGlzQWJvcnQgKSB7XG5cblx0XHRcdFx0XHRpZiAoIGlzQWJvcnQgfHwgIXNjcmlwdC5yZWFkeVN0YXRlIHx8IC9sb2FkZWR8Y29tcGxldGUvLnRlc3QoIHNjcmlwdC5yZWFkeVN0YXRlICkgKSB7XG5cblx0XHRcdFx0XHRcdC8vIEhhbmRsZSBtZW1vcnkgbGVhayBpbiBJRVxuXHRcdFx0XHRcdFx0c2NyaXB0Lm9ubG9hZCA9IHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBudWxsO1xuXG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgdGhlIHNjcmlwdFxuXHRcdFx0XHRcdFx0aWYgKCBzY3JpcHQucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0XHRcdFx0c2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIHNjcmlwdCApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBEZXJlZmVyZW5jZSB0aGUgc2NyaXB0XG5cdFx0XHRcdFx0XHRzY3JpcHQgPSBudWxsO1xuXG5cdFx0XHRcdFx0XHQvLyBDYWxsYmFjayBpZiBub3QgYWJvcnRcblx0XHRcdFx0XHRcdGlmICggIWlzQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKCAyMDAsIFwic3VjY2Vzc1wiICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8vIENpcmN1bXZlbnQgSUU2IGJ1Z3Mgd2l0aCBiYXNlIGVsZW1lbnRzICgjMjcwOSBhbmQgIzQzNzgpIGJ5IHByZXBlbmRpbmdcblx0XHRcdFx0Ly8gVXNlIG5hdGl2ZSBET00gbWFuaXB1bGF0aW9uIHRvIGF2b2lkIG91ciBkb21NYW5pcCBBSkFYIHRyaWNrZXJ5XG5cdFx0XHRcdGhlYWQuaW5zZXJ0QmVmb3JlKCBzY3JpcHQsIGhlYWQuZmlyc3RDaGlsZCApO1xuXHRcdFx0fSxcblxuXHRcdFx0YWJvcnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIHNjcmlwdCApIHtcblx0XHRcdFx0XHRzY3JpcHQub25sb2FkKCB1bmRlZmluZWQsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn0pO1xuXG5cblxuXG52YXIgb2xkQ2FsbGJhY2tzID0gW10sXG5cdHJqc29ucCA9IC8oPSlcXD8oPz0mfCQpfFxcP1xcPy87XG5cbi8vIERlZmF1bHQganNvbnAgc2V0dGluZ3NcbmpRdWVyeS5hamF4U2V0dXAoe1xuXHRqc29ucDogXCJjYWxsYmFja1wiLFxuXHRqc29ucENhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgY2FsbGJhY2sgPSBvbGRDYWxsYmFja3MucG9wKCkgfHwgKCBqUXVlcnkuZXhwYW5kbyArIFwiX1wiICsgKCBub25jZSsrICkgKTtcblx0XHR0aGlzWyBjYWxsYmFjayBdID0gdHJ1ZTtcblx0XHRyZXR1cm4gY2FsbGJhY2s7XG5cdH1cbn0pO1xuXG4vLyBEZXRlY3QsIG5vcm1hbGl6ZSBvcHRpb25zIGFuZCBpbnN0YWxsIGNhbGxiYWNrcyBmb3IganNvbnAgcmVxdWVzdHNcbmpRdWVyeS5hamF4UHJlZmlsdGVyKCBcImpzb24ganNvbnBcIiwgZnVuY3Rpb24oIHMsIG9yaWdpbmFsU2V0dGluZ3MsIGpxWEhSICkge1xuXG5cdHZhciBjYWxsYmFja05hbWUsIG92ZXJ3cml0dGVuLCByZXNwb25zZUNvbnRhaW5lcixcblx0XHRqc29uUHJvcCA9IHMuanNvbnAgIT09IGZhbHNlICYmICggcmpzb25wLnRlc3QoIHMudXJsICkgP1xuXHRcdFx0XCJ1cmxcIiA6XG5cdFx0XHR0eXBlb2Ygcy5kYXRhID09PSBcInN0cmluZ1wiICYmICEoIHMuY29udGVudFR5cGUgfHwgXCJcIiApLmluZGV4T2YoXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIikgJiYgcmpzb25wLnRlc3QoIHMuZGF0YSApICYmIFwiZGF0YVwiXG5cdFx0KTtcblxuXHQvLyBIYW5kbGUgaWZmIHRoZSBleHBlY3RlZCBkYXRhIHR5cGUgaXMgXCJqc29ucFwiIG9yIHdlIGhhdmUgYSBwYXJhbWV0ZXIgdG8gc2V0XG5cdGlmICgganNvblByb3AgfHwgcy5kYXRhVHlwZXNbIDAgXSA9PT0gXCJqc29ucFwiICkge1xuXG5cdFx0Ly8gR2V0IGNhbGxiYWNrIG5hbWUsIHJlbWVtYmVyaW5nIHByZWV4aXN0aW5nIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCBpdFxuXHRcdGNhbGxiYWNrTmFtZSA9IHMuanNvbnBDYWxsYmFjayA9IGpRdWVyeS5pc0Z1bmN0aW9uKCBzLmpzb25wQ2FsbGJhY2sgKSA/XG5cdFx0XHRzLmpzb25wQ2FsbGJhY2soKSA6XG5cdFx0XHRzLmpzb25wQ2FsbGJhY2s7XG5cblx0XHQvLyBJbnNlcnQgY2FsbGJhY2sgaW50byB1cmwgb3IgZm9ybSBkYXRhXG5cdFx0aWYgKCBqc29uUHJvcCApIHtcblx0XHRcdHNbIGpzb25Qcm9wIF0gPSBzWyBqc29uUHJvcCBdLnJlcGxhY2UoIHJqc29ucCwgXCIkMVwiICsgY2FsbGJhY2tOYW1lICk7XG5cdFx0fSBlbHNlIGlmICggcy5qc29ucCAhPT0gZmFsc2UgKSB7XG5cdFx0XHRzLnVybCArPSAoIHJxdWVyeS50ZXN0KCBzLnVybCApID8gXCImXCIgOiBcIj9cIiApICsgcy5qc29ucCArIFwiPVwiICsgY2FsbGJhY2tOYW1lO1xuXHRcdH1cblxuXHRcdC8vIFVzZSBkYXRhIGNvbnZlcnRlciB0byByZXRyaWV2ZSBqc29uIGFmdGVyIHNjcmlwdCBleGVjdXRpb25cblx0XHRzLmNvbnZlcnRlcnNbXCJzY3JpcHQganNvblwiXSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAhcmVzcG9uc2VDb250YWluZXIgKSB7XG5cdFx0XHRcdGpRdWVyeS5lcnJvciggY2FsbGJhY2tOYW1lICsgXCIgd2FzIG5vdCBjYWxsZWRcIiApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlQ29udGFpbmVyWyAwIF07XG5cdFx0fTtcblxuXHRcdC8vIGZvcmNlIGpzb24gZGF0YVR5cGVcblx0XHRzLmRhdGFUeXBlc1sgMCBdID0gXCJqc29uXCI7XG5cblx0XHQvLyBJbnN0YWxsIGNhbGxiYWNrXG5cdFx0b3ZlcndyaXR0ZW4gPSB3aW5kb3dbIGNhbGxiYWNrTmFtZSBdO1xuXHRcdHdpbmRvd1sgY2FsbGJhY2tOYW1lIF0gPSBmdW5jdGlvbigpIHtcblx0XHRcdHJlc3BvbnNlQ29udGFpbmVyID0gYXJndW1lbnRzO1xuXHRcdH07XG5cblx0XHQvLyBDbGVhbi11cCBmdW5jdGlvbiAoZmlyZXMgYWZ0ZXIgY29udmVydGVycylcblx0XHRqcVhIUi5hbHdheXMoZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBSZXN0b3JlIHByZWV4aXN0aW5nIHZhbHVlXG5cdFx0XHR3aW5kb3dbIGNhbGxiYWNrTmFtZSBdID0gb3ZlcndyaXR0ZW47XG5cblx0XHRcdC8vIFNhdmUgYmFjayBhcyBmcmVlXG5cdFx0XHRpZiAoIHNbIGNhbGxiYWNrTmFtZSBdICkge1xuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhhdCByZS11c2luZyB0aGUgb3B0aW9ucyBkb2Vzbid0IHNjcmV3IHRoaW5ncyBhcm91bmRcblx0XHRcdFx0cy5qc29ucENhbGxiYWNrID0gb3JpZ2luYWxTZXR0aW5ncy5qc29ucENhbGxiYWNrO1xuXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNhbGxiYWNrIG5hbWUgZm9yIGZ1dHVyZSB1c2Vcblx0XHRcdFx0b2xkQ2FsbGJhY2tzLnB1c2goIGNhbGxiYWNrTmFtZSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDYWxsIGlmIGl0IHdhcyBhIGZ1bmN0aW9uIGFuZCB3ZSBoYXZlIGEgcmVzcG9uc2Vcblx0XHRcdGlmICggcmVzcG9uc2VDb250YWluZXIgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIG92ZXJ3cml0dGVuICkgKSB7XG5cdFx0XHRcdG92ZXJ3cml0dGVuKCByZXNwb25zZUNvbnRhaW5lclsgMCBdICk7XG5cdFx0XHR9XG5cblx0XHRcdHJlc3BvbnNlQ29udGFpbmVyID0gb3ZlcndyaXR0ZW4gPSB1bmRlZmluZWQ7XG5cdFx0fSk7XG5cblx0XHQvLyBEZWxlZ2F0ZSB0byBzY3JpcHRcblx0XHRyZXR1cm4gXCJzY3JpcHRcIjtcblx0fVxufSk7XG5cblxuXG5cbi8vIGRhdGE6IHN0cmluZyBvZiBodG1sXG4vLyBjb250ZXh0IChvcHRpb25hbCk6IElmIHNwZWNpZmllZCwgdGhlIGZyYWdtZW50IHdpbGwgYmUgY3JlYXRlZCBpbiB0aGlzIGNvbnRleHQsIGRlZmF1bHRzIHRvIGRvY3VtZW50XG4vLyBrZWVwU2NyaXB0cyAob3B0aW9uYWwpOiBJZiB0cnVlLCB3aWxsIGluY2x1ZGUgc2NyaXB0cyBwYXNzZWQgaW4gdGhlIGh0bWwgc3RyaW5nXG5qUXVlcnkucGFyc2VIVE1MID0gZnVuY3Rpb24oIGRhdGEsIGNvbnRleHQsIGtlZXBTY3JpcHRzICkge1xuXHRpZiAoICFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSBcInN0cmluZ1wiICkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdGlmICggdHlwZW9mIGNvbnRleHQgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdGtlZXBTY3JpcHRzID0gY29udGV4dDtcblx0XHRjb250ZXh0ID0gZmFsc2U7XG5cdH1cblx0Y29udGV4dCA9IGNvbnRleHQgfHwgZG9jdW1lbnQ7XG5cblx0dmFyIHBhcnNlZCA9IHJzaW5nbGVUYWcuZXhlYyggZGF0YSApLFxuXHRcdHNjcmlwdHMgPSAha2VlcFNjcmlwdHMgJiYgW107XG5cblx0Ly8gU2luZ2xlIHRhZ1xuXHRpZiAoIHBhcnNlZCApIHtcblx0XHRyZXR1cm4gWyBjb250ZXh0LmNyZWF0ZUVsZW1lbnQoIHBhcnNlZFsxXSApIF07XG5cdH1cblxuXHRwYXJzZWQgPSBqUXVlcnkuYnVpbGRGcmFnbWVudCggWyBkYXRhIF0sIGNvbnRleHQsIHNjcmlwdHMgKTtcblxuXHRpZiAoIHNjcmlwdHMgJiYgc2NyaXB0cy5sZW5ndGggKSB7XG5cdFx0alF1ZXJ5KCBzY3JpcHRzICkucmVtb3ZlKCk7XG5cdH1cblxuXHRyZXR1cm4galF1ZXJ5Lm1lcmdlKCBbXSwgcGFyc2VkLmNoaWxkTm9kZXMgKTtcbn07XG5cblxuLy8gS2VlcCBhIGNvcHkgb2YgdGhlIG9sZCBsb2FkIG1ldGhvZFxudmFyIF9sb2FkID0galF1ZXJ5LmZuLmxvYWQ7XG5cbi8qKlxuICogTG9hZCBhIHVybCBpbnRvIGEgcGFnZVxuICovXG5qUXVlcnkuZm4ubG9hZCA9IGZ1bmN0aW9uKCB1cmwsIHBhcmFtcywgY2FsbGJhY2sgKSB7XG5cdGlmICggdHlwZW9mIHVybCAhPT0gXCJzdHJpbmdcIiAmJiBfbG9hZCApIHtcblx0XHRyZXR1cm4gX2xvYWQuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHR9XG5cblx0dmFyIHNlbGVjdG9yLCByZXNwb25zZSwgdHlwZSxcblx0XHRzZWxmID0gdGhpcyxcblx0XHRvZmYgPSB1cmwuaW5kZXhPZihcIiBcIik7XG5cblx0aWYgKCBvZmYgPj0gMCApIHtcblx0XHRzZWxlY3RvciA9IGpRdWVyeS50cmltKCB1cmwuc2xpY2UoIG9mZiwgdXJsLmxlbmd0aCApICk7XG5cdFx0dXJsID0gdXJsLnNsaWNlKCAwLCBvZmYgKTtcblx0fVxuXG5cdC8vIElmIGl0J3MgYSBmdW5jdGlvblxuXHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBwYXJhbXMgKSApIHtcblxuXHRcdC8vIFdlIGFzc3VtZSB0aGF0IGl0J3MgdGhlIGNhbGxiYWNrXG5cdFx0Y2FsbGJhY2sgPSBwYXJhbXM7XG5cdFx0cGFyYW1zID0gdW5kZWZpbmVkO1xuXG5cdC8vIE90aGVyd2lzZSwgYnVpbGQgYSBwYXJhbSBzdHJpbmdcblx0fSBlbHNlIGlmICggcGFyYW1zICYmIHR5cGVvZiBwYXJhbXMgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0dHlwZSA9IFwiUE9TVFwiO1xuXHR9XG5cblx0Ly8gSWYgd2UgaGF2ZSBlbGVtZW50cyB0byBtb2RpZnksIG1ha2UgdGhlIHJlcXVlc3Rcblx0aWYgKCBzZWxmLmxlbmd0aCA+IDAgKSB7XG5cdFx0alF1ZXJ5LmFqYXgoe1xuXHRcdFx0dXJsOiB1cmwsXG5cblx0XHRcdC8vIGlmIFwidHlwZVwiIHZhcmlhYmxlIGlzIHVuZGVmaW5lZCwgdGhlbiBcIkdFVFwiIG1ldGhvZCB3aWxsIGJlIHVzZWRcblx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRkYXRhVHlwZTogXCJodG1sXCIsXG5cdFx0XHRkYXRhOiBwYXJhbXNcblx0XHR9KS5kb25lKGZ1bmN0aW9uKCByZXNwb25zZVRleHQgKSB7XG5cblx0XHRcdC8vIFNhdmUgcmVzcG9uc2UgZm9yIHVzZSBpbiBjb21wbGV0ZSBjYWxsYmFja1xuXHRcdFx0cmVzcG9uc2UgPSBhcmd1bWVudHM7XG5cblx0XHRcdHNlbGYuaHRtbCggc2VsZWN0b3IgP1xuXG5cdFx0XHRcdC8vIElmIGEgc2VsZWN0b3Igd2FzIHNwZWNpZmllZCwgbG9jYXRlIHRoZSByaWdodCBlbGVtZW50cyBpbiBhIGR1bW15IGRpdlxuXHRcdFx0XHQvLyBFeGNsdWRlIHNjcmlwdHMgdG8gYXZvaWQgSUUgJ1Blcm1pc3Npb24gRGVuaWVkJyBlcnJvcnNcblx0XHRcdFx0alF1ZXJ5KFwiPGRpdj5cIikuYXBwZW5kKCBqUXVlcnkucGFyc2VIVE1MKCByZXNwb25zZVRleHQgKSApLmZpbmQoIHNlbGVjdG9yICkgOlxuXG5cdFx0XHRcdC8vIE90aGVyd2lzZSB1c2UgdGhlIGZ1bGwgcmVzdWx0XG5cdFx0XHRcdHJlc3BvbnNlVGV4dCApO1xuXG5cdFx0fSkuY29tcGxldGUoIGNhbGxiYWNrICYmIGZ1bmN0aW9uKCBqcVhIUiwgc3RhdHVzICkge1xuXHRcdFx0c2VsZi5lYWNoKCBjYWxsYmFjaywgcmVzcG9uc2UgfHwgWyBqcVhIUi5yZXNwb25zZVRleHQsIHN0YXR1cywganFYSFIgXSApO1xuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5cblxuXG5qUXVlcnkuZXhwci5maWx0ZXJzLmFuaW1hdGVkID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdHJldHVybiBqUXVlcnkuZ3JlcChqUXVlcnkudGltZXJzLCBmdW5jdGlvbiggZm4gKSB7XG5cdFx0cmV0dXJuIGVsZW0gPT09IGZuLmVsZW07XG5cdH0pLmxlbmd0aDtcbn07XG5cblxuXG5cblxudmFyIGRvY0VsZW0gPSB3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG4vKipcbiAqIEdldHMgYSB3aW5kb3cgZnJvbSBhbiBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIGdldFdpbmRvdyggZWxlbSApIHtcblx0cmV0dXJuIGpRdWVyeS5pc1dpbmRvdyggZWxlbSApID9cblx0XHRlbGVtIDpcblx0XHRlbGVtLm5vZGVUeXBlID09PSA5ID9cblx0XHRcdGVsZW0uZGVmYXVsdFZpZXcgfHwgZWxlbS5wYXJlbnRXaW5kb3cgOlxuXHRcdFx0ZmFsc2U7XG59XG5cbmpRdWVyeS5vZmZzZXQgPSB7XG5cdHNldE9mZnNldDogZnVuY3Rpb24oIGVsZW0sIG9wdGlvbnMsIGkgKSB7XG5cdFx0dmFyIGN1clBvc2l0aW9uLCBjdXJMZWZ0LCBjdXJDU1NUb3AsIGN1clRvcCwgY3VyT2Zmc2V0LCBjdXJDU1NMZWZ0LCBjYWxjdWxhdGVQb3NpdGlvbixcblx0XHRcdHBvc2l0aW9uID0galF1ZXJ5LmNzcyggZWxlbSwgXCJwb3NpdGlvblwiICksXG5cdFx0XHRjdXJFbGVtID0galF1ZXJ5KCBlbGVtICksXG5cdFx0XHRwcm9wcyA9IHt9O1xuXG5cdFx0Ly8gc2V0IHBvc2l0aW9uIGZpcnN0LCBpbi1jYXNlIHRvcC9sZWZ0IGFyZSBzZXQgZXZlbiBvbiBzdGF0aWMgZWxlbVxuXHRcdGlmICggcG9zaXRpb24gPT09IFwic3RhdGljXCIgKSB7XG5cdFx0XHRlbGVtLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuXHRcdH1cblxuXHRcdGN1ck9mZnNldCA9IGN1ckVsZW0ub2Zmc2V0KCk7XG5cdFx0Y3VyQ1NTVG9wID0galF1ZXJ5LmNzcyggZWxlbSwgXCJ0b3BcIiApO1xuXHRcdGN1ckNTU0xlZnQgPSBqUXVlcnkuY3NzKCBlbGVtLCBcImxlZnRcIiApO1xuXHRcdGNhbGN1bGF0ZVBvc2l0aW9uID0gKCBwb3NpdGlvbiA9PT0gXCJhYnNvbHV0ZVwiIHx8IHBvc2l0aW9uID09PSBcImZpeGVkXCIgKSAmJlxuXHRcdFx0alF1ZXJ5LmluQXJyYXkoXCJhdXRvXCIsIFsgY3VyQ1NTVG9wLCBjdXJDU1NMZWZ0IF0gKSA+IC0xO1xuXG5cdFx0Ly8gbmVlZCB0byBiZSBhYmxlIHRvIGNhbGN1bGF0ZSBwb3NpdGlvbiBpZiBlaXRoZXIgdG9wIG9yIGxlZnQgaXMgYXV0byBhbmQgcG9zaXRpb24gaXMgZWl0aGVyIGFic29sdXRlIG9yIGZpeGVkXG5cdFx0aWYgKCBjYWxjdWxhdGVQb3NpdGlvbiApIHtcblx0XHRcdGN1clBvc2l0aW9uID0gY3VyRWxlbS5wb3NpdGlvbigpO1xuXHRcdFx0Y3VyVG9wID0gY3VyUG9zaXRpb24udG9wO1xuXHRcdFx0Y3VyTGVmdCA9IGN1clBvc2l0aW9uLmxlZnQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN1clRvcCA9IHBhcnNlRmxvYXQoIGN1ckNTU1RvcCApIHx8IDA7XG5cdFx0XHRjdXJMZWZ0ID0gcGFyc2VGbG9hdCggY3VyQ1NTTGVmdCApIHx8IDA7XG5cdFx0fVxuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggb3B0aW9ucyApICkge1xuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMuY2FsbCggZWxlbSwgaSwgY3VyT2Zmc2V0ICk7XG5cdFx0fVxuXG5cdFx0aWYgKCBvcHRpb25zLnRvcCAhPSBudWxsICkge1xuXHRcdFx0cHJvcHMudG9wID0gKCBvcHRpb25zLnRvcCAtIGN1ck9mZnNldC50b3AgKSArIGN1clRvcDtcblx0XHR9XG5cdFx0aWYgKCBvcHRpb25zLmxlZnQgIT0gbnVsbCApIHtcblx0XHRcdHByb3BzLmxlZnQgPSAoIG9wdGlvbnMubGVmdCAtIGN1ck9mZnNldC5sZWZ0ICkgKyBjdXJMZWZ0O1xuXHRcdH1cblxuXHRcdGlmICggXCJ1c2luZ1wiIGluIG9wdGlvbnMgKSB7XG5cdFx0XHRvcHRpb25zLnVzaW5nLmNhbGwoIGVsZW0sIHByb3BzICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN1ckVsZW0uY3NzKCBwcm9wcyApO1xuXHRcdH1cblx0fVxufTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdG9mZnNldDogZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoICkge1xuXHRcdFx0cmV0dXJuIG9wdGlvbnMgPT09IHVuZGVmaW5lZCA/XG5cdFx0XHRcdHRoaXMgOlxuXHRcdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5Lm9mZnNldC5zZXRPZmZzZXQoIHRoaXMsIG9wdGlvbnMsIGkgKTtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dmFyIGRvY0VsZW0sIHdpbixcblx0XHRcdGJveCA9IHsgdG9wOiAwLCBsZWZ0OiAwIH0sXG5cdFx0XHRlbGVtID0gdGhpc1sgMCBdLFxuXHRcdFx0ZG9jID0gZWxlbSAmJiBlbGVtLm93bmVyRG9jdW1lbnQ7XG5cblx0XHRpZiAoICFkb2MgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZG9jRWxlbSA9IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG5cblx0XHQvLyBNYWtlIHN1cmUgaXQncyBub3QgYSBkaXNjb25uZWN0ZWQgRE9NIG5vZGVcblx0XHRpZiAoICFqUXVlcnkuY29udGFpbnMoIGRvY0VsZW0sIGVsZW0gKSApIHtcblx0XHRcdHJldHVybiBib3g7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgd2UgZG9uJ3QgaGF2ZSBnQkNSLCBqdXN0IHVzZSAwLDAgcmF0aGVyIHRoYW4gZXJyb3Jcblx0XHQvLyBCbGFja0JlcnJ5IDUsIGlPUyAzIChvcmlnaW5hbCBpUGhvbmUpXG5cdFx0aWYgKCB0eXBlb2YgZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QgIT09IHN0cnVuZGVmaW5lZCApIHtcblx0XHRcdGJveCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0fVxuXHRcdHdpbiA9IGdldFdpbmRvdyggZG9jICk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHRvcDogYm94LnRvcCAgKyAoIHdpbi5wYWdlWU9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbFRvcCApICAtICggZG9jRWxlbS5jbGllbnRUb3AgIHx8IDAgKSxcblx0XHRcdGxlZnQ6IGJveC5sZWZ0ICsgKCB3aW4ucGFnZVhPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxMZWZ0ICkgLSAoIGRvY0VsZW0uY2xpZW50TGVmdCB8fCAwIClcblx0XHR9O1xuXHR9LFxuXG5cdHBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoICF0aGlzWyAwIF0gKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIG9mZnNldFBhcmVudCwgb2Zmc2V0LFxuXHRcdFx0cGFyZW50T2Zmc2V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfSxcblx0XHRcdGVsZW0gPSB0aGlzWyAwIF07XG5cblx0XHQvLyBmaXhlZCBlbGVtZW50cyBhcmUgb2Zmc2V0IGZyb20gd2luZG93IChwYXJlbnRPZmZzZXQgPSB7dG9wOjAsIGxlZnQ6IDB9LCBiZWNhdXNlIGl0IGlzIGl0cyBvbmx5IG9mZnNldCBwYXJlbnRcblx0XHRpZiAoIGpRdWVyeS5jc3MoIGVsZW0sIFwicG9zaXRpb25cIiApID09PSBcImZpeGVkXCIgKSB7XG5cdFx0XHQvLyB3ZSBhc3N1bWUgdGhhdCBnZXRCb3VuZGluZ0NsaWVudFJlY3QgaXMgYXZhaWxhYmxlIHdoZW4gY29tcHV0ZWQgcG9zaXRpb24gaXMgZml4ZWRcblx0XHRcdG9mZnNldCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEdldCAqcmVhbCogb2Zmc2V0UGFyZW50XG5cdFx0XHRvZmZzZXRQYXJlbnQgPSB0aGlzLm9mZnNldFBhcmVudCgpO1xuXG5cdFx0XHQvLyBHZXQgY29ycmVjdCBvZmZzZXRzXG5cdFx0XHRvZmZzZXQgPSB0aGlzLm9mZnNldCgpO1xuXHRcdFx0aWYgKCAhalF1ZXJ5Lm5vZGVOYW1lKCBvZmZzZXRQYXJlbnRbIDAgXSwgXCJodG1sXCIgKSApIHtcblx0XHRcdFx0cGFyZW50T2Zmc2V0ID0gb2Zmc2V0UGFyZW50Lm9mZnNldCgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgb2Zmc2V0UGFyZW50IGJvcmRlcnNcblx0XHRcdHBhcmVudE9mZnNldC50b3AgICs9IGpRdWVyeS5jc3MoIG9mZnNldFBhcmVudFsgMCBdLCBcImJvcmRlclRvcFdpZHRoXCIsIHRydWUgKTtcblx0XHRcdHBhcmVudE9mZnNldC5sZWZ0ICs9IGpRdWVyeS5jc3MoIG9mZnNldFBhcmVudFsgMCBdLCBcImJvcmRlckxlZnRXaWR0aFwiLCB0cnVlICk7XG5cdFx0fVxuXG5cdFx0Ly8gU3VidHJhY3QgcGFyZW50IG9mZnNldHMgYW5kIGVsZW1lbnQgbWFyZ2luc1xuXHRcdC8vIG5vdGU6IHdoZW4gYW4gZWxlbWVudCBoYXMgbWFyZ2luOiBhdXRvIHRoZSBvZmZzZXRMZWZ0IGFuZCBtYXJnaW5MZWZ0XG5cdFx0Ly8gYXJlIHRoZSBzYW1lIGluIFNhZmFyaSBjYXVzaW5nIG9mZnNldC5sZWZ0IHRvIGluY29ycmVjdGx5IGJlIDBcblx0XHRyZXR1cm4ge1xuXHRcdFx0dG9wOiAgb2Zmc2V0LnRvcCAgLSBwYXJlbnRPZmZzZXQudG9wIC0galF1ZXJ5LmNzcyggZWxlbSwgXCJtYXJnaW5Ub3BcIiwgdHJ1ZSApLFxuXHRcdFx0bGVmdDogb2Zmc2V0LmxlZnQgLSBwYXJlbnRPZmZzZXQubGVmdCAtIGpRdWVyeS5jc3MoIGVsZW0sIFwibWFyZ2luTGVmdFwiLCB0cnVlKVxuXHRcdH07XG5cdH0sXG5cblx0b2Zmc2V0UGFyZW50OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgb2Zmc2V0UGFyZW50ID0gdGhpcy5vZmZzZXRQYXJlbnQgfHwgZG9jRWxlbTtcblxuXHRcdFx0d2hpbGUgKCBvZmZzZXRQYXJlbnQgJiYgKCAhalF1ZXJ5Lm5vZGVOYW1lKCBvZmZzZXRQYXJlbnQsIFwiaHRtbFwiICkgJiYgalF1ZXJ5LmNzcyggb2Zmc2V0UGFyZW50LCBcInBvc2l0aW9uXCIgKSA9PT0gXCJzdGF0aWNcIiApICkge1xuXHRcdFx0XHRvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQub2Zmc2V0UGFyZW50O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9mZnNldFBhcmVudCB8fCBkb2NFbGVtO1xuXHRcdH0pO1xuXHR9XG59KTtcblxuLy8gQ3JlYXRlIHNjcm9sbExlZnQgYW5kIHNjcm9sbFRvcCBtZXRob2RzXG5qUXVlcnkuZWFjaCggeyBzY3JvbGxMZWZ0OiBcInBhZ2VYT2Zmc2V0XCIsIHNjcm9sbFRvcDogXCJwYWdlWU9mZnNldFwiIH0sIGZ1bmN0aW9uKCBtZXRob2QsIHByb3AgKSB7XG5cdHZhciB0b3AgPSAvWS8udGVzdCggcHJvcCApO1xuXG5cdGpRdWVyeS5mblsgbWV0aG9kIF0gPSBmdW5jdGlvbiggdmFsICkge1xuXHRcdHJldHVybiBhY2Nlc3MoIHRoaXMsIGZ1bmN0aW9uKCBlbGVtLCBtZXRob2QsIHZhbCApIHtcblx0XHRcdHZhciB3aW4gPSBnZXRXaW5kb3coIGVsZW0gKTtcblxuXHRcdFx0aWYgKCB2YWwgPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0cmV0dXJuIHdpbiA/IChwcm9wIGluIHdpbikgPyB3aW5bIHByb3AgXSA6XG5cdFx0XHRcdFx0d2luLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudFsgbWV0aG9kIF0gOlxuXHRcdFx0XHRcdGVsZW1bIG1ldGhvZCBdO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHdpbiApIHtcblx0XHRcdFx0d2luLnNjcm9sbFRvKFxuXHRcdFx0XHRcdCF0b3AgPyB2YWwgOiBqUXVlcnkoIHdpbiApLnNjcm9sbExlZnQoKSxcblx0XHRcdFx0XHR0b3AgPyB2YWwgOiBqUXVlcnkoIHdpbiApLnNjcm9sbFRvcCgpXG5cdFx0XHRcdCk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVsZW1bIG1ldGhvZCBdID0gdmFsO1xuXHRcdFx0fVxuXHRcdH0sIG1ldGhvZCwgdmFsLCBhcmd1bWVudHMubGVuZ3RoLCBudWxsICk7XG5cdH07XG59KTtcblxuLy8gQWRkIHRoZSB0b3AvbGVmdCBjc3NIb29rcyB1c2luZyBqUXVlcnkuZm4ucG9zaXRpb25cbi8vIFdlYmtpdCBidWc6IGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0yOTA4NFxuLy8gZ2V0Q29tcHV0ZWRTdHlsZSByZXR1cm5zIHBlcmNlbnQgd2hlbiBzcGVjaWZpZWQgZm9yIHRvcC9sZWZ0L2JvdHRvbS9yaWdodFxuLy8gcmF0aGVyIHRoYW4gbWFrZSB0aGUgY3NzIG1vZHVsZSBkZXBlbmQgb24gdGhlIG9mZnNldCBtb2R1bGUsIHdlIGp1c3QgY2hlY2sgZm9yIGl0IGhlcmVcbmpRdWVyeS5lYWNoKCBbIFwidG9wXCIsIFwibGVmdFwiIF0sIGZ1bmN0aW9uKCBpLCBwcm9wICkge1xuXHRqUXVlcnkuY3NzSG9va3NbIHByb3AgXSA9IGFkZEdldEhvb2tJZiggc3VwcG9ydC5waXhlbFBvc2l0aW9uLFxuXHRcdGZ1bmN0aW9uKCBlbGVtLCBjb21wdXRlZCApIHtcblx0XHRcdGlmICggY29tcHV0ZWQgKSB7XG5cdFx0XHRcdGNvbXB1dGVkID0gY3VyQ1NTKCBlbGVtLCBwcm9wICk7XG5cdFx0XHRcdC8vIGlmIGN1ckNTUyByZXR1cm5zIHBlcmNlbnRhZ2UsIGZhbGxiYWNrIHRvIG9mZnNldFxuXHRcdFx0XHRyZXR1cm4gcm51bW5vbnB4LnRlc3QoIGNvbXB1dGVkICkgP1xuXHRcdFx0XHRcdGpRdWVyeSggZWxlbSApLnBvc2l0aW9uKClbIHByb3AgXSArIFwicHhcIiA6XG5cdFx0XHRcdFx0Y29tcHV0ZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXHQpO1xufSk7XG5cblxuLy8gQ3JlYXRlIGlubmVySGVpZ2h0LCBpbm5lcldpZHRoLCBoZWlnaHQsIHdpZHRoLCBvdXRlckhlaWdodCBhbmQgb3V0ZXJXaWR0aCBtZXRob2RzXG5qUXVlcnkuZWFjaCggeyBIZWlnaHQ6IFwiaGVpZ2h0XCIsIFdpZHRoOiBcIndpZHRoXCIgfSwgZnVuY3Rpb24oIG5hbWUsIHR5cGUgKSB7XG5cdGpRdWVyeS5lYWNoKCB7IHBhZGRpbmc6IFwiaW5uZXJcIiArIG5hbWUsIGNvbnRlbnQ6IHR5cGUsIFwiXCI6IFwib3V0ZXJcIiArIG5hbWUgfSwgZnVuY3Rpb24oIGRlZmF1bHRFeHRyYSwgZnVuY05hbWUgKSB7XG5cdFx0Ly8gbWFyZ2luIGlzIG9ubHkgZm9yIG91dGVySGVpZ2h0LCBvdXRlcldpZHRoXG5cdFx0alF1ZXJ5LmZuWyBmdW5jTmFtZSBdID0gZnVuY3Rpb24oIG1hcmdpbiwgdmFsdWUgKSB7XG5cdFx0XHR2YXIgY2hhaW5hYmxlID0gYXJndW1lbnRzLmxlbmd0aCAmJiAoIGRlZmF1bHRFeHRyYSB8fCB0eXBlb2YgbWFyZ2luICE9PSBcImJvb2xlYW5cIiApLFxuXHRcdFx0XHRleHRyYSA9IGRlZmF1bHRFeHRyYSB8fCAoIG1hcmdpbiA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gdHJ1ZSA/IFwibWFyZ2luXCIgOiBcImJvcmRlclwiICk7XG5cblx0XHRcdHJldHVybiBhY2Nlc3MoIHRoaXMsIGZ1bmN0aW9uKCBlbGVtLCB0eXBlLCB2YWx1ZSApIHtcblx0XHRcdFx0dmFyIGRvYztcblxuXHRcdFx0XHRpZiAoIGpRdWVyeS5pc1dpbmRvdyggZWxlbSApICkge1xuXHRcdFx0XHRcdC8vIEFzIG9mIDUvOC8yMDEyIHRoaXMgd2lsbCB5aWVsZCBpbmNvcnJlY3QgcmVzdWx0cyBmb3IgTW9iaWxlIFNhZmFyaSwgYnV0IHRoZXJlXG5cdFx0XHRcdFx0Ly8gaXNuJ3QgYSB3aG9sZSBsb3Qgd2UgY2FuIGRvLiBTZWUgcHVsbCByZXF1ZXN0IGF0IHRoaXMgVVJMIGZvciBkaXNjdXNzaW9uOlxuXHRcdFx0XHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L3B1bGwvNzY0XG5cdFx0XHRcdFx0cmV0dXJuIGVsZW0uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50WyBcImNsaWVudFwiICsgbmFtZSBdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gR2V0IGRvY3VtZW50IHdpZHRoIG9yIGhlaWdodFxuXHRcdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDkgKSB7XG5cdFx0XHRcdFx0ZG9jID0gZWxlbS5kb2N1bWVudEVsZW1lbnQ7XG5cblx0XHRcdFx0XHQvLyBFaXRoZXIgc2Nyb2xsW1dpZHRoL0hlaWdodF0gb3Igb2Zmc2V0W1dpZHRoL0hlaWdodF0gb3IgY2xpZW50W1dpZHRoL0hlaWdodF0sIHdoaWNoZXZlciBpcyBncmVhdGVzdFxuXHRcdFx0XHRcdC8vIHVuZm9ydHVuYXRlbHksIHRoaXMgY2F1c2VzIGJ1ZyAjMzgzOCBpbiBJRTYvOCBvbmx5LCBidXQgdGhlcmUgaXMgY3VycmVudGx5IG5vIGdvb2QsIHNtYWxsIHdheSB0byBmaXggaXQuXG5cdFx0XHRcdFx0cmV0dXJuIE1hdGgubWF4KFxuXHRcdFx0XHRcdFx0ZWxlbS5ib2R5WyBcInNjcm9sbFwiICsgbmFtZSBdLCBkb2NbIFwic2Nyb2xsXCIgKyBuYW1lIF0sXG5cdFx0XHRcdFx0XHRlbGVtLmJvZHlbIFwib2Zmc2V0XCIgKyBuYW1lIF0sIGRvY1sgXCJvZmZzZXRcIiArIG5hbWUgXSxcblx0XHRcdFx0XHRcdGRvY1sgXCJjbGllbnRcIiArIG5hbWUgXVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IHVuZGVmaW5lZCA/XG5cdFx0XHRcdFx0Ly8gR2V0IHdpZHRoIG9yIGhlaWdodCBvbiB0aGUgZWxlbWVudCwgcmVxdWVzdGluZyBidXQgbm90IGZvcmNpbmcgcGFyc2VGbG9hdFxuXHRcdFx0XHRcdGpRdWVyeS5jc3MoIGVsZW0sIHR5cGUsIGV4dHJhICkgOlxuXG5cdFx0XHRcdFx0Ly8gU2V0IHdpZHRoIG9yIGhlaWdodCBvbiB0aGUgZWxlbWVudFxuXHRcdFx0XHRcdGpRdWVyeS5zdHlsZSggZWxlbSwgdHlwZSwgdmFsdWUsIGV4dHJhICk7XG5cdFx0XHR9LCB0eXBlLCBjaGFpbmFibGUgPyBtYXJnaW4gOiB1bmRlZmluZWQsIGNoYWluYWJsZSwgbnVsbCApO1xuXHRcdH07XG5cdH0pO1xufSk7XG5cblxuLy8gVGhlIG51bWJlciBvZiBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIG1hdGNoZWQgZWxlbWVudCBzZXRcbmpRdWVyeS5mbi5zaXplID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmxlbmd0aDtcbn07XG5cbmpRdWVyeS5mbi5hbmRTZWxmID0galF1ZXJ5LmZuLmFkZEJhY2s7XG5cblxuXG5cbi8vIFJlZ2lzdGVyIGFzIGEgbmFtZWQgQU1EIG1vZHVsZSwgc2luY2UgalF1ZXJ5IGNhbiBiZSBjb25jYXRlbmF0ZWQgd2l0aCBvdGhlclxuLy8gZmlsZXMgdGhhdCBtYXkgdXNlIGRlZmluZSwgYnV0IG5vdCB2aWEgYSBwcm9wZXIgY29uY2F0ZW5hdGlvbiBzY3JpcHQgdGhhdFxuLy8gdW5kZXJzdGFuZHMgYW5vbnltb3VzIEFNRCBtb2R1bGVzLiBBIG5hbWVkIEFNRCBpcyBzYWZlc3QgYW5kIG1vc3Qgcm9idXN0XG4vLyB3YXkgdG8gcmVnaXN0ZXIuIExvd2VyY2FzZSBqcXVlcnkgaXMgdXNlZCBiZWNhdXNlIEFNRCBtb2R1bGUgbmFtZXMgYXJlXG4vLyBkZXJpdmVkIGZyb20gZmlsZSBuYW1lcywgYW5kIGpRdWVyeSBpcyBub3JtYWxseSBkZWxpdmVyZWQgaW4gYSBsb3dlcmNhc2Vcbi8vIGZpbGUgbmFtZS4gRG8gdGhpcyBhZnRlciBjcmVhdGluZyB0aGUgZ2xvYmFsIHNvIHRoYXQgaWYgYW4gQU1EIG1vZHVsZSB3YW50c1xuLy8gdG8gY2FsbCBub0NvbmZsaWN0IHRvIGhpZGUgdGhpcyB2ZXJzaW9uIG9mIGpRdWVyeSwgaXQgd2lsbCB3b3JrLlxuXG4vLyBOb3RlIHRoYXQgZm9yIG1heGltdW0gcG9ydGFiaWxpdHksIGxpYnJhcmllcyB0aGF0IGFyZSBub3QgalF1ZXJ5IHNob3VsZFxuLy8gZGVjbGFyZSB0aGVtc2VsdmVzIGFzIGFub255bW91cyBtb2R1bGVzLCBhbmQgYXZvaWQgc2V0dGluZyBhIGdsb2JhbCBpZiBhblxuLy8gQU1EIGxvYWRlciBpcyBwcmVzZW50LiBqUXVlcnkgaXMgYSBzcGVjaWFsIGNhc2UuIEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qcmJ1cmtlL3JlcXVpcmVqcy93aWtpL1VwZGF0aW5nLWV4aXN0aW5nLWxpYnJhcmllcyN3aWtpLWFub25cblxuaWYgKCB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCApIHtcblx0ZGVmaW5lKCBcImpxdWVyeVwiLCBbXSwgZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGpRdWVyeTtcblx0fSk7XG59XG5cblxuXG5cbnZhclxuXHQvLyBNYXAgb3ZlciBqUXVlcnkgaW4gY2FzZSBvZiBvdmVyd3JpdGVcblx0X2pRdWVyeSA9IHdpbmRvdy5qUXVlcnksXG5cblx0Ly8gTWFwIG92ZXIgdGhlICQgaW4gY2FzZSBvZiBvdmVyd3JpdGVcblx0XyQgPSB3aW5kb3cuJDtcblxualF1ZXJ5Lm5vQ29uZmxpY3QgPSBmdW5jdGlvbiggZGVlcCApIHtcblx0aWYgKCB3aW5kb3cuJCA9PT0galF1ZXJ5ICkge1xuXHRcdHdpbmRvdy4kID0gXyQ7XG5cdH1cblxuXHRpZiAoIGRlZXAgJiYgd2luZG93LmpRdWVyeSA9PT0galF1ZXJ5ICkge1xuXHRcdHdpbmRvdy5qUXVlcnkgPSBfalF1ZXJ5O1xuXHR9XG5cblx0cmV0dXJuIGpRdWVyeTtcbn07XG5cbi8vIEV4cG9zZSBqUXVlcnkgYW5kICQgaWRlbnRpZmllcnMsIGV2ZW4gaW5cbi8vIEFNRCAoIzcxMDIjY29tbWVudDoxMCwgaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvcHVsbC81NTcpXG4vLyBhbmQgQ29tbW9uSlMgZm9yIGJyb3dzZXIgZW11bGF0b3JzICgjMTM1NjYpXG5pZiAoIHR5cGVvZiBub0dsb2JhbCA9PT0gc3RydW5kZWZpbmVkICkge1xuXHR3aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSBqUXVlcnk7XG59XG5cblxuXG5cbnJldHVybiBqUXVlcnk7XG5cbn0pKTtcbiIsIi8qKlxuKiBCb290c3RyYXAgdjMuMC4wIGJ5IEBmYXQgYW5kIEBtZG9cbiogQ29weXJpZ2h0IDIwMTMgVHdpdHRlciBJbmMuXG4qIExpY2Vuc2VkIHVuZGVyIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMC5cbipcbiogRGVzaWduZWQgYW5kIGJ1aWx0IHdpdGggYWxsIHRoZSBsb3ZlIGluIHRoZSB3b3JsZCBieSBAbWRvIGFuZCBAZmF0LlxuKi9cbmlmICghalF1ZXJ5KSB7IHRocm93IG5ldyBFcnJvcihcIkJvb3RzdHJhcCByZXF1aXJlcyBqUXVlcnlcIikgfVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEJvb3RzdHJhcDogdHJhbnNpdGlvbi5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCN0cmFuc2l0aW9uc1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMyBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gQ1NTIFRSQU5TSVRJT04gU1VQUE9SVCAoU2hvdXRvdXQ6IGh0dHA6Ly93d3cubW9kZXJuaXpyLmNvbS8pXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGZ1bmN0aW9uIHRyYW5zaXRpb25FbmQoKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYm9vdHN0cmFwJylcblxuICAgIHZhciB0cmFuc0VuZEV2ZW50TmFtZXMgPSB7XG4gICAgICAnV2Via2l0VHJhbnNpdGlvbicgOiAnd2Via2l0VHJhbnNpdGlvbkVuZCdcbiAgICAsICdNb3pUcmFuc2l0aW9uJyAgICA6ICd0cmFuc2l0aW9uZW5kJ1xuICAgICwgJ09UcmFuc2l0aW9uJyAgICAgIDogJ29UcmFuc2l0aW9uRW5kIG90cmFuc2l0aW9uZW5kJ1xuICAgICwgJ3RyYW5zaXRpb24nICAgICAgIDogJ3RyYW5zaXRpb25lbmQnXG4gICAgfVxuXG4gICAgZm9yICh2YXIgbmFtZSBpbiB0cmFuc0VuZEV2ZW50TmFtZXMpIHtcbiAgICAgIGlmIChlbC5zdHlsZVtuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB7IGVuZDogdHJhbnNFbmRFdmVudE5hbWVzW25hbWVdIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBodHRwOi8vYmxvZy5hbGV4bWFjY2F3LmNvbS9jc3MtdHJhbnNpdGlvbnNcbiAgJC5mbi5lbXVsYXRlVHJhbnNpdGlvbkVuZCA9IGZ1bmN0aW9uIChkdXJhdGlvbikge1xuICAgIHZhciBjYWxsZWQgPSBmYWxzZSwgJGVsID0gdGhpc1xuICAgICQodGhpcykub25lKCQuc3VwcG9ydC50cmFuc2l0aW9uLmVuZCwgZnVuY3Rpb24gKCkgeyBjYWxsZWQgPSB0cnVlIH0pXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkgeyBpZiAoIWNhbGxlZCkgJCgkZWwpLnRyaWdnZXIoJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kKSB9XG4gICAgc2V0VGltZW91dChjYWxsYmFjaywgZHVyYXRpb24pXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gICQoZnVuY3Rpb24gKCkge1xuICAgICQuc3VwcG9ydC50cmFuc2l0aW9uID0gdHJhbnNpdGlvbkVuZCgpXG4gIH0pXG5cbn0od2luZG93LmpRdWVyeSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQm9vdHN0cmFwOiBhbGVydC5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNhbGVydHNcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29weXJpZ2h0IDIwMTMgVHdpdHRlciwgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cblxuK2Z1bmN0aW9uICgkKSB7IFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIEFMRVJUIENMQVNTIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBkaXNtaXNzID0gJ1tkYXRhLWRpc21pc3M9XCJhbGVydFwiXSdcbiAgdmFyIEFsZXJ0ICAgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICAkKGVsKS5vbignY2xpY2snLCBkaXNtaXNzLCB0aGlzLmNsb3NlKVxuICB9XG5cbiAgQWxlcnQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgJHRoaXMgICAgPSAkKHRoaXMpXG4gICAgdmFyIHNlbGVjdG9yID0gJHRoaXMuYXR0cignZGF0YS10YXJnZXQnKVxuXG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgc2VsZWN0b3IgPSAkdGhpcy5hdHRyKCdocmVmJylcbiAgICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgJiYgc2VsZWN0b3IucmVwbGFjZSgvLiooPz0jW15cXHNdKiQpLywgJycpIC8vIHN0cmlwIGZvciBpZTdcbiAgICB9XG5cbiAgICB2YXIgJHBhcmVudCA9ICQoc2VsZWN0b3IpXG5cbiAgICBpZiAoZSkgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiAoISRwYXJlbnQubGVuZ3RoKSB7XG4gICAgICAkcGFyZW50ID0gJHRoaXMuaGFzQ2xhc3MoJ2FsZXJ0JykgPyAkdGhpcyA6ICR0aGlzLnBhcmVudCgpXG4gICAgfVxuXG4gICAgJHBhcmVudC50cmlnZ2VyKGUgPSAkLkV2ZW50KCdjbG9zZS5icy5hbGVydCcpKVxuXG4gICAgaWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuXG4gICAgJHBhcmVudC5yZW1vdmVDbGFzcygnaW4nKVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlRWxlbWVudCgpIHtcbiAgICAgICRwYXJlbnQudHJpZ2dlcignY2xvc2VkLmJzLmFsZXJ0JykucmVtb3ZlKClcbiAgICB9XG5cbiAgICAkLnN1cHBvcnQudHJhbnNpdGlvbiAmJiAkcGFyZW50Lmhhc0NsYXNzKCdmYWRlJykgP1xuICAgICAgJHBhcmVudFxuICAgICAgICAub25lKCQuc3VwcG9ydC50cmFuc2l0aW9uLmVuZCwgcmVtb3ZlRWxlbWVudClcbiAgICAgICAgLmVtdWxhdGVUcmFuc2l0aW9uRW5kKDE1MCkgOlxuICAgICAgcmVtb3ZlRWxlbWVudCgpXG4gIH1cblxuXG4gIC8vIEFMRVJUIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIG9sZCA9ICQuZm4uYWxlcnRcblxuICAkLmZuLmFsZXJ0ID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzID0gJCh0aGlzKVxuICAgICAgdmFyIGRhdGEgID0gJHRoaXMuZGF0YSgnYnMuYWxlcnQnKVxuXG4gICAgICBpZiAoIWRhdGEpICR0aGlzLmRhdGEoJ2JzLmFsZXJ0JywgKGRhdGEgPSBuZXcgQWxlcnQodGhpcykpKVxuICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT0gJ3N0cmluZycpIGRhdGFbb3B0aW9uXS5jYWxsKCR0aGlzKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLmFsZXJ0LkNvbnN0cnVjdG9yID0gQWxlcnRcblxuXG4gIC8vIEFMRVJUIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi5hbGVydC5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4uYWxlcnQgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBBTEVSVCBEQVRBLUFQSVxuICAvLyA9PT09PT09PT09PT09PVxuXG4gICQoZG9jdW1lbnQpLm9uKCdjbGljay5icy5hbGVydC5kYXRhLWFwaScsIGRpc21pc3MsIEFsZXJ0LnByb3RvdHlwZS5jbG9zZSlcblxufSh3aW5kb3cualF1ZXJ5KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBCb290c3RyYXA6IGJ1dHRvbi5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNidXR0b25zXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvcHlyaWdodCAyMDEzIFR3aXR0ZXIsIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5cbitmdW5jdGlvbiAoJCkgeyBcInVzZSBzdHJpY3RcIjtcblxuICAvLyBCVVRUT04gUFVCTElDIENMQVNTIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIEJ1dHRvbiA9IGZ1bmN0aW9uIChlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudClcbiAgICB0aGlzLm9wdGlvbnMgID0gJC5leHRlbmQoe30sIEJ1dHRvbi5ERUZBVUxUUywgb3B0aW9ucylcbiAgfVxuXG4gIEJ1dHRvbi5ERUZBVUxUUyA9IHtcbiAgICBsb2FkaW5nVGV4dDogJ2xvYWRpbmcuLi4nXG4gIH1cblxuICBCdXR0b24ucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgdmFyIGQgICAgPSAnZGlzYWJsZWQnXG4gICAgdmFyICRlbCAgPSB0aGlzLiRlbGVtZW50XG4gICAgdmFyIHZhbCAgPSAkZWwuaXMoJ2lucHV0JykgPyAndmFsJyA6ICdodG1sJ1xuICAgIHZhciBkYXRhID0gJGVsLmRhdGEoKVxuXG4gICAgc3RhdGUgPSBzdGF0ZSArICdUZXh0J1xuXG4gICAgaWYgKCFkYXRhLnJlc2V0VGV4dCkgJGVsLmRhdGEoJ3Jlc2V0VGV4dCcsICRlbFt2YWxdKCkpXG5cbiAgICAkZWxbdmFsXShkYXRhW3N0YXRlXSB8fCB0aGlzLm9wdGlvbnNbc3RhdGVdKVxuXG4gICAgLy8gcHVzaCB0byBldmVudCBsb29wIHRvIGFsbG93IGZvcm1zIHRvIHN1Ym1pdFxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgc3RhdGUgPT0gJ2xvYWRpbmdUZXh0JyA/XG4gICAgICAgICRlbC5hZGRDbGFzcyhkKS5hdHRyKGQsIGQpIDpcbiAgICAgICAgJGVsLnJlbW92ZUNsYXNzKGQpLnJlbW92ZUF0dHIoZCk7XG4gICAgfSwgMClcbiAgfVxuXG4gIEJ1dHRvbi5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciAkcGFyZW50ID0gdGhpcy4kZWxlbWVudC5jbG9zZXN0KCdbZGF0YS10b2dnbGU9XCJidXR0b25zXCJdJylcblxuICAgIGlmICgkcGFyZW50Lmxlbmd0aCkge1xuICAgICAgdmFyICRpbnB1dCA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW5wdXQnKVxuICAgICAgICAucHJvcCgnY2hlY2tlZCcsICF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdhY3RpdmUnKSlcbiAgICAgICAgLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICBpZiAoJGlucHV0LnByb3AoJ3R5cGUnKSA9PT0gJ3JhZGlvJykgJHBhcmVudC5maW5kKCcuYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC50b2dnbGVDbGFzcygnYWN0aXZlJylcbiAgfVxuXG5cbiAgLy8gQlVUVE9OIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBvbGQgPSAkLmZuLmJ1dHRvblxuXG4gICQuZm4uYnV0dG9uID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSAgICA9ICR0aGlzLmRhdGEoJ2JzLmJ1dHRvbicpXG4gICAgICB2YXIgb3B0aW9ucyA9IHR5cGVvZiBvcHRpb24gPT0gJ29iamVjdCcgJiYgb3B0aW9uXG5cbiAgICAgIGlmICghZGF0YSkgJHRoaXMuZGF0YSgnYnMuYnV0dG9uJywgKGRhdGEgPSBuZXcgQnV0dG9uKHRoaXMsIG9wdGlvbnMpKSlcblxuICAgICAgaWYgKG9wdGlvbiA9PSAndG9nZ2xlJykgZGF0YS50b2dnbGUoKVxuICAgICAgZWxzZSBpZiAob3B0aW9uKSBkYXRhLnNldFN0YXRlKG9wdGlvbilcbiAgICB9KVxuICB9XG5cbiAgJC5mbi5idXR0b24uQ29uc3RydWN0b3IgPSBCdXR0b25cblxuXG4gIC8vIEJVVFRPTiBOTyBDT05GTElDVFxuICAvLyA9PT09PT09PT09PT09PT09PT1cblxuICAkLmZuLmJ1dHRvbi5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4uYnV0dG9uID0gb2xkXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG5cbiAgLy8gQlVUVE9OIERBVEEtQVBJXG4gIC8vID09PT09PT09PT09PT09PVxuXG4gICQoZG9jdW1lbnQpLm9uKCdjbGljay5icy5idXR0b24uZGF0YS1hcGknLCAnW2RhdGEtdG9nZ2xlXj1idXR0b25dJywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgJGJ0biA9ICQoZS50YXJnZXQpXG4gICAgaWYgKCEkYnRuLmhhc0NsYXNzKCdidG4nKSkgJGJ0biA9ICRidG4uY2xvc2VzdCgnLmJ0bicpXG4gICAgJGJ0bi5idXR0b24oJ3RvZ2dsZScpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG5cbn0od2luZG93LmpRdWVyeSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQm9vdHN0cmFwOiBjYXJvdXNlbC5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNjYXJvdXNlbFxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMiBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gQ0FST1VTRUwgQ0xBU1MgREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIENhcm91c2VsID0gZnVuY3Rpb24gKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ICAgID0gJChlbGVtZW50KVxuICAgIHRoaXMuJGluZGljYXRvcnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5jYXJvdXNlbC1pbmRpY2F0b3JzJylcbiAgICB0aGlzLm9wdGlvbnMgICAgID0gb3B0aW9uc1xuICAgIHRoaXMucGF1c2VkICAgICAgPVxuICAgIHRoaXMuc2xpZGluZyAgICAgPVxuICAgIHRoaXMuaW50ZXJ2YWwgICAgPVxuICAgIHRoaXMuJGFjdGl2ZSAgICAgPVxuICAgIHRoaXMuJGl0ZW1zICAgICAgPSBudWxsXG5cbiAgICB0aGlzLm9wdGlvbnMucGF1c2UgPT0gJ2hvdmVyJyAmJiB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ21vdXNlZW50ZXInLCAkLnByb3h5KHRoaXMucGF1c2UsIHRoaXMpKVxuICAgICAgLm9uKCdtb3VzZWxlYXZlJywgJC5wcm94eSh0aGlzLmN5Y2xlLCB0aGlzKSlcbiAgfVxuXG4gIENhcm91c2VsLkRFRkFVTFRTID0ge1xuICAgIGludGVydmFsOiA1MDAwXG4gICwgcGF1c2U6ICdob3ZlcidcbiAgLCB3cmFwOiB0cnVlXG4gIH1cblxuICBDYXJvdXNlbC5wcm90b3R5cGUuY3ljbGUgPSAgZnVuY3Rpb24gKGUpIHtcbiAgICBlIHx8ICh0aGlzLnBhdXNlZCA9IGZhbHNlKVxuXG4gICAgdGhpcy5pbnRlcnZhbCAmJiBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpXG5cbiAgICB0aGlzLm9wdGlvbnMuaW50ZXJ2YWxcbiAgICAgICYmICF0aGlzLnBhdXNlZFxuICAgICAgJiYgKHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgkLnByb3h5KHRoaXMubmV4dCwgdGhpcyksIHRoaXMub3B0aW9ucy5pbnRlcnZhbCkpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgQ2Fyb3VzZWwucHJvdG90eXBlLmdldEFjdGl2ZUluZGV4ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJGFjdGl2ZSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLml0ZW0uYWN0aXZlJylcbiAgICB0aGlzLiRpdGVtcyAgPSB0aGlzLiRhY3RpdmUucGFyZW50KCkuY2hpbGRyZW4oKVxuXG4gICAgcmV0dXJuIHRoaXMuJGl0ZW1zLmluZGV4KHRoaXMuJGFjdGl2ZSlcbiAgfVxuXG4gIENhcm91c2VsLnByb3RvdHlwZS50byA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICB2YXIgdGhhdCAgICAgICAgPSB0aGlzXG4gICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5nZXRBY3RpdmVJbmRleCgpXG5cbiAgICBpZiAocG9zID4gKHRoaXMuJGl0ZW1zLmxlbmd0aCAtIDEpIHx8IHBvcyA8IDApIHJldHVyblxuXG4gICAgaWYgKHRoaXMuc2xpZGluZykgICAgICAgcmV0dXJuIHRoaXMuJGVsZW1lbnQub25lKCdzbGlkJywgZnVuY3Rpb24gKCkgeyB0aGF0LnRvKHBvcykgfSlcbiAgICBpZiAoYWN0aXZlSW5kZXggPT0gcG9zKSByZXR1cm4gdGhpcy5wYXVzZSgpLmN5Y2xlKClcblxuICAgIHJldHVybiB0aGlzLnNsaWRlKHBvcyA+IGFjdGl2ZUluZGV4ID8gJ25leHQnIDogJ3ByZXYnLCAkKHRoaXMuJGl0ZW1zW3Bvc10pKVxuICB9XG5cbiAgQ2Fyb3VzZWwucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBlIHx8ICh0aGlzLnBhdXNlZCA9IHRydWUpXG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5maW5kKCcubmV4dCwgLnByZXYnKS5sZW5ndGggJiYgJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kKSB7XG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kKVxuICAgICAgdGhpcy5jeWNsZSh0cnVlKVxuICAgIH1cblxuICAgIHRoaXMuaW50ZXJ2YWwgPSBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgQ2Fyb3VzZWwucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc2xpZGluZykgcmV0dXJuXG4gICAgcmV0dXJuIHRoaXMuc2xpZGUoJ25leHQnKVxuICB9XG5cbiAgQ2Fyb3VzZWwucHJvdG90eXBlLnByZXYgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuc2xpZGluZykgcmV0dXJuXG4gICAgcmV0dXJuIHRoaXMuc2xpZGUoJ3ByZXYnKVxuICB9XG5cbiAgQ2Fyb3VzZWwucHJvdG90eXBlLnNsaWRlID0gZnVuY3Rpb24gKHR5cGUsIG5leHQpIHtcbiAgICB2YXIgJGFjdGl2ZSAgID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXRlbS5hY3RpdmUnKVxuICAgIHZhciAkbmV4dCAgICAgPSBuZXh0IHx8ICRhY3RpdmVbdHlwZV0oKVxuICAgIHZhciBpc0N5Y2xpbmcgPSB0aGlzLmludGVydmFsXG4gICAgdmFyIGRpcmVjdGlvbiA9IHR5cGUgPT0gJ25leHQnID8gJ2xlZnQnIDogJ3JpZ2h0J1xuICAgIHZhciBmYWxsYmFjayAgPSB0eXBlID09ICduZXh0JyA/ICdmaXJzdCcgOiAnbGFzdCdcbiAgICB2YXIgdGhhdCAgICAgID0gdGhpc1xuXG4gICAgaWYgKCEkbmV4dC5sZW5ndGgpIHtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLndyYXApIHJldHVyblxuICAgICAgJG5leHQgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pdGVtJylbZmFsbGJhY2tdKClcbiAgICB9XG5cbiAgICB0aGlzLnNsaWRpbmcgPSB0cnVlXG5cbiAgICBpc0N5Y2xpbmcgJiYgdGhpcy5wYXVzZSgpXG5cbiAgICB2YXIgZSA9ICQuRXZlbnQoJ3NsaWRlLmJzLmNhcm91c2VsJywgeyByZWxhdGVkVGFyZ2V0OiAkbmV4dFswXSwgZGlyZWN0aW9uOiBkaXJlY3Rpb24gfSlcblxuICAgIGlmICgkbmV4dC5oYXNDbGFzcygnYWN0aXZlJykpIHJldHVyblxuXG4gICAgaWYgKHRoaXMuJGluZGljYXRvcnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRpbmRpY2F0b3JzLmZpbmQoJy5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgIHRoaXMuJGVsZW1lbnQub25lKCdzbGlkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJG5leHRJbmRpY2F0b3IgPSAkKHRoYXQuJGluZGljYXRvcnMuY2hpbGRyZW4oKVt0aGF0LmdldEFjdGl2ZUluZGV4KCldKVxuICAgICAgICAkbmV4dEluZGljYXRvciAmJiAkbmV4dEluZGljYXRvci5hZGRDbGFzcygnYWN0aXZlJylcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKCQuc3VwcG9ydC50cmFuc2l0aW9uICYmIHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3NsaWRlJykpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcihlKVxuICAgICAgaWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuICAgICAgJG5leHQuYWRkQ2xhc3ModHlwZSlcbiAgICAgICRuZXh0WzBdLm9mZnNldFdpZHRoIC8vIGZvcmNlIHJlZmxvd1xuICAgICAgJGFjdGl2ZS5hZGRDbGFzcyhkaXJlY3Rpb24pXG4gICAgICAkbmV4dC5hZGRDbGFzcyhkaXJlY3Rpb24pXG4gICAgICAkYWN0aXZlXG4gICAgICAgIC5vbmUoJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJG5leHQucmVtb3ZlQ2xhc3MoW3R5cGUsIGRpcmVjdGlvbl0uam9pbignICcpKS5hZGRDbGFzcygnYWN0aXZlJylcbiAgICAgICAgICAkYWN0aXZlLnJlbW92ZUNsYXNzKFsnYWN0aXZlJywgZGlyZWN0aW9uXS5qb2luKCcgJykpXG4gICAgICAgICAgdGhhdC5zbGlkaW5nID0gZmFsc2VcbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgdGhhdC4kZWxlbWVudC50cmlnZ2VyKCdzbGlkJykgfSwgMClcbiAgICAgICAgfSlcbiAgICAgICAgLmVtdWxhdGVUcmFuc2l0aW9uRW5kKDYwMClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKGUpXG4gICAgICBpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkgcmV0dXJuXG4gICAgICAkYWN0aXZlLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgJG5leHQuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICB0aGlzLnNsaWRpbmcgPSBmYWxzZVxuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkJylcbiAgICB9XG5cbiAgICBpc0N5Y2xpbmcgJiYgdGhpcy5jeWNsZSgpXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBDQVJPVVNFTCBQTFVHSU4gREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBvbGQgPSAkLmZuLmNhcm91c2VsXG5cbiAgJC5mbi5jYXJvdXNlbCA9IGZ1bmN0aW9uIChvcHRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhpcyAgID0gJCh0aGlzKVxuICAgICAgdmFyIGRhdGEgICAgPSAkdGhpcy5kYXRhKCdicy5jYXJvdXNlbCcpXG4gICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBDYXJvdXNlbC5ERUZBVUxUUywgJHRoaXMuZGF0YSgpLCB0eXBlb2Ygb3B0aW9uID09ICdvYmplY3QnICYmIG9wdGlvbilcbiAgICAgIHZhciBhY3Rpb24gID0gdHlwZW9mIG9wdGlvbiA9PSAnc3RyaW5nJyA/IG9wdGlvbiA6IG9wdGlvbnMuc2xpZGVcblxuICAgICAgaWYgKCFkYXRhKSAkdGhpcy5kYXRhKCdicy5jYXJvdXNlbCcsIChkYXRhID0gbmV3IENhcm91c2VsKHRoaXMsIG9wdGlvbnMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdudW1iZXInKSBkYXRhLnRvKG9wdGlvbilcbiAgICAgIGVsc2UgaWYgKGFjdGlvbikgZGF0YVthY3Rpb25dKClcbiAgICAgIGVsc2UgaWYgKG9wdGlvbnMuaW50ZXJ2YWwpIGRhdGEucGF1c2UoKS5jeWNsZSgpXG4gICAgfSlcbiAgfVxuXG4gICQuZm4uY2Fyb3VzZWwuQ29uc3RydWN0b3IgPSBDYXJvdXNlbFxuXG5cbiAgLy8gQ0FST1VTRUwgTk8gQ09ORkxJQ1RcbiAgLy8gPT09PT09PT09PT09PT09PT09PT1cblxuICAkLmZuLmNhcm91c2VsLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbi5jYXJvdXNlbCA9IG9sZFxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuXG4gIC8vIENBUk9VU0VMIERBVEEtQVBJXG4gIC8vID09PT09PT09PT09PT09PT09XG5cbiAgJChkb2N1bWVudCkub24oJ2NsaWNrLmJzLmNhcm91c2VsLmRhdGEtYXBpJywgJ1tkYXRhLXNsaWRlXSwgW2RhdGEtc2xpZGUtdG9dJywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgJHRoaXMgICA9ICQodGhpcyksIGhyZWZcbiAgICB2YXIgJHRhcmdldCA9ICQoJHRoaXMuYXR0cignZGF0YS10YXJnZXQnKSB8fCAoaHJlZiA9ICR0aGlzLmF0dHIoJ2hyZWYnKSkgJiYgaHJlZi5yZXBsYWNlKC8uKig/PSNbXlxcc10rJCkvLCAnJykpIC8vc3RyaXAgZm9yIGllN1xuICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQoe30sICR0YXJnZXQuZGF0YSgpLCAkdGhpcy5kYXRhKCkpXG4gICAgdmFyIHNsaWRlSW5kZXggPSAkdGhpcy5hdHRyKCdkYXRhLXNsaWRlLXRvJylcbiAgICBpZiAoc2xpZGVJbmRleCkgb3B0aW9ucy5pbnRlcnZhbCA9IGZhbHNlXG5cbiAgICAkdGFyZ2V0LmNhcm91c2VsKG9wdGlvbnMpXG5cbiAgICBpZiAoc2xpZGVJbmRleCA9ICR0aGlzLmF0dHIoJ2RhdGEtc2xpZGUtdG8nKSkge1xuICAgICAgJHRhcmdldC5kYXRhKCdicy5jYXJvdXNlbCcpLnRvKHNsaWRlSW5kZXgpXG4gICAgfVxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIH0pXG5cbiAgJCh3aW5kb3cpLm9uKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICQoJ1tkYXRhLXJpZGU9XCJjYXJvdXNlbFwiXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRjYXJvdXNlbCA9ICQodGhpcylcbiAgICAgICRjYXJvdXNlbC5jYXJvdXNlbCgkY2Fyb3VzZWwuZGF0YSgpKVxuICAgIH0pXG4gIH0pXG5cbn0od2luZG93LmpRdWVyeSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQm9vdHN0cmFwOiBjb2xsYXBzZS5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNjb2xsYXBzZVxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMiBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gQ09MTEFQU0UgUFVCTElDIENMQVNTIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICB2YXIgQ29sbGFwc2UgPSBmdW5jdGlvbiAoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgICAgICA9ICQoZWxlbWVudClcbiAgICB0aGlzLm9wdGlvbnMgICAgICAgPSAkLmV4dGVuZCh7fSwgQ29sbGFwc2UuREVGQVVMVFMsIG9wdGlvbnMpXG4gICAgdGhpcy50cmFuc2l0aW9uaW5nID0gbnVsbFxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wYXJlbnQpIHRoaXMuJHBhcmVudCA9ICQodGhpcy5vcHRpb25zLnBhcmVudClcbiAgICBpZiAodGhpcy5vcHRpb25zLnRvZ2dsZSkgdGhpcy50b2dnbGUoKVxuICB9XG5cbiAgQ29sbGFwc2UuREVGQVVMVFMgPSB7XG4gICAgdG9nZ2xlOiB0cnVlXG4gIH1cblxuICBDb2xsYXBzZS5wcm90b3R5cGUuZGltZW5zaW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBoYXNXaWR0aCA9IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ3dpZHRoJylcbiAgICByZXR1cm4gaGFzV2lkdGggPyAnd2lkdGgnIDogJ2hlaWdodCdcbiAgfVxuXG4gIENvbGxhcHNlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnRyYW5zaXRpb25pbmcgfHwgdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaW4nKSkgcmV0dXJuXG5cbiAgICB2YXIgc3RhcnRFdmVudCA9ICQuRXZlbnQoJ3Nob3cuYnMuY29sbGFwc2UnKVxuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcihzdGFydEV2ZW50KVxuICAgIGlmIChzdGFydEV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSByZXR1cm5cblxuICAgIHZhciBhY3RpdmVzID0gdGhpcy4kcGFyZW50ICYmIHRoaXMuJHBhcmVudC5maW5kKCc+IC5wYW5lbCA+IC5pbicpXG5cbiAgICBpZiAoYWN0aXZlcyAmJiBhY3RpdmVzLmxlbmd0aCkge1xuICAgICAgdmFyIGhhc0RhdGEgPSBhY3RpdmVzLmRhdGEoJ2JzLmNvbGxhcHNlJylcbiAgICAgIGlmIChoYXNEYXRhICYmIGhhc0RhdGEudHJhbnNpdGlvbmluZykgcmV0dXJuXG4gICAgICBhY3RpdmVzLmNvbGxhcHNlKCdoaWRlJylcbiAgICAgIGhhc0RhdGEgfHwgYWN0aXZlcy5kYXRhKCdicy5jb2xsYXBzZScsIG51bGwpXG4gICAgfVxuXG4gICAgdmFyIGRpbWVuc2lvbiA9IHRoaXMuZGltZW5zaW9uKClcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5yZW1vdmVDbGFzcygnY29sbGFwc2UnKVxuICAgICAgLmFkZENsYXNzKCdjb2xsYXBzaW5nJylcbiAgICAgIFtkaW1lbnNpb25dKDApXG5cbiAgICB0aGlzLnRyYW5zaXRpb25pbmcgPSAxXG5cbiAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC5yZW1vdmVDbGFzcygnY29sbGFwc2luZycpXG4gICAgICAgIC5hZGRDbGFzcygnaW4nKVxuICAgICAgICBbZGltZW5zaW9uXSgnYXV0bycpXG4gICAgICB0aGlzLnRyYW5zaXRpb25pbmcgPSAwXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3duLmJzLmNvbGxhcHNlJylcbiAgICB9XG5cbiAgICBpZiAoISQuc3VwcG9ydC50cmFuc2l0aW9uKSByZXR1cm4gY29tcGxldGUuY2FsbCh0aGlzKVxuXG4gICAgdmFyIHNjcm9sbFNpemUgPSAkLmNhbWVsQ2FzZShbJ3Njcm9sbCcsIGRpbWVuc2lvbl0uam9pbignLScpKVxuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsICQucHJveHkoY29tcGxldGUsIHRoaXMpKVxuICAgICAgLmVtdWxhdGVUcmFuc2l0aW9uRW5kKDM1MClcbiAgICAgIFtkaW1lbnNpb25dKHRoaXMuJGVsZW1lbnRbMF1bc2Nyb2xsU2l6ZV0pXG4gIH1cblxuICBDb2xsYXBzZS5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy50cmFuc2l0aW9uaW5nIHx8ICF0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpbicpKSByZXR1cm5cblxuICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudCgnaGlkZS5icy5jb2xsYXBzZScpXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKHN0YXJ0RXZlbnQpXG4gICAgaWYgKHN0YXJ0RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuXG4gICAgdmFyIGRpbWVuc2lvbiA9IHRoaXMuZGltZW5zaW9uKClcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIFtkaW1lbnNpb25dKHRoaXMuJGVsZW1lbnRbZGltZW5zaW9uXSgpKVxuICAgICAgWzBdLm9mZnNldEhlaWdodFxuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLmFkZENsYXNzKCdjb2xsYXBzaW5nJylcbiAgICAgIC5yZW1vdmVDbGFzcygnY29sbGFwc2UnKVxuICAgICAgLnJlbW92ZUNsYXNzKCdpbicpXG5cbiAgICB0aGlzLnRyYW5zaXRpb25pbmcgPSAxXG5cbiAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnRyYW5zaXRpb25pbmcgPSAwXG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC50cmlnZ2VyKCdoaWRkZW4uYnMuY29sbGFwc2UnKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2NvbGxhcHNpbmcnKVxuICAgICAgICAuYWRkQ2xhc3MoJ2NvbGxhcHNlJylcbiAgICB9XG5cbiAgICBpZiAoISQuc3VwcG9ydC50cmFuc2l0aW9uKSByZXR1cm4gY29tcGxldGUuY2FsbCh0aGlzKVxuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgW2RpbWVuc2lvbl0oMClcbiAgICAgIC5vbmUoJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kLCAkLnByb3h5KGNvbXBsZXRlLCB0aGlzKSlcbiAgICAgIC5lbXVsYXRlVHJhbnNpdGlvbkVuZCgzNTApXG4gIH1cblxuICBDb2xsYXBzZS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXNbdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaW4nKSA/ICdoaWRlJyA6ICdzaG93J10oKVxuICB9XG5cblxuICAvLyBDT0xMQVBTRSBQTFVHSU4gREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBvbGQgPSAkLmZuLmNvbGxhcHNlXG5cbiAgJC5mbi5jb2xsYXBzZSA9IGZ1bmN0aW9uIChvcHRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhpcyAgID0gJCh0aGlzKVxuICAgICAgdmFyIGRhdGEgICAgPSAkdGhpcy5kYXRhKCdicy5jb2xsYXBzZScpXG4gICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBDb2xsYXBzZS5ERUZBVUxUUywgJHRoaXMuZGF0YSgpLCB0eXBlb2Ygb3B0aW9uID09ICdvYmplY3QnICYmIG9wdGlvbilcblxuICAgICAgaWYgKCFkYXRhKSAkdGhpcy5kYXRhKCdicy5jb2xsYXBzZScsIChkYXRhID0gbmV3IENvbGxhcHNlKHRoaXMsIG9wdGlvbnMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdzdHJpbmcnKSBkYXRhW29wdGlvbl0oKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLmNvbGxhcHNlLkNvbnN0cnVjdG9yID0gQ29sbGFwc2VcblxuXG4gIC8vIENPTExBUFNFIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi5jb2xsYXBzZS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4uY29sbGFwc2UgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBDT0xMQVBTRSBEQVRBLUFQSVxuICAvLyA9PT09PT09PT09PT09PT09PVxuXG4gICQoZG9jdW1lbnQpLm9uKCdjbGljay5icy5jb2xsYXBzZS5kYXRhLWFwaScsICdbZGF0YS10b2dnbGU9Y29sbGFwc2VdJywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgJHRoaXMgICA9ICQodGhpcyksIGhyZWZcbiAgICB2YXIgdGFyZ2V0ICA9ICR0aGlzLmF0dHIoJ2RhdGEtdGFyZ2V0JylcbiAgICAgICAgfHwgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHx8IChocmVmID0gJHRoaXMuYXR0cignaHJlZicpKSAmJiBocmVmLnJlcGxhY2UoLy4qKD89I1teXFxzXSskKS8sICcnKSAvL3N0cmlwIGZvciBpZTdcbiAgICB2YXIgJHRhcmdldCA9ICQodGFyZ2V0KVxuICAgIHZhciBkYXRhICAgID0gJHRhcmdldC5kYXRhKCdicy5jb2xsYXBzZScpXG4gICAgdmFyIG9wdGlvbiAgPSBkYXRhID8gJ3RvZ2dsZScgOiAkdGhpcy5kYXRhKClcbiAgICB2YXIgcGFyZW50ICA9ICR0aGlzLmF0dHIoJ2RhdGEtcGFyZW50JylcbiAgICB2YXIgJHBhcmVudCA9IHBhcmVudCAmJiAkKHBhcmVudClcblxuICAgIGlmICghZGF0YSB8fCAhZGF0YS50cmFuc2l0aW9uaW5nKSB7XG4gICAgICBpZiAoJHBhcmVudCkgJHBhcmVudC5maW5kKCdbZGF0YS10b2dnbGU9Y29sbGFwc2VdW2RhdGEtcGFyZW50PVwiJyArIHBhcmVudCArICdcIl0nKS5ub3QoJHRoaXMpLmFkZENsYXNzKCdjb2xsYXBzZWQnKVxuICAgICAgJHRoaXNbJHRhcmdldC5oYXNDbGFzcygnaW4nKSA/ICdhZGRDbGFzcycgOiAncmVtb3ZlQ2xhc3MnXSgnY29sbGFwc2VkJylcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmNvbGxhcHNlKG9wdGlvbilcbiAgfSlcblxufSh3aW5kb3cualF1ZXJ5KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBCb290c3RyYXA6IGRyb3Bkb3duLmpzIHYzLjAuMFxuICogaHR0cDovL3R3YnMuZ2l0aHViLmNvbS9ib290c3RyYXAvamF2YXNjcmlwdC5odG1sI2Ryb3Bkb3duc1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMiBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gRFJPUERPV04gQ0xBU1MgREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIGJhY2tkcm9wID0gJy5kcm9wZG93bi1iYWNrZHJvcCdcbiAgdmFyIHRvZ2dsZSAgID0gJ1tkYXRhLXRvZ2dsZT1kcm9wZG93bl0nXG4gIHZhciBEcm9wZG93biA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdmFyICRlbCA9ICQoZWxlbWVudCkub24oJ2NsaWNrLmJzLmRyb3Bkb3duJywgdGhpcy50b2dnbGUpXG4gIH1cblxuICBEcm9wZG93bi5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgJHRoaXMgPSAkKHRoaXMpXG5cbiAgICBpZiAoJHRoaXMuaXMoJy5kaXNhYmxlZCwgOmRpc2FibGVkJykpIHJldHVyblxuXG4gICAgdmFyICRwYXJlbnQgID0gZ2V0UGFyZW50KCR0aGlzKVxuICAgIHZhciBpc0FjdGl2ZSA9ICRwYXJlbnQuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgY2xlYXJNZW51cygpXG5cbiAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmICEkcGFyZW50LmNsb3Nlc3QoJy5uYXZiYXItbmF2JykubGVuZ3RoKSB7XG4gICAgICAgIC8vIGlmIG1vYmlsZSB3ZSB3ZSB1c2UgYSBiYWNrZHJvcCBiZWNhdXNlIGNsaWNrIGV2ZW50cyBkb24ndCBkZWxlZ2F0ZVxuICAgICAgICAkKCc8ZGl2IGNsYXNzPVwiZHJvcGRvd24tYmFja2Ryb3BcIi8+JykuaW5zZXJ0QWZ0ZXIoJCh0aGlzKSkub24oJ2NsaWNrJywgY2xlYXJNZW51cylcbiAgICAgIH1cblxuICAgICAgJHBhcmVudC50cmlnZ2VyKGUgPSAkLkV2ZW50KCdzaG93LmJzLmRyb3Bkb3duJykpXG5cbiAgICAgIGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpKSByZXR1cm5cblxuICAgICAgJHBhcmVudFxuICAgICAgICAudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuICAgICAgICAudHJpZ2dlcignc2hvd24uYnMuZHJvcGRvd24nKVxuXG4gICAgICAkdGhpcy5mb2N1cygpXG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBEcm9wZG93bi5wcm90b3R5cGUua2V5ZG93biA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKCEvKDM4fDQwfDI3KS8udGVzdChlLmtleUNvZGUpKSByZXR1cm5cblxuICAgIHZhciAkdGhpcyA9ICQodGhpcylcblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcblxuICAgIGlmICgkdGhpcy5pcygnLmRpc2FibGVkLCA6ZGlzYWJsZWQnKSkgcmV0dXJuXG5cbiAgICB2YXIgJHBhcmVudCAgPSBnZXRQYXJlbnQoJHRoaXMpXG4gICAgdmFyIGlzQWN0aXZlID0gJHBhcmVudC5oYXNDbGFzcygnb3BlbicpXG5cbiAgICBpZiAoIWlzQWN0aXZlIHx8IChpc0FjdGl2ZSAmJiBlLmtleUNvZGUgPT0gMjcpKSB7XG4gICAgICBpZiAoZS53aGljaCA9PSAyNykgJHBhcmVudC5maW5kKHRvZ2dsZSkuZm9jdXMoKVxuICAgICAgcmV0dXJuICR0aGlzLmNsaWNrKClcbiAgICB9XG5cbiAgICB2YXIgJGl0ZW1zID0gJCgnW3JvbGU9bWVudV0gbGk6bm90KC5kaXZpZGVyKTp2aXNpYmxlIGEnLCAkcGFyZW50KVxuXG4gICAgaWYgKCEkaXRlbXMubGVuZ3RoKSByZXR1cm5cblxuICAgIHZhciBpbmRleCA9ICRpdGVtcy5pbmRleCgkaXRlbXMuZmlsdGVyKCc6Zm9jdXMnKSlcblxuICAgIGlmIChlLmtleUNvZGUgPT0gMzggJiYgaW5kZXggPiAwKSAgICAgICAgICAgICAgICAgaW5kZXgtLSAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwXG4gICAgaWYgKGUua2V5Q29kZSA9PSA0MCAmJiBpbmRleCA8ICRpdGVtcy5sZW5ndGggLSAxKSBpbmRleCsrICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG93blxuICAgIGlmICghfmluZGV4KSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg9MFxuXG4gICAgJGl0ZW1zLmVxKGluZGV4KS5mb2N1cygpXG4gIH1cblxuICBmdW5jdGlvbiBjbGVhck1lbnVzKCkge1xuICAgICQoYmFja2Ryb3ApLnJlbW92ZSgpXG4gICAgJCh0b2dnbGUpLmVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgIHZhciAkcGFyZW50ID0gZ2V0UGFyZW50KCQodGhpcykpXG4gICAgICBpZiAoISRwYXJlbnQuaGFzQ2xhc3MoJ29wZW4nKSkgcmV0dXJuXG4gICAgICAkcGFyZW50LnRyaWdnZXIoZSA9ICQuRXZlbnQoJ2hpZGUuYnMuZHJvcGRvd24nKSlcbiAgICAgIGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpKSByZXR1cm5cbiAgICAgICRwYXJlbnQucmVtb3ZlQ2xhc3MoJ29wZW4nKS50cmlnZ2VyKCdoaWRkZW4uYnMuZHJvcGRvd24nKVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYXJlbnQoJHRoaXMpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSAkdGhpcy5hdHRyKCdkYXRhLXRhcmdldCcpXG5cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICBzZWxlY3RvciA9ICR0aGlzLmF0dHIoJ2hyZWYnKVxuICAgICAgc2VsZWN0b3IgPSBzZWxlY3RvciAmJiAvIy8udGVzdChzZWxlY3RvcikgJiYgc2VsZWN0b3IucmVwbGFjZSgvLiooPz0jW15cXHNdKiQpLywgJycpIC8vc3RyaXAgZm9yIGllN1xuICAgIH1cblxuICAgIHZhciAkcGFyZW50ID0gc2VsZWN0b3IgJiYgJChzZWxlY3RvcilcblxuICAgIHJldHVybiAkcGFyZW50ICYmICRwYXJlbnQubGVuZ3RoID8gJHBhcmVudCA6ICR0aGlzLnBhcmVudCgpXG4gIH1cblxuXG4gIC8vIERST1BET1dOIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIG9sZCA9ICQuZm4uZHJvcGRvd25cblxuICAkLmZuLmRyb3Bkb3duID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzID0gJCh0aGlzKVxuICAgICAgdmFyIGRhdGEgID0gJHRoaXMuZGF0YSgnZHJvcGRvd24nKVxuXG4gICAgICBpZiAoIWRhdGEpICR0aGlzLmRhdGEoJ2Ryb3Bkb3duJywgKGRhdGEgPSBuZXcgRHJvcGRvd24odGhpcykpKVxuICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT0gJ3N0cmluZycpIGRhdGFbb3B0aW9uXS5jYWxsKCR0aGlzKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLmRyb3Bkb3duLkNvbnN0cnVjdG9yID0gRHJvcGRvd25cblxuXG4gIC8vIERST1BET1dOIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi5kcm9wZG93bi5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4uZHJvcGRvd24gPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBBUFBMWSBUTyBTVEFOREFSRCBEUk9QRE9XTiBFTEVNRU5UU1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICQoZG9jdW1lbnQpXG4gICAgLm9uKCdjbGljay5icy5kcm9wZG93bi5kYXRhLWFwaScsIGNsZWFyTWVudXMpXG4gICAgLm9uKCdjbGljay5icy5kcm9wZG93bi5kYXRhLWFwaScsICcuZHJvcGRvd24gZm9ybScsIGZ1bmN0aW9uIChlKSB7IGUuc3RvcFByb3BhZ2F0aW9uKCkgfSlcbiAgICAub24oJ2NsaWNrLmJzLmRyb3Bkb3duLmRhdGEtYXBpJyAgLCB0b2dnbGUsIERyb3Bkb3duLnByb3RvdHlwZS50b2dnbGUpXG4gICAgLm9uKCdrZXlkb3duLmJzLmRyb3Bkb3duLmRhdGEtYXBpJywgdG9nZ2xlICsgJywgW3JvbGU9bWVudV0nICwgRHJvcGRvd24ucHJvdG90eXBlLmtleWRvd24pXG5cbn0od2luZG93LmpRdWVyeSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQm9vdHN0cmFwOiBtb2RhbC5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNtb2RhbHNcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29weXJpZ2h0IDIwMTIgVHdpdHRlciwgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cblxuK2Z1bmN0aW9uICgkKSB7IFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIE1PREFMIENMQVNTIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBNb2RhbCA9IGZ1bmN0aW9uIChlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zICAgPSBvcHRpb25zXG4gICAgdGhpcy4kZWxlbWVudCAgPSAkKGVsZW1lbnQpXG4gICAgdGhpcy4kYmFja2Ryb3AgPVxuICAgIHRoaXMuaXNTaG93biAgID0gbnVsbFxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZW1vdGUpIHRoaXMuJGVsZW1lbnQubG9hZCh0aGlzLm9wdGlvbnMucmVtb3RlKVxuICB9XG5cbiAgTW9kYWwuREVGQVVMVFMgPSB7XG4gICAgICBiYWNrZHJvcDogdHJ1ZVxuICAgICwga2V5Ym9hcmQ6IHRydWVcbiAgICAsIHNob3c6IHRydWVcbiAgfVxuXG4gIE1vZGFsLnByb3RvdHlwZS50b2dnbGUgPSBmdW5jdGlvbiAoX3JlbGF0ZWRUYXJnZXQpIHtcbiAgICByZXR1cm4gdGhpc1shdGhpcy5pc1Nob3duID8gJ3Nob3cnIDogJ2hpZGUnXShfcmVsYXRlZFRhcmdldClcbiAgfVxuXG4gIE1vZGFsLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKF9yZWxhdGVkVGFyZ2V0KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzXG4gICAgdmFyIGUgICAgPSAkLkV2ZW50KCdzaG93LmJzLm1vZGFsJywgeyByZWxhdGVkVGFyZ2V0OiBfcmVsYXRlZFRhcmdldCB9KVxuXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKGUpXG5cbiAgICBpZiAodGhpcy5pc1Nob3duIHx8IGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuXG4gICAgdGhpcy5pc1Nob3duID0gdHJ1ZVxuXG4gICAgdGhpcy5lc2NhcGUoKVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbignY2xpY2suZGlzbWlzcy5tb2RhbCcsICdbZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nLCAkLnByb3h5KHRoaXMuaGlkZSwgdGhpcykpXG5cbiAgICB0aGlzLmJhY2tkcm9wKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB0cmFuc2l0aW9uID0gJC5zdXBwb3J0LnRyYW5zaXRpb24gJiYgdGhhdC4kZWxlbWVudC5oYXNDbGFzcygnZmFkZScpXG5cbiAgICAgIGlmICghdGhhdC4kZWxlbWVudC5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgdGhhdC4kZWxlbWVudC5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KSAvLyBkb24ndCBtb3ZlIG1vZGFscyBkb20gcG9zaXRpb25cbiAgICAgIH1cblxuICAgICAgdGhhdC4kZWxlbWVudC5zaG93KClcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgdGhhdC4kZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvLyBmb3JjZSByZWZsb3dcbiAgICAgIH1cblxuICAgICAgdGhhdC4kZWxlbWVudFxuICAgICAgICAuYWRkQ2xhc3MoJ2luJylcbiAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpXG5cbiAgICAgIHRoYXQuZW5mb3JjZUZvY3VzKClcblxuICAgICAgdmFyIGUgPSAkLkV2ZW50KCdzaG93bi5icy5tb2RhbCcsIHsgcmVsYXRlZFRhcmdldDogX3JlbGF0ZWRUYXJnZXQgfSlcblxuICAgICAgdHJhbnNpdGlvbiA/XG4gICAgICAgIHRoYXQuJGVsZW1lbnQuZmluZCgnLm1vZGFsLWRpYWxvZycpIC8vIHdhaXQgZm9yIG1vZGFsIHRvIHNsaWRlIGluXG4gICAgICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoYXQuJGVsZW1lbnQuZm9jdXMoKS50cmlnZ2VyKGUpXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZW11bGF0ZVRyYW5zaXRpb25FbmQoMzAwKSA6XG4gICAgICAgIHRoYXQuJGVsZW1lbnQuZm9jdXMoKS50cmlnZ2VyKGUpXG4gICAgfSlcbiAgfVxuXG4gIE1vZGFsLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZSkgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBlID0gJC5FdmVudCgnaGlkZS5icy5tb2RhbCcpXG5cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoZSlcblxuICAgIGlmICghdGhpcy5pc1Nob3duIHx8IGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuXG4gICAgdGhpcy5pc1Nob3duID0gZmFsc2VcblxuICAgIHRoaXMuZXNjYXBlKClcblxuICAgICQoZG9jdW1lbnQpLm9mZignZm9jdXNpbi5icy5tb2RhbCcpXG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAucmVtb3ZlQ2xhc3MoJ2luJylcbiAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpXG4gICAgICAub2ZmKCdjbGljay5kaXNtaXNzLm1vZGFsJylcblxuICAgICQuc3VwcG9ydC50cmFuc2l0aW9uICYmIHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2ZhZGUnKSA/XG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC5vbmUoJC5zdXBwb3J0LnRyYW5zaXRpb24uZW5kLCAkLnByb3h5KHRoaXMuaGlkZU1vZGFsLCB0aGlzKSlcbiAgICAgICAgLmVtdWxhdGVUcmFuc2l0aW9uRW5kKDMwMCkgOlxuICAgICAgdGhpcy5oaWRlTW9kYWwoKVxuICB9XG5cbiAgTW9kYWwucHJvdG90eXBlLmVuZm9yY2VGb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAkKGRvY3VtZW50KVxuICAgICAgLm9mZignZm9jdXNpbi5icy5tb2RhbCcpIC8vIGd1YXJkIGFnYWluc3QgaW5maW5pdGUgZm9jdXMgbG9vcFxuICAgICAgLm9uKCdmb2N1c2luLmJzLm1vZGFsJywgJC5wcm94eShmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAodGhpcy4kZWxlbWVudFswXSAhPT0gZS50YXJnZXQgJiYgIXRoaXMuJGVsZW1lbnQuaGFzKGUudGFyZ2V0KS5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLiRlbGVtZW50LmZvY3VzKClcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcykpXG4gIH1cblxuICBNb2RhbC5wcm90b3R5cGUuZXNjYXBlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzU2hvd24gJiYgdGhpcy5vcHRpb25zLmtleWJvYXJkKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdrZXl1cC5kaXNtaXNzLmJzLm1vZGFsJywgJC5wcm94eShmdW5jdGlvbiAoZSkge1xuICAgICAgICBlLndoaWNoID09IDI3ICYmIHRoaXMuaGlkZSgpXG4gICAgICB9LCB0aGlzKSlcbiAgICB9IGVsc2UgaWYgKCF0aGlzLmlzU2hvd24pIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdrZXl1cC5kaXNtaXNzLmJzLm1vZGFsJylcbiAgICB9XG4gIH1cblxuICBNb2RhbC5wcm90b3R5cGUuaGlkZU1vZGFsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0aGF0ID0gdGhpc1xuICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpXG4gICAgdGhpcy5iYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICB0aGF0LnJlbW92ZUJhY2tkcm9wKClcbiAgICAgIHRoYXQuJGVsZW1lbnQudHJpZ2dlcignaGlkZGVuLmJzLm1vZGFsJylcbiAgICB9KVxuICB9XG5cbiAgTW9kYWwucHJvdG90eXBlLnJlbW92ZUJhY2tkcm9wID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJGJhY2tkcm9wICYmIHRoaXMuJGJhY2tkcm9wLnJlbW92ZSgpXG4gICAgdGhpcy4kYmFja2Ryb3AgPSBudWxsXG4gIH1cblxuICBNb2RhbC5wcm90b3R5cGUuYmFja2Ryb3AgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgdGhhdCAgICA9IHRoaXNcbiAgICB2YXIgYW5pbWF0ZSA9IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2ZhZGUnKSA/ICdmYWRlJyA6ICcnXG5cbiAgICBpZiAodGhpcy5pc1Nob3duICYmIHRoaXMub3B0aW9ucy5iYWNrZHJvcCkge1xuICAgICAgdmFyIGRvQW5pbWF0ZSA9ICQuc3VwcG9ydC50cmFuc2l0aW9uICYmIGFuaW1hdGVcblxuICAgICAgdGhpcy4kYmFja2Ryb3AgPSAkKCc8ZGl2IGNsYXNzPVwibW9kYWwtYmFja2Ryb3AgJyArIGFuaW1hdGUgKyAnXCIgLz4nKVxuICAgICAgICAuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSlcblxuICAgICAgdGhpcy4kZWxlbWVudC5vbignY2xpY2suZGlzbWlzcy5tb2RhbCcsICQucHJveHkoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSBlLmN1cnJlbnRUYXJnZXQpIHJldHVyblxuICAgICAgICB0aGlzLm9wdGlvbnMuYmFja2Ryb3AgPT0gJ3N0YXRpYydcbiAgICAgICAgICA/IHRoaXMuJGVsZW1lbnRbMF0uZm9jdXMuY2FsbCh0aGlzLiRlbGVtZW50WzBdKVxuICAgICAgICAgIDogdGhpcy5oaWRlLmNhbGwodGhpcylcbiAgICAgIH0sIHRoaXMpKVxuXG4gICAgICBpZiAoZG9BbmltYXRlKSB0aGlzLiRiYWNrZHJvcFswXS5vZmZzZXRXaWR0aCAvLyBmb3JjZSByZWZsb3dcblxuICAgICAgdGhpcy4kYmFja2Ryb3AuYWRkQ2xhc3MoJ2luJylcblxuICAgICAgaWYgKCFjYWxsYmFjaykgcmV0dXJuXG5cbiAgICAgIGRvQW5pbWF0ZSA/XG4gICAgICAgIHRoaXMuJGJhY2tkcm9wXG4gICAgICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIGNhbGxiYWNrKVxuICAgICAgICAgIC5lbXVsYXRlVHJhbnNpdGlvbkVuZCgxNTApIDpcbiAgICAgICAgY2FsbGJhY2soKVxuXG4gICAgfSBlbHNlIGlmICghdGhpcy5pc1Nob3duICYmIHRoaXMuJGJhY2tkcm9wKSB7XG4gICAgICB0aGlzLiRiYWNrZHJvcC5yZW1vdmVDbGFzcygnaW4nKVxuXG4gICAgICAkLnN1cHBvcnQudHJhbnNpdGlvbiAmJiB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmYWRlJyk/XG4gICAgICAgIHRoaXMuJGJhY2tkcm9wXG4gICAgICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIGNhbGxiYWNrKVxuICAgICAgICAgIC5lbXVsYXRlVHJhbnNpdGlvbkVuZCgxNTApIDpcbiAgICAgICAgY2FsbGJhY2soKVxuXG4gICAgfSBlbHNlIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soKVxuICAgIH1cbiAgfVxuXG5cbiAgLy8gTU9EQUwgUExVR0lOIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxuICB2YXIgb2xkID0gJC5mbi5tb2RhbFxuXG4gICQuZm4ubW9kYWwgPSBmdW5jdGlvbiAob3B0aW9uLCBfcmVsYXRlZFRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSAgICA9ICR0aGlzLmRhdGEoJ2JzLm1vZGFsJylcbiAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQoe30sIE1vZGFsLkRFRkFVTFRTLCAkdGhpcy5kYXRhKCksIHR5cGVvZiBvcHRpb24gPT0gJ29iamVjdCcgJiYgb3B0aW9uKVxuXG4gICAgICBpZiAoIWRhdGEpICR0aGlzLmRhdGEoJ2JzLm1vZGFsJywgKGRhdGEgPSBuZXcgTW9kYWwodGhpcywgb3B0aW9ucykpKVxuICAgICAgaWYgKHR5cGVvZiBvcHRpb24gPT0gJ3N0cmluZycpIGRhdGFbb3B0aW9uXShfcmVsYXRlZFRhcmdldClcbiAgICAgIGVsc2UgaWYgKG9wdGlvbnMuc2hvdykgZGF0YS5zaG93KF9yZWxhdGVkVGFyZ2V0KVxuICAgIH0pXG4gIH1cblxuICAkLmZuLm1vZGFsLkNvbnN0cnVjdG9yID0gTW9kYWxcblxuXG4gIC8vIE1PREFMIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi5tb2RhbC5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4ubW9kYWwgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBNT0RBTCBEQVRBLUFQSVxuICAvLyA9PT09PT09PT09PT09PVxuXG4gICQoZG9jdW1lbnQpLm9uKCdjbGljay5icy5tb2RhbC5kYXRhLWFwaScsICdbZGF0YS10b2dnbGU9XCJtb2RhbFwiXScsIGZ1bmN0aW9uIChlKSB7XG4gICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgdmFyIGhyZWYgICAgPSAkdGhpcy5hdHRyKCdocmVmJylcbiAgICB2YXIgJHRhcmdldCA9ICQoJHRoaXMuYXR0cignZGF0YS10YXJnZXQnKSB8fCAoaHJlZiAmJiBocmVmLnJlcGxhY2UoLy4qKD89I1teXFxzXSskKS8sICcnKSkpIC8vc3RyaXAgZm9yIGllN1xuICAgIHZhciBvcHRpb24gID0gJHRhcmdldC5kYXRhKCdtb2RhbCcpID8gJ3RvZ2dsZScgOiAkLmV4dGVuZCh7IHJlbW90ZTogIS8jLy50ZXN0KGhyZWYpICYmIGhyZWYgfSwgJHRhcmdldC5kYXRhKCksICR0aGlzLmRhdGEoKSlcblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJHRhcmdldFxuICAgICAgLm1vZGFsKG9wdGlvbiwgdGhpcylcbiAgICAgIC5vbmUoJ2hpZGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICR0aGlzLmlzKCc6dmlzaWJsZScpICYmICR0aGlzLmZvY3VzKClcbiAgICAgIH0pXG4gIH0pXG5cbiAgJChkb2N1bWVudClcbiAgICAub24oJ3Nob3cuYnMubW9kYWwnLCAgJy5tb2RhbCcsIGZ1bmN0aW9uICgpIHsgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnbW9kYWwtb3BlbicpIH0pXG4gICAgLm9uKCdoaWRkZW4uYnMubW9kYWwnLCAnLm1vZGFsJywgZnVuY3Rpb24gKCkgeyAkKGRvY3VtZW50LmJvZHkpLnJlbW92ZUNsYXNzKCdtb2RhbC1vcGVuJykgfSlcblxufSh3aW5kb3cualF1ZXJ5KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBCb290c3RyYXA6IHRvb2x0aXAuanMgdjMuMC4wXG4gKiBodHRwOi8vdHdicy5naXRodWIuY29tL2Jvb3RzdHJhcC9qYXZhc2NyaXB0Lmh0bWwjdG9vbHRpcFxuICogSW5zcGlyZWQgYnkgdGhlIG9yaWdpbmFsIGpRdWVyeS50aXBzeSBieSBKYXNvbiBGcmFtZVxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMiBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gVE9PTFRJUCBQVUJMSUMgQ0xBU1MgREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIFRvb2x0aXAgPSBmdW5jdGlvbiAoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMudHlwZSAgICAgICA9XG4gICAgdGhpcy5vcHRpb25zICAgID1cbiAgICB0aGlzLmVuYWJsZWQgICAgPVxuICAgIHRoaXMudGltZW91dCAgICA9XG4gICAgdGhpcy5ob3ZlclN0YXRlID1cbiAgICB0aGlzLiRlbGVtZW50ICAgPSBudWxsXG5cbiAgICB0aGlzLmluaXQoJ3Rvb2x0aXAnLCBlbGVtZW50LCBvcHRpb25zKVxuICB9XG5cbiAgVG9vbHRpcC5ERUZBVUxUUyA9IHtcbiAgICBhbmltYXRpb246IHRydWVcbiAgLCBwbGFjZW1lbnQ6ICd0b3AnXG4gICwgc2VsZWN0b3I6IGZhbHNlXG4gICwgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwidG9vbHRpcFwiPjxkaXYgY2xhc3M9XCJ0b29sdGlwLWFycm93XCI+PC9kaXY+PGRpdiBjbGFzcz1cInRvb2x0aXAtaW5uZXJcIj48L2Rpdj48L2Rpdj4nXG4gICwgdHJpZ2dlcjogJ2hvdmVyIGZvY3VzJ1xuICAsIHRpdGxlOiAnJ1xuICAsIGRlbGF5OiAwXG4gICwgaHRtbDogZmFsc2VcbiAgLCBjb250YWluZXI6IGZhbHNlXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmVuYWJsZWQgID0gdHJ1ZVxuICAgIHRoaXMudHlwZSAgICAgPSB0eXBlXG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudClcbiAgICB0aGlzLm9wdGlvbnMgID0gdGhpcy5nZXRPcHRpb25zKG9wdGlvbnMpXG5cbiAgICB2YXIgdHJpZ2dlcnMgPSB0aGlzLm9wdGlvbnMudHJpZ2dlci5zcGxpdCgnICcpXG5cbiAgICBmb3IgKHZhciBpID0gdHJpZ2dlcnMubGVuZ3RoOyBpLS07KSB7XG4gICAgICB2YXIgdHJpZ2dlciA9IHRyaWdnZXJzW2ldXG5cbiAgICAgIGlmICh0cmlnZ2VyID09ICdjbGljaycpIHtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vbignY2xpY2suJyArIHRoaXMudHlwZSwgdGhpcy5vcHRpb25zLnNlbGVjdG9yLCAkLnByb3h5KHRoaXMudG9nZ2xlLCB0aGlzKSlcbiAgICAgIH0gZWxzZSBpZiAodHJpZ2dlciAhPSAnbWFudWFsJykge1xuICAgICAgICB2YXIgZXZlbnRJbiAgPSB0cmlnZ2VyID09ICdob3ZlcicgPyAnbW91c2VlbnRlcicgOiAnZm9jdXMnXG4gICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT0gJ2hvdmVyJyA/ICdtb3VzZWxlYXZlJyA6ICdibHVyJ1xuXG4gICAgICAgIHRoaXMuJGVsZW1lbnQub24oZXZlbnRJbiAgKyAnLicgKyB0aGlzLnR5cGUsIHRoaXMub3B0aW9ucy5zZWxlY3RvciwgJC5wcm94eSh0aGlzLmVudGVyLCB0aGlzKSlcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vbihldmVudE91dCArICcuJyArIHRoaXMudHlwZSwgdGhpcy5vcHRpb25zLnNlbGVjdG9yLCAkLnByb3h5KHRoaXMubGVhdmUsIHRoaXMpKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5zZWxlY3RvciA/XG4gICAgICAodGhpcy5fb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMsIHsgdHJpZ2dlcjogJ21hbnVhbCcsIHNlbGVjdG9yOiAnJyB9KSkgOlxuICAgICAgdGhpcy5maXhUaXRsZSgpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5nZXREZWZhdWx0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gVG9vbHRpcC5ERUZBVUxUU1xuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUuZ2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLmdldERlZmF1bHRzKCksIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKVxuXG4gICAgaWYgKG9wdGlvbnMuZGVsYXkgJiYgdHlwZW9mIG9wdGlvbnMuZGVsYXkgPT0gJ251bWJlcicpIHtcbiAgICAgIG9wdGlvbnMuZGVsYXkgPSB7XG4gICAgICAgIHNob3c6IG9wdGlvbnMuZGVsYXlcbiAgICAgICwgaGlkZTogb3B0aW9ucy5kZWxheVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5nZXREZWxlZ2F0ZU9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9wdGlvbnMgID0ge31cbiAgICB2YXIgZGVmYXVsdHMgPSB0aGlzLmdldERlZmF1bHRzKClcblxuICAgIHRoaXMuX29wdGlvbnMgJiYgJC5lYWNoKHRoaXMuX29wdGlvbnMsIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICBpZiAoZGVmYXVsdHNba2V5XSAhPSB2YWx1ZSkgb3B0aW9uc1trZXldID0gdmFsdWVcbiAgICB9KVxuXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmVudGVyID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciBzZWxmID0gb2JqIGluc3RhbmNlb2YgdGhpcy5jb25zdHJ1Y3RvciA/XG4gICAgICBvYmogOiAkKG9iai5jdXJyZW50VGFyZ2V0KVt0aGlzLnR5cGVdKHRoaXMuZ2V0RGVsZWdhdGVPcHRpb25zKCkpLmRhdGEoJ2JzLicgKyB0aGlzLnR5cGUpXG5cbiAgICBjbGVhclRpbWVvdXQoc2VsZi50aW1lb3V0KVxuXG4gICAgc2VsZi5ob3ZlclN0YXRlID0gJ2luJ1xuXG4gICAgaWYgKCFzZWxmLm9wdGlvbnMuZGVsYXkgfHwgIXNlbGYub3B0aW9ucy5kZWxheS5zaG93KSByZXR1cm4gc2VsZi5zaG93KClcblxuICAgIHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuaG92ZXJTdGF0ZSA9PSAnaW4nKSBzZWxmLnNob3coKVxuICAgIH0sIHNlbGYub3B0aW9ucy5kZWxheS5zaG93KVxuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUubGVhdmUgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHNlbGYgPSBvYmogaW5zdGFuY2VvZiB0aGlzLmNvbnN0cnVjdG9yID9cbiAgICAgIG9iaiA6ICQob2JqLmN1cnJlbnRUYXJnZXQpW3RoaXMudHlwZV0odGhpcy5nZXREZWxlZ2F0ZU9wdGlvbnMoKSkuZGF0YSgnYnMuJyArIHRoaXMudHlwZSlcblxuICAgIGNsZWFyVGltZW91dChzZWxmLnRpbWVvdXQpXG5cbiAgICBzZWxmLmhvdmVyU3RhdGUgPSAnb3V0J1xuXG4gICAgaWYgKCFzZWxmLm9wdGlvbnMuZGVsYXkgfHwgIXNlbGYub3B0aW9ucy5kZWxheS5oaWRlKSByZXR1cm4gc2VsZi5oaWRlKClcblxuICAgIHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuaG92ZXJTdGF0ZSA9PSAnb3V0Jykgc2VsZi5oaWRlKClcbiAgICB9LCBzZWxmLm9wdGlvbnMuZGVsYXkuaGlkZSlcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGUgPSAkLkV2ZW50KCdzaG93LmJzLicrIHRoaXMudHlwZSlcblxuICAgIGlmICh0aGlzLmhhc0NvbnRlbnQoKSAmJiB0aGlzLmVuYWJsZWQpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcihlKVxuXG4gICAgICBpZiAoZS5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkgcmV0dXJuXG5cbiAgICAgIHZhciAkdGlwID0gdGhpcy50aXAoKVxuXG4gICAgICB0aGlzLnNldENvbnRlbnQoKVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbikgJHRpcC5hZGRDbGFzcygnZmFkZScpXG5cbiAgICAgIHZhciBwbGFjZW1lbnQgPSB0eXBlb2YgdGhpcy5vcHRpb25zLnBsYWNlbWVudCA9PSAnZnVuY3Rpb24nID9cbiAgICAgICAgdGhpcy5vcHRpb25zLnBsYWNlbWVudC5jYWxsKHRoaXMsICR0aXBbMF0sIHRoaXMuJGVsZW1lbnRbMF0pIDpcbiAgICAgICAgdGhpcy5vcHRpb25zLnBsYWNlbWVudFxuXG4gICAgICB2YXIgYXV0b1Rva2VuID0gL1xccz9hdXRvP1xccz8vaVxuICAgICAgdmFyIGF1dG9QbGFjZSA9IGF1dG9Ub2tlbi50ZXN0KHBsYWNlbWVudClcbiAgICAgIGlmIChhdXRvUGxhY2UpIHBsYWNlbWVudCA9IHBsYWNlbWVudC5yZXBsYWNlKGF1dG9Ub2tlbiwgJycpIHx8ICd0b3AnXG5cbiAgICAgICR0aXBcbiAgICAgICAgLmRldGFjaCgpXG4gICAgICAgIC5jc3MoeyB0b3A6IDAsIGxlZnQ6IDAsIGRpc3BsYXk6ICdibG9jaycgfSlcbiAgICAgICAgLmFkZENsYXNzKHBsYWNlbWVudClcblxuICAgICAgdGhpcy5vcHRpb25zLmNvbnRhaW5lciA/ICR0aXAuYXBwZW5kVG8odGhpcy5vcHRpb25zLmNvbnRhaW5lcikgOiAkdGlwLmluc2VydEFmdGVyKHRoaXMuJGVsZW1lbnQpXG5cbiAgICAgIHZhciBwb3MgICAgICAgICAgPSB0aGlzLmdldFBvc2l0aW9uKClcbiAgICAgIHZhciBhY3R1YWxXaWR0aCAgPSAkdGlwWzBdLm9mZnNldFdpZHRoXG4gICAgICB2YXIgYWN0dWFsSGVpZ2h0ID0gJHRpcFswXS5vZmZzZXRIZWlnaHRcblxuICAgICAgaWYgKGF1dG9QbGFjZSkge1xuICAgICAgICB2YXIgJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50KClcblxuICAgICAgICB2YXIgb3JnUGxhY2VtZW50ID0gcGxhY2VtZW50XG4gICAgICAgIHZhciBkb2NTY3JvbGwgICAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wXG4gICAgICAgIHZhciBwYXJlbnRXaWR0aCAgPSB0aGlzLm9wdGlvbnMuY29udGFpbmVyID09ICdib2R5JyA/IHdpbmRvdy5pbm5lcldpZHRoICA6ICRwYXJlbnQub3V0ZXJXaWR0aCgpXG4gICAgICAgIHZhciBwYXJlbnRIZWlnaHQgPSB0aGlzLm9wdGlvbnMuY29udGFpbmVyID09ICdib2R5JyA/IHdpbmRvdy5pbm5lckhlaWdodCA6ICRwYXJlbnQub3V0ZXJIZWlnaHQoKVxuICAgICAgICB2YXIgcGFyZW50TGVmdCAgID0gdGhpcy5vcHRpb25zLmNvbnRhaW5lciA9PSAnYm9keScgPyAwIDogJHBhcmVudC5vZmZzZXQoKS5sZWZ0XG5cbiAgICAgICAgcGxhY2VtZW50ID0gcGxhY2VtZW50ID09ICdib3R0b20nICYmIHBvcy50b3AgICArIHBvcy5oZWlnaHQgICsgYWN0dWFsSGVpZ2h0IC0gZG9jU2Nyb2xsID4gcGFyZW50SGVpZ2h0ICA/ICd0b3AnICAgIDpcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09ICd0b3AnICAgICYmIHBvcy50b3AgICAtIGRvY1Njcm9sbCAgIC0gYWN0dWFsSGVpZ2h0IDwgMCAgICAgICAgICAgICAgICAgICAgICAgICA/ICdib3R0b20nIDpcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09ICdyaWdodCcgICYmIHBvcy5yaWdodCArIGFjdHVhbFdpZHRoID4gcGFyZW50V2lkdGggICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdsZWZ0JyAgIDpcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50ID09ICdsZWZ0JyAgICYmIHBvcy5sZWZ0ICAtIGFjdHVhbFdpZHRoIDwgcGFyZW50TGVmdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdyaWdodCcgIDpcbiAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50XG5cbiAgICAgICAgJHRpcFxuICAgICAgICAgIC5yZW1vdmVDbGFzcyhvcmdQbGFjZW1lbnQpXG4gICAgICAgICAgLmFkZENsYXNzKHBsYWNlbWVudClcbiAgICAgIH1cblxuICAgICAgdmFyIGNhbGN1bGF0ZWRPZmZzZXQgPSB0aGlzLmdldENhbGN1bGF0ZWRPZmZzZXQocGxhY2VtZW50LCBwb3MsIGFjdHVhbFdpZHRoLCBhY3R1YWxIZWlnaHQpXG5cbiAgICAgIHRoaXMuYXBwbHlQbGFjZW1lbnQoY2FsY3VsYXRlZE9mZnNldCwgcGxhY2VtZW50KVxuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93bi5icy4nICsgdGhpcy50eXBlKVxuICAgIH1cbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmFwcGx5UGxhY2VtZW50ID0gZnVuY3Rpb24ob2Zmc2V0LCBwbGFjZW1lbnQpIHtcbiAgICB2YXIgcmVwbGFjZVxuICAgIHZhciAkdGlwICAgPSB0aGlzLnRpcCgpXG4gICAgdmFyIHdpZHRoICA9ICR0aXBbMF0ub2Zmc2V0V2lkdGhcbiAgICB2YXIgaGVpZ2h0ID0gJHRpcFswXS5vZmZzZXRIZWlnaHRcblxuICAgIC8vIG1hbnVhbGx5IHJlYWQgbWFyZ2lucyBiZWNhdXNlIGdldEJvdW5kaW5nQ2xpZW50UmVjdCBpbmNsdWRlcyBkaWZmZXJlbmNlXG4gICAgdmFyIG1hcmdpblRvcCA9IHBhcnNlSW50KCR0aXAuY3NzKCdtYXJnaW4tdG9wJyksIDEwKVxuICAgIHZhciBtYXJnaW5MZWZ0ID0gcGFyc2VJbnQoJHRpcC5jc3MoJ21hcmdpbi1sZWZ0JyksIDEwKVxuXG4gICAgLy8gd2UgbXVzdCBjaGVjayBmb3IgTmFOIGZvciBpZSA4LzlcbiAgICBpZiAoaXNOYU4obWFyZ2luVG9wKSkgIG1hcmdpblRvcCAgPSAwXG4gICAgaWYgKGlzTmFOKG1hcmdpbkxlZnQpKSBtYXJnaW5MZWZ0ID0gMFxuXG4gICAgb2Zmc2V0LnRvcCAgPSBvZmZzZXQudG9wICArIG1hcmdpblRvcFxuICAgIG9mZnNldC5sZWZ0ID0gb2Zmc2V0LmxlZnQgKyBtYXJnaW5MZWZ0XG5cbiAgICAkdGlwXG4gICAgICAub2Zmc2V0KG9mZnNldClcbiAgICAgIC5hZGRDbGFzcygnaW4nKVxuXG4gICAgLy8gY2hlY2sgdG8gc2VlIGlmIHBsYWNpbmcgdGlwIGluIG5ldyBvZmZzZXQgY2F1c2VkIHRoZSB0aXAgdG8gcmVzaXplIGl0c2VsZlxuICAgIHZhciBhY3R1YWxXaWR0aCAgPSAkdGlwWzBdLm9mZnNldFdpZHRoXG4gICAgdmFyIGFjdHVhbEhlaWdodCA9ICR0aXBbMF0ub2Zmc2V0SGVpZ2h0XG5cbiAgICBpZiAocGxhY2VtZW50ID09ICd0b3AnICYmIGFjdHVhbEhlaWdodCAhPSBoZWlnaHQpIHtcbiAgICAgIHJlcGxhY2UgPSB0cnVlXG4gICAgICBvZmZzZXQudG9wID0gb2Zmc2V0LnRvcCArIGhlaWdodCAtIGFjdHVhbEhlaWdodFxuICAgIH1cblxuICAgIGlmICgvYm90dG9tfHRvcC8udGVzdChwbGFjZW1lbnQpKSB7XG4gICAgICB2YXIgZGVsdGEgPSAwXG5cbiAgICAgIGlmIChvZmZzZXQubGVmdCA8IDApIHtcbiAgICAgICAgZGVsdGEgICAgICAgPSBvZmZzZXQubGVmdCAqIC0yXG4gICAgICAgIG9mZnNldC5sZWZ0ID0gMFxuXG4gICAgICAgICR0aXAub2Zmc2V0KG9mZnNldClcblxuICAgICAgICBhY3R1YWxXaWR0aCAgPSAkdGlwWzBdLm9mZnNldFdpZHRoXG4gICAgICAgIGFjdHVhbEhlaWdodCA9ICR0aXBbMF0ub2Zmc2V0SGVpZ2h0XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVwbGFjZUFycm93KGRlbHRhIC0gd2lkdGggKyBhY3R1YWxXaWR0aCwgYWN0dWFsV2lkdGgsICdsZWZ0JylcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXBsYWNlQXJyb3coYWN0dWFsSGVpZ2h0IC0gaGVpZ2h0LCBhY3R1YWxIZWlnaHQsICd0b3AnKVxuICAgIH1cblxuICAgIGlmIChyZXBsYWNlKSAkdGlwLm9mZnNldChvZmZzZXQpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5yZXBsYWNlQXJyb3cgPSBmdW5jdGlvbihkZWx0YSwgZGltZW5zaW9uLCBwb3NpdGlvbikge1xuICAgIHRoaXMuYXJyb3coKS5jc3MocG9zaXRpb24sIGRlbHRhID8gKDUwICogKDEgLSBkZWx0YSAvIGRpbWVuc2lvbikgKyBcIiVcIikgOiAnJylcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICR0aXAgID0gdGhpcy50aXAoKVxuICAgIHZhciB0aXRsZSA9IHRoaXMuZ2V0VGl0bGUoKVxuXG4gICAgJHRpcC5maW5kKCcudG9vbHRpcC1pbm5lcicpW3RoaXMub3B0aW9ucy5odG1sID8gJ2h0bWwnIDogJ3RleHQnXSh0aXRsZSlcbiAgICAkdGlwLnJlbW92ZUNsYXNzKCdmYWRlIGluIHRvcCBib3R0b20gbGVmdCByaWdodCcpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0aGF0ID0gdGhpc1xuICAgIHZhciAkdGlwID0gdGhpcy50aXAoKVxuICAgIHZhciBlICAgID0gJC5FdmVudCgnaGlkZS5icy4nICsgdGhpcy50eXBlKVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICBpZiAodGhhdC5ob3ZlclN0YXRlICE9ICdpbicpICR0aXAuZGV0YWNoKClcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoZSlcblxuICAgIGlmIChlLmlzRGVmYXVsdFByZXZlbnRlZCgpKSByZXR1cm5cblxuICAgICR0aXAucmVtb3ZlQ2xhc3MoJ2luJylcblxuICAgICQuc3VwcG9ydC50cmFuc2l0aW9uICYmIHRoaXMuJHRpcC5oYXNDbGFzcygnZmFkZScpID9cbiAgICAgICR0aXBcbiAgICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIGNvbXBsZXRlKVxuICAgICAgICAuZW11bGF0ZVRyYW5zaXRpb25FbmQoMTUwKSA6XG4gICAgICBjb21wbGV0ZSgpXG5cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGRlbi5icy4nICsgdGhpcy50eXBlKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmZpeFRpdGxlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciAkZSA9IHRoaXMuJGVsZW1lbnRcbiAgICBpZiAoJGUuYXR0cigndGl0bGUnKSB8fCB0eXBlb2YoJGUuYXR0cignZGF0YS1vcmlnaW5hbC10aXRsZScpKSAhPSAnc3RyaW5nJykge1xuICAgICAgJGUuYXR0cignZGF0YS1vcmlnaW5hbC10aXRsZScsICRlLmF0dHIoJ3RpdGxlJykgfHwgJycpLmF0dHIoJ3RpdGxlJywgJycpXG4gICAgfVxuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUuaGFzQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRUaXRsZSgpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZWwgPSB0aGlzLiRlbGVtZW50WzBdXG4gICAgcmV0dXJuICQuZXh0ZW5kKHt9LCAodHlwZW9mIGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCA9PSAnZnVuY3Rpb24nKSA/IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIDoge1xuICAgICAgd2lkdGg6IGVsLm9mZnNldFdpZHRoXG4gICAgLCBoZWlnaHQ6IGVsLm9mZnNldEhlaWdodFxuICAgIH0sIHRoaXMuJGVsZW1lbnQub2Zmc2V0KCkpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5nZXRDYWxjdWxhdGVkT2Zmc2V0ID0gZnVuY3Rpb24gKHBsYWNlbWVudCwgcG9zLCBhY3R1YWxXaWR0aCwgYWN0dWFsSGVpZ2h0KSB7XG4gICAgcmV0dXJuIHBsYWNlbWVudCA9PSAnYm90dG9tJyA/IHsgdG9wOiBwb3MudG9wICsgcG9zLmhlaWdodCwgICBsZWZ0OiBwb3MubGVmdCArIHBvcy53aWR0aCAvIDIgLSBhY3R1YWxXaWR0aCAvIDIgIH0gOlxuICAgICAgICAgICBwbGFjZW1lbnQgPT0gJ3RvcCcgICAgPyB7IHRvcDogcG9zLnRvcCAtIGFjdHVhbEhlaWdodCwgbGVmdDogcG9zLmxlZnQgKyBwb3Mud2lkdGggLyAyIC0gYWN0dWFsV2lkdGggLyAyICB9IDpcbiAgICAgICAgICAgcGxhY2VtZW50ID09ICdsZWZ0JyAgID8geyB0b3A6IHBvcy50b3AgKyBwb3MuaGVpZ2h0IC8gMiAtIGFjdHVhbEhlaWdodCAvIDIsIGxlZnQ6IHBvcy5sZWZ0IC0gYWN0dWFsV2lkdGggfSA6XG4gICAgICAgIC8qIHBsYWNlbWVudCA9PSAncmlnaHQnICovIHsgdG9wOiBwb3MudG9wICsgcG9zLmhlaWdodCAvIDIgLSBhY3R1YWxIZWlnaHQgLyAyLCBsZWZ0OiBwb3MubGVmdCArIHBvcy53aWR0aCAgIH1cbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmdldFRpdGxlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB0aXRsZVxuICAgIHZhciAkZSA9IHRoaXMuJGVsZW1lbnRcbiAgICB2YXIgbyAgPSB0aGlzLm9wdGlvbnNcblxuICAgIHRpdGxlID0gJGUuYXR0cignZGF0YS1vcmlnaW5hbC10aXRsZScpXG4gICAgICB8fCAodHlwZW9mIG8udGl0bGUgPT0gJ2Z1bmN0aW9uJyA/IG8udGl0bGUuY2FsbCgkZVswXSkgOiAgby50aXRsZSlcblxuICAgIHJldHVybiB0aXRsZVxuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUudGlwID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLiR0aXAgPSB0aGlzLiR0aXAgfHwgJCh0aGlzLm9wdGlvbnMudGVtcGxhdGUpXG4gIH1cblxuICBUb29sdGlwLnByb3RvdHlwZS5hcnJvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy4kYXJyb3cgPSB0aGlzLiRhcnJvdyB8fCB0aGlzLnRpcCgpLmZpbmQoJy50b29sdGlwLWFycm93JylcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy4kZWxlbWVudFswXS5wYXJlbnROb2RlKSB7XG4gICAgICB0aGlzLmhpZGUoKVxuICAgICAgdGhpcy4kZWxlbWVudCA9IG51bGxcbiAgICAgIHRoaXMub3B0aW9ucyAgPSBudWxsXG4gICAgfVxuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZW5hYmxlZCA9IHRydWVcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2VcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbmFibGVkID0gIXRoaXMuZW5hYmxlZFxuICB9XG5cbiAgVG9vbHRpcC5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgc2VsZiA9IGUgPyAkKGUuY3VycmVudFRhcmdldClbdGhpcy50eXBlXSh0aGlzLmdldERlbGVnYXRlT3B0aW9ucygpKS5kYXRhKCdicy4nICsgdGhpcy50eXBlKSA6IHRoaXNcbiAgICBzZWxmLnRpcCgpLmhhc0NsYXNzKCdpbicpID8gc2VsZi5sZWF2ZShzZWxmKSA6IHNlbGYuZW50ZXIoc2VsZilcbiAgfVxuXG4gIFRvb2x0aXAucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5oaWRlKCkuJGVsZW1lbnQub2ZmKCcuJyArIHRoaXMudHlwZSkucmVtb3ZlRGF0YSgnYnMuJyArIHRoaXMudHlwZSlcbiAgfVxuXG5cbiAgLy8gVE9PTFRJUCBQTFVHSU4gREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIG9sZCA9ICQuZm4udG9vbHRpcFxuXG4gICQuZm4udG9vbHRpcCA9IGZ1bmN0aW9uIChvcHRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhpcyAgID0gJCh0aGlzKVxuICAgICAgdmFyIGRhdGEgICAgPSAkdGhpcy5kYXRhKCdicy50b29sdGlwJylcbiAgICAgIHZhciBvcHRpb25zID0gdHlwZW9mIG9wdGlvbiA9PSAnb2JqZWN0JyAmJiBvcHRpb25cblxuICAgICAgaWYgKCFkYXRhKSAkdGhpcy5kYXRhKCdicy50b29sdGlwJywgKGRhdGEgPSBuZXcgVG9vbHRpcCh0aGlzLCBvcHRpb25zKSkpXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbiA9PSAnc3RyaW5nJykgZGF0YVtvcHRpb25dKClcbiAgICB9KVxuICB9XG5cbiAgJC5mbi50b29sdGlwLkNvbnN0cnVjdG9yID0gVG9vbHRpcFxuXG5cbiAgLy8gVE9PTFRJUCBOTyBDT05GTElDVFxuICAvLyA9PT09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi50b29sdGlwLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbi50b29sdGlwID0gb2xkXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG59KHdpbmRvdy5qUXVlcnkpO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEJvb3RzdHJhcDogcG9wb3Zlci5qcyB2My4wLjBcbiAqIGh0dHA6Ly90d2JzLmdpdGh1Yi5jb20vYm9vdHN0cmFwL2phdmFzY3JpcHQuaHRtbCNwb3BvdmVyc1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5cmlnaHQgMjAxMiBUd2l0dGVyLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4rZnVuY3Rpb24gKCQpIHsgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgLy8gUE9QT1ZFUiBQVUJMSUMgQ0xBU1MgREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIFBvcG92ZXIgPSBmdW5jdGlvbiAoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuaW5pdCgncG9wb3ZlcicsIGVsZW1lbnQsIG9wdGlvbnMpXG4gIH1cblxuICBpZiAoISQuZm4udG9vbHRpcCkgdGhyb3cgbmV3IEVycm9yKCdQb3BvdmVyIHJlcXVpcmVzIHRvb2x0aXAuanMnKVxuXG4gIFBvcG92ZXIuREVGQVVMVFMgPSAkLmV4dGVuZCh7fSAsICQuZm4udG9vbHRpcC5Db25zdHJ1Y3Rvci5ERUZBVUxUUywge1xuICAgIHBsYWNlbWVudDogJ3JpZ2h0J1xuICAsIHRyaWdnZXI6ICdjbGljaydcbiAgLCBjb250ZW50OiAnJ1xuICAsIHRlbXBsYXRlOiAnPGRpdiBjbGFzcz1cInBvcG92ZXJcIj48ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj48aDMgY2xhc3M9XCJwb3BvdmVyLXRpdGxlXCI+PC9oMz48ZGl2IGNsYXNzPVwicG9wb3Zlci1jb250ZW50XCI+PC9kaXY+PC9kaXY+J1xuICB9KVxuXG5cbiAgLy8gTk9URTogUE9QT1ZFUiBFWFRFTkRTIHRvb2x0aXAuanNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBQb3BvdmVyLnByb3RvdHlwZSA9ICQuZXh0ZW5kKHt9LCAkLmZuLnRvb2x0aXAuQ29uc3RydWN0b3IucHJvdG90eXBlKVxuXG4gIFBvcG92ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUG9wb3ZlclxuXG4gIFBvcG92ZXIucHJvdG90eXBlLmdldERlZmF1bHRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBQb3BvdmVyLkRFRkFVTFRTXG4gIH1cblxuICBQb3BvdmVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciAkdGlwICAgID0gdGhpcy50aXAoKVxuICAgIHZhciB0aXRsZSAgID0gdGhpcy5nZXRUaXRsZSgpXG4gICAgdmFyIGNvbnRlbnQgPSB0aGlzLmdldENvbnRlbnQoKVxuXG4gICAgJHRpcC5maW5kKCcucG9wb3Zlci10aXRsZScpW3RoaXMub3B0aW9ucy5odG1sID8gJ2h0bWwnIDogJ3RleHQnXSh0aXRsZSlcbiAgICAkdGlwLmZpbmQoJy5wb3BvdmVyLWNvbnRlbnQnKVt0aGlzLm9wdGlvbnMuaHRtbCA/ICdodG1sJyA6ICd0ZXh0J10oY29udGVudClcblxuICAgICR0aXAucmVtb3ZlQ2xhc3MoJ2ZhZGUgdG9wIGJvdHRvbSBsZWZ0IHJpZ2h0IGluJylcblxuICAgIC8vIElFOCBkb2Vzbid0IGFjY2VwdCBoaWRpbmcgdmlhIHRoZSBgOmVtcHR5YCBwc2V1ZG8gc2VsZWN0b3IsIHdlIGhhdmUgdG8gZG9cbiAgICAvLyB0aGlzIG1hbnVhbGx5IGJ5IGNoZWNraW5nIHRoZSBjb250ZW50cy5cbiAgICBpZiAoISR0aXAuZmluZCgnLnBvcG92ZXItdGl0bGUnKS5odG1sKCkpICR0aXAuZmluZCgnLnBvcG92ZXItdGl0bGUnKS5oaWRlKClcbiAgfVxuXG4gIFBvcG92ZXIucHJvdG90eXBlLmhhc0NvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VGl0bGUoKSB8fCB0aGlzLmdldENvbnRlbnQoKVxuICB9XG5cbiAgUG9wb3Zlci5wcm90b3R5cGUuZ2V0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJGUgPSB0aGlzLiRlbGVtZW50XG4gICAgdmFyIG8gID0gdGhpcy5vcHRpb25zXG5cbiAgICByZXR1cm4gJGUuYXR0cignZGF0YS1jb250ZW50JylcbiAgICAgIHx8ICh0eXBlb2Ygby5jb250ZW50ID09ICdmdW5jdGlvbicgP1xuICAgICAgICAgICAgby5jb250ZW50LmNhbGwoJGVbMF0pIDpcbiAgICAgICAgICAgIG8uY29udGVudClcbiAgfVxuXG4gIFBvcG92ZXIucHJvdG90eXBlLmFycm93ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLiRhcnJvdyA9IHRoaXMuJGFycm93IHx8IHRoaXMudGlwKCkuZmluZCgnLmFycm93JylcbiAgfVxuXG4gIFBvcG92ZXIucHJvdG90eXBlLnRpcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuJHRpcCkgdGhpcy4kdGlwID0gJCh0aGlzLm9wdGlvbnMudGVtcGxhdGUpXG4gICAgcmV0dXJuIHRoaXMuJHRpcFxuICB9XG5cblxuICAvLyBQT1BPVkVSIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICB2YXIgb2xkID0gJC5mbi5wb3BvdmVyXG5cbiAgJC5mbi5wb3BvdmVyID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSAgICA9ICR0aGlzLmRhdGEoJ2JzLnBvcG92ZXInKVxuICAgICAgdmFyIG9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9uID09ICdvYmplY3QnICYmIG9wdGlvblxuXG4gICAgICBpZiAoIWRhdGEpICR0aGlzLmRhdGEoJ2JzLnBvcG92ZXInLCAoZGF0YSA9IG5ldyBQb3BvdmVyKHRoaXMsIG9wdGlvbnMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdzdHJpbmcnKSBkYXRhW29wdGlvbl0oKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLnBvcG92ZXIuQ29uc3RydWN0b3IgPSBQb3BvdmVyXG5cblxuICAvLyBQT1BPVkVSIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09PT1cblxuICAkLmZuLnBvcG92ZXIubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuLnBvcG92ZXIgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbn0od2luZG93LmpRdWVyeSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQm9vdHN0cmFwOiBzY3JvbGxzcHkuanMgdjMuMC4wXG4gKiBodHRwOi8vdHdicy5naXRodWIuY29tL2Jvb3RzdHJhcC9qYXZhc2NyaXB0Lmh0bWwjc2Nyb2xsc3B5XG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvcHlyaWdodCAyMDEyIFR3aXR0ZXIsIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5cbitmdW5jdGlvbiAoJCkgeyBcInVzZSBzdHJpY3RcIjtcblxuICAvLyBTQ1JPTExTUFkgQ0xBU1MgREVGSU5JVElPTlxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGZ1bmN0aW9uIFNjcm9sbFNweShlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdmFyIGhyZWZcbiAgICB2YXIgcHJvY2VzcyAgPSAkLnByb3h5KHRoaXMucHJvY2VzcywgdGhpcylcblxuICAgIHRoaXMuJGVsZW1lbnQgICAgICAgPSAkKGVsZW1lbnQpLmlzKCdib2R5JykgPyAkKHdpbmRvdykgOiAkKGVsZW1lbnQpXG4gICAgdGhpcy4kYm9keSAgICAgICAgICA9ICQoJ2JvZHknKVxuICAgIHRoaXMuJHNjcm9sbEVsZW1lbnQgPSB0aGlzLiRlbGVtZW50Lm9uKCdzY3JvbGwuYnMuc2Nyb2xsLXNweS5kYXRhLWFwaScsIHByb2Nlc3MpXG4gICAgdGhpcy5vcHRpb25zICAgICAgICA9ICQuZXh0ZW5kKHt9LCBTY3JvbGxTcHkuREVGQVVMVFMsIG9wdGlvbnMpXG4gICAgdGhpcy5zZWxlY3RvciAgICAgICA9ICh0aGlzLm9wdGlvbnMudGFyZ2V0XG4gICAgICB8fCAoKGhyZWYgPSAkKGVsZW1lbnQpLmF0dHIoJ2hyZWYnKSkgJiYgaHJlZi5yZXBsYWNlKC8uKig/PSNbXlxcc10rJCkvLCAnJykpIC8vc3RyaXAgZm9yIGllN1xuICAgICAgfHwgJycpICsgJyAubmF2IGxpID4gYSdcbiAgICB0aGlzLm9mZnNldHMgICAgICAgID0gJChbXSlcbiAgICB0aGlzLnRhcmdldHMgICAgICAgID0gJChbXSlcbiAgICB0aGlzLmFjdGl2ZVRhcmdldCAgID0gbnVsbFxuXG4gICAgdGhpcy5yZWZyZXNoKClcbiAgICB0aGlzLnByb2Nlc3MoKVxuICB9XG5cbiAgU2Nyb2xsU3B5LkRFRkFVTFRTID0ge1xuICAgIG9mZnNldDogMTBcbiAgfVxuXG4gIFNjcm9sbFNweS5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy4kZWxlbWVudFswXSA9PSB3aW5kb3cgPyAnb2Zmc2V0JyA6ICdwb3NpdGlvbidcblxuICAgIHRoaXMub2Zmc2V0cyA9ICQoW10pXG4gICAgdGhpcy50YXJnZXRzID0gJChbXSlcblxuICAgIHZhciBzZWxmICAgICA9IHRoaXNcbiAgICB2YXIgJHRhcmdldHMgPSB0aGlzLiRib2R5XG4gICAgICAuZmluZCh0aGlzLnNlbGVjdG9yKVxuICAgICAgLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZWwgICA9ICQodGhpcylcbiAgICAgICAgdmFyIGhyZWYgID0gJGVsLmRhdGEoJ3RhcmdldCcpIHx8ICRlbC5hdHRyKCdocmVmJylcbiAgICAgICAgdmFyICRocmVmID0gL14jXFx3Ly50ZXN0KGhyZWYpICYmICQoaHJlZilcblxuICAgICAgICByZXR1cm4gKCRocmVmXG4gICAgICAgICAgJiYgJGhyZWYubGVuZ3RoXG4gICAgICAgICAgJiYgW1sgJGhyZWZbb2Zmc2V0TWV0aG9kXSgpLnRvcCArICghJC5pc1dpbmRvdyhzZWxmLiRzY3JvbGxFbGVtZW50LmdldCgwKSkgJiYgc2VsZi4kc2Nyb2xsRWxlbWVudC5zY3JvbGxUb3AoKSksIGhyZWYgXV0pIHx8IG51bGxcbiAgICAgIH0pXG4gICAgICAuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYVswXSAtIGJbMF0gfSlcbiAgICAgIC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5vZmZzZXRzLnB1c2godGhpc1swXSlcbiAgICAgICAgc2VsZi50YXJnZXRzLnB1c2godGhpc1sxXSlcbiAgICAgIH0pXG4gIH1cblxuICBTY3JvbGxTcHkucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcm9sbFRvcCAgICA9IHRoaXMuJHNjcm9sbEVsZW1lbnQuc2Nyb2xsVG9wKCkgKyB0aGlzLm9wdGlvbnMub2Zmc2V0XG4gICAgdmFyIHNjcm9sbEhlaWdodCA9IHRoaXMuJHNjcm9sbEVsZW1lbnRbMF0uc2Nyb2xsSGVpZ2h0IHx8IHRoaXMuJGJvZHlbMF0uc2Nyb2xsSGVpZ2h0XG4gICAgdmFyIG1heFNjcm9sbCAgICA9IHNjcm9sbEhlaWdodCAtIHRoaXMuJHNjcm9sbEVsZW1lbnQuaGVpZ2h0KClcbiAgICB2YXIgb2Zmc2V0cyAgICAgID0gdGhpcy5vZmZzZXRzXG4gICAgdmFyIHRhcmdldHMgICAgICA9IHRoaXMudGFyZ2V0c1xuICAgIHZhciBhY3RpdmVUYXJnZXQgPSB0aGlzLmFjdGl2ZVRhcmdldFxuICAgIHZhciBpXG5cbiAgICBpZiAoc2Nyb2xsVG9wID49IG1heFNjcm9sbCkge1xuICAgICAgcmV0dXJuIGFjdGl2ZVRhcmdldCAhPSAoaSA9IHRhcmdldHMubGFzdCgpWzBdKSAmJiB0aGlzLmFjdGl2YXRlKGkpXG4gICAgfVxuXG4gICAgZm9yIChpID0gb2Zmc2V0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgIGFjdGl2ZVRhcmdldCAhPSB0YXJnZXRzW2ldXG4gICAgICAgICYmIHNjcm9sbFRvcCA+PSBvZmZzZXRzW2ldXG4gICAgICAgICYmICghb2Zmc2V0c1tpICsgMV0gfHwgc2Nyb2xsVG9wIDw9IG9mZnNldHNbaSArIDFdKVxuICAgICAgICAmJiB0aGlzLmFjdGl2YXRlKCB0YXJnZXRzW2ldIClcbiAgICB9XG4gIH1cblxuICBTY3JvbGxTcHkucHJvdG90eXBlLmFjdGl2YXRlID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHRoaXMuYWN0aXZlVGFyZ2V0ID0gdGFyZ2V0XG5cbiAgICAkKHRoaXMuc2VsZWN0b3IpXG4gICAgICAucGFyZW50cygnLmFjdGl2ZScpXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLnNlbGVjdG9yXG4gICAgICArICdbZGF0YS10YXJnZXQ9XCInICsgdGFyZ2V0ICsgJ1wiXSwnXG4gICAgICArIHRoaXMuc2VsZWN0b3IgKyAnW2hyZWY9XCInICsgdGFyZ2V0ICsgJ1wiXSdcblxuICAgIHZhciBhY3RpdmUgPSAkKHNlbGVjdG9yKVxuICAgICAgLnBhcmVudHMoJ2xpJylcbiAgICAgIC5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIGlmIChhY3RpdmUucGFyZW50KCcuZHJvcGRvd24tbWVudScpLmxlbmd0aCkgIHtcbiAgICAgIGFjdGl2ZSA9IGFjdGl2ZVxuICAgICAgICAuY2xvc2VzdCgnbGkuZHJvcGRvd24nKVxuICAgICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgfVxuXG4gICAgYWN0aXZlLnRyaWdnZXIoJ2FjdGl2YXRlJylcbiAgfVxuXG5cbiAgLy8gU0NST0xMU1BZIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHZhciBvbGQgPSAkLmZuLnNjcm9sbHNweVxuXG4gICQuZm4uc2Nyb2xsc3B5ID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSAgICA9ICR0aGlzLmRhdGEoJ2JzLnNjcm9sbHNweScpXG4gICAgICB2YXIgb3B0aW9ucyA9IHR5cGVvZiBvcHRpb24gPT0gJ29iamVjdCcgJiYgb3B0aW9uXG5cbiAgICAgIGlmICghZGF0YSkgJHRoaXMuZGF0YSgnYnMuc2Nyb2xsc3B5JywgKGRhdGEgPSBuZXcgU2Nyb2xsU3B5KHRoaXMsIG9wdGlvbnMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdzdHJpbmcnKSBkYXRhW29wdGlvbl0oKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLnNjcm9sbHNweS5Db25zdHJ1Y3RvciA9IFNjcm9sbFNweVxuXG5cbiAgLy8gU0NST0xMU1BZIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09PT09PVxuXG4gICQuZm4uc2Nyb2xsc3B5Lm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbi5zY3JvbGxzcHkgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBTQ1JPTExTUFkgREFUQS1BUElcbiAgLy8gPT09PT09PT09PT09PT09PT09XG5cbiAgJCh3aW5kb3cpLm9uKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICQoJ1tkYXRhLXNweT1cInNjcm9sbFwiXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRzcHkgPSAkKHRoaXMpXG4gICAgICAkc3B5LnNjcm9sbHNweSgkc3B5LmRhdGEoKSlcbiAgICB9KVxuICB9KVxuXG59KHdpbmRvdy5qUXVlcnkpO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEJvb3RzdHJhcDogdGFiLmpzIHYzLjAuMFxuICogaHR0cDovL3R3YnMuZ2l0aHViLmNvbS9ib290c3RyYXAvamF2YXNjcmlwdC5odG1sI3RhYnNcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29weXJpZ2h0IDIwMTIgVHdpdHRlciwgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cblxuK2Z1bmN0aW9uICgkKSB7IFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIFRBQiBDTEFTUyBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIFRhYiA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgdGhpcy5lbGVtZW50ID0gJChlbGVtZW50KVxuICB9XG5cbiAgVGFiLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciAkdGhpcyAgICA9IHRoaXMuZWxlbWVudFxuICAgIHZhciAkdWwgICAgICA9ICR0aGlzLmNsb3Nlc3QoJ3VsOm5vdCguZHJvcGRvd24tbWVudSknKVxuICAgIHZhciBzZWxlY3RvciA9ICR0aGlzLmF0dHIoJ2RhdGEtdGFyZ2V0JylcblxuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHNlbGVjdG9yID0gJHRoaXMuYXR0cignaHJlZicpXG4gICAgICBzZWxlY3RvciA9IHNlbGVjdG9yICYmIHNlbGVjdG9yLnJlcGxhY2UoLy4qKD89I1teXFxzXSokKS8sICcnKSAvL3N0cmlwIGZvciBpZTdcbiAgICB9XG5cbiAgICBpZiAoJHRoaXMucGFyZW50KCdsaScpLmhhc0NsYXNzKCdhY3RpdmUnKSkgcmV0dXJuXG5cbiAgICB2YXIgcHJldmlvdXMgPSAkdWwuZmluZCgnLmFjdGl2ZTpsYXN0IGEnKVswXVxuICAgIHZhciBlICAgICAgICA9ICQuRXZlbnQoJ3Nob3cuYnMudGFiJywge1xuICAgICAgcmVsYXRlZFRhcmdldDogcHJldmlvdXNcbiAgICB9KVxuXG4gICAgJHRoaXMudHJpZ2dlcihlKVxuXG4gICAgaWYgKGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHJldHVyblxuXG4gICAgdmFyICR0YXJnZXQgPSAkKHNlbGVjdG9yKVxuXG4gICAgdGhpcy5hY3RpdmF0ZSgkdGhpcy5wYXJlbnQoJ2xpJyksICR1bClcbiAgICB0aGlzLmFjdGl2YXRlKCR0YXJnZXQsICR0YXJnZXQucGFyZW50KCksIGZ1bmN0aW9uICgpIHtcbiAgICAgICR0aGlzLnRyaWdnZXIoe1xuICAgICAgICB0eXBlOiAnc2hvd24uYnMudGFiJ1xuICAgICAgLCByZWxhdGVkVGFyZ2V0OiBwcmV2aW91c1xuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgVGFiLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uIChlbGVtZW50LCBjb250YWluZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyICRhY3RpdmUgICAgPSBjb250YWluZXIuZmluZCgnPiAuYWN0aXZlJylcbiAgICB2YXIgdHJhbnNpdGlvbiA9IGNhbGxiYWNrXG4gICAgICAmJiAkLnN1cHBvcnQudHJhbnNpdGlvblxuICAgICAgJiYgJGFjdGl2ZS5oYXNDbGFzcygnZmFkZScpXG5cbiAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgJGFjdGl2ZVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgIC5maW5kKCc+IC5kcm9wZG93bi1tZW51ID4gLmFjdGl2ZScpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnYWN0aXZlJylcblxuICAgICAgZWxlbWVudC5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aCAvLyByZWZsb3cgZm9yIHRyYW5zaXRpb25cbiAgICAgICAgZWxlbWVudC5hZGRDbGFzcygnaW4nKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5yZW1vdmVDbGFzcygnZmFkZScpXG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50LnBhcmVudCgnLmRyb3Bkb3duLW1lbnUnKSkge1xuICAgICAgICBlbGVtZW50LmNsb3Nlc3QoJ2xpLmRyb3Bkb3duJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKClcbiAgICB9XG5cbiAgICB0cmFuc2l0aW9uID9cbiAgICAgICRhY3RpdmVcbiAgICAgICAgLm9uZSgkLnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIG5leHQpXG4gICAgICAgIC5lbXVsYXRlVHJhbnNpdGlvbkVuZCgxNTApIDpcbiAgICAgIG5leHQoKVxuXG4gICAgJGFjdGl2ZS5yZW1vdmVDbGFzcygnaW4nKVxuICB9XG5cblxuICAvLyBUQUIgUExVR0lOIERFRklOSVRJT05cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIG9sZCA9ICQuZm4udGFiXG5cbiAgJC5mbi50YWIgPSBmdW5jdGlvbiAoIG9wdGlvbiApIHtcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkdGhpcyA9ICQodGhpcylcbiAgICAgIHZhciBkYXRhICA9ICR0aGlzLmRhdGEoJ2JzLnRhYicpXG5cbiAgICAgIGlmICghZGF0YSkgJHRoaXMuZGF0YSgnYnMudGFiJywgKGRhdGEgPSBuZXcgVGFiKHRoaXMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdzdHJpbmcnKSBkYXRhW29wdGlvbl0oKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLnRhYi5Db25zdHJ1Y3RvciA9IFRhYlxuXG5cbiAgLy8gVEFCIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PVxuXG4gICQuZm4udGFiLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbi50YWIgPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBUQUIgREFUQS1BUElcbiAgLy8gPT09PT09PT09PT09XG5cbiAgJChkb2N1bWVudCkub24oJ2NsaWNrLmJzLnRhYi5kYXRhLWFwaScsICdbZGF0YS10b2dnbGU9XCJ0YWJcIl0sIFtkYXRhLXRvZ2dsZT1cInBpbGxcIl0nLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICQodGhpcykudGFiKCdzaG93JylcbiAgfSlcblxufSh3aW5kb3cualF1ZXJ5KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBCb290c3RyYXA6IGFmZml4LmpzIHYzLjAuMFxuICogaHR0cDovL3R3YnMuZ2l0aHViLmNvbS9ib290c3RyYXAvamF2YXNjcmlwdC5odG1sI2FmZml4XG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvcHlyaWdodCAyMDEyIFR3aXR0ZXIsIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5cbitmdW5jdGlvbiAoJCkgeyBcInVzZSBzdHJpY3RcIjtcblxuICAvLyBBRkZJWCBDTEFTUyBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT1cblxuICB2YXIgQWZmaXggPSBmdW5jdGlvbiAoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBZmZpeC5ERUZBVUxUUywgb3B0aW9ucylcbiAgICB0aGlzLiR3aW5kb3cgPSAkKHdpbmRvdylcbiAgICAgIC5vbignc2Nyb2xsLmJzLmFmZml4LmRhdGEtYXBpJywgJC5wcm94eSh0aGlzLmNoZWNrUG9zaXRpb24sIHRoaXMpKVxuICAgICAgLm9uKCdjbGljay5icy5hZmZpeC5kYXRhLWFwaScsICAkLnByb3h5KHRoaXMuY2hlY2tQb3NpdGlvbldpdGhFdmVudExvb3AsIHRoaXMpKVxuXG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudClcbiAgICB0aGlzLmFmZml4ZWQgID1cbiAgICB0aGlzLnVucGluICAgID0gbnVsbFxuXG4gICAgdGhpcy5jaGVja1Bvc2l0aW9uKClcbiAgfVxuXG4gIEFmZml4LlJFU0VUID0gJ2FmZml4IGFmZml4LXRvcCBhZmZpeC1ib3R0b20nXG5cbiAgQWZmaXguREVGQVVMVFMgPSB7XG4gICAgb2Zmc2V0OiAwXG4gIH1cblxuICBBZmZpeC5wcm90b3R5cGUuY2hlY2tQb3NpdGlvbldpdGhFdmVudExvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgc2V0VGltZW91dCgkLnByb3h5KHRoaXMuY2hlY2tQb3NpdGlvbiwgdGhpcyksIDEpXG4gIH1cblxuICBBZmZpeC5wcm90b3R5cGUuY2hlY2tQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaXMoJzp2aXNpYmxlJykpIHJldHVyblxuXG4gICAgdmFyIHNjcm9sbEhlaWdodCA9ICQoZG9jdW1lbnQpLmhlaWdodCgpXG4gICAgdmFyIHNjcm9sbFRvcCAgICA9IHRoaXMuJHdpbmRvdy5zY3JvbGxUb3AoKVxuICAgIHZhciBwb3NpdGlvbiAgICAgPSB0aGlzLiRlbGVtZW50Lm9mZnNldCgpXG4gICAgdmFyIG9mZnNldCAgICAgICA9IHRoaXMub3B0aW9ucy5vZmZzZXRcbiAgICB2YXIgb2Zmc2V0VG9wICAgID0gb2Zmc2V0LnRvcFxuICAgIHZhciBvZmZzZXRCb3R0b20gPSBvZmZzZXQuYm90dG9tXG5cbiAgICBpZiAodHlwZW9mIG9mZnNldCAhPSAnb2JqZWN0JykgICAgICAgICBvZmZzZXRCb3R0b20gPSBvZmZzZXRUb3AgPSBvZmZzZXRcbiAgICBpZiAodHlwZW9mIG9mZnNldFRvcCA9PSAnZnVuY3Rpb24nKSAgICBvZmZzZXRUb3AgICAgPSBvZmZzZXQudG9wKClcbiAgICBpZiAodHlwZW9mIG9mZnNldEJvdHRvbSA9PSAnZnVuY3Rpb24nKSBvZmZzZXRCb3R0b20gPSBvZmZzZXQuYm90dG9tKClcblxuICAgIHZhciBhZmZpeCA9IHRoaXMudW5waW4gICAhPSBudWxsICYmIChzY3JvbGxUb3AgKyB0aGlzLnVucGluIDw9IHBvc2l0aW9uLnRvcCkgPyBmYWxzZSA6XG4gICAgICAgICAgICAgICAgb2Zmc2V0Qm90dG9tICE9IG51bGwgJiYgKHBvc2l0aW9uLnRvcCArIHRoaXMuJGVsZW1lbnQuaGVpZ2h0KCkgPj0gc2Nyb2xsSGVpZ2h0IC0gb2Zmc2V0Qm90dG9tKSA/ICdib3R0b20nIDpcbiAgICAgICAgICAgICAgICBvZmZzZXRUb3AgICAgIT0gbnVsbCAmJiAoc2Nyb2xsVG9wIDw9IG9mZnNldFRvcCkgPyAndG9wJyA6IGZhbHNlXG5cbiAgICBpZiAodGhpcy5hZmZpeGVkID09PSBhZmZpeCkgcmV0dXJuXG4gICAgaWYgKHRoaXMudW5waW4pIHRoaXMuJGVsZW1lbnQuY3NzKCd0b3AnLCAnJylcblxuICAgIHRoaXMuYWZmaXhlZCA9IGFmZml4XG4gICAgdGhpcy51bnBpbiAgID0gYWZmaXggPT0gJ2JvdHRvbScgPyBwb3NpdGlvbi50b3AgLSBzY3JvbGxUb3AgOiBudWxsXG5cbiAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKEFmZml4LlJFU0VUKS5hZGRDbGFzcygnYWZmaXgnICsgKGFmZml4ID8gJy0nICsgYWZmaXggOiAnJykpXG5cbiAgICBpZiAoYWZmaXggPT0gJ2JvdHRvbScpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KHsgdG9wOiBkb2N1bWVudC5ib2R5Lm9mZnNldEhlaWdodCAtIG9mZnNldEJvdHRvbSAtIHRoaXMuJGVsZW1lbnQuaGVpZ2h0KCkgfSlcbiAgICB9XG4gIH1cblxuXG4gIC8vIEFGRklYIFBMVUdJTiBERUZJTklUSU9OXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgdmFyIG9sZCA9ICQuZm4uYWZmaXhcblxuICAkLmZuLmFmZml4ID0gZnVuY3Rpb24gKG9wdGlvbikge1xuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0aGlzICAgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSAgICA9ICR0aGlzLmRhdGEoJ2JzLmFmZml4JylcbiAgICAgIHZhciBvcHRpb25zID0gdHlwZW9mIG9wdGlvbiA9PSAnb2JqZWN0JyAmJiBvcHRpb25cblxuICAgICAgaWYgKCFkYXRhKSAkdGhpcy5kYXRhKCdicy5hZmZpeCcsIChkYXRhID0gbmV3IEFmZml4KHRoaXMsIG9wdGlvbnMpKSlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9uID09ICdzdHJpbmcnKSBkYXRhW29wdGlvbl0oKVxuICAgIH0pXG4gIH1cblxuICAkLmZuLmFmZml4LkNvbnN0cnVjdG9yID0gQWZmaXhcblxuXG4gIC8vIEFGRklYIE5PIENPTkZMSUNUXG4gIC8vID09PT09PT09PT09PT09PT09XG5cbiAgJC5mbi5hZmZpeC5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm4uYWZmaXggPSBvbGRcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cblxuICAvLyBBRkZJWCBEQVRBLUFQSVxuICAvLyA9PT09PT09PT09PT09PVxuXG4gICQod2luZG93KS5vbignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAkKCdbZGF0YS1zcHk9XCJhZmZpeFwiXScpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRzcHkgPSAkKHRoaXMpXG4gICAgICB2YXIgZGF0YSA9ICRzcHkuZGF0YSgpXG5cbiAgICAgIGRhdGEub2Zmc2V0ID0gZGF0YS5vZmZzZXQgfHwge31cblxuICAgICAgaWYgKGRhdGEub2Zmc2V0Qm90dG9tKSBkYXRhLm9mZnNldC5ib3R0b20gPSBkYXRhLm9mZnNldEJvdHRvbVxuICAgICAgaWYgKGRhdGEub2Zmc2V0VG9wKSAgICBkYXRhLm9mZnNldC50b3AgICAgPSBkYXRhLm9mZnNldFRvcFxuXG4gICAgICAkc3B5LmFmZml4KGRhdGEpXG4gICAgfSlcbiAgfSlcblxufSh3aW5kb3cualF1ZXJ5KTtcbiJdfQ==
