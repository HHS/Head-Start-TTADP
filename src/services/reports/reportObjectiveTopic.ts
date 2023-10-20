import db from '../../models';
import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';

const {
  ReportObjectiveTopic,
} = db;

const ReportObjectiveTopicEnumInfo:EnumInfo = {
  model: ReportObjectiveTopic,
  alias: 'topic',
  entityTypeFiltered: false,
};

const syncReportObjectiveTopics = async (
  entity: { id: number },
  topics: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTopic,
  topics,
);

const includeReportObjectiveTopics = (
  entity: { id: number },
) => includeGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTopic,
);

const getReportObjectiveTopics = async (
  entity: { id: number },
  topics: (number | string)[] | null = null,
) => getGenericEnums(
  {
    name: 'reportObjectiveId',
    ...entity,
  },
  ReportObjectiveTopicEnumInfo,
  topics,
);

export {
  syncReportObjectiveTopics,
  getReportObjectiveTopics,
  includeReportObjectiveTopics,
};
