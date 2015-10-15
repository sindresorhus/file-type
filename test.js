import path from 'path';
import test from 'ava';
import readChunk from 'read-chunk';
import fileType from './';

function check(ext, name) {
	const file = path.join(__dirname, 'fixture', `${(name || 'fixture')}.${ext}`);
	return fileType(readChunk.sync(file, 0, 262)).ext;
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
	'sqlite'
];

const names = {
	mp4: ['fixture-imovie'],
	tif: ['fixture-big-endian', 'fixture-little-endian'],
	gz: ['fixture.tar'],
	xz: ['fixture.tar']
};

function testFile(type, name) {
	test(type, t => {
		t.is(check(type, name), type);
		t.end();
	});
}

types.forEach(type => {
	if (names.hasOwnProperty(type)) {
		names[type].forEach(name => testFile(type, name));
	} else {
		testFile(type);
	}
});
