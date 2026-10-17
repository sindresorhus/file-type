import * as Token from 'token-types';
import {createTokenizerView, TokenizerBoundaryError} from 'strtok3/core';
import {getUintBE} from 'uint8array-extras';
import {
	maximumUntrustedSkipSizeInBytes,
	getSafeBound,
	safeReadBuffer,
	safeIgnore,
	hasUnknownFileSize,
	hasExceededUnknownSizeScanBudget,
} from '../parser.js';

const maximumEbmlDocumentTypeSizeInBytes = 64;
const maximumEbmlElementPayloadSizeInBytes = 1024 * 1024;
const maximumEbmlElementCount = 256;

export async function detectEbml(tokenizer) {
	async function readField(input) {
		const msb = await input.peekNumber(Token.UINT8);
		let mask = 0x80;
		let ic = 0; // 0 = A, 1 = B, 2 = C, 3 = D

		while (mask !== 0 && (msb & mask) === 0) {
			++ic;
			mask >>= 1;
		}

		const id = new Uint8Array(ic + 1);
		await safeReadBuffer(input, id, undefined, {
			maximumLength: id.length,
			reason: 'EBML field',
		});
		return id;
	}

	async function readElement(input) {
		const idField = await readField(input);
		const lengthField = await readField(input);

		lengthField[0] ^= 0x80 >> (lengthField.length - 1);
		const nrLength = Math.min(6, lengthField.length); // JavaScript can max read 6 bytes integer

		const idView = new DataView(idField.buffer);
		const lengthView = new DataView(lengthField.buffer, lengthField.length - nrLength, nrLength);

		return {
			id: getUintBE(idView),
			len: getUintBE(lengthView),
		};
	}

	const isUnknownFileSize = hasUnknownFileSize(tokenizer);

	async function readChildren(header) {
		let ebmlElementCount = 0;
		while (header.remaining > 0) {
			ebmlElementCount++;
			if (ebmlElementCount > maximumEbmlElementCount) {
				return;
			}

			if (hasExceededUnknownSizeScanBudget(tokenizer, ebmlScanStart, maximumUntrustedSkipSizeInBytes)) {
				return;
			}

			const previousPosition = tokenizer.position;
			const element = await readElement(header);

			if (element.id === 0x42_82) {
				// `DocType` is a short string ("webm", "matroska", ...), reject implausible lengths to avoid large allocations.
				if (element.len > maximumEbmlDocumentTypeSizeInBytes) {
					return;
				}

				const documentTypeLength = getSafeBound(element.len, maximumEbmlDocumentTypeSizeInBytes, 'EBML DocType');
				const rawValue = await header.readToken(new Token.StringType(documentTypeLength));
				return rawValue.split('\0', 1)[0]; // Return DocType
			}

			if (
				isUnknownFileSize
				&& (
					!Number.isFinite(element.len)
					|| element.len < 0
					|| element.len > maximumEbmlElementPayloadSizeInBytes
				)
			) {
				return;
			}

			await safeIgnore(header, element.len, {
				maximumLength: isUnknownFileSize ? maximumEbmlElementPayloadSizeInBytes : header.fileInfo.size,
				reason: 'EBML payload',
			}); // ignore payload

			// Safeguard against malformed files: bail if the position did not advance.
			if (tokenizer.position <= previousPosition) {
				return;
			}
		}
	}

	const rootElement = await readElement(tokenizer);
	const ebmlScanStart = tokenizer.position;
	const header = createTokenizerView(tokenizer, rootElement.len);
	let documentType;
	try {
		documentType = await readChildren(header);
	} catch (error) {
		if (error instanceof TokenizerBoundaryError) {
			return;
		}

		throw error;
	} finally {
		// Detection can stop at DocType; do not drain the rest or close the source.
		await header.close();
	}

	switch (documentType) {
		case 'webm':
			return {
				ext: 'webm',
				mime: 'video/webm',
			};

		case 'matroska':
			return {
				ext: 'mkv',
				mime: 'video/matroska',
			};

		default:
	}
}
