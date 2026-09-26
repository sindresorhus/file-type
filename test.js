import process from 'node:process';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import {Buffer} from 'node:buffer';
import {deflateRawSync, gzipSync} from 'node:zlib';
import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import {Parser as ReadmeParser} from 'commonmark';
import * as esbuild from 'esbuild';
import {fromFile} from 'strtok3';
import * as strtok3 from 'strtok3/core';
import {areUint8ArraysEqual} from 'uint8array-extras';
import {getStreamAsArrayBuffer} from 'get-stream';
import {stringToBytes} from './source/tokens.js';
import {
	fileTypeFromBuffer,
	fileTypeFromStream,
	fileTypeFromFile,
	fileTypeFromBlob,
	fileTypeFromTokenizer,
	fileTypeStream,
	supportedExtensions,
	supportedMimeTypes,
	FileTypeParser,
} from './source/index.js';

const __dirname = import.meta.dirname;

const missingTests = new Set();

const temporaryPathsToRemove = new Set();
after(async () => {
	for (const temporaryPath of temporaryPathsToRemove) {
		await fs.promises.rm(temporaryPath, {recursive: true, force: true}).catch(() => {});
	}

	temporaryPathsToRemove.clear();
});

// Node:test has no `test.failing`, so a known failing test asserts that it fails.
function failingTest(name, body) {
	test(name, async () => {
		await assert.rejects(body, assert.AssertionError);
	});
}

const reasonableDetectionSizeInBytes = 4100;
const maximumZipTextEntrySizeInBytes = 1024 * 1024;
const maximumZipDescriptorScanSizeInBytes = 1024 * 1024;
const maximumStreamPayloadProbeSizeInBytes = 1024 * 1024;
const maximumUntrustedSkipSizeInBytes = 16 * 1024 * 1024;
const legacyOversizedZipTextEntrySizeInBytes = 16 * 1024 * 1024;

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
Get the fixture files to test.

Each object contains the following properties:
- `path` {string}: The full path to the fixture file.
- `filename` {string}: The name of the fixture file.
- `type` {string}: The type/extension of the fixture.

@returns {Array<object>} An array of fixture objects.
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

async function checkBufferLike(expectedExtension, bufferLike) {
	const {ext, mime} = await fileTypeFromBuffer(bufferLike) ?? {};
	assert.equal(ext, expectedExtension);
	assert.equal(typeof mime, 'string');
}

async function checkBlobLike(expectedExtension, bufferLike) {
	const blob = new Blob([bufferLike]);
	const {ext, mime} = await fileTypeFromBlob(blob) ?? {};
	assert.equal(ext, expectedExtension);
	assert.equal(typeof mime, 'string');
}

async function testFromFile(expectedExtension, filePath) {
	const {ext, mime} = await fileTypeFromFile(filePath) ?? {};
	assert.equal(ext, expectedExtension);
	assert.equal(typeof mime, 'string');
}

async function testFromBuffer(expectedExtension, filePath) {
	const chunk = fs.readFileSync(filePath);
	await checkBufferLike(expectedExtension, chunk);
	await checkBufferLike(expectedExtension, new Uint8Array(chunk));

	if (filePath.includes('fixture2.zip')) {
		await checkBufferLike(expectedExtension, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + Math.floor(chunk.byteLength / 2)));
	}

	await checkBufferLike(expectedExtension, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
}

async function testFromBlob(expectedExtension, filePath) {
	const chunk = fs.readFileSync(filePath);
	await checkBlobLike(expectedExtension, chunk);
}

async function testFalsePositive(filePath) {
	assert.equal(await fileTypeFromFile(filePath), undefined);

	const chunk = fs.readFileSync(filePath);
	assert.equal(await fileTypeFromBuffer(chunk), undefined);
	assert.equal(await fileTypeFromBuffer(new Uint8Array(chunk)), undefined);
	// `chunk.buffer` is the whole allocation pool rather than this file, so for a small file it
	// is tens of kilobytes of unrelated memory and whatever happens to be in it. A caller passing
	// an `ArrayBuffer` has one sized to the file, so copy into one.
	assert.equal(await fileTypeFromBuffer(Uint8Array.from(chunk).buffer), undefined);
}

async function getStreamAsUint8Array(stream) {
	return new Uint8Array(await getStreamAsArrayBuffer(stream));
}

async function testStreamWithWebStream(expectedExtension, filePath) {
	// Read the file into a buffer
	const fileBuffer = await readFile(filePath);
	// Create a Blob from the buffer
	const blob = new Blob([fileBuffer]);
	const webStream = await fileTypeStream(blob.stream());
	assert.ok(!webStream.locked);
	const webStreamResult = await getStreamAsUint8Array(webStream);
	assert.ok(!webStream.locked, 'Ensure web-stream is released');
	assert.ok(areUint8ArraysEqual(fileBuffer, webStreamResult));
}

let i = 0;
for (const fixture of getFixtures()) {
	const register = failingFixture.has(fixture.filename) ? failingTest : test;

	register(`${fixture.filename} ${i++} .fileTypeFromFile() method - same fileType`, async () => {
		await testFromFile(fixture.type, fixture.path);
	});
	register(`${fixture.filename} ${i++} .fileTypeFromBuffer() method - same fileType`, async () => {
		await testFromBuffer(fixture.type, fixture.path);
	});
	register(`${fixture.filename} ${i++} .fileTypeFromBlob() method - same fileType`, async () => {
		await testFromBlob(fixture.type, fixture.path);
	});
	test(`${fixture.filename} ${i++} .fileTypeStream() - identical Web Streams`, async () => {
		await testStreamWithWebStream(fixture.type, fixture.path);
	});
}

test('.fileTypeStream() method - empty stream', async () => {
	const newStream = await fileTypeStream(new ReadableStream({
		start(controller) {
			controller.close();
		},
	}));
	assert.equal(newStream.fileType, undefined);
});

test('.fileTypeStream() method - short stream', async () => {
	const bufferA = new Uint8Array([0, 1, 0, 1]);
	const shortStream = new ReadableStream({
		start(controller) {
			controller.enqueue(bufferA);
			controller.close();
		},
	});

	// Test filetype detection
	const newStream = await fileTypeStream(shortStream);
	assert.equal(newStream.fileType, undefined);

	// Test usability of returned stream
	const bufferB = await getStreamAsUint8Array(newStream);
	assert.deepEqual(bufferA, bufferB);
});

test('.fileTypeStream() method - no end-of-stream errors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.ogm');
	const stream = await fileTypeStream(new Blob([fs.readFileSync(file)]).stream(), {sampleSize: 30});
	assert.equal(stream.fileType, undefined);
});

test('.fileTypeStream() method - error event', async () => {
	const errorMessage = 'Fixture';

	const readableStream = new ReadableStream({
		pull() {
			throw new Error(errorMessage);
		},
	});

	await assert.rejects(fileTypeStream(readableStream), {message: errorMessage});
});

test('.fileTypeStream() method - sampleSize option', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.ogm');
	let stream = await fileTypeStream(new Blob([fs.readFileSync(file)]).stream(), {sampleSize: 30});
	assert.equal(typeof (stream.fileType), 'undefined', 'file-type cannot be determined with a sampleSize of 30');

	stream = await fileTypeStream(new Blob([fs.readFileSync(file)]).stream(), {sampleSize: 4100});
	assert.equal(typeof (stream.fileType), 'object', 'file-type can be determined with a sampleSize of 4100');
	assert.equal(stream.fileType.mime, 'video/ogg');
});

test('.fileTypeStream() only detects ISO 9660 once sampleSize reaches its Volume Descriptor Set', async () => {
	const buffer = fs.readFileSync(path.join(__dirname, 'fixture', 'fixture.iso'));

	const defaultSampleStream = await fileTypeStream(new Blob([buffer]).stream());
	assert.equal(typeof (defaultSampleStream.fileType), 'undefined', 'file-type cannot be determined with the default sampleSize');

	const largeSampleStream = await fileTypeStream(new Blob([buffer]).stream(), {sampleSize: buffer.length});
	assert.deepEqual(largeSampleStream.fileType, {
		ext: 'iso',
		mime: 'application/x-iso9660-image',
	});
});

test('.fileTypeStream() preserves large caller-provided sampleSize values', async () => {
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

	let detectionStream = await fileTypeStream(createBufferedWebStream(payload, 64 * 1024), {sampleSize});
	assert.deepEqual(detectionStream.fileType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});

	detectionStream = await fileTypeStream(new Blob([payload]).stream(), {sampleSize});
	assert.deepEqual(detectionStream.fileType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
});

test('.fileTypeFromStream() method - be able to abort operation', async () => {
	const abortController = new AbortController();
	const stalledStream = new ReadableStream({
		pull() {
			return new Promise((_resolve, reject) => {
				if (abortController.signal.aborted) {
					reject(abortController.signal.reason);
					return;
				}

				abortController.signal.addEventListener('abort', () => {
					reject(abortController.signal.reason);
				});
			});
		},
	});

	const parser = new FileTypeParser({signal: abortController.signal});
	const timeoutMilliseconds = 500;
	const promiseFileType = Promise.race([
		parser.fromStream(stalledStream),
		new Promise((_resolve, reject) => {
			setTimeout(() => {
				reject(new Error(`Timed out after ${timeoutMilliseconds} ms`));
			}, timeoutMilliseconds);
		}),
	]);
	abortController.abort();
	// The parser should resolve or reject quickly after abort, not time out
	const result = await promiseFileType;
	assert.equal(result, undefined);
});

test('.fileTypeFromStream() method - rejects immediately when the signal is already aborted', async () => {
	const stalledStream = new ReadableStream({
		pull() {
			return new Promise(() => {});
		},
	});
	const abortController = new AbortController();
	const timeoutMilliseconds = 200;
	abortController.abort();
	await assert.rejects(Promise.race([
		fileTypeFromStream(stalledStream, {signal: abortController.signal}),
		new Promise((_resolve, reject) => {
			setTimeout(() => {
				reject(new Error(`Timed out after ${timeoutMilliseconds} ms`));
			}, timeoutMilliseconds);
		}),
	]), {name: 'AbortError'});
});

test('Does not falsely detect DWG for non-digit version strings like scientific notation', async () => {
	const buffer = Buffer.from('AC1e+3<html><script>alert(1)</script>');
	assert.equal(await fileTypeFromBuffer(buffer), undefined);
});

test('ID3 sync-safe integer masks MSBs on all bytes to prevent type confusion', async () => {
	// Byte 2 has MSB set (0x80), making the buggy parser compute 16384 instead of 0.
	// JPEG magic at offset 16394 would fool the old parser into detecting JPEG.
	const buffer = new Uint8Array(17_000);
	// ID3 header: "ID3" + version 3.0 + no flags + size [0x00, 0x00, 0x80, 0x00]
	buffer.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00]);
	// Place JPEG magic at position 16394 (where the buggy parser would look)
	buffer[16_394] = 0xFF;
	buffer[16_395] = 0xD8;
	buffer[16_396] = 0xFF;
	// With the fix, the parser sees size=0 and detects at position 10 (no JPEG there).
	const result = await fileTypeFromBuffer(buffer);
	assert.notEqual(result?.mime, 'image/jpeg');
});

test('.fileTypeFromStream() cancels a Web byte stream after successful detection', async () => {
	const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xDB]);
	const filler = Buffer.alloc(64 * 1024);
	const totalBytes = 4 * 1024 * 1024;
	let bodyBytesSent = 0;
	let isResponseClosed = false;
	let interval;

	const server = http.createServer((request, response) => {
		response.on('close', () => {
			isResponseClosed = true;
			clearInterval(interval);
		});
		response.writeHead(200, {
			'Content-Type': 'image/jpeg',
			'Content-Length': String(totalBytes),
		});
		response.write(jpegHeader);
		let sent = jpegHeader.length;
		interval = setInterval(() => {
			if (sent >= totalBytes) {
				clearInterval(interval);
				response.end();
				return;
			}

			const chunkLength = Math.min(filler.length, totalBytes - sent);
			sent += chunkLength;
			bodyBytesSent += chunkLength;
			response.write(filler.subarray(0, chunkLength));
		}, 10);
		interval.unref?.();
	});

	await new Promise(resolve => {
		server.listen(0, '127.0.0.1', resolve);
	});

	try {
		const {port} = server.address();
		const response = await fetch(`http://127.0.0.1:${port}/image.jpg`);
		const fileType = await fileTypeFromStream(response.body);
		assert.deepEqual(fileType, {
			ext: 'jpg',
			mime: 'image/jpeg',
		});
		await new Promise(resolve => {
			setTimeout(resolve, 80);
		});

		assert.ok(isResponseClosed);
		assert.ok(bodyBytesSent < 128 * 1024);
	} finally {
		clearInterval(interval);
		server.closeAllConnections?.();
		server.close();
	}
});

test('.fileTypeStream() method - be able to abort stalled stream detection', async () => {
	const abortController = new AbortController();
	const stalledStream = new ReadableStream({
		pull() {
			return new Promise((_resolve, reject) => {
				abortController.signal.addEventListener('abort', () => {
					reject(abortController.signal.reason);
				});
			});
		},
	});
	const timeoutMilliseconds = 400;
	setTimeout(() => {
		abortController.abort();
	}, 50);
	await assert.rejects(Promise.race([
		fileTypeStream(stalledStream, {signal: abortController.signal}),
		new Promise((_resolve, reject) => {
			setTimeout(() => {
				reject(new Error(`Timed out after ${timeoutMilliseconds} ms`));
			}, timeoutMilliseconds);
		}),
	]), {name: 'AbortError'});
});

test('.fileTypeFromStream() returns gzip for a stalled unknown-size gzip stream', async () => {
	const gzipPrefix = Uint8Array.from([31, 139, 8, 8, 137, 83, 29, 82, 0, 11]);
	const timeoutMilliseconds = 300;
	const stalledStream = new ReadableStream({
		pull(controller) {
			if (this.sent) {
				return new Promise(() => {});
			}

			this.sent = true;
			controller.enqueue(gzipPrefix);
			return new Promise(() => {});
		},
	});

	const type = await Promise.race([
		new FileTypeParser().fromStream(stalledStream),
		new Promise((_resolve, reject) => {
			setTimeout(() => {
				reject(new Error(`Timed out after ${timeoutMilliseconds} ms`));
			}, timeoutMilliseconds);
		}),
	]);
	assertGzipFileType(type);
});

test('supportedExtensions.has', () => {
	assert.ok(supportedExtensions.has('jpg'));
	assert.ok(!supportedExtensions.has('blah'));
});

test('supportedMimeTypes.has', () => {
	assert.ok(supportedMimeTypes.has('video/mpeg'));
	assert.ok(!supportedMimeTypes.has('video/blah'));
});

test('validate the input argument type', async () => {
	await assert.rejects(fileTypeFromBuffer('x'), {
		message: /Expected the `input` argument to be of type `Uint8Array`/v,
	});

	await fileTypeFromBuffer(new Uint8Array());

	await fileTypeFromBuffer(new ArrayBuffer());
});

test('validate the repo has all extensions and mimes in sync', () => {
	// File: source/*.js (base truth)
	function readIndexJS() {
		const sourceFiles = ['source/index.js', 'source/detectors/zip.js', 'source/detectors/ebml.js', 'source/detectors/png.js', 'source/detectors/asf.js'];
		const extensions = new Set();
		const mimes = new Set();
		for (const file of sourceFiles) {
			const content = fs.readFileSync(file, {encoding: 'utf8'});
			for (const extension of content.match(/(?<=ext:\s').*(?=',)/gv) ?? []) {
				extensions.add(extension);
			}

			for (const mime of content.match(/(?<=mime:\s').*(?=')/gv) ?? []) {
				mimes.add(mime);
			}
		}

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
		const extensionArray = index.match(/(?<=-\s\[`).*(?=`)/gv);
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

	// Find extensions/mimes that are in another file but not in `index.js`
	function findExtras(array, set) {
		return array.filter(element => !set.has(element));
	}

	// Find extensions/mimes that are in `index.js` but missing from another file
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
		assert.equal(duplicates.length, 0, `Found duplicate ${extensionOrMime}: ${duplicates} in ${filename}.`);
		assert.equal(extras.length, 0, `Extra ${extensionOrMime}: ${extras} in ${filename}.`);
		assert.equal(missing.length, 0, `Missing ${extensionOrMime}: ${missing} in ${filename}.`);
	}

	// Get the base truth of extensions and mimes supported from core.js
	const {exts} = readIndexJS();

	// Validate all extensions
	const filesWithExtensions = {
		'supported.js': [...supportedExtensions],
		'package.json': readPackageJSON(),
		'readme.md': readReadmeMD(),
	};

	for (const [filename, foundExtensions] of Object.entries(filesWithExtensions)) {
		if (foundExtensions) {
			validate(foundExtensions, exts, filename, 'extensions');
		}
	}
});

function createBufferedWebStream(buffer, chunkSize = buffer.length) {
	let offset = 0;
	return new ReadableStream({
		pull(controller) {
			if (offset >= buffer.length) {
				controller.close();
				return;
			}

			const chunk = buffer.subarray(offset, offset + chunkSize);
			offset += chunk.length;
			controller.enqueue(chunk);
		},
	});
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

function createPatternWebStream(buffer, chunkPattern, {byteStream = false} = {}) {
	let offset = 0;
	let patternIndex = 0;
	const state = {
		emittedBytes: 0,
	};

	return {
		state,
		stream: new ReadableStream({
			...(byteStream && {type: 'bytes'}),
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

async function assertUndefinedTypeFromBuffer(bytes) {
	const type = await fileTypeFromBuffer(bytes);
	assert.equal(type, undefined);
}

async function assertUndefinedTypeFromChunkedStream(bytes) {
	const type = await fileTypeFromStream(createBufferedWebStream(bytes, 8));
	assert.equal(type, undefined);
}

async function assertUndefinedTypeFromHostileStreams(bytes, description) {
	for (const chunkPattern of hostileChunkPatterns) {
		const type = await fileTypeFromStream(createPatternWebStream(bytes, chunkPattern).stream);
		assert.equal(type, undefined, `${description} with chunk pattern ${chunkPattern.join(',')}`);
	}
}

function assertZipFileType(type) {
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
}

function assertGzipFileType(type) {
	assert.deepEqual(type, {
		ext: 'gz',
		mime: 'application/gzip',
	});
}

function assertTarGzipFileType(type) {
	assert.deepEqual(type, {
		ext: 'tar.gz',
		mime: 'application/gzip',
	});
}

async function assertZipTypeFromBuffer(bytes) {
	const type = await fileTypeFromBuffer(bytes);
	assertZipFileType(type);
}

async function assertZipTypeFromBlob(bytes) {
	const type = await fileTypeFromBlob(new Blob([bytes]));
	assertZipFileType(type);
}

async function assertZipTypeFromChunkedStream(bytes) {
	const type = await fileTypeFromStream(createBufferedWebStream(bytes, 8));
	assertZipFileType(type);
}

async function assertZipTypeFromWebStream(bytes, chunkPattern = [8]) {
	const {stream} = createPatternWebStream(bytes, chunkPattern);
	const type = await new FileTypeParser().fromStream(stream);
	assertZipFileType(type);
}

async function assertFileTypeStreamChunkedResult(bytes, expectedFileType, options = {}) {
	const {
		chunkSize = 64 * 1024,
		sampleSize,
	} = options;
	const detectionStream = await fileTypeStream(createBufferedWebStream(bytes, chunkSize), {sampleSize});
	assert.deepEqual(detectionStream.fileType, expectedFileType);
	assert.ok(areUint8ArraysEqual(await getStreamAsUint8Array(detectionStream), bytes));
}

async function assertFileTypeStreamWebResult(bytes, expectedFileType, options = {}) {
	const detectionStream = await fileTypeStream(new Blob([bytes]).stream(), options);
	assert.deepEqual(detectionStream.fileType, expectedFileType);
	assert.ok(areUint8ArraysEqual(await getStreamAsUint8Array(detectionStream), bytes));
}

async function assertZipTypeFromFile(bytes) {
	const filePath = await createTemporaryTestFile(bytes);
	assertZipFileType(await fileTypeFromFile(filePath));
}

async function assertZipTypeFromKnownSizeInputs(bytes) {
	await assertZipTypeFromBuffer(bytes);
	await assertZipTypeFromBlob(bytes);
	await assertZipTypeFromFile(bytes);
}

async function assertZipTypeFromBufferAndChunkedStream(bytes) {
	await assertZipTypeFromBuffer(bytes);
	await assertZipTypeFromChunkedStream(bytes);
}

async function assertZipTypeFromAllDirectInputs(bytes) {
	await assertZipTypeFromBuffer(bytes);
	await assertZipTypeFromBlob(bytes);
	await assertZipTypeFromFile(bytes);
	await assertZipTypeFromChunkedStream(bytes);
}

// The shape of a Google Docs export: the media sits in front of `[Content_Types].xml`, so the scan
// for each entry's trailing data descriptor gives up before reaching the entry that names the format.
function createStreamedOoxmlZipBeyondScanBudget(partFilename, contentTypesXml) {
	return Buffer.concat([
		createZipDataDescriptorFile({
			filename: partFilename,
			compressedData: new TextEncoder().encode('<part/>'),
		}),
		createZipDataDescriptorFile({
			filename: 'docProps/thumbnail.bin',
			compressedData: Buffer.alloc(maximumZipDescriptorScanSizeInBytes + (64 * 1024)),
		}),
		createZipDataDescriptorFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(contentTypesXml),
		}),
	]);
}

// Every entry declares its size and sits exactly at the per-entry skip limit, so no single entry is
// ever abandoned and only the archive-wide ceiling can end the scan.
function createStreamedZipBeyondScanCeiling(partFilename) {
	const entries = [
		createZipLocalFile({
			filename: partFilename,
			compressedData: new TextEncoder().encode('<part/>'),
		}),
	];

	for (let consumed = 0; consumed < maximumUntrustedSkipSizeInBytes; consumed += maximumZipDescriptorScanSizeInBytes) {
		entries.push(createZipLocalFile({
			filename: `media/image-${entries.length}.bin`,
			compressedData: Buffer.alloc(maximumZipDescriptorScanSizeInBytes),
		}));
	}

	entries.push(createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
	}));

	return Buffer.concat(entries);
}

async function assertFileTypeFromAllDirectInputs(bytes, expected) {
	assert.deepEqual(await fileTypeFromBuffer(bytes), expected);
	assert.deepEqual(await fileTypeFromBlob(new Blob([bytes])), expected);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(bytes)), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(bytes, 64 * 1024)), expected);
}

