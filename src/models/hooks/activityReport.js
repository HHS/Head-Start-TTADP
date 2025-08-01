const httpContext = require('express-http-context');
const { Op } = require('sequelize');
const { REPORT_STATUSES } = require('@ttahub/common');
const {
  OBJECTIVE_STATUS,
  GOAL_COLLABORATORS,
  OBJECTIVE_COLLABORATORS,
} = require('../../constants');
const { auditLogger } = require('../../logger');
const { findOrCreateGoalTemplate } = require('./goal');
const { GOAL_STATUS } = require('../../constants');
const { findOrCreateObjectiveTemplate } = require('./objective');
const {
  findOrCreateCollaborator,
  removeCollaboratorsForType,
} = require('../helpers/genericCollaborator');
const { destroyLinkedSimilarityGroups } = require('./activityReportGoal');
const { purifyFields } = require('../helpers/purifyFields');

const AR_FIELDS_TO_ESCAPE = ['additionalNotes', 'context'];

const processForEmbeddedResources = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForActivityReport, processActivityReportForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForActivityReport(changed)) {
    await processActivityReportForResourcesById(instance.id);
  }
};

/**
 * Helper function called by model hooks.
 * Updates current model instance's calculatedStatus field.
 * Background: calculatedStatus is updated to 'submitted', 'needs_review', and 'approved'
 * based on hooks on the ActivityReportApprovers. Before submission though,
 * we want calculatedStatus to function like submissionStatus so developers
 * only have to check calculatedStatus to determine overall report status.
 * @param {*} report - current model instance
 */
const copyStatus = (instance) => {
  const { submissionStatus } = instance;
  if (submissionStatus === REPORT_STATUSES.DRAFT
    || submissionStatus === REPORT_STATUSES.DELETED) {
    instance.set('calculatedStatus', submissionStatus);
  }
};

const moveDraftGoalsToNotStartedOnSubmission = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const changeGoalStatus = require('../../goalServices/changeGoalStatus').default;
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('submissionStatus')
    && instance.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    try {
      const goals = await sequelize.models.Goal.findAll({
        where: {
          status: 'Draft',
        },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
      });

      const goalIds = goals.map((goal) => goal.id);
      const userId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');
      await Promise.all(goalIds.map((goalId) => changeGoalStatus({
        goalId,
        userId,
        newStatus: GOAL_STATUS.NOT_STARTED,
        reason: 'Activity Report submission',
        context: null,
        transaction: options.transaction,
      })));
    } catch (error) {
      auditLogger.error(`moveDraftGoalsToNotStartedOnSubmission error: ${error}`);
    }
  }
};

const setSubmittedDate = (sequelize, instance, options) => {
  try {
    if (!options.fields.includes('submittedDate')) {
      options.fields.push('submittedDate');
    }
    if (instance.previous('calculatedStatus') !== REPORT_STATUSES.SUBMITTED
      && instance.calculatedStatus === REPORT_STATUSES.SUBMITTED) {
      // Other > Submitted.
      instance.set('submittedDate', new Date());
    } else if (instance.calculatedStatus === REPORT_STATUSES.DRAFT) {
      // Submitted > Draft.
      instance.set('submittedDate', null);
    }
  } catch (e) {
    auditLogger.error(`setSubmittedDate error: ${e}`);
  }
};

/**
 * This hook is called when an activity report is approved.
 * It clears the additional notes field, which is data we don't
 * want to retain after approval.
 *
 * @param {*} _sequelize
 * @param {*} instance
 * @param {*} options
 */
const clearAdditionalNotes = (_sequelize, instance, options) => {
  try {
    if (instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
      && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
      if (!options.fields.includes('additionalNotes')) {
        options.fields.push('additionalNotes');
      }
      instance.set('additionalNotes', '');
    }
  } catch (e) {
    auditLogger.error(`clearAdditionalNotes: ${e}`);
  }
};

const revisionBump = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.length > 0) {
    const currentRevision = instance.revision || 0;
    instance.set('revision', currentRevision + 1);

    if (!options.fields.includes('revision')) {
      options.fields.push('revision');
    }
  }
};

const propagateSubmissionStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('submissionStatus')
    && instance.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    let goals;
    try {
      goals = await sequelize.models.Goal.findAll({
        where: { goalTemplateId: null },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
        raw: true,
      });
      // Generate a distinct list of goal names.
      const distinctlyNamedGoals = [...new Map(goals.map((goal) => [goal.name, goal])).values()];
      // Find or create templates for each of the distinct names.
      const distinctTemplates = await Promise.all(distinctlyNamedGoals
        .map(async (goal) => findOrCreateGoalTemplate(
          sequelize,
          options.transaction,
          instance.regionId,
          goal.name,
          goal.createdAt,
          goal.updatedAt,
        )));
      // Add the corresponding template id to each of the goals.
      goals = goals.map((goal) => {
        const goalTemplateId = distinctTemplates.find((dt) => dt.name === goal.name).id;
        return { ...goal, goalTemplateId };
      });
      // Update all the goals with their template id.
      await Promise.all(goals.map(async (goal) => sequelize.models.Goal.update(
        { goalTemplateId: goal.goalTemplateId },
        {
          where: { id: goal.id },
          transaction: options.transaction,
          individualHooks: true,
        },
      )));
    } catch (e) {
      auditLogger.error(`propagateSubmissionStatus > updating goal: ${e}}`);
    }

    let objectives;
    try {
      objectives = await sequelize.models.Objective.findAll({
        where: { objectiveTemplateId: null },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
        raw: true,
      });
      // Generate a distinct list of objective titles.
      const distinctlyTitledObjectives = [...new Map(objectives
        .map((objective) => [objective.title, objective])).values()];
      // Find or create templates for each of the distinct titles.
      const distinctTemplates = await Promise.all(distinctlyTitledObjectives
        .map(async (objective) => findOrCreateObjectiveTemplate(
          sequelize,
          options.transaction,
          instance.regionId,
          objective.title,
          objective.createdAt,
          objective.updatedAt,
        )));
      // Add the corresponding template id to each of the objectives.
      objectives = objectives.map((objective) => {
        const objectiveTemplateId = distinctTemplates
          .find((dt) => dt.title === objective.title).id;
        return { ...objective, objectiveTemplateId };
      });
      // Update all the objectives with their template id.
      await Promise.all(objectives.map(async (objective) => sequelize.models.Objective.update(
        { objectiveTemplateId: objective.objectiveTemplateId },
        {
          where: { id: objective.id },
          transaction: options.transaction,
        },
      )));
    } catch (e) {
      auditLogger.error(`propagateSubmissionStatus > updating objective: ${e}`);
    }
  }
};

const determineObjectiveStatus = async (activityReportId, sequelize, isUnlocked) => {
  // Get all AR Objective Id's.
  const objectives = await sequelize.models.ActivityReportObjective.findAll(
    {
      attributes: [
        'id',
        'objectiveId',
      ],
      where: { activityReportId },
    },
  );
  const objectiveIds = objectives.map((o) => o.objectiveId);

  // Get all the reports that use the objectives
  const allReports = await sequelize.models.ActivityReport.findAll({
    attributes: ['id', 'calculatedStatus', 'endDate'],
    include: [
      {
        model: sequelize.models.ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: [
          'id',
          'objectiveId',
          'status',
          'closeSuspendReason',
          'closeSuspendContext',
        ],
        where: {
          objectiveId: objectiveIds,
        },
        required: true,
        include: [{
          model: sequelize.models.Objective,
          as: 'objective',
          required: true,
        }],
      },
    ],
  });

  const approvedReports = allReports.filter((report) => (
    report.calculatedStatus === REPORT_STATUSES.APPROVED
  ));

  if (isUnlocked && !approvedReports.length) {
    const report = allReports.find((r) => r.id === activityReportId);
    const objectivesToReset = report && report.activityReportObjectives
      ? report.activityReportObjectives.map((a) => a.objectiveId)
      : [];

    // we don't need to run this query with an empty array I don't think
    if (objectivesToReset.length) {
      return sequelize.models.Objective.update({
        status: OBJECTIVE_STATUS.NOT_STARTED,
      }, {
        where: { id: objectivesToReset },
        individualHooks: true,
      });
    }

    return Promise.resolve();
  }

  return Promise.all(objectiveIds.map((objectiveId) => {
    // Get reports that use this objective.
    const relevantARs = approvedReports.filter(
      (a) => a.activityReportObjectives.find((aro) => aro.objectiveId === objectiveId),
    );

    const objectivesToUpdate = relevantARs.map((a) => a.activityReportObjectives
      .filter((aro) => aro.objectiveId === objectiveId).map((aro) => aro.objective)).flat();

    if (!relevantARs && !relevantARs.length) {
      return Promise.resolve();
    }

    // Get latest report by end date.
    const latestAR = relevantARs.reduce((r, a) => {
      if (r && r.endDate) {
        return new Date(r.endDate) > new Date(a.endDate) ? r : a;
      }
      return a;
    }, {
      endDate: null,
      activityReportObjectives: [],
    });

    // // Get Objective to take status from.
    const aro = latestAR.activityReportObjectives.find(((a) => a.objectiveId === objectiveId));
    const latestEndDate = latestAR.endDate;

    if (!aro) {
      return Promise.resolve();
    }

    return Promise.all((objectivesToUpdate.map(async (objectiveToUpdate) => {
      const newStatus = aro.status || OBJECTIVE_STATUS.NOT_STARTED;
      // status is the same, no need to update
      if (newStatus === objectiveToUpdate.status) {
        return Promise.resolve();
      }

      if (objectiveToUpdate.status === OBJECTIVE_STATUS.NOT_STARTED
          && newStatus === OBJECTIVE_STATUS.IN_PROGRESS
      ) {
        if (!objectiveToUpdate.firstInProgressAt) {
          objectiveToUpdate.set('firstInProgressAt', latestEndDate);
        }

        objectiveToUpdate.set('lastInProgressAt', latestEndDate);
      }

      /**
       * if the objective is suspended, we want to capture the reason and context
       */
      if (newStatus === OBJECTIVE_STATUS.SUSPENDED) {
        objectiveToUpdate.set('closeSuspendReason', aro.closeSuspendReason);
        objectiveToUpdate.set('closeSuspendContext', aro.closeSuspendContext);
      }

      // if we've gotten this far, we want to update the status
      objectiveToUpdate.set('status', newStatus);

      // in this case, we don't want to run hooks because we don't want to update the
      // status metadata
      return objectiveToUpdate.save({ hooks: false });
    })));
  }));
};

const propagateApprovedStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('calculatedStatus')) {
    if (instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
      && instance.calculatedStatus !== REPORT_STATUSES.APPROVED) {
      // eslint-disable-next-line max-len
      // TODO: Run extensive check and update where required all used goals and objectives as not onApprovedAR
      let objectives;
      try {
        objectives = await sequelize.models.Objective.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus")::int'), 'cntApproved'],
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: true,
              where: {
                activityReportId: instance.id,
              },
            },
            {
              attributes: [],
              through: { attributes: [] },
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              required: false,
              where: {
                id: { [Op.not]: instance.id },
                calculatedStatus: REPORT_STATUSES.APPROVED,
              },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Objective"."id"'),
        });
      } catch (e) {
        auditLogger.error(JSON.stringify({
          location: __filename, type: 'objectives', e, objectives,
        }));
        throw e;
      }

      if (objectives && objectives.length > 0) {
        await Promise.all([
          // update the onApprovedAR for objectives that will no longer be referenced on an
          // approved AR
          sequelize.models.Objective.update(
            { onApprovedAR: false },
            {
              where: {
                id: {
                  [Op.in]: objectives
                    .filter((o) => o.dataValues.cntApproved === 0)
                    .map((o) => o.id),
                },
                onApprovedAR: true,
              },
              transaction: options.transaction,
              individualHooks: true,
            },
          ),
        ]);
      }

      /*  Determine Objective Statuses (Approved > Other) */
      await determineObjectiveStatus(instance.id, sequelize, true);

      let goals;
      try {
        goals = await sequelize.models.Goal.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus")'), 'cntApproved'],
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              include: [
                {
                  attributes: [],
                  model: sequelize.models.ActivityReportObjective,
                  as: 'activityReportObjectives',
                  required: true,
                  where: {
                    activityReportId: instance.id,
                  },
                },
              ],
            },
            {
              attributes: [],
              through: { attributes: [] },
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              required: false,
              where: {
                id: { [Op.not]: instance.id },
                calculatedStatus: REPORT_STATUSES.APPROVED,
              },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Goal"."id"'),
          having: sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus") = 0'),
          transaction: options.transaction,
        });
      } catch (e) {
        auditLogger.error(JSON.stringify({
          location: __filename, type: 'goals', e, goals,
        }));
        throw e;
      }

      if (goals && goals.length > 0) {
        await Promise.all([
          sequelize.models.Goal.update(
            { onApprovedAR: false },
            {
              where: {
                id: { [Op.in]: goals.map((g) => g.id) },
                onApprovedAR: true,
              },
              transaction: options.transaction,
              individualHooks: true,
            },
          ),
          sequelize.models.GoalFieldResponse.update(
            { onApprovedAR: false },
            {
              where: {
                goalId: { [Op.in]: goals.map((g) => g.id) },
                onApprovedAR: true,
              },
              transaction: options.transaction,
              individualHooks: true,
            },
          ),
        ]);
      }
    } else if (instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
      const objectivesAndGoals = await sequelize.models.Objective.findAll(
        {
          attributes: [
            'id',
            'goalId',
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: true,
              where: { activityReportId: instance.id },
            },
          ],
          includeIgnoreAttributes: false,
          transaction: options.transaction,
        },
      );
      const objectiveIds = objectivesAndGoals.map((o) => o.id);
      if (Array.isArray(objectiveIds) && objectiveIds.length > 0) {
        await Promise.all([
          sequelize.models.Objective.update(
            { onApprovedAR: true },
            {
              where: {
                id: objectiveIds,
                onApprovedAR: false,
              },
              transaction: options.transaction,
              individualHooks: true,
            },
          ),
        ]);
      }
      /*  Determine Objective Statuses (Other > Approved) */
      await determineObjectiveStatus(instance.id, sequelize, false);

      await Promise.all([
        sequelize.models.Goal.update(
          { onApprovedAR: true },
          {
            where: {
              id: objectivesAndGoals.map((o) => o.goalId),
              onApprovedAR: false,
            },
            transaction: options.transaction,
            individualHooks: true,
          },
        ),
        sequelize.models.GoalFieldResponse.update(
          { onApprovedAR: true },
          {
            where: {
              goalId: objectivesAndGoals.map((o) => o.goalId),
              onApprovedAR: false,
            },
            transaction: options.transaction,
            individualHooks: true,
          },
        ),
      ]);
    }
  }
};

const automaticStatusChangeOnApprovalForGoals = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const changeGoalStatus = require('../../goalServices/changeGoalStatus').default;
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    // when a report is approved, the status of all the goals on that report should be recalculated
    // with the exceptions that 1) goals are not automatically closed
    // and 2) goals that are "In Progress" are not moved backward
    // so we start with finding all the goals that *could* be changed
    // (goals in draft or not started)
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          status: [
            GOAL_STATUS.DRAFT,
            GOAL_STATUS.NOT_STARTED,
          ],
        },
        include: [
          {
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: { id: instance.id },
          },
        ],
        transaction: options.transaction,
      },
    );

    return Promise.all((goals.map(async (goal) => {
      const status = GOAL_STATUS.IN_PROGRESS;

      // if the goal should be in a different state, we will update it
      if (goal.status !== status) {
        const userId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');

        await changeGoalStatus({
          goalId: goal.id,
          userId,
          newStatus: status,
          reason: 'Activity Report approved',
          context: null,
        });
      }
      // removing hooks because we don't want to trigger the automatic status change
      // (i.e. last in progress at will be overwritten)
      return goal.save({ transaction: options.transaction, hooks: false });
    })));
  }

  return Promise.resolve();
};

const automaticGoalObjectiveStatusCachingOnApproval = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    const goals = await sequelize.models.Goal.findAll({
      include: [{
        model: sequelize.models.ActivityReport,
        as: 'activityReports',
        required: true,
        where: { id: instance.id },
      }],
      transaction: options.transaction,
    });

    // Update Goal status to 'In Progress'.
    await Promise.all(goals
      .map(async (goal) => sequelize.models.ActivityReportGoal.update(
        { status: goal.status },
        {
          where: {
            activityReportId: instance.id,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      )));
  }
};

const beforeCreate = async (instance) => {
  purifyFields(instance, AR_FIELDS_TO_ESCAPE);
  copyStatus(instance);
};

/**
 * This function is responsible for auto-populating collaborators for a utilizer when the
 * calculatedStatus of an instance changes to 'APPROVED'. It retrieves the collaborators
 * and goals associated with the instance, and then populates the collaborators for each goal.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance object.
 * @param {Object} options - Additional options.
 */
