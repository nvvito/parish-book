const { model, Schema } = require('mongoose');

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
UserSchema.index({ _id: 1, gender: 1 });
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
UserSchema.statics.getOneById = async function (userId, label = 'user', session) {
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
                            count:   { $size: '$children' },
                            partner: {
                                $and: ['$father_id', '$mother_id']
                            }
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
        },
        // sort results
        {
            /* eslint-disable sort-keys */
            $sort: {
                lastName:   1,
                firstName:  1,
                patronymic: 1,
                birthday:   1
            }
            /* eslint-ensable sort-keys */
        }
    ]);

    return result;
};

const userModel = model(USER.MODEL_NAME, UserSchema);

module.exports = userModel;
