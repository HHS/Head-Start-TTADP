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
  NationalCenter,
  ReportNationalCenter,
} = db;

const nationalCenterEnumInfo:EnumInfo = {
  model: NationalCenter,
  as: 'nationalCenter',
  keyName: 'NationalCenters',
};

const syncReportNationalCenters = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  nationalCenterEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  report,
  nationalCenterEnums,
);

const getReportNationalCenters = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  nationalCenterIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  report,
  nationalCenterIds,
);

const includeReportNationalCenters = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportNationalCenter,
  nationalCenterEnumInfo,
  reportType,
);

export {
  syncReportNationalCenters,
  getReportNationalCenters,
  includeReportNationalCenters,
};
