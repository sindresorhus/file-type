'use strict';
module.exports = function (buf) {
	if (!(buf && buf.length > 1)) {
		return null;
	}

	if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
		return 'jpg';
	}

	if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
		return 'png';
	}

	if (buf[0] === 71 && buf[1] === 73 && buf[2] === 70) {
		return 'gif';
	}

	if (buf[8] === 87 && buf[9] === 69 && buf[10] === 66 && buf[11] === 80) {
		return 'webp';
	}

	if ((buf[0] === 73 && buf[1] === 73 && buf[2] === 42 && buf[3] === 0) || (buf[0] === 77 && buf[1] === 77 && buf[2] === 0 && buf[3] === 42)) {
		return 'tif';
	}

	if (buf[0] === 66 && buf[1] === 77) {
		return 'bmp';
	}

	if (buf[0] === 73 && buf[1] === 73 && buf[2] === 188) {
		return 'jxr';
	}

	if (buf[0] === 56 && buf[1] === 66 && buf[2] === 80 && buf[3] === 83) {
		return 'psd';
	}

	// needs to be before `zip` check
	if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4 &&
		buf.slice(30, 58).toString() === 'mimetypeapplication/epub+zip') {
		return 'epub';
	}

	if (buf[0] === 80 && buf[1] === 75 && (buf[2] === 3 || buf[2] === 5 || buf[2] === 7) && (buf[3] === 4 || buf[3] === 6 || buf[3] === 8)) {
		return 'zip';
	}

	if (buf[257] === 117 && buf[258] === 115 && buf[259] === 116 && buf[260] === 97 && buf[261] === 114) {
		return 'tar';
	}

	if (buf[0] === 82 && buf[1] === 97 && buf[2] === 114 && buf[3] === 33 && buf[4] === 26 && buf[5] === 7 && (buf[6] === 0 || buf[6] === 1)) {
		return 'rar';
	}

	if (buf[0] === 31 && buf[1] === 139 && buf[2] === 8) {
		return 'gz';
	}

	if (buf[0] === 66 && buf[1] === 90 && buf[2] === 104) {
		return 'bz2';
	}

	if (buf[0] === 55 && buf[1] === 122 && buf[2] === 188 && buf[3] === 175 && buf[4] === 39 && buf[5] === 28) {
		return '7z';
	}

	if ((buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && (buf[3] === 24 || buf[3] === 32) && buf[4] === 102 && buf[5] === 116 && buf[6] === 121 && buf[7] === 112) || (buf[0] === 51 && buf[1] === 103 && buf[2] === 112 && buf[3] === 53)) {
		return 'mp4';
	}

	// needs to be before the `webm` check
	if (buf.slice(31, 39).toString() === 'matroska') {
		return 'mkv';
	}

	if (buf[0] === 26 && buf[1] === 69 && buf[2] === 223 && buf[3] === 163) {
		return 'webm';
	}

	if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x14 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
		return 'mov';
	}

	if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x41 && buf[9] === 0x56 && buf[10] === 0x49) {
		return 'avi';
	}

	if (buf[0] === 0x30 && buf[1] === 0x26 && buf[2] === 0xb2 && buf[3] === 0x75 && buf[4] === 0x8e && buf[5] === 0x66 && buf[6] === 0xcf && buf[7] === 0x11 && buf[8] === 0xa6 && buf[9] === 0xd9) {
		return 'wmv';
	}

	if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3].toString(16)[0] === 'b') {
		return 'mpg';
	}

	if ((buf[0] === 73 && buf[1] === 68 && buf[2] === 51) || (buf[0] === 255 && buf[1] === 251)) {
		return 'mp3';
	}

	if ((buf[4] === 102 && buf[5] === 116 && buf[6] === 121 && buf[7] === 112) || (buf[0] === 77 && buf[1] === 52 && buf[2] === 65 && buf[3] === 32)) {
		return 'm4a';
	}

	if (buf[0] === 79 && buf[1] === 103 && buf[2] === 103 && buf[3] === 83) {
		return 'ogg';
	}

	if (buf[0] === 102 && buf[1] === 76 && buf[2] === 97 && buf[3] === 67) {
		return 'flac';
	}

	if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70 && buf[8] === 87 && buf[9] === 65 && buf[10] === 86 && buf[11] === 69) {
		return 'wav';
	}

	if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) {
		return 'pdf';
	}

	if (buf[0] === 77 && buf[1] === 90) {
		return 'exe';
	}

	if ((buf[0] === 67 || buf[0] === 70) && buf[1] === 87 && buf[2] === 83) {
		return 'swf';
	}

	if (buf[0] === 123 && buf[1] === 92 && buf[2] === 114 && buf[3] === 116 && buf[4] === 102) {
		return 'rtf';
	}

	return null;
};
