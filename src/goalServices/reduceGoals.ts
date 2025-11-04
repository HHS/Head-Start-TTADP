import { uniq, uniqBy } from 'lodash';
import moment from 'moment';
import { auditLogger } from '../logger';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import {
  IGoalModelInstance,
  IGoal,
  IObjectiveModelInstance,
  IFile,
  ITopic,
  IResource,
  ICourse,
  IReducedGoal,
  IReducedObjective,
  IPrompt,
  IReviewPrompt,
} from './types';

// this is the reducer called when not getting objectives for a report, IE, the RTR table
export function reduceObjectives(
  newObjectives: IObjectiveModelInstance[],
  currentObjectives: IReducedObjective[],
) {
  // objectives = accumulator
  // we pass in the existing objectives as the accumulator
  const objectivesToSort = newObjectives.reduce((
    objectives: IReducedObjective[],
    objective,
  ) => {
    const exists = objectives.find((o) => (
      o.title.trim() === objective.title.trim() && o.status === objective.status
    )) as IReducedObjective | undefined;

    const {
      id,
      otherEntityId,
      title,
      status,
      topics,
      resources,
      files,
      courses,
    } = objective;

    if (exists) {
      exists.ids = [...exists.ids, id];
      // Make sure we pass back a list of recipient ids for subsequent saves.
      exists.recipientIds = otherEntityId
        ? [...exists.recipientIds, otherEntityId]
        : [...exists.recipientIds];
      exists.activityReports = [
        ...(exists.activityReports || []),
        ...(objective.activityReports || []),
      ];
      return objectives;
    }

    const newObjective = {
      id,
      otherEntityId,
      title,
      status,
      topics,
      resources,
      files,
      courses,
      value: id,
      ids: [id],
      goalId: objective.goalId,
      onApprovedAR: objective.onApprovedAR,
      onAR: objective.onAR,
      rtrOrder: objective.rtrOrder,
      // Make sure we pass back a list of recipient ids for subsequent saves.
      recipientIds: otherEntityId
        ? [otherEntityId]
        : [],
      isNew: false,
    } as IReducedObjective;

    return [
      ...objectives,
      newObjective,
    ];
  }, currentObjectives || []);

  objectivesToSort.sort((o1, o2) => {
    if (o1.rtrOrder < o2.rtrOrder) {
      return -1;
    }
    return 1;
  });

  return objectivesToSort;
}

/**
   * Reduces the relation through activity report objectives.
   *
   * This function extracts and deduplicates related entities (e.g., topics, resources, courses)
   * from an `IObjectiveModelInstance` by traversing through its `activityReportObjectives`
   * associations.
   * It ensures that both existing and newly found relations are merged while removing duplicates.
   *
   * @param {IObjectiveModelInstance} objective - The objective containing activity report
   *                                              objectives.
   * @param {string} join - The table name that joins the activity report objectives with the
   *                        relation.
   *                        Example: 'activityReportObjectiveResources'.
   * @param {string} relation - The specific relation to extract. Example: 'resource'.
   * @param {Object} [exists={}] - The existing relations object.
   * @param {string} [uniqueBy='id'] - The key used to ensure uniqueness in the final result.
   * @returns {Array} - A deduplicated array of related entities.
   */
type IAcceptableModelParameter = ITopic | IResource | ICourse;
export const reduceRelationThroughActivityReportObjectives = (
  objective: IObjectiveModelInstance,
  join: string,
  relation: string,
  exists = {},
  uniqueBy = 'id',
) => {
  // Retrieve existing relation array (defaults to empty array)
  const existingRelation = exists[`${relation}s`] || [];

  // Extract new relations from the first activity report objective, if available.
  // Ensures the expected association (join) exists before mapping.
  const newRelations = objective.activityReportObjectives?.[0]?.[join]
    ? objective.activityReportObjectives[0][join]
      .map((t: IAcceptableModelParameter) => t[relation]?.dataValues) // Gets dataValues if exist
      .filter((t: IAcceptableModelParameter) => t) // Removes null/undefined values
    : [];

  // Combine existing and new relations ensuring uniqueness based on the specified key.
  const result = uniqBy([...existingRelation, ...newRelations], (e: string) => e?.[uniqueBy]);

  return result;
};

