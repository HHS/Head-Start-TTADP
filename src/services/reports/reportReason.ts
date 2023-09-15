import db from '../../models';
import {
  EnumInfo,
  EnumSyncResponse,
  ReportGenericEnumType,
  syncGenericEnums,
  getReportGenericEnums,
  getReportGenericEnum,
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

const syncReportReasons = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reasonEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonEnums,
);

const getReportReasons = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reasonIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonIds,
);

const getReportReason = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  reasonId: number,
):Promise<ReportGenericEnumType[]> => getReportGenericEnum(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonId,
);

const includeReportReason = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportReason,
  reasonEnumInfo,
  reportType,
);

export {
  syncReportReasons,
  getReportReasons,
  getReportReason,
  includeReportReason,
};
