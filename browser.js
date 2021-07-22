import {ReadableWebToNodeStream} from 'readable-web-to-node-stream';
import {fromBuffer, fromStream as coreFromStream} from './core.js';

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

export async function fromStream(stream) {
	const readableWebToNodeStream = new ReadableWebToNodeStream(stream);
	const fileType = await coreFromStream(readableWebToNodeStream);
	await readableWebToNodeStream.close();
	return fileType;
}

export async function fromBlob(blob) {
	const buffer = await blobToArrayBuffer(blob);
	return fromBuffer(Buffer.from(buffer));
}

export {
	fromTokenizer,
	fromBuffer,
	stream,
} from './core.js';
