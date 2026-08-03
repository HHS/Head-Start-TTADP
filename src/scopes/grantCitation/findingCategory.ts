import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withFindingCategory(categories: string[]) {
  const escaped = categories.map((c) => sequelize.escape(c));

  if (!escaped.length) {
    return { id: { [Op.in]: [] } };
  }

  return {
    citationId: {
      [Op.in]: sequelize.literal(
        `(SELECT c.id FROM "Citations" c
          JOIN "FindingCategories" fc ON fc.id = c."findingCategoryId"
          WHERE fc.name IN (${escaped.join(',')}))`
      ),
    },
  };
}

export function withoutFindingCategory(categories: string[]) {
  const escaped = categories.map((c) => sequelize.escape(c));

  if (!escaped.length) {
    return {};
  }

  return {
    citationId: {
      [Op.notIn]: sequelize.literal(
        `(SELECT c.id FROM "Citations" c
          JOIN "FindingCategories" fc ON fc.id = c."findingCategoryId"
          WHERE fc.name IN (${escaped.join(',')}))`
      ),
    },
  };
}
