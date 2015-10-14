var sparql = require('./sparql.js'),
    $ = require('jquery');
var quote = function(string) {
  return "'" + string + "'";
}
module.exports = {
  createCurlString : function(yasqe, config) {
    var ajaxConfig = sparql.getAjaxConfig(yasqe, config);
    
    var url = yasqe.options.sparql.endpoint;
    if (yasqe.options.sparql.requestMethod == 'GET') {
      url += '?' + $.param(ajaxConfig.data);
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
