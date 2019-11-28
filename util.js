'use strict';

exports.stringToBytes = string => [...string].map(character => character.charCodeAt(0));

const uint8ArrayUtf8ByteString = (array, start, end) => {
	return String.fromCharCode(...array.slice(start, end));
};

exports.readUInt64LE = (buffer, offset = 0) => {
	let n = buffer[offset];
	let mul = 1;
	let i = 0;

	while (++i < 8) {
		mul *= 0x100;
		n += buffer[offset + i] * mul;
	}

	return n;
};

exports.tarHeaderChecksumMatches = buffer => { // Does not check if checksum field characters are valid
	if (buffer.length < 512) { // `tar` header size, cannot compute checksum without it
		return false;
	}

	const MASK_8TH_BIT = 0x80;

	let sum = 256; // Intitalize sum, with 256 as sum of 8 spaces in checksum field
	let signedBitSum = 0; // Initialize signed bit sum

	for (let i = 0; i < 148; i++) {
		const byte = buffer[i];
		sum += byte;
		signedBitSum += byte & MASK_8TH_BIT; // Add signed bit to signed bit sum
	}

	// Skip checksum field

	for (let i = 156; i < 512; i++) {
		const byte = buffer[i];
		sum += byte;
		signedBitSum += byte & MASK_8TH_BIT; // Add signed bit to signed bit sum
	}

	const readSum = parseInt(uint8ArrayUtf8ByteString(buffer, 148, 154), 8); // Read sum in header

	// Some implementations compute checksum incorrectly using signed bytes
	return (
		// Checksum in header equals the sum we calculated
		readSum === sum ||

		// Checksum in header equals sum we calculated plus signed-to-unsigned delta
		readSum === (sum - (signedBitSum << 1))
	);
};

exports.uint8ArrayUtf8ByteString = uint8ArrayUtf8ByteString;
