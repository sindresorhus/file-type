import {expectType} from 'tsd-check';
import fileType, {FileTypeResult, FileType} from '.';

expectType<FileTypeResult | null>(fileType(new Buffer([0xff, 0xd8, 0xff])));
expectType<FileTypeResult | null>(fileType(new Uint8Array([0xff, 0xd8, 0xff])));

const result = fileType(new Buffer([0xff, 0xd8, 0xff]));
if (result != null) {
	expectType<FileType>(result.ext);
	expectType<string>(result.mime);
}

expectType<number>(fileType.minimumBytes);
