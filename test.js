'use strict';
var readChunk = require('read-chunk');
var test = require('ava');
var fileType = require('./');

function check(filename) {
	return fileType(readChunk.sync(filename, 0, 262));
}

test('should detect file type from Buffer', function (t) {
	t.plan(5);
	t.assert(check('fixture.png') === 'png');
	t.assert(check('fixture.zip') === 'zip');
	t.assert(check('fixture.exe') === 'exe');
	t.assert(check('fixture.oga') === 'oga');
	t.assert(check('fixture.mp4') === 'mp4');
});
