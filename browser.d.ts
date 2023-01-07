import type {FileTypeResult} from './core.js';

/**
Detect the file type of a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

@example
```
import {fileTypeFromStream} from 'file-type';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const response = await fetch(url);
const fileType = await fileTypeFromStream(response.body);

console.log(fileType);
//=> {ext: 'jpg', mime: 'image/jpeg'}
```
*/
export declare function fileTypeFromStream(stream: ReadableStream): Promise<FileTypeResult | undefined>;

/**
Detect the file type of a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

__Note:__ This method is only available in the browser.

@example
```
import {fileTypeFromBlob} from 'file-type';

const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
	type: 'plain/text',
	endings: 'native'
});

console.log(await fileTypeFromBlob(blob));
//=> {ext: 'txt', mime: 'plain/text'}
```
*/
export declare function fileTypeFromBlob(blob: Blob): Promise<FileTypeResult | undefined>;

export {
	fileTypeFromBuffer,
	supportedExtensions,
	supportedMimeTypes,
	type FileTypeResult,
	type FileExtension,
	type MimeType,
} from './core.js';
