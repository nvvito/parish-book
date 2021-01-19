const ld = require('lodash');

const { model, Schema, Types, isValidObjectId } = require('mongoose');

const { ObjectId: objectId } = Types;

const { FAMILY, USER } = require('../common/constants');
const { NoDataError }  = require('../common/errors');

/* eslint-disable sort-keys */
// Schema
const FamilySchema = new Schema({
    father_id: {
        default: null,
        null:    true,
        ref:     USER.MODEL_NAME,
        type:    Types.ObjectId
    },
    mother_id: {
        default: null,
        null:    true,
        ref:     USER.MODEL_NAME,
        type:    Types.ObjectId
    },
    marriage: {
        default: null,
        null:    true,
        type:    Date
    },
    children: {
        default:  [],
        required: true,
        type:     [{
            ref:  USER.MODEL_NAME,
            type: Types.ObjectId
        }]
    }
}, {
    versionKey: false
});

// indexes
FamilySchema.index({ father_id: 1 });
FamilySchema.index({ mother_id: 1 });
FamilySchema.index({ children: 1 });
/* eslint-enable sort-keys */

// Public methods
/**
 * @public
 *
 * @param {ObjectId|String} familyId
 * @param {Moment|String}   date
 * @param {String|Boolean}  populate Optional
 *
 * @returns {Family}
 */
FamilySchema.statics.getOneById = async function (familyId, session, populate) {
    if (!isValidObjectId(familyId)) {
        throw new NoDataError('Сім\'ю', { _id: familyId });
    }

    const family = populate
        ? await this
            .findById(familyId, null, { session })
            .populate('father_id')
            .populate('mother_id')
            .populate('children')
        : await this
            .findById(familyId, null, { session });

    if (!family) {
        throw new NoDataError('Сім\'ю', familyId);
    }

    return family;
};
/**
 * @private
 *
 * @param {ObjectId|String} parentId
 * @param {String}          parentGender (MAN or WOMAN)
 * @param {Object|null}     session Optional
 * @param {String|Boolean}  populate Optional
 *
 * @returns {Family|null}
 */
FamilySchema.statics.getParentFamily = async function (parentId, parentGender, session, populate) {
    const query                            = {};
    query[FAMILY.FIELD_NAME[parentGender]] = parentId;

    const family = populate
        ? await this
            .findOne(query, null, { session })
            .populate('father_id')
            .populate('mother_id')
            .populate('children')
        : await this
            .findOne(query, null, { session });

    if (!family) {
        throw new NoDataError('Сім\'ю', query);
    }

    return family;
};
/**
 * @private
 *
 * @param {ObjectId|String} parentId
 * @param {String}          parentGender (MAN or WOMAN)
 * @param {Object|null}     session Optional
 * @param {String|Boolean}  populate Optional
 *
 * @returns {Family}
 */
FamilySchema.statics.getCreateParentFamily = async function (parentId, parentGender, session, populate) {
    const _model = this;

    const query                            = {};
    query[FAMILY.FIELD_NAME[parentGender]] = parentId;

    try {
        const family = await _model.getParentFamily(parentId, parentGender, session, populate);

        return family;
    } catch (err) {
        if (err instanceof NoDataError) {
            const [newFamily] = await _model.create([query], { session });

            if (!populate) {
                return newFamily;
            }

            const populatedFamily = await newFamily
                .populate('father_id')
                .populate('mother_id')
                .populate('children')
                .execPopulate();

            return populatedFamily;
        }

        throw err;
    }
};
/**
 * @private
 *
 * @param {ObjectId|String} childId
 * @param {Object|null}     session Optional
 * @param {String|Boolean}  populate Optional
 *
 * @returns {Family|null}
 */
FamilySchema.statics.getChildFamily = async function (childId, session, populate) {
    const query  = { children: childId };
    const family = populate
        ? await this
            .findOne(query, null, { session })
            .populate('father_id')
            .populate('mother_id')
            .populate('children')
        : await this
            .findOne(query, null, { session });

    if (!family) {
        throw new NoDataError('Сім\'ю', query);
    }

    return family;
};
/**
 * @private
 *
 * @param {ObjectId|String} childId
 * @param {Object|null}     session Optional
 * @param {String|Boolean}  populate Optional
 *
 * @returns {Family}
 */
