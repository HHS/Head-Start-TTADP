import { Op } from 'sequelize';
import { sequelize } from '../../models';

const STATE_CODE_PATTERN = /^[A-Z]{2}$/;

function sanitizeStateCodes(stateCodes: string[]): string[] {
  return stateCodes
    .map((stateCode) => (typeof stateCode === 'string' ? stateCode.trim().toUpperCase() : ''))
    .filter((stateCode) => STATE_CODE_PATTERN.test(stateCode));
}

export function withStateCode(stateCodes: string[]) {
  const sanitizedStateCodes = sanitizeStateCodes(stateCodes);

  if (!sanitizedStateCodes.length) {
    return;
  }

  const escapedStateCodes = sanitizedStateCodes.map((stateCode) => sequelize.escape(stateCode));

  return {
    grantId: {
      [Op.in]: sequelize.literal(`
        (
          SELECT id
          FROM "Grants"
          WHERE "stateCode" IN (${escapedStateCodes.join(', ')})
        )
      `),
    },
  };
}
