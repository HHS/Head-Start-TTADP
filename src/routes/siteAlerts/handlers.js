/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import moment from 'moment';
import httpCodes from 'http-codes';
import { ALERT_STATUSES } from '../../constants';
import { SiteAlert } from '../../models';

export async function getSiteAlerts(req, res) {
  try {
    const today = moment().format('YYYY-MM-DD');
    const alert = await SiteAlert.findOne({
      attributes: ['id', 'title', 'message', 'startDate', 'endDate', 'status', 'variant', 'size'],
      where: {
        startDate: {
          [Op.lte]: today,
        },
        endDate: {
          [Op.gte]: today,
        },
        status: ALERT_STATUSES.PUBLISHED,
      },
      order: [['id', 'DESC']], // fetch the most recent alert that qualifies
      raw: true,
    });

    res.json(alert);
  } catch (err) {
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR);
  }
}
