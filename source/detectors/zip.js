import * as Token from 'token-types';
import * as strtok3 from 'strtok3/core';
import {ZipHandler} from '@tokenizer/inflate';
import {
	maximumUntrustedSkipSizeInBytes,
	ParserHardLimitError,
	safeIgnore,
	hasUnknownFileSize,
	hasExceededUnknownSizeScanBudget,
} from '../parser.js';

const maximumZipEntrySizeInBytes = 1024 * 1024;
const maximumZipEntryCount = 1024;
const maximumZipBufferedReadSizeInBytes = (2 ** 31) - 1;
const maximumZipTextEntrySizeInBytes = maximumZipEntrySizeInBytes;

const recoverableZipErrorMessages = new Set([
	'Unexpected signature',
	'Encrypted ZIP',
	'Expected Central-File-Header signature',
]);
const recoverableZipErrorMessagePrefixes = [
	'ZIP entry count exceeds ',
	'Unsupported ZIP compression method:',
	'ZIP entry compressed data exceeds ',
	'ZIP entry decompressed data exceeds ',
	'Expected data-descriptor-signature at position ',
];
const recoverableZipErrorCodes = new Set([
	'Z_BUF_ERROR',
	'Z_DATA_ERROR',
	'ERR_INVALID_STATE',
]);

async function decompressDeflateRawWithLimit(data, {maximumLength = maximumZipEntrySizeInBytes} = {}) {
	const input = new ReadableStream({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		},
	});
	const output = input.pipeThrough(new DecompressionStream('deflate-raw'));
	const reader = output.getReader();
	const chunks = [];
	let totalLength = 0;

	try {
		for (;;) {
			const {done, value} = await reader.read();
			if (done) {
				break;
			}

			totalLength += value.length;
			if (totalLength > maximumLength) {
				await reader.cancel();
				throw new Error(`ZIP entry decompressed data exceeds ${maximumLength} bytes`);
			}

			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const uncompressedData = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		uncompressedData.set(chunk, offset);
		offset += chunk.length;
	}

	return uncompressedData;
}

function mergeByteChunks(chunks, totalLength) {
	const merged = new Uint8Array(totalLength);
	let offset = 0;

	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.length;
	}

	return merged;
}

function getMaximumZipBufferedReadLength(tokenizer) {
	const fileSize = tokenizer.fileInfo.size;
	const remainingBytes = Number.isFinite(fileSize)
		? Math.max(0, fileSize - tokenizer.position)
		: Number.MAX_SAFE_INTEGER;

	return Math.min(remainingBytes, maximumZipBufferedReadSizeInBytes);
}

function isRecoverableZipError(error) {
	if (error instanceof strtok3.EndOfStreamError) {
		return true;
	}

	if (error instanceof ParserHardLimitError) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	if (recoverableZipErrorMessages.has(error.message)) {
		return true;
	}

	if (recoverableZipErrorCodes.has(error.code)) {
		return true;
	}

	for (const prefix of recoverableZipErrorMessagePrefixes) {
		if (error.message.startsWith(prefix)) {
			return true;
		}
	}

	return false;
}

function canReadZipEntryForDetection(zipHeader, maximumSize = maximumZipEntrySizeInBytes) {
	const sizes = [zipHeader.compressedSize, zipHeader.uncompressedSize];
	for (const size of sizes) {
		if (
			!Number.isFinite(size)
			|| size < 0
			|| size > maximumSize
		) {
			return false;
		}
	}

	return true;
}

// -- iWork helpers --

function createIWorkZipDetectionState() {
	return {
		hasDocumentEntry: false,
		hasMasterSlideEntry: false,
		hasTablesEntry: false,
		hasCalculationEngineEntry: false,
	};
}

function updateIWorkZipDetectionStateFromFilename(iWorkState, filename) {
	if (filename === 'Index/Document.iwa') {
		iWorkState.hasDocumentEntry = true;
	}

	if (filename.startsWith('Index/MasterSlide')) {
		iWorkState.hasMasterSlideEntry = true;
	}

	if (filename.startsWith('Index/Tables/')) {
		iWorkState.hasTablesEntry = true;
	}

	if (filename === 'Index/CalculationEngine.iwa') {
		iWorkState.hasCalculationEngineEntry = true;
	}
}

function getIWorkFileTypeFromZipEntries(iWorkState) {
	if (!iWorkState.hasDocumentEntry) {
		return;
	}

	if (iWorkState.hasMasterSlideEntry) {
		return {ext: 'key', mime: 'application/vnd.apple.keynote'};
	}

	if (iWorkState.hasTablesEntry) {
		return {ext: 'numbers', mime: 'application/vnd.apple.numbers'};
	}

	return {ext: 'pages', mime: 'application/vnd.apple.pages'};
}

// -- OpenXML helpers --

function getFileTypeFromMimeType(mimeType) {
	mimeType = mimeType.toLowerCase();
	switch (mimeType) {
		case 'application/epub+zip':
			return {ext: 'epub', mime: mimeType};
		case 'application/vnd.oasis.opendocument.text':
			return {ext: 'odt', mime: mimeType};
		case 'application/vnd.oasis.opendocument.text-template':
			return {ext: 'ott', mime: mimeType};
		case 'application/vnd.oasis.opendocument.spreadsheet':
			return {ext: 'ods', mime: mimeType};
		case 'application/vnd.oasis.opendocument.spreadsheet-template':
			return {ext: 'ots', mime: mimeType};
		case 'application/vnd.oasis.opendocument.presentation':
			return {ext: 'odp', mime: mimeType};
		case 'application/vnd.oasis.opendocument.presentation-template':
			return {ext: 'otp', mime: mimeType};
		case 'application/vnd.oasis.opendocument.graphics':
			return {ext: 'odg', mime: mimeType};
		case 'application/vnd.oasis.opendocument.graphics-template':
			return {ext: 'otg', mime: mimeType};
		case 'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
			return {ext: 'ppsx', mime: mimeType};
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
			return {ext: 'xlsx', mime: mimeType};
		case 'application/vnd.ms-excel.sheet.macroenabled':
			return {ext: 'xlsm', mime: 'application/vnd.ms-excel.sheet.macroenabled.12'};
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.template':
			return {ext: 'xltx', mime: mimeType};
		case 'application/vnd.ms-excel.template.macroenabled':
			return {ext: 'xltm', mime: 'application/vnd.ms-excel.template.macroenabled.12'};
		case 'application/vnd.ms-powerpoint.slideshow.macroenabled':
			return {ext: 'ppsm', mime: 'application/vnd.ms-powerpoint.slideshow.macroenabled.12'};
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
			return {ext: 'docx', mime: mimeType};
		case 'application/vnd.ms-word.document.macroenabled':
			return {ext: 'docm', mime: 'application/vnd.ms-word.document.macroenabled.12'};
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
			return {ext: 'dotx', mime: mimeType};
		case 'application/vnd.ms-word.template.macroenabledtemplate':
			return {ext: 'dotm', mime: 'application/vnd.ms-word.template.macroenabled.12'};
		case 'application/vnd.openxmlformats-officedocument.presentationml.template':
			return {ext: 'potx', mime: mimeType};
		case 'application/vnd.ms-powerpoint.template.macroenabled':
			return {ext: 'potm', mime: 'application/vnd.ms-powerpoint.template.macroenabled.12'};
		case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
			return {ext: 'pptx', mime: mimeType};
		case 'application/vnd.ms-powerpoint.presentation.macroenabled':
			return {ext: 'pptm', mime: 'application/vnd.ms-powerpoint.presentation.macroenabled.12'};
		case 'application/vnd.ms-visio.drawing':
			return {ext: 'vsdx', mime: 'application/vnd.visio'};
		case 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml':
			return {ext: '3mf', mime: 'model/3mf'};
		default:
	}
}

function createOpenXmlZipDetectionState() {
	return {
		hasContentTypesEntry: false,
		hasParsedContentTypesEntry: false,
		isParsingContentTypes: false,
		hasUnparseableContentTypes: false,
		hasWordDirectory: false,
		hasPresentationDirectory: false,
		hasSpreadsheetDirectory: false,
		hasThreeDimensionalModelEntry: false,
	};
}

function updateOpenXmlZipDetectionStateFromFilename(openXmlState, filename) {
	if (filename.startsWith('word/')) {
		openXmlState.hasWordDirectory = true;
	}

	if (filename.startsWith('ppt/')) {
		openXmlState.hasPresentationDirectory = true;
	}

	if (filename.startsWith('xl/')) {
		openXmlState.hasSpreadsheetDirectory = true;
	}

	if (
		filename.startsWith('3D/')
		&& filename.endsWith('.model')
	) {
		openXmlState.hasThreeDimensionalModelEntry = true;
	}
}

function getOpenXmlFileTypeFromDirectoryNames(openXmlState) {
	if (openXmlState.hasWordDirectory) {
		return {
			ext: 'docx',
			mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		};
	}

	if (openXmlState.hasPresentationDirectory) {
		return {
			ext: 'pptx',
			mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		};
	}

	if (openXmlState.hasSpreadsheetDirectory) {
		return {
			ext: 'xlsx',
			mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};
	}

	if (openXmlState.hasThreeDimensionalModelEntry) {
		return {
			ext: '3mf',
			mime: 'model/3mf',
		};
	}
}

function getOpenXmlFileTypeFromZipEntries(openXmlState) {
	// Only use directory-name heuristic when [Content_Types].xml was present in the archive
	// but its handler was skipped (not invoked, not currently running, and not already resolved).
	// This avoids guessing from directory names when content-type parsing already gave a definitive answer or failed.
	if (
		!openXmlState.hasContentTypesEntry
		|| openXmlState.hasUnparseableContentTypes
		|| openXmlState.isParsingContentTypes
		|| openXmlState.hasParsedContentTypesEntry
	) {
		return;
	}

	return getOpenXmlFileTypeFromDirectoryNames(openXmlState);
}

function getOpenXmlMimeTypeFromContentTypesXml(xmlContent) {
	// We only need the `ContentType="...main+xml"` value, so a small string scan is enough and avoids full XML parsing.
	const endPosition = xmlContent.indexOf('.main+xml"');
	if (endPosition === -1) {
		const mimeType = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
		if (xmlContent.includes(`ContentType="${mimeType}"`)) {
			return mimeType;
		}

		return;
	}

	const truncatedContent = xmlContent.slice(0, endPosition);
	const firstQuotePosition = truncatedContent.lastIndexOf('"');
	// If no quote is found, `lastIndexOf` returns -1 and this intentionally falls back to the full truncated prefix.
	return truncatedContent.slice(firstQuotePosition + 1);
}

const zipDataDescriptorSignature = 0x08_07_4B_50;
const zipDataDescriptorLengthInBytes = 16;
const zipDataDescriptorOverlapLengthInBytes = zipDataDescriptorLengthInBytes - 1;

function findZipDataDescriptorOffset(buffer, bytesConsumed) {
	if (buffer.length < zipDataDescriptorLengthInBytes) {
		return -1;
	}

	const lastPossibleDescriptorOffset = buffer.length - zipDataDescriptorLengthInBytes;
	for (let index = 0; index <= lastPossibleDescriptorOffset; index++) {
		if (
			Token.UINT32_LE.get(buffer, index) === zipDataDescriptorSignature
			&& Token.UINT32_LE.get(buffer, index + 8) === bytesConsumed + index
		) {
			return index;
		}
	}

	return -1;
}

async function readZipDataDescriptorEntryWithLimit(zipHandler, {shouldBuffer, maximumLength = maximumZipEntrySizeInBytes} = {}) {
	const {syncBuffer} = zipHandler;
	const {length: syncBufferLength} = syncBuffer;
	const chunks = [];
	let bytesConsumed = 0;

	for (;;) {
		const length = await zipHandler.tokenizer.peekBuffer(syncBuffer, {mayBeLess: true});
		const dataDescriptorOffset = findZipDataDescriptorOffset(syncBuffer.subarray(0, length), bytesConsumed);
		const retainedLength = dataDescriptorOffset >= 0
			? 0
			: (
				length === syncBufferLength
					? Math.min(zipDataDescriptorOverlapLengthInBytes, length - 1)
					: 0
			);
		const chunkLength = dataDescriptorOffset >= 0 ? dataDescriptorOffset : length - retainedLength;

		if (chunkLength === 0) {
			break;
		}

		bytesConsumed += chunkLength;
		if (bytesConsumed > maximumLength) {
			throw new Error(`ZIP entry compressed data exceeds ${maximumLength} bytes`);
		}

		if (shouldBuffer) {
			const data = new Uint8Array(chunkLength);
			await zipHandler.tokenizer.readBuffer(data);
			chunks.push(data);
		} else {
			await zipHandler.tokenizer.ignore(chunkLength);
		}

		if (dataDescriptorOffset >= 0) {
			break;
		}
	}

	if (!hasUnknownFileSize(zipHandler.tokenizer)) {
		zipHandler.knownSizeDescriptorScannedBytes += bytesConsumed;
	}

	if (!shouldBuffer) {
		return;
	}

	return mergeByteChunks(chunks, bytesConsumed);
}

function getRemainingZipScanBudget(zipHandler, startOffset) {
	if (hasUnknownFileSize(zipHandler.tokenizer)) {
		return Math.max(0, maximumUntrustedSkipSizeInBytes - (zipHandler.tokenizer.position - startOffset));
	}

	return Math.max(0, maximumZipEntrySizeInBytes - zipHandler.knownSizeDescriptorScannedBytes);
}

async function readZipEntryData(zipHandler, zipHeader, {shouldBuffer, maximumDescriptorLength = maximumZipEntrySizeInBytes} = {}) {
	if (
		zipHeader.dataDescriptor
		&& zipHeader.compressedSize === 0
	) {
		return readZipDataDescriptorEntryWithLimit(zipHandler, {
			shouldBuffer,
			maximumLength: maximumDescriptorLength,
		});
	}

	if (!shouldBuffer) {
		await safeIgnore(zipHandler.tokenizer, zipHeader.compressedSize, {
			maximumLength: hasUnknownFileSize(zipHandler.tokenizer) ? maximumZipEntrySizeInBytes : zipHandler.tokenizer.fileInfo.size,
			reason: 'ZIP entry compressed data',
		});
		return;
	}

	const maximumLength = getMaximumZipBufferedReadLength(zipHandler.tokenizer);
	if (
		!Number.isFinite(zipHeader.compressedSize)
		|| zipHeader.compressedSize < 0
		|| zipHeader.compressedSize > maximumLength
	) {
		throw new Error(`ZIP entry compressed data exceeds ${maximumLength} bytes`);
	}

	const fileData = new Uint8Array(zipHeader.compressedSize);
	await zipHandler.tokenizer.readBuffer(fileData);
	return fileData;
}

// Override the default inflate to enforce decompression size limits, since @tokenizer/inflate does not expose a configuration hook for this.
ZipHandler.prototype.inflate = async function (zipHeader, fileData, callback) {
	if (zipHeader.compressedMethod === 0) {
		return callback(fileData);
	}

	if (zipHeader.compressedMethod !== 8) {
		throw new Error(`Unsupported ZIP compression method: ${zipHeader.compressedMethod}`);
	}

	const uncompressedData = await decompressDeflateRawWithLimit(fileData, {maximumLength: maximumZipEntrySizeInBytes});
	return callback(uncompressedData);
};

ZipHandler.prototype.unzip = async function (fileCallback) {
	let stop = false;
	let zipEntryCount = 0;
	const zipScanStart = this.tokenizer.position;
	this.knownSizeDescriptorScannedBytes = 0;
	do {
		if (hasExceededUnknownSizeScanBudget(this.tokenizer, zipScanStart, maximumUntrustedSkipSizeInBytes)) {
			throw new ParserHardLimitError(`ZIP stream probing exceeds ${maximumUntrustedSkipSizeInBytes} bytes`);
		}

		const zipHeader = await this.readLocalFileHeader();
		if (!zipHeader) {
			break;
		}

		zipEntryCount++;
		if (zipEntryCount > maximumZipEntryCount) {
			throw new Error(`ZIP entry count exceeds ${maximumZipEntryCount}`);
		}

		const next = fileCallback(zipHeader);
		stop = Boolean(next.stop);
		await this.tokenizer.ignore(zipHeader.extraFieldLength);
		const fileData = await readZipEntryData(this, zipHeader, {
			shouldBuffer: Boolean(next.handler),
			maximumDescriptorLength: Math.min(maximumZipEntrySizeInBytes, getRemainingZipScanBudget(this, zipScanStart)),
		});

		if (next.handler) {
			await this.inflate(zipHeader, fileData, next.handler);
		}

		if (zipHeader.dataDescriptor) {
			const dataDescriptor = new Uint8Array(zipDataDescriptorLengthInBytes);
			await this.tokenizer.readBuffer(dataDescriptor);
			if (Token.UINT32_LE.get(dataDescriptor, 0) !== zipDataDescriptorSignature) {
				throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - dataDescriptor.length}`);
			}
		}

		if (hasExceededUnknownSizeScanBudget(this.tokenizer, zipScanStart, maximumUntrustedSkipSizeInBytes)) {
			throw new ParserHardLimitError(`ZIP stream probing exceeds ${maximumUntrustedSkipSizeInBytes} bytes`);
		}
	} while (!stop);
};

export async function detectZip(tokenizer) {
	let fileType;
	const openXmlState = createOpenXmlZipDetectionState();
	const iWorkState = createIWorkZipDetectionState();

	try {
		await new ZipHandler(tokenizer).unzip(zipHeader => {
			updateOpenXmlZipDetectionStateFromFilename(openXmlState, zipHeader.filename);
			updateIWorkZipDetectionStateFromFilename(iWorkState, zipHeader.filename);

			// Early exit for Keynote or Numbers when markers are definitive
			if (iWorkState.hasDocumentEntry && (iWorkState.hasMasterSlideEntry || iWorkState.hasTablesEntry)) {
				fileType = getIWorkFileTypeFromZipEntries(iWorkState);
				return {stop: true};
			}

			const isOpenXmlContentTypesEntry = zipHeader.filename === '[Content_Types].xml';
			const openXmlFileTypeFromEntries = getOpenXmlFileTypeFromZipEntries(openXmlState);
			if (
				!isOpenXmlContentTypesEntry
				&& openXmlFileTypeFromEntries
			) {
				fileType = openXmlFileTypeFromEntries;
				return {
					stop: true,
				};
			}

			switch (zipHeader.filename) {
				case 'META-INF/mozilla.rsa':
					fileType = {
						ext: 'xpi',
						mime: 'application/x-xpinstall',
					};
					return {
						stop: true,
					};
				case 'META-INF/MANIFEST.MF':
					fileType = {
						ext: 'jar',
						mime: 'application/java-archive',
					};
					return {
						stop: true,
					};
				case 'mimetype':
					if (!canReadZipEntryForDetection(zipHeader, maximumZipTextEntrySizeInBytes)) {
						return {};
					}

					return {
						async handler(fileData) {
							// Use TextDecoder to decode the UTF-8 encoded data
							const mimeType = new TextDecoder('utf-8').decode(fileData).trim();
							fileType = getFileTypeFromMimeType(mimeType);
						},
						stop: true,
					};

				case '[Content_Types].xml': {
					openXmlState.hasContentTypesEntry = true;

					if (!canReadZipEntryForDetection(zipHeader, maximumZipTextEntrySizeInBytes)) {
						openXmlState.hasUnparseableContentTypes = true;
						return {};
					}

					openXmlState.isParsingContentTypes = true;
					return {
						async handler(fileData) {
							// Use TextDecoder to decode the UTF-8 encoded data
							const xmlContent = new TextDecoder('utf-8').decode(fileData);
							const mimeType = getOpenXmlMimeTypeFromContentTypesXml(xmlContent);
							if (mimeType) {
								fileType = getFileTypeFromMimeType(mimeType);
							}

							openXmlState.hasParsedContentTypesEntry = true;
							openXmlState.isParsingContentTypes = false;
						},
						stop: true,
					};
				}

				default:
					if (/classes\d*\.dex/v.test(zipHeader.filename)) {
						fileType = {
							ext: 'apk',
							mime: 'application/vnd.android.package-archive',
						};
						return {stop: true};
					}

					return {};
			}
		});
	} catch (error) {
		if (!isRecoverableZipError(error)) {
			throw error;
		}

		if (openXmlState.isParsingContentTypes) {
			openXmlState.isParsingContentTypes = false;
			openXmlState.hasUnparseableContentTypes = true;
		}

		// When the stream was truncated before reaching [Content_Types].xml, use directory names as a fallback.
		// This handles LibreOffice-created OOXML files where [Content_Types].xml appears after content entries.
		if (!fileType && error instanceof strtok3.EndOfStreamError && !openXmlState.hasContentTypesEntry) {
			fileType = getOpenXmlFileTypeFromDirectoryNames(openXmlState);
		}
	}

	const iWorkFileType = hasUnknownFileSize(tokenizer)
		&& iWorkState.hasDocumentEntry
		&& !iWorkState.hasMasterSlideEntry
		&& !iWorkState.hasTablesEntry
		&& !iWorkState.hasCalculationEngineEntry
		? undefined
		: getIWorkFileTypeFromZipEntries(iWorkState);

	return fileType ?? getOpenXmlFileTypeFromZipEntries(openXmlState) ?? iWorkFileType ?? {
		ext: 'zip',
		mime: 'application/zip',
	};
}
