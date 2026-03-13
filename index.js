/**
Node.js specific entry point.
*/

import {ReadableStream as WebReadableStream} from 'node:stream/web';
import {pipeline, PassThrough, Readable} from 'node:stream';
import fs from 'node:fs/promises';
import {constants as fileSystemConstants} from 'node:fs';
import * as strtok3 from 'strtok3';
import {
	FileTypeParser as DefaultFileTypeParser,
	reasonableDetectionSizeInBytes,
	normalizeSampleSize,
} from './core.js';

function isTokenizerStreamBoundsError(error) {
	if (
		!(error instanceof RangeError)
		|| error.message !== 'offset is out of bounds'
		|| typeof error.stack !== 'string'
	) {
		return false;
	}

	// Some malformed or non-byte Node.js streams can surface this tokenizer-internal range error.
	// Note: This stack-trace check is fragile and may break if strtok3 restructures its internals.
	return /strtok3[/\\]lib[/\\]stream[/\\]/.test(error.stack);
}

export class FileTypeParser extends DefaultFileTypeParser {
	async fromStream(stream) {
		const tokenizer = await (stream instanceof WebReadableStream ? strtok3.fromWebStream(stream, this.getTokenizerOptions()) : strtok3.fromStream(stream, this.getTokenizerOptions()));
		try {
			return await super.fromTokenizer(tokenizer);
		} catch (error) {
			if (isTokenizerStreamBoundsError(error)) {
				return;
			}

			throw error;
		} finally {
			await tokenizer.close();
		}
	}

	async fromFile(path) {
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
		try {
			return await super.fromTokenizer(tokenizer);
		} finally {
			await tokenizer.close();
		}
	}

	async toDetectionStream(readableStream, options = {}) {
		if (!(readableStream instanceof Readable)) {
			return super.toDetectionStream(readableStream, options);
		}

		const sampleSize = normalizeSampleSize(options.sampleSize ?? reasonableDetectionSizeInBytes);

		return new Promise((resolve, reject) => {
			readableStream.on('error', reject);

			readableStream.once('readable', () => {
				(async () => {
					try {
						// Set up output stream
						const pass = new PassThrough();
						const outputStream = pipeline ? pipeline(readableStream, pass, () => {}) : readableStream.pipe(pass);

						// Read the input stream and detect the filetype
						const chunk = readableStream.read(sampleSize) ?? readableStream.read() ?? new Uint8Array(0);
						try {
							pass.fileType = await this.fromBuffer(chunk);
						} catch (error) {
							if (error instanceof strtok3.EndOfStreamError) {
								pass.fileType = undefined;
							} else {
								reject(error);
							}
						}

						resolve(outputStream);
					} catch (error) {
						reject(error);
					}
				})();
			});
		});
	}
}

export async function fileTypeFromFile(path, options) {
	return (new FileTypeParser(options)).fromFile(path, options);
}

export async function fileTypeFromStream(stream, options) {
	return (new FileTypeParser(options)).fromStream(stream);
}

export async function fileTypeStream(readableStream, options = {}) {
	return new FileTypeParser(options).toDetectionStream(readableStream, options);
}

export {
	fileTypeFromTokenizer,
	fileTypeFromBuffer,
	fileTypeFromBlob,
	supportedMimeTypes,
	supportedExtensions,
} from './core.js';
