import * as Token from 'token-types';
import * as strtok3 from 'strtok3/core';
import {
	ParserHardLimitError,
	safeIgnore,
	hasUnknownFileSize,
	hasExceededUnknownSizeScanBudget,
} from '../parser.js';

const maximumPngChunkCount = 512;
const maximumPngStreamScanBudgetInBytes = 16 * 1024 * 1024;
const maximumPngChunkSizeInBytes = 1024 * 1024;

function isPngAncillaryChunk(type) {
	return (type.codePointAt(0) & 0x20) !== 0;
}

export async function detectPng(tokenizer) {
	const pngFileType = {
		ext: 'png',
		mime: 'image/png',
	};

	const apngFileType = {
		ext: 'apng',
		mime: 'image/apng',
	};

	// APNG format (https://wiki.mozilla.org/APNG_Specification)
	// 1. Find the first IDAT (image data) chunk (49 44 41 54)
	// 2. Check if there is an "acTL" chunk before the IDAT one (61 63 54 4C)

	// Offset calculated as follows:
	// - 8 bytes: PNG signature
	// - 4 (length) + 4 (chunk type) + 13 (chunk data) + 4 (CRC): IHDR chunk

	await tokenizer.ignore(8); // ignore PNG signature

	async function readChunkHeader() {
		return {
			length: await tokenizer.readToken(Token.INT32_BE),
			type: await tokenizer.readToken(new Token.StringType(4, 'latin1')),
		};
	}

	const isUnknownPngStream = hasUnknownFileSize(tokenizer);
	const pngScanStart = tokenizer.position;
	let pngChunkCount = 0;
	let hasSeenImageHeader = false;
	do {
		pngChunkCount++;
		if (pngChunkCount > maximumPngChunkCount) {
			break;
		}

		if (hasExceededUnknownSizeScanBudget(tokenizer, pngScanStart, maximumPngStreamScanBudgetInBytes)) {
			break;
		}

		const previousPosition = tokenizer.position;
		const chunk = await readChunkHeader();
		if (chunk.length < 0) {
			return; // Invalid chunk length
		}

		if (chunk.type === 'IHDR') {
			// PNG requires the first real image header to be a 13-byte IHDR chunk.
			if (chunk.length !== 13) {
				return;
			}

			hasSeenImageHeader = true;
		}

		switch (chunk.type) {
			case 'IDAT':
				return pngFileType;
			case 'acTL':
				return apngFileType;
			default:
				if (
					!hasSeenImageHeader
					&& chunk.type !== 'CgBI'
				) {
					return;
				}

				if (
					isUnknownPngStream
					&& chunk.length > maximumPngChunkSizeInBytes
				) {
					// Avoid huge attacker-controlled skips when probing unknown-size streams.
					return hasSeenImageHeader && isPngAncillaryChunk(chunk.type) ? pngFileType : undefined;
				}

				try {
					await safeIgnore(tokenizer, chunk.length + 4, {
						maximumLength: isUnknownPngStream ? maximumPngChunkSizeInBytes + 4 : tokenizer.fileInfo.size,
						reason: 'PNG chunk payload',
					}); // Ignore chunk-data + CRC
				} catch (error) {
					if (
						!isUnknownPngStream
						&& (
							error instanceof ParserHardLimitError
							|| error instanceof strtok3.EndOfStreamError
						)
					) {
						return pngFileType;
					}

					throw error;
				}
		}

		// Safeguard against malformed files: bail if the position did not advance.
		if (tokenizer.position <= previousPosition) {
			break;
		}
	} while (tokenizer.position + 8 < tokenizer.fileInfo.size);

	return pngFileType;
}
