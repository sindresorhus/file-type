'use strict';
var path = require('path');
var test = require('ava');
var readChunk = require('read-chunk');
var fileType = require('./');

function check(ext, name) {
	var file = path.join(__dirname, 'fixture', (name || 'fixture') + '.' + ext);
	return fileType(readChunk.sync(file, 0, 262)).ext;
}

var types = [
	'jpg',
	'png',
	'gif',
	'webp',
	'cr2',
	'tif',
	'bmp',
	'jxr',
	'psd',
	'sketch',
	'zip',
	'tar',
	'rar',
	'gz',
	'bz2',
	'7z',
	'mp4',
	'm4v',
	'mkv',
	'webm',
	'mov',
	'avi',
	'wmv',
	'mpg',
	'mp3',
	'm4a',
	'ogg',
	'flac',
	'wav',
	'pdf',
	'epub',
	'exe',
	'swf',
	'rtf',
	'woff',
	'woff2',
	'eot',
	'ttf',
	'otf',
	'ico',
	'flv',
	'ps',
	'xz'
];

var names = {
	tif: ['fixture-big-endian', 'fixture-little-endian'],
	gz: ['fixture.tar'],
	xz: ['fixture.tar']
};

function testFile(type, name) {
	test(type, function (t) {
		t.assert(check(type, name) === type);
		t.end();
	});
}

types.forEach(function (type) {
	if (names.hasOwnProperty(type)) {
		names[type].forEach(function (name) {
			testFile(type, name);
		});
	} else {
		testFile(type);
	}
});
