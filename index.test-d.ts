import {createReadStream} from 'node:fs';
import {ReadableStream as WebReadableStream} from 'node:stream/web';
import {expectType} from 'tsd';
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
	type FileExtension,
	type MimeType,
} from './index.js';

expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF]));
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile'));

	const result = await fileTypeFromFile('myFile');
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	const stream = createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream));

	const result = await fileTypeFromStream(stream);
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

expectType<ReadonlySet<FileExtension>>(supportedExtensions);

expectType<ReadonlySet<MimeType>>(supportedMimeTypes);

const webStream = new WebReadableStream<Uint8Array>();
const streamWithFileType = fileTypeStream(webStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	const {fileType} = await streamWithFileType;
	expectType<FileTypeResult | undefined>(fileType);
})();

// Browser
expectType<Promise<FileTypeResultBrowser | undefined>>(fileTypeFromBlob(new Blob([])));
