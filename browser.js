'use strict';
const {ReadableWebToNodeStream} = require('readable-web-to-node-stream');
const core = require('./core');

async function fromStream(stream) {
	const readableWebToNodeStream = new ReadableWebToNodeStream(stream);
	const fileType = await core.fromStream(readableWebToNodeStream);
	await readableWebToNodeStream.close();
	return fileType;
}

async function fromBlob(blob) {
	const buffer = await convertBlobToBuffer(blob).then(Buffer.from);
	return core.fromBuffer(buffer);
}

/**
Convert Web API File to Node Buffer.
@param {Blob} blob - Web API Blob.
@returns {Promise<ArrayBuffer>}
*/
function convertBlobToBuffer(blob) {
	if (blob.arrayBuffer) {
		return blob.arrayBuffer();
	}

	// TODO: Remove when stop supporting older environments
	return new Promise((resolve, reject) => {
		const fileReader = new FileReader();
		fileReader.addEventListener('loadend', event => {
			resolve(event.target.result);
		});

		fileReader.addEventListener('error', event => {
			reject(new Error(event.message));
		});

		fileReader.addEventListener('abort', event => {
			reject(new Error(event.type));
		});

		fileReader.readAsArrayBuffer(blob);
	});
}

Object.assign(module.exports, core, {
	fromStream,
	fromBlob
});
