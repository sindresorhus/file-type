# file-type [![Build Status](https://travis-ci.com/sindresorhus/file-type.svg?branch=master)](https://travis-ci.com/github/sindresorhus/file-type)

> Detect the file type of a Buffer/Uint8Array/ArrayBuffer

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

## Install

```
$ npm install file-type
```

## Usage

#### Node.js

Determine file type from a file:

```js
const FileType = require('file-type');

(async () => {
	console.log(await FileType.fromFile('Unicorn.png'));
	//=> {ext: 'png', mime: 'image/png'}
})();
```

Determine file type from a Buffer, which may be a portion of the beginning of a file:

```js
const FileType = require('file-type');
const readChunk = require('read-chunk');

(async () => {
	const buffer = readChunk.sync('Unicorn.png', 0, 4100);

	console.log(await FileType.fromBuffer(buffer));
	//=> {ext: 'png', mime: 'image/png'}
})();
```

Determine file type from a stream:

```js
const fs = require('fs');
const FileType = require('file-type');

(async () => {
	const stream = fs.createReadStream('Unicorn.mp4');

	console.log(await FileType.fromStream(stream));
	//=> {ext: 'mp4', mime: 'video/mp4'}
}
)();
```

The stream method can also be used to read from a remote location:

```js
const got = require('got');
const FileType = require('file-type');

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

(async () => {
	const stream = got.stream(url);

	console.log(await FileType.fromStream(stream));
	//=> {ext: 'jpg', mime: 'image/jpeg'}
})();
```

Another stream example:

```js
const stream = require('stream');
const fs = require('fs');
const crypto = require('crypto');
const FileType = require('file-type');

(async () => {
	const read = fs.createReadStream('encrypted.enc');
	const decipher = crypto.createDecipheriv(alg, key, iv);

	const fileTypeStream = await FileType.stream(stream.pipeline(read, decipher));

	console.log(fileTypeStream.fileType);
	//=> {ext: 'mov', mime: 'video/quicktime'}

	const write = fs.createWriteStream(`decrypted.${fileTypeStream.fileType.ext}`);
	fileTypeStream.pipe(write);
})();
```

#### Browser

```js
const FileType = require('file-type/browser');

const url = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';

(async () => {
	const response = await fetch(url);
	const fileType = await FileType.fromStream(response.body);

	console.log(fileType);
	//=> {ext: 'jpg', mime: 'image/jpeg'}
})();
```

```js
const FileType = require('file-type/browser');

(async () => {
	const blob = new Blob(['<?xml version="1.0" encoding="ISO-8859-1" ?>'], {
		type: 'plain/text',
		endings: 'native'
	});

	console.log(await FileType.fromBlob(blob));
	//=> {ext: 'txt', mime: 'plain/text'}
})();
```

## API

### FileType.fromBuffer(buffer)

Detect the file type of a `Buffer`, `Uint8Array`, or `ArrayBuffer`.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

If file access is available, it is recommended to use `FileType.fromFile()` instead.

Returns a `Promise` for an object with the detected file type and MIME type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### buffer

Type: `Buffer | Uint8Array | ArrayBuffer`

A buffer representing file data. It works best if the buffer contains the entire file, it may work with a smaller portion as well.

### FileType.fromFile(filePath)

Detect the file type of a file path.

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

Returns a `Promise` for an object with the detected file type and MIME type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### filePath

Type: `string`

The file path to parse.

### FileType.fromStream(stream)

