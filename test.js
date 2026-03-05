import process from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import stream from 'node:stream';
import {deflateRawSync, gzipSync} from 'node:zlib';
import test from 'ava';
import {readableNoopStream} from 'noop-stream';
import {Parser as ReadmeParser} from 'commonmark';
import * as strtok3 from 'strtok3/core';
import {areUint8ArraysEqual} from 'uint8array-extras';
import {getStreamAsArrayBuffer} from 'get-stream';
import {stringToBytes} from './util.js';
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
		'fixture',
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
		'fixture-pax',
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
	rm: [
		'fixture-realmedia-audio',
		'fixture-realmedia-video',
	],
	ppsx: [
		'fixture',
	],
	ppsm: [
		'fixture',
	],
	'tar.gz': [
		'fixture',
	],
	reg: [
		'fixture-win2000',
		'fixture-win95',
	],
	dat: [
		'fixture-unicode-tests',
	],
	zip: [
		'fixture',
		'fixture2',
	],
	macho: [
		'fixture-arm64',
		'fixture-x86_64',
		'fixture-i386',
		'fixture-ppc7400',
		'fixture-fat-binary',
	],
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives = {
	png: [
		'fixture-corrupt',
	],
	webp: [
		'fixture-json',
	],
};

// Known failing fixture
const failingFixture = new Set([
	'fixture-password-protected.xls', // Excel / MS-OSHARED / Compound-File-Binary-Format
]);

/**
 @returns {Array<Object>} An array of fixture objects.
 Each object contains the following properties:
 - `path` {string}: The full path to the fixture file.
 - `filename` {string}: The name of the fixture file.
 - `type` {string}: The type/extension of the fixture.
 */
function getFixtures() {
	const paths = [];
	for (const type of types) {
		if (Object.hasOwn(names, type)) {
			for (const suffix of names[type]) {
				const filename = `${(suffix ?? 'fixture')}.${type}`;
				paths.push({
					path: path.join(__dirname, 'fixture', filename),
					filename,
					type,
				});
			}
		} else {
			const filename = `fixture.${type}`;
			paths.push({
				path: path.join(__dirname, 'fixture', filename),
				filename,
				type,
			});
		}
	}

	return paths;
}

async function checkBufferLike(t, expectedExtension, bufferLike) {
	const {ext, mime} = await fileTypeFromBuffer(bufferLike) ?? {};
	t.is(ext, expectedExtension);
	t.is(typeof mime, 'string');
}

async function checkBlobLike(t, expectedExtension, bufferLike) {
	const blob = new Blob([bufferLike]);
	const {ext, mime} = await fileTypeFromBlob(blob) ?? {};
	t.is(ext, expectedExtension);
	t.is(typeof mime, 'string');
}

async function testFromFile(t, expectedExtension, filePath) {
	const {ext, mime} = await fileTypeFromFile(filePath) ?? {};
	t.is(ext, expectedExtension);
	t.is(typeof mime, 'string');
}

