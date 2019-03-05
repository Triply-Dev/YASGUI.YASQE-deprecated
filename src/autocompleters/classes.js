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
  if (token.string.indexOf("?") == 0) return false;
  var cur = yashe.getCursor();
  var previousToken = yashe.getPreviousNonWsToken(cur.line, token);
  if (previousToken.string == "a") return true;
  if (previousToken.string == "rdf:type") return true;
  if (previousToken.string == "rdfs:domain") return true;
  if (previousToken.string == "rdfs:range") return true;
  return false;
};
module.exports.preProcessToken = function(yashe, token) {
  return require("./utils.js").preprocessResourceTokenForCompletion(yashe, token);
};
module.exports.postProcessToken = function(yashe, token, suggestedString) {
  return require("./utils.js").postprocessResourceTokenForCompletion(yashe, token, suggestedString);
};
