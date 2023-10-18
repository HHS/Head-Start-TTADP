// TODO: everything
import db from '../../models';

import {
  type EnumInfo,
  findAll,
  type EntityEnumModel,
  type EntityGenericEnum,
  type EnumSyncResponse,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
} from '../enums/generic';

const {
  ReportObjectiveTopic,
  Topic,
} = db;

const TopicEnumInfo:EnumInfo = {
  model: Topic,
  as: 'topic',
  keyName: 'Topic',
  entityTypeFiltered: false,
};

const syncReportObjectiveTopics = async (
  entity: { id: number },
  topics: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncEntityGenericEnum(
  ReportObjectiveTopic,
  TopicEnumInfo,
  {
    id: entity.id,
    name: 'reportObjectiveId',
  },
  topics,
);

const includeReportObjectiveTopics = () => includeEntityGenericEnums(
  ReportObjectiveTopic,
  TopicEnumInfo,
  {
    name: 'reportObjectiveId',
  },
);

const getReportObjectiveTopics = async (
  topicIds: number[] | null = null,
) => getEntityGenericEnum(
  ReportObjectiveTopic,
  TopicEnumInfo,
  {
    name: 'reportObjectiveId',
  },
  topicIds,
);

export {
  syncReportObjectiveTopics,
  getReportObjectiveTopics,
  includeReportObjectiveTopics,
};
