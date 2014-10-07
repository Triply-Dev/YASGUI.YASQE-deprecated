// TODO actually recognize syntax of TypeScript constructs

// CMRESOURCES

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C, "debugger": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "module": kw("module"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               state.lastType == "sof" || /^[\[{}\(,;:]$/.test(state.lastType)) {
        readRegexp(stream);
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      } else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", "operator", stream.current());
    } else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) break;
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (/[$\w]/.test(ch)) {
        sawSomething = true;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") return cont(pushlex("form"), expression, statement, poplex, maybeelse);
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "module") return cont(pushlex("form"), pushcontext, afterModule, popcontext, poplex);
    if (type == "class") return cont(pushlex("form"), className, objlit, poplex);
    if (type == "export") return cont(pushlex("form"), afterExport, poplex);
    if (type == "import") return cont(pushlex("form"), afterImport, poplex);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(pattern, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef);
    if (type == "keyword c") return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, comprehension, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expressionNoComma);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (value == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { cx.cc.push(me); return quasi(value); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
  }
  function quasi(value) {
    if (value.slice(value.length - 2) != "${") return cont();
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont();
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    if (type == "{") return pass(statement);
    return pass(expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    if (type == "{") return pass(statement);
    return pass(expressionNoComma);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (type + " property");
    } else if (type == "[") {
      return cont(expression, expect("]"), afterprop);
    }
    if (atomicTypes.hasOwnProperty(type)) return cont(afterprop);
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (isTS && type == ":") return cont(typedef);
  }
  function typedef(type) {
    if (type == "variable"){cx.marked = "variable-3"; return cont();}
  }
  function vardef() {
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (type == "variable") { register(value); return cont(); }
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type) {
    if (type == "spread") return cont(funarg);
    return pass(pattern, maybetype);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(_type, value) {
    if (value == "extends") return cont(expression);
  }
  function objlit(type) {
    if (type == "{") return contCommasep(objprop, "}");
  }
  function afterModule(type, value) {
    if (type == "string") return cont(statement);
    if (type == "variable") { register(value); return cont(maybeFrom); }
  }
  function afterExport(_type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    return pass(statement);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    return cont();
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(expressionNoComma, maybeArrayComprehension);
  }
  function maybeArrayComprehension(type) {
    if (type == "for") return pass(comprehension, expect("]"));
    if (type == ",") return cont(commasep(expressionNoComma, "]"));
    return pass(commasep(expressionNoComma, "]"));
  }
  function comprehension(type) {
    if (type == "for") return cont(forspec, comprehension);
    if (type == "if") return cont(expression, comprehension);
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}",
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",
    fold: "brace",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode
  };
});

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var multilineTagIndentFactor = parserConfig.multilineTagIndentFactor || 1;
  var multilineTagIndentPastTag = parserConfig.multilineTagIndentPastTag;
  if (multilineTagIndentPastTag == null) multilineTagIndentPastTag = true;

  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                      'track': true, 'wbr': true},
    implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                       'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                       'th': true, 'tr': true},
    contextGrabbers: {
      'dd': {'dd': true, 'dt': true},
      'dt': {'dd': true, 'dt': true},
      'li': {'li': true},
      'option': {'option': true, 'optgroup': true},
      'optgroup': {'optgroup': true},
      'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
            'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
            'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
            'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
            'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
      'rp': {'rp': true, 'rt': true},
      'rt': {'rp': true, 'rt': true},
      'tbody': {'tbody': true, 'tfoot': true},
      'td': {'td': true, 'th': true},
      'tfoot': {'tbody': true},
      'th': {'td': true, 'th': true},
      'thead': {'tbody': true, 'tfoot': true},
      'tr': {'tr': true}
    },
    doNotIndent: {"pre": true},
    allowUnquoted: true,
    allowMissing: true,
    caseFold: true
  } : {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false,
    caseFold: false
  };
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var tagName, type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        } else if (stream.match("--")) {
          return chain(inBlock("comment", "-->"));
        } else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      } else {
        var isClose = stream.eat("/");
        tagName = "";
        var c;
        while ((c = stream.eat(/[^\s\u00a0=<>\"\'\/?]/))) tagName += c;
        if (Kludges.caseFold) tagName = tagName.toLowerCase();
        if (!tagName) return "tag error";
        type = isClose ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag";
      }
    } else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "<") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " error" : "error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.eatWhile(/[^\s\u00a0=<>\"\']/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (Kludges.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) ||
          !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagName = tagName;
      state.tagStart = stream.column();
      return attrState;
    } else if (type == "closeTag") {
      var err = false;
      if (state.context) {
        if (state.context.tagName != tagName) {
          if (Kludges.implicitlyClosed.hasOwnProperty(state.context.tagName))
            popContext(state);
          err = !state.context || state.context.tagName != tagName;
        }
      } else {
        err = true;
      }
      if (err) setStyle = "error";
      return err ? closeStateErr : closeState;
    } else {
      return baseState;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          Kludges.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!Kludges.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function() {
      return {tokenize: inText,
              state: baseState,
              indented: 0,
              tagName: null, tagStart: null,
              context: null};
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      tagName = type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        return state.stringStartCol + 1;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (multilineTagIndentPastTag)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * multilineTagIndentFactor;
      }
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      if (context && /^<\//.test(textAfter))
        context = context.prev;
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    electricChars: "/",
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: parserConfig.htmlMode ? "html" : "xml",
    helperType: parserConfig.htmlMode ? "html" : "xml"
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});

});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("turtle", function(config) {
  var indentUnit = config.indentUnit;
  var curPunc;

  function wordRegexp(words) {
    return new RegExp("^(?:" + words.join("|") + ")$", "i");
  }
  var ops = wordRegexp([]);
  var keywords = wordRegexp(["@prefix", "@base", "a"]);
  var operatorChars = /[*+\-<>=&|]/;

  function tokenBase(stream, state) {
    var ch = stream.next();
    curPunc = null;
    if (ch == "<" && !stream.match(/^[\s\u00a0=]/, false)) {
      stream.match(/^[^\s\u00a0>]*>?/);
      return "atom";
    }
    else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenLiteral(ch);
      return state.tokenize(stream, state);
    }
    else if (/[{}\(\),\.;\[\]]/.test(ch)) {
      curPunc = ch;
      return null;
    }
    else if (ch == "#") {
      stream.skipToEnd();
      return "comment";
    }
    else if (operatorChars.test(ch)) {
      stream.eatWhile(operatorChars);
      return null;
    }
    else if (ch == ":") {
          return "operator";
        } else {
      stream.eatWhile(/[_\w\d]/);
      if(stream.peek() == ":") {
        return "variable-3";
      } else {
             var word = stream.current();

             if(keywords.test(word)) {
                        return "meta";
             }

             if(ch >= "A" && ch <= "Z") {
                    return "comment";
                 } else {
                        return "keyword";
                 }
      }
      var word = stream.current();
      if (ops.test(word))
        return null;
      else if (keywords.test(word))
        return "meta";
      else
        return "variable";
    }
  }

  function tokenLiteral(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped) {
          state.tokenize = tokenBase;
          break;
        }
        escaped = !escaped && ch == "\\";
      }
      return "string";
    };
  }

  function pushContext(state, type, col) {
    state.context = {prev: state.context, indent: state.indent, col: col, type: type};
  }
  function popContext(state) {
    state.indent = state.context.indent;
    state.context = state.context.prev;
  }

  return {
    startState: function() {
      return {tokenize: tokenBase,
              context: null,
              indent: 0,
              col: 0};
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (state.context && state.context.align == null) state.context.align = false;
        state.indent = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);

      if (style != "comment" && state.context && state.context.align == null && state.context.type != "pattern") {
        state.context.align = true;
      }

      if (curPunc == "(") pushContext(state, ")", stream.column());
      else if (curPunc == "[") pushContext(state, "]", stream.column());
      else if (curPunc == "{") pushContext(state, "}", stream.column());
      else if (/[\]\}\)]/.test(curPunc)) {
        while (state.context && state.context.type == "pattern") popContext(state);
        if (state.context && curPunc == state.context.type) popContext(state);
      }
      else if (curPunc == "." && state.context && state.context.type == "pattern") popContext(state);
      else if (/atom|string|variable/.test(style) && state.context) {
        if (/[\}\]]/.test(state.context.type))
          pushContext(state, "pattern", stream.column());
        else if (state.context.type == "pattern" && !state.context.align) {
          state.context.align = true;
          state.context.col = stream.column();
        }
      }

      return style;
    },

    indent: function(state, textAfter) {
      var firstChar = textAfter && textAfter.charAt(0);
      var context = state.context;
      if (/[\]\}]/.test(firstChar))
        while (context && context.type == "pattern") context = context.prev;

      var closing = context && firstChar == context.type;
      if (!context)
        return 0;
      else if (context.type == "pattern")
        return context.col;
      else if (context.align)
        return context.col + (closing ? 0 : 1);
      else
        return context.indent + (closing ? 0 : indentUnit);
    }
  };
});

CodeMirror.defineMIME("text/turtle", "turtle");

});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
  var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

  CodeMirror.showHint = function(cm, getHints, options) {
    // We want a single cursor position.
    if (cm.listSelections().length > 1 || cm.somethingSelected()) return;
    if (getHints == null) {
      if (options && options.async) return;
      else getHints = CodeMirror.hint.auto;
    }

    if (cm.state.completionActive) cm.state.completionActive.close();

    var completion = cm.state.completionActive = new Completion(cm, getHints, options || {});
    CodeMirror.signal(cm, "startCompletion", cm);
    if (completion.options.async)
      getHints(cm, function(hints) { completion.showHints(hints); }, completion.options);
    else
      return completion.showHints(getHints(cm, completion.options));
  };

  function Completion(cm, getHints, options) {
    this.cm = cm;
    this.getHints = getHints;
    this.options = options;
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
      else this.cm.replaceRange(getText(completion), completion.from||data.from, completion.to||data.to);
      CodeMirror.signal(data, "pick", completion);
      this.close();
    },

    showHints: function(data) {
      if (!data || !data.list.length || !this.active()) return this.close();

      if (this.options.completeSingle != false && data.list.length == 1)
        this.pick(data, 0);
      else
        this.showWidget(data);
    },

    showWidget: function(data) {
      this.widget = new Widget(this, data);
      CodeMirror.signal(data, "shown");

      var debounce = 0, completion = this, finished;
      var closeOn = this.options.closeCharacters || /[\s()\[\]{};:>,]/;
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
        if (completion.options.async)
          completion.getHints(completion.cm, finishUpdate, completion.options);
        else
          finishUpdate(completion.getHints(completion.cm, completion.options));
      }
      function finishUpdate(data_) {
        data = data_;
        if (finished) return;
        if (!data || !data.list.length) return done();
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
    }
  };

  function getText(completion) {
    if (typeof completion == "string") return completion;
    else return completion.text;
  }

  function buildKeyMap(options, handle) {
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
    var ourMap = options.customKeys ? {} : baseMap;
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
    if (options.customKeys)
      for (var key in options.customKeys) if (options.customKeys.hasOwnProperty(key))
        addBinding(key, options.customKeys[key]);
    if (options.extraKeys)
      for (var key in options.extraKeys) if (options.extraKeys.hasOwnProperty(key))
        addBinding(key, options.extraKeys[key]);
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
    var widget = this, cm = completion.cm, options = completion.options;

    var hints = this.hints = document.createElement("ul");
    hints.className = "CodeMirror-hints";
    this.selectedHint = options.getDefaultSelection ? options.getDefaultSelection(cm,options,data) : 0;

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

    var pos = cm.cursorCoords(options.alignWithWord !== false ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + "px";
    hints.style.top = top + "px";
    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    (options.container || document.body).appendChild(hints);
    var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
    if (overlapY > 0) {
      var height = box.bottom - box.top, curTop = box.top - (pos.bottom - pos.top);
      if (curTop - height > 0) { // Fits above cursor
        hints.style.top = (top = curTop - height) + "px";
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

    cm.addKeyMap(this.keyMap = buildKeyMap(options, {
      moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
      setFocus: function(n) { widget.changeActive(n); },
      menuSize: function() { return widget.screenAmount(); },
      length: completions.length,
      close: function() { completion.close(); },
      pick: function() { widget.pick(); },
      data: data
    }));

    if (options.closeOnUnfocus !== false) {
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
        if (options.completeOnSingleClick) widget.pick();
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
      if (this.completion.options.closeOnUnfocus !== false) {
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
});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
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
            if (doc.getLine(ln).slice(0, origTarget[last].length) != target[last]) return;
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

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
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
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 500;

    var stack = [], re = /[(){}[\]]/;
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
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen &&
          match.to && cm.getLine(match.to.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to)
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
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict){
    return findMatchingBracket(this, pos, strict);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style){
    return scanForBracket(this, pos, dir, style);
  });
});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
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
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};

});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
  CodeMirror.extendMode("css", {
    commentStart: "/*",
    commentEnd: "*/",
    newlineAfterToken: function(_type, content) {
      return /^[;{}]$/.test(content);
    }
  });

  CodeMirror.extendMode("javascript", {
    commentStart: "/*",
    commentEnd: "*/",
    // FIXME semicolons inside of for
    newlineAfterToken: function(_type, content, textAfter, state) {
      if (this.jsonMode) {
        return /^[\[,{]$/.test(content) || /^}/.test(textAfter);
      } else {
        if (content == ";" && state.lexical && state.lexical.type == ")") return false;
        return /^[;{}]$/.test(content) && !/^;/.test(textAfter);
      }
    }
  });

  var inlineElements = /^(a|abbr|acronym|area|base|bdo|big|br|button|caption|cite|code|col|colgroup|dd|del|dfn|em|frame|hr|iframe|img|input|ins|kbd|label|legend|link|map|object|optgroup|option|param|q|samp|script|select|small|span|strong|sub|sup|textarea|tt|var)$/;

  CodeMirror.extendMode("xml", {
    commentStart: "<!--",
    commentEnd: "-->",
    newlineAfterToken: function(type, content, textAfter, state) {
      var inline = false;
      if (this.configuration == "html")
        inline = state.context ? inlineElements.test(state.context.tagName) : false;
      return !inline && ((type == "tag" && />$/.test(content) && state.context) ||
                         /^</.test(textAfter));
    }
  });

  // Comment/uncomment the specified range
  CodeMirror.defineExtension("commentRange", function (isComment, from, to) {
    var cm = this, curMode = CodeMirror.innerMode(cm.getMode(), cm.getTokenAt(from).state).mode;
    cm.operation(function() {
      if (isComment) { // Comment range
        cm.replaceRange(curMode.commentEnd, to);
        cm.replaceRange(curMode.commentStart, from);
        if (from.line == to.line && from.ch == to.ch) // An empty comment inserted - put cursor inside
          cm.setCursor(from.line, from.ch + curMode.commentStart.length);
      } else { // Uncomment range
        var selText = cm.getRange(from, to);
        var startIndex = selText.indexOf(curMode.commentStart);
        var endIndex = selText.lastIndexOf(curMode.commentEnd);
        if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
          // Take string till comment start
          selText = selText.substr(0, startIndex)
          // From comment start till comment end
            + selText.substring(startIndex + curMode.commentStart.length, endIndex)
          // From comment end till string end
            + selText.substr(endIndex + curMode.commentEnd.length);
        }
        cm.replaceRange(selText, from, to);
      }
    });
  });

  // Applies automatic mode-aware indentation to the specified range
  CodeMirror.defineExtension("autoIndentRange", function (from, to) {
    var cmInstance = this;
    this.operation(function () {
      for (var i = from.line; i <= to.line; i++) {
        cmInstance.indentLine(i, "smart");
      }
    });
  });

  // Applies automatic formatting to the specified range
  CodeMirror.defineExtension("autoFormatRange", function (from, to) {
    var cm = this;
    var outer = cm.getMode(), text = cm.getRange(from, to).split("\n");
    var state = CodeMirror.copyState(outer, cm.getTokenAt(from).state);
    var tabSize = cm.getOption("tabSize");

    var out = "", lines = 0, atSol = from.ch == 0;
    function newline() {
      out += "\n";
      atSol = true;
      ++lines;
    }

    for (var i = 0; i < text.length; ++i) {
      var stream = new CodeMirror.StringStream(text[i], tabSize);
      while (!stream.eol()) {
        var inner = CodeMirror.innerMode(outer, state);
        var style = outer.token(stream, state), cur = stream.current();
        stream.start = stream.pos;
        if (!atSol || /\S/.test(cur)) {
          out += cur;
          atSol = false;
        }
        if (!atSol && inner.mode.newlineAfterToken &&
            inner.mode.newlineAfterToken(style, cur, stream.string.slice(stream.pos) || text[i+1] || "", inner.state))
          newline();
      }
      if (!stream.pos && outer.blankLine) outer.blankLine(state);
      if (!atSol && i < text.length - 1) newline();
    }

    cm.operation(function () {
      cm.replaceRange(out, from, to);
      for (var cur = from.line + 1, end = from.line + lines; cur <= end; ++cur)
        cm.indentLine(cur, "smart");
      cm.setSelection(from, cm.getCursor(false));
    });
  });
});


(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror"));
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
					if (s=="SELECT" || s=="CONSTRUCT" || s=="ASK" || s=="DESCRIBE")
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
