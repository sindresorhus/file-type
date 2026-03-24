import * as Token from 'token-types';
import * as strtok3 from 'strtok3/core';
import {
	maximumUntrustedSkipSizeInBytes,
	ParserHardLimitError,
	checkBytes,
	safeReadBuffer,
	safeIgnore,
	hasUnknownFileSize,
	hasExceededUnknownSizeScanBudget,
} from '../parser.js';

const maximumAsfHeaderObjectCount = 512;
const maximumAsfHeaderPayloadSizeInBytes = 1024 * 1024;

export async function detectAsf(tokenizer) {
	let isMalformedAsf = false;
	try {
		async function readHeader() {
			const guid = new Uint8Array(16);
			await safeReadBuffer(tokenizer, guid, undefined, {
				maximumLength: guid.length,
				reason: 'ASF header GUID',
			});
			return {
				id: guid,
				size: Number(await tokenizer.readToken(Token.UINT64_LE)),
			};
		}

		await safeIgnore(tokenizer, 30, {
			maximumLength: 30,
			reason: 'ASF header prelude',
		});
		const isUnknownFileSize = hasUnknownFileSize(tokenizer);
		const asfHeaderScanStart = tokenizer.position;
		let asfHeaderObjectCount = 0;
		while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
			asfHeaderObjectCount++;
			if (asfHeaderObjectCount > maximumAsfHeaderObjectCount) {
				break;
			}

			if (hasExceededUnknownSizeScanBudget(tokenizer, asfHeaderScanStart, maximumUntrustedSkipSizeInBytes)) {
				break;
			}

			const previousPosition = tokenizer.position;
			const header = await readHeader();
			let payload = header.size - 24;
			if (
				!Number.isFinite(payload)
				|| payload < 0
			) {
				isMalformedAsf = true;
				break;
			}

			if (checkBytes(header.id, [0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65])) {
				// Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
				const typeId = new Uint8Array(16);
				payload -= await safeReadBuffer(tokenizer, typeId, undefined, {
					maximumLength: typeId.length,
					reason: 'ASF stream type GUID',
				});

				if (checkBytes(typeId, [0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
					// Found audio:
					return {
						ext: 'asf',
						mime: 'audio/x-ms-asf',
					};
				}

				if (checkBytes(typeId, [0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
					// Found video:
					return {
						ext: 'asf',
						mime: 'video/x-ms-asf',
					};
				}

				break;
			}

			if (
				isUnknownFileSize
				&& payload > maximumAsfHeaderPayloadSizeInBytes
			) {
				isMalformedAsf = true;
				break;
			}

			await safeIgnore(tokenizer, payload, {
				maximumLength: isUnknownFileSize ? maximumAsfHeaderPayloadSizeInBytes : tokenizer.fileInfo.size,
				reason: 'ASF header payload',
			});

			// Safeguard against malformed files: break if the position did not advance.
			if (tokenizer.position <= previousPosition) {
				isMalformedAsf = true;
				break;
			}
		}
	} catch (error) {
		if (
			error instanceof strtok3.EndOfStreamError
			|| error instanceof ParserHardLimitError
		) {
			if (hasUnknownFileSize(tokenizer)) {
				isMalformedAsf = true;
			}
		} else {
			throw error;
		}
	}

	if (isMalformedAsf) {
		return;
	}

	// Default to ASF generic extension
	return {
		ext: 'asf',
		mime: 'application/vnd.ms-asf',
	};
}