async function assertFileTypeStreamFallsBackToZipWithLargeSampleSize(bytes) {
	await assertFileTypeStreamChunkedResult(bytes, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: bytes.length});
	await assertFileTypeStreamWebResult(bytes, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: bytes.length});
}

async function createTemporaryTestFile(bytes, extension = 'zip') {
	const temporaryDirectory = path.join(__dirname, '.ai-temporary');
	await fs.promises.mkdir(temporaryDirectory, {recursive: true});
	const filePath = path.join(temporaryDirectory, `file-type-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`);
	await fs.promises.writeFile(filePath, bytes);
	temporaryPathsToRemove.add(filePath);
	return filePath;
}

async function createSparseTemporaryTestFile(bytes, size, extension = 'zip') {
	const filePath = await createTemporaryTestFile(bytes, extension);
	await fs.promises.truncate(filePath, size);
	return filePath;
}

async function createTemporaryDirectory() {
	const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'file-type-'));
	temporaryPathsToRemove.add(temporaryDirectory);

	return temporaryDirectory;
}

async function createTemporaryFifo() {
	const temporaryDirectory = await createTemporaryDirectory();
	const filePath = path.join(temporaryDirectory, 'test.fifo');
	const result = spawnSync('mkfifo', [filePath]);
	if (result.status !== 0) {
		throw new Error(`mkfifo failed: ${result.stderr.toString()}`);
	}

	return filePath;
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

function createZipDataDescriptor({compressedSize = 0, uncompressedSize = compressedSize, crc32 = 0} = {}) {
	const descriptor = new Uint8Array(16);
	const view = new DataView(descriptor.buffer);
	view.setUint32(0, 0x08_07_4B_50, true);
	view.setUint32(4, crc32, true);
	view.setUint32(8, compressedSize, true);
	view.setUint32(12, uncompressedSize, true);
	return descriptor;
}

function createZipDataDescriptorFile({filename, compressedMethod = 0, compressedData = new Uint8Array(0), uncompressedSize = compressedData.length, descriptor = createZipDataDescriptor({compressedSize: compressedData.length, uncompressedSize})} = {}) {
	return Buffer.concat([
		createZipLocalFile({
			filename,
			generalPurposeBitFlag: 0x08,
			compressedMethod,
			compressedData,
			compressedSize: 0,
			uncompressedSize: 0,
		}),
		Buffer.from(descriptor),
	]);
}

const descriptorBoundaryEpubFileType = {
	ext: 'epub',
	mime: 'application/epub+zip',
};

const descriptorBoundaryDocmFileType = {
	ext: 'docm',
	mime: 'application/vnd.ms-word.document.macroenabled.12',
};

const descriptorBoundaryContentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';

function createZipWithLeadingDescriptorEntry(descriptorSize, trailingEntries) {
	const irrelevantDescriptorEntry = createZipDataDescriptorFile({
		filename: 'irrelevant.bin',
		compressedData: Buffer.alloc(descriptorSize),
	});

	return Buffer.concat([irrelevantDescriptorEntry, ...trailingEntries]);
}

function createZipWithRepeatedDescriptorEntries(entryCount, descriptorSize, trailingEntries) {
	const entries = [];

	for (let index = 0; index < entryCount; index++) {
		entries.push(createZipDataDescriptorFile({
			filename: `irrelevant-${index}.bin`,
			compressedData: Buffer.alloc(descriptorSize),
		}));
	}

	return Buffer.concat([...entries, ...trailingEntries]);
}

function createZipWithRepeatedDescriptorEntriesAtKnownSizeBudget(trailingEntries, exceededBytes = 0) {
	const filenames = ['irrelevant-0.bin', 'irrelevant-1.bin'];
	const firstPayloadSize = Math.floor(maximumZipTextEntrySizeInBytes / 4);
	const secondPayloadSize = (maximumZipTextEntrySizeInBytes - firstPayloadSize) + exceededBytes;

	return Buffer.concat([
		createZipDataDescriptorFile({
			filename: filenames[0],
			compressedData: Buffer.alloc(firstPayloadSize),
		}),
		createZipDataDescriptorFile({
			filename: filenames[1],
			compressedData: Buffer.alloc(secondPayloadSize),
		}),
		...trailingEntries,
	]);
}

function createZipWithLeadingDescriptorMimetype(descriptorSize) {
	return createZipWithLeadingDescriptorEntry(descriptorSize, [
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithRepeatedDescriptorMimetype(entryCount, descriptorSize) {
	return createZipWithRepeatedDescriptorEntries(entryCount, descriptorSize, [
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget(exceededBytes = 0) {
	return createZipWithRepeatedDescriptorEntriesAtKnownSizeBudget([
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	], exceededBytes);
}

function createZipWithLeadingDescriptorContentTypes(descriptorSize) {
	return createZipWithLeadingDescriptorEntry(descriptorSize, [
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipWithRepeatedDescriptorContentTypes(entryCount, descriptorSize) {
	return createZipWithRepeatedDescriptorEntries(entryCount, descriptorSize, [
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget(exceededBytes = 0) {
	return createZipWithRepeatedDescriptorEntriesAtKnownSizeBudget([
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	], exceededBytes);
}

function createZipWithLeadingStoredEntry(entrySize, trailingEntries) {
	const irrelevantStoredEntry = createZipLocalFile({
		filename: 'irrelevant.bin',
		compressedData: Buffer.alloc(entrySize),
	});

	return Buffer.concat([irrelevantStoredEntry, ...trailingEntries]);
}

function createZipWithRepeatedStoredEntries(entryCount, entrySize, trailingEntries) {
	const entries = [];

	for (let index = 0; index < entryCount; index++) {
		entries.push(createZipLocalFile({
			filename: `irrelevant-${index}.bin`,
			compressedData: Buffer.alloc(entrySize),
		}));
	}

	return Buffer.concat([...entries, ...trailingEntries]);
}

function createZipWithRepeatedStoredEntriesAtCumulativeLimit(trailingEntries) {
	const entries = [];
	let consumedBytes = 0;

	for (let index = 0; consumedBytes < maximumUntrustedSkipSizeInBytes; index++) {
		const filename = `irrelevant-${index}.bin`;
		const headerSize = 30 + new TextEncoder().encode(filename).length;
		const remainingBytes = maximumUntrustedSkipSizeInBytes - consumedBytes;
		const entrySize = Math.min(maximumZipTextEntrySizeInBytes, remainingBytes - headerSize);

		entries.push(createZipLocalFile({
			filename,
			compressedData: Buffer.alloc(entrySize),
		}));
		consumedBytes += headerSize + entrySize;
	}

	return Buffer.concat([...entries, ...trailingEntries]);
}

function createZipWithLeadingStoredMimetype(entrySize) {
	return createZipWithLeadingStoredEntry(entrySize, [
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithLeadingStoredContentTypes(entrySize) {
	return createZipWithLeadingStoredEntry(entrySize, [
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipWithLeadingStoredDescriptorMimetype(entrySize) {
	return createZipWithLeadingStoredEntry(entrySize, [
		createZipDataDescriptorFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithLeadingStoredDescriptorContentTypes(entrySize) {
	return createZipWithLeadingStoredEntry(entrySize, [
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipDataDescriptorFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipWithRepeatedStoredMimetype(entryCount, entrySize) {
	return createZipWithRepeatedStoredEntries(entryCount, entrySize, [
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithRepeatedStoredMimetypeAtCumulativeLimit() {
	return createZipWithRepeatedStoredEntriesAtCumulativeLimit([
		createZipLocalFile({
			filename: 'mimetype',
			compressedData: new TextEncoder().encode('application/epub+zip'),
		}),
	]);
}

function createZipWithRepeatedStoredContentTypes(entryCount, entrySize) {
	return createZipWithRepeatedStoredEntries(entryCount, entrySize, [
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipWithRepeatedStoredContentTypesAtCumulativeLimit() {
	return createZipWithRepeatedStoredEntriesAtCumulativeLimit([
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);
}

function createZipTextEntryExceedingProbeLimit(text) {
	return text.padEnd(maximumZipTextEntrySizeInBytes + 1);
}

function createDeflatedZipWithUnderstatedMimetypeSize() {
	const mimetype = createZipTextEntryExceedingProbeLimit('application/epub+zip');
	return createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: 1,
	});
}

function createDeflatedZipWithUnderstatedContentTypesSize() {
	const contentTypesXml = createZipTextEntryExceedingProbeLimit(descriptorBoundaryContentTypesXml);
	return Buffer.concat([
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<w:document/>'),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedMethod: 8,
			compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
			uncompressedSize: 1,
		}),
	]);
}

function createZipArchive(entries) {
	const localFiles = [];
	const centralDirectoryEntries = [];
	let offset = 0;

	for (const entry of entries) {
		const {
			filename,
			generalPurposeBitFlag = 0,
			compressedMethod = 0,
			compressedData = new Uint8Array(0),
			compressedSize = compressedData.length,
			uncompressedSize = compressedData.length,
		} = entry;
		const filenameBytes = new TextEncoder().encode(filename);
		const localFile = createZipLocalFile({
			filename,
			generalPurposeBitFlag,
			compressedMethod,
			compressedData,
			compressedSize,
			uncompressedSize,
		});
		localFiles.push(localFile);

		const centralDirectoryEntry = new Uint8Array(46 + filenameBytes.length);
		const view = new DataView(centralDirectoryEntry.buffer);
		view.setUint32(0, 0x02_01_4B_50, true);
		view.setUint16(4, 20, true);
		view.setUint16(6, 20, true);
		view.setUint16(8, generalPurposeBitFlag, true);
		view.setUint16(10, compressedMethod, true);
		view.setUint16(12, 0, true);
		view.setUint16(14, 0, true);
		view.setUint32(16, 0, true);
		view.setUint32(20, compressedSize, true);
		view.setUint32(24, uncompressedSize, true);
		view.setUint16(28, filenameBytes.length, true);
		view.setUint16(30, 0, true);
		view.setUint16(32, 0, true);
		view.setUint16(34, 0, true);
		view.setUint16(36, 0, true);
		view.setUint32(38, 0, true);
		view.setUint32(42, offset, true);
		centralDirectoryEntry.set(filenameBytes, 46);
		centralDirectoryEntries.push(Buffer.from(centralDirectoryEntry));
		offset += localFile.length;
	}

	const centralDirectory = Buffer.concat(centralDirectoryEntries);
	const endOfCentralDirectory = new Uint8Array(22);
	const view = new DataView(endOfCentralDirectory.buffer);
	view.setUint32(0, 0x06_05_4B_50, true);
	view.setUint16(4, 0, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, entries.length, true);
	view.setUint16(10, entries.length, true);
	view.setUint32(12, centralDirectory.length, true);
	view.setUint32(16, offset, true);
	view.setUint16(20, 0, true);

	return Buffer.concat([...localFiles, centralDirectory, Buffer.from(endOfCentralDirectory)]);
}

function createZipArchiveWithEntryAtIndex(entryCount, entryIndex, entry) {
	const entries = [];
	for (let index = 0; index < entryCount; ++index) {
		if (index === entryIndex) {
			entries.push(entry);
			continue;
		}

		entries.push({
			filename: `entry-${String(index).padStart(4, '0')}.txt`,
		});
	}

	return createZipArchive(entries);
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

function encodeEbmlVariableSizeInteger(value) {
	for (let length = 1; length <= 8; length++) {
		const maximumValue = (2 ** (7 * length)) - 2;
		if (value <= maximumValue) {
			const bytes = new Uint8Array(length);
			let remaining = value;
			for (let index = length - 1; index >= 0; index--) {
				bytes[index] = remaining & 0xFF;
				remaining = Math.floor(remaining / 256);
			}

			bytes[0] |= 1 << (8 - length);
			return bytes;
		}
	}

	throw new RangeError(`Unsupported EBML size ${value}`);
}

function createEbmlElement(idBytes, payload = new Uint8Array(0)) {
	return Buffer.concat([
		Buffer.from(idBytes),
		Buffer.from(encodeEbmlVariableSizeInteger(payload.length)),
		Buffer.from(payload),
	]);
}

function createEbmlWithRepeatedUnknownChildren(childCount, childPayloadSizeInBytes, documentType) {
	const children = [];

	for (let index = 0; index < childCount; index++) {
		children.push(createEbmlElement([0x81], new Uint8Array(childPayloadSizeInBytes)));
	}

	if (documentType) {
		children.push(createEbmlElement([0x42, 0x82], new TextEncoder().encode(documentType)));
	}

	const rootPayload = Buffer.concat(children);
	return createEbmlElement([0x1A, 0x45, 0xDF, 0xA3], rootPayload);
}

function createEbmlWithUnknownPayloadBeforeDocumentType(payloadSizeInBytes, documentType) {
	return createEbmlElement([0x1A, 0x45, 0xDF, 0xA3], Buffer.concat([
		createEbmlElement([0x81], new Uint8Array(payloadSizeInBytes)),
		createEbmlElement([0x42, 0x82], new TextEncoder().encode(documentType)),
	]));
}

function createNestedGzip(buffer, depth) {
	let output = buffer;
	for (let index = 0; index < depth; index++) {
		output = gzipSync(output);
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

function createAsfStreamHeaderWithMetadataObjects(metadataObjectCount, streamTypeId) {
	const metadataObjectId = Uint8Array.from([0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11, 0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]);
	const metadataObjects = [];

	for (let index = 0; index < metadataObjectCount; index++) {
		metadataObjects.push(createAsfObject(metadataObjectId));
	}

	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		streamTypeId,
	);

	return createAsfHeader([...metadataObjects, streamPropertiesObject]);
}

function createAsfAudioHeaderWithMetadataObjects(metadataObjectCount) {
	return createAsfStreamHeaderWithMetadataObjects(metadataObjectCount, Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]));
}

function createAsfVideoHeaderWithMetadataObjects(metadataObjectCount) {
	return createAsfStreamHeaderWithMetadataObjects(metadataObjectCount, Uint8Array.from([0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]));
}

function createAsfUnknownStreamHeaderWithMetadataObjects(metadataObjectCount) {
	return createAsfStreamHeaderWithMetadataObjects(metadataObjectCount, Uint8Array.from([0x00, 0x01, 0x02, 0x03, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]));
}

function createAsfAudioHeaderWithUnknownPayload(payloadSize) {
	const metadataObjectId = Uint8Array.from([0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11, 0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]);
	const metadataObject = createAsfObject(metadataObjectId, new Uint8Array(payloadSize));
	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]),
	);

	return createAsfHeader([metadataObject, streamPropertiesObject]);
}

function createAsfAudioHeaderWithHeaderExtensionPayload(payloadSize) {
	const headerExtensionObjectId = Uint8Array.from([0xB5, 0x03, 0xBF, 0x5F, 0x2E, 0xA9, 0xCF, 0x11, 0x8E, 0xE3, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]);
	const headerExtensionObject = createAsfObject(headerExtensionObjectId, new Uint8Array(payloadSize));
	const streamPropertiesObject = createAsfObject(
		Uint8Array.from([0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65]),
		Uint8Array.from([0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B]),
	);

	return createAsfHeader([headerExtensionObject, streamPropertiesObject]);
}

function createPngChunk(type, data = new Uint8Array(0)) {
	const chunk = new Uint8Array(12 + data.length);
	const view = new DataView(chunk.buffer);
	view.setUint32(0, data.length);
	chunk.set(new TextEncoder().encode(type), 4);
	chunk.set(data, 8);
	return chunk;
}

function createPngWithAncillaryChunks(ancillaryChunkCount, ancillaryChunkData = new Uint8Array(0)) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	const chunks = [Buffer.from(createPngChunk('IHDR', ihdrData))];

	for (let index = 0; index < ancillaryChunkCount; index++) {
		chunks.push(Buffer.from(createPngChunk('tEXt', ancillaryChunkData)));
	}

	chunks.push(Buffer.from(createPngChunk('IDAT')));
	return Buffer.concat([Buffer.from(signature), ...chunks]);
}

function createPngWithAncillaryChunksAndAnimationControl(ancillaryChunkCount, ancillaryChunkData = new Uint8Array(0)) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	const animationControlData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
	const chunks = [Buffer.from(createPngChunk('IHDR', ihdrData))];

	for (let index = 0; index < ancillaryChunkCount; index++) {
		chunks.push(Buffer.from(createPngChunk('tEXt', ancillaryChunkData)));
	}

	chunks.push(
		Buffer.from(createPngChunk('acTL', animationControlData)),
		Buffer.from(createPngChunk('IDAT')),
	);
	return Buffer.concat([Buffer.from(signature), ...chunks]);
}

function createPngWithAncillaryPayloadBeforeIdat(payloadSize) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	return Buffer.concat([
		Buffer.from(signature),
		Buffer.from(createPngChunk('IHDR', ihdrData)),
		Buffer.from(createPngChunk('tEXt', new Uint8Array(payloadSize))),
		Buffer.from(createPngChunk('IDAT')),
	]);
}

function createPngWithAncillaryPayloadBeforeAnimationControl(payloadSize) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	const animationControlData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
	return Buffer.concat([
		Buffer.from(signature),
		Buffer.from(createPngChunk('IHDR', ihdrData)),
		Buffer.from(createPngChunk('tEXt', new Uint8Array(payloadSize))),
		Buffer.from(createPngChunk('acTL', animationControlData)),
		Buffer.from(createPngChunk('IDAT')),
	]);
}

function createPngWithCriticalPayloadBeforeIdat(type, payloadSize) {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	return Buffer.concat([
		Buffer.from(signature),
		Buffer.from(createPngChunk('IHDR', ihdrData)),
		Buffer.from(createPngChunk(type, new Uint8Array(payloadSize))),
		Buffer.from(createPngChunk('IDAT')),
	]);
}

function createPngWithLeadingCgbiChunk() {
	const signature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
	const ihdrData = Uint8Array.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]);
	return Buffer.concat([
		Buffer.from(signature),
		Buffer.from(createPngChunk('CgBI')),
		Buffer.from(createPngChunk('IHDR', ihdrData)),
		Buffer.from(createPngChunk('IDAT')),
	]);
}

function createTiffWithTagIds(tagIds, isBigEndian = false, ifdOffset = 8) {
	const buffer = new Uint8Array(ifdOffset + 2 + (tagIds.length * 12) + 4);
	const view = new DataView(buffer.buffer);
	buffer.set(isBigEndian ? [0x4D, 0x4D, 0x00, 0x2A] : [0x49, 0x49, 0x2A, 0x00], 0);
	view.setUint32(4, ifdOffset, !isBigEndian);
	view.setUint16(ifdOffset, tagIds.length, !isBigEndian);

	let offset = ifdOffset + 2;
	for (const tagId of tagIds) {
		view.setUint16(offset, tagId, !isBigEndian);
		offset += 12;
	}

	return buffer;
}

function createLittleEndianTiffWithTagIds(tagIds) {
	return createTiffWithTagIds(tagIds);
}

function createLittleEndianTiffWithTagIdsAtOffset(tagIds, ifdOffset) {
	return createTiffWithTagIds(tagIds, false, ifdOffset);
}

function createLittleEndianTiffWithTagIdAtIndex(tagCount, tagIndex, tagId) {
	const tagIds = Array.from({length: tagCount}, () => 0);
	tagIds[tagIndex] = tagId;
	return createLittleEndianTiffWithTagIds(tagIds);
}

function createBigEndianTiffWithTagIdAtIndex(tagCount, tagIndex, tagId) {
	const tagIds = Array.from({length: tagCount}, () => 0);
	tagIds[tagIndex] = tagId;
	return createTiffWithTagIds(tagIds, true);
}

test('odd file sizes', async () => {
	const oddFileSizes = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 255, 256, 257, 511, 512, 513];

	for (const size of oddFileSizes) {
		const buffer = new Uint8Array(size);
		await fileTypeFromBuffer(buffer);
	}

	for (const size of oddFileSizes) {
		const buffer = new Uint8Array(size);
		const stream = createBufferedWebStream(buffer);
		await fileTypeFromStream(stream);
	}
});

test('supported files types are listed alphabetically', async () => {
	const readme = await fs.promises.readFile('readme.md', {encoding: 'utf8'});
	let currentNode = new ReadmeParser().parse(readme).firstChild;

	while (currentNode) {
		if (currentNode.type === 'heading' && currentNode.firstChild.literal === 'Supported file types') {
			// Header → (skip non-list nodes) → List → First list item
			currentNode = currentNode.next;
			while (currentNode && currentNode.type !== 'list') {
				currentNode = currentNode.next;
			}

			currentNode = currentNode.firstChild;
			break;
		}

		currentNode = currentNode.next;
	}

	let previousFileType;

	while (currentNode) {
		// List item → Paragraph → Link → Inline code → Text
		const currentFileType = currentNode.firstChild.firstChild.firstChild.literal;

		assert.ok(!previousFileType || currentFileType > previousFileType, `${currentFileType} should be listed before ${previousFileType}`);

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

test('implemented MIME types and extensions match the list of supported ones', async () => {
	const mimeTypesWithoutUnitTest = [
		'application/vnd.ms-asf',
		'image/heic-sequence',
	];

	const implementedMimeTypes = new Set(mimeTypesWithoutUnitTest);
	const implementedExtensions = new Set();

	for (const {path: filePath} of getFixtures()) {
		const fileType = await fileTypeFromFile(filePath);
		if (!fileType) {
			continue;
		}

		implementedMimeTypes.add(fileType.mime);
		implementedExtensions.add(fileType.ext);
	}

	const differencesInMimeTypes = symmetricDifference(supportedMimeTypes, implementedMimeTypes);

	for (const difference of differencesInMimeTypes) {
		if (implementedMimeTypes.has(difference)) {
			assert.fail(`MIME-type ${difference} is implemented, but not declared as a supported MIME-type`);
		} else {
			assert.fail(`MIME-type ${difference} declared as a supported MIME-type, but not found as an implemented MIME-type`);
		}
	}

	assert.equal(differencesInMimeTypes.size, 0);

	const differencesInExtensions = symmetricDifference(supportedExtensions, implementedExtensions);
	for (const difference of differencesInExtensions) {
		if (implementedMimeTypes.has(difference)) {
			assert.fail(`Extension ${difference} is implemented, but not declared as a supported extension`);
		} else {
			assert.fail(`Extension ${difference} declared as a supported extension, but not found as an implemented extension`);
		}
	}

	assert.equal(differencesInExtensions.size, 0);
});

test('corrupt MKV returns undefined', async () => {
	const filePath = path.join(__dirname, 'fixture/fixture-corrupt.mkv');
	const type = await fileTypeFromFile(filePath);
	assert.equal(type, undefined);
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

test('fileTypeFromBlob should detect custom file type "unicorn" using custom detectors', async () => {
	// Set up the "unicorn" file content
	const header = 'UNICORN FILE\n';
	const blob = new Blob([header]);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBlob(blob);
	assert.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromBlob should keep detecting default file types when no custom detector matches', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const chunk = fs.readFileSync(file);
	const blob = new Blob([chunk]);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBlob(blob);
	assert.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromBlob should allow overriding default file type detectors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const chunk = fs.readFileSync(file);
	const blob = new Blob([chunk]);

	const customDetectors = [mockPngDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBlob(blob);
	assert.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('fileTypeFromBuffer should detect custom file type "unicorn" using custom detectors', async () => {
	const header = 'UNICORN FILE\n';
	const uint8ArrayContent = new TextEncoder().encode(header);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	assert.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromBuffer should keep detecting default file types when no custom detector matches', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const uint8ArrayContent = fs.readFileSync(file);

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	assert.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromBuffer should allow overriding default file type detectors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const uint8ArrayContent = fs.readFileSync(file);

	const customDetectors = [mockPngDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromBuffer(uint8ArrayContent);
	assert.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('fileTypeFromBuffer keeps detecting MP3 from a sampled prefix with ID3 data', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.mp3');
	const prefix = fs.readFileSync(file).subarray(0, 32);

	const result = await fileTypeFromBuffer(prefix);
	assert.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'});
});

test('fileTypeFromBuffer keeps detecting PNG from a short valid prefix', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const prefix = fs.readFileSync(file).subarray(0, 16);

	const result = await fileTypeFromBuffer(prefix);
	assert.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromBuffer falls back to generic ASF for a short valid prefix', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.asf');
	const prefix = fs.readFileSync(file).subarray(0, 64);

	const result = await fileTypeFromBuffer(prefix);
	assert.deepEqual(result, {ext: 'asf', mime: 'application/vnd.ms-asf'});
});

function createCustomReadableStream() {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('UNICORN'));
			controller.close();
		},
	});
}

test('fileTypeFromStream should detect custom file type "unicorn" using custom detectors', async () => {
	const readableStream = createCustomReadableStream();

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	assert.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromStream should keep detecting default file types when no custom detector matches', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const readableStream = new Blob([fs.readFileSync(file)]).stream();

	const customDetectors = [unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	assert.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromStream should allow overriding default file type detectors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const readableStream = new Blob([fs.readFileSync(file)]).stream();

	const customDetectors = [mockPngDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromStream(readableStream);
	assert.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('fileTypeFromStream should return undefined on malformed object-mode stream input', async () => {
	// This payload deterministically triggered `RangeError: offset is out of bounds` before hardening.
	const malformedChunk = Buffer.from('969c0e7833211bc4d4db0530eab780406fe889490c1e212bb1e4948f39bc4b4b8d', 'hex');
	const readableStream = new ReadableStream({
		start(controller) {
			controller.enqueue(malformedChunk.subarray(0, 16));
			controller.enqueue(malformedChunk.subarray(16));
			controller.close();
		},
	});

	const result = await fileTypeFromStream(readableStream);
	assert.equal(result, undefined);
});

test('fileTypeFromFile should detect custom file type "unicorn" using custom detectors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.unicorn');

	const customDetectors = [unicornDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	assert.deepEqual(result, {ext: 'unicorn', mime: 'application/unicorn'});
});

test('fileTypeFromFile should keep detecting default file types when no custom detector matches', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');

	const customDetectors = [unicornDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	assert.deepEqual(result, {ext: 'png', mime: 'image/png'});
});

test('fileTypeFromFile should allow overriding default file type detectors', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');

	const customDetectors = [mockPngDetector];

	const result = await fileTypeFromFile(file, {customDetectors});
	assert.deepEqual(result, {ext: 'mockPng', mime: 'image/mockPng'});
});

test('browser bundlers can bundle the main entry without resolving Node-only fromFile imports', async () => {
	const result = await esbuild.build({
		bundle: true,
		format: 'esm',
		platform: 'browser',
		write: false,
		stdin: {
			contents: `
				import {fileTypeFromBuffer} from 'file-type';

				console.log(typeof fileTypeFromBuffer);
			`,
			resolveDir: __dirname,
			sourcefile: 'esbuild-entry.js',
		},
	});

	assert.equal(result.errors.length, 0);
	assert.ok(result.outputFiles[0].text.includes('fileTypeFromBuffer'));

	// Vite prebundles dependencies with esbuild, so the ignore comments must survive bundling to suppress its import-analysis warning.
	assert.ok(result.outputFiles[0].text.includes('/* @vite-ignore */'));
	assert.ok(result.outputFiles[0].text.includes('/* webpackIgnore: true */'));
});

test('fileTypeFromTokenizer should return undefined when a custom detector changes the tokenizer position and does not return a file type', async () => {
	const header = 'UNICORN FILE\n';
	const uint8ArrayContent = new TextEncoder().encode(header);

	// Include the unicornDetector here to verify it's not used after the tokenizer.position changed
	const customDetectors = [tokenizerPositionChanger, unicornDetector];
	const parser = new FileTypeParser({customDetectors});

	const result = await parser.fromTokenizer(strtok3.fromBuffer(uint8ArrayContent));
	assert.equal(result, undefined);
});

test('fileTypeFromTokenizer should close the tokenizer it consumes', async () => {
	const tokenizer = await fromFile(path.join(__dirname, 'fixture', 'fixture.jpg'));

	const result = await fileTypeFromTokenizer(tokenizer);

	assert.deepEqual(result, {
		ext: 'jpg',
		mime: 'image/jpeg',
	});
	assert.equal(tokenizer.fileHandle.fd, -1);
});

test('FileTypeParser.fromTokenizer should close the tokenizer it consumes', async () => {
	const tokenizer = await fromFile(path.join(__dirname, 'fixture', 'fixture.jpg'));

	const result = await new FileTypeParser().fromTokenizer(tokenizer);

	assert.deepEqual(result, {
		ext: 'jpg',
		mime: 'image/jpeg',
	});
	assert.equal(tokenizer.fileHandle.fd, -1);
});

test('should detect MPEG frame which is out of sync with the mpegOffsetTolerance option', async () => {
	const badOffset1Path = path.join(__dirname, 'fixture', 'fixture-bad-offset.mp3');
	const badOffset10Path = path.join(__dirname, 'fixture', 'fixture-bad-offset-10.mp3');

	let result = await fileTypeFromFile(badOffset1Path);
	assert.equal(result, undefined, 'does not detect an MP3 which 1 byte out-sync, with default value mpegOffsetTolerance=0');

	result = await fileTypeFromFile(badOffset1Path, {mpegOffsetTolerance: 1});
	assert.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'}, 'detect an MP3 which 1 byte out of sync');

	result = await fileTypeFromFile(badOffset10Path);
	assert.equal(result, undefined, 'does not detect an MP3 which 10 bytes out of sync, with default value mpegOffsetTolerance=0');

	result = await fileTypeFromFile(badOffset10Path, {mpegOffsetTolerance: 10});
	assert.deepEqual(result, {ext: 'mp3', mime: 'audio/mpeg'}, 'detect an MP3 which 1 byte out of sync');
});

test('should not detect UTF-16 LE text as MPEG audio', async () => {
	assert.equal(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFE])), undefined, 'a lone UTF-16 LE BOM');
	assert.equal(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFE, 0x74, 0x00, 0x65, 0x00, 0x78, 0x00, 0x74, 0x00])), undefined, 'UTF-16 LE text with a BOM');
});

test('should not detect UTF-16 LE text as MPEG audio at a tolerated offset', async () => {
	const buffer = new Uint8Array([0x00, 0xFF, 0xFE, 0x74, 0x00, 0x65, 0x00, 0x78, 0x00, 0x74, 0x00]);
	assert.equal(await fileTypeFromBuffer(buffer, {mpegOffsetTolerance: 1}), undefined, 'UTF-16 LE BOM 1 byte out of sync');
});

test('should detect an MPEG frame at the deepest tolerated offset', async () => {
	const buffer = new Uint8Array(reasonableDetectionSizeInBytes);
	buffer.set([0xFF, 0xFB, 0x90, 0x00], 4096); // MPEG-1 Layer 3, 128 kbps, 44.1 kHz
	assert.deepEqual(await fileTypeFromBuffer(buffer, {mpegOffsetTolerance: Number.MAX_SAFE_INTEGER}), {ext: 'mp3', mime: 'audio/mpeg'});
});

test('should not detect MPEG audio with reserved header fields', async () => {
	assert.equal(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFB, 0xF0, 0x00])), undefined, 'bad bitrate index');
	assert.equal(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFB, 0x9C, 0x00])), undefined, 'reserved sampling frequency');
	assert.equal(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xEB, 0x90, 0x00])), undefined, 'reserved MPEG version');
});

test('should detect free-format MPEG audio', async () => {
	assert.deepEqual(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFF, 0x00, 0x00])), {ext: 'mp1', mime: 'audio/mpeg'});
	assert.deepEqual(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFD, 0x00, 0x00])), {ext: 'mp2', mime: 'audio/mpeg'});
	assert.deepEqual(await fileTypeFromBuffer(new Uint8Array([0xFF, 0xFB, 0x00, 0x00])), {ext: 'mp3', mime: 'audio/mpeg'});
});

test('FileTypeParser clamps mpegOffsetTolerance to a safe value', () => {
	const parser = new FileTypeParser({mpegOffsetTolerance: Number.MAX_SAFE_INTEGER});
	assert.equal(parser.options.mpegOffsetTolerance, 4096);
});

function loopEncoding(stringValue, encoding) {
	assert.deepEqual(new TextDecoder(encoding).decode(new Uint8Array(stringToBytes(stringValue, encoding))), stringValue, `Ensure consistency with TextDecoder with encoding ${encoding}`);
}

test('stringToBytes encodes correctly for selected characters and encodings', () => {
	// Default encoding: basic ASCII
	assert.deepEqual(
		stringToBytes('ABC'),
		[65, 66, 67],
		'should encode ASCII correctly using default encoding',
	);

	// UTF-16LE with character above 0xFF
	assert.deepEqual(
		stringToBytes('ꟻ', 'utf-16le'),
		[0xFB, 0xA7],
		'should encode U+A7FB correctly in utf-16le',
	);

	// UTF-16BE with character above 0xFF
	assert.deepEqual(
		stringToBytes('ꟻ', 'utf-16be'),
		[0xA7, 0xFB],
		'should encode U+A7FB correctly in utf-16be',
	);

	// UTF-16LE with surrogate pair (🦄)
	assert.deepEqual(
		stringToBytes('🦄', 'utf-16le'),
		[0x3E, 0xD8, 0x84, 0xDD],
		'should encode 🦄 (U+1F984) correctly in utf-16le',
	);

	// UTF-16BE with surrogate pair (🦄)
	assert.deepEqual(
		stringToBytes('🦄', 'utf-16be'),
		[0xD8, 0x3E, 0xDD, 0x84],
		'should encode 🦄 (U+1F984) correctly in utf-16be',
	);

	loopEncoding('🦄', 'utf-16le');
	loopEncoding('🦄', 'utf-16be');

	assert.equal(new TextDecoder('utf-16be').decode(new Uint8Array(stringToBytes('🦄', 'utf-16be'))), '🦄', 'Decoded value should match original value');
});

test('Does not hang on crafted ASF file with zero-size sub-header', async () => {
	const buffer = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	await assertUndefinedTypeFromBuffer(buffer);
});

test('Does not throw on malformed ASF stream with zero-size sub-header', async () => {
	const buffer = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	await assertUndefinedTypeFromChunkedStream(buffer);
});

test('Does not throw on malformed ASF stream with oversized sub-header', async () => {
	const buffer = Buffer.alloc(80);
	buffer.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	buffer.fill(0xFF, 46, 54);
	await assertUndefinedTypeFromChunkedStream(buffer);
});

test('Does not classify malformed ASF streams with non-zero oversized sub-header objects', async () => {
	const buffer = Buffer.alloc(80);
	buffer.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	buffer.set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10], 30);
	buffer.fill(0xFF, 46, 54);
	await assertUndefinedTypeFromChunkedStream(buffer);
});

test('Does not classify malformed PNG streams with invalid IHDR before an oversized ancillary chunk', async () => {
	const buffer = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
		Buffer.from(createPngChunk('IHDR')),
		Buffer.from(createPngChunk('tEXt', new Uint8Array(maximumStreamPayloadProbeSizeInBytes + 1))),
	]);
	await assertUndefinedTypeFromChunkedStream(buffer);
});

