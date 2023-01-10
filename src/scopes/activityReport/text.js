import { Op } from 'sequelize';

export function withText(reportIds) {
  return { id: { [Op.in]: reportIds } };
}

export function withoutText(reportIds) {
  return { id: { [Op.notIn]: reportIds } };
}
