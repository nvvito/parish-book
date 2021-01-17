const familyModel = require('../models/family');
const userModel   = require('../models/user');

const { NoDataError }   = require('../common/errors');
const { logger }        = require('../common/logger');
const { errorToString } = require('../common/utils');

class UserController {
    constructor (_userModel, _familyModel) {
        this._userModel   = _userModel;
        this._familyModel = _familyModel;
    }

    async getAll (request, response) {
        const { populated } = request.query;

        try {
            let result;
            if (populated !== 'true') {
                result = await this._userModel
                    .find({})
                    .sort({
                        /* eslint-disable sort-keys */
                        lastName:   1,
                        firstName:  1,
                        patronymic: 1,
                        birthday:   1
                        /* eslint-ensable sort-keys */
                    });
            } else {
                result = await this._userModel.getPopulatedUsers();
            }

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('getAll'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async getOneById (request, response) {
        const { _id }       = request.params;
        const { populated } = request.query;

        try {
            const user = await this._userModel.getOneById(_id);

            if (populated !== 'true') {

                return response.send({
                    error:   false,
                    message: user
                });
            }

            const result = await this._familyModel.getPopulatedUserFamilies(_id, user.gender);
            result.user  = user;

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('getOneById'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async createOne (request, response) {
        const doc = request.body;
        try {
            const result = await this._userModel.create(doc);

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('createOne'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async updateOneById (request, response) {
        const { _id } = request.params;
        const doc     = request.body;

        try {
            const options = { new: true, runValidators: true };
            const result  = await this._userModel.findByIdAndUpdate(_id, { $set: doc }, options);

            if (!result) {
                throw new NoDataError('user', _id);
            }

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('updateOneById'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async deleteOneById (request, response) {
        const { _id } = request.params;

        try {
            const result = await this._userModel.findByIdAndRemove(_id);

            if (!result) {
                throw new NoDataError('user', _id);
            }

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('deleteOneById'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async searchUser (request, response) {
        const { text } = request.query;

        try {
            const result = await this._userModel.searchUser(text);

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('getAll'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    _getContext (functionName) {
        return `Виникла помилка при обробці userController.${functionName}:`;
    }
}

const userController = new UserController(userModel, familyModel);

module.exports = userController;