async function testFromBuffer(t, expectedExtension, path) {
	const chunk = fs.readFileSync(path);
	await checkBufferLike(t, expectedExtension, chunk);
	await checkBufferLike(t, expectedExtension, new Uint8Array(chunk));

	if (path.includes('fixture2.zip')) {
		await checkBufferLike(t, expectedExtension, chunk.buffer.slice(0, Math.floor(chunk.byteLength / 2)));
	}

	await checkBufferLike(t, expectedExtension, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
}

async function testFromBlob(t, expectedExtension, path) {
	const chunk = fs.readFileSync(path);
	await checkBlobLike(t, expectedExtension, chunk);
}

async function testFalsePositive(t, filePath) {
	await t.is(await fileTypeFromFile(filePath), undefined);

	const chunk = fs.readFileSync(filePath);
	t.is(await fileTypeFromBuffer(chunk), undefined);
	t.is(await fileTypeFromBuffer(new Uint8Array(chunk)), undefined);
	t.is(await fileTypeFromBuffer(chunk.buffer), undefined);
}

async function testFileNodeFromStream(t, expectedExtension, filePath, filename) {
	const fileType = await fileTypeNodeFromStream(fs.createReadStream(filePath));

	t.truthy(fileType, `identify ${filename}`);
	t.is(fileType.ext, expectedExtension, 'fileType.ext');
	t.is(typeof fileType.mime, 'string', 'fileType.mime');
}

async function getStreamAsUint8Array(stream) {
	return new Uint8Array(await getStreamAsArrayBuffer(stream));
}

async function testStreamWithNodeStream(t, expectedExtension, filePath) {
	const readableStream = await fileTypeStream(fs.createReadStream(filePath));
	try {
		const fileStream = fs.createReadStream(filePath);
		try {
			const [bufferA, bufferB] = await Promise.all([getStreamAsUint8Array(readableStream), getStreamAsUint8Array(fileStream)]);
			t.true(areUint8ArraysEqual(bufferA, bufferB));
		} finally {
			fileStream.destroy();
		}
	} finally {
		readableStream.destroy();
	}
}

async function testStreamWithWebStream(t, expectedExtension, path) {
	// Read the file into a buffer
	const fileBuffer = await readFile(path);
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
for (const fixture of getFixtures()) {
	const _test = failingFixture.has(fixture.filename) ? test.failing : test;

	_test(`${fixture.filename} ${i++} .fileTypeFromFile() method - same fileType`, testFromFile, fixture.type, fixture.path);
	_test(`${fixture.filename} ${i++} .fileTypeFromBuffer() method - same fileType`, testFromBuffer, fixture.type, fixture.path);
	_test(`${fixture.filename} ${i++} .fileTypeFromBlob() method - same fileType`, testFromBlob, fixture.type, fixture.path);
	if (nodeMajorVersion >= nodeVersionSupportingByteBlobStream) {
		test(`${fixture.filename} ${i++} .fileTypeStream() - identical Web Streams`, testStreamWithWebStream, fixture.type, fixture.path);
	}

	_test(`${fixture.filename} ${i++} .fileTypeFromStream() Node.js method - same fileType`, testFileNodeFromStream, fixture.type, fixture.path, fixture.filename);
	_test(`${fixture.filename} ${i++} .fileTypeStream() - identical Node.js Readable streams`, testStreamWithNodeStream, fixture.type, fixture.path);

	if (Object.hasOwn(falsePositives, fixture.filename)) {
		for (const falsePositiveFile of falsePositives[fixture.filename]) {
			test(`false positive - ${fixture.filename} ${i++}`, testFalsePositive, fixture.filename, falsePositiveFile);
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

test('.fileTypeStream() preserves large caller-provided sampleSize values', async t => {
	const id3HeaderLength = 2 * 1024 * 1024;
	const id3Header = Uint8Array.from([
		0x49,
		0x44,
		0x33,
		0x04,
		0x00,
		0x00,
		...toSyncSafeInteger(id3HeaderLength),
	]);
	const mpegFrame = Uint8Array.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
	const payload = Buffer.concat([Buffer.from(id3Header), Buffer.alloc(id3HeaderLength), Buffer.from(mpegFrame)]);
	const sampleSize = payload.length;

	let detectionStream = await fileTypeStream(new BufferedStream(payload, 64 * 1024), {sampleSize});
	t.deepEqual(detectionStream.fileType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});

	detectionStream = await fileTypeStream(new Blob([payload]).stream(), {sampleSize});
	t.deepEqual(detectionStream.fileType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
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
	t.true(error instanceof strtok3.AbortError, 'Expect error te be an instanceof AbortError');
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
	function validate(found, baseTruth, filename, extensionOrMime) {
		const duplicates = findDuplicates(found);
		const extras = findExtras(found, baseTruth);
		const missing = findMissing(found, baseTruth);
		t.is(duplicates.length, 0, `Found duplicate ${extensionOrMime}: ${duplicates} in ${filename}.`);
		t.is(extras.length, 0, `Extra ${extensionOrMime}: ${extras} in ${filename}.`);
		t.is(missing.length, 0, `Missing ${extensionOrMime}: ${missing} in ${filename}.`);
	}

	// Get the base truth of extensions and mimes supported from core.js
	const {exts} = readIndexJS();

	// Validate all extensions
	const filesWithExtensions = {
		'supported.js': [...supportedExtensions],
		'package.json': readPackageJSON(),
		'readme.md': readReadmeMD(),
	};

	for (const filename in filesWithExtensions) {
		if (filesWithExtensions[filename]) {
			const foundExtensions = filesWithExtensions[filename];
			validate(foundExtensions, exts, filename, 'extensions');
		}
	}
});

class BufferedStream extends stream.Readable {
	constructor(buffer, chunkSize = buffer.length) {
		super();
		for (let offset = 0; offset < buffer.length; offset += chunkSize) {
			this.push(buffer.subarray(offset, offset + chunkSize));
		}

		this.push(null);
	}

	_read() {}
}

class PatternChunkStream extends stream.Readable {
	constructor(buffer, chunkPattern) {
		super();
		this.buffer = buffer;
		this.chunkPattern = chunkPattern;
		this.offset = 0;
		this.patternIndex = 0;
		this.emittedBytes = 0;
	}

	_read() {
		if (this.offset >= this.buffer.length) {
			this.push(null);
			return;
		}

		const chunkSize = this.chunkPattern[this.patternIndex % this.chunkPattern.length];
		this.patternIndex++;
		const chunk = this.buffer.subarray(this.offset, this.offset + chunkSize);
		this.offset += chunk.length;
		this.emittedBytes += chunk.length;
		this.push(chunk);
	}
}

const hostileChunkPatterns = [
	[1],
	[2],
	[3],
	[5],
	[8],
	[13],
	[1, 2, 3, 5],
	[8, 1, 4, 2],
];

function createPatternWebStream(buffer, chunkPattern) {
	let offset = 0;
	let patternIndex = 0;
	const state = {
		emittedBytes: 0,
	};

	return {
		state,
		stream: new ReadableStream({
			pull(controller) {
				if (offset >= buffer.length) {
					controller.close();
					return;
				}

				const chunkSize = chunkPattern[patternIndex % chunkPattern.length];
				patternIndex++;
				const chunk = buffer.subarray(offset, offset + chunkSize);
				offset += chunk.length;
				state.emittedBytes += chunk.length;
				controller.enqueue(chunk);
			},
		}),
	};
}

async function assertUndefinedTypeFromBuffer(t, bytes) {
	const type = await fileTypeFromBuffer(bytes);
	t.is(type, undefined);
}

async function assertUndefinedTypeFromChunkedStream(t, bytes) {
	const type = await fileTypeNodeFromStream(new BufferedStream(bytes, 8));
	t.is(type, undefined);
}

async function assertUndefinedTypeFromHostileStreams(t, bytes, description) {
	for (const chunkPattern of hostileChunkPatterns) {
		const type = await fileTypeNodeFromStream(new PatternChunkStream(bytes, chunkPattern));
		t.is(type, undefined, `${description} with chunk pattern ${chunkPattern.join(',')}`);
	}
}

function assertZipFileType(t, type) {
	t.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
}

async function assertZipTypeFromBuffer(t, bytes) {
	const type = await fileTypeFromBuffer(bytes);
	assertZipFileType(t, type);
}

async function assertZipTypeFromChunkedStream(t, bytes) {
	const type = await fileTypeNodeFromStream(new BufferedStream(bytes, 8));
	assertZipFileType(t, type);
}

async function assertZipTypeFromBufferAndChunkedStream(t, bytes) {
	await assertZipTypeFromBuffer(t, bytes);
	await assertZipTypeFromChunkedStream(t, bytes);
}

function createZipLocalFile({
	filename,
	generalPurposeBitFlag = 0,
	compressedMethod = 0,
	compressedData = new Uint8Array(0),
	compressedSize = compressedData.length,
	uncompressedSize = compressedData.length,
}) {
	const filenameBytes = new TextEncoder().encode(filename);
	const header = new Uint8Array(30 + filenameBytes.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x04_03_4B_50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, generalPurposeBitFlag, true);
	view.setUint16(8, compressedMethod, true);
	view.setUint16(10, 0, true);
	view.setUint16(12, 0, true);
	view.setUint32(14, 0, true);
	view.setUint32(18, compressedSize, true);
	view.setUint32(22, uncompressedSize, true);
	view.setUint16(26, filenameBytes.length, true);
	view.setUint16(28, 0, true);
	header.set(filenameBytes, 30);

	return Buffer.concat([Buffer.from(header), Buffer.from(compressedData)]);
}

function toSyncSafeInteger(value) {
	return Uint8Array.from([
		(value >> 21) & 0x7F,
		(value >> 14) & 0x7F,
		(value >> 7) & 0x7F,
		value & 0x7F,
	]);
}

function createRepeatedId3Payload(repetitions, payloadSizeInBytes) {
	const header = new Uint8Array(10);
	header[0] = 0x49;
	header[1] = 0x44;
	header[2] = 0x33;
	header.set(toSyncSafeInteger(payloadSizeInBytes), 6);

	const segment = new Uint8Array(10 + payloadSizeInBytes);
	segment.set(header, 0);

	const output = new Uint8Array(segment.length * repetitions);
	for (let index = 0; index < repetitions; index++) {
		output.set(segment, index * segment.length);
	}

	return output;
}

function createOversizedZipMimetypeEntry() {
	// Force declared sizes to the 32-bit max to verify detection stays bounded even when metadata is attacker-controlled.
	return createZipLocalFile({
		filename: 'mimetype',
		compressedSize: 0xFF_FF_FF_FF,
		uncompressedSize: 0xFF_FF_FF_FF,
	});
}

function createAsfObject(id, payload = new Uint8Array(0)) {
	const object = new Uint8Array(24 + payload.length);
	const view = new DataView(object.buffer);
	object.set(id, 0);
	view.setBigUint64(16, BigInt(object.length), true);
	object.set(payload, 24);
	return object;
}

function createAsfHeader(objects) {
	const header = new Uint8Array(30);
	header.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9], 0);
	return Buffer.concat([Buffer.from(header), ...objects.map(object => Buffer.from(object))]);
}

function createPngChunk(type, data = new Uint8Array(0)) {
	const chunk = new Uint8Array(12 + data.length);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.length);
	chunk.set(new TextEncoder().encode(type), 4);
	chunk.set(data, 8);
	return chunk;
}

function createPngWithAncillaryChunks(ancillaryChunkCount) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	const chunks = [Buffer.from(createPngChunk('IHDR', ihdrData))];

	for (let index = 0; index < ancillaryChunkCount; index++) {
		chunks.push(Buffer.from(createPngChunk('tEXt')));
	}

	chunks.push(Buffer.from(createPngChunk('IDAT')));
	return Buffer.concat([Buffer.from(signature), ...chunks]);
}

function createLittleEndianTiffWithTagIds(tagIds) {
	const buffer = new Uint8Array(8 + 2 + (tagIds.length * 12) + 4);
	const view = new DataView(buffer.buffer);
	buffer.set([0x49, 0x49, 0x2A, 0x00], 0);
	view.setUint32(4, 8, true);
	view.setUint16(8, tagIds.length, true);

	let offset = 10;
	for (const tagId of tagIds) {
		view.setUint16(offset, tagId, true);
		offset += 12;
	}

	return buffer;
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

// TODO: Replace with `Set.symmetricDifference` when targeting Node.js 22.
function symmetricDifference(setA, setB) {
	const diff = new Set();
	for (const item of setA) {
		if (!setB.has(item)) {
			diff.add(item);
		}
	}

	for (const item of setB) {
		if (!setA.has(item)) {
			diff.add(item);
		}
	}

	return diff;
}

test('implemented MIME types and extensions match the list of supported ones', async t => {
	const mimeTypesWithoutUnitTest = [
		'application/vnd.ms-asf',
		'image/heic-sequence',
	];

	const implementedMimeTypes = new Set(mimeTypesWithoutUnitTest);
	const implementedExtensions = new Set();

	for (const {path} of getFixtures()) {
		const fileType = await fileTypeFromFile(path);
		if (fileType) {
			implementedMimeTypes.add(fileType.mime);
			implementedExtensions.add(fileType.ext);
		}
	}

	const differencesInMimeTypes = symmetricDifference(supportedMimeTypes, implementedMimeTypes);

	for (const difference of differencesInMimeTypes) {
		if (implementedMimeTypes.has(difference)) {
			t.fail(`MIME-type ${difference} is implemented, but not declared as a supported MIME-type`);
		} else {
			t.fail(`MIME-type ${difference} declared as a supported MIME-type, but not found as an implemented MIME-type`);
		}
	}

	t.is(differencesInMimeTypes.size, 0);

	const differencesInExtensions = symmetricDifference(supportedExtensions, implementedExtensions);
	for (const difference of differencesInExtensions) {
		if (implementedMimeTypes.has(difference)) {
			t.fail(`Extension ${difference} is implemented, but not declared as a supported extension`);
		} else {
			t.fail(`Extension ${difference} declared as a supported extension, but not found as an implemented extension`);
		}
	}

	t.is(differencesInExtensions.size, 0);
});

test('corrupt MKV returns undefined', async t => {
	const filePath = path.join(__dirname, 'fixture/fixture-corrupt.mkv');
	const type = await fileTypeFromFile(filePath);
	t.is(type, undefined);
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

test('fileTypeFromBuffer keeps detecting MP3 from a sampled prefix with ID3 data', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.mp3');
	const prefix = fs.readFileSync(file).subarray(0, 32);

	const result = await fileTypeFromBuffer(prefix);
	t.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'});
});

test('fileTypeFromBuffer keeps detecting PNG from a short valid prefix', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const prefix = fs.readFileSync(file).subarray(0, 16);

	const result = await fileTypeFromBuffer(prefix);
	t.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromBuffer falls back to generic ASF for a short valid prefix', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.asf');
	const prefix = fs.readFileSync(file).subarray(0, 64);

	const result = await fileTypeFromBuffer(prefix);
	t.deepEqual(result, {ext: 'asf', mime: 'application/vnd.ms-asf'});
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

test('fileTypeFromStream should return undefined on malformed object-mode stream input', async t => {
	// This payload deterministically triggered `RangeError: offset is out of bounds` before hardening.
	const malformedChunk = Buffer.from('969c0e7833211bc4d4db0530eab780406fe889490c1e212bb1e4948f39bc4b4b8d', 'hex');
	const readableStream = stream.Readable.from([malformedChunk.subarray(0, 16), malformedChunk.subarray(16)]);

	const result = await fileTypeNodeFromStream(readableStream);
	t.is(result, undefined);
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

test('should detect MPEG frame which is out of sync with the mpegOffsetTolerance option', async t => {
	const badOffset1Path = path.join(__dirname, 'fixture', 'fixture-bad-offset.mp3');
	const badOffset10Path = path.join(__dirname, 'fixture', 'fixture-bad-offset-10.mp3');

	let result = await fileTypeFromFile(badOffset1Path);
	t.is(result, undefined, 'does not detect an MP3 which 1 byte out-sync, with default value mpegOffsetTolerance=0');

	result = await fileTypeFromFile(badOffset1Path, {mpegOffsetTolerance: 1});
	t.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'}, 'detect an MP3 which 1 byte out of sync');

	result = await fileTypeFromFile(badOffset10Path);
	t.is(result, undefined, 'does not detect an MP3 which 10 bytes out of sync, with default value mpegOffsetTolerance=0');

	result = await fileTypeFromFile(badOffset10Path, {mpegOffsetTolerance: 10});
	t.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'}, 'detect an MP3 which 1 byte out of sync');
});

test('FileTypeParser clamps mpegOffsetTolerance to a safe value', t => {
	const parser = new FileTypeParser({mpegOffsetTolerance: Number.MAX_SAFE_INTEGER});
	t.is(parser.options.mpegOffsetTolerance, 4098);
});

function loopEncoding(t, stringValue, encoding) {
	t.deepEqual(new TextDecoder(encoding).decode(new Uint8Array(stringToBytes(stringValue, encoding))), stringValue, `Ensure consistency with TextDecoder with encoding ${encoding}`);
}

test('stringToBytes encodes correctly for selected characters and encodings', t => {
	// Default encoding: basic ASCII
	t.deepEqual(
		stringToBytes('ABC'),
		[65, 66, 67],
		'should encode ASCII correctly using default encoding',
	);

	// UTF-16LE with character above 0xFF
	t.deepEqual(
		stringToBytes('ꟻ', 'utf-16le'),
		[0xFB, 0xA7],
		'should encode U+A7FB correctly in utf-16le',
	);

	// UTF-16BE with character above 0xFF
	t.deepEqual(
		stringToBytes('ꟻ', 'utf-16be'),
		[0xA7, 0xFB],
		'should encode U+A7FB correctly in utf-16be',
	);

	// UTF-16LE with surrogate pair (🦄)
	t.deepEqual(
		stringToBytes('🦄', 'utf-16le'),
		[0x3E, 0xD8, 0x84, 0xDD],
		'should encode 🦄 (U+1F984) correctly in utf-16le',
	);

	// UTF-16BE with surrogate pair (🦄)
	t.deepEqual(
		stringToBytes('🦄', 'utf-16be'),
		[0xD8, 0x3E, 0xDD, 0x84],
		'should encode 🦄 (U+1F984) correctly in utf-16be',
	);

	loopEncoding(t, '🦄', 'utf-16le');
	loopEncoding(t, '🦄', 'utf-16be');

	t.is(new TextDecoder('utf-16be').decode(new Uint8Array(stringToBytes('🦄', 'utf-16be'))), '🦄', 'Decoded value should match original value');
});

test('Does not hang on crafted ASF file with zero-size sub-header', async t => {
	const buffer = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	await assertUndefinedTypeFromBuffer(t, buffer);
});

test('Does not throw on malformed ASF stream with zero-size sub-header', async t => {
	const buffer = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	await assertUndefinedTypeFromChunkedStream(t, buffer);
});

test('Does not throw on malformed ASF stream with oversized sub-header', async t => {
	const buffer = Buffer.alloc(80);
	buffer.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	buffer.fill(0xFF, 46, 54);
	await assertUndefinedTypeFromChunkedStream(t, buffer);
});

test('Malformed hardening corpus stays stable under hostile stream chunking', async t => {
	const malformedAsfZeroSize = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	const malformedAsfOversized = Buffer.alloc(80);
	malformedAsfOversized.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	malformedAsfOversized.fill(0xFF, 46, 54);
	const malformedId3 = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x7F, 0x7F, 0x7F, 0x7F]);
	const malformedPng = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x7F, 0xFF, 0xFF, 0xFF, 0x7A, 0x7A, 0x7A, 0x7A]);
	const malformedTiff = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	const malformedEbml = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x8A, 0x42, 0x83, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

	await assertUndefinedTypeFromHostileStreams(t, malformedAsfZeroSize, 'malformed ASF zero-size sub-header');
	await assertUndefinedTypeFromHostileStreams(t, malformedAsfOversized, 'malformed ASF oversized sub-header');
	await assertUndefinedTypeFromHostileStreams(t, malformedId3, 'malformed ID3 oversized header');
	await assertUndefinedTypeFromHostileStreams(t, malformedPng, 'malformed PNG oversized chunk');
	await assertUndefinedTypeFromHostileStreams(t, malformedTiff, 'malformed TIFF oversized offset');
	await assertUndefinedTypeFromHostileStreams(t, malformedEbml, 'malformed EBML oversized child');
});

test('Scans known-size ASF buffers beyond the stream safety window', async t => {
	const metadataObject = createAsfObject(
		Uint8Array.from([0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11, 0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		new Uint8Array(1400),
	);
	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]),
	);
	const buffer = createAsfHeader([metadataObject, streamPropertiesObject]);

	const type = await fileTypeFromBuffer(buffer);
	t.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});

	const streamType = await fileTypeNodeFromStream(new BufferedStream(buffer, 32));
	t.deepEqual(streamType, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Scans many ASF header objects for known-size buffers', async t => {
	const metadataObjectId = Uint8Array.from([0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11, 0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]);
	const fillerObjects = [];

	for (let index = 0; index < 257; index++) {
		fillerObjects.push(createAsfObject(metadataObjectId));
	}

	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]),
	);
	const buffer = createAsfHeader([...fillerObjects, streamPropertiesObject]);

	const type = await fileTypeFromBuffer(buffer);
	t.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Scans many ASF header objects for streamed inputs', async t => {
	const metadataObjectId = Uint8Array.from([0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11, 0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]);
	const fillerObjects = [];

	for (let index = 0; index < 257; index++) {
		fillerObjects.push(createAsfObject(metadataObjectId));
	}

	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]),
	);
	const buffer = createAsfHeader([...fillerObjects, streamPropertiesObject]);

	const type = await fileTypeNodeFromStream(new BufferedStream(buffer, 32));
	t.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Does not throw on malformed ID3 stream with oversized header length', async t => {
	const buffer = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x7F, 0x7F, 0x7F, 0x7F]);
	await assertUndefinedTypeFromChunkedStream(t, buffer);
});

