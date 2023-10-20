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
  ReportAudience,
} = db;

const audienceEnumInfo:EnumInfo = {
  model: ReportAudience,
  alias: 'audience',
};

// This function syncs report audiences with the provided report and audience enums.
const syncReportAudiences = async (
  // The report object containing id and type properties
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  // Optional array of audience enums or null if not provided
  audienceEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericReportEnums(
  report, // The report object to sync audiences with
  audienceEnumInfo, // The enum info object for report audiences
  audienceEnums, // The array of audience enums or null
);

// This function retrieves report audiences based on the provided report and audience ids.
const getReportAudiences = async (
  // The report object containing id and type properties
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  // Optional array of audience ids or names or null if not provided
  audiences: (number | string)[] | null = null,
) => getGenericReportEnums(
  report, // The report object to sync audiences with
  audienceEnumInfo, // The enum info object for report audiences
  audiences, // The array of audience enums or null
);

// This function includes report audience enums based on the provided report type.
const includeReportAudience = (
  // The report type to include audience enums for
  reportType?: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericReportEnums(
  {
    ...(reportType && { type: reportType }),
  },
  audienceEnumInfo,
);

export {
  audienceEnumInfo,
  syncReportAudiences,
  getReportAudiences,
  includeReportAudience,
};
