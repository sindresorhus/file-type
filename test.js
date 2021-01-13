import path from 'path';
import fs from 'fs';
import stream from 'stream';
import test from 'ava';
import {readableNoopStream} from 'noop-stream';
import FileType from '.';

const supported = require('./supported');

const missingTests = [
	'mpc'
];

const types = supported.extensions.filter(ext => !missingTests.includes(ext));

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names = {
	aac: [
		'fixture-adts-mpeg2',
		'fixture-adts-mpeg4',
		'fixture-adts-mpeg4-2',
		'fixture-id3v2'
	],
	asar: [
		'fixture',
		'fixture2'
	],
	arw: [
		'fixture',
		'fixture2',
		'fixture3',
		'fixture4',
		'fixture5'
	],
	cr3: [
		'fixture'
	],
	dng: [
		'fixture',
		'fixture2'
	],
	nef: [
		'fixture',
		'fixture2',
		'fixture3',
		'fixture4'
	],
	'3gp': [
		'fixture',
		'fixture2'
	],
	woff2: [
		'fixture',
		'fixture-otto'
	],
	woff: [
		'fixture',
		'fixture-otto'
	],
	eot: [
		'fixture',
		'fixture-0x20001'
	],
	mov: [
		'fixture',
		'fixture-mjpeg',
		'fixture-moov'
	],
	mp2: [
		'fixture',
		'fixture-mpa'
	],
	mp3: [
		'fixture',
		'fixture-mp2l3',
		'fixture-ffe3'
	],
	mp4: [
		'fixture-imovie',
		'fixture-isom',
		'fixture-isomv2',
		'fixture-mp4v2',
		'fixture-dash'
	],
	tif: [
		'fixture-big-endian',
		'fixture-little-endian'
	],
	gz: [
		'fixture.tar'
	],
	xz: [
		'fixture.tar'
	],
	lz: [
		'fixture.tar'
	],
	Z: [
		'fixture.tar'
	],
	mkv: [
		'fixture',
		'fixture2'
	],
	mpg: [
		'fixture',
		'fixture2',
		'fixture.ps',
		'fixture.sub'
	],
	heic: [
		'fixture-mif1',
		'fixture-msf1',
		'fixture-heic'
	],
	ape: [
		'fixture-monkeysaudio'
	],
	mpc: [
		'fixture-sv7',
		'fixture-sv8'
	],
	pcap: [
		'fixture-big-endian',
		'fixture-little-endian'
	],
	png: [
		'fixture',
		'fixture-itxt'
	],
	tar: [
		'fixture',
		'fixture-v7',
		'fixture-spaces'
	],
	mie: [
		'fixture-big-endian',
		'fixture-little-endian'
	],
	m4a: [
		'fixture-babys-songbook.m4b' // Actually it's an `.m4b`
	],
	flac: [
		'fixture',
		'fixture-id3v2' // FLAC prefixed with ID3v2 header
	],
	docx: [
		'fixture',
		'fixture2',
		'fixture-office365'
	],
	pptx: [
		'fixture',
		'fixture2',
		'fixture-office365'
	],
	xlsx: [
		'fixture',
		'fixture2',
		'fixture-office365'
	],
	ogx: [
		'fixture-unknown-ogg' // Manipulated fixture to unrecognized Ogg based file
	],
	avif: [
		'fixture-yuv420-8bit' // Multiple bit-depths and/or subsamplings
	],
	eps: [
		'fixture',
		'fixture2'
	],
	cfb: [
		'fixture.msi',
		'fixture.xls',
		'fixture.doc',
		'fixture.ppt',
		'fixture-2.doc'
	],
	asf: [
		'fixture',
		'fixture.wma',
		'fixture.wmv'
	],
	ai: [
		'fixture-normal', // Normal AI
		'fixture-without-pdf-compatibility' // AI without the PDF compatibility (cannot be opened by PDF viewers I guess)
	],
	pdf: [
		'fixture',
		'fixture-adobe-illustrator', // PDF saved from Adobe Illustrator, using the default "[Illustrator Default]" preset
		'fixture-smallest', // PDF saved from Adobe Illustrator, using the preset "smallest PDF"
		'fixture-fast-web', // PDF saved from Adobe Illustrator, using the default "[Illustrator Default"] preset, but enabling "Optimize for Fast Web View"
		'fixture-printed' // PDF printed from Adobe Illustrator, but with a PDF printer.
	]
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives = {
	png: [
		'fixture-corrupt'
	]
};

// Known failing fixture
const failingFixture = [
];

async function checkBufferLike(t, type, bufferLike) {
	const {ext, mime} = await FileType.fromBuffer(bufferLike) || {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
}

async function checkFile(t, type, filePath) {
	const {ext, mime} = await FileType.fromFile(filePath) || {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
}

async function testFromFile(t, ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	return checkFile(t, ext, file);
}

async function testFromBuffer(t, ext, name) {
	const fixtureName = `${(name || 'fixture')}.${ext}`;

	const file = path.join(__dirname, 'fixture', fixtureName);
	const chunk = fs.readFileSync(file);
	await checkBufferLike(t, ext, chunk);
	await checkBufferLike(t, ext, new Uint8Array(chunk));
	await checkBufferLike(t, ext, chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
}

async function testFalsePositive(t, ext, name) {
	const file = path.join(__dirname, 'fixture', `${name}.${ext}`);

	await t.is(await FileType.fromFile(file), undefined);

	const chunk = fs.readFileSync(file);
	t.is(await FileType.fromBuffer(chunk), undefined);
	t.is(await FileType.fromBuffer(new Uint8Array(chunk)), undefined);
	t.is(await FileType.fromBuffer(chunk.buffer), undefined);
}

async function testFileFromStream(t, ext, name) {
	const filename = `${(name || 'fixture')}.${ext}`;
	const file = path.join(__dirname, 'fixture', filename);
	const fileType = await FileType.fromStream(fs.createReadStream(file));

	t.truthy(fileType, `identify ${filename}`);
	t.is(fileType.ext, ext, 'fileType.ext');
	t.is(typeof fileType.mime, 'string', 'fileType.mime');
}

async function loadEntireFile(readable) {
	const buffer = [];
	readable.on('data', chunk => {
		buffer.push(Buffer.from(chunk));
	});

	await new Promise(resolve => readable.on('end', resolve));
	return Buffer.concat(buffer);
}

async function testStream(t, ext, name) {
	const fixtureName = `${(name || 'fixture')}.${ext}`;
	const file = path.join(__dirname, 'fixture', fixtureName);

	const readableStream = await FileType.stream(fs.createReadStream(file));
	const fileStream = fs.createReadStream(file);

	const [bufferA, bufferB] = await Promise.all([loadEntireFile(readableStream), loadEntireFile(fileStream)]);

	t.true(bufferA.equals(bufferB));
}

let i = 0;
for (const type of types) {
	if (Object.prototype.hasOwnProperty.call(names, type)) {
		for (const name of names[type]) {
			const fixtureName = `${name}.${type}`;
			const _test = failingFixture.includes(fixtureName) ? test.failing : test;

			_test(`${name}.${type} ${i++} .fromFile() method - same fileType`, testFromFile, type, name);
			_test(`${name}.${type} ${i++} .fromBuffer() method - same fileType`, testFromBuffer, type, name);
			_test(`${name}.${type} ${i++} .fromStream() method - same fileType`, testFileFromStream, type, name);
			test(`${name}.${type} ${i++} .stream() - identical streams`, testStream, type, name);
		}
	} else {
		const fixtureName = `fixture.${type}`;
		const _test = failingFixture.includes(fixtureName) ? test.failing : test;

		_test(`${type} ${i++} .fromFile()`, testFromFile, type);
		_test(`${type} ${i++} .fromBuffer()`, testFromBuffer, type);
		_test(`${type} ${i++} .fromStream()`, testFileFromStream, type);
		test(`${type} ${i++} .stream() - identical streams`, testStream, type);
	}

	if (Object.prototype.hasOwnProperty.call(falsePositives, type)) {
		for (const falsePositiveFile of falsePositives[type]) {
			test(`false positive - ${type} ${i++}`, testFalsePositive, type, falsePositiveFile);
		}
	}
}

test('.stream() method - empty stream', async t => {
	const newStream = await FileType.stream(readableNoopStream());
	t.is(newStream.fileType, undefined);
});

test('.stream() method - short stream', async t => {
	const bufferA = Buffer.from([0, 1, 0, 1]);
	class MyStream extends stream.Readable {
		_read() {
			this.push(bufferA);
			this.push(null);
		}
	}

	// Test filetype detection
	const shortStream = new MyStream();
	const newStream = await FileType.stream(shortStream);
	t.is(newStream.fileType, undefined);

	// Test usability of returned stream
	const bufferB = await loadEntireFile(newStream);
	t.deepEqual(bufferA, bufferB);
});

test('.stream() method - error event', async t => {
	const errorMessage = 'Fixture';

	const readableStream = new stream.Readable({
		read() {
			process.nextTick(() => {
				this.emit('error', new Error(errorMessage));
			});
		}
	});

	await t.throwsAsync(FileType.stream(readableStream), errorMessage);
});

test('FileType.extensions.has', t => {
	t.true(FileType.extensions.has('jpg'));
	t.false(FileType.extensions.has('blah'));
});

test('FileType.mimeTypes.has', t => {
	t.true(FileType.mimeTypes.has('video/mpeg'));
	t.false(FileType.mimeTypes.has('video/blah'));
});

test('validate the input argument type', async t => {
	await t.throwsAsync(FileType.fromBuffer('x'),
		/Expected the `input` argument to be of type `Uint8Array`/);

	await t.notThrowsAsync(FileType.fromBuffer(Buffer.from('x')));

	await t.notThrowsAsync(FileType.fromBuffer(new Uint8Array()));

	await t.notThrowsAsync(FileType.fromBuffer(new ArrayBuffer()));
});

test('validate the repo has all extensions and mimes in sync', t => {
	// File: core.js (base truth)
	function readIndexJS() {
		const core = fs.readFileSync('core.js', {encoding: 'utf8'});
		const extArray = core.match(/(?<=ext:\s')(.*)(?=',)/g);
		const mimeArray = core.match(/(?<=mime:\s')(.*)(?=')/g);
		const exts = new Set(extArray);
		const mimes = new Set(mimeArray);

		return {
			exts,
			mimes
		};
	}

	// File: core.d.ts
	function readIndexDTS() {
		const core = fs.readFileSync('core.d.ts', {encoding: 'utf8'});
		const matches = core.match(/(?<=\|\s')(.*)(?=')/g);
		const extArray = [];
		const mimeArray = [];

		for (const match of matches) {
			if (match.includes('/')) {
				mimeArray.push(match);
			} else {
				extArray.push(match);
			}
		}

		return {
			extArray,
			mimeArray
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
			'webassembly'
		]);

		const extArray = keywords.filter(keyword => !allowedExtras.has(keyword));
		return extArray;
	}

	// File: readme.md
	function readReadmeMD() {
		const index = fs.readFileSync('readme.md', {encoding: 'utf8'});
		const extArray = index.match(/(?<=-\s\[`)(.*)(?=`)/g);
		return extArray;
	}

	// Helpers
	// Find extensions/mimes that are defined twice in a file
	function findDuplicates(input) {
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
	function validate(found, baseTruth, fileName, extOrMime) {
		const duplicates = findDuplicates(found);
		const extras = findExtras(found, baseTruth);
		const missing = findMissing(found, baseTruth);
		t.is(duplicates.length, 0, `Found duplicate ${extOrMime}: ${duplicates} in ${fileName}.`);
		t.is(extras.length, 0, `Extra ${extOrMime}: ${extras} in ${fileName}.`);
		t.is(missing.length, 0, `Missing ${extOrMime}: ${missing} in ${fileName}.`);
	}

	// Get the base truth of extensions and mimes supported from core.js
	const {exts, mimes} = readIndexJS();

	// Validate all extensions
	const filesWithExtensions = {
		'core.d.ts': readIndexDTS().extArray,
		'supported.js': supported.extensions,
		'package.json': readPackageJSON(),
		'readme.md': readReadmeMD()
	};

	for (const fileName in filesWithExtensions) {
		if (filesWithExtensions[fileName]) {
			const foundExtensions = filesWithExtensions[fileName];
			validate(foundExtensions, exts, fileName, 'extensions');
		}
	}

	// Validate all mimes
	const filesWithMimeTypes = {
		'core.d.ts': readIndexDTS().mimeArray,
		'supported.js': supported.mimeTypes
	};

	for (const fileName in filesWithMimeTypes) {
		if (filesWithMimeTypes[fileName]) {
			const foundMimeTypes = filesWithMimeTypes[fileName];
			validate(foundMimeTypes, mimes, fileName, 'mimes');
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
		const buffer = Buffer.alloc(size);
		await t.notThrowsAsync(FileType.fromBuffer(buffer), `fromBuffer: File size: ${size} bytes`);
	}

	for (const size of oddFileSizes) {
		const buffer = Buffer.alloc(size);
		const stream = new BufferedStream(buffer);
		await t.notThrowsAsync(FileType.fromStream(stream), `fromStream: File size: ${size} bytes`);
	}
});