test('Allows large ID3 headers for known-size buffers but keeps stream probing bounded', async t => {
	const id3HeaderLength = (16 * 1024 * 1024) + 1;
	const id3Header = Uint8Array.from([
		0x49,
		0x44,
		0x33,
		0x04,
		0x00,
		0x00,
		...toSyncSafeInteger(id3HeaderLength),
	]);
	const mpegFrame = Uint8Array.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
	const payload = Buffer.concat([Buffer.from(id3Header), Buffer.alloc(id3HeaderLength), Buffer.from(mpegFrame)]);

	const bufferType = await fileTypeFromBuffer(payload);
	t.deepEqual(bufferType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});

	await assertUndefinedTypeFromChunkedStream(t, payload);
});

test('Oversized ID3 web stream keeps hostile reads bounded', async t => {
	const id3HeaderLength = (16 * 1024 * 1024) + 1;
	const id3Header = Uint8Array.from([
		0x49,
		0x44,
		0x33,
		0x04,
		0x00,
		0x00,
		...toSyncSafeInteger(id3HeaderLength),
	]);
	const payload = Buffer.concat([Buffer.from(id3Header), Buffer.alloc(1024)]);
	const {state, stream} = createPatternWebStream(payload, [1, 2, 1, 3]);

	const type = await new FileTypeParser().fromStream(stream);
	t.is(type, undefined);
	t.true(state.emittedBytes <= 40);
});

