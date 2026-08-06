import { Op } from 'sequelize';
import db from '../../models';

const { FindingCategory } = db;

async function resolveValidCategoryIds(names: string[]): Promise<number[]> {
  if (!names.length) return [];
  const rows = await FindingCategory.findAll({
    where: { name: { [Op.in]: names } },
    attributes: ['id'],
    raw: true,
  });
  return rows.map((r: { id: number }) => r.id);
}

export async function withFindingCategory(categories: string[]) {
  if (!categories.length) {
    return { id: { [Op.in]: [] } };
  }

  const ids = await resolveValidCategoryIds(categories);

  if (!ids.length) {
    return {};
  }

  return {
    citationId: {
      [Op.in]: db.sequelize.literal(
        `(SELECT id FROM "Citations" WHERE "findingCategoryId" IN (${ids.join(',')}))`
      ),
    },
  };
}

export async function withoutFindingCategory(categories: string[]) {
  if (!categories.length) {
    return {};
  }

  const ids = await resolveValidCategoryIds(categories);

  if (!ids.length) {
    return {};
  }

  return {
    citationId: {
      [Op.notIn]: db.sequelize.literal(
        `(SELECT id FROM "Citations" WHERE "findingCategoryId" IN (${ids.join(',')}))`
      ),
    },
  };
}
