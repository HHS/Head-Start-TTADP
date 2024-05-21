import {
  IActivityReportObjectivesModelInstance,
  IFileModelInstance,
  IResourceModelInstance,
  ITopicModelInstance,
} from './types';

export default function extractObjectiveAssociationsFromActivityReportObjectives(
  activityReportObjectives: IActivityReportObjectivesModelInstance[],
  associationName: 'topics' | 'resources' | 'files' | 'courses',
) {
  return activityReportObjectives.map((aro) => aro[associationName].map((
    a: ITopicModelInstance | IResourceModelInstance | IFileModelInstance,
  ) => a.toJSON())).flat();
}
