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

const targetPopulationEnumInfo:EnumInfo = {
  model: TargetPopulation,
  as: 'targetPopulation',
  keyName: 'TargetPopulations',
};

const syncReportTargetPopulations = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  targetPopulationEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationEnums,
);

const getReportTargetPopulations = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  targetPopulationIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationIds,
);

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
