const adminModel = require('../models/admin');

const { createToken }                = require('../common/auth');
const { compareHash, errorToString } = require('../common/utils');
const { logger }                     = require('../common/logger');

class AuthController {
    constructor (_adminModel) {
        this._adminModel = _adminModel;
    }

    async login (request, response) {
        const { username, password } = request.body;

        try {

            const admin = await this._adminModel.getOneByUsername(username);

            if (compareHash(password, admin.password)) {
                const token = createToken({ _id: admin._id, username: admin.username });

                return response.json({
                    error:   false,
                    message: token
                });
            }

            logger.error(this._getContext('login'), 'Invalid username or password');

            return response.status(403).send({
                error:   true,
                message: 'Invalid username or password'
            });
        } catch (err) {
            logger.error(this._getContext('login'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    _getContext (functionName) {
        return `An Error occurred while handle authController.${functionName}:`;
    }
}

const authController = new AuthController(adminModel);

module.exports = authController;
