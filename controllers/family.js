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
            if (date !== null && (!date || !moment(date).isValid())) {
                throw new LogicError('Невірний формат дати шлюбу');
            }
            // check parents existing
            if (!family.father_id || !family.mother_id) {
                throw new LogicError('Для запису дати шлюбу необхідно два партнери');
            }
            // check the ratio of years
            if (
                date
                && (
                    moment(ld.get(family, 'father_id.birthday', null)).isSameOrAfter(date)
                    || moment(ld.get(family, 'mother_id.birthday', null)).isSameOrAfter(date)
                )
            ) {
                throw new LogicError('Дата шлюбу не може бути меншою за дати народження партнерів');
            }

            this._familyModel.depopulateFamily(family);
            family.marriage = date ? moment.utc(date) : null;
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
        const { gender }           = request.query;

        try {
            // check gender param
            if (!Object.values(USER.GENDER).includes(gender)) {
                throw new LogicError('Не вказано, або вказано із помилкою стать');
            }

            let result;
            // check ids equality
            if (String(userId) === String(parentId)) {
                throw new LogicError('Парафіянин не може бути батьком чи матірью для себе');
            }

            await mongoose.connection.transaction(async (session) => {
                const user   = await this._userModel.getOneById(userId, 'Парафіянина', session);
                const parent = await this._userModel.getOneById(parentId, 'Батька чи матір', session);
                // check gender
                if (gender !== parent.gender) {
                    throw new LogicError('Батько не може бути жінкою або матір чоловіком');
                }
                // check the ratio of years
                if (moment(parent.birthday).isSameOrAfter(user.birthday)) {
                    throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                }
                // check ties between partners
                try {
                    const userParentFamily = await this._familyModel.getParentFamily(userId, user.gender, session);
                    if (String(userParentFamily[FAMILY.FIELD_NAME[parent.gender]]) === String(parentId)) {
                        throw new LogicError('Чоловік чи дружина не можуть бути батьком чи матіроью');
                    }
                } catch (err) {
                    if (!(err instanceof NoDataError)) {
                        throw err;
                    }
                }

                try {
                    const userFamily = await this._familyModel.getChildFamily(userId, session, 'populate');
                    // check ties between parent and child
                    if (ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(parentId))) {
                        throw new LogicError('Брат чи сестра не можуть бути батьками для парафіянина');
                    }
                    // check the ratio of years
                    if (ld.get(userFamily, 'children', []).some(c => moment(parent.birthday).isSameOrAfter(c.birthday))) {
                        throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                    }

                    try {
                        const parentFamily = await this._familyModel.getParentFamily(parentId, parent.gender, session);
                        // check the parent has no other family
                        if (String(parentFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('Батько чи матір та дитина мають різні сім\'ї');
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
                            throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
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
                throw new LogicError('Парафіянин не може бути братом чи сестрою до себе');
            }

            await mongoose.connection.transaction(async (session) => {
                const user    = await this._userModel.getOneById(userId, 'Парафіянина', session);
                const sibling = await this._userModel.getOneById(siblingId, 'Брата чи сестру', session);
                // check ties between partners
                try {
                    const userParentFamily = await this._familyModel.getParentFamily(userId, user.gender, session);
                    if (String(userParentFamily[FAMILY.FIELD_NAME[sibling.gender]]) === String(sibling._id)) {
                        throw new LogicError('Батько чи матір не можуть бути братом чи сестрою для парафіянина');
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
                        throw new LogicError('Чоловік чи дружина не можуть бути братом чи сестрою для парафіянина');
                    }
                    // check the ratio of years
                    if (
                        moment(ld.get(userFamily, 'father_id.birthday', null)).isSameOrAfter(sibling.birthday)
                        || moment(ld.get(userFamily, 'mother_id.birthday', null)).isSameOrAfter(sibling.birthday)
                    ) {
                        throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                    }

                    try {
                        const siblingFamily = await this._familyModel.getChildFamily(siblingId, session);
                        // check the sibling has no other family
                        if (String(siblingFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('Парафіянин та вказаний брат чи сестра мають різні сім\'ї');
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
                            throw new LogicError('Парафіянин не може бути братом чи сестрою для своїх дітей');
                        }
                        // check the ratio of years
                        if (
                            moment(ld.get(siblingFamily, 'father_id.birthday', null)).isSameOrAfter(user.birthday)
                            || moment(ld.get(siblingFamily, 'mother_id.birthday', null)).isSameOrAfter(user.birthday)
                        ) {
                            throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
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
                throw new LogicError('Парафіянин не може бути чоловіком чи дружиною для себе');
            }

            await mongoose.connection.transaction(async (session) => {
                const user    = await this._userModel.getOneById(userId, 'Парафіянина', session);
                const partner = await this._userModel.getOneById(partnerId, 'Чоловіка чи дружину', session);
                // check gender
                if (user.gender === partner.gender) {
                    throw new LogicError('Чоловік і дружина повинні бути різної статі');
                }

                const father = user.gender === USER.GENDER.MAN ? user : partner;
                const mother = user.gender === USER.GENDER.WOMAN ? user : partner;
                // check ties between parent and parent
                try {
                    const fatherChildFamily = await this._familyModel.getChildFamily(userId, session);
                    if (ld.get(fatherChildFamily, 'children', []).map(c => String(c)).includes(String(mother._id))) {
                        throw new LogicError('Чоловік та дружина не можуть бути братом і сестрою');
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
                        throw new LogicError('Батько чи матір не можуть бути чоловіком чи дружиною для своїх дітей');
                    }
                    // check the ratio of years
                    if (ld.get(fatherFamily, 'children', []).some(c => moment(mother.birthday).isSameOrAfter(c.birthday))) {
                        throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                    }

                    try {
                        const motherFamily = await this._familyModel.getParentFamily(mother._id, mother.gender, session);
                        // check the mother has no other family
                        if (String(motherFamily._id) !== String(fatherFamily._id)) {
                            throw new LogicError('Чоловік та дружина мають різні сім\'ї');
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
                            throw new LogicError('Батьки не можуть бути чоловіком чи дружиною для своїх дітей');
                        }
                        // check the ratio of years
                        if (ld.get(motherFamily, 'children', []).some(c => moment(father.birthday).isSameOrAfter(c.birthday))) {
                            throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
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
                throw new LogicError('Парафіянин не може бути своєю дитиною');
            }

            await mongoose.connection.transaction(async (session) => {
                const user  = await this._userModel.getOneById(userId, 'Парафіянина', session);
                const child = await this._userModel.getOneById(childId, 'Дитину', session);
                // check the ratio of years
                if (moment(user.birthday).isSameOrAfter(child.birthday)) {
                    throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                }

                try {
                    const userFamily = await this._familyModel.getParentFamily(userId, user.gender, session, 'populate');
                    // check the ratio of years
                    if (
                        moment(ld.get(userFamily, 'father_id.birthday', null)).isSameOrAfter(child.birthday)
                    || moment(ld.get(userFamily, 'mother.birthday', null)).isSameOrAfter(child.birthday)
                    ) {
                        throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
                    }

                    try {
                        const childFamily = await this._familyModel.getChildFamily(childId, session);
                        // check the child has no other family
                        if (String(childFamily._id) !== String(userFamily._id)) {
                            throw new LogicError('Батько чи матір та дитина мають різні сім\'ї');
                        }

                        this._familyModel.depopulateFamily(childFamily);
                        result = childFamily;
                        return childFamily;
                    } catch (err) {
                        if (!(err instanceof NoDataError)) {
                            throw err;
                        }
                    }

                    this._familyModel.depopulateFamily(userFamily);
                    userFamily.children.push(childId);
                    await userFamily.save({ session });

                    result = userFamily;
                    return userFamily;
                } catch (err) {
                    if (err instanceof NoDataError) {
                        const childFamily = await this._familyModel.getCreateChildFamily(childId, session, 'populate');
                        // check ties between parent and child
                        if (ld.get(childFamily, 'children', []).map(c => String(c._id)).includes(String(userId))) {
                            throw new LogicError('Брати чи сестри не можуть бути батьком чи матірью');
                        }
                        // check the ratio of years
                        if (ld.get(childFamily, 'children', []).some(c => moment(user.birthday).isSameOrAfter(c.birthday))) {
                            throw new LogicError('Батько чи матір не можуть бути молодші за дітей');
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
                throw new LogicError('Парафіянин не може бути своїм батьком чи матірью');
            }

            const user   = await this._userModel.getOneById(userId, 'Парафіянина');
            const parent = await this._userModel.getOneById(parentId, 'Батька чи дружину');

            const userFamily = await this._familyModel.getChildFamily(user._id);
            // check ties between parent and child
            if (String(userFamily[FAMILY.FIELD_NAME[parent.gender]]) !== String(parentId)) {
                throw new LogicError('Сім\'ї з вказаним батьком чи матірью не має');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this._familyModel.findByIdAndDelete(userFamily._id);

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
                throw new LogicError('Парафіянин не може бути братом чи сестрою до себе');
            }

            const user    = await this._userModel.getOneById(userId, 'Парафіянина');
            const sibling = await this._userModel.getOneById(siblingId, 'Брата чи сестру');

            const userFamily = await this._familyModel.getChildFamily(user._id);
            // check ties between parent and child
            if (!ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(siblingId))) {
                throw new LogicError('Сімі\'ї з вказаним бартом чи сестрою не має');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this._familyModel.findByIdAndDelete(userFamily._id);

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
                throw new LogicError('Парафіянин не може бути чоловіком і дружиною до себе');
            }

            const user    = await this._userModel.getOneById(userId, 'Парафіянина');
            const partner = await this._userModel.getOneById(partnerId, 'Чоловіка чи дружини');

            const userFamily = await this._familyModel.getParentFamily(user._id, user.gender);
            // check ties between parent and child
            if (String(userFamily[FAMILY.FIELD_NAME[partner.gender]]) !== String(partner._id)) {
                throw new LogicError('Сімі\'ї з вказаним чоловіком чи дружиною не має');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this._familyModel.findByIdAndDelete(userFamily._id);

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
                throw new LogicError('Парафіянин не може бути своєю дитиною');
            }

            const user  = await this._userModel.getOneById(userId, 'Парафіянина');
            const child = await this._userModel.getOneById(childId, 'Дитини');

            const userFamily = await this._familyModel.getParentFamily(user._id, user.gender);
            // check ties between parent and child
            if (!ld.get(userFamily, 'children', []).map(c => String(c._id)).includes(String(child._id))) {
                throw new LogicError('Сімі\'ї з вказаною дитиною не має');
            }
            // check the need for removal
            if (this._familyModel.familyMustRemove(userFamily)) {
                await this._familyModel.findByIdAndDelete(userFamily._id);

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
            const user   = await this._userModel.getOneById(userId, 'Парафіянина');
            const family = await this._familyModel.getOneById(familyId);
            // check the need for removal
            if (this._familyModel.familyMustRemove(family)) {
                await this._familyModel.findByIdAndDelete(family._id);

                return response.send({
                    error:   false,
                    message: null
                });
            }
            // remove user from family
            if (String(family[FAMILY.FIELD_NAME[user.gender]]) === String(user._id)) {
                // remove user from parents
                family[FAMILY.FIELD_NAME[user.gender]] = null;
                family.marriage                        = null;
            } else if (ld.get(family, 'children', []).map(c => String(c._id)).includes(String(user._id))) {
                // remove user from children
                family.children = family.children.filter(c => String(c._id) !== String(user._id));
            } else {
                throw new LogicError('Парафіянин не належить до вказаної сім\'ї');
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
        return `Виникла помилка при обробці familyController.${functionName}:`;
    }
}

const familyController = new FamilyController(familyModel, userModel);

module.exports = familyController;
