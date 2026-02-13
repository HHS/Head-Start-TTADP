import express from 'express'
import transactionWrapper from '../transactionWrapper'
import authMiddleware from '../../middleware/authMiddleware'
import { checkGroupIdParam } from '../../middleware/checkIdParamMiddleware'
import { getGroups, createGroup, getGroup, updateGroup, deleteGroup, getEligibleRecipientGrantsForGroup, getEligibleUsersForGroup } from './handlers'

const router = express.Router()
router.get('/', authMiddleware, transactionWrapper(getGroups))
router.post('/', authMiddleware, transactionWrapper(createGroup))

router.get('/:groupId', authMiddleware, checkGroupIdParam, transactionWrapper(getGroup))
router.put('/:groupId', authMiddleware, checkGroupIdParam, transactionWrapper(updateGroup))
router.delete('/:groupId', authMiddleware, checkGroupIdParam, transactionWrapper(deleteGroup))

router.get('/:groupId/grants', authMiddleware, checkGroupIdParam, transactionWrapper(getEligibleRecipientGrantsForGroup))
router.get('/:groupId/eligibleUsers', authMiddleware, checkGroupIdParam, transactionWrapper(getEligibleUsersForGroup))

export default router
