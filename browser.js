!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.npmpackagename=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf) {
		return false;
	}

	if (_dereq_('is-pdf')(buf)) {
		return 'pdf';
	}

	if (_dereq_('is-epub')(buf)) {
		return 'epub';
	}

	if (_dereq_('is-exe')(buf)) {
		return 'exe';
	}

	if (_dereq_('is-mp4')(buf)) {
		return 'mp4';
	}	

	return _dereq_('image-type')(buf) || _dereq_('archive-type')(buf) || _dereq_ ('audio-type')(buf)|| false;
};

},{"archive-type":2,"audio-type":9,"image-type":15,"is-epub":24,"is-exe":25,"is-mp4":26,"is-pdf":27}],2:[function(_dereq_,module,exports){
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
    if (!buf || buf.length < 262) {
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
	if (!buf) {
		return false;
	}

	if (_dereq_('is-mp3')(buf)) {
		return 'mp3';
	}

	if (_dereq_('is-wav')(buf)) {
		return 'wav';
	}

	if (_dereq_('is-ogg')(buf)) {
		return 'oga';
	}

	if (_dereq_('is-flac')(buf)) {
		return 'flac';
	}

	if (_dereq_('is-m4a')(buf)) {
		return 'm4a';
	}

	return false;
};

},{"is-flac":10,"is-m4a":11,"is-mp3":12,"is-ogg":13,"is-wav":14}],10:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return buf[0] === 102 &&
  buf[1] === 76 &&
  buf[2] === 97 &&
  buf[3] === 67; 
};

},{}],11:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 8) {
		return false;
	}

	return (buf[4] === 102 &&
		buf[5] === 116 &&
		buf[6] === 121 &&
		buf[7] === 112) || (
      buf[0] === 77 &&
      buf[1] === 52 &&
      buf[2] === 65 &&
      buf[3] === 32
    );
};

},{}],12:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return (buf[0] === 73 &&
		buf[1] === 68 &&
		buf[2] === 51) || ( 
      buf[0] === 255 &&
      buf[1] === 251
    )
  
};

},{}],13:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 4) {
		return false;
	}

	return  buf[0] === 79 &&
		buf[1] === 103 &&
		buf[2] === 103 &&
    buf[3] === 83;
};

},{}],14:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 12) {
		return false;
	}

	return buf[0] === 82 &&
		buf[1] === 73 &&
		buf[2] === 70 &&
		buf[3] === 70 &&
		buf[8] === 87 &&
		buf[9] === 65 &&
		buf[10] === 86 &&
		buf[11] === 69;
};

},{}],15:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf) {
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

},{"is-bmp":16,"is-gif":17,"is-jpg":18,"is-jxr":19,"is-png":20,"is-psd":21,"is-tif":22,"is-webp":23}],16:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 2) {
		return false;
	}

	return buf[0] === 66 && buf[1] === 77;
};

},{}],17:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return buf[0] === 71 &&
		buf[1] === 73 &&
		buf[2] === 70;
};

},{}],18:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return buf[0] === 255 &&
		buf[1] === 216 &&
		buf[2] === 255;
};

},{}],19:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 3) {
		return false;
	}

	return buf[0] === 73 &&
		buf[1] === 73 &&
		buf[2] === 188;
};

},{}],20:[function(_dereq_,module,exports){
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

},{}],21:[function(_dereq_,module,exports){
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

},{}],22:[function(_dereq_,module,exports){
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

},{}],23:[function(_dereq_,module,exports){
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

},{}],24:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 58) {
		return false;
	}

	return buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4 &&
		buf.slice(30, 58).toString() === 'mimetypeapplication/epub+zip';
};

},{}],25:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a EXE file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 2) {
        return false;
    }

    return buf[0] === 77 && buf[1] === 90;
};

},{}],26:[function(_dereq_,module,exports){
'use strict';
module.exports = function (buf) {
	if (!buf || buf.length < 8) {
		return false;
	}

	return (buf[0] === 0 &&
		buf[1] === 0 &&
		buf[2] === 0 &&
		buf[3] === 24 &&
		buf[4] === 102 &&
		buf[5] === 116 &&
		buf[6] === 121 &&
		buf[7] === 112) || (
    buf[0] === 51 &&
    buf[1] === 103 &&
    buf[2] === 112 &&
    buf[3] === 53)
};

},{}],27:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if a Buffer/Uint8Array is a PDF file
 *
 * @param {Buffer} buf
 * @api public
 */

module.exports = function (buf) {
    if (!buf || buf.length < 4) {
        return false;
    }

    return buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70;
};

},{}]},{},[1])
(1)
});