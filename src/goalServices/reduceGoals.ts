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
  }, currentObjectives);

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
   * @param {Object} objective - The objective object.
   * @param {string} join tablename that joins aro <> relation. activityReportObjectiveResources
   * @param {string} relation - The relation that will be returned. e.g. resource.
   * @param {Object} [exists={}] - The existing relation object.
   * @returns {Array} - The reduced relation array.
   */
type IAcceptableModelParameter = ITopic | IResource | ICourse;
const reduceRelationThroughActivityReportObjectives = (
  objective: IObjectiveModelInstance,
  join: string,
  relation: string,
  exists = {},
  uniqueBy = 'id',
) => {
  const existingRelation = exists[relation] || [];
  return uniqBy([
    ...existingRelation,
    ...(objective.activityReportObjectives
        && objective.activityReportObjectives.length > 0
      ? objective.activityReportObjectives[0][join]
        .map((t: IAcceptableModelParameter) => t[relation].dataValues)
        .filter((t: IAcceptableModelParameter) => t)
      : []),
  ], (e: string) => e[uniqueBy]);
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
        && objective.activityReportObjectives[0]
        && objective.activityReportObjectives[0].objectiveCreatedHere
      ? objective.activityReportObjectives[0].objectiveCreatedHere : null;

    // objectives represent the accumulator in the find below
    // objective is the objective as it is returned from the API
    const exists = objectives.find((o) => (
      o.title.trim() === objective.title.trim()
      && o.status === objectiveStatus
      && o.objectiveCreatedHere === objectiveCreatedHere
    ));

    if (exists) {
      const { id } = objective;
      exists.ids = [...exists.ids, id];

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

    return [...objectives, {
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
    }];
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
   * @param {Array} newPrompts
   * @param {Array} promptsToReduce
   * @returns Array of reduced prompts
   */
function reducePrompts(
  newPrompts: IPrompt[] = [],
  promptsToReduce: IPrompt[] = [],
) {
  return newPrompts
    ?.reduce((previousPrompts, currentPrompt) => {
      const promptId = currentPrompt.promptId
        ? currentPrompt.promptId : currentPrompt.dataValues.promptId;

      const existingPrompt = previousPrompts.find((pp) => pp.promptId === currentPrompt.promptId);
      if (existingPrompt) {
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

        if (existingPrompt.allGoalsHavePromptResponse && (currentPrompt.response || []).length) {
          existingPrompt.allGoalsHavePromptResponse = true;
        } else {
          existingPrompt.allGoalsHavePromptResponse = false;
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
        allGoalsHavePromptResponse: false,
        response: [],
        reportResponse: [],
      } as IPrompt;

      newPrompt.response = uniq(
        [
          ...(currentPrompt.response || []),
          ...(currentPrompt.reportResponse || []),
        ],
      );
      newPrompt.reportResponse = (currentPrompt.reportResponse || []);

      if (newPrompt.response.length) {
        newPrompt.allGoalsHavePromptResponse = true;
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
  const objectivesReducer = forReport ? reduceObjectivesForActivityReport : reduceObjectives;

  const where = (g: IReducedGoal, currentValue: IGoalModelInstance) => (forReport
    ? g.name === currentValue.dataValues.name
    : g.name === currentValue.dataValues.name
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

        existingGoal.prompts = {
          ...existingGoal.prompts,
          [currentValue.grant.numberWithProgramTypes]: reducePrompts(
            currentValue.dataValues.prompts || [],
            [], // we don't want to combine existing prompts if reducing for the RTR
          ),
        };
        existingGoal.source = {
          ...existingGoal.source,
          [currentValue.grant.numberWithProgramTypes]: currentValue.dataValues.source,
        };

        return previousValues;
      }

      const endDate = (() => {
        const date = moment(currentValue.dataValues.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY');

        if (date === 'Invalid date') {
          return '';
        }

        return date;
      })();

      const prompts = reducePrompts(
        currentValue.dataValues.prompts || [],
        [],
      );

      const updatedSource = {
        [currentValue.grant.numberWithProgramTypes]: currentValue.dataValues.source,
      } as {
        [key: string]: string;
      };

      const updatedPrompts = {
        [currentValue.grant.numberWithProgramTypes]: prompts,
      };

      const goal = {
        isCurated: currentValue.isCurated,
        goalNumber: currentValue.goalNumber || `G-${currentValue.dataValues.id}`,
        grantId: currentValue.grant.id,
        collaborators: currentValue.collaborators,
        id: currentValue.id,
        name: currentValue.name,
        endDate,
        status: currentValue.status,
        regionId: currentValue.grant.regionId,
        recipientId: currentValue.grant.recipientId,
        goalTemplateId: currentValue.goalTemplateId,
        createdVia: currentValue.createdVia,
        source: updatedSource,
        prompts: updatedPrompts,
        isNew: false,
        onAR: currentValue.onAR,
        onApprovedAR: currentValue.onApprovedAR,
        rtrOrder: currentValue.rtrOrder,
        isReopenedGoal: wasGoalPreviouslyClosed(currentValue),
        goalCollaborators: currentValue.goalCollaborators,
        objectives: objectivesReducer(
          currentValue.objectives,
        ),
        goalNumbers: [currentValue.goalNumber || `G-${currentValue.dataValues.id}`],
        goalIds: [currentValue.dataValues.id],
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
      ];

      goal.collaborators = goal.collaborators.filter(
        (c: { goalCreatorName: string }) => c.goalCreatorName !== null,
      );

      return [...previousValues, goal];
    } catch (err) {
      auditLogger.error('Error reducing goal in services/goals reduceGoals, exiting reducer early', err);
      return previousValues;
    }
  }, []);

  return r;
}