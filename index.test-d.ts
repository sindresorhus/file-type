import * as fs from 'fs';
import {expectType} from 'tsd';
import FileType = require('.');
import {FileTypeResult, ReadableStreamWithFileType, FileExtension} from '.';

expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(new Buffer([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(new Uint8Array([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await FileType.fromBuffer(new Buffer([0xff, 0xd8, 0xff]));
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<string>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await FileType.fromFile('myFile'));

	const fileRes = await FileType.fromFile('myFile');
	if (fileRes !== undefined) {
		expectType<FileExtension>(fileRes.ext);
		expectType<string>(fileRes.mime);
	}
})();

(async () => {
	const stream = fs.createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await FileType.fromStream(stream));

	const fileRes = await FileType.fromStream(stream);
	if (fileRes !== undefined) {
		expectType<FileExtension>(fileRes.ext);
		expectType<string>(fileRes.mime);
	}
})();

expectType<number>(FileType.minimumBytes);

expectType<readonly FileType.FileExtension[]>(FileType.extensions);

expectType<readonly FileType.MimeType[]>(FileType.mimeTypes);


const readableStream = fs.createReadStream('file.png');
const streamWithFileType = FileType.stream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
})();
