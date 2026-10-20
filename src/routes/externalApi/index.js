import express from 'express';

import authMiddleware from '../../middleware/tokenMiddleware';
import { notFound } from '../../serializers/errorResponses';
import activityReportRouter from './activityReports';

const router = express.Router();

router.use(authMiddleware);

router.use('/activity-reports', activityReportRouter);

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  notFound(res, 'Route not found');
});

export default router;
