import { Sequelize, Op, QueryTypes } from 'sequelize';
import {
  ActivityReport,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  ActivityReportResource,
  ActivityRecipient,
  Grant,
  NextStep,
  NextStepResource,
  Goal,
  Objective,
  OtherEntity,
  Recipient,
  Resource,
  Topic,
  sequelize,
} from '../models';
import { formatNumber } from './helpers';
import { REPORT_STATUSES, RESOURCE_DOMAIN } from '../constants';

const reduceRecipients = (source, adding) => adding.reduce((recipients, recipient) => {
  const exists = recipients.find((r) => (
    (r.recipientId === recipient.recipientId && recipient.recipientId)
    || (r.otherEntityId === recipient.otherEntityId && recipient.otherEntityId)));
  if (exists) {
    exists.grantIds = [...new Set([
      ...exists.grantIds,
      ...(recipient.grantIds || []),
      recipient.grantId,
    ])].filter((g) => g);
    return recipients;
  }
  return [
    ...recipients,
    {
      recipientId: recipient.recipientId,
      grantIds: [...(recipient.grantIds || []), recipient.grantId].filter((g) => g),
      otherEntityId: recipient.otherEntityId,
    },
  ];
}, source);

// merge a set of resources into the full reports list
const mergeInResources = (currentData, additionalData) => additionalData.reduce((
  clusteredReports,
  report,
) => {
  const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
  if (exists) {
    exists.dataValues.resourceObjects = [
      ...(exists.dataValues.resourceObjects
        ? exists.dataValues.resourceObjects
        : []),
      ...report.dataValues.resourceObjects,
    ];
    exists.dataValues.resourceObjects = (report.dataValues.resourceObjects || [])
      .reduce((resourceObjects, resourceObject) => {
        const roExists = resourceObjects
          .find((ro) => ro.resourceId === resourceObject.resourceId);
        if (roExists) {
          roExists.sourceFields = resourceObject.sourceFields
            .map((sourceField) => ({
              tableType: resourceObject.tableType,
              sourceField,
            }))
            .reduce((sourceFields, sourceField) => {
              const sfExists = sourceFields
                .find((sf) => sf.tableType === sourceField.tableType
                && sf.sourceField === sourceField.sourceField);
              if (sfExists) {
                return sourceFields;
              }
              return [...sourceFields, sourceField];
            }, roExists.sourceFields);
          return resourceObjects;
        }
        return [
          ...resourceObjects,
          {
            ...resourceObject,
            sourceFields: resourceObject.sourceFields.map((sourceField) => ({
              tableType: resourceObject.tableType,
              sourceField,
            })),
          },
        ];
      }, (exists.dataValues.resourceObjects || []));
    return clusteredReports;
  }

  return [
    ...clusteredReports,
    report,
  ];
}, currentData);

// restructure the input from report centric to resource centric
const switchToResourceCentric = (input) => {
  const output = {};
  input.forEach(({
    id,
    numberOfParticipants,
    topics,
    startDate,
    recipients,
    resources: resourceObjects,
  }) => {
    if (resourceObjects) {
      resourceObjects.forEach(({
        resourceId,
        url,
        domain,
        tableType,
        sourceFields,
        topics: resourceTopics,
      }) => {
        if (!output[resourceId]) {
          output[resourceId] = {
            resourceId,
            url,
            domain,
            sourceFields,
            reports: [],
            topics: resourceTopics,
          };
        }
        output[resourceId].reports.push({
          id,
          numberOfParticipants,
          topics,
          startDate,
          recipients,
        });
      });
    }
  });
  return Object.values(output);
};

// restructure the input from report centric to resource centric
const switchToTopicCentric = (input) => {
  const output = {};
  input.forEach(({
    id,
    numberOfParticipants,
    topics,
    startDate,
    recipients: recipientObjects,
    resources: resourceObjects,
  }) => {
    if (topics) {
      topics.forEach((topic) => {
        if (!output[topic]) {
          output[topic] = {
            topic,
            reports: [],
            resources: [],
            recipients: [],
          };
        }
        output[topic].reports.push({
          id,
          numberOfParticipants,
          startDate,
        });
        output[topic].resources = (resourceObjects || []).reduce((resources, resource) => {
          const exists = resources.find((r) => r.resourceId === resource.resourceId);
          if (exists) {
            return resources;
          }
          return [...resources, resource];
        }, output[topic].resources);
        output[topic].recipients = reduceRecipients(output[topic].recipients, recipientObjects);
      });
    }
    if (resourceObjects) {
      resourceObjects.forEach(({
        topics: resourceTopics,
      }) => {
        if (resourceTopics) {
          resourceTopics.forEach((topic) => {
            if (!output[topic]) {
              output[topic] = {
                topic,
                reports: [],
                resources: [],
                recipients: [],
              };
            }
            output[topic].reports = [{
              id,
              numberOfParticipants,
              startDate,
            }].reduce((reports, report) => {
              const exists = reports.find((r) => r.id === report.id);
              if (exists) {
                return reports;
              }
              return [...reports, report];
            }, output[topic].reports);
            output[topic].resources = (resourceObjects || []).reduce((resources, resource) => {
              const exists = resources.find((r) => r.resourceId === resource.resourceId);
              if (exists) {
                return resources;
              }
              return [...resources, resource];
            }, output[topic].resources);
            output[topic].recipients = reduceRecipients(output[topic].recipients, recipientObjects);
          });
        }
      });
    }
  });
  return Object.values(output);
};

