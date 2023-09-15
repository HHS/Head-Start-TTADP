import express from 'express';

import {} from 'dotenv/config';
import { auditLogger } from './logger';
import testingRouter from './routes/testingOnly';

const app = express();

app.use('/testingOnly', testingRouter);

app.listen(9999, '0.0.0.0', () => {
  auditLogger.info('TestingOnly listening on port 9999');
});

export default app;

// // eslint-disable-next-line import/prefer-default-export
// export const doNothing = () => {};
