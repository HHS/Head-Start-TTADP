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

/**
 * Synchronizes the participants of a report participation entity.
 * @param entity - The report participation entity with id and type.
 * @param participantEnums - An optional array of participant enums.
 * @returns A promise that resolves to an EnumSyncResponse.
 */
const syncReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  ReportParticipationParticipant, // The enum type for report participation participants
  participantsEnumInfo, // The enum info for report participation participants
  { name: 'reportParticipationId', ...entity }, // The filter object to find the report participation
  participantEnums, // The array of participant enums to be synchronized
);

/**
 * Retrieves the participants of a report participation entity.
 * @param entity - The report participation entity containing an id and type.
 * @param participantIds - Optional array of participant ids to filter the results.
 * @returns A promise that resolves to an array of EntityGenericEnum objects representing
 * the participants.
 */
const getReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantIds: number[] | null = null,
  // Call the getEntityGenericEnum function with the necessary parameters
): Promise<EntityGenericEnum[]> => getEntityGenericEnum(
  ReportParticipationParticipant,
  participantsEnumInfo,
  { name: 'reportParticipationId', ...entity },
  participantIds,
);

/**
 * Includes the participation participants in a report based on the given report type.
 * @param type - The type of the report.
 * @returns The result of including the participation participants.
 */
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
