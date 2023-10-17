import express from 'express';

import {} from 'dotenv/config';
import { auditLogger } from './logger';
import db from './models';
import testingRouter from './routes/testingOnly';

let app;

db.isReady.then(() => {
  app = express();

  app.use('/testingOnly', testingRouter);

  app.listen(9999, '0.0.0.0', () => {
    auditLogger.info('TestingOnly listening on port 9999');
  });
});

export default app;

// // eslint-disable-next-line import/prefer-default-export
// export const doNothing = () => {};
