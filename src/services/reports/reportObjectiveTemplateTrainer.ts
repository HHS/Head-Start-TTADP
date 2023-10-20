import db from '../../models';
import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';

const {
  ReportObjectiveTemplateTrainer,
} = db;

const ReportObjectiveTemplateTrainerEnumInfo:EnumInfo = {
  model: ReportObjectiveTemplateTrainer,
  alias: 'nationalCenter',
  entityTypeFiltered: false,
};

const syncReportObjectiveTemplateTrainers = async (
  entity: { id: number },
  trainers: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
    ...entity,
  },
  ReportObjectiveTemplateTrainer,
  trainers,
);

const includeReportObjectiveTemplateTrainers = () => includeGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
  },
  ReportObjectiveTemplateTrainer,
);

const getReportObjectiveTemplateTrainers = async (
  entity: { id: number },
  trainers: (number | string)[] | null = null,
) => getGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
    ...entity,
  },
  ReportObjectiveTemplateTrainerEnumInfo,
  trainers,
);

export {
  syncReportObjectiveTemplateTrainers,
  getReportObjectiveTemplateTrainers,
  includeReportObjectiveTemplateTrainers,
};
