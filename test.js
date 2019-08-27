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
		'fixture4'
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
		const index = fs.readFileSync('./index.js', {encoding: 'utf8'});
		const extArray = index.match(/(?<=ext:\s')(.*)(?=',)/g);
		const mimeArray = index.match(/(?<=mime:\s')(.*)(?=')/g);
		const exts = new Set(extArray);
		const mimes = new Set(mimeArray);
		return {exts, mimes};
	}

	// File: index.d.ts
	function readIndexDTS() {
		const index = fs.readFileSync('./index.d.ts', {encoding: 'utf8'});
		const matches = index.match(/(?<=\|\s')(.*)(?=')/g);
		const extArray = [];
		const mimeArray = [];
		matches.forEach(match => {
			if (match.includes('/')) {
				mimeArray.push(match);
			} else {
				extArray.push(match);
			}
		});

		return {extArray, mimeArray};
	}

	// File: test.js
	const testExts = types.concat(missingTests); // Override missing files

	// File: package.json
	function readPackageJSON() {
		const index = fs.readFileSync('./package.json', {encoding: 'utf8'});
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
		const index = fs.readFileSync('./readme.md', {encoding: 'utf8'});
		const extArray = index.match(/(?<=-\s\[`)(.*)(?=`)/g);
		return extArray;
	}

	// Helpers
	// Find elements that are in defined twice
	function findDuplicates(input) {
		return input.reduce((acc, el, i, arr) => {
			if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) {
				acc.push(el);
			}

			return acc;
		}, []);
	}

	// Find extensions/mimes that are in another file but not in index.js
	function findExtras(arr, set) {
		return arr.filter(elt => !set.has(elt));
	}

	// Find extensions/mimes that are in index.js but missing from another file
	function findMissing(arr, set) {
		const missing = [];
		const other = new Set(arr);
		for (const elt of set) {
			if (!other.has(elt)) {
				missing.push(elt);
			}
		}

		return missing;
	}

	// Get the base truth of extensions and mimes supported from index.js
	const {exts, mimes} = readIndexJS();

	const fileMap = {
		'index.d.ts': readIndexDTS().extArray,
		'test.js': testExts,
		'package.json': readPackageJSON(),
		'readme.md': readReadmeMD()
	};

	// Validate all extensions
	for (const fileName in fileMap) {
		if (fileMap[fileName]) {
			const foundExtensions = fileMap[fileName];
			const duplicateExtensions = findDuplicates(foundExtensions);
			const extraExtensions = findExtras(foundExtensions, exts);
			const missingExtensions = findMissing(foundExtensions, exts);
			t.is(duplicateExtensions.length, 0, `Found duplicate extensions: ${duplicateExtensions} in ${fileName}.`);
			t.is(extraExtensions.length, 0, `Extra extensions: ${extraExtensions} in ${fileName}.`);
			t.is(missingExtensions.length, 0, `Missing extensions: ${missingExtensions} in ${fileName}.`);
		}
	}

	// Validate all mimes
	const duplicateMimes = findDuplicates(supported.mimeTypes);
	const extraMimes = findExtras(supported.mimeTypes, mimes);
	const missingMimes = findMissing(supported.mimeTypes, mimes);
	t.is(duplicateMimes.length, 0, `Found duplicate mimes: ${duplicateMimes} in supported.js.`);
	t.is(extraMimes.length, 0, `Extra mimes: ${extraMimes} in supported.js.`);
	t.is(missingMimes.length, 0, `Missing mimes: ${missingMimes} in supported.js.`);
});
