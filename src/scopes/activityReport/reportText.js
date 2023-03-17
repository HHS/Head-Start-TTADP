import { Op } from 'sequelize';

export function withReportText(reportIds) {
  return { id: { [Op.in]: reportIds } };
}

export function withoutReportText(reportIds) {
  return { id: { [Op.notIn]: reportIds } };
}
