!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.fileType=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 12) {
		return false;
	}

	return _dereq_('image-type')(buf) || _dereq_('archive-type')(buf) || false;
};

},{"archive-type":2,"image-type":9}],2:[function(_dereq_,module,exports){
'use strict';

/**
 * Detect the archive type of a Buffer/Uint8Array
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 7) {
        return false;
    }

    if (_dereq_('is-7zip')(buf)) {
        return '7z';
    }

    if (_dereq_('is-bzip2')(buf)) {
        return 'bz2';
    }

    if (_dereq_('is-gzip')(buf)) {
        return 'gz';
    }

    if (_dereq_('is-rar')(buf)) {
        return 'rar';
    }

    if (_dereq_('is-tar')(buf)) {
        return 'tar';
    }

    if (_dereq_('is-zip')(buf)) {
        return 'zip';
    }

    return false;
};

},{"is-7zip":3,"is-bzip2":4,"is-gzip":5,"is-rar":6,"is-tar":7,"is-zip":8}],3:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a 7ZIP file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 5) {
        return false;
    }

    return buf[0] === 55 && buf[1] === 122 && buf[2] === 188 && buf[3] === 175 && buf[4] === 39 && buf[5] === 28;
};

},{}],4:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a BZIP2 file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 3) {
        return false;
    }

    return buf[0] === 66 && buf[1] === 90 && buf[2] === 104;
};

},{}],5:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a GZIP file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 4) {
        return false;
    }

    return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
};

},{}],6:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a RAR file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 7) {
        return false;
    }

    return buf[0] === 82 && buf[1] === 97 && buf[2] === 114 && buf[3] === 33 && buf[4] === 26 && buf[5] === 7 && (buf[6] === 0 || buf[6] === 1);
};

},{}],7:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a TAR file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 4) {
        return false;
    }

    return buf[257] === 117 && buf[258] === 115 && buf[259] === 116 && buf[260] === 97 && buf[261] === 114;
};

},{}],8:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a ZIP file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 4) {
        return false;
    }

    return buf[0] === 80 && buf[1] === 75 && (buf[2] === 3 || buf[2] === 5 || buf[2] === 7) && (buf[3] === 4 || buf[3] === 6 || buf[3] === 8);
};

},{}],9:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 12) {
		return false;
	}

	if (_dereq_('is-jpg')(buf)) {
		return 'jpg';
	}

	if (_dereq_('is-png')(buf)) {
		return 'png';
	}

	if (_dereq_('is-gif')(buf)) {
		return 'gif';
	}

	if (_dereq_('is-webp')(buf)) {
		return 'webp';
	}

	if (_dereq_('is-tif')(buf)) {
		return 'tif';
	}

	if (_dereq_('is-bmp')(buf)) {
		return 'bmp';
	}

	if (_dereq_('is-jxr')(buf)) {
		return 'jxr';
	}

	if (_dereq_('is-psd')(buf)) {
		return 'psd';
	}

	return false;
};

},{"is-bmp":10,"is-gif":11,"is-jpg":12,"is-jxr":13,"is-png":14,"is-psd":15,"is-tif":16,"is-webp":17}],10:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 2) {
		return false;
	}

	return buf[0] === 66 && buf[1] === 77;
};

},{}],11:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return buf[0] === 71 &&
		buf[1] === 73 &&
		buf[2] === 70;
};

},{}],12:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return buf[0] === 255 &&
		buf[1] === 216 &&
		buf[2] === 255 &&
		(buf[3] === 224 || buf[3] === 225);
};

},{}],13:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return buf[0] === 73 &&
		buf[1] === 73 &&
		buf[2] === 188;
};

},{}],14:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return buf[0] === 137 &&
		buf[1] === 80 &&
		buf[2] === 78 &&
		buf[3] === 71;
};

},{}],15:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return buf[0] === 56 &&
		buf[1] === 66 &&
		buf[2] === 80 &&
		buf[3] === 83;
};

},{}],16:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return buf[0] === 73 &&
		buf[1] === 73 &&
		buf[2] === 42 &&
		buf[3] === 0;
};

},{}],17:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 12) {
		return false;
	}

	return buf[8] === 87 &&
		buf[9] === 69 &&
		buf[10] === 66 &&
		buf[11] === 80;
};

},{}]},{},[1])
(1)
});