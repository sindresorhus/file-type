import type {FileTypeResult, FileTypeOptions} from './core.js';

/**
Detect the file type of a file path.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

@param path - The file path to parse.
@param fileTypeOptions - Optional: An options object including the `customDetectors` property as an Iterable of Detector functions. Those are called in the order provided.
@returns The detected file type and MIME type or `undefined` when there is no match.
*/
export function fileTypeFromFile(path: string, fileTypeOptions?: FileTypeOptions): Promise<FileTypeResult | undefined>;

export * from './core.js';