test('Malformed hardening corpus stays stable under hostile stream chunking', async () => {
	const malformedAsfZeroSize = Buffer.from('3026b2758e66cf11a6d9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex');
	const malformedAsfOversized = Buffer.alloc(80);
	malformedAsfOversized.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	malformedAsfOversized.fill(0xFF, 46, 54);
	const malformedAsfNonZeroOversized = Buffer.alloc(80);
	malformedAsfNonZeroOversized.set([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9]);
	malformedAsfNonZeroOversized.set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10], 30);
	malformedAsfNonZeroOversized.fill(0xFF, 46, 54);
	const malformedId3 = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x7F, 0x7F, 0x7F, 0x7F]);
	const malformedPng = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x7F, 0xFF, 0xFF, 0xFF, 0x7A, 0x7A, 0x7A, 0x7A]);
	const malformedPngInvalidIhdr = Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
		Buffer.from(createPngChunk('IHDR')),
		Buffer.from(createPngChunk('tEXt', new Uint8Array(maximumStreamPayloadProbeSizeInBytes + 1))),
	]);
	const malformedTiff = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	const malformedEbml = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x8A, 0x42, 0x83, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);

	await assertUndefinedTypeFromHostileStreams(malformedAsfZeroSize, 'malformed ASF zero-size sub-header');
	await assertUndefinedTypeFromHostileStreams(malformedAsfOversized, 'malformed ASF oversized sub-header');
	await assertUndefinedTypeFromHostileStreams(malformedAsfNonZeroOversized, 'malformed ASF non-zero oversized sub-header');
	await assertUndefinedTypeFromHostileStreams(malformedId3, 'malformed ID3 oversized header');
	await assertUndefinedTypeFromHostileStreams(malformedPng, 'malformed PNG oversized chunk');
	await assertUndefinedTypeFromHostileStreams(malformedPngInvalidIhdr, 'malformed PNG invalid IHDR before oversized chunk');
	await assertUndefinedTypeFromHostileStreams(malformedEbml, 'malformed EBML oversized child');

	for (const chunkPattern of hostileChunkPatterns) {
		const type = await fileTypeFromStream(createPatternWebStream(malformedTiff, chunkPattern).stream);
		assert.deepEqual(type, {
			ext: 'tif',
			mime: 'image/tiff',
		}, `malformed TIFF oversized offset with chunk pattern ${chunkPattern.join(',')}`);
	}
});

