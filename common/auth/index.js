const jwt = require('jsonwebtoken');

const { AUTH }   = require('../constants');
const { logger } = require('../logger');

/* eslint-disable consistent-return */
const checkToken = (req, res, next) => {
    // read header token
    let token = req.headers[AUTH.HEADER_NAME];
    // read cookie token
    if (AUTH.COOKIE_USE) {
        if (!token) {
            token = req.cookies[AUTH.COOKIE_NAME];
        }
    }
    // verify token
    if (token) {
        // 'Bearer'
        if (token.startsWith(`${AUTH.BEARER} `)) {
            // Remove 'Bearer' from string
            token = token.slice(AUTH.BEARER.length + 1, token.length);

            jwt.verify(token, AUTH.SECRET, (err, decoded) => {
                if (!err) {
                    // pass decoded data
                    req.decoded = decoded;
                    logger.info('From admin (', { _id: decoded._id || null, username: decoded.username || null }, ')');
                    next();
                } else {
                    logger.warn('Authorization error: Token is not valid');
                    return res.status(403).json({
                        error:   true,
                        message: 'Token is not valid'
                    });
                }
            });
        } else {
            logger.warn('Authorization error: Auth bearer error');
            return res.status(403).json({
                error:   true,
                message: 'Auth bearer error'
            });
        }
    } else {
        logger.warn('Authorization error: Auth token is not supplied');
        return res.status(403).send({
            error:   true,
            message: 'Auth token is not supplied'
        });
    }
};
/* eslint-enable consistent-return */

const createToken = (data, providedOption) => {
    const option = {
        expiresIn: AUTH.EXPIRESIN,
        ...providedOption
    };

    return jwt.sign(data, AUTH.SECRET, option);
};
module.exports = {
    checkToken,
    createToken,
};
