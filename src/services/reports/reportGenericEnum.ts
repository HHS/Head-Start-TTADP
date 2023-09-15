import { Model, Op } from 'sequelize';
import { auditLogger } from '../../logger';
import {
  EnumInfo,
  findAll,
  EntityEnumModel,
  EntityGenericEnum,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';
import validFor from '../../models/validFor';

interface ReportGenericEnumType extends EntityGenericEnum {
  reportId?: number,
}

type EnumSyncResponse = {
  promises: Promise<any[]>,
  unmatched: { id?: number, name?: string }[] | null,
};

const getReportGenericEnums = async (
  reportEnumModel: EntityEnumModel,
  enumInfo: EnumInfo,
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  genericEnumIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => getEntityGenericEnum(
  reportEnumModel,
  enumInfo,
  { name: 'reportId', ...report },
  genericEnumIds,
);

const syncGenericEnums = async (
  model: EntityEnumModel,
  enumInfo: EnumInfo,
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  genericEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  model,
  enumInfo,
  { name: 'reportId', ...report },
  genericEnums,
);

const includeGenericEnums = (
  model: EntityEnumModel,
  enumInfo: EnumInfo,
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeEntityGenericEnums(
  model,
  enumInfo,
  { name: 'reportId', type: reportType },
);

export {
  type EnumInfo,
  type ReportGenericEnumType,
  type EntityEnumModel,
  type EnumSyncResponse,
  getReportGenericEnums,
  syncGenericEnums,
  includeGenericEnums,
};
