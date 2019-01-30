"use strict";
/**
 * Append prefix declaration to list of prefixes in query window.
 *
 * @param yashe
 * @param prefix
 */
var addPrefixes = function(yashe, prefixes) {
  var existingPrefixes = yashe.getPrefixesFromQuery();
  //for backwards compatability, we stil support prefixes value as string (e.g. 'rdf: <http://fbfgfgf>'
  if (typeof prefixes == "string") {
    addPrefixAsString(yashe, prefixes);
  } else {
    for (var pref in prefixes) {
      if (!(pref in existingPrefixes))
        addPrefixAsString(yashe, pref + ": <" + prefixes[pref] + ">");
    }
  }
  yashe.collapsePrefixes(false);
};

var addPrefixAsString = function(yashe, prefixString) {
  yashe.replaceRange("PREFIX " + prefixString + "\n", {
    line: 0,
    ch: 0
  });

  yashe.collapsePrefixes(false);
};
var removePrefixes = function(yashe, prefixes) {
  var escapeRegex = function(string) {
    //taken from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };
  for (var pref in prefixes) {
    yashe.setValue(
      yashe
        .getValue()
        .replace(
          new RegExp(
            "PREFIX\\s*" +
              pref +
              ":\\s*" +
              escapeRegex("<" + prefixes[pref] + ">") +
              "\\s*",
            "ig"
          ),
          ""
        )
    );
  }
  yashe.collapsePrefixes(false);
};

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 *
 * @param cm
 * @returns {Array}
 */
var getPrefixesFromQuery = function(yashe) {
  //Use precise here. We want to be sure we use the most up to date state. If we're
  //not, we might get outdated prefixes from the current query (creating loops such
  //as https://github.com/OpenTriply/YASGUI/issues/84)
  return yashe.getTokenAt(
    { line: yashe.lastLine(), ch: yashe.getLine(yashe.lastLine()).length },
    true
  ).state.prefixes;
};

/**
 * Get the used indentation for a certain line
 *
 * @param yashe
 * @param line
 * @param charNumber
 * @returns
 */
var getIndentFromLine = function(yashe, line, charNumber) {
  if (charNumber == undefined) charNumber = 1;
  var token = yashe.getTokenAt({
    line: line,
    ch: charNumber
  });
  if (token == null || token == undefined || token.type != "ws") {
    return "";
  } else {
    return token.string + getIndentFromLine(yashe, line, token.end + 1);
  }
};

module.exports = {
  addPrefixes: addPrefixes,
  getPrefixesFromQuery: getPrefixesFromQuery,
  removePrefixes: removePrefixes
};
