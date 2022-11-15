import express from 'express';
import {
  allRoles,
  allSpecialistRoles,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allRoles));
router.get('/specialists', transactionWrapper(allSpecialistRoles));
export default router;
