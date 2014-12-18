'use strict';
var path = require('path');
var test = require('ava');
var readChunk = require('read-chunk');
var fileType = require('./');

function check(ext, name) {
	var file = path.join(__dirname, 'fixture', (name || 'fixture') + '.' + ext);
	return fileType(readChunk.sync(file, 0, 262));
}

test('detect file type from a buffer', function (t) {
	t.assert(check('jpg') === 'jpg');
	t.assert(check('png') === 'png');
	t.assert(check('gif') === 'gif');
	t.assert(check('webp') === 'webp');
	t.assert(check('tif', 'fixture-big-endian') === 'tif');
	t.assert(check('tif', 'fixture-little-endian') === 'tif');
	t.assert(check('bmp') === 'bmp');
	t.assert(check('jxr') === 'jxr');
	t.assert(check('psd') === 'psd');
	t.assert(check('mp4') === 'mp4');
	t.assert(check('mp3') === 'mp3');
	t.assert(check('m4a') === 'm4a');
	t.assert(check('ogg') === 'ogg');
	t.assert(check('flac') === 'flac');
	t.assert(check('wav') === 'wav');
	t.assert(check('zip') === 'zip');
	t.assert(check('tar') === 'tar');
	t.assert(check('rar') === 'rar');
	t.assert(check('tar.gz') === 'gz');
	t.assert(check('bz2') === 'bz2');
	t.assert(check('7z') === '7z');
	t.assert(check('pdf') === 'pdf');
	t.assert(check('rtf') === 'rtf');
	t.assert(check('epub') === 'epub');
	t.assert(check('exe') === 'exe');
	t.assert(check('swf') === 'swf');
	t.end();
});
