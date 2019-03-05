/// <reference types="node"/>
import {Readable as ReadableStream} from 'stream';

export type FileType =
	| 'jpg'
	| 'png'
	| 'gif'
	| 'webp'
	| 'flif'
	| 'cr2'
	| 'tif'
	| 'bmp'
	| 'jxr'
	| 'psd'
	| 'zip'
	| 'tar'
	| 'rar'
	| 'gz'
	| 'bz2'
	| '7z'
	| 'dmg'
	| 'mp4'
	| 'm4v'
	| 'mid'
	| 'mkv'
	| 'webm'
	| 'mov'
	| 'avi'
	| 'wmv'
	| 'mpg'
	| 'mp2'
	| 'mp3'
	| 'm4a'
	| 'ogg'
	| 'opus'
	| 'flac'
	| 'wav'
	| 'qcp'
	| 'amr'
	| 'pdf'
	| 'epub'
	| 'mobi'
	| 'exe'
	| 'swf'
	| 'rtf'
	| 'woff'
	| 'woff2'
	| 'eot'
	| 'ttf'
	| 'otf'
	| 'ico'
	| 'flv'
	| 'ps'
	| 'xz'
	| 'sqlite'
	| 'nes'
	| 'crx'
	| 'xpi'
	| 'cab'
	| 'deb'
	| 'ar'
	| 'rpm'
	| 'Z'
	| 'lz'
	| 'msi'
	| 'mxf'
	| 'mts'
	| 'wasm'
	| 'blend'
	| 'bpg'
	| 'docx'
	| 'pptx'
	| 'xlsx'
	| '3gp'
	| 'jp2'
	| 'jpm'
	| 'jpx'
	| 'mj2'
	| 'aif'
	| 'odt'
	| 'ods'
	| 'odp'
	| 'xml'
	| 'heic'
	| 'cur'
	| 'ktx'
	| 'ape'
	| 'wv'
	| 'asf'
	| 'wma'
	| 'wmv'
	| 'dcm'
	| 'mpc'
	| 'ics'
	| 'glb'
	| 'pcap';

export interface FileTypeResult {
	/**
	 * One of the supported [file types](https://github.com/sindresorhus/file-type#supported-file-types).
	 */
	ext: FileType;

	/**
	 * The detected [MIME type](https://en.wikipedia.org/wiki/Internet_media_type).
	 */
	mime: string;
}

export type ReadableStreamWithFileType = ReadableStream & {
	readonly fileType: FileTypeResult | null;
};

export interface FileTypeModule {
	(buffer: Buffer | Uint8Array): FileTypeResult | null;

	/**
	 * The minimum amount of bytes needed to detect a file type. Currently, it's 4100 bytes, but it can change, so don't hard-code it.
	 */
	readonly minimumBytes: number;

	/**
	 * Detect the file type of a readable stream.
	 *
	 * @param readableStream - A readable stream containing a file to examine, see: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable).
	 * @returns A `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileType()`.
	 */
	readonly stream: (readableStream: ReadableStream) => Promise<ReadableStreamWithFileType>;
}

/**
 * Detect the file type of a `Buffer`/`Uint8Array`. The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.
 *
 * @param buffer - It only needs the first `.minimumBytes` bytes. The exception is detection of `docx`, `pptx`, and `xlsx` which potentially requires reading the whole file.
 * @returns An object with the detected file type and MIME type or `null` when there was no match.
 */
declare const fileType: FileTypeModule;

export default fileType;
