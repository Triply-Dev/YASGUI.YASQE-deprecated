

var keyExists = function(objectToTest, key) {
	var exists = false;
	try {
		if (objectToTest[key] !== undefined)
			exists = true;
	} catch (e) {
	}
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
module.exports = {
	keyExists: keyExists,
	getPersistencyId: getPersistencyId
};