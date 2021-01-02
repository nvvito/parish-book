const { Router: createRouter } = require('express');

const familyController = require('../controllers/family');

const router = createRouter();

// set date of marriage
router.put('/:familyId/marriage/', familyController.updateMarriageDate.bind(familyController));
// set link with relative (add relative (id - rid) to user (id - uid))
router.put('/user/:userId/parent/:parentId', familyController.addParent.bind(familyController));
router.put('/user/:userId/sibling/:siblingId', familyController.addSibling.bind(familyController));
router.put('/user/:userId/partner/:partnerId', familyController.addPartner.bind(familyController));
router.put('/user/:userId/child/:childId', familyController.addChild.bind(familyController));
// remove link with relative (remove relative (id - rid) from user (id - uid))
router.delete('/user/:userId/parent/:parentId', familyController.removeParent.bind(familyController));
router.delete('/user/:userId/sibling/:siblingId', familyController.removeSibling.bind(familyController));
router.delete('/user/:userId/partner/:partnerId', familyController.removePartner.bind(familyController));
router.delete('/user/:userId/child/:childId', familyController.removeChild.bind(familyController));
// left family
router.delete('/:familyId/user/:userId', familyController.leftFamily.bind(familyController));

module.exports = router;
