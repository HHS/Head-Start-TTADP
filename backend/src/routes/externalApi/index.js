import express from 'express';

import authMiddleware from '../../middleware/tokenMiddleware';
import activityReportRouter from './activityReports';
import { notFound } from '../../serializers/errorResponses';

const router = express.Router();

router.use(authMiddleware);

router.use('/activity-reports', activityReportRouter);

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  notFound(res, 'Route not found');
});

export default router;
