// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

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

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

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

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

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

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

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
    if (!stream.string && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start, state);
      stream.start = stream.pos;
    }
  }
};

});

!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.YASQE=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(_dereq_,module,exports){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(_dereq_,module,exports){
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

},{}],4:[function(_dereq_,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.2.0",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasqe.yasgui.org/license.txt"
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
  "_id": "yasgui-utils@1.2.0",
  "dist": {
    "shasum": "f386a1f14518bcf911bad0db41ccf2fd12bc1ea6"
  },
  "_from": "yasgui-utils@1.2.0",
  "_resolved": "https://registry.npmjs.org/yasgui-utils/-/yasgui-utils-1.2.0.tgz"
}

},{}],5:[function(_dereq_,module,exports){
/**
 * Determine unique ID of the YASQE object. Useful when several objects are
 * loaded on the same page, and all have 'persistency' enabled. Currently, the
 * ID is determined by selecting the nearest parent in the DOM with an ID set
 * 
 * @param doc {YASQE}
 * @method YASQE.determineId
 */
var root = module.exports = function(element) {
	if (element.closest) {
		return element.closest('[id]').attr('id');
	} else {
		var id = undefined;
		var parent = element;
		while (parent && id == undefined) {
			if (parent && parent.getAttribute && parent.getAttribute('id') && parent.getAttribute('id').length > 0) 
				id = parent.getAttribute('id');
			parent = parent.parentNode;
		}
		return id;
	}
};

},{}],6:[function(_dereq_,module,exports){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
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
			var parser = new DOMParser();
			var dom = parser.parseFromString(svgString, "text/xml");
			var svg = dom.documentElement;
			var svgContainer = $("<div></div>").css("display", "inline-block");
			if (!config.width) config.width = "100%";
			if (!config.height) config.height = "100%";
			svgContainer.width(config.width).height(config.height);
			return svgContainer.append(svg);
		}
		return false;
	}
};
},{}],"2i9Hdz":[function(_dereq_,module,exports){
window.console = window.console || {"log":function(){}};//make sure any console statements don't break IE
module.exports = {
	storage: _dereq_("./storage.js"),
	determineId: _dereq_("./determineId.js"),
	imgs: _dereq_("./imgs.js"),
	version: {
		"yasgui-utils" : _dereq_("../package.json").version,
	}
};

},{"../package.json":4,"./determineId.js":5,"./imgs.js":6,"./storage.js":9}],"yasgui-utils":[function(_dereq_,module,exports){
module.exports=_dereq_('2i9Hdz');
},{}],9:[function(_dereq_,module,exports){
var store = (typeof window !== "undefined" ? window.store : typeof global !== "undefined" ? global.store : null);
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
},{}],10:[function(_dereq_,module,exports){
module.exports={
  "name": "yasgui-yasqe",
  "description": "Yet Another SPARQL Query Editor",
  "version": "1.4.0",
  "main": "src/main.js",
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasqe.yasgui.org/license.txt"
    }
  ],
  "devDependencies": {
    "browserify": "^3.38.1",
    "browserify-shim": "^3.7.0",
    "gulp": "~3.6.0",
    "gulp-concat": "^2.4.1",
    "gulp-connect": "^2.0.5",
    "gulp-embedlr": "^0.5.2",
    "gulp-jsvalidate": "^0.2.0",
    "require-dir": "^0.1.0",
    "gulp-bump": "^0.1.11",
    "run-sequence": "^1.0.1",
    "gulp-git": "^0.5.2",
    "gulp-filter": "^1.0.2",
    "gulp-tag-version": "^1.1.0",
    "gulp-livereload": "^1.3.1",
    "gulp-minify-css": "^0.3.0",
    "gulp-notify": "^1.2.5",
    "gulp-rename": "^1.2.0",
    "gulp-replace": "^0.4.0",
    "gulp-streamify": "0.0.5",
    "gulp-uglify": "^0.2.1",
    "gulp-yuidoc": "^0.1.2",
    "merge-stream": "^0.1.6",
    "require-dir": "^0.1.0",
    "vinyl-buffer": "0.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4"
  },
  "bugs": "https://github.com/YASGUI/YASQE/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
  "homepage": "http://yasqe.yasgui.org",
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
    "codemirror": "~4.2.0",
    "amplify": "0.0.11",
    "store": "^1.3.14",
    "twitter-bootstrap-3.0.0": "^3.0.0",
    "yasgui-utils": "^1.0.0"
  },
  "browserify-shim": {
    "jquery": "global:jQuery",
    "codemirror": "global:CodeMirror"
  },
  "browserify": {
    "transform": [
      "browserify-shim"
    ]
  }
}

},{}],11:[function(_dereq_,module,exports){
(function (global){
'use strict';
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var CodeMirror = (typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null);

// require('codemirror/addon/hint/show-hint.js');
// require('codemirror/addon/search/searchcursor.js');
// require('codemirror/addon/edit/matchbrackets.js');
// require('codemirror/addon/runmode/runmode.js');

window.console = window.console || {"log":function(){}};//make sure any console statements

_dereq_('../lib/flint.js');
var Trie = _dereq_('../lib/trie.js');

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
	console.log('blaat');
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
		if (storageId) _dereq_("yasgui-utils").storage.set(storageId, completions, "month");
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
		var valueFromStorage = _dereq_("yasgui-utils").storage.get(storageId);
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
		cm.options.consumeShareLink(cm);
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
			completionsFromStorage = _dereq_("yasgui-utils").storage.get(
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
	var buttons = $(cm.getWrapperElement()).find(".yasqe_buttons");
	if (buttons.is(":visible")) buttons.css("right", offset);
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
root.consumeShareLink = function(cm) {
	_dereq_("../lib/deparam.js");
	var urlParams = $.deparam(window.location.search.substring(1));
	if (urlParams.query) {
		cm.setValue(urlParams.query);
	}
};

root.drawButtons = function(cm) {
	var header = $("<div class='yasqe_buttons'></div>").appendTo($(cm.getWrapperElement()));
	
	if (cm.options.createShareLink) {
		
		var svgShare = _dereq_("yasgui-utils").imgs.getElement({id: "share", width: "30px", height: "30px"});
		svgShare.click(function(event){
			event.stopPropagation();
			var popup = $("<div class='yasqe_sharePopup'></div>").appendTo(header);
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
		.appendTo(header);
		
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
		 	.appendTo(header);
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
			.append(_dereq_("yasgui-utils").imgs.getElement({id: queryButtonIds[status], width: "100%", height: "100%"}));
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
		_dereq_("yasgui-utils").storage.set(storageId, cm.getValue(), "month");
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
		ajaxConfig.complete = updateQueryButton();
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
		.append(_dereq_("yasgui-utils").imgs.getElement({id: "loader", width: "18px", height: "18px"}).css("vertical-align", "middle"));
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
	"YASQE" : _dereq_("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": _dereq_("yasgui-utils").version
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/deparam.js":1,"../lib/flint.js":2,"../lib/trie.js":3,"../package.json":10}]},{},[11])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbGliL2RlcGFyYW0uanMiLCIvaG9tZS9scmQ5MDAveWFzZ3VpL3lhc3FlL2xpYi9mbGludC5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbGliL3RyaWUuanMiLCIvaG9tZS9scmQ5MDAveWFzZ3VpL3lhc3FlL25vZGVfbW9kdWxlcy95YXNndWktdXRpbHMvcGFja2FnZS5qc29uIiwiL2hvbWUvbHJkOTAwL3lhc2d1aS95YXNxZS9ub2RlX21vZHVsZXMveWFzZ3VpLXV0aWxzL3NyYy9kZXRlcm1pbmVJZC5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvaW1ncy5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvbWFpbi5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvbm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvc3RvcmFnZS5qcyIsIi9ob21lL2xyZDkwMC95YXNndWkveWFzcWUvcGFja2FnZS5qc29uIiwiL2hvbWUvbHJkOTAwL3lhc2d1aS95YXNxZS9zcmMvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3p3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qXG4gIGpRdWVyeSBkZXBhcmFtIGlzIGFuIGV4dHJhY3Rpb24gb2YgdGhlIGRlcGFyYW0gbWV0aG9kIGZyb20gQmVuIEFsbWFuJ3MgalF1ZXJ5IEJCUVxuICBodHRwOi8vYmVuYWxtYW4uY29tL3Byb2plY3RzL2pxdWVyeS1iYnEtcGx1Z2luL1xuKi9cbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbiQuZGVwYXJhbSA9IGZ1bmN0aW9uIChwYXJhbXMsIGNvZXJjZSkge1xudmFyIG9iaiA9IHt9LFxuXHRjb2VyY2VfdHlwZXMgPSB7ICd0cnVlJzogITAsICdmYWxzZSc6ICExLCAnbnVsbCc6IG51bGwgfTtcbiAgXG4vLyBJdGVyYXRlIG92ZXIgYWxsIG5hbWU9dmFsdWUgcGFpcnMuXG4kLmVhY2gocGFyYW1zLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChqLHYpIHtcbiAgdmFyIHBhcmFtID0gdi5zcGxpdCgnPScpLFxuXHQgIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXJhbVswXSksXG5cdCAgdmFsLFxuXHQgIGN1ciA9IG9iaixcblx0ICBpID0gMCxcblx0XHRcblx0ICAvLyBJZiBrZXkgaXMgbW9yZSBjb21wbGV4IHRoYW4gJ2ZvbycsIGxpa2UgJ2FbXScgb3IgJ2FbYl1bY10nLCBzcGxpdCBpdFxuXHQgIC8vIGludG8gaXRzIGNvbXBvbmVudCBwYXJ0cy5cblx0ICBrZXlzID0ga2V5LnNwbGl0KCddWycpLFxuXHQgIGtleXNfbGFzdCA9IGtleXMubGVuZ3RoIC0gMTtcblx0XG4gIC8vIElmIHRoZSBmaXJzdCBrZXlzIHBhcnQgY29udGFpbnMgWyBhbmQgdGhlIGxhc3QgZW5kcyB3aXRoIF0sIHRoZW4gW11cbiAgLy8gYXJlIGNvcnJlY3RseSBiYWxhbmNlZC5cbiAgaWYgKC9cXFsvLnRlc3Qoa2V5c1swXSkgJiYgL1xcXSQvLnRlc3Qoa2V5c1trZXlzX2xhc3RdKSkge1xuXHQvLyBSZW1vdmUgdGhlIHRyYWlsaW5nIF0gZnJvbSB0aGUgbGFzdCBrZXlzIHBhcnQuXG5cdGtleXNba2V5c19sYXN0XSA9IGtleXNba2V5c19sYXN0XS5yZXBsYWNlKC9cXF0kLywgJycpO1xuXHQgIFxuXHQvLyBTcGxpdCBmaXJzdCBrZXlzIHBhcnQgaW50byB0d28gcGFydHMgb24gdGhlIFsgYW5kIGFkZCB0aGVtIGJhY2sgb250b1xuXHQvLyB0aGUgYmVnaW5uaW5nIG9mIHRoZSBrZXlzIGFycmF5LlxuXHRrZXlzID0ga2V5cy5zaGlmdCgpLnNwbGl0KCdbJykuY29uY2F0KGtleXMpO1xuXHQgIFxuXHRrZXlzX2xhc3QgPSBrZXlzLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSB7XG5cdC8vIEJhc2ljICdmb28nIHN0eWxlIGtleS5cblx0a2V5c19sYXN0ID0gMDtcbiAgfVxuXHRcbiAgLy8gQXJlIHdlIGRlYWxpbmcgd2l0aCBhIG5hbWU9dmFsdWUgcGFpciwgb3IganVzdCBhIG5hbWU/XG4gIGlmIChwYXJhbS5sZW5ndGggPT09IDIpIHtcblx0dmFsID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhcmFtWzFdKTtcblx0ICBcblx0Ly8gQ29lcmNlIHZhbHVlcy5cblx0aWYgKGNvZXJjZSkge1xuXHQgIHZhbCA9IHZhbCAmJiAhaXNOYU4odmFsKSAgICAgICAgICAgICAgPyArdmFsICAgICAgICAgICAgICAvLyBudW1iZXJcblx0XHQgIDogdmFsID09PSAndW5kZWZpbmVkJyAgICAgICAgICAgICA/IHVuZGVmaW5lZCAgICAgICAgIC8vIHVuZGVmaW5lZFxuXHRcdCAgOiBjb2VyY2VfdHlwZXNbdmFsXSAhPT0gdW5kZWZpbmVkID8gY29lcmNlX3R5cGVzW3ZhbF0gLy8gdHJ1ZSwgZmFsc2UsIG51bGxcblx0XHQgIDogdmFsOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZ1xuXHR9XG5cdCAgXG5cdGlmICgga2V5c19sYXN0ICkge1xuXHQgIC8vIENvbXBsZXgga2V5LCBidWlsZCBkZWVwIG9iamVjdCBzdHJ1Y3R1cmUgYmFzZWQgb24gYSBmZXcgcnVsZXM6XG5cdCAgLy8gKiBUaGUgJ2N1cicgcG9pbnRlciBzdGFydHMgYXQgdGhlIG9iamVjdCB0b3AtbGV2ZWwuXG5cdCAgLy8gKiBbXSA9IGFycmF5IHB1c2ggKG4gaXMgc2V0IHRvIGFycmF5IGxlbmd0aCksIFtuXSA9IGFycmF5IGlmIG4gaXMgXG5cdCAgLy8gICBudW1lcmljLCBvdGhlcndpc2Ugb2JqZWN0LlxuXHQgIC8vICogSWYgYXQgdGhlIGxhc3Qga2V5cyBwYXJ0LCBzZXQgdGhlIHZhbHVlLlxuXHQgIC8vICogRm9yIGVhY2gga2V5cyBwYXJ0LCBpZiB0aGUgY3VycmVudCBsZXZlbCBpcyB1bmRlZmluZWQgY3JlYXRlIGFuXG5cdCAgLy8gICBvYmplY3Qgb3IgYXJyYXkgYmFzZWQgb24gdGhlIHR5cGUgb2YgdGhlIG5leHQga2V5cyBwYXJ0LlxuXHQgIC8vICogTW92ZSB0aGUgJ2N1cicgcG9pbnRlciB0byB0aGUgbmV4dCBsZXZlbC5cblx0ICAvLyAqIFJpbnNlICYgcmVwZWF0LlxuXHQgIGZvciAoOyBpIDw9IGtleXNfbGFzdDsgaSsrKSB7XG5cdFx0a2V5ID0ga2V5c1tpXSA9PT0gJycgPyBjdXIubGVuZ3RoIDoga2V5c1tpXTtcblx0XHRjdXIgPSBjdXJba2V5XSA9IGkgPCBrZXlzX2xhc3Rcblx0XHQgID8gY3VyW2tleV0gfHwgKGtleXNbaSsxXSAmJiBpc05hTihrZXlzW2krMV0pID8ge30gOiBbXSlcblx0XHQgIDogdmFsO1xuXHQgIH1cblx0XHRcblx0fSBlbHNlIHtcblx0ICAvLyBTaW1wbGUga2V5LCBldmVuIHNpbXBsZXIgcnVsZXMsIHNpbmNlIG9ubHkgc2NhbGFycyBhbmQgc2hhbGxvd1xuXHQgIC8vIGFycmF5cyBhcmUgYWxsb3dlZC5cblx0XHRcblx0ICBpZiAoJC5pc0FycmF5KG9ialtrZXldKSkge1xuXHRcdC8vIHZhbCBpcyBhbHJlYWR5IGFuIGFycmF5LCBzbyBwdXNoIG9uIHRoZSBuZXh0IHZhbHVlLlxuXHRcdG9ialtrZXldLnB1c2goIHZhbCApO1xuXHRcdCAgXG5cdCAgfSBlbHNlIGlmIChvYmpba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gdmFsIGlzbid0IGFuIGFycmF5LCBidXQgc2luY2UgYSBzZWNvbmQgdmFsdWUgaGFzIGJlZW4gc3BlY2lmaWVkLFxuXHRcdC8vIGNvbnZlcnQgdmFsIGludG8gYW4gYXJyYXkuXG5cdFx0b2JqW2tleV0gPSBbb2JqW2tleV0sIHZhbF07XG5cdFx0ICBcblx0ICB9IGVsc2Uge1xuXHRcdC8vIHZhbCBpcyBhIHNjYWxhci5cblx0XHRvYmpba2V5XSA9IHZhbDtcblx0ICB9XG5cdH1cblx0ICBcbiAgfSBlbHNlIGlmIChrZXkpIHtcblx0Ly8gTm8gdmFsdWUgd2FzIGRlZmluZWQsIHNvIHNldCBzb21ldGhpbmcgbWVhbmluZ2Z1bC5cblx0b2JqW2tleV0gPSBjb2VyY2Vcblx0ICA/IHVuZGVmaW5lZFxuXHQgIDogJyc7XG4gIH1cbn0pO1xuICBcbnJldHVybiBvYmo7XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbihmdW5jdGlvbihtb2QpIHtcbiAgaWYgKHR5cGVvZiBleHBvcnRzID09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG1vZHVsZSA9PSBcIm9iamVjdFwiKSAvLyBDb21tb25KU1xuICAgIG1vZCgodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5Db2RlTWlycm9yIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5Db2RlTWlycm9yIDogbnVsbCkpO1xuICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSAvLyBBTURcbiAgICBkZWZpbmUoW1wiY29kZW1pcnJvclwiXSwgbW9kKTtcbiAgZWxzZSAvLyBQbGFpbiBicm93c2VyIGVudlxuICAgIG1vZChDb2RlTWlycm9yKTtcbn0pKGZ1bmN0aW9uKENvZGVNaXJyb3IpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIFxuXHRDb2RlTWlycm9yLmRlZmluZU1vZGUoXCJzcGFycWwxMVwiLCBmdW5jdGlvbihjb25maWcsIHBhcnNlckNvbmZpZykge1xuXHRcblx0XHR2YXIgaW5kZW50VW5pdCA9IGNvbmZpZy5pbmRlbnRVbml0O1xuXHRcblx0XHQvLyBsbDFfdGFibGUgaXMgYXV0by1nZW5lcmF0ZWQgZnJvbSBncmFtbWFyXG5cdFx0Ly8gLSBkbyBub3QgZWRpdCBtYW51YWxseVxuXHRcdC8vICUlJXRhYmxlJSUlXG5cdHZhciBsbDFfdGFibGU9XG5cdHtcblx0ICBcIipbJiYsdmFsdWVMb2dpY2FsXVwiIDoge1xuXHQgICAgIFwiJiZcIjogW1wiWyYmLHZhbHVlTG9naWNhbF1cIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwifHxcIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXX0sIFxuXHQgIFwiKlssLGV4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCIsXCI6IFtcIlssLGV4cHJlc3Npb25dXCIsXCIqWywsZXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiKlssLG9iamVjdFBhdGhdXCIgOiB7XG5cdCAgICAgXCIsXCI6IFtcIlssLG9iamVjdFBhdGhdXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCIqWywsb2JqZWN0XVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCJbLCxvYmplY3RdXCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIjtcIjogW10sIFxuXHQgICAgIFwiXVwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW119LCBcblx0ICBcIipbLyxwYXRoRWx0T3JJbnZlcnNlXVwiIDoge1xuXHQgICAgIFwiL1wiOiBbXCJbLyxwYXRoRWx0T3JJbnZlcnNlXVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcInxcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIltcIjogW10sIFxuXHQgICAgIFwiVkFSMVwiOiBbXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtdLCBcblx0ICAgICBcIk5JTFwiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW119LCBcblx0ICBcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCIgOiB7XG5cdCAgICAgXCI7XCI6IFtcIls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwiXVwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCIgOiB7XG5cdCAgICAgXCI7XCI6IFtcIls7LD9bdmVyYixvYmplY3RMaXN0XV1cIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwiXVwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW119LCBcblx0ICBcIipbVU5JT04sZ3JvdXBHcmFwaFBhdHRlcm5dXCIgOiB7XG5cdCAgICAgXCJVTklPTlwiOiBbXCJbVU5JT04sZ3JvdXBHcmFwaFBhdHRlcm5dXCIsXCIqW1VOSU9OLGdyb3VwR3JhcGhQYXR0ZXJuXVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiIDoge1xuXHQgICAgIFwie1wiOiBbXCJbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiTUlOVVNcIjogW1wiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXCJbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW1wiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW1wiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtcIltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcIltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIiA6IHtcblx0ICAgICBcInxcIjogW1wiW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCIsXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIipbfCxwYXRoU2VxdWVuY2VdXCIgOiB7XG5cdCAgICAgXCJ8XCI6IFtcIlt8LHBhdGhTZXF1ZW5jZV1cIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiKFwiOiBbXSwgXG5cdCAgICAgXCJbXCI6IFtdLCBcblx0ICAgICBcIlZBUjFcIjogW10sIFxuXHQgICAgIFwiVkFSMlwiOiBbXSwgXG5cdCAgICAgXCJOSUxcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW10sIFxuXHQgICAgIFwiQU5PTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdfSwgXG5cdCAgXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcInx8XCI6IFtcIlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQVNcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIsXCI6IFtdLCBcblx0ICAgICBcIjtcIjogW119LCBcblx0ICBcIipkYXRhQmxvY2tWYWx1ZVwiIDoge1xuXHQgICAgIFwiVU5ERUZcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImRhdGFCbG9ja1ZhbHVlXCIsXCIqZGF0YUJsb2NrVmFsdWVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJkYXRhQmxvY2tWYWx1ZVwiLFwiKmRhdGFCbG9ja1ZhbHVlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZGF0YUJsb2NrVmFsdWVcIixcIipkYXRhQmxvY2tWYWx1ZVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIipkYXRhc2V0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJGUk9NXCI6IFtcImRhdGFzZXRDbGF1c2VcIixcIipkYXRhc2V0Q2xhdXNlXCJdLCBcblx0ICAgICBcIldIRVJFXCI6IFtdLCBcblx0ICAgICBcIntcIjogW119LCBcblx0ICBcIipkZXNjcmliZURhdGFzZXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIkZST01cIjogW1wiZGVzY3JpYmVEYXRhc2V0Q2xhdXNlXCIsXCIqZGVzY3JpYmVEYXRhc2V0Q2xhdXNlXCJdLCBcblx0ICAgICBcIk9SREVSXCI6IFtdLCBcblx0ICAgICBcIkhBVklOR1wiOiBbXSwgXG5cdCAgICAgXCJHUk9VUFwiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiV0hFUkVcIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXX0sIFxuXHQgIFwiKmdyYXBoTm9kZVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCIqZ3JhcGhOb2RlUGF0aFwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJbXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIipncm91cENvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIk9SREVSXCI6IFtdLCBcblx0ICAgICBcIkhBVklOR1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipoYXZpbmdDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIkxJTUlUXCI6IFtdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiLFwiKm9yKFtbICgsKmRhdGFCbG9ja1ZhbHVlLCldLE5JTF0pXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiLFwiKm9yKFtbICgsKmRhdGFCbG9ja1ZhbHVlLCldLE5JTF0pXCJdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIiA6IHtcblx0ICAgICBcIipcIjogW1wib3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIi9cIjogW1wib3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkFTXCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCJ8fFwiOiBbXSwgXG5cdCAgICAgXCImJlwiOiBbXSwgXG5cdCAgICAgXCI9XCI6IFtdLCBcblx0ICAgICBcIiE9XCI6IFtdLCBcblx0ICAgICBcIjxcIjogW10sIFxuXHQgICAgIFwiPlwiOiBbXSwgXG5cdCAgICAgXCI8PVwiOiBbXSwgXG5cdCAgICAgXCI+PVwiOiBbXSwgXG5cdCAgICAgXCJJTlwiOiBbXSwgXG5cdCAgICAgXCJOT1RcIjogW10sIFxuXHQgICAgIFwiK1wiOiBbXSwgXG5cdCAgICAgXCItXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdfSwgXG5cdCAgXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIiA6IHtcblx0ICAgICBcIitcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCItXCI6IFtcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wib3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkFTXCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCJ8fFwiOiBbXSwgXG5cdCAgICAgXCImJlwiOiBbXSwgXG5cdCAgICAgXCI9XCI6IFtdLCBcblx0ICAgICBcIiE9XCI6IFtdLCBcblx0ICAgICBcIjxcIjogW10sIFxuXHQgICAgIFwiPlwiOiBbXSwgXG5cdCAgICAgXCI8PVwiOiBbXSwgXG5cdCAgICAgXCI+PVwiOiBbXSwgXG5cdCAgICAgXCJJTlwiOiBbXSwgXG5cdCAgICAgXCJOT1RcIjogW10sIFxuXHQgICAgIFwiO1wiOiBbXX0sIFxuXHQgIFwiKm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wib3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiLFwiKm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIsXCIqb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIixcIipvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdLCBcblx0ICAgICBcIldIRVJFXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiRlJPTVwiOiBbXX0sIFxuXHQgIFwiKm9yZGVyQ29uZGl0aW9uXCIgOiB7XG5cdCAgICAgXCJBU0NcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJERVNDXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW10sIFxuXHQgICAgIFwiTElNSVRcIjogW10sIFxuXHQgICAgIFwiT0ZGU0VUXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiKnByZWZpeERlY2xcIiA6IHtcblx0ICAgICBcIlBSRUZJWFwiOiBbXCJwcmVmaXhEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXSwgXG5cdCAgICAgXCJERVNDUklCRVwiOiBbXSwgXG5cdCAgICAgXCJBU0tcIjogW10sIFxuXHQgICAgIFwiSU5TRVJUXCI6IFtdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXSwgXG5cdCAgICAgXCJTRUxFQ1RcIjogW10sIFxuXHQgICAgIFwiTE9BRFwiOiBbXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtdLCBcblx0ICAgICBcIkFERFwiOiBbXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtdLCBcblx0ICAgICBcIkNPUFlcIjogW10sIFxuXHQgICAgIFwiQ1JFQVRFXCI6IFtdLCBcblx0ICAgICBcIldJVEhcIjogW119LCBcblx0ICBcIip1c2luZ0NsYXVzZVwiIDoge1xuXHQgICAgIFwiVVNJTkdcIjogW1widXNpbmdDbGF1c2VcIixcIip1c2luZ0NsYXVzZVwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXX0sIFxuXHQgIFwiKnZhclwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIixcIip2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIixcIip2YXJcIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiKnZhck9ySVJJcmVmXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiT1JERVJcIjogW10sIFxuXHQgICAgIFwiSEFWSU5HXCI6IFtdLCBcblx0ICAgICBcIkdST1VQXCI6IFtdLCBcblx0ICAgICBcIkxJTUlUXCI6IFtdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIkZST01cIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW119LCBcblx0ICBcIitncmFwaE5vZGVcIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiLFwiKmdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCIsXCIqZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVcIixcIipncmFwaE5vZGVcIl19LCBcblx0ICBcIitncmFwaE5vZGVQYXRoXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIixcIipncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCIsXCIqZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiLFwiKmdyYXBoTm9kZVBhdGhcIl19LCBcblx0ICBcIitncm91cENvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncm91cENvbmRpdGlvblwiLFwiKmdyb3VwQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyb3VwQ29uZGl0aW9uXCIsXCIqZ3JvdXBDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JvdXBDb25kaXRpb25cIixcIipncm91cENvbmRpdGlvblwiXX0sIFxuXHQgIFwiK2hhdmluZ0NvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJoYXZpbmdDb25kaXRpb25cIixcIipoYXZpbmdDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaGF2aW5nQ29uZGl0aW9uXCIsXCIqaGF2aW5nQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImhhdmluZ0NvbmRpdGlvblwiLFwiKmhhdmluZ0NvbmRpdGlvblwiXX0sIFxuXHQgIFwiK29yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIiA6IHtcblx0ICAgICBcIihcIjogW1wib3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiLFwiKm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCIsXCIqb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIixcIipvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdfSwgXG5cdCAgXCIrb3JkZXJDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIkFTQ1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRFU0NcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIihcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIm9yZGVyQ29uZGl0aW9uXCIsXCIqb3JkZXJDb25kaXRpb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wib3JkZXJDb25kaXRpb25cIixcIipvcmRlckNvbmRpdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJvcmRlckNvbmRpdGlvblwiLFwiKm9yZGVyQ29uZGl0aW9uXCJdfSwgXG5cdCAgXCIrdmFyT3JJUklyZWZcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ2YXJPcklSSXJlZlwiLFwiKnZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZhck9ySVJJcmVmXCIsXCIqdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFyT3JJUklyZWZcIixcIip2YXJPcklSSXJlZlwiXX0sIFxuXHQgIFwiPy5cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiLlwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/RElTVElOQ1RcIiA6IHtcblx0ICAgICBcIkRJU1RJTkNUXCI6IFtcIkRJU1RJTkNUXCJdLCBcblx0ICAgICBcIiFcIjogW10sIFxuXHQgICAgIFwiK1wiOiBbXSwgXG5cdCAgICAgXCItXCI6IFtdLCBcblx0ICAgICBcIlZBUjFcIjogW10sIFxuXHQgICAgIFwiVkFSMlwiOiBbXSwgXG5cdCAgICAgXCIoXCI6IFtdLCBcblx0ICAgICBcIlNUUlwiOiBbXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtdLCBcblx0ICAgICBcIklSSVwiOiBbXSwgXG5cdCAgICAgXCJVUklcIjogW10sIFxuXHQgICAgIFwiQk5PREVcIjogW10sIFxuXHQgICAgIFwiUkFORFwiOiBbXSwgXG5cdCAgICAgXCJBQlNcIjogW10sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW10sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtdLCBcblx0ICAgICBcIkRBWVwiOiBbXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW10sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW10sIFxuXHQgICAgIFwiVFpcIjogW10sIFxuXHQgICAgIFwiTk9XXCI6IFtdLCBcblx0ICAgICBcIlVVSURcIjogW10sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXSwgXG5cdCAgICAgXCJNRDVcIjogW10sIFxuXHQgICAgIFwiU0hBMVwiOiBbXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW10sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXSwgXG5cdCAgICAgXCJJRlwiOiBbXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtdLCBcblx0ICAgICBcIklTSVJJXCI6IFtdLCBcblx0ICAgICBcIklTVVJJXCI6IFtdLCBcblx0ICAgICBcIklTQkxBTktcIjogW10sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtdLCBcblx0ICAgICBcIlNVTVwiOiBbXSwgXG5cdCAgICAgXCJNSU5cIjogW10sIFxuXHQgICAgIFwiTUFYXCI6IFtdLCBcblx0ICAgICBcIkFWR1wiOiBbXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW10sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXSwgXG5cdCAgICAgXCJOT1RcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIipcIjogW119LCBcblx0ICBcIj9HUkFQSFwiIDoge1xuXHQgICAgIFwiR1JBUEhcIjogW1wiR1JBUEhcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXX0sIFxuXHQgIFwiP1NJTEVOVFwiIDoge1xuXHQgICAgIFwiU0lMRU5UXCI6IFtcIlNJTEVOVFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXX0sIFxuXHQgIFwiP1NJTEVOVF8xXCIgOiB7XG5cdCAgICAgXCJTSUxFTlRcIjogW1wiU0lMRU5UXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW119LCBcblx0ICBcIj9TSUxFTlRfMlwiIDoge1xuXHQgICAgIFwiU0lMRU5UXCI6IFtcIlNJTEVOVFwiXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJERUZBVUxUXCI6IFtdLCBcblx0ICAgICBcIk5BTUVEXCI6IFtdLCBcblx0ICAgICBcIkFMTFwiOiBbXX0sIFxuXHQgIFwiP1NJTEVOVF8zXCIgOiB7XG5cdCAgICAgXCJTSUxFTlRcIjogW1wiU0lMRU5UXCJdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdfSwgXG5cdCAgXCI/U0lMRU5UXzRcIiA6IHtcblx0ICAgICBcIlNJTEVOVFwiOiBbXCJTSUxFTlRcIl0sIFxuXHQgICAgIFwiREVGQVVMVFwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdfSwgXG5cdCAgXCI/V0hFUkVcIiA6IHtcblx0ICAgICBcIldIRVJFXCI6IFtcIldIRVJFXCJdLCBcblx0ICAgICBcIntcIjogW119LCBcblx0ICBcIj9bLCxleHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCJbLCxleHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCIgOiB7XG5cdCAgICAgXCIuXCI6IFtcIlsuLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/Wy4sP3RyaXBsZXNCbG9ja11cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiWy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiWy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXX0sIFxuXHQgIFwiP1s7LFNFUEFSQVRPUiw9LHN0cmluZ11cIiA6IHtcblx0ICAgICBcIjtcIjogW1wiWzssU0VQQVJBVE9SLD0sc3RyaW5nXVwiXSwgXG5cdCAgICAgXCIpXCI6IFtdfSwgXG5cdCAgXCI/WzssdXBkYXRlXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCJbOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIiRcIjogW119LCBcblx0ICBcIj9bQVMsdmFyXVwiIDoge1xuXHQgICAgIFwiQVNcIjogW1wiW0FTLHZhcl1cIl0sIFxuXHQgICAgIFwiKVwiOiBbXX0sIFxuXHQgIFwiP1tJTlRPLGdyYXBoUmVmXVwiIDoge1xuXHQgICAgIFwiSU5UT1wiOiBbXCJbSU5UTyxncmFwaFJlZl1cIl0sIFxuXHQgICAgIFwiO1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdfSwgXG5cdCAgXCI/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJbb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJeXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcImFcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJbb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIltvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiO1wiOiBbXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/W3BhdGhPbmVJblByb3BlcnR5U2V0LCpbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1dXCIgOiB7XG5cdCAgICAgXCJhXCI6IFtcIltwYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiXSwgXG5cdCAgICAgXCJeXCI6IFtcIltwYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIltwYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJbcGF0aE9uZUluUHJvcGVydHlTZXQsKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiW3BhdGhPbmVJblByb3BlcnR5U2V0LCpbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1dXCJdLCBcblx0ICAgICBcIilcIjogW119LCBcblx0ICBcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIiA6IHtcblx0ICAgICBcIklOU0VSVFwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiRFJPUFwiOiBbXCJbdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wiW3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIldJVEhcIjogW1wiW3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIiRcIjogW119LCBcblx0ICBcIj9bdmVyYixvYmplY3RMaXN0XVwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJbdmVyYixvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIlt2ZXJiLG9iamVjdExpc3RdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiW3ZlcmIsb2JqZWN0TGlzdF1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJbdmVyYixvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJbdmVyYixvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJbdmVyYixvYmplY3RMaXN0XVwiXSwgXG5cdCAgICAgXCI7XCI6IFtdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwiXVwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIntcIjogW10sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW10sIFxuXHQgICAgIFwiTUlOVVNcIjogW10sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW10sIFxuXHQgICAgIFwiQklORFwiOiBbXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW119LCBcblx0ICBcIj9hcmdMaXN0XCIgOiB7XG5cdCAgICAgXCJOSUxcIjogW1wiYXJnTGlzdFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImFyZ0xpc3RcIl0sIFxuXHQgICAgIFwiQVNcIjogW10sIFxuXHQgICAgIFwiKVwiOiBbXSwgXG5cdCAgICAgXCIsXCI6IFtdLCBcblx0ICAgICBcInx8XCI6IFtdLCBcblx0ICAgICBcIiYmXCI6IFtdLCBcblx0ICAgICBcIj1cIjogW10sIFxuXHQgICAgIFwiIT1cIjogW10sIFxuXHQgICAgIFwiPFwiOiBbXSwgXG5cdCAgICAgXCI+XCI6IFtdLCBcblx0ICAgICBcIjw9XCI6IFtdLCBcblx0ICAgICBcIj49XCI6IFtdLCBcblx0ICAgICBcIklOXCI6IFtdLCBcblx0ICAgICBcIk5PVFwiOiBbXSwgXG5cdCAgICAgXCIrXCI6IFtdLCBcblx0ICAgICBcIi1cIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIipcIjogW10sIFxuXHQgICAgIFwiL1wiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdfSwgXG5cdCAgXCI/YmFzZURlY2xcIiA6IHtcblx0ICAgICBcIkJBU0VcIjogW1wiYmFzZURlY2xcIl0sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJDT05TVFJVQ1RcIjogW10sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW10sIFxuXHQgICAgIFwiQVNLXCI6IFtdLCBcblx0ICAgICBcIklOU0VSVFwiOiBbXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW10sIFxuXHQgICAgIFwiU0VMRUNUXCI6IFtdLCBcblx0ICAgICBcIkxPQURcIjogW10sIFxuXHQgICAgIFwiQ0xFQVJcIjogW10sIFxuXHQgICAgIFwiRFJPUFwiOiBbXSwgXG5cdCAgICAgXCJBRERcIjogW10sIFxuXHQgICAgIFwiTU9WRVwiOiBbXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtdLCBcblx0ICAgICBcIkNSRUFURVwiOiBbXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtdLCBcblx0ICAgICBcIlBSRUZJWFwiOiBbXX0sIFxuXHQgIFwiP2NvbnN0cnVjdFRyaXBsZXNcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIltcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiY29uc3RydWN0VHJpcGxlc1wiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImNvbnN0cnVjdFRyaXBsZXNcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJjb25zdHJ1Y3RUcmlwbGVzXCJdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIj9ncm91cENsYXVzZVwiIDoge1xuXHQgICAgIFwiR1JPVVBcIjogW1wiZ3JvdXBDbGF1c2VcIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIkxJTUlUXCI6IFtdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXSwgXG5cdCAgICAgXCJIQVZJTkdcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/aGF2aW5nQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJIQVZJTkdcIjogW1wiaGF2aW5nQ2xhdXNlXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiT1JERVJcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/aW5zZXJ0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJJTlNFUlRcIjogW1wiaW5zZXJ0Q2xhdXNlXCJdLCBcblx0ICAgICBcIldIRVJFXCI6IFtdLCBcblx0ICAgICBcIlVTSU5HXCI6IFtdfSwgXG5cdCAgXCI/bGltaXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIkxJTUlUXCI6IFtcImxpbWl0Q2xhdXNlXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIj9saW1pdE9mZnNldENsYXVzZXNcIiA6IHtcblx0ICAgICBcIkxJTUlUXCI6IFtcImxpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW1wibGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCIkXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIj9vZmZzZXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIk9GRlNFVFwiOiBbXCJvZmZzZXRDbGF1c2VcIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW10sIFxuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiP29yKFtESVNUSU5DVCxSRURVQ0VEXSlcIiA6IHtcblx0ICAgICBcIkRJU1RJTkNUXCI6IFtcIm9yKFtESVNUSU5DVCxSRURVQ0VEXSlcIl0sIFxuXHQgICAgIFwiUkVEVUNFRFwiOiBbXCJvcihbRElTVElOQ1QsUkVEVUNFRF0pXCJdLCBcblx0ICAgICBcIipcIjogW10sIFxuXHQgICAgIFwiKFwiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW119LCBcblx0ICBcIj9vcihbTEFOR1RBRyxbXl4saXJpUmVmXV0pXCIgOiB7XG5cdCAgICAgXCJMQU5HVEFHXCI6IFtcIm9yKFtMQU5HVEFHLFteXixpcmlSZWZdXSlcIl0sIFxuXHQgICAgIFwiXl5cIjogW1wib3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiXSwgXG5cdCAgICAgXCJVTkRFRlwiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJhXCI6IFtdLCBcblx0ICAgICBcIlZBUjFcIjogW10sIFxuXHQgICAgIFwiVkFSMlwiOiBbXSwgXG5cdCAgICAgXCJeXCI6IFtdLCBcblx0ICAgICBcIiFcIjogW10sIFxuXHQgICAgIFwiKFwiOiBbXSwgXG5cdCAgICAgXCIuXCI6IFtdLCBcblx0ICAgICBcIjtcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcInx8XCI6IFtdLCBcblx0ICAgICBcIiYmXCI6IFtdLCBcblx0ICAgICBcIj1cIjogW10sIFxuXHQgICAgIFwiIT1cIjogW10sIFxuXHQgICAgIFwiPFwiOiBbXSwgXG5cdCAgICAgXCI+XCI6IFtdLCBcblx0ICAgICBcIjw9XCI6IFtdLCBcblx0ICAgICBcIj49XCI6IFtdLCBcblx0ICAgICBcIklOXCI6IFtdLCBcblx0ICAgICBcIk5PVFwiOiBbXSwgXG5cdCAgICAgXCIrXCI6IFtdLCBcblx0ICAgICBcIi1cIjogW10sIFxuXHQgICAgIFwiKlwiOiBbXSwgXG5cdCAgICAgXCIvXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJOSUxcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIl1cIjogW10sIFxuXHQgICAgIFwiR1JBUEhcIjogW10sIFxuXHQgICAgIFwie1wiOiBbXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXX0sIFxuXHQgIFwiP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiIDoge1xuXHQgICAgIFwiKlwiOiBbXCJvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiL1wiOiBbXCJvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiK1wiOiBbXSwgXG5cdCAgICAgXCItXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJBU1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIixcIjogW10sIFxuXHQgICAgIFwifHxcIjogW10sIFxuXHQgICAgIFwiJiZcIjogW10sIFxuXHQgICAgIFwiPVwiOiBbXSwgXG5cdCAgICAgXCIhPVwiOiBbXSwgXG5cdCAgICAgXCI8XCI6IFtdLCBcblx0ICAgICBcIj5cIjogW10sIFxuXHQgICAgIFwiPD1cIjogW10sIFxuXHQgICAgIFwiPj1cIjogW10sIFxuXHQgICAgIFwiSU5cIjogW10sIFxuXHQgICAgIFwiTk9UXCI6IFtdLCBcblx0ICAgICBcIjtcIjogW119LCBcblx0ICBcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCIgOiB7XG5cdCAgICAgXCI9XCI6IFtcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiIT1cIjogW1wib3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCI8XCI6IFtcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiPlwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIjw9XCI6IFtcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiPj1cIjogW1wib3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJTlwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJvcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkFTXCI6IFtdLCBcblx0ICAgICBcIilcIjogW10sIFxuXHQgICAgIFwiLFwiOiBbXSwgXG5cdCAgICAgXCJ8fFwiOiBbXSwgXG5cdCAgICAgXCImJlwiOiBbXSwgXG5cdCAgICAgXCI7XCI6IFtdfSwgXG5cdCAgXCI/b3JkZXJDbGF1c2VcIiA6IHtcblx0ICAgICBcIk9SREVSXCI6IFtcIm9yZGVyQ2xhdXNlXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCI/cGF0aE1vZFwiIDoge1xuXHQgICAgIFwiKlwiOiBbXCJwYXRoTW9kXCJdLCBcblx0ICAgICBcIj9cIjogW1wicGF0aE1vZFwiXSwgXG5cdCAgICAgXCIrXCI6IFtcInBhdGhNb2RcIl0sIFxuXHQgICAgIFwie1wiOiBbXCJwYXRoTW9kXCJdLCBcblx0ICAgICBcInxcIjogW10sIFxuXHQgICAgIFwiL1wiOiBbXSwgXG5cdCAgICAgXCIpXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW10sIFxuXHQgICAgIFwiVFJVRVwiOiBbXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtdLCBcblx0ICAgICBcIkFOT05cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW10sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXX0sIFxuXHQgIFwiP3RyaXBsZXNCbG9ja1wiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJbXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widHJpcGxlc0Jsb2NrXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcInRyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcIj90cmlwbGVzVGVtcGxhdGVcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNUZW1wbGF0ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widHJpcGxlc1RlbXBsYXRlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzVGVtcGxhdGVcIl0sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXX0sIFxuXHQgIFwiP3doZXJlQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJXSEVSRVwiOiBbXCJ3aGVyZUNsYXVzZVwiXSwgXG5cdCAgICAgXCJ7XCI6IFtcIndoZXJlQ2xhdXNlXCJdLCBcblx0ICAgICBcIk9SREVSXCI6IFtdLCBcblx0ICAgICBcIkhBVklOR1wiOiBbXSwgXG5cdCAgICAgXCJHUk9VUFwiOiBbXSwgXG5cdCAgICAgXCJMSU1JVFwiOiBbXSwgXG5cdCAgICAgXCJPRkZTRVRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIiRcIjogW119LCBcblx0ICBcIlsgKCwqZGF0YUJsb2NrVmFsdWUsKV1cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiKmRhdGFCbG9ja1ZhbHVlXCIsXCIpXCJdfSwgXG5cdCAgXCJbICgsKnZhciwpXVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCIqdmFyXCIsXCIpXCJdfSwgXG5cdCAgXCJbICgsZXhwcmVzc2lvbiwpXVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdfSwgXG5cdCAgXCJbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiZXhwcmVzc2lvblwiLFwiQVNcIixcInZhclwiLFwiKVwiXX0sIFxuXHQgIFwiWyE9LG51bWVyaWNFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiIT1cIjogW1wiIT1cIixcIm51bWVyaWNFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbJiYsdmFsdWVMb2dpY2FsXVwiIDoge1xuXHQgICAgIFwiJiZcIjogW1wiJiZcIixcInZhbHVlTG9naWNhbFwiXX0sIFxuXHQgIFwiWyosdW5hcnlFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiKlwiOiBbXCIqXCIsXCJ1bmFyeUV4cHJlc3Npb25cIl19LCBcblx0ICBcIlsqZGF0YXNldENsYXVzZSxXSEVSRSx7LD90cmlwbGVzVGVtcGxhdGUsfSxzb2x1dGlvbk1vZGlmaWVyXVwiIDoge1xuXHQgICAgIFwiV0hFUkVcIjogW1wiKmRhdGFzZXRDbGF1c2VcIixcIldIRVJFXCIsXCJ7XCIsXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCJ9XCIsXCJzb2x1dGlvbk1vZGlmaWVyXCJdLCBcblx0ICAgICBcIkZST01cIjogW1wiKmRhdGFzZXRDbGF1c2VcIixcIldIRVJFXCIsXCJ7XCIsXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCJ9XCIsXCJzb2x1dGlvbk1vZGlmaWVyXCJdfSwgXG5cdCAgXCJbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCIrXCI6IFtcIitcIixcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWywsZXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiLFwiLFwiZXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWywsaW50ZWdlcix9XVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCIsXCIsXCJpbnRlZ2VyXCIsXCJ9XCJdfSwgXG5cdCAgXCJbLCxvYmplY3RQYXRoXVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCIsXCIsXCJvYmplY3RQYXRoXCJdfSwgXG5cdCAgXCJbLCxvYmplY3RdXCIgOiB7XG5cdCAgICAgXCIsXCI6IFtcIixcIixcIm9iamVjdFwiXX0sIFxuXHQgIFwiWywsb3IoW30sW2ludGVnZXIsfV1dKV1cIiA6IHtcblx0ICAgICBcIixcIjogW1wiLFwiLFwib3IoW30sW2ludGVnZXIsfV1dKVwiXX0sIFxuXHQgIFwiWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiLVwiOiBbXCItXCIsXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIl19LCBcblx0ICBcIlsuLD9jb25zdHJ1Y3RUcmlwbGVzXVwiIDoge1xuXHQgICAgIFwiLlwiOiBbXCIuXCIsXCI/Y29uc3RydWN0VHJpcGxlc1wiXX0sIFxuXHQgIFwiWy4sP3RyaXBsZXNCbG9ja11cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiLlwiLFwiP3RyaXBsZXNCbG9ja1wiXX0sIFxuXHQgIFwiWy4sP3RyaXBsZXNUZW1wbGF0ZV1cIiA6IHtcblx0ICAgICBcIi5cIjogW1wiLlwiLFwiP3RyaXBsZXNUZW1wbGF0ZVwiXX0sIFxuXHQgIFwiWy8scGF0aEVsdE9ySW52ZXJzZV1cIiA6IHtcblx0ICAgICBcIi9cIjogW1wiL1wiLFwicGF0aEVsdE9ySW52ZXJzZVwiXX0sIFxuXHQgIFwiWy8sdW5hcnlFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiL1wiOiBbXCIvXCIsXCJ1bmFyeUV4cHJlc3Npb25cIl19LCBcblx0ICBcIls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIiA6IHtcblx0ICAgICBcIjtcIjogW1wiO1wiLFwiP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXCJdfSwgXG5cdCAgXCJbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCIgOiB7XG5cdCAgICAgXCI7XCI6IFtcIjtcIixcIj9bdmVyYixvYmplY3RMaXN0XVwiXX0sIFxuXHQgIFwiWzssU0VQQVJBVE9SLD0sc3RyaW5nXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCI7XCIsXCJTRVBBUkFUT1JcIixcIj1cIixcInN0cmluZ1wiXX0sIFxuXHQgIFwiWzssdXBkYXRlXVwiIDoge1xuXHQgICAgIFwiO1wiOiBbXCI7XCIsXCJ1cGRhdGVcIl19LCBcblx0ICBcIls8LG51bWVyaWNFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiPFwiOiBbXCI8XCIsXCJudW1lcmljRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWzw9LG51bWVyaWNFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiPD1cIjogW1wiPD1cIixcIm51bWVyaWNFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbPSxudW1lcmljRXhwcmVzc2lvbl1cIiA6IHtcblx0ICAgICBcIj1cIjogW1wiPVwiLFwibnVtZXJpY0V4cHJlc3Npb25cIl19LCBcblx0ICBcIls+LG51bWVyaWNFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiPlwiOiBbXCI+XCIsXCJudW1lcmljRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwiWz49LG51bWVyaWNFeHByZXNzaW9uXVwiIDoge1xuXHQgICAgIFwiPj1cIjogW1wiPj1cIixcIm51bWVyaWNFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJbQVMsdmFyXVwiIDoge1xuXHQgICAgIFwiQVNcIjogW1wiQVNcIixcInZhclwiXX0sIFxuXHQgIFwiW0lOLGV4cHJlc3Npb25MaXN0XVwiIDoge1xuXHQgICAgIFwiSU5cIjogW1wiSU5cIixcImV4cHJlc3Npb25MaXN0XCJdfSwgXG5cdCAgXCJbSU5UTyxncmFwaFJlZl1cIiA6IHtcblx0ICAgICBcIklOVE9cIjogW1wiSU5UT1wiLFwiZ3JhcGhSZWZcIl19LCBcblx0ICBcIltOQU1FRCxpcmlSZWZdXCIgOiB7XG5cdCAgICAgXCJOQU1FRFwiOiBbXCJOQU1FRFwiLFwiaXJpUmVmXCJdfSwgXG5cdCAgXCJbTk9ULElOLGV4cHJlc3Npb25MaXN0XVwiIDoge1xuXHQgICAgIFwiTk9UXCI6IFtcIk5PVFwiLFwiSU5cIixcImV4cHJlc3Npb25MaXN0XCJdfSwgXG5cdCAgXCJbVU5JT04sZ3JvdXBHcmFwaFBhdHRlcm5dXCIgOiB7XG5cdCAgICAgXCJVTklPTlwiOiBbXCJVTklPTlwiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcIlteXixpcmlSZWZdXCIgOiB7XG5cdCAgICAgXCJeXlwiOiBbXCJeXlwiLFwiaXJpUmVmXCJdfSwgXG5cdCAgXCJbY29uc3RydWN0VGVtcGxhdGUsKmRhdGFzZXRDbGF1c2Usd2hlcmVDbGF1c2Usc29sdXRpb25Nb2RpZmllcl1cIiA6IHtcblx0ICAgICBcIntcIjogW1wiY29uc3RydWN0VGVtcGxhdGVcIixcIipkYXRhc2V0Q2xhdXNlXCIsXCJ3aGVyZUNsYXVzZVwiLFwic29sdXRpb25Nb2RpZmllclwiXX0sIFxuXHQgIFwiW2RlbGV0ZUNsYXVzZSw/aW5zZXJ0Q2xhdXNlXVwiIDoge1xuXHQgICAgIFwiREVMRVRFXCI6IFtcImRlbGV0ZUNsYXVzZVwiLFwiP2luc2VydENsYXVzZVwiXX0sIFxuXHQgIFwiW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIiA6IHtcblx0ICAgICBcIntcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiT1BUSU9OQUxcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiTUlOVVNcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiU0VSVklDRVwiOiBbXCJncmFwaFBhdHRlcm5Ob3RUcmlwbGVzXCIsXCI/LlwiLFwiP3RyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl0sIFxuXHQgICAgIFwiQklORFwiOiBbXCJncmFwaFBhdHRlcm5Ob3RUcmlwbGVzXCIsXCI/LlwiLFwiP3RyaXBsZXNCbG9ja1wiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW1wiZ3JhcGhQYXR0ZXJuTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzQmxvY2tcIl19LCBcblx0ICBcIltpbnRlZ2VyLG9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSldXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImludGVnZXJcIixcIm9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSlcIl19LCBcblx0ICBcIltpbnRlZ2VyLH1dXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImludGVnZXJcIixcIn1cIl19LCBcblx0ICBcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIiA6IHtcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wib3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pXCIsXCI/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wib3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pXCIsXCI/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSlcIixcIj9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSlcIixcIj9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSlcIixcIj9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIm9yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKVwiLFwiP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXX0sIFxuXHQgIFwiW29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1cIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcImFcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCIhXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RcIl19LCBcblx0ICBcIltwYXRoT25lSW5Qcm9wZXJ0eVNldCwqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXVwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiLFwiKlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XVwiXSwgXG5cdCAgICAgXCJeXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCIsXCIqW3wscGF0aE9uZUluUHJvcGVydHlTZXRdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIixcIipbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIixcIipbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIixcIipbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1cIl19LCBcblx0ICBcIltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcInF1YWRzTm90VHJpcGxlc1wiLFwiPy5cIixcIj90cmlwbGVzVGVtcGxhdGVcIl19LCBcblx0ICBcIlt1cGRhdGUxLD9bOyx1cGRhdGVdXVwiIDoge1xuXHQgICAgIFwiSU5TRVJUXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcInVwZGF0ZTFcIixcIj9bOyx1cGRhdGVdXCJdLCBcblx0ICAgICBcIk1PVkVcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl0sIFxuXHQgICAgIFwiQ09QWVwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1widXBkYXRlMVwiLFwiP1s7LHVwZGF0ZV1cIl0sIFxuXHQgICAgIFwiV0lUSFwiOiBbXCJ1cGRhdGUxXCIsXCI/WzssdXBkYXRlXVwiXX0sIFxuXHQgIFwiW3ZlcmIsb2JqZWN0TGlzdF1cIiA6IHtcblx0ICAgICBcImFcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIl19LCBcblx0ICBcIlt8LHBhdGhPbmVJblByb3BlcnR5U2V0XVwiIDoge1xuXHQgICAgIFwifFwiOiBbXCJ8XCIsXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiXX0sIFxuXHQgIFwiW3wscGF0aFNlcXVlbmNlXVwiIDoge1xuXHQgICAgIFwifFwiOiBbXCJ8XCIsXCJwYXRoU2VxdWVuY2VcIl19LCBcblx0ICBcIlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCIgOiB7XG5cdCAgICAgXCJ8fFwiOiBbXCJ8fFwiLFwiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJhZGRcIiA6IHtcblx0ICAgICBcIkFERFwiOiBbXCJBRERcIixcIj9TSUxFTlRfNFwiLFwiZ3JhcGhPckRlZmF1bHRcIixcIlRPXCIsXCJncmFwaE9yRGVmYXVsdFwiXX0sIFxuXHQgIFwiYWRkaXRpdmVFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIitcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIsXCIqb3IoW1srLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sWy0sbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIm11bHRpcGxpY2F0aXZlRXhwcmVzc2lvblwiLFwiKm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25cIixcIipvcihbWyssbXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXSxbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFtvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1dKVwiXX0sIFxuXHQgIFwiYWdncmVnYXRlXCIgOiB7XG5cdCAgICAgXCJDT1VOVFwiOiBbXCJDT1VOVFwiLFwiKFwiLFwiP0RJU1RJTkNUXCIsXCJvcihbKixleHByZXNzaW9uXSlcIixcIilcIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcIlNVTVwiLFwiKFwiLFwiP0RJU1RJTkNUXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJNSU5cIixcIihcIixcIj9ESVNUSU5DVFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wiTUFYXCIsXCIoXCIsXCI/RElTVElOQ1RcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcIkFWR1wiLFwiKFwiLFwiP0RJU1RJTkNUXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJTQU1QTEVcIixcIihcIixcIj9ESVNUSU5DVFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wiR1JPVVBfQ09OQ0FUXCIsXCIoXCIsXCI/RElTVElOQ1RcIixcImV4cHJlc3Npb25cIixcIj9bOyxTRVBBUkFUT1IsPSxzdHJpbmddXCIsXCIpXCJdfSwgXG5cdCAgXCJhbGxvd0Jub2Rlc1wiIDoge1xuXHQgICAgIFwifVwiOiBbXX0sIFxuXHQgIFwiYWxsb3dWYXJzXCIgOiB7XG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCJhcmdMaXN0XCIgOiB7XG5cdCAgICAgXCJOSUxcIjogW1wiTklMXCJdLCBcblx0ICAgICBcIihcIjogW1wiKFwiLFwiP0RJU1RJTkNUXCIsXCJleHByZXNzaW9uXCIsXCIqWywsZXhwcmVzc2lvbl1cIixcIilcIl19LCBcblx0ICBcImFza1F1ZXJ5XCIgOiB7XG5cdCAgICAgXCJBU0tcIjogW1wiQVNLXCIsXCIqZGF0YXNldENsYXVzZVwiLFwid2hlcmVDbGF1c2VcIixcInNvbHV0aW9uTW9kaWZpZXJcIl19LCBcblx0ICBcImJhc2VEZWNsXCIgOiB7XG5cdCAgICAgXCJCQVNFXCI6IFtcIkJBU0VcIixcIklSSV9SRUZcIl19LCBcblx0ICBcImJpbmRcIiA6IHtcblx0ICAgICBcIkJJTkRcIjogW1wiQklORFwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiQVNcIixcInZhclwiLFwiKVwiXX0sIFxuXHQgIFwiYmxhbmtOb2RlXCIgOiB7XG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcIkJMQU5LX05PREVfTEFCRUxcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJBTk9OXCJdfSwgXG5cdCAgXCJibGFua05vZGVQcm9wZXJ0eUxpc3RcIiA6IHtcblx0ICAgICBcIltcIjogW1wiW1wiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIixcIl1cIl19LCBcblx0ICBcImJsYW5rTm9kZVByb3BlcnR5TGlzdFBhdGhcIiA6IHtcblx0ICAgICBcIltcIjogW1wiW1wiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCIsXCJdXCJdfSwgXG5cdCAgXCJib29sZWFuTGl0ZXJhbFwiIDoge1xuXHQgICAgIFwiVFJVRVwiOiBbXCJUUlVFXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcIkZBTFNFXCJdfSwgXG5cdCAgXCJicmFja2V0dGVkRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdfSwgXG5cdCAgXCJidWlsdEluQ2FsbFwiIDoge1xuXHQgICAgIFwiU1RSXCI6IFtcIlNUUlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcIkxBTkdcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiTEFOR01BVENIRVNcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiREFUQVRZUEVcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiQk9VTkRcIixcIihcIixcInZhclwiLFwiKVwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiSVJJXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJVUklcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiQk5PREVcIixcIm9yKFtbICgsZXhwcmVzc2lvbiwpXSxOSUxdKVwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcIlJBTkRcIixcIk5JTFwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiQUJTXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiQ0VJTFwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJGTE9PUlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJST1VORFwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiQ09OQ0FUXCIsXCJleHByZXNzaW9uTGlzdFwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wic3Vic3RyaW5nRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiU1RSTEVOXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wic3RyUmVwbGFjZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiVUNBU0VcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiTENBU0VcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiRU5DT0RFX0ZPUl9VUklcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiQ09OVEFJTlNcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcIlNUUlNUQVJUU1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcIlNUUkVORFNcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcIlNUUkJFRk9SRVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJTVFJBRlRFUlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiLFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcIllFQVJcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiTU9OVEhcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcIkRBWVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJIT1VSU1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcIk1JTlVURVNcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJTRUNPTkRTXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcIlRJTUVaT05FXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcIlRaXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJOT1dcIixcIk5JTFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcIlVVSURcIixcIk5JTFwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcIlNUUlVVSURcIixcIk5JTFwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiTUQ1XCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiU0hBMVwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiU0hBMjU2XCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJTSEEzODRcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcIlNIQTUxMlwiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJDT0FMRVNDRVwiLFwiZXhwcmVzc2lvbkxpc3RcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiSUZcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJTVFJMQU5HXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcIlNUUkRUXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcIlNBTUVURVJNXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcIklTSVJJXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcIklTVVJJXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiSVNCTEFOS1wiLFwiKFwiLFwiZXhwcmVzc2lvblwiLFwiKVwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiSVNMSVRFUkFMXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIpXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJJU05VTUVSSUNcIixcIihcIixcImV4cHJlc3Npb25cIixcIilcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wicmVnZXhFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJleGlzdHNGdW5jXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJub3RFeGlzdHNGdW5jXCJdfSwgXG5cdCAgXCJjbGVhclwiIDoge1xuXHQgICAgIFwiQ0xFQVJcIjogW1wiQ0xFQVJcIixcIj9TSUxFTlRfMlwiLFwiZ3JhcGhSZWZBbGxcIl19LCBcblx0ICBcImNvbGxlY3Rpb25cIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiK2dyYXBoTm9kZVwiLFwiKVwiXX0sIFxuXHQgIFwiY29sbGVjdGlvblBhdGhcIiA6IHtcblx0ICAgICBcIihcIjogW1wiKFwiLFwiK2dyYXBoTm9kZVBhdGhcIixcIilcIl19LCBcblx0ICBcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCIrXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIi1cIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIihcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklGXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInZhbHVlTG9naWNhbFwiLFwiKlsmJix2YWx1ZUxvZ2ljYWxdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ2YWx1ZUxvZ2ljYWxcIixcIipbJiYsdmFsdWVMb2dpY2FsXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFsdWVMb2dpY2FsXCIsXCIqWyYmLHZhbHVlTG9naWNhbF1cIl19LCBcblx0ICBcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIitcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXCIsXCIqW3x8LGNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImNvbmRpdGlvbmFsQW5kRXhwcmVzc2lvblwiLFwiKlt8fCxjb25kaXRpb25hbEFuZEV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJjb25kaXRpb25hbEFuZEV4cHJlc3Npb25cIixcIipbfHwsY29uZGl0aW9uYWxBbmRFeHByZXNzaW9uXVwiXX0sIFxuXHQgIFwiY29uc3RyYWludFwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJicmFja2V0dGVkRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImZ1bmN0aW9uQ2FsbFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJmdW5jdGlvbkNhbGxcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZnVuY3Rpb25DYWxsXCJdfSwgXG5cdCAgXCJjb25zdHJ1Y3RRdWVyeVwiIDoge1xuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtcIkNPTlNUUlVDVFwiLFwib3IoW1tjb25zdHJ1Y3RUZW1wbGF0ZSwqZGF0YXNldENsYXVzZSx3aGVyZUNsYXVzZSxzb2x1dGlvbk1vZGlmaWVyXSxbKmRhdGFzZXRDbGF1c2UsV0hFUkUseyw/dHJpcGxlc1RlbXBsYXRlLH0sc29sdXRpb25Nb2RpZmllcl1dKVwiXX0sIFxuXHQgIFwiY29uc3RydWN0VGVtcGxhdGVcIiA6IHtcblx0ICAgICBcIntcIjogW1wie1wiLFwiP2NvbnN0cnVjdFRyaXBsZXNcIixcIn1cIl19LCBcblx0ICBcImNvbnN0cnVjdFRyaXBsZXNcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD9jb25zdHJ1Y3RUcmlwbGVzXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP2NvbnN0cnVjdFRyaXBsZXNdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/Y29uc3RydWN0VHJpcGxlc11cIl19LCBcblx0ICBcImNvcHlcIiA6IHtcblx0ICAgICBcIkNPUFlcIjogW1wiQ09QWVwiLFwiP1NJTEVOVF80XCIsXCJncmFwaE9yRGVmYXVsdFwiLFwiVE9cIixcImdyYXBoT3JEZWZhdWx0XCJdfSwgXG5cdCAgXCJjcmVhdGVcIiA6IHtcblx0ICAgICBcIkNSRUFURVwiOiBbXCJDUkVBVEVcIixcIj9TSUxFTlRfM1wiLFwiZ3JhcGhSZWZcIl19LCBcblx0ICBcImRhdGFCbG9ja1wiIDoge1xuXHQgICAgIFwiTklMXCI6IFtcIm9yKFtpbmxpbmVEYXRhT25lVmFyLGlubGluZURhdGFGdWxsXSlcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJvcihbaW5saW5lRGF0YU9uZVZhcixpbmxpbmVEYXRhRnVsbF0pXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wib3IoW2lubGluZURhdGFPbmVWYXIsaW5saW5lRGF0YUZ1bGxdKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIm9yKFtpbmxpbmVEYXRhT25lVmFyLGlubGluZURhdGFGdWxsXSlcIl19LCBcblx0ICBcImRhdGFCbG9ja1ZhbHVlXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIlVOREVGXCI6IFtcIlVOREVGXCJdfSwgXG5cdCAgXCJkYXRhc2V0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJGUk9NXCI6IFtcIkZST01cIixcIm9yKFtkZWZhdWx0R3JhcGhDbGF1c2UsbmFtZWRHcmFwaENsYXVzZV0pXCJdfSwgXG5cdCAgXCJkZWZhdWx0R3JhcGhDbGF1c2VcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wic291cmNlU2VsZWN0b3JcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wic291cmNlU2VsZWN0b3JcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wic291cmNlU2VsZWN0b3JcIl19LCBcblx0ICBcImRlbGV0ZTFcIiA6IHtcblx0ICAgICBcIkRBVEFcIjogW1wiREFUQVwiLFwicXVhZERhdGFOb0Jub2Rlc1wiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXCJXSEVSRVwiLFwicXVhZFBhdHRlcm5Ob0Jub2Rlc1wiXSwgXG5cdCAgICAgXCJ7XCI6IFtcInF1YWRQYXR0ZXJuTm9Cbm9kZXNcIixcIj9pbnNlcnRDbGF1c2VcIixcIip1c2luZ0NsYXVzZVwiLFwiV0hFUkVcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJkZWxldGVDbGF1c2VcIiA6IHtcblx0ICAgICBcIkRFTEVURVwiOiBbXCJERUxFVEVcIixcInF1YWRQYXR0ZXJuXCJdfSwgXG5cdCAgXCJkZXNjcmliZURhdGFzZXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIkZST01cIjogW1wiRlJPTVwiLFwib3IoW2RlZmF1bHRHcmFwaENsYXVzZSxuYW1lZEdyYXBoQ2xhdXNlXSlcIl19LCBcblx0ICBcImRlc2NyaWJlUXVlcnlcIiA6IHtcblx0ICAgICBcIkRFU0NSSUJFXCI6IFtcIkRFU0NSSUJFXCIsXCJvcihbK3Zhck9ySVJJcmVmLCpdKVwiLFwiKmRlc2NyaWJlRGF0YXNldENsYXVzZVwiLFwiP3doZXJlQ2xhdXNlXCIsXCJzb2x1dGlvbk1vZGlmaWVyXCJdfSwgXG5cdCAgXCJkaXNhbGxvd0Jub2Rlc1wiIDoge1xuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW119LCBcblx0ICBcImRpc2FsbG93VmFyc1wiIDoge1xuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiTklMXCI6IFtdLCBcblx0ICAgICBcIihcIjogW10sIFxuXHQgICAgIFwiW1wiOiBbXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtdLCBcblx0ICAgICBcIlRSVUVcIjogW10sIFxuXHQgICAgIFwiRkFMU0VcIjogW10sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW10sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW10sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW10sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW10sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW119LCBcblx0ICBcImRyb3BcIiA6IHtcblx0ICAgICBcIkRST1BcIjogW1wiRFJPUFwiLFwiP1NJTEVOVF8yXCIsXCJncmFwaFJlZkFsbFwiXX0sIFxuXHQgIFwiZXhpc3RzRnVuY1wiIDoge1xuXHQgICAgIFwiRVhJU1RTXCI6IFtcIkVYSVNUU1wiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcImV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIiFcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiK1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCItXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJjb25kaXRpb25hbE9yRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiY29uZGl0aW9uYWxPckV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImNvbmRpdGlvbmFsT3JFeHByZXNzaW9uXCJdfSwgXG5cdCAgXCJleHByZXNzaW9uTGlzdFwiIDoge1xuXHQgICAgIFwiTklMXCI6IFtcIk5JTFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIihcIixcImV4cHJlc3Npb25cIixcIipbLCxleHByZXNzaW9uXVwiLFwiKVwiXX0sIFxuXHQgIFwiZmlsdGVyXCIgOiB7XG5cdCAgICAgXCJGSUxURVJcIjogW1wiRklMVEVSXCIsXCJjb25zdHJhaW50XCJdfSwgXG5cdCAgXCJmdW5jdGlvbkNhbGxcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmXCIsXCJhcmdMaXN0XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImlyaVJlZlwiLFwiYXJnTGlzdFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJpcmlSZWZcIixcImFyZ0xpc3RcIl19LCBcblx0ICBcImdyYXBoR3JhcGhQYXR0ZXJuXCIgOiB7XG5cdCAgICAgXCJHUkFQSFwiOiBbXCJHUkFQSFwiLFwidmFyT3JJUklyZWZcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJncmFwaE5vZGVcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJ0cmlwbGVzTm9kZVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcInRyaXBsZXNOb2RlXCJdfSwgXG5cdCAgXCJncmFwaE5vZGVQYXRoXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc05vZGVQYXRoXCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc05vZGVQYXRoXCJdfSwgXG5cdCAgXCJncmFwaE9yRGVmYXVsdFwiIDoge1xuXHQgICAgIFwiREVGQVVMVFwiOiBbXCJERUZBVUxUXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiP0dSQVBIXCIsXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiP0dSQVBIXCIsXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiP0dSQVBIXCIsXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW1wiP0dSQVBIXCIsXCJpcmlSZWZcIl19LCBcblx0ICBcImdyYXBoUGF0dGVybk5vdFRyaXBsZXNcIiA6IHtcblx0ICAgICBcIntcIjogW1wiZ3JvdXBPclVuaW9uR3JhcGhQYXR0ZXJuXCJdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtcIm9wdGlvbmFsR3JhcGhQYXR0ZXJuXCJdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtcIm1pbnVzR3JhcGhQYXR0ZXJuXCJdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtcImdyYXBoR3JhcGhQYXR0ZXJuXCJdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW1wic2VydmljZUdyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJGSUxURVJcIjogW1wiZmlsdGVyXCJdLCBcblx0ICAgICBcIkJJTkRcIjogW1wiYmluZFwiXSwgXG5cdCAgICAgXCJWQUxVRVNcIjogW1wiaW5saW5lRGF0YVwiXX0sIFxuXHQgIFwiZ3JhcGhSZWZcIiA6IHtcblx0ICAgICBcIkdSQVBIXCI6IFtcIkdSQVBIXCIsXCJpcmlSZWZcIl19LCBcblx0ICBcImdyYXBoUmVmQWxsXCIgOiB7XG5cdCAgICAgXCJHUkFQSFwiOiBbXCJncmFwaFJlZlwiXSwgXG5cdCAgICAgXCJERUZBVUxUXCI6IFtcIkRFRkFVTFRcIl0sIFxuXHQgICAgIFwiTkFNRURcIjogW1wiTkFNRURcIl0sIFxuXHQgICAgIFwiQUxMXCI6IFtcIkFMTFwiXX0sIFxuXHQgIFwiZ3JhcGhUZXJtXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImJvb2xlYW5MaXRlcmFsXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiYmxhbmtOb2RlXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiYmxhbmtOb2RlXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJOSUxcIl19LCBcblx0ICBcImdyb3VwQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJHUk9VUFwiOiBbXCJHUk9VUFwiLFwiQllcIixcIitncm91cENvbmRpdGlvblwiXX0sIFxuXHQgIFwiZ3JvdXBDb25kaXRpb25cIiA6IHtcblx0ICAgICBcIlNUUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZnVuY3Rpb25DYWxsXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImZ1bmN0aW9uQ2FsbFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJmdW5jdGlvbkNhbGxcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCJleHByZXNzaW9uXCIsXCI/W0FTLHZhcl1cIixcIilcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl19LCBcblx0ICBcImdyb3VwR3JhcGhQYXR0ZXJuXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIntcIixcIm9yKFtzdWJTZWxlY3QsZ3JvdXBHcmFwaFBhdHRlcm5TdWJdKVwiLFwifVwiXX0sIFxuXHQgIFwiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIiA6IHtcblx0ICAgICBcIntcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiR1JBUEhcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiQklORFwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIihcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIltcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc0Jsb2NrXCIsXCIqW2dyYXBoUGF0dGVybk5vdFRyaXBsZXMsPy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzQmxvY2tcIixcIipbZ3JhcGhQYXR0ZXJuTm90VHJpcGxlcyw/Liw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIn1cIjogW1wiP3RyaXBsZXNCbG9ja1wiLFwiKltncmFwaFBhdHRlcm5Ob3RUcmlwbGVzLD8uLD90cmlwbGVzQmxvY2tdXCJdfSwgXG5cdCAgXCJncm91cE9yVW5pb25HcmFwaFBhdHRlcm5cIiA6IHtcblx0ICAgICBcIntcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5cIixcIipbVU5JT04sZ3JvdXBHcmFwaFBhdHRlcm5dXCJdfSwgXG5cdCAgXCJoYXZpbmdDbGF1c2VcIiA6IHtcblx0ICAgICBcIkhBVklOR1wiOiBbXCJIQVZJTkdcIixcIitoYXZpbmdDb25kaXRpb25cIl19LCBcblx0ICBcImhhdmluZ0NvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklGXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkVYSVNUU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImNvbnN0cmFpbnRcIl19LCBcblx0ICBcImlubGluZURhdGFcIiA6IHtcblx0ICAgICBcIlZBTFVFU1wiOiBbXCJWQUxVRVNcIixcImRhdGFCbG9ja1wiXX0sIFxuXHQgIFwiaW5saW5lRGF0YUZ1bGxcIiA6IHtcblx0ICAgICBcIk5JTFwiOiBbXCJvcihbTklMLFsgKCwqdmFyLCldXSlcIixcIntcIixcIipvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiLFwifVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIm9yKFtOSUwsWyAoLCp2YXIsKV1dKVwiLFwie1wiLFwiKm9yKFtbICgsKmRhdGFCbG9ja1ZhbHVlLCldLE5JTF0pXCIsXCJ9XCJdfSwgXG5cdCAgXCJpbmxpbmVEYXRhT25lVmFyXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhclwiLFwie1wiLFwiKmRhdGFCbG9ja1ZhbHVlXCIsXCJ9XCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCIsXCJ7XCIsXCIqZGF0YUJsb2NrVmFsdWVcIixcIn1cIl19LCBcblx0ICBcImluc2VydDFcIiA6IHtcblx0ICAgICBcIkRBVEFcIjogW1wiREFUQVwiLFwicXVhZERhdGFcIl0sIFxuXHQgICAgIFwie1wiOiBbXCJxdWFkUGF0dGVyblwiLFwiKnVzaW5nQ2xhdXNlXCIsXCJXSEVSRVwiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcImluc2VydENsYXVzZVwiIDoge1xuXHQgICAgIFwiSU5TRVJUXCI6IFtcIklOU0VSVFwiLFwicXVhZFBhdHRlcm5cIl19LCBcblx0ICBcImludGVnZXJcIiA6IHtcblx0ICAgICBcIklOVEVHRVJcIjogW1wiSU5URUdFUlwiXX0sIFxuXHQgIFwiaXJpUmVmXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIklSSV9SRUZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicHJlZml4ZWROYW1lXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInByZWZpeGVkTmFtZVwiXX0sIFxuXHQgIFwiaXJpUmVmT3JGdW5jdGlvblwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIixcIj9hcmdMaXN0XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImlyaVJlZlwiLFwiP2FyZ0xpc3RcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCIsXCI/YXJnTGlzdFwiXX0sIFxuXHQgIFwibGltaXRDbGF1c2VcIiA6IHtcblx0ICAgICBcIkxJTUlUXCI6IFtcIkxJTUlUXCIsXCJJTlRFR0VSXCJdfSwgXG5cdCAgXCJsaW1pdE9mZnNldENsYXVzZXNcIiA6IHtcblx0ICAgICBcIkxJTUlUXCI6IFtcImxpbWl0Q2xhdXNlXCIsXCI/b2Zmc2V0Q2xhdXNlXCJdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXCJvZmZzZXRDbGF1c2VcIixcIj9saW1pdENsYXVzZVwiXX0sIFxuXHQgIFwibG9hZFwiIDoge1xuXHQgICAgIFwiTE9BRFwiOiBbXCJMT0FEXCIsXCI/U0lMRU5UXzFcIixcImlyaVJlZlwiLFwiP1tJTlRPLGdyYXBoUmVmXVwiXX0sIFxuXHQgIFwibWludXNHcmFwaFBhdHRlcm5cIiA6IHtcblx0ICAgICBcIk1JTlVTXCI6IFtcIk1JTlVTXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwibW9kaWZ5XCIgOiB7XG5cdCAgICAgXCJXSVRIXCI6IFtcIldJVEhcIixcImlyaVJlZlwiLFwib3IoW1tkZWxldGVDbGF1c2UsP2luc2VydENsYXVzZV0saW5zZXJ0Q2xhdXNlXSlcIixcIip1c2luZ0NsYXVzZVwiLFwiV0hFUkVcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfSwgXG5cdCAgXCJtb3ZlXCIgOiB7XG5cdCAgICAgXCJNT1ZFXCI6IFtcIk1PVkVcIixcIj9TSUxFTlRfNFwiLFwiZ3JhcGhPckRlZmF1bHRcIixcIlRPXCIsXCJncmFwaE9yRGVmYXVsdFwiXX0sIFxuXHQgIFwibXVsdGlwbGljYXRpdmVFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCIrXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCItXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklGXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widW5hcnlFeHByZXNzaW9uXCIsXCIqb3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInVuYXJ5RXhwcmVzc2lvblwiLFwiKm9yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ1bmFyeUV4cHJlc3Npb25cIixcIipvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIl19LCBcblx0ICBcIm5hbWVkR3JhcGhDbGF1c2VcIiA6IHtcblx0ICAgICBcIk5BTUVEXCI6IFtcIk5BTUVEXCIsXCJzb3VyY2VTZWxlY3RvclwiXX0sIFxuXHQgIFwibm90RXhpc3RzRnVuY1wiIDoge1xuXHQgICAgIFwiTk9UXCI6IFtcIk5PVFwiLFwiRVhJU1RTXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwibnVtZXJpY0V4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIiFcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIitcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIi1cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIihcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJhZGRpdGl2ZUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiYWRkaXRpdmVFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImFkZGl0aXZlRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwibnVtZXJpY0xpdGVyYWxcIiA6IHtcblx0ICAgICBcIklOVEVHRVJcIjogW1wibnVtZXJpY0xpdGVyYWxVbnNpZ25lZFwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm51bWVyaWNMaXRlcmFsVW5zaWduZWRcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm51bWVyaWNMaXRlcmFsVW5zaWduZWRcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFBvc2l0aXZlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsTmVnYXRpdmVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdfSwgXG5cdCAgXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIklOVEVHRVJfTkVHQVRJVkVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJERUNJTUFMX05FR0FUSVZFXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJET1VCTEVfTkVHQVRJVkVcIl19LCBcblx0ICBcIm51bWVyaWNMaXRlcmFsUG9zaXRpdmVcIiA6IHtcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiSU5URUdFUl9QT1NJVElWRVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIkRFQ0lNQUxfUE9TSVRJVkVcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIkRPVUJMRV9QT1NJVElWRVwiXX0sIFxuXHQgIFwibnVtZXJpY0xpdGVyYWxVbnNpZ25lZFwiIDoge1xuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJJTlRFR0VSXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiREVDSU1BTFwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiRE9VQkxFXCJdfSwgXG5cdCAgXCJvYmplY3RcIiA6IHtcblx0ICAgICBcIihcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaE5vZGVcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaE5vZGVcIl19LCBcblx0ICBcIm9iamVjdExpc3RcIiA6IHtcblx0ICAgICBcIihcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJbXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wib2JqZWN0XCIsXCIqWywsb2JqZWN0XVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm9iamVjdFwiLFwiKlssLG9iamVjdF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJvYmplY3RcIixcIipbLCxvYmplY3RdXCJdfSwgXG5cdCAgXCJvYmplY3RMaXN0UGF0aFwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wib2JqZWN0UGF0aFwiLFwiKlssLG9iamVjdFBhdGhdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJvYmplY3RQYXRoXCIsXCIqWywsb2JqZWN0UGF0aF1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIm9iamVjdFBhdGhcIixcIipbLCxvYmplY3RQYXRoXVwiXX0sIFxuXHQgIFwib2JqZWN0UGF0aFwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIltcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJncmFwaE5vZGVQYXRoXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhOb2RlUGF0aFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcImdyYXBoTm9kZVBhdGhcIl19LCBcblx0ICBcIm9mZnNldENsYXVzZVwiIDoge1xuXHQgICAgIFwiT0ZGU0VUXCI6IFtcIk9GRlNFVFwiLFwiSU5URUdFUlwiXX0sIFxuXHQgIFwib3B0aW9uYWxHcmFwaFBhdHRlcm5cIiA6IHtcblx0ICAgICBcIk9QVElPTkFMXCI6IFtcIk9QVElPTkFMXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXX0sIFxuXHQgIFwib3IoWyosZXhwcmVzc2lvbl0pXCIgOiB7XG5cdCAgICAgXCIqXCI6IFtcIipcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIitcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCItXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNSU5cIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1QTEVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRVBMQUNFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1RcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJleHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiZXhwcmVzc2lvblwiXX0sIFxuXHQgIFwib3IoWytvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pLCpdKVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCIrb3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcIitvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiK29yKFt2YXIsWyAoLGV4cHJlc3Npb24sQVMsdmFyLCldXSlcIl0sIFxuXHQgICAgIFwiKlwiOiBbXCIqXCJdfSwgXG5cdCAgXCJvcihbK3Zhck9ySVJJcmVmLCpdKVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCIrdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCIrdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCIrdmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiK3Zhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIit2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCIqXCI6IFtcIipcIl19LCBcblx0ICBcIm9yKFtBU0MsREVTQ10pXCIgOiB7XG5cdCAgICAgXCJBU0NcIjogW1wiQVNDXCJdLCBcblx0ICAgICBcIkRFU0NcIjogW1wiREVTQ1wiXX0sIFxuXHQgIFwib3IoW0RJU1RJTkNULFJFRFVDRURdKVwiIDoge1xuXHQgICAgIFwiRElTVElOQ1RcIjogW1wiRElTVElOQ1RcIl0sIFxuXHQgICAgIFwiUkVEVUNFRFwiOiBbXCJSRURVQ0VEXCJdfSwgXG5cdCAgXCJvcihbTEFOR1RBRyxbXl4saXJpUmVmXV0pXCIgOiB7XG5cdCAgICAgXCJMQU5HVEFHXCI6IFtcIkxBTkdUQUdcIl0sIFxuXHQgICAgIFwiXl5cIjogW1wiW15eLGlyaVJlZl1cIl19LCBcblx0ICBcIm9yKFtOSUwsWyAoLCp2YXIsKV1dKVwiIDoge1xuXHQgICAgIFwiTklMXCI6IFtcIk5JTFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIlsgKCwqdmFyLCldXCJdfSwgXG5cdCAgXCJvcihbWyAoLCpkYXRhQmxvY2tWYWx1ZSwpXSxOSUxdKVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJbICgsKmRhdGFCbG9ja1ZhbHVlLCldXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJOSUxcIl19LCBcblx0ICBcIm9yKFtbICgsZXhwcmVzc2lvbiwpXSxOSUxdKVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJbICgsZXhwcmVzc2lvbiwpXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiTklMXCJdfSwgXG5cdCAgXCJvcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSlcIiA6IHtcblx0ICAgICBcIipcIjogW1wiWyosdW5hcnlFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCIvXCI6IFtcIlsvLHVuYXJ5RXhwcmVzc2lvbl1cIl19LCBcblx0ICBcIm9yKFtbKyxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dLFstLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl0sW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXV0pXCIgOiB7XG5cdCAgICAgXCIrXCI6IFtcIlsrLG11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJbLSxtdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wiW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcIltvcihbbnVtZXJpY0xpdGVyYWxQb3NpdGl2ZSxudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXSksP29yKFtbKix1bmFyeUV4cHJlc3Npb25dLFsvLHVuYXJ5RXhwcmVzc2lvbl1dKV1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJbb3IoW251bWVyaWNMaXRlcmFsUG9zaXRpdmUsbnVtZXJpY0xpdGVyYWxOZWdhdGl2ZV0pLD9vcihbWyosdW5hcnlFeHByZXNzaW9uXSxbLyx1bmFyeUV4cHJlc3Npb25dXSldXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiW29yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKSw/b3IoW1sqLHVuYXJ5RXhwcmVzc2lvbl0sWy8sdW5hcnlFeHByZXNzaW9uXV0pXVwiXX0sIFxuXHQgIFwib3IoW1ssLG9yKFt9LFtpbnRlZ2VyLH1dXSldLH1dKVwiIDoge1xuXHQgICAgIFwiLFwiOiBbXCJbLCxvcihbfSxbaW50ZWdlcix9XV0pXVwiXSwgXG5cdCAgICAgXCJ9XCI6IFtcIn1cIl19LCBcblx0ICBcIm9yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIiA6IHtcblx0ICAgICBcIj1cIjogW1wiWz0sbnVtZXJpY0V4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIiE9XCI6IFtcIlshPSxudW1lcmljRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiPFwiOiBbXCJbPCxudW1lcmljRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiPlwiOiBbXCJbPixudW1lcmljRXhwcmVzc2lvbl1cIl0sIFxuXHQgICAgIFwiPD1cIjogW1wiWzw9LG51bWVyaWNFeHByZXNzaW9uXVwiXSwgXG5cdCAgICAgXCI+PVwiOiBbXCJbPj0sbnVtZXJpY0V4cHJlc3Npb25dXCJdLCBcblx0ICAgICBcIklOXCI6IFtcIltJTixleHByZXNzaW9uTGlzdF1cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcIltOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXCJdfSwgXG5cdCAgXCJvcihbW2NvbnN0cnVjdFRlbXBsYXRlLCpkYXRhc2V0Q2xhdXNlLHdoZXJlQ2xhdXNlLHNvbHV0aW9uTW9kaWZpZXJdLFsqZGF0YXNldENsYXVzZSxXSEVSRSx7LD90cmlwbGVzVGVtcGxhdGUsfSxzb2x1dGlvbk1vZGlmaWVyXV0pXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIltjb25zdHJ1Y3RUZW1wbGF0ZSwqZGF0YXNldENsYXVzZSx3aGVyZUNsYXVzZSxzb2x1dGlvbk1vZGlmaWVyXVwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXCJbKmRhdGFzZXRDbGF1c2UsV0hFUkUseyw/dHJpcGxlc1RlbXBsYXRlLH0sc29sdXRpb25Nb2RpZmllcl1cIl0sIFxuXHQgICAgIFwiRlJPTVwiOiBbXCJbKmRhdGFzZXRDbGF1c2UsV0hFUkUseyw/dHJpcGxlc1RlbXBsYXRlLH0sc29sdXRpb25Nb2RpZmllcl1cIl19LCBcblx0ICBcIm9yKFtbZGVsZXRlQ2xhdXNlLD9pbnNlcnRDbGF1c2VdLGluc2VydENsYXVzZV0pXCIgOiB7XG5cdCAgICAgXCJERUxFVEVcIjogW1wiW2RlbGV0ZUNsYXVzZSw/aW5zZXJ0Q2xhdXNlXVwiXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW1wiaW5zZXJ0Q2xhdXNlXCJdfSwgXG5cdCAgXCJvcihbW2ludGVnZXIsb3IoW1ssLG9yKFt9LFtpbnRlZ2VyLH1dXSldLH1dKV0sWywsaW50ZWdlcix9XV0pXCIgOiB7XG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcIltpbnRlZ2VyLG9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSldXCJdLCBcblx0ICAgICBcIixcIjogW1wiWywsaW50ZWdlcix9XVwiXX0sIFxuXHQgIFwib3IoW2RlZmF1bHRHcmFwaENsYXVzZSxuYW1lZEdyYXBoQ2xhdXNlXSlcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiZGVmYXVsdEdyYXBoQ2xhdXNlXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImRlZmF1bHRHcmFwaENsYXVzZVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJkZWZhdWx0R3JhcGhDbGF1c2VcIl0sIFxuXHQgICAgIFwiTkFNRURcIjogW1wibmFtZWRHcmFwaENsYXVzZVwiXX0sIFxuXHQgIFwib3IoW2lubGluZURhdGFPbmVWYXIsaW5saW5lRGF0YUZ1bGxdKVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJpbmxpbmVEYXRhT25lVmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiaW5saW5lRGF0YU9uZVZhclwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1wiaW5saW5lRGF0YUZ1bGxcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJpbmxpbmVEYXRhRnVsbFwiXX0sIFxuXHQgIFwib3IoW2lyaVJlZixbTkFNRUQsaXJpUmVmXV0pXCIgOiB7XG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIk5BTUVEXCI6IFtcIltOQU1FRCxpcmlSZWZdXCJdfSwgXG5cdCAgXCJvcihbaXJpUmVmLGFdKVwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJhXCI6IFtcImFcIl19LCBcblx0ICBcIm9yKFtudW1lcmljTGl0ZXJhbFBvc2l0aXZlLG51bWVyaWNMaXRlcmFsTmVnYXRpdmVdKVwiIDoge1xuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFBvc2l0aXZlXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxQb3NpdGl2ZVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsTmVnYXRpdmVcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbE5lZ2F0aXZlXCJdfSwgXG5cdCAgXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIiA6IHtcblx0ICAgICBcIkNPTlNUUlVDVFwiOiBbXCJxdWVyeUFsbFwiXSwgXG5cdCAgICAgXCJERVNDUklCRVwiOiBbXCJxdWVyeUFsbFwiXSwgXG5cdCAgICAgXCJBU0tcIjogW1wicXVlcnlBbGxcIl0sIFxuXHQgICAgIFwiU0VMRUNUXCI6IFtcInF1ZXJ5QWxsXCJdLCBcblx0ICAgICBcIklOU0VSVFwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiRFJPUFwiOiBbXCJ1cGRhdGVBbGxcIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJDT1BZXCI6IFtcInVwZGF0ZUFsbFwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1widXBkYXRlQWxsXCJdLCBcblx0ICAgICBcIldJVEhcIjogW1widXBkYXRlQWxsXCJdLCBcblx0ICAgICBcIiRcIjogW1widXBkYXRlQWxsXCJdfSwgXG5cdCAgXCJvcihbc2VsZWN0UXVlcnksY29uc3RydWN0UXVlcnksZGVzY3JpYmVRdWVyeSxhc2tRdWVyeV0pXCIgOiB7XG5cdCAgICAgXCJTRUxFQ1RcIjogW1wic2VsZWN0UXVlcnlcIl0sIFxuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtcImNvbnN0cnVjdFF1ZXJ5XCJdLCBcblx0ICAgICBcIkRFU0NSSUJFXCI6IFtcImRlc2NyaWJlUXVlcnlcIl0sIFxuXHQgICAgIFwiQVNLXCI6IFtcImFza1F1ZXJ5XCJdfSwgXG5cdCAgXCJvcihbc3ViU2VsZWN0LGdyb3VwR3JhcGhQYXR0ZXJuU3ViXSlcIiA6IHtcblx0ICAgICBcIlNFTEVDVFwiOiBbXCJzdWJTZWxlY3RcIl0sIFxuXHQgICAgIFwie1wiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJPUFRJT05BTFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJNSU5VU1wiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJTRVJWSUNFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkZJTFRFUlwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJCSU5EXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlZBTFVFU1wiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIihcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcImdyb3VwR3JhcGhQYXR0ZXJuU3ViXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wiZ3JvdXBHcmFwaFBhdHRlcm5TdWJcIl0sIFxuXHQgICAgIFwifVwiOiBbXCJncm91cEdyYXBoUGF0dGVyblN1YlwiXX0sIFxuXHQgIFwib3IoW3ZhcixbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1dKVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJbICgsZXhwcmVzc2lvbixBUyx2YXIsKV1cIl19LCBcblx0ICBcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIiA6IHtcblx0ICAgICBcIl5cIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJ2ZXJiUGF0aFwiXSwgXG5cdCAgICAgXCIhXCI6IFtcInZlcmJQYXRoXCJdLCBcblx0ICAgICBcIihcIjogW1widmVyYlBhdGhcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ2ZXJiUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ2ZXJiUGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ2ZXJiUGF0aFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInZlcmJTaW1wbGVcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2ZXJiU2ltcGxlXCJdfSwgXG5cdCAgXCJvcihbfSxbaW50ZWdlcix9XV0pXCIgOiB7XG5cdCAgICAgXCJ9XCI6IFtcIn1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJbaW50ZWdlcix9XVwiXX0sIFxuXHQgIFwib3JkZXJDbGF1c2VcIiA6IHtcblx0ICAgICBcIk9SREVSXCI6IFtcIk9SREVSXCIsXCJCWVwiLFwiK29yZGVyQ29uZGl0aW9uXCJdfSwgXG5cdCAgXCJvcmRlckNvbmRpdGlvblwiIDoge1xuXHQgICAgIFwiQVNDXCI6IFtcIm9yKFtBU0MsREVTQ10pXCIsXCJicmFja2V0dGVkRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERVNDXCI6IFtcIm9yKFtBU0MsREVTQ10pXCIsXCJicmFja2V0dGVkRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIoXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJjb25zdHJhaW50XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImNvbnN0cmFpbnRcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiY29uc3RyYWludFwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhclwiXX0sIFxuXHQgIFwicGF0aFwiIDoge1xuXHQgICAgIFwiXlwiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoQWx0ZXJuYXRpdmVcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aEFsdGVybmF0aXZlXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhBbHRlcm5hdGl2ZVwiXX0sIFxuXHQgIFwicGF0aEFsdGVybmF0aXZlXCIgOiB7XG5cdCAgICAgXCJeXCI6IFtcInBhdGhTZXF1ZW5jZVwiLFwiKlt8LHBhdGhTZXF1ZW5jZV1cIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJwYXRoU2VxdWVuY2VcIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aFNlcXVlbmNlXCIsXCIqW3wscGF0aFNlcXVlbmNlXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInBhdGhTZXF1ZW5jZVwiLFwiKlt8LHBhdGhTZXF1ZW5jZV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoU2VxdWVuY2VcIixcIipbfCxwYXRoU2VxdWVuY2VdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhTZXF1ZW5jZVwiLFwiKlt8LHBhdGhTZXF1ZW5jZV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicGF0aFNlcXVlbmNlXCIsXCIqW3wscGF0aFNlcXVlbmNlXVwiXX0sIFxuXHQgIFwicGF0aEVsdFwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJwYXRoUHJpbWFyeVwiLFwiP3BhdGhNb2RcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJwYXRoUHJpbWFyeVwiLFwiP3BhdGhNb2RcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJwYXRoUHJpbWFyeVwiLFwiP3BhdGhNb2RcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoUHJpbWFyeVwiLFwiP3BhdGhNb2RcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aFByaW1hcnlcIixcIj9wYXRoTW9kXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhQcmltYXJ5XCIsXCI/cGF0aE1vZFwiXX0sIFxuXHQgIFwicGF0aEVsdE9ySW52ZXJzZVwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJwYXRoRWx0XCJdLCBcblx0ICAgICBcIiFcIjogW1wicGF0aEVsdFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInBhdGhFbHRcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoRWx0XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInBhdGhFbHRcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicGF0aEVsdFwiXSwgXG5cdCAgICAgXCJeXCI6IFtcIl5cIixcInBhdGhFbHRcIl19LCBcblx0ICBcInBhdGhNb2RcIiA6IHtcblx0ICAgICBcIipcIjogW1wiKlwiXSwgXG5cdCAgICAgXCI/XCI6IFtcIj9cIl0sIFxuXHQgICAgIFwiK1wiOiBbXCIrXCJdLCBcblx0ICAgICBcIntcIjogW1wie1wiLFwib3IoW1tpbnRlZ2VyLG9yKFtbLCxvcihbfSxbaW50ZWdlcix9XV0pXSx9XSldLFssLGludGVnZXIsfV1dKVwiXX0sIFxuXHQgIFwicGF0aE5lZ2F0ZWRQcm9wZXJ0eVNldFwiIDoge1xuXHQgICAgIFwiYVwiOiBbXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiXSwgXG5cdCAgICAgXCJeXCI6IFtcInBhdGhPbmVJblByb3BlcnR5U2V0XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicGF0aE9uZUluUHJvcGVydHlTZXRcIl0sIFxuXHQgICAgIFwiKFwiOiBbXCIoXCIsXCI/W3BhdGhPbmVJblByb3BlcnR5U2V0LCpbfCxwYXRoT25lSW5Qcm9wZXJ0eVNldF1dXCIsXCIpXCJdfSwgXG5cdCAgXCJwYXRoT25lSW5Qcm9wZXJ0eVNldFwiIDoge1xuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJhXCI6IFtcImFcIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJeXCIsXCJvcihbaXJpUmVmLGFdKVwiXX0sIFxuXHQgIFwicGF0aFByaW1hcnlcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInN0b3JlUHJvcGVydHlcIixcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJhXCJdLCBcblx0ICAgICBcIiFcIjogW1wiIVwiLFwicGF0aE5lZ2F0ZWRQcm9wZXJ0eVNldFwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIihcIixcInBhdGhcIixcIilcIl19LCBcblx0ICBcInBhdGhTZXF1ZW5jZVwiIDoge1xuXHQgICAgIFwiXlwiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJwYXRoRWx0T3JJbnZlcnNlXCIsXCIqWy8scGF0aEVsdE9ySW52ZXJzZV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aEVsdE9ySW52ZXJzZVwiLFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInBhdGhFbHRPckludmVyc2VcIixcIipbLyxwYXRoRWx0T3JJbnZlcnNlXVwiXX0sIFxuXHQgIFwicHJlZml4RGVjbFwiIDoge1xuXHQgICAgIFwiUFJFRklYXCI6IFtcIlBSRUZJWFwiLFwiUE5BTUVfTlNcIixcIklSSV9SRUZcIl19LCBcblx0ICBcInByZWZpeGVkTmFtZVwiIDoge1xuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wiUE5BTUVfTE5cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiUE5BTUVfTlNcIl19LCBcblx0ICBcInByaW1hcnlFeHByZXNzaW9uXCIgOiB7XG5cdCAgICAgXCIoXCI6IFtcImJyYWNrZXR0ZWRFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJMQU5HXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkxBTkdNQVRDSEVTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkJPVU5EXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklSSVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQk5PREVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkFORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiQ0VJTFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJGTE9PUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT05DQVRcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSTEVOXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkxDQVNFXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkVOQ09ERV9GT1JfVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUlNUQVJUU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJFTkRTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJBRlRFUlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJZRUFSXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIkRBWVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJIT1VSU1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNFQ09ORFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVElNRVpPTkVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiVFpcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTk9XXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlVVSURcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJNRDVcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiU0hBMzg0XCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNIQTUxMlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJJRlwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVFJMQU5HXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIlNBTUVURVJNXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTSVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTQkxBTktcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiSVNMSVRFUkFMXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJidWlsdEluQ2FsbFwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wiYnVpbHRJbkNhbGxcIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcImJ1aWx0SW5DYWxsXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmT3JGdW5jdGlvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZPckZ1bmN0aW9uXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcImlyaVJlZk9yRnVuY3Rpb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInJkZkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wicmRmTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJyZGZMaXRlcmFsXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCJudW1lcmljTGl0ZXJhbFwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wibnVtZXJpY0xpdGVyYWxcIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIm51bWVyaWNMaXRlcmFsXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wiYm9vbGVhbkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiYm9vbGVhbkxpdGVyYWxcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJ2YXJcIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wiYWdncmVnYXRlXCJdLCBcblx0ICAgICBcIlNVTVwiOiBbXCJhZ2dyZWdhdGVcIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcImFnZ3JlZ2F0ZVwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wiYWdncmVnYXRlXCJdLCBcblx0ICAgICBcIkFWR1wiOiBbXCJhZ2dyZWdhdGVcIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcImFnZ3JlZ2F0ZVwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wiYWdncmVnYXRlXCJdfSwgXG5cdCAgXCJwcm9sb2d1ZVwiIDoge1xuXHQgICAgIFwiUFJFRklYXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiQkFTRVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIiRcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJDT05TVFJVQ1RcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJERVNDUklCRVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkFTS1wiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIklOU0VSVFwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIlNFTEVDVFwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkxPQURcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJDTEVBUlwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJBRERcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXSwgXG5cdCAgICAgXCJNT1ZFXCI6IFtcIj9iYXNlRGVjbFwiLFwiKnByZWZpeERlY2xcIl0sIFxuXHQgICAgIFwiQ09QWVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIkNSRUFURVwiOiBbXCI/YmFzZURlY2xcIixcIipwcmVmaXhEZWNsXCJdLCBcblx0ICAgICBcIldJVEhcIjogW1wiP2Jhc2VEZWNsXCIsXCIqcHJlZml4RGVjbFwiXX0sIFxuXHQgIFwicHJvcGVydHlMaXN0XCIgOiB7XG5cdCAgICAgXCJhXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIi5cIjogW10sIFxuXHQgICAgIFwifVwiOiBbXSwgXG5cdCAgICAgXCJHUkFQSFwiOiBbXX0sIFxuXHQgIFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIiA6IHtcblx0ICAgICBcImFcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiLFwiKls7LD9bdmVyYixvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJ2ZXJiXCIsXCJvYmplY3RMaXN0XCIsXCIqWzssP1t2ZXJiLG9iamVjdExpc3RdXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZlcmJcIixcIm9iamVjdExpc3RcIixcIipbOyw/W3ZlcmIsb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiLFwiKls7LD9bdmVyYixvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiLFwiKls7LD9bdmVyYixvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmVyYlwiLFwib2JqZWN0TGlzdFwiLFwiKls7LD9bdmVyYixvYmplY3RMaXN0XV1cIl19LCBcblx0ICBcInByb3BlcnR5TGlzdFBhdGhcIiA6IHtcblx0ICAgICBcImFcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiLlwiOiBbXSwgXG5cdCAgICAgXCJ7XCI6IFtdLCBcblx0ICAgICBcIk9QVElPTkFMXCI6IFtdLCBcblx0ICAgICBcIk1JTlVTXCI6IFtdLCBcblx0ICAgICBcIkdSQVBIXCI6IFtdLCBcblx0ICAgICBcIlNFUlZJQ0VcIjogW10sIFxuXHQgICAgIFwiRklMVEVSXCI6IFtdLCBcblx0ICAgICBcIkJJTkRcIjogW10sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtdLCBcblx0ICAgICBcIn1cIjogW119LCBcblx0ICBcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiIDoge1xuXHQgICAgIFwiVkFSMVwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiXlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiYVwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pXCIsXCJvYmplY3RMaXN0UGF0aFwiLFwiKls7LD9bb3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XV1cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wib3IoW3ZlcmJQYXRoLHZlcmJTaW1wbGVdKVwiLFwib2JqZWN0TGlzdFBhdGhcIixcIipbOyw/W29yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSksb2JqZWN0TGlzdF1dXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm9yKFt2ZXJiUGF0aCx2ZXJiU2ltcGxlXSlcIixcIm9iamVjdExpc3RQYXRoXCIsXCIqWzssP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXVwiXX0sIFxuXHQgIFwicXVhZERhdGFcIiA6IHtcblx0ICAgICBcIntcIjogW1wie1wiLFwiZGlzYWxsb3dWYXJzXCIsXCJxdWFkc1wiLFwiYWxsb3dWYXJzXCIsXCJ9XCJdfSwgXG5cdCAgXCJxdWFkRGF0YU5vQm5vZGVzXCIgOiB7XG5cdCAgICAgXCJ7XCI6IFtcIntcIixcImRpc2FsbG93Qm5vZGVzXCIsXCJkaXNhbGxvd1ZhcnNcIixcInF1YWRzXCIsXCJhbGxvd1ZhcnNcIixcImFsbG93Qm5vZGVzXCIsXCJ9XCJdfSwgXG5cdCAgXCJxdWFkUGF0dGVyblwiIDoge1xuXHQgICAgIFwie1wiOiBbXCJ7XCIsXCJxdWFkc1wiLFwifVwiXX0sIFxuXHQgIFwicXVhZFBhdHRlcm5Ob0Jub2Rlc1wiIDoge1xuXHQgICAgIFwie1wiOiBbXCJ7XCIsXCJkaXNhbGxvd0Jub2Rlc1wiLFwicXVhZHNcIixcImFsbG93Qm5vZGVzXCIsXCJ9XCJdfSwgXG5cdCAgXCJxdWFkc1wiIDoge1xuXHQgICAgIFwiR1JBUEhcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIltcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJUUlVFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiQU5PTlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJET1VCTEVcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRPVUJMRV9QT1NJVElWRVwiOiBbXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCIqW3F1YWRzTm90VHJpcGxlcyw/Liw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX05FR0FUSVZFXCI6IFtcIj90cmlwbGVzVGVtcGxhdGVcIixcIipbcXVhZHNOb3RUcmlwbGVzLD8uLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIn1cIjogW1wiP3RyaXBsZXNUZW1wbGF0ZVwiLFwiKltxdWFkc05vdFRyaXBsZXMsPy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl19LCBcblx0ICBcInF1YWRzTm90VHJpcGxlc1wiIDoge1xuXHQgICAgIFwiR1JBUEhcIjogW1wiR1JBUEhcIixcInZhck9ySVJJcmVmXCIsXCJ7XCIsXCI/dHJpcGxlc1RlbXBsYXRlXCIsXCJ9XCJdfSwgXG5cdCAgXCJxdWVyeUFsbFwiIDoge1xuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtcIm9yKFtzZWxlY3RRdWVyeSxjb25zdHJ1Y3RRdWVyeSxkZXNjcmliZVF1ZXJ5LGFza1F1ZXJ5XSlcIixcInZhbHVlc0NsYXVzZVwiXSwgXG5cdCAgICAgXCJERVNDUklCRVwiOiBbXCJvcihbc2VsZWN0UXVlcnksY29uc3RydWN0UXVlcnksZGVzY3JpYmVRdWVyeSxhc2tRdWVyeV0pXCIsXCJ2YWx1ZXNDbGF1c2VcIl0sIFxuXHQgICAgIFwiQVNLXCI6IFtcIm9yKFtzZWxlY3RRdWVyeSxjb25zdHJ1Y3RRdWVyeSxkZXNjcmliZVF1ZXJ5LGFza1F1ZXJ5XSlcIixcInZhbHVlc0NsYXVzZVwiXSwgXG5cdCAgICAgXCJTRUxFQ1RcIjogW1wib3IoW3NlbGVjdFF1ZXJ5LGNvbnN0cnVjdFF1ZXJ5LGRlc2NyaWJlUXVlcnksYXNrUXVlcnldKVwiLFwidmFsdWVzQ2xhdXNlXCJdfSwgXG5cdCAgXCJyZGZMaXRlcmFsXCIgOiB7XG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDFcIjogW1wic3RyaW5nXCIsXCI/b3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wic3RyaW5nXCIsXCI/b3IoW0xBTkdUQUcsW15eLGlyaVJlZl1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJzdHJpbmdcIixcIj9vcihbTEFOR1RBRyxbXl4saXJpUmVmXV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcInN0cmluZ1wiLFwiP29yKFtMQU5HVEFHLFteXixpcmlSZWZdXSlcIl19LCBcblx0ICBcInJlZ2V4RXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiUkVHRVhcIjogW1wiUkVHRVhcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIj9bLCxleHByZXNzaW9uXVwiLFwiKVwiXX0sIFxuXHQgIFwicmVsYXRpb25hbEV4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIiFcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIitcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIi1cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlZBUjFcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIihcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkRBVEFUWVBFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJVUklcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJBQlNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJST1VORFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlVDQVNFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkNPTlRBSU5TXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUkJFRk9SRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk1PTlRIXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJNSU5VVEVTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiVFpcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSVVVJRFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTSEEyNTZcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJDT0FMRVNDRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSUZcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUkRUXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklTVVJJXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklTTlVNRVJJQ1wiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkNPVU5UXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiTUFYXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiR1JPVVBfQ09OQ0FUXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlJFR0VYXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJudW1lcmljRXhwcmVzc2lvblwiLFwiP29yKFtbPSxudW1lcmljRXhwcmVzc2lvbl0sWyE9LG51bWVyaWNFeHByZXNzaW9uXSxbPCxudW1lcmljRXhwcmVzc2lvbl0sWz4sbnVtZXJpY0V4cHJlc3Npb25dLFs8PSxudW1lcmljRXhwcmVzc2lvbl0sWz49LG51bWVyaWNFeHByZXNzaW9uXSxbSU4sZXhwcmVzc2lvbkxpc3RdLFtOT1QsSU4sZXhwcmVzc2lvbkxpc3RdXSlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wibnVtZXJpY0V4cHJlc3Npb25cIixcIj9vcihbWz0sbnVtZXJpY0V4cHJlc3Npb25dLFshPSxudW1lcmljRXhwcmVzc2lvbl0sWzwsbnVtZXJpY0V4cHJlc3Npb25dLFs+LG51bWVyaWNFeHByZXNzaW9uXSxbPD0sbnVtZXJpY0V4cHJlc3Npb25dLFs+PSxudW1lcmljRXhwcmVzc2lvbl0sW0lOLGV4cHJlc3Npb25MaXN0XSxbTk9ULElOLGV4cHJlc3Npb25MaXN0XV0pXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcIm51bWVyaWNFeHByZXNzaW9uXCIsXCI/b3IoW1s9LG51bWVyaWNFeHByZXNzaW9uXSxbIT0sbnVtZXJpY0V4cHJlc3Npb25dLFs8LG51bWVyaWNFeHByZXNzaW9uXSxbPixudW1lcmljRXhwcmVzc2lvbl0sWzw9LG51bWVyaWNFeHByZXNzaW9uXSxbPj0sbnVtZXJpY0V4cHJlc3Npb25dLFtJTixleHByZXNzaW9uTGlzdF0sW05PVCxJTixleHByZXNzaW9uTGlzdF1dKVwiXX0sIFxuXHQgIFwic2VsZWN0Q2xhdXNlXCIgOiB7XG5cdCAgICAgXCJTRUxFQ1RcIjogW1wiU0VMRUNUXCIsXCI/b3IoW0RJU1RJTkNULFJFRFVDRURdKVwiLFwib3IoWytvcihbdmFyLFsgKCxleHByZXNzaW9uLEFTLHZhciwpXV0pLCpdKVwiXX0sIFxuXHQgIFwic2VsZWN0UXVlcnlcIiA6IHtcblx0ICAgICBcIlNFTEVDVFwiOiBbXCJzZWxlY3RDbGF1c2VcIixcIipkYXRhc2V0Q2xhdXNlXCIsXCJ3aGVyZUNsYXVzZVwiLFwic29sdXRpb25Nb2RpZmllclwiXX0sIFxuXHQgIFwic2VydmljZUdyYXBoUGF0dGVyblwiIDoge1xuXHQgICAgIFwiU0VSVklDRVwiOiBbXCJTRVJWSUNFXCIsXCI/U0lMRU5UXCIsXCJ2YXJPcklSSXJlZlwiLFwiZ3JvdXBHcmFwaFBhdHRlcm5cIl19LCBcblx0ICBcInNvbHV0aW9uTW9kaWZpZXJcIiA6IHtcblx0ICAgICBcIkxJTUlUXCI6IFtcIj9ncm91cENsYXVzZVwiLFwiP2hhdmluZ0NsYXVzZVwiLFwiP29yZGVyQ2xhdXNlXCIsXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIk9GRlNFVFwiOiBbXCI/Z3JvdXBDbGF1c2VcIixcIj9oYXZpbmdDbGF1c2VcIixcIj9vcmRlckNsYXVzZVwiLFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCJPUkRFUlwiOiBbXCI/Z3JvdXBDbGF1c2VcIixcIj9oYXZpbmdDbGF1c2VcIixcIj9vcmRlckNsYXVzZVwiLFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXSwgXG5cdCAgICAgXCJIQVZJTkdcIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwiR1JPVVBcIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwiVkFMVUVTXCI6IFtcIj9ncm91cENsYXVzZVwiLFwiP2hhdmluZ0NsYXVzZVwiLFwiP29yZGVyQ2xhdXNlXCIsXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJdLCBcblx0ICAgICBcIiRcIjogW1wiP2dyb3VwQ2xhdXNlXCIsXCI/aGF2aW5nQ2xhdXNlXCIsXCI/b3JkZXJDbGF1c2VcIixcIj9saW1pdE9mZnNldENsYXVzZXNcIl0sIFxuXHQgICAgIFwifVwiOiBbXCI/Z3JvdXBDbGF1c2VcIixcIj9oYXZpbmdDbGF1c2VcIixcIj9vcmRlckNsYXVzZVwiLFwiP2xpbWl0T2Zmc2V0Q2xhdXNlc1wiXX0sIFxuXHQgIFwic291cmNlU2VsZWN0b3JcIiA6IHtcblx0ICAgICBcIklSSV9SRUZcIjogW1wiaXJpUmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJpcmlSZWZcIl19LCBcblx0ICBcInNwYXJxbDExXCIgOiB7XG5cdCAgICAgXCIkXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQ09OU1RSVUNUXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiREVTQ1JJQkVcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJBU0tcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJJTlNFUlRcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJTRUxFQ1RcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wicHJvbG9ndWVcIixcIm9yKFtxdWVyeUFsbCx1cGRhdGVBbGxdKVwiLFwiJFwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiUFJFRklYXCI6IFtcInByb2xvZ3VlXCIsXCJvcihbcXVlcnlBbGwsdXBkYXRlQWxsXSlcIixcIiRcIl0sIFxuXHQgICAgIFwiQkFTRVwiOiBbXCJwcm9sb2d1ZVwiLFwib3IoW3F1ZXJ5QWxsLHVwZGF0ZUFsbF0pXCIsXCIkXCJdfSwgXG5cdCAgXCJzdG9yZVByb3BlcnR5XCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtdLCBcblx0ICAgICBcIlZBUjJcIjogW10sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXSwgXG5cdCAgICAgXCJhXCI6IFtdfSwgXG5cdCAgXCJzdHJSZXBsYWNlRXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJSRVBMQUNFXCIsXCIoXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCIsXCIsXCJleHByZXNzaW9uXCIsXCI/WywsZXhwcmVzc2lvbl1cIixcIilcIl19LCBcblx0ICBcInN0cmluZ1wiIDoge1xuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcIlNUUklOR19MSVRFUkFMMVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiU1RSSU5HX0xJVEVSQUwyXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcIlNUUklOR19MSVRFUkFMX0xPTkcxXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcyXCI6IFtcIlNUUklOR19MSVRFUkFMX0xPTkcyXCJdfSwgXG5cdCAgXCJzdWJTZWxlY3RcIiA6IHtcblx0ICAgICBcIlNFTEVDVFwiOiBbXCJzZWxlY3RDbGF1c2VcIixcIndoZXJlQ2xhdXNlXCIsXCJzb2x1dGlvbk1vZGlmaWVyXCIsXCJ2YWx1ZXNDbGF1c2VcIl19LCBcblx0ICBcInN1YnN0cmluZ0V4cHJlc3Npb25cIiA6IHtcblx0ICAgICBcIlNVQlNUUlwiOiBbXCJTVUJTVFJcIixcIihcIixcImV4cHJlc3Npb25cIixcIixcIixcImV4cHJlc3Npb25cIixcIj9bLCxleHByZXNzaW9uXVwiLFwiKVwiXX0sIFxuXHQgIFwidHJpcGxlc0Jsb2NrXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJOSUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIltcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkZBTFNFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwyXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIklOVEVHRVJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIsXCI/Wy4sP3RyaXBsZXNCbG9ja11cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFBhdGhcIixcIj9bLiw/dHJpcGxlc0Jsb2NrXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0UGF0aFwiLFwiP1suLD90cmlwbGVzQmxvY2tdXCJdfSwgXG5cdCAgXCJ0cmlwbGVzTm9kZVwiIDoge1xuXHQgICAgIFwiKFwiOiBbXCJjb2xsZWN0aW9uXCJdLCBcblx0ICAgICBcIltcIjogW1wiYmxhbmtOb2RlUHJvcGVydHlMaXN0XCJdfSwgXG5cdCAgXCJ0cmlwbGVzTm9kZVBhdGhcIiA6IHtcblx0ICAgICBcIihcIjogW1wiY29sbGVjdGlvblBhdGhcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJibGFua05vZGVQcm9wZXJ0eUxpc3RQYXRoXCJdfSwgXG5cdCAgXCJ0cmlwbGVzU2FtZVN1YmplY3RcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0Tm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3ROb3RFbXB0eVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNOb2RlXCIsXCJwcm9wZXJ0eUxpc3RcIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzTm9kZVwiLFwicHJvcGVydHlMaXN0XCJdfSwgXG5cdCAgXCJ0cmlwbGVzU2FtZVN1YmplY3RQYXRoXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJCTEFOS19OT0RFX0xBQkVMXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkFOT05cIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1widmFyT3JUZXJtXCIsXCJwcm9wZXJ0eUxpc3RQYXRoTm90RW1wdHlcIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInZhck9yVGVybVwiLFwicHJvcGVydHlMaXN0UGF0aE5vdEVtcHR5XCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJ2YXJPclRlcm1cIixcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiXSwgXG5cdCAgICAgXCIoXCI6IFtcInRyaXBsZXNOb2RlUGF0aFwiLFwicHJvcGVydHlMaXN0UGF0aFwiXSwgXG5cdCAgICAgXCJbXCI6IFtcInRyaXBsZXNOb2RlUGF0aFwiLFwicHJvcGVydHlMaXN0UGF0aFwiXX0sIFxuXHQgIFwidHJpcGxlc1RlbXBsYXRlXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiTklMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIihcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiW1wiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiQkxBTktfTk9ERV9MQUJFTFwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJBTk9OXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInRyaXBsZXNTYW1lU3ViamVjdFwiLFwiP1suLD90cmlwbGVzVGVtcGxhdGVdXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJ0cmlwbGVzU2FtZVN1YmplY3RcIixcIj9bLiw/dHJpcGxlc1RlbXBsYXRlXVwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1widHJpcGxlc1NhbWVTdWJqZWN0XCIsXCI/Wy4sP3RyaXBsZXNUZW1wbGF0ZV1cIl19LCBcblx0ICBcInVuYXJ5RXhwcmVzc2lvblwiIDoge1xuXHQgICAgIFwiIVwiOiBbXCIhXCIsXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCIrXCI6IFtcIitcIixcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIi1cIjogW1wiLVwiLFwicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVkFSMVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIihcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkxBTkdcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR01BVENIRVNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFUQVRZUEVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQk9VTkRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVJJXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlVSSVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCTk9ERVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSQU5EXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkFCU1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDRUlMXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkZMT09SXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJPVU5EXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPTkNBVFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJMRU5cIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVUNBU0VcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTENBU0VcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRU5DT0RFX0ZPUl9VUklcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OVEFJTlNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSU1RBUlRTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkVORFNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQkVGT1JFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkFGVEVSXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIllFQVJcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTU9OVEhcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREFZXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkhPVVJTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlVURVNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0VDT05EU1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUSU1FWk9ORVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJUWlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJOT1dcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVVJRFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJVVUlEXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1ENVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEExXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTI1NlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEEzODRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBNTEyXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNPQUxFU0NFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklGXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxBTkdcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRFRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNRVRFUk1cIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNJUklcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNVUklcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNCTEFOS1wiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0xJVEVSQUxcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSVNOVU1FUklDXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRSVUVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09VTlRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VNXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1JTlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNQVhcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQVZHXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNBTVBMRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJHUk9VUF9DT05DQVRcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1VCU1RSXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJFUExBQ0VcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVHRVhcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRVhJU1RTXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PVFwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzFcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUxfTE9ORzJcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfUE9TSVRJVkVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFX1BPU0lUSVZFXCI6IFtcInByaW1hcnlFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9ORUdBVElWRVwiOiBbXCJwcmltYXJ5RXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfTkVHQVRJVkVcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wicHJpbWFyeUV4cHJlc3Npb25cIl19LCBcblx0ICBcInVwZGF0ZVwiIDoge1xuXHQgICAgIFwiSU5TRVJUXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkRFTEVURVwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkNMRUFSXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkRST1BcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIk1PVkVcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ09QWVwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiV0lUSFwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJQUkVGSVhcIjogW1wicHJvbG9ndWVcIixcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQkFTRVwiOiBbXCJwcm9sb2d1ZVwiLFwiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCIkXCI6IFtcInByb2xvZ3VlXCIsXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdfSwgXG5cdCAgXCJ1cGRhdGUxXCIgOiB7XG5cdCAgICAgXCJMT0FEXCI6IFtcImxvYWRcIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1wiY2xlYXJcIl0sIFxuXHQgICAgIFwiRFJPUFwiOiBbXCJkcm9wXCJdLCBcblx0ICAgICBcIkFERFwiOiBbXCJhZGRcIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCJtb3ZlXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1wiY29weVwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wiY3JlYXRlXCJdLCBcblx0ICAgICBcIklOU0VSVFwiOiBbXCJJTlNFUlRcIixcImluc2VydDFcIl0sIFxuXHQgICAgIFwiREVMRVRFXCI6IFtcIkRFTEVURVwiLFwiZGVsZXRlMVwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcIm1vZGlmeVwiXX0sIFxuXHQgIFwidXBkYXRlQWxsXCIgOiB7XG5cdCAgICAgXCJJTlNFUlRcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJERUxFVEVcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJMT0FEXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQ0xFQVJcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJEUk9QXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiQUREXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiTU9WRVwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdLCBcblx0ICAgICBcIkNPUFlcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJDUkVBVEVcIjogW1wiP1t1cGRhdGUxLD9bOyx1cGRhdGVdXVwiXSwgXG5cdCAgICAgXCJXSVRIXCI6IFtcIj9bdXBkYXRlMSw/WzssdXBkYXRlXV1cIl0sIFxuXHQgICAgIFwiJFwiOiBbXCI/W3VwZGF0ZTEsP1s7LHVwZGF0ZV1dXCJdfSwgXG5cdCAgXCJ1c2luZ0NsYXVzZVwiIDoge1xuXHQgICAgIFwiVVNJTkdcIjogW1wiVVNJTkdcIixcIm9yKFtpcmlSZWYsW05BTUVELGlyaVJlZl1dKVwiXX0sIFxuXHQgIFwidmFsdWVMb2dpY2FsXCIgOiB7XG5cdCAgICAgXCIhXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIitcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiLVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJWQVIxXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiKFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTEFOR1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQU5HTUFUQ0hFU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVRBVFlQRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJCT1VORFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJUklcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVVJJXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkJOT0RFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlJBTkRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQUJTXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkNFSUxcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRkxPT1JcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUk9VTkRcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09OQ0FUXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUkxFTlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVQ0FTRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJMQ0FTRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFTkNPREVfRk9SX1VSSVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT05UQUlOU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJTVEFSVFNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSRU5EU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJCRUZPUkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSQUZURVJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiWUVBUlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJNT05USFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJEQVlcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSE9VUlNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOVVRFU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTRUNPTkRTXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRJTUVaT05FXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlRaXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk5PV1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJVVUlEXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUlVVSURcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUQ1XCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTFcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0hBMjU2XCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNIQTM4NFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTSEE1MTJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiQ09BTEVTQ0VcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSUZcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSTEFOR1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJEVFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTQU1FVEVSTVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0lSSVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU1VSSVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU0JMQU5LXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklTTElURVJBTFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJU05VTUVSSUNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJGQUxTRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJDT1VOVFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVU1cIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTUlOXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIk1BWFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJBVkdcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU0FNUExFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkdST1VQX0NPTkNBVFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVUJTVFJcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiUkVQTEFDRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJSRUdFWFwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJFWElTVFNcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiTk9UXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklSSV9SRUZcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMMlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJJTlRFR0VSXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIklOVEVHRVJfUE9TSVRJVkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiREVDSU1BTF9QT1NJVElWRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wicmVsYXRpb25hbEV4cHJlc3Npb25cIl0sIFxuXHQgICAgIFwiSU5URUdFUl9ORUdBVElWRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJERUNJTUFMX05FR0FUSVZFXCI6IFtcInJlbGF0aW9uYWxFeHByZXNzaW9uXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJyZWxhdGlvbmFsRXhwcmVzc2lvblwiXX0sIFxuXHQgIFwidmFsdWVzQ2xhdXNlXCIgOiB7XG5cdCAgICAgXCJWQUxVRVNcIjogW1wiVkFMVUVTXCIsXCJkYXRhQmxvY2tcIl0sIFxuXHQgICAgIFwiJFwiOiBbXSwgXG5cdCAgICAgXCJ9XCI6IFtdfSwgXG5cdCAgXCJ2YXJcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wiVkFSMVwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcIlZBUjJcIl19LCBcblx0ICBcInZhck9ySVJJcmVmXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcImlyaVJlZlwiXSwgXG5cdCAgICAgXCJQTkFNRV9MTlwiOiBbXCJpcmlSZWZcIl0sIFxuXHQgICAgIFwiUE5BTUVfTlNcIjogW1wiaXJpUmVmXCJdfSwgXG5cdCAgXCJ2YXJPclRlcm1cIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1widmFyXCJdLCBcblx0ICAgICBcIlZBUjJcIjogW1widmFyXCJdLCBcblx0ICAgICBcIk5JTFwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiSVJJX1JFRlwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiVFJVRVwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiRkFMU0VcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkJMQU5LX05PREVfTEFCRUxcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkFOT05cIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiU1RSSU5HX0xJVEVSQUwxXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTDJcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIlNUUklOR19MSVRFUkFMX0xPTkcxXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJTVFJJTkdfTElURVJBTF9MT05HMlwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiSU5URUdFUlwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiREVDSU1BTFwiOiBbXCJncmFwaFRlcm1cIl0sIFxuXHQgICAgIFwiRE9VQkxFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJJTlRFR0VSX1BPU0lUSVZFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJERUNJTUFMX1BPU0lUSVZFXCI6IFtcImdyYXBoVGVybVwiXSwgXG5cdCAgICAgXCJET1VCTEVfUE9TSVRJVkVcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIklOVEVHRVJfTkVHQVRJVkVcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkRFQ0lNQUxfTkVHQVRJVkVcIjogW1wiZ3JhcGhUZXJtXCJdLCBcblx0ICAgICBcIkRPVUJMRV9ORUdBVElWRVwiOiBbXCJncmFwaFRlcm1cIl19LCBcblx0ICBcInZlcmJcIiA6IHtcblx0ICAgICBcIlZBUjFcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwidmFyT3JJUklyZWZcIl0sIFxuXHQgICAgIFwiVkFSMlwiOiBbXCJzdG9yZVByb3BlcnR5XCIsXCJ2YXJPcklSSXJlZlwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInN0b3JlUHJvcGVydHlcIixcInZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX0xOXCI6IFtcInN0b3JlUHJvcGVydHlcIixcInZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcIlBOQU1FX05TXCI6IFtcInN0b3JlUHJvcGVydHlcIixcInZhck9ySVJJcmVmXCJdLCBcblx0ICAgICBcImFcIjogW1wic3RvcmVQcm9wZXJ0eVwiLFwiYVwiXX0sIFxuXHQgIFwidmVyYlBhdGhcIiA6IHtcblx0ICAgICBcIl5cIjogW1wicGF0aFwiXSwgXG5cdCAgICAgXCJhXCI6IFtcInBhdGhcIl0sIFxuXHQgICAgIFwiIVwiOiBbXCJwYXRoXCJdLCBcblx0ICAgICBcIihcIjogW1wicGF0aFwiXSwgXG5cdCAgICAgXCJJUklfUkVGXCI6IFtcInBhdGhcIl0sIFxuXHQgICAgIFwiUE5BTUVfTE5cIjogW1wicGF0aFwiXSwgXG5cdCAgICAgXCJQTkFNRV9OU1wiOiBbXCJwYXRoXCJdfSwgXG5cdCAgXCJ2ZXJiU2ltcGxlXCIgOiB7XG5cdCAgICAgXCJWQVIxXCI6IFtcInZhclwiXSwgXG5cdCAgICAgXCJWQVIyXCI6IFtcInZhclwiXX0sIFxuXHQgIFwid2hlcmVDbGF1c2VcIiA6IHtcblx0ICAgICBcIntcIjogW1wiP1dIRVJFXCIsXCJncm91cEdyYXBoUGF0dGVyblwiXSwgXG5cdCAgICAgXCJXSEVSRVwiOiBbXCI/V0hFUkVcIixcImdyb3VwR3JhcGhQYXR0ZXJuXCJdfVxuXHR9O1xuXHRcblx0dmFyIGtleXdvcmRzPS9eKEdST1VQX0NPTkNBVHxEQVRBVFlQRXxCQVNFfFBSRUZJWHxTRUxFQ1R8Q09OU1RSVUNUfERFU0NSSUJFfEFTS3xGUk9NfE5BTUVEfE9SREVSfEJZfExJTUlUfEFTQ3xERVNDfE9GRlNFVHxESVNUSU5DVHxSRURVQ0VEfFdIRVJFfEdSQVBIfE9QVElPTkFMfFVOSU9OfEZJTFRFUnxHUk9VUHxIQVZJTkd8QVN8VkFMVUVTfExPQUR8Q0xFQVJ8RFJPUHxDUkVBVEV8TU9WRXxDT1BZfFNJTEVOVHxJTlNFUlR8REVMRVRFfERBVEF8V0lUSHxUT3xVU0lOR3xOQU1FRHxNSU5VU3xCSU5EfExBTkdNQVRDSEVTfExBTkd8Qk9VTkR8U0FNRVRFUk18SVNJUkl8SVNVUkl8SVNCTEFOS3xJU0xJVEVSQUx8UkVHRVh8VFJVRXxGQUxTRXxVTkRFRnxBRER8REVGQVVMVHxBTEx8U0VSVklDRXxJTlRPfElOfE5PVHxJUkl8VVJJfEJOT0RFfFJBTkR8QUJTfENFSUx8RkxPT1J8Uk9VTkR8Q09OQ0FUfFNUUkxFTnxVQ0FTRXxMQ0FTRXxFTkNPREVfRk9SX1VSSXxDT05UQUlOU3xTVFJTVEFSVFN8U1RSRU5EU3xTVFJCRUZPUkV8U1RSQUZURVJ8WUVBUnxNT05USHxEQVl8SE9VUlN8TUlOVVRFU3xTRUNPTkRTfFRJTUVaT05FfFRafE5PV3xVVUlEfFNUUlVVSUR8TUQ1fFNIQTF8U0hBMjU2fFNIQTM4NHxTSEE1MTJ8Q09BTEVTQ0V8SUZ8U1RSTEFOR3xTVFJEVHxJU05VTUVSSUN8U1VCU1RSfFJFUExBQ0V8RVhJU1RTfENPVU5UfFNVTXxNSU58TUFYfEFWR3xTQU1QTEV8U0VQQVJBVE9SfFNUUikvaSA7XG5cdFxuXHR2YXIgcHVuY3Q9L14oXFwqfGF8XFwufFxce3xcXH18LHxcXCh8XFwpfDt8XFxbfFxcXXxcXHxcXHx8JiZ8PXwhPXwhfDw9fD49fDx8PnxcXCt8LXxcXC98XFxeXFxefFxcP3xcXHx8XFxeKS8gO1xuXHRcblx0dmFyIGRlZmF1bHRRdWVyeVR5cGU9bnVsbDtcblx0dmFyIGxleFZlcnNpb249XCJzcGFycWwxMVwiO1xuXHR2YXIgc3RhcnRTeW1ib2w9XCJzcGFycWwxMVwiO1xuXHR2YXIgYWNjZXB0RW1wdHk9dHJ1ZTtcblx0XG5cdFx0ZnVuY3Rpb24gZ2V0VGVybWluYWxzKClcblx0XHR7XG5cdFx0XHR2YXIgSVJJX1JFRiA9ICc8W148PlxcXCJcXCdcXHxcXHtcXH1cXF5cXFxcXFx4MDAtXFx4MjBdKj4nO1xuXHRcdFx0Lypcblx0XHRcdCAqIFBOX0NIQVJTX0JBU0UgPVxuXHRcdFx0ICogJ1tBLVpdfFthLXpdfFtcXFxcdTAwQzAtXFxcXHUwMEQ2XXxbXFxcXHUwMEQ4LVxcXFx1MDBGNl18W1xcXFx1MDBGOC1cXFxcdTAyRkZdfFtcXFxcdTAzNzAtXFxcXHUwMzdEXXxbXFxcXHUwMzdGLVxcXFx1MUZGRl18W1xcXFx1MjAwQy1cXFxcdTIwMERdfFtcXFxcdTIwNzAtXFxcXHUyMThGXXxbXFxcXHUyQzAwLVxcXFx1MkZFRl18W1xcXFx1MzAwMS1cXFxcdUQ3RkZdfFtcXFxcdUY5MDAtXFxcXHVGRENGXXxbXFxcXHVGREYwLVxcXFx1RkZGRF18W1xcXFx1MTAwMDAtXFxcXHVFRkZGRl0nO1xuXHRcdFx0ICovXG5cdFxuXHRcdFx0dmFyIFBOX0NIQVJTX0JBU0UgPVxuXHRcdFx0XHQnW0EtWmEtelxcXFx1MDBDMC1cXFxcdTAwRDZcXFxcdTAwRDgtXFxcXHUwMEY2XFxcXHUwMEY4LVxcXFx1MDJGRlxcXFx1MDM3MC1cXFxcdTAzN0RcXFxcdTAzN0YtXFxcXHUxRkZGXFxcXHUyMDBDLVxcXFx1MjAwRFxcXFx1MjA3MC1cXFxcdTIxOEZcXFxcdTJDMDAtXFxcXHUyRkVGXFxcXHUzMDAxLVxcXFx1RDdGRlxcXFx1RjkwMC1cXFxcdUZEQ0ZcXFxcdUZERjAtXFxcXHVGRkZEXSc7XG5cdFx0XHR2YXIgUE5fQ0hBUlNfVSA9IFBOX0NIQVJTX0JBU0UrJ3xfJztcblx0XG5cdFx0XHR2YXIgUE5fQ0hBUlM9ICcoJytQTl9DSEFSU19VKyd8LXxbMC05XFxcXHUwMEI3XFxcXHUwMzAwLVxcXFx1MDM2RlxcXFx1MjAzRi1cXFxcdTIwNDBdKSc7XG5cdFx0XHR2YXIgVkFSTkFNRSA9ICcoJytQTl9DSEFSU19VKyd8WzAtOV0pJytcblx0XHRcdFx0JygnK1BOX0NIQVJTX1UrJ3xbMC05XFxcXHUwMEI3XFxcXHUwMzAwLVxcXFx1MDM2RlxcXFx1MjAzRi1cXFxcdTIwNDBdKSonO1xuXHRcdFx0dmFyIFZBUjEgPSAnXFxcXD8nK1ZBUk5BTUU7XG5cdFx0XHR2YXIgVkFSMiA9ICdcXFxcJCcrVkFSTkFNRTtcblx0XG5cdFx0XHR2YXIgUE5fUFJFRklYPSAnKCcrUE5fQ0hBUlNfQkFTRSsnKSgoKCcrUE5fQ0hBUlMrJyl8XFxcXC4pKignK1BOX0NIQVJTKycpKT8nO1xuXHRcblx0XHRcdHZhciBIRVg9ICdbMC05QS1GYS1mXSc7XG5cdFx0XHR2YXIgUEVSQ0VOVD0nKCUnK0hFWCtIRVgrJyknO1xuXHRcdFx0dmFyIFBOX0xPQ0FMX0VTQz0nKFxcXFxcXFxcW19+XFxcXC5cXFxcLSFcXFxcJCZcXCdcXFxcKFxcXFwpXFxcXCpcXFxcKyw7PS9cXFxcPyNAJV0pJztcblx0XHRcdHZhciBQTFg9ICcoJytQRVJDRU5UKyd8JytQTl9MT0NBTF9FU0MrJyknO1xuXHRcdFx0dmFyIFBOX0xPQ0FMO1xuXHRcdFx0dmFyIEJMQU5LX05PREVfTEFCRUw7XG5cdFx0XHRpZiAobGV4VmVyc2lvbj09XCJzcGFycWwxMVwiKSB7XG5cdFx0XHRcdFBOX0xPQ0FMPSAnKCcrUE5fQ0hBUlNfVSsnfDp8WzAtOV18JytQTFgrJykoKCcrUE5fQ0hBUlMrJ3xcXFxcLnw6fCcrUExYKycpKignK1BOX0NIQVJTKyd8OnwnK1BMWCsnKSk/Jztcblx0XHRcdFx0QkxBTktfTk9ERV9MQUJFTCA9ICdfOignK1BOX0NIQVJTX1UrJ3xbMC05XSkoKCcrUE5fQ0hBUlMrJ3xcXFxcLikqJytQTl9DSEFSUysnKT8nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0UE5fTE9DQUw9ICcoJytQTl9DSEFSU19VKyd8WzAtOV0pKCgoJytQTl9DSEFSUysnKXxcXFxcLikqKCcrUE5fQ0hBUlMrJykpPyc7XG5cdFx0XHRcdEJMQU5LX05PREVfTEFCRUwgPSAnXzonK1BOX0xPQ0FMO1xuXHRcdFx0fVxuXHRcdFx0dmFyIFBOQU1FX05TID0gJygnK1BOX1BSRUZJWCsnKT86Jztcblx0XHRcdHZhciBQTkFNRV9MTiA9IFBOQU1FX05TK1BOX0xPQ0FMO1xuXHRcdFx0dmFyIExBTkdUQUcgPSAnQFthLXpBLVpdKygtW2EtekEtWjAtOV0rKSonO1xuXHRcblx0XHRcdHZhciBFWFBPTkVOVCA9ICdbZUVdW1xcXFwrLV0/WzAtOV0rJztcblx0XHRcdHZhciBJTlRFR0VSID0gJ1swLTldKyc7XG5cdFx0XHR2YXIgREVDSU1BTCA9ICcoKFswLTldK1xcXFwuWzAtOV0qKXwoXFxcXC5bMC05XSspKSc7XG5cdFx0XHR2YXIgRE9VQkxFID1cblx0XHRcdFx0JygoWzAtOV0rXFxcXC5bMC05XSonK0VYUE9ORU5UKycpfCcrXG5cdFx0XHRcdCcoXFxcXC5bMC05XSsnK0VYUE9ORU5UKycpfCcrXG5cdFx0XHRcdCcoWzAtOV0rJytFWFBPTkVOVCsnKSknO1xuXHRcblx0XHRcdHZhciBJTlRFR0VSX1BPU0lUSVZFID0gJ1xcXFwrJyArIElOVEVHRVI7XG5cdFx0XHR2YXIgREVDSU1BTF9QT1NJVElWRSA9ICdcXFxcKycgKyBERUNJTUFMO1xuXHRcdFx0dmFyIERPVUJMRV9QT1NJVElWRSAgPSAnXFxcXCsnICsgRE9VQkxFO1xuXHRcdFx0dmFyIElOVEVHRVJfTkVHQVRJVkUgPSAnLScgKyBJTlRFR0VSO1xuXHRcdFx0dmFyIERFQ0lNQUxfTkVHQVRJVkUgPSAnLScgKyBERUNJTUFMO1xuXHRcdFx0dmFyIERPVUJMRV9ORUdBVElWRSAgPSAnLScgKyBET1VCTEU7XG5cdFxuXHRcdFx0Ly8gdmFyIEVDSEFSID0gJ1xcXFxcXFxcW3RibnJmXFxcXFwiXFxcXFxcJ10nO1xuXHRcdFx0dmFyIEVDSEFSID0gJ1xcXFxcXFxcW3RibnJmXFxcXFxcXFxcIlxcJ10nO1xuXHRcblx0XHRcdHZhciBTVFJJTkdfTElURVJBTDEgPSBcIicoKFteXFxcXHgyN1xcXFx4NUNcXFxceDBBXFxcXHgwRF0pfFwiK0VDSEFSK1wiKSonXCI7XG5cdFx0XHR2YXIgU1RSSU5HX0xJVEVSQUwyID0gJ1wiKChbXlxcXFx4MjJcXFxceDVDXFxcXHgwQVxcXFx4MERdKXwnK0VDSEFSKycpKlwiJztcblx0XG5cdFx0XHR2YXIgU1RSSU5HX0xJVEVSQUxfTE9ORzEgPSBcIicnJygoJ3wnJyk/KFteJ1xcXFxcXFxcXXxcIitFQ0hBUitcIikpKicnJ1wiO1xuXHRcdFx0dmFyIFNUUklOR19MSVRFUkFMX0xPTkcyID0gJ1wiXCJcIigoXCJ8XCJcIik/KFteXCJcXFxcXFxcXF18JytFQ0hBUisnKSkqXCJcIlwiJztcblx0XG5cdFx0XHR2YXIgV1MgICAgPSAgICAgICAgJ1tcXFxceDIwXFxcXHgwOVxcXFx4MERcXFxceDBBXSc7XG5cdFx0XHQvLyBDYXJlZnVsISBDb2RlIG1pcnJvciBmZWVkcyBvbmUgbGluZSBhdCBhIHRpbWUgd2l0aCBubyBcXG5cblx0XHRcdC8vIC4uLiBidXQgb3RoZXJ3aXNlIGNvbW1lbnQgaXMgdGVybWluYXRlZCBieSBcXG5cblx0XHRcdHZhciBDT01NRU5UID0gJyMoW15cXFxcblxcXFxyXSpbXFxcXG5cXFxccl18W15cXFxcblxcXFxyXSokKSc7XG5cdFx0XHR2YXIgV1NfT1JfQ09NTUVOVF9TVEFSID0gJygnK1dTKyd8KCcrQ09NTUVOVCsnKSkqJztcblx0XHRcdHZhciBOSUwgICA9ICdcXFxcKCcrV1NfT1JfQ09NTUVOVF9TVEFSKydcXFxcKSc7XG5cdFx0XHR2YXIgQU5PTiAgPSAnXFxcXFsnK1dTX09SX0NPTU1FTlRfU1RBUisnXFxcXF0nO1xuXHRcblx0XHRcdHZhciB0ZXJtaW5hbHM9XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0ZXJtaW5hbDogW1xuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJXU1wiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1dTK1wiK1wiKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJ3c1wiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkNPTU1FTlRcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitDT01NRU5UKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJjb21tZW50XCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiSVJJX1JFRlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0lSSV9SRUYpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInZhcmlhYmxlLTNcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJWQVIxXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrVkFSMSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwiYXRvbVwifSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiVkFSMlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1ZBUjIpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcImF0b21cIn0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkxBTkdUQUdcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitMQU5HVEFHKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJtZXRhXCJ9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJET1VCTEVcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitET1VCTEUpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkRFQ0lNQUxcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitERUNJTUFMKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJJTlRFR0VSXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrSU5URUdFUiksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiRE9VQkxFX1BPU0lUSVZFXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrRE9VQkxFX1BPU0lUSVZFKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJERUNJTUFMX1BPU0lUSVZFXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrREVDSU1BTF9QT1NJVElWRSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiSU5URUdFUl9QT1NJVElWRVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0lOVEVHRVJfUE9TSVRJVkUpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIkRPVUJMRV9ORUdBVElWRVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0RPVUJMRV9ORUdBVElWRSksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwibnVtYmVyXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiREVDSU1BTF9ORUdBVElWRVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK0RFQ0lNQUxfTkVHQVRJVkUpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcIm51bWJlclwiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIklOVEVHRVJfTkVHQVRJVkVcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitJTlRFR0VSX05FR0FUSVZFKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJudW1iZXJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJTVFJJTkdfTElURVJBTF9MT05HMVwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1NUUklOR19MSVRFUkFMX0xPTkcxKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJzdHJpbmdcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJTVFJJTkdfTElURVJBTF9MT05HMlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1NUUklOR19MSVRFUkFMX0xPTkcyKSxcblx0XHRcdFx0XHRcdFx0c3R5bGU6XCJzdHJpbmdcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJTVFJJTkdfTElURVJBTDFcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitTVFJJTkdfTElURVJBTDEpLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInN0cmluZ1wiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIlNUUklOR19MSVRFUkFMMlwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK1NUUklOR19MSVRFUkFMMiksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwic3RyaW5nXCIgfSxcblx0XG5cdFx0XHRcdFx0XHQvLyBFbmNsb3NlZCBjb21tZW50cyB3b24ndCBiZSBoaWdobGlnaHRlZFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIk5JTFwiLFxuXHRcdFx0XHRcdFx0XHRyZWdleDpuZXcgUmVnRXhwKFwiXlwiK05JTCksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwicHVuY1wiIH0sXG5cdFxuXHRcdFx0XHRcdFx0Ly8gRW5jbG9zZWQgY29tbWVudHMgd29uJ3QgYmUgaGlnaGxpZ2h0ZWRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJBTk9OXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrQU5PTiksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwicHVuY1wiIH0sXG5cdFxuXHRcdFx0XHRcdFx0eyBuYW1lOiBcIlBOQU1FX0xOXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrUE5BTUVfTE4pLFxuXHRcdFx0XHRcdFx0XHRzdHlsZTpcInN0cmluZy0yXCIgfSxcblx0XG5cdFx0XHRcdFx0XHR7IG5hbWU6IFwiUE5BTUVfTlNcIixcblx0XHRcdFx0XHRcdFx0cmVnZXg6bmV3IFJlZ0V4cChcIl5cIitQTkFNRV9OUyksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwic3RyaW5nLTJcIiB9LFxuXHRcblx0XHRcdFx0XHRcdHsgbmFtZTogXCJCTEFOS19OT0RFX0xBQkVMXCIsXG5cdFx0XHRcdFx0XHRcdHJlZ2V4Om5ldyBSZWdFeHAoXCJeXCIrQkxBTktfTk9ERV9MQUJFTCksXG5cdFx0XHRcdFx0XHRcdHN0eWxlOlwic3RyaW5nLTJcIiB9XG5cdFx0XHRcdFx0XSxcblx0XG5cdFx0XHRcdH07XG5cdFx0XHRyZXR1cm4gdGVybWluYWxzO1xuXHRcdH1cblx0XG5cdFx0ZnVuY3Rpb24gZ2V0UG9zc2libGVzKHN5bWJvbClcblx0XHR7XG5cdFx0XHR2YXIgcG9zc2libGVzPVtdLCBwb3NzaWJsZXNPYj1sbDFfdGFibGVbc3ltYm9sXTtcblx0XHRcdGlmIChwb3NzaWJsZXNPYiE9dW5kZWZpbmVkKVxuXHRcdFx0XHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBwb3NzaWJsZXNPYilcblx0XHRcdFx0XHRwb3NzaWJsZXMucHVzaChwcm9wZXJ0eS50b1N0cmluZygpKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0cG9zc2libGVzLnB1c2goc3ltYm9sKTtcblx0XHRcdHJldHVybiBwb3NzaWJsZXM7XG5cdFx0fVxuXHRcblx0XHR2YXIgdG1zPSBnZXRUZXJtaW5hbHMoKTtcblx0XHR2YXIgdGVybWluYWw9dG1zLnRlcm1pbmFsO1xuXHRcblx0XHRmdW5jdGlvbiB0b2tlbkJhc2Uoc3RyZWFtLCBzdGF0ZSkge1xuXHRcblx0XHRcdGZ1bmN0aW9uIG5leHRUb2tlbigpIHtcblx0XG5cdFx0XHRcdHZhciBjb25zdW1lZD1udWxsO1xuXHRcdFx0XHQvLyBUb2tlbnMgZGVmaW5lZCBieSBpbmRpdmlkdWFsIHJlZ3VsYXIgZXhwcmVzc2lvbnNcblx0XHRcdFx0Zm9yICh2YXIgaT0wOyBpPHRlcm1pbmFsLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdFx0Y29uc3VtZWQ9IHN0cmVhbS5tYXRjaCh0ZXJtaW5hbFtpXS5yZWdleCx0cnVlLGZhbHNlKTtcblx0XHRcdFx0XHRpZiAoY29uc3VtZWQpXG5cdFx0XHRcdFx0XHRyZXR1cm4geyBjYXQ6IHRlcm1pbmFsW2ldLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCBzdHlsZTogdGVybWluYWxbaV0uc3R5bGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCB0ZXh0OiBjb25zdW1lZFswXVxuXHRcdFx0XHRcdFx0XHRcdFx0IH07XG5cdFx0XHRcdH1cblx0XG5cdFx0XHRcdC8vIEtleXdvcmRzXG5cdFx0XHRcdGNvbnN1bWVkPSBzdHJlYW0ubWF0Y2goa2V5d29yZHMsdHJ1ZSxmYWxzZSk7XG5cdFx0XHRcdGlmIChjb25zdW1lZClcblx0XHRcdFx0XHRyZXR1cm4geyBjYXQ6IHN0cmVhbS5jdXJyZW50KCkudG9VcHBlckNhc2UoKSxcblx0XHRcdFx0XHRcdFx0XHRcdCBzdHlsZTogXCJrZXl3b3JkXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHQgdGV4dDogY29uc3VtZWRbMF1cblx0XHRcdFx0XHRcdFx0XHQgfTtcblx0XG5cdFx0XHRcdC8vIFB1bmN0dWF0aW9uXG5cdFx0XHRcdGNvbnN1bWVkPSBzdHJlYW0ubWF0Y2gocHVuY3QsdHJ1ZSxmYWxzZSk7XG5cdFx0XHRcdGlmIChjb25zdW1lZClcblx0XHRcdFx0XHRyZXR1cm4geyBjYXQ6IHN0cmVhbS5jdXJyZW50KCksXG5cdFx0XHRcdFx0XHRcdFx0XHQgc3R5bGU6IFwicHVuY1wiLFxuXHRcdFx0XHRcdFx0XHRcdFx0IHRleHQ6IGNvbnN1bWVkWzBdXG5cdFx0XHRcdFx0XHRcdFx0IH07XG5cdFxuXHRcdFx0XHQvLyBUb2tlbiBpcyBpbnZhbGlkXG5cdFx0XHRcdC8vIGJldHRlciBjb25zdW1lIHNvbWV0aGluZyBhbnl3YXksIG9yIGVsc2Ugd2UncmUgc3R1Y2tcblx0XHRcdFx0Y29uc3VtZWQ9IHN0cmVhbS5tYXRjaCgvXi5bQS1aYS16MC05XSovLHRydWUsZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geyBjYXQ6XCI8aW52YWxpZF90b2tlbj5cIixcblx0XHRcdFx0XHRcdFx0XHQgc3R5bGU6IFwiZXJyb3JcIixcblx0XHRcdFx0XHRcdFx0XHQgdGV4dDogY29uc3VtZWRbMF1cblx0XHRcdFx0XHRcdFx0IH07XG5cdFx0XHR9XG5cdFxuXHRcdFx0ZnVuY3Rpb24gcmVjb3JkRmFpbHVyZVBvcygpIHtcblx0XHRcdFx0Ly8gdG9rZW5PYi5zdHlsZT0gXCJzcC1pbnZhbGlkXCI7XG5cdFx0XHRcdHZhciBjb2w9IHN0cmVhbS5jb2x1bW4oKTtcblx0XHRcdFx0c3RhdGUuZXJyb3JTdGFydFBvcz0gY29sO1xuXHRcdFx0XHRzdGF0ZS5lcnJvckVuZFBvcz0gY29sK3Rva2VuT2IudGV4dC5sZW5ndGg7XG5cdFx0XHR9O1xuXHRcblx0XHRcdGZ1bmN0aW9uIHNldFF1ZXJ5VHlwZShzKSB7XG5cdFx0XHRcdGlmIChzdGF0ZS5xdWVyeVR5cGU9PW51bGwpIHtcblx0XHRcdFx0XHRpZiAocyA9PVwiU0VMRUNUXCIgfHwgcz09XCJDT05TVFJVQ1RcIiB8fCBzPT1cIkFTS1wiIHx8IHM9PVwiREVTQ1JJQkVcIiB8fCBzPT1cIklOU0VSVFwiIHx8IHM9PVwiREVMRVRFXCIgfHwgcz09XCJMT0FEXCIgfHwgcz09XCJDTEVBUlwiIHx8IHM9PVwiQ1JFQVRFXCIgfHwgcz09XCJEUk9QXCIgfHwgcz09XCJDT1BZXCIgfHwgcz09XCJNT1ZFXCIgfHwgcz09XCJBRERcIilcblx0XHRcdFx0XHRcdHN0YXRlLnF1ZXJ5VHlwZT1zO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly8gU29tZSBmYWtlIG5vbi10ZXJtaW5hbHMgYXJlIGp1c3QgdGhlcmUgdG8gaGF2ZSBzaWRlLWVmZmVjdCBvbiBzdGF0ZVxuXHRcdFx0Ly8gLSBpLmUuIGFsbG93IG9yIGRpc2FsbG93IHZhcmlhYmxlcyBhbmQgYm5vZGVzIGluIGNlcnRhaW4gbm9uLW5lc3Rpbmdcblx0XHRcdC8vIGNvbnRleHRzXG5cdFx0XHRmdW5jdGlvbiBzZXRTaWRlQ29uZGl0aW9ucyh0b3BTeW1ib2wpIHtcblx0XHRcdFx0aWYgKHRvcFN5bWJvbD09XCJkaXNhbGxvd1ZhcnNcIikgc3RhdGUuYWxsb3dWYXJzPWZhbHNlO1xuXHRcdFx0XHRlbHNlIGlmICh0b3BTeW1ib2w9PVwiYWxsb3dWYXJzXCIpIHN0YXRlLmFsbG93VmFycz10cnVlO1xuXHRcdFx0XHRlbHNlIGlmICh0b3BTeW1ib2w9PVwiZGlzYWxsb3dCbm9kZXNcIikgc3RhdGUuYWxsb3dCbm9kZXM9ZmFsc2U7XG5cdFx0XHRcdGVsc2UgaWYgKHRvcFN5bWJvbD09XCJhbGxvd0Jub2Rlc1wiKSBzdGF0ZS5hbGxvd0Jub2Rlcz10cnVlO1xuXHRcdFx0XHRlbHNlIGlmICh0b3BTeW1ib2w9PVwic3RvcmVQcm9wZXJ0eVwiKSBzdGF0ZS5zdG9yZVByb3BlcnR5PXRydWU7XG5cdFx0XHR9XG5cdFxuXHRcdFx0ZnVuY3Rpb24gY2hlY2tTaWRlQ29uZGl0aW9ucyh0b3BTeW1ib2wpIHtcblx0XHRcdFx0cmV0dXJuKFxuXHRcdFx0XHRcdChzdGF0ZS5hbGxvd1ZhcnMgfHwgdG9wU3ltYm9sIT1cInZhclwiKSAmJlxuXHRcdFx0XHRcdFx0KHN0YXRlLmFsbG93Qm5vZGVzIHx8XG5cdFx0XHRcdFx0XHQgKHRvcFN5bWJvbCE9XCJibGFua05vZGVcIiAmJlxuXHRcdFx0XHRcdFx0XHR0b3BTeW1ib2whPVwiYmxhbmtOb2RlUHJvcGVydHlMaXN0XCIgJiZcblx0XHRcdFx0XHRcdFx0dG9wU3ltYm9sIT1cImJsYW5rTm9kZVByb3BlcnR5TGlzdFBhdGhcIikpKTtcblx0XHRcdH1cblx0XG5cdFx0XHQvLyBDb2RlTWlycm9yIHdvcmtzIHdpdGggb25lIGxpbmUgYXQgYSB0aW1lLFxuXHRcdFx0Ly8gYnV0IG5ld2xpbmUgc2hvdWxkIGJlaGF2ZSBsaWtlIHdoaXRlc3BhY2Vcblx0XHRcdC8vIC0gaS5lLiBhIGRlZmluaXRlIGJyZWFrIGJldHdlZW4gdG9rZW5zIChmb3IgYXV0b2NvbXBsZXRlcilcblx0XHRcdGlmIChzdHJlYW0ucG9zPT0wKVxuXHRcdFx0XHRzdGF0ZS5wb3NzaWJsZUN1cnJlbnQ9IHN0YXRlLnBvc3NpYmxlTmV4dDtcblx0XG5cdFx0XHR2YXIgdG9rZW5PYj0gbmV4dFRva2VuKCk7XG5cdFxuXHRcblx0XHRcdGlmICh0b2tlbk9iLmNhdD09XCI8aW52YWxpZF90b2tlbj5cIikge1xuXHRcdFx0XHQvLyBzZXQgZXJyb3Igc3RhdGUsIGFuZFxuXHRcdFx0XHRpZiAoc3RhdGUuT0s9PXRydWUpIHtcblx0XHRcdFx0XHRzdGF0ZS5PSz1mYWxzZTtcblx0XHRcdFx0XHRyZWNvcmRGYWlsdXJlUG9zKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c3RhdGUuY29tcGxldGU9ZmFsc2U7XG5cdFx0XHRcdC8vIGFsZXJ0KFwiSW52YWxpZDpcIit0b2tlbk9iLnRleHQpO1xuXHRcdFx0XHRyZXR1cm4gdG9rZW5PYi5zdHlsZTtcblx0XHRcdH1cblx0XG5cdFx0XHRpZiAodG9rZW5PYi5jYXQgPT0gXCJXU1wiIHx8XG5cdFx0XHRcdFx0dG9rZW5PYi5jYXQgPT0gXCJDT01NRU5UXCIpIHtcblx0XHRcdFx0c3RhdGUucG9zc2libGVDdXJyZW50PSBzdGF0ZS5wb3NzaWJsZU5leHQ7XG5cdFx0XHRcdHJldHVybih0b2tlbk9iLnN0eWxlKTtcblx0XHRcdH1cblx0XHRcdC8vIE90aGVyd2lzZSwgcnVuIHRoZSBwYXJzZXIgdW50aWwgdGhlIHRva2VuIGlzIGRpZ2VzdGVkXG5cdFx0XHQvLyBvciBmYWlsdXJlXG5cdFx0XHR2YXIgZmluaXNoZWQ9IGZhbHNlO1xuXHRcdFx0dmFyIHRvcFN5bWJvbDtcblx0XHRcdHZhciB0b2tlbj0gdG9rZW5PYi5jYXQ7XG5cdFxuXHRcdFx0Ly8gSW5jcmVtZW50YWwgTEwxIHBhcnNlXG5cdFx0XHR3aGlsZShzdGF0ZS5zdGFjay5sZW5ndGg+MCAmJiB0b2tlbiAmJiBzdGF0ZS5PSyAmJiAhZmluaXNoZWQgKSB7XG5cdFx0XHRcdHRvcFN5bWJvbD0gc3RhdGUuc3RhY2sucG9wKCk7XG5cdFxuXHRcdFx0XHRpZiAoIWxsMV90YWJsZVt0b3BTeW1ib2xdKSB7XG5cdFx0XHRcdFx0Ly8gVG9wIHN5bWJvbCBpcyBhIHRlcm1pbmFsXG5cdFx0XHRcdFx0aWYgKHRvcFN5bWJvbD09dG9rZW4pIHtcblx0XHRcdFx0XHRcdC8vIE1hdGNoaW5nIHRlcm1pbmFsc1xuXHRcdFx0XHRcdFx0Ly8gLSBjb25zdW1lIHRva2VuIGZyb20gaW5wdXQgc3RyZWFtXG5cdFx0XHRcdFx0XHRmaW5pc2hlZD10cnVlO1xuXHRcdFx0XHRcdFx0c2V0UXVlcnlUeXBlKHRvcFN5bWJvbCk7XG5cdFx0XHRcdFx0XHQvLyBDaGVjayB3aGV0aGVyICQgKGVuZCBvZiBpbnB1dCB0b2tlbikgaXMgcG9zcyBuZXh0XG5cdFx0XHRcdFx0XHQvLyBmb3IgZXZlcnl0aGluZyBvbiBzdGFja1xuXHRcdFx0XHRcdFx0dmFyIGFsbE5pbGxhYmxlPXRydWU7XG5cdFx0XHRcdFx0XHRmb3IodmFyIHNwPXN0YXRlLnN0YWNrLmxlbmd0aDtzcD4wOy0tc3ApIHtcblx0XHRcdFx0XHRcdFx0dmFyIGl0ZW09bGwxX3RhYmxlW3N0YXRlLnN0YWNrW3NwLTFdXTtcblx0XHRcdFx0XHRcdFx0aWYgKCFpdGVtIHx8ICFpdGVtW1wiJFwiXSlcblx0XHRcdFx0XHRcdFx0XHRhbGxOaWxsYWJsZT1mYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHN0YXRlLmNvbXBsZXRlPSBhbGxOaWxsYWJsZTtcblx0XHRcdFx0XHRcdGlmIChzdGF0ZS5zdG9yZVByb3BlcnR5ICYmIHRva2VuLmNhdCE9XCJwdW5jXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRzdGF0ZS5sYXN0UHJvcGVydHk9IHRva2VuT2IudGV4dDtcblx0XHRcdFx0XHRcdFx0XHRzdGF0ZS5zdG9yZVByb3BlcnR5PSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzdGF0ZS5PSz1mYWxzZTtcblx0XHRcdFx0XHRcdHN0YXRlLmNvbXBsZXRlPWZhbHNlO1xuXHRcdFx0XHRcdFx0cmVjb3JkRmFpbHVyZVBvcygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB0b3BTeW1ib2wgaXMgbm9udGVybWluYWxcblx0XHRcdFx0XHQvLyAtIHNlZSBpZiB0aGVyZSBpcyBhbiBlbnRyeSBmb3IgdG9wU3ltYm9sXG5cdFx0XHRcdFx0Ly8gYW5kIG5leHRUb2tlbiBpbiB0YWJsZVxuXHRcdFx0XHRcdHZhciBuZXh0U3ltYm9scz0gbGwxX3RhYmxlW3RvcFN5bWJvbF1bdG9rZW5dO1xuXHRcdFx0XHRcdGlmIChuZXh0U3ltYm9scyE9dW5kZWZpbmVkXG5cdFx0XHRcdFx0XHRcdCYmIGNoZWNrU2lkZUNvbmRpdGlvbnModG9wU3ltYm9sKVxuXHRcdFx0XHRcdFx0IClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBNYXRjaCAtIGNvcHkgUkhTIG9mIHJ1bGUgdG8gc3RhY2tcblx0XHRcdFx0XHRcdGZvciAodmFyIGk9bmV4dFN5bWJvbHMubGVuZ3RoLTE7IGk+PTA7IC0taSlcblx0XHRcdFx0XHRcdFx0c3RhdGUuc3RhY2sucHVzaChuZXh0U3ltYm9sc1tpXSk7XG5cdFx0XHRcdFx0XHQvLyBQZWZvcm0gYW55IG5vbi1ncmFtbWF0aWNhbCBzaWRlLWVmZmVjdHNcblx0XHRcdFx0XHRcdHNldFNpZGVDb25kaXRpb25zKHRvcFN5bWJvbCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIE5vIG1hdGNoIGluIHRhYmxlIC0gZmFpbFxuXHRcdFx0XHRcdFx0c3RhdGUuT0s9ZmFsc2U7XG5cdFx0XHRcdFx0XHRzdGF0ZS5jb21wbGV0ZT1mYWxzZTtcblx0XHRcdFx0XHRcdHJlY29yZEZhaWx1cmVQb3MoKTtcblx0XHRcdFx0XHRcdHN0YXRlLnN0YWNrLnB1c2godG9wU3ltYm9sKTsgIC8vIFNob3ZlIHRvcFN5bWJvbCBiYWNrIG9uIHN0YWNrXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWZpbmlzaGVkICYmIHN0YXRlLk9LKSB7IFxuXHRcdFx0XHRzdGF0ZS5PSz1mYWxzZTsgc3RhdGUuY29tcGxldGU9ZmFsc2U7IHJlY29yZEZhaWx1cmVQb3MoKTsgXG5cdCAgICB9XG5cdFxuXHRcdFx0c3RhdGUucG9zc2libGVDdXJyZW50PSBzdGF0ZS5wb3NzaWJsZU5leHQ7XG5cdFx0XHRzdGF0ZS5wb3NzaWJsZU5leHQ9IGdldFBvc3NpYmxlcyhzdGF0ZS5zdGFja1tzdGF0ZS5zdGFjay5sZW5ndGgtMV0pO1xuXHRcblx0XHRcdC8vIGFsZXJ0KHRva2VuK1wiPVwiK3Rva2VuT2Iuc3R5bGUrJ1xcbicrc3RhdGUuc3RhY2spO1xuXHRcdFx0cmV0dXJuIHRva2VuT2Iuc3R5bGU7XG5cdFx0fVxuXHRcblx0XHR2YXIgaW5kZW50VG9wPXtcblx0XHRcdFwiKlssLCBvYmplY3RdXCI6IDMsXG5cdFx0XHRcIipbKCwpLG9iamVjdF1cIjogMyxcblx0XHRcdFwiKlsoLCksb2JqZWN0UGF0aF1cIjogMyxcblx0XHRcdFwiKlsvLHBhdGhFbHRPckludmVyc2VdXCI6IDIsXG5cdFx0XHRcIm9iamVjdFwiOiAyLFxuXHRcdFx0XCJvYmplY3RQYXRoXCI6IDIsXG5cdFx0XHRcIm9iamVjdExpc3RcIjogMixcblx0XHRcdFwib2JqZWN0TGlzdFBhdGhcIjogMixcblx0XHRcdFwic3RvcmVQcm9wZXJ0eVwiOiAyLFxuXHRcdFx0XCJwYXRoTW9kXCI6IDIsXG5cdFx0XHRcIj9wYXRoTW9kXCI6IDIsXG5cdFx0XHRcInByb3BlcnR5TGlzdE5vdEVtcHR5XCI6IDEsXG5cdFx0XHRcInByb3BlcnR5TGlzdFwiOiAxLFxuXHRcdFx0XCJwcm9wZXJ0eUxpc3RQYXRoXCI6IDEsXG5cdFx0XHRcInByb3BlcnR5TGlzdFBhdGhOb3RFbXB0eVwiOiAxLFxuXHRcdFx0XCI/W3ZlcmIsb2JqZWN0TGlzdF1cIjogMSxcblx0XHRcdFwiP1tvcihbdmVyYlBhdGgsIHZlcmJTaW1wbGVdKSxvYmplY3RMaXN0XVwiOiAxLFxuXHRcdH07XG5cdFxuXHRcdHZhciBpbmRlbnRUYWJsZT17XG5cdFx0XHRcIn1cIjoxLFxuXHRcdFx0XCJdXCI6MCxcblx0XHRcdFwiKVwiOjEsXG5cdFx0XHRcIntcIjotMSxcblx0XHRcdFwiKFwiOi0xLFxuXHRcdFx0XCIqWzssP1tvcihbdmVyYlBhdGgsdmVyYlNpbXBsZV0pLG9iamVjdExpc3RdXVwiOiAxLFxuXHRcdH07XG5cdFx0XG5cdFxuXHRcdGZ1bmN0aW9uIGluZGVudChzdGF0ZSwgdGV4dEFmdGVyKSB7XG5cdFx0XHR2YXIgbiA9IDA7IC8vIGluZGVudCBsZXZlbFxuXHRcdFx0dmFyIGk9c3RhdGUuc3RhY2subGVuZ3RoLTE7XG5cdFxuXHRcdFx0aWYgKC9eW1xcfVxcXVxcKV0vLnRlc3QodGV4dEFmdGVyKSkge1xuXHRcdFx0XHQvLyBTa2lwIHN0YWNrIGl0ZW1zIHVudGlsIGFmdGVyIG1hdGNoaW5nIGJyYWNrZXRcblx0XHRcdFx0dmFyIGNsb3NlQnJhY2tldD10ZXh0QWZ0ZXIuc3Vic3RyKDAsMSk7XG5cdFx0XHRcdGZvciggO2k+PTA7LS1pKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHN0YXRlLnN0YWNrW2ldPT1jbG9zZUJyYWNrZXQpXG5cdFx0XHRcdFx0ey0taTsgYnJlYWs7fTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gQ29uc2lkZXIgbnVsbGFibGUgbm9uLXRlcm1pbmFscyBpZiBhdCB0b3Agb2Ygc3RhY2tcblx0XHRcdFx0dmFyIGRuPWluZGVudFRvcFtzdGF0ZS5zdGFja1tpXV07XG5cdFx0XHRcdGlmIChkbikgeyBcblx0XHRcdFx0XHRuKz1kbjsgLS1pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmb3IoIDtpPj0wOy0taSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIGRuPWluZGVudFRhYmxlW3N0YXRlLnN0YWNrW2ldXTtcblx0XHRcdFx0aWYgKGRuKSB7XG5cdFx0XHRcdFx0bis9ZG47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBuICogY29uZmlnLmluZGVudFVuaXQ7XG5cdFx0fTtcblx0XG5cdFx0cmV0dXJuIHtcblx0XHRcdHRva2VuOiB0b2tlbkJhc2UsXG5cdFx0XHRzdGFydFN0YXRlOiBmdW5jdGlvbihiYXNlKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0dG9rZW5pemU6IHRva2VuQmFzZSxcblx0XHRcdFx0XHRPSzogdHJ1ZSxcblx0XHRcdFx0XHRjb21wbGV0ZTogYWNjZXB0RW1wdHksXG5cdFx0XHRcdFx0ZXJyb3JTdGFydFBvczogbnVsbCxcblx0XHRcdFx0XHRlcnJvckVuZFBvczogbnVsbCxcblx0XHRcdFx0XHRxdWVyeVR5cGU6IGRlZmF1bHRRdWVyeVR5cGUsXG5cdFx0XHRcdFx0cG9zc2libGVDdXJyZW50OiBnZXRQb3NzaWJsZXMoc3RhcnRTeW1ib2wpLFxuXHRcdFx0XHRcdHBvc3NpYmxlTmV4dDogZ2V0UG9zc2libGVzKHN0YXJ0U3ltYm9sKSxcblx0XHRcdFx0XHRhbGxvd1ZhcnMgOiB0cnVlLFxuXHRcdFx0XHRcdGFsbG93Qm5vZGVzIDogdHJ1ZSxcblx0XHRcdFx0XHRzdG9yZVByb3BlcnR5IDogZmFsc2UsXG5cdFx0XHRcdFx0bGFzdFByb3BlcnR5IDogXCJcIixcblx0XHRcdFx0XHRzdGFjazogW3N0YXJ0U3ltYm9sXVxuXHRcdFx0XHR9OyBcblx0XHRcdH0sXG5cdFx0XHRpbmRlbnQ6IGluZGVudCxcblx0XHRcdGVsZWN0cmljQ2hhcnM6IFwifV0pXCJcblx0XHR9O1xuXHR9XG5cdCk7XG5cdENvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL3gtc3BhcnFsLXF1ZXJ5XCIsIFwic3BhcnFsMTFcIik7XG59KTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKlxuKiBUUklFIGltcGxlbWVudGF0aW9uIGluIEphdmFzY3JpcHRcbiogQ29weXJpZ2h0IChjKSAyMDEwIFNhdXJhYmggT2RoeWFuIHwgaHR0cDovL29kaHlhbi5jb21cbiogXG4qIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4qIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4qIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4qIFxuKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiogXG4qIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4qIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4qIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4qIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiogVEhFIFNPRlRXQVJFLlxuKlxuKiBEYXRlOiBOb3YgNywgMjAxMFxuKi9cblxuLypcbiogQSB0cmllLCBvciBwcmVmaXggdHJlZSwgaXMgYSBtdWx0aS13YXkgdHJlZSBzdHJ1Y3R1cmUgdXNlZnVsIGZvciBzdG9yaW5nIHN0cmluZ3Mgb3ZlciBhbiBhbHBoYWJldC4gXG4qIEl0IGhhcyBiZWVuIHVzZWQgdG8gc3RvcmUgbGFyZ2UgZGljdGlvbmFyaWVzIG9mIEVuZ2xpc2ggKHNheSkgd29yZHMgaW4gc3BlbGwtY2hlY2tpbmcgcHJvZ3JhbXMgXG4qIGFuZCBpbiBuYXR1cmFsLWxhbmd1YWdlIFwidW5kZXJzdGFuZGluZ1wiIHByb2dyYW1zLiAgICBcbiogQHNlZSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RyaWVcbiogQHNlZSBodHRwOi8vd3d3LmNzc2UubW9uYXNoLmVkdS5hdS9+bGxveWQvdGlsZGVBbGdEUy9UcmVlL1RyaWUvXG4vKlxuXG4qIEBjbGFzcyBUcmllXG4qIEBjb25zdHJ1Y3RvclxuKi8gIFxubW9kdWxlLmV4cG9ydHMgPSBUcmllID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy53b3JkcyA9IDA7XG4gICAgdGhpcy5wcmVmaXhlcyA9IDA7XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufTtcblxuVHJpZS5wcm90b3R5cGUgPSB7XG4gICAgXG4gICAgLypcbiAgICAqIEluc2VydCBhIHdvcmQgaW50byB0aGUgZGljdGlvbmFyeS4gXG4gICAgKiBSZWN1cnNpdmVseSB0cmF2ZXJzZSB0aHJvdWdoIHRoZSB0cmllIG5vZGVzLCBhbmQgY3JlYXRlIG5ldyBub2RlIGlmIGRvZXMgbm90IGFscmVhZHkgZXhpc3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBpbnNlcnRcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgV29yZCB0byBpbnNlcnQgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqIEBwYXJhbSB7SW50ZWdlcn0gcG9zIEN1cnJlbnQgaW5kZXggb2YgdGhlIHN0cmluZyB0byBiZSBpbnNlcnRlZFxuICAgICogQHJldHVybiB7Vm9pZH1cbiAgICAqL1xuICAgIGluc2VydDogZnVuY3Rpb24oc3RyLCBwb3MpIHtcbiAgICAgICAgaWYoc3RyLmxlbmd0aCA9PSAwKSB7IC8vYmxhbmsgc3RyaW5nIGNhbm5vdCBiZSBpbnNlcnRlZFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgVCA9IHRoaXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgY2hpbGQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYocG9zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYocG9zID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgICBULndvcmRzICsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFQucHJlZml4ZXMgKys7XG4gICAgICAgIGsgPSBzdHJbcG9zXTtcbiAgICAgICAgaWYoVC5jaGlsZHJlbltrXSA9PT0gdW5kZWZpbmVkKSB7IC8vaWYgbm9kZSBmb3IgdGhpcyBjaGFyIGRvZXNuJ3QgZXhpc3QsIGNyZWF0ZSBvbmVcbiAgICAgICAgICAgIFQuY2hpbGRyZW5ba10gPSBuZXcgVHJpZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkID0gVC5jaGlsZHJlbltrXTtcbiAgICAgICAgY2hpbGQuaW5zZXJ0KHN0ciwgcG9zICsgMSk7XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogUmVtb3ZlIGEgd29yZCBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVtb3ZlXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFdvcmQgdG8gYmUgcmVtb3ZlZFxuICAgICogQHBhcmFtIHtJbnRlZ2VyfSBwb3MgQ3VycmVudCBpbmRleCBvZiB0aGUgc3RyaW5nIHRvIGJlIHJlbW92ZWRcbiAgICAqIEByZXR1cm4ge1ZvaWR9XG4gICAgKi9cbiAgICByZW1vdmU6IGZ1bmN0aW9uKHN0ciwgcG9zKSB7XG4gICAgICAgIGlmKHN0ci5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgVCA9IHRoaXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgY2hpbGQ7XG4gICAgICAgIFxuICAgICAgICBpZihwb3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSAgIFxuICAgICAgICBpZihUID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZihwb3MgPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIFQud29yZHMgLS07XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgVC5wcmVmaXhlcyAtLTtcbiAgICAgICAgayA9IHN0cltwb3NdO1xuICAgICAgICBjaGlsZCA9IFQuY2hpbGRyZW5ba107XG4gICAgICAgIGNoaWxkLnJlbW92ZShzdHIsIHBvcyArIDEpO1xuICAgIH0sXG4gICAgXG4gICAgLypcbiAgICAqIFVwZGF0ZSBhbiBleGlzdGluZyB3b3JkIGluIHRoZSBkaWN0aW9uYXJ5LiBcbiAgICAqIFRoaXMgbWV0aG9kIHJlbW92ZXMgdGhlIG9sZCB3b3JkIGZyb20gdGhlIGRpY3Rpb25hcnkgYW5kIGluc2VydHMgdGhlIG5ldyB3b3JkLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyT2xkIFRoZSBvbGQgd29yZCB0byBiZSByZXBsYWNlZFxuICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ck5ldyBUaGUgbmV3IHdvcmQgdG8gYmUgaW5zZXJ0ZWRcbiAgICAqIEByZXR1cm4ge1ZvaWR9XG4gICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHN0ck9sZCwgc3RyTmV3KSB7XG4gICAgICAgIGlmKHN0ck9sZC5sZW5ndGggPT0gMCB8fCBzdHJOZXcubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZShzdHJPbGQpO1xuICAgICAgICB0aGlzLmluc2VydChzdHJOZXcpO1xuICAgIH0sXG4gICAgXG4gICAgLypcbiAgICAqIENvdW50IHRoZSBudW1iZXIgb2YgdGltZXMgYSBnaXZlbiB3b3JkIGhhcyBiZWVuIGluc2VydGVkIGludG8gdGhlIGRpY3Rpb25hcnlcbiAgICAqXG4gICAgKiBAbWV0aG9kIGNvdW50V29yZFxuICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBXb3JkIHRvIGdldCBjb3VudCBvZlxuICAgICogQHBhcmFtIHtJbnRlZ2VyfSBwb3MgQ3VycmVudCBpbmRleCBvZiB0aGUgZ2l2ZW4gd29yZFxuICAgICogQHJldHVybiB7SW50ZWdlcn0gVGhlIG51bWJlciBvZiB0aW1lcyBhIGdpdmVuIHdvcmQgZXhpc3RzIGluIHRoZSBkaWN0aW9uYXJ5XG4gICAgKi9cbiAgICBjb3VudFdvcmQ6IGZ1bmN0aW9uKHN0ciwgcG9zKSB7XG4gICAgICAgIGlmKHN0ci5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciBUID0gdGhpcyxcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICBjaGlsZCxcbiAgICAgICAgICAgIHJldCA9IDA7XG4gICAgICAgIFxuICAgICAgICBpZihwb3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfSAgIFxuICAgICAgICBpZihwb3MgPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBULndvcmRzO1xuICAgICAgICB9XG4gICAgICAgIGsgPSBzdHJbcG9zXTtcbiAgICAgICAgY2hpbGQgPSBULmNoaWxkcmVuW2tdO1xuICAgICAgICBpZihjaGlsZCAhPT0gdW5kZWZpbmVkKSB7IC8vbm9kZSBleGlzdHNcbiAgICAgICAgICAgIHJldCA9IGNoaWxkLmNvdW50V29yZChzdHIsIHBvcyArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICogQ291bnQgdGhlIG51bWJlciBvZiB0aW1lcyBhIGdpdmVuIHByZWZpeCBleGlzdHMgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqXG4gICAgKiBAbWV0aG9kIGNvdW50UHJlZml4XG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFByZWZpeCB0byBnZXQgY291bnQgb2ZcbiAgICAqIEBwYXJhbSB7SW50ZWdlcn0gcG9zIEN1cnJlbnQgaW5kZXggb2YgdGhlIGdpdmVuIHByZWZpeFxuICAgICogQHJldHVybiB7SW50ZWdlcn0gVGhlIG51bWJlciBvZiB0aW1lcyBhIGdpdmVuIHByZWZpeCBleGlzdHMgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqL1xuICAgIGNvdW50UHJlZml4OiBmdW5jdGlvbihzdHIsIHBvcykge1xuICAgICAgICBpZihzdHIubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgVCA9IHRoaXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgY2hpbGQsXG4gICAgICAgICAgICByZXQgPSAwO1xuXG4gICAgICAgIGlmKHBvcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmKHBvcyA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFQucHJlZml4ZXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGsgPSBzdHJbcG9zXTtcbiAgICAgICAgY2hpbGQgPSBULmNoaWxkcmVuW2tdO1xuICAgICAgICBpZihjaGlsZCAhPT0gdW5kZWZpbmVkKSB7IC8vbm9kZSBleGlzdHNcbiAgICAgICAgICAgIHJldCA9IGNoaWxkLmNvdW50UHJlZml4KHN0ciwgcG9zICsgMSk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7IFxuICAgIH0sXG4gICAgXG4gICAgLypcbiAgICAqIEZpbmQgYSB3b3JkIGluIHRoZSBkaWN0aW9uYXJ5XG4gICAgKlxuICAgICogQG1ldGhvZCBmaW5kXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSB3b3JkIHRvIGZpbmQgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgdGhlIHdvcmQgZXhpc3RzIGluIHRoZSBkaWN0aW9uYXJ5LCBlbHNlIGZhbHNlXG4gICAgKi9cbiAgICBmaW5kOiBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgaWYoc3RyLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmKHRoaXMuY291bnRXb3JkKHN0cikgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLypcbiAgICAqIEdldCBhbGwgd29yZHMgaW4gdGhlIGRpY3Rpb25hcnlcbiAgICAqXG4gICAgKiBAbWV0aG9kIGdldEFsbFdvcmRzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFByZWZpeCBvZiBjdXJyZW50IHdvcmRcbiAgICAqIEByZXR1cm4ge0FycmF5fSBBcnJheSBvZiB3b3JkcyBpbiB0aGUgZGljdGlvbmFyeVxuICAgICovXG4gICAgZ2V0QWxsV29yZHM6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICB2YXIgVCA9IHRoaXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgY2hpbGQsXG4gICAgICAgICAgICByZXQgPSBbXTtcbiAgICAgICAgaWYoc3RyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0ciA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYoVCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgaWYoVC53b3JkcyA+IDApIHtcbiAgICAgICAgICAgIHJldC5wdXNoKHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yKGsgaW4gVC5jaGlsZHJlbikge1xuICAgICAgICAgICAgY2hpbGQgPSBULmNoaWxkcmVuW2tdO1xuICAgICAgICAgICAgcmV0ID0gcmV0LmNvbmNhdChjaGlsZC5nZXRBbGxXb3JkcyhzdHIgKyBrKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIFxuICAgIC8qXG4gICAgKiBBdXRvY29tcGxldGUgYSBnaXZlbiBwcmVmaXhcbiAgICAqXG4gICAgKiBAbWV0aG9kIGF1dG9Db21wbGV0ZVxuICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBQcmVmaXggdG8gYmUgY29tcGxldGVkIGJhc2VkIG9uIGRpY3Rpb25hcnkgZW50cmllc1xuICAgICogQHBhcmFtIHtJbnRlZ2VyfSBwb3MgQ3VycmVudCBpbmRleCBvZiB0aGUgcHJlZml4XG4gICAgKiBAcmV0dXJuIHtBcnJheX0gQXJyYXkgb2YgcG9zc2libGUgc3VnZ2VzdGlvbnNcbiAgICAqL1xuICAgIGF1dG9Db21wbGV0ZTogZnVuY3Rpb24oc3RyLCBwb3MpIHtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB2YXIgVCA9IHRoaXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgY2hpbGQ7XG4gICAgICAgIGlmKHN0ci5sZW5ndGggPT0gMCkge1xuXHRcdFx0aWYgKHBvcyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJldHVybiBULmdldEFsbFdvcmRzKHN0cik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHR9XG4gICAgICAgIH1cbiAgICAgICAgaWYocG9zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH0gICBcbiAgICAgICAgayA9IHN0cltwb3NdO1xuICAgICAgICBjaGlsZCA9IFQuY2hpbGRyZW5ba107XG4gICAgICAgIGlmKGNoaWxkID09PSB1bmRlZmluZWQpIHsgLy9ub2RlIGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZihwb3MgPT09IHN0ci5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGQuZ2V0QWxsV29yZHMoc3RyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hpbGQuYXV0b0NvbXBsZXRlKHN0ciwgcG9zICsgMSk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJuYW1lXCI6IFwieWFzZ3VpLXV0aWxzXCIsXG4gIFwidmVyc2lvblwiOiBcIjEuMi4wXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJVdGlscyBmb3IgWUFTR1VJIGxpYnNcIixcbiAgXCJtYWluXCI6IFwic3JjL21haW4uanNcIixcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImdpdDovL2dpdGh1Yi5jb20vWUFTR1VJL1V0aWxzLmdpdFwiXG4gIH0sXG4gIFwibGljZW5zZXNcIjogW1xuICAgIHtcbiAgICAgIFwidHlwZVwiOiBcIk1JVFwiLFxuICAgICAgXCJ1cmxcIjogXCJodHRwOi8veWFzcWUueWFzZ3VpLm9yZy9saWNlbnNlLnR4dFwiXG4gICAgfVxuICBdLFxuICBcImF1dGhvclwiOiB7XG4gICAgXCJuYW1lXCI6IFwiTGF1cmVucyBSaWV0dmVsZFwiXG4gIH0sXG4gIFwibWFpbnRhaW5lcnNcIjogW1xuICAgIHtcbiAgICAgIFwibmFtZVwiOiBcIkxhdXJlbnMgUmlldHZlbGRcIixcbiAgICAgIFwiZW1haWxcIjogXCJsYXVyZW5zLnJpZXR2ZWxkQGdtYWlsLmNvbVwiLFxuICAgICAgXCJ1cmxcIjogXCJodHRwOi8vbGF1cmVuc3JpZXR2ZWxkLm5sXCJcbiAgICB9XG4gIF0sXG4gIFwiYnVnc1wiOiB7XG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vWUFTR1VJL1V0aWxzL2lzc3Vlc1wiXG4gIH0sXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwczovL2dpdGh1Yi5jb20vWUFTR1VJL1V0aWxzXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInN0b3JlXCI6IFwiXjEuMy4xNFwiXG4gIH0sXG4gIFwicmVhZG1lXCI6IFwiQSBzaW1wbGUgdXRpbHMgcmVwbyBmb3IgdGhlIFlBU0dVSSB0b29sc1xcblwiLFxuICBcInJlYWRtZUZpbGVuYW1lXCI6IFwiUkVBRE1FLm1kXCIsXG4gIFwiX2lkXCI6IFwieWFzZ3VpLXV0aWxzQDEuMi4wXCIsXG4gIFwiZGlzdFwiOiB7XG4gICAgXCJzaGFzdW1cIjogXCJmMzg2YTFmMTQ1MThiY2Y5MTFiYWQwZGI0MWNjZjJmZDEyYmMxZWE2XCJcbiAgfSxcbiAgXCJfZnJvbVwiOiBcInlhc2d1aS11dGlsc0AxLjIuMFwiLFxuICBcIl9yZXNvbHZlZFwiOiBcImh0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnL3lhc2d1aS11dGlscy8tL3lhc2d1aS11dGlscy0xLjIuMC50Z3pcIlxufVxuIiwiLyoqXG4gKiBEZXRlcm1pbmUgdW5pcXVlIElEIG9mIHRoZSBZQVNRRSBvYmplY3QuIFVzZWZ1bCB3aGVuIHNldmVyYWwgb2JqZWN0cyBhcmVcbiAqIGxvYWRlZCBvbiB0aGUgc2FtZSBwYWdlLCBhbmQgYWxsIGhhdmUgJ3BlcnNpc3RlbmN5JyBlbmFibGVkLiBDdXJyZW50bHksIHRoZVxuICogSUQgaXMgZGV0ZXJtaW5lZCBieSBzZWxlY3RpbmcgdGhlIG5lYXJlc3QgcGFyZW50IGluIHRoZSBET00gd2l0aCBhbiBJRCBzZXRcbiAqIFxuICogQHBhcmFtIGRvYyB7WUFTUUV9XG4gKiBAbWV0aG9kIFlBU1FFLmRldGVybWluZUlkXG4gKi9cbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbGVtZW50KSB7XG5cdGlmIChlbGVtZW50LmNsb3Nlc3QpIHtcblx0XHRyZXR1cm4gZWxlbWVudC5jbG9zZXN0KCdbaWRdJykuYXR0cignaWQnKTtcblx0fSBlbHNlIHtcblx0XHR2YXIgaWQgPSB1bmRlZmluZWQ7XG5cdFx0dmFyIHBhcmVudCA9IGVsZW1lbnQ7XG5cdFx0d2hpbGUgKHBhcmVudCAmJiBpZCA9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmIChwYXJlbnQgJiYgcGFyZW50LmdldEF0dHJpYnV0ZSAmJiBwYXJlbnQuZ2V0QXR0cmlidXRlKCdpZCcpICYmIHBhcmVudC5nZXRBdHRyaWJ1dGUoJ2lkJykubGVuZ3RoID4gMCkgXG5cdFx0XHRcdGlkID0gcGFyZW50LmdldEF0dHJpYnV0ZSgnaWQnKTtcblx0XHRcdHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuXHRcdH1cblx0XHRyZXR1cm4gaWQ7XG5cdH1cbn07XG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJqcXVlcnlcIik7XG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHRjcm9zczogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMzBweFwiIGhlaWdodD1cIjMwcHhcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGc+XHQ8cGF0aCBkPVwiTTgzLjI4OCw4OC4xM2MtMi4xMTQsMi4xMTItNS41NzUsMi4xMTItNy42ODksMEw1My42NTksNjYuMTg4Yy0yLjExNC0yLjExMi01LjU3My0yLjExMi03LjY4NywwTDI0LjI1MSw4Ny45MDcgICBjLTIuMTEzLDIuMTE0LTUuNTcxLDIuMTE0LTcuNjg2LDBsLTQuNjkzLTQuNjkxYy0yLjExNC0yLjExNC0yLjExNC01LjU3MywwLTcuNjg4bDIxLjcxOS0yMS43MjFjMi4xMTMtMi4xMTQsMi4xMTMtNS41NzMsMC03LjY4NiAgIEwxMS44NzIsMjQuNGMtMi4xMTQtMi4xMTMtMi4xMTQtNS41NzEsMC03LjY4Nmw0Ljg0Mi00Ljg0MmMyLjExMy0yLjExNCw1LjU3MS0yLjExNCw3LjY4NiwwTDQ2LjEyLDMzLjU5MSAgIGMyLjExNCwyLjExNCw1LjU3MiwyLjExNCw3LjY4OCwwbDIxLjcyMS0yMS43MTljMi4xMTQtMi4xMTQsNS41NzMtMi4xMTQsNy42ODcsMGw0LjY5NSw0LjY5NWMyLjExMSwyLjExMywyLjExMSw1LjU3MS0wLjAwMyw3LjY4NiAgIEw2Ni4xODgsNDUuOTczYy0yLjExMiwyLjExNC0yLjExMiw1LjU3MywwLDcuNjg2TDg4LjEzLDc1LjYwMmMyLjExMiwyLjExMSwyLjExMiw1LjU3MiwwLDcuNjg3TDgzLjI4OCw4OC4xM3pcIi8+PC9nPjwvc3ZnPicsXG5cdGNoZWNrOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIzMHB4XCIgaGVpZ2h0PVwiMzBweFwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48cGF0aCBmaWxsPVwiIzAwMDAwMFwiIGQ9XCJNMTQuMzAxLDQ5Ljk4MmwyMi42MDYsMTcuMDQ3TDg0LjM2MSw0LjkwM2MyLjYxNC0zLjczMyw3Ljc2LTQuNjQsMTEuNDkzLTIuMDI2bDAuNjI3LDAuNDYyICBjMy43MzIsMi42MTQsNC42NCw3Ljc1OCwyLjAyNSwxMS40OTJsLTUxLjc4Myw3OS43N2MtMS45NTUsMi43OTEtMy44OTYsMy43NjItNy4zMDEsMy45ODhjLTMuNDA1LDAuMjI1LTUuNDY0LTEuMDM5LTcuNTA4LTMuMDg0ICBMMi40NDcsNjEuODE0Yy0zLjI2My0zLjI2Mi0zLjI2My04LjU1MywwLTExLjgxNGwwLjA0MS0wLjAxOUM1Ljc1LDQ2LjcxOCwxMS4wMzksNDYuNzE4LDE0LjMwMSw0OS45ODJ6XCIvPjwvc3ZnPicsXG5cdHVuc29ydGVkOiAnPHN2ZyAgIHhtbG5zOmRjPVwiaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS9cIiAgIHhtbG5zOmNjPVwiaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjXCIgICB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCIgICB4bWxuczpzdmc9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM6c29kaXBvZGk9XCJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZFwiICAgeG1sbnM6aW5rc2NhcGU9XCJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlXCIgICB2ZXJzaW9uPVwiMS4xXCIgICBpZD1cIkxheWVyXzFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA1NC41NTI3MTEgMTEzLjc4NDc4XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiICAgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyAgICAgaWQ9XCJnNVwiICAgICB0cmFuc2Zvcm09XCJtYXRyaXgoLTAuNzA1MjIxNTYsLTAuNzA4OTg2OTksLTAuNzA4OTg2OTksMC43MDUyMjE1Niw5Ny45ODgxOTksNTUuMDgxMjA1KVwiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBpZD1cInBhdGg3XCIgICAgICAgZD1cIk0gNTcuOTExLDY2LjkxNSA0NS44MDgsNTUuMDYzIDQyLjkwNCw1Mi4yMzggMzEuNjYxLDQxLjI1IDMxLjQzNSw0MS4wODMgMzEuMTMxLDQwLjc3NSAzMC43OTQsNDAuNTIzIDMwLjQ4Niw0MC4zIDMwLjA2OSw0MC4wNSAyOS44MTUsMzkuOTExIDI5LjI4NSwzOS42NTkgMjkuMDg5LDM5LjU3NiAyOC40NzQsMzkuMzI2IDI4LjM2MywzOS4yOTcgSCAyOC4zMzYgTCAyNy42NjUsMzkuMTI4IDI3LjUyNiwzOS4xIDI2Ljk0LDM4Ljk5IDI2LjcxNCwzOC45NjEgMjYuMjEyLDM4LjkzNCBoIC0wLjMxIC0wLjQ0NCBsIC0wLjMzOSwwLjAyNyBjIC0xLjQ1LDAuMTM5IC0yLjg3NiwwLjY3MSAtNC4xMSwxLjU2NCBsIC0wLjIyMywwLjE0MSAtMC4yNzksMC4yNSAtMC4zMzUsMC4zMDggLTAuMDU0LDAuMDI5IC0wLjE3MSwwLjE5NCAtMC4zMzQsMC4zNjQgLTAuMjI0LDAuMjc5IC0wLjI1LDAuMzM2IC0wLjIyNSwwLjM2MiAtMC4xOTIsMC4zMDggLTAuMTk3LDAuNDIxIC0wLjE0MiwwLjI3OSAtMC4xOTMsMC40NzcgLTAuMDg0LDAuMjIyIC0xMi40NDEsMzguNDE0IGMgLTAuODE0LDIuNDU4IC0wLjMxMyw1LjAyOSAxLjExNSw2Ljk4OCB2IDAuMDI2IGwgMC40MTgsMC41MzIgMC4xNywwLjE2NSAwLjI1MSwwLjI4MSAwLjA4NCwwLjA3OSAwLjI4MywwLjI4MSAwLjI1LDAuMTk0IDAuNDc0LDAuMzY3IDAuMDgzLDAuMDUzIGMgMi4wMTUsMS4zNzEgNC42NDEsMS44NzQgNy4xMzEsMS4wOTQgTCA1NS4yMjgsODAuNzc2IGMgNC4zMDMsLTEuMzQyIDYuNjc5LC01LjgxNCA1LjMwOCwtMTAuMDA2IC0wLjM4NywtMS4yNTkgLTEuMDg2LC0yLjM1IC0xLjk3OSwtMy4yMTUgbCAtMC4zNjgsLTAuMzM3IC0wLjI3OCwtMC4zMDMgeiBtIC02LjMxOCw1Ljg5NiAwLjA3OSwwLjExNCAtMzcuMzY5LDExLjU3IDExLjg1NCwtMzYuNTM4IDEwLjU2NSwxMC4zMTcgMi44NzYsMi44MjUgMTEuOTk1LDExLjcxMiB6XCIgLz48L2c+PHBhdGggICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgIGlkPVwicGF0aDctOVwiICAgICBkPVwibSA4Ljg3NDgzMzksNTIuNTcxNzY2IDE2LjkzODIxMTEsLTAuMjIyNTg0IDQuMDUwODUxLC0wLjA2NjY1IDE1LjcxOTE1NCwtMC4yMjIxNjYgMC4yNzc3OCwtMC4wNDI0NiAwLjQzMjc2LDAuMDAxNyAwLjQxNjMyLC0wLjA2MTIxIDAuMzc1MzIsLTAuMDYxMSAwLjQ3MTMyLC0wLjExOTM0MiAwLjI3NzY3LC0wLjA4MjA2IDAuNTUyNDQsLTAuMTk4MDQ3IDAuMTk3MDcsLTAuMDgwNDMgMC42MTA5NSwtMC4yNTk3MjEgMC4wOTg4LC0wLjA1ODI1IDAuMDE5LC0wLjAxOTE0IDAuNTkzMDMsLTAuMzU2NTQ4IDAuMTE3ODcsLTAuMDc4OCAwLjQ5MTI1LC0wLjMzNzg5MiAwLjE3OTk0LC0wLjEzOTc3OSAwLjM3MzE3LC0wLjMzNjg3MSAwLjIxODYyLC0wLjIxOTc4NiAwLjMxMzExLC0wLjMxNDc5IDAuMjE5OTMsLTAuMjU5Mzg3IGMgMC45MjQwMiwtMS4xMjYwNTcgMS41NTI0OSwtMi41MTIyNTEgMS43ODk2MSwtNC4wMTY5MDQgbCAwLjA1NzMsLTAuMjU3NTQgMC4wMTk1LC0wLjM3NDExMyAwLjAxNzksLTAuNDU0NzE5IDAuMDE3NSwtMC4wNTg3NCAtMC4wMTY5LC0wLjI1ODA0OSAtMC4wMjI1LC0wLjQ5MzUwMyAtMC4wMzk4LC0wLjM1NTU2OSAtMC4wNjE5LC0wLjQxNDIwMSAtMC4wOTgsLTAuNDE0ODEyIC0wLjA4MywtMC4zNTMzMzQgTCA1My4yMzk1NSw0MS4xNDg0IDUzLjE0MTg1LDQwLjg1MDk2NyA1Mi45Mzk3Nyw0MC4zNzc3NDIgNTIuODQxNTcsNDAuMTYxNjI4IDM0LjM4MDIxLDQuMjUwNzM3NSBDIDMzLjIxMTU2NywxLjk0MDE4NzUgMzEuMDM1NDQ2LDAuNDgyMjY1NTIgMjguNjM5NDg0LDAuMTEzMTY5NTIgbCAtMC4wMTg0MywtMC4wMTgzNCAtMC42NzE5NjMsLTAuMDc4ODIgLTAuMjM2ODcxLDAuMDA0MiBMIDI3LjMzNTk4NCwtNC43ODI2NTc3ZS03IDI3LjIyMDczNiwwLjAwMzc5OTUyIGwgLTAuMzk4ODA0LDAuMDAyNSAtMC4zMTM4NDgsMC4wNDA0MyAtMC41OTQ0NzQsMC4wNzcyNCAtMC4wOTYxMSwwLjAyMTQ3IEMgMjMuNDI0NTQ5LDAuNjA3MTYyNTIgMjEuMjE2MDE3LDIuMTE0MjM1NSAyMC4wMTMwMjUsNC40Mjk2ODY1IEwgMC45Mzk2NzQ5MSw0MC44OTQ0NzkgYyAtMi4wODMxMDgwMSwzLjk5NzE3OCAtMC41ODgxMjUsOC44MzU0ODIgMy4zNTA4MDc5OSwxMC44MTk3NDkgMS4xNjU1MzUsMC42MTM0OTUgMi40MzE5OSwwLjg4NzMxIDMuNjc1MDI2LDAuODY0MjAyIGwgMC40OTg0NSwtMC4wMjMyNSAwLjQxMDg3NSwwLjAxNjU4IHogTSA5LjE1MDIzNjksNDMuOTM0NDAxIDkuMDEzNjk5OSw0My45MTAwMTEgMjcuMTY0MTQ1LDkuMjU2NDYyNSA0NC43MDk0Miw0My40MjgxOCBsIC0xNC43NjUyODksMC4yMTQ2NzcgLTQuMDMxMTA2LDAuMDQ2OCAtMTYuNzYyNzg4MSwwLjI0NDc0NCB6XCIgLz48L3N2Zz4nLFxuXHRzb3J0RGVzYzogJzxzdmcgICB4bWxuczpkYz1cImh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvXCIgICB4bWxuczpjYz1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zI1wiICAgeG1sbnM6cmRmPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zI1wiICAgeG1sbnM6c3ZnPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zOnNvZGlwb2RpPVwiaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGRcIiAgIHhtbG5zOmlua3NjYXBlPVwiaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZVwiICAgdmVyc2lvbj1cIjEuMVwiICAgaWQ9XCJMYXllcl8xXCIgICB4PVwiMHB4XCIgICB5PVwiMHB4XCIgICB3aWR0aD1cIjEwMCVcIiAgIGhlaWdodD1cIjEwMCVcIiAgIHZpZXdCb3g9XCIwIDAgNTQuNTUyNzExIDExMy43ODQ3OFwiICAgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDEwMCAxMDBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgICAgIGlkPVwiZzVcIiAgICAgdHJhbnNmb3JtPVwibWF0cml4KC0wLjcwNTIyMTU2LC0wLjcwODk4Njk5LC0wLjcwODk4Njk5LDAuNzA1MjIxNTYsOTcuOTg4MTk5LDU1LjA4MTIwNSlcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgaWQ9XCJwYXRoN1wiICAgICAgIGQ9XCJNIDU3LjkxMSw2Ni45MTUgNDUuODA4LDU1LjA2MyA0Mi45MDQsNTIuMjM4IDMxLjY2MSw0MS4yNSAzMS40MzUsNDEuMDgzIDMxLjEzMSw0MC43NzUgMzAuNzk0LDQwLjUyMyAzMC40ODYsNDAuMyAzMC4wNjksNDAuMDUgMjkuODE1LDM5LjkxMSAyOS4yODUsMzkuNjU5IDI5LjA4OSwzOS41NzYgMjguNDc0LDM5LjMyNiAyOC4zNjMsMzkuMjk3IEggMjguMzM2IEwgMjcuNjY1LDM5LjEyOCAyNy41MjYsMzkuMSAyNi45NCwzOC45OSAyNi43MTQsMzguOTYxIDI2LjIxMiwzOC45MzQgaCAtMC4zMSAtMC40NDQgbCAtMC4zMzksMC4wMjcgYyAtMS40NSwwLjEzOSAtMi44NzYsMC42NzEgLTQuMTEsMS41NjQgbCAtMC4yMjMsMC4xNDEgLTAuMjc5LDAuMjUgLTAuMzM1LDAuMzA4IC0wLjA1NCwwLjAyOSAtMC4xNzEsMC4xOTQgLTAuMzM0LDAuMzY0IC0wLjIyNCwwLjI3OSAtMC4yNSwwLjMzNiAtMC4yMjUsMC4zNjIgLTAuMTkyLDAuMzA4IC0wLjE5NywwLjQyMSAtMC4xNDIsMC4yNzkgLTAuMTkzLDAuNDc3IC0wLjA4NCwwLjIyMiAtMTIuNDQxLDM4LjQxNCBjIC0wLjgxNCwyLjQ1OCAtMC4zMTMsNS4wMjkgMS4xMTUsNi45ODggdiAwLjAyNiBsIDAuNDE4LDAuNTMyIDAuMTcsMC4xNjUgMC4yNTEsMC4yODEgMC4wODQsMC4wNzkgMC4yODMsMC4yODEgMC4yNSwwLjE5NCAwLjQ3NCwwLjM2NyAwLjA4MywwLjA1MyBjIDIuMDE1LDEuMzcxIDQuNjQxLDEuODc0IDcuMTMxLDEuMDk0IEwgNTUuMjI4LDgwLjc3NiBjIDQuMzAzLC0xLjM0MiA2LjY3OSwtNS44MTQgNS4zMDgsLTEwLjAwNiAtMC4zODcsLTEuMjU5IC0xLjA4NiwtMi4zNSAtMS45NzksLTMuMjE1IGwgLTAuMzY4LC0wLjMzNyAtMC4yNzgsLTAuMzAzIHogbSAtNi4zMTgsNS44OTYgMC4wNzksMC4xMTQgLTM3LjM2OSwxMS41NyAxMS44NTQsLTM2LjUzOCAxMC41NjUsMTAuMzE3IDIuODc2LDIuODI1IDExLjk5NSwxMS43MTIgelwiIC8+PC9nPjxwYXRoICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICBpZD1cInBhdGg5XCIgICAgIGQ9XCJtIDI3LjgxMzI3MywwLjEyODIzNTA2IDAuMDk3NTMsMC4wMjAwNiBjIDIuMzkwOTMsMC40NTgyMDkgNC41OTk0NTUsMS45NjgxMTEwNCA1LjgwMjQ0LDQuMjg2MzkwMDQgTCA1Mi43ODU4OTcsNDAuODk0NTI1IGMgMi4wODgwNDQsNC4wMDIxMzkgMC41OTA5NDksOC44MzY5MDIgLTMuMzQ4NjkyLDEwLjgyMTg3NSAtMS4zMjkwNzgsMC42ODg3MjEgLTIuNzY2NjAzLDAuOTQzNjk1IC00LjEzMzE3NCwwLjg0MTc2OCBsIC0wLjQ1NDAxOCwwLjAyIEwgMjcuOTEwMzkyLDUyLjM1NDE3MSAyMy44NTUzMTMsNTIuMjgxODUxIDguMTQzOTMsNTIuMDYxODI3IDcuODYyNjA4LDUyLjAyMTQ3NyA3LjQyOTg1Niw1Mi4wMjE3MzggNy4wMTQyNDEsNTEuOTU5ODE4IDYuNjM4MjE2LDUxLjkwMDgzOCA2LjE2NDc3Niw1MS43NzkzNjkgNS44ODkyMTYsNTEuNjk5NDM5IDUuMzM4OTA3LDUxLjUwMDY5MSA1LjEzOTcxOSw1MS40MTk1NTEgNC41NDUwNjQsNTEuMTQ1MDIzIDQuNDMwNjE4LDUxLjEwNTEyMyA0LjQxMDE2OCw1MS4wODQ1NjMgMy44MTcxMzgsNTAuNzMwODQzIDMuNjkzNjE1LDUwLjY0Nzc4MyAzLjIwNzMxNCw1MC4zMTA2MTEgMy4wMjgwNzEsNTAuMTc0MzY5IDIuNjUyNzk1LDQ5LjgzMzk1NyAyLjQzMzQ3MSw0OS42MTM0NjIgMi4xNDAwOTksNDkuMzE4NTIzIDEuOTAxMTI3LDQ5LjA0MTQwNyBDIDAuOTc3ODEsNDcuOTE2MDU5IDAuMzQ3OTM1LDQ2LjUyODQ0OCAwLjExMTUzLDQ1LjAyMTY3NiBMIDAuMDUzNTIsNDQuNzY2MjU1IDAuMDUxNzIsNDQuMzcxNjgzIDAuMDE4OTQsNDMuOTM2MDE3IDAsNDMuODc3Mjc3IDAuMDE4MzYsNDMuNjIyMDYgMC4wMzY2Niw0My4xMjI4ODkgMC4wNzY1LDQyLjc2NTkwNSAwLjEzOTEyLDQyLjM1MjQxMyAwLjIzNTY4LDQxLjk0MDQyNSAwLjMyMjg4LDQxLjU4ODUxNyAwLjQ4MTAyMSw0MS4xNTE5NDUgMC41NzkzOTEsNDAuODUzODA2IDAuNzczNjksNDAuMzgxMjY4IDAuODc2MDk3LDQwLjE2MjMzNiAxOS4zMzg4NjksNC4yNTQyODAxIGMgMS4xNzIxNjksLTIuMzA4NDE5IDMuMzQ3NTksLTMuNzY4NDY1MDQgNS43NDA4MjksLTQuMTc3MTY2MDQgbCAwLjAxOTc1LDAuMDE5ODUgMC42OTYwNSwtMC4wOTU3MyAwLjIxODQzNywwLjAyMjUgMC40OTA3OTEsLTAuMDIxMzIgMC4zOTgwOSwwLjAwNDYgMC4zMTU5NzIsMC4wMzk3MyAwLjU5NDQ2MiwwLjA4MTQ5IHpcIiAvPjwvc3ZnPicsXG5cdHNvcnRBc2M6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIGlkPVwiTGF5ZXJfMVwiICAgeD1cIjBweFwiICAgeT1cIjBweFwiICAgd2lkdGg9XCIxMDAlXCIgICBoZWlnaHQ9XCIxMDAlXCIgICB2aWV3Qm94PVwiMCAwIDU0LjU1MjcxMSAxMTMuNzg0NzhcIiAgIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgICB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxnICAgICBpZD1cImc1XCIgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgtMC43MDUyMjE1NiwwLjcwODk4Njk5LC0wLjcwODk4Njk5LC0wLjcwNTIyMTU2LDk3Ljk4ODE5OSw1OC43MDQ4MDcpXCI+PHBhdGggICAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICAgIGlkPVwicGF0aDdcIiAgICAgICBkPVwiTSA1Ny45MTEsNjYuOTE1IDQ1LjgwOCw1NS4wNjMgNDIuOTA0LDUyLjIzOCAzMS42NjEsNDEuMjUgMzEuNDM1LDQxLjA4MyAzMS4xMzEsNDAuNzc1IDMwLjc5NCw0MC41MjMgMzAuNDg2LDQwLjMgMzAuMDY5LDQwLjA1IDI5LjgxNSwzOS45MTEgMjkuMjg1LDM5LjY1OSAyOS4wODksMzkuNTc2IDI4LjQ3NCwzOS4zMjYgMjguMzYzLDM5LjI5NyBIIDI4LjMzNiBMIDI3LjY2NSwzOS4xMjggMjcuNTI2LDM5LjEgMjYuOTQsMzguOTkgMjYuNzE0LDM4Ljk2MSAyNi4yMTIsMzguOTM0IGggLTAuMzEgLTAuNDQ0IGwgLTAuMzM5LDAuMDI3IGMgLTEuNDUsMC4xMzkgLTIuODc2LDAuNjcxIC00LjExLDEuNTY0IGwgLTAuMjIzLDAuMTQxIC0wLjI3OSwwLjI1IC0wLjMzNSwwLjMwOCAtMC4wNTQsMC4wMjkgLTAuMTcxLDAuMTk0IC0wLjMzNCwwLjM2NCAtMC4yMjQsMC4yNzkgLTAuMjUsMC4zMzYgLTAuMjI1LDAuMzYyIC0wLjE5MiwwLjMwOCAtMC4xOTcsMC40MjEgLTAuMTQyLDAuMjc5IC0wLjE5MywwLjQ3NyAtMC4wODQsMC4yMjIgLTEyLjQ0MSwzOC40MTQgYyAtMC44MTQsMi40NTggLTAuMzEzLDUuMDI5IDEuMTE1LDYuOTg4IHYgMC4wMjYgbCAwLjQxOCwwLjUzMiAwLjE3LDAuMTY1IDAuMjUxLDAuMjgxIDAuMDg0LDAuMDc5IDAuMjgzLDAuMjgxIDAuMjUsMC4xOTQgMC40NzQsMC4zNjcgMC4wODMsMC4wNTMgYyAyLjAxNSwxLjM3MSA0LjY0MSwxLjg3NCA3LjEzMSwxLjA5NCBMIDU1LjIyOCw4MC43NzYgYyA0LjMwMywtMS4zNDIgNi42NzksLTUuODE0IDUuMzA4LC0xMC4wMDYgLTAuMzg3LC0xLjI1OSAtMS4wODYsLTIuMzUgLTEuOTc5LC0zLjIxNSBsIC0wLjM2OCwtMC4zMzcgLTAuMjc4LC0wLjMwMyB6IG0gLTYuMzE4LDUuODk2IDAuMDc5LDAuMTE0IC0zNy4zNjksMTEuNTcgMTEuODU0LC0zNi41MzggMTAuNTY1LDEwLjMxNyAyLjg3NiwyLjgyNSAxMS45OTUsMTEuNzEyIHpcIiAvPjwvZz48cGF0aCAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgaWQ9XCJwYXRoOVwiICAgICBkPVwibSAyNy44MTMyNzMsMTEzLjY1Nzc4IDAuMDk3NTMsLTAuMDIwMSBjIDIuMzkwOTMsLTAuNDU4MjEgNC41OTk0NTUsLTEuOTY4MTEgNS44MDI0NCwtNC4yODYzOSBMIDUyLjc4NTg5Nyw3Mi44OTE0ODcgYyAyLjA4ODA0NCwtNC4wMDIxMzkgMC41OTA5NDksLTguODM2OTAyIC0zLjM0ODY5MiwtMTAuODIxODc1IC0xLjMyOTA3OCwtMC42ODg3MjEgLTIuNzY2NjAzLC0wLjk0MzY5NSAtNC4xMzMxNzQsLTAuODQxNzY4IGwgLTAuNDU0MDE4LC0wLjAyIC0xNi45Mzk2MjEsMC4yMjM5OTcgLTQuMDU1MDc5LDAuMDcyMzIgLTE1LjcxMTM4MywwLjIyMDAyNCAtMC4yODEzMjIsMC4wNDAzNSAtMC40MzI3NTIsLTIuNjFlLTQgLTAuNDE1NjE1LDAuMDYxOTIgLTAuMzc2MDI1LDAuMDU4OTggLTAuNDczNDQsMC4xMjE0NjkgLTAuMjc1NTYsMC4wNzk5MyAtMC41NTAzMDksMC4xOTg3NDggLTAuMTk5MTg4LDAuMDgxMTQgLTAuNTk0NjU1LDAuMjc0NTI4IC0wLjExNDQ0NiwwLjAzOTkgLTAuMDIwNDUsMC4wMjA1NiAtMC41OTMwMywwLjM1MzcyIC0wLjEyMzUyMywwLjA4MzA2IC0wLjQ4NjMwMSwwLjMzNzE3MiAtMC4xNzkyNDMsMC4xMzYyNDIgLTAuMzc1Mjc2LDAuMzQwNDEyIC0wLjIxOTMyNCwwLjIyMDQ5NSAtMC4yOTMzNzIsMC4yOTQ5MzkgLTAuMjM4OTcyLDAuMjc3MTE2IEMgMC45Nzc4MSw2NS44Njk5NTMgMC4zNDc5MzUsNjcuMjU3NTY0IDAuMTExNTMsNjguNzY0MzM2IEwgMC4wNTM1Miw2OS4wMTk3NTcgMC4wNTE3Miw2OS40MTQzMjkgMC4wMTg5NCw2OS44NDk5OTUgMCw2OS45MDg3MzUgbCAwLjAxODM2LDAuMjU1MjE3IDAuMDE4MywwLjQ5OTE3MSAwLjAzOTg0LDAuMzU2OTg0IDAuMDYyNjIsMC40MTM0OTIgMC4wOTY1NiwwLjQxMTk4OCAwLjA4NzIsMC4zNTE5MDggMC4xNTgxNDEsMC40MzY1NzIgMC4wOTgzNywwLjI5ODEzOSAwLjE5NDI5OSwwLjQ3MjUzOCAwLjEwMjQwNywwLjIxODkzMiAxOC40NjI3NzIsMzUuOTA4MDU0IGMgMS4xNzIxNjksMi4zMDg0MiAzLjM0NzU5LDMuNzY4NDcgNS43NDA4MjksNC4xNzcxNyBsIDAuMDE5NzUsLTAuMDE5OSAwLjY5NjA1LDAuMDk1NyAwLjIxODQzNywtMC4wMjI1IDAuNDkwNzkxLDAuMDIxMyAwLjM5ODA5LC0wLjAwNSAwLjMxNTk3MiwtMC4wMzk3IDAuNTk0NDYyLC0wLjA4MTUgelwiIC8+PC9zdmc+Jyxcblx0bG9hZGVyOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAzMiAzMlwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmaWxsPVwiYmxhY2tcIj4gIDxjaXJjbGUgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSg0NSAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuMTI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoOTAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoMTM1IDE2IDE2KVwiIGN4PVwiMTZcIiBjeT1cIjNcIiByPVwiMFwiPiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIHZhbHVlcz1cIjA7MzswOzBcIiBkdXI9XCIxc1wiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiIGJlZ2luPVwiMC4zNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgxODAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgyMjUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjYyNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDI3MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgzMTUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjg3NXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDE4MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT48L3N2Zz4nLFxuXHRxdWVyeTogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDgwIDgwXCIgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDgwIDgwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyBpZD1cIkxheWVyXzFcIj48L2c+PGcgaWQ9XCJMYXllcl8yXCI+XHQ8cGF0aCBkPVwiTTY0LjYyMiwyLjQxMUgxNC45OTVjLTYuNjI3LDAtMTIsNS4zNzMtMTIsMTJ2NDkuODk3YzAsNi42MjcsNS4zNzMsMTIsMTIsMTJoNDkuNjI3YzYuNjI3LDAsMTItNS4zNzMsMTItMTJWMTQuNDExICAgQzc2LjYyMiw3Ljc4Myw3MS4yNDksMi40MTEsNjQuNjIyLDIuNDExeiBNMjQuMTI1LDYzLjkwNlYxNS4wOTNMNjEsMzkuMTY4TDI0LjEyNSw2My45MDZ6XCIvPjwvZz48L3N2Zz4nLFxuXHRxdWVyeUludmFsaWQ6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA3My42MjcgNzMuODk3XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgODAgODBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgICA+PGcgICAgIGlkPVwiTGF5ZXJfMVwiICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoLTIuOTk1LC0yLjQxMSlcIiAvPjxnICAgICBpZD1cIkxheWVyXzJcIiAgICAgdHJhbnNmb3JtPVwidHJhbnNsYXRlKC0yLjk5NSwtMi40MTEpXCI+PHBhdGggICAgICAgZD1cIk0gNjQuNjIyLDIuNDExIEggMTQuOTk1IGMgLTYuNjI3LDAgLTEyLDUuMzczIC0xMiwxMiB2IDQ5Ljg5NyBjIDAsNi42MjcgNS4zNzMsMTIgMTIsMTIgaCA0OS42MjcgYyA2LjYyNywwIDEyLC01LjM3MyAxMiwtMTIgViAxNC40MTEgYyAwLC02LjYyOCAtNS4zNzMsLTEyIC0xMiwtMTIgeiBNIDI0LjEyNSw2My45MDYgViAxNS4wOTMgTCA2MSwzOS4xNjggMjQuMTI1LDYzLjkwNiB6XCIgICAgICAgaWQ9XCJwYXRoNlwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgLz48L2c+PGcgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgwLjc2ODA1NDA4LDAsMCwwLjc2ODA1NDA4LC0wLjkwMjMxOTU0LC0yLjAwNjA4OTUpXCIgICAgIGlkPVwiZzNcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6I2MwMjYwODtmaWxsLW9wYWNpdHk6MVwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgZD1cIm0gODguMTg0LDgxLjQ2OCBjIDEuMTY3LDEuMTY3IDEuMTY3LDMuMDc1IDAsNC4yNDIgbCAtMi40NzUsMi40NzUgYyAtMS4xNjcsMS4xNjcgLTMuMDc2LDEuMTY3IC00LjI0MiwwIGwgLTY5LjY1LC02OS42NSBjIC0xLjE2NywtMS4xNjcgLTEuMTY3LC0zLjA3NiAwLC00LjI0MiBsIDIuNDc2LC0yLjQ3NiBjIDEuMTY3LC0xLjE2NyAzLjA3NiwtMS4xNjcgNC4yNDIsMCBsIDY5LjY0OSw2OS42NTEgelwiICAgICAgIGlkPVwicGF0aDVcIiAvPjwvZz48ZyAgICAgdHJhbnNmb3JtPVwibWF0cml4KDAuNzY4MDU0MDgsMCwwLDAuNzY4MDU0MDgsLTAuOTAyMzE5NTQsLTIuMDA2MDg5NSlcIiAgICAgaWQ9XCJnN1wiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojYzAyNjA4O2ZpbGwtb3BhY2l0eToxXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBkPVwibSAxOC41MzIsODguMTg0IGMgLTEuMTY3LDEuMTY2IC0zLjA3NiwxLjE2NiAtNC4yNDIsMCBsIC0yLjQ3NSwtMi40NzUgYyAtMS4xNjcsLTEuMTY2IC0xLjE2NywtMy4wNzYgMCwtNC4yNDIgbCA2OS42NSwtNjkuNjUxIGMgMS4xNjcsLTEuMTY3IDMuMDc1LC0xLjE2NyA0LjI0MiwwIGwgMi40NzYsMi40NzYgYyAxLjE2NiwxLjE2NyAxLjE2NiwzLjA3NiAwLDQuMjQyIGwgLTY5LjY1MSw2OS42NSB6XCIgICAgICAgaWQ9XCJwYXRoOVwiIC8+PC9nPjwvc3ZnPicsXG5cdGRvd25sb2FkOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGJhc2VQcm9maWxlPVwidGlueVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgaWQ9XCJDYXB0aW9uc1wiPjwvZz48ZyBpZD1cIllvdXJfSWNvblwiPlx0PHBhdGggZmlsbC1ydWxlPVwiZXZlbm9kZFwiIGZpbGw9XCIjMDAwMDAwXCIgZD1cIk04OCw4NHYtMmMwLTIuOTYxLTAuODU5LTQtNC00SDE2Yy0yLjk2MSwwLTQsMC45OC00LDR2MmMwLDMuMTAyLDEuMDM5LDQsNCw0aDY4ICAgQzg3LjAyLDg4LDg4LDg3LjAzOSw4OCw4NHogTTU4LDEySDQyYy01LDAtNiwwLjk0MS02LDZ2MjJIMTZsMzQsMzRsMzQtMzRINjRWMThDNjQsMTIuOTQxLDYyLjkzOSwxMiw1OCwxMnpcIi8+PC9nPjwvc3ZnPicsXG5cdHNoYXJlOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGlkPVwiSWNvbnNcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBzdHlsZT1cImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTAwIDEwMDtcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxwYXRoIGlkPVwiU2hhcmVUaGlzXCIgZD1cIk0zNi43NjQsNTBjMCwwLjMwOC0wLjA3LDAuNTk4LTAuMDg4LDAuOTA1bDMyLjI0NywxNi4xMTljMi43Ni0yLjMzOCw2LjI5My0zLjc5NywxMC4xOTUtMy43OTcgIEM4Ny44OSw2My4yMjgsOTUsNzAuMzM4LDk1LDc5LjEwOUM5NSw4Ny44OSw4Ny44OSw5NSw3OS4xMTgsOTVjLTguNzgsMC0xNS44ODItNy4xMS0xNS44ODItMTUuODkxYzAtMC4zMTYsMC4wNy0wLjU5OCwwLjA4OC0wLjkwNSAgTDMxLjA3Nyw2Mi4wODVjLTIuNzY5LDIuMzI5LTYuMjkzLDMuNzg4LTEwLjE5NSwzLjc4OEMxMi4xMSw2NS44NzMsNSw1OC43NzEsNSw1MGMwLTguNzgsNy4xMS0xNS44OTEsMTUuODgyLTE1Ljg5MSAgYzMuOTAyLDAsNy40MjcsMS40NjgsMTAuMTk1LDMuNzk3bDMyLjI0Ny0xNi4xMTljLTAuMDE4LTAuMzA4LTAuMDg4LTAuNTk4LTAuMDg4LTAuOTE0QzYzLjIzNiwxMi4xMSw3MC4zMzgsNSw3OS4xMTgsNSAgQzg3Ljg5LDUsOTUsMTIuMTEsOTUsMjAuODczYzAsOC43OC03LjExLDE1Ljg5MS0xNS44ODIsMTUuODkxYy0zLjkxMSwwLTcuNDM2LTEuNDY4LTEwLjE5NS0zLjgwNkwzNi42NzYsNDkuMDg2ICBDMzYuNjkzLDQ5LjM5NCwzNi43NjQsNDkuNjg0LDM2Ljc2NCw1MHpcIi8+PC9zdmc+Jyxcblx0ZHJhdzogZnVuY3Rpb24ocGFyZW50LCBjb25maWcpIHtcblx0XHRpZiAoIXBhcmVudCkgcmV0dXJuO1xuXHRcdHZhciBlbCA9IHJvb3QuZ2V0RWxlbWVudChjb25maWcpO1xuXHRcdGlmIChlbCkge1xuXHRcdFx0JChwYXJlbnQpLmFwcGVuZChlbCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRFbGVtZW50OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHR2YXIgc3ZnU3RyaW5nID0gKGNvbmZpZy5pZD8gcm9vdFtjb25maWcuaWRdOiBjb25maWcudmFsdWUpO1xuXHRcdGlmIChzdmdTdHJpbmcgJiYgc3ZnU3RyaW5nLmluZGV4T2YoXCI8c3ZnXCIpID09IDApIHtcblx0XHRcdHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG5cdFx0XHR2YXIgZG9tID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhzdmdTdHJpbmcsIFwidGV4dC94bWxcIik7XG5cdFx0XHR2YXIgc3ZnID0gZG9tLmRvY3VtZW50RWxlbWVudDtcblx0XHRcdHZhciBzdmdDb250YWluZXIgPSAkKFwiPGRpdj48L2Rpdj5cIikuY3NzKFwiZGlzcGxheVwiLCBcImlubGluZS1ibG9ja1wiKTtcblx0XHRcdGlmICghY29uZmlnLndpZHRoKSBjb25maWcud2lkdGggPSBcIjEwMCVcIjtcblx0XHRcdGlmICghY29uZmlnLmhlaWdodCkgY29uZmlnLmhlaWdodCA9IFwiMTAwJVwiO1xuXHRcdFx0c3ZnQ29udGFpbmVyLndpZHRoKGNvbmZpZy53aWR0aCkuaGVpZ2h0KGNvbmZpZy5oZWlnaHQpO1xuXHRcdFx0cmV0dXJuIHN2Z0NvbnRhaW5lci5hcHBlbmQoc3ZnKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59OyIsIndpbmRvdy5jb25zb2xlID0gd2luZG93LmNvbnNvbGUgfHwge1wibG9nXCI6ZnVuY3Rpb24oKXt9fTsvL21ha2Ugc3VyZSBhbnkgY29uc29sZSBzdGF0ZW1lbnRzIGRvbid0IGJyZWFrIElFXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0c3RvcmFnZTogcmVxdWlyZShcIi4vc3RvcmFnZS5qc1wiKSxcblx0ZGV0ZXJtaW5lSWQ6IHJlcXVpcmUoXCIuL2RldGVybWluZUlkLmpzXCIpLFxuXHRpbWdzOiByZXF1aXJlKFwiLi9pbWdzLmpzXCIpLFxuXHR2ZXJzaW9uOiB7XG5cdFx0XCJ5YXNndWktdXRpbHNcIiA6IHJlcXVpcmUoXCIuLi9wYWNrYWdlLmpzb25cIikudmVyc2lvbixcblx0fVxufTtcbiIsInZhciBzdG9yZSA9IHJlcXVpcmUoXCJzdG9yZVwiKTtcbnZhciB0aW1lcyA9IHtcblx0ZGF5OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gMTAwMCAqIDM2MDAgKiAyNDsvL21pbGxpcyB0byBkYXlcblx0fSxcblx0bW9udGg6IGZ1bmN0aW9uKCkge1xuXHRcdHRpbWVzLmRheSgpICogMzA7XG5cdH0sXG5cdHllYXI6IGZ1bmN0aW9uKCkge1xuXHRcdHRpbWVzLm1vbnRoKCkgKiAxMjtcblx0fVxufTtcblxudmFyIHJvb3QgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2V0IDogZnVuY3Rpb24oa2V5LCB2YWwsIGV4cCkge1xuXHRcdGlmICh0eXBlb2YgZXhwID09IFwic3RyaW5nXCIpIHtcblx0XHRcdGV4cCA9IHRpbWVzW2V4cF0oKTtcblx0XHR9XG5cdFx0c3RvcmUuc2V0KGtleSwge1xuXHRcdFx0dmFsIDogdmFsLFxuXHRcdFx0ZXhwIDogZXhwLFxuXHRcdFx0dGltZSA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG5cdFx0fSk7XG5cdH0sXG5cdGdldCA6IGZ1bmN0aW9uKGtleSkge1xuXHRcdHZhciBpbmZvID0gc3RvcmUuZ2V0KGtleSk7XG5cdFx0aWYgKCFpbmZvKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0aWYgKGluZm8uZXhwICYmIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gaW5mby50aW1lID4gaW5mby5leHApIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRyZXR1cm4gaW5mby52YWw7XG5cdH1cblxufTsiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInlhc2d1aS15YXNxZVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiWWV0IEFub3RoZXIgU1BBUlFMIFF1ZXJ5IEVkaXRvclwiLFxuICBcInZlcnNpb25cIjogXCIxLjQuMFwiLFxuICBcIm1haW5cIjogXCJzcmMvbWFpbi5qc1wiLFxuICBcImxpY2Vuc2VzXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJNSVRcIixcbiAgICAgIFwidXJsXCI6IFwiaHR0cDovL3lhc3FlLnlhc2d1aS5vcmcvbGljZW5zZS50eHRcIlxuICAgIH1cbiAgXSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYnJvd3NlcmlmeVwiOiBcIl4zLjM4LjFcIixcbiAgICBcImJyb3dzZXJpZnktc2hpbVwiOiBcIl4zLjcuMFwiLFxuICAgIFwiZ3VscFwiOiBcIn4zLjYuMFwiLFxuICAgIFwiZ3VscC1jb25jYXRcIjogXCJeMi40LjFcIixcbiAgICBcImd1bHAtY29ubmVjdFwiOiBcIl4yLjAuNVwiLFxuICAgIFwiZ3VscC1lbWJlZGxyXCI6IFwiXjAuNS4yXCIsXG4gICAgXCJndWxwLWpzdmFsaWRhdGVcIjogXCJeMC4yLjBcIixcbiAgICBcInJlcXVpcmUtZGlyXCI6IFwiXjAuMS4wXCIsXG4gICAgXCJndWxwLWJ1bXBcIjogXCJeMC4xLjExXCIsXG4gICAgXCJydW4tc2VxdWVuY2VcIjogXCJeMS4wLjFcIixcbiAgICBcImd1bHAtZ2l0XCI6IFwiXjAuNS4yXCIsXG4gICAgXCJndWxwLWZpbHRlclwiOiBcIl4xLjAuMlwiLFxuICAgIFwiZ3VscC10YWctdmVyc2lvblwiOiBcIl4xLjEuMFwiLFxuICAgIFwiZ3VscC1saXZlcmVsb2FkXCI6IFwiXjEuMy4xXCIsXG4gICAgXCJndWxwLW1pbmlmeS1jc3NcIjogXCJeMC4zLjBcIixcbiAgICBcImd1bHAtbm90aWZ5XCI6IFwiXjEuMi41XCIsXG4gICAgXCJndWxwLXJlbmFtZVwiOiBcIl4xLjIuMFwiLFxuICAgIFwiZ3VscC1yZXBsYWNlXCI6IFwiXjAuNC4wXCIsXG4gICAgXCJndWxwLXN0cmVhbWlmeVwiOiBcIjAuMC41XCIsXG4gICAgXCJndWxwLXVnbGlmeVwiOiBcIl4wLjIuMVwiLFxuICAgIFwiZ3VscC15dWlkb2NcIjogXCJeMC4xLjJcIixcbiAgICBcIm1lcmdlLXN0cmVhbVwiOiBcIl4wLjEuNlwiLFxuICAgIFwicmVxdWlyZS1kaXJcIjogXCJeMC4xLjBcIixcbiAgICBcInZpbnlsLWJ1ZmZlclwiOiBcIjAuMC4wXCIsXG4gICAgXCJ2aW55bC1zb3VyY2Utc3RyZWFtXCI6IFwifjAuMS4xXCIsXG4gICAgXCJ3YXRjaGlmeVwiOiBcIl4wLjYuNFwiXG4gIH0sXG4gIFwiYnVnc1wiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9ZQVNHVUkvWUFTUUUvaXNzdWVzL1wiLFxuICBcImtleXdvcmRzXCI6IFtcbiAgICBcIkphdmFTY3JpcHRcIixcbiAgICBcIlNQQVJRTFwiLFxuICAgIFwiRWRpdG9yXCIsXG4gICAgXCJTZW1hbnRpYyBXZWJcIixcbiAgICBcIkxpbmtlZCBEYXRhXCJcbiAgXSxcbiAgXCJob21lcGFnZVwiOiBcImh0dHA6Ly95YXNxZS55YXNndWkub3JnXCIsXG4gIFwibWFpbnRhaW5lcnNcIjogW1xuICAgIHtcbiAgICAgIFwibmFtZVwiOiBcIkxhdXJlbnMgUmlldHZlbGRcIixcbiAgICAgIFwiZW1haWxcIjogXCJsYXVyZW5zLnJpZXR2ZWxkQGdtYWlsLmNvbVwiLFxuICAgICAgXCJ3ZWJcIjogXCJodHRwOi8vbGF1cmVuc3JpZXR2ZWxkLm5sXCJcbiAgICB9XG4gIF0sXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vWUFTR1VJL1lBU1FFLmdpdFwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImpxdWVyeVwiOiBcIn4gMS4xMS4wXCIsXG4gICAgXCJjb2RlbWlycm9yXCI6IFwifjQuMi4wXCIsXG4gICAgXCJhbXBsaWZ5XCI6IFwiMC4wLjExXCIsXG4gICAgXCJzdG9yZVwiOiBcIl4xLjMuMTRcIixcbiAgICBcInR3aXR0ZXItYm9vdHN0cmFwLTMuMC4wXCI6IFwiXjMuMC4wXCIsXG4gICAgXCJ5YXNndWktdXRpbHNcIjogXCJeMS4wLjBcIlxuICB9LFxuICBcImJyb3dzZXJpZnktc2hpbVwiOiB7XG4gICAgXCJqcXVlcnlcIjogXCJnbG9iYWw6alF1ZXJ5XCIsXG4gICAgXCJjb2RlbWlycm9yXCI6IFwiZ2xvYmFsOkNvZGVNaXJyb3JcIlxuICB9LFxuICBcImJyb3dzZXJpZnlcIjoge1xuICAgIFwidHJhbnNmb3JtXCI6IFtcbiAgICAgIFwiYnJvd3NlcmlmeS1zaGltXCJcbiAgICBdXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbid1c2Ugc3RyaWN0JztcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciBDb2RlTWlycm9yID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpO1xuXG4vLyByZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL2hpbnQvc2hvdy1oaW50LmpzJyk7XG4vLyByZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL3NlYXJjaC9zZWFyY2hjdXJzb3IuanMnKTtcbi8vIHJlcXVpcmUoJ2NvZGVtaXJyb3IvYWRkb24vZWRpdC9tYXRjaGJyYWNrZXRzLmpzJyk7XG4vLyByZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL3J1bm1vZGUvcnVubW9kZS5qcycpO1xuXG53aW5kb3cuY29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHtcImxvZ1wiOmZ1bmN0aW9uKCl7fX07Ly9tYWtlIHN1cmUgYW55IGNvbnNvbGUgc3RhdGVtZW50c1xuXG5yZXF1aXJlKCcuLi9saWIvZmxpbnQuanMnKTtcbnZhciBUcmllID0gcmVxdWlyZSgnLi4vbGliL3RyaWUuanMnKTtcblxuLyoqXG4gKiBNYWluIFlBU1FFIGNvbnN0cnVjdG9yLiBQYXNzIGEgRE9NIGVsZW1lbnQgYXMgYXJndW1lbnQgdG8gYXBwZW5kIHRoZSBlZGl0b3IgdG8sIGFuZCAob3B0aW9uYWxseSkgcGFzcyBhbG9uZyBjb25maWcgc2V0dGluZ3MgKHNlZSB0aGUgWUFTUUUuZGVmYXVsdHMgb2JqZWN0IGJlbG93LCBhcyB3ZWxsIGFzIHRoZSByZWd1bGFyIENvZGVNaXJyb3IgZG9jdW1lbnRhdGlvbiwgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gY29uZmlndXJhYmlsaXR5KVxuICogXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RE9NLUVsZW1lbnR9IHBhcmVudCBlbGVtZW50IHRvIGFwcGVuZCBlZGl0b3IgdG8uXG4gKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3NcbiAqIEBjbGFzcyBZQVNRRVxuICogQHJldHVybiB7ZG9jfSBZQVNRRSBkb2N1bWVudFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGFyZW50LCBjb25maWcpIHtcblx0Y29uZmlnID0gZXh0ZW5kQ29uZmlnKGNvbmZpZyk7XG5cdGNvbnNvbGUubG9nKCdibGFhdCcpO1xuXHR2YXIgY20gPSBleHRlbmRDbUluc3RhbmNlKENvZGVNaXJyb3IocGFyZW50LCBjb25maWcpKTtcblx0cG9zdFByb2Nlc3NDbUVsZW1lbnQoY20pO1xuXHRyZXR1cm4gY207XG59O1xuXG4vKipcbiAqIEV4dGVuZCBjb25maWcgb2JqZWN0LCB3aGljaCB3ZSB3aWxsIHBhc3Mgb24gdG8gdGhlIENNIGNvbnN0cnVjdG9yIGxhdGVyIG9uLlxuICogTmVlZCB0aGlzLCB0byBtYWtlIHN1cmUgb3VyIG93biAnb25CbHVyJyBldGMgZXZlbnRzIGRvIG5vdCBnZXQgb3ZlcndyaXR0ZW4gYnlcbiAqIHBlb3BsZSB3aG8gYWRkIHRoZWlyIG93biBvbmJsdXIgZXZlbnRzIHRvIHRoZSBjb25maWcgQWRkaXRpb25hbGx5LCBuZWVkIHRoaXNcbiAqIHRvIGluY2x1ZGUgdGhlIENNIGRlZmF1bHRzIG91cnNlbHZlcy4gQ29kZU1pcnJvciBoYXMgYSBtZXRob2QgZm9yIGluY2x1ZGluZ1xuICogZGVmYXVsdHMsIGJ1dCB3ZSBjYW4ndCByZWx5IG9uIHRoYXQgb25lOiBpdCBhc3N1bWVzIGZsYXQgY29uZmlnIG9iamVjdCwgd2hlcmVcbiAqIHdlIGhhdmUgbmVzdGVkIG9iamVjdHMgKGUuZy4gdGhlIHBlcnNpc3RlbmN5IG9wdGlvbilcbiAqIFxuICogQHByaXZhdGVcbiAqL1xudmFyIGV4dGVuZENvbmZpZyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuXHR2YXIgZXh0ZW5kZWRDb25maWcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgcm9vdC5kZWZhdWx0cywgY29uZmlnKTtcblx0Ly8gSSBrbm93LCBjb2RlbWlycm9yIGRlYWxzIHdpdGggIGRlZmF1bHQgb3B0aW9ucyBhcyB3ZWxsLiBcblx0Ly9Ib3dldmVyLCBpdCBkb2VzIG5vdCBkbyB0aGlzIHJlY3Vyc2l2ZWx5IChpLmUuIHRoZSBwZXJzaXN0ZW5jeSBvcHRpb24pXG5cdHJldHVybiBleHRlbmRlZENvbmZpZztcbn07XG4vKipcbiAqIEFkZCBleHRyYSBmdW5jdGlvbnMgdG8gdGhlIENNIGRvY3VtZW50IChpLmUuIHRoZSBjb2RlbWlycm9yIGluc3RhbnRpYXRlZFxuICogb2JqZWN0KVxuICogXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZXh0ZW5kQ21JbnN0YW5jZSA9IGZ1bmN0aW9uKGNtKSB7XG5cdC8qKlxuXHQgKiBFeGVjdXRlIHF1ZXJ5LiBQYXNzIGEgY2FsbGJhY2sgZnVuY3Rpb24sIG9yIGEgY29uZmlndXJhdGlvbiBvYmplY3QgKHNlZVxuXHQgKiBkZWZhdWx0IHNldHRpbmdzIGJlbG93IGZvciBwb3NzaWJsZSB2YWx1ZXMpIEkuZS4sIHlvdSBjYW4gY2hhbmdlIHRoZVxuXHQgKiBxdWVyeSBjb25maWd1cmF0aW9uIGJ5IGVpdGhlciBjaGFuZ2luZyB0aGUgZGVmYXVsdCBzZXR0aW5ncywgY2hhbmdpbmcgdGhlXG5cdCAqIHNldHRpbmdzIG9mIHRoaXMgZG9jdW1lbnQsIG9yIGJ5IHBhc3NpbmcgcXVlcnkgc2V0dGluZ3MgdG8gdGhpcyBmdW5jdGlvblxuXHQgKiBcblx0ICogQG1ldGhvZCBkb2MucXVlcnlcblx0ICogQHBhcmFtIGZ1bmN0aW9ufG9iamVjdFxuXHQgKi9cblx0Y20ucXVlcnkgPSBmdW5jdGlvbihjYWxsYmFja09yQ29uZmlnKSB7XG5cdFx0cm9vdC5leGVjdXRlUXVlcnkoY20sIGNhbGxiYWNrT3JDb25maWcpO1xuXHR9O1xuXHRcblx0LyoqXG5cdCAqIEZldGNoIGRlZmluZWQgcHJlZml4ZXMgZnJvbSBxdWVyeSBzdHJpbmdcblx0ICogXG5cdCAqIEBtZXRob2QgZG9jLmdldFByZWZpeGVzRnJvbVF1ZXJ5XG5cdCAqIEByZXR1cm4gb2JqZWN0XG5cdCAqL1xuXHRjbS5nZXRQcmVmaXhlc0Zyb21RdWVyeSA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBnZXRQcmVmaXhlc0Zyb21RdWVyeShjbSk7XG5cdH07XG5cdFxuXHQvKipcblx0ICogRmV0Y2ggdGhlIHF1ZXJ5IHR5cGUgKGkuZS4sIFNFTEVDVHx8REVTQ1JJQkV8fElOU0VSVHx8REVMRVRFfHxBU0t8fENPTlNUUlVDVClcblx0ICogXG5cdCAqIEBtZXRob2QgZG9jLmdldFF1ZXJ5VHlwZVxuXHQgKiBAcmV0dXJuIHN0cmluZ1xuXHQgKiBcblx0ICovXG5cdCBjbS5nZXRRdWVyeVR5cGUgPSBmdW5jdGlvbigpIHtcblx0XHQgcmV0dXJuIGNtLnF1ZXJ5VHlwZTtcblx0IH07XG5cdC8qKlxuXHQgKiBGZXRjaCB0aGUgcXVlcnkgbW9kZTogJ3F1ZXJ5JyBvciAndXBkYXRlJ1xuXHQgKiBcblx0ICogQG1ldGhvZCBkb2MuZ2V0UXVlcnlNb2RlXG5cdCAqIEByZXR1cm4gc3RyaW5nXG5cdCAqIFxuXHQgKi9cblx0IGNtLmdldFF1ZXJ5TW9kZSA9IGZ1bmN0aW9uKCkge1xuXHRcdCB2YXIgdHlwZSA9IGNtLmdldFF1ZXJ5VHlwZSgpO1xuXHRcdCBpZiAodHlwZT09XCJJTlNFUlRcIiB8fCB0eXBlPT1cIkRFTEVURVwiIHx8IHR5cGU9PVwiTE9BRFwiIHx8IHR5cGU9PVwiQ0xFQVJcIiB8fCB0eXBlPT1cIkNSRUFURVwiIHx8IHR5cGU9PVwiRFJPUFwiIHx8IHR5cGU9PVwiQ09QWVwiIHx8IHR5cGU9PVwiTU9WRVwiIHx8IHR5cGU9PVwiQUREXCIpIHtcblx0XHRcdCByZXR1cm4gXCJ1cGRhdGVcIjtcblx0XHQgfSBlbHNlIHtcblx0XHRcdCByZXR1cm4gXCJxdWVyeVwiO1xuXHRcdCB9XG5cdFx0XHRcdFxuXHQgfTtcblx0LyoqXG5cdCAqIFN0b3JlIGJ1bGsgY29tcGxldGlvbnMgaW4gbWVtb3J5IGFzIHRyaWUsIGFuZCBzdG9yZSB0aGVzZSBpbiBsb2NhbHN0b3JhZ2UgYXMgd2VsbCAoaWYgZW5hYmxlZClcblx0ICogXG5cdCAqIEBtZXRob2QgZG9jLnN0b3JlQnVsa0NvbXBsZXRpb25zXG5cdCAqIEBwYXJhbSB0eXBlIHtcInByZWZpeGVzXCIsIFwicHJvcGVydGllc1wiLCBcImNsYXNzZXNcIn1cblx0ICogQHBhcmFtIGNvbXBsZXRpb25zIHthcnJheX1cblx0ICovXG5cdGNtLnN0b3JlQnVsa0NvbXBsZXRpb25zID0gZnVuY3Rpb24odHlwZSwgY29tcGxldGlvbnMpIHtcblx0XHQvLyBzdG9yZSBhcnJheSBhcyB0cmllXG5cdFx0dHJpZXNbdHlwZV0gPSBuZXcgVHJpZSgpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGxldGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRyaWVzW3R5cGVdLmluc2VydChjb21wbGV0aW9uc1tpXSk7XG5cdFx0fVxuXHRcdC8vIHN0b3JlIGluIGxvY2Fsc3RvcmFnZSBhcyB3ZWxsXG5cdFx0dmFyIHN0b3JhZ2VJZCA9IGdldFBlcnNpc3RlbmN5SWQoY20sIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLnBlcnNpc3RlbnQpO1xuXHRcdGlmIChzdG9yYWdlSWQpIHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuc3RvcmFnZS5zZXQoc3RvcmFnZUlkLCBjb21wbGV0aW9ucywgXCJtb250aFwiKTtcblx0fTtcblx0Y20uc2V0Q2hlY2tTeW50YXhFcnJvcnMgPSBmdW5jdGlvbihpc0VuYWJsZWQpIHtcblx0XHRjbS5vcHRpb25zLnN5bnRheEVycm9yQ2hlY2sgPSBpc0VuYWJsZWQ7XG5cdFx0Y2hlY2tTeW50YXgoY20pO1xuXHR9O1xuXHRyZXR1cm4gY207XG59O1xuXG52YXIgcG9zdFByb2Nlc3NDbUVsZW1lbnQgPSBmdW5jdGlvbihjbSkge1xuXHRcblx0LyoqXG5cdCAqIFNldCBkb2MgdmFsdWVcblx0ICovXG5cdHZhciBzdG9yYWdlSWQgPSBnZXRQZXJzaXN0ZW5jeUlkKGNtLCBjbS5vcHRpb25zLnBlcnNpc3RlbnQpO1xuXHRpZiAoc3RvcmFnZUlkKSB7XG5cdFx0dmFyIHZhbHVlRnJvbVN0b3JhZ2UgPSByZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLnN0b3JhZ2UuZ2V0KHN0b3JhZ2VJZCk7XG5cdFx0aWYgKHZhbHVlRnJvbVN0b3JhZ2UpXG5cdFx0XHRjbS5zZXRWYWx1ZSh2YWx1ZUZyb21TdG9yYWdlKTtcblx0fVxuXHRcblx0cm9vdC5kcmF3QnV0dG9ucyhjbSk7XG5cblx0LyoqXG5cdCAqIEFkZCBldmVudCBoYW5kbGVyc1xuXHQgKi9cblx0Y20ub24oJ2JsdXInLCBmdW5jdGlvbihjbSwgZXZlbnRJbmZvKSB7XG5cdFx0cm9vdC5zdG9yZVF1ZXJ5KGNtKTtcblx0fSk7XG5cdGNtLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihjbSwgZXZlbnRJbmZvKSB7XG5cdFx0Y2hlY2tTeW50YXgoY20pO1xuXHRcdHJvb3QuYXBwZW5kUHJlZml4SWZOZWVkZWQoY20pO1xuXHRcdHJvb3QudXBkYXRlUXVlcnlCdXR0b24oY20pO1xuXHRcdHJvb3QucG9zaXRpb25BYnNvbHV0ZUl0ZW1zKGNtKTtcblx0fSk7XG5cdFxuXHRjbS5vbignY3Vyc29yQWN0aXZpdHknLCBmdW5jdGlvbihjbSwgZXZlbnRJbmZvKSB7XG5cdFx0cm9vdC5hdXRvQ29tcGxldGUoY20sIHRydWUpO1xuXHR9KTtcblx0Y20ucHJldlF1ZXJ5VmFsaWQgPSBmYWxzZTtcblx0Y2hlY2tTeW50YXgoY20pOy8vIG9uIGZpcnN0IGxvYWQsIGNoZWNrIGFzIHdlbGwgKG91ciBzdG9yZWQgb3IgZGVmYXVsdCBxdWVyeSBtaWdodCBiZSBpbmNvcnJlY3QgYXMgd2VsbClcblx0cm9vdC5wb3NpdGlvbkFic29sdXRlSXRlbXMoY20pO1xuXHQvKipcblx0ICogbG9hZCBidWxrIGNvbXBsZXRpb25zXG5cdCAqL1xuXHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnMpIHtcblx0XHRmb3IgKCB2YXIgY29tcGxldGlvblR5cGUgaW4gY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnMpIHtcblx0XHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1tjb21wbGV0aW9uVHlwZV0uYnVsaykge1xuXHRcdFx0XHRsb2FkQnVsa0NvbXBsZXRpb25zKGNtLCBjb21wbGV0aW9uVHlwZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdFxuXHQvKipcblx0ICogY2hlY2sgdXJsIGFyZ3MgYW5kIG1vZGlmeSB5YXNxZSBzZXR0aW5ncyBpZiBuZWVkZWRcblx0ICovXG5cdGlmIChjbS5vcHRpb25zLmNvbnN1bWVTaGFyZUxpbmspIHtcblx0XHRjbS5vcHRpb25zLmNvbnN1bWVTaGFyZUxpbmsoY20pO1xuXHR9XG59O1xuXG4vKipcbiAqIHByaXZhdGVzXG4gKi9cbi8vIHVzZWQgdG8gc3RvcmUgYnVsayBhdXRvY29tcGxldGlvbnMgaW5cbnZhciB0cmllcyA9IHt9O1xuLy8gdGhpcyBpcyBhIG1hcHBpbmcgZnJvbSB0aGUgY2xhc3MgbmFtZXMgKGdlbmVyaWMgb25lcywgZm9yIGNvbXBhdGFiaWxpdHkgd2l0aCBjb2RlbWlycm9yIHRoZW1lcyksIHRvIHdoYXQgdGhleSAtYWN0dWFsbHktIHJlcHJlc2VudFxudmFyIHRva2VuVHlwZXMgPSB7XG5cdFwic3RyaW5nLTJcIiA6IFwicHJlZml4ZWRcIixcblx0XCJhdG9tXCI6IFwidmFyXCJcbn07XG52YXIga2V5RXhpc3RzID0gZnVuY3Rpb24ob2JqZWN0VG9UZXN0LCBrZXkpIHtcblx0dmFyIGV4aXN0cyA9IGZhbHNlO1xuXG5cdHRyeSB7XG5cdFx0aWYgKG9iamVjdFRvVGVzdFtrZXldICE9PSB1bmRlZmluZWQpXG5cdFx0XHRleGlzdHMgPSB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdH1cblx0cmV0dXJuIGV4aXN0cztcbn07XG5cblxudmFyIGxvYWRCdWxrQ29tcGxldGlvbnMgPSBmdW5jdGlvbihjbSwgdHlwZSkge1xuXHR2YXIgY29tcGxldGlvbnMgPSBudWxsO1xuXHRpZiAoa2V5RXhpc3RzKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLCBcImdldFwiKSlcblx0XHRjb21wbGV0aW9ucyA9IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldDtcblx0aWYgKGNvbXBsZXRpb25zIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHQvLyB3ZSBkb24ndCBjYXJlIHdoZXRoZXIgdGhlIGNvbXBsZXRpb25zIGFyZSBhbHJlYWR5IHN0b3JlZCBpblxuXHRcdC8vIGxvY2Fsc3RvcmFnZS4ganVzdCB1c2UgdGhpcyBvbmVcblx0XHRjbS5zdG9yZUJ1bGtDb21wbGV0aW9ucyh0eXBlLCBjb21wbGV0aW9ucyk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gaWYgY29tcGxldGlvbnMgYXJlIGRlZmluZWQgaW4gbG9jYWxzdG9yYWdlLCB1c2UgdGhvc2UhIChjYWxsaW5nIHRoZVxuXHRcdC8vIGZ1bmN0aW9uIG1heSBjb21lIHdpdGggb3ZlcmhlYWQgKGUuZy4gYXN5bmMgY2FsbHMpKVxuXHRcdHZhciBjb21wbGV0aW9uc0Zyb21TdG9yYWdlID0gbnVsbDtcblx0XHRpZiAoZ2V0UGVyc2lzdGVuY3lJZChjbSwgY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0ucGVyc2lzdGVudCkpXG5cdFx0XHRjb21wbGV0aW9uc0Zyb21TdG9yYWdlID0gcmVxdWlyZShcInlhc2d1aS11dGlsc1wiKS5zdG9yYWdlLmdldChcblx0XHRcdFx0XHRnZXRQZXJzaXN0ZW5jeUlkKGNtLFxuXHRcdFx0XHRcdFx0XHRjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5wZXJzaXN0ZW50KSk7XG5cdFx0aWYgKGNvbXBsZXRpb25zRnJvbVN0b3JhZ2UgJiYgY29tcGxldGlvbnNGcm9tU3RvcmFnZSBpbnN0YW5jZW9mIEFycmF5XG5cdFx0XHRcdCYmIGNvbXBsZXRpb25zRnJvbVN0b3JhZ2UubGVuZ3RoID4gMCkge1xuXHRcdFx0Y20uc3RvcmVCdWxrQ29tcGxldGlvbnModHlwZSwgY29tcGxldGlvbnNGcm9tU3RvcmFnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIG5vdGhpbmcgaW4gc3RvcmFnZS4gY2hlY2sgd2hldGhlciB3ZSBoYXZlIGEgZnVuY3Rpb24gdmlhIHdoaWNoIHdlXG5cdFx0XHQvLyBjYW4gZ2V0IG91ciBwcmVmaXhlc1xuXHRcdFx0aWYgKGNvbXBsZXRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcblx0XHRcdFx0dmFyIGZ1bmN0aW9uUmVzdWx0ID0gY29tcGxldGlvbnMoY20pO1xuXHRcdFx0XHRpZiAoZnVuY3Rpb25SZXN1bHQgJiYgZnVuY3Rpb25SZXN1bHQgaW5zdGFuY2VvZiBBcnJheVxuXHRcdFx0XHRcdFx0JiYgZnVuY3Rpb25SZXN1bHQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdC8vIGZ1bmN0aW9uIHJldHVybmVkIGFuIGFycmF5IChpZiB0aGlzIGFuIGFzeW5jIGZ1bmN0aW9uLCB3ZVxuXHRcdFx0XHRcdC8vIHdvbid0IGdldCBhIGRpcmVjdCBmdW5jdGlvbiByZXN1bHQpXG5cdFx0XHRcdFx0Y20uc3RvcmVCdWxrQ29tcGxldGlvbnModHlwZSwgZnVuY3Rpb25SZXN1bHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIEdldCBkZWZpbmVkIHByZWZpeGVzIGZyb20gcXVlcnkgYXMgYXJyYXksIGluIGZvcm1hdCB7XCJwcmVmaXg6XCIgXCJ1cmlcIn1cbiAqIFxuICogQHBhcmFtIGNtXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbnZhciBnZXRQcmVmaXhlc0Zyb21RdWVyeSA9IGZ1bmN0aW9uKGNtKSB7XG5cdHZhciBxdWVyeVByZWZpeGVzID0ge307XG5cdHZhciBudW1MaW5lcyA9IGNtLmxpbmVDb3VudCgpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG51bUxpbmVzOyBpKyspIHtcblx0XHR2YXIgZmlyc3RUb2tlbiA9IGdldE5leHROb25Xc1Rva2VuKGNtLCBpKTtcblx0XHRpZiAoZmlyc3RUb2tlbiAhPSBudWxsICYmIGZpcnN0VG9rZW4uc3RyaW5nLnRvVXBwZXJDYXNlKCkgPT0gXCJQUkVGSVhcIikge1xuXHRcdFx0dmFyIHByZWZpeCA9IGdldE5leHROb25Xc1Rva2VuKGNtLCBpLCBmaXJzdFRva2VuLmVuZCArIDEpO1xuXHRcdFx0aWYgKHByZWZpeCkge1xuXHRcdFx0XHR2YXIgdXJpID0gZ2V0TmV4dE5vbldzVG9rZW4oY20sIGksIHByZWZpeC5lbmQgKyAxKTtcblx0XHRcdFx0aWYgKHByZWZpeCAhPSBudWxsICYmIHByZWZpeC5zdHJpbmcubGVuZ3RoID4gMCAmJiB1cmkgIT0gbnVsbFxuXHRcdFx0XHRcdFx0JiYgdXJpLnN0cmluZy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0dmFyIHVyaVN0cmluZyA9IHVyaS5zdHJpbmc7XG5cdFx0XHRcdFx0aWYgKHVyaVN0cmluZy5pbmRleE9mKFwiPFwiKSA9PSAwKVxuXHRcdFx0XHRcdFx0dXJpU3RyaW5nID0gdXJpU3RyaW5nLnN1YnN0cmluZygxKTtcblx0XHRcdFx0XHRpZiAodXJpU3RyaW5nLnNsaWNlKC0xKSA9PSBcIj5cIilcblx0XHRcdFx0XHRcdHVyaVN0cmluZyA9IHVyaVN0cmluZ1xuXHRcdFx0XHRcdFx0XHRcdC5zdWJzdHJpbmcoMCwgdXJpU3RyaW5nLmxlbmd0aCAtIDEpO1xuXHRcdFx0XHRcdHF1ZXJ5UHJlZml4ZXNbcHJlZml4LnN0cmluZ10gPSB1cmlTdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIHF1ZXJ5UHJlZml4ZXM7XG59O1xuXG4vKipcbiAqIEFwcGVuZCBwcmVmaXggZGVjbGFyYXRpb24gdG8gbGlzdCBvZiBwcmVmaXhlcyBpbiBxdWVyeSB3aW5kb3cuXG4gKiBcbiAqIEBwYXJhbSBjbVxuICogQHBhcmFtIHByZWZpeFxuICovXG52YXIgYXBwZW5kVG9QcmVmaXhlcyA9IGZ1bmN0aW9uKGNtLCBwcmVmaXgpIHtcblx0dmFyIGxhc3RQcmVmaXggPSBudWxsO1xuXHR2YXIgbGFzdFByZWZpeExpbmUgPSAwO1xuXHR2YXIgbnVtTGluZXMgPSBjbS5saW5lQ291bnQoKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBudW1MaW5lczsgaSsrKSB7XG5cdFx0dmFyIGZpcnN0VG9rZW4gPSBnZXROZXh0Tm9uV3NUb2tlbihjbSwgaSk7XG5cdFx0aWYgKGZpcnN0VG9rZW4gIT0gbnVsbFxuXHRcdFx0XHQmJiAoZmlyc3RUb2tlbi5zdHJpbmcgPT0gXCJQUkVGSVhcIiB8fCBmaXJzdFRva2VuLnN0cmluZyA9PSBcIkJBU0VcIikpIHtcblx0XHRcdGxhc3RQcmVmaXggPSBmaXJzdFRva2VuO1xuXHRcdFx0bGFzdFByZWZpeExpbmUgPSBpO1xuXHRcdH1cblx0fVxuXG5cdGlmIChsYXN0UHJlZml4ID09IG51bGwpIHtcblx0XHRjbS5yZXBsYWNlUmFuZ2UoXCJQUkVGSVggXCIgKyBwcmVmaXggKyBcIlxcblwiLCB7XG5cdFx0XHRsaW5lIDogMCxcblx0XHRcdGNoIDogMFxuXHRcdH0pO1xuXHR9IGVsc2Uge1xuXHRcdHZhciBwcmV2aW91c0luZGVudCA9IGdldEluZGVudEZyb21MaW5lKGNtLCBsYXN0UHJlZml4TGluZSk7XG5cdFx0Y20ucmVwbGFjZVJhbmdlKFwiXFxuXCIgKyBwcmV2aW91c0luZGVudCArIFwiUFJFRklYIFwiICsgcHJlZml4LCB7XG5cdFx0XHRsaW5lIDogbGFzdFByZWZpeExpbmVcblx0XHR9KTtcblx0fVxufTtcblxuLyoqXG4gKiBHZXQgdGhlIHVzZWQgaW5kZW50YXRpb24gZm9yIGEgY2VydGFpbiBsaW5lXG4gKiBcbiAqIEBwYXJhbSBjbVxuICogQHBhcmFtIGxpbmVcbiAqIEBwYXJhbSBjaGFyTnVtYmVyXG4gKiBAcmV0dXJuc1xuICovXG52YXIgZ2V0SW5kZW50RnJvbUxpbmUgPSBmdW5jdGlvbihjbSwgbGluZSwgY2hhck51bWJlcikge1xuXHRpZiAoY2hhck51bWJlciA9PSB1bmRlZmluZWQpXG5cdFx0Y2hhck51bWJlciA9IDE7XG5cdHZhciB0b2tlbiA9IGNtLmdldFRva2VuQXQoe1xuXHRcdGxpbmUgOiBsaW5lLFxuXHRcdGNoIDogY2hhck51bWJlclxuXHR9KTtcblx0aWYgKHRva2VuID09IG51bGwgfHwgdG9rZW4gPT0gdW5kZWZpbmVkIHx8IHRva2VuLnR5cGUgIT0gXCJ3c1wiKSB7XG5cdFx0cmV0dXJuIFwiXCI7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRva2VuLnN0cmluZyArIGdldEluZGVudEZyb21MaW5lKGNtLCBsaW5lLCB0b2tlbi5lbmQgKyAxKTtcblx0fVxuXHQ7XG59O1xuXG52YXIgZ2V0TmV4dE5vbldzVG9rZW4gPSBmdW5jdGlvbihjbSwgbGluZU51bWJlciwgY2hhck51bWJlcikge1xuXHRpZiAoY2hhck51bWJlciA9PSB1bmRlZmluZWQpXG5cdFx0Y2hhck51bWJlciA9IDE7XG5cdHZhciB0b2tlbiA9IGNtLmdldFRva2VuQXQoe1xuXHRcdGxpbmUgOiBsaW5lTnVtYmVyLFxuXHRcdGNoIDogY2hhck51bWJlclxuXHR9KTtcblx0aWYgKHRva2VuID09IG51bGwgfHwgdG9rZW4gPT0gdW5kZWZpbmVkIHx8IHRva2VuLmVuZCA8IGNoYXJOdW1iZXIpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXHRpZiAodG9rZW4udHlwZSA9PSBcIndzXCIpIHtcblx0XHRyZXR1cm4gZ2V0TmV4dE5vbldzVG9rZW4oY20sIGxpbmVOdW1iZXIsIHRva2VuLmVuZCArIDEpO1xuXHR9XG5cdHJldHVybiB0b2tlbjtcbn07XG5cbnZhciBjbGVhckVycm9yID0gbnVsbDtcbnZhciBjaGVja1N5bnRheCA9IGZ1bmN0aW9uKGNtLCBkZWVwY2hlY2spIHtcblx0XG5cdGNtLnF1ZXJ5VmFsaWQgPSB0cnVlO1xuXHRpZiAoY2xlYXJFcnJvcikge1xuXHRcdGNsZWFyRXJyb3IoKTtcblx0XHRjbGVhckVycm9yID0gbnVsbDtcblx0fVxuXHRjbS5jbGVhckd1dHRlcihcImd1dHRlckVycm9yQmFyXCIpO1xuXHRcblx0dmFyIHN0YXRlID0gbnVsbDtcblx0Zm9yICh2YXIgbCA9IDA7IGwgPCBjbS5saW5lQ291bnQoKTsgKytsKSB7XG5cdFx0dmFyIHByZWNpc2UgPSBmYWxzZTtcblx0XHRpZiAoIWNtLnByZXZRdWVyeVZhbGlkKSB7XG5cdFx0XHQvLyB3ZSBkb24ndCB3YW50IGNhY2hlZCBpbmZvcm1hdGlvbiBpbiB0aGlzIGNhc2UsIG90aGVyd2lzZSB0aGVcblx0XHRcdC8vIHByZXZpb3VzIGVycm9yIHNpZ24gbWlnaHQgc3RpbGwgc2hvdyB1cCxcblx0XHRcdC8vIGV2ZW4gdGhvdWdoIHRoZSBzeW50YXggZXJyb3IgbWlnaHQgYmUgZ29uZSBhbHJlYWR5XG5cdFx0XHRwcmVjaXNlID0gdHJ1ZTtcblx0XHR9XG5cdFx0dmFyIHRva2VuID0gY20uZ2V0VG9rZW5BdCh7XG5cdFx0XHRsaW5lIDogbCxcblx0XHRcdGNoIDogY20uZ2V0TGluZShsKS5sZW5ndGhcblx0XHR9LCBwcmVjaXNlKTtcblx0XHR2YXIgc3RhdGUgPSB0b2tlbi5zdGF0ZTtcblx0XHRjbS5xdWVyeVR5cGUgPSBzdGF0ZS5xdWVyeVR5cGU7XG5cdFx0aWYgKHN0YXRlLk9LID09IGZhbHNlKSB7XG5cdFx0XHRpZiAoIWNtLm9wdGlvbnMuc3ludGF4RXJyb3JDaGVjaykge1xuXHRcdFx0XHQvL3RoZSBsaWJyYXJ5IHdlIHVzZSBhbHJlYWR5IG1hcmtzIGV2ZXJ5dGhpbmcgYXMgYmVpbmcgYW4gZXJyb3IuIE92ZXJ3cml0ZSB0aGlzIGNsYXNzIGF0dHJpYnV0ZS5cblx0XHRcdFx0JChjbS5nZXRXcmFwcGVyRWxlbWVudCkuZmluZChcIi5zcC1lcnJvclwiKS5jc3MoXCJjb2xvclwiLCBcImJsYWNrXCIpO1xuXHRcdFx0XHQvL3dlIGRvbid0IHdhbnQgdG8gZ3V0dGVyIGVycm9yLCBzbyByZXR1cm5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGVycm9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0ZXJyb3IuaW5uZXJIVE1MID0gXCImcmFycjtcIjtcblx0XHRcdGVycm9yLmNsYXNzTmFtZSA9IFwiZ3V0dGVyRXJyb3JcIjtcblx0XHRcdGNtLnNldEd1dHRlck1hcmtlcihsLCBcImd1dHRlckVycm9yQmFyXCIsIGVycm9yKTtcblx0XHRcdGNsZWFyRXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y20ubWFya1RleHQoe1xuXHRcdFx0XHRcdGxpbmUgOiBsLFxuXHRcdFx0XHRcdGNoIDogc3RhdGUuZXJyb3JTdGFydFBvc1xuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0bGluZSA6IGwsXG5cdFx0XHRcdFx0Y2ggOiBzdGF0ZS5lcnJvckVuZFBvc1xuXHRcdFx0XHR9LCBcInNwLWVycm9yXCIpO1xuXHRcdFx0fTtcblx0XHRcdGNtLnF1ZXJ5VmFsaWQgPSBmYWxzZTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRjbS5wcmV2UXVlcnlWYWxpZCA9IGNtLnF1ZXJ5VmFsaWQ7XG5cdGlmIChkZWVwY2hlY2spIHtcblx0XHRpZiAoc3RhdGUgIT0gbnVsbCAmJiBzdGF0ZS5zdGFjayAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHZhciBzdGFjayA9IHN0YXRlLnN0YWNrLCBsZW4gPSBzdGF0ZS5zdGFjay5sZW5ndGg7XG5cdFx0XHQvLyBCZWNhdXNlIGluY3JlbWVudGFsIHBhcnNlciBkb2Vzbid0IHJlY2VpdmUgZW5kLW9mLWlucHV0XG5cdFx0XHQvLyBpdCBjYW4ndCBjbGVhciBzdGFjaywgc28gd2UgaGF2ZSB0byBjaGVjayB0aGF0IHdoYXRldmVyXG5cdFx0XHQvLyBpcyBsZWZ0IG9uIHRoZSBzdGFjayBpcyBuaWxsYWJsZVxuXHRcdFx0aWYgKGxlbiA+IDEpXG5cdFx0XHRcdGNtLnF1ZXJ5VmFsaWQgPSBmYWxzZTtcblx0XHRcdGVsc2UgaWYgKGxlbiA9PSAxKSB7XG5cdFx0XHRcdGlmIChzdGFja1swXSAhPSBcInNvbHV0aW9uTW9kaWZpZXJcIlxuXHRcdFx0XHRcdFx0JiYgc3RhY2tbMF0gIT0gXCI/bGltaXRPZmZzZXRDbGF1c2VzXCJcblx0XHRcdFx0XHRcdCYmIHN0YWNrWzBdICE9IFwiP29mZnNldENsYXVzZVwiKVxuXHRcdFx0XHRcdGNtLnF1ZXJ5VmFsaWQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG4vKipcbiAqIFN0YXRpYyBVdGlsc1xuICovXG4vLyBmaXJzdCB0YWtlIGFsbCBDb2RlTWlycm9yIHJlZmVyZW5jZXMgYW5kIHN0b3JlIHRoZW0gaW4gdGhlIFlBU1FFIG9iamVjdFxuJC5leHRlbmQocm9vdCwgQ29kZU1pcnJvcik7XG5cbnJvb3QucG9zaXRpb25BYnNvbHV0ZUl0ZW1zID0gZnVuY3Rpb24oY20pIHtcblx0dmFyIHNjcm9sbEJhciA9ICQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkuZmluZChcIi5Db2RlTWlycm9yLXZzY3JvbGxiYXJcIik7XG5cdHZhciBvZmZzZXQgPSAwO1xuXHRpZiAoc2Nyb2xsQmFyLmlzKFwiOnZpc2libGVcIikpIHtcblx0XHRvZmZzZXQgPSBzY3JvbGxCYXIub3V0ZXJXaWR0aCgpO1xuXHR9XG5cdHZhciBjb21wbGV0aW9uTm90aWZpY2F0aW9uID0gJChjbS5nZXRXcmFwcGVyRWxlbWVudCgpKS5maW5kKFwiLmNvbXBsZXRpb25Ob3RpZmljYXRpb25cIik7XG5cdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uLmlzKFwiOnZpc2libGVcIikpIGNvbXBsZXRpb25Ob3RpZmljYXRpb24uY3NzKFwicmlnaHRcIiwgb2Zmc2V0KTtcblx0dmFyIGJ1dHRvbnMgPSAkKGNtLmdldFdyYXBwZXJFbGVtZW50KCkpLmZpbmQoXCIueWFzcWVfYnV0dG9uc1wiKTtcblx0aWYgKGJ1dHRvbnMuaXMoXCI6dmlzaWJsZVwiKSkgYnV0dG9ucy5jc3MoXCJyaWdodFwiLCBvZmZzZXQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBzaGFyZSBsaW5rXG4gKiBcbiAqIEBtZXRob2QgWUFTUUUuY3JlYXRlU2hhcmVMaW5rXG4gKiBAcGFyYW0ge2RvY30gWUFTUUUgZG9jdW1lbnRcbiAqIEBkZWZhdWx0IHtxdWVyeTogZG9jLmdldFZhbHVlKCl9XG4gKiBAcmV0dXJuIG9iamVjdFxuICovXG5yb290LmNyZWF0ZVNoYXJlTGluayA9IGZ1bmN0aW9uKGNtKSB7XG5cdHJldHVybiB7cXVlcnk6IGNtLmdldFZhbHVlKCl9O1xufTtcblxuLyoqXG4gKiBDb25zdW1lIHRoZSBzaGFyZSBsaW5rLCBieSBwYXJzaW5nIHRoZSBkb2N1bWVudCBVUkwgZm9yIHBvc3NpYmxlIHlhc3FlIGFyZ3VtZW50cywgYW5kIHNldHRpbmcgdGhlIGFwcHJvcHJpYXRlIHZhbHVlcyBpbiB0aGUgWUFTUUUgZG9jXG4gKiBcbiAqIEBtZXRob2QgWUFTUUUuY29uc3VtZVNoYXJlTGlua1xuICogQHBhcmFtIHtkb2N9IFlBU1FFIGRvY3VtZW50XG4gKi9cbnJvb3QuY29uc3VtZVNoYXJlTGluayA9IGZ1bmN0aW9uKGNtKSB7XG5cdHJlcXVpcmUoXCIuLi9saWIvZGVwYXJhbS5qc1wiKTtcblx0dmFyIHVybFBhcmFtcyA9ICQuZGVwYXJhbSh3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cmluZygxKSk7XG5cdGlmICh1cmxQYXJhbXMucXVlcnkpIHtcblx0XHRjbS5zZXRWYWx1ZSh1cmxQYXJhbXMucXVlcnkpO1xuXHR9XG59O1xuXG5yb290LmRyYXdCdXR0b25zID0gZnVuY3Rpb24oY20pIHtcblx0dmFyIGhlYWRlciA9ICQoXCI8ZGl2IGNsYXNzPSd5YXNxZV9idXR0b25zJz48L2Rpdj5cIikuYXBwZW5kVG8oJChjbS5nZXRXcmFwcGVyRWxlbWVudCgpKSk7XG5cdFxuXHRpZiAoY20ub3B0aW9ucy5jcmVhdGVTaGFyZUxpbmspIHtcblx0XHRcblx0XHR2YXIgc3ZnU2hhcmUgPSByZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLmltZ3MuZ2V0RWxlbWVudCh7aWQ6IFwic2hhcmVcIiwgd2lkdGg6IFwiMzBweFwiLCBoZWlnaHQ6IFwiMzBweFwifSk7XG5cdFx0c3ZnU2hhcmUuY2xpY2soZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHR2YXIgcG9wdXAgPSAkKFwiPGRpdiBjbGFzcz0neWFzcWVfc2hhcmVQb3B1cCc+PC9kaXY+XCIpLmFwcGVuZFRvKGhlYWRlcik7XG5cdFx0XHQkKCdodG1sJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChwb3B1cCkgcG9wdXAucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cG9wdXAuY2xpY2soZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHR9KTtcblx0XHRcdHZhciB0ZXh0QXJlYUxpbmsgPSAkKFwiPHRleHRhcmVhPjwvdGV4dGFyZWE+XCIpLnZhbChsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0ICsgbG9jYXRpb24ucGF0aG5hbWUgKyBcIj9cIiArICQucGFyYW0oY20ub3B0aW9ucy5jcmVhdGVTaGFyZUxpbmsoY20pKSk7XG5cdFx0XHRcblx0XHRcdHRleHRBcmVhTGluay5mb2N1cyhmdW5jdGlvbigpIHtcblx0XHRcdCAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuXHRcdFx0ICAgICR0aGlzLnNlbGVjdCgpO1xuXG5cdFx0XHQgICAgLy8gV29yayBhcm91bmQgQ2hyb21lJ3MgbGl0dGxlIHByb2JsZW1cblx0XHRcdCAgICAkdGhpcy5tb3VzZXVwKGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgICAgICAvLyBQcmV2ZW50IGZ1cnRoZXIgbW91c2V1cCBpbnRlcnZlbnRpb25cblx0XHRcdCAgICAgICAgJHRoaXMudW5iaW5kKFwibW91c2V1cFwiKTtcblx0XHRcdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHRcdFx0ICAgIH0pO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHBvcHVwLmVtcHR5KCkuYXBwZW5kKHRleHRBcmVhTGluayk7XG5cdFx0XHR2YXIgcG9zaXRpb25zID0gc3ZnU2hhcmUucG9zaXRpb24oKTtcblx0XHRcdHBvcHVwLmNzcyhcInRvcFwiLCAocG9zaXRpb25zLnRvcCArIHN2Z1NoYXJlLm91dGVySGVpZ2h0KCkpICsgXCJweFwiKS5jc3MoXCJsZWZ0XCIsICgocG9zaXRpb25zLmxlZnQgKyBzdmdTaGFyZS5vdXRlcldpZHRoKCkpIC0gcG9wdXAub3V0ZXJXaWR0aCgpKSArIFwicHhcIik7XG5cdFx0fSlcblx0XHQuYWRkQ2xhc3MoXCJ5YXNxZV9zaGFyZVwiKVxuXHRcdC5hdHRyKFwidGl0bGVcIiwgXCJTaGFyZSB5b3VyIHF1ZXJ5XCIpXG5cdFx0LmFwcGVuZFRvKGhlYWRlcik7XG5cdFx0XG5cdH1cblxuXHRpZiAoY20ub3B0aW9ucy5zcGFycWwuc2hvd1F1ZXJ5QnV0dG9uKSB7XG5cdFx0dmFyIGhlaWdodCA9IDQwO1xuXHRcdHZhciB3aWR0aCA9IDQwO1xuXHRcdCQoXCI8ZGl2IGNsYXNzPSd5YXNxZV9xdWVyeUJ1dHRvbic+PC9kaXY+XCIpXG5cdFx0IFx0LmNsaWNrKGZ1bmN0aW9uKCl7XG5cdFx0IFx0XHRpZiAoJCh0aGlzKS5oYXNDbGFzcyhcInF1ZXJ5X2J1c3lcIikpIHtcblx0XHQgXHRcdFx0aWYgKGNtLnhocikgY20ueGhyLmFib3J0KCk7XG5cdFx0IFx0XHRcdHJvb3QudXBkYXRlUXVlcnlCdXR0b24oY20pO1xuXHRcdCBcdFx0fSBlbHNlIHtcblx0XHQgXHRcdFx0Y20ucXVlcnkoKTtcblx0XHQgXHRcdH1cblx0XHQgXHR9KVxuXHRcdCBcdC5oZWlnaHQoaGVpZ2h0KVxuXHRcdCBcdC53aWR0aCh3aWR0aClcblx0XHQgXHQuYXBwZW5kVG8oaGVhZGVyKTtcblx0XHRyb290LnVwZGF0ZVF1ZXJ5QnV0dG9uKGNtKTtcblx0fVxuXHRcbn07XG5cblxudmFyIHF1ZXJ5QnV0dG9uSWRzID0ge1xuXHRcImJ1c3lcIjogXCJsb2FkZXJcIixcblx0XCJ2YWxpZFwiOiBcInF1ZXJ5XCIsXG5cdFwiZXJyb3JcIjogXCJxdWVyeUludmFsaWRcIlxufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHF1ZXJ5IGJ1dHRvbiBkZXBlbmRpbmcgb24gY3VycmVudCBxdWVyeSBzdGF0dXMuIElmIG5vIHF1ZXJ5IHN0YXR1cyBpcyBwYXNzZWQgdmlhIHRoZSBwYXJhbWV0ZXIsIGl0IGF1dG8tZGV0ZWN0cyB0aGUgY3VycmVudCBxdWVyeSBzdGF0dXNcbiAqIFxuICogQHBhcmFtIHtkb2N9IFlBU1FFIGRvY3VtZW50XG4gKiBAcGFyYW0gc3RhdHVzIHtzdHJpbmd8bnVsbCwgXCJidXN5XCJ8XCJ2YWxpZFwifFwiZXJyb3JcIn1cbiAqL1xucm9vdC51cGRhdGVRdWVyeUJ1dHRvbiA9IGZ1bmN0aW9uKGNtLCBzdGF0dXMpIHtcblx0dmFyIHF1ZXJ5QnV0dG9uID0gJChjbS5nZXRXcmFwcGVyRWxlbWVudCgpKS5maW5kKFwiLnlhc3FlX3F1ZXJ5QnV0dG9uXCIpO1xuXHRpZiAocXVlcnlCdXR0b24ubGVuZ3RoID09IDApIHJldHVybjsvL25vIHF1ZXJ5IGJ1dHRvbiBkcmF3blxuXHRcblx0Ly9kZXRlY3Qgc3RhdHVzXG5cdGlmICghc3RhdHVzKSB7XG5cdFx0c3RhdHVzID0gXCJ2YWxpZFwiO1xuXHRcdGlmIChjbS5xdWVyeVZhbGlkID09PSBmYWxzZSkgc3RhdHVzID0gXCJlcnJvclwiO1xuXHR9XG5cdGlmIChzdGF0dXMgIT0gY20ucXVlcnlTdGF0dXMgJiYgKHN0YXR1cyA9PSBcImJ1c3lcIiB8fCBzdGF0dXM9PVwidmFsaWRcIiB8fCBzdGF0dXMgPT0gXCJlcnJvclwiKSkge1xuXHRcdHF1ZXJ5QnV0dG9uXG5cdFx0XHQuZW1wdHkoKVxuXHRcdFx0LnJlbW92ZUNsYXNzIChmdW5jdGlvbiAoaW5kZXgsIGNsYXNzTmFtZXMpIHtcblx0XHRcdFx0cmV0dXJuIGNsYXNzTmFtZXMuc3BsaXQoXCIgXCIpLmZpbHRlcihmdW5jdGlvbihjKSB7XG5cdFx0XHRcdFx0Ly9yZW1vdmUgY2xhc3NuYW1lIGZyb20gcHJldmlvdXMgc3RhdHVzXG5cdFx0XHRcdCAgICByZXR1cm4gYy5pbmRleE9mKFwicXVlcnlfXCIpID09IDA7XG5cdFx0XHRcdH0pLmpvaW4oXCIgXCIpO1xuXHRcdFx0fSlcblx0XHRcdC5hZGRDbGFzcyhcInF1ZXJ5X1wiICsgc3RhdHVzKVxuXHRcdFx0LmFwcGVuZChyZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLmltZ3MuZ2V0RWxlbWVudCh7aWQ6IHF1ZXJ5QnV0dG9uSWRzW3N0YXR1c10sIHdpZHRoOiBcIjEwMCVcIiwgaGVpZ2h0OiBcIjEwMCVcIn0pKTtcblx0XHRjbS5xdWVyeVN0YXR1cyA9IHN0YXR1cztcblx0fVxufTtcbi8qKlxuICogSW5pdGlhbGl6ZSBZQVNRRSBmcm9tIGFuIGV4aXN0aW5nIHRleHQgYXJlYSAoc2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjZnJvbVRleHRBcmVhIGZvciBtb3JlIGluZm8pXG4gKiBcbiAqIEBtZXRob2QgWUFTUUUuZnJvbVRleHRBcmVhXG4gKiBAcGFyYW0gdGV4dEFyZWEge0RPTSBlbGVtZW50fVxuICogQHBhcmFtIGNvbmZpZyB7b2JqZWN0fVxuICogQHJldHVybnMge2RvY30gWUFTUUUgZG9jdW1lbnRcbiAqL1xucm9vdC5mcm9tVGV4dEFyZWEgPSBmdW5jdGlvbih0ZXh0QXJlYUVsLCBjb25maWcpIHtcblx0Y29uZmlnID0gZXh0ZW5kQ29uZmlnKGNvbmZpZyk7XG5cdHZhciBjbSA9IGV4dGVuZENtSW5zdGFuY2UoQ29kZU1pcnJvci5mcm9tVGV4dEFyZWEodGV4dEFyZWFFbCwgY29uZmlnKSk7XG5cdHBvc3RQcm9jZXNzQ21FbGVtZW50KGNtKTtcblx0cmV0dXJuIGNtO1xufTtcblxuLyoqXG4gKiBGZXRjaCBhbGwgdGhlIHVzZWQgdmFyaWFibGVzIG5hbWVzIGZyb20gdGhpcyBxdWVyeVxuICogXG4gKiBAbWV0aG9kIFlBU1FFLmdldEFsbFZhcmlhYmxlTmFtZXNcbiAqIEBwYXJhbSB7ZG9jfSBZQVNRRSBkb2N1bWVudFxuICogQHBhcmFtIHRva2VuIHtvYmplY3R9XG4gKiBAcmV0dXJucyB2YXJpYWJsZU5hbWVzIHthcnJheX1cbiAqL1xuXG5yb290LmF1dG9jb21wbGV0ZVZhcmlhYmxlcyA9IGZ1bmN0aW9uKGNtLCB0b2tlbikge1xuXHRpZiAodG9rZW4udHJpbSgpLmxlbmd0aCA9PSAwKSByZXR1cm4gW107Ly9ub3RoaW5nIHRvIGF1dG9jb21wbGV0ZVxuXHR2YXIgZGlzdGluY3RWYXJzID0ge307XG5cdC8vZG8gdGhpcyBvdXRzaWRlIG9mIGNvZGVtaXJyb3IuIEkgZXhwZWN0IGpxdWVyeSB0byBiZSBmYXN0ZXIgaGVyZSAoanVzdCBmaW5kaW5nIGRvbSBlbGVtZW50cyB3aXRoIGNsYXNzbmFtZXMpXG5cdCQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkuZmluZChcIi5jbS1hdG9tXCIpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHZhcmlhYmxlID0gdGhpcy5pbm5lckhUTUw7XG5cdFx0aWYgKHZhcmlhYmxlLmluZGV4T2YoXCI/XCIpID09IDApIHtcblx0XHRcdC8vb2ssIGxldHMgY2hlY2sgaWYgdGhlIG5leHQgZWxlbWVudCBpbiB0aGUgZGl2IGlzIGFuIGF0b20gYXMgd2VsbC4gSW4gdGhhdCBjYXNlLCB0aGV5IGJlbG9uZyB0b2dldGhlciAobWF5IGhhcHBlbiBzb21ldGltZXMgd2hlbiBxdWVyeSBpcyBub3Qgc3ludGFjdGljYWxseSB2YWxpZClcblx0XHRcdHZhciBuZXh0RWwgPSAkKHRoaXMpLm5leHQoKTtcblx0XHRcdHZhciBuZXh0RWxDbGFzcyA9IG5leHRFbC5hdHRyKCdjbGFzcycpO1xuXHRcdFx0aWYgKG5leHRFbENsYXNzICYmIG5leHRFbC5hdHRyKCdjbGFzcycpLmluZGV4T2YoXCJjbS1hdG9tXCIpID49IDApIHtcblx0XHRcdFx0dmFyaWFibGUgKz0gbmV4dEVsLnRleHQoKTtcdFx0XHRcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly9za2lwIHNpbmdsZSBxdWVzdGlvbm1hcmtzXG5cdFx0XHRpZiAodmFyaWFibGUubGVuZ3RoIDw9IDEpIHJldHVybjtcblx0XHRcdFxuXHRcdFx0Ly9pdCBzaG91bGQgbWF0Y2ggb3VyIHRva2VuIG9mY291cnNlXG5cdFx0XHRpZiAodmFyaWFibGUuaW5kZXhPZih0b2tlbikgIT09IDApIHJldHVybjtcblx0XHRcdFxuXHRcdFx0Ly9za2lwIGV4YWN0IG1hdGNoZXNcblx0XHRcdGlmICh2YXJpYWJsZSA9PSB0b2tlbikgcmV0dXJuO1xuXHRcdFx0XG5cdFx0XHQvL3N0b3JlIGluIG1hcCBzbyB3ZSBoYXZlIGEgdW5pcXVlIGxpc3QgXG5cdFx0XHRkaXN0aW5jdFZhcnNbdmFyaWFibGVdID0gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0XG5cdFx0fVxuXHR9KTtcblx0dmFyIHZhcmlhYmxlcyA9IFtdO1xuXHRmb3IgKHZhciB2YXJpYWJsZSBpbiBkaXN0aW5jdFZhcnMpIHtcblx0XHR2YXJpYWJsZXMucHVzaCh2YXJpYWJsZSk7XG5cdH1cblx0dmFyaWFibGVzLnNvcnQoKTtcblx0cmV0dXJuIHZhcmlhYmxlcztcbn07XG4vKipcbiAqIEZldGNoIHByZWZpeGVzIGZyb20gcHJlZml4LmNjLCBhbmQgc3RvcmUgaW4gdGhlIFlBU1FFIG9iamVjdFxuICogXG4gKiBAcGFyYW0gZG9jIHtZQVNRRX1cbiAqIEBtZXRob2QgWUFTUUUuZmV0Y2hGcm9tUHJlZml4Q2NcbiAqL1xucm9vdC5mZXRjaEZyb21QcmVmaXhDYyA9IGZ1bmN0aW9uKGNtKSB7XG5cdCQuZ2V0KFwiaHR0cDovL3ByZWZpeC5jYy9wb3B1bGFyL2FsbC5maWxlLmpzb25cIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdHZhciBwcmVmaXhBcnJheSA9IFtdO1xuXHRcdGZvciAoIHZhciBwcmVmaXggaW4gZGF0YSkge1xuXHRcdFx0aWYgKHByZWZpeCA9PSBcImJpZlwiKVxuXHRcdFx0XHRjb250aW51ZTsvLyBza2lwIHRoaXMgb25lISBzZWUgIzIzMVxuXHRcdFx0dmFyIGNvbXBsZXRlU3RyaW5nID0gcHJlZml4ICsgXCI6IDxcIiArIGRhdGFbcHJlZml4XSArIFwiPlwiO1xuXHRcdFx0cHJlZml4QXJyYXkucHVzaChjb21wbGV0ZVN0cmluZyk7Ly8gdGhlIGFycmF5IHdlIHdhbnQgdG8gc3RvcmUgaW4gbG9jYWxzdG9yYWdlXG5cdFx0fVxuXHRcdFxuXHRcdHByZWZpeEFycmF5LnNvcnQoKTtcblx0XHRjbS5zdG9yZUJ1bGtDb21wbGV0aW9ucyhcInByZWZpeGVzXCIsIHByZWZpeEFycmF5KTtcblx0fSk7XG59O1xuLyoqXG4gKiBHZXQgYWNjZXB0IGhlYWRlciBmb3IgdGhpcyBwYXJ0aWN1bGFyIHF1ZXJ5LiBHZXQgSlNPTiBmb3IgcmVndWxhciBxdWVyaWVzLCBhbmQgdGV4dC9wbGFpbiBmb3IgdXBkYXRlIHF1ZXJpZXNcbiAqIFxuICogQHBhcmFtIGRvYyB7WUFTUUV9XG4gKiBAbWV0aG9kIFlBU1FFLmdldEFjY2VwdEhlYWRlclxuICovXG5yb290LmdldEFjY2VwdEhlYWRlciA9IGZ1bmN0aW9uKGNtKSB7XG5cdGlmIChjbS5nZXRRdWVyeU1vZGUoKSA9PSBcInVwZGF0ZVwiKSB7XG5cdFx0cmV0dXJuIFwidGV4dC9wbGFpblwiO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBcImFwcGxpY2F0aW9uL3NwYXJxbC1yZXN1bHRzK2pzb25cIjtcblx0fVxufTtcbi8qKlxuICogRGV0ZXJtaW5lIHVuaXF1ZSBJRCBvZiB0aGUgWUFTUUUgb2JqZWN0LiBVc2VmdWwgd2hlbiBzZXZlcmFsIG9iamVjdHMgYXJlXG4gKiBsb2FkZWQgb24gdGhlIHNhbWUgcGFnZSwgYW5kIGFsbCBoYXZlICdwZXJzaXN0ZW5jeScgZW5hYmxlZC4gQ3VycmVudGx5LCB0aGVcbiAqIElEIGlzIGRldGVybWluZWQgYnkgc2VsZWN0aW5nIHRoZSBuZWFyZXN0IHBhcmVudCBpbiB0aGUgRE9NIHdpdGggYW4gSUQgc2V0XG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQG1ldGhvZCBZQVNRRS5kZXRlcm1pbmVJZFxuICovXG5yb290LmRldGVybWluZUlkID0gZnVuY3Rpb24oY20pIHtcblx0cmV0dXJuICQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkuY2xvc2VzdCgnW2lkXScpLmF0dHIoJ2lkJyk7XG59O1xuXG5yb290LnN0b3JlUXVlcnkgPSBmdW5jdGlvbihjbSkge1xuXHR2YXIgc3RvcmFnZUlkID0gZ2V0UGVyc2lzdGVuY3lJZChjbSwgY20ub3B0aW9ucy5wZXJzaXN0ZW50KTtcblx0aWYgKHN0b3JhZ2VJZCkge1xuXHRcdHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuc3RvcmFnZS5zZXQoc3RvcmFnZUlkLCBjbS5nZXRWYWx1ZSgpLCBcIm1vbnRoXCIpO1xuXHR9XG59O1xucm9vdC5jb21tZW50TGluZXMgPSBmdW5jdGlvbihjbSkge1xuXHR2YXIgc3RhcnRMaW5lID0gY20uZ2V0Q3Vyc29yKHRydWUpLmxpbmU7XG5cdHZhciBlbmRMaW5lID0gY20uZ2V0Q3Vyc29yKGZhbHNlKS5saW5lO1xuXHR2YXIgbWluID0gTWF0aC5taW4oc3RhcnRMaW5lLCBlbmRMaW5lKTtcblx0dmFyIG1heCA9IE1hdGgubWF4KHN0YXJ0TGluZSwgZW5kTGluZSk7XG5cdFxuXHQvLyBpZiBhbGwgbGluZXMgc3RhcnQgd2l0aCAjLCByZW1vdmUgdGhpcyBjaGFyLiBPdGhlcndpc2UgYWRkIHRoaXMgY2hhclxuXHR2YXIgbGluZXNBcmVDb21tZW50ZWQgPSB0cnVlO1xuXHRmb3IgKHZhciBpID0gbWluOyBpIDw9IG1heDsgaSsrKSB7XG5cdFx0dmFyIGxpbmUgPSBjbS5nZXRMaW5lKGkpO1xuXHRcdGlmIChsaW5lLmxlbmd0aCA9PSAwIHx8IGxpbmUuc3Vic3RyaW5nKDAsIDEpICE9IFwiI1wiKSB7XG5cdFx0XHRsaW5lc0FyZUNvbW1lbnRlZCA9IGZhbHNlO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cdGZvciAodmFyIGkgPSBtaW47IGkgPD0gbWF4OyBpKyspIHtcblx0XHRpZiAobGluZXNBcmVDb21tZW50ZWQpIHtcblx0XHRcdC8vIGxpbmVzIGFyZSBjb21tZW50ZWQsIHNvIHJlbW92ZSBjb21tZW50c1xuXHRcdFx0Y20ucmVwbGFjZVJhbmdlKFwiXCIsIHtcblx0XHRcdFx0bGluZSA6IGksXG5cdFx0XHRcdGNoIDogMFxuXHRcdFx0fSwge1xuXHRcdFx0XHRsaW5lIDogaSxcblx0XHRcdFx0Y2ggOiAxXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gTm90IGFsbCBsaW5lcyBhcmUgY29tbWVudGVkLCBzbyBhZGQgY29tbWVudHNcblx0XHRcdGNtLnJlcGxhY2VSYW5nZShcIiNcIiwge1xuXHRcdFx0XHRsaW5lIDogaSxcblx0XHRcdFx0Y2ggOiAwXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxufTtcblxucm9vdC5jb3B5TGluZVVwID0gZnVuY3Rpb24oY20pIHtcblx0dmFyIGN1cnNvciA9IGNtLmdldEN1cnNvcigpO1xuXHR2YXIgbGluZUNvdW50ID0gY20ubGluZUNvdW50KCk7XG5cdC8vIEZpcnN0IGNyZWF0ZSBuZXcgZW1wdHkgbGluZSBhdCBlbmQgb2YgdGV4dFxuXHRjbS5yZXBsYWNlUmFuZ2UoXCJcXG5cIiwge1xuXHRcdGxpbmUgOiBsaW5lQ291bnQgLSAxLFxuXHRcdGNoIDogY20uZ2V0TGluZShsaW5lQ291bnQgLSAxKS5sZW5ndGhcblx0fSk7XG5cdC8vIENvcHkgYWxsIGxpbmVzIHRvIHRoZWlyIG5leHQgbGluZVxuXHRmb3IgKHZhciBpID0gbGluZUNvdW50OyBpID4gY3Vyc29yLmxpbmU7IGktLSkge1xuXHRcdHZhciBsaW5lID0gY20uZ2V0TGluZShpIC0gMSk7XG5cdFx0Y20ucmVwbGFjZVJhbmdlKGxpbmUsIHtcblx0XHRcdGxpbmUgOiBpLFxuXHRcdFx0Y2ggOiAwXG5cdFx0fSwge1xuXHRcdFx0bGluZSA6IGksXG5cdFx0XHRjaCA6IGNtLmdldExpbmUoaSkubGVuZ3RoXG5cdFx0fSk7XG5cdH1cbn07XG5yb290LmNvcHlMaW5lRG93biA9IGZ1bmN0aW9uKGNtKSB7XG5cdHJvb3QuY29weUxpbmVVcChjbSk7XG5cdC8vIE1ha2Ugc3VyZSBjdXJzb3IgZ29lcyBvbmUgZG93biAod2UgYXJlIGNvcHlpbmcgZG93bndhcmRzKVxuXHR2YXIgY3Vyc29yID0gY20uZ2V0Q3Vyc29yKCk7XG5cdGN1cnNvci5saW5lKys7XG5cdGNtLnNldEN1cnNvcihjdXJzb3IpO1xufTtcbnJvb3QuZG9BdXRvRm9ybWF0ID0gZnVuY3Rpb24oY20pIHtcblx0aWYgKGNtLnNvbWV0aGluZ1NlbGVjdGVkKCkpIHtcblx0XHR2YXIgdG8gPSB7XG5cdFx0XHRsaW5lIDogY20uZ2V0Q3Vyc29yKGZhbHNlKS5saW5lLFxuXHRcdFx0Y2ggOiBjbS5nZXRTZWxlY3Rpb24oKS5sZW5ndGhcblx0XHR9O1xuXHRcdGF1dG9Gb3JtYXRSYW5nZShjbSwgY20uZ2V0Q3Vyc29yKHRydWUpLCB0byk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIHRvdGFsTGluZXMgPSBjbS5saW5lQ291bnQoKTtcblx0XHR2YXIgdG90YWxDaGFycyA9IGNtLmdldFRleHRBcmVhKCkudmFsdWUubGVuZ3RoO1xuXHRcdGF1dG9Gb3JtYXRSYW5nZShjbSwge1xuXHRcdFx0bGluZSA6IDAsXG5cdFx0XHRjaCA6IDBcblx0XHR9LCB7XG5cdFx0XHRsaW5lIDogdG90YWxMaW5lcyxcblx0XHRcdGNoIDogdG90YWxDaGFyc1xuXHRcdH0pO1xuXHR9XG5cbn07XG5cbnJvb3QuZXhlY3V0ZVF1ZXJ5ID0gZnVuY3Rpb24oY20sIGNhbGxiYWNrT3JDb25maWcpIHtcblx0dmFyIGNhbGxiYWNrID0gKHR5cGVvZiBjYWxsYmFja09yQ29uZmlnID09IFwiZnVuY3Rpb25cIiA/IGNhbGxiYWNrT3JDb25maWc6IG51bGwpO1xuXHR2YXIgY29uZmlnID0gKHR5cGVvZiBjYWxsYmFja09yQ29uZmlnID09IFwib2JqZWN0XCIgPyBjYWxsYmFja09yQ29uZmlnIDoge30pO1xuXHR2YXIgcXVlcnlNb2RlID0gY20uZ2V0UXVlcnlNb2RlKCk7XG5cdGlmIChjbS5vcHRpb25zLnNwYXJxbClcblx0XHRjb25maWcgPSAkLmV4dGVuZCh7fSwgY20ub3B0aW9ucy5zcGFycWwsIGNvbmZpZyk7XG5cblx0aWYgKCFjb25maWcuZW5kcG9pbnQgfHwgY29uZmlnLmVuZHBvaW50Lmxlbmd0aCA9PSAwKVxuXHRcdHJldHVybjsvLyBub3RoaW5nIHRvIHF1ZXJ5IVxuXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplIGFqYXggY29uZmlnXG5cdCAqL1xuXHR2YXIgYWpheENvbmZpZyA9IHtcblx0XHR1cmwgOiAodHlwZW9mIGNvbmZpZy5lbmRwb2ludCA9PSBcImZ1bmN0aW9uXCI/IGNvbmZpZy5lbmRwb2ludChjbSk6IGNvbmZpZy5lbmRwb2ludCksXG5cdFx0dHlwZSA6ICh0eXBlb2YgY29uZmlnLnJlcXVlc3RNZXRob2QgPT0gXCJmdW5jdGlvblwiPyBjb25maWcucmVxdWVzdE1ldGhvZChjbSk6IGNvbmZpZy5yZXF1ZXN0TWV0aG9kKSxcblx0XHRkYXRhIDogW3tcblx0XHRcdG5hbWUgOiBxdWVyeU1vZGUsXG5cdFx0XHR2YWx1ZSA6IGNtLmdldFZhbHVlKClcblx0XHR9XSxcblx0XHRoZWFkZXJzIDoge1xuXHRcdFx0QWNjZXB0IDogKHR5cGVvZiBjb25maWcuYWNjZXB0SGVhZGVyID09IFwiZnVuY3Rpb25cIj8gY29uZmlnLmFjY2VwdEhlYWRlcihjbSk6IGNvbmZpZy5hY2NlcHRIZWFkZXIpLFxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogYWRkIGNvbXBsZXRlLCBiZWZvcmVzZW5kLCBldGMgaGFuZGxlcnMgKGlmIHNwZWNpZmllZClcblx0ICovXG5cdHZhciBoYW5kbGVyRGVmaW5lZCA9IGZhbHNlO1xuXHRpZiAoY29uZmlnLmhhbmRsZXJzKSB7XG5cdFx0Zm9yICggdmFyIGhhbmRsZXIgaW4gY29uZmlnLmhhbmRsZXJzKSB7XG5cdFx0XHRpZiAoY29uZmlnLmhhbmRsZXJzW2hhbmRsZXJdKSB7XG5cdFx0XHRcdGhhbmRsZXJEZWZpbmVkID0gdHJ1ZTtcblx0XHRcdFx0YWpheENvbmZpZ1toYW5kbGVyXSA9IGNvbmZpZy5oYW5kbGVyc1toYW5kbGVyXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0aWYgKCFoYW5kbGVyRGVmaW5lZCAmJiAhY2FsbGJhY2spXG5cdFx0cmV0dXJuOyAvLyBvaywgd2UgY2FuIHF1ZXJ5LCBidXQgaGF2ZSBubyBjYWxsYmFja3MuIGp1c3Qgc3RvcCBub3dcblx0XG5cdC8vIGlmIG9ubHkgY2FsbGJhY2sgaXMgcGFzc2VkIGFzIGFyZywgYWRkIHRoYXQgb24gYXMgJ29uQ29tcGxldGUnIGNhbGxiYWNrXG5cdGlmIChjYWxsYmFjaylcblx0XHRhamF4Q29uZmlnLmNvbXBsZXRlID0gY2FsbGJhY2s7XG5cblx0LyoqXG5cdCAqIGFkZCBuYW1lZCBncmFwaHMgdG8gYWpheCBjb25maWdcblx0ICovXG5cdGlmIChjb25maWcubmFtZWRHcmFwaHMgJiYgY29uZmlnLm5hbWVkR3JhcGhzLmxlbmd0aCA+IDApIHtcblx0XHR2YXIgYXJnTmFtZSA9IChxdWVyeU1vZGUgPT0gXCJxdWVyeVwiID8gXCJuYW1lZC1ncmFwaC11cmlcIjogXCJ1c2luZy1uYW1lZC1ncmFwaC11cmkgXCIpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29uZmlnLm5hbWVkR3JhcGhzLmxlbmd0aDsgaSsrKVxuXHRcdFx0YWpheENvbmZpZy5kYXRhLnB1c2goe1xuXHRcdFx0XHRuYW1lIDogYXJnTmFtZSxcblx0XHRcdFx0dmFsdWUgOiBjb25maWcubmFtZWRHcmFwaHNbaV1cblx0XHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBhZGQgZGVmYXVsdCBncmFwaHMgdG8gYWpheCBjb25maWdcblx0ICovXG5cdGlmIChjb25maWcuZGVmYXVsdEdyYXBocyAmJiBjb25maWcuZGVmYXVsdEdyYXBocy5sZW5ndGggPiAwKSB7XG5cdFx0dmFyIGFyZ05hbWUgPSAocXVlcnlNb2RlID09IFwicXVlcnlcIiA/IFwiZGVmYXVsdC1ncmFwaC11cmlcIjogXCJ1c2luZy1ncmFwaC11cmkgXCIpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29uZmlnLmRlZmF1bHRHcmFwaHMubGVuZ3RoOyBpKyspXG5cdFx0XHRhamF4Q29uZmlnLmRhdGEucHVzaCh7XG5cdFx0XHRcdG5hbWUgOiBhcmdOYW1lLFxuXHRcdFx0XHR2YWx1ZSA6IGNvbmZpZy5kZWZhdWx0R3JhcGhzW2ldXG5cdFx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBtZXJnZSBhZGRpdGlvbmFsIHJlcXVlc3QgaGVhZGVyc1xuXHQgKi9cblx0aWYgKGNvbmZpZy5oZWFkZXJzICYmICEkLmlzRW1wdHlPYmplY3QoY29uZmlnLmhlYWRlcnMpKVxuXHRcdCQuZXh0ZW5kKGFqYXhDb25maWcuaGVhZGVycywgY29uZmlnLmhlYWRlcnMpO1xuXHQvKipcblx0ICogYWRkIGFkZGl0aW9uYWwgcmVxdWVzdCBhcmdzXG5cdCAqL1xuXHRpZiAoY29uZmlnLmFyZ3MgJiYgY29uZmlnLmFyZ3MubGVuZ3RoID4gMCkgJC5tZXJnZShhamF4Q29uZmlnLmRhdGEsIGNvbmZpZy5hcmdzKTtcblx0cm9vdC51cGRhdGVRdWVyeUJ1dHRvbihjbSwgXCJidXN5XCIpO1xuXHRcblx0dmFyIHVwZGF0ZVF1ZXJ5QnV0dG9uID0gZnVuY3Rpb24oKSB7XG5cdFx0cm9vdC51cGRhdGVRdWVyeUJ1dHRvbihjbSk7XG5cdH07XG5cdC8vTWFrZSBzdXJlIHRoZSBxdWVyeSBidXR0b24gaXMgdXBkYXRlZCBhZ2FpbiBvbiBjb21wbGV0ZVxuXHRpZiAoYWpheENvbmZpZy5jb21wbGV0ZSkge1xuXHRcdHZhciBjdXN0b21Db21wbGV0ZSA9IGFqYXhDb25maWcuY29tcGxldGU7XG5cdFx0YWpheENvbmZpZy5jb21wbGV0ZSA9IGZ1bmN0aW9uKGFyZzEsIGFyZzIpIHtcblx0XHRcdGN1c3RvbUNvbXBsZXRlKGFyZzEsIGFyZzIpO1xuXHRcdFx0dXBkYXRlUXVlcnlCdXR0b24oKTtcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdGFqYXhDb25maWcuY29tcGxldGUgPSB1cGRhdGVRdWVyeUJ1dHRvbigpO1xuXHR9XG5cdGNtLnhociA9ICQuYWpheChhamF4Q29uZmlnKTtcbn07XG52YXIgY29tcGxldGlvbk5vdGlmaWNhdGlvbnMgPSB7fTtcblxuLyoqXG4gKiBTaG93IG5vdGlmaWNhdGlvblxuICogXG4gKiBAcGFyYW0gZG9jIHtZQVNRRX1cbiAqIEBwYXJhbSBhdXRvY29tcGxldGlvblR5cGUge3N0cmluZ31cbiAqIEBtZXRob2QgWUFTUUUuc2hvd0NvbXBsZXRpb25Ob3RpZmljYXRpb25cbiAqL1xucm9vdC5zaG93Q29tcGxldGlvbk5vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uKGNtLCB0eXBlKSB7XG5cdC8vb25seSBkcmF3IHdoZW4gdGhlIHVzZXIgbmVlZHMgdG8gdXNlIGEga2V5cHJlc3MgdG8gc3VtbW9uIGF1dG9jb21wbGV0aW9uc1xuXHRpZiAoIWNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmF1dG9zaG93KSB7XG5cdFx0aWYgKCFjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkgY29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV0gPSAkKFwiPGRpdiBjbGFzcz0nY29tcGxldGlvbk5vdGlmaWNhdGlvbic+PC9kaXY+XCIpO1xuXHRcdGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdXG5cdFx0XHQuc2hvdygpXG5cdFx0XHQudGV4dChcIlByZXNzIFwiICsgKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTWFjIE9TIFgnKSAhPSAtMT8gXCJDTURcIjogXCJDVFJMXCIpICsgXCIgLSA8c3BhY2ViYXI+IHRvIGF1dG9jb21wbGV0ZVwiKVxuXHRcdFx0LmFwcGVuZFRvKCQoY20uZ2V0V3JhcHBlckVsZW1lbnQoKSkpO1xuXHR9XG59O1xuXG4vKipcbiAqIEhpZGUgY29tcGxldGlvbiBub3RpZmljYXRpb25cbiAqIFxuICogQHBhcmFtIGRvYyB7WUFTUUV9XG4gKiBAcGFyYW0gYXV0b2NvbXBsZXRpb25UeXBlIHtzdHJpbmd9XG4gKiBAbWV0aG9kIFlBU1FFLmhpZGVDb21wbGV0aW9uTm90aWZpY2F0aW9uXG4gKi9cbnJvb3QuaGlkZUNvbXBsZXRpb25Ob3RpZmljYXRpb24gPSBmdW5jdGlvbihjbSwgdHlwZSkge1xuXHRpZiAoY29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV0pIHtcblx0XHRjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXS5oaWRlKCk7XG5cdH1cbn07XG5cblxuXG5yb290LmF1dG9Db21wbGV0ZSA9IGZ1bmN0aW9uKGNtLCBmcm9tQXV0b1Nob3cpIHtcblx0aWYgKGNtLnNvbWV0aGluZ1NlbGVjdGVkKCkpXG5cdFx0cmV0dXJuO1xuXHRpZiAoIWNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zKVxuXHRcdHJldHVybjtcblx0dmFyIHRyeUhpbnRUeXBlID0gZnVuY3Rpb24odHlwZSkge1xuXHRcdGlmIChmcm9tQXV0b1Nob3cgLy8gZnJvbSBhdXRvU2hvdywgaS5lLiB0aGlzIGdldHMgY2FsbGVkIGVhY2ggdGltZSB0aGUgZWRpdG9yIGNvbnRlbnQgY2hhbmdlc1xuXHRcdFx0XHQmJiAoIWNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmF1dG9TaG93IC8vIGF1dG9zaG93IGZvciAgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb24gaXMgLW5vdC0gZW5hYmxlZFxuXHRcdFx0XHR8fCBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5hc3luYykgLy8gYXN5bmMgaXMgZW5hYmxlZCAoZG9uJ3Qgd2FudCB0byByZS1kbyBhamF4LWxpa2UgcmVxdWVzdCBmb3IgZXZlcnkgZWRpdG9yIGNoYW5nZSlcblx0XHQpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgaGludENvbmZpZyA9IHtcblx0XHRcdGNsb3NlQ2hhcmFjdGVycyA6IC8oPz1hKWIvLFxuXHRcdFx0dHlwZSA6IHR5cGUsXG5cdFx0XHRjb21wbGV0ZVNpbmdsZTogZmFsc2Vcblx0XHR9O1xuXHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5hc3luYykge1xuXHRcdFx0aGludENvbmZpZy5hc3luYyA9IHRydWU7XG5cdFx0fVxuXHRcdHZhciB3cmFwcGVkSGludENhbGxiYWNrID0gZnVuY3Rpb24oY20sIGNhbGxiYWNrKSB7XG5cdFx0XHRyZXR1cm4gZ2V0Q29tcGxldGlvbkhpbnRzT2JqZWN0KGNtLCB0eXBlLCBjYWxsYmFjayk7XG5cdFx0fTtcblx0XHR2YXIgcmVzdWx0ID0gcm9vdC5zaG93SGludChjbSwgd3JhcHBlZEhpbnRDYWxsYmFjaywgaGludENvbmZpZyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cdGZvciAoIHZhciB0eXBlIGluIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zKSB7XG5cdFx0aWYgKCFjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5pc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uKSBjb250aW51ZTsgLy9ubyB3YXkgdG8gY2hlY2sgd2hldGhlciB3ZSBhcmUgaW4gYSB2YWxpZCBwb3NpdGlvblxuXHRcdFxuXHRcdGlmICghY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvbihjbSkpIHtcblx0XHRcdC8vaWYgbmVlZGVkLCBmaXJlIGhhbmRsZXIgZm9yIHdoZW4gd2UgYXJlIC1ub3QtIGluIHZhbGlkIGNvbXBsZXRpb24gcG9zaXRpb25cblx0XHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycyAmJiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVycy5pbnZhbGlkUG9zaXRpb24pIHtcblx0XHRcdFx0Y20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMuaW52YWxpZFBvc2l0aW9uKGNtLCB0eXBlKTtcblx0XHRcdH1cblx0XHRcdC8vbm90IGluIGEgdmFsaWQgcG9zaXRpb24sIHNvIGNvbnRpbnVlIHRvIG5leHQgY29tcGxldGlvbiBjYW5kaWRhdGUgdHlwZVxuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdC8vIHJ1biB2YWxpZCBwb3NpdGlvbiBoYW5kbGVyLCBpZiB0aGVyZSBpcyBvbmUgKGlmIGl0IHJldHVybnMgZmFsc2UsIHN0b3AgdGhlIGF1dG9jb21wbGV0aW9uISlcblx0XHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMgJiYgY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMudmFsaWRQb3NpdGlvbikge1xuXHRcdFx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzLnZhbGlkUG9zaXRpb24oY20sIHR5cGUpID09PSBmYWxzZSlcblx0XHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0dmFyIHN1Y2Nlc3MgPSB0cnlIaW50VHlwZSh0eXBlKTtcblx0XHRpZiAoc3VjY2Vzcylcblx0XHRcdGJyZWFrO1xuXHR9XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdHlwZWQgcHJlZml4IGlzIGRlY2xhcmVkLiBJZiBub3QsIGF1dG9tYXRpY2FsbHkgYWRkIGRlY2xhcmF0aW9uXG4gKiB1c2luZyBsaXN0IGZyb20gcHJlZml4LmNjXG4gKiBcbiAqIEBwYXJhbSBjbVxuICovXG5yb290LmFwcGVuZFByZWZpeElmTmVlZGVkID0gZnVuY3Rpb24oY20pIHtcblx0aWYgKCF0cmllc1tcInByZWZpeGVzXCJdKVxuXHRcdHJldHVybjsvLyBubyBwcmVmaXhlZCBkZWZpbmVkLiBqdXN0IHN0b3Bcblx0dmFyIGN1ciA9IGNtLmdldEN1cnNvcigpO1xuXG5cdHZhciB0b2tlbiA9IGNtLmdldFRva2VuQXQoY3VyKTtcblx0aWYgKHRva2VuVHlwZXNbdG9rZW4udHlwZV0gPT0gXCJwcmVmaXhlZFwiKSB7XG5cdFx0dmFyIGNvbG9uSW5kZXggPSB0b2tlbi5zdHJpbmcuaW5kZXhPZihcIjpcIik7XG5cdFx0aWYgKGNvbG9uSW5kZXggIT09IC0xKSB7XG5cdFx0XHQvLyBjaGVjayBmaXJzdCB0b2tlbiBpc250IFBSRUZJWCwgYW5kIHByZXZpb3VzIHRva2VuIGlzbnQgYSAnPCdcblx0XHRcdC8vIChpLmUuIHdlIGFyZSBpbiBhIHVyaSlcblx0XHRcdHZhciBmaXJzdFRva2VuU3RyaW5nID0gZ2V0TmV4dE5vbldzVG9rZW4oY20sIGN1ci5saW5lKS5zdHJpbmdcblx0XHRcdFx0XHQudG9VcHBlckNhc2UoKTtcblx0XHRcdHZhciBwcmV2aW91c1Rva2VuID0gY20uZ2V0VG9rZW5BdCh7XG5cdFx0XHRcdGxpbmUgOiBjdXIubGluZSxcblx0XHRcdFx0Y2ggOiB0b2tlbi5zdGFydFxuXHRcdFx0fSk7Ly8gbmVlZHMgdG8gYmUgbnVsbCAoYmVnaW5uaW5nIG9mIGxpbmUpLCBvciB3aGl0ZXNwYWNlXG5cdFx0XHRpZiAoZmlyc3RUb2tlblN0cmluZyAhPSBcIlBSRUZJWFwiXG5cdFx0XHRcdFx0JiYgKHByZXZpb3VzVG9rZW4udHlwZSA9PSBcIndzXCIgfHwgcHJldmlvdXNUb2tlbi50eXBlID09IG51bGwpKSB7XG5cdFx0XHRcdC8vIGNoZWNrIHdoZXRoZXIgaXQgaXNudCBkZWZpbmVkIGFscmVhZHkgKHNhdmVzIHVzIGZyb20gbG9vcGluZ1xuXHRcdFx0XHQvLyB0aHJvdWdoIHRoZSBhcnJheSlcblx0XHRcdFx0dmFyIGN1cnJlbnRQcmVmaXggPSB0b2tlbi5zdHJpbmcuc3Vic3RyaW5nKDAsIGNvbG9uSW5kZXggKyAxKTtcblx0XHRcdFx0dmFyIHF1ZXJ5UHJlZml4ZXMgPSBnZXRQcmVmaXhlc0Zyb21RdWVyeShjbSk7XG5cdFx0XHRcdGlmIChxdWVyeVByZWZpeGVzW2N1cnJlbnRQcmVmaXhdID09IG51bGwpIHtcblx0XHRcdFx0XHQvLyBvaywgc28gaXQgaXNudCBhZGRlZCB5ZXQhXG5cdFx0XHRcdFx0dmFyIGNvbXBsZXRpb25zID0gdHJpZXNbXCJwcmVmaXhlc1wiXS5hdXRvQ29tcGxldGUoY3VycmVudFByZWZpeCk7XG5cdFx0XHRcdFx0aWYgKGNvbXBsZXRpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdGFwcGVuZFRvUHJlZml4ZXMoY20sIGNvbXBsZXRpb25zWzBdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cblxuXG4vKipcbiAqIFdoZW4gdHlwaW5nIGEgcXVlcnksIHRoaXMgcXVlcnkgaXMgc29tZXRpbWVzIHN5bnRhY3RpY2FsbHkgaW52YWxpZCwgY2F1c2luZ1xuICogdGhlIGN1cnJlbnQgdG9rZW5zIHRvIGJlIGluY29ycmVjdCBUaGlzIGNhdXNlcyBwcm9ibGVtIGZvciBhdXRvY29tcGxldGlvbi5cbiAqIGh0dHA6Ly9ibGEgbWlnaHQgcmVzdWx0IGluIHR3byB0b2tlbnM6IGh0dHA6Ly8gYW5kIGJsYS4gV2UnbGwgd2FudCB0byBjb21iaW5lXG4gKiB0aGVzZVxuICogXG4gKiBAcGFyYW0geWFzcWUge2RvY31cbiAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fVxuICogQHBhcmFtIGN1cnNvciB7b2JqZWN0fVxuICogQHJldHVybiB0b2tlbiB7b2JqZWN0fVxuICogQG1ldGhvZCBZQVNRRS5nZXRDb21wbGV0ZVRva2VuXG4gKi9cbnJvb3QuZ2V0Q29tcGxldGVUb2tlbiA9IGZ1bmN0aW9uKGNtLCB0b2tlbiwgY3VyKSB7XG5cdGlmICghY3VyKSB7XG5cdFx0Y3VyID0gY20uZ2V0Q3Vyc29yKCk7XG5cdH1cblx0aWYgKCF0b2tlbikge1xuXHRcdHRva2VuID0gY20uZ2V0VG9rZW5BdChjdXIpO1xuXHR9XG5cdHZhciBwcmV2VG9rZW4gPSBjbS5nZXRUb2tlbkF0KHtcblx0XHRsaW5lIDogY3VyLmxpbmUsXG5cdFx0Y2ggOiB0b2tlbi5zdGFydFxuXHR9KTtcblx0Ly8gbm90IHN0YXJ0IG9mIGxpbmUsIGFuZCBub3Qgd2hpdGVzcGFjZVxuXHRpZiAoXG5cdFx0XHRwcmV2VG9rZW4udHlwZSAhPSBudWxsICYmIHByZXZUb2tlbi50eXBlICE9IFwid3NcIlxuXHRcdFx0JiYgdG9rZW4udHlwZSAhPSBudWxsICYmIHRva2VuLnR5cGUgIT0gXCJ3c1wiXG5cdFx0KSB7XG5cdFx0dG9rZW4uc3RhcnQgPSBwcmV2VG9rZW4uc3RhcnQ7XG5cdFx0dG9rZW4uc3RyaW5nID0gcHJldlRva2VuLnN0cmluZyArIHRva2VuLnN0cmluZztcblx0XHRyZXR1cm4gcm9vdC5nZXRDb21wbGV0ZVRva2VuKGNtLCB0b2tlbiwge1xuXHRcdFx0bGluZSA6IGN1ci5saW5lLFxuXHRcdFx0Y2ggOiBwcmV2VG9rZW4uc3RhcnRcblx0XHR9KTsvLyByZWN1cnNpdmVseSwgbWlnaHQgaGF2ZSBtdWx0aXBsZSB0b2tlbnMgd2hpY2ggaXQgc2hvdWxkIGluY2x1ZGVcblx0fSBlbHNlIGlmICh0b2tlbi50eXBlICE9IG51bGwgJiYgdG9rZW4udHlwZSA9PSBcIndzXCIpIHtcblx0XHQvL2Fsd2F5cyBrZWVwIDEgY2hhciBvZiB3aGl0ZXNwYWNlIGJldHdlZW4gdG9rZW5zLiBPdGhlcndpc2UsIGF1dG9jb21wbGV0aW9ucyBtaWdodCBlbmQgdXAgbmV4dCB0byB0aGUgcHJldmlvdXMgbm9kZSwgd2l0aG91dCB3aGl0ZXNwYWNlIGJldHdlZW4gdGhlbVxuXHRcdHRva2VuLnN0YXJ0ID0gdG9rZW4uc3RhcnQgKyAxO1xuXHRcdHRva2VuLnN0cmluZyA9IHRva2VuLnN0cmluZy5zdWJzdHJpbmcoMSk7XG5cdFx0cmV0dXJuIHRva2VuO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB0b2tlbjtcblx0fVxufTtcbmZ1bmN0aW9uIGdldFByZXZpb3VzTm9uV3NUb2tlbihjbSwgbGluZSwgdG9rZW4pIHtcblx0dmFyIHByZXZpb3VzVG9rZW4gPSBjbS5nZXRUb2tlbkF0KHtcblx0XHRsaW5lIDogbGluZSxcblx0XHRjaCA6IHRva2VuLnN0YXJ0XG5cdH0pO1xuXHRpZiAocHJldmlvdXNUb2tlbiAhPSBudWxsICYmIHByZXZpb3VzVG9rZW4udHlwZSA9PSBcIndzXCIpIHtcblx0XHRwcmV2aW91c1Rva2VuID0gZ2V0UHJldmlvdXNOb25Xc1Rva2VuKGNtLCBsaW5lLCBwcmV2aW91c1Rva2VuKTtcblx0fVxuXHRyZXR1cm4gcHJldmlvdXNUb2tlbjtcbn1cblxuXG4vKipcbiAqIEZldGNoIHByb3BlcnR5IGFuZCBjbGFzcyBhdXRvY29tcGxldGlvbnMgdGhlIExpbmtlZCBPcGVuIFZvY2FidWxhcnkgc2VydmljZXMuIElzc3VlcyBhbiBhc3luYyBhdXRvY29tcGxldGlvbiBjYWxsXG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQHBhcmFtIHBhcnRpYWxUb2tlbiB7b2JqZWN0fVxuICogQHBhcmFtIHR5cGUge1wicHJvcGVydGllc1wiIHwgXCJjbGFzc2VzXCJ9XG4gKiBAcGFyYW0gY2FsbGJhY2sge2Z1bmN0aW9ufSBcbiAqIFxuICogQG1ldGhvZCBZQVNRRS5mZXRjaEZyb21Mb3ZcbiAqL1xucm9vdC5mZXRjaEZyb21Mb3YgPSBmdW5jdGlvbihjbSwgcGFydGlhbFRva2VuLCB0eXBlLCBjYWxsYmFjaykge1xuXHRcblx0aWYgKCFwYXJ0aWFsVG9rZW4gfHwgIXBhcnRpYWxUb2tlbi5zdHJpbmcgfHwgcGFydGlhbFRva2VuLnN0cmluZy50cmltKCkubGVuZ3RoID09IDApIHtcblx0XHRpZiAoY29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV0pIHtcblx0XHRcdGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdXG5cdFx0XHRcdC5lbXB0eSgpXG5cdFx0XHRcdC5hcHBlbmQoXCJOb3RoaW5nIHRvIGF1dG9jb21wbGV0ZSB5ZXQhXCIpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0dmFyIG1heFJlc3VsdHMgPSA1MDtcblxuXHR2YXIgYXJncyA9IHtcblx0XHRxIDogcGFydGlhbFRva2VuLnVyaSxcblx0XHRwYWdlIDogMVxuXHR9O1xuXHRpZiAodHlwZSA9PSBcImNsYXNzZXNcIikge1xuXHRcdGFyZ3MudHlwZSA9IFwiY2xhc3NcIjtcblx0fSBlbHNlIHtcblx0XHRhcmdzLnR5cGUgPSBcInByb3BlcnR5XCI7XG5cdH1cblx0dmFyIHJlc3VsdHMgPSBbXTtcblx0dmFyIHVybCA9IFwiXCI7XG5cdHZhciB1cGRhdGVVcmwgPSBmdW5jdGlvbigpIHtcblx0XHR1cmwgPSBcImh0dHA6Ly9sb3Yub2tmbi5vcmcvZGF0YXNldC9sb3YvYXBpL3YyL2F1dG9jb21wbGV0ZS90ZXJtcz9cIlxuXHRcdFx0XHQrICQucGFyYW0oYXJncyk7XG5cdH07XG5cdHVwZGF0ZVVybCgpO1xuXHR2YXIgaW5jcmVhc2VQYWdlID0gZnVuY3Rpb24oKSB7XG5cdFx0YXJncy5wYWdlKys7XG5cdFx0dXBkYXRlVXJsKCk7XG5cdH07XG5cdHZhciBkb1JlcXVlc3RzID0gZnVuY3Rpb24oKSB7XG5cdFx0JC5nZXQoXG5cdFx0XHRcdHVybCxcblx0XHRcdFx0ZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5yZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRpZiAoJC5pc0FycmF5KGRhdGEucmVzdWx0c1tpXS51cmkpICYmIGRhdGEucmVzdWx0c1tpXS51cmkubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHRzLnB1c2goZGF0YS5yZXN1bHRzW2ldLnVyaVswXSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHRzLnB1c2goZGF0YS5yZXN1bHRzW2ldLnVyaSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHJlc3VsdHMubGVuZ3RoIDwgZGF0YS50b3RhbF9yZXN1bHRzXG5cdFx0XHRcdFx0XHRcdCYmIHJlc3VsdHMubGVuZ3RoIDwgbWF4UmVzdWx0cykge1xuXHRcdFx0XHRcdFx0aW5jcmVhc2VQYWdlKCk7XG5cdFx0XHRcdFx0XHRkb1JlcXVlc3RzKCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vaWYgbm90aWZpY2F0aW9uIGJhciBpcyB0aGVyZSwgc2hvdyBmZWVkYmFjaywgb3IgY2xvc2Vcblx0XHRcdFx0XHRcdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzdWx0cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV0uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdLnRleHQoXCIwIG1hdGNoZXMgZm91bmQuLi5cIik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNhbGxiYWNrKHJlc3VsdHMpO1xuXHRcdFx0XHRcdFx0Ly8gcmVxdWVzdHMgZG9uZSEgRG9uJ3QgY2FsbCB0aGlzIGZ1bmN0aW9uIGFnYWluXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS5mYWlsKGZ1bmN0aW9uKGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikge1xuXHRcdFx0XHRcdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkge1xuXHRcdFx0XHRcdFx0Y29tcGxldGlvbk5vdGlmaWNhdGlvbnNbdHlwZV1cblx0XHRcdFx0XHRcdFx0LmVtcHR5KClcblx0XHRcdFx0XHRcdFx0LmFwcGVuZChcIkZhaWxlZCBmZXRjaGluZyBzdWdnZXN0aW9ucy4uXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHR9KTtcblx0fTtcblx0Ly9pZiBub3RpZmljYXRpb24gYmFyIGlzIHRoZXJlLCBzaG93IGEgbG9hZGVyXG5cdGlmIChjb21wbGV0aW9uTm90aWZpY2F0aW9uc1t0eXBlXSkge1xuXHRcdGNvbXBsZXRpb25Ob3RpZmljYXRpb25zW3R5cGVdXG5cdFx0LmVtcHR5KClcblx0XHQuYXBwZW5kKCQoXCI8c3Bhbj5GZXRjaHRpbmcgYXV0b2NvbXBsZXRpb25zICZuYnNwOzwvc3Bhbj5cIikpXG5cdFx0LmFwcGVuZChyZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLmltZ3MuZ2V0RWxlbWVudCh7aWQ6IFwibG9hZGVyXCIsIHdpZHRoOiBcIjE4cHhcIiwgaGVpZ2h0OiBcIjE4cHhcIn0pLmNzcyhcInZlcnRpY2FsLWFsaWduXCIsIFwibWlkZGxlXCIpKTtcblx0fVxuXHRkb1JlcXVlc3RzKCk7XG59O1xuLyoqXG4gKiBmdW5jdGlvbiB3aGljaCBmaXJlcyBhZnRlciB0aGUgdXNlciBzZWxlY3RzIGEgY29tcGxldGlvbi4gdGhpcyBmdW5jdGlvbiBjaGVja3Mgd2hldGhlciB3ZSBhY3R1YWxseSBuZWVkIHRvIHN0b3JlIHRoaXMgb25lIChpZiBjb21wbGV0aW9uIGlzIHNhbWUgYXMgY3VycmVudCB0b2tlbiwgZG9uJ3QgZG8gYW55dGhpbmcpXG4gKi9cbnZhciBzZWxlY3RIaW50ID0gZnVuY3Rpb24oY20sIGRhdGEsIGNvbXBsZXRpb24pIHtcblx0aWYgKGNvbXBsZXRpb24udGV4dCAhPSBjbS5nZXRUb2tlbkF0KGNtLmdldEN1cnNvcigpKS5zdHJpbmcpIHtcblx0XHRjbS5yZXBsYWNlUmFuZ2UoY29tcGxldGlvbi50ZXh0LCBkYXRhLmZyb20sIGRhdGEudG8pO1xuXHR9XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHJkZjp0eXBlIHRvIGh0dHA6Ly8uLi4vdHlwZSBhbmQgY29udmVydHMgPGh0dHA6Ly8uLi4+IHRvIGh0dHA6Ly8uLi5cbiAqIFN0b3JlcyBhZGRpdGlvbmFsIGluZm8gc3VjaCBhcyB0aGUgdXNlZCBuYW1lc3BhY2UgYW5kIHByZWZpeCBpbiB0aGUgdG9rZW4gb2JqZWN0XG4gKi9cbnZhciBwcmVwcm9jZXNzUmVzb3VyY2VUb2tlbkZvckNvbXBsZXRpb24gPSBmdW5jdGlvbihjbSwgdG9rZW4pIHtcblx0dmFyIHF1ZXJ5UHJlZml4ZXMgPSBnZXRQcmVmaXhlc0Zyb21RdWVyeShjbSk7XG5cdGlmICghdG9rZW4uc3RyaW5nLmluZGV4T2YoXCI8XCIpID09IDApIHtcblx0XHR0b2tlbi50b2tlblByZWZpeCA9IHRva2VuLnN0cmluZy5zdWJzdHJpbmcoMCxcdHRva2VuLnN0cmluZy5pbmRleE9mKFwiOlwiKSArIDEpO1xuXG5cdFx0aWYgKHF1ZXJ5UHJlZml4ZXNbdG9rZW4udG9rZW5QcmVmaXhdICE9IG51bGwpIHtcblx0XHRcdHRva2VuLnRva2VuUHJlZml4VXJpID0gcXVlcnlQcmVmaXhlc1t0b2tlbi50b2tlblByZWZpeF07XG5cdFx0fVxuXHR9XG5cblx0dG9rZW4udXJpID0gdG9rZW4uc3RyaW5nLnRyaW0oKTtcblx0aWYgKCF0b2tlbi5zdHJpbmcuaW5kZXhPZihcIjxcIikgPT0gMCAmJiB0b2tlbi5zdHJpbmcuaW5kZXhPZihcIjpcIikgPiAtMSkge1xuXHRcdC8vIGhtbSwgdGhlIHRva2VuIGlzIHByZWZpeGVkLiBXZSBzdGlsbCBuZWVkIHRoZSBjb21wbGV0ZSB1cmkgZm9yIGF1dG9jb21wbGV0aW9ucy4gZ2VuZXJhdGUgdGhpcyFcblx0XHRmb3IgKHZhciBwcmVmaXggaW4gcXVlcnlQcmVmaXhlcykge1xuXHRcdFx0aWYgKHF1ZXJ5UHJlZml4ZXMuaGFzT3duUHJvcGVydHkocHJlZml4KSkge1xuXHRcdFx0XHRpZiAodG9rZW4uc3RyaW5nLmluZGV4T2YocHJlZml4KSA9PSAwKSB7XG5cdFx0XHRcdFx0dG9rZW4udXJpID0gcXVlcnlQcmVmaXhlc1twcmVmaXhdO1xuXHRcdFx0XHRcdHRva2VuLnVyaSArPSB0b2tlbi5zdHJpbmcuc3Vic3RyaW5nKHByZWZpeC5sZW5ndGgpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHRva2VuLnVyaS5pbmRleE9mKFwiPFwiKSA9PSAwKVx0dG9rZW4udXJpID0gdG9rZW4udXJpLnN1YnN0cmluZygxKTtcblx0aWYgKHRva2VuLnVyaS5pbmRleE9mKFwiPlwiLCB0b2tlbi5sZW5ndGggLSAxKSAhPT0gLTEpIHRva2VuLnVyaSA9IHRva2VuLnVyaS5zdWJzdHJpbmcoMCxcdHRva2VuLnVyaS5sZW5ndGggLSAxKTtcblx0cmV0dXJuIHRva2VuO1xufTtcblxudmFyIHBvc3Rwcm9jZXNzUmVzb3VyY2VUb2tlbkZvckNvbXBsZXRpb24gPSBmdW5jdGlvbihjbSwgdG9rZW4sIHN1Z2dlc3RlZFN0cmluZykge1xuXHRpZiAodG9rZW4udG9rZW5QcmVmaXggJiYgdG9rZW4udXJpICYmIHRva2VuLnRva2VuUHJlZml4VXJpKSB7XG5cdFx0Ly8gd2UgbmVlZCB0byBnZXQgdGhlIHN1Z2dlc3RlZCBzdHJpbmcgYmFjayB0byBwcmVmaXhlZCBmb3JtXG5cdFx0c3VnZ2VzdGVkU3RyaW5nID0gc3VnZ2VzdGVkU3RyaW5nLnN1YnN0cmluZyh0b2tlbi50b2tlblByZWZpeFVyaS5sZW5ndGgpO1xuXHRcdHN1Z2dlc3RlZFN0cmluZyA9IHRva2VuLnRva2VuUHJlZml4ICsgc3VnZ2VzdGVkU3RyaW5nO1xuXHR9IGVsc2Uge1xuXHRcdC8vIGl0IGlzIGEgcmVndWxhciB1cmkuIGFkZCAnPCcgYW5kICc+JyB0byBzdHJpbmdcblx0XHRzdWdnZXN0ZWRTdHJpbmcgPSBcIjxcIiArIHN1Z2dlc3RlZFN0cmluZyArIFwiPlwiO1xuXHR9XG5cdHJldHVybiBzdWdnZXN0ZWRTdHJpbmc7XG59O1xudmFyIHByZXByb2Nlc3NQcmVmaXhUb2tlbkZvckNvbXBsZXRpb24gPSBmdW5jdGlvbihjbSwgdG9rZW4pIHtcblx0dmFyIHByZXZpb3VzVG9rZW4gPSBnZXRQcmV2aW91c05vbldzVG9rZW4oY20sIGNtLmdldEN1cnNvcigpLmxpbmUsIHRva2VuKTtcblx0aWYgKHByZXZpb3VzVG9rZW4gJiYgcHJldmlvdXNUb2tlbi5zdHJpbmcgJiYgcHJldmlvdXNUb2tlbi5zdHJpbmcuc2xpY2UoLTEpID09IFwiOlwiKSB7XG5cdFx0Ly9jb21iaW5lIGJvdGggdG9rZW5zISBJbiB0aGlzIGNhc2Ugd2UgaGF2ZSB0aGUgY3Vyc29yIGF0IHRoZSBlbmQgb2YgbGluZSBcIlBSRUZJWCBibGE6IDxcIi5cblx0XHQvL3dlIHdhbnQgdGhlIHRva2VuIHRvIGJlIFwiYmxhOiA8XCIsIGVuIG5vdCBcIjxcIlxuXHRcdHRva2VuID0ge1xuXHRcdFx0c3RhcnQ6IHByZXZpb3VzVG9rZW4uc3RhcnQsXG5cdFx0XHRlbmQ6IHRva2VuLmVuZCxcblx0XHRcdHN0cmluZzogcHJldmlvdXNUb2tlbi5zdHJpbmcgKyBcIiBcIiArIHRva2VuLnN0cmluZyxcblx0XHRcdHN0YXRlOiB0b2tlbi5zdGF0ZVxuXHRcdH07XG5cdH1cblx0cmV0dXJuIHRva2VuO1xufTtcbnZhciBnZXRTdWdnZXN0aW9uc0Zyb21Ub2tlbiA9IGZ1bmN0aW9uKGNtLCB0eXBlLCBwYXJ0aWFsVG9rZW4pIHtcblx0dmFyIHN1Z2dlc3Rpb25zID0gW107XG5cdGlmICh0cmllc1t0eXBlXSkge1xuXHRcdHN1Z2dlc3Rpb25zID0gdHJpZXNbdHlwZV0uYXV0b0NvbXBsZXRlKHBhcnRpYWxUb2tlbi5zdHJpbmcpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXQgPT0gXCJmdW5jdGlvblwiICYmIGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmFzeW5jID09IGZhbHNlKSB7XG5cdFx0c3VnZ2VzdGlvbnMgPSBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXQoY20sIHBhcnRpYWxUb2tlbi5zdHJpbmcsIHR5cGUpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXQgPT0gXCJvYmplY3RcIikge1xuXHRcdHZhciBwYXJ0aWFsVG9rZW5MZW5ndGggPSBwYXJ0aWFsVG9rZW4uc3RyaW5nLmxlbmd0aDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmdldC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGNvbXBsZXRpb24gPSBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5nZXRbaV07XG5cdFx0XHRpZiAoY29tcGxldGlvbi5zbGljZSgwLCBwYXJ0aWFsVG9rZW5MZW5ndGgpID09IHBhcnRpYWxUb2tlbi5zdHJpbmcpIHtcblx0XHRcdFx0c3VnZ2VzdGlvbnMucHVzaChjb21wbGV0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGdldFN1Z2dlc3Rpb25zQXNIaW50T2JqZWN0KGNtLCBzdWdnZXN0aW9ucywgdHlwZSwgcGFydGlhbFRva2VuKTtcblx0XG59O1xuXG4vKipcbiAqICBnZXQgb3VyIGFycmF5IG9mIHN1Z2dlc3Rpb25zIChzdHJpbmdzKSBpbiB0aGUgY29kZW1pcnJvciBoaW50IGZvcm1hdFxuICovXG52YXIgZ2V0U3VnZ2VzdGlvbnNBc0hpbnRPYmplY3QgPSBmdW5jdGlvbihjbSwgc3VnZ2VzdGlvbnMsIHR5cGUsIHRva2VuKSB7XG5cdHZhciBoaW50TGlzdCA9IFtdO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHN1Z2dlc3Rpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIHN1Z2dlc3RlZFN0cmluZyA9IHN1Z2dlc3Rpb25zW2ldO1xuXHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5wb3N0UHJvY2Vzc1Rva2VuKSB7XG5cdFx0XHRzdWdnZXN0ZWRTdHJpbmcgPSBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5wb3N0UHJvY2Vzc1Rva2VuKGNtLCB0b2tlbiwgc3VnZ2VzdGVkU3RyaW5nKTtcblx0XHR9XG5cdFx0aGludExpc3QucHVzaCh7XG5cdFx0XHR0ZXh0IDogc3VnZ2VzdGVkU3RyaW5nLFxuXHRcdFx0ZGlzcGxheVRleHQgOiBzdWdnZXN0ZWRTdHJpbmcsXG5cdFx0XHRoaW50IDogc2VsZWN0SGludCxcblx0XHRcdGNsYXNzTmFtZSA6IHR5cGUgKyBcIkhpbnRcIlxuXHRcdH0pO1xuXHR9XG5cdFxuXHR2YXIgY3VyID0gY20uZ2V0Q3Vyc29yKCk7XG5cdHZhciByZXR1cm5PYmogPSB7XG5cdFx0Y29tcGxldGlvblRva2VuIDogdG9rZW4uc3RyaW5nLFxuXHRcdGxpc3QgOiBoaW50TGlzdCxcblx0XHRmcm9tIDoge1xuXHRcdFx0bGluZSA6IGN1ci5saW5lLFxuXHRcdFx0Y2ggOiB0b2tlbi5zdGFydFxuXHRcdH0sXG5cdFx0dG8gOiB7XG5cdFx0XHRsaW5lIDogY3VyLmxpbmUsXG5cdFx0XHRjaCA6IHRva2VuLmVuZFxuXHRcdH1cblx0fTtcblx0Ly9pZiB3ZSBoYXZlIHNvbWUgYXV0b2NvbXBsZXRpb24gaGFuZGxlcnMgc3BlY2lmaWVkLCBhZGQgdGhlc2UgdGhlc2UgdG8gdGhlIG9iamVjdC4gQ29kZW1pcnJvciB3aWxsIHRha2UgY2FyZSBvZiBmaXJpbmcgdGhlc2Vcblx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLmhhbmRsZXJzKSB7XG5cdFx0Zm9yICggdmFyIGhhbmRsZXIgaW4gY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uaGFuZGxlcnMpIHtcblx0XHRcdGlmIChjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVyc1toYW5kbGVyXSkgXG5cdFx0XHRcdHJvb3Qub24ocmV0dXJuT2JqLCBoYW5kbGVyLCBjbS5vcHRpb25zLmF1dG9jb21wbGV0aW9uc1t0eXBlXS5oYW5kbGVyc1toYW5kbGVyXSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXR1cm5PYmo7XG59O1xuXG5cbnZhciBnZXRDb21wbGV0aW9uSGludHNPYmplY3QgPSBmdW5jdGlvbihjbSwgdHlwZSwgY2FsbGJhY2spIHtcblx0dmFyIHRva2VuID0gcm9vdC5nZXRDb21wbGV0ZVRva2VuKGNtKTtcblx0aWYgKGNtLm9wdGlvbnMuYXV0b2NvbXBsZXRpb25zW3R5cGVdLnByZVByb2Nlc3NUb2tlbikge1xuXHRcdHRva2VuID0gY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0ucHJlUHJvY2Vzc1Rva2VuKGNtLCB0b2tlbiwgdHlwZSk7XG5cdH1cblx0XG5cdGlmICh0b2tlbikge1xuXHRcdC8vIHVzZSBjdXN0b20gY29tcGxldGlvbmhpbnQgZnVuY3Rpb24sIHRvIGF2b2lkIHJlYWNoaW5nIGEgbG9vcCB3aGVuIHRoZVxuXHRcdC8vIGNvbXBsZXRpb25oaW50IGlzIHRoZSBzYW1lIGFzIHRoZSBjdXJyZW50IHRva2VuXG5cdFx0Ly8gcmVndWxhciBiZWhhdmlvdXIgd291bGQga2VlcCBjaGFuZ2luZyB0aGUgY29kZW1pcnJvciBkb20sIGhlbmNlXG5cdFx0Ly8gY29uc3RhbnRseSBjYWxsaW5nIHRoaXMgY2FsbGJhY2tcblx0XHRpZiAoY20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uYXN5bmMpIHtcblx0XHRcdHZhciB3cmFwcGVkQ2FsbGJhY2sgPSBmdW5jdGlvbihzdWdnZXN0aW9ucykge1xuXHRcdFx0XHRjYWxsYmFjayhnZXRTdWdnZXN0aW9uc0FzSGludE9iamVjdChjbSwgc3VnZ2VzdGlvbnMsIHR5cGUsIHRva2VuKSk7XG5cdFx0XHR9O1xuXHRcdFx0Y20ub3B0aW9ucy5hdXRvY29tcGxldGlvbnNbdHlwZV0uZ2V0KGNtLCB0b2tlbiwgdHlwZSwgd3JhcHBlZENhbGxiYWNrKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGdldFN1Z2dlc3Rpb25zRnJvbVRva2VuKGNtLCB0eXBlLCB0b2tlbik7XG5cblx0XHR9XG5cdH1cbn07XG5cbnZhciBnZXRQZXJzaXN0ZW5jeUlkID0gZnVuY3Rpb24oY20sIHBlcnNpc3RlbnRJZENyZWF0b3IpIHtcblx0dmFyIHBlcnNpc3RlbmN5SWQgPSBudWxsO1xuXG5cdGlmIChwZXJzaXN0ZW50SWRDcmVhdG9yKSB7XG5cdFx0aWYgKHR5cGVvZiBwZXJzaXN0ZW50SWRDcmVhdG9yID09IFwic3RyaW5nXCIpIHtcblx0XHRcdHBlcnNpc3RlbmN5SWQgPSBwZXJzaXN0ZW50SWRDcmVhdG9yO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwZXJzaXN0ZW5jeUlkID0gcGVyc2lzdGVudElkQ3JlYXRvcihjbSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBwZXJzaXN0ZW5jeUlkO1xufTtcblxudmFyIGF1dG9Gb3JtYXRSYW5nZSA9IGZ1bmN0aW9uKGNtLCBmcm9tLCB0bykge1xuXHR2YXIgYWJzU3RhcnQgPSBjbS5pbmRleEZyb21Qb3MoZnJvbSk7XG5cdHZhciBhYnNFbmQgPSBjbS5pbmRleEZyb21Qb3ModG8pO1xuXHQvLyBJbnNlcnQgYWRkaXRpb25hbCBsaW5lIGJyZWFrcyB3aGVyZSBuZWNlc3NhcnkgYWNjb3JkaW5nIHRvIHRoZVxuXHQvLyBtb2RlJ3Mgc3ludGF4XG5cdHZhciByZXMgPSBhdXRvRm9ybWF0TGluZUJyZWFrcyhjbS5nZXRWYWx1ZSgpLCBhYnNTdGFydCwgYWJzRW5kKTtcblxuXHQvLyBSZXBsYWNlIGFuZCBhdXRvLWluZGVudCB0aGUgcmFuZ2Vcblx0Y20ub3BlcmF0aW9uKGZ1bmN0aW9uKCkge1xuXHRcdGNtLnJlcGxhY2VSYW5nZShyZXMsIGZyb20sIHRvKTtcblx0XHR2YXIgc3RhcnRMaW5lID0gY20ucG9zRnJvbUluZGV4KGFic1N0YXJ0KS5saW5lO1xuXHRcdHZhciBlbmRMaW5lID0gY20ucG9zRnJvbUluZGV4KGFic1N0YXJ0ICsgcmVzLmxlbmd0aCkubGluZTtcblx0XHRmb3IgKHZhciBpID0gc3RhcnRMaW5lOyBpIDw9IGVuZExpbmU7IGkrKykge1xuXHRcdFx0Y20uaW5kZW50TGluZShpLCBcInNtYXJ0XCIpO1xuXHRcdH1cblx0fSk7XG59O1xuXG52YXIgYXV0b0Zvcm1hdExpbmVCcmVha3MgPSBmdW5jdGlvbih0ZXh0LCBzdGFydCwgZW5kKSB7XG5cdHRleHQgPSB0ZXh0LnN1YnN0cmluZyhzdGFydCwgZW5kKTtcblx0dmFyIGJyZWFrQWZ0ZXJBcnJheSA9IFsgWyBcImtleXdvcmRcIiwgXCJ3c1wiLCBcInByZWZpeGVkXCIsIFwid3NcIiwgXCJ1cmlcIiBdLCAvLyBpLmUuIHByZWZpeCBkZWNsYXJhdGlvblxuXHRbIFwia2V5d29yZFwiLCBcIndzXCIsIFwidXJpXCIgXSAvLyBpLmUuIGJhc2Vcblx0XTtcblx0dmFyIGJyZWFrQWZ0ZXJDaGFyYWN0ZXJzID0gWyBcIntcIiwgXCIuXCIsIFwiO1wiIF07XG5cdHZhciBicmVha0JlZm9yZUNoYXJhY3RlcnMgPSBbIFwifVwiIF07XG5cdHZhciBnZXRCcmVha1R5cGUgPSBmdW5jdGlvbihzdHJpbmdWYWwsIHR5cGUpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJyZWFrQWZ0ZXJBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHN0YWNrVHJhY2UudmFsdWVPZigpLnRvU3RyaW5nKCkgPT0gYnJlYWtBZnRlckFycmF5W2ldLnZhbHVlT2YoKVxuXHRcdFx0XHRcdC50b1N0cmluZygpKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJyZWFrQWZ0ZXJDaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAoc3RyaW5nVmFsID09IGJyZWFrQWZ0ZXJDaGFyYWN0ZXJzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGJyZWFrQmVmb3JlQ2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Ly8gZG9uJ3Qgd2FudCB0byBpc3N1ZSAnYnJlYWtiZWZvcmUnIEFORCAnYnJlYWthZnRlcicsIHNvIGNoZWNrXG5cdFx0XHQvLyBjdXJyZW50IGxpbmVcblx0XHRcdGlmICgkLnRyaW0oY3VycmVudExpbmUpICE9ICcnXG5cdFx0XHRcdFx0JiYgc3RyaW5nVmFsID09IGJyZWFrQmVmb3JlQ2hhcmFjdGVyc1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAwO1xuXHR9O1xuXHR2YXIgZm9ybWF0dGVkUXVlcnkgPSBcIlwiO1xuXHR2YXIgY3VycmVudExpbmUgPSBcIlwiO1xuXHR2YXIgc3RhY2tUcmFjZSA9IFtdO1xuXHRDb2RlTWlycm9yLnJ1bk1vZGUodGV4dCwgXCJzcGFycWwxMVwiLCBmdW5jdGlvbihzdHJpbmdWYWwsIHR5cGUpIHtcblx0XHRzdGFja1RyYWNlLnB1c2godHlwZSk7XG5cdFx0dmFyIGJyZWFrVHlwZSA9IGdldEJyZWFrVHlwZShzdHJpbmdWYWwsIHR5cGUpO1xuXHRcdGlmIChicmVha1R5cGUgIT0gMCkge1xuXHRcdFx0aWYgKGJyZWFrVHlwZSA9PSAxKSB7XG5cdFx0XHRcdGZvcm1hdHRlZFF1ZXJ5ICs9IHN0cmluZ1ZhbCArIFwiXFxuXCI7XG5cdFx0XHRcdGN1cnJlbnRMaW5lID0gXCJcIjtcblx0XHRcdH0gZWxzZSB7Ly8gKC0xKVxuXHRcdFx0XHRmb3JtYXR0ZWRRdWVyeSArPSBcIlxcblwiICsgc3RyaW5nVmFsO1xuXHRcdFx0XHRjdXJyZW50TGluZSA9IHN0cmluZ1ZhbDtcblx0XHRcdH1cblx0XHRcdHN0YWNrVHJhY2UgPSBbXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3VycmVudExpbmUgKz0gc3RyaW5nVmFsO1xuXHRcdFx0Zm9ybWF0dGVkUXVlcnkgKz0gc3RyaW5nVmFsO1xuXHRcdH1cblx0XHRpZiAoc3RhY2tUcmFjZS5sZW5ndGggPT0gMSAmJiBzdGFja1RyYWNlWzBdID09IFwic3Atd3NcIilcblx0XHRcdHN0YWNrVHJhY2UgPSBbXTtcblx0fSk7XG5cdHJldHVybiAkLnRyaW0oZm9ybWF0dGVkUXVlcnkucmVwbGFjZSgvXFxuXFxzKlxcbi9nLCAnXFxuJykpO1xufTtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBvcHRpb25zIG9mIFlBU1FFIChjaGVjayB0aGUgQ29kZU1pcnJvciBkb2N1bWVudGF0aW9uIGZvciBldmVuXG4gKiBtb3JlIG9wdGlvbnMsIHN1Y2ggYXMgZGlzYWJsaW5nIGxpbmUgbnVtYmVycywgb3IgY2hhbmdpbmcga2V5Ym9hcmQgc2hvcnRjdXRcbiAqIGtleXMpLiBFaXRoZXIgY2hhbmdlIHRoZSBkZWZhdWx0IG9wdGlvbnMgYnkgc2V0dGluZyBZQVNRRS5kZWZhdWx0cywgb3IgYnlcbiAqIHBhc3NpbmcgeW91ciBvd24gb3B0aW9ucyBhcyBzZWNvbmQgYXJndW1lbnQgdG8gdGhlIFlBU1FFIGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBhdHRyaWJ1dGVcbiAqIEBhdHRyaWJ1dGUgWUFTUUUuZGVmYXVsdHNcbiAqL1xucm9vdC5kZWZhdWx0cyA9ICQuZXh0ZW5kKHJvb3QuZGVmYXVsdHMsIHtcblx0bW9kZSA6IFwic3BhcnFsMTFcIixcblx0LyoqXG5cdCAqIFF1ZXJ5IHN0cmluZ1xuXHQgKiBcblx0ICogQHByb3BlcnR5IHZhbHVlXG5cdCAqIEB0eXBlIFN0cmluZ1xuXHQgKiBAZGVmYXVsdCBcIlNFTEVDVCAqIFdIRVJFIHtcXG4gID9zdWIgP3ByZWQgP29iaiAuXFxufSBcXG5MSU1JVCAxMFwiXG5cdCAqL1xuXHR2YWx1ZSA6IFwiU0VMRUNUICogV0hFUkUge1xcbiAgP3N1YiA/cHJlZCA/b2JqIC5cXG59IFxcbkxJTUlUIDEwXCIsXG5cdGhpZ2hsaWdodFNlbGVjdGlvbk1hdGNoZXMgOiB7XG5cdFx0c2hvd1Rva2VuIDogL1xcdy9cblx0fSxcblx0dGFiTW9kZSA6IFwiaW5kZW50XCIsXG5cdGxpbmVOdW1iZXJzIDogdHJ1ZSxcblx0Z3V0dGVycyA6IFsgXCJndXR0ZXJFcnJvckJhclwiLCBcIkNvZGVNaXJyb3ItbGluZW51bWJlcnNcIiBdLFxuXHRtYXRjaEJyYWNrZXRzIDogdHJ1ZSxcblx0Zml4ZWRHdXR0ZXIgOiB0cnVlLFxuXHRzeW50YXhFcnJvckNoZWNrOiB0cnVlLFxuXHQvKipcblx0ICogRXh0cmEgc2hvcnRjdXQga2V5cy4gQ2hlY2sgdGhlIENvZGVNaXJyb3IgbWFudWFsIG9uIGhvdyB0byBhZGQgeW91ciBvd25cblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBleHRyYUtleXNcblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRleHRyYUtleXMgOiB7XG5cdFx0XCJDdHJsLVNwYWNlXCIgOiByb290LmF1dG9Db21wbGV0ZSxcblx0XHRcIkNtZC1TcGFjZVwiIDogcm9vdC5hdXRvQ29tcGxldGUsXG5cdFx0XCJDdHJsLURcIiA6IHJvb3QuZGVsZXRlTGluZSxcblx0XHRcIkN0cmwtS1wiIDogcm9vdC5kZWxldGVMaW5lLFxuXHRcdFwiQ21kLURcIiA6IHJvb3QuZGVsZXRlTGluZSxcblx0XHRcIkNtZC1LXCIgOiByb290LmRlbGV0ZUxpbmUsXG5cdFx0XCJDdHJsLS9cIiA6IHJvb3QuY29tbWVudExpbmVzLFxuXHRcdFwiQ21kLS9cIiA6IHJvb3QuY29tbWVudExpbmVzLFxuXHRcdFwiQ3RybC1BbHQtRG93blwiIDogcm9vdC5jb3B5TGluZURvd24sXG5cdFx0XCJDdHJsLUFsdC1VcFwiIDogcm9vdC5jb3B5TGluZVVwLFxuXHRcdFwiQ21kLUFsdC1Eb3duXCIgOiByb290LmNvcHlMaW5lRG93bixcblx0XHRcIkNtZC1BbHQtVXBcIiA6IHJvb3QuY29weUxpbmVVcCxcblx0XHRcIlNoaWZ0LUN0cmwtRlwiIDogcm9vdC5kb0F1dG9Gb3JtYXQsXG5cdFx0XCJTaGlmdC1DbWQtRlwiIDogcm9vdC5kb0F1dG9Gb3JtYXQsXG5cdFx0XCJDdHJsLV1cIiA6IHJvb3QuaW5kZW50TW9yZSxcblx0XHRcIkNtZC1dXCIgOiByb290LmluZGVudE1vcmUsXG5cdFx0XCJDdHJsLVtcIiA6IHJvb3QuaW5kZW50TGVzcyxcblx0XHRcIkNtZC1bXCIgOiByb290LmluZGVudExlc3MsXG5cdFx0XCJDdHJsLVNcIiA6IHJvb3Quc3RvcmVRdWVyeSxcblx0XHRcIkNtZC1TXCIgOiByb290LnN0b3JlUXVlcnksXG5cdFx0XCJDdHJsLUVudGVyXCIgOiByb290LmV4ZWN1dGVRdWVyeSxcblx0XHRcIkNtZC1FbnRlclwiIDogcm9vdC5leGVjdXRlUXVlcnlcblx0fSxcblx0Y3Vyc29ySGVpZ2h0IDogMC45LFxuXG5cdC8vIG5vbiBDb2RlTWlycm9yIG9wdGlvbnNcblxuXHRcblx0LyoqXG5cdCAqIFNob3cgYSBidXR0b24gd2l0aCB3aGljaCB1c2VycyBjYW4gY3JlYXRlIGEgbGluayB0byB0aGlzIHF1ZXJ5LiBTZXQgdGhpcyB2YWx1ZSB0byBudWxsIHRvIGRpc2FibGUgdGhpcyBmdW5jdGlvbmFsaXR5LlxuXHQgKiBCeSBkZWZhdWx0LCB0aGlzIGZlYXR1cmUgaXMgZW5hYmxlZCwgYW5kIHRoZSBvbmx5IHRoZSBxdWVyeSB2YWx1ZSBpcyBhcHBlbmRlZCB0byB0aGUgbGluay5cblx0ICogcHMuIFRoaXMgZnVuY3Rpb24gc2hvdWxkIHJldHVybiBhbiBvYmplY3Qgd2hpY2ggaXMgcGFyc2VhYmxlIGJ5IGpRdWVyeS5wYXJhbSAoaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5wYXJhbS8pXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgY3JlYXRlU2hhcmVMaW5rXG5cdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdCAqIEBkZWZhdWx0IFlBU1FFLmNyZWF0ZVNoYXJlTGlua1xuXHQgKi9cblx0Y3JlYXRlU2hhcmVMaW5rOiByb290LmNyZWF0ZVNoYXJlTGluayxcblx0XG5cdC8qKlxuXHQgKiBDb25zdW1lIGxpbmtzIHNoYXJlZCBieSBvdGhlcnMsIGJ5IGNoZWNraW5nIHRoZSB1cmwgZm9yIGFyZ3VtZW50cyBjb21pbmcgZnJvbSBhIHF1ZXJ5IGxpbmsuIERlZmF1bHRzIGJ5IG9ubHkgY2hlY2tpbmcgdGhlICdxdWVyeT0nIGFyZ3VtZW50IGluIHRoZSB1cmxcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBjb25zdW1lU2hhcmVMaW5rXG5cdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdCAqIEBkZWZhdWx0IFlBU1FFLmNvbnN1bWVTaGFyZUxpbmtcblx0ICovXG5cdGNvbnN1bWVTaGFyZUxpbms6IHJvb3QuY29uc3VtZVNoYXJlTGluayxcblx0XG5cdFxuXHRcblx0XG5cdC8qKlxuXHQgKiBDaGFuZ2UgcGVyc2lzdGVuY3kgc2V0dGluZ3MgZm9yIHRoZSBZQVNRRSBxdWVyeSB2YWx1ZS4gU2V0dGluZyB0aGUgdmFsdWVzXG5cdCAqIHRvIG51bGwsIHdpbGwgZGlzYWJsZSBwZXJzaXN0YW5jeTogbm90aGluZyBpcyBzdG9yZWQgYmV0d2VlbiBicm93c2VyXG5cdCAqIHNlc3Npb25zIFNldHRpbmcgdGhlIHZhbHVlcyB0byBhIHN0cmluZyAob3IgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFcblx0ICogc3RyaW5nKSwgd2lsbCBzdG9yZSB0aGUgcXVlcnkgaW4gbG9jYWxzdG9yYWdlIHVzaW5nIHRoZSBzcGVjaWZpZWQgc3RyaW5nLlxuXHQgKiBCeSBkZWZhdWx0LCB0aGUgSUQgaXMgZHluYW1pY2FsbHkgZ2VuZXJhdGVkIHVzaW5nIHRoZSBkZXRlcm1pbmVJRFxuXHQgKiBmdW5jdGlvbiwgdG8gYXZvaWQgY29sbGlzc2lvbnMgd2hlbiB1c2luZyBtdWx0aXBsZSBZQVNRRSBpdGVtcyBvbiBvbmVcblx0ICogcGFnZVxuXHQgKiBcblx0ICogQHByb3BlcnR5IHBlcnNpc3RlbnRcblx0ICogQHR5cGUgZnVuY3Rpb258c3RyaW5nXG5cdCAqL1xuXHRwZXJzaXN0ZW50IDogZnVuY3Rpb24oY20pIHtcblx0XHRyZXR1cm4gXCJxdWVyeVZhbF9cIiArIHJvb3QuZGV0ZXJtaW5lSWQoY20pO1xuXHR9LFxuXG5cdFxuXHQvKipcblx0ICogU2V0dGluZ3MgZm9yIHF1ZXJ5aW5nIHNwYXJxbCBlbmRwb2ludHNcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBzcGFycWxcblx0ICogQHR5cGUgb2JqZWN0XG5cdCAqL1xuXHRzcGFycWwgOiB7XG5cdFx0LyoqXG5cdFx0ICogU2hvdyBhIHF1ZXJ5IGJ1dHRvbi4gWW91IGRvbid0IGxpa2UgaXQ/IFRoZW4gZGlzYWJsZSB0aGlzIHNldHRpbmcsIGFuZCBjcmVhdGUgeW91ciBidXR0b24gd2hpY2ggY2FsbHMgdGhlIHF1ZXJ5KCkgZnVuY3Rpb24gb2YgdGhlIHlhc3FlIGRvY3VtZW50XG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5zaG93UXVlcnlCdXR0b25cblx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0ICogQGRlZmF1bHQgZmFsc2Vcblx0XHQgKi9cblx0XHRzaG93UXVlcnlCdXR0b246IGZhbHNlLFxuXHRcdFxuXHRcdC8qKmZcblx0XHQgKiBFbmRwb2ludCB0byBxdWVyeVxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuZW5kcG9pbnRcblx0XHQgKiBAdHlwZSBTdHJpbmd8ZnVuY3Rpb25cblx0XHQgKiBAZGVmYXVsdCBcImh0dHA6Ly9kYnBlZGlhLm9yZy9zcGFycWxcIlxuXHRcdCAqL1xuXHRcdGVuZHBvaW50IDogXCJodHRwOi8vZGJwZWRpYS5vcmcvc3BhcnFsXCIsXG5cdFx0LyoqXG5cdFx0ICogUmVxdWVzdCBtZXRob2QgdmlhIHdoaWNoIHRvIGFjY2VzcyBTUEFSUUwgZW5kcG9pbnRcblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLnJlcXVlc3RNZXRob2Rcblx0XHQgKiBAdHlwZSBTdHJpbmd8ZnVuY3Rpb25cblx0XHQgKiBAZGVmYXVsdCBcIlBPU1RcIlxuXHRcdCAqL1xuXHRcdHJlcXVlc3RNZXRob2QgOiBcIlBPU1RcIixcblx0XHQvKipcblx0XHQgKiBRdWVyeSBhY2NlcHQgaGVhZGVyXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5hY2NlcHRIZWFkZXJcblx0XHQgKiBAdHlwZSBTdHJpbmd8ZnVuY3Rpb25cblx0XHQgKiBAZGVmYXVsdCBZQVNRRS5nZXRBY2NlcHRIZWFkZXJcblx0XHQgKi9cblx0XHRhY2NlcHRIZWFkZXIgOiByb290LmdldEFjY2VwdEhlYWRlcixcblx0XHRcblx0XHQvKipcblx0XHQgKiBOYW1lZCBncmFwaHMgdG8gcXVlcnkuXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHNwYXJxbC5uYW1lZEdyYXBoc1xuXHRcdCAqIEB0eXBlIGFycmF5XG5cdFx0ICogQGRlZmF1bHQgW11cblx0XHQgKi9cblx0XHRuYW1lZEdyYXBocyA6IFtdLFxuXHRcdC8qKlxuXHRcdCAqIERlZmF1bHQgZ3JhcGhzIHRvIHF1ZXJ5LlxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuZGVmYXVsdEdyYXBoc1xuXHRcdCAqIEB0eXBlIGFycmF5XG5cdFx0ICogQGRlZmF1bHQgW11cblx0XHQgKi9cblx0XHRkZWZhdWx0R3JhcGhzIDogW10sXG5cblx0XHQvKipcblx0XHQgKiBBZGRpdGlvbmFsIHJlcXVlc3QgYXJndW1lbnRzLiBBZGQgdGhlbSBpbiB0aGUgZm9ybToge25hbWU6IFwibmFtZVwiLCB2YWx1ZTogXCJ2YWx1ZVwifVxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuYXJnc1xuXHRcdCAqIEB0eXBlIGFycmF5XG5cdFx0ICogQGRlZmF1bHQgW11cblx0XHQgKi9cblx0XHRhcmdzIDogW10sXG5cblx0XHQvKipcblx0XHQgKiBBZGRpdGlvbmFsIHJlcXVlc3QgaGVhZGVyc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuaGVhZGVyc1xuXHRcdCAqIEB0eXBlIGFycmF5XG5cdFx0ICogQGRlZmF1bHQge31cblx0XHQgKi9cblx0XHRoZWFkZXJzIDoge30sXG5cblx0XHQvKipcblx0XHQgKiBTZXQgb2YgYWpheCBoYW5kbGVyc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuaGFuZGxlcnNcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHRoYW5kbGVycyA6IHtcblx0XHRcdC8qKlxuXHRcdFx0ICogU2VlIGh0dHBzOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uXG5cdFx0XHQgKiB0aGVzZSBoYW5kbGVycywgYW5kIHRoZWlyIGFyZ3VtZW50cy5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IHNwYXJxbC5oYW5kbGVycy5iZWZvcmVTZW5kXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRiZWZvcmVTZW5kIDogbnVsbCxcblx0XHRcdC8qKlxuXHRcdFx0ICogU2VlIGh0dHBzOi8vYXBpLmpxdWVyeS5jb20valF1ZXJ5LmFqYXgvIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uXG5cdFx0XHQgKiB0aGVzZSBoYW5kbGVycywgYW5kIHRoZWlyIGFyZ3VtZW50cy5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IHNwYXJxbC5oYW5kbGVycy5jb21wbGV0ZVxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdCAqL1xuXHRcdFx0Y29tcGxldGUgOiBudWxsLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBTZWUgaHR0cHM6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYWpheC8gZm9yIG1vcmUgaW5mb3JtYXRpb24gb25cblx0XHRcdCAqIHRoZXNlIGhhbmRsZXJzLCBhbmQgdGhlaXIgYXJndW1lbnRzLlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgc3BhcnFsLmhhbmRsZXJzLmVycm9yXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRlcnJvciA6IG51bGwsXG5cdFx0XHQvKipcblx0XHRcdCAqIFNlZSBodHRwczovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4LyBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvblxuXHRcdFx0ICogdGhlc2UgaGFuZGxlcnMsIGFuZCB0aGVpciBhcmd1bWVudHMuXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBzcGFycWwuaGFuZGxlcnMuc3VjY2Vzc1xuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdCAqL1xuXHRcdFx0c3VjY2VzcyA6IG51bGxcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBUeXBlcyBvZiBjb21wbGV0aW9ucy4gU2V0dGluZyB0aGUgdmFsdWUgdG8gbnVsbCwgd2lsbCBkaXNhYmxlXG5cdCAqIGF1dG9jb21wbGV0aW9uIGZvciB0aGlzIHBhcnRpY3VsYXIgdHlwZS4gQnkgZGVmYXVsdCwgb25seSBwcmVmaXhcblx0ICogYXV0b2NvbXBsZXRpb25zIGFyZSBmZXRjaGVkIGZyb20gcHJlZml4LmNjLCBhbmQgcHJvcGVydHkgYW5kIGNsYXNzXG5cdCAqIGF1dG9jb21wbGV0aW9ucyBhcmUgZmV0Y2hlZCBmcm9tIHRoZSBMaW5rZWQgT3BlbiBWb2NhYnVsYXJpZXMgQVBJXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zXG5cdCAqIEB0eXBlIG9iamVjdFxuXHQgKi9cblx0YXV0b2NvbXBsZXRpb25zIDoge1xuXHRcdC8qKlxuXHRcdCAqIFByZWZpeCBhdXRvY29tcGxldGlvbiBzZXR0aW5nc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXNcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHRwcmVmaXhlcyA6IHtcblx0XHRcdC8qKlxuXHRcdFx0ICogQ2hlY2sgd2hldGhlciB0aGUgY3Vyc29yIGlzIGluIGEgcHJvcGVyIHBvc2l0aW9uIGZvciB0aGlzIGF1dG9jb21wbGV0aW9uLlxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByZWZpeGVzLmlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb25cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0geWFzcWUgZG9jXG5cdFx0XHQgKiBAcmV0dXJuIGJvb2xlYW5cblx0XHRcdCAqL1xuXHRcdFx0aXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvbiA6IGZ1bmN0aW9uKGNtKSB7XG5cdFx0XHRcdHZhciBjdXIgPSBjbS5nZXRDdXJzb3IoKSwgdG9rZW4gPSBjbS5nZXRUb2tlbkF0KGN1cik7XG5cblx0XHRcdFx0Ly8gbm90IGF0IGVuZCBvZiBsaW5lXG5cdFx0XHRcdGlmIChjbS5nZXRMaW5lKGN1ci5saW5lKS5sZW5ndGggPiBjdXIuY2gpXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0XHRcdGlmICh0b2tlbi50eXBlICE9IFwid3NcIikge1xuXHRcdFx0XHRcdC8vIHdlIHdhbnQgdG8gY29tcGxldGUgdG9rZW4sIGUuZy4gd2hlbiB0aGUgcHJlZml4IHN0YXJ0cyB3aXRoIGFuIGFcblx0XHRcdFx0XHQvLyAodHJlYXRlZCBhcyBhIHRva2VuIGluIGl0c2VsZi4uKVxuXHRcdFx0XHRcdC8vIGJ1dCB3ZSB0byBhdm9pZCBpbmNsdWRpbmcgdGhlIFBSRUZJWCB0YWcuIFNvIHdoZW4gd2UgaGF2ZSBqdXN0XG5cdFx0XHRcdFx0Ly8gdHlwZWQgYSBzcGFjZSBhZnRlciB0aGUgcHJlZml4IHRhZywgZG9uJ3QgZ2V0IHRoZSBjb21wbGV0ZSB0b2tlblxuXHRcdFx0XHRcdHRva2VuID0gcm9vdC5nZXRDb21wbGV0ZVRva2VuKGNtKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHdlIHNob3VsZG50IGJlIGF0IHRoZSB1cmkgcGFydCB0aGUgcHJlZml4IGRlY2xhcmF0aW9uXG5cdFx0XHRcdC8vIGFsc28gY2hlY2sgd2hldGhlciBjdXJyZW50IHRva2VuIGlzbnQgJ2EnICh0aGF0IG1ha2VzIGNvZGVtaXJyb3Jcblx0XHRcdFx0Ly8gdGhpbmcgYSBuYW1lc3BhY2UgaXMgYSBwb3NzaWJsZWN1cnJlbnRcblx0XHRcdFx0aWYgKCF0b2tlbi5zdHJpbmcuaW5kZXhPZihcImFcIikgPT0gMFxuXHRcdFx0XHRcdFx0JiYgJC5pbkFycmF5KFwiUE5BTUVfTlNcIiwgdG9rZW4uc3RhdGUucG9zc2libGVDdXJyZW50KSA9PSAtMSlcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdFx0Ly8gRmlyc3QgdG9rZW4gb2YgbGluZSBuZWVkcyB0byBiZSBQUkVGSVgsXG5cdFx0XHRcdC8vIHRoZXJlIHNob3VsZCBiZSBubyB0cmFpbGluZyB0ZXh0IChvdGhlcndpc2UsIHRleHQgaXMgd3JvbmdseSBpbnNlcnRlZFxuXHRcdFx0XHQvLyBpbiBiZXR3ZWVuKVxuXHRcdFx0XHR2YXIgZmlyc3RUb2tlbiA9IGdldE5leHROb25Xc1Rva2VuKGNtLCBjdXIubGluZSk7XG5cdFx0XHRcdGlmIChmaXJzdFRva2VuID09IG51bGwgfHwgZmlyc3RUb2tlbi5zdHJpbmcudG9VcHBlckNhc2UoKSAhPSBcIlBSRUZJWFwiKVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0ICAgIFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBHZXQgdGhlIGF1dG9jb21wbGV0aW9ucy4gRWl0aGVyIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhblxuXHRcdFx0ICogYXJyYXksIG9yIGFuIGFjdHVhbCBhcnJheS4gVGhlIGFycmF5IHNob3VsZCBiZSBpbiB0aGUgZm9ybSBbXCJyZGY6IDxodHRwOi8vLi4uLj5cIl1cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcmVmaXhlcy5nZXRcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9ufGFycmF5XG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fHN0cmluZ30gV2hlbiBidWxrIGlzIGRpc2FibGVkLCB1c2UgdGhpcyB0b2tlbiB0byBhdXRvY29tcGxldGVcblx0XHRcdCAqIEBwYXJhbSBjb21wbGV0aW9uVHlwZSB7c3RyaW5nfSB3aGF0IHR5cGUgb2YgYXV0b2NvbXBsZXRpb24gd2UgdHJ5IHRvIGF0dGVtcHQuIENsYXNzZXMsIHByb3BlcnRpZXMsIG9yIHByZWZpeGVzKVxuXHRcdFx0ICogQHBhcmFtIGNhbGxiYWNrIHtmdW5jdGlvbn0gSW4gY2FzZSBhc3luYyBpcyBlbmFibGVkLCB1c2UgdGhpcyBjYWxsYmFja1xuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb24gKFlBU1FFLmZldGNoRnJvbVByZWZpeENjKVxuXHRcdFx0ICovXG5cdFx0XHRnZXQgOiByb290LmZldGNoRnJvbVByZWZpeENjLFxuXHRcdFx0XG5cdFx0XHQvKipcblx0XHRcdCAqIFByZXByb2Nlc3NlcyB0aGUgY29kZW1pcnJvciB0b2tlbiBiZWZvcmUgbWF0Y2hpbmcgaXQgd2l0aCBvdXIgYXV0b2NvbXBsZXRpb25zIGxpc3QuXG5cdFx0XHQgKiBVc2UgdGhpcyBmb3IgZS5nLiBhdXRvY29tcGxldGluZyBwcmVmaXhlZCByZXNvdXJjZXMgd2hlbiB5b3VyIGF1dG9jb21wbGV0aW9uIGxpc3QgY29udGFpbnMgb25seSBmdWxsLWxlbmd0aCBVUklzXG5cdFx0XHQgKiBJLmUuLCBmb2FmOm5hbWUgLT4gaHR0cDovL3htbG5zLmNvbS9mb2FmLzAuMS9uYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5wcmVQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHJldHVybiB0b2tlbiB7b2JqZWN0fSBSZXR1cm4gdGhlIHNhbWUgdG9rZW4gKHBvc3NpYmx5IHdpdGggbW9yZSBkYXRhIGFkZGVkIHRvIGl0LCB3aGljaCB5b3UgY2FuIHVzZSBpbiB0aGUgcG9zdFByb2Nlc3Npbmcgc3RlcClcblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uXG5cdFx0XHQgKi9cblx0XHRcdHByZVByb2Nlc3NUb2tlbjogcHJlcHJvY2Vzc1ByZWZpeFRva2VuRm9yQ29tcGxldGlvbixcblx0XHRcdC8qKlxuXHRcdFx0ICogUG9zdHByb2Nlc3NlcyB0aGUgYXV0b2NvbXBsZXRpb24gc3VnZ2VzdGlvbi5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIHJldHVybmluZyBhIHByZWZpeGVkIFVSSSBiYXNlZCBvbiBhIGZ1bGwtbGVuZ3RoIFVSSSBzdWdnZXN0aW9uXG5cdFx0XHQgKiBJLmUuLCBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWUgLT4gZm9hZjpuYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5wb3N0UHJvY2Vzc1Rva2VuXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdH0gVGhlIENvZGVNaXJyb3IgdG9rZW4sIGluY2x1ZGluZyB0aGUgcG9zaXRpb24gb2YgdGhpcyB0b2tlbiBpbiB0aGUgcXVlcnksIGFzIHdlbGwgYXMgdGhlIGFjdHVhbCBzdHJpbmdcblx0XHRcdCAqIEBwYXJhbSBzdWdnZXN0aW9uIHtzdHJpbmd9IFRoZSBzdWdnZXN0aW9uIHdoaWNoIHlvdSBhcmUgcG9zdCBwcm9jZXNzaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHBvc3QtcHJvY2Vzc2VkIHN1Z2dlc3Rpb24ge3N0cmluZ31cblx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdCAqL1xuXHRcdFx0cG9zdFByb2Nlc3NUb2tlbjogbnVsbCxcblx0XHRcdFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUaGUgZ2V0IGZ1bmN0aW9uIGlzIGFzeW5jaHJvbm91c1xuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByZWZpeGVzLmFzeW5jXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRhc3luYyA6IGZhbHNlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBVc2UgYnVsayBsb2FkaW5nIG9mIHByZWZpeGVzOiBhbGwgcHJlZml4ZXMgYXJlIHJldHJpZXZlZCBvbkxvYWRcblx0XHRcdCAqIHVzaW5nIHRoZSBnZXQoKSBmdW5jdGlvbi4gQWx0ZXJuYXRpdmVseSwgZGlzYWJsZSBidWxrIGxvYWRpbmcsIHRvXG5cdFx0XHQgKiBjYWxsIHRoZSBnZXQoKSBmdW5jdGlvbiB3aGVuZXZlciBhIHRva2VuIG5lZWRzIGF1dG9jb21wbGV0aW9uIChpblxuXHRcdFx0ICogdGhpcyBjYXNlLCB0aGUgY29tcGxldGlvbiB0b2tlbiBpcyBwYXNzZWQgb24gdG8gdGhlIGdldCgpXG5cdFx0XHQgKiBmdW5jdGlvbikgd2hlbmV2ZXIgeW91IGhhdmUgYW4gYXV0b2NvbXBsZXRpb24gbGlzdCB0aGF0IGlzIHN0YXRpYywgYW5kIHRoYXQgZWFzaWx5XG5cdFx0XHQgKiBmaXRzIGluIG1lbW9yeSwgd2UgYWR2aWNlIHlvdSB0byBlbmFibGUgYnVsayBmb3IgcGVyZm9ybWFuY2Vcblx0XHRcdCAqIHJlYXNvbnMgKGVzcGVjaWFsbHkgYXMgd2Ugc3RvcmUgdGhlIGF1dG9jb21wbGV0aW9ucyBpbiBhIHRyaWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuYnVsa1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgdHJ1ZVxuXHRcdFx0ICovXG5cdFx0XHRidWxrIDogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQXV0by1zaG93IHRoZSBhdXRvY29tcGxldGlvbiBkaWFsb2cuIERpc2FibGluZyB0aGlzIHJlcXVpcmVzIHRoZVxuXHRcdFx0ICogdXNlciB0byBwcmVzcyBbY3RybHxjbWRdLXNwYWNlIHRvIHN1bW1vbiB0aGUgZGlhbG9nLiBOb3RlOiB0aGlzXG5cdFx0XHQgKiBvbmx5IHdvcmtzIHdoZW4gY29tcGxldGlvbnMgYXJlIG5vdCBmZXRjaGVkIGFzeW5jaHJvbm91c2x5XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuYXV0b1Nob3dcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IHRydWVcblx0XHRcdCAqL1xuXHRcdFx0YXV0b1Nob3cgOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvLWFkZCBwcmVmaXggZGVjbGFyYXRpb246IHdoZW4gcHJlZml4ZXMgYXJlIGxvYWRlZCBpbiBtZW1vcnlcblx0XHRcdCAqIChidWxrOiB0cnVlKSwgYW5kIHRoZSB1c2VyIHR5cGVzIGUuZy4gJ3JkZjonIGluIGEgdHJpcGxlIHBhdHRlcm4sXG5cdFx0XHQgKiB0aGUgZWRpdG9yIGF1dG9tYXRpY2FsbHkgYWRkIHRoaXMgcGFydGljdWxhciBQUkVGSVggZGVmaW5pdGlvbiB0b1xuXHRcdFx0ICogdGhlIHF1ZXJ5XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuYXV0b0FkZERlY2xhcmF0aW9uXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCB0cnVlXG5cdFx0XHQgKi9cblx0XHRcdGF1dG9BZGREZWNsYXJhdGlvbiA6IHRydWUsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG9tYXRpY2FsbHkgc3RvcmUgYXV0b2NvbXBsZXRpb25zIGluIGxvY2Fsc3RvcmFnZS4gVGhpcyBpc1xuXHRcdFx0ICogcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHRoZSBnZXQoKSBmdW5jdGlvbiBpcyBhbiBleHBlbnNpdmUgYWpheFxuXHRcdFx0ICogY2FsbC4gQXV0b2NvbXBsZXRpb25zIGFyZSBzdG9yZWQgZm9yIGEgcGVyaW9kIG9mIGEgbW9udGguIFNldFxuXHRcdFx0ICogdGhpcyBwcm9wZXJ0eSB0byBudWxsIChvciByZW1vdmUgaXQpLCB0byBkaXNhYmxlIHRoZSB1c2Ugb2Zcblx0XHRcdCAqIGxvY2Fsc3RvcmFnZS4gT3RoZXJ3aXNlLCBzZXQgYSBzdHJpbmcgdmFsdWUgKG9yIGEgZnVuY3Rpb25cblx0XHRcdCAqIHJldHVybmluZyBhIHN0cmluZyB2YWwpLCByZXR1cm5pbmcgdGhlIGtleSBpbiB3aGljaCB0byBzdG9yZSB0aGVcblx0XHRcdCAqIGRhdGEgTm90ZTogdGhpcyBmZWF0dXJlIG9ubHkgd29ya3MgY29tYmluZWQgd2l0aCBjb21wbGV0aW9uc1xuXHRcdFx0ICogbG9hZGVkIGluIG1lbW9yeSAoaS5lLiBidWxrOiB0cnVlKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByZWZpeGVzLnBlcnNpc3RlbnRcblx0XHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgXCJwcmVmaXhlc1wiXG5cdFx0XHQgKi9cblx0XHRcdHBlcnNpc3RlbnQgOiBcInByZWZpeGVzXCIsXG5cdFx0XHQvKipcblx0XHRcdCAqIEEgc2V0IG9mIGhhbmRsZXJzLiBNb3N0LCB0YWtlbiBmcm9tIHRoZSBDb2RlTWlycm9yIHNob3doaW50XG5cdFx0XHQgKiBwbHVnaW46IGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJlZml4ZXMuaGFuZGxlcnNcblx0XHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdFx0ICovXG5cdFx0XHRoYW5kbGVycyA6IHtcblx0XHRcdFx0XG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBGaXJlcyB3aGVuIGEgY29kZW1pcnJvciBjaGFuZ2Ugb2NjdXJzIGluIGEgcG9zaXRpb24gd2hlcmUgd2Vcblx0XHRcdFx0ICogY2FuIHNob3cgdGhpcyBwYXJ0aWN1bGFyIHR5cGUgb2YgYXV0b2NvbXBsZXRpb25cblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhbGlkUG9zaXRpb24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiAtbm90LSBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuaW52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdGludmFsaWRQb3NpdGlvbiA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5zaG93SGludFxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRzaG93biA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5zZWxlY3Rcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2VsZWN0IDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIFNlZSBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnBpY2tcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0cGljayA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5jbG9zZVxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRjbG9zZSA6IG51bGwsXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKiBQcm9wZXJ0eSBhdXRvY29tcGxldGlvbiBzZXR0aW5nc1xuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllc1xuXHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdCAqL1xuXHRcdHByb3BlcnRpZXMgOiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIENoZWNrIHdoZXRoZXIgdGhlIGN1cnNvciBpcyBpbiBhIHByb3BlciBwb3NpdGlvbiBmb3IgdGhpcyBhdXRvY29tcGxldGlvbi5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLmlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb25cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0geWFzcWUgZG9jXG5cdFx0XHQgKiBAcmV0dXJuIGJvb2xlYW5cblx0XHRcdCAqL1xuXHRcdFx0aXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvbiA6IGZ1bmN0aW9uKGNtKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgdG9rZW4gPSByb290LmdldENvbXBsZXRlVG9rZW4oY20pO1xuXHRcdFx0XHRpZiAodG9rZW4uc3RyaW5nLmxlbmd0aCA9PSAwKSBcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7IC8vd2Ugd2FudCAtc29tZXRoaW5nLSB0byBhdXRvY29tcGxldGVcblx0XHRcdFx0aWYgKHRva2VuLnN0cmluZy5pbmRleE9mKFwiP1wiKSA9PSAwKVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gd2UgYXJlIHR5cGluZyBhIHZhclxuXHRcdFx0XHRpZiAoJC5pbkFycmF5KFwiYVwiLCB0b2tlbi5zdGF0ZS5wb3NzaWJsZUN1cnJlbnQpID49IDApXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7Ly8gcHJlZGljYXRlIHBvc1xuXHRcdFx0XHR2YXIgY3VyID0gY20uZ2V0Q3Vyc29yKCk7XG5cdFx0XHRcdHZhciBwcmV2aW91c1Rva2VuID0gZ2V0UHJldmlvdXNOb25Xc1Rva2VuKGNtLCBjdXIubGluZSwgdG9rZW4pO1xuXHRcdFx0XHRpZiAocHJldmlvdXNUb2tlbi5zdHJpbmcgPT0gXCJyZGZzOnN1YlByb3BlcnR5T2ZcIilcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0XHQvLyBobW0sIHdlIHdvdWxkIGxpa2UgLWJldHRlci0gY2hlY2tzIGhlcmUsIGUuZy4gY2hlY2tpbmcgd2hldGhlciB3ZSBhcmVcblx0XHRcdFx0Ly8gaW4gYSBzdWJqZWN0LCBhbmQgd2hldGhlciBuZXh0IGl0ZW0gaXMgYSByZGZzOnN1YnByb3BlcnR5b2YuXG5cdFx0XHRcdC8vIGRpZmZpY3VsdCB0aG91Z2guLi4gdGhlIGdyYW1tYXIgd2UgdXNlIGlzIHVucmVsaWFibGUgd2hlbiB0aGUgcXVlcnlcblx0XHRcdFx0Ly8gaXMgaW52YWxpZCAoaS5lLiBkdXJpbmcgdHlwaW5nKSwgYW5kIG9mdGVuIHRoZSBwcmVkaWNhdGUgaXMgbm90IHR5cGVkXG5cdFx0XHRcdC8vIHlldCwgd2hlbiB3ZSBhcmUgYnVzeSB3cml0aW5nIHRoZSBzdWJqZWN0Li4uXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIEdldCB0aGUgYXV0b2NvbXBsZXRpb25zLiBFaXRoZXIgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFuXG5cdFx0XHQgKiBhcnJheSwgb3IgYW4gYWN0dWFsIGFycmF5LiBUaGUgYXJyYXkgc2hvdWxkIGJlIGluIHRoZSBmb3JtIFtcImh0dHA6Ly8uLi5cIiwuLi4uXVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuZ2V0XG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvbnxhcnJheVxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdHxzdHJpbmd9IFdoZW4gYnVsayBpcyBkaXNhYmxlZCwgdXNlIHRoaXMgdG9rZW4gdG8gYXV0b2NvbXBsZXRlXG5cdFx0XHQgKiBAcGFyYW0gY29tcGxldGlvblR5cGUge3N0cmluZ30gd2hhdCB0eXBlIG9mIGF1dG9jb21wbGV0aW9uIHdlIHRyeSB0byBhdHRlbXB0LiBDbGFzc2VzLCBwcm9wZXJ0aWVzLCBvciBwcmVmaXhlcylcblx0XHRcdCAqIEBwYXJhbSBjYWxsYmFjayB7ZnVuY3Rpb259IEluIGNhc2UgYXN5bmMgaXMgZW5hYmxlZCwgdXNlIHRoaXMgY2FsbGJhY2tcblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uIChZQVNRRS5mZXRjaEZyb21Mb3YpXG5cdFx0XHQgKi9cblx0XHRcdGdldCA6IHJvb3QuZmV0Y2hGcm9tTG92LFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQcmVwcm9jZXNzZXMgdGhlIGNvZGVtaXJyb3IgdG9rZW4gYmVmb3JlIG1hdGNoaW5nIGl0IHdpdGggb3VyIGF1dG9jb21wbGV0aW9ucyBsaXN0LlxuXHRcdFx0ICogVXNlIHRoaXMgZm9yIGUuZy4gYXV0b2NvbXBsZXRpbmcgcHJlZml4ZWQgcmVzb3VyY2VzIHdoZW4geW91ciBhdXRvY29tcGxldGlvbiBsaXN0IGNvbnRhaW5zIG9ubHkgZnVsbC1sZW5ndGggVVJJc1xuXHRcdFx0ICogSS5lLiwgZm9hZjpuYW1lIC0+IGh0dHA6Ly94bWxucy5jb20vZm9hZi8wLjEvbmFtZVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMucHJlUHJvY2Vzc1Rva2VuXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdH0gVGhlIENvZGVNaXJyb3IgdG9rZW4sIGluY2x1ZGluZyB0aGUgcG9zaXRpb24gb2YgdGhpcyB0b2tlbiBpbiB0aGUgcXVlcnksIGFzIHdlbGwgYXMgdGhlIGFjdHVhbCBzdHJpbmdcblx0XHRcdCAqIEByZXR1cm4gdG9rZW4ge29iamVjdH0gUmV0dXJuIHRoZSBzYW1lIHRva2VuIChwb3NzaWJseSB3aXRoIG1vcmUgZGF0YSBhZGRlZCB0byBpdCwgd2hpY2ggeW91IGNhbiB1c2UgaW4gdGhlIHBvc3RQcm9jZXNzaW5nIHN0ZXApXG5cdFx0XHQgKiBAZGVmYXVsdCBmdW5jdGlvblxuXHRcdFx0ICovXG5cdFx0XHRwcmVQcm9jZXNzVG9rZW46IHByZXByb2Nlc3NSZXNvdXJjZVRva2VuRm9yQ29tcGxldGlvbixcblx0XHRcdC8qKlxuXHRcdFx0ICogUG9zdHByb2Nlc3NlcyB0aGUgYXV0b2NvbXBsZXRpb24gc3VnZ2VzdGlvbi5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIHJldHVybmluZyBhIHByZWZpeGVkIFVSSSBiYXNlZCBvbiBhIGZ1bGwtbGVuZ3RoIFVSSSBzdWdnZXN0aW9uXG5cdFx0XHQgKiBJLmUuLCBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWUgLT4gZm9hZjpuYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5wb3N0UHJvY2Vzc1Rva2VuXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdH0gVGhlIENvZGVNaXJyb3IgdG9rZW4sIGluY2x1ZGluZyB0aGUgcG9zaXRpb24gb2YgdGhpcyB0b2tlbiBpbiB0aGUgcXVlcnksIGFzIHdlbGwgYXMgdGhlIGFjdHVhbCBzdHJpbmdcblx0XHRcdCAqIEBwYXJhbSBzdWdnZXN0aW9uIHtzdHJpbmd9IFRoZSBzdWdnZXN0aW9uIHdoaWNoIHlvdSBhcmUgcG9zdCBwcm9jZXNzaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHBvc3QtcHJvY2Vzc2VkIHN1Z2dlc3Rpb24ge3N0cmluZ31cblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uXG5cdFx0XHQgKi9cblx0XHRcdHBvc3RQcm9jZXNzVG9rZW46IHBvc3Rwcm9jZXNzUmVzb3VyY2VUb2tlbkZvckNvbXBsZXRpb24sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVGhlIGdldCBmdW5jdGlvbiBpcyBhc3luY2hyb25vdXNcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLmFzeW5jXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCB0cnVlXG5cdFx0XHQgKi9cblx0XHRcdGFzeW5jIDogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogVXNlIGJ1bGsgbG9hZGluZyBvZiBwcm9wZXJ0aWVzOiBhbGwgcHJvcGVydGllcyBhcmUgcmV0cmlldmVkXG5cdFx0XHQgKiBvbkxvYWQgdXNpbmcgdGhlIGdldCgpIGZ1bmN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBkaXNhYmxlIGJ1bGtcblx0XHRcdCAqIGxvYWRpbmcsIHRvIGNhbGwgdGhlIGdldCgpIGZ1bmN0aW9uIHdoZW5ldmVyIGEgdG9rZW4gbmVlZHNcblx0XHRcdCAqIGF1dG9jb21wbGV0aW9uIChpbiB0aGlzIGNhc2UsIHRoZSBjb21wbGV0aW9uIHRva2VuIGlzIHBhc3NlZCBvblxuXHRcdFx0ICogdG8gdGhlIGdldCgpIGZ1bmN0aW9uKSB3aGVuZXZlciB5b3UgaGF2ZSBhbiBhdXRvY29tcGxldGlvbiBsaXN0IHRoYXQgaXMgc3RhdGljLCBhbmQgXG5cdFx0XHQgKiB0aGF0IGVhc2lseSBmaXRzIGluIG1lbW9yeSwgd2UgYWR2aWNlIHlvdSB0byBlbmFibGUgYnVsayBmb3Jcblx0XHRcdCAqIHBlcmZvcm1hbmNlIHJlYXNvbnMgKGVzcGVjaWFsbHkgYXMgd2Ugc3RvcmUgdGhlIGF1dG9jb21wbGV0aW9uc1xuXHRcdFx0ICogaW4gYSB0cmllKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuYnVsa1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgZmFsc2Vcblx0XHRcdCAqL1xuXHRcdFx0YnVsayA6IGZhbHNlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvLXNob3cgdGhlIGF1dG9jb21wbGV0aW9uIGRpYWxvZy4gRGlzYWJsaW5nIHRoaXMgcmVxdWlyZXMgdGhlXG5cdFx0XHQgKiB1c2VyIHRvIHByZXNzIFtjdHJsfGNtZF0tc3BhY2UgdG8gc3VtbW9uIHRoZSBkaWFsb2cuIE5vdGU6IHRoaXNcblx0XHRcdCAqIG9ubHkgd29ya3Mgd2hlbiBjb21wbGV0aW9ucyBhcmUgbm90IGZldGNoZWQgYXN5bmNocm9ub3VzbHlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLmF1dG9TaG93XG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRhdXRvU2hvdyA6IGZhbHNlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvbWF0aWNhbGx5IHN0b3JlIGF1dG9jb21wbGV0aW9ucyBpbiBsb2NhbHN0b3JhZ2UuIFRoaXMgaXNcblx0XHRcdCAqIHBhcnRpY3VsYXJseSB1c2VmdWwgd2hlbiB0aGUgZ2V0KCkgZnVuY3Rpb24gaXMgYW4gZXhwZW5zaXZlIGFqYXhcblx0XHRcdCAqIGNhbGwuIEF1dG9jb21wbGV0aW9ucyBhcmUgc3RvcmVkIGZvciBhIHBlcmlvZCBvZiBhIG1vbnRoLiBTZXRcblx0XHRcdCAqIHRoaXMgcHJvcGVydHkgdG8gbnVsbCAob3IgcmVtb3ZlIGl0KSwgdG8gZGlzYWJsZSB0aGUgdXNlIG9mXG5cdFx0XHQgKiBsb2NhbHN0b3JhZ2UuIE90aGVyd2lzZSwgc2V0IGEgc3RyaW5nIHZhbHVlIChvciBhIGZ1bmN0aW9uXG5cdFx0XHQgKiByZXR1cm5pbmcgYSBzdHJpbmcgdmFsKSwgcmV0dXJuaW5nIHRoZSBrZXkgaW4gd2hpY2ggdG8gc3RvcmUgdGhlXG5cdFx0XHQgKiBkYXRhIE5vdGU6IHRoaXMgZmVhdHVyZSBvbmx5IHdvcmtzIGNvbWJpbmVkIHdpdGggY29tcGxldGlvbnNcblx0XHRcdCAqIGxvYWRlZCBpbiBtZW1vcnkgKGkuZS4gYnVsazogdHJ1ZSlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLnBlcnNpc3RlbnRcblx0XHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgXCJwcm9wZXJ0aWVzXCJcblx0XHRcdCAqL1xuXHRcdFx0cGVyc2lzdGVudCA6IFwicHJvcGVydGllc1wiLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBIHNldCBvZiBoYW5kbGVycy4gTW9zdCwgdGFrZW4gZnJvbSB0aGUgQ29kZU1pcnJvciBzaG93aGludFxuXHRcdFx0ICogcGx1Z2luOiBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaGFuZGxlcnNcblx0XHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdFx0ICovXG5cdFx0XHRoYW5kbGVycyA6IHtcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIEZpcmVzIHdoZW4gYSBjb2RlbWlycm9yIGNoYW5nZSBvY2N1cnMgaW4gYSBwb3NpdGlvbiB3aGVyZSB3ZVxuXHRcdFx0XHQgKiBjYW4gc2hvdyB0aGlzIHBhcnRpY3VsYXIgdHlwZSBvZiBhdXRvY29tcGxldGlvblxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLmhhbmRsZXJzLnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgWUFTUUUuc2hvd0NvbXBsZXRpb25Ob3RpZmljYXRpb25cblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhbGlkUG9zaXRpb24gOiByb290LnNob3dDb21wbGV0aW9uTm90aWZpY2F0aW9uLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiAtbm90LSBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaGFuZGxlcnMuaW52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IFlBU1FFLmhpZGVDb21wbGV0aW9uTm90aWZpY2F0aW9uXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpbnZhbGlkUG9zaXRpb24gOiByb290LmhpZGVDb21wbGV0aW9uTm90aWZpY2F0aW9uLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaGFuZGxlcnMuc2hvd25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2hvd24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuc2VsZWN0XG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHNlbGVjdCA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMucHJvcGVydGllcy5oYW5kbGVycy5waWNrXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHBpY2sgOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMuaGFuZGxlcnMuY2xvc2Vcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0Y2xvc2UgOiBudWxsLFxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICogQ2xhc3MgYXV0b2NvbXBsZXRpb24gc2V0dGluZ3Ncblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXNcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHRjbGFzc2VzIDoge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgaW4gYSBwcm9wZXIgcG9zaXRpb24gZm9yIHRoaXMgYXV0b2NvbXBsZXRpb24uXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5pc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIHlhc3FlIGRvY1xuXHRcdFx0ICogQHJldHVybiBib29sZWFuXG5cdFx0XHQgKi9cblx0XHRcdGlzVmFsaWRDb21wbGV0aW9uUG9zaXRpb24gOiBmdW5jdGlvbihjbSkge1xuXHRcdFx0XHR2YXIgdG9rZW4gPSByb290LmdldENvbXBsZXRlVG9rZW4oY20pO1xuXHRcdFx0XHRpZiAodG9rZW4uc3RyaW5nLmluZGV4T2YoXCI/XCIpID09IDApXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR2YXIgY3VyID0gY20uZ2V0Q3Vyc29yKCk7XG5cdFx0XHRcdHZhciBwcmV2aW91c1Rva2VuID0gZ2V0UHJldmlvdXNOb25Xc1Rva2VuKGNtLCBjdXIubGluZSwgdG9rZW4pO1xuXHRcdFx0XHRpZiAocHJldmlvdXNUb2tlbi5zdHJpbmcgPT0gXCJhXCIpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c1Rva2VuLnN0cmluZyA9PSBcInJkZjp0eXBlXCIpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c1Rva2VuLnN0cmluZyA9PSBcInJkZnM6ZG9tYWluXCIpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdGlmIChwcmV2aW91c1Rva2VuLnN0cmluZyA9PSBcInJkZnM6cmFuZ2VcIilcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogR2V0IHRoZSBhdXRvY29tcGxldGlvbnMuIEVpdGhlciBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW5cblx0XHRcdCAqIGFycmF5LCBvciBhbiBhY3R1YWwgYXJyYXkuIFRoZSBhcnJheSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gW1wiaHR0cDovLy4uLlwiLC4uLi5dXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5nZXRcblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9ufGFycmF5XG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fHN0cmluZ30gV2hlbiBidWxrIGlzIGRpc2FibGVkLCB1c2UgdGhpcyB0b2tlbiB0byBhdXRvY29tcGxldGVcblx0XHRcdCAqIEBwYXJhbSBjb21wbGV0aW9uVHlwZSB7c3RyaW5nfSB3aGF0IHR5cGUgb2YgYXV0b2NvbXBsZXRpb24gd2UgdHJ5IHRvIGF0dGVtcHQuIENsYXNzZXMsIHByb3BlcnRpZXMsIG9yIHByZWZpeGVzKVxuXHRcdFx0ICogQHBhcmFtIGNhbGxiYWNrIHtmdW5jdGlvbn0gSW4gY2FzZSBhc3luYyBpcyBlbmFibGVkLCB1c2UgdGhpcyBjYWxsYmFja1xuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb24gKFlBU1FFLmZldGNoRnJvbUxvdilcblx0XHRcdCAqL1xuXHRcdFx0Z2V0IDogcm9vdC5mZXRjaEZyb21Mb3YsXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogUHJlcHJvY2Vzc2VzIHRoZSBjb2RlbWlycm9yIHRva2VuIGJlZm9yZSBtYXRjaGluZyBpdCB3aXRoIG91ciBhdXRvY29tcGxldGlvbnMgbGlzdC5cblx0XHRcdCAqIFVzZSB0aGlzIGZvciBlLmcuIGF1dG9jb21wbGV0aW5nIHByZWZpeGVkIHJlc291cmNlcyB3aGVuIHlvdXIgYXV0b2NvbXBsZXRpb24gbGlzdCBjb250YWlucyBvbmx5IGZ1bGwtbGVuZ3RoIFVSSXNcblx0XHRcdCAqIEkuZS4sIGZvYWY6bmFtZSAtPiBodHRwOi8veG1sbnMuY29tL2ZvYWYvMC4xL25hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5wcm9wZXJ0aWVzLnByZVByb2Nlc3NUb2tlblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R9IFRoZSBDb2RlTWlycm9yIHRva2VuLCBpbmNsdWRpbmcgdGhlIHBvc2l0aW9uIG9mIHRoaXMgdG9rZW4gaW4gdGhlIHF1ZXJ5LCBhcyB3ZWxsIGFzIHRoZSBhY3R1YWwgc3RyaW5nXG5cdFx0XHQgKiBAcmV0dXJuIHRva2VuIHtvYmplY3R9IFJldHVybiB0aGUgc2FtZSB0b2tlbiAocG9zc2libHkgd2l0aCBtb3JlIGRhdGEgYWRkZWQgdG8gaXQsIHdoaWNoIHlvdSBjYW4gdXNlIGluIHRoZSBwb3N0UHJvY2Vzc2luZyBzdGVwKVxuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb25cblx0XHRcdCAqL1xuXHRcdFx0cHJlUHJvY2Vzc1Rva2VuOiBwcmVwcm9jZXNzUmVzb3VyY2VUb2tlbkZvckNvbXBsZXRpb24sXG5cdFx0XHQvKipcblx0XHRcdCAqIFBvc3Rwcm9jZXNzZXMgdGhlIGF1dG9jb21wbGV0aW9uIHN1Z2dlc3Rpb24uXG5cdFx0XHQgKiBVc2UgdGhpcyBmb3IgZS5nLiByZXR1cm5pbmcgYSBwcmVmaXhlZCBVUkkgYmFzZWQgb24gYSBmdWxsLWxlbmd0aCBVUkkgc3VnZ2VzdGlvblxuXHRcdFx0ICogSS5lLiwgaHR0cDovL3htbG5zLmNvbS9mb2FmLzAuMS9uYW1lIC0+IGZvYWY6bmFtZVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXMucG9zdFByb2Nlc3NUb2tlblxuXHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdCAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuXHRcdFx0ICogQHBhcmFtIHRva2VuIHtvYmplY3R9IFRoZSBDb2RlTWlycm9yIHRva2VuLCBpbmNsdWRpbmcgdGhlIHBvc2l0aW9uIG9mIHRoaXMgdG9rZW4gaW4gdGhlIHF1ZXJ5LCBhcyB3ZWxsIGFzIHRoZSBhY3R1YWwgc3RyaW5nXG5cdFx0XHQgKiBAcGFyYW0gc3VnZ2VzdGlvbiB7c3RyaW5nfSBUaGUgc3VnZ2VzdGlvbiB3aGljaCB5b3UgYXJlIHBvc3QgcHJvY2Vzc2luZ1xuXHRcdFx0ICogQHJldHVybiBwb3N0LXByb2Nlc3NlZCBzdWdnZXN0aW9uIHtzdHJpbmd9XG5cdFx0XHQgKiBAZGVmYXVsdCBmdW5jdGlvblxuXHRcdFx0ICovXG5cdFx0XHRwb3N0UHJvY2Vzc1Rva2VuOiBwb3N0cHJvY2Vzc1Jlc291cmNlVG9rZW5Gb3JDb21wbGV0aW9uLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUaGUgZ2V0IGZ1bmN0aW9uIGlzIGFzeW5jaHJvbm91c1xuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuYXN5bmNcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IHRydWVcblx0XHRcdCAqL1xuXHRcdFx0YXN5bmMgOiB0cnVlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBVc2UgYnVsayBsb2FkaW5nIG9mIGNsYXNzZXM6IGFsbCBjbGFzc2VzIGFyZSByZXRyaWV2ZWQgb25Mb2FkXG5cdFx0XHQgKiB1c2luZyB0aGUgZ2V0KCkgZnVuY3Rpb24uIEFsdGVybmF0aXZlbHksIGRpc2FibGUgYnVsayBsb2FkaW5nLCB0b1xuXHRcdFx0ICogY2FsbCB0aGUgZ2V0KCkgZnVuY3Rpb24gd2hlbmV2ZXIgYSB0b2tlbiBuZWVkcyBhdXRvY29tcGxldGlvbiAoaW5cblx0XHRcdCAqIHRoaXMgY2FzZSwgdGhlIGNvbXBsZXRpb24gdG9rZW4gaXMgcGFzc2VkIG9uIHRvIHRoZSBnZXQoKVxuXHRcdFx0ICogZnVuY3Rpb24pIHdoZW5ldmVyIHlvdSBoYXZlIGFuIGF1dG9jb21wbGV0aW9uIGxpc3QgdGhhdCBpcyBzdGF0aWMsIGFuZCB0aGF0IGVhc2lseVxuXHRcdFx0ICogZml0cyBpbiBtZW1vcnksIHdlIGFkdmljZSB5b3UgdG8gZW5hYmxlIGJ1bGsgZm9yIHBlcmZvcm1hbmNlXG5cdFx0XHQgKiByZWFzb25zIChlc3BlY2lhbGx5IGFzIHdlIHN0b3JlIHRoZSBhdXRvY29tcGxldGlvbnMgaW4gYSB0cmllKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuYnVsa1xuXHRcdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdFx0ICogQGRlZmF1bHQgZmFsc2Vcblx0XHRcdCAqL1xuXHRcdFx0YnVsayA6IGZhbHNlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvLXNob3cgdGhlIGF1dG9jb21wbGV0aW9uIGRpYWxvZy4gRGlzYWJsaW5nIHRoaXMgcmVxdWlyZXMgdGhlXG5cdFx0XHQgKiB1c2VyIHRvIHByZXNzIFtjdHJsfGNtZF0tc3BhY2UgdG8gc3VtbW9uIHRoZSBkaWFsb2cuIE5vdGU6IHRoaXNcblx0XHRcdCAqIG9ubHkgd29ya3Mgd2hlbiBjb21wbGV0aW9ucyBhcmUgbm90IGZldGNoZWQgYXN5bmNocm9ub3VzbHlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmF1dG9TaG93XG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRhdXRvU2hvdyA6IGZhbHNlLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBdXRvbWF0aWNhbGx5IHN0b3JlIGF1dG9jb21wbGV0aW9ucyBpbiBsb2NhbHN0b3JhZ2UgKG9ubHkgd29ya3Mgd2hlbiAnYnVsaycgaXMgc2V0IHRvIHRydWUpXG5cdFx0XHQgKiBUaGlzIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgd2hlbiB0aGUgZ2V0KCkgZnVuY3Rpb24gaXMgYW4gZXhwZW5zaXZlIGFqYXhcblx0XHRcdCAqIGNhbGwuIEF1dG9jb21wbGV0aW9ucyBhcmUgc3RvcmVkIGZvciBhIHBlcmlvZCBvZiBhIG1vbnRoLiBTZXRcblx0XHRcdCAqIHRoaXMgcHJvcGVydHkgdG8gbnVsbCAob3IgcmVtb3ZlIGl0KSwgdG8gZGlzYWJsZSB0aGUgdXNlIG9mXG5cdFx0XHQgKiBsb2NhbHN0b3JhZ2UuIE90aGVyd2lzZSwgc2V0IGEgc3RyaW5nIHZhbHVlIChvciBhIGZ1bmN0aW9uXG5cdFx0XHQgKiByZXR1cm5pbmcgYSBzdHJpbmcgdmFsKSwgcmV0dXJuaW5nIHRoZSBrZXkgaW4gd2hpY2ggdG8gc3RvcmUgdGhlXG5cdFx0XHQgKiBkYXRhIE5vdGU6IHRoaXMgZmVhdHVyZSBvbmx5IHdvcmtzIGNvbWJpbmVkIHdpdGggY29tcGxldGlvbnNcblx0XHRcdCAqIGxvYWRlZCBpbiBtZW1vcnkgKGkuZS4gYnVsazogdHJ1ZSlcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLnBlcnNpc3RlbnRcblx0XHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgXCJjbGFzc2VzXCJcblx0XHRcdCAqL1xuXHRcdFx0cGVyc2lzdGVudCA6IFwiY2xhc3Nlc1wiLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBIHNldCBvZiBoYW5kbGVycy4gTW9zdCwgdGFrZW4gZnJvbSB0aGUgQ29kZU1pcnJvciBzaG93aGludFxuXHRcdFx0ICogcGx1Z2luOiBodHRwOi8vY29kZW1pcnJvci5uZXQvZG9jL21hbnVhbC5odG1sI2FkZG9uX3Nob3ctaGludFxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnNcblx0XHRcdCAqIEB0eXBlIG9iamVjdFxuXHRcdFx0ICovXG5cdFx0XHRoYW5kbGVycyA6IHtcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIEZpcmVzIHdoZW4gYSBjb2RlbWlycm9yIGNoYW5nZSBvY2N1cnMgaW4gYSBwb3NpdGlvbiB3aGVyZSB3ZVxuXHRcdFx0XHQgKiBjYW4gc2hvdyB0aGlzIHBhcnRpY3VsYXIgdHlwZSBvZiBhdXRvY29tcGxldGlvblxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy5jbGFzc2VzLmhhbmRsZXJzLnZhbGlkUG9zaXRpb25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgWUFTUUUuc2hvd0NvbXBsZXRpb25Ob3RpZmljYXRpb25cblx0XHRcdFx0ICovXG5cdFx0XHRcdHZhbGlkUG9zaXRpb24gOiByb290LnNob3dDb21wbGV0aW9uTm90aWZpY2F0aW9uLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiAtbm90LSBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuaW52YWxpZFBvc2l0aW9uXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IFlBU1FFLmhpZGVDb21wbGV0aW9uTm90aWZpY2F0aW9uXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpbnZhbGlkUG9zaXRpb24gOiByb290LmhpZGVDb21wbGV0aW9uTm90aWZpY2F0aW9uLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuc2hvd25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2hvd24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuc2VsZWN0XG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHNlbGVjdCA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMuY2xhc3Nlcy5oYW5kbGVycy5waWNrXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHBpY2sgOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLmNsYXNzZXMuaGFuZGxlcnMuY2xvc2Vcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0Y2xvc2UgOiBudWxsLFxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICogVmFyaWFibGUgbmFtZXMgYXV0b2NvbXBsZXRpb24gc2V0dGluZ3Ncblx0XHQgKiBcblx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnByb3BlcnRpZXNcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHR2YXJpYWJsZU5hbWVzIDoge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBDaGVjayB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgaW4gYSBwcm9wZXIgcG9zaXRpb24gZm9yIHRoaXMgYXV0b2NvbXBsZXRpb24uXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5pc1ZhbGlkQ29tcGxldGlvblBvc2l0aW9uXG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0ICogQHBhcmFtIHlhc3FlIHtkb2N9XG5cdFx0XHQgKiBAcmV0dXJuIGJvb2xlYW5cblx0XHRcdCAqL1xuXHRcdFx0aXNWYWxpZENvbXBsZXRpb25Qb3NpdGlvbiA6IGZ1bmN0aW9uKGNtKSB7XG5cdFx0XHRcdHZhciB0b2tlbiA9IGNtLmdldFRva2VuQXQoY20uZ2V0Q3Vyc29yKCkpO1xuXHRcdFx0XHRpZiAodG9rZW4udHlwZSAhPSBcIndzXCIpIHtcblx0XHRcdFx0XHR0b2tlbiA9IHJvb3QuZ2V0Q29tcGxldGVUb2tlbihjbSwgdG9rZW4pO1xuXHRcdFx0XHRcdGlmICh0b2tlbiAmJiB0b2tlbi5zdHJpbmcuaW5kZXhPZihcIj9cIikgPT0gMCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIEdldCB0aGUgYXV0b2NvbXBsZXRpb25zLiBFaXRoZXIgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFuXG5cdFx0XHQgKiBhcnJheSwgb3IgYW4gYWN0dWFsIGFycmF5LiBUaGUgYXJyYXkgc2hvdWxkIGJlIGluIHRoZSBmb3JtIFtcImh0dHA6Ly8uLi5cIiwuLi4uXVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuZ2V0XG5cdFx0XHQgKiBAdHlwZSBmdW5jdGlvbnxhcnJheVxuXHRcdFx0ICogQHBhcmFtIGRvYyB7WUFTUUV9XG5cdFx0XHQgKiBAcGFyYW0gdG9rZW4ge29iamVjdHxzdHJpbmd9IFdoZW4gYnVsayBpcyBkaXNhYmxlZCwgdXNlIHRoaXMgdG9rZW4gdG8gYXV0b2NvbXBsZXRlXG5cdFx0XHQgKiBAcGFyYW0gY29tcGxldGlvblR5cGUge3N0cmluZ30gd2hhdCB0eXBlIG9mIGF1dG9jb21wbGV0aW9uIHdlIHRyeSB0byBhdHRlbXB0LiBDbGFzc2VzLCBwcm9wZXJ0aWVzLCBvciBwcmVmaXhlcylcblx0XHRcdCAqIEBwYXJhbSBjYWxsYmFjayB7ZnVuY3Rpb259IEluIGNhc2UgYXN5bmMgaXMgZW5hYmxlZCwgdXNlIHRoaXMgY2FsbGJhY2tcblx0XHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uIChZQVNRRS5hdXRvY29tcGxldGVWYXJpYWJsZXMpXG5cdFx0XHQgKi9cblx0XHRcdGdldCA6IHJvb3QuYXV0b2NvbXBsZXRlVmFyaWFibGVzLFxuXHRcdFx0XHRcdFx0XG5cdFx0XHQvKipcblx0XHRcdCAqIFByZXByb2Nlc3NlcyB0aGUgY29kZW1pcnJvciB0b2tlbiBiZWZvcmUgbWF0Y2hpbmcgaXQgd2l0aCBvdXIgYXV0b2NvbXBsZXRpb25zIGxpc3QuXG5cdFx0XHQgKiBVc2UgdGhpcyBmb3IgZS5nLiBhdXRvY29tcGxldGluZyBwcmVmaXhlZCByZXNvdXJjZXMgd2hlbiB5b3VyIGF1dG9jb21wbGV0aW9uIGxpc3QgY29udGFpbnMgb25seSBmdWxsLWxlbmd0aCBVUklzXG5cdFx0XHQgKiBJLmUuLCBmb2FmOm5hbWUgLT4gaHR0cDovL3htbG5zLmNvbS9mb2FmLzAuMS9uYW1lXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5wcmVQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHJldHVybiB0b2tlbiB7b2JqZWN0fSBSZXR1cm4gdGhlIHNhbWUgdG9rZW4gKHBvc3NpYmx5IHdpdGggbW9yZSBkYXRhIGFkZGVkIHRvIGl0LCB3aGljaCB5b3UgY2FuIHVzZSBpbiB0aGUgcG9zdFByb2Nlc3Npbmcgc3RlcClcblx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdCAqL1xuXHRcdFx0cHJlUHJvY2Vzc1Rva2VuOiBudWxsLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBQb3N0cHJvY2Vzc2VzIHRoZSBhdXRvY29tcGxldGlvbiBzdWdnZXN0aW9uLlxuXHRcdFx0ICogVXNlIHRoaXMgZm9yIGUuZy4gcmV0dXJuaW5nIGEgcHJlZml4ZWQgVVJJIGJhc2VkIG9uIGEgZnVsbC1sZW5ndGggVVJJIHN1Z2dlc3Rpb25cblx0XHRcdCAqIEkuZS4sIGh0dHA6Ly94bWxucy5jb20vZm9hZi8wLjEvbmFtZSAtPiBmb2FmOm5hbWVcblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLnBvc3RQcm9jZXNzVG9rZW5cblx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHQgKiBAcGFyYW0gZG9jIHtZQVNRRX1cblx0XHRcdCAqIEBwYXJhbSB0b2tlbiB7b2JqZWN0fSBUaGUgQ29kZU1pcnJvciB0b2tlbiwgaW5jbHVkaW5nIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHRva2VuIGluIHRoZSBxdWVyeSwgYXMgd2VsbCBhcyB0aGUgYWN0dWFsIHN0cmluZ1xuXHRcdFx0ICogQHBhcmFtIHN1Z2dlc3Rpb24ge3N0cmluZ30gVGhlIHN1Z2dlc3Rpb24gd2hpY2ggeW91IGFyZSBwb3N0IHByb2Nlc3Npbmdcblx0XHRcdCAqIEByZXR1cm4gcG9zdC1wcm9jZXNzZWQgc3VnZ2VzdGlvbiB7c3RyaW5nfVxuXHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0ICovXG5cdFx0XHRwb3N0UHJvY2Vzc1Rva2VuOiBudWxsLFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBUaGUgZ2V0IGZ1bmN0aW9uIGlzIGFzeW5jaHJvbm91c1xuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuYXN5bmNcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGFzeW5jIDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIFVzZSBidWxrIGxvYWRpbmcgb2YgdmFyaWFibGVOYW1lczogYWxsIHZhcmlhYmxlIG5hbWVzIGFyZSByZXRyaWV2ZWRcblx0XHRcdCAqIG9uTG9hZCB1c2luZyB0aGUgZ2V0KCkgZnVuY3Rpb24uIEFsdGVybmF0aXZlbHksIGRpc2FibGUgYnVsa1xuXHRcdFx0ICogbG9hZGluZywgdG8gY2FsbCB0aGUgZ2V0KCkgZnVuY3Rpb24gd2hlbmV2ZXIgYSB0b2tlbiBuZWVkc1xuXHRcdFx0ICogYXV0b2NvbXBsZXRpb24gKGluIHRoaXMgY2FzZSwgdGhlIGNvbXBsZXRpb24gdG9rZW4gaXMgcGFzc2VkIG9uXG5cdFx0XHQgKiB0byB0aGUgZ2V0KCkgZnVuY3Rpb24pIHdoZW5ldmVyIHlvdSBoYXZlIGFuIGF1dG9jb21wbGV0aW9uIGxpc3QgdGhhdCBpcyBzdGF0aWMsIGFuZCBcblx0XHRcdCAqIHRoYXQgZWFzaWx5IGZpdHMgaW4gbWVtb3J5LCB3ZSBhZHZpY2UgeW91IHRvIGVuYWJsZSBidWxrIGZvclxuXHRcdFx0ICogcGVyZm9ybWFuY2UgcmVhc29ucyAoZXNwZWNpYWxseSBhcyB3ZSBzdG9yZSB0aGUgYXV0b2NvbXBsZXRpb25zXG5cdFx0XHQgKiBpbiBhIHRyaWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5idWxrXG5cdFx0XHQgKiBAdHlwZSBib29sZWFuXG5cdFx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdFx0ICovXG5cdFx0XHRidWxrIDogZmFsc2UsXG5cdFx0XHQvKipcblx0XHRcdCAqIEF1dG8tc2hvdyB0aGUgYXV0b2NvbXBsZXRpb24gZGlhbG9nLiBEaXNhYmxpbmcgdGhpcyByZXF1aXJlcyB0aGVcblx0XHRcdCAqIHVzZXIgdG8gcHJlc3MgW2N0cmx8Y21kXS1zcGFjZSB0byBzdW1tb24gdGhlIGRpYWxvZy4gTm90ZTogdGhpc1xuXHRcdFx0ICogb25seSB3b3JrcyB3aGVuIGNvbXBsZXRpb25zIGFyZSBub3QgZmV0Y2hlZCBhc3luY2hyb25vdXNseVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuYXV0b1Nob3dcblx0XHRcdCAqIEB0eXBlIGJvb2xlYW5cblx0XHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0XHQgKi9cblx0XHRcdGF1dG9TaG93IDogdHJ1ZSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQXV0b21hdGljYWxseSBzdG9yZSBhdXRvY29tcGxldGlvbnMgaW4gbG9jYWxzdG9yYWdlLiBUaGlzIGlzXG5cdFx0XHQgKiBwYXJ0aWN1bGFybHkgdXNlZnVsIHdoZW4gdGhlIGdldCgpIGZ1bmN0aW9uIGlzIGFuIGV4cGVuc2l2ZSBhamF4XG5cdFx0XHQgKiBjYWxsLiBBdXRvY29tcGxldGlvbnMgYXJlIHN0b3JlZCBmb3IgYSBwZXJpb2Qgb2YgYSBtb250aC4gU2V0XG5cdFx0XHQgKiB0aGlzIHByb3BlcnR5IHRvIG51bGwgKG9yIHJlbW92ZSBpdCksIHRvIGRpc2FibGUgdGhlIHVzZSBvZlxuXHRcdFx0ICogbG9jYWxzdG9yYWdlLiBPdGhlcndpc2UsIHNldCBhIHN0cmluZyB2YWx1ZSAob3IgYSBmdW5jdGlvblxuXHRcdFx0ICogcmV0dXJuaW5nIGEgc3RyaW5nIHZhbCksIHJldHVybmluZyB0aGUga2V5IGluIHdoaWNoIHRvIHN0b3JlIHRoZVxuXHRcdFx0ICogZGF0YSBOb3RlOiB0aGlzIGZlYXR1cmUgb25seSB3b3JrcyBjb21iaW5lZCB3aXRoIGNvbXBsZXRpb25zXG5cdFx0XHQgKiBsb2FkZWQgaW4gbWVtb3J5IChpLmUuIGJ1bGs6IHRydWUpXG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5wZXJzaXN0ZW50XG5cdFx0XHQgKiBAdHlwZSBzdHJpbmd8ZnVuY3Rpb25cblx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdCAqL1xuXHRcdFx0cGVyc2lzdGVudCA6IG51bGwsXG5cdFx0XHQvKipcblx0XHRcdCAqIEEgc2V0IG9mIGhhbmRsZXJzLiBNb3N0LCB0YWtlbiBmcm9tIHRoZSBDb2RlTWlycm9yIHNob3doaW50XG5cdFx0XHQgKiBwbHVnaW46IGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHQgKiBcblx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVyc1xuXHRcdFx0ICogQHR5cGUgb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdGhhbmRsZXJzIDoge1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogRmlyZXMgd2hlbiBhIGNvZGVtaXJyb3IgY2hhbmdlIG9jY3VycyBpbiBhIHBvc2l0aW9uIHdoZXJlIHdlXG5cdFx0XHRcdCAqIGNhbiBzaG93IHRoaXMgcGFydGljdWxhciB0eXBlIG9mIGF1dG9jb21wbGV0aW9uXG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuaGFuZGxlcnMudmFsaWRQb3NpdGlvblxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHR2YWxpZFBvc2l0aW9uIDogbnVsbCxcblx0XHRcdFx0LyoqXG5cdFx0XHRcdCAqIEZpcmVzIHdoZW4gYSBjb2RlbWlycm9yIGNoYW5nZSBvY2N1cnMgaW4gYSBwb3NpdGlvbiB3aGVyZSB3ZVxuXHRcdFx0XHQgKiBjYW4gLW5vdC0gc2hvdyB0aGlzIHBhcnRpY3VsYXIgdHlwZSBvZiBhdXRvY29tcGxldGlvblxuXHRcdFx0XHQgKiBcblx0XHRcdFx0ICogQHByb3BlcnR5IGF1dG9jb21wbGV0aW9ucy52YXJpYWJsZU5hbWVzLmhhbmRsZXJzLmludmFsaWRQb3NpdGlvblxuXHRcdFx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdFx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0XHRcdCAqL1xuXHRcdFx0XHRpbnZhbGlkUG9zaXRpb24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuaGFuZGxlcnMuc2hvd25cblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0c2hvd24gOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuaGFuZGxlcnMuc2VsZWN0XG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHNlbGVjdCA6IG51bGwsXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiBTZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RvYy9tYW51YWwuaHRtbCNhZGRvbl9zaG93LWhpbnRcblx0XHRcdFx0ICogXG5cdFx0XHRcdCAqIEBwcm9wZXJ0eSBhdXRvY29tcGxldGlvbnMudmFyaWFibGVOYW1lcy5oYW5kbGVycy5waWNrXG5cdFx0XHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0XHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHRcdFx0ICovXG5cdFx0XHRcdHBpY2sgOiBudWxsLFxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogU2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjYWRkb25fc2hvdy1oaW50XG5cdFx0XHRcdCAqIFxuXHRcdFx0XHQgKiBAcHJvcGVydHkgYXV0b2NvbXBsZXRpb25zLnZhcmlhYmxlTmFtZXMuaGFuZGxlcnMuY2xvc2Vcblx0XHRcdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHRcdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdFx0XHQgKi9cblx0XHRcdFx0Y2xvc2UgOiBudWxsLFxuXHRcdFx0fVxuXHRcdH0sXG5cdH1cbn0pO1xucm9vdC52ZXJzaW9uID0ge1xuXHRcIkNvZGVNaXJyb3JcIiA6IENvZGVNaXJyb3IudmVyc2lvbixcblx0XCJZQVNRRVwiIDogcmVxdWlyZShcIi4uL3BhY2thZ2UuanNvblwiKS52ZXJzaW9uLFxuXHRcImpxdWVyeVwiOiAkLmZuLmpxdWVyeSxcblx0XCJ5YXNndWktdXRpbHNcIjogcmVxdWlyZShcInlhc2d1aS11dGlsc1wiKS52ZXJzaW9uXG59O1xuXG4vLyBlbmQgd2l0aCBzb21lIGRvY3VtZW50YXRpb24gc3R1ZmYgd2UnZCBsaWtlIHRvIGluY2x1ZGUgaW4gdGhlIGRvY3VtZW50YXRpb25cbi8vICh5ZXMsIHVnbHksIGJ1dCBlYXNpZXIgdGhhbiBtZXNzaW5nIGFib3V0IGFuZCBhZGRpbmcgaXQgbWFudWFsbHkgdG8gdGhlXG4vLyBnZW5lcmF0ZWQgaHRtbCA7KSlcbi8qKlxuICogU2V0IHF1ZXJ5IHZhbHVlIGluIGVkaXRvciAoc2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjc2V0VmFsdWUpXG4gKiBcbiAqIEBtZXRob2QgZG9jLnNldFZhbHVlXG4gKiBAcGFyYW0gcXVlcnkge3N0cmluZ31cbiAqL1xuXG4vKipcbiAqIEdldCBxdWVyeSB2YWx1ZSBmcm9tIGVkaXRvciAoc2VlIGh0dHA6Ly9jb2RlbWlycm9yLm5ldC9kb2MvbWFudWFsLmh0bWwjZ2V0VmFsdWUpXG4gKiBcbiAqIEBtZXRob2QgZG9jLmdldFZhbHVlXG4gKiBAcmV0dXJuIHF1ZXJ5IHtzdHJpbmd9XG4gKi9cblxuLyoqXG4gKiBTZXQgc2l6ZS4gVXNlIG51bGwgdmFsdWUgdG8gbGVhdmUgd2lkdGggb3IgaGVpZ2h0IHVuY2hhbmdlZC4gVG8gcmVzaXplIHRoZSBlZGl0b3IgdG8gZml0IGl0cyBjb250ZW50LCBzZWUgaHR0cDovL2NvZGVtaXJyb3IubmV0L2RlbW8vcmVzaXplLmh0bWxcbiAqIFxuICogQHBhcmFtIHdpZHRoIHtudW1iZXJ8c3RyaW5nfVxuICogQHBhcmFtIGhlaWdodCB7bnVtYmVyfHN0cmluZ31cbiAqIEBtZXRob2QgZG9jLnNldFNpemVcbiAqL1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
(11)
});
