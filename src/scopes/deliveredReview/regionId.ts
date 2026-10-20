import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { validatedIdArray } from '../utils';

// WARNING - DO NOT interpolate unvalidated input into this SQL literal.
// Only validated positive integers are allowed.
const literal = (regions: number[]) => {
  return `(
        SELECT drc."deliveredReviewId" FROM "DeliveredReviewCitations" drc 
            INNER JOIN "Citations" c ON drc."citationId" = c.id 
            INNER JOIN "GrantDeliveredReviews" gdr ON gdr."deliveredReviewId" = drc."deliveredReviewId"
            INNER JOIN "GrantCitations" gc ON gc."citationId" = c.id AND gc."grantId" = gdr."grantId"
            WHERE gc."region_id" IN (${regions.join(',')})
    )`;
};

export function withRegionId(regions: string[]) {
  const validRegions = validatedIdArray(regions).filter((id) => id > 0);

  if (!validRegions.length) {
    return {};
  }

  return {
    id: {
      [Op.in]: sequelize.literal(literal(validRegions)),
    },
  };
}

export function withoutRegionId(regions: string[]) {
  const validRegions = validatedIdArray(regions).filter((id) => id > 0);

  if (!validRegions.length) {
    return {};
  }

  return {
    id: {
      [Op.notIn]: sequelize.literal(literal(validRegions)),
    },
  };
}
