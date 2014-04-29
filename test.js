'use strict';
var assert = require('assert');
var readChunk = require('read-chunk');
var fileType = require('./index');

function check(filename) {
      return fileType(readChunk.sync(filename, 0, 12));
}

it('should detect file type from Buffer', function () {
      assert.strictEqual(check('fixture.png'), 'png');
      assert.strictEqual(check('fixture.zip'), 'zip');
      assert.strictEqual(check('fixture.exe'), 'exe');
      assert.strictEqual(check('fixture.oga'), 'oga');
});