// collect all resource data from the db filtered via the scopes
export async function resourceData(scopes, skipResources = false, skipTopics = false) {
  // Query Database for all Resources within the scope.
  const [
    allReports,
    viaReport,
    viaSpecialistNextSteps,
    viaRecipientNextSteps,
    viaObjectives,
    viaGoals,
  ] = await Promise.all([
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
      ],
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        [sequelize.fn('COALESCE', 'startDate', 'createdAt'), 'startDate'],
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'jsonb_build_object',
            sequelize.literal('\'resourceId\''),
            sequelize.literal('"resources"."id"'),
            sequelize.literal('\'url\''),
            sequelize.literal('"resources"."url"'),
            sequelize.literal('\'domain\''),
            sequelize.literal('"resources"."domain"'),
            sequelize.literal('\'sourceFields\''),
            sequelize.literal('"resources->ActivityReportResource"."sourceFields"'),
            sequelize.literal('\'tableType\''),
            sequelize.literal('\'report\''),
          ),
        ),
        'resourceObjects'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: Resource,
          as: 'resources',
          attributes: [],
          through: {
            attributes: [],
          },
          required: true,
        },
      ],
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'resourceId\''),
              sequelize.literal('"specialistNextSteps->resources"."id"'),
              sequelize.literal('\'url\''),
              sequelize.literal('"specialistNextSteps->resources"."url"'),
              sequelize.literal('\'domain\''),
              sequelize.literal('"specialistNextSteps->resources"."domain"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal('"specialistNextSteps->resources->NextStepResource"."sourceFields"'),
              sequelize.literal('\'tableType\''),
              sequelize.literal('\'specialistNextStep\''),
            ),
          ),
        ),
        'resourceObjects'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: NextStep,
          as: 'specialistNextSteps',
          attributes: [],
          include: [{
            model: Resource,
            as: 'resources',
            attributes: [],
            through: {
              attributes: [],
            },
            required: true,
          }],
          required: true,
        },
      ],
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'resourceId\''),
              sequelize.literal('"recipientNextSteps->resources"."id"'),
              sequelize.literal('\'url\''),
              sequelize.literal('"recipientNextSteps->resources"."url"'),
              sequelize.literal('\'domain\''),
              sequelize.literal('"recipientNextSteps->resources"."domain"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal('"recipientNextSteps->resources->NextStepResource"."sourceFields"'),
              sequelize.literal('\'tableType\''),
              sequelize.literal('\'recipientNextStep\''),
            ),
          ),
        ),
        'resourceObjects'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: NextStep,
          as: 'recipientNextSteps',
          attributes: [],
          include: [{
            model: Resource,
            as: 'resources',
            attributes: [],
            through: {
              attributes: [],
            },
            required: true,
          }],
          required: true,
        },
      ],
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'resourceId\''),
              sequelize.literal('"activityReportObjectives->resources"."id"'),
              sequelize.literal('\'url\''),
              sequelize.literal('"activityReportObjectives->resources"."url"'),
              sequelize.literal('\'domain\''),
              sequelize.literal('"activityReportObjectives->resources"."domain"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal('"activityReportObjectives->resources->ActivityReportObjectiveResource"."sourceFields"'),
              sequelize.literal('\'tableType\''),
              sequelize.literal('\'recipientNextStep\''),
              sequelize.literal('\'topics\''),
              sequelize.literal(`(
                SELECT ARRAY_AGG(t."name")
                FROM "ActivityReportObjectiveTopics" arot
                JOIN "Topics" t
                ON arot."topicId" = t.id
                WHERE arot."activityReportObjectiveId" = "activityReportObjectives"."id"
                GROUP BY TRUE
              )`),
            ),
          ),
        ),
        'resourceObjects'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
          {
            [Op.or]: [
              { '$activityRecipients.grantId$': { [Op.eq]: Sequelize.col('activityReportObjectives.objective.goal.grantId') } },
              { '$activityRecipients.otherEntityId$': { [Op.eq]: Sequelize.col('activityReportObjectives.objective.otherEntityId') } },
            ],
          },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          attributes: [],
          include: [
            {
              model: Resource,
              as: 'resources',
              attributes: [],
              through: {
                attributes: [],
              },
              required: true,
            },
            {
              model: Objective,
              as: 'objective',
              attributes: [],
              required: true,
              include: [
                {
                  model: Goal,
                  as: 'goal',
                  attributes: [],
                  required: false,
                },
              ],
            },
            {
              model: Topic,
              as: 'topics',
              attributes: [],
              through: {
                attributes: [],
              },
            },
          ],
          required: true,
        },
      ],
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'json_agg',
          sequelize.fn(
            'json_build_object',
            sequelize.literal('\'grantId\''),
            sequelize.literal('"activityRecipients->grant"."id"'),
            sequelize.literal('\'recipientId\''),
            sequelize.literal('"activityRecipients->grant"."recipientId"'),
            sequelize.literal('\'otherEntityId\''),
            sequelize.literal('"activityRecipients"."otherEntityId"'),
          ),
        ),
        'recipients'],
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'resourceId\''),
              sequelize.literal('"activityReportGoals->resources"."id"'),
              sequelize.literal('\'url\''),
              sequelize.literal('"activityReportGoals->resources"."url"'),
              sequelize.literal('\'domain\''),
              sequelize.literal('"activityReportGoals->resources"."domain"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal('"activityReportGoals->resources->ActivityReportGoalResource"."sourceFields"'),
              sequelize.literal('\'tableType\''),
              sequelize.literal('\'recipientNextStep\''),
              sequelize.literal('\'topics\''),
              sequelize.literal(`(
                SELECT ARRAY_AGG(t."name")
                FROM "ActivityReportObjectiveTopics" arot
                JOIN "Topics" t
                ON arot."topicId" = t.id
                WHERE arot."activityReportObjectiveId" = "activityReportObjectives"."id"
                GROUP BY TRUE
              )`),
            ),
          ),
        ),
        'resourceObjects'],
      ],
      group: [
        '"ActivityReport"."id"',
        '"ActivityReport"."numberOfParticipants"',
        '"ActivityReport"."topics"',
        '"ActivityReport"."startDate"',
      ],
      where: {
        [Op.and]: [
          scopes.activityReport,
          { calculatedStatus: REPORT_STATUSES.APPROVED },
          {
            [Op.or]: [
              { '$activityRecipients.grantId$': { [Op.eq]: Sequelize.col('activityReportGoals.goal.grantId') } },
              { '$activityReportGoals.id$': null },
            ],
            [Op.or]: [
              { '$activityReportGoals.goalId$': { [Op.eq]: Sequelize.col('activityReportObjectives.objective.goalId') } },
              { '$activityReportGoals.id$': null },
            ],
          },
        ],
      },
      include: [
        {
          model: ActivityRecipient.scope(),
          as: 'activityRecipients',
          attributes: [],
          required: true,
          include: [
            {
              model: Grant.scope(),
              as: 'grant',
              attributes: [],
              required: false,
            },
          ],
        },
        {
          model: ActivityReportGoal,
          as: 'activityReportGoals',
          attributes: [],
          // separate: true,
          include: [
            {
              model: Resource,
              as: 'resources',
              attributes: [],
              through: {
                attributes: [],
              },
              required: true,
            },
            {
              model: Goal,
              as: 'goal',
              attributes: [],
              required: true,
            },
          ],
          required: true,
        },
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          attributes: [],
          include: [
            {
              model: Objective,
              as: 'objective',
              attributes: [],
              required: true,
            },
            {
              model: Topic,
              as: 'topics',
              attributes: [],
              through: {
                attributes: [],
              },
            },
          ],
          required: true,
        },
      ],
    }),
  ]);

  let reports = allReports;
  reports = mergeInResources(reports, viaReport);
  reports = mergeInResources(reports, viaSpecialistNextSteps);
  reports = mergeInResources(reports, viaRecipientNextSteps);
  reports = mergeInResources(reports, viaObjectives);
  reports = mergeInResources(reports, viaGoals);

  reports = reports
    .map((r) => ({
      id: r.dataValues.id,
      numberOfParticipants: r.dataValues.numberOfParticipants,
      topics: r.dataValues.topics,
      startDate: r.dataValues.startDate,
      recipients: r.dataValues.recipients,
      resources: r.dataValues.resourceObjects,
    }));

  let resourcesWithRecipients = [];
  if (!skipResources) {
    const resources = switchToResourceCentric(reports);
    resourcesWithRecipients = resources.map((data) => {
      const participants = data.reports
        .reduce((accumulator, r) => accumulator + r.numberOfParticipants, 0);
      const startDates = data.reports
        .map((r) => r.startDate);
      const recipients = data.reports
        .flatMap((r) => r.recipients)
        .reduce((currentRecipient, { recipientId, grantId, otherEntityId }) => {
          const exists = currentRecipient.find((cr) => (
            cr.recipientId === recipientId
            || cr.otherEntityId === otherEntityId));
          if (exists) {
            exists.grantIds = grantId
              ? [...new Set([...exists.grantIds, grantId])]
              : exists.grantId;
            return currentRecipient;
          }
          return [
            ...currentRecipient,
            {
              recipientId,
              grantIds: [grantId].filter((g) => g),
              otherEntityId,
            },
          ];
        }, []);
      return {
        ...data,
        participants,
        startDates,
        recipients,
      };
    });
  }

  let topicsWithAdditionalData = [];
  if (!skipTopics) {
    const topics = switchToTopicCentric(reports);
    topicsWithAdditionalData = topics.map((data) => {
      const participants = data.reports
        .reduce((accumulator, r) => accumulator + r.numberOfParticipants, 0);
      const startDates = data.reports
        .map((r) => r.startDate);
      return {
        ...data,
        participants,
        startDates,
      };
    });
  }

  return { resources: resourcesWithRecipients, reports, topics: topicsWithAdditionalData };
}


