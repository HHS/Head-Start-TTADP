import { Op } from 'sequelize';

function splitPurposes(purposes: string[]): string[] {
  return purposes.flatMap((purpose) => purpose.split(',').map((p) => p.trim()));
}

export function withPurpose(purposes: string[]) {
  const splitPurposesList = splitPurposes(purposes);
  return {
    data: {
      purpose: {
        [Op.in]: splitPurposesList,
      },
    },
  };
}

export function withoutPurpose(purposes: string[]) {
  const splitPurposesList = splitPurposes(purposes);
  return {
    data: {
      purpose: {
        [Op.notIn]: splitPurposesList,
      },
    },
  };
}
