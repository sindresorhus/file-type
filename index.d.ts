/// <reference types="node"/>
import {Readable as ReadableStream} from 'stream';
import * as core from './core';

export type FileType = core.FileType;

export type ReadableStreamWithFileType = core.ReadableStreamWithFileType;

export type FileTypeResult = core.FileTypeResult;

export type MimeType = core.MimeType;

	/**
	Detect the file type of a `Buffer`/`Uint8Array`/`ArrayBuffer`.
  The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

 	If file access is available, it is recommended to use `fromFile()` instead

	@param buffer - It works best if the buffer contains the entire file, it may work with a smaller portion as well
	@returns The detected file type and MIME type or `undefined` when there was no match.
 */
export function fromBuffer(buffer: Buffer | Uint8Array | ArrayBuffer): Promise<core.FileTypeResult | undefined>;

/**
	Detect the file type of a file path.
  The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

	@param path - The file path to parse
	@returns The detected file type and MIME type or `undefined` when there was no match.
 */
export function fromFile(path: string): Promise<core.FileTypeResult | undefined>;

/**
	Detect the file type of a Node.js ReadableStream.
  The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

	@param stream - Node.js readable stream
	@returns The detected file type and MIME type or `undefined` when there was no match.
 */
export function fromStream(stream: ReadableStream): Promise<core.FileTypeResult | undefined>;

/**
	Deprecated: The minimum amount of bytes needed to detect a file type. Currently, it's 4100 bytes, but it can change, so don't hard-code it.
 */
export const minimumBytes: number;

/**
	Supported file extensions.
 */
export const extensions: readonly core.FileType[];

/**
	Supported MIME types.
 */
export const mimeTypes: readonly core.MimeType[];

/**
	Detect the file type of a readable stream.

	@param readableStream - A readable stream containing a file to examine, see: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable).
	@returns A `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileType()`.

	@example
	```
	import * as fs from 'fs';
	import * as crypto from 'crypto';
	import fileType = require('file-type');

	(async () => {
		const read = fs.createReadStream('encrypted.enc');
		const decipher = crypto.createDecipheriv(alg, key, iv);

		const stream = await fileType.stream(read.pipe(decipher));

		console.log(stream.fileType);
		//=> {ext: 'mov', mime: 'video/quicktime'}

		const write = fs.createWriteStream(`decrypted.${stream.fileType.ext}`);
		stream.pipe(write);
	})();
	```
 */
export function stream(readableStream: ReadableStream): Promise<core.ReadableStreamWithFileType>

