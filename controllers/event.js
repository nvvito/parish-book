const moment = require('moment');

const familyModel = require('../models/family');
const userModel   = require('../models/user');

const { LogicError }    = require('../common/errors');
const { errorToString } = require('../common/utils');
const { logger }        = require('../common/logger');

class EventController {
    constructor (_familyModel, _userModel) {
        this._familyModel = _familyModel;
        this._userModel   = _userModel;
    }

    async getAll (request, response) {
        const { startDate, endDate } = request.query;

        if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
            throw new LogicError('The start and end dates must have a date format');
        }

        if (moment(startDate).isAfter(moment(endDate))) {
            throw new LogicError('The end date must be after the start date');
        }

        function getQuery () {
            const query = {};

            if (moment.utc(startDate).dayOfYear() < moment.utc(endDate).dayOfYear()) {
                query.$or = [
                    { day: { $gte: moment.utc(startDate).date() }, month: { $eq: moment.utc(startDate).month() + 1 } },
                    { day: { $lte: moment.utc(endDate).date() }, month: { $eq: moment.utc(endDate).month() + 1 } },
                    { month: { $gt: moment.utc(startDate).month() + 1, $lt: moment.utc(endDate).month() + 1 } }
                ];
            } else {
                query.$or = [
                    { day: { $gte: moment.utc(startDate).date() }, month: { $eq: moment.utc(startDate).month() + 1 } },
                    { day: { $lte: moment.utc(endDate).date() }, month: { $eq: moment.utc(endDate).month() + 1 } },
                    { month: { $gt: moment.utc(startDate).month() + 1, $lte: 12 } },
                    { month: { $gte: 1, $lt: moment.utc(endDate).month() + 1 } }
                ];
            }

            return query;
        }

        function getFamilyQuery () {
            const query = {};
            query.$and  = [
                {
                    father_id: { $ne: null },
                    mother_id: { $ne: null }
                },
                getQuery()
            ];

            return query;
        }

        try {

            const users = await this._userModel.aggregate([
                {
                    $addFields: {
                        day:   { $dayOfMonth: '$birthday' },
                        month: { $month: '$birthday' }
                    }
                },
                {
                    $match: getQuery()
                },
            ]);

            const families = await this._familyModel.aggregate([
                {
                    $addFields: {
                        day:   { $dayOfMonth: '$marriage' },
                        month: { $month: '$marriage' }
                    }
                },
                {
                    $match: getFamilyQuery()
                },
                // get father data
                {
                    $lookup: {
                        as:           'father',
                        foreignField: '_id',
                        from:         'users',
                        localField:   'father_id'
                    }
                },
                // move father from array to root object
                {
                    $unwind: {
                        path:                       '$father',
                        preserveNullAndEmptyArrays: true
                    }
                },
                // get mother data
                {
                    $lookup: {
                        as:           'mother',
                        foreignField: '_id',
                        from:         'users',
                        localField:   'mother_id'
                    }
                },
                // move mother from array to root object
                {
                    $unwind: {
                        path:                       '$mother',
                        preserveNullAndEmptyArrays: true
                    }
                },
                // remove father_id, mother_id
                {
                    $project: {
                        children:  0,
                        father_id: 0,
                        mother_id: 0
                    }
                },
            ]);

            return response.send({
                error:   false,
                message: {
                    families,
                    users
                }
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
        return `An Error occurred while handle authController.${functionName}:`;
    }
}

const eventController = new EventController(familyModel, userModel);

module.exports = eventController;
