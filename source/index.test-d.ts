import {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {expectTypeOf, expectError} from 'nz';
import {
	type FileTypeResult,
	type FileTypeResult as FileTypeResultBrowser,
	type AnyWebReadableByteStreamWithFileType,
	fileTypeFromBlob,
	fileTypeFromBuffer,
	fileTypeFromFile,
	fileTypeFromStream,
	fileTypeStream,
	FileTypeParser,
} from './index.js';

// `fileTypeStream`: accepts StreamOptions & FileTypeOptions
{
	const webStream = new ReadableStream<Uint8Array>();
	expectTypeOf(await fileTypeStream(webStream, {sampleSize: 256})).toBe<AnyWebReadableByteStreamWithFileType>();
	expectTypeOf(await fileTypeStream(webStream, {sampleSize: 256, customDetectors: []})).toBe<AnyWebReadableByteStreamWithFileType>();
	expectTypeOf(await fileTypeStream(webStream, {signal: AbortSignal.timeout(1000)})).toBe<AnyWebReadableByteStreamWithFileType>();
	expectTypeOf(await fileTypeStream(webStream, {maxBufferSize: 8192})).toBe<AnyWebReadableByteStreamWithFileType>();
}

// `FileTypeParser`: tests generic input types and options
{
	const fileTypeParser = new FileTypeParser({customDetectors: [], signal: AbortSignal.timeout(1000), maxBufferSize: 8192});
	const fileTypeParserWithMpeg = new FileTypeParser({mpegOffsetTolerance: 10});
	const webStream = new ReadableStream<Uint8Array>();
	const nodeWebStream = new NodeReadableStream<Uint8Array>();

	expectTypeOf(await fileTypeParser.fromStream(webStream)).toBe<FileTypeResult | undefined>();
	expectTypeOf(await fileTypeParser.fromStream(nodeWebStream)).toBe<FileTypeResult | undefined>();

	expectTypeOf(await fileTypeParser.toDetectionStream(webStream, {sampleSize: 256})).toBe<AnyWebReadableByteStreamWithFileType>();
	expectError(fileTypeParser.toDetectionStream(webStream, {maxBufferSize: 8}));
	expectError(fileTypeParser.toDetectionStream(webStream, {customDetectors: []}));
	expectError(fileTypeParser.toDetectionStream(webStream, {signal: AbortSignal.timeout(1000)}));
}

// `fileTypeFromStream`: accepts FileTypeOptions
{
	const webStream = new ReadableStream<Uint8Array>();
	expectTypeOf(await fileTypeFromStream(webStream, {signal: AbortSignal.timeout(1000)})).toBe<FileTypeResult | undefined>();
	expectTypeOf(await fileTypeFromStream(webStream, {maxBufferSize: 8192})).toBe<FileTypeResult | undefined>();
}

// Test that Blob overload returns browser-specific result
expectTypeOf(fileTypeFromBlob(new Blob([]))).toBe<Promise<FileTypeResultBrowser | undefined>>();
expectTypeOf(fileTypeFromBlob(new Blob([]), {maxBufferSize: 8192})).toBe<Promise<FileTypeResultBrowser | undefined>>();
expectTypeOf(fileTypeFromBuffer(new Uint8Array(2), {maxBufferSize: 8192})).toBe<Promise<FileTypeResult | undefined>>();

// `fileTypeFromFile`: accepts a file path and options
expectTypeOf(fileTypeFromFile('file.bin')).toBe<Promise<FileTypeResult | undefined>>();
expectTypeOf(fileTypeFromFile('file.bin', {signal: AbortSignal.timeout(1000)})).toBe<Promise<FileTypeResult | undefined>>();
expectTypeOf(fileTypeFromFile('file.bin', {maxBufferSize: 8192})).toBe<Promise<FileTypeResult | undefined>>();

// `FileTypeParser#fromFile`: accepts a file path
{
	const fileTypeParser = new FileTypeParser();
	expectTypeOf(fileTypeParser.fromFile('file.bin')).toBe<Promise<FileTypeResult | undefined>>();
}
