import * as fs from 'fs';
import { expectType } from 'tsd';
import fileType = require('.');
import { FileTypeResult, FileType, ReadableStreamWithFileType } from '.';

expectType<Promise<FileTypeResult | undefined>>(fileType.fromBuffer(new Buffer([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(fileType.fromBuffer(new Uint8Array([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(fileType.fromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await fileType.fromBuffer(new Buffer([0xff, 0xd8, 0xff]));
	if (result !== undefined) {
		expectType<FileType>(result.ext);
		expectType<string>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await fileType.fromFile('myFile'));

	const fileRes = await fileType.fromFile('myFile');
	if (fileRes !== undefined) {
		expectType<FileType>(fileRes.ext);
		expectType<string>(fileRes.mime);
	}
})();

(async () => {
	const stream = fs.createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await fileType.fromStream(stream));

	const fileRes = await fileType.fromStream(stream);
	if (fileRes !== undefined) {
		expectType<FileType>(fileRes.ext);
		expectType<string>(fileRes.mime);
	}
})();

expectType<number>(fileType.minimumBytes);

expectType<readonly fileType.FileType[]>(fileType.extensions);

expectType<readonly fileType.MimeType[]>(fileType.mimeTypes);


const readableStream = fs.createReadStream('file.png');
const streamWithFileType = fileType.stream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
})();
