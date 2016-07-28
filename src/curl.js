var sparql = require('./sparql.js'),
    $ = require('jquery');
var quote = function(string) {
  return "'" + string + "'";
}
module.exports = {
  createCurlString : function(yasqe, config) {
    var ajaxConfig = sparql.getAjaxConfig(yasqe, config);

    var cmds = [
      'curl', ajaxConfig.url,
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
