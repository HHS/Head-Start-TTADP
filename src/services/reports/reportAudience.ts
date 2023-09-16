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
  Audience,
  ReportAudience,
} = db;

const audienceEnumInfo:EnumInfo = {
  model: Audience,
  as: 'audience',
  keyName: 'Audiences',
};

const syncReportAudiences = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  audienceEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  ReportAudience,
  audienceEnumInfo,
  report,
  audienceEnums,
);

const getReportAudiences = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  audienceIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  ReportAudience,
  audienceEnumInfo,
  report,
  audienceIds,
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
  includeReportAudience,
};
