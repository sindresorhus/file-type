#!/usr/bin/node
const FileType = require('.');

if (process.argv.length !== 3) {
	console.error('Expected path of the file to examine');
	process.exit();
}

const file2test = process.argv[2];

(async () => {
	const fileType = await FileType.fromFile(file2test);

	if (fileType) {
		console.log(`MIME-type: ${fileType.mime}`);
		console.log(`Extension: ${fileType.ext}`);
	} else {
		console.log('Could not determine file type.');
	}
})();
