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
  keyName: 'Topic', // TODO: make sure this is right
};

const syncReportObjectiveTopics = async (
  entity: {},
) => {};

const includeReportObjectiveTopics = () => includeEntityGenericEnums(
  ReportObjectiveTopic,
  TopicEnumInfo,
  { name: 'reportObjectiveId' },
);

const getReportObjectiveTopics = async () => {};

export {
  syncReportObjectiveTopics,
  getReportObjectiveTopics,
  includeReportObjectiveTopics,
};
