#!/usr/bin/env node
'use strict';
var readChunk = require('read-chunk');
var meow = require('meow');
var fileType = require('./');

var cli = meow({
	help: [
		'Usage',
		'  file-type <filename>',
		'  file-type < <filename>',
		'',
		'Example',
		'  file-type < unicorn.png',
		'  png'
	].join('\n')
});

function init(data) {
	var type = fileType(data);

	if (!type) {
		console.error('Unrecognized file type');
		process.exit(65);
	}

	console.log(type);
}

if (process.stdin.isTTY) {
	if (cli.input.length === 0) {
		console.error('Specify a filename');
		process.exit(1);
	}

	init(readChunk.sync(cli.input[0], 0, 262));
} else {
	process.stdin.once('data', init);
}
