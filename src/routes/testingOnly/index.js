import express from 'express';
import { reseedDB, queryDB, health } from './handlers';

const testingRouter = express.Router();
testingRouter.use(express.json({ limit: '2MB' }));
// must run outside of transaction wrapper as some of the action will run in a child process
testingRouter.get('/', health);
testingRouter.get('/reseed', reseedDB);
testingRouter.post('/query', queryDB);

/* eslint-disable import/prefer-default-export */
export { testingRouter };