export function reduceObjectivesForActivityReport(
  newObjectives: IObjectiveModelInstance[],
  currentObjectives = [],
) {
  const objectivesToSort = newObjectives.reduce((objectives, objective) => {
    // check the activity report objective status
    const objectiveStatus = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].status
      ? objective.activityReportObjectives[0].status : objective.status;

    const objectiveSupportType = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].supportType
      ? objective.activityReportObjectives[0].supportType : null;

    const objectiveCreatedHere = objective.activityReportObjectives
        && objective.activityReportObjectives.some((aro) => aro.objectiveCreatedHere) ? true : null;

    // objectives represent the accumulator in the find below
    // objective is the objective as it is returned from the API
    const exists = objectives.find((o) => (
      o.title.trim() === objective.title.trim()
      && o.status === objectiveStatus
    ));

    if (exists) {
      const { id } = objective;
      exists.ids = [...exists.ids, id];

      if (objectiveCreatedHere && !exists.objectiveCreatedHere) {
        exists.objectiveCreatedHere = true;
      }

      // we can dedupe these using lodash
      exists.resources = reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveResources',
        'resource',
        exists,
        'value',
      );

      exists.topics = reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveTopics',
        'topic',
        exists,
      );

      exists.courses = reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveCourses',
        'course',
        exists,
      );

      // Citations should return null not exists (every subsequent adding of objective).
      exists.citations = uniq(
        objective.activityReportObjectives
        && objective.activityReportObjectives.length > 0
          ? [
            ...exists.citations || [],
            ...objective.activityReportObjectives.flatMap(
              (aro) => (aro.activityReportObjectiveCitations || []).map((c) => ({
                ...c.dataValues,
                id: c.monitoringReferences[0].standardId,
                name: `${c.monitoringReferences[0].acro} - ${c.citation} - ${c.monitoringReferences[0].findingSource}`,
              })),
            ),
          ]
          : [],
      );

      // Set to null if we don't have any citations.
      if (exists.citations.length === 0) {
        exists.citations = null;
      }

      exists.files = uniqBy([
        ...exists.files,
        ...(objective.activityReportObjectives
            && objective.activityReportObjectives.length > 0
          ? objective.activityReportObjectives[0].activityReportObjectiveFiles
            .map((f) => ({ ...f.file.dataValues, url: f.file.url }))
          : []),
      ], (e: IFile) => e.key);

      return objectives;
    }

    // since this method is used to rollup both objectives on and off activity reports
    // we need to handle the case where there is TTA provided and TTA not provided
    // NOTE: there will only be one activity report objective, it is queried by activity report id
    const ttaProvided = objective.activityReportObjectives
          && objective.activityReportObjectives[0]
          && objective.activityReportObjectives[0].ttaProvided
      ? objective.activityReportObjectives[0].ttaProvided : null;
    const arOrder = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].arOrder
      ? objective.activityReportObjectives[0].arOrder : null;
    const closeSuspendContext = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].closeSuspendContext
      ? objective.activityReportObjectives[0].closeSuspendContext : null;
    const closeSuspendReason = objective.activityReportObjectives
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].closeSuspendReason
      ? objective.activityReportObjectives[0].closeSuspendReason : null;

    const { id } = objective;

    const newObjective = {
      ...objective.dataValues,
      title: objective.title.trim(),
      value: id,
      ids: [id],
      ttaProvided,
      supportType: objectiveSupportType,
      status: objectiveStatus, // the status from above, derived from the activity report objective
      isNew: false,
      arOrder,
      closeSuspendContext,
      closeSuspendReason,
      objectiveCreatedHere,

      // for the associated models, we need to return not the direct associations
      // but those associated through an activity report since those reflect the state
      // of the activity report not the state of the objective, which is what
      // we are getting at with this method (getGoalsForReport)

      topics: reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveTopics',
        'topic',
      ),
      resources: reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveResources',
        'resource',
        {},
        'value',
      ),
      files: objective.activityReportObjectives
      && objective.activityReportObjectives.length > 0
        ? objective.activityReportObjectives[0].activityReportObjectiveFiles
          .map((f) => ({ ...f.file.dataValues, url: f.file.url }))
        : [],
      courses: reduceRelationThroughActivityReportObjectives(
        objective,
        'activityReportObjectiveCourses',
        'course',
      ),
      // Citations should return null if they are not applicable (first time we add the objective).
      citations:
        uniq(objective.activityReportObjectives
          && objective.activityReportObjectives.length > 0
          ? objective.activityReportObjectives.flatMap(
            (aro) => aro.activityReportObjectiveCitations.map((c) => ({
              ...c.dataValues,
              id: c.monitoringReferences[0].standardId,
              name: `${c.monitoringReferences[0].acro} - ${c.citation} - ${c.monitoringReferences[0].findingSource}`,
            })),
          )
          : []),
    };

    // If we have no citations set to null.
    if (newObjective.citations.length === 0) {
      newObjective.citations = null;
    }

    return [...objectives, newObjective];
  }, currentObjectives);

  // Sort by AR Order in place.
  objectivesToSort.sort((o1, o2) => {
    if (o1.arOrder < o2.arOrder) {
      return -1;
    }
    return 1;
  });
  return objectivesToSort;
}

