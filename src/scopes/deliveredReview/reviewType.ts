import { Op } from 'sequelize';

const validReviewTypes = [
  'FA2-CR',
  'CLASS AIAN Onsite',
  'Special',
  'AIAN CLASS Self-Observations',
  'CLASS',
  'FA-1',
  'CLASS AIAN Video',
  'CLASS-Video',
  'FA2-CSR',
  'FA1-PSR',
  'Follow-up',
  'RAN',
  'FA1-FR',
];

export function withReviewType(reviewTypes: string[]) {
  const types = reviewTypes.filter((type) => validReviewTypes.includes(type));

  return {
    review_type: {
      [Op.in]: types,
    },
  };
}

export function withoutReviewTypes(reviewTypes: string[]) {
  const types = reviewTypes.filter((type) => validReviewTypes.includes(type));

  return {
    review_type: {
      [Op.notIn]: types,
    },
  };
}
