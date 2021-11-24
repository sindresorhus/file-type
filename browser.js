import {Buffer} from 'node:buffer';
import {ReadableWebToNodeStream} from 'readable-web-to-node-stream';
import {fileTypeFromBuffer, fileTypeFromStream as coreFileTypeFromStream} from './core.js';

/**
Convert Blobs to ArrayBuffer.

@param {Blob} blob - Web API Blob.
@returns {Promise<ArrayBuffer>}
*/
function blobToArrayBuffer(blob) {
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

export async function fileTypeFromStream(stream) {
	const readableWebToNodeStream = new ReadableWebToNodeStream(stream);
	const fileType = await coreFileTypeFromStream(readableWebToNodeStream);
	await readableWebToNodeStream.close();
	return fileType;
}

export async function fileTypeFromBlob(blob) {
	const buffer = await blobToArrayBuffer(blob);
	return fileTypeFromBuffer(Buffer.from(buffer));
}

export {
	fileTypeFromTokenizer,
	fileTypeFromBuffer,
	fileTypeStream,
} from './core.js';
