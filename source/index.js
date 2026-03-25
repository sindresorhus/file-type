/**
Node.js specific entry point.
*/

import fs from 'node:fs/promises';
import {constants as fileSystemConstants} from 'node:fs';
import * as strtok3 from 'strtok3';
import {FileTypeParser as DefaultFileTypeParser} from './core.js';

export class FileTypeParser extends DefaultFileTypeParser {
	async fromFile(path) {
		this.options.signal?.throwIfAborted();
		// TODO: Remove this when `strtok3.fromFile()` safely rejects non-regular filesystem objects without a pathname race.
		const fileHandle = await fs.open(path, fileSystemConstants.O_RDONLY | fileSystemConstants.O_NONBLOCK);
		const fileStat = await fileHandle.stat();
		if (!fileStat.isFile()) {
			await fileHandle.close();
			return;
		}

		const tokenizer = new strtok3.FileTokenizer(fileHandle, {
			...this.getTokenizerOptions(),
			fileInfo: {
				path,
				size: fileStat.size,
			},
		});
		return super.fromTokenizer(tokenizer);
	}
}

export async function fileTypeFromFile(path, options) {
	return (new FileTypeParser(options)).fromFile(path);
}

export {
	fileTypeFromTokenizer,
	fileTypeFromBuffer,
	fileTypeFromBlob,
	fileTypeFromStream,
	fileTypeStream,
	supportedMimeTypes,
	supportedExtensions,
} from './core.js';
