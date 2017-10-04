import path from 'path';
import test from 'ava';
import readChunk from 'read-chunk';
import fileType from '.';

function check(ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const fileInfo = fileType(readChunk.sync(file, 0, 4 + 4096)) || {};
	return fileInfo.ext;
}

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
	'mp3',
	'm4a',
	'ogg',
	'opus',
	'flac',
	'wav',
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
	'3gp'
];

const names = {
	woff2: ['fixture', 'fixture-otto'],
	woff: ['fixture', 'fixture-otto'],
	eot: ['fixture', 'fixture-0x20001'],
	mov: ['fixture', 'fixture-mjpeg'],
	mp3: ['fixture', 'fixture-offset1-id3', 'fixture-offset1', 'fixture-mp2l3', 'fixture-ffe3'],
	mp4: ['fixture-imovie', 'fixture-isom', 'fixture-isomv2', 'fixture-mp4v2', 'fixture-m4v', 'fixture-dash'],
	tif: ['fixture-big-endian', 'fixture-little-endian'],
	gz: ['fixture.tar'],
	xz: ['fixture.tar'],
	lz: ['fixture.tar'],
	Z: ['fixture.tar'],
	mkv: ['fixture', 'fixture2'],
	mxf: ['fixture']
};

function testFile(t, type, name) {
	t.is(check(type, name), type);
}

for (const type of types) {
	if (Object.prototype.hasOwnProperty.call(names, type)) {
		for (const name of names[type]) {
			test(type, testFile, type, name);
		}
	} else {
		test(type, testFile, type);
	}
}
