import { Op } from 'sequelize';
import { sequelize } from '../../models';

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
  // convert all to numbers and filter out any regions that aren't numerical
  const validRegions = regions.map(Number).filter((region) => !Number.isNaN(region));

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
  // convert all to numbers and filter out any regions that aren't numerical
  const validRegions = regions.map(Number).filter((region) => !Number.isNaN(region));

  if (!validRegions.length) {
    return {};
  }

  return {
    id: {
      [Op.notIn]: sequelize.literal(literal(validRegions)),
    },
  };
}