test('Does not throw on malformed PNG stream with oversized chunk length', async t => {
	const bytes = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x7F, 0xFF, 0xFF, 0xFF, 0x7A, 0x7A, 0x7A, 0x7A]);
	await assertUndefinedTypeFromChunkedStream(t, bytes);
});

test('Does not throw on malformed TIFF with oversized IFD offset', async t => {
	const bytes = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	await assertUndefinedTypeFromBuffer(t, bytes);
});

test('Does not throw on malformed TIFF stream with oversized IFD offset', async t => {
	const bytes = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	await assertUndefinedTypeFromChunkedStream(t, bytes);
});

test('Does not crash or hang if provided with a partial gunzip file', async t => {
	const buffer = Uint8Array.from([31, 139, 8, 8, 137, 83, 29, 82, 0, 11]);
	const type = await fileTypeFromBuffer(buffer);

	t.deepEqual(type, {
		ext: 'gz',
		mime: 'application/gzip',
	});
});

test('OOXML type detection is not affected by ZIP entry order', async t => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	const bufferType = await fileTypeFromBuffer(orderedZip);
	t.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});

	const streamType = await fileTypeNodeFromStream(new BufferedStream(orderedZip, 16));
	t.deepEqual(streamType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Does not use OOXML directory fallback when [Content_Types].xml parses but remains unresolved', async t => {
	const spreadsheetEntry = createZipLocalFile({
		filename: 'xl/workbook.bin',
		compressedData: new TextEncoder().encode('<workbook/>'),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/></Types>'),
	});
	const orderedZip = Buffer.concat([spreadsheetEntry, contentTypesEntry]);
	await assertZipTypeFromBufferAndChunkedStream(t, orderedZip);
});

