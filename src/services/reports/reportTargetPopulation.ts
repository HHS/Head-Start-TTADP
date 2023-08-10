import db from '../../models';
import {
  EnumInfo,
  syncGenericEnums,
  getReportGenericEnums,
  getReportGenericEnum,
} from './reportGenericEnum';

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
  nationalCenterIds: number[] | null = null,
) => syncGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  nationalCenterIds,
);

const getReportTargetPopulations = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
):Promise<object[]> => getReportGenericEnums(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  nationalCenterIds,
);

const getReportTargetPopulation = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterId: number,
):Promise<object[]> => getReportGenericEnum(
  ReportTargetPopulation,
  targetPopulationEnumInfo,
  report,
  nationalCenterId,
);

export {
  syncReportTargetPopulations,
  getReportTargetPopulations,
  getReportTargetPopulation,
};
