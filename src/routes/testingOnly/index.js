import express from 'express';
import { reseedDB, queryDB } from './handlers';

// eslint-disable-next-line import/prefer-default-export
const testRouter = express.Router();
testRouter.use(express.json({ limit: '2MB' }));
// must run outside of transaction wrapper as some of the action will run in a child process
testRouter.get('/reseed', reseedDB);
testRouter.post('/query', queryDB);

/* eslint-disable import/prefer-default-export */
export { testRouter };
