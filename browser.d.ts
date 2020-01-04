import * as core from './core';

/**
Determine file type from a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

```
import FileType = require('file-type/browser');

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

(async () => {
	const response = await fetch(url);
	const fileType = await FileType.fromStream(response.body);

	console.log(fileType);
	//=> {ext: 'jpg', mime: 'image/jpeg'}
})();
```
*/
export declare function fromStream(stream: ReadableStream): Promise<core.FileType>;

/**
Determine file type from a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

```
import FileType = require('file-type/browser');

(async () => {
	const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
		type: 'plain/text',
		endings: 'native'
	});

	console.log(await FileType.parseBlob(blob));
	//=> {ext: 'txt', mime: 'plain/text'}
})();
```
*/
export declare function fromeBlob(blob: Blob): Promise<core.FileType>;
