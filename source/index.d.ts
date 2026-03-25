/**
Typings for Node.js specific entry point.
*/

import {
	type FileTypeResult,
	type FileTypeOptions,
	FileTypeParser as DefaultFileTypeParser,
} from './core.js';

/**
Extending `FileTypeParser` with Node.js engine specific functions.
*/
export declare class FileTypeParser extends DefaultFileTypeParser {
	fromFile(filePath: string): Promise<FileTypeResult | undefined>;
}

/**
Detect the file type of a file path.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the file.

This is for Node.js only.

To read from a [`File`](https://developer.mozilla.org/docs/Web/API/File), see `fileTypeFromBlob()`.

@returns The detected file type and MIME type or `undefined` when there is no match.
*/
export function fileTypeFromFile(filePath: string, options?: FileTypeOptions): Promise<FileTypeResult | undefined>;

export * from './core.js';
