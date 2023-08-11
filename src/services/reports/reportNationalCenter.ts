import db from '../../models';
import {
  EnumInfo,
  syncGenericEnums,
  getReportGenericEnums,
  getReportGenericEnum,
} from './reportGenericEnum';

const {
  NationalCenter,
  ReportNationalCenter,
} = db;

const nationalCenterEnumInfo:EnumInfo = {
  model: NationalCenter,
  as: 'nationalCenter',
  keyName: 'NationalCenters',
};

const syncReportNationalCenters = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
) => syncGenericEnums(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  report,
  nationalCenterIds,
);

const getReportNationalCenters = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
):Promise<object[]> => getReportGenericEnums(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  report,
  nationalCenterIds,
);

const getReportNationalCenter = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterId: number,
):Promise<object[]> => getReportGenericEnum(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  report,
  nationalCenterId,
);

export {
  syncReportNationalCenters,
  getReportNationalCenters,
  getReportNationalCenter,
};
