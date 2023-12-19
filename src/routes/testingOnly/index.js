import express from 'express';
import { reseedDB, queryDB } from './handlers';
import testingOnly from '../../middleware/testingOnlyMiddleware';

const router = express.Router();
router.use(express.json({ limit: '2MB' }));
// must run outside of transaction wrapper as some of the action will run in a child process
router.get('/reseed', testingOnly, reseedDB);
router.post('/query', testingOnly, queryDB);

export default router;
