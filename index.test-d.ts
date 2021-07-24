import fs from 'node:fs';
import {expectType} from 'tsd';
import {
	fileTypeFromBlob,
	FileTypeResult as FileTypeResultBrowser,
} from './browser.js';
import {
	fileTypeFromBuffer,
	fileTypeFromFile,
	fileTypeFromStream,
	fileTypeStream,
	supportedExtensions,
	supportedMimeTypes,
	FileTypeResult,
	ReadableStreamWithFileType,
	FileExtension,
	MimeType,
} from './index.js';

expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(Buffer.from([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await fileTypeFromBuffer(Buffer.from([0xFF, 0xD8, 0xFF]));
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
	const stream = fs.createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream));

	const result = await fileTypeFromStream(stream);
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

expectType<Set<FileExtension>>(supportedExtensions);

expectType<Set<MimeType>>(supportedMimeTypes);

const readableStream = fs.createReadStream('file.png');
const streamWithFileType = fileTypeStream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
})();

// Browser
expectType<Promise<FileTypeResultBrowser | undefined>>(fileTypeFromBlob(new Blob()));
