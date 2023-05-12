import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const activityReportFilesPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Files"."originalFileName"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportFiles"
  ON "ActivityReportFiles"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "Files"
  ON "Files"."id" = "ActivityReportFiles"."fileId"
  WHERE "Files"."originalFileName"${a}`;
};

const activityReportObjectiveFilesPosNeg = (pos = true) => {
  const a = pos ? '' : ' IS NULL OR "Files"."originalFileName"';

  return `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  LEFT JOIN "ActivityReportObjectives"
  ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id"
  LEFT JOIN "ActivityReportObjectiveFiles"
  ON "ActivityReportObjectiveFiles"."activityReportObjectiveId" = "ActivityReportObjectives"."id"
  LEFT JOIN "Files"
  ON "Files"."id" = "ActivityReportObjectiveFiles"."fileId"
  WHERE "Files"."originalFileName"${a}`;
};

export function withResourceAttachment(query) {
  const search = [`%${query}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportFilesPosNeg(true), search, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveFilesPosNeg(true), search, false, 'ILIKE'),
    ],
  };
}

export function withoutResourceAttachment(query) {
  const search = [`%${query}%`];

  return {
    [Op.and]: [
      filterAssociation(activityReportFilesPosNeg(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveFilesPosNeg(false), search, false, 'NOT ILIKE'),
    ],
  };
}
