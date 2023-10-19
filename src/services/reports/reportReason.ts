import db from '../../models';
import {
  EnumInfo,
  EnumSyncResponse,
  ReportGenericEnumType,
  syncGenericEnums,
  getReportGenericEnums,
  includeGenericEnums,
} from './reportGenericEnum';
import { REPORT_TYPE } from '../../constants';

const {
  Reason,
  ReportReason,
} = db;

const reasonEnumInfo:EnumInfo = {
  model: Reason,
  as: 'reason',
  keyName: 'Reasons',
};

/**
 * Synchronizes the report reasons with the server.
 * @param report - The report object containing the id and type.
 * @param reasonEnums - An array of reason enums or null if not provided.
 * @returns A promise that resolves to an EnumSyncResponse.
 */
const syncReportReasons = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reasonEnums: { id?: number, name?: string }[] | null = null,
  // Call the syncGenericEnums function passing in the ReportReason enum,
  // reasonEnumInfo, report, and reasonEnums.
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonEnums,
);

/**
 * Retrieves the report reasons for a given report.
 * @param report - The report object containing the ID and type.
 * @param reasonIds - Optional array of reason IDs to filter the results.
 * @returns A promise that resolves to an array of report reasons.
 */
const getReportReasons = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reasonIds: number[] | null = null,
): Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonIds,
);

/**
 * Includes report reasons based on the given report type.
 * @param reportType - The report type to include reasons for.
 * @returns An array of included report reasons.
 */
const includeReportReasons = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportReason, // The enum containing all possible report reasons.
  reasonEnumInfo, // Additional information about the report reasons.
  reportType, // The specific report type to include reasons for.
);

export {
  syncReportReasons,
  includeReportReasons,
  getReportReasons,
};
