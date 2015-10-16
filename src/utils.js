'use strict';
var $ = require('jquery');

var keyExists = function(objectToTest, key) {
	var exists = false;
	try {
		if (objectToTest[key] !== undefined)
			exists = true;
	} catch (e) {}
	return exists;
};

var getPersistencyId = function(yasqe, persistentIdCreator) {
	var persistencyId = null;

	if (persistentIdCreator) {
		if (typeof persistentIdCreator == "string") {
			persistencyId = persistentIdCreator;
		} else {
			persistencyId = persistentIdCreator(yasqe);
		}
	}
	return persistencyId;
};

var elementsOverlap = (function() {
	function getPositions(elem) {
		var pos, width, height;
		pos = $(elem).offset();
		width = $(elem).width();
		height = $(elem).height();
		return [
			[pos.left, pos.left + width],
			[pos.top, pos.top + height]
		];
	}

	function comparePositions(p1, p2) {
		var r1, r2;
		r1 = p1[0] < p2[0] ? p1 : p2;
		r2 = p1[0] < p2[0] ? p2 : p1;
		return r1[1] > r2[0] || r1[0] === r2[0];
	}

	return function(a, b) {
		var pos1 = getPositions(a),
			pos2 = getPositions(b);
		return comparePositions(pos1[0], pos2[0]) && comparePositions(pos1[1], pos2[1]);
	};
})();

var getString = function(yasqe, item) {
	if (typeof item == "function") {
		return item(yasqe);
	} else {
		return item;
	}
}
module.exports = {
	keyExists: keyExists,
	getPersistencyId: getPersistencyId,
	elementsOverlap: elementsOverlap,
	getString:getString
};
