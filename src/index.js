require('newrelic');
import app from './app';
import logger from './logger';

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});

module.exports = server;