const generateResourceList = (
  precalculatedData, // data generated from calling resourceData
  removeLists, // exclude list of report ids and recipient ids from result
  includeNone, // include none record in result
) => {
  const { resources: res, reports } = precalculatedData;
  let resourceCounts = res
    .map((rc) => ({
      name: rc.url,
      url: rc.url,
      count: rc.reports.length,
      reportCount: rc.reports.length,
      participantCount: rc.participants,
      recipientCount: rc.recipients.length,
    }));
  if (removeLists) {
    resourceCounts = resourceCounts.map((rc) => ({
      ...rc,
      reports: undefined,
      recipients: undefined,
      startDates: undefined,
    }));
  }

  if (includeNone) {
    const allReportIds = reports.map((r) => r.id);
    const allReportIdsWithResources = reports
      .filter((r) => r.resources)
      .map((r) => r.id);
    const noneCnt = (allReportIds.length - allReportIdsWithResources.length);
    if (noneCnt) {
      const allRecipeintIds = reduceRecipients([], reports.flatMap((r) => r.recipients));
      const allRecipientIdsWithResources = reduceRecipients(
        [],
        reports.filter((r) => r.resources).flatMap((r) => r.recipients),
      );
      const noneRecipeintCnt = (allRecipeintIds.length - allRecipientIdsWithResources.length);
      const allReportIdsWithoutResources = allReportIds
        .filter((id) => !allReportIdsWithResources.includes(id));
      const noneParticipantCount = reports
        .filter((r) => allReportIdsWithoutResources.includes(r.id))
        .reduce((accumulator, r) => accumulator + r.numberOfParticipants, 0);
      resourceCounts.push({
        name: 'none',
        url: null,
        count: noneCnt,
        reportCount: noneCnt,
        recipientCount: noneRecipeintCnt,
        participantCount: noneParticipantCount,
      });
    }
  }

  // Sort By Count largest to smallest.
  resourceCounts.sort((r1, r2) => {
    if (r2.reportCount - r1.reportCount === 0) {
      if (r2.recipientCount - r1.recipientCount === 0) {
        if (r2.participantCount - r1.participantCount === 0) {
          // Break tie on url
          const url1 = r1.url ? r1.url.toUpperCase().replace(' ', '') : ''; // ignore upper and lowercase
          const url2 = r2.url ? r2.url.toUpperCase().replace(' ', '') : ''; // ignore upper and lowercase
          if (url1 < url2) {
            return -1;
          }
          if (url1 > url2) {
            return 1;
          }
        }
        return r2.participantCount - r1.participantCount;
      }
      return r2.recipientCount - r1.recipientCount;
    }
    return r2.reportCount - r1.reportCount;
  });
  return resourceCounts;
};

function generateResourceDomainList(
  precalculatedData, // data generated from calling resourceData
  removeLists, // exclude list of report ids and recipient ids from result
) {
  const { resources: res } = precalculatedData;

  let domainCounts = res.reduce((domains, resource) => {
    const exists = domains.find((d) => d.domain === resource.domain);
    if (exists) {
      exists.urls = [...new Set([...exists.urls, resource.url])];
      exists.count += resource.reports.length;
      exists.recipients = reduceRecipients(exists.recipients, resource.recipients);
      exists.reports = resource.reports.reduce((reports, report) => {
        const rExists = reports.find((r) => r.id === report.id);
        if (rExists) {
          return reports;
        }
        return [
          ...reports,
          report,
        ];
      }, exists.reports);
      return domains;
    }
    return [
      ...domains,
      {
        domain: resource.domain,
        urls: [resource.url],
        count: resource.reports.length,
        recipients: resource.recipients,
        reports: resource.reports,
      },
    ];
  }, []);

  domainCounts = domainCounts.map((dc) => ({
    ...dc,
    reportCount: dc.reports.length,
    recipientCount: dc.recipients.length,
    resourceCount: dc.urls.length,
  }));

  if (removeLists) {
    domainCounts = domainCounts.map(({
      domain, count, reportCount, recipientCount, resourceCount,
    }) => ({
      domain, count, reportCount, recipientCount, resourceCount,
    }));
  }

  // Sort By Count largest to smallest.
  domainCounts.sort((r1, r2) => {
    if (r2.reportCount - r1.reportCount === 0) {
      if (r2.recipientCount - r1.recipientCount === 0) {
        // Break tie on url
        const domain1 = r1.domain.toUpperCase().replace(' ', ''); // ignore upper and lowercase
        const domain2 = r2.domain.toUpperCase().replace(' ', ''); // ignore upper and lowercase
        if (domain1 < domain2) {
          return -1;
        }
        if (domain1 > domain2) {
          return 1;
        }
      }
      return r2.recipientCount - r1.recipientCount;
    }
    return r2.reportCount - r1.reportCount;
  });

  return domainCounts;
}

const generateResourcesDashboardOverview = (allData) => {
  const { resources, reports } = allData;

  // the commented out blocks are for stats that are currently not used

  const data = {};
  // report based intermediate data
  data.reportIntermediate = {};
  data.reportIntermediate
    .reportsWithResources = new Set(resources.flatMap((r) => r.reports).map((r) => r.id));
  // data.reportIntermediate
  //   .allRecipientIdsWithEclkcResources = new Set(resources
  //     .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
  //     .flatMap((r) => r.reports)
  //     .map((r) => r.id));
  // data.reportIntermediate
  //   .allRecipientIdsWithNonEclkcResources = new Set(resources
  //     .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
  //     .flatMap((r) => r.reports)
  //     .map((r) => r.id));

  // report based stats
  data.report = {};
  data.report.num = reports.length;
  data.report.numResources = data.reportIntermediate.reportsWithResources.size;
  data.report.percentResources = (data.report.numResources / data.report.num) * 100.0;

  data.report.numNoResources = data.report.num - data.report.numResources;
  data.report.percentNoResources = (data.report.numNoResources / data.report.num) * 100.0;

  // data.report.numEclkc = data.reportIntermediate.allRecipientIdsWithEclkcResources.size;
  // data.report.percentEclkc = (data.report.numEclkc / data.report.num) * 100.0;

  // data.report.numNonEclkc = data.reportIntermediate.allRecipientIdsWithNonEclkcResources.size;
  // data.report.percentNonEclkc = (data.report.numNonEclkc / data.report.num) * 100.0;

  // recipient based intermediate data
  data.recipientIntermediate = {};
  data.recipientIntermediate
    .allRecipientIds = reduceRecipients([], reports.flatMap((r) => r.recipients));
  data.recipientIntermediate
    .allRecipientIdsWithResources = reduceRecipients([], resources.flatMap((r) => r.recipients));
  // data.recipientIntermediate.allRecipientIdsWithEclkcResources = resources
  //   // filter to ECLKC
  //   .filter((r) => r.domain === RESOURCE_DOMAIN.ECLKC)
  //   // Collect recipients
  //   .flatMap((r) => r.recipients)
  //   // collect distinct recipients ( or other entities)
  //   .reduce((currentRecipients, recipient) => {
  //     const exists = currentRecipients.find((cr) => (
  //       (cr.recipientId === recipient.recipientId && recipient.recipientId)
  //       || (cr.otherEntityId === recipient.otherEntityId && recipient.otherEntityId)));
  //     if (exists) {
  //       return currentRecipients;
  //     }
  //     return [
  //       ...currentRecipients,
  //       recipient,
  //     ];
  //   }, []);
  // data.recipientIntermediate.allRecipientIdsWithNonEclkcResources = resources
  //   // filter to Non-ECLKC
  //   .filter((r) => r.domain !== RESOURCE_DOMAIN.ECLKC)
  //   // Collect recipients
  //   .flatMap((r) => r.recipients)
  //   // collect distinct recipients ( or other entities)
  //   .reduce((currentRecipients, recipient) => {
  //     const exists = currentRecipients.find((cr) => (
  //       (cr.recipientId === recipient.recipientId && recipient.recipientId)
  //       || (cr.otherEntityId === recipient.otherEntityId && recipient.otherEntityId)));
  //     if (exists) {
  //       return currentRecipients;
  //     }
  //     return [
  //       ...currentRecipients,
  //       recipient,
  //     ];
  //   }, []);

  // recipient based stats
  data.recipient = {};
  data.recipient.num = data.recipientIntermediate.allRecipientIds.length;
  data.recipient.numResources = data.recipientIntermediate.allRecipientIdsWithResources.length;
  data.recipient
    .percentResources = (data.recipient.numResources / data.recipient.num) * 100.0;

  data.recipient.numNoResources = data.recipient.num - data.recipient.numResources;
  data.recipient.percentNoResources = (data.recipient.numNoResources / data.recipient.num) * 100.0;

  // data.recipient.numEclkc = data.recipientIntermediate.allRecipientIdsWithEclkcResources.size;
  // data.recipient.percentEclkc = (data.recipient.numEclkc / data.recipient.num) * 100.0;

  // data.recipient.numNonEclkc = data
  //   .recipientIntermediate.allRecipientIdsWithNonEclkcResources.size;
  // data.recipient.percentNonEclkc = (data.recipient.numNonEclkc / data.recipient.num) * 100.0;

  // resource based intermediate data
  data.resourceIntermediate = {};
  data.resourceIntermediate
    .allResources = resources;
  data.resourceIntermediate.allEclkcResources = resources
    .filter((r) => r.domain === RESOURCE_DOMAIN.ECLKC);
  // data.resourceIntermediate.allNonEclkcResources = resources
  //   .filter((r) => r.domain !== RESOURCE_DOMAIN.ECLKC);

  // resource based stats
  data.resource = {};
  data.resource.num = data.resourceIntermediate.allResources.length;

  data.resource.numEclkc = data.resourceIntermediate.allEclkcResources.length;
  data.resource.percentEclkc = (data.resource.numEclkc / data.resource.num) * 100.0;

  // data.resource.numNonEclkc = data.resourceIntermediate.allNonEclkcResources.length;
  // data.resource.percentNonEclkc = (data.resource.numNonEclkc / data.resource.num) * 100.0;

  data.participant = {};
  data.participant.num = reports
    .map((r) => ({
      activityReportId: r.id,
      participants: r.numberOfParticipants,
    }))
    .reduce((partialSum, r) => partialSum + r.participants, 0);
  // data.participant.numEclkc = resources
  //   .filter((r) => r.domain === RESOURCE_DOMAIN.ECLKC)
  //   .flatMap((r) => r.reports)
  //   .reduce((rs, report) => {
  //     const exists = rs.find((r) => r.id === report.id);
  //     if (exists) {
  //       return rs;
  //     }
  //     return [...rs, report];
  //   }, [])
  //   .reduce((partialSum, r) => partialSum + r.participants, 0);
  // data.participant.numEclkc = resources
  //   .filter((r) => r.domain !== RESOURCE_DOMAIN.ECLKC)
  //   .flatMap((r) => r.reports)
  //   .reduce((rs, report) => {
  //     const exists = rs.find((r) => r.id === report.id);
  //     if (exists) {
  //       return rs;
  //     }
  //     return [...rs, report];
  //   }, [])
  //   .reduce((partialSum, r) => partialSum + r.participants, 0);

  return {
    report: {
      num: formatNumber(data.report.num),
      numResources: formatNumber(data.report.numResources),
      percentResources: `${formatNumber(data.report.percentResources, 2)}%`,
      // numNoResources: formatNumber(data.report.numNoResources),
      // percentNoResources: `${formatNumber(data.report.percentNoResources, 2)}%`,
      // numEclkc: formatNumber(data.report.numEclkc),
      // percentEclkc: `${formatNumber(data.report.percentEclkc, 2)}%`,
      // numNonEclkc: formatNumber(data.report.numNonEclkc),
      // percentNonEclkc: `${formatNumber(data.report.percentNonEclkc, 2)}%`,
    },
    resource: {
      num: formatNumber(data.resource.num),
      numEclkc: formatNumber(data.resource.numEclkc),
      percentEclkc: `${formatNumber(data.resource.percentEclkc, 2)}%`,
      // numNonEclkc: formatNumber(data.resource.numNonEclkc),
      // percentNonEclkc: `${formatNumber(data.resource.percentNonEclkc, 2)}%`,
    },
    recipient: {
      num: formatNumber(data.recipient.num),
      numResources: formatNumber(data.recipient.numResources),
      percentResources: `${formatNumber(data.recipient.percentResources, 2)}%`,
      // numNoResources: formatNumber(data.recipient.numNoResources),
      // percentNoResources: `${formatNumber(data.recipient.percentNoResources, 2)}%`,
      // numEclkc: formatNumber(data.recipient.numEclkc),
      // percentEclkc: `${formatNumber(data.recipient.percentEclkc, 2)}%`,
      // numNonEclkc: formatNumber(data.recipient.numNonEclkc),
      // percentNonEclkc: `${formatNumber(data.recipient.percentNonEclkc, 2)}%`,
    },
    participant: {
      numParticipants: formatNumber(data.participant.num),
    },
  };
};

/*
WidgetID: resourceDashboardOverview
Expected JSON (we have this now):

{
  report: {
    numResources: '8,135',
    num: '19,914',
    percentResources: '40.85%',
  },
  resource: {
    numEclkc: '1,819',
    num: '2,365',
    percentEclkc: '79.91%',
  },
  recipient: {
    numResources: '248',
  },
  participant: {
    numParticipants: '765',
  },
}
*/
const getMonthYear = (dateStr) => {
  // Create a Date object from the date string
  const dateObj = new Date(dateStr);

  // Get the month abbreviation from the month number
  const monthAbbreviation = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj);

  // Get the year as a two-digit string
  const yearStr = dateObj.getFullYear().toString().slice(-2);

  // Concatenate the month abbreviation and year string with a hyphen separator
  return `${monthAbbreviation}-${yearStr}`;
};

const getMinMax = (data) => {
  const dateObjects = data
    // Get an array of all startDates
    .flatMap((r) => r.startDates)
    .reduce((dates, date) => {
      const exists = dates.find((d) => d === date);
      if (exists) {
        return dates;
      }
      return [...dates, date];
    }, [])
    // Convert all dates to Date objects
    .map((dateString) => new Date(`${dateString}`))
    .filter((d) => !Number.isNaN(Date.parse(d)));

  // Find the minimum and maximum dates
  return {
    min: new Date(Math.min(...dateObjects)),
    max: new Date(Math.max(...dateObjects)),
  };
};

