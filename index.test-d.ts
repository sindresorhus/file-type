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
	const result = await fileTypeFromBlob(new Blob());
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}

	expectType<FileTypeResult | undefined>(await fileTypeFromBlob(new Blob(), {customDetectors: []}));
})();

// FileTypeFromFile
(async () => {
	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile'));

	const result = await fileTypeFromFile('myFile');
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}

	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile', {customDetectors: []}));
})();

// FileTypeFromStream
(async () => {
	const stream = createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream));

	const result = await fileTypeFromStream(stream);
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}

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

	// With StreamOptions & FileTypeOptions
	expectType<ReadableStreamWithFileType>(await fileTypeStream(inputReadable, {sampleSize: 256, customDetectors: []}));
})();

// Test typings file-type class FileTypeParser
(async () => {
	// No arguments provided to constructor
	let fileTypeParser = new FileTypeParser();
	// With custom detectors
	fileTypeParser = new FileTypeParser({customDetectors: []});

	const fromFileFileType = await fileTypeParser.fromFile('myFile');
	expectType<FileTypeResult | undefined>(fromFileFileType);

	// From a Node Readable (stream)
	const fromNodeStreamFileType = await fileTypeParser.fromStream(new Readable());
	expectType<FileTypeResult | undefined>(fromNodeStreamFileType);

	// From a DOM type Blob
	const fromBlobFileType = await fileTypeParser.fromBlob(new Blob());
	expectType<FileTypeResult | undefined>(fromBlobFileType);

	// From a DOM type Web byte ReadableStream
	const fromWebReadableStreamFileType = await fileTypeParser.fromStream(new ReadableStream({type: 'bytes'}));
	expectType<FileTypeResult | undefined>(fromWebReadableStreamFileType);

	// From a Node type byte ReadableStream
	const fromNodeReadableStreamFileType = await fileTypeParser.fromStream(new NodeReadableStream({type: 'bytes'}));
	expectType<FileTypeResult | undefined>(fromNodeReadableStreamFileType);

	// From a Node type byte ReadableStream
	const tokenizer = await fromFile('myFile');
	const fromTokenizerFileType = await fileTypeParser.fromTokenizer(tokenizer);
	expectType<FileTypeResult | undefined>(fromTokenizerFileType);

	// From a Node type byte ReadableStream
	const toDetectionStreamReadable = await fileTypeParser.toDetectionStream(new Readable());
	expectType<ReadableStreamWithFileType>(toDetectionStreamReadable);

	const toDetectionStreamWithOptionsReadable = await fileTypeParser.toDetectionStream(new Readable(), {sampleSize: 256});
	expectType<ReadableStreamWithFileType>(toDetectionStreamWithOptionsReadable);
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
