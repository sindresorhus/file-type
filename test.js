import process from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import stream from 'node:stream';
import test from 'ava';
import {readableNoopStream} from 'noop-stream';
import {Parser as ReadmeParser} from 'commonmark';
import * as strtok3 from 'strtok3/core';
import {areUint8ArraysEqual} from 'uint8array-extras';
import {getStreamAsArrayBuffer} from 'get-stream';
import {
	fileTypeFromBuffer,
	fileTypeFromStream as fileTypeNodeFromStream,
	fileTypeFromFile,
	fileTypeFromBlob,
	fileTypeStream,
	supportedExtensions,
	supportedMimeTypes,
	FileTypeParser,
} from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const missingTests = new Set([
	'mpc',
]);

const [nodeMajorVersion] = process.versions.node.split('.').map(Number);
const nodeVersionSupportingByteBlobStream = 20;

const types = [...supportedExtensions].filter(extension => !missingTests.has(extension));

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names = {
	aac: [
		'fixture-adts-mpeg2',
		'fixture-adts-mpeg4',
		'fixture-adts-mpeg4-2',
		'fixture-id3v2',
	],
	asar: [
		'fixture',
		'fixture2',
	],
	arw: [
		'fixture-sony-zv-e10',
	],
	cr3: [
		'fixture',
	],
	dng: [
		'fixture-Leica-M10',
	],
	drc: [
		'fixture-cube_pc',
	],
	epub: [
		'fixture',
		'fixture-crlf',
	],
	nef: [
		'fixture',
		'fixture2',
		'fixture3',
		'fixture4',
	],
	'3gp': [
		'fixture',
		'fixture2',
	],
	woff2: [
		'fixture',
		'fixture-otto',
	],
	woff: [
		'fixture',
		'fixture-otto',
	],
	eot: [
		'fixture',
		'fixture-0x20001',
	],
	mov: [
		'fixture',
		'fixture-mjpeg',
		'fixture-moov',
	],
	mp2: [
		'fixture',
		'fixture-mpa',
	],
	mp3: [
		'fixture',
		'fixture-mp2l3',
		'fixture-ffe3',
	],
	mp4: [
		'fixture-imovie',
		'fixture-isom',
		'fixture-isomv2',
		'fixture-mp4v2',
		'fixture-dash',
	],
	mts: [
		'fixture-raw',
		'fixture-bdav',
	],
	tif: [
		'fixture-big-endian',
		'fixture-little-endian',
		'fixture-bali',
	],
	gz: [
		'fixture.tar',
	],
	xz: [
		'fixture.tar',
	],
	lz: [
		'fixture.tar',
	],
	Z: [
		'fixture.tar',
	],
	zst: [
		'fixture.tar',
	],
	mkv: [
		'fixture',
		'fixture2',
	],
	mpg: [
		'fixture',
		'fixture2',
		'fixture.ps',
		'fixture.sub',
	],
	heic: [
		'fixture-mif1',
		'fixture-msf1',
		'fixture-heic',
	],
	ape: [
		'fixture-monkeysaudio',
	],
	mpc: [
		'fixture-sv7',
		'fixture-sv8',
	],
	pcap: [
		'fixture-big-endian',
		'fixture-little-endian',
	],
	png: [
		'fixture',
		'fixture-itxt',
	],
	tar: [
		'fixture',
		'fixture-v7',
		'fixture-spaces',
	],
	mie: [
		'fixture-big-endian',
		'fixture-little-endian',
	],
	m4a: [
		'fixture-babys-songbook.m4b', // Actually it's an `.m4b`
	],
	m4v: [
		'fixture',
		'fixture-2', // Previously named as `fixture.mp4`
	],
	flac: [
		'fixture',
		'fixture-id3v2', // FLAC prefixed with ID3v2 header
	],
	docx: [
		'fixture',
		'fixture2',
		'fixture-office365',
	],
	pptx: [
		'fixture',
		'fixture2',
		'fixture-office365',
	],
	xlsx: [
		'fixture',
		'fixture2',
		'fixture-office365',
	],
	ogx: [
		'fixture-unknown-ogg', // Manipulated fixture to unrecognized Ogg based file
	],
	avif: [
		'fixture-yuv420-8bit', // Multiple bit-depths and/or subsamplings
		'fixture-sequence',
	],
	eps: [
		'fixture',
		'fixture2',
	],
	cfb: [
		'fixture.msi',
		'fixture.xls',
		'fixture.doc',
		'fixture.ppt',
		'fixture-2.doc',
	],
	asf: [
		'fixture',
		'fixture.wma',
		'fixture.wmv',
	],
	ai: [
		'fixture-normal', // Normal AI
		'fixture-without-pdf-compatibility', // AI without the PDF compatibility (cannot be opened by PDF viewers I guess)
	],
	jxl: [
		'fixture', // Image data stored within JXL container
		'fixture2', // Bare image data with no container
	],
	pdf: [
		'fixture',
		'fixture-adobe-illustrator', // PDF saved from Adobe Illustrator, using the default "[Illustrator Default]" preset
		'fixture-smallest', // PDF saved from Adobe Illustrator, using the preset "smallest PDF"
		'fixture-fast-web', // PDF saved from Adobe Illustrator, using the default "[Illustrator Default"] preset, but enabling "Optimize for Fast Web View"
		'fixture-printed', // PDF printed from Adobe Illustrator, but with a PDF printer.
		'fixture-minimal', // PDF written to be as small as the spec allows
	],
	webm: [
		'fixture-null', // EBML DocType with trailing null character
	],
	xml: [
		'fixture',
		'fixture-utf8-bom', // UTF-8 with BOM
		'fixture-utf16-be-bom', // UTF-16 little endian encoded XML, with BOM
		'fixture-utf16-le-bom', // UTF-16 big endian encoded XML, with BOM
	],
	jls: [
		'fixture-normal',
		'fixture-hp1',
		'fixture-hp2',
		'fixture-hp3',
	],
	pst: [
		'fixture-sample',
	],
	dwg: [
		'fixture-line-weights',
	],
	j2c: [
		'fixture',
	],
	cpio: [
		'fixture-bin',
		'fixture-ascii',
	],
	vsdx: [
		'fixture-vsdx',
		'fixture-vstx',
	],
	vtt: [
		'fixture-vtt-linebreak',
		'fixture-vtt-space',
		'fixture-vtt-tab',
		'fixture-vtt-eof',
	],
	lz4: [
		'fixture',
	],
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives = {
	png: [
		'fixture-corrupt',
	],
};

// Known failing fixture
const failingFixture = new Set([
	'fixture-password-protected', // .xls, Excel / MS-OSHARED / Compound-File-Binary-Format
]);

async function checkBufferLike(t, type, bufferLike) {
	const {ext, mime} = await fileTypeFromBuffer(bufferLike) ?? {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
}

async function checkBlobLike(t, type, bufferLike) {
	const blob = new Blob([bufferLike]);
	const {ext, mime} = await fileTypeFromBlob(blob) ?? {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
}

async function checkFile(t, type, filePath) {
	const {ext, mime} = await fileTypeFromFile(filePath) ?? {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
}

async function testFromFile(t, extension, name) {
	const file = path.join(__dirname, 'fixture', `${(name ?? 'fixture')}.${extension}`);
	return checkFile(t, extension, file);
}

async function testFromBuffer(t, extension, name) {
	const fixtureName = `${(name ?? 'fixture')}.${extension}`;

	const file = path.join(__dirname, 'fixture', fixtureName);
	const chunk = fs.readFileSync(file);
	await checkBufferLike(t, extension, chunk);
	await checkBufferLike(t, extension, new Uint8Array(chunk));
	await checkBufferLike(t, extension, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
}

async function testFromBlob(t, extension, name) {
	const fixtureName = `${(name ?? 'fixture')}.${extension}`;

	const file = path.join(__dirname, 'fixture', fixtureName);
	const chunk = fs.readFileSync(file);
	await checkBlobLike(t, extension, chunk);
}

async function testFalsePositive(t, extension, name) {
	const file = path.join(__dirname, 'fixture', `${name}.${extension}`);

	await t.is(await fileTypeFromFile(file), undefined);

	const chunk = fs.readFileSync(file);
	t.is(await fileTypeFromBuffer(chunk), undefined);
	t.is(await fileTypeFromBuffer(new Uint8Array(chunk)), undefined);
	t.is(await fileTypeFromBuffer(chunk.buffer), undefined);
}

async function testFileNodeFromStream(t, extension, name) {
	const filename = `${(name ?? 'fixture')}.${extension}`;
	const file = path.join(__dirname, 'fixture', filename);
	const fileType = await fileTypeNodeFromStream(fs.createReadStream(file));

	t.truthy(fileType, `identify ${filename}`);
	t.is(fileType.ext, extension, 'fileType.ext');
	t.is(typeof fileType.mime, 'string', 'fileType.mime');
}

async function getStreamAsUint8Array(stream) {
	return new Uint8Array(await getStreamAsArrayBuffer(stream));
}

async function testStreamWithNodeStream(t, extension, name) {
	const fixtureName = `${(name ?? 'fixture')}.${extension}`;
	const file = path.join(__dirname, 'fixture', fixtureName);

	const readableStream = await fileTypeStream(fs.createReadStream(file));
	const fileStream = fs.createReadStream(file);

	const [bufferA, bufferB] = await Promise.all([getStreamAsUint8Array(readableStream), getStreamAsUint8Array(fileStream)]);

	t.true(areUint8ArraysEqual(bufferA, bufferB));
}

async function testStreamWithWebStream(t, extension, name) {
	const fixtureName = `${(name ?? 'fixture')}.${extension}`;
	const file = path.join(__dirname, 'fixture', fixtureName);
	// Read the file into a buffer
	const fileBuffer = await readFile(file);
	// Create a Blob from the buffer
	const blob = new Blob([fileBuffer]);
	const webStream = await fileTypeStream(blob.stream());
	t.false(webStream.locked);
	const webStreamResult = await getStreamAsUint8Array(webStream);
	t.false(webStream.locked, 'Ensure web-stream is released');
	t.true(areUint8ArraysEqual(fileBuffer, webStreamResult));
}

test('Test suite must be able to detect Node.js major version', t => {
	t.is(typeof nodeMajorVersion, 'number', 'Detected Node.js major version should be a number');
});

let i = 0;
for (const type of types) {
	if (Object.hasOwn(names, type)) {
		for (const name of names[type]) {
			const fixtureName = `${name}.${type}`;
			const _test = failingFixture.has(fixtureName) ? test.failing : test;

			_test(`${name}.${type} ${i++} .fileTypeFromFile() method - same fileType`, testFromFile, type, name);
			_test(`${name}.${type} ${i++} .fileTypeFromBuffer() method - same fileType`, testFromBuffer, type, name);
			if (nodeMajorVersion >= nodeVersionSupportingByteBlobStream) {
				// Blob requires to stream to BYOB ReadableStream, requiring Node.js ≥ 20
				_test(`${name}.${type} ${i++} .fileTypeFromBlob() method - same fileType`, testFromBlob, type, name);
				test(`${name}.${type} ${i++} .fileTypeStream() - identical Web Streams`, testStreamWithWebStream, type, name);
			}

			_test(`${name}.${type} ${i++} .fileTypeFromStream() Node.js method - same fileType`, testFileNodeFromStream, type, name);
			_test(`${name}.${type} ${i++} .fileTypeStream() - identical Node.js Readable streams`, testStreamWithNodeStream, type, name);
		}
	} else {
		const fixtureName = `fixture.${type}`;
		const _test = failingFixture.has(fixtureName) ? test.failing : test;

		_test(`${type} ${i++} .fileTypeFromFile()`, testFromFile, type);
		_test(`${type} ${i++} .fileTypeFromBuffer()`, testFromBuffer, type);
		_test(`${type} ${i++} .fileTypeFromStream() Node.js`, testFileNodeFromStream, type);
		test(`${type} ${i++} .fileTypeStream() - identical streams`, testStreamWithNodeStream, type);
	}

	if (Object.hasOwn(falsePositives, type)) {
		for (const falsePositiveFile of falsePositives[type]) {
			test(`false positive - ${type} ${i++}`, testFalsePositive, type, falsePositiveFile);
		}
	}
}

test('.fileTypeStream() method - empty stream', async t => {
	const newStream = await fileTypeStream(readableNoopStream());
	t.is(newStream.fileType, undefined);
});

test('.fileTypeStream() method - short stream', async t => {
	const bufferA = new Uint8Array([0, 1, 0, 1]);
	class MyStream extends stream.Readable {
		_read() {
			this.push(bufferA);
			this.push(null);
		}
	}

	// Test filetype detection
	const shortStream = new MyStream();
	const newStream = await fileTypeStream(shortStream);
	t.is(newStream.fileType, undefined);

	// Test usability of returned stream
	const bufferB = await getStreamAsUint8Array(newStream);
	t.deepEqual(bufferA, bufferB);
});

test('.fileTypeStream() method - no end-of-stream errors', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.ogm');
	const stream = await fileTypeStream(fs.createReadStream(file), {sampleSize: 30});
	t.is(stream.fileType, undefined);
});

test('.fileTypeStream() method - error event', async t => {
	const errorMessage = 'Fixture';

	const readableStream = new stream.Readable({
		read() {
			process.nextTick(() => {
				this.emit('error', new Error(errorMessage));
			});
		},
	});

	await t.throwsAsync(fileTypeStream(readableStream), {message: errorMessage});
});

test('.fileTypeStream() method - sampleSize option', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.ogm');
	let stream = await fileTypeStream(fs.createReadStream(file), {sampleSize: 30});
	t.is(typeof (stream.fileType), 'undefined', 'file-type cannot be determined with a sampleSize of 30');

	stream = await fileTypeStream(fs.createReadStream(file), {sampleSize: 4100});
	t.is(typeof (stream.fileType), 'object', 'file-type can be determined with a sampleSize of 4100');
	t.is(stream.fileType.mime, 'video/ogg');
});

test('.fileTypeFromStream() method - be able to abort operation', async t => {
	const bufferA = new Uint8Array([0, 1, 0, 1]);
	class MyStream extends stream.Readable {
		_read() {
			setTimeout(() => {
				this.push(bufferA);
				this.push(null);
			}, 500);
		}
	}

	const shortStream = new MyStream();
	const abortController = new AbortController();
	const parser = new FileTypeParser({signal: abortController.signal});
	const promiseFileType = parser.fromStream(shortStream);
	abortController.abort(); // Abort asynchronous operation: reading from shortStream
	const error = await t.throwsAsync(promiseFileType);
	t.is(error.message, 'Stream closed');
});

test('supportedExtensions.has', t => {
	t.true(supportedExtensions.has('jpg'));
	t.false(supportedExtensions.has('blah'));
});

test('supportedMimeTypes.has', t => {
	t.true(supportedMimeTypes.has('video/mpeg'));
	t.false(supportedMimeTypes.has('video/blah'));
});

test('validate the input argument type', async t => {
	await t.throwsAsync(fileTypeFromBuffer('x'), {
		message: /Expected the `input` argument to be of type `Uint8Array`/,
	});

	await t.notThrowsAsync(fileTypeFromBuffer(new Uint8Array()));

	await t.notThrowsAsync(fileTypeFromBuffer(new ArrayBuffer()));
});

test('validate the repo has all extensions and mimes in sync', t => {
	// File: core.js (base truth)
	function readIndexJS() {
		const core = fs.readFileSync('core.js', {encoding: 'utf8'});
		const extensionArray = core.match(/(?<=ext:\s')(.*)(?=',)/g);
		const mimeArray = core.match(/(?<=mime:\s')(.*)(?=')/g);
		const extensions = new Set(extensionArray);
		const mimes = new Set(mimeArray);

		return {
			exts: extensions,
			mimes,
		};
	}

	// File: package.json
	function readPackageJSON() {
		const packageJson = fs.readFileSync('package.json', {encoding: 'utf8'});
		const {keywords} = JSON.parse(packageJson);

		const allowedExtras = new Set([
			'mime',
			'file',
			'type',
			'magic',
			'archive',
			'image',
			'img',
			'pic',
			'picture',
			'flash',
			'photo',
			'video',
			'detect',
			'check',
			'is',
			'exif',
			'binary',
			'buffer',
			'uint8array',
			'webassembly',
		]);

		const extensionArray = keywords.filter(keyword => !allowedExtras.has(keyword));
		return extensionArray;
	}

	// File: readme.md
	function readReadmeMD() {
		const index = fs.readFileSync('readme.md', {encoding: 'utf8'});
		const extensionArray = index.match(/(?<=-\s\[`)(.*)(?=`)/g);
		return extensionArray;
	}

	// Helpers
	// Find extensions/mimes that are defined twice in a file
	function findDuplicates(input) {
		// TODO: Fix this.
		// eslint-disable-next-line unicorn/no-array-reduce
		return input.reduce((accumulator, element, index, array) => {
			if (array.indexOf(element) !== index && !accumulator.includes(element)) {
				accumulator.push(element);
			}

			return accumulator;
		}, []);
	}

	// Find extensions/mimes that are in another file but not in `core.js`
	function findExtras(array, set) {
		return array.filter(element => !set.has(element));
	}

	// Find extensions/mimes that are in `core.js` but missing from another file
	function findMissing(array, set) {
		const missing = [];
		const other = new Set(array);
		for (const elemenet of set) {
			if (!other.has(elemenet)) {
				missing.push(elemenet);
			}
		}

		return missing;
	}

	// Test runner
	function validate(found, baseTruth, fileName, extensionOrMime) {
		const duplicates = findDuplicates(found);
		const extras = findExtras(found, baseTruth);
		const missing = findMissing(found, baseTruth);
		t.is(duplicates.length, 0, `Found duplicate ${extensionOrMime}: ${duplicates} in ${fileName}.`);
		t.is(extras.length, 0, `Extra ${extensionOrMime}: ${extras} in ${fileName}.`);
		t.is(missing.length, 0, `Missing ${extensionOrMime}: ${missing} in ${fileName}.`);
	}

	// Get the base truth of extensions and mimes supported from core.js
	const {exts} = readIndexJS();

	// Validate all extensions
	const filesWithExtensions = {
		'supported.js': [...supportedExtensions],
		'package.json': readPackageJSON(),
		'readme.md': readReadmeMD(),
	};

	for (const fileName in filesWithExtensions) {
		if (filesWithExtensions[fileName]) {
			const foundExtensions = filesWithExtensions[fileName];
			validate(foundExtensions, exts, fileName, 'extensions');
		}
	}
});

class BufferedStream extends stream.Readable {
	constructor(buffer) {
		super();
		this.push(buffer);
		this.push(null);
	}

	_read() {}
}

test('odd file sizes', async t => {
	const oddFileSizes = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 255, 256, 257, 511, 512, 513];

	for (const size of oddFileSizes) {
		const buffer = new Uint8Array(size);
		await t.notThrowsAsync(fileTypeFromBuffer(buffer), `fromBuffer: File size: ${size} bytes`);
	}

	for (const size of oddFileSizes) {
		const buffer = new Uint8Array(size);
		const stream = new BufferedStream(buffer);
		await t.notThrowsAsync(fileTypeNodeFromStream(stream), `fromStream: File size: ${size} bytes`);
	}
});

test('supported files types are listed alphabetically', async t => {
	const readme = await fs.promises.readFile('readme.md', {encoding: 'utf8'});
	let currentNode = new ReadmeParser().parse(readme).firstChild;

	while (currentNode) {
		if (currentNode.type === 'heading' && currentNode.firstChild.literal === 'Supported file types') {
			// Header → List → First list item
			currentNode = currentNode.next.firstChild;
			break;
		}

		currentNode = currentNode.next;
	}

	let previousFileType;

	while (currentNode) {
		// List item → Paragraph → Link → Inline code → Text
		const currentFileType = currentNode.firstChild.firstChild.firstChild.literal;

		if (previousFileType) {
			t.true(currentFileType > previousFileType, `${currentFileType} should be listed before ${previousFileType}`);
		}

		previousFileType = currentFileType;
		currentNode = currentNode.next;
	}
});

test('corrupt MKV throws', async t => {
	const filePath = path.join(__dirname, 'fixture/fixture-corrupt.mkv');
	await t.throwsAsync(fileTypeFromFile(filePath), {message: /End-Of-Stream/});
});

// Create a custom detector for the just made up "unicorn" file type
const unicornDetector = {
	id: 'mock.unicorn',
	async detect(tokenizer) {
		const unicornHeader = [85, 78, 73, 67, 79, 82, 78]; // "UNICORN" as decimal string
		const buffer = new Uint8Array(7);
		await tokenizer.peekBuffer(buffer, {length: unicornHeader.length, mayBeLess: true});
		if (unicornHeader.every((value, index) => value === buffer[index])) {
			return {ext: 'unicorn', mime: 'application/unicorn'};
		}

		return undefined;
	},
};

const mockPngDetector = {
	id: 'mock.png',
	detect: () => ({ext: 'mockPng', mime: 'image/mockPng'}),
};

const tokenizerPositionChanger = {
	id: 'mock.dirtyTokenizer',
	detect(tokenizer) {
		const buffer = new Uint8Array(1);
		tokenizer.readBuffer(buffer, {length: 1, mayBeLess: true});
	},
};

if (nodeMajorVersion >= nodeVersionSupportingByteBlobStream) {
	// Blob requires to stream to BYOB ReadableStream, requiring Node.js ≥ 20

	test('fileTypeFromBlob should detect custom file type "unicorn" using custom detectors', async t => {
		// Set up the "unicorn" file content
		const header = 'UNICORN FILE\n';
		const blob = new Blob([header]);

		const customDetectors = [unicornDetector];
		const parser = new FileTypeParser({customDetectors});

		const result = await parser.fromBlob(blob);
		t.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
	});

	test('fileTypeFromBlob should keep detecting default file types when no custom detector matches', async t => {
		const file = path.join(__dirname, 'fixture', 'fixture.png');
		const chunk = fs.readFileSync(file);
		const blob = new Blob([chunk]);

		const customDetectors = [unicornDetector];
		const parser = new FileTypeParser({customDetectors});

		const result = await parser.fromBlob(blob);
		t.deepEqual(result, {ext: 'png', mime: 'image/png'});
	});

	test('fileTypeFromBlob should allow overriding default file type detectors', async t => {
		const file = path.join(__dirname, 'fixture', 'fixture.png');
		const chunk = fs.readFileSync(file);
		const blob = new Blob([chunk]);

		const customDetectors = [mockPngDetector];
		const parser = new FileTypeParser({customDetectors});

		const result = await parser.fromBlob(blob);
		t.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
	});
}

test('fileTypeFromBuffer should detect custom file type "unicorn" using custom detectors', async t => {
	const header = 'UNICORN FILE\n';
	const uint8ArrayContent = new TextEncoder().encode(header);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	t.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromBuffer should keep detecting default file types when no custom detector matches', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const uint8ArrayContent = fs.readFileSync(file);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	t.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromBuffer should allow overriding default file type detectors', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const uint8ArrayContent = fs.readFileSync(file);

	const customDetectors = [mockPngDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	t.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

class CustomReadableStream extends stream.Readable {
	_read(_size) {
		this.push('UNICORN');
	}
}
test('fileTypeFromStream should detect custom file type "unicorn" using custom detectors', async t => {
	const readableStream = new CustomReadableStream();

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	t.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromStream should keep detecting default file types when no custom detector matches', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const readableStream = fs.createReadStream(file);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	t.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromStream should allow overriding default file type detectors', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const readableStream = fs.createReadStream(file);

	const customDetectors = [mockPngDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	t.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('fileTypeFromFile should detect custom file type "unicorn" using custom detectors', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.unicorn');

	const customDetectors = [unicornDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	t.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromFile should keep detecting default file types when no custom detector matches', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');

	const customDetectors = [unicornDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	t.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromFile should allow overriding default file type detectors', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');

	const customDetectors = [mockPngDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	t.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('fileTypeFromTokenizer should return undefined when a custom detector changes the tokenizer position and does not return a file type', async t => {
	const header = 'UNICORN FILE\n';
	const uint8ArrayContent = new TextEncoder().encode(header);

	// Include the unicornDetector here to verify it's not used after the tokenizer.position changed
	const customDetectors = [tokenizerPositionChanger, unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromTokenizer(strtok3.fromBuffer(uint8ArrayContent));
	t.is(result, undefined);
});
