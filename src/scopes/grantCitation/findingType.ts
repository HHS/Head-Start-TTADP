import { Op } from 'sequelize';
import { sequelize } from '../../models';

const validFindingTypes = ['Area of Concern', 'Noncompliance', 'Deficiency'];

export function withFindingType(findingTypes: string[]) {
  const types = findingTypes.filter((type) => validFindingTypes.includes(type));

  if (!types.length) {
    return { where: { citationId: { [Op.in]: [] } } };
  }

  return {
    citationId: {
      [Op.in]: sequelize.literal(
        `(SELECT id FROM "Citations" WHERE calculated_finding_type IN (${types.map((type) => sequelize.escape(type)).join(',')}))`
      ),
    },
  };
}

export function withoutFindingType(findingTypes: string[]) {
  const types = findingTypes.filter((type) => validFindingTypes.includes(type));

  if (!types.length) {
    return { where: {} };
  }

  return {
    citationId: {
      [Op.notIn]: sequelize.literal(
        `(SELECT id FROM "Citations" WHERE calculated_finding_type IN (${types.map((type) => sequelize.escape(type)).join(',')}))`
      ),
    },
  };
}
