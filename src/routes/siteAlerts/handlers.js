/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import httpCodes from 'http-codes';
import { ALERT_STATUSES } from '../../constants';
import { SiteAlert } from '../../models';

export async function getSiteAlerts(req, res) {
  try {
    const alert = await SiteAlert.findOne({
      where: {
        startDate: {
          [Op.gte]: new Date(),
        },
        endDate: {
          [Op.lte]: new Date(),
        },
        status: ALERT_STATUSES.PUBLISHED,
      },
      order: [['id', 'DESC']], // fetch the most recent alert that qualifies
    });

    res.json(alert);
  } catch (err) {
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}
