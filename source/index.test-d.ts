import {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {expectTypeOf} from 'nz';
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
}

// `FileTypeParser`: tests generic input types and options
{
	const fileTypeParser = new FileTypeParser({customDetectors: [], signal: AbortSignal.timeout(1000)});
	const fileTypeParserWithMpeg = new FileTypeParser({mpegOffsetTolerance: 10});
	const webStream = new ReadableStream<Uint8Array>();
	const nodeWebStream = new NodeReadableStream<Uint8Array>();

	expectTypeOf(await fileTypeParser.fromStream(webStream)).toBe<FileTypeResult | undefined>();
	expectTypeOf(await fileTypeParser.fromStream(nodeWebStream)).toBe<FileTypeResult | undefined>();

	expectTypeOf(await fileTypeParser.toDetectionStream(webStream, {sampleSize: 256})).toBe<AnyWebReadableByteStreamWithFileType>();
}

// `fileTypeFromStream`: accepts FileTypeOptions
{
	const webStream = new ReadableStream<Uint8Array>();
	expectTypeOf(await fileTypeFromStream(webStream, {signal: AbortSignal.timeout(1000)})).toBe<FileTypeResult | undefined>();
}

// Test that Blob overload returns browser-specific result
expectTypeOf(fileTypeFromBlob(new Blob([]))).toBe<Promise<FileTypeResultBrowser | undefined>>();

// `fileTypeFromFile`: accepts a file path and options
expectTypeOf(fileTypeFromFile('file.bin')).toBe<Promise<FileTypeResult | undefined>>();
expectTypeOf(fileTypeFromFile('file.bin', {signal: AbortSignal.timeout(1000)})).toBe<Promise<FileTypeResult | undefined>>();

// `FileTypeParser#fromFile`: accepts a file path
{
	const fileTypeParser = new FileTypeParser();
	expectTypeOf(fileTypeParser.fromFile('file.bin')).toBe<Promise<FileTypeResult | undefined>>();
}
