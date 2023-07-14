import * as strtok3 from 'strtok3';
import {fileTypeFromTokenizer} from './core.js';

export async function fileTypeFromFile(path, customDetectors) {
	const tokenizer = await strtok3.fromFile(path);
	try {
		return await fileTypeFromTokenizer(tokenizer, customDetectors);
	} finally {
		await tokenizer.close();
	}
}

export * from './core.js';
