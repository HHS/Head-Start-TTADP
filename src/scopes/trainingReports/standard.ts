import { filterAssociation } from './utils'

const standard =
  'SELECT DISTINCT erp."id" FROM "EventReportPilots" erp INNER JOIN "SessionReportPilots" srp ON srp."eventId" = erp."id" INNER JOIN "SessionReportPilotGoalTemplates" srpgt ON srpgt."sessionReportPilotId" = srp."id" INNER JOIN "GoalTemplates" gt ON gt."id" = srpgt."goalTemplateId" WHERE gt.standard'

export function withStandard(standards: string[]) {
  return filterAssociation(standard, standards, false, '=')
}

export function withoutStandard(standards: string[]) {
  return filterAssociation(standard, standards, true, '=')
}
