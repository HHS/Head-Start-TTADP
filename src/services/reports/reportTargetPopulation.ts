import db from '../../models';
import {
  EnumInfo,
  EnumSyncResponse,
  getGenericReportEnums,
  includeGenericReportEnums,
  syncGenericReportEnums,
} from './reportGenericEnum';
import { REPORT_TYPE } from '../../constants';

const {
  ReportTargetPopulation,
} = db;

// Define an EnumInfo object for the target population enum
const targetPopulationEnumInfo: EnumInfo = {
  model: ReportTargetPopulation,
  alias: 'targetPopulation',
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
): Promise<EnumSyncResponse> => syncGenericReportEnums(
  report,
  targetPopulationEnumInfo,
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
  targetPopulations: (number | string)[] | null = null,
) => getGenericReportEnums(
  report,
  targetPopulationEnumInfo,
  targetPopulations,
);

/**
 * Include report target populations for the specified report type.
 * @param reportType - The report type.
 * @returns A function that can be used to include target populations in a report.
 */
const includeReportTargetPopulations = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericReportEnums(
  {
    ...(reportType && { type: reportType }),
  },
  targetPopulationEnumInfo,
);

export {
  syncReportTargetPopulations,
  getReportTargetPopulations,
  includeReportTargetPopulations,
};
