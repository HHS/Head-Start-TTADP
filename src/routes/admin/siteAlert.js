import express from 'express';
import httpCodes from 'http-codes';
import { Op } from 'sequelize';
import { SiteAlert } from '../../models';
import transactionWrapper from '../transactionWrapper';
import { checkAlertIdParam } from '../../middleware/checkIdParamMiddleware';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import { ALERT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';

const namespace = 'SERVICE:ADMIN:SITEALERTS';

const ALERT_FIELDS = [
  'status',
  'message',
  'title',
  'userId',
  'endDate',
  'startDate',
];

/**
 *
 * @param {Request} req
 */
const isValidAlert = (req) => {
  const { body } = req;

  const isValid = ALERT_FIELDS.every((field) => body[field]);

  return isValid;
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
    const alerts = await SiteAlert.findAll();
    res.json(alerts);
  } catch (err) {
    auditLogger.error(`${namespace}:getAlerts`, err);
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
        status: {
          [Op.notIn]: [
            ALERT_STATUSES.DELETED,
            ALERT_STATUSES.PUBLISHED,
          ],
        },
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
  }
}

/**
 *
 * @param {Request} req
 * @param {Response} res
 */
async function createAlert(req, res) {
  try {
    const isValid = isValidAlert(req);

    if (!isValid) {
      res.sendStatus(httpCodes.BAD_REQUEST);
    } else {
      const {
        status,
        message,
        title,
        userId,
        endDate,
        startDate,
      } = req.body;

      const alert = await SiteAlert.create({
        status,
        message,
        title,
        userId,
        endDate,
        startDate,
      });

      res.json(alert);
    }
  } catch (err) {
    auditLogger.error(`${namespace}:createAlert`, err);
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
  }
}

const router = express.Router();

router.get('/alerts', userAdminAccessMiddleware, transactionWrapper(getAlerts));
router.get('/alert/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(getAlert));
router.post('/alert', userAdminAccessMiddleware, transactionWrapper(createAlert));
router.patch('/alert/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(saveAlert));
router.delete('/alert/:alertId', checkAlertIdParam, userAdminAccessMiddleware, transactionWrapper(deleteAlert));

export {
  getAlerts,
  getAlert,
  deleteAlert,
  createAlert,
  saveAlert,
};

export default router;
