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
  Reason,
  ReportReason,
} = db;

const reasonEnumInfo:EnumInfo = {
  model: Reason,
  as: 'reason',
  keyName: 'Reasons',
};

const syncReportReasons = async (
  report: { id: number, type: string, regionId: number },
  reasonIds: number[] | null = null,
) => syncGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonIds,
);

const getReportReasons = async (
  report: { id: number, type: string, regionId: number },
  reasonIds: number[] | null = null,
):Promise<object[]> => getReportGenericEnums(
  ReportReason,
  reasonEnumInfo,
  report,
  reasonIds,
);

const getReportReason = async (
  report: { id: number, type: string, regionId: number },
  reasonId: number,
):Promise<object[]> => getReportGenericEnum(
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
