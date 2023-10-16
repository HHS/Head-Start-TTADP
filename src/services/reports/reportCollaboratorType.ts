import db from '../../models';
import {
  type EnumInfo,
  type EntityGenericEnum,
  type EnumSyncResponse,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

const {
  CollaboratorType,
  ReportCollaboratorType,
} = db;

const collaboratorTypesEnumInfo:EnumInfo = {
  model: CollaboratorType,
  as: 'collaboratorTypes',
  keyName: 'CollaboratorTypes',
};

// TODO: confirm the sync working correctly for this use case
const syncReportCollaboratorTypes = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  collabortorTypes: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  ReportCollaboratorType,
  collaboratorTypesEnumInfo,
  { name: 'reportParticipationId', ...entity },
  collabortorTypes,
);

const getReportCollaboratorTypes = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantIds: number[] | null = null,
):Promise<EntityGenericEnum[]> => getEntityGenericEnum(
  ReportCollaboratorType,
  collaboratorTypesEnumInfo,
  { name: 'reportCollaboratorId', ...entity },
  participantIds,
);

const includeReportCollaboratorTypes = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeEntityGenericEnums(
  ReportCollaboratorType,
  collaboratorTypesEnumInfo,
  { name: 'reportCollaboratorId', type },
);

export {
  syncReportCollaboratorTypes,
  getReportCollaboratorTypes,
  includeReportCollaboratorTypes,
};
