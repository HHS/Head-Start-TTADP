import { Op } from 'sequelize';

// TODO: Hmmmmm
export function withReportText(reportIds) {
  return { id: { [Op.in]: reportIds } };
}

export function withoutReportText(reportIds) {
  return { id: { [Op.notIn]: reportIds } };
}
