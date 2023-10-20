import db from '../../models';
import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';

const {
  ReportObjectiveTrainer,
} = db;

const ReportObjectiveTrainerEnumInfo:EnumInfo = {
  model: ReportObjectiveTrainer,
  alias: 'nationalCenter',
  entityTypeFiltered: false,
};

const syncReportObjectiveTrainers = async (
  entity: { id: number },
  trainers: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTrainer,
  trainers,
);

const includeReportObjectiveTrainers = (
  entity: { id: number },
) => includeGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTrainer,
);

const getReportObjectiveTrainers = async (
  entity: { id: number },
  trainers: (number | string)[] | null = null,
) => getGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTrainerEnumInfo,
  trainers,
);

export {
  syncReportObjectiveTrainers,
  getReportObjectiveTrainers,
  includeReportObjectiveTrainers,
};