/**
 *
 * @param {Boolean} forReport
 * @param {Array} newPrompts
 * @param {Array} promptsToReduce
 * @returns Array of reduced prompts
 */
function reducePrompts(
  forReport: boolean,
  newPrompts:IPrompt[] = [],
  promptsToReduce:IPrompt[] = [],
) {
  return newPrompts
    ?.reduce((previousPrompts, currentPrompt) => {
      const promptId = currentPrompt.promptId
        ? currentPrompt.promptId : currentPrompt.dataValues.promptId;

      const existingPrompt = previousPrompts.find((pp) => pp.promptId === currentPrompt.promptId);
      if (existingPrompt) {
        if (!forReport) {
          existingPrompt.response = uniq(
            [...existingPrompt.response, ...currentPrompt.responses.flatMap((r) => r.response)],
          );
        }

        if (forReport) {
          existingPrompt.response = uniq(
            [
              ...existingPrompt.response,
              ...(currentPrompt.response || []),
              ...(currentPrompt.reportResponse || []),
            ],
          );
          existingPrompt.reportResponse = uniq(
            [
              ...(existingPrompt.reportResponse || []),
              ...(currentPrompt.reportResponse || []),
            ],
          );
        }

        return previousPrompts;
      }

      const newPrompt = {
        promptId,
        ordinal: currentPrompt.ordinal,
        title: currentPrompt.title,
        prompt: currentPrompt.prompt,
        hint: currentPrompt.hint,
        fieldType: currentPrompt.fieldType,
        options: currentPrompt.options,
        validations: currentPrompt.validations,
        grantId: currentPrompt.grantId,
        grantDisplayName: currentPrompt.grantDisplayName,
      } as IPrompt;

      if (forReport) {
        newPrompt.response = uniq(
          [
            ...(currentPrompt.response || []),
            ...(currentPrompt.reportResponse || []),
          ],
        );
        newPrompt.reportResponse = (currentPrompt.reportResponse || []);
      }

      if (!forReport) {
        newPrompt.response = uniq(currentPrompt.responses.flatMap((r) => r.response));
      }

      return [
        ...previousPrompts,
        newPrompt,
      ];
    }, promptsToReduce);
}

/**
 * Dedupes goals by name + status, as well as objectives by title + status
 * @param {Object[]} goals
 * @returns {Object[]} array of deduped goals
 */
