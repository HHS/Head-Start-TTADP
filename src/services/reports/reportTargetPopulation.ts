import db from '../../models';
import {
  EnumInfo,
  syncGenericEnums,
  getReportGenericEnums,
  getReportGenericEnum,
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
  report: { id: number, type: string, regionId: number },
  targetPopulationIds: number[] | null = null,
) => syncGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationIds,
);

const getReportTargetPopulations = async (
  report: { id: number, type: string, regionId: number },
  targetPopulationIds: number[] | null = null,
):Promise<object[]> => getReportGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationIds,
);

const getReportTargetPopulation = async (
  report: { id: number, type: string, regionId: number },
  targetPopulationId: number,
):Promise<object[]> => getReportGenericEnum(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  targetPopulationId,
);

const includeReportTargetPopulation = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  reportType,
);

export {
  syncReportTargetPopulations,
  getReportTargetPopulations,
  getReportTargetPopulation,
  includeReportTargetPopulation,
};
