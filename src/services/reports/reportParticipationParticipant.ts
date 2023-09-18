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
  Participant,
  ReportParticipationParticipant,
} = db;

const participantsEnumInfo:EnumInfo = {
  model: Participant,
  as: 'participants',
  keyName: 'Participants',
};

const syncReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  ReportParticipationParticipant,
  participantsEnumInfo,
  { name: 'reportParticipationId', ...entity },
  participantEnums,
);

const getReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantIds: number[] | null = null,
):Promise<EntityGenericEnum[]> => getEntityGenericEnum(
  ReportParticipationParticipant,
  participantsEnumInfo,
  { name: 'reportParticipationId', ...entity },
  participantIds,
);

const includeReportParticipationParticipants = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeEntityGenericEnums(
  ReportParticipationParticipant,
  participantsEnumInfo,
  { name: 'reportParticipationId', type },
);

export {
  syncReportParticipationParticipants,
  getReportParticipationParticipants,
  includeReportParticipationParticipants,
};
