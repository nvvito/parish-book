const dotenv = require('dotenv');

dotenv.config();

const ADMIN = {
    MODEL_NAME: 'Admin'
};

const USER = {
    GENDER: {
        MAN:   'man',
        WOMAN: 'woman'
    },
    MODEL_NAME: 'User',
};

const FAMILY = {
    FIELD_NAME: {},
    MODEL_NAME: 'Family',
};

FAMILY.FIELD_NAME[USER.GENDER.MAN]   = 'father_id';
FAMILY.FIELD_NAME[USER.GENDER.WOMAN] = 'mother_id';

// from env
const AUTH = {
    BEARER:      process.env.AUTH_BEARER_NAME           || 'parish-member',
    COOKIE_NAME: process.env.AUTH_COOKIE_NAME           || 'parish-auth',
    COOKIE_USE:  process.env.AUTH_COOKIE_USE === 'true' || false,
    EXPIRESIN:   process.env.AUTH_EXPIRESIN             || '1d',
    HEADER_NAME: process.env.AUTH_HEADER_NAME           || 'parish-auth',
    SECRET:      process.env.AUTH_SECRET                || 'parish-secret',
};

const DB = {
    HOST:          process.env.DB_HOST          || 'localhost:27017',
    NAME:          process.env.DB_NAME          || 'parishBook',
    REPLICA_SET:   process.env.DB_REPLICA_SET   || 'rs0',
    USER_NAME:     process.env.DB_USER_NAME     || '',
    USER_PASSWORD: process.env.DB_USER_PASSWORD || '',
};

const SERVER = {
    PORT: process.env.SERVER_PORT || 8080
};

exports.ADMIN  = Object.freeze(ADMIN);
exports.USER   = Object.freeze(USER);
exports.FAMILY = Object.freeze(FAMILY);
// from env
exports.AUTH   = Object.freeze(AUTH);
exports.DB     = Object.freeze(DB);
exports.SERVER = Object.freeze(SERVER);
