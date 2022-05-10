import express from 'express';
import { siteSearch } from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/site-search', transactionWrapper(siteSearch));
export default router;
