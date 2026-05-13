import { Op } from 'sequelize';
import { sequelize } from '../../models';

const validFindingTypes = ['Area of Concern', 'Noncompliance', 'Deficiency'];

export function withFindingType(findingTypes: string[]) {
  const types = findingTypes.filter((type) => validFindingTypes.includes(type));

  return {
    where: {
      citationId: {
        [Op.in]: sequelize.literal(
          `SELECT id FROM citations WHERE calculated_finding_type IN (${types.map((type) => `'${type}'`).join(',')})`
        ),
      },
    },
  };
}

export function withoutFindingType(findingTypes: string[]) {
  const types = findingTypes.filter((type) => validFindingTypes.includes(type));

  return {
    where: {
      citationId: {
        [Op.notIn]: sequelize.literal(
          `SELECT id FROM citations WHERE calculated_finding_type IN (${types.join(',')})`
        ),
      },
    },
  };
}
