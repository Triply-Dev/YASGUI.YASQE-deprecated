'use strict';
var $ = require('jquery');
module.exports = {
	use: function(YASQE) {
		YASQE.executeQuery = function(yasqe, callbackOrConfig) {
			var callback = (typeof callbackOrConfig == "function" ? callbackOrConfig: null);
			var config = (typeof callbackOrConfig == "object" ? callbackOrConfig : {});
			var queryMode = yasqe.getQueryMode();
			if (yasqe.options.sparql)
				config = $.extend({}, yasqe.options.sparql, config);
			
			//for backwards compatability, make sure we copy sparql handlers to sparql callbacks
			if (config.handlers) 
				$.extend(true, config.callbacks, config.handlers);
			
			
			if (!config.endpoint || config.endpoint.length == 0)
				return;// nothing to query!

			/**
			 * initialize ajax config
			 */
			var ajaxConfig = {
				url : (typeof config.endpoint == "function"? config.endpoint(yasqe): config.endpoint),
				type : (typeof config.requestMethod == "function"? config.requestMethod(yasqe): config.requestMethod),
				data : [{
					name : queryMode,
					value : yasqe.getValue()
				}],
				headers : {
					Accept : getAcceptHeader(yasqe, config),
				}
			};

			/**
			 * add complete, beforesend, etc callbacks (if specified)
			 */
			var handlerDefined = false;
			if (config.callbacks) {
				for ( var handler in config.callbacks) {
					if (config.callbacks[handler]) {
						handlerDefined = true;
						ajaxConfig[handler] = config.callbacks[handler];
					}
				}
			}
			if (!handlerDefined && !callback)
				return; // ok, we can query, but have no callbacks. just stop now
			
			// if only callback is passed as arg, add that on as 'onComplete' callback
			if (callback)
				ajaxConfig.complete = callback;

			/**
			 * add named graphs to ajax config
			 */
			if (config.namedGraphs && config.namedGraphs.length > 0) {
				var argName = (queryMode == "query" ? "named-graph-uri": "using-named-graph-uri ");
				for (var i = 0; i < config.namedGraphs.length; i++)
					ajaxConfig.data.push({
						name : argName,
						value : config.namedGraphs[i]
					});
			}
			/**
			 * add default graphs to ajax config
			 */
			if (config.defaultGraphs && config.defaultGraphs.length > 0) {
				var argName = (queryMode == "query" ? "default-graph-uri": "using-graph-uri ");
				for (var i = 0; i < config.defaultGraphs.length; i++)
					ajaxConfig.data.push({
						name : argName,
						value : config.defaultGraphs[i]
					});
			}

			/**
			 * merge additional request headers
			 */
			if (config.headers && !$.isEmptyObject(config.headers))
				$.extend(ajaxConfig.headers, config.headers);
			/**
			 * add additional request args
			 */
			if (config.args && config.args.length > 0) $.merge(ajaxConfig.data, config.args);
			YASQE.updateQueryButton(yasqe, "busy");
			
			var updateQueryButton = function() {
				YASQE.updateQueryButton(yasqe);
			};
			//Make sure the query button is updated again on complete
			if (ajaxConfig.complete) {
				ajaxConfig.complete = [updateQueryButton, ajaxConfig.complete];
			} else {
				ajaxConfig.complete = updateQueryButton;
			}
			yasqe.xhr = $.ajax(ajaxConfig);
		};
	}
};

var getAcceptHeader = function(yasqe, config) {
	var acceptHeader = null;
	if (config.acceptHeader && !config.acceptHeaderGraph && !config.acceptHeaderSelect && !config.acceptHeaderUpdate) {
		//this is the old config. For backwards compatability, keep supporting it
		if (typeof config.acceptHeader == "function") {
			acceptHeader = config.acceptHeader(yasqe);
		} else {
			acceptHeader = config.acceptHeader;
		}
	} else {
		if (yasqe.getQueryMode() == "update") {
			acceptHeader = (typeof config.acceptHeader == "function"? config.acceptHeaderUpdate(yasqe): config.acceptHeaderUpdate);
		} else {
			var qType = yasqe.getQueryType();
			if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
				acceptHeader = (typeof config.acceptHeaderGraph == "function"? config.acceptHeaderGraph(yasqe): config.acceptHeaderGraph);
			} else {
				acceptHeader = (typeof config.acceptHeaderSelect == "function" ? config.acceptHeaderSelect(yasqe): config.acceptHeaderSelect);
			}
		}
	}
	return acceptHeader;
};
