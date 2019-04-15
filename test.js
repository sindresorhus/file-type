import path from 'path';
import fs from 'fs';
import stream from 'stream';
import test from 'ava';
import readChunk from 'read-chunk';
import pify from 'pify';
import fileType from '.';

const check = (ext, name) => {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	return fileType(readChunk.sync(file, 0, 4 + 4096)) || {};
};

const types = [
	'jpg',
	'png',
	'gif',
	'webp',
	'flif',
	'cr2',
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
	'wmv',
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
	'f4b',
	'f4a'
];

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names = {
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

const testFile = (t, type, name) => {
	const {ext, mime} = check(type, name);
	t.is(ext, type);
	t.is(typeof mime, 'string');
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
	const emptyStream = fs.createReadStream('/dev/null');
	await t.throwsAsync(
		fileType.stream(emptyStream),
		/Expected the `input` argument to be of type `Uint8Array` /
	);
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
