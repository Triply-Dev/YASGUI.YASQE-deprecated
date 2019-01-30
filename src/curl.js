var sparql = require("./sparql.js"), $ = require("jquery");
var quote = function(string) {
  return "'" + string + "'";
};
module.exports = {
  createCurlString: function(yashe, config) {
    var ajaxConfig = sparql.getAjaxConfig(yashe, config);
    var url = ajaxConfig.url;
    if (ajaxConfig.url.indexOf("http") !== 0) {
      //this is either a relative or absolute url, which is not supported by CURL.
      //Add domain, schema, etc etc
      var url = window.location.protocol + "//" + window.location.host;
      if (ajaxConfig.url.indexOf("/") === 0) {
        //its an absolute path
        url += ajaxConfig.url;
      } else {
        //relative, so append current location to url first
        url += window.location.pathname + ajaxConfig.url;
      }
    }
    var cmds = ["curl", url, "-X", yashe.options.sparql.requestMethod];
    if (yashe.options.sparql.requestMethod == "POST") {
      cmds.push("--data " + quote($.param(ajaxConfig.data)));
    }
    for (var header in ajaxConfig.headers) {
      cmds.push("-H " + quote(header + ": " + ajaxConfig.headers[header]));
    }
    return cmds.join(" ");
  }
};
