"use strict";
var $ = require("jquery");
module.exports = function(yashe, name) {
  return {
    isValidCompletionPosition: function() {
      return module.exports.isValidCompletionPosition(yashe);
    },
    get: function(token, callback) {
      return require("./utils").fetchFromLov(yashe, this, token, callback);
    },
    preProcessToken: function(token) {
      return module.exports.preProcessToken(yashe, token);
    },
    postProcessToken: function(token, suggestedString) {
      return module.exports.postProcessToken(yashe, token, suggestedString);
    },
    async: true,
    bulk: false,
    autoShow: false,
    persistent: name,
    callbacks: {
      validPosition: yashe.autocompleters.notifications.show,
      invalidPosition: yashe.autocompleters.notifications.hide
    }
  };
};

module.exports.isValidCompletionPosition = function(yashe) {
  var token = yashe.getCompleteToken();
  if (token.string.length == 0) return false; //we want -something- to autocomplete
  if (token.string.indexOf("?") == 0) return false; // we are typing a var
  if ($.inArray("a", token.state.possibleCurrent) >= 0) return true; // predicate pos
  var cur = yashe.getCursor();
  var previousToken = yashe.getPreviousNonWsToken(cur.line, token);
  if (previousToken.string == "rdfs:subPropertyOf") return true;

  // hmm, we would like -better- checks here, e.g. checking whether we are
  // in a subject, and whether next item is a rdfs:subpropertyof.
  // difficult though... the grammar we use is unreliable when the query
  // is invalid (i.e. during typing), and often the predicate is not typed
  // yet, when we are busy writing the subject...
  return false;
};
module.exports.preProcessToken = function(yashe, token) {
  return require("./utils.js").preprocessResourceTokenForCompletion(yashe, token);
};
module.exports.postProcessToken = function(yashe, token, suggestedString) {
  return require("./utils.js").postprocessResourceTokenForCompletion(yashe, token, suggestedString);
};