export function reduceGoals(
  goals: IGoalModelInstance[],
  forReport = false,
): IReducedGoal[] {
  // eslint-disable-next-line no-console
  console.log('=== reduceGoals input ===');
  // eslint-disable-next-line no-console
  console.log('Input goals count:', goals.length);
  // eslint-disable-next-line no-console
  console.log('Input goals:', goals.map((g) => ({ id: g.id, name: g.name })));
  
  const objectivesReducer = forReport ? reduceObjectivesForActivityReport : reduceObjectives;

  const where = (g: IReducedGoal, currentValue: IGoalModelInstance) => (forReport
    ? (g.name || '').trim() === (currentValue.dataValues.name || '').trim()
    : (g.name || '').trim() === (currentValue.dataValues.name || '').trim()
   && g.status === currentValue.dataValues.status);

  function getGoalCollaboratorDetails(
    collabType: string,
    dataValues: IGoalModelInstance,
  ) {
    // eslint-disable-next-line max-len
    const collaborator = dataValues.goalCollaborators?.find((gc) => gc.collaboratorType.name === collabType);
    return {
      [`goal${collabType}`]: collaborator,
      [`goal${collabType}Name`]: collaborator?.user?.name,
      [`goal${collabType}Roles`]: collaborator?.user?.userRoles?.map((ur) => ur.role.name).join(', '),
    };
  }

  const r = goals.reduce((previousValues: IReducedGoal[], currentValue: IGoalModelInstance) => {
    try {
      const existingGoal = previousValues.find((g) => where(g, currentValue));
      // eslint-disable-next-line no-console
      console.log(`reduceGoals - Processing goal id=${currentValue.id}, name="${currentValue.name}", existingGoal found=${!!existingGoal}`);
      if (existingGoal) {
        existingGoal.goalNumbers = [...existingGoal.goalNumbers, currentValue.goalNumber || `G-${currentValue.dataValues.id}`];
        existingGoal.goalIds = [...existingGoal.goalIds, currentValue.dataValues.id];
        existingGoal.grants = [
          ...existingGoal.grants,
          {
            ...currentValue.grant.dataValues,
            recipient: currentValue.grant.recipient.dataValues,
            name: currentValue.grant.name,
            goalId: currentValue.dataValues.id,
            numberWithProgramTypes: currentValue.grant.numberWithProgramTypes,
          },
        ];
        existingGoal.grantIds = [...existingGoal.grantIds, currentValue.grant.id];
        existingGoal.objectives = objectivesReducer(
          currentValue.objectives,
          existingGoal.objectives,
        );

        if (forReport) {
          // Get the regular prompts for the report.
          const promptsToAdd = (currentValue.dataValues.prompts || []).map((p) => ({
            ...p,
            grantDisplayName: currentValue.grant.recipientNameWithPrograms,
          }) as IPrompt);
          (existingGoal.prompts as IPrompt[]).push(...promptsToAdd);
          // Get prompts for review.
          const promptsToAddForReview = (currentValue.dataValues.prompts || []).map((p) => ({
            key: `${currentValue.grant.id}-${(p.response || []).join('-')}`,
            promptId: p.promptId,
            responses: p.response || [],
            recipients: [
              {
                id: currentValue.grant.recipientId,
                name: currentValue.grant.recipientNameWithPrograms,
              },
            ],
            grantId: currentValue.grant.id,
            grantDisplayName: currentValue.grant.recipientNameWithPrograms,
          }) as IReviewPrompt);

          (existingGoal.promptsForReview as IReviewPrompt[]).push(...promptsToAddForReview);
        } else {
          // Ensure each prompt has grantDisplayName populated
          const promptsWithGrantName = (currentValue.dataValues.prompts || []).map((p) => ({
            ...p,
            grantDisplayName: currentValue.grant.recipientNameWithPrograms,
          }));
          existingGoal.prompts = {
            ...existingGoal.prompts,
            [currentValue.grant.numberWithProgramTypes]: reducePrompts(
              forReport,
              promptsWithGrantName,
              [], // we don't want to combine existing prompts if reducing for the RTR
            ),
          };
          existingGoal.source = {
            ...existingGoal.source as {
              [key: string]: string;
            },
            [currentValue.grant.numberWithProgramTypes]: currentValue.dataValues.source,
          };
        }

        existingGoal.collaborators = existingGoal.collaborators || [];

        existingGoal.collaborators = uniqBy([
          ...existingGoal.collaborators,
          {
            goalNumber: currentValue.goalNumber || `G-${currentValue.dataValues.id}`,
            ...getGoalCollaboratorDetails('Creator', currentValue.dataValues as IGoal),
            ...getGoalCollaboratorDetails('Linker', currentValue.dataValues as IGoal),
          } as {
            goalNumber: string;
            goalCreatorName: string;
            goalCreatorRoles: string;
          },
        ], 'goalCreatorName');

        existingGoal.isReopenedGoal = wasGoalPreviouslyClosed(existingGoal);

        return previousValues;
      }

      const { source: sourceForReport } = currentValue.dataValues;

      // Ensure each prompt has grantDisplayName populated before reducing
      const promptsWithGrantName = (currentValue.dataValues.prompts || []).map((p) => ({
        ...p,
        grantDisplayName: currentValue.grant.recipientNameWithPrograms,
      }));

      const promptsForReport = reducePrompts(
        forReport,
        promptsWithGrantName,
        [], // No existing prompts to merge with
      );

      // Create review prompts only if needed for the report
      const promptsForReview = forReport ? (currentValue.dataValues.prompts || []).map((p) => ({
        key: `${currentValue.grant.id}-${(p.response || []).join('-')}`,
        promptId: p.promptId,
        responses: p.response || [],
        recipients: [{
          id: currentValue.grant.recipientId,
          name: currentValue.grant.recipientNameWithPrograms,
        }],
        grantId: currentValue.grant.id,
        grantDisplayName: currentValue.grant.recipientNameWithPrograms,
      })) : [];

      let sourceForRTR: { [key: string]: string };
      let sourceForPrompts: { [key: string]: IPrompt[] };

      if (!forReport) {
        sourceForRTR = {
          [currentValue.grant.numberWithProgramTypes]: sourceForReport,
        };
        sourceForPrompts = {
          [currentValue.grant.numberWithProgramTypes]: promptsForReport,
        };
      }

      const goal = {
        ...currentValue.dataValues,
        isCurated: currentValue.dataValues.isCurated,
        isSourceEditable: currentValue.isSourceEditable,
        goalNumber: currentValue.goalNumber || `G-${currentValue.dataValues.id}`,
        grantId: currentValue.grant.id,
        id: currentValue.dataValues.id,
        name: currentValue.dataValues.name,
        activityReportGoals: currentValue.activityReportGoals,
        status: currentValue.dataValues.status,
        regionId: currentValue.grant.regionId,
        recipientId: currentValue.grant.recipientId,
        goalTemplateId: currentValue.dataValues.goalTemplateId,
        createdVia: currentValue.dataValues.createdVia,
        source: forReport ? sourceForReport : sourceForRTR,
        prompts: forReport ? promptsForReport : sourceForPrompts,
        promptsForReview: forReport ? promptsForReview : [],
        isNew: false,
        onAR: currentValue.dataValues.onAR,
        onApprovedAR: currentValue.dataValues.onApprovedAR,
        rtrOrder: currentValue.dataValues.rtrOrder,
        objectives: objectivesReducer(
          currentValue.objectives,
        ),
        goalNumbers: [currentValue.goalNumber || `G-${currentValue.dataValues.id}`],
        goalIds: [currentValue.dataValues.id],
        grant: currentValue.grant.dataValues,
        grants: [
          {
            ...currentValue.grant.dataValues,
            numberWithProgramTypes: currentValue.grant.numberWithProgramTypes,
            recipient: currentValue.grant.recipient.dataValues,
            name: currentValue.grant.name,
            goalId: currentValue.dataValues.id,
          },
        ],
        grantIds: [currentValue.grant.id],
        statusChanges: currentValue.statusChanges,
      } as IReducedGoal;

      if (!forReport) {
        goal.isReopenedGoal = wasGoalPreviouslyClosed(currentValue);
        goal.goalCollaborators = currentValue.goalCollaborators;
        goal.collaborators = [
          {
            goalNumber: currentValue.goalNumber || `G-${currentValue.dataValues.id}`,
            ...getGoalCollaboratorDetails('Creator', currentValue.dataValues),
            ...getGoalCollaboratorDetails('Linker', currentValue.dataValues),
          } as {
            goalNumber: string;
            goalCreatorName: string;
            goalCreatorRoles: string;
          },
        ].filter(
          (c: { goalCreatorName: string }) => c.goalCreatorName !== null,
        );
      }

      return [...previousValues, goal];
    } catch (err) {
      auditLogger.error('Error reducing goal in services/goals reduceGoals, exiting reducer early', err);
      return previousValues;
    }
  }, []);

  // eslint-disable-next-line no-console
  console.log('=== reduceGoals output ===');
  // eslint-disable-next-line no-console
  console.log('Output goals count:', r.length);
  // eslint-disable-next-line no-console
  console.log('Output goals:', r.map((g) => ({ id: g.id, name: g.name, goalIds: g.goalIds })));

  return r;
}
