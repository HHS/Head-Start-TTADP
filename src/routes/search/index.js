import express from 'express';
import {
  createSearchIndex, addIndexDocuments, searchIndex, deleteSearchIndex, updateDocument,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(searchIndex));
router.get('/createIndex', transactionWrapper(createSearchIndex));
router.get('/addDocuments', transactionWrapper(addIndexDocuments));
router.get('/deleteIndex', transactionWrapper(deleteSearchIndex));
router.get('/updateDocument', transactionWrapper(updateDocument));
export default router;
