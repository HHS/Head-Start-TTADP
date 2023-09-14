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
  Audience,
  ReportAudience,
} = db;

const audienceEnumInfo:EnumInfo = {
  model: Audience,
  as: 'audience',
  keyName: 'Audiences',
};

const syncReportAudiences = async (
  report: { id: number, type: string, regionId: number },
  audienceEnums: { id?: number, name?: string }[] | null = null,
) => syncGenericEnums(
  ReportAudience,
  audienceEnumInfo,
  report,
  audienceEnums,
);

const getReportAudiences = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
):Promise<object[]> => getReportGenericEnums(
  ReportAudience,
  audienceEnumInfo,
  report,
  nationalCenterIds,
);

const getReportAudience = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterId: number,
):Promise<object[]> => getReportGenericEnum(
  ReportAudience,
  audienceEnumInfo,
  report,
  nationalCenterId,
);

const includeReportAudience = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  ReportAudience,
  audienceEnumInfo,
  reportType,
);

export {
  syncReportAudiences,
  getReportAudiences,
  getReportAudience,
  includeReportAudience,
};
