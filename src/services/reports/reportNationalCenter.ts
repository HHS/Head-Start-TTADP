import db from '../../models';
import {
  syncGenericEnums,
  getGenericEnums,
  getGenericEnum,
} from './reportGenericEnum';
import { auditLoger } from '../../logger';

const {
  NationalCenter,
  ReportNationalCenter,
} = db;

const syncNationalCenters = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
) => syncGenericEnums(
  ReportNationalCenter,
  { model: NationalCenter, as: 'nationalCenter' },
  report,
  nationalCenterIds,
);

const getNationalCenters = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterIds: number[] | null = null,
):Promise<object[]> => getGenericEnums(
  ReportNationalCenter,
  { model: NationalCenter, as: 'nationalCenter' },
  report,
  nationalCenterIds,
);

const getNationalCenter = async (
  report: { id: number, type: string, regionId: number },
  nationalCenterId: number,
):Promise<object[]> => getGenericEnum(
  ReportNationalCenter,
  { model: NationalCenter, as: 'nationalCenter' },
  report,
  nationalCenterId,
);

export {
  syncNationalCenters,
  getNationalCenters,
  getNationalCenter,
};
