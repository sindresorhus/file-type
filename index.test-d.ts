import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {expectType} from 'tsd';
import {fromFile} from 'strtok3';
import {
	type FileTypeResult as FileTypeResultBrowser,
} from './core.js';
import {
	fileTypeFromBlob,
	fileTypeFromBuffer,
	fileTypeFromFile,
	fileTypeFromStream,
	fileTypeStream,
	supportedExtensions,
	supportedMimeTypes,
	type FileTypeResult,
	type ReadableStreamWithFileType,
	FileTypeParser,
} from './index.js';

expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new ArrayBuffer(42)));

// FileTypeFromBuffer
(async () => {
	const result = await fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF]));
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}

	expectType<FileTypeResult | undefined>(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF]), {customDetectors: []}));
})();

// FileTypeFromBlob
(async () => {
	expectType<FileTypeResult | undefined>(await fileTypeFromBlob(new Blob()));
	expectType<FileTypeResult | undefined>(await fileTypeFromBlob(new Blob(), {customDetectors: []}));
})();

// FileTypeFromFile
(async () => {
	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile'));
	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile', {customDetectors: []}));
})();

// FileTypeFromStream
(async () => {
	const stream = createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream));
	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream, {customDetectors: []}));
})();

// ToDetectionStream
(async () => {
	const inputReadable = createReadStream('myFile');

	// Basic usage
	const result = await fileTypeStream(inputReadable);
	expectType<ReadableStreamWithFileType>(result);
	expectType<FileTypeResult | undefined>(result.fileType);

	// With FileTypeOptions
	expectType<ReadableStreamWithFileType>(await fileTypeStream(inputReadable, {customDetectors: []}));

	// With StreamOptions
	expectType<ReadableStreamWithFileType>(await fileTypeStream(inputReadable, {sampleSize: 256}));

	// Should accept mixed options from: StreamOptions & FileTypeOptions
	expectType<ReadableStreamWithFileType>(await fileTypeStream(inputReadable, {sampleSize: 256, customDetectors: []}));
})();

// Test typings file-type class FileTypeParser
(async () => {
	// No arguments provided to constructor
	let fileTypeParser = new FileTypeParser();
	// With custom detectors
	fileTypeParser = new FileTypeParser({customDetectors: []});

	expectType<FileTypeResult | undefined>(await fileTypeParser.fromFile('myFile'));

	// From a Blob
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromBlob(new Blob()));

	// From a Node Readable (stream)
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(new Readable()));

	// From a DOM type Web ReadableStream<Uint8Array>
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(new ReadableStream<Uint8Array>()));

	// From a DOM type Web byte ReadableStream
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(new ReadableStream({type: 'bytes'})));

	// From a Node type byte ReadableStream
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(new NodeReadableStream({type: 'bytes'})));

	// From a Node type ReadableStream<Uint8Array>
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(new NodeReadableStream<Uint8Array>()));

	// From a Node type byte ReadableStream
	const tokenizer = await fromFile('myFile');
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromTokenizer(tokenizer));

	// From a Node type byte ReadableStream
	expectType<ReadableStreamWithFileType>(await fileTypeParser.toDetectionStream(new Readable()));

	// Should accept mixed options from: StreamOptions & FileTypeOptions
	expectType<ReadableStreamWithFileType>(await fileTypeParser.toDetectionStream(new Readable(), {sampleSize: 256, customDetectors: []}));
})();

expectType<ReadonlySet<string>>(supportedExtensions);

expectType<ReadonlySet<string>>(supportedMimeTypes);

const readableStream = createReadStream('file.png');
const streamWithFileType = fileTypeStream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	const {fileType} = await streamWithFileType;
	expectType<FileTypeResult | undefined>(fileType);
})();

// Browser
expectType<Promise<FileTypeResultBrowser | undefined>>(fileTypeFromBlob(new Blob([])));
