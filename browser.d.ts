import * as core from './core';

/**
 * Determine file type from ReadableStream
 * @param stream - ReadableStream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
 * @return Promise with file-type
 */
export declare function fromStream(stream: ReadableStream): Promise<core.FileType>;

/**
 * Determine file type from Blob
 * @param blob - Blob to parse: https://developer.mozilla.org/en-US/docs/Web/API/Blob
 * @returns Promise with file-type
 */
export declare function fromeBlob(blob: Blob): Promise<core.FileType>;
