import db from '../../models';
import {
  type EnumInfo,
  type EntityEnumModel,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

const {
  ReportCollaboratorType,
} = db;

const reportCollaboratorTypesEnumInfo:EnumInfo = {
  model: ReportCollaboratorType,
  alias: 'collaboratorType',
  entityTypeFiltered: true,
};

// TODO: confirm the sync working correctly for this use case
const syncReportCollaboratorTypes = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  collabortorTypes: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  { name: 'reportParticipationId', ...entity },
  reportCollaboratorTypesEnumInfo,
  collabortorTypes,
);

const getReportCollaboratorTypes = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  collaboratorTypes: (number | string)[] | null = null,
) => getGenericEnums(
  { name: 'reportCollaboratorId', ...entity },
  reportCollaboratorTypesEnumInfo,
  collaboratorTypes,
);

const includeReportCollaboratorTypes = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  { name: 'reportCollaboratorId', type },
  reportCollaboratorTypesEnumInfo,
);

export {
  syncReportCollaboratorTypes,
  getReportCollaboratorTypes,
  includeReportCollaboratorTypes,
};
