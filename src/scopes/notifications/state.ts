import { Op } from 'sequelize';

export function stateFilter(field: 'viewedAt' | 'archivedAt', query: string[]) {
  if (query.length !== 1 || !['true', 'false'].includes(query[0])) {
    throw new Error('Notification state filters require one true or false value');
  }
  return { [`$userStates.${field}$`]: query[0] === 'true' ? { [Op.ne]: null } : null };
}
