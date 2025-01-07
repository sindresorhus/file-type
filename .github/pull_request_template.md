If you're adding support for a new file type, please follow the below steps:

- **One PR per file type.**
- Add a fixture file named `fixture.<extension>` to the `fixture` directory.
- Add the file extension to the `extensions` array in `supported.js`.
- Add the file's MIME type to the `types` array in `supported.js`.
- Add the file type detection logic to the `core.js` file.
- Determine the appropriate detection confidence category:
	- `detectConfident()`: Detections with a high degree of certainty in identifying the correct file type.
	- `detectImprecise()`: Detections with limited supporting data, resulting in a higher likelihood of false positives.
- Respect the sequence:
	- Signature with shorter sample size (counted from offset 0 until the last required byte position) will be executed first.
	- Only the initial determination for the file type counts for the sequence.
	- Existing signatures requiring same sample length (same *signature group*) will be tested prior to your new detections. Yours will be last. (rational: common formats first).
- Add the file extension to the `Supported file types` section of the readme in alphabetical order, in the format ```- [`<extension>`](URL) - Format name```, for example, ```- [`png`](https://en.wikipedia.org/wiki/Portable_Network_Graphics) - Portable Network Graphics```
- Add the file extension to the `keywords` array in the `package.json` file.
- Run `$ npm test` to ensure the tests pass.
- Open a pull request with a title like `Add support for Format`, for example, `Add support for PNG`.
- The pull request description should include a link to the official page of the file format or some other source. Also include a link to where you found the file type detection / magic bytes and the MIME type.