const autoPopulateUtilizer = async (sequelize, instance, options) => {
  const changed = instance.changed(); // Get the changed attributes of the instance
  if (
    Array.isArray(changed)
    // Check if 'calculatedStatus' attribute has changed
    && changed.includes('calculatedStatus')
    // Check if previous 'calculatedStatus' was not 'APPROVED'
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    // Check if current 'calculatedStatus' is 'APPROVED'
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED
  ) {
    const [
      collaborators,
      goals,
      objectives,
    ] = await Promise.all([
      // Find all ActivityReportCollaborator models
      sequelize.models.ActivityReportCollaborator.findAll({
        attributes: ['userId'], // Select the 'userId' attribute for each model
        where: { // Filter the models based on the following conditions
          // The 'activityReportId' must match the 'id' of the 'instance'
          activityReportId: instance.id,
          // The 'userId' must not be equal to the 'userId' of the 'instance'
          userId: { [Op.not]: instance.userId },
        },
        raw: true, // Return raw data instead of Sequelize instances
      }), // End of the first query
      sequelize.models.ActivityReportGoal.findAll({ // Find all ActivityReportGoals models
        attributes: ['goalId'], // Select the 'goalId' attribute for each model
        where: {
          // Filter the models based on the 'activityReportId' matching the 'id' of the 'instance'
          activityReportId: instance.id,
        },
        raw: true, // Return raw data instead of Sequelize instances
      }), // End of the second query
      sequelize.models.ActivityReportObjective.findAll({ // Find all ActivityReportObjective models
        attributes: ['objectiveId'], // Select the 'objectiveId' attribute for each model
        where: {
          // Filter the models based on the 'activityReportId' matching the 'id' of the 'instance'
          activityReportId: instance.id,
        },
        raw: true, // Return raw data instead of Sequelize instances
      }), // End of the second query
    ]);

    const users = [
      ...collaborators, // Spread the elements of the 'collaborators' array into a new array
      { userId: instance.userId }, // Add an object with a 'userId' property to the new array
    ].filter(({ userId }) => userId);

    const findOrCreateCollaboratorOptions = users.flatMap((user) => [
      ...goals.map((goal) => ({
        type: 'goal',
        sequelize,
        transaction: options.transaction,
        associatedId: goal.goalId,
        userId: user.userId,
        collaboratorType: GOAL_COLLABORATORS.UTILIZER,
        metadata: { activityReportIds: [instance.id] },
      })),
      ...objectives.map((objective) => ({
        type: 'objective',
        sequelize,
        transaction: options.transaction,
        associatedId: objective.objectiveId,
        userId: user.userId,
        collaboratorType: OBJECTIVE_COLLABORATORS.UTILIZER,
        metadata: { activityReportIds: [instance.id] },
      })),
    ]);

    await Promise.all(findOrCreateCollaboratorOptions.map((option) => findOrCreateCollaborator(
      option.type,
      option.sequelize,
      option.transaction,
      option.associatedId,
      option.userId,
      option.collaboratorType,
      option.metadata,
    )));
  }
};

