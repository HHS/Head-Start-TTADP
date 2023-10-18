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
  TargetPopulation,
  ReportTargetPopulation,
} = db;

// Define an EnumInfo object for the target population enum
const targetPopulationEnumInfo: EnumInfo = {
  model: TargetPopulation,
  as: 'targetPopulation',
  keyName: 'TargetPopulations',
};

/**
 * Synchronize report target populations with the given target population enums.
 * @param report - The report object containing id and type properties.
 * @param targetPopulationEnums - An array of target population enums or null.
 * @returns A promise that resolves to an EnumSyncResponse object.
 */
const syncReportTargetPopulations = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  targetPopulationEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationEnums,
);

/**
 * Get report target populations based on the given report and target population IDs.
 * @param report - The report object containing id and type properties.
 * @param targetPopulationIds - An array of target population IDs or null.
 * @returns A promise that resolves to an array of ReportGenericEnumType objects.
 */
const getReportTargetPopulations = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  targetPopulationIds: number[] | null = null,
): Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationIds,
);

/**
 * Include report target populations for the specified report type.
 * @param reportType - The report type.
 * @returns A function that can be used to include target populations in a report.
 */
const includeReportTargetPopulations = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  reportType,
);

export {
  syncReportTargetPopulations,
  getReportTargetPopulations,
  includeReportTargetPopulations,
};
