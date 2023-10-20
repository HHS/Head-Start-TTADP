import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

/**
 * Retrieves generic enums for a specific report.
 * @param report - The report object containing the report ID and type.
 * @param reportEnum - The report enum object containing the model, alias, and optional
 * entityTypeFiltered flag.
 * @param genericEnums - An optional array of generic enums.
 * @returns A promise that resolves to the generic enums for the report.
 */
const getGenericReportEnums = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reportEnum: EnumInfo,
  genericEnums: (number | string)[] | null = null,
) => getGenericEnums(
  { name: 'reportId', ...report }, // The filter object for retrieving report-specific generic enums.
  reportEnum,
  genericEnums,
);

// This function synchronizes generic enums for a specific report.
const syncGenericReportEnums = async (
  // The report object containing id and type.
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reportEnum: EnumInfo,
  genericEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  // The filter object for syncing generic enums for a specific report.
  { name: 'reportId', ...report },
  reportEnum,
  genericEnums,
);

/**
 * Includes generic report enums based on the given report and reportEnum.
 * @param report - The report object containing id and type properties.
 * @param reportEnum - The reportEnum object containing model, alias, and entityTypeFiltered
 * properties.
 * @returns The result of including generic enums based on the filter object and reportEnum.
 */
const includeGenericReportEnums = (
  report: { id?: number, type?: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reportEnum: EnumInfo,
) => includeGenericEnums(
  { name: 'reportId', ...report }, // The filter object for retrieving report-specific generic enums.
  reportEnum,
);

export {
  type EnumInfo,
  type EnumSyncResponse,
  getGenericReportEnums,
  includeGenericReportEnums,
  syncGenericReportEnums,
};
