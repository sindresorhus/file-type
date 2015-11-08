# file-type [![Build Status](https://travis-ci.org/sindresorhus/file-type.svg?branch=master)](https://travis-ci.org/sindresorhus/file-type)

> Detect the file type of a Buffer/Uint8Array

The file type is detected by checking the [magic number](http://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.


## Install

```
$ npm install --save file-type
```


## Usage

##### Node.js

```js
const readChunk = require('read-chunk'); // npm install read-chunk
const fileType = require('file-type');
const buffer = readChunk.sync('unicorn.png', 0, 262);

fileType(buffer);
//=> {ext: 'png', mime: 'image/png'}
```

or from a remote location:

```js
const http = require('http');
const fileType = require('file-type');
const url = 'http://assets-cdn.github.com/images/spinners/octocat-spinner-32.gif';

http.get(url, res => {
	res.once('data', chunk => {
		res.destroy();
		console.log(fileType(chunk));
		//=> {ext: 'gif', mime: 'image/gif'}
	});
});
```

##### Browser

```js
const xhr = new XMLHttpRequest();
xhr.open('GET', 'unicorn.png');
xhr.responseType = 'arraybuffer';

xhr.onload = () => {
	fileType(new Uint8Array(this.response));
	//=> {ext: 'png', mime: 'image/png'}
};

xhr.send();
```


## API

### fileType(buffer)

Returns an object (or `null` when no match) with:

- `ext` - one of the [supported file types](#supported-file-types)
- `mime` - the [MIME type](http://en.wikipedia.org/wiki/Internet_media_type)

#### buffer

Type: `buffer` *(Node.js)*, `uint8array`

It only needs the first 262 bytes.


## Supported file types

- `jpg`
- `png`
- `gif`
- `webp`
- `cr2`
- `tif`
- `bmp`
- `jxr`
- `psd`
- `zip`
- `tar`
- `rar`
- `gz`
- `bz2`
- `7z`
- `dmg`
- `mp4`
- `m4v`
- `mid`
- `mkv`
- `webm`
- `mov`
- `avi`
- `wmv`
- `mpg`
- `mp3`
- `m4a`
- `ogg`
- `flac`
- `wav`
- [`amr`](https://en.wikipedia.org/wiki/Adaptive_Multi-Rate_audio_codec)
- `pdf`
- `epub`
- `exe`
- `swf`
- `rtf`
- `woff`
- `woff2`
- `eot`
- `ttf`
- `otf`
- `ico`
- `flv`
- `ps`
- `xz`
- `sqlite`
- `nes`
- `crx`
- `xpi`
- `cab`
- `deb`
- `ar`
- `Z`
- `lz`

*SVG isn't included as it requires the whole file to be read, but you can get it [here](https://github.com/sindresorhus/is-svg).*

*PR welcome for additional commonly used file types.*


## Related

- [file-type-cli](https://github.com/sindresorhus/file-type-cli) - CLI for this module


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
