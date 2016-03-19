import path from 'path';
import test from 'ava';
import fs from 'fs';
import fileType from './';

function check(ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	const fileInfo = fileType(fs.readFileSync(file)) || {};

	return fileInfo.ext;
}

const types = [
	'jpg',
	'png',
	'gif',
	'webp',
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
	'm4v',
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
	'docx',
	'xlsx',
	'pptx'
];

const names = {
	woff2: ['fixture', 'fixture-otto'],
	woff: ['fixture', 'fixture-otto'],
	eot: ['fixture', 'fixture-0x20001'],
	mp4: ['fixture-imovie', 'fixture-isom', 'fixture-isomv2'],
	tif: ['fixture-big-endian', 'fixture-little-endian'],
	gz: ['fixture.tar'],
	xz: ['fixture.tar'],
	lz: ['fixture.tar'],
	Z: ['fixture.tar']
};

function testFile(type, name) {
	test(type, t => {
		t.is(check(type, name), type);
	});
}

types.forEach(type => {
	if (names.hasOwnProperty(type)) {
		names[type].forEach(name => testFile(type, name));
	} else {
		testFile(type);
	}
});
