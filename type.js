#!/usr/bin/node
const FileType = require('.');

const [file] = process.argv.slice(2);

if (!file) {
	console.error('Expected path of the file to examine');
	process.exit();
}

(async () => {
	const fileType = await FileType.fromFile(file);

	if (fileType) {
		console.log(`MIME-type: ${fileType.mime}`);
		console.log(`Extension: ${fileType.ext}`);
	} else {
		console.log('Could not determine file type');
	}
})();
