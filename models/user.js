const { model, Schema, isValidObjectId } = require('mongoose');

const { USER }        = require('../common/constants');
const { NoDataError } = require('../common/errors');

/* eslint-disable sort-keys */
// Schema
const UserSchema = new Schema({
    lastName: {
        required: true,
        trim:     true,
        type:     String
    },
    firstName: {
        required: true,
        trim:     true,
        type:     String
    },
    patronymic: {
        required: true,
        trim:     true,
        type:     String
    },
    gender: {
        enum:     [USER.GENDER.MAN, USER.GENDER.WOMAN],
        required: true,
        type:     String,
    },
    birthday: {
        required: true,
        type:     Date
    },
    phones: {
        default:  [],
        required: true,
        type:     [{
            trim: true,
            type: String
        }]
    },
    address: {
        type: String
    }
}, {
    collation: {
        locale:   'uk',
        strength: 1
    },
    versionKey: false
});

// indexes
UserSchema.index({ firstName: 1 });
UserSchema.index({ lastName: 1, firstName: 1, patronymic: 1, birthday: 1 });
/* eslint-enable sort-keys */

/**
 * @public
 *
 * @param {ObjectId|String} userId
 * @param {String|null}     label Optional
 * @param {Object|null}     session Optional
 *
 * @returns {Boolean}
 */
UserSchema.statics.getOneById = async function (userId, label = 'Парафіянина', session) {
    if (!isValidObjectId(userId)) {
        throw new NoDataError('Парафіянина', { _id: userId });
    }

    const user = await this.findById(userId, null, { session });

    if (!user) {
        throw new NoDataError(label, userId);
    }

    return user;
};
/**
 * @public
 *
 * @returns {Boolean}
 */
UserSchema.statics.getPopulatedUsers = async function () {
    const result = await this.aggregate([
        // sort users
        {
            /* eslint-disable sort-keys */
            $sort: {
                lastName:   1,
                firstName:  1,
                patronymic: 1,
                birthday:   1
            }
            /* eslint-ensable sort-keys */
        },
        // add user family
        {
            $lookup: {
                as:       'family',
                from:     'families',
                let:      { id: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ['$father_id', '$$id'] },
                                    { $eq: ['$mother_id', '$$id'] }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            count:    { $size: '$children' },
                            marriage: '$marriage',
                            partner:  {
                                $and: ['$father_id', '$mother_id']
                            },
                        }
                    }
                ]
            }
        },
        // move family from array to root object
        {
            $unwind: {
                path:                       '$family',
                preserveNullAndEmptyArrays: true
            }
        },
        // add new fields
        {
            $addFields: {
                childrenCount: {
                    $cond:
                        [
                            { $ifNull: [ '$family', false ] },
                            '$family.count',
                            0
                        ]
                },
                marriageDate: {
                    $cond:
                    [
                        { $ifNull: [ '$family', false ] },
                        '$family.marriage',
                        null
                    ]
                },
                partner: {
                    $cond:
                        [
                            { $ifNull: [ '$family', false ] },
                            '$family.partner',
                            false
                        ]
                }
            }
        },
        // remove family
        {
            $project: {
                family: 0
            }
        }
    ]);

    return result;
};

UserSchema.statics.searchUser = async function (searchText) {
    let filterQuery    = {};
    const searchFilter = searchText ? searchText.split(' ').filter(el => el !== '') : [];

    if (searchFilter.length === 1) {
        filterQuery = {
            $or: [
                { lastName: new RegExp(searchFilter[0], 'i') },
                { firstName: new RegExp(searchFilter[0], 'i') }
            ]
        };
    } else if (searchFilter.length === 2) {
        filterQuery = {
            $or: [
                { firstName: new RegExp(searchFilter[1], 'i'), lastName: new RegExp(searchFilter[0], 'i') },
                { firstName: new RegExp(searchFilter[0], 'i'), lastName: new RegExp(searchFilter[1], 'i') },
                { firstName: new RegExp(searchFilter[0], 'i'), patronymic: new RegExp(searchFilter[1], 'i') }
            ]
        };
    } else if (searchFilter.length > 2) {
        filterQuery = {
            $or: [
                { firstName: new RegExp(searchFilter[1], 'i'), lastName: new RegExp(searchFilter[0], 'i'), patronymic: new RegExp(searchFilter[2], 'i') }
            ]
        };
    }

    return this
        .find(filterQuery)
        .limit(5)
        .sort({
            /* eslint-disable sort-keys */
            lastName:   1,
            firstName:  1,
            patronymic: 1,
            birthday:   1
            /* eslint-ensable sort-keys */
        });
};

const userModel = model(USER.MODEL_NAME, UserSchema);

module.exports = userModel;
