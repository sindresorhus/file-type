#!/usr/bin/node
const fs = require('fs');

const fileType = require('.');

if (process.argv.length !== 3) {
	console.error('Expected path of the file to examine');
	process.exit();
}

const file2test = process.argv[2];

const type = fileType(fs.readFileSync(file2test));

if (type) {
	console.log(`MIME-type: ${type.mime}`);
	console.log(`Extension: ${type.ext}`);
} else {
	console.log('Could not determine file type.');
}
