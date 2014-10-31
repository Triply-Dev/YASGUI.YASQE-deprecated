var $ = require('jquery');
module.exports = function(yasqe) {
	return {
		isValidCompletionPosition : function() {
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
		get : function(token, callback) {
			return require('./utils').fetchFromLov(yasqe, this, token, callback);
		},
		preProcessToken: function(token) {return require('./utils.js').preprocessResourceTokenForCompletion(yasqe, token)},
		postProcessToken: function(token, suggestedString) {return require('./utils.js').postprocessResourceTokenForCompletion(yasqe, token, suggestedString)},
		async : true,
		bulk : false,
		autoShow : false,
		persistent : "properties",
		callbacks : {
			validPosition : yasqe.autocompleters.notifications.show,
			invalidPosition : yasqe.autocompleters.notifications.hide,
		}
	}
};