export const maximumUntrustedSkipSizeInBytes = 16 * 1024 * 1024;

export class ParserHardLimitError extends Error {}

export function getSafeBound(value, maximum, reason) {
	if (
		!Number.isFinite(value)
		|| value < 0
		|| value > maximum
	) {
		throw new ParserHardLimitError(`${reason} has invalid size ${value} (maximum ${maximum} bytes)`);
	}

	return value;
}

export async function safeIgnore(tokenizer, length, {maximumLength = maximumUntrustedSkipSizeInBytes, reason = 'skip'} = {}) {
	const safeLength = getSafeBound(length, maximumLength, reason);
	await tokenizer.ignore(safeLength);
}

export async function safeReadBuffer(tokenizer, buffer, options, {maximumLength = buffer.length, reason = 'read'} = {}) {
	const length = options?.length ?? buffer.length;
	const safeLength = getSafeBound(length, maximumLength, reason);
	return tokenizer.readBuffer(buffer, {
		...options,
		length: safeLength,
	});
}

export function checkBytes(buffer, headers, options) {
	options = {
		offset: 0,
		...options,
	};

	for (const [index, header] of headers.entries()) {
		// If a bitmask is set
		if (options.mask) {
			// If header doesn't equal `buf` with bits masked off
			if (header !== (options.mask[index] & buffer[index + options.offset])) {
				return false;
			}
		} else if (header !== buffer[index + options.offset]) {
			return false;
		}
	}

	return true;
}

export function hasUnknownFileSize(tokenizer) {
	const fileSize = tokenizer.fileInfo.size;
	return (
		!Number.isFinite(fileSize)
		|| fileSize === Number.MAX_SAFE_INTEGER
	);
}

export function hasExceededUnknownSizeScanBudget(tokenizer, startOffset, maximumBytes) {
	return (
		hasUnknownFileSize(tokenizer)
		&& tokenizer.position - startOffset > maximumBytes
	);
}
