/* eslint-disable max-classes-per-file */
const { isValidObjectId } = require('mongoose');
const { inspect }         = require('util');

const { oneLine } = require('../utils');

class NoDataError extends Error {
    constructor (dataName, _query) {
        const query =  isValidObjectId(_query) ? { _id: _query } : _query;

        let queryString = '';
        try {
            queryString = JSON.stringify(query);
        } catch (err) {
            queryString = inspect(query);
        }

        super(oneLine(`
            Помилка запиту
            (Причина: ${dataName} не знайдено для запипу query=${queryString})
        `));

        this.dataName = dataName;
        this.query    = query;
    }
}
exports.NoDataError = NoDataError;

class LogicError extends Error {
    constructor (text) {
        super(oneLine(`
            Помилка логіки
            (Причина: ${text})
        `));

        this.text = text;
    }
}
exports.LogicError = LogicError;
