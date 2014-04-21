var store = require("store");
var times = {
	day: function() {
		return 1000 * 3600 * 24;//millis to day
	},
	month: function() {
		times.day() * 30;
	},
	year: function() {
		times.month() * 12;
	}
};

var root = module.exports = {
	set : function(key, val, exp) {
		if (typeof exp == "string") {
			exp = times[exp]();
		}
		store.set(key, {
			val : val,
			exp : exp,
			time : new Date().getTime()
		});
	},
	get : function(key) {
		var info = store.get(key);
		if (!info) {
			return null;
		}
		if (info.exp && new Date().getTime() - info.time > info.exp) {
			return null;
		}
		return info.val;
	}

};