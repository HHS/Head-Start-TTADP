const { Op } = require('sequelize');
const { REPORT_STATUSES, OBJECTIVE_STATUS, AWS_ELASTIC_SEARCH_INDEXES } = require('../../constants');
const { auditLogger } = require('../../logger');
const { findOrCreateGoalTemplate } = require('./goal');
const { findOrCreateObjectiveTemplate } = require('./objective');
const {
  scheduleUpdateIndexDocumentJob,
  scheduleDeleteIndexDocumentJob,
} = require('../../lib/awsElasticSearch/queueManager');
const { collectModelData } = require('../../lib/awsElasticSearch/datacollector');
const { formatModelForAwsElasticsearch } = require('../../lib/awsElasticSearch/modelMapper');
const { addIndexDocument, deleteIndexDocument } = require('../../lib/awsElasticSearch/index');

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
      await sequelize.models.Goal.update(
        { status: 'Not Started' },
        {
          where: {
            id: {
              [Op.in]: goalIds,
            },
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    } catch (error) {
      auditLogger.error(JSON.stringify({ error }));
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
    } else if (instance.calculatedStatus !== REPORT_STATUSES.SUBMITTED
        && instance.calculatedStatus !== REPORT_STATUSES.APPROVED
        && instance.calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
        && instance.calculatedStatus !== REPORT_STATUSES.DELETED) {
      // Submitted > Other.
      instance.set('submittedDate', null);
    }
  } catch (e) {
    auditLogger.error(JSON.stringify({ e }));
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
        const goalTemplateId = distinctTemplates.filter((dt) => dt.name === goal.name).id;
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
      auditLogger.error(JSON.stringify({ e }));
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
          .filter((dt) => dt.title === objective.title).id;
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
      auditLogger.error(JSON.stringify({ e }));
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
        attributes: ['id', 'objectiveId', 'status'],
        where: {
          objectiveId: objectiveIds,
        },
        required: true,
        include: [{
          model: sequelize.models.Objective,
          as: 'objective',
          attributes: ['id', 'status'],
          required: true,
        }],
      },
    ],
  });

  const approvedReports = allReports.filter((report) => (
    report.calculatedStatus === REPORT_STATUSES.APPROVED
  ));

  // Only change the status if we have an approved report using the objective.
  if (approvedReports.length) {
    Promise.all(objectiveIds.map((o) => {
      // Get reports that use this objective.
      const relevantARs = approvedReports.filter(
        (a) => a.activityReportObjectives.find((aro) => aro.objectiveId === o),
      );

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

      // Get Objective to take status from.
      const aro = latestAR.activityReportObjectives.find(((a) => a.objectiveId === o));

      if (!aro) {
        return Promise.resolve();
      }

      // Update Objective status.
      return sequelize.models.Objective.update({
        status: aro.status || 'Not Started',
      }, {
        where: { id: o },
        individualHooks: true,
      });
    }));
  } else if (isUnlocked) {
    const report = allReports.find((r) => r.id === activityReportId);
    const objectivesToReset = report && report.activityReportObjectives
      ? report.activityReportObjectives.map((a) => a.objectiveId)
      : [];

    // we don't need to run this query with an empty array I don't think
    if (objectivesToReset.length) {
      await sequelize.models.Objective.update({
        status: OBJECTIVE_STATUS.NOT_STARTED,
      }, {
        where: { id: objectivesToReset },
        individualHooks: true,
      });
    }
  }
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
          // update the onApprovedAR for files that will no longer be referenced on an approved AR
          sequelize.query(`
          WITH
            "FilesOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                arof."fileId"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveFiles" arof
              ON aro.id = arof."activityReportObjectiveId"
              AND aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              JOIN "ActivityReportObjectives" aro2
              ON aro.id != aro2.id
              AND aro."activityReportId" != aro2."activityReportId"
              AND aro2."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              LEFT JOIN "ActivityReportObjectiveFiles" arof2
              ON aro2.id = arof2."activityReportObjectiveId"
              AND arof."fileId" = arof2."fileId"
              WHERE arof2."id" IS NULL
            )
            UPDATE "ObjectiveFiles" f
            SET "onApprovedAR" = false
            FROM "FilesOnReport" fr
            WHERE f."onApprovedAR" = true
            AND f."objectiveId" = fr."objectiveId"
            AND f."fileId" = fr."fileId";
          `, { transaction: options.transaction }),
          // update the onApprovedAR for resources that will no longer be referenced on an
          // approved AR
          sequelize.query(`
          WITH
            "ResourcesOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                aror."userProvidedUrl"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveResources" aror
              ON aro.id = aror."activityReportObjectiveId"
              AND aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              JOIN "ActivityReportObjectives" aro2
              ON aro.id != aro2.id
              AND aro."activityReportId" != aro2."activityReportId"
              AND aro2."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              LEFT JOIN "ActivityReportObjectiveResources" aror2
              ON aro2.id = aror2."activityReportObjectiveId"
              AND aror."userProvidedUrl" = aror2."userProvidedUrl"
              WHERE aror2."id" IS NULL
            )
            UPDATE "ObjectiveResources" r
            SET "onApprovedAR" = false
            FROM "ResourcesOnReport" rr
            WHERE r."onApprovedAR" = true
            AND r."objectiveId" = rr."objectiveId"
            AND r."userProvidedUrl" = rr."userProvidedUrl";
          `, { transaction: options.transaction }),
          // update the onApprovedAR for topics that will no longer be referenced on an approved AR
          sequelize.query(`
          WITH
            "TopicsOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                arot."topicId"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveTopics" arot
              ON aro.id = arot."activityReportObjectiveId"
              AND aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              JOIN "ActivityReportObjectives" aro2
              ON aro.id != aro2.id
              AND aro."activityReportId" != aro2."activityReportId"
              AND aro2."objectiveId" IN (${objectives.map((o) => o.id).join(',')})
              LEFT JOIN "ActivityReportObjectiveTopics" arot2
              ON aro2.id = arot2."activityReportObjectiveId"
              AND arot."topicId" = arot2."topicId"
              WHERE arot2."id" IS NULL
            )
            UPDATE "ObjectiveTopics" t
            SET "onApprovedAR" = false
            FROM "TopicsOnReport" tr
            WHERE t."onApprovedAR" = true
            AND t."objectiveId" = tr."objectiveId"
            AND t."topicId" = tr."topicId";
          `, { transaction: options.transaction }),
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
        await sequelize.models.Goal.update(
          { onApprovedAR: false },
          {
            where: {
              id: { [Op.in]: goals.map((g) => g.id) },
              onApprovedAR: true,
            },
            transaction: options.transaction,
            individualHooks: true,
          },
        );
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
          sequelize.query(`
          WITH
            "FilesOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                arof."fileId"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveFiles" arof
              ON aro.id = arof."activityReportObjectiveId"
              WHERE aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectiveIds.join(',')})
            )
            UPDATE "ObjectiveFiles" f
            SET "onApprovedAR" = true
            FROM "FilesOnReport" fr
            WHERE f."onApprovedAR" = false
            AND f."objectiveId" = fr."objectiveId"
            AND f."fileId" = fr."fileId";
          `, { transaction: options.transaction }),
          sequelize.query(`
          WITH
            "ResourcesOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                aror."userProvidedUrl"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveResources" aror
              ON aro.id = aror."activityReportObjectiveId"
              WHERE aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectiveIds.join(',')})
            )
            UPDATE "ObjectiveResources" r
            SET "onApprovedAR" = true
            FROM "ResourcesOnReport" rr
            WHERE r."onApprovedAR" = false
            AND r."objectiveId" = rr."objectiveId"
            AND r."userProvidedUrl" = rr."userProvidedUrl";
          `, { transaction: options.transaction }),
          sequelize.query(`
          WITH
            "TopicsOnReport" AS (
              SELECT DISTINCT
                aro."objectiveId",
                arot."topicId"
              FROM "ActivityReportObjectives" aro
              JOIN "ActivityReportObjectiveTopics" arot
              ON aro.id = arot."activityReportObjectiveId"
              WHERE aro."activityReportId" = ${instance.id}
              AND aro."objectiveId" IN (${objectiveIds.join(',')})
            )
            UPDATE "ObjectiveTopics" t
            SET "onApprovedAR" = true
            FROM "TopicsOnReport" tr
            WHERE t."onApprovedAR" = false
            AND t."objectiveId" = tr."objectiveId"
            AND t."topicId" = tr."topicId";
          `, { transaction: options.transaction }),
        ]);
      }
      /*  Determine Objective Statuses (Other > Approved) */
      await determineObjectiveStatus(instance.id, sequelize, false);

      await sequelize.models.Goal.update(
        { onApprovedAR: true },
        {
          where: {
            id: objectivesAndGoals.map((o) => o.goalId),
            onApprovedAR: false,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    }
  }
};

const automaticStatusChangeOnApprovalForGoals = async (sequelize, instance, options) => {
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
          status: ['Draft', 'Not Started'],
        },
        include: [
          {
            model: sequelize.models.Objective,
            as: 'objectives',
          },
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

    await Promise.all((goals.map((goal) => {
      const status = 'In Progress';

      // if the goal should be in a different state, we will update it
      if (goal.status !== status) {
        goal.set('previousStatus', goal.status);
        goal.set('status', status);
      }
      return goal.save({ transaction: options.transaction, individualHooks: true });
    })));
  }
};

const automaticIsRttapaChangeOnApprovalForGoals = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          isRttapa: { [Op.or]: [null, 'No'] },
        },
        include: [
          {
            model: sequelize.models.ActivityReportGoal,
            as: 'activityReportGoals',
            required: true,
            where: { activityReportId: instance.id },
          },
        ],
        transaction: options.transaction,
      },
    );

    await Promise.all((goals.map((goal) => {
      if (['Yes', 'No'].includes(goal.activityReportGoals[0].isRttapa)) {
        goal.set('isRttapa', goal.activityReportGoals[0].isRttapa);
      }

      return goal.save({ transaction: options.transaction, individualHooks: true });
    })));
  }
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
  copyStatus(instance);
};

const getActivityReportDocument = async (sequelize, instance) => {
  const data = await collectModelData(
    [instance.id],
    AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
    sequelize,
  );
  return formatModelForAwsElasticsearch(
    AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
    { ...data, ar: { ...instance.dataValues } },
  );
};

const updateAwsElasticsearchIndexes = async (sequelize, instance) => {
  // AWS Elasticsearch: Determine if we queue delete or update index document.
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('calculatedStatus')) {
    if (instance.previous('calculatedStatus') !== REPORT_STATUSES.DELETED
        && instance.calculatedStatus === REPORT_STATUSES.DELETED) {
      // Delete Index Document for AWS Elasticsearch.
      if (!process.env.CI) {
        await scheduleDeleteIndexDocumentJob(
          instance.id,
          AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
        );
      } else {
        // Create a job to run without worker.
        const job = {
          data: {
            indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
            id: instance.id,
          },
        };
        await deleteIndexDocument(job);
      }
    } else if ((instance.previous('calculatedStatus') !== REPORT_STATUSES.SUBMITTED
      && instance.calculatedStatus === REPORT_STATUSES.SUBMITTED)
      || (instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
      && instance.calculatedStatus === REPORT_STATUSES.APPROVED)) {
      // Index for AWS Elasticsearch.
      const document = await getActivityReportDocument(sequelize, instance);
      if (!process.env.CI) {
        await scheduleUpdateIndexDocumentJob(
          instance.id,
          AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
          document,
        );
      } else {
        // Create a job to run without worker.
        const job = {
          data: {
            indexName: AWS_ELASTIC_SEARCH_INDEXES.ACTIVITY_REPORTS,
            id: instance.id,
            document,
          },
        };
        await addIndexDocument(job);
      }
    }
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
  setSubmittedDate(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateSubmissionStatus(sequelize, instance, options);
  await propagateApprovedStatus(sequelize, instance, options);
  await automaticStatusChangeOnApprovalForGoals(sequelize, instance, options);
  await automaticGoalObjectiveStatusCachingOnApproval(sequelize, instance, options);
  await moveDraftGoalsToNotStartedOnSubmission(sequelize, instance, options);
  await automaticIsRttapaChangeOnApprovalForGoals(sequelize, instance, options);
  await updateAwsElasticsearchIndexes(sequelize, instance);
};

export {
  copyStatus,
  propagateApprovedStatus,
  propagateSubmissionStatus,
  automaticStatusChangeOnApprovalForGoals,
  beforeValidate,
  beforeCreate,
  beforeUpdate,
  afterUpdate,
  moveDraftGoalsToNotStartedOnSubmission,
  setSubmittedDate,
};