test('Keeps UTF-8 BOM re-entry bounded', async () => {
	const maximumDetectionReentryCount = 256;
	const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
	const xml = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
	const supportedPayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount}, () => bom),
		xml,
	]);
	const excessivePayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => bom),
		xml,
	]);

	assert.deepEqual(await fileTypeFromBuffer(supportedPayload), {
		ext: 'xml',
		mime: 'application/xml',
	});
	assert.equal(await fileTypeFromBuffer(excessivePayload), undefined);
});

test('Keeps zero-length ID3 re-entry bounded', async () => {
	const maximumDetectionReentryCount = 256;
	const zeroLengthId3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	const mpegFrame = Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
	const supportedPayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount}, () => zeroLengthId3Header),
		mpegFrame,
	]);
	const excessivePayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => zeroLengthId3Header),
		mpegFrame,
	]);

	assert.deepEqual(await fileTypeFromBuffer(supportedPayload), {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
	assert.equal(await fileTypeFromBuffer(excessivePayload), undefined);
});

test('Keeps UTF-8 BOM stream re-entry bounded', async () => {
	const maximumDetectionReentryCount = 256;
	const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
	const xml = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
	const excessivePayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => bom),
		xml,
	]);
	const {state, stream} = createPatternWebStream(excessivePayload, [1]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= ((maximumDetectionReentryCount + 1) * bom.length) + 32);
});

test('Keeps zero-length ID3 stream re-entry bounded', async () => {
	const maximumDetectionReentryCount = 256;
	const zeroLengthId3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	const mpegFrame = Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
	const excessivePayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => zeroLengthId3Header),
		mpegFrame,
	]);
	const {state, stream} = createPatternWebStream(excessivePayload, [1]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= ((maximumDetectionReentryCount + 1) * zeroLengthId3Header.length) + 32);
});

test('FileTypeParser resets re-entry count between calls', async () => {
	const maximumDetectionReentryCount = 256;
	const parser = new FileTypeParser();
	const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
	const xml = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
	const excessiveBomPayload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => bom),
		xml,
	]);
	const zeroLengthId3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
	const mpegFrame = Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);
	const excessiveId3Payload = Buffer.concat([
		...Array.from({length: maximumDetectionReentryCount + 1}, () => zeroLengthId3Header),
		mpegFrame,
	]);

	assert.equal(await parser.fromBuffer(excessiveBomPayload), undefined);
	assert.deepEqual(await parser.fromBuffer(xml), {
		ext: 'xml',
		mime: 'application/xml',
	});
	assert.equal(await parser.fromBuffer(excessiveId3Payload), undefined);
	assert.deepEqual(await parser.fromBuffer(mpegFrame), {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
});

test('Scans known-size ASF buffers beyond the stream safety window', async () => {
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
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(buffer, 32));
	assert.deepEqual(streamType, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Scans many ASF header objects for known-size buffers', async () => {
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
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Scans ASF stream properties at the header object limit', async () => {
	const type = await fileTypeFromBuffer(createAsfAudioHeaderWithMetadataObjects(511));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('fileTypeFromFile scans ASF stream properties at the header object limit', async () => {
	const filePath = await createTemporaryTestFile(createAsfAudioHeaderWithMetadataObjects(511), 'asf');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('fileTypeFromBlob scans ASF stream properties at the header object limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createAsfAudioHeaderWithMetadataObjects(511)]));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Detects ASF video when stream properties appear at the header object limit', async () => {
	const type = await fileTypeFromBuffer(createAsfVideoHeaderWithMetadataObjects(511));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('fileTypeFromFile detects ASF video when stream properties appear at the header object limit', async () => {
	const filePath = await createTemporaryTestFile(createAsfVideoHeaderWithMetadataObjects(511), 'asf');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('fileTypeFromBlob detects ASF video when stream properties appear at the header object limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createAsfVideoHeaderWithMetadataObjects(511)]));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('Falls back to generic ASF when an unknown stream type appears at the header object limit', async () => {
	const type = await fileTypeFromBuffer(createAsfUnknownStreamHeaderWithMetadataObjects(511));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('fileTypeFromFile falls back to generic ASF when an unknown stream type appears at the header object limit', async () => {
	const filePath = await createTemporaryTestFile(createAsfUnknownStreamHeaderWithMetadataObjects(511), 'asf');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('fileTypeFromBlob falls back to generic ASF when an unknown stream type appears at the header object limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createAsfUnknownStreamHeaderWithMetadataObjects(511)]));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Falls back to generic ASF when stream properties appear after the header object limit', async () => {
	const type = await fileTypeFromBuffer(createAsfAudioHeaderWithMetadataObjects(512));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('fileTypeFromFile falls back to generic ASF when stream properties appear after the header object limit', async () => {
	const filePath = await createTemporaryTestFile(createAsfAudioHeaderWithMetadataObjects(512), 'asf');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('fileTypeFromBlob falls back to generic ASF when stream properties appear after the header object limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createAsfAudioHeaderWithMetadataObjects(512)]));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Streamed ASF detection keeps scanning at the header object limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithMetadataObjects(511), 17));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Streamed ASF detection keeps scanning at the header object limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithMetadataObjects(511), 1));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Web Stream ASF detection keeps scanning at the header object limit', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithMetadataObjects(511), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Web Stream ASF detection keeps scanning at the header object limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithMetadataObjects(511), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Streamed ASF video detection keeps scanning at the header object limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfVideoHeaderWithMetadataObjects(511), 17));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('Streamed ASF video detection keeps scanning at the header object limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfVideoHeaderWithMetadataObjects(511), 1));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('Web Stream ASF video detection keeps scanning at the header object limit', async () => {
	const {stream} = createPatternWebStream(createAsfVideoHeaderWithMetadataObjects(511), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('Web Stream ASF video detection keeps scanning at the header object limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createAsfVideoHeaderWithMetadataObjects(511), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'video/x-ms-asf',
	});
});

test('Streamed ASF detection falls back to generic ASF for an unknown stream type at the header object limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfUnknownStreamHeaderWithMetadataObjects(511), 17));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Streamed ASF detection falls back to generic ASF for an unknown stream type at the header object limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfUnknownStreamHeaderWithMetadataObjects(511), 1));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Web Stream ASF detection falls back to generic ASF for an unknown stream type at the header object limit', async () => {
	const {stream} = createPatternWebStream(createAsfUnknownStreamHeaderWithMetadataObjects(511), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Web Stream ASF detection falls back to generic ASF for an unknown stream type at the header object limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createAsfUnknownStreamHeaderWithMetadataObjects(511), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Streamed ASF detection falls back after the header object limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithMetadataObjects(512), 17));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Streamed ASF detection falls back after the header object limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithMetadataObjects(512), 1));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Web Stream ASF detection falls back after the header object limit', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithMetadataObjects(512), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Web Stream ASF detection falls back after the header object limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithMetadataObjects(512), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	});
});

test('Scans many ASF header objects for streamed inputs', async () => {
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

	const type = await fileTypeFromStream(createBufferedWebStream(buffer, 32));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('fileTypeFromBuffer still detects ASF when header payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromBuffer(createAsfAudioHeaderWithUnknownPayload(maximumStreamPayloadProbeSizeInBytes + 1));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Streamed ASF detection keeps scanning when header payload is exactly at the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithUnknownPayload(maximumStreamPayloadProbeSizeInBytes), 1024));
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Web Stream ASF detection keeps scanning when header payload is exactly at the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithUnknownPayload(maximumStreamPayloadProbeSizeInBytes), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'asf',
		mime: 'audio/x-ms-asf',
	});
});

test('Streamed ASF detection stays undefined when header payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithUnknownPayload(maximumStreamPayloadProbeSizeInBytes + 1), 1024));
	assert.equal(type, undefined);
});

test('Web Stream ASF detection stays undefined when header payload exceeds the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithUnknownPayload(maximumStreamPayloadProbeSizeInBytes + 1), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
});

test('Streamed ASF detection stays undefined when a header extension payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createAsfAudioHeaderWithHeaderExtensionPayload(maximumStreamPayloadProbeSizeInBytes + 1), 1024));
	assert.equal(type, undefined);
});

test('Web Stream ASF detection stays undefined when a header extension payload exceeds the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createAsfAudioHeaderWithHeaderExtensionPayload(maximumStreamPayloadProbeSizeInBytes + 1), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
});

test('Does not throw on malformed ID3 stream with oversized header length', async () => {
	const buffer = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x7F, 0x7F, 0x7F, 0x7F]);
	await assertUndefinedTypeFromChunkedStream(buffer);
});

test('Allows large ID3 headers for known-size buffers but keeps stream probing bounded', async () => {
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
	assert.deepEqual(bufferType, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});

	await assertUndefinedTypeFromChunkedStream(payload);
});

test('Oversized ID3 web stream keeps hostile reads bounded', async () => {
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
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= 40);
});

test('Repeated non-zero ID3 chunked stream probing stays cumulatively bounded', async () => {
	const maximumId3HeaderSizeInBytes = 16 * 1024 * 1024;
	const chunkSize = 64 * 1024;
	const payload = createRepeatedId3Payload(80, 256 * 1024);
	const {state, stream} = createPatternWebStream(payload, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= maximumId3HeaderSizeInBytes + chunkSize);
});

test('Repeated non-zero ID3 Web stream probing stays cumulatively bounded', async () => {
	const maximumId3HeaderSizeInBytes = 16 * 1024 * 1024;
	const chunkSize = 64 * 1024;
	const payload = createRepeatedId3Payload(80, 256 * 1024);
	const {state, stream} = createPatternWebStream(payload, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= maximumId3HeaderSizeInBytes + chunkSize);
});

test('Repeated non-zero ID3 chunked streams still detect MP3 below the cumulative limit', async () => {
	const payload = Buffer.concat([
		Buffer.from(createRepeatedId3Payload(8, 64 * 1024)),
		Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]),
	]);
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1024));

	assert.deepEqual(type, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
});

test('Repeated non-zero ID3 Web streams still detect MP3 below the cumulative limit', async () => {
	const payload = Buffer.concat([
		Buffer.from(createRepeatedId3Payload(8, 64 * 1024)),
		Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]),
	]);
	const {stream} = createPatternWebStream(payload, [1024]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.deepEqual(type, {
		ext: 'mp3',
		mime: 'audio/mpeg',
	});
});

test('Repeated unknown EBML chunked stream probing stays cumulatively bounded', async () => {
	const maximumEbmlScanBudgetInBytes = 16 * 1024 * 1024;
	const chunkSize = 64 * 1024;
	const payload = createEbmlWithRepeatedUnknownChildren(17, 1024 * 1024);
	const {state, stream} = createPatternWebStream(payload, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= maximumEbmlScanBudgetInBytes + (5 * chunkSize));
});

test('Repeated unknown EBML Web stream probing stays cumulatively bounded', async () => {
	const maximumEbmlScanBudgetInBytes = 16 * 1024 * 1024;
	const chunkSize = 64 * 1024;
	const payload = createEbmlWithRepeatedUnknownChildren(17, 1024 * 1024);
	const {state, stream} = createPatternWebStream(payload, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
	assert.ok(state.emittedBytes <= maximumEbmlScanBudgetInBytes + (5 * chunkSize));
});

test('Repeated unknown EBML chunked streams still detect WebM below the cumulative limit', async () => {
	const payload = createEbmlWithRepeatedUnknownChildren(8, 64 * 1024, 'webm');
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1024));

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('Repeated unknown EBML Web streams still detect WebM below the cumulative limit', async () => {
	const payload = createEbmlWithRepeatedUnknownChildren(8, 64 * 1024, 'webm');
	const {stream} = createPatternWebStream(payload, [1024]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('EBML chunked streams still detect WebM when document type is exactly at the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'webm');
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1024));

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('EBML Web streams still detect WebM when document type is exactly at the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'webm');
	const {stream} = createPatternWebStream(payload, [1024]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('EBML chunked streams stop before document type when it first appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1024));

	assert.equal(type, undefined);
});

test('EBML Web streams stop before document type when it first appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');
	const {stream} = createPatternWebStream(payload, [1024]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.equal(type, undefined);
});

test('EBML chunked streams with small chunks still detect Matroska when document type is exactly at the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'matroska');
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1));

	assert.deepEqual(type, {
		ext: 'mkv',
		mime: 'video/matroska',
	});
});

test('EBML Web streams with small chunks still detect Matroska when document type is exactly at the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'matroska');
	const {stream} = createPatternWebStream(payload, [1]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.deepEqual(type, {
		ext: 'mkv',
		mime: 'video/matroska',
	});
});

test('EBML chunked streams with small chunks stop before Matroska when document type first appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');
	const type = await fileTypeFromStream(createBufferedWebStream(payload, 1));

	assert.equal(type, undefined);
});

test('EBML Web streams with small chunks stop before Matroska when document type first appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');
	const {stream} = createPatternWebStream(payload, [1]);
	const type = await new FileTypeParser().fromStream(stream);

	assert.equal(type, undefined);
});

test('.fileTypeStream() detects WebM when the EBML document type is exactly at the stream payload probe limit for chunked streams with a large sampleSize', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'webm');

	await assertFileTypeStreamChunkedResult(payload, {
		ext: 'webm',
		mime: 'video/webm',
	}, {sampleSize: payload.length});
});

test('.fileTypeStream() detects WebM when the EBML document type is exactly at the stream payload probe limit for Web Streams with a large sampleSize', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'webm');

	await assertFileTypeStreamWebResult(payload, {
		ext: 'webm',
		mime: 'video/webm',
	}, {sampleSize: payload.length});
});

test('.fileTypeStream() falls back when the EBML document type appears after the default sampleSize for chunked streams', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');

	await assertFileTypeStreamChunkedResult(payload, undefined);
});

test('.fileTypeStream() falls back when the EBML document type appears after the default sampleSize for Web Streams', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');

	await assertFileTypeStreamWebResult(payload, undefined);
});

test('.fileTypeStream() detects Matroska when the EBML document type is exactly at the stream payload probe limit for chunked streams with small chunks and a large sampleSize', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'matroska');

	await assertFileTypeStreamChunkedResult(payload, {
		ext: 'mkv',
		mime: 'video/matroska',
	}, {
		chunkSize: 256,
		sampleSize: payload.length,
	});
});

test('.fileTypeStream() detects Matroska when the EBML document type is exactly at the stream payload probe limit for Web Streams with a large sampleSize', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes, 'matroska');

	await assertFileTypeStreamWebResult(payload, {
		ext: 'mkv',
		mime: 'video/matroska',
	}, {sampleSize: payload.length});
});

test('.fileTypeStream() falls back when the Matroska document type appears after the default sampleSize for chunked streams', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');

	await assertFileTypeStreamChunkedResult(payload, undefined);
});

test('.fileTypeStream() falls back when the Matroska document type appears after the default sampleSize for Web Streams', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');

	await assertFileTypeStreamWebResult(payload, undefined);
});

test('fileTypeFromBuffer still detects WebM when the EBML document type appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');
	const type = await fileTypeFromBuffer(payload);

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('fileTypeFromBlob still detects WebM when the EBML document type appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'webm');
	const type = await fileTypeFromBlob(new Blob([payload]));

	assert.deepEqual(type, {
		ext: 'webm',
		mime: 'video/webm',
	});
});

test('fileTypeFromFile still detects Matroska when the EBML document type appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');
	const filePath = await createTemporaryTestFile(payload);
	const type = await fileTypeFromFile(filePath);

	assert.deepEqual(type, {
		ext: 'mkv',
		mime: 'video/matroska',
	});
});

test('fileTypeFromBuffer still detects Matroska when the EBML document type appears after the stream payload probe limit', async () => {
	const payload = createEbmlWithUnknownPayloadBeforeDocumentType(maximumStreamPayloadProbeSizeInBytes + 1, 'matroska');
	const type = await fileTypeFromBuffer(payload);

	assert.deepEqual(type, {
		ext: 'mkv',
		mime: 'video/matroska',
	});
});

test('fileTypeFromFile returns undefined for FIFOs without blocking', async () => {
	if (process.platform === 'win32') {
		return;
	}

	const filePath = await createTemporaryFifo();
	const script = `
		import {fileTypeFromFile} from ${JSON.stringify(new URL('source/index.js', import.meta.url).href)};
		const type = await fileTypeFromFile(${JSON.stringify(filePath)});
		console.log(String(JSON.stringify(type)));
	`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
		timeout: 1500,
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), 'undefined');
});

test('fileTypeFromFile returns undefined when the path becomes a FIFO before open', async () => {
	if (process.platform === 'win32') {
		return;
	}

	const temporaryDirectory = await createTemporaryDirectory();
	const regularPath = path.join(temporaryDirectory, 'regular.jpg');
	const fifoPath = path.join(temporaryDirectory, 'fifo');
	const linkPath = path.join(temporaryDirectory, 'link');
	await fs.promises.writeFile(regularPath, Buffer.from([0xFF, 0xD8, 0xFF, 0x00]));
	const mkfifoResult = spawnSync('mkfifo', [fifoPath]);
	if (mkfifoResult.status !== 0) {
		throw new Error(`mkfifo failed: ${mkfifoResult.stderr.toString()}`);
	}

	await fs.promises.symlink(regularPath, linkPath);
	const script = `
		import fs from 'node:fs/promises';
		const originalOpen = fs.open.bind(fs);
		const linkPath = ${JSON.stringify(linkPath)};
		const fifoPath = ${JSON.stringify(fifoPath)};
		fs.open = async (...arguments_) => {
			await fs.unlink(linkPath);
			await fs.symlink(fifoPath, linkPath);
			return originalOpen(...arguments_);
		};
		const {fileTypeFromFile} = await import(${JSON.stringify(new URL('source/index.js', import.meta.url).href)});
		const type = await fileTypeFromFile(linkPath);
		console.log(String(JSON.stringify(type)));
	`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
		timeout: 1500,
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.equal(result.stdout.trim(), 'undefined');
});

test('Does not throw on malformed PNG stream with oversized chunk length', async () => {
	const bytes = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x7F, 0xFF, 0xFF, 0xFF, 0x7A, 0x7A, 0x7A, 0x7A]);
	await assertUndefinedTypeFromChunkedStream(bytes);
});