test('Does not use OOXML directory fallback when unresolved [Content_Types].xml appears before spreadsheet entries', async t => {
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/></Types>'),
	});
	const spreadsheetEntry = createZipLocalFile({
		filename: 'xl/workbook.bin',
		compressedData: new TextEncoder().encode('<workbook/>'),
	});
	const orderedZip = Buffer.concat([contentTypesEntry, spreadsheetEntry]);
	await assertZipTypeFromBufferAndChunkedStream(t, orderedZip);
});

test('Does not use directory fallback when [Content_Types].xml cannot be read', async t => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const unreadableContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 99,
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});
	const orderedZip = Buffer.concat([wordEntry, unreadableContentTypesEntry]);
	await assertZipTypeFromBufferAndChunkedStream(t, orderedZip);
});

test('Allows large known-size [Content_Types].xml entries', async t => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat(2 * 1024 * 1024);
	const oversizedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, oversizedContentTypesEntry]);
	const bufferType = await fileTypeFromBuffer(orderedZip);
	t.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Allows many pre-IDAT PNG chunks for known-size buffers', async t => {
	const buffer = createPngWithAncillaryChunks(257);
	const type = await fileTypeFromBuffer(buffer);
	t.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Allows many pre-IDAT PNG chunks for streamed inputs', async t => {
	const buffer = createPngWithAncillaryChunks(257);
	const type = await fileTypeNodeFromStream(new BufferedStream(buffer, 16));
	t.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Allows many TIFF tags for known-size buffers', async t => {
	const tagIds = Array.from({length: 257}, () => 0);
	tagIds[256] = 50_706;
	const buffer = createLittleEndianTiffWithTagIds(tagIds);
	const type = await fileTypeFromBuffer(buffer);
	t.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Allows many TIFF tags for streamed inputs', async t => {
	const tagIds = Array.from({length: 257}, () => 0);
	tagIds[256] = 50_706;
	const buffer = createLittleEndianTiffWithTagIds(tagIds);
	const type = await fileTypeNodeFromStream(new BufferedStream(buffer, 16));
	t.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Does not scan unbounded inflated gzip payload while probing for tar.gz', async t => {
	const repeatedId3Payload = createRepeatedId3Payload(3, 8 * 1024 * 1024);
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const gzipPayload = gzipSync(Buffer.concat([Buffer.from(repeatedId3Payload), tarFixture]));
	const bufferType = await fileTypeFromBuffer(gzipPayload);
	t.deepEqual(bufferType, {
		ext: 'gz',
		mime: 'application/gzip',
	});

	const streamType = await fileTypeNodeFromStream(new BufferedStream(gzipPayload, 128));
	t.deepEqual(streamType, {
		ext: 'gz',
		mime: 'application/gzip',
	});
});

