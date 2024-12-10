import {
  IActivityReportObjectivesModelInstance,
  IFileModelInstance,
  IResourceModelInstance,
  ITopicModelInstance,
  ICourseModelInstance,
  ICitationModelInstance,
} from './types';

/**
 *
 * @param activityReportObjectives an array ARO model instances
 * @param associationName string, one of the following: 'topics' | 'resources' | 'files' | 'courses'
 * @returns an array of associations extracted from the AROs
 */
export default function extractObjectiveAssociationsFromActivityReportObjectives(
  activityReportObjectives: IActivityReportObjectivesModelInstance[],
  associationName: 'topics' | 'resources' | 'files' | 'courses' | 'activityReportObjectiveCitations',
) {
  return activityReportObjectives.map((aro) => aro[associationName].map((
    a: ITopicModelInstance |
    IResourceModelInstance |
    IFileModelInstance |
    ICourseModelInstance |
    ICitationModelInstance,
  ) => a.toJSON())).flat();
}
