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
	type FileTypeResult,
	type ReadableStreamWithFileType,
	FileTypeParser,
} from './index.js';

// `fileTypeStream`: accepts options merged from StreamOptions & FileTypeOptions
(async () => {
	const stream = createReadStream('myFile');
	expectType<ReadableStreamWithFileType>(await fileTypeStream(stream, {sampleSize: 256, customDetectors: []}));
})();

// `FileTypeParser`: tests generic input types and mixed options
(async () => {
	const fileTypeParser = new FileTypeParser({customDetectors: []});
	const nodeStream = new Readable();
	const webStream = new ReadableStream<Uint8Array>();
	const nodeWebStream = new NodeReadableStream<Uint8Array>();

	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(nodeStream));
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(webStream));
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(nodeWebStream));

	expectType<ReadableStreamWithFileType>(await fileTypeParser.toDetectionStream(nodeStream, {sampleSize: 256, customDetectors: []}));
})();

// Test that Blob overload returns browser-specific result
expectType<Promise<FileTypeResultBrowser | undefined>>(fileTypeFromBlob(new Blob([])));
