import { Op } from 'sequelize';
import { sequelize } from '../../models';

const acceptedOtherEntities = [
  'CCDF / Child Care Administrator',
  'Head Start Collaboration Office',
  'QRIS System',
  'Regional Head Start Association',
  'Regional TTA / Other Specialists',
  'State CCR&R',
  'State Early Learning Standards',
  'State Education System',
  'State Head Start Association',
  'State Health System',
  'State Professional Development / Continuing Education',
];

function otherEntityReportIdQUery(otherEntitiesIn) {
  return `SELECT a."id" FROM  "ActivityReports" a INNER JOIN "ActivityRecipients" ar ON a.id = ar."activityReportId" INNER JOIN "OtherEntities" o ON ar."otherEntityId" = o.id WHERE o."name" IN (${otherEntitiesIn})`;
}

function generateWhere(escapedSearchTerms, exclude) {
  const userSubQuery = otherEntityReportIdQUery(escapedSearchTerms);

  if (exclude) {
    return {
      [Op.and]: [
        sequelize.literal(`("ActivityReport"."id" NOT IN (${userSubQuery}))`),
      ],
    };
  }

  return {
    [Op.or]: [
      sequelize.literal(`("ActivityReport"."id" IN (${userSubQuery}))`),
    ],
  };
}

function validateOtherEntity(otherEntityType) {
  if (!acceptedOtherEntities.includes(otherEntityType)) {
    return '';
  }
  return `'${otherEntityType}'`;
}

export function withOtherEntities(otherEntities) {
  // Removes empty strings.
  const otherEntitiesIn = otherEntities.map(
    (oe) => validateOtherEntity(oe),
  ).filter((oe) => oe).join(', ');

  // Empty array shan't not pass!
  if (otherEntitiesIn.length === 0) {
    return {};
  }

  return generateWhere(otherEntitiesIn, false);
}

export function withoutOtherEntities(otherEntities) {
  // filter removes empty strings
  const otherEntitiesIn = otherEntities.map(
    (oe) => validateOtherEntity(oe),
  ).filter((oe) => oe).join(', ');

  // Empty array shan't not pass!
  if (otherEntitiesIn.length === 0) {
    return {};
  }

  return generateWhere(otherEntitiesIn, true);
}
