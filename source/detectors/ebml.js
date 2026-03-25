import * as Token from 'token-types';
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
	async function readField() {
		const msb = await tokenizer.peekNumber(Token.UINT8);
		let mask = 0x80;
		let ic = 0; // 0 = A, 1 = B, 2 = C, 3 = D

		while ((msb & mask) === 0 && mask !== 0) {
			++ic;
			mask >>= 1;
		}

		const id = new Uint8Array(ic + 1);
		await safeReadBuffer(tokenizer, id, undefined, {
			maximumLength: id.length,
			reason: 'EBML field',
		});
		return id;
	}

	async function readElement() {
		const idField = await readField();
		const lengthField = await readField();

		lengthField[0] ^= 0x80 >> (lengthField.length - 1);
		const nrLength = Math.min(6, lengthField.length); // JavaScript can max read 6 bytes integer

		const idView = new DataView(idField.buffer);
		const lengthView = new DataView(lengthField.buffer, lengthField.length - nrLength, nrLength);

		return {
			id: getUintBE(idView),
			len: getUintBE(lengthView),
		};
	}

	async function readChildren(children) {
		let ebmlElementCount = 0;
		while (children > 0) {
			ebmlElementCount++;
			if (ebmlElementCount > maximumEbmlElementCount) {
				return;
			}

			if (hasExceededUnknownSizeScanBudget(tokenizer, ebmlScanStart, maximumUntrustedSkipSizeInBytes)) {
				return;
			}

			const previousPosition = tokenizer.position;
			const element = await readElement();

			if (element.id === 0x42_82) {
				// `DocType` is a short string ("webm", "matroska", ...), reject implausible lengths to avoid large allocations.
				if (element.len > maximumEbmlDocumentTypeSizeInBytes) {
					return;
				}

				const documentTypeLength = getSafeBound(element.len, maximumEbmlDocumentTypeSizeInBytes, 'EBML DocType');
				const rawValue = await tokenizer.readToken(new Token.StringType(documentTypeLength));
				return rawValue.replaceAll(/\0.*$/gv, ''); // Return DocType
			}

			if (
				hasUnknownFileSize(tokenizer)
				&& (
					!Number.isFinite(element.len)
					|| element.len < 0
					|| element.len > maximumEbmlElementPayloadSizeInBytes
				)
			) {
				return;
			}

			await safeIgnore(tokenizer, element.len, {
				maximumLength: hasUnknownFileSize(tokenizer) ? maximumEbmlElementPayloadSizeInBytes : tokenizer.fileInfo.size,
				reason: 'EBML payload',
			}); // ignore payload
			--children;

			// Safeguard against malformed files: bail if the position did not advance.
			if (tokenizer.position <= previousPosition) {
				return;
			}
		}
	}

	const rootElement = await readElement();
	const ebmlScanStart = tokenizer.position;
	const documentType = await readChildren(rootElement.len);

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
