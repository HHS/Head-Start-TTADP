import db from '../../models';
import {
  type EnumInfo,
  type EntityGenericEnum,
  type EnumSyncResponse,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
} from '../enums/generic';

const {
  ReportCollaboratorRoles,
  Role,
} = db;

const rolesEnumInfo:EnumInfo = {
  model: Role,
  as: 'roles',
  keyName: 'roles',
};

const syncReportCollaboratorRoles = async (
  entity: {},
) => {};

const includeReportCollaboratorRoles = () => includeEntityGenericEnums(
  ReportCollaboratorRoles,
  rolesEnumInfo,
  { name: 'reportParticipationId', type },
);

const getReportCollaboratorRoles = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantIds: number[] | null = null,
):Promise<EntityGenericEnum[]> => getEntityGenericEnum(
  ReportCollaboratorRoles,
  rolesEnumInfo,
  { name: 'reportCollaboratorRoleId', ...entity },
  participantIds,
);

export {
  syncReportCollaboratorRoles,
  getReportCollaboratorRoles,
  includeReportCollaboratorRoles,
};
