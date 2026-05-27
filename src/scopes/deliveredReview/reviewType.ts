import { Op } from 'sequelize';

const MAX_REVIEW_TYPES = 50;

function sanitizeReviewTypes(reviewTypes: string[]): string[] {
  return reviewTypes
    .map((type) => (typeof type === 'string' ? type.trim() : ''))
    .filter((type) => type.length > 0)
    .slice(0, MAX_REVIEW_TYPES);
}

export function withReviewType(reviewTypes: string[]) {
  const types = sanitizeReviewTypes(reviewTypes);

  return {
    review_type: {
      [Op.in]: types,
    },
  };
}

export function withoutReviewTypes(reviewTypes: string[]) {
  const types = sanitizeReviewTypes(reviewTypes);

  return {
    review_type: {
      [Op.notIn]: types,
    },
  };
}
