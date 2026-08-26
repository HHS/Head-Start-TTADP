import { Op } from 'sequelize';
import { sequelize } from '../../models';

const MAX_SEARCH_TERMS = 50;

function sanitizeSearchTerms(names: string[]): string[] {
  return names
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name.length > 0)
    .slice(0, MAX_SEARCH_TERMS);
}

function grantIdSubquery(names: string[], comparator: 'ILIKE' | 'NOT ILIKE') {
  const clauses = names.map(
    (name) => `"programSpecialistName" ${comparator} ${sequelize.escape(`%${name}%`)}`
  );

  return sequelize.literal(`
    (
      SELECT id
      FROM "Grants"
      WHERE ${clauses.join(' OR ')}
    )
  `);
}

export function withProgramSpecialist(names: string[]) {
  const searchTerms = sanitizeSearchTerms(names);

  if (!searchTerms.length) {
    return { grantId: { [Op.in]: [] } };
  }

  return {
    grantId: {
      [Op.in]: grantIdSubquery(searchTerms, 'ILIKE'),
    },
  };
}

export function withoutProgramSpecialist(names: string[]) {
  const searchTerms = sanitizeSearchTerms(names);

  if (!searchTerms.length) {
    return {};
  }

  return {
    grantId: {
      [Op.notIn]: grantIdSubquery(searchTerms, 'ILIKE'),
    },
  };
}
