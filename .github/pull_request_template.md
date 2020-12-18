If you're adding support for a new file type, please follow the below steps:

- **One PR per file type.**
- Add a fixture file named `fixture.<extension>` to the `fixture` directory.
- Add the file extension to the `extensions` array in `supported.js`.
- Add the file's MIME type to the `types` array in `supported.js`.
- Add the file type detection logic to the `core.js` file.
- Add the file extension to the `FileType` type in `core.d.ts`.
- Add the file's MIME type to the `MimeType` type in `core.d.ts`.
- Add the file extension to the `Supported file types` section in the readme, in the format ```- [`<extension>`](URL) - Format name```, for example, ```- [`png`](https://en.wikipedia.org/wiki/Portable_Network_Graphics) - Portable Network Graphics```
- Add the file extension to the `keywords` array in the `package.json` file.
- Run `$ npm test` to ensure the tests pass.
- Open a pull request with a title like `Add support for Format`, for example, `Add support for PNG`.
- The pull request description should include a link to the official page of the file format or some other source. Also include a link to where you found the file type detection / magic bytes and the MIME type.
