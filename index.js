const bodyParser  = require('body-parser');
const compression = require('compression');
const cors        = require('cors');
const express     = require('express');
const helmet      = require('helmet');
const mongoose    = require('mongoose');

const router = require('./routes');

const { DB, SERVER } = require('./common/constants');
const { logger }     = require('./common/logger');

const app = express();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
// server app routes
app.use(router);
// start server app
// get PORT for heroku
const port   = process.env.PORT || SERVER.PORT;
const server = app.listen(port, () => {
    logger.info(`App listening ${port} port,`, 'pid: ', process.pid);
});
// connect to DB
// mongodb+srv:
// mongodb:
const uri = `mongodb+srv://${DB.USER_NAME ? `${DB.USER_NAME}:${DB.USER_PASSWORD}@` : ''}${DB.HOST}/${DB.NAME}?retryWrites=true&w=majority&replicaSet=${DB.REPLICA_SET}`;
mongoose.connect(uri, {
    poolSize:           10,
    useCreateIndex:     true,
    useFindAndModify:   false,
    useNewUrlParser:    true,
    useUnifiedTopology: true
}, (err) => {
    if (err) {
        logger.error('DB initialized unsuccessful, Error:', err);
    }
    logger.info('DB initialized successful');
});
// logging Unhandled Rejection and Uncaught Exception
process.on('unhandledRejection', err => logger.error(`Unhandled Rejection! Error:`, err));
process.on('uncaughtException', err => logger.error(`Uncaught Exception! Error:`, err));
// graceful stop
process.on('SIGTERM', gracefulStop);
process.on('SIGINT', gracefulStop);
// graceful stop internal function
function gracefulStop (signal) {
    logger.info('Graceful Stop began because of', signal);
    server.close(() => {
        logger.info('The HTTP server is deinitialized successful');
        mongoose.connection.close(false, () => {
            logger.info('The DB connection is deinitialized successful');
            logger.info('The end of the graceful stop');
            setTimeout(() => process.exit(0), 0);
        });
    });
}
