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

	if (require('is-mp4')(buf)) {
		return 'mp4';
	}

	if (require('is-swf')(buf)) {
		return 'swf';
	}

	return require('image-type')(buf) || require('archive-type')(buf) || require ('audio-type')(buf) || false;
};
