import path from 'path';
import test from 'ava';
import readChunk from 'read-chunk';
import fileType from '.';

const check = (ext, name) => {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const fileInfo = fileType(readChunk.sync(file, 0, 4 + 4096)) || {};
	return fileInfo.ext;
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
	'wma'
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
		'fixture-mjpeg'
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
		'fixture-m4v',
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
	]
};

const testFile = (t, type, name) => {
	t.is(check(type, name), type);
};

for (const type of types) {
	if (Object.prototype.hasOwnProperty.call(names, type)) {
		for (const name of names[type]) {
			test(type, testFile, type, name);
		}
	} else {
		test(type, testFile, type);
	}
}
