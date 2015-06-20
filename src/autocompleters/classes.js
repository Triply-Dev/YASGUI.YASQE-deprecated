'use strict';
var $ = require('jquery');
module.exports = function(yasqe, name) {
	return {
		isValidCompletionPosition: function() {
			return module.exports.isValidCompletionPosition(yasqe);
		},
		get: function(token, callback) {
			return require('./utils').fetchFromLov(yasqe, this, token, callback);
		},
		preProcessToken: function(token) {
			return module.exports.preProcessToken(yasqe, token)
		},
		postProcessToken: function(token, suggestedString) {
			return module.exports.postProcessToken(yasqe, token, suggestedString);
		},
		async: true,
		bulk: false,
		autoShow: false,
		persistent: name,
		callbacks: {
			validPosition: yasqe.autocompleters.notifications.show,
			invalidPosition: yasqe.autocompleters.notifications.hide,
		}
	}
};

module.exports.isValidCompletionPosition = function(yasqe) {
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
};
module.exports.preProcessToken = function(yasqe, token) {
	return require('./utils.js').preprocessResourceTokenForCompletion(yasqe, token);
};
module.exports.postProcessToken = function(yasqe, token, suggestedString) {
	return require('./utils.js').postprocessResourceTokenForCompletion(yasqe, token, suggestedString)
};