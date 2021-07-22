import {FileTypeResult} from './core.js';

/**
Determine file type from a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

```
import FileType from 'file-type/browser';

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

const response = await fetch(url);
const fileType = await FileType.fromStream(response.body);

console.log(fileType);
//=> {ext: 'jpg', mime: 'image/jpeg'}
```
*/
export declare function fromStream(stream: ReadableStream): Promise<FileTypeResult | undefined>;

/**
Determine file type from a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

```
import FileType from 'file-type/browser';

const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
	type: 'plain/text',
	endings: 'native'
});

console.log(await FileType.fromBlob(blob));
//=> {ext: 'txt', mime: 'plain/text'}
```
*/
export declare function fromBlob(blob: Blob): Promise<FileTypeResult | undefined>;

export {
	fromBuffer,
	supportedExtensions,
	supportedMimeTypes,
	FileTypeResult,
	FileExtension,
	MimeType,
} from './core.js';
