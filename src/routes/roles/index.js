import express from 'express';
import transactionWrapper from '../transactionWrapper';
import { allRoles, allSpecialistRoles } from './handlers';

const router = express.Router();
router.get('/', transactionWrapper(allRoles));
router.get('/specialists', transactionWrapper(allSpecialistRoles));
export default router;
