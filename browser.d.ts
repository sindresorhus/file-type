import {FileTypeResult} from './core.js';

/**
Determine file type from a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

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
Determine file type from a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

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
	FileTypeResult,
	FileExtension,
	MimeType,
} from './core.js';
