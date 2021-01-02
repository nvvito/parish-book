const moment   = require('moment');
const mongoose = require('mongoose');
const ld       = require('lodash');

const familyModel = require('../models/family');
const userModel   = require('../models/user');

const { LogicError, NoDataError } = require('../common/errors');
const { FAMILY, USER }            = require('../common/constants');
const { logger }                  = require('../common/logger');
const { errorToString }           = require('../common/utils');

class FamilyController {
    constructor (_familyModel, _userModel) {
        this._familyModel = _familyModel;
        this._userModel   = _userModel;
    }

    async updateMarriageDate (request, response) {
        const { familyId } = request.params;
        const { date }     = request.body;

        try {
            const family = await this._familyModel.getOneById(familyId, null, 'populate');
            // check date validation
            if (!date || !moment(date).isValid()) {
                throw new LogicError('Invalid date of marriage');
            }
            // check parents existing
            if (!family.father_id || !family.mother_id) {
                throw new LogicError('Two parents are required to set a marriage date');
            }
            // check the ratio of years
            if (
                moment(ld.get(family, 'father_id.birthday', null)).isSameOrAfter(date)
                || moment(ld.get(family, 'mother_id.birthday', null)).isSameOrAfter(date)
            ) {
                throw new LogicError('The date of marriage cannot be earlier than the birth of the parents');
            }

            this._familyModel.depopulateFamily(family);
            family.marriage = moment.utc(date);
            await family.save();

            return response.send({
                error:   false,
                message: family
            });
        } catch (err) {
            logger.error(this._getContext('updateMarriageDate'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async addParent (request, response) {
        const { userId, parentId } = request.params;

        try {
            let result;
            // check ids equality
            if (String(userId) === String(parentId)) {
                throw new LogicError('The user cannot be a parent for himself');
            }

            await mongoose.connection.transaction(async (session) => {
                const user   = await this._userModel.getOneById(userId, 'user', session);
                const parent = await this._userModel.getOneById(parentId, 'parent', session);
                // check the ratio of years
                if (moment(parent.birthday).isSameOrAfter(user.birthday)) {
                    throw new LogicError('The parent cannot be younger than a user');
                }

                try {
                    const userFamily = await this._familyModel.getChildFamily(userId, session, 'populate');
                    // check ties between parent and child
                    if (ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(parentId))) {
                        throw new LogicError('The brother or the sister cannot be a parent');
                    }
                    // check the ratio of years
                    if (ld.get(userFamily, 'children', []).some(c => moment(parent.birthday).isSameOrAfter(c.birthday))) {
                        throw new LogicError('The parent cannot be younger than a user');
                    }

                    try {
                        const parentFamily = await this._familyModel.getParentFamily(parentId, parent.gender, session);
                        // check the parent has no other family
                        if (String(parentFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('The parent and child have different families');
                        }

                        this._familyModel.depopulateFamily(parentFamily);
                        result = parentFamily;
                        return parentFamily;
                    } catch (err) {
                        if (!(err instanceof NoDataError)) {
                            throw err;
                        }
                    }

                    this._familyModel.depopulateFamily(userFamily);
                    userFamily[FAMILY.FIELD_NAME[parent.gender]] = parentId;
                    await userFamily.save({ session });

                    result = userFamily;
                    return userFamily;
                } catch (err) {
                    if (err instanceof NoDataError) {
                        const parentFamily = await this._familyModel.getCreateParentFamily(parentId, parent.gender, session, 'populate');
                        // check the ratio of years
                        if (
                            moment(ld.get(parentFamily, 'father_id.birthday', null)).isSameOrAfter(user.birthday)
                            || moment(ld.get(parentFamily, 'mother.birthday', null)).isSameOrAfter(user.birthday)
                        ) {
                            throw new LogicError('The parent cannot be younger than a user');
                        }

                        this._familyModel.depopulateFamily(parentFamily);
                        parentFamily.children.push(userId);
                        await parentFamily.save({ session });

                        result = parentFamily;
                        return parentFamily;
                    }

                    throw err;
                }
            });

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('addParent'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async addSibling (request, response) {
        const { userId, siblingId } = request.params;

        try {
            let result;
            // check ids equality
            if (String(userId) === String(siblingId)) {
                throw new LogicError('The user cannot be a brother or sister to himself');
            }

            await mongoose.connection.transaction(async (session) => {
                const user    = await this._userModel.getOneById(userId, 'user', session);
                const sibling = await this._userModel.getOneById(siblingId, 'sibling', session);
                // check ties between parent and parent
                try {
                    const userParentFamily = await this._familyModel.getParentFamily(user, user.gender, session);
                    if (String(userParentFamily[FAMILY.FIELD_NAME[sibling.gender]]) === String(sibling._id)) {
                        throw new LogicError('The Parents cannot be brother and sister');
                    }
                } catch (err) {
                    if (!(err instanceof NoDataError)) {
                        throw err;
                    }
                }

                try {
                    const userFamily = await this._familyModel.getChildFamily(userId, session, 'populate');
                    // check ties between parent and child
                    if (String(ld.get(userFamily, `${FAMILY.FIELD_NAME[sibling.gender]}._id`)) === String(siblingId)) {
                        throw new LogicError('The parent cannot be a brother or sister to this user');
                    }
                    // check the ratio of years
                    if (
                        moment(ld.get(userFamily, 'father_id.birthday', null)).isSameOrAfter(sibling.birthday)
                        || moment(ld.get(userFamily, 'mother_id.birthday', null)).isSameOrAfter(sibling.birthday)
                    ) {
                        throw new LogicError('The parent cannot be younger than the sibling');
                    }

                    try {
                        const siblingFamily = await this._familyModel.getChildFamily(siblingId, session);
                        // check the sibling has no other family
                        if (String(siblingFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('The user and the sibling have different families');
                        }

                        this._familyModel.depopulateFamily(siblingFamily);
                        result = siblingFamily;
                        return siblingFamily;
                    } catch (err) {
                        if (!(err instanceof NoDataError)) {
                            throw err;
                        }
                    }
                    this._familyModel.depopulateFamily(userFamily);
                    userFamily.children.push(siblingId);
                    await userFamily.save({ session });

                    result = userFamily;
                    return userFamily;
                } catch (err) {
                    if (err instanceof NoDataError) {
                        const siblingFamily = await this._familyModel.getCreateChildFamily(siblingId, session, 'populate');
                        // check ties between parent and child
                        if (String(ld.get(siblingFamily, `${FAMILY.FIELD_NAME[user.gender]}._id`)) === String(userId)) {
                            throw new LogicError('The parent cannot be a brother or sister to this sibling');
                        }
                        // check the ratio of years
                        if (
                            moment(ld.get(siblingFamily, 'father_id.birthday', null)).isSameOrAfter(user.birthday)
                            || moment(ld.get(siblingFamily, 'mother_id.birthday', null)).isSameOrAfter(user.birthday)
                        ) {
                            throw new LogicError('The parent cannot be younger than a user');
                        }

                        this._familyModel.depopulateFamily(siblingFamily);
                        siblingFamily.children.push(userId);
                        await siblingFamily.save({ session });

                        result = siblingFamily;
                        return siblingFamily;
                    }

                    throw err;
                }
            });

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('addSibling'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async addPartner (request, response) {
        const { userId, partnerId } = request.params;

        try {
            let result;
            // check ids equality
            if (String(userId) === String(partnerId)) {
                throw new LogicError('The father and the mother in a family cannot be one person');
            }

            await mongoose.connection.transaction(async (session) => {
                const user    = await this._userModel.getOneById(userId, 'parent', session);
                const partner = await this._userModel.getOneById(partnerId, 'parent', session);
                // check gender
                if (user.gender === partner.gender) {
                    throw new LogicError('The parents gender are the same');
                }

                const father = user.gender === USER.GENDER.MAN ? user : partner;
                const mother = user.gender === USER.GENDER.WOMAN ? user : partner;
                // check ties between parent and parent
                try {
                    const fatherChildFamily = await this._familyModel.getChildFamily(userId, session);
                    if (ld.get(fatherChildFamily, 'children', []).map(c => String(c)).includes(String(mother._id))) {
                        throw new LogicError('The Parents cannot be brother and sister');
                    }
                } catch (err) {
                    if (!(err instanceof NoDataError)) {
                        throw err;
                    }
                }

                try {
                    const fatherFamily = await this._familyModel.getParentFamily(father._id, father.gender, session, 'populate');
                    // check ties between parent and child
                    if (ld.get(fatherFamily, 'children', []).map(c => String(c._id)).includes(String(mother._id))) {
                        throw new LogicError('Parent own child cannot be a partner');
                    }
                    // check the ratio of years
                    if (ld.get(fatherFamily, 'children', []).some(c => moment(mother.birthday).isSameOrAfter(c.birthday))) {
                        throw new LogicError('The parent cannot be younger than a child');
                    }

                    try {
                        const motherFamily = await this._familyModel.getParentFamily(mother._id, mother.gender, session);
                        // check the mother has no other family
                        if (String(motherFamily._id) !== String(fatherFamily._id)) {
                            throw new LogicError('The parentshave different families');
                        }

                        this._familyModel.depopulateFamily(motherFamily);
                        result = motherFamily;
                        return motherFamily;
                    } catch (err) {
                        if (!(err instanceof NoDataError)) {
                            throw err;
                        }
                    }

                    this._familyModel.depopulateFamily(fatherFamily);
                    fatherFamily[FAMILY.FIELD_NAME[mother.gender]] = mother._id;
                    await fatherFamily.save({ session });

                    result = fatherFamily;
                    return fatherFamily;
                } catch (err) {
                    if (err instanceof NoDataError) {
                        const motherFamily = await this._familyModel.getCreateParentFamily(mother._id, mother.gender, session, 'populate');
                        // check ties between parent and child
                        if (ld.get(motherFamily, 'children', []).map(c => String(c._id)).includes(String(father._id))) {
                            throw new LogicError('Parent own child cannot be a partner');
                        }
                        // check the ratio of years
                        if (ld.get(motherFamily, 'children', []).some(c => moment(father.birthday).isSameOrAfter(c.birthday))) {
                            throw new LogicError('The parent cannot be younger than a child');
                        }

                        this._familyModel.depopulateFamily(motherFamily);
                        motherFamily[FAMILY.FIELD_NAME[father.gender]] = father._id;
                        await motherFamily.save({ session });

                        result = motherFamily;
                        return motherFamily;
                    }

                    throw err;
                }
            });
            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('addPartner'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async addChild (request, response) {
        const { userId, childId } = request.params;

        try {
            let result;
            // check ids equality
            if (String(userId) === String(childId)) {
                throw new LogicError('The user cannot be a child for himself');
            }

            await mongoose.connection.transaction(async (session) => {
                const user  = await this._userModel.getOneById(userId, 'user', session);
                const child = await this._userModel.getOneById(childId, 'parent', session);
                // check the ratio of years
                if (moment(user.birthday).isSameOrAfter(child.birthday)) {
                    throw new LogicError('The user cannot be younger than the child');
                }

                try {
                    const userFamily = await this._familyModel.getCreateParentFamily(userId, user.gender, session, 'populate');
                    // check the ratio of years
                    if (
                        moment(ld.get(userFamily, 'father_id.birthday', null)).isSameOrAfter(child.birthday)
                    || moment(ld.get(userFamily, 'mother.birthday', null)).isSameOrAfter(child.birthday)
                    ) {
                        throw new LogicError('The parent cannot be younger than the child');
                    }

                    try {
                        const parentFamily = await this._familyModel.getChildFamily(childId, session);
                        // check the parent has no other family
                        if (String(parentFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('The parent and child have different families');
                        }

                        this._familyModel.depopulateFamily(parentFamily);
                        result = parentFamily;
                        return parentFamily;
                    } catch (err) {
                        if (!(err instanceof NoDataError)) {
                            throw err;
                        }
                    }

                    this._familyModel.depopulateFamily(userFamily);
                    userFamily.children.push(userId);
                    await userFamily.save({ session });

                    result = userFamily;
                    return userFamily;
                } catch (err) {
                    if (err instanceof NoDataError) {
                        const childFamily = await this._familyModel.getCreateChildFamily(childId, session, 'populate');
                        // check ties between parent and child
                        if (ld.get(childFamily, 'children', []).map(c => String(c._id)).includes(String(userId))) {
                            throw new LogicError('The brother or the sister cannot be a parent');
                        }
                        // check the ratio of years
                        if (ld.get(childFamily, 'children', []).some(c => moment(user.birthday).isSameOrAfter(c.birthday))) {
                            throw new LogicError('The user cannot be younger than the child');
                        }

                        this._familyModel.depopulateFamily(childFamily);
                        childFamily[FAMILY.FIELD_NAME[user.gender]] = userId;
                        await childFamily.save({ session });

                        result = childFamily;
                        return childFamily;
                    }

                    throw err;
                }
            });

            return response.send({
                error:   false,
                message: result
            });
        } catch (err) {
            logger.error(this._getContext('addChild'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async removeParent (request, response) {
        const { userId, parentId } = request.params;

        try {
            // check ids equality
            if (String(userId) === String(parentId)) {
                throw new LogicError('The user cannot be a parent for himself');
            }

            const user   = await this._userModel.getOneById(userId);
            const parent = await this._userModel.getOneById(parentId, 'parent');

            const userFamily = await this._familyModel.getChildFamily(user._id);
            // check ties between parent and child
            if (String(userFamily[FAMILY.FIELD_NAME[parent.gender]]) !== String(parentId)) {
                throw new LogicError('Family with such ties not found');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this.findByIdAndDelete(userFamily._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }

            userFamily[FAMILY.FIELD_NAME[parent.gender]] = null;
            userFamily.marriage                          = null;
            await userFamily.save();

            return response.send({
                error:   false,
                message: userFamily
            });
        } catch (err) {
            logger.error(this._getContext('removeParent'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async removeSibling (request, response) {
        const { userId, siblingId } = request.params;

        try {
            // check ids equality
            if (String(userId) === String(siblingId)) {
                throw new LogicError('The user cannot be a brother or sister to himself');
            }

            const user    = await this._userModel.getOneById(userId);
            const sibling = await this._userModel.getOneById(siblingId, 'sibling');

            const userFamily = await this._familyModel.getChildFamily(user._id);
            // check ties between parent and child
            if (!ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(siblingId))) {
                throw new LogicError('Family with such ties not found');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this.findByIdAndDelete(userFamily._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }

            userFamily.children = userFamily.children.filter(c => String(c._id) !== String(sibling._id));
            await userFamily.save();

            return response.send({
                error:   false,
                message: userFamily
            });
        } catch (err) {
            logger.error(this._getContext('removeSibling'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async removePartner (request, response) {
        const { userId, partnerId } = request.params;

        try {
            // check ids equality
            if (String(userId) === String(partnerId)) {
                throw new LogicError('The father and the mother in a family cannot be one person');
            }

            const user    = await this._userModel.getOneById(userId);
            const partner = await this._userModel.getOneById(partnerId, 'sibling');

            const userFamily = await this._familyModel.getParentFamily(user._id, user.gender);
            // check ties between parent and child
            if (String(userFamily[FAMILY.FIELD_NAME[partner.gender]]) !== String(partner._id)) {
                throw new LogicError('Family with such ties not found');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this.findByIdAndDelete(userFamily._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }

            userFamily[FAMILY.FIELD_NAME[partner.gender]] = null;
            userFamily.marriage                           = null;
            await userFamily.save();

            return response.send({
                error:   false,
                message: userFamily
            });
        } catch (err) {
            logger.error(this._getContext('removePartner'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async removeChild (request, response) {
        const { userId, childId } = request.params;

        try {
            // check ids equality
            if (String(userId) === String(childId)) {
                throw new LogicError('The user cannot be a child for himself');
            }

            const user  = await this._userModel.getOneById(userId);
            const child = await this._userModel.getOneById(childId, 'sibling');

            const userFamily = await this._familyModel.getParentFamily(user._id, user.gender);
            // check ties between parent and child
            if (!ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(child._id))) {
                throw new LogicError('Family with such ties not found');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this.findByIdAndDelete(userFamily._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }

            userFamily.children = userFamily.children.filter(c => String(c._id) !== String(child._id));
            await userFamily.save();

            return response.send({
                error:   false,
                message: userFamily
            });
        } catch (err) {
            logger.error(this._getContext('removeChild'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    async leftFamily (request, response) {
        const { userId, familyId } = request.params;

        try {
            const user   = await this._userModel.getOneById(userId);
            const family = await this._familyModel.findById(familyId);
            // remove user from parents
            if (String(family[FAMILY.FIELD_NAME[user.gender]]) === String(user._id)) {
                family[FAMILY.FIELD_NAME[user.gender]] = null;
                family.marriage                        = null;
            } else if (ld.get(family, 'children', []).map(c => String(c._id)).includes(String(user._id))) {
                // remove user from children
                family.children = family.children.filter(c => String(c._id) !== String(user._id));
            } else {
                throw new LogicError('The user is not in the specified family');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(family)) {
                await this.findByIdAndDelete(family._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }
            // save changes
            await family.save();

            return response.send({
                error:   false,
                message: family
            });
        } catch (err) {
            logger.error(this._getContext('leftFamily'), err);

            return response.status(500).send({
                error:   true,
                message: errorToString(err)
            });
        }
    }

    _getContext (functionName) {
        return `An Error occurred while handle familyController.${functionName}:`;
    }
}

const familyController = new FamilyController(familyModel, userModel);

module.exports = familyController;