test('Does not allocate huge memory for oversized ZIP mimetype entries', async t => {
	const buffer = createOversizedZipMimetypeEntry();

	const type = await fileTypeFromBuffer(buffer);
	t.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Does not allocate huge memory for oversized ZIP mimetype entries in stream mode', async t => {
	const buffer = createOversizedZipMimetypeEntry();
	await assertZipTypeFromChunkedStream(t, buffer);
});

test('Does not throw on malformed ZIP with unexpected follow-up signature', async t => {
	const zipLocalFile = createZipLocalFile({
		filename: 'a',
		compressedMethod: 0,
		compressedData: Uint8Array.from([0x41]),
	});
	const malformedZip = Buffer.concat([zipLocalFile, Buffer.from([0, 0, 0, 0])]);
	await assertZipTypeFromBufferAndChunkedStream(t, malformedZip);
});

test('Does not throw on malformed ZIP deflate entry in [Content_Types].xml', async t => {
	const malformedDeflatePayload = Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x00]);
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: malformedDeflatePayload,
		uncompressedSize: 20,
	});
	await assertZipTypeFromBufferAndChunkedStream(t, malformedZip);
});

test('Keeps ZIP [Content_Types].xml inflate probing bounded for streams', async t => {
	const mimeMarker = 'ContentType="application/vnd.ms-word.document.macroenabled.main+xml"';
	const oversizedXml = mimeMarker + 'A'.repeat((2 * 1024 * 1024) - mimeMarker.length);
	const compressed = deflateRawSync(Buffer.from(oversizedXml, 'utf8'));
	const zip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: compressed,
		uncompressedSize: 1,
	});
	await assertZipTypeFromChunkedStream(t, zip);
});

