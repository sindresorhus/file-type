# file-type [![Build Status](https://travis-ci.org/sindresorhus/file-type.svg?branch=master)](https://travis-ci.org/sindresorhus/file-type)

> Detect the file type of a Buffer/Uint8Array


## Install

```sh
$ npm install --save file-type
```

```sh
$ bower install --save file-type
```

```sh
$ component install sindresorhus/file-type
```


## Usage

##### Node.js

```js
var readChunk = require('read-chunk'); // npm install read-chunk
var fileType = require('file-type');
var buffer = readChunk.sync('unicorn.png', 0, 58);

fileType(buffer);
//=> png
```

##### Browser

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', 'unicorn.png');
xhr.responseType = 'arraybuffer';

xhr.onload = function () {
	fileType(new Uint8Array(this.response));
	//=> png
};

xhr.send();
```


## API

### fileType(buffer)

Returns one of the [supported file types](#supported-file-types) or `false`.

#### buffer

Type: `buffer` *(Node.js)*, `uint8array`

It only needs the first 58 bytes.


## CLI

```sh
$ npm install --global file-type
```

```sh
$ file-type --help

Usage
  $ cat <filename> | file-type
  $ file-type <filename>

Example
  $ cat unicorn.png | file-type
  png
```


## Supported file types

- [`png`](https://github.com/sindresorhus/is-png)
- [`jpg`](https://github.com/sindresorhus/is-jpg)
- [`gif`](https://github.com/sindresorhus/is-gif)
- [`webp`](https://github.com/sindresorhus/is-webp)
- [`tif`](https://github.com/sindresorhus/is-tif)
- [`bmp`](https://github.com/sindresorhus/is-bmp)
- [`jxr`](https://github.com/sindresorhus/is-jxr)
- [`psd`](https://github.com/sindresorhus/is-psd)
- [`7z`](https://github.com/kevva/is-7zip)
- [`bz2`](https://github.com/kevva/is-bzip2)
- [`gz`](https://github.com/kevva/is-gzip)
- [`rar`](https://github.com/kevva/is-rar)
- [`tar`](https://github.com/kevva/is-tar)
- [`zip`](https://github.com/kevva/is-zip)
- [`pdf`](https://github.com/kevva/is-pdf)
- [`epub`](https://github.com/sindresorhus/is-epub)
- [`exe`](https://github.com/kevva/is-exe)
- [`mp3`](https://github.com/hemanth/is-mp3)
- [`flac`](https://github.com/hemanth/is-flac)
- [`wav`](https://github.com/hemanth/is-wav)
- [`ogg`](https://github.com/hemanth/is-ogg)


*PR welcome for additional file types*


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