test('Does not throw on malformed TIFF with oversized IFD offset', async () => {
	const bytes = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	await assertUndefinedTypeFromBuffer(bytes);
});

test('Does not throw on malformed TIFF stream with oversized IFD offset', async () => {
	const bytes = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
	const type = await fileTypeFromStream(createBufferedWebStream(bytes, 8));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Does not crash or hang if provided with a partial gunzip file', async () => {
	const buffer = Uint8Array.from([31, 139, 8, 8, 137, 83, 29, 82, 0, 11]);
	const type = await fileTypeFromBuffer(buffer);

	assert.deepEqual(type, {
		ext: 'gz',
		mime: 'application/gzip',
	});
});

test('OOXML type detection is not affected by ZIP entry order', async () => {
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
	assert.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(orderedZip, 16));
	assert.deepEqual(streamType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('OOXML directory heuristic detects docx when [Content_Types].xml is beyond the stream sample', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new Uint8Array(reasonableDetectionSizeInBytes),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
	});
	const zip = Buffer.concat([wordEntry, contentTypesEntry]);

	// Full buffer: [Content_Types].xml is reachable, gives precise type
	const bufferType = await fileTypeFromBuffer(zip);
	assert.deepEqual(bufferType, {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});

	// Truncated stream: [Content_Types].xml is beyond the sample, falls back to directory heuristic
	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
});

test('OOXML directory heuristic detects pptx when [Content_Types].xml is beyond the stream sample', async () => {
	const pptEntry = createZipLocalFile({
		filename: 'ppt/presentation.xml',
		compressedData: new Uint8Array(reasonableDetectionSizeInBytes),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'),
	});
	const zip = Buffer.concat([pptEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'pptx',
		mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: 'pptx',
		mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	});
});

test('OOXML directory heuristic detects xlsx when [Content_Types].xml is beyond the stream sample', async () => {
	const xlEntry = createZipLocalFile({
		filename: 'xl/workbook.xml',
		compressedData: new Uint8Array(reasonableDetectionSizeInBytes),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>'),
	});
	const zip = Buffer.concat([xlEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'xlsx',
		mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: 'xlsx',
		mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
});

test('OOXML directory heuristic detects 3mf when [Content_Types].xml is beyond the stream sample', async () => {
	const modelEntry = createZipLocalFile({
		filename: '3D/3dmodel.model',
		compressedData: new Uint8Array(reasonableDetectionSizeInBytes),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
	});
	const zip = Buffer.concat([modelEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: '3mf',
		mime: 'model/3mf',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: '3mf',
		mime: 'model/3mf',
	});
});

// Each of the three archives below declares a macro-enabled content type, which is a type the
// directory names cannot produce. Detecting the base type is what proves the directory name answered
// rather than the entry.
test('OOXML directory heuristic detects docx when [Content_Types].xml is beyond the ZIP descriptor scan budget', async () => {
	const zip = createStreamedOoxmlZipBeyondScanBudget('word/document.xml', descriptorBoundaryContentTypesXml);

	await assertFileTypeFromAllDirectInputs(zip, {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
});

test('OOXML directory heuristic detects xlsx when [Content_Types].xml is beyond the ZIP descriptor scan budget', async () => {
	const zip = createStreamedOoxmlZipBeyondScanBudget('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-excel.sheet.macroenabled.main+xml"/></Types>');

	await assertFileTypeFromAllDirectInputs(zip, {
		ext: 'xlsx',
		mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
});

test('OOXML directory heuristic detects pptx when [Content_Types].xml is beyond the ZIP descriptor scan budget', async () => {
	const zip = createStreamedOoxmlZipBeyondScanBudget('ppt/presentation.xml', '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-powerpoint.presentation.macroenabled.main+xml"/></Types>');

	await assertFileTypeFromAllDirectInputs(zip, {
		ext: 'pptx',
		mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	});
});

test('Reads [Content_Types].xml rather than guessing when a streamed entry stays inside the ZIP descriptor scan budget', async () => {
	const zip = Buffer.concat([
		createZipDataDescriptorFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<part/>'),
		}),
		createZipDataDescriptorFile({
			filename: 'docProps/thumbnail.bin',
			compressedData: Buffer.alloc(64 * 1024),
		}),
		createZipDataDescriptorFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), descriptorBoundaryDocmFileType);
});

// An entry that declares its size is skipped rather than scanned for, so it aborts on a different
// limit — but abandoning the entry leaves us knowing exactly as much, and the guess still applies.
test('OOXML directory heuristic detects docx when a declared entry size is too large for a stream to skip', async () => {
	const zip = Buffer.concat([
		createZipLocalFile({
			filename: 'word/document.xml',
			compressedData: new TextEncoder().encode('<part/>'),
		}),
		createZipLocalFile({
			filename: 'docProps/thumbnail.bin',
			compressedData: Buffer.alloc(maximumZipDescriptorScanSizeInBytes + (64 * 1024)),
		}),
		createZipLocalFile({
			filename: '[Content_Types].xml',
			compressedData: new TextEncoder().encode(descriptorBoundaryContentTypesXml),
		}),
	]);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
	// A known size is skipped without a budget, so the seekable APIs still read the entry itself.
	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
});

test('OOXML directory heuristic detects docx when the ZIP archive scan ceiling is reached', async () => {
	const zip = createStreamedZipBeyondScanCeiling('word/document.xml');

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
});

test('Falls back to zip when the ZIP archive scan ceiling is reached and no OOXML directory was seen', async () => {
	const zip = createStreamedZipBeyondScanCeiling('notes/note.xml');

	assertZipFileType(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)));
});

test('Falls back to zip when [Content_Types].xml is beyond the ZIP descriptor scan budget and no OOXML directory was seen', async () => {
	const zip = createStreamedOoxmlZipBeyondScanBudget('notes/note.xml', descriptorBoundaryContentTypesXml);

	await assertZipTypeFromAllDirectInputs(zip);
});

test('iWork: detects Keynote (.key)', async () => {
	const expected = {ext: 'key', mime: 'application/vnd.apple.keynote'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/MasterSlide.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('iWork: detects Keynote (.key) with numbered MasterSlide', async () => {
	const expected = {ext: 'key', mime: 'application/vnd.apple.keynote'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/MasterSlide-2.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('iWork: streamed detection falls back to zip when only Index/Document.iwa is visible within the default sample size', async () => {
	const expected = {ext: 'key', mime: 'application/vnd.apple.keynote'};
	const zip = createZipArchive([
		{
			filename: 'Index/Document.iwa',
			compressedData: new Uint8Array(5000),
		},
		{
			filename: 'Index/MasterSlide.iwa',
		},
	]);

	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), expected);
	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('iWork: streamed detection falls back to zip when a non-diagnostic entry appears before the real Keynote marker', async () => {
	const expected = {ext: 'key', mime: 'application/vnd.apple.keynote'};
	const zip = createZipArchive([
		{filename: 'Index/Document.iwa'},
		{filename: 'Metadata/DocumentIdentifier'},
		{
			filename: 'Index/SharedStrings.iwa',
			compressedData: new Uint8Array(5000),
		},
		{filename: 'Index/MasterSlide.iwa'},
	]);

	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), expected);
	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('iWork: detects Numbers (.numbers)', async () => {
	const expected = {ext: 'numbers', mime: 'application/vnd.apple.numbers'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/Tables/Table-1.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('iWork: detects Pages (.pages)', async () => {
	const expected = {ext: 'pages', mime: 'application/vnd.apple.pages'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), expected);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), expected);
});

test('iWork: detects Pages (.pages) with CalculationEngine marker', async () => {
	const expected = {ext: 'pages', mime: 'application/vnd.apple.pages'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/CalculationEngine.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('.fileTypeStream() detects Pages when the stream ends exactly at sampleSize', async () => {
	const expected = {ext: 'pages', mime: 'application/vnd.apple.pages'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
	]);

	await assertFileTypeStreamChunkedResult(zip, expected, {sampleSize: zip.length});
	await assertFileTypeStreamWebResult(zip, expected, {sampleSize: zip.length});
});

test('iWork: detects Numbers (.numbers) with multiple table entries', async () => {
	const expected = {ext: 'numbers', mime: 'application/vnd.apple.numbers'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/Tables/Table-1.iwa'}),
		createZipLocalFile({filename: 'Index/Tables/Tile-1.iwa'}),
		createZipLocalFile({filename: 'Metadata/DocumentIdentifier'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('iWork: Keynote takes priority when both MasterSlide and Tables entries exist', async () => {
	const expected = {ext: 'key', mime: 'application/vnd.apple.keynote'};
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/Document.iwa'}),
		createZipLocalFile({filename: 'Index/MasterSlide.iwa'}),
		createZipLocalFile({filename: 'Index/Tables/Table-1.iwa'}),
	]);
	assert.deepEqual(await fileTypeFromBuffer(zip), expected);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), expected);
});

test('iWork: does not detect iWork without Index/Document.iwa', async () => {
	const zip = Buffer.concat([
		createZipLocalFile({filename: 'Index/MasterSlide.iwa'}),
	]);
	await assertZipTypeFromBufferAndChunkedStream(zip);
});

test('Does not use OOXML directory fallback when [Content_Types].xml parses but remains unresolved', async () => {
	const spreadsheetEntry = createZipLocalFile({
		filename: 'xl/workbook.bin',
		compressedData: new TextEncoder().encode('<workbook/>'),
	});
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/></Types>'),
	});
	const orderedZip = Buffer.concat([spreadsheetEntry, contentTypesEntry]);
	await assertZipTypeFromBufferAndChunkedStream(orderedZip);
});

test('Does not use OOXML directory fallback when unresolved [Content_Types].xml appears before spreadsheet entries', async () => {
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/></Types>'),
	});
	const spreadsheetEntry = createZipLocalFile({
		filename: 'xl/workbook.bin',
		compressedData: new TextEncoder().encode('<workbook/>'),
	});
	const orderedZip = Buffer.concat([contentTypesEntry, spreadsheetEntry]);
	await assertZipTypeFromBufferAndChunkedStream(orderedZip);
});

test('Does not use directory fallback when [Content_Types].xml cannot be read', async () => {
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
	await assertZipTypeFromBufferAndChunkedStream(orderedZip);
});

test('Falls back to zip for malformed [Content_Types].xml entries that overstate their size', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedSize: 1024,
		uncompressedSize: 1024,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Does not classify partial [Content_Types].xml data when its declared size is larger than the bytes present', async () => {
	const xml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(xml),
		compressedSize: xml.length + 1,
		uncompressedSize: xml.length + 1,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Does not classify partial deflated [Content_Types].xml data when its declared size is larger than the bytes present', async () => {
	const xml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const compressed = deflateRawSync(Buffer.from(xml));
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: compressed,
		compressedSize: compressed.length + 1,
		uncompressedSize: xml.length,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Does not use directory fallback when malformed oversized [Content_Types].xml appears after a Word entry', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const malformedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedSize: 1024,
		uncompressedSize: 1024,
	});
	const orderedZip = Buffer.concat([wordEntry, malformedContentTypesEntry]);

	await assertZipTypeFromBuffer(orderedZip);
	await assertZipTypeFromBlob(orderedZip);
	await assertZipTypeFromChunkedStream(orderedZip);
	await assertZipTypeFromFile(orderedZip);
});

test('fileTypeFromFile does not abort on malformed [Content_Types].xml entries larger than Int32 reads', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedSize: 0x80_00_00_00,
		uncompressedSize: 0x80_00_00_00,
	});
	const filePath = await createTemporaryTestFile(malformedZip);
	const script = `import {fileTypeFromFile} from './source/index.js'; console.log(JSON.stringify(await fileTypeFromFile(${JSON.stringify(filePath)})));`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('fileTypeFromFile does not throw on sparse [Content_Types].xml entries beyond the ZIP text probe limit', async () => {
	const compressedSize = 512 * 1024 * 1024;
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedSize,
		uncompressedSize: compressedSize,
	});
	const filePath = await createSparseTemporaryTestFile(malformedZip, malformedZip.length + compressedSize);
	const script = `import {fileTypeFromFile} from './source/index.js'; console.log(JSON.stringify(await fileTypeFromFile(${JSON.stringify(filePath)})));`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Falls back to zip for malformed [Content_Types].xml entries larger than Int32 reads on buffer and blob inputs', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedSize: 0x80_00_00_00,
		uncompressedSize: 0x80_00_00_00,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
});

test('Allows known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
	const oversizedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, oversizedContentTypesEntry]);
	const bufferType = await fileTypeFromBuffer(orderedZip);
	assert.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromFile allows known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
	const oversizedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, oversizedContentTypesEntry]);
	const filePath = await createTemporaryTestFile(orderedZip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromBlob allows known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
	const oversizedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, oversizedContentTypesEntry]);

	assert.deepEqual(await fileTypeFromBlob(new Blob([orderedZip])), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Detects [Content_Types].xml entries at the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	assert.deepEqual(await fileTypeFromBuffer(orderedZip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromBlob(new Blob([orderedZip])), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromFile detects [Content_Types].xml entries at the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);
	const filePath = await createTemporaryTestFile(orderedZip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Streamed detection keeps [Content_Types].xml scanning at the ZIP text probe limit with small chunks', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(orderedZip, 1)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Web Stream detection keeps [Content_Types].xml scanning at the ZIP text probe limit with small chunks', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);
	const {stream} = createPatternWebStream(orderedZip, [1]);

	assert.deepEqual(await new FileTypeParser().fromStream(stream), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Falls back to zip when [Content_Types].xml entries exceed the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertZipTypeFromBuffer(orderedZip);
	await assertZipTypeFromBlob(orderedZip);
	await assertZipTypeFromFile(orderedZip);
	await assertZipTypeFromChunkedStream(orderedZip);
});

test('Web Stream detection falls back when [Content_Types].xml entries exceed the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertZipTypeFromWebStream(orderedZip, [1]);
});

test('.fileTypeStream() detects [Content_Types].xml entries at the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() detects [Content_Types].xml entries at the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back to zip for stored [Content_Types].xml entries at the ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back to zip for stored [Content_Types].xml entries at the ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() detects deflated [Content_Types].xml entries at the ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('.fileTypeStream() detects deflated [Content_Types].xml entries at the ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('.fileTypeStream() falls back to zip for deflated [Content_Types].xml entries at the previous ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back to zip for deflated [Content_Types].xml entries at the previous ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when [Content_Types].xml entries exceed the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back when [Content_Types].xml entries exceed the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back for [Content_Types].xml entries at the previous ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back for [Content_Types].xml entries at the previous ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode(contentTypesXml),
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() detects deflated [Content_Types].xml entries at the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() detects deflated [Content_Types].xml entries at the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back when deflated [Content_Types].xml entries exceed the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back when deflated [Content_Types].xml entries exceed the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back for deflated [Content_Types].xml entries at the previous ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamChunkedResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('.fileTypeStream() falls back for deflated [Content_Types].xml entries at the previous ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertFileTypeStreamWebResult(orderedZip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: orderedZip.length});
});

test('Falls back to zip for deflated [Content_Types].xml entries at the previous ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertZipTypeFromBuffer(orderedZip);
	await assertZipTypeFromBlob(orderedZip);
	await assertZipTypeFromFile(orderedZip);
});

test('All APIs detect deflated [Content_Types].xml entries at the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);
	const filePath = await createTemporaryTestFile(orderedZip);

	assert.deepEqual(await fileTypeFromBuffer(orderedZip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromBlob(new Blob([orderedZip])), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(orderedZip, 1)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Web Stream detection keeps deflated [Content_Types].xml scanning at the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(orderedZip, [1]).stream), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Falls back to zip when deflated [Content_Types].xml entries exceed the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertZipTypeFromBuffer(orderedZip);
	await assertZipTypeFromBlob(orderedZip);
	await assertZipTypeFromFile(orderedZip);
	await assertZipTypeFromChunkedStream(orderedZip);
});

test('Web Stream detection falls back when deflated [Content_Types].xml entries exceed the ZIP text probe limit', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = xmlPrefix.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const contentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: contentTypesXml.length,
	});
	const orderedZip = Buffer.concat([wordEntry, contentTypesEntry]);

	await assertZipTypeFromWebStream(orderedZip, [1]);
});

test('Allows many pre-IDAT PNG chunks for known-size buffers', async () => {
	const buffer = createPngWithAncillaryChunks(257);
	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Allows many pre-IDAT PNG chunks for streamed inputs', async () => {
	const buffer = createPngWithAncillaryChunks(257);
	const type = await fileTypeFromStream(createBufferedWebStream(buffer, 16));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Detects PNG when IDAT appears at the PNG chunk scan limit', async () => {
	const buffer = createPngWithAncillaryChunks(510);
	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromFile detects PNG when IDAT appears at the PNG chunk scan limit', async () => {
	const filePath = await createTemporaryTestFile(createPngWithAncillaryChunks(510), 'png');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromBlob detects PNG when IDAT appears at the PNG chunk scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createPngWithAncillaryChunks(510)]));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection keeps scanning at the PNG chunk limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunks(510), 9));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection keeps scanning at the PNG chunk limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunks(510), 1));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection keeps scanning at the PNG chunk limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunks(510), [1, 2, 1, 3]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection keeps scanning at the PNG chunk limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunks(510), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Falls back to PNG when IDAT appears after the PNG chunk scan limit', async () => {
	const type = await fileTypeFromBuffer(createPngWithAncillaryChunks(511));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromFile falls back to PNG when IDAT appears after the PNG chunk scan limit', async () => {
	const filePath = await createTemporaryTestFile(createPngWithAncillaryChunks(511), 'png');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromBlob falls back to PNG when IDAT appears after the PNG chunk scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createPngWithAncillaryChunks(511)]));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection falls back after the PNG chunk limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunks(511), 9));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection falls back after the PNG chunk limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunks(511), 1));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection falls back after the PNG chunk limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunks(511), [1, 2, 1, 3]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection falls back after the PNG chunk limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunks(511), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Detects APNG when acTL appears at the PNG chunk scan limit', async () => {
	const buffer = createPngWithAncillaryChunksAndAnimationControl(510);
	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('fileTypeFromFile detects APNG when acTL appears at the PNG chunk scan limit', async () => {
	const filePath = await createTemporaryTestFile(createPngWithAncillaryChunksAndAnimationControl(510), 'png');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('fileTypeFromBlob detects APNG when acTL appears at the PNG chunk scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createPngWithAncillaryChunksAndAnimationControl(510)]));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Falls back to PNG when acTL appears after the PNG chunk scan limit', async () => {
	const buffer = createPngWithAncillaryChunksAndAnimationControl(511);
	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromFile falls back to PNG when acTL appears after the PNG chunk scan limit', async () => {
	const filePath = await createTemporaryTestFile(createPngWithAncillaryChunksAndAnimationControl(511), 'png');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromBlob falls back to PNG when acTL appears after the PNG chunk scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createPngWithAncillaryChunksAndAnimationControl(511)]));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed APNG detection keeps scanning at the PNG chunk limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunksAndAnimationControl(510), 9));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Streamed APNG detection keeps scanning at the PNG chunk limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunksAndAnimationControl(510), 1));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Web Stream APNG detection keeps scanning at the PNG chunk limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunksAndAnimationControl(510), [1, 2, 1, 3]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('fileTypeFromBuffer still detects PNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromBuffer(createPngWithAncillaryPayloadBeforeIdat(maximumStreamPayloadProbeSizeInBytes + 1));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromBuffer still detects PNG with a leading CgBI chunk', async () => {
	const type = await fileTypeFromBuffer(createPngWithLeadingCgbiChunk());
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('fileTypeFromBuffer still detects APNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromBuffer(createPngWithAncillaryPayloadBeforeAnimationControl(maximumStreamPayloadProbeSizeInBytes + 1));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Streamed PNG detection keeps scanning when ancillary payload is exactly at the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryPayloadBeforeIdat(maximumStreamPayloadProbeSizeInBytes), 1024));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection keeps scanning when ancillary payload is exactly at the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryPayloadBeforeIdat(maximumStreamPayloadProbeSizeInBytes), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection falls back to PNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryPayloadBeforeIdat(maximumStreamPayloadProbeSizeInBytes + 1), 1024));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream PNG detection falls back to PNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryPayloadBeforeIdat(maximumStreamPayloadProbeSizeInBytes + 1), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed PNG detection does not classify oversized critical chunks as PNG', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithCriticalPayloadBeforeIdat('PLTE', maximumStreamPayloadProbeSizeInBytes + 1), 1024));
	assert.equal(type, undefined);
});

