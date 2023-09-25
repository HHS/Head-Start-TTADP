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

const includeReportReasons = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportReason,
  reasonEnumInfo,
  reportType,
);

export {
  syncReportReasons,
  includeReportReasons,
  getReportReasons,
};
