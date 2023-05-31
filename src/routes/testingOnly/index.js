import express from 'express';
import { reseedDB, queryDB } from './handlers';
import transactionWrapper from '../transactionWrapper';
import testingOnly from '../../middleware/testingOnlyMiddleware';

const router = express.Router();
// must run outside of transaction wrapper as some of the action will run in a child process
router.get('/reseed', testingOnly, reseedDB);
router.get('/query', testingOnly, transactionWrapper(queryDB));

export default router;