FamilySchema.statics.getCreateChildFamily = async function (childId, session, populate) {
    const _model = this;

    try {
        const family = await _model.getChildFamily(childId, session, populate);

        return family;
    } catch (err) {
        if (err instanceof NoDataError) {
            const [newFamily] = await _model.create([ { children: [childId] } ], { session });

            if (!populate) {
                return newFamily;
            }

            const populatedFamily = await newFamily
                .populate('father_id')
                .populate('mother_id')
                .populate('children')
                .execPopulate();

            return populatedFamily;
        }

        throw err;
    }
};
/**
 * @private
 *
 * @param {ObjectId|String} family
 *
 * @returns {Family}
 */
FamilySchema.statics.depopulateFamily = function (family) {
    return family
        .depopulate('father_id')
        .depopulate('mother_id')
        .depopulate('children');
};
/**
 * @private
 *
 * @param {Family} family
 *
 * @returns {Boolean}
 */
FamilySchema.statics.familyMustRemove = function (family) {
    let members = 0;

    members += ld.get(family, 'children', []).length;

    if (family.father_id) members++;
    if (family.mother_id) members++;

    return members < 3;
};
/**
 * @public
 *
 * @param {ObjectId|String} userId
 * @param {String}          gender (MAN or WOMAN)
 *
 * @returns {Boolean}
 */
FamilySchema.statics.getPopulatedUserFamilies = async function (userId, gender) {
    // find by gender field
    const matchQuery                      = {};
    matchQuery[FAMILY.FIELD_NAME[gender]] = objectId(userId);
    // remove user from parent
    const projectQuery = {
        children: 1,
        marriage: 1,
        partner:  {
            $ifNull: gender === USER.GENDER.MAN ? ['$partner', '$mother_id'] : ['$partner', '$father_id']
        }
    };

    const [result] = await this.aggregate().facet({
        parentFamily: [
            // find parent family by child
            {
                $match: {
                    children: objectId(userId)
                }
            },
            // get children data
            {
                $lookup: {
                    as:           'children',
                    foreignField: '_id',
                    from:         'users',
                    localField:   'children'
                }
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
            // remove father_id, mother_id, user from children
            {
                $project: {
                    children: {
                        $filter: {
                            as:    'child',
                            cond:  { $ne: [ '$$child._id', objectId(userId) ] },
                            input: '$children'
                        }
                    },
                    father: {
                        $ifNull: ['$father', '$father_id']
                    },
                    mother: {
                        $ifNull: ['$mother', '$mother_id']
                    }
                }
            },
        ],
        user: [
            // get user data
            {
                $lookup: {
                    as:       'user',
                    from:     'users',
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', objectId(userId)],
                                }
                            }
                        }
                    ]
                }
            },
        ],
        userFamily: [
            // find user family by parent
            {
                $match: matchQuery
            },
            // get children data
            {
                $lookup: {
                    as:           'children',
                    foreignField: '_id',
                    from:         'users',
                    localField:   'children'
                }
            },
            // get partner data
            {
                $lookup: {
                    as:           'partner',
                    foreignField: '_id',
                    from:         'users',
                    localField:   gender === USER.GENDER.MAN ? 'mother_id' : 'father_id'
                }
            },
            // move partner from array to root object
            {
                $unwind: {
                    path:                       '$partner',
                    preserveNullAndEmptyArrays: true
                }
            },
            // remove father_id and mother_id
            {
                $project: projectQuery
            }
        ]
    });

    const {
        parentFamily: [parentFamily],
        userFamily:   [userFamily]
    } = result;

    return {
        parentFamily: parentFamily || null,
        userFamily:   userFamily || null
    };
};

const familyModel = model(FAMILY.MODEL_NAME, FamilySchema);

module.exports = familyModel;
