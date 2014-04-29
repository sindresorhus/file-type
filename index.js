'use strict';
module.exports = function (buf) {
	if (!buf) {
		return false;
	}

	if (require('is-pdf')(buf)) {
		return 'pdf';
	}

	if (require('is-epub')(buf)) {
		return 'epub';
	}

	if (require('is-exe')(buf)) {
		return 'exe';
	}

	return require('image-type')(buf) || require('archive-type')(buf) || false;
};
