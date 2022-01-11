require('newrelic');

/* eslint-disable import/first */
import app from './app';
import { auditLogger } from './logger';
/* eslint-enable import/first */

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

export default server;