const spanDates = (min, max) => {
  const startYear = min.getFullYear();
  const startMonth = min.getMonth();
  const endYear = max.getFullYear();
  const endMonth = max.getMonth();
  const numMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

  return Array
    .from({ length: numMonths }, (_, index) => {
      const year = Math.floor(index / 12) + startYear;
      const month = (index % 12) + startMonth;
      const date = new Date(year, month).toLocaleDateString('default', { month: 'long', year: 'numeric' });
      return getMonthYear(date);
    })
    .map((monthYear) => ({ title: monthYear, cnt: 0 }));
};

const generateResourceUse = (allData) => {
  const { resources } = allData;
  const minMax = getMinMax(resources);
  const dateList = spanDates(minMax.min, minMax.max);

  const clusteredResources = resources
    .map((resource) => ({
      heading: resource.url,
      isUrl: true,
      data: [
        ...resource.startDates.reduce((data, startDate) => {
          const total = data.find((sd) => sd.title === 'Total');
          total.cnt += 1;

          const currentMonthYear = getMonthYear(startDate);
          const exists = data.find((sd) => sd.title === currentMonthYear);
          if (exists) {
            exists.cnt += 1;
            return data;
          }
          return [
            ...data,
            {
              title: currentMonthYear,
              cnt: 1,
            },
          ];
        }, [{ title: 'Total', cnt: 0 }]),
        ...dateList,
      ]
        .reduce((dates, date) => {
          const exists = dates.find((d) => d.title === date.title);
          if (exists) {
            exists.cnt += date.cnt;
            return dates;
          }
          return [
            ...dates,
            date,
          ];
        }, [])
        .map(({ title, cnt }) => ({
          title,
          value: formatNumber(cnt),
        })),
    }));

  // Total needs to be the last column.
  const sortedResourceData = clusteredResources.map((r) => {
    const newResourceData = [...r.data];
    newResourceData.push(newResourceData.shift());
    return {
      ...r,
      data: newResourceData,
    };
  });

  sortedResourceData.sort((a, b) => {
    const aTotal = Number(a.data.find((d) => d.title === 'Total').value);
    const bTotal = Number(b.data.find((d) => d.title === 'Total').value);
    if (aTotal > bTotal) return -1;
    if (aTotal < bTotal) return 1;
    if (a.heading < b.heading) return -1;
    if (a.heading > b.heading) return 1;
    return 0;
  });

  return {
    headers: [...dateList.map(({ title }) => title)],
    resources: sortedResourceData
      .slice(0, 10),
  };
};
/*
WidgetID: resourceUse
Expected JSON:
- We add a property for all headers.
- There is a TOTAL entry for each resource.
- Be sure to include 0 entries for every month in range.
{
  headers: ['Jan-22', 'Feb-22'],
  resources: [
    {
      heading: 'https://resource1.gov',
      isUrl: 'true',
      data: [
          {
            title: 'Jan-22',
             value: '17',
          },
          {
            title: 'Feb-22',
            value: '18',
          },
          {
            title: 'total',
            value: '100',
          },
        ],
    },
    {
      heading: 'https://resource2.gov',
      isUrl: 'true',
      data: [
          {
            title: 'Jan-22',
             value: '14',
          },
          {
            title: 'Feb-22',
            value: '20',
          },
          {
            title: 'total',
            value: '88',
          },
        ],
    },
  ],
},
*/

