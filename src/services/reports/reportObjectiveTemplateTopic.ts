import db from '../../models';
import {
  type EnumInfo,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';

const {
  ReportObjectiveTemplateTopic,
} = db;

const ReportObjectiveTemplateTopicEnumInfo:EnumInfo = {
  model: ReportObjectiveTemplateTopic,
  alias: 'topic',
  entityTypeFiltered: false,
};

const syncReportObjectiveTemplateTopics = async (
  entity: { id: number },
  topics: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => syncGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
    ...entity,
  },
  ReportObjectiveTemplateTopic,
  topics,
);

const includeReportObjectiveTemplateTopics = (
  entity: { id: number },
) => includeGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
    ...entity,
  },
  ReportObjectiveTemplateTopic,
);

const getReportObjectiveTemplateTopics = async (
  entity: { id: number },
  topics: (number | string)[] | null = null,
) => getGenericEnums(
  {
    name: 'reportObjectiveTemplateId',
    ...entity,
  },
  ReportObjectiveTemplateTopicEnumInfo,
  topics,
);

export {
  syncReportObjectiveTemplateTopics,
  getReportObjectiveTemplateTopics,
  includeReportObjectiveTemplateTopics,
};