const autoCleanupUtilizer = async (sequelize, instance, options) => {
  const changed = instance.changed(); // Get the changed attributes of the instance
  if (
    Array.isArray(changed)
    // Check if 'calculatedStatus' attribute has changed
    && changed.includes('calculatedStatus')
    // Check if previous 'calculatedStatus' was 'APPROVED'
    && instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
    // Check if current 'calculatedStatus' is not 'APPROVED'
    && instance.calculatedStatus !== REPORT_STATUSES.APPROVED
  ) {
    // Find all ActivityReportGoals models
    const [
      arGoals,
      arObjectives,
    ] = await Promise.all([
      sequelize.models.ActivityReportGoal.findAll({
        attributes: ['goalId'], // Select the 'goalId' attribute for each model
        where: {
          // Filter the models based on the 'activityReportId' matching the 'id' of the 'instance'
          activityReportId: instance.id,
        },
        raw: true, // Return raw data instead of Sequelize instances
      }),
      sequelize.models.ActivityReportObjective.findAll({
        attributes: ['objectiveId'], // Select the 'objectiveId' attribute for each model
        where: {
          // Filter the models based on the 'activityReportId' matching the 'id' of the 'instance'
          activityReportId: instance.id,
        },
        raw: true, // Return raw data instead of Sequelize instances
      }),
    ]);
    await Promise.all([
      ...arGoals.map(async (arGoal) => removeCollaboratorsForType(
        'goal',
        sequelize,
        options.transaction,
        arGoal.goalId,
        GOAL_COLLABORATORS.UTILIZER,
        { activityReportIds: [instance.id] },
      )),
      ...arObjectives.map(async (arObjective) => removeCollaboratorsForType(
        'objective',
        sequelize,
        options.transaction,
        arObjective.objectiveId,
        OBJECTIVE_COLLABORATORS.UTILIZER,
        { activityReportIds: [instance.id] },
      )),
    ]);
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  setSubmittedDate(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  copyStatus(instance);
  purifyFields(instance, AR_FIELDS_TO_ESCAPE);
  setSubmittedDate(sequelize, instance, options);
  clearAdditionalNotes(sequelize, instance, options);
  await revisionBump(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  try {
    if (instance.calculatedStatus !== REPORT_STATUSES.DELETED) {
      return;
    }
    auditLogger.info(`Destroying linked similarity groups for AR-${instance.id}`);
    const { id: activityReportId, calculatedStatus } = instance;

    const arGoals = await sequelize.models.ActivityReportGoal.findAll({
      attributes: ['goalId'],
      where: { activityReportId },
      transaction: options.transaction,
    });

    await Promise.all((arGoals.map(async (arGoal) => {
      const i = {
        calculatedStatus,
        goalId: arGoal.goalId,
      };
      // regen similarity groups
      return destroyLinkedSimilarityGroups(sequelize, i, options);
    })));
  } catch (e) {
    // we do not want to surface these errors to the UI
    auditLogger.error(`Failed to destroy linked similarity groups ${e}`);
  }
};

/**
 * This hook is called after a transaction is committed.
 * It broadcasts the revision update to all users in the activity report room
 * only if the revision was changed during the transaction.
 *
 * @param {*} sequelize - The Sequelize instance
 * @param {*} instance - The ActivityReport instance
 */
const revisionBumpBroadcast = async (sequelize, instance) => {
  try {
    // Only proceed if the revision was changed
    const changed = instance.previous && instance.previous();
    const previousRevision = changed ? instance.previous('revision') : null;
    const currentRevision = instance.revision;

    // Check if revision was actually changed
    if (previousRevision !== null && previousRevision !== currentRevision) {
      // Only attempt to broadcast if we're not in a test environment
      if (process.env.NODE_ENV !== 'test') {
        // Get the current user ID
        const userId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');

        // Dynamically import the mesh server to avoid circular dependencies
        // eslint-disable-next-line global-require
        const { getMeshServer } = require('../../index');
        const mesh = getMeshServer();

        if (mesh) {
          const roomName = `ar-${instance.id}`;
          await mesh.broadcastRoom(
            roomName,
            'revision-updated',
            {
              reportId: instance.id,
              revision: currentRevision,
              userId: userId || null, // Include the user ID who made the change
              timestamp: new Date().toISOString(), // Add a timestamp
            },
          );
          auditLogger.info(`Broadcasted revision update (${currentRevision}) to room ${roomName}`);
        }
      }
    }
  } catch (error) {
    // Log the error but don't fail the process
    auditLogger.error(`Failed to broadcast revision update: ${error}`);
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateSubmissionStatus(sequelize, instance, options);
  await propagateApprovedStatus(sequelize, instance, options);
  await automaticStatusChangeOnApprovalForGoals(sequelize, instance, options);
  await automaticGoalObjectiveStatusCachingOnApproval(sequelize, instance, options);
  await autoPopulateUtilizer(sequelize, instance, options);
  await autoCleanupUtilizer(sequelize, instance, options);
  await moveDraftGoalsToNotStartedOnSubmission(sequelize, instance, options);
  await processForEmbeddedResources(sequelize, instance, options);
  await afterDestroy(sequelize, instance, options);
  await revisionBumpBroadcast(sequelize, instance);
};

export {
  processForEmbeddedResources,
  copyStatus,
  propagateApprovedStatus,
  propagateSubmissionStatus,
  automaticStatusChangeOnApprovalForGoals,
  beforeValidate,
  beforeCreate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
  moveDraftGoalsToNotStartedOnSubmission,
  setSubmittedDate,
  afterDestroy,
  revisionBump,
  revisionBumpBroadcast,
};