const generateResourceTopicUse = (allData) => {
  const { topics } = allData;
  const minMax = getMinMax(topics);
  const dateList = spanDates(minMax.min, minMax.max);

  const clusteredTopics = topics
    .map((topic) => ({
      heading: topic.topic,
      isUrl: false,
      data: [
        ...topic.startDates.reduce((data, startDate) => {
          const total = data.find((sd) => sd.title === 'Total');
          total.cnt += 1;

          const currentMonthYear = getMonthYear(startDate);
          const exists = data.find((sd) => sd.title === currentMonthYear);
          if (exists) {
            exists.cnt += 1;
            return data;
          }
          return [
            ...data,
            {
              title: currentMonthYear,
              cnt: 1,
            },
          ];
        }, [{ title: 'Total', cnt: 0 }]),
        ...dateList,
      ]
        .reduce((dates, date) => {
          const exists = dates.find((d) => d.title === date.title);
          if (exists) {
            exists.cnt += date.cnt;
            return dates;
          }
          return [
            ...dates,
            date,
          ];
        }, [])
        .map(({ title, cnt }) => ({
          title,
          value: formatNumber(cnt),
        })),
    }));

  // Total needs to be the last column.
  const sortedTopicData = clusteredTopics.map((r) => {
    const newTopicData = [...r.data];
    newTopicData.push(newTopicData.shift());
    return {
      ...r,
      data: newTopicData,
    };
  });

  sortedTopicData.sort((a, b) => {
    const aTotal = Number(a.data.find((d) => d.title === 'Total').value);
    const bTotal = Number(b.data.find((d) => d.title === 'Total').value);
    if (aTotal > bTotal) return -1;
    if (aTotal < bTotal) return 1;
    if (a.heading < b.heading) return -1;
    if (a.heading > b.heading) return 1;
    return 0;
  });

  return {
    headers: [...dateList.map(({ title }) => title)],
    topics: sortedTopicData
      .slice(0, 10),
  };
};

export async function resourceList(scopes) {
  const data = await resourceData(scopes, false, true);
  return generateResourceList(data, true, true);
}
export async function resourceDomainList(scopes) {
  const data = await resourceData(scopes, false, true);
  return generateResourceDomainList(data, true);
}

export async function resourcesDashboardOverview(scopes) {
  const data = await resourceData(scopes, false, true);
  return generateResourcesDashboardOverview(data);
}

export async function resourceUse(scopes) {
  const data = await resourceData(scopes, false, true);
  return generateResourceUse(data);
}

export async function resourceTopicUse(scopes) {
  const data = await resourceData(scopes, true, false);
  return generateResourceTopicUse(data);
}

export async function resourceDashboard(scopes) {
  const data = await resourceData(scopes);
  return {
    overview: generateResourcesDashboardOverview(data),
    use: generateResourceUse(data),
    topicUse: generateResourceTopicUse(data),
    domainList: generateResourceDomainList(data, true),
  };
}
