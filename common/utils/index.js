const { SHA512: sha512 } = require('crypto-js');

const ld = require('lodash');

/**
 *
 * @param {String} str
 *
 * @returns {String}
 */
exports.oneLine = (str) => {
    return str.replace(/[ \r\n]+/g, ' ').trim();
};
/**
 *
 * @param {Error} error
 *
 * @returns {String}
 */
exports.errorToString = (error) =>  {
    let resultString = '';

    resultString = error.message ? `${String(error.message)}` : ld.get(error, 'constructor.name') || String(error);
    if (Array.isArray(error.precedingErrors)) {
        resultString += ` (Caused by: ${error.precedingErrors.map(exports.argDefaultString)})`;
    }

    return resultString.replace(/\n/g, '\\n');
};
/**
 *
 * @param {String} password
 *
 * @returns {String} hash to string
 */
exports.createHash = (password) => {
    return sha512(password).toString();
};
/**
 *
 * @param {String} password
 * @param {String} hash hash in string format
 *
 * @returns {Boolean}
 */
exports.compareHash = (password, hash) => {
    return sha512(password).toString() === hash;
};
