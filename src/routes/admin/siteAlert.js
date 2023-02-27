import express from 'express';
import httpCodes from 'http-codes';
import { SiteAlert } from '../../models';
import transactionWrapper from '../transactionWrapper';
import { checkAlertIdParam } from '../../middleware/checkIdParamMiddleware';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import { auditLogger } from '../../logger';

const namespace = 'SERVICE:ADMIN:SITEALERTS';

const ALERT_FIELDS = [
  'status',
  'message',
  'title',
  'endDate',
  'startDate',
  'variant',
];

/**
 *
 * @param {Request} req
 */
const isValidNewAlert = (req) => {
  const { body } = req;
  return ALERT_FIELDS.every((field) => !!(body[field]));
};

// since all the functions below are admin only and region agnostic, we can check them all via
// the admin middleware

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
async function getAlerts(req, res) {
  try {
    const alerts = await SiteAlert.findAll({
      order: [['startDate', 'DESC']],
    });
    res.json(alerts);
  } catch (err) {
    auditLogger.error(`${namespace}:getAlerts`, err);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
async function getAlert(req, res) {
  try {
    const { alertId } = req.params;
    const alert = await SiteAlert.findByPk(alertId);
    res.json(alert);
  } catch (err) {
    auditLogger.error(`${namespace}:getAlert`, err);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
async function deleteAlert(req, res) {
  try {
    const { alertId } = req.params;
    const alert = await SiteAlert.findOne({
      where: {
        id: alertId,
      },
    });
    if (!alert) {
      res.sendStatus(httpCodes.NOT_FOUND);
    } else {
      await alert.destroy();
      res.sendStatus(httpCodes.NO_CONTENT);
    }
  } catch (err) {
    auditLogger.error(`${namespace}:deleteAlert`, err);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
async function createAlert(req, res) {
  try {
    const isValid = isValidNewAlert(req);

    if (!isValid) {
      res.sendStatus(httpCodes.BAD_REQUEST);
    } else {
      const {
        status,
        message,
        title,
        endDate,
        startDate,
        variant,
      } = req.body;

      const alert = await SiteAlert.create({
        status,
        message,
        title,
        userId: req.session.userId,
        endDate,
        startDate,
        variant,
      });

      res.json(alert);
    }
  } catch (err) {
    auditLogger.error(`${namespace}:createAlert`, err);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 * @param {Request} req
 * @param {Response}
 */
async function saveAlert(req, res) {
  try {
    const { alertId } = req.params;

    const existingAlert = await SiteAlert.findByPk(alertId);
    if (!existingAlert) {
      res.sendStatus(httpCodes.NOT_FOUND);
    } else {
      const alert = await existingAlert.update({
        ...existingAlert,
        ...req.body,
      });

      res.json(alert);
    }
  } catch (err) {
    auditLogger.error(`${namespace}:saveAlert`, err);
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}

const router = express.Router();

router.get('/', userAdminAccessMiddleware, transactionWrapper(getAlerts));
router.get('/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(getAlert));
router.post('/', userAdminAccessMiddleware, transactionWrapper(createAlert));
router.put('/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(saveAlert));
router.delete('/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(deleteAlert));

export {
  getAlerts,
  getAlert,
  deleteAlert,
  createAlert,
  saveAlert,
};

export default router;
