var sparql = require('./sparql.js'),
    $ = require('jquery');
var quote = function(string) {
  return "'" + string + "'";
}
module.exports = {
  createCurlString : function(yasqe, config) {
    var ajaxConfig = sparql.getAjaxConfig(yasqe, config);
    var url = ajaxConfig.url;
    if (ajaxConfig.url.indexOf('http') !== 0) {
      //this is either a relative or absolute url, which is not supported by CURL.
      //Add domain, schema, etc etc
      var url = window.location.protocol + '//' + window.location.host;
      if (ajaxConfig.url.indexOf('/') === 0) {
        //its an absolute path
        url += ajaxConfig.url;
      } else {
        //relative, so append current location to url first
        url += window.location.pathname + ajaxConfig.url;
      }
    }
    var cmds = [
      'curl', url,
      '-X', yasqe.options.sparql.requestMethod
    ];
    if (yasqe.options.sparql.requestMethod == 'POST') {
      cmds.push('--data ' + quote($.param(ajaxConfig.data)));
    }
    for (var header in ajaxConfig.headers) {
      cmds.push('-H ' + quote(header + ': ' + ajaxConfig.headers[header]));
    }
    return cmds.join(' ');
  }
}