Detect the file type of a Node.js [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.

Returns a `Promise` for an object with the detected file type and MIME type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### stream

Type: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

A readable stream representing file data.

### FileType.fromTokenizer(tokenizer)

Detect the file type from an `ITokenizer` source.

This method is used internally, but can also be used for a special "tokenizer" reader.

A tokenizer propagates the internal read functions, allowing alternative transport mechanisms, to access files, to be implemented and used.

Returns a `Promise` for an object with the detected file type and MIME type:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

An example is [`@tokenizer/http`](https://github.com/Borewit/tokenizer-http), which requests data using [HTTP-range-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). A difference with a conventional stream and the [*tokenizer*](https://github.com/Borewit/strtok3#tokenizer), is that it can *ignore* (seek, fast-forward) in the stream. For example, you may only need and read the first 6 bytes, and the last 128 bytes, which may be an advantage in case reading the entire file would take longer.

```js
const {makeTokenizer} = require('@tokenizer/http');
const FileType = require('file-type');

const audioTrackUrl = 'https://test-audio.netlify.com/Various%20Artists%20-%202009%20-%20netBloc%20Vol%2024_%20tiuqottigeloot%20%5BMP3-V2%5D/01%20-%20Diablo%20Swing%20Orchestra%20-%20Heroines.mp3';

(async () => {
	const httpTokenizer = await makeTokenizer(audioTrackUrl);
	const fileType = await FileType.fromTokenizer(httpTokenizer);

	console.log(fileType);
	//=> {ext: 'mp3', mime: 'audio/mpeg'}
})();
```

Or use [`@tokenizer/s3`](https://github.com/Borewit/tokenizer-s3) to determine the file type of a file stored on [Amazon S3](https://aws.amazon.com/s3):

```js
const FileType = require('file-type');
const S3 = require('aws-sdk/clients/s3');
const {makeTokenizer} = require('@tokenizer/s3');

(async () => {
	// Initialize the S3 client
	const s3 = new S3();

	// Initialize the S3 tokenizer.
	const s3Tokenizer = await makeTokenizer(s3, {
		Bucket: 'affectlab',
		Key: '1min_35sec.mp4'
	});

	// Figure out what kind of file it is.
	const fileType = await FileType.fromTokenizer(s3Tokenizer);
	console.log(fileType);
})();
```

Note that only the minimum amount of data required to determine the file type is read (okay, just a bit extra to prevent too many fragmented reads).

#### tokenizer

Type: [`ITokenizer`](https://github.com/Borewit/strtok3#tokenizer)

A file source implementing the [tokenizer interface](https://github.com/Borewit/strtok3#tokenizer).

### FileType.stream(readableStream)

Detect the file type of a readable stream.

Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `FileType.fromFile()`.

*Note:* This method is only available using Node.js.

#### readableStream

Type: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

The input stream.

### FileType.extensions

Returns a set of supported file extensions.

### FileType.mimeTypes

Returns a set of supported MIME types.

## Supported file types

- [`jpg`](https://en.wikipedia.org/wiki/JPEG)
- [`png`](https://en.wikipedia.org/wiki/Portable_Network_Graphics)
- [`apng`](https://en.wikipedia.org/wiki/APNG) - Animated Portable Network Graphics
- [`gif`](https://en.wikipedia.org/wiki/GIF)
- [`webp`](https://en.wikipedia.org/wiki/WebP)
- [`flif`](https://en.wikipedia.org/wiki/Free_Lossless_Image_Format)
- [`cr2`](https://fileinfo.com/extension/cr2) - Canon Raw image file (v2)
- [`cr3`](https://fileinfo.com/extension/cr3) - Canon Raw image file (v3)
- [`orf`](https://en.wikipedia.org/wiki/ORF_format) - Olympus Raw image file
- [`arw`](https://en.wikipedia.org/wiki/Raw_image_format#ARW) - Sony Alpha Raw image file
- [`dng`](https://en.wikipedia.org/wiki/Digital_Negative) - Adobe Digital Negative image file
- [`nef`](https://www.nikonusa.com/en/learn-and-explore/a/products-and-innovation/nikon-electronic-format-nef.html) - Nikon Electronic Format image file
- [`rw2`](https://en.wikipedia.org/wiki/Raw_image_format) - Panasonic RAW image file
- [`raf`](https://en.wikipedia.org/wiki/Raw_image_format) - Fujifilm RAW image file
- [`tif`](https://en.wikipedia.org/wiki/Tagged_Image_File_Format)
- [`bmp`](https://en.wikipedia.org/wiki/BMP_file_format)
- [`icns`](https://en.wikipedia.org/wiki/Apple_Icon_Image_format)
- [`jxr`](https://en.wikipedia.org/wiki/JPEG_XR)
- [`psd`](https://en.wikipedia.org/wiki/Adobe_Photoshop#File_format)
- [`indd`](https://en.wikipedia.org/wiki/Adobe_InDesign#File_format)
- [`zip`](https://en.wikipedia.org/wiki/Zip_(file_format))
- [`tar`](https://en.wikipedia.org/wiki/Tar_(computing)#File_format)
- [`rar`](https://en.wikipedia.org/wiki/RAR_(file_format))
- [`gz`](https://en.wikipedia.org/wiki/Gzip)
- [`bz2`](https://en.wikipedia.org/wiki/Bzip2)
- [`7z`](https://en.wikipedia.org/wiki/7z)
- [`dmg`](https://en.wikipedia.org/wiki/Apple_Disk_Image)
- [`mp4`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions)
- [`mid`](https://en.wikipedia.org/wiki/MIDI)
- [`mkv`](https://en.wikipedia.org/wiki/Matroska)
- [`webm`](https://en.wikipedia.org/wiki/WebM)
- [`mov`](https://en.wikipedia.org/wiki/QuickTime_File_Format)
- [`avi`](https://en.wikipedia.org/wiki/Audio_Video_Interleave)
- [`mpg`](https://en.wikipedia.org/wiki/MPEG-1)
- [`mp1`](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_I) - MPEG-1 Audio Layer I
- [`mp2`](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II)
- [`mp3`](https://en.wikipedia.org/wiki/MP3)
- [`ogg`](https://en.wikipedia.org/wiki/Ogg)
- [`ogv`](https://en.wikipedia.org/wiki/Ogg)
- [`ogm`](https://en.wikipedia.org/wiki/Ogg)
- [`oga`](https://en.wikipedia.org/wiki/Ogg)
- [`spx`](https://en.wikipedia.org/wiki/Ogg)
- [`ogx`](https://en.wikipedia.org/wiki/Ogg)
- [`opus`](https://en.wikipedia.org/wiki/Opus_(audio_format))
- [`flac`](https://en.wikipedia.org/wiki/FLAC)
- [`wav`](https://en.wikipedia.org/wiki/WAV)
- [`qcp`](https://en.wikipedia.org/wiki/QCP)
- [`amr`](https://en.wikipedia.org/wiki/Adaptive_Multi-Rate_audio_codec)
- [`pdf`](https://en.wikipedia.org/wiki/Portable_Document_Format)
- [`epub`](https://en.wikipedia.org/wiki/EPUB)
- [`mobi`](https://en.wikipedia.org/wiki/Mobipocket) - Mobipocket
- [`exe`](https://en.wikipedia.org/wiki/.exe)
- [`swf`](https://en.wikipedia.org/wiki/SWF)
- [`rtf`](https://en.wikipedia.org/wiki/Rich_Text_Format)
- [`woff`](https://en.wikipedia.org/wiki/Web_Open_Font_Format)
- [`woff2`](https://en.wikipedia.org/wiki/Web_Open_Font_Format)
- [`eot`](https://en.wikipedia.org/wiki/Embedded_OpenType)
- [`ttf`](https://en.wikipedia.org/wiki/TrueType)
- [`otf`](https://en.wikipedia.org/wiki/OpenType)
- [`ico`](https://en.wikipedia.org/wiki/ICO_(file_format))
- [`flv`](https://en.wikipedia.org/wiki/Flash_Video)
- [`ps`](https://en.wikipedia.org/wiki/Postscript)
- [`xz`](https://en.wikipedia.org/wiki/Xz)
- [`sqlite`](https://www.sqlite.org/fileformat2.html)
- [`nes`](https://fileinfo.com/extension/nes)
- [`crx`](https://developer.chrome.com/extensions/crx)
- [`xpi`](https://en.wikipedia.org/wiki/XPInstall)
- [`cab`](https://en.wikipedia.org/wiki/Cabinet_(file_format))
- [`deb`](https://en.wikipedia.org/wiki/Deb_(file_format))
- [`ar`](https://en.wikipedia.org/wiki/Ar_(Unix))
- [`rpm`](https://fileinfo.com/extension/rpm)
- [`Z`](https://fileinfo.com/extension/z)
- [`lz`](https://en.wikipedia.org/wiki/Lzip)
- [`cfb`](https://en.wikipedia.org/wiki/Compound_File_Binary_Format)
- [`mxf`](https://en.wikipedia.org/wiki/Material_Exchange_Format)
- [`mts`](https://en.wikipedia.org/wiki/.m2ts)
- [`wasm`](https://en.wikipedia.org/wiki/WebAssembly)
- [`blend`](https://wiki.blender.org/index.php/Dev:Source/Architecture/File_Format)
- [`bpg`](https://bellard.org/bpg/)
- [`docx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`pptx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`xlsx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`jp2`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpm`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpx`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`mj2`](https://en.wikipedia.org/wiki/Motion_JPEG_2000) - Motion JPEG 2000
- [`aif`](https://en.wikipedia.org/wiki/Audio_Interchange_File_Format)
- [`odt`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for word processing
- [`ods`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for spreadsheets
- [`odp`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for presentations
- [`xml`](https://en.wikipedia.org/wiki/XML)
- [`heic`](https://nokiatech.github.io/heif/technical.html)
- [`cur`](https://en.wikipedia.org/wiki/ICO_(file_format))
- [`ktx`](https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/)
- [`ape`](https://en.wikipedia.org/wiki/Monkey%27s_Audio) - Monkey's Audio
- [`wv`](https://en.wikipedia.org/wiki/WavPack) - WavPack
- [`asf`](https://en.wikipedia.org/wiki/Advanced_Systems_Format) - Advanced Systems Format
- [`wma`](https://en.wikipedia.org/wiki/Windows_Media_Audio) - Windows Media Audio
- [`wmv`](https://en.wikipedia.org/wiki/Windows_Media_Video) - Windows Media Video
- [`dcm`](https://en.wikipedia.org/wiki/DICOM#Data_format) - DICOM Image File
- [`mpc`](https://en.wikipedia.org/wiki/Musepack) - Musepack (SV7 & SV8)
- [`ics`](https://en.wikipedia.org/wiki/ICalendar#Data_format) - iCalendar
- [`glb`](https://github.com/KhronosGroup/glTF) - GL Transmission Format
- [`pcap`](https://wiki.wireshark.org/Development/LibpcapFileFormat) - Libpcap File Format
- [`dsf`](https://dsd-guide.com/sites/default/files/white-papers/DSFFileFormatSpec_E.pdf) - Sony DSD Stream File (DSF)
- [`lnk`](https://en.wikipedia.org/wiki/Shortcut_%28computing%29#Microsoft_Windows) - Microsoft Windows file shortcut
- [`alias`](https://en.wikipedia.org/wiki/Alias_%28Mac_OS%29) - macOS Alias file
- [`voc`](https://wiki.multimedia.cx/index.php/Creative_Voice) - Creative Voice File
- [`ac3`](https://www.atsc.org/standard/a522012-digital-audio-compression-ac-3-e-ac-3-standard-12172012/) - ATSC A/52 Audio File
- [`3gp`](https://en.wikipedia.org/wiki/3GP_and_3G2#3GP) - Multimedia container format defined by the Third Generation Partnership Project (3GPP) for 3G UMTS multimedia services
- [`3g2`](https://en.wikipedia.org/wiki/3GP_and_3G2#3G2) - Multimedia container format defined by the 3GPP2 for 3G CDMA2000 multimedia services
- [`m4v`](https://en.wikipedia.org/wiki/M4V) -  MPEG-4 Visual bitstreams
- [`m4p`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions) - MPEG-4 files with audio streams encrypted by FairPlay Digital Rights Management as were sold through the iTunes Store
- [`m4a`](https://en.wikipedia.org/wiki/M4A) - Audio-only MPEG-4 files
- [`m4b`](https://en.wikipedia.org/wiki/M4B) - Audiobook and podcast MPEG-4 files, which also contain metadata including chapter markers, images, and hyperlinks
- [`f4v`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format used by Adobe Flash Player
- [`f4p`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format protected by Adobe Access DRM used by Adobe Flash Player
- [`f4a`](https://en.wikipedia.org/wiki/Flash_Video) - Audio-only ISO base media file format used by Adobe Flash Player
- [`f4b`](https://en.wikipedia.org/wiki/Flash_Video) - Audiobook and podcast ISO base media file format used by Adobe Flash Player
- [`mie`](https://en.wikipedia.org/wiki/Sidecar_file) - Dedicated meta information format which supports storage of binary as well as textual meta information
- [`shp`](https://en.wikipedia.org/wiki/Shapefile) - Geospatial vector data format
- [`arrow`](https://arrow.apache.org) - Columnar format for tables of data
- [`aac`](https://en.wikipedia.org/wiki/Advanced_Audio_Coding) - Advanced Audio Coding
- [`it`](https://wiki.openmpt.org/Manual:_Module_formats#The_Impulse_Tracker_format_.28.it.29) - Audio module format: Impulse Tracker
- [`s3m`](https://wiki.openmpt.org/Manual:_Module_formats#The_ScreamTracker_3_format_.28.s3m.29) - Audio module format: ScreamTracker 3
- [`xm`](https://wiki.openmpt.org/Manual:_Module_formats#The_FastTracker_2_format_.28.xm.29) - Audio module format: FastTracker 2
- [`ai`](https://en.wikipedia.org/wiki/Adobe_Illustrator_Artwork) - Adobe Illustrator Artwork
- [`skp`](https://en.wikipedia.org/wiki/SketchUp) - SketchUp
- [`avif`](https://en.wikipedia.org/wiki/AV1#AV1_Image_File_Format_(AVIF)) - AV1 Image File Format
- [`eps`](https://en.wikipedia.org/wiki/Encapsulated_PostScript) - Encapsulated PostScript
- [`lzh`](https://en.wikipedia.org/wiki/LHA_(file_format)) - LZH archive
- [`pgp`](https://en.wikipedia.org/wiki/Pretty_Good_Privacy) - Pretty Good Privacy
- [`asar`](https://github.com/electron/asar#format) - Archive format primarily used to enclose Electron applications

*Pull requests are welcome for additional commonly used file types.*

The following file types will not be accepted:
- [MS-CFB: Microsoft Compound File Binary File Format based formats](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/53989ce4-7b05-4f8d-829b-d08d6148375b), too old and difficult to parse:
	- `.doc` - Microsoft Word 97-2003 Document 
	- `.xls` - Microsoft Excel 97-2003 Document 
	- `.ppt` - Microsoft PowerPoint97-2003 Document
	- `.msi` - Microsoft Windows Installer
- `.csv` - [Reason.](https://github.com/sindresorhus/file-type/issues/264#issuecomment-568439196)
- `.svg` - Detecting it requires a full-blown parser. Check out [`is-svg`](https://github.com/sindresorhus/is-svg) for something that mostly works.

## file-type for enterprise

Available as part of the Tidelift Subscription.

The maintainers of file-type and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-file-type?utm_source=npm-file-type&utm_medium=referral&utm_campaign=enterprise&utm_term=repo)

## Related

- [file-type-cli](https://github.com/sindresorhus/file-type-cli) - CLI for this module

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Mikael Finstad](https://github.com/mifi)
- [Ben Brook](https://github.com/bencmbrook)
- [Borewit](https://github.com/Borewit)
