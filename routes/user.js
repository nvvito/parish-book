const { Router: createRouter } = require('express');

const userController = require('../controllers/user');

const router = createRouter();

router.get('/', userController.getAll.bind(userController));
router.get('/search', userController.searchUser.bind(userController));
router.get('/:_id', userController.getOneById.bind(userController));
router.post('/', userController.createOne.bind(userController));
router.put('/:_id', userController.updateOneById.bind(userController));
router.delete('/:_id', userController.deleteOneById.bind(userController));

module.exports = router;
