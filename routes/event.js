const { Router: createRouter } = require('express');

const eventController = require('../controllers/event');

const router = createRouter();

router.get('/', eventController.getAll.bind(eventController));

module.exports = router;
