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
	if (nodeMajorVersion >= nodeVersionSupportingByteBlobStream) {
		// Blob requires to stream to BYOB ReadableStream, requiring Node.js ≥ 20
		_test(`${fixture.filename} ${i++} .fileTypeFromBlob() method - same fileType`, testFromBlob, fixture.type, fixture.path);
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
});
