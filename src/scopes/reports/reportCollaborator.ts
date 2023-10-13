import { Op } from 'sequelize';
import { filterAssociation } from '../helpers/utils';

const collaboratorUsersByTypeSql = (
  collaboratorType: string | number,
) => ((typeof collaboratorType === 'number')
  ? `SELECT
    rc."reportId"
  FROM "ReportCollaborators" rc
  INNER JOIN "ReportCollaboratorTypes" rct
  ON rc.id = rct."reportCollaboratorId"
  WHERE rct."collaboratorTypeId" = ${collaboratorType}
  AND rc."userId"`
  : `SELECT
    rc."reportId"
  FROM "ReportCollaborators" rc
  INNER JOIN "ReportCollaboratorTypes" rct
  ON rc.id = rct."reportCollaboratorId"
  INNER JOIN "CollaboratorTypes" ct
  ON rct."collaboratorTypeId" = ct.id
  WHERE ct."name" = '${collaboratorType}'
  AND rc."userId"`);

const collaboratorUsersByTypeFilter = (
  includes: boolean,
  collaboratorType: string | number,
  userIds: number[],
) => ({
  [Op.and]: [
    filterAssociation(
      collaboratorUsersByTypeSql(collaboratorType),
      userIds,
      !includes,
    ),
  ],
});

const filterCollaboratorUsersByType = (collaboratorType) => ({
  ctn: (query) => collaboratorUsersByTypeFilter(true, collaboratorType, query),
  nctn: (query) => collaboratorUsersByTypeFilter(false, collaboratorType, query),
});

export {
  collaboratorUsersByTypeSql,
  collaboratorUsersByTypeFilter,
  filterCollaboratorUsersByType,
};
