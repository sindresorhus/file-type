/**
Typings for Node.js specific entry point.
*/

import type {Readable as NodeReadableStream} from 'node:stream';
import type {FileTypeResult, StreamOptions, AnyWebReadableStream} from './core.js';
import {FileTypeParser} from './core.js';

export type ReadableStreamWithFileType = NodeReadableStream & {
	readonly fileType?: FileTypeResult;
};

export declare class NodeFileTypeParser extends FileTypeParser {
	/**
	@param stream - Node.js `stream.Readable` or Web API `ReadableStream`.
	*/
	fromStream(stream: AnyWebReadableStream<Uint8Array> | NodeReadableStream): Promise<FileTypeResult | undefined>;

	/**
	Works the same way as {@link fileTypeStream}, additionally taking into account custom detectors (if any were provided to the constructor).
	*/
	toDetectionStream(readableStream: NodeReadableStream, options?: StreamOptions): Promise<ReadableStreamWithFileType>;
}

/**
Detect the file type of a file path.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

@param path
@returns The detected file type and MIME type or `undefined` when there is no match.
*/
export function fileTypeFromFile(path: string): Promise<FileTypeResult | undefined>;

export function fileTypeFromStream(stream: AnyWebReadableStream<Uint8Array> | NodeReadableStream): Promise<FileTypeResult | undefined>;

/**
Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

This method can be handy to put in between a stream, but it comes with a price.
Internally `stream()` builds up a buffer of `sampleSize` bytes, used as a sample, to determine the file type.
The sample size impacts the file detection resolution.
A smaller sample size will result in lower probability of the best file type detection.

**Note:** This method is only available when using Node.js.
**Note:** Requires Node.js 14 or later.

@param readableStream - A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable) containing a file to examine.
@param options - Maybe used to override the default sample-size.
@returns A `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileTypeFromFile()`.

@example
```
import got from 'got';
import {fileTypeStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const stream1 = got.stream(url);
const stream2 = await fileTypeStream(stream1, {sampleSize: 1024});

if (stream2.fileType?.mime === 'image/jpeg') {
	// stream2 can be used to stream the JPEG image (from the very beginning of the stream)
}
```
 */
export function fileTypeStream(readableStream: NodeReadableStream, options?: StreamOptions): Promise<ReadableStreamWithFileType>;

export * from './core.js';
