import { Op } from 'sequelize';
import { CREATION_METHOD } from '../../constants';
import { sequelize } from '../../models';
import { filterAssociation } from './utils';

const standard =
  'SELECT DISTINCT erp."id" FROM "EventReportPilots" erp INNER JOIN "SessionReportPilots" srp ON srp."eventId" = erp."id" INNER JOIN "SessionReportPilotGoalTemplates" srpgt ON srpgt."sessionReportPilotId" = srp."id" INNER JOIN "GoalTemplates" gt ON gt."id" = srpgt."goalTemplateId" WHERE gt.standard';

function allStandardsSelected(standards: string[]) {
  const values = standards.map((standard) => sequelize.escape(String(standard).trim())).join(',');
  return sequelize.literal(`NOT EXISTS (
    SELECT 1
    FROM "GoalTemplates"
    INNER JOIN "SessionReportPilotGoalTemplates"
      ON "SessionReportPilotGoalTemplates"."goalTemplateId" = "GoalTemplates"."id"
    WHERE "GoalTemplates"."creationMethod" = ${sequelize.escape(CREATION_METHOD.CURATED)}
      AND "GoalTemplates"."deletedAt" IS NULL
      AND "GoalTemplates"."standard" IS NOT NULL
      AND "GoalTemplates"."standard" <> ''
      AND "GoalTemplates"."standard" NOT IN (${values})
  )`);
}

export function withStandard(standards: string[]) {
  const scope = filterAssociation(standard, standards, false, '=');
  scope.where[Op.or].push(allStandardsSelected(standards));
  return scope;
}

export function withoutStandard(standards: string[]) {
  const scope = filterAssociation(standard, standards, true, '=');
  return {
    where: {
      [Op.and]: [
        ...scope.where[Op.and],
        sequelize.literal(`NOT ${allStandardsSelected(standards).val}`),
      ],
    },
  };
}
