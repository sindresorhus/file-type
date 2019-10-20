import path from 'path';
import fs from 'fs';
import stream from 'stream';
import test from 'ava';
import readChunk from 'read-chunk';
import pify from 'pify';
import {readableNoopStream} from 'noop-stream';
import fileType from '.';

const supported = require('./supported');

const missingTests = [
	'asf',
	'ogm',
	'ogx',
	'mpc'
];

const types = supported.extensions.filter(ext => !missingTests.includes(ext));

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names = {
	arw: [
		'fixture',
		'fixture2',
		'fixture3',
		'fixture4',
		'fixture5'
	],
	dng: [
		'fixture',
		'fixture2'
	],
	nef: [
		'fixture',
		'fixture2'
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
		'fixture-mpa',
		'fixture-faac-adts'
	],
	mp3: [
		'fixture',
		'fixture-offset1-id3',
		'fixture-offset1',
		'fixture-mp2l3',
		'fixture-ffe3'
	],
	mp4: [
		'fixture-imovie',
		'fixture-isom',
		'fixture-isomv2',
		'fixture-mp4v2',
		'fixture-dash',
		'fixture-aac-adts'
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
		'fixture2'
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
	tar: [
		'fixture',
		'fixture-v7'
	],
	mie: [
		'fixture-big-endian',
		'fixture-little-endian'
	]
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives = {
	msi: [
		'fixture-ppt',
		'fixture-doc',
		'fixture-xls'
	]
};

const checkBufferLike = (t, type, bufferLike) => {
	const {ext, mime} = fileType(bufferLike) || {};
	t.is(ext, type);
	t.is(typeof mime, 'string');
};

const testFile = (t, ext, name) => {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const chunk = readChunk.sync(file, 0, 4 + 4096);
	checkBufferLike(t, ext, chunk);
	checkBufferLike(t, ext, new Uint8Array(chunk));
	checkBufferLike(t, ext, chunk.buffer);
};

const testFalsePositive = (t, ext, name) => {
	const file = path.join(__dirname, 'fixture', `${name}.${ext}`);
	const chunk = readChunk.sync(file, 0, 4 + 4096);

	t.is(fileType(chunk), undefined);
	t.is(fileType(new Uint8Array(chunk)), undefined);
	t.is(fileType(chunk.buffer), undefined);
};

const testFileFromStream = async (t, ext, name) => {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const readableStream = await fileType.stream(fs.createReadStream(file));

	t.deepEqual(readableStream.fileType, fileType(readChunk.sync(file, 0, fileType.minimumBytes)));
};

const testStream = async (t, ext, name) => {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);

	const readableStream = await fileType.stream(fs.createReadStream(file));
	const fileStream = fs.createReadStream(file);

	const loadEntireFile = async readable => {
		const buffer = [];
		readable.on('data', chunk => {
			buffer.push(Buffer.from(chunk));
		});

		if (stream.finished) {
			const finished = pify(stream.finished);
			await finished(readable);
		} else {
			await new Promise(resolve => readable.on('end', resolve));
		}

		return Buffer.concat(buffer);
	};

	const [bufferA, bufferB] = await Promise.all([loadEntireFile(readableStream), loadEntireFile(fileStream)]);

	t.true(bufferA.equals(bufferB));
};

let i = 0;
for (const type of types) {
	if (Object.prototype.hasOwnProperty.call(names, type)) {
		for (const name of names[type]) {
			test(`${type} ${i++}`, testFile, type, name);
			test(`.stream() method - same fileType - ${type} ${i++}`, testFileFromStream, type, name);
			test(`.stream() method - identical streams - ${type} ${i++}`, testStream, type, name);
		}
	} else {
		test(`${type} ${i++}`, testFile, type);
		test(`.stream() method - same fileType - ${type} ${i++}`, testFileFromStream, type);
		test(`.stream() method - identical streams - ${type} ${i++}`, testStream, type);
	}

	if (Object.prototype.hasOwnProperty.call(falsePositives, type)) {
		for (const falsePositiveFile of falsePositives[type]) {
			test(`false positive - ${type} ${i++}`, testFalsePositive, type, falsePositiveFile);
		}
	}
}

test('.stream() method - empty stream', async t => {
	await t.throwsAsync(
		fileType.stream(readableNoopStream()),
		/Expected the `input` argument to be of type `Uint8Array` /
	);
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

	await t.throwsAsync(fileType.stream(readableStream), errorMessage);
});

test('fileType.minimumBytes', t => {
	t.true(fileType.minimumBytes > 4000);
});

test('fileType.extensions.has', t => {
	t.true(fileType.extensions.has('jpg'));
	t.false(fileType.extensions.has('blah'));
});

test('fileType.mimeTypes.has', t => {
	t.true(fileType.mimeTypes.has('video/mpeg'));
	t.false(fileType.mimeTypes.has('video/blah'));
});

test('validate the input argument type', t => {
	t.throws(() => {
		fileType('x');
	}, /Expected the `input` argument to be of type `Uint8Array`/);

	t.notThrows(() => {
		fileType(Buffer.from('x'));
	});

	t.notThrows(() => {
		fileType(new Uint8Array());
	});

	t.notThrows(() => {
		fileType(new ArrayBuffer());
	});
});

test('validate the repo has all extensions and mimes in sync', t => {
	// File: index.js (base truth)
	function readIndexJS() {
		const index = fs.readFileSync('index.js', {encoding: 'utf8'});
		const extArray = index.match(/(?<=ext:\s')(.*)(?=',)/g);
		const mimeArray = index.match(/(?<=mime:\s')(.*)(?=')/g);
		const exts = new Set(extArray);
		const mimes = new Set(mimeArray);

		return {
			exts,
			mimes
		};
	}

	// File: index.d.ts
	function readIndexDTS() {
		const index = fs.readFileSync('index.d.ts', {encoding: 'utf8'});
		const matches = index.match(/(?<=\|\s')(.*)(?=')/g);
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
		const index = fs.readFileSync('package.json', {encoding: 'utf8'});
		const {keywords} = JSON.parse(index);

		const allowedExtras = new Set([
			'mime',
			'file',
			'type',
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
			if (array.indexOf(element) !== index && accumulator.indexOf(element) < 0) {
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
	function validate(found, baseTruth, fileName, extOrMime) {
		const duplicates = findDuplicates(found);
		const extras = findExtras(found, baseTruth);
		const missing = findMissing(found, baseTruth);
		t.is(duplicates.length, 0, `Found duplicate ${extOrMime}: ${duplicates} in ${fileName}.`);
		t.is(extras.length, 0, `Extra ${extOrMime}: ${extras} in ${fileName}.`);
		t.is(missing.length, 0, `Missing ${extOrMime}: ${missing} in ${fileName}.`);
	}

	// Get the base truth of extensions and mimes supported from index.js
	const {exts, mimes} = readIndexJS();

	// Validate all extensions
	const filesWithExtensions = {
		'index.d.ts': readIndexDTS().extArray,
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
		'index.d.ts': readIndexDTS().mimeArray,
		'supported.js': supported.mimeTypes
	};

	for (const fileName in filesWithMimeTypes) {
		if (filesWithMimeTypes[fileName]) {
			const foundMimeTypes = filesWithMimeTypes[fileName];
			validate(foundMimeTypes, mimes, fileName, 'mimes');
		}
	}
});
