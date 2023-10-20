import db from '../../models';
import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

const {
  ReportParticipationParticipant,
} = db;

const ReportParticipantsEnumInfo:EnumInfo = {
  model: ReportParticipationParticipant,
  alias: 'participant',
  entityTypeFiltered: false,
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
): Promise<EnumSyncResponse> => syncGenericEnums(
  { name: 'reportParticipationId', ...entity }, // The filter object to find the report participation
  ReportParticipantsEnumInfo, // The enum info for report participation participants
  participantEnums, // The array of participant enums to be synchronized
);

/**
 * Retrieves the participants of a report participation entity.
 * @param entity - The report participation entity containing an id and type.
 * @param participants - Optional array of participant ids to filter the results.
 * @returns A promise that resolves to an array of EntityGenericEnum objects representing
 * the participants.
 */
const getReportParticipationParticipants = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participants: (number | string)[] | null = null,
  // Call the getEntityGenericEnum function with the necessary parameters
) => getGenericEnums(
  { name: 'reportParticipationId', ...entity },
  ReportParticipantsEnumInfo,
  participants,
);

/**
 * Includes the participation participants in a report based on the given report type.
 * @param type - The type of the report.
 * @returns The result of including the participation participants.
 */
const includeReportParticipationParticipants = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  { name: 'reportParticipationId', type },
  ReportParticipantsEnumInfo,
);

export {
  syncReportParticipationParticipants,
  getReportParticipationParticipants,
  includeReportParticipationParticipants,
};
