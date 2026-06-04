import { Op } from 'sequelize';
import { sequelize } from '../../models';

const creatorQuery = (userId: number, exclude = false) => ({
  '$author.id$': {
    [exclude ? Op.ne : Op.eq]: userId,
  },
});

const OTHER_STAFF_ROLE = 'Other TTA staff';

const otherStaffQuery = (userId: number, exclude = false) =>
  sequelize.literal(`
  ${exclude ? 'NOT ' : ''}EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE("CommunicationLog"."data"->'otherStaff', '[]'::jsonb)) AS staff
    WHERE staff->>'value' = ${sequelize.escape(String(userId))}
  )
`);

const myReportsQuery = (setNames: string[], userId: number, exclude = false) => {
  const hasCreator = setNames.includes('Creator');
  const hasOtherStaff = setNames.includes(OTHER_STAFF_ROLE);

  if (!hasCreator && !hasOtherStaff) {
    return {};
  }

  const conditions = [];

  if (hasCreator) {
    conditions.push(creatorQuery(userId, exclude));
  }

  if (hasOtherStaff) {
    conditions.push(otherStaffQuery(userId, exclude));
  }

  return {
    [exclude ? Op.and : Op.or]: conditions,
  };
};

export function withMyReports(setNames: string[], _: unknown, userId: number) {
  // Split setNames by comma and trim whitespace, then flatten the resulting array
  // Needed because the frontend sends "Creator,Other TTA staff" as a single string
  const splitSetNames = setNames.flatMap((name) => name.split(',').map((n) => n.trim()));
  return myReportsQuery(splitSetNames, userId, false);
}

export function withoutMyReports(setNames: string[], _: unknown, userId: number) {
  const splitSetNames = setNames.flatMap((name) => name.split(',').map((n) => n.trim()));
  return myReportsQuery(splitSetNames, userId, true);
}
