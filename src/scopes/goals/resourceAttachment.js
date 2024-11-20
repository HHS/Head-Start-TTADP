import { Op } from 'sequelize';
import { filterAssociation, selectDistinctActivityReportGoalIds } from './utils';

const activityReportFilesIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Files"."originalFileName" IS NULL) OR';

  return selectDistinctActivityReportGoalIds(
    `LEFT JOIN "ActivityReports" ON "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
    LEFT JOIN "ActivityReportFiles" ON "ActivityReportFiles"."activityReportId" = "ActivityReports"."id" LEFT JOIN "Files" ON "Files"."id" = "ActivityReportFiles"."fileId"`,
    `${a} LOWER(STRING_AGG("Files"."originalFileName", CHR(10)))`,
  );
};

const activityReportObjectiveFilesIncludeExclude = (include) => {
  const a = include ? '' : 'bool_or("Files"."originalFileName" IS NULL) OR';

  return selectDistinctActivityReportGoalIds(
    `LEFT JOIN "ActivityReports" ON "ActivityReports"."id" = "ActivityReportGoals"."activityReportId"
    LEFT JOIN "ActivityReportObjectives" ON "ActivityReportObjectives"."activityReportId" = "ActivityReports"."id" LEFT JOIN "ActivityReportObjectiveFiles" ON "ActivityReportObjectiveFiles"."activityReportObjectiveId" = "ActivityReportObjectives"."id" LEFT JOIN "Files" ON "Files"."id" = "ActivityReportObjectiveFiles"."fileId"`,
    `${a} LOWER(STRING_AGG("Files"."originalFileName", CHR(10)))`,
  );
};

export function withResourceAttachment(query) {
  const search = [`%${query}%`];

  return {
    [Op.or]: [
      filterAssociation(activityReportFilesIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(activityReportObjectiveFilesIncludeExclude(true), search, false, 'LIKE'),
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
