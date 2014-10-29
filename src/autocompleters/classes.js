module.exports = function(yasqe) {
	return {
		isValidCompletionPosition : function() {
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
		get : function(token, callback) {
			return require('./utils').fetchFromLov(yasqe, this, token, callback);
		},
		preProcessToken: function(token) {return require('./utils.js').preprocessResourceTokenForCompletion(yasqe, token)},
		postProcessToken: function(token, suggestedString) {return require('./utils.js').postprocessResourceTokenForCompletion(yasqe, token, suggestedString)},
		async : true,
		bulk : false,
		autoShow : false,
		persistent : "classes",
		callbacks : {
			validPosition : yasqe.autocompleters.notifications.show,
			invalidPosition : yasqe.autocompleters.notifications.hide,
		}
	}
};