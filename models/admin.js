const { model, Schema } = require('mongoose');

const { ADMIN }       = require('../common/constants');
const { NoDataError } = require('../common/errors');
const { createHash }  = require('../common/utils');

/* eslint-disable sort-keys */
// Schema
const AdminSchema = new Schema({
    username: {
        required: true,
        trim:     true,
        type:     String,
        min:      4,
        max:      20,
        unique:   true
    },
    password: {
        required: true,
        trim:     true,
        type:     String,
        min:      4,
        max:      120
    }
}, {
    versionKey: false
});
/* eslint-enable sort-keys */

/**
 * @public
 *
 * @param {String} userId
 *
 * @returns {Admin}
 */
AdminSchema.statics.getOneByUsername = async function (username) {
    const query = { username };
    const admin = await this.findOne(query);

    if (!admin) {
        throw new NoDataError('admin', query);
    }

    return admin;
};
// middleware
AdminSchema.pre('save', function (next) {
    this.password = createHash(this.password);
    next();
});

const adminModel = model(ADMIN.MODEL_NAME, AdminSchema);

module.exports = adminModel;
