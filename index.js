import strtok3 from 'strtok3';
import {fromTokenizer} from './core.js';

export async function fromFile(path) {
	const tokenizer = await strtok3.fromFile(path);
	try {
		return await fromTokenizer(tokenizer);
	} finally {
		await tokenizer.close();
	}
}

export * from './core.js';