test('Web Stream PNG detection does not classify oversized critical chunks as PNG', async () => {
	const {stream} = createPatternWebStream(createPngWithCriticalPayloadBeforeIdat('PLTE', maximumStreamPayloadProbeSizeInBytes + 1), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.equal(type, undefined);
});

test('Streamed APNG detection keeps scanning when ancillary payload is exactly at the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryPayloadBeforeAnimationControl(maximumStreamPayloadProbeSizeInBytes), 1024));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Web Stream APNG detection keeps scanning when ancillary payload is exactly at the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryPayloadBeforeAnimationControl(maximumStreamPayloadProbeSizeInBytes), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Streamed APNG detection falls back to PNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryPayloadBeforeAnimationControl(maximumStreamPayloadProbeSizeInBytes + 1), 1024));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream APNG detection falls back to PNG when ancillary payload exceeds the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryPayloadBeforeAnimationControl(maximumStreamPayloadProbeSizeInBytes + 1), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed APNG detection still detects APNG when small ancillary chunks cumulatively exceed the stream payload probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunksAndAnimationControl(5, new Uint8Array(256 * 1024)), 1024));
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Web Stream APNG detection still detects APNG when small ancillary chunks cumulatively exceed the stream payload probe limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunksAndAnimationControl(5, new Uint8Array(256 * 1024)), [1024]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Web Stream APNG detection keeps scanning at the PNG chunk limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunksAndAnimationControl(510), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'apng',
		mime: 'image/apng',
	});
});

test('Streamed APNG detection falls back after the PNG chunk limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunksAndAnimationControl(511), 9));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Streamed APNG detection falls back after the PNG chunk limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createPngWithAncillaryChunksAndAnimationControl(511), 1));
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream APNG detection falls back after the PNG chunk limit', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunksAndAnimationControl(511), [1, 2, 1, 3]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Web Stream APNG detection falls back after the PNG chunk limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createPngWithAncillaryChunksAndAnimationControl(511), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Allows many TIFF tags for known-size buffers', async () => {
	const tagIds = Array.from({length: 257}, () => 0);
	tagIds[256] = 50_706;
	const buffer = createLittleEndianTiffWithTagIds(tagIds);
	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Allows many TIFF tags for streamed inputs', async () => {
	const tagIds = Array.from({length: 257}, () => 0);
	tagIds[256] = 50_706;
	const buffer = createLittleEndianTiffWithTagIds(tagIds);
	const type = await fileTypeFromStream(createBufferedWebStream(buffer, 16));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Detects TIFF tags at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('fileTypeFromFile detects TIFF tags at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('fileTypeFromBlob detects TIFF tags at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706)]));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Streamed TIFF detection keeps scanning at the TIFF tag limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706), 16));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Streamed TIFF detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706), 1));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Web Stream TIFF detection keeps scanning at the TIFF tag limit', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Web Stream TIFF detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_706), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Detects big-endian TIFF tags at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_706));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('fileTypeFromFile detects big-endian TIFF tags at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_706), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('fileTypeFromBlob detects big-endian TIFF tags at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createBigEndianTiffWithTagIdAtIndex(512, 511, 50_706)]));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Big-endian streamed TIFF detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_706), 1));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Big-endian Web Stream TIFF detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_706), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Detects ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_341));
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('fileTypeFromFile detects ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_341), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('fileTypeFromBlob detects ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_341)]));
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('Web Stream ARW detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 50_341), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('Detects big-endian ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_341));
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('fileTypeFromFile detects big-endian ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_341), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('fileTypeFromBlob detects big-endian ARW when its TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createBigEndianTiffWithTagIdAtIndex(512, 511, 50_341)]));
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('Big-endian streamed ARW detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_341), 1));
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('Big-endian Web Stream ARW detection keeps scanning at the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createBigEndianTiffWithTagIdAtIndex(512, 511, 50_341), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'arw',
		mime: 'image/x-sony-arw',
	});
});

test('Returns generic TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(512, 511, 0));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromFile returns generic TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createLittleEndianTiffWithTagIdAtIndex(512, 511, 0), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromBlob returns generic TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createLittleEndianTiffWithTagIdAtIndex(512, 511, 0)]));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Returns generic big-endian TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(512, 511, 0));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromFile returns generic big-endian TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createBigEndianTiffWithTagIdAtIndex(512, 511, 0), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromBlob returns generic big-endian TIFF when no recognized TIFF tag appears at the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createBigEndianTiffWithTagIdAtIndex(512, 511, 0)]));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Streamed TIFF detection returns generic TIFF after scanning the full tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 0), 1));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection returns generic TIFF after scanning the full tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(512, 511, 0), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection returns generic big-endian TIFF after scanning the full tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createBigEndianTiffWithTagIdAtIndex(512, 511, 0), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic TIFF when tags appear after the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic TIFF when the DNG tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(513, 0, 50_706));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic big-endian TIFF when tags appear after the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(513, 512, 50_706));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromFile falls back to generic big-endian TIFF when tags appear after the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createBigEndianTiffWithTagIdAtIndex(513, 512, 50_706), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromBlob falls back to generic big-endian TIFF when tags appear after the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createBigEndianTiffWithTagIdAtIndex(513, 512, 50_706)]));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic big-endian TIFF when the DNG tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(513, 0, 50_706));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromFile falls back to generic TIFF when tags appear after the TIFF tag scan limit', async () => {
	const filePath = await createTemporaryTestFile(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706), 'tif');

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromBlob falls back to generic TIFF when tags appear after the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBlob(new Blob([createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706)]));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Streamed TIFF detection falls back after the TIFF tag limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706), 16));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Streamed TIFF detection falls back after the TIFF tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706), 1));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Big-endian streamed TIFF detection falls back after the TIFF tag limit with small chunks', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createBigEndianTiffWithTagIdAtIndex(513, 512, 50_706), 1));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Big-endian Web Stream TIFF detection falls back after the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createBigEndianTiffWithTagIdAtIndex(513, 512, 50_706), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic TIFF when the ARW tag appears after the TIFF tag scan limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_341));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic TIFF when the ARW tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdAtIndex(513, 0, 50_341));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Falls back to generic big-endian TIFF when the ARW tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const type = await fileTypeFromBuffer(createBigEndianTiffWithTagIdAtIndex(513, 0, 50_341));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection falls back after the TIFF tag limit', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706), [3, 5, 2, 7]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection falls back after the TIFF tag limit with small chunks', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdAtIndex(513, 512, 50_706), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Streamed TIFF detection falls back when the DNG tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdAtIndex(513, 0, 50_706), 1));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection falls back when the big-endian DNG tag appears before the TIFF tag scan limit but the IFD is too large', async () => {
	const {stream} = createPatternWebStream(createBigEndianTiffWithTagIdAtIndex(513, 0, 50_706), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('fileTypeFromBuffer still detects DNG when the TIFF IFD offset exceeds the stream probe limit', async () => {
	const type = await fileTypeFromBuffer(createLittleEndianTiffWithTagIdsAtOffset([50_706], maximumStreamPayloadProbeSizeInBytes + 8));
	assert.deepEqual(type, {
		ext: 'dng',
		mime: 'image/x-adobe-dng',
	});
});

test('Streamed TIFF detection falls back to generic TIFF when the IFD offset exceeds the stream probe limit', async () => {
	const type = await fileTypeFromStream(createBufferedWebStream(createLittleEndianTiffWithTagIdsAtOffset([50_706], maximumStreamPayloadProbeSizeInBytes + 8), 1));
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Web Stream TIFF detection falls back to generic TIFF when the IFD offset exceeds the stream probe limit', async () => {
	const {stream} = createPatternWebStream(createLittleEndianTiffWithTagIdsAtOffset([50_706], maximumStreamPayloadProbeSizeInBytes + 8), [1]);
	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'tif',
		mime: 'image/tiff',
	});
});

test('Does not scan unbounded inflated gzip payload while probing for tar.gz', async () => {
	const repeatedId3Payload = createRepeatedId3Payload(3, 8 * 1024 * 1024);
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const gzipPayload = gzipSync(Buffer.concat([Buffer.from(repeatedId3Payload), tarFixture]));
	const bufferType = await fileTypeFromBuffer(gzipPayload);
	assertGzipFileType(bufferType);

	const streamType = await fileTypeFromStream(createBufferedWebStream(gzipPayload, 128));
	assertGzipFileType(streamType);
});

test('Still detects tar.gz with a single gzip layer', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const gzipPayload = createNestedGzip(tarFixture, 1);

	assertTarGzipFileType(await fileTypeFromBuffer(gzipPayload));
	assertTarGzipFileType(await fileTypeFromBlob(new Blob([gzipPayload])));

	const filePath = await createTemporaryTestFile(gzipPayload, 'gz');
	assertTarGzipFileType(await fileTypeFromFile(filePath));
	assertTarGzipFileType(await fileTypeFromStream(createBufferedWebStream(gzipPayload, 1)));

	const {stream} = createPatternWebStream(gzipPayload, [1]);
	assertTarGzipFileType(await new FileTypeParser().fromStream(stream));
});

test('Stops nested gzip probing after one layer', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);

	assertGzipFileType(await fileTypeFromBuffer(nestedGzipPayload));
	assertGzipFileType(await fileTypeFromBlob(new Blob([nestedGzipPayload])));

	const filePath = await createTemporaryTestFile(nestedGzipPayload, 'gz');
	assertGzipFileType(await fileTypeFromFile(filePath));
	assertGzipFileType(await fileTypeFromStream(createBufferedWebStream(nestedGzipPayload, 1)));

	const {stream} = createPatternWebStream(nestedGzipPayload, [1]);
	assertGzipFileType(await new FileTypeParser().fromStream(stream));
});

test('.fileTypeStream() reports nested gzip as plain gzip and preserves the original bytes', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const detectionStream = await fileTypeStream(createBufferedWebStream(nestedGzipPayload, 1));
	assertGzipFileType(detectionStream.fileType);

	try {
		const streamBytes = await getStreamAsUint8Array(detectionStream);
		assert.ok(areUint8ArraysEqual(streamBytes, nestedGzipPayload));
	} finally {
		detectionStream.cancel();
	}
});

test('.fileTypeStream() reports nested gzip as plain gzip and preserves the original bytes for Web Streams', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const detectionStream = await fileTypeStream(new Blob([nestedGzipPayload]).stream());
	assertGzipFileType(detectionStream.fileType);

	const streamBytes = await getStreamAsUint8Array(detectionStream);
	assert.ok(areUint8ArraysEqual(streamBytes, nestedGzipPayload));
});

test('Reused FileTypeParser resets gzip probe depth after nested gzip fallback', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();

	assertGzipFileType(await parser.fromBuffer(nestedGzipPayload));
	assertTarGzipFileType(await parser.fromBuffer(singleLayerGzipPayload));

	const {stream: nestedWebStream} = createPatternWebStream(nestedGzipPayload, [1]);
	assertGzipFileType(await parser.fromStream(nestedWebStream));

	const {stream: tarWebStream} = createPatternWebStream(singleLayerGzipPayload, [1]);
	assertTarGzipFileType(await parser.fromStream(tarWebStream));
});

test('Reused FileTypeParser resets gzip probe depth after a malformed gzip probe', async () => {
	const malformedGzip = Uint8Array.from([31, 139, 8, 8, 137, 83, 29, 82, 0, 11]);
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();

	assertGzipFileType(await parser.fromBuffer(malformedGzip));
	assertTarGzipFileType(await parser.fromBuffer(singleLayerGzipPayload));

	const {stream: malformedStream} = createPatternWebStream(malformedGzip, [1]);
	assertGzipFileType(await parser.fromStream(malformedStream));

	const {stream: tarWebStream} = createPatternWebStream(singleLayerGzipPayload, [1]);
	assertTarGzipFileType(await parser.fromStream(tarWebStream));
});

test('Reused FileTypeParser resets gzip probe depth after an aborted nested gzip probe', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);

	function createAbortStream(buffer) {
		return new ReadableStream({
			pull(controller) {
				controller.enqueue(buffer.subarray(0, 16));
				controller.error(new DOMException('aborted nested gzip probe', 'AbortError'));
			},
		});
	}

	const parser = new FileTypeParser();
	await assert.rejects(parser.fromStream(createAbortStream(nestedGzipPayload)), {name: 'AbortError'});
	assertTarGzipFileType(await parser.fromBuffer(singleLayerGzipPayload));
});

test('Reused FileTypeParser resets gzip probe depth across blob and file inputs', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();
	const filePath = await createTemporaryTestFile(singleLayerGzipPayload, 'gz');

	assertGzipFileType(await parser.fromBlob(new Blob([nestedGzipPayload])));
	assertTarGzipFileType(await parser.fromFile(filePath));
});

test('Reused FileTypeParser handles repeated nested gzip fallbacks before detecting tar.gz', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();

	assertGzipFileType(await parser.fromBuffer(nestedGzipPayload));
	assertGzipFileType(await parser.fromBlob(new Blob([nestedGzipPayload])));

	const {stream: nestedWebStream} = createPatternWebStream(nestedGzipPayload, [1]);
	assertGzipFileType(await parser.fromStream(nestedWebStream));

	assertTarGzipFileType(await parser.fromBuffer(singleLayerGzipPayload));
});

test('Reused FileTypeParser isolates tokenizer options across chunked stream, blob, Web Stream, and file inputs', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();
	const filePath = await createTemporaryTestFile(singleLayerGzipPayload, 'gz');

	assertGzipFileType(await parser.fromStream(createBufferedWebStream(nestedGzipPayload, 1)));
	assertTarGzipFileType(await parser.fromBlob(new Blob([singleLayerGzipPayload])));

	const {stream: nestedWebStream} = createPatternWebStream(nestedGzipPayload, [1]);
	assertGzipFileType(await parser.fromStream(nestedWebStream));
	assertTarGzipFileType(await parser.fromFile(filePath));
});

test('Reused FileTypeParser handles repeated nested gzip blob probes before detecting tar.gz from blob input', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const parser = new FileTypeParser();

	assertGzipFileType(await parser.fromBlob(new Blob([nestedGzipPayload])));
	assertGzipFileType(await parser.fromBlob(new Blob([nestedGzipPayload])));
	assertTarGzipFileType(await parser.fromBlob(new Blob([singleLayerGzipPayload])));
});

test('Reused FileTypeParser handles tokenizer-backed inputs after an aborted nested gzip stream probe', async () => {
	const tarFixture = await readFile(path.join(__dirname, 'fixture', 'fixture.tar'));
	const nestedGzipPayload = createNestedGzip(tarFixture, 2);
	const singleLayerGzipPayload = createNestedGzip(tarFixture, 1);
	const filePath = await createTemporaryTestFile(singleLayerGzipPayload, 'gz');

	function createAbortStream(buffer) {
		return new ReadableStream({
			pull(controller) {
				controller.enqueue(buffer.subarray(0, 16));
				controller.error(new DOMException('aborted nested gzip stream before tokenizer-backed reuse', 'AbortError'));
			},
		});
	}

	const parser = new FileTypeParser();
	await assert.rejects(parser.fromStream(createAbortStream(nestedGzipPayload)), {name: 'AbortError'});
	assertTarGzipFileType(await parser.fromBlob(new Blob([singleLayerGzipPayload])));
	assertTarGzipFileType(await parser.fromFile(filePath));
});

test('Does not allocate huge memory for oversized ZIP mimetype entries', async () => {
	const buffer = createOversizedZipMimetypeEntry();

	const type = await fileTypeFromBuffer(buffer);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Does not allocate huge memory for oversized ZIP mimetype entries from blob input', async () => {
	const buffer = createOversizedZipMimetypeEntry();
	await assertZipTypeFromBlob(buffer);
});

test('Does not allocate huge memory for oversized ZIP mimetype entries in stream mode', async () => {
	const buffer = createOversizedZipMimetypeEntry();
	await assertZipTypeFromChunkedStream(buffer);
});

test('Falls back to zip for malformed ZIP mimetype entries that overstate their size from file input', async () => {
	const malformedZip = createZipLocalFile({
		filename: 'mimetype',
		compressedSize: 1024,
		uncompressedSize: 1024,
	});
	await assertZipTypeFromFile(malformedZip);
});

test('Does not classify partial ZIP mimetype data when its declared size is larger than the bytes present', async () => {
	const mimeType = 'application/epub+zip';
	const malformedZip = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType),
		compressedSize: mimeType.length + 1,
		uncompressedSize: mimeType.length + 1,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Does not classify partial deflated ZIP mimetype data when its declared size is larger than the bytes present', async () => {
	const mimeType = 'application/epub+zip';
	const compressed = deflateRawSync(Buffer.from(mimeType));
	const malformedZip = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: compressed,
		compressedSize: compressed.length + 1,
		uncompressedSize: mimeType.length,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('fileTypeFromFile does not abort on malformed ZIP mimetype entries larger than Int32 reads', async () => {
	const malformedZip = createOversizedZipMimetypeEntry();
	const filePath = await createTemporaryTestFile(malformedZip);
	const script = `import {fileTypeFromFile} from './source/index.js'; console.log(JSON.stringify(await fileTypeFromFile(${JSON.stringify(filePath)})));`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('fileTypeFromFile does not throw on sparse ZIP mimetype entries beyond the ZIP text probe limit', async () => {
	const compressedSize = 512 * 1024 * 1024;
	const malformedZip = createZipLocalFile({
		filename: 'mimetype',
		compressedSize,
		uncompressedSize: compressedSize,
	});
	const filePath = await createSparseTemporaryTestFile(malformedZip, malformedZip.length + compressedSize);
	const script = `import {fileTypeFromFile} from './source/index.js'; console.log(JSON.stringify(await fileTypeFromFile(${JSON.stringify(filePath)})));`;
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
		cwd: __dirname,
		encoding: 'utf8',
	});

	assert.equal(result.signal, null);
	assert.equal(result.status, 0);
	assert.deepEqual(JSON.parse(result.stdout.trim()), {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Detects ZIP mimetype entries at the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	assert.deepEqual(await fileTypeFromBuffer(mimetypeEntry), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
	assert.deepEqual(await fileTypeFromBlob(new Blob([mimetypeEntry])), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('fileTypeFromFile detects ZIP mimetype entries at the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});
	const filePath = await createTemporaryTestFile(mimetypeEntry);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Streamed detection keeps ZIP mimetype scanning at the ZIP text probe limit with small chunks', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(mimetypeEntry, 1)), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Web Stream detection keeps ZIP mimetype scanning at the ZIP text probe limit with small chunks', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});
	const {stream} = createPatternWebStream(mimetypeEntry, [1]);

	assert.deepEqual(await new FileTypeParser().fromStream(stream), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Falls back to zip when ZIP mimetype entries exceed the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1)),
	});

	await assertZipTypeFromBuffer(mimetypeEntry);
	await assertZipTypeFromBlob(mimetypeEntry);
	await assertZipTypeFromFile(mimetypeEntry);
	await assertZipTypeFromChunkedStream(mimetypeEntry);
});

test('Web Stream detection falls back when ZIP mimetype entries exceed the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1)),
	});

	await assertZipTypeFromWebStream(mimetypeEntry, [1]);
});

