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

const syncReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  ReportCollaboratorType,
  collaboratorTypesEnumInfo,
  { name: 'reportParticipationId', ...entity },
  participantEnums,
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
  syncReportParticipationParticipants,
  getReportCollaboratorTypes,
  includeReportCollaboratorTypes,
};
