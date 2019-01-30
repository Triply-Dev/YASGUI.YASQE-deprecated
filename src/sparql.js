"use strict";
var $ = require("jquery"),
  utils = require("./utils.js"),
  YASHE = require("./main.js");

YASHE.getAjaxConfig = function(yashe, callbackOrConfig) {
  var callback = typeof callbackOrConfig == "function" ? callbackOrConfig : null;
  var config = typeof callbackOrConfig == "object" ? callbackOrConfig : {};

  if (yashe.options.sparql) config = $.extend({}, yashe.options.sparql, config);

  //for backwards compatability, make sure we copy sparql handlers to sparql callbacks
  if (config.handlers) $.extend(true, config.callbacks, config.handlers);

  if (!config.endpoint || config.endpoint.length == 0) return; // nothing to query!
  var queryMode = yashe.getQueryMode();
  /**
	 * initialize ajax config
	 */
  var ajaxConfig = {
    url: typeof config.endpoint == "function" ? config.endpoint(yashe) : config.endpoint,
    type: queryMode == "update"
      ? "POST"
      : typeof config.requestMethod == "function" ? config.requestMethod(yashe) : config.requestMethod,
    headers: {
      Accept: getAcceptHeader(yashe, config)
    }
  };
  if (config.xhrFields) ajaxConfig.xhrFields = config.xhrFields;
  /**
	 * add complete, beforesend, etc callbacks (if specified)
	 */
  var handlerDefined = false;
  if (config.callbacks) {
    for (var handler in config.callbacks) {
      if (config.callbacks[handler]) {
        handlerDefined = true;
        ajaxConfig[handler] = config.callbacks[handler];
      }
    }
  }
  if (ajaxConfig.type === "GET") {
    //we need to do encoding ourselve, as jquery does not properly encode the url string
    //https://github.com/OpenTriply/YASGUI/issues/75
    var first = true;
    $.each(yashe.getUrlArguments(config), function(key, val) {
      ajaxConfig.url += (first ? "?" : "&") + val.name + "=" + encodeURIComponent(val.value);
      first = false;
    });
  } else {
    ajaxConfig.data = yashe.getUrlArguments(config);
  }
  if (!handlerDefined && !callback) return; // ok, we can query, but have no callbacks. just stop now

  // if only callback is passed as arg, add that on as 'onComplete' callback
  if (callback) ajaxConfig.complete = callback;

  /**
	 * merge additional request headers
	 */
  if (config.headers && !$.isEmptyObject(config.headers)) $.extend(ajaxConfig.headers, config.headers);

  var queryStart = new Date();
  var updateYasqe = function() {
    yashe.lastQueryDuration = new Date() - queryStart;
    YASHE.updateQueryButton(yashe);
    yashe.setBackdrop(false);
  };
  //Make sure the query button is updated again on complete
  var completeCallbacks = [
    function() {
      require("./main.js").signal(yashe, "queryFinish", arguments);
    },
    updateYasqe
  ];

  if (ajaxConfig.complete) {
    completeCallbacks.push(ajaxConfig.complete);
  }
  ajaxConfig.complete = completeCallbacks;
  return ajaxConfig;
};

YASHE.executeQuery = function(yashe, callbackOrConfig) {
  YASHE.signal(yashe, "query", yashe, callbackOrConfig);
  YASHE.updateQueryButton(yashe, "busy");
  yashe.setBackdrop(true);
  yashe.xhr = $.ajax(YASHE.getAjaxConfig(yashe, callbackOrConfig));
};

YASHE.getUrlArguments = function(yashe, config) {
  var queryMode = yashe.getQueryMode();
  var data = [
    {
      name: utils.getString(yashe, yashe.options.sparql.queryName),
      value: config.getQueryForAjax ? config.getQueryForAjax(yashe) : yashe.getValue()
    }
  ];

  /**
	 * add named graphs to ajax config
	 */
  if (config.namedGraphs && config.namedGraphs.length > 0) {
    var argName = queryMode == "query" ? "named-graph-uri" : "using-named-graph-uri ";
    for (var i = 0; i < config.namedGraphs.length; i++)
      data.push({
        name: argName,
        value: config.namedGraphs[i]
      });
  }
  /**
	 * add default graphs to ajax config
	 */
  if (config.defaultGraphs && config.defaultGraphs.length > 0) {
    var argName = queryMode == "query" ? "default-graph-uri" : "using-graph-uri ";
    for (var i = 0; i < config.defaultGraphs.length; i++)
      data.push({
        name: argName,
        value: config.defaultGraphs[i]
      });
  }

  /**
	 * add additional request args
	 */
  if (config.args && config.args.length > 0) $.merge(data, config.args);

  return data;
};
var getAcceptHeader = function(yashe, config) {
  var acceptHeader = null;
  if (config.acceptHeader && !config.acceptHeaderGraph && !config.acceptHeaderSelect && !config.acceptHeaderUpdate) {
    //this is the old config. For backwards compatability, keep supporting it
    if (typeof config.acceptHeader == "function") {
      acceptHeader = config.acceptHeader(yashe);
    } else {
      acceptHeader = config.acceptHeader;
    }
  } else {
    if (yashe.getQueryMode() == "update") {
      acceptHeader = typeof config.acceptHeader == "function"
        ? config.acceptHeaderUpdate(yashe)
        : config.acceptHeaderUpdate;
    } else {
      var qType = yashe.getQueryType();
      if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
        acceptHeader = typeof config.acceptHeaderGraph == "function"
          ? config.acceptHeaderGraph(yashe)
          : config.acceptHeaderGraph;
      } else {
        acceptHeader = typeof config.acceptHeaderSelect == "function"
          ? config.acceptHeaderSelect(yashe)
          : config.acceptHeaderSelect;
      }
    }
  }
  return acceptHeader;
};

module.exports = {
  getAjaxConfig: YASHE.getAjaxConfig
};
