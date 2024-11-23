import {createReadStream} from 'node:fs';
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
} from './index.js';

expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF])));
expectType<Promise<FileTypeResult | undefined>>(fileTypeFromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await fileTypeFromBuffer(new Uint8Array([0xFF, 0xD8, 0xFF]));
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await fileTypeFromFile('myFile'));

	const result = await fileTypeFromFile('myFile');
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}
})();

(async () => {
	const stream = createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileTypeFromStream(stream));

	const result = await fileTypeFromStream(stream);
	if (result !== undefined) {
		expectType<string>(result.ext);
		expectType<string>(result.mime);
	}
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
