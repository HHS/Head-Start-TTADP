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
  ReportNationalCenter,
} = db;

const nationalCenterEnumInfo:EnumInfo = {
  model: ReportNationalCenter,
  alias: 'nationalCenter',
};

const syncReportNationalCenters = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  nationalCenterEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericReportEnums(
  report,
  nationalCenterEnumInfo,
  nationalCenterEnums,
);

const getReportNationalCenters = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  nationalCenterIds: (number | string)[] | null = null,
) => getGenericReportEnums(
  report,
  nationalCenterEnumInfo,
  nationalCenterIds,
);

const includeReportNationalCenters = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericReportEnums(
  {
    ...(reportType && { type: reportType }),
  },
  nationalCenterEnumInfo,
);

export {
  syncReportNationalCenters,
  getReportNationalCenters,
  includeReportNationalCenters,
};
