/**
Typings for Node.js specific entry point.
*/

import type {Readable as NodeReadableStream} from 'node:stream';
import type {ReadableStream as WebReadableStream} from 'node:stream/web';
import type {FileTypeResult} from './core.js';
import {FileTypeParser} from './core.js';

export declare class NodeFileTypeParser extends FileTypeParser {
	/**
	 *
	 * @param stream Node.js Stream readable or Web API StreamReadable
	 */
	fromStream(stream: WebReadableStream<Uint8Array> | NodeReadableStream): Promise<FileTypeResult | undefined>;
}

/**
 * Detect the file type of a file path.
 *
 * The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.
 *
 * @param path
 * @returns The detected file type and MIME type or `undefined` when there is no match.
 */
export function fileTypeFromFile(path: string): Promise<FileTypeResult | undefined>;

export function fileTypeFromStream(stream: WebReadableStream<Uint8Array> | NodeReadableStream): Promise<FileTypeResult | undefined>;

export * from './core.js';
