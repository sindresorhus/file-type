# file-type [![Build Status](https://travis-ci.org/sindresorhus/file-type.svg?branch=master)](https://travis-ci.org/sindresorhus/file-type)

> Detect the file type of a Buffer/Uint8Array/ArrayBuffer

The file type is detected by checking the [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)#Magic_numbers_in_files) of the buffer.


## Install

```
$ npm install file-type
```


## Usage

##### Node.js

```js
const readChunk = require('read-chunk');
const fileType = require('file-type');

const buffer = readChunk.sync('unicorn.png', 0, fileType.minimumBytes);

fileType(buffer);
//=> {ext: 'png', mime: 'image/png'}
```

Or from a remote location:

```js
const http = require('http');
const fileType = require('file-type');

const url = 'https://assets-cdn.github.com/images/spinners/octocat-spinner-32.gif';

http.get(url, response => {
	response.on('readable', () => {
		const chunk = response.read(fileType.minimumBytes);
		response.destroy();

		console.log(fileType(chunk));
		//=> {ext: 'gif', mime: 'image/gif'}
	});
});
```

Or from a stream:

```js
const stream = require('stream');
const fs = require('fs');
const crypto = require('crypto');
const fileType = require('file-type');

(async () => {
	const read = fs.createReadStream('encrypted.enc');
	const decipher = crypto.createDecipheriv(alg, key, iv);

	const stream = await fileType.stream(stream.pipeline(read, decipher));

	console.log(stream.fileType);
	//=> {ext: 'mov', mime: 'video/quicktime'}

	const write = fs.createWriteStream(`decrypted.${stream.fileType.ext}`);
	stream.pipe(write);
})();
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

### fileType(input)

Returns an `object` with:

- `ext` - One of the [supported file types](#supported-file-types)
- `mime` - The [MIME type](https://en.wikipedia.org/wiki/Internet_media_type)

Or `undefined` when there is no match.

#### input

Type: `Buffer | Uint8Array | ArrayBuffer`

It only needs the first `.minimumBytes` bytes. The exception is detection of `docx`, `pptx`, and `xlsx` which potentially requires reading the whole file.

### fileType.minimumBytes

Type: `number`

The minimum amount of bytes needed to detect a file type. Currently, it's 4100 bytes, but it can change, so don't hardcode it.

### fileType.stream(readableStream)

Detect the file type of a readable stream.

Returns a `Promise` which resolves to the original readable stream argument, but with an added `fileType` property, which is an object like the one returned from `fileType()`.

*Note:* This method is only for Node.js.

#### readableStream

Type: [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable)

### fileType.extensions

Returns a set of supported file extensions.

### fileType.mimeTypes

Returns a set of supported MIME types.


## Supported file types

- [`3g2`](https://en.wikipedia.org/wiki/3GP_and_3G2#3G2) - Multimedia container format defined by the 3GPP2 for 3G CDMA2000 multimedia services
- [`3gp`](https://en.wikipedia.org/wiki/3GP_and_3G2#3GP) - Multimedia container format defined by the Third Generation Partnership Project (3GPP) for 3G UMTS multimedia services
- [`7z`](https://en.wikipedia.org/wiki/7z)
- [`ac3`](https://www.atsc.org/standard/a522012-digital-audio-compression-ac-3-e-ac-3-standard-12172012/) - ATSC A/52 Audio File
- [`aif`](https://en.wikipedia.org/wiki/Audio_Interchange_File_Format)
- [`alias`](https://en.wikipedia.org/wiki/Alias_%28Mac_OS%29) - macOS Alias file
- [`amr`](https://en.wikipedia.org/wiki/Adaptive_Multi-Rate_audio_codec)
- [`ape`](https://en.wikipedia.org/wiki/Monkey%27s_Audio) - Monkey's Audio
- [`apng`](https://en.wikipedia.org/wiki/APNG) - Animated Portable Network Graphics
- [`ar`](https://en.wikipedia.org/wiki/Ar_(Unix))
- [`arw`](https://en.wikipedia.org/wiki/Raw_image_format#ARW) - Sony Alpha Raw image file
- [`asf`](https://en.wikipedia.org/wiki/Advanced_Systems_Format) - Advanced Systems Format
- [`avi`](https://en.wikipedia.org/wiki/Audio_Video_Interleave)
- [`blend`](https://wiki.blender.org/index.php/Dev:Source/Architecture/File_Format)
- [`bmp`](https://en.wikipedia.org/wiki/BMP_file_format)
- [`bpg`](https://bellard.org/bpg/)
- [`bz2`](https://en.wikipedia.org/wiki/Bzip2)
- [`cab`](https://en.wikipedia.org/wiki/Cabinet_(file_format))
- [`cr2`](https://fileinfo.com/extension/cr2) - Canon Raw image file (v2)
- [`crx`](https://developer.chrome.com/extensions/crx)
- [`cur`](https://en.wikipedia.org/wiki/ICO_(file_format))
- [`dcm`](https://en.wikipedia.org/wiki/DICOM#Data_format) - DICOM Image File
- [`deb`](https://en.wikipedia.org/wiki/Deb_(file_format))
- [`dmg`](https://en.wikipedia.org/wiki/Apple_Disk_Image)
- [`dng`](https://en.wikipedia.org/wiki/Digital_Negative) - Adobe Digital Negative image file
- [`docx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`dsf`](https://dsd-guide.com/sites/default/files/white-papers/DSFFileFormatSpec_E.pdf) - Sony DSD Stream File (DSF)
- [`eot`](https://en.wikipedia.org/wiki/Embedded_OpenType)
- [`epub`](https://en.wikipedia.org/wiki/EPUB)
- [`exe`](https://en.wikipedia.org/wiki/.exe)
- [`f4a`](https://en.wikipedia.org/wiki/Flash_Video) - Audio-only ISO base media file format used by Adobe Flash Player
- [`f4b`](https://en.wikipedia.org/wiki/Flash_Video) - Audiobook and podcast ISO base media file format used by Adobe Flash Player
- [`f4p`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format protected by Adobe Access DRM used by Adobe Flash Player
- [`f4v`](https://en.wikipedia.org/wiki/Flash_Video) - ISO base media file format used by Adobe Flash Player
- [`flac`](https://en.wikipedia.org/wiki/FLAC)
- [`flif`](https://en.wikipedia.org/wiki/Free_Lossless_Image_Format)
- [`flv`](https://en.wikipedia.org/wiki/Flash_Video)
- [`gif`](https://en.wikipedia.org/wiki/GIF)
- [`glb`](https://github.com/KhronosGroup/glTF) - GL Transmission Format
- [`gz`](https://en.wikipedia.org/wiki/Gzip)
- [`heic`](https://nokiatech.github.io/heif/technical.html)
- [`ico`](https://en.wikipedia.org/wiki/ICO_(file_format))
- [`ics`](https://en.wikipedia.org/wiki/ICalendar#Data_format) - iCalendar
- [`jp2`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpg`](https://en.wikipedia.org/wiki/JPEG)
- [`jpm`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jpx`](https://en.wikipedia.org/wiki/JPEG_2000) - JPEG 2000
- [`jxr`](https://en.wikipedia.org/wiki/JPEG_XR)
- [`ktx`](https://www.khronos.org/opengles/sdk/tools/KTX/file_format_spec/)
- [`lnk`](https://en.wikipedia.org/wiki/Shortcut_%28computing%29#Microsoft_Windows) - Microsoft Windows file shortcut
- [`lz`](https://en.wikipedia.org/wiki/Lzip)
- [`m4a`](https://en.wikipedia.org/wiki/M4A) - Audio-only MPEG-4 files
- [`m4a`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#.MP4_versus_.M4A)
- [`m4b`](https://en.wikipedia.org/wiki/M4B) - Audiobook and podcast MPEG-4 files, which also contain metadata including chapter markers, images, and hyperlinks
- [`m4p`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions) - MPEG-4 files with audio streams encrypted by FairPlay Digital Rights Management as were sold through the iTunes Store
- [`m4v`](https://en.wikipedia.org/wiki/M4V) -  MPEG-4 Visual bitstreams
- [`mid`](https://en.wikipedia.org/wiki/MIDI)
- [`mj2`](https://en.wikipedia.org/wiki/Motion_JPEG_2000) - Motion JPEG 2000
- [`mkv`](https://en.wikipedia.org/wiki/Matroska)
- [`mobi`](https://en.wikipedia.org/wiki/Mobipocket) - Mobipocket
- [`mov`](https://en.wikipedia.org/wiki/QuickTime_File_Format)
- [`mp2`](https://en.wikipedia.org/wiki/MPEG-1_Audio_Layer_II)
- [`mp3`](https://en.wikipedia.org/wiki/MP3)
- [`mp4`](https://en.wikipedia.org/wiki/MPEG-4_Part_14#Filename_extensions)
- [`mpc`](https://en.wikipedia.org/wiki/Musepack) - Musepack (SV7 & SV8)
- [`mpg`](https://en.wikipedia.org/wiki/MPEG-1)
- [`msi`](https://en.wikipedia.org/wiki/Windows_Installer)
- [`mts`](https://en.wikipedia.org/wiki/.m2ts)
- [`mxf`](https://en.wikipedia.org/wiki/Material_Exchange_Format)
- [`nef`](https://www.nikonusa.com/en/learn-and-explore/a/products-and-innovation/nikon-electronic-format-nef.html) - Nikon Electronic Format image file
- [`nes`](https://fileinfo.com/extension/nes)
- [`odp`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for presentations
- [`ods`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for spreadsheets
- [`odt`](https://en.wikipedia.org/wiki/OpenDocument) - OpenDocument for word processing
- [`ogg`](https://en.wikipedia.org/wiki/Ogg)
- [`opus`](https://en.wikipedia.org/wiki/Opus_(audio_format))
- [`orf`](https://en.wikipedia.org/wiki/ORF_format) - Olympus Raw image file
- [`otf`](https://en.wikipedia.org/wiki/OpenType)
- [`pcap`](https://wiki.wireshark.org/Development/LibpcapFileFormat) - Libpcap File Format
- [`pdf`](https://en.wikipedia.org/wiki/Portable_Document_Format)
- [`png`](https://en.wikipedia.org/wiki/Portable_Network_Graphics)
- [`pptx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`ps`](https://en.wikipedia.org/wiki/Postscript)
- [`psd`](https://en.wikipedia.org/wiki/Adobe_Photoshop#File_format)
- [`qcp`](https://en.wikipedia.org/wiki/QCP)
- [`raf`](https://en.wikipedia.org/wiki/Raw_image_format) - Fujifilm RAW image file
- [`rar`](https://en.wikipedia.org/wiki/RAR_(file_format))
- [`rpm`](https://fileinfo.com/extension/rpm)
- [`rtf`](https://en.wikipedia.org/wiki/Rich_Text_Format)
- [`rw2`](https://en.wikipedia.org/wiki/Raw_image_format) - Panasonic RAW image file
- [`sqlite`](https://www.sqlite.org/fileformat2.html)
- [`swf`](https://en.wikipedia.org/wiki/SWF)
- [`tar`](https://en.wikipedia.org/wiki/Tar_(computing)#File_format)
- [`tif`](https://en.wikipedia.org/wiki/Tagged_Image_File_Format)
- [`ttf`](https://en.wikipedia.org/wiki/TrueType)
- [`voc`](https://wiki.multimedia.cx/index.php/Creative_Voice) - Creative Voice File
- [`wasm`](https://en.wikipedia.org/wiki/WebAssembly)
- [`wav`](https://en.wikipedia.org/wiki/WAV)
- [`webm`](https://en.wikipedia.org/wiki/WebM)
- [`webp`](https://en.wikipedia.org/wiki/WebP)
- [`wma`](https://en.wikipedia.org/wiki/Windows_Media_Audio) - Windows Media Audio
- [`wmv`](https://en.wikipedia.org/wiki/Windows_Media_Video)
- [`wmv`](https://en.wikipedia.org/wiki/Windows_Media_Video) - Windows Media Video
- [`woff`](https://en.wikipedia.org/wiki/Web_Open_Font_Format)
- [`woff2`](https://en.wikipedia.org/wiki/Web_Open_Font_Format)
- [`wv`](https://en.wikipedia.org/wiki/WavPack) - WavPack
- [`xlsx`](https://en.wikipedia.org/wiki/Office_Open_XML)
- [`xml`](https://en.wikipedia.org/wiki/XML)
- [`xpi`](https://en.wikipedia.org/wiki/XPInstall)
- [`xz`](https://en.wikipedia.org/wiki/Xz)
- [`z`](https://fileinfo.com/extension/z)
- [`zip`](https://en.wikipedia.org/wiki/Zip_(file_format))

*SVG isn't included as it requires the whole file to be read, but you can get it [here](https://github.com/sindresorhus/is-svg).*

*Pull requests are welcome for additional commonly used file types, except for `doc`, `xls`, `ppt`.*


## Related

- [file-type-cli](https://github.com/sindresorhus/file-type-cli) - CLI for this module


## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Mikael Finstad](https://github.com/mifi)


---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-file-type?utm_source=npm-file-type&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
