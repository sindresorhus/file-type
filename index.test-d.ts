import fs from 'node:fs';
import {expectType} from 'tsd';
import {
	fromBlob,
	FileTypeResult as FileTypeResultBrowser,
} from './browser.js';
import {
	fromBuffer,
	fromFile,
	fromStream,
	stream,
	supportedExtensions,
	supportedMimeTypes,
	FileTypeResult,
	ReadableStreamWithFileType,
	FileExtension,
	MimeType,
} from './index.js';

expectType<Promise<FileTypeResult | undefined>>(fromBuffer(Buffer.from([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await fromBuffer(Buffer.from([0xFF, 0xD8, 0xFF]));
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await fromFile('myFile'));

	const result = await fromFile('myFile');
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	const stream = fs.createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fromStream(stream));

	const result = await fromStream(stream);
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

expectType<Set<FileExtension>>(supportedExtensions);

expectType<Set<MimeType>>(supportedMimeTypes);

const readableStream = fs.createReadStream('file.png');
const streamWithFileType = stream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
})();

// Browser
expectType<Promise<FileTypeResultBrowser | undefined>>(fromBlob(new Blob()));
