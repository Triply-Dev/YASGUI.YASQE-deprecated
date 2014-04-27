$ = jQuery = require("jquery");

require("../node_modules/twitter-bootstrap-3.0.0/dist/js/bootstrap.js");

if (document.getElementById("docs")) {
	//only draw when we're at the docs page
	$.get("yuidoc.json", function(data) {
		drawDocs(data);
	});
}

var drawDocs = function(data) {
	var docs = $("#docs");
	var docsToInsert = {};
	var attributesAndProperties = [];
	/**
	 * draw classes (i.e. constructors)
	 */
	if (data.classes) {
		for (className in data.classes) {
			var classInfo = data.classes[className];
//			console.log(data.classes[className]);
			var docWrapper = $("<div></div>").addClass("doc");
			var codeBit = className + "(";
			//add parameters
			if (classInfo.params) {
				for (var paramIt = 0; paramIt < classInfo.params.length; paramIt++) {
					var param = classInfo.params[paramIt];
					var description = param.description;
					var type = param.type;
					var name = param.name;
					if (paramIt > 0) codeBit += ", ";
					codeBit += name;
					if (type) codeBit += ": " + type;
				}
			}
			codeBit += ")";
			//add return type
			if (classInfo["return"]) {
				var description = classInfo["return"].description;
				var type = classInfo["return"].type;
				codeBit += " &rarr; ";
				if (description) codeBit += description + ": ";
				if (type) codeBit += type;
			}
//			 @return {String} Unique clientId.			
			$("<code></code>").html(codeBit).appendTo(docWrapper);
			if (classInfo.description) $("<p></p>").text(classInfo.description).appendTo(docWrapper);
			docs.append(docWrapper);
		}
	}
	
	/**
	 * draw classitems
	 */
	for (var methodIt = 0; methodIt < data.classitems.length; methodIt++) {
		var method = data.classitems[methodIt];
		if (method.access && method.access == "private") continue;
		if (method.itemtype && (method.itemtype == "property" || method.itemtype == "attribute")) {
			attributesAndProperties.push(method);
			continue;
		}
		/**
		 * parse method
		 */
		if (method.itemtype && method.name) {
			var docWrapper = $("<div></div>").addClass("doc");
			var codeBit = method.name + "(";
			//add parameters
			if (method.params) {
				for (var paramIt = 0; paramIt < method.params.length; paramIt++) {
					var param = method.params[paramIt];
					var description = param.description;
					var type = param.type;
					var name = param.name;
					if (paramIt > 0) codeBit += ", ";
					codeBit += name;
					if (type) codeBit += ": " + type;
				}
			}
			codeBit += ")";
			//add return type
			if (method["return"]) {
				var description = method["return"].description;
				var type = method["return"].type;
				codeBit += " &rarr; ";
				if (description) codeBit += description + ": ";
				if (type) codeBit += type;
			}
//			 @return {String} Unique clientId.			
			$("<code></code>").html(codeBit).appendTo(docWrapper);
			if (method.description) $("<p></p>").text(method.description).appendTo(docWrapper);
	     	docsToInsert[method.name] = docWrapper;
		}
		
		
		
	}
	
	var keys = [];
	for (methodName in docsToInsert) {
	    if (docsToInsert.hasOwnProperty(methodName)) {
	        keys.push(methodName);
	    }
	}
	keys.reverse();
	//draw functions
	for (var i = 0; i < keys.length; i++) {
		docs.append(docsToInsert[keys[i]]);
	}
	
	
	/**
	 * draw props (often config objects)
	 */
	var mainConf = null;
	for (var i = 0; i < attributesAndProperties.length; i++ ){
		
		var attrOrProp = attributesAndProperties[i];
		
		if (attrOrProp.itemtype == "attribute") {
			if (mainConf) docs.append(mainConf);
			mainConf = $("<div></div>").addClass("doc");
			$("<code></code>").text(attrOrProp.name).appendTo(mainConf);
			$("<p></p>").text(attrOrProp.description).appendTo(mainConf);
		} else {
			var prop = $("<div></div>").addClass("doc doc-sub");
			var codeText = attrOrProp.name;
			if (attrOrProp.type) codeText += ": " + attrOrProp.type;
			if (attrOrProp["default"]) codeText += " (default: " + attrOrProp["default"] +")";
			$("<code></code>").text(codeText).appendTo(prop);
			$("<p></p>").text(attrOrProp.description).appendTo(prop);
			mainConf.append(prop);
			
		}
		console.log(attrOrProp);
	}
	if (mainConf) docs.append(mainConf);
};