import * as fs from 'fs';
import {expectType} from 'tsd';
import FileType = require('.');
import {FileTypeResult, ReadableStreamWithFileType, FileExtension, MimeType} from '.';
import FileTypeBrowser = require('./browser');
import {FileTypeResult as FileTypeResultBrowser} from './browser';

expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(Buffer.from([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(new Uint8Array([0xff, 0xd8, 0xff])));
expectType<Promise<FileTypeResult | undefined>>(FileType.fromBuffer(new ArrayBuffer(42)));

(async () => {
	const result = await FileType.fromBuffer(Buffer.from([0xff, 0xd8, 0xff]));
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	expectType<FileTypeResult | undefined>(await FileType.fromFile('myFile'));

	const result = await FileType.fromFile('myFile');
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

(async () => {
	const stream = fs.createReadStream('myFile');

	expectType<FileTypeResult | undefined>(await FileType.fromStream(stream));

	const result = await FileType.fromStream(stream);
	if (result !== undefined) {
		expectType<FileExtension>(result.ext);
		expectType<MimeType>(result.mime);
	}
})();

expectType<Set<FileType.FileExtension>>(FileType.extensions);

expectType<readonly FileType.MimeType[]>(FileType.mimeTypes);

const readableStream = fs.createReadStream('file.png');
const streamWithFileType = FileType.stream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
(async () => {
	expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
})();

// Browser
expectType<Promise<FileTypeResult | undefined>>(FileTypeBrowser.fromBlob(new Blob()));