test('Allows large deflated known-size [Content_Types].xml entries', async t => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat(2 * 1024 * 1024);
	const compressed = deflateRawSync(Buffer.from(contentTypesXml, 'utf8'));
	const zip = Buffer.concat([
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedMethod: 8,
			compressedData: compressed,
			uncompressedSize: Buffer.byteLength(contentTypesXml),
		}),
	]);
	const type = await fileTypeFromBuffer(zip);
	t.deepEqual(type, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Does not throw on ZIP with unsupported compression method in [Content_Types].xml', async t => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 99,
		compressedData: Uint8Array.from([0x01, 0x02, 0x03, 0x04]),
		uncompressedSize: 4,
	});
	await assertZipTypeFromBufferAndChunkedStream(t, malformedZip);
});

test('Does not throw on ZIP with streamed [Content_Types].xml entry without descriptor data', async t => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		generalPurposeBitFlag: 0x08,
		compressedMethod: 8,
		compressedData: Uint8Array.from([0x41, 0x42, 0x43]),
		compressedSize: 0,
		uncompressedSize: 0,
	});
	await assertZipTypeFromBufferAndChunkedStream(t, malformedZip);
});

test('.fileTypeStream() clamps invalid sampleSize values', async t => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const blob = new Blob([await readFile(file)]);
	const stream = await fileTypeStream(blob.stream(), {sampleSize: Number.POSITIVE_INFINITY});
	t.deepEqual(stream.fileType, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Does not allocate huge memory on malformed EBML DocType length', async t => {
	const bytes = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x81, 0x42, 0x82, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
	const type = await fileTypeFromBuffer(bytes);

	t.is(type, undefined);
});

test('Does not throw on malformed EBML stream child with oversized payload length', async t => {
	const bytes = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x8A, 0x42, 0x83, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
	const type = await fileTypeNodeFromStream(new BufferedStream(bytes, 8));

	t.is(type, undefined);
});
