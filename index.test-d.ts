import * as fs from 'fs';
import {expectType} from 'tsd';
import fileType = require('.');
import {FileTypeResult, FileType, ReadableStreamWithFileType} from '.';

expectType<FileTypeResult | undefined>(fileType(new Buffer([0xff, 0xd8, 0xff])));
expectType<FileTypeResult | undefined>(fileType(new Uint8Array([0xff, 0xd8, 0xff])));
expectType<FileTypeResult | undefined>(fileType(new ArrayBuffer(42)));

const result = fileType(new Buffer([0xff, 0xd8, 0xff]));
if (result !== undefined) {
	expectType<FileType>(result.ext);
	expectType<string>(result.mime);
}

expectType<number>(fileType.minimumBytes);

expectType<fileType.FileType[]>(fileType.extensions);

expectType<fileType.MimeType[]>(fileType.mimeTypes);

const readableStream = fs.createReadStream('file.png');
const streamWithFileType = fileType.stream(readableStream);
expectType<Promise<ReadableStreamWithFileType>>(streamWithFileType);
expectType<FileTypeResult | undefined>((await streamWithFileType).fileType);
