/**
Node.js specific entry point.
*/

import {ReadableStream as WebReadableStream} from 'node:stream/web';
import * as strtok3 from 'strtok3';
import {FileTypeParser} from './core.js';

export class NodeFileTypeParser extends FileTypeParser {
	async fromStream(stream) {
		const tokenizer = await (stream instanceof WebReadableStream ? strtok3.fromWebStream(stream) : strtok3.fromStream(stream));
		try {
			return super.fromTokenizer(tokenizer);
		} finally {
			await tokenizer.close();
		}
	}
}

export async function fileTypeFromFile(path, fileTypeOptions) {
	const tokenizer = await strtok3.fromFile(path);
	try {
		const parser = new FileTypeParser(fileTypeOptions);
		return await parser.fromTokenizer(tokenizer);
	} finally {
		await tokenizer.close();
	}
}

export async function fileTypeFromStream(stream, fileTypeOptions) {
	return (new NodeFileTypeParser(fileTypeOptions)).fromStream(stream);
}

export {fileTypeFromBuffer, fileTypeFromBlob, fileTypeStream, FileTypeParser, supportedMimeTypes, supportedExtensions} from './core.js';
