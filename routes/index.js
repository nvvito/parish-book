const path = require('path');

const { Router: createRouter } = require('express');
// routes
const adminRoute  = require('./admin');
const familyRoute = require('./family');
const userRout    = require('./user');
// util
const { checkToken } = require('../common/auth');
const { logger }     = require('../common/logger');

const router = createRouter();
// logging
router.use(logRequest);
// api
router.use('/api/admin', adminRoute);
router.use('/api/family', checkToken, familyRoute);
router.use('/api/user', checkToken, userRout);
// public files
router.get('/assets/:fileName', (request, response) => {
    const { fileName } = request.params;
    response.sendFile(path.join(__dirname, `../public/assets/${fileName}`), (err) => {
        if (err) {
            logger.error('An Error occurred while sending File:', fileName);
            response.status(500).send('Internal Server Error');
        }
    });
});
// client app
router.get('*', (request, response) => {
    response.sendFile(path.join(__dirname, '../public/client/build/index.html'), (err) => {
        if (err) {
            logger.error('An Error occurred while sending Client App');
            response.status(500).send('Internal Server Error');
        }
    });
});

function logRequest (req, res, next) {
    logger.info(`Request - ${req.method}: ${req._parsedUrl.pathname},`, 'query:', req.query, 'body:', req.body);
    next();
}

module.exports = router;
