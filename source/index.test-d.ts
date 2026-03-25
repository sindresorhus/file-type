import {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {expectType} from 'tsd';
import {
	type FileTypeResult as FileTypeResultBrowser,
	type AnyWebReadableByteStreamWithFileType,
} from './core.js';
import {
	fileTypeFromBlob,
	fileTypeFromBuffer,
	fileTypeFromFile,
	fileTypeFromStream,
	fileTypeStream,
	type FileTypeResult,
	FileTypeParser,
} from './index.js';

// `fileTypeStream`: accepts StreamOptions & FileTypeOptions
(async () => {
	const webStream = new ReadableStream<Uint8Array>();
	expectType<AnyWebReadableByteStreamWithFileType>(await fileTypeStream(webStream, {sampleSize: 256}));
	expectType<AnyWebReadableByteStreamWithFileType>(await fileTypeStream(webStream, {sampleSize: 256, customDetectors: []}));
	expectType<AnyWebReadableByteStreamWithFileType>(await fileTypeStream(webStream, {signal: AbortSignal.timeout(1000)}));
})();

// `FileTypeParser`: tests generic input types and options
(async () => {
	const fileTypeParser = new FileTypeParser({customDetectors: [], signal: AbortSignal.timeout(1000)});
	const fileTypeParserWithMpeg = new FileTypeParser({mpegOffsetTolerance: 10});
	const webStream = new ReadableStream<Uint8Array>();
	const nodeWebStream = new NodeReadableStream<Uint8Array>();

	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(webStream));
	expectType<FileTypeResult | undefined>(await fileTypeParser.fromStream(nodeWebStream));

	expectType<AnyWebReadableByteStreamWithFileType>(await fileTypeParser.toDetectionStream(webStream, {sampleSize: 256}));
})();

// `fileTypeFromStream`: accepts FileTypeOptions
(async () => {
	const webStream = new ReadableStream<Uint8Array>();
	expectType<FileTypeResult | undefined>(await fileTypeFromStream(webStream, {signal: AbortSignal.timeout(1000)}));
})();

// Test that Blob overload returns browser-specific result
expectType<Promise<FileTypeResultBrowser | undefined>>(fileTypeFromBlob(new Blob([])));
