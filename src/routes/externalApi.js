import express from 'express';

import authMiddleware from '../middleware/tokenMiddleware';
import handleErrors from '../lib/apiErrorHandler';

const router = express.Router();

router.use(authMiddleware);

router.get('/activity-reports/display/:displayId', async (req, res) => {
  try {
    const { displayId } = req.params;
    res.json({
      displayId,
    });
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'EXTERNAL-API:ACTIVITY-REPORTS' });
  }
});

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  res.status(404).json({
    status: '404',
    title: 'Not found',
    detail: 'Route not found',
  });
});

export default router;
