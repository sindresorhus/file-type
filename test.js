import path from 'path';
import fs from 'fs';
import stream from 'stream';
import test from 'ava';
import readChunk from 'read-chunk';
import pify from 'pify';
import {readableNoopStream} from 'noop-stream';
import fileType from '.';

const types = [
	'jpg',
	'png',
	'apng',
	'gif',
	'webp',
	'flif',
	'cr2',
	'orf',
	'arw',
	'dng',
	'nef',
	'rw2',
	'raf',
	'tif',
	'bmp',
	'jxr',
	'psd',
	'zip',
	'tar',
	'rar',
	'gz',
	'bz2',
	'7z',
	'dmg',
	'mp4',
	'mid',
	'mkv',
	'webm',
	'mov',
	'avi',
	'wmv',
	'mpg',
	'mp2',
	'mp3',
	'm4a',
	'oga',
	'ogg',
	'ogv',
	'opus',
	'flac',
	'wav',
	'spx',
	'amr',
	'pdf',
	'epub',
	'exe',
	'swf',
	'rtf',
	'wasm',
	'woff',
	'woff2',
	'eot',
	'ttf',
	'otf',
	'ico',
	'flv',
	'ps',
	'xz',
	'sqlite',
	'nes',
	'crx',
	'xpi',
	'cab',
	'deb',
	'ar',
	'rpm',
	'Z',
	'lz',
	'msi',
	'mxf',
	'mts',
	'blend',
	'bpg',
	'docx',
	'pptx',
	'xlsx',
	'3gp',
	'3g2',
	'jp2',
	'jpm',
	'jpx',
	'mj2',
	'aif',
	'qcp',
	'odt',
	'ods',
	'odp',
	'xml',
	'mobi',
	'heic',
	'cur',
	'ktx',
	'ape',
	'wv',
	'wma',
	'dcm',
	'ics',
	'glb',
	'pcap',
	'dsf',
	'lnk',
	'alias',
	'voc',
	'ac3',
	'm4v',
	'm4p',
	'm4b',
	'f4v',
	'f4p',
	'f4b'
	// TODO needs test file 'f4a',
	// TODO needs test file 'asf',
	// TODO needs test file 'ogm',
	// TODO needs test file 'ogx',
	// TODO needs test file 'mpc'
];

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
		const extArray = index.match(/(?<=\|\s')(.*)(?=')/g);
		return extArray;
	}

	// File: test.js
	const testExts = types.concat(['f4a', 'asf', 'ogm', 'ogx', 'mpc']); // Override missing files

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

	const {exts} = readIndexJS();

	const fileMap = {
		'index.d.ts': readIndexDTS(),
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

	// // Validate all mimes
	// const {mimes} = readIndexJS();

	// const testMimes = [];
	// for (const type in names) {
	// 	if (names[type]) {
	// 		for (const subtype of names[type]) {
	// 			testMimes.push(`${type}/${subtype}`);
	// 		}
	// 	}
	// }

	// const duplicateMimes = findDuplicates(testMimes);
	// const extraMimes = findExtras(testMimes, mimes);
	// const missingMimes = findMissing(testMimes, mimes);
	// t.is(duplicateMimes.length, 0, `Found duplicate mimes: ${duplicateMimes} in test.js.`);
	// t.is(extraMimes.length, 0, `Extra mimes: ${extraMimes} in test.js.`);
	// t.is(missingMimes.length, 0, `Missing mimes: ${missingMimes} in test.js.`);
});