test('.fileTypeStream() detects ZIP mimetype entries at the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() detects ZIP mimetype entries at the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back when ZIP mimetype entries exceed the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1)),
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back when ZIP mimetype entries exceed the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1)),
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back for ZIP mimetype entries at the previous ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back for ZIP mimetype entries at the previous ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() detects deflated ZIP mimetype entries at the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() detects deflated ZIP mimetype entries at the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back to zip for stored ZIP mimetype entries at the ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back to zip for stored ZIP mimetype entries at the ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode(mimeType.padEnd(maximumZipTextEntrySizeInBytes)),
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() detects deflated ZIP mimetype entries at the ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('.fileTypeStream() detects deflated ZIP mimetype entries at the ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('.fileTypeStream() falls back to zip for deflated ZIP mimetype entries at the previous ZIP text probe limit with the default sampleSize for chunked streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back to zip for deflated ZIP mimetype entries at the previous ZIP text probe limit with the default sampleSize for Web Streams', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when deflated ZIP mimetype entries exceed the ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back when deflated ZIP mimetype entries exceed the ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back for deflated ZIP mimetype entries at the previous ZIP text probe limit for Web Streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamWebResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('.fileTypeStream() falls back for deflated ZIP mimetype entries at the previous ZIP text probe limit for chunked streams with a large sampleSize', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertFileTypeStreamChunkedResult(mimetypeEntry, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: mimetypeEntry.length});
});

test('Falls back to zip for deflated ZIP mimetype entries at the previous ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(legacyOversizedZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertZipTypeFromBuffer(mimetypeEntry);
	await assertZipTypeFromBlob(mimetypeEntry);
	await assertZipTypeFromFile(mimetypeEntry);
});

test('All APIs detect deflated ZIP mimetype entries at the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});
	const filePath = await createTemporaryTestFile(mimetypeEntry);

	assert.deepEqual(await fileTypeFromBuffer(mimetypeEntry), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
	assert.deepEqual(await fileTypeFromBlob(new Blob([mimetypeEntry])), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(mimetypeEntry, 1)), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Web Stream detection keeps deflated ZIP mimetype scanning at the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(mimetypeEntry, [1]).stream), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Falls back to zip when deflated ZIP mimetype entries exceed the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertZipTypeFromBuffer(mimetypeEntry);
	await assertZipTypeFromBlob(mimetypeEntry);
	await assertZipTypeFromFile(mimetypeEntry);
	await assertZipTypeFromChunkedStream(mimetypeEntry);
});

test('Web Stream detection falls back when deflated ZIP mimetype entries exceed the ZIP text probe limit', async () => {
	const mimeType = 'application/epub+zip';
	const mimetype = mimeType.padEnd(maximumZipTextEntrySizeInBytes + 1);
	const mimetypeEntry = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(mimetype)),
		uncompressedSize: mimetype.length,
	});

	await assertZipTypeFromWebStream(mimetypeEntry, [1]);
});

test('Falls back to zip for malformed deflated ZIP mimetype entries that overstate compressed size', async () => {
	const malformedZip = createZipLocalFile({
		filename: 'mimetype',
		compressedMethod: 8,
		compressedData: Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x00]),
		compressedSize: 1024,
		uncompressedSize: 20,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Falls back to zip for deflated ZIP mimetype entries that understate uncompressed size', async () => {
	const mimetypeEntry = createDeflatedZipWithUnderstatedMimetypeSize();

	await assertZipTypeFromAllDirectInputs(mimetypeEntry);
});

test('.fileTypeStream() falls back for deflated ZIP mimetype entries that understate uncompressed size with a large sampleSize', async () => {
	const mimetypeEntry = createDeflatedZipWithUnderstatedMimetypeSize();

	await assertFileTypeStreamFallsBackToZipWithLargeSampleSize(mimetypeEntry);
});

test('Does not throw on malformed ZIP with unexpected follow-up signature', async () => {
	const zipLocalFile = createZipLocalFile({
		filename: 'a',
		compressedMethod: 0,
		compressedData: Uint8Array.from([0x41]),
	});
	const malformedZip = Buffer.concat([zipLocalFile, Buffer.from([0, 0, 0, 0])]);
	await assertZipTypeFromBufferAndChunkedStream(malformedZip);
});

test('Does not throw on malformed ZIP deflate entry in [Content_Types].xml', async () => {
	const malformedDeflatePayload = Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x00]);
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: malformedDeflatePayload,
		uncompressedSize: 20,
	});
	await assertZipTypeFromBufferAndChunkedStream(malformedZip);
});

test('Falls back to zip for malformed deflated [Content_Types].xml entries that overstate compressed size', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x00]),
		compressedSize: 1024,
		uncompressedSize: 20,
	});

	await assertZipTypeFromBuffer(malformedZip);
	await assertZipTypeFromBlob(malformedZip);
	await assertZipTypeFromChunkedStream(malformedZip);
	await assertZipTypeFromFile(malformedZip);
});

test('Falls back to zip for deflated [Content_Types].xml entries that understate uncompressed size', async () => {
	const zip = createDeflatedZipWithUnderstatedContentTypesSize();

	await assertZipTypeFromAllDirectInputs(zip);
});

test('.fileTypeStream() falls back for deflated [Content_Types].xml entries that understate uncompressed size with a large sampleSize', async () => {
	const zip = createDeflatedZipWithUnderstatedContentTypesSize();

	await assertFileTypeStreamFallsBackToZipWithLargeSampleSize(zip);
});

test('Does not use directory fallback when malformed deflated oversized [Content_Types].xml appears after a Word entry', async () => {
	const wordEntry = createZipLocalFile({
		filename: 'word/document.xml',
		compressedData: new TextEncoder().encode('<w:document/>'),
	});
	const malformedContentTypesEntry = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x00]),
		compressedSize: 1024,
		uncompressedSize: 20,
	});
	const orderedZip = Buffer.concat([wordEntry, malformedContentTypesEntry]);

	await assertZipTypeFromBuffer(orderedZip);
	await assertZipTypeFromBlob(orderedZip);
	await assertZipTypeFromChunkedStream(orderedZip);
	await assertZipTypeFromFile(orderedZip);
});

test('Keeps ZIP [Content_Types].xml inflate probing bounded for streams', async () => {
	const mimeMarker = 'ContentType="application/vnd.ms-word.document.macroenabled.main+xml"';
	const oversizedXml = mimeMarker.padEnd(2 * 1024 * 1024, 'A');
	const compressed = deflateRawSync(Buffer.from(oversizedXml, 'utf8'));
	const zip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: compressed,
		uncompressedSize: 1,
	});
	await assertZipTypeFromChunkedStream(zip);
});

test('Allows deflated known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
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
	assert.deepEqual(type, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromFile allows deflated known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
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
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromBlob allows deflated known-size [Content_Types].xml entries below the ZIP text probe limit', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + ' '.repeat((maximumZipTextEntrySizeInBytes / 2) - 128);
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

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Does not throw on ZIP with unsupported compression method in [Content_Types].xml', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		compressedMethod: 99,
		compressedData: Uint8Array.from([0x01, 0x02, 0x03, 0x04]),
		uncompressedSize: 4,
	});
	await assertZipTypeFromBufferAndChunkedStream(malformedZip);
});

test('Does not throw on ZIP with streamed [Content_Types].xml entry without descriptor data', async () => {
	const malformedZip = createZipLocalFile({
		filename: '[Content_Types].xml',
		generalPurposeBitFlag: 0x08,
		compressedMethod: 8,
		compressedData: Uint8Array.from([0x41, 0x42, 0x43]),
		compressedSize: 0,
		uncompressedSize: 0,
	});
	await assertZipTypeFromBufferAndChunkedStream(malformedZip);
});

test('Detects small ZIP mimetype descriptor entries', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	const bufferType = await fileTypeFromBuffer(streamedZip);
	assert.deepEqual(bufferType, {
		ext: 'epub',
		mime: 'application/epub+zip',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(streamedZip, 8));
	assert.deepEqual(streamType, {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('fileTypeFromFile detects small ZIP mimetype descriptor entries', async () => {
	const filePath = await createTemporaryTestFile(createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	}));

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Detects small ZIP mimetype descriptor entries with one-byte stream chunks', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(streamedZip, 1)), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Detects small ZIP [Content_Types].xml descriptor entries', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	const bufferType = await fileTypeFromBuffer(streamedZip);
	assert.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(streamedZip, 8));
	assert.deepEqual(streamType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Detects small deflated ZIP [Content_Types].xml descriptor entries', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: Buffer.byteLength(contentTypesXml),
	});

	const bufferType = await fileTypeFromBuffer(streamedZip);
	assert.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(streamedZip, 8));
	assert.deepEqual(streamType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Falls back to ZIP when canceling an oversized deflated descriptor entry reports trailing junk', async () => {
	const originalDecompressionStream = DecompressionStream;
	const contentTypesXml = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>');
	// eslint-disable-next-line unicorn/no-global-object-property-assignment
	globalThis.DecompressionStream = class {
		constructor() {
			let chunkIndex = 0;
			this.readable = new ReadableStream({
				pull(controller) {
					if (chunkIndex === 0) {
						const chunk = new Uint8Array(maximumZipTextEntrySizeInBytes);
						chunk.set(contentTypesXml);
						controller.enqueue(chunk);
					} else {
						controller.enqueue(new Uint8Array(1));
					}

					chunkIndex++;
				},
				cancel() {
					const error = new Error('Trailing junk after deflate stream');
					error.code = 'ERR_TRAILING_JUNK_AFTER_STREAM_END';
					throw error;
				},
			});
			this.writable = new WritableStream();
		}
	};

	try {
		const zip = createZipDataDescriptorFile({
			filename: '[Content_Types].xml',
			compressedMethod: 8,
			compressedData: deflateRawSync(contentTypesXml),
			uncompressedSize: maximumZipTextEntrySizeInBytes + 1,
		});

		await assertZipTypeFromBuffer(zip);
	} finally {
		// eslint-disable-next-line unicorn/no-global-object-property-assignment
		globalThis.DecompressionStream = originalDecompressionStream;
	}
});

test('Detects deflated ZIP [Content_Types].xml descriptor entries truncated inside the data descriptor', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: Buffer.byteLength(contentTypesXml),
	});
	// Cut the file inside the data descriptor, so the descriptor cannot be located and the entry data keeps the bytes that follow the deflate stream.
	const truncatedZip = streamedZip.subarray(0, -12);

	const bufferType = await fileTypeFromBuffer(truncatedZip);
	assert.deepEqual(bufferType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});

	const streamType = await fileTypeFromStream(createBufferedWebStream(truncatedZip, 8));
	assert.deepEqual(streamType, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Ignores ZIP descriptor signature bytes inside descriptor-backed [Content_Types].xml entries', async () => {
	const contentTypesXml = Buffer.concat([
		Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Types>'),
		Buffer.from([0x50, 0x4B, 0x07, 0x08]),
		Buffer.from('<Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	]);
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedData: contentTypesXml,
	});
	const filePath = await createTemporaryTestFile(streamedZip);

	assert.deepEqual(await fileTypeFromBuffer(streamedZip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(streamedZip, 1)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromFile detects small deflated ZIP [Content_Types].xml descriptor entries', async () => {
	const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const filePath = await createTemporaryTestFile(createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedMethod: 8,
		compressedData: deflateRawSync(Buffer.from(contentTypesXml)),
		uncompressedSize: Buffer.byteLength(contentTypesXml),
	}));

	const type = await fileTypeFromFile(filePath);
	assert.deepEqual(type, {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Allows streamed ZIP [Content_Types].xml descriptor probing at the exact size limit', async () => {
	const maximumZipEntrySizeInBytes = 1024 * 1024;
	const contentTypesPrefix = '<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>';
	const contentTypesXml = new TextEncoder().encode(contentTypesPrefix + 'A'.repeat(maximumZipEntrySizeInBytes - Buffer.byteLength(contentTypesPrefix)));
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedData: contentTypesXml,
	});

	assert.deepEqual(await fileTypeFromBuffer(streamedZip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(streamedZip, 8)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(streamedZip)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Keeps unknown-size ZIP [Content_Types].xml descriptor probing bounded', async () => {
	const contentTypesXml = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + 'A'.repeat((1024 * 1024) + 1));
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedData: contentTypesXml,
	});

	await assertZipTypeFromBufferAndChunkedStream(streamedZip);
});

test('fileTypeFromFile keeps unknown-size ZIP [Content_Types].xml descriptor probing bounded', async () => {
	const contentTypesXml = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>' + 'A'.repeat((1024 * 1024) + 1));
	const streamedZip = createZipDataDescriptorFile({
		filename: '[Content_Types].xml',
		compressedData: contentTypesXml,
	});

	await assertZipTypeFromFile(streamedZip);
});

test('Keeps unknown-size ZIP mimetype descriptor probing bounded', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip' + 'A'.repeat((1024 * 1024) + 1)),
	});

	await assertZipTypeFromBufferAndChunkedStream(streamedZip);
});

test('fileTypeFromFile keeps unknown-size ZIP mimetype descriptor probing bounded', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip' + 'A'.repeat((1024 * 1024) + 1)),
	});

	await assertZipTypeFromFile(streamedZip);
});

test('Known-size APIs still detect EPUB when a descriptor-backed entry before ZIP mimetype detection is at the scan limit', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 1)), descriptorBoundaryEpubFileType);
});

test('Web Stream detection keeps ZIP mimetype detection when a descriptor-backed entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [1]).stream), descriptorBoundaryEpubFileType);
});

test('.fileTypeStream() detects ZIP mimetype when a descriptor-backed entry before it is at the scan limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP mimetype detection for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: zip.length});
});

test('.fileTypeStream() detects ZIP mimetype when a descriptor-backed entry before it is at the scan limit for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP mimetype detection for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() falls back when a descriptor-backed entry before ZIP mimetype detection is at the scan limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP mimetype detection for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() detects ZIP mimetype when a descriptor-backed entry before it is at the scan limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP mimetype detection for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when a descriptor-backed entry before ZIP mimetype detection is at the scan limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Falls back to zip when an oversized descriptor-backed entry precedes ZIP mimetype detection', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertZipTypeFromBuffer(zip);
	await assertZipTypeFromBlob(zip);
	await assertZipTypeFromFile(zip);
	await assertZipTypeFromChunkedStream(zip);
});

test('Web Stream detection falls back when an oversized descriptor-backed entry precedes ZIP mimetype detection', async () => {
	const zip = createZipWithLeadingDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertZipTypeFromWebStream(zip, [1]);
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries consume the cumulative limit before ZIP mimetype detection', async () => {
	const zip = createZipWithRepeatedDescriptorMimetype(15, maximumZipTextEntrySizeInBytes);

	await assertZipTypeFromKnownSizeInputs(zip);
});

test('Known-size APIs still detect EPUB when repeated small descriptor-backed entries stay below the known-size ZIP scan budget', async () => {
	const zip = createZipWithRepeatedDescriptorMimetype(4, maximumZipTextEntrySizeInBytes / 8);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryEpubFileType);
});

test('Known-size APIs still detect EPUB when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget();

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryEpubFileType);
});

test('.fileTypeStream() still detects EPUB when repeated small descriptor-backed entries stay below the known-size ZIP scan budget for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetype(4, maximumZipTextEntrySizeInBytes / 8);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated small descriptor-backed entries stay below the known-size ZIP scan budget for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetype(4, maximumZipTextEntrySizeInBytes / 8);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget();

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget();

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated descriptor-backed ZIP mimetype entries are exactly at the known-size ZIP scan budget for chunked streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget();

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated descriptor-backed ZIP mimetype entries are exactly at the known-size ZIP scan budget for Web Streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget();

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries exceed the known-size ZIP scan budget by one byte before ZIP mimetype detection', async () => {
	const zip = createZipWithRepeatedDescriptorMimetypeAtKnownSizeBudget(1);

	await assertZipTypeFromKnownSizeInputs(zip);
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries exceed the cumulative limit before ZIP mimetype detection', async () => {
	const zip = createZipWithRepeatedDescriptorMimetype(17, maximumZipTextEntrySizeInBytes);

	await assertZipTypeFromBuffer(zip);
	await assertZipTypeFromBlob(zip);
	await assertZipTypeFromFile(zip);
});

test('Streamed ZIP detection still detects EPUB when a stored entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 1)), descriptorBoundaryEpubFileType);
});

test('Web Stream detection still detects EPUB when a stored entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [1]).stream), descriptorBoundaryEpubFileType);
});

test('Streamed ZIP detection keeps stored-entry probing bounded when an oversized entry precedes ZIP mimetype detection', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumZipTextEntrySizeInBytes + (3 * chunkSize));
});

test('Web Stream detection keeps stored-entry probing bounded when an oversized entry precedes ZIP mimetype detection', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumZipTextEntrySizeInBytes + (3 * chunkSize));
});

test('Streamed ZIP detection still detects EPUB when repeated stored entries stay below the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), descriptorBoundaryEpubFileType);
});

test('Web Stream detection still detects EPUB when repeated stored entries stay below the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [64 * 1024]).stream), descriptorBoundaryEpubFileType);
});

test('Streamed ZIP detection still detects EPUB when repeated stored entries are exactly at the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredMimetypeAtCumulativeLimit();

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), descriptorBoundaryEpubFileType);
});

test('Web Stream detection still detects EPUB when repeated stored entries are exactly at the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredMimetypeAtCumulativeLimit();

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [64 * 1024]).stream), descriptorBoundaryEpubFileType);
});

test('Streamed ZIP detection keeps repeated stored-entry probing cumulatively bounded when ZIP mimetype detection is beyond the limit', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumUntrustedSkipSizeInBytes + (6 * chunkSize));
});

test('Web Stream detection keeps repeated stored-entry probing cumulatively bounded when ZIP mimetype detection is beyond the limit', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumUntrustedSkipSizeInBytes + (6 * chunkSize));
});

test('.fileTypeStream() detects ZIP mimetype when a stored entry before it is at the scan limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() detects ZIP mimetype when a stored entry before it is at the scan limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() detects ZIP mimetype when a stored entry before it is at the scan limit for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() falls back when a stored entry before ZIP mimetype detection is at the scan limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when a stored entry before ZIP mimetype detection is at the scan limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() still detects ZIP mimetype when an oversized stored entry precedes it for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP mimetype when an oversized stored entry precedes it for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP mimetype when an oversized stored entry precedes it for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('Known-size APIs still detect EPUB when a stored entry appears before it beyond the stream scan limit', async () => {
	const zip = createZipWithLeadingStoredMimetype(maximumZipTextEntrySizeInBytes + 1);
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromFile(filePath), descriptorBoundaryEpubFileType);
});

test('Known-size APIs still detect EPUB when a large stored entry appears before a small descriptor-backed mimetype entry', async () => {
	const zip = createZipWithLeadingStoredDescriptorMimetype(maximumZipTextEntrySizeInBytes + 1);
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryEpubFileType);
	assert.deepEqual(await fileTypeFromFile(filePath), descriptorBoundaryEpubFileType);
});

