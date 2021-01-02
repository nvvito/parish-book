const { Router: createRouter } = require('express');

const adminController = require('../controllers/admin');

const router = createRouter();

router.post('/login', adminController.login.bind(adminController));

module.exports = router;
