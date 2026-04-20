import { Op } from 'sequelize';
import { withinDateRange, compareDate } from '../utils';

export function beforeReportDeliveryDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'report_delivery_date', Op.lte),
    },
  };
}

export function afterReportDeliveryDate(date) {
  return {
    [Op.and]: {
      [Op.or]: compareDate(date, 'report_delivery_date', Op.gte),
    },
  };
}

export function withinReportDeliveryDates(dates) {
  return {
    [Op.and]: {
      [Op.or]: withinDateRange(dates, 'report_delivery_date'),
    },
  };
}