test('.fileTypeStream() falls back when repeated stored entries stay below the cumulative limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when repeated stored entries stay below the cumulative limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when repeated stored entries stay below the cumulative limit for chunked streams with hostile mixed chunking and the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);
	const detectionStream = await fileTypeStream(createPatternWebStream(zip, [1, 64 * 1024]).stream);

	try {
		assert.deepEqual(detectionStream.fileType, {
			ext: 'zip',
			mime: 'application/zip',
		});
		assert.ok(areUint8ArraysEqual(await getStreamAsUint8Array(detectionStream), zip));
	} finally {
		detectionStream.cancel();
	}
});

test('.fileTypeStream() still detects ZIP when repeated stored entries stay below the cumulative limit for Web Streams with hostile mixed chunking and the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() still detects ZIP mimetype when repeated stored entries exceed the stream cumulative limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP mimetype when repeated stored entries exceed the stream cumulative limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated stored entries exceed the stream cumulative limit for chunked streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects EPUB when repeated stored entries exceed the stream cumulative limit for Web Streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredMimetype(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryEpubFileType, {sampleSize: zip.length});
});

test('Known-size APIs still detect DOCM when a descriptor-backed entry before ZIP [Content_Types].xml detection is at the scan limit', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 1)), descriptorBoundaryDocmFileType);
});

test('Web Stream detection keeps ZIP [Content_Types].xml detection when a descriptor-backed entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [1]).stream), descriptorBoundaryDocmFileType);
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a descriptor-backed entry before it is at the scan limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when a descriptor-backed entry before ZIP [Content_Types].xml detection is at the scan limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a descriptor-backed entry before it is at the scan limit for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a descriptor-backed entry before it is at the scan limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	}, {sampleSize: zip.length});
});

test('.fileTypeStream() falls back when a descriptor-backed entry before ZIP [Content_Types].xml detection is at the scan limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('Falls back to zip when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertZipTypeFromBuffer(zip);
	await assertZipTypeFromBlob(zip);
	await assertZipTypeFromFile(zip);
	await assertZipTypeFromChunkedStream(zip);
});

test('Web Stream detection falls back when an oversized descriptor-backed entry precedes ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithLeadingDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertZipTypeFromWebStream(zip, [1]);
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries consume the cumulative limit before ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypes(15, maximumZipTextEntrySizeInBytes);

	await assertZipTypeFromKnownSizeInputs(zip);
});

test('Known-size APIs still detect DOCM when repeated small descriptor-backed entries stay below the known-size ZIP scan budget', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypes(4, maximumZipTextEntrySizeInBytes / 8);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryDocmFileType);
});

test('Known-size APIs still detect DOCM when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget();

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromFile(await createTemporaryTestFile(zip)), descriptorBoundaryDocmFileType);
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated small descriptor-backed entries stay below the known-size ZIP scan budget for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypes(4, maximumZipTextEntrySizeInBytes / 8);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated small descriptor-backed entries stay below the known-size ZIP scan budget for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypes(4, maximumZipTextEntrySizeInBytes / 8);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget();

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated descriptor-backed entries are exactly at the known-size ZIP scan budget for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget();

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects DOCM when repeated descriptor-backed ZIP [Content_Types].xml entries are exactly at the known-size ZIP scan budget for chunked streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget();

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects DOCM when repeated descriptor-backed ZIP [Content_Types].xml entries are exactly at the known-size ZIP scan budget for Web Streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget();

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries exceed the known-size ZIP scan budget by one byte before ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypesAtKnownSizeBudget(1);

	await assertZipTypeFromKnownSizeInputs(zip);
});

test('Known-size APIs fall back to zip when repeated descriptor-backed entries exceed the cumulative limit before ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithRepeatedDescriptorContentTypes(17, maximumZipTextEntrySizeInBytes);

	await assertZipTypeFromBuffer(zip);
	await assertZipTypeFromBlob(zip);
	await assertZipTypeFromFile(zip);
});

test('Streamed ZIP detection still detects DOCM when a stored entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 1)), descriptorBoundaryDocmFileType);
});

test('Web Stream detection still detects DOCM when a stored entry before it is at the scan limit', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [1]).stream), descriptorBoundaryDocmFileType);
});

test('Streamed ZIP detection keeps stored-entry probing bounded when an oversized entry precedes ZIP [Content_Types].xml detection', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumZipTextEntrySizeInBytes + (3 * chunkSize));
});

test('Web Stream detection keeps stored-entry probing bounded when an oversized entry precedes ZIP [Content_Types].xml detection', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumZipTextEntrySizeInBytes + (3 * chunkSize));
});

test('Streamed ZIP detection still detects DOCM when repeated stored entries stay below the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), descriptorBoundaryDocmFileType);
});

test('Web Stream detection still detects DOCM when repeated stored entries stay below the cumulative limit', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [64 * 1024]).stream), descriptorBoundaryDocmFileType);
});

// The cumulative limit lands between `word/document.xml` and `[Content_Types].xml`, so the directory
// name answers. Reporting the base type rather than DOCM is what proves the entry went unread.
test('Streamed ZIP detection guesses docx when repeated stored entries are exactly at the cumulative limit before ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithRepeatedStoredContentTypesAtCumulativeLimit();

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 64 * 1024)), {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
});

test('Web Stream detection guesses docx when repeated stored entries are exactly at the cumulative limit before ZIP [Content_Types].xml detection', async () => {
	const zip = createZipWithRepeatedStoredContentTypesAtCumulativeLimit();

	assert.deepEqual(await new FileTypeParser().fromStream(createPatternWebStream(zip, [64 * 1024]).stream), {
		ext: 'docx',
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	});
});

test('Streamed ZIP detection keeps repeated stored-entry probing cumulatively bounded when ZIP [Content_Types].xml detection is beyond the limit', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await fileTypeFromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumUntrustedSkipSizeInBytes + (6 * chunkSize));
});

test('Web Stream detection keeps repeated stored-entry probing cumulatively bounded when ZIP [Content_Types].xml detection is beyond the limit', async () => {
	const chunkSize = 64 * 1024;
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);
	const {state, stream} = createPatternWebStream(zip, [chunkSize]);

	const type = await new FileTypeParser().fromStream(stream);
	assert.deepEqual(type, {
		ext: 'zip',
		mime: 'application/zip',
	});
	assert.ok(state.emittedBytes <= maximumUntrustedSkipSizeInBytes + (6 * chunkSize));
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a stored entry before it is at the scan limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a stored entry before it is at the scan limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() detects ZIP [Content_Types].xml when a stored entry before it is at the scan limit for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('.fileTypeStream() falls back when a stored entry before ZIP [Content_Types].xml detection is at the scan limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when a stored entry before ZIP [Content_Types].xml detection is at the scan limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when an oversized stored entry precedes it for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when an oversized stored entry precedes it for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when an oversized stored entry precedes it for chunked streams with small chunks and a large sampleSize', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {
		chunkSize: 256,
		sampleSize: zip.length,
	});
});

test('Known-size APIs still detect DOCM when a stored entry appears before it beyond the stream scan limit', async () => {
	const zip = createZipWithLeadingStoredContentTypes(maximumZipTextEntrySizeInBytes + 1);
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromFile(filePath), descriptorBoundaryDocmFileType);
});

test('Known-size APIs still detect DOCM when a large stored entry appears before a small descriptor-backed [Content_Types].xml entry', async () => {
	const zip = createZipWithLeadingStoredDescriptorContentTypes(maximumZipTextEntrySizeInBytes + 1);
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromBuffer(zip), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), descriptorBoundaryDocmFileType);
	assert.deepEqual(await fileTypeFromFile(filePath), descriptorBoundaryDocmFileType);
});

test('.fileTypeStream() falls back when repeated stored ZIP [Content_Types].xml entries stay below the cumulative limit for chunked streams with the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when repeated stored ZIP [Content_Types].xml entries stay below the cumulative limit for Web Streams with the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() falls back when repeated stored ZIP [Content_Types].xml entries stay below the cumulative limit for chunked streams with hostile mixed chunking and the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);
	const detectionStream = await fileTypeStream(createPatternWebStream(zip, [1, 64 * 1024]).stream);

	try {
		assert.deepEqual(detectionStream.fileType, {
			ext: 'zip',
			mime: 'application/zip',
		});
		assert.ok(areUint8ArraysEqual(await getStreamAsUint8Array(detectionStream), zip));
	} finally {
		detectionStream.cancel();
	}
});

test('.fileTypeStream() still detects ZIP when repeated stored ZIP [Content_Types].xml entries stay below the cumulative limit for Web Streams with hostile mixed chunking and the default sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(15, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, {
		ext: 'zip',
		mime: 'application/zip',
	});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated stored entries exceed the stream cumulative limit for chunked streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects ZIP [Content_Types].xml when repeated stored entries exceed the stream cumulative limit for Web Streams with a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects DOCM when repeated stored ZIP [Content_Types].xml entries exceed the stream cumulative limit for chunked streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamChunkedResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('.fileTypeStream() still detects DOCM when repeated stored ZIP [Content_Types].xml entries exceed the stream cumulative limit for Web Streams with hostile mixed chunking and a large sampleSize', async () => {
	const zip = createZipWithRepeatedStoredContentTypes(17, maximumZipTextEntrySizeInBytes);

	await assertFileTypeStreamWebResult(zip, descriptorBoundaryDocmFileType, {sampleSize: zip.length});
});

test('Falls back to zip on invalid ZIP descriptor signature', async () => {
	const streamedZip = createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
		descriptor: new Uint8Array(16),
	});

	await assertZipTypeFromBufferAndChunkedStream(streamedZip);
});

test('fileTypeFromFile falls back to zip on invalid ZIP descriptor signature', async () => {
	const filePath = await createTemporaryTestFile(createZipDataDescriptorFile({
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
		descriptor: new Uint8Array(16),
	}));

	assertZipFileType(await fileTypeFromFile(filePath));
});

test('Known-size inputs fall back to zip when ZIP descriptor scanning finds a false positive', async () => {
	const zip = fs.readFileSync(path.join(__dirname, 'fixture', 'fixture.3mf')).subarray(0, 322);
	zip[250] = 28;

	await assertZipTypeFromKnownSizeInputs(zip);
});

test('Detects EPUB when the ZIP entry count is at the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('fileTypeFromFile detects EPUB when the ZIP entry count is at the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('fileTypeFromBlob detects EPUB when the ZIP entry count is at the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Streamed ZIP detection still detects EPUB when the ZIP entry count is at the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Falls back to zip when the ZIP entry count exceeds the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	await assertZipTypeFromBuffer(zip);
});

test('fileTypeFromFile falls back to zip when the ZIP entry count exceeds the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	await assertZipTypeFromFile(zip);
});

test('fileTypeFromBlob falls back to zip when the ZIP entry count exceeds the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	assertZipFileType(await fileTypeFromBlob(new Blob([zip])));
});

test('Streamed ZIP detection falls back to zip when the entry count exceeds the limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	await assertZipTypeFromChunkedStream(zip);
});

test('Detects DOCM when [Content_Types].xml appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromFile detects DOCM when [Content_Types].xml appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('fileTypeFromBlob detects DOCM when [Content_Types].xml appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Streamed ZIP detection still detects DOCM when [Content_Types].xml appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Falls back to zip when [Content_Types].xml first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	await assertZipTypeFromBuffer(zip);
});

test('Still detects DOCM in over-limit ZIP archives when [Content_Types].xml appears before the entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 0, {
		filename: '[Content_Types].xml',
		compressedData: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Types><Override ContentType="application/vnd.ms-word.document.macroenabled.main+xml"/></Types>'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'docm',
		mime: 'application/vnd.ms-word.document.macroenabled.12',
	});
});

test('Still detects EPUB in over-limit ZIP archives when the mimetype entry appears before the entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 0, {
		filename: 'mimetype',
		compressedData: new TextEncoder().encode('application/epub+zip'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'epub',
		mime: 'application/epub+zip',
	});
});

test('Detects JAR when META-INF/MANIFEST.MF appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'jar',
		mime: 'application/java-archive',
	});
});

test('fileTypeFromFile detects JAR when META-INF/MANIFEST.MF appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'jar',
		mime: 'application/java-archive',
	});
});

test('fileTypeFromBlob detects JAR when META-INF/MANIFEST.MF appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'jar',
		mime: 'application/java-archive',
	});
});

test('Streamed ZIP detection still detects JAR when META-INF/MANIFEST.MF appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), {
		ext: 'jar',
		mime: 'application/java-archive',
	});
});

test('Still detects JAR in over-limit ZIP archives when META-INF/MANIFEST.MF appears before the entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 0, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'jar',
		mime: 'application/java-archive',
	});
});

test('Falls back to zip when META-INF/MANIFEST.MF first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	await assertZipTypeFromBuffer(zip);
});

test('fileTypeFromFile falls back to zip when META-INF/MANIFEST.MF first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	await assertZipTypeFromFile(zip);
});

test('fileTypeFromBlob falls back to zip when META-INF/MANIFEST.MF first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	assertZipFileType(await fileTypeFromBlob(new Blob([zip])));
});

test('Streamed ZIP detection falls back to zip when META-INF/MANIFEST.MF first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/MANIFEST.MF',
		compressedData: new TextEncoder().encode('Manifest-Version: 1.0\n'),
	});

	await assertZipTypeFromChunkedStream(zip);
});

test('Detects XPI when META-INF/mozilla.rsa appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'xpi',
		mime: 'application/x-xpinstall',
	});
});

test('fileTypeFromFile detects XPI when META-INF/mozilla.rsa appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'xpi',
		mime: 'application/x-xpinstall',
	});
});

test('fileTypeFromBlob detects XPI when META-INF/mozilla.rsa appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'xpi',
		mime: 'application/x-xpinstall',
	});
});

test('Streamed ZIP detection still detects XPI when META-INF/mozilla.rsa appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), {
		ext: 'xpi',
		mime: 'application/x-xpinstall',
	});
});

test('Still detects XPI in over-limit ZIP archives when META-INF/mozilla.rsa appears before the entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 0, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'xpi',
		mime: 'application/x-xpinstall',
	});
});

test('Falls back to zip when META-INF/mozilla.rsa first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	await assertZipTypeFromBuffer(zip);
});

test('fileTypeFromFile falls back to zip when META-INF/mozilla.rsa first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	await assertZipTypeFromFile(zip);
});

test('fileTypeFromBlob falls back to zip when META-INF/mozilla.rsa first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	assertZipFileType(await fileTypeFromBlob(new Blob([zip])));
});

test('Streamed ZIP detection falls back to zip when META-INF/mozilla.rsa first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'META-INF/mozilla.rsa',
		compressedData: new Uint8Array(0),
	});

	await assertZipTypeFromChunkedStream(zip);
});

test('Detects APK when classes.dex appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'apk',
		mime: 'application/vnd.android.package-archive',
	});
});

test('fileTypeFromFile detects APK when classes.dex appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});
	const filePath = await createTemporaryTestFile(zip);

	assert.deepEqual(await fileTypeFromFile(filePath), {
		ext: 'apk',
		mime: 'application/vnd.android.package-archive',
	});
});

test('fileTypeFromBlob detects APK when classes.dex appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	assert.deepEqual(await fileTypeFromBlob(new Blob([zip])), {
		ext: 'apk',
		mime: 'application/vnd.android.package-archive',
	});
});

test('Streamed ZIP detection still detects APK when classes.dex appears at the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1024, 1023, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	assert.deepEqual(await fileTypeFromStream(createBufferedWebStream(zip, 8)), {
		ext: 'apk',
		mime: 'application/vnd.android.package-archive',
	});
});

test('Still detects APK in over-limit ZIP archives when classes.dex appears before the entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 0, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	assert.deepEqual(await fileTypeFromBuffer(zip), {
		ext: 'apk',
		mime: 'application/vnd.android.package-archive',
	});
});

test('Falls back to zip when classes.dex first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	await assertZipTypeFromBuffer(zip);
});

test('fileTypeFromFile falls back to zip when classes.dex first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	await assertZipTypeFromFile(zip);
});

test('fileTypeFromBlob falls back to zip when classes.dex first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	assertZipFileType(await fileTypeFromBlob(new Blob([zip])));
});

test('Streamed ZIP detection falls back to zip when classes.dex first appears after the ZIP entry count limit', async () => {
	const zip = createZipArchiveWithEntryAtIndex(1025, 1024, {
		filename: 'classes.dex',
		compressedData: new TextEncoder().encode('dex\n035\0'),
	});

	await assertZipTypeFromChunkedStream(zip);
});

test('.fileTypeStream() clamps invalid sampleSize values', async () => {
	const file = path.join(__dirname, 'fixture', 'fixture.png');
	const blob = new Blob([await readFile(file)]);
	const stream = await fileTypeStream(blob.stream(), {sampleSize: Infinity});
	assert.deepEqual(stream.fileType, {
		ext: 'png',
		mime: 'image/png',
	});
});

test('Does not allocate huge memory on malformed EBML DocType length', async () => {
	const bytes = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x81, 0x42, 0x82, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
	const type = await fileTypeFromBuffer(bytes);

	assert.equal(type, undefined);
});

test('Does not throw on malformed EBML stream child with oversized payload length', async () => {
	const bytes = Uint8Array.from([0x1A, 0x45, 0xDF, 0xA3, 0x8A, 0x42, 0x83, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
	const type = await fileTypeFromStream(createBufferedWebStream(bytes, 8));

	assert.equal(type, undefined);
});

test('DSDIFF requires both the form chunk ID and DSD form type', async () => {
	const fixture = await readFile(path.join(__dirname, 'fixture/fixture.dff'));
	const wrongChunkId = Buffer.from(fixture);
	wrongChunkId.write('FRM9', 0);
	assert.equal(await fileTypeFromBuffer(wrongChunkId), undefined);

	const wrongFormType = Buffer.from(fixture);
	wrongFormType.write('TEST', 12);
	assert.equal(await fileTypeFromBuffer(wrongFormType), undefined);

	for (let length = 4; length < 16; length++) {
		assert.equal(await fileTypeFromBuffer(fixture.subarray(0, length)), undefined);
	}
});

test('every class declared in the types exists at runtime', async () => {
	// A name that the types export but the module does not is accepted by TypeScript and then
	// throws a link time `SyntaxError` for whoever imports it.
	const declared = fs.readFileSync('source/index.d.ts', 'utf8').matchAll(/^export declare class (?<name>\w+)/gmv)
		.map(match => match.groups.name).toArray();
	const module_ = await import('./source/index.js');

	for (const name of declared) {
		assert.ok(Object.hasOwn(module_, name), `\`${name}\` is declared in the types but not exported at runtime`);
	}
});

// These fixtures are not in `names`, so the loop above never sees them. The block that used
// to sit inside it could not either: `falsePositives` is keyed by file type, so looking it up
// by `fixture.filename` never matched. That left `fixture-corrupt.png` and `fixture-json.webp`
// with no coverage at all, even though a file called one thing being detected as another is
// exactly what they exist to rule out.
for (const [type, filenames] of Object.entries(falsePositives)) {
	for (const filename of filenames) {
		const filePath = path.join(__dirname, 'fixture', `${filename}.${type}`);
		test(`${filename}.${type} ${i++} is not detected as ${type}`, async () => {
			await testFalsePositive(filePath);
		});
	}
}
