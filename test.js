const {expect, assert} = require('chai');

const path = require('path');
const fs = require('fs');
const stream = require('stream');
const readChunk = require('read-chunk');
const pify = require('pify');
const {readableNoopStream} = require('noop-stream');
const fileType = require('.');

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

function checkBufferLike(type, bufferLike) {
	const {ext, mime} = fileType(bufferLike) || {};
	assert.equal(ext, type);
	assert.equal(typeof mime, 'string');
}

function testFile(ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const chunk = readChunk.sync(file, 0, 4 + 4096);
	checkBufferLike(ext, chunk);
	checkBufferLike(ext, new Uint8Array(chunk));
	checkBufferLike(ext, chunk.buffer);
}

function testFalsePositive(ext, name) {
	const file = path.join(__dirname, 'fixture', `${name}.${ext}`);
	const chunk = readChunk.sync(file, 0, 4 + 4096);

	assert.equal(fileType(chunk), undefined);
	assert.equal(fileType(new Uint8Array(chunk)), undefined);
	assert.equal(fileType(chunk.buffer), undefined);
}

async function testFileFromStream(ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	console.log(file);
	const readableStream = await fileType.stream(fs.createReadStream(file));

	assert.deepEqual(readableStream.fileType, fileType(readChunk.sync(file, 0, fileType.minimumBytes)));
}

async function testStream(ext, name) {
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

	assert.isTrue(bufferA.equals(bufferB));
}

describe('.stream() method', () => {

	let i = 0;
	for (const type of types /*.filter(type => type !== 'pptx' && type !== 'xlsx')*/ ) {
		describe(`${type}`, () => {
			if (Object.prototype.hasOwnProperty.call(names, type)) {
				for (const name of names[type]) {
					it(`${i++}`, () => {
						testFile(type, name)
					});
					it('same fileType', () => testFileFromStream(type, name));
					it('identical streams', () => testStream(type, name));
				}
			} else {
				it('test-file', () => testFile(type));
				it('same fileType', () => testFileFromStream(type));
				it('identical streams', () => testStream(type));
			}

			if (Object.prototype.hasOwnProperty.call(falsePositives, type)) {
				for (const falsePositiveFile of falsePositives[type]) {
					it(`false positive`, () => testFalsePositive(type, falsePositiveFile));
				}
			}
		});
	}

	it('empty stream', async () => {
		try {
			await fileType.stream(readableNoopStream());
		} catch(error) {
			assert.equal(error.message, 'Expected the `input` argument to be of type `Uint8Array` or `Buffer` or `ArrayBuffer`, got `object`');
		}
	});

	it('error event', async () => {
		const errorMessage = 'Fixture';

		const readableStream = new stream.Readable({
			read() {
				process.nextTick(() => {
					this.emit('error', new Error(errorMessage));
				});
			}
		});

		try {
			await fileType.stream(readableStream);
			assert.fail(`Should throw error: ${errorMessage}`);
		} catch(err) {
			assert.equal(err.message, errorMessage);
		}
	});

});

it('fileType.minimumBytes', () => {
	assert.isTrue(fileType.minimumBytes > 4000);
});

it('fileType.extensions.has', () => {
	assert.isTrue(fileType.extensions.has('jpg'));
	assert.isFalse(fileType.extensions.has('blah'));
});

it('fileType.mimeTypes.has', () => {
	assert.isTrue(fileType.mimeTypes.has('video/mpeg'));
	assert.isFalse(fileType.mimeTypes.has('video/blah'));
});

it('validate the input argument type', () => {
	assert.throw(() => {
		fileType('x');
	}, /Expected the `input` argument to be of type `Uint8Array`/);

	fileType(Buffer.from('x'));

	fileType(new Uint8Array());

	fileType(new ArrayBuffer());
});

it('validate the repo has all extensions and mimes in sync', () => {
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
		assert.equal(duplicates.length, 0, `Found duplicate ${extOrMime}: ${duplicates} in ${fileName}.`);
		assert.equal(extras.length, 0, `Extra ${extOrMime}: ${extras} in ${fileName}.`);
		assert.equal(missing.length, 0, `Missing ${extOrMime}: ${missing} in ${fileName}.`);
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
