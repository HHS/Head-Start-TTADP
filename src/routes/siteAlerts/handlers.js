/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { format } from 'date-fns';
import httpCodes from 'http-codes';
import { ALERT_STATUSES } from '@ttahub/common';
import { SiteAlert } from '../../models';

export async function getSiteAlerts(req, res) {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
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
