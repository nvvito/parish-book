const { createLogger, format, transports } = require('winston');
const { inspect }                          = require('util');

const { errorToString } = require('../utils');

class Logger {
    constructor () {
        this._logger = createLogger({
            format: format.combine(
                format.timestamp(),
                format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [pid:${process.pid}] ${level}: ${message}`;
                })
            ),
            level:      'info',
            transports: [
                new transports.Console()
            ]
        });
    }

    info (...args) {
        this._logInternal('info', ...args);
    }

    warn (...args) {
        this._logInternal('warn', ...args);
    }

    error (...args) {
        this._logInternal('error', ...args);
    }

    _logInternal (level, ...args) {
        const fullMessage = args.map(arg => `${stringifyArg(arg)}`).join(' ');
        this._logger.log(level, fullMessage);

        function stringifyArg (arg) {
            if (typeof arg === 'object') {
                try {
                    if (arg instanceof Error) {
                        return errorToString(arg);
                    }
                    return JSON.stringify(arg);
                } catch (err) {
                    return inspect(arg);
                }
            }
            return arg;
        }
    }
}

const logger = new Logger();

exports.logger = logger;
