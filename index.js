'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 12) {
		return false;
	}

	if (require('is-pdf')(buf)) {
		return 'pdf';
	}

	return require('image-type')(buf) || require('archive-type')(buf) || false;
};
