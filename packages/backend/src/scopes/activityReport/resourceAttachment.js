import { Op } from 'sequelize';
import { filterAssociation } from './utils';

const selectDistinctActivityReports = (join, having) => `
  SELECT DISTINCT
    "ActivityReports"."id"
  FROM "ActivityReports"
  ${join}
  GROUP BY "ActivityReports"."id"
  HAVING ${having}`;

const activityReportFilesIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Files"."originalFileName" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportFiles" ON "ActivityReportFiles"."activityReportId" = "ActivityReports"."id" LEFT JOIN "Files" ON "Files"."id" = "ActivityReportFiles"."fileId"',
    `${a} LOWER(STRING_AGG("Files"."originalFileName", CHR(10)))`,
  );
};

const activityReportObjectiveFilesIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Files"."originalFileName" IS NULL) OR';

  return selectDistinctActivityReports(
    'LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id" LEFT JOIN "ActivityReportObjectiveFiles" ON "ActivityReportObjectiveFiles"."activityReportObjectiveId" = "ActivityReportObjectives"."id" LEFT JOIN "Files" ON "Files"."id" = "ActivityReportObjectiveFiles"."fileId"',
    `${a} LOWER(STRING_AGG("Files"."originalFileName", CHR(10)))`,
  );
};

export function withResourceAttachment(query) {
  const search = [`%${query}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportFilesIncludeExclude(true), search, false, 'ILIKE'),
      filterAssociation(activityReportObjectiveFilesIncludeExclude(true), search, false, 'ILIKE'),
    ],
  };
}

export function withoutResourceAttachment(query) {
  const search = [`%${query}%`];

  return {
    [Op.and]: [
      filterAssociation(activityReportFilesIncludeExclude(false), search, false, 'NOT ILIKE'),
      filterAssociation(activityReportObjectiveFilesIncludeExclude(false), search, false, 'NOT ILIKE'),
    ],
  };
}
