'use strict';
var $ = require('jquery'),
	utils = require('./utils.js'),
	yutils = require('yasgui-utils');
/**
 * Where the base class only contains functionality related to -all- completions, this class contains some utils used here and there in our autocompletions
 */



/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 */
var preprocessResourceTokenForCompletion = function(yasqe, token) {
	var queryPrefixes = yasqe.getPrefixesFromQuery();
	if (!token.string.indexOf("<") == 0) {
		token.tokenPrefix = token.string.substring(0, token.string.indexOf(":") + 1);

		if (queryPrefixes[token.tokenPrefix.slice(0, -1)] != null) {
			token.tokenPrefixUri = queryPrefixes[token.tokenPrefix.slice(0, -1)];
		}
	}

	token.autocompletionString = token.string.trim();
	if (!token.string.indexOf("<") == 0 && token.string.indexOf(":") > -1) {
		// hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
		for (var prefix in queryPrefixes) {
			if (token.string.indexOf(prefix) == 0) {
				token.autocompletionString = queryPrefixes[prefix];
				token.autocompletionString += token.string.substring(prefix.length + 1);
				break;
			}
		}
	}

	if (token.autocompletionString.indexOf("<") == 0) token.autocompletionString = token.autocompletionString.substring(1);
	if (token.autocompletionString.indexOf(">", token.length - 1) !== -1) token.autocompletionString = token.autocompletionString.substring(0, token.autocompletionString.length - 1);
	return token;
};

var postprocessResourceTokenForCompletion = function(yasqe, token, suggestedString) {
	if (token.tokenPrefix && token.autocompletionString && token.tokenPrefixUri) {
		// we need to get the suggested string back to prefixed form
		suggestedString = token.tokenPrefix + suggestedString.substring(token.tokenPrefixUri.length);
	} else {
		// it is a regular uri. add '<' and '>' to string
		suggestedString = "<" + suggestedString + ">";
	}
	return suggestedString;
};

var fetchFromLov = function(yasqe, completer, token, callback) {
	if (!token || !token.string || token.string.trim().length == 0) {
		yasqe.autocompleters.notifications.getEl(completer)
			.empty()
			.append("Nothing to autocomplete yet!");
		return false;
	}
	var maxResults = 50;

	var args = {
		q: token.autocompletionString,
		page: 1
	};
	if (completer.name == "classes") {
		args.type = "class";
	} else {
		args.type = "property";
	}
	var results = [];
	var url = "";
	var updateUrl = function() {
		url = "http://lov.okfn.org/dataset/lov/api/v2/autocomplete/terms?" + $.param(args);
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
				if (results.length < data.total_results && results.length < maxResults) {
					increasePage();
					doRequests();
				} else {
					//if notification bar is there, show feedback, or close
					if (results.length > 0) {
						yasqe.autocompleters.notifications.hide(yasqe, completer)
					} else {
						yasqe.autocompleters.notifications.getEl(completer).text("0 matches found...");
					}
					callback(results);
					// requests done! Don't call this function again
				}
			}).fail(function(jqXHR, textStatus, errorThrown) {
			yasqe.autocompleters.notifications.getEl(completer)
				.empty()
				.append("Failed fetching suggestions..");

		});
	};
	//if notification bar is there, show a loader
	yasqe.autocompleters.notifications.getEl(completer)
		.empty()
		.append($("<span>Fetchting autocompletions &nbsp;</span>"))
		.append($(yutils.svg.getElement(require('../imgs.js').loader)).addClass("notificationLoader"));
	doRequests();
};



module.exports = {
	fetchFromLov: fetchFromLov,
	preprocessResourceTokenForCompletion: preprocessResourceTokenForCompletion,
	postprocessResourceTokenForCompletion: postprocessResourceTokenForCompletion,
};