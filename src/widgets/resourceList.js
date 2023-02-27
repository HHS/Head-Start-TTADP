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

export async function resourceData(scopes) {
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
  reports = viaReport.reduce((clusteredReports, report) => {
    const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
    if (exists) {
      exists.dataValues.resourceObjects = [
        ...(exists.dataValues.resourceObjects
          ? exists.dataValues.resourceObjects
          : []),
        ...report.dataValues.resourceObjects,
      ];
      return clusteredReports;
    }

    return [
      ...clusteredReports,
      report,
    ];
  }, reports);

  reports = viaSpecialistNextSteps.reduce((clusteredReports, report) => {
    const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
    if (exists) {
      exists.dataValues.resourceObjects = [
        ...(exists.dataValues.resourceObjects
          ? exists.dataValues.resourceObjects
          : []),
        ...report.dataValues.resourceObjects,
      ];
      return clusteredReports;
    }

    return [
      ...clusteredReports,
      report,
    ];
  }, allReports);

  reports = viaRecipientNextSteps.reduce((clusteredReports, report) => {
    const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
    if (exists) {
      exists.dataValues.resourceObjects = [
        ...(exists.dataValues.resourceObjects
          ? exists.dataValues.resourceObjects
          : []),
        ...report.dataValues.resourceObjects,
      ];
      return clusteredReports;
    }

    return [
      ...clusteredReports,
      report,
    ];
  }, allReports);

  reports = viaObjectives.reduce((clusteredReports, report) => {
    const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
    if (exists) {
      exists.dataValues.resourceObjects = [
        ...(exists.dataValues.resourceObjects
          ? exists.dataValues.resourceObjects
          : []),
        ...report.dataValues.resourceObjects,
      ];
      return clusteredReports;
    }

    return [
      ...clusteredReports,
      report,
    ];
  }, allReports);

  reports = viaGoals.reduce((clusteredReports, report) => {
    const exists = clusteredReports.find((r) => r.dataValues.id === report.dataValues.id);
    if (exists) {
      exists.dataValues.resourceObjects = [
        ...(exists.dataValues.resourceObjects
          ? exists.dataValues.resourceObjects
          : []),
        ...report.dataValues.resourceObjects,
      ];
      return clusteredReports;
    }

    return [
      ...clusteredReports,
      report,
    ];
  }, allReports);

  reports = reports
    .map((r) => r.dataValues)
    .map(({
      id,
      numberOfParticipants,
      topics,
      startDate,
      recipients,
      resourceObjects,
    }) => ({
      id,
      numberOfParticipants,
      topics,
      startDate,
      recipients,
      resources: resourceObjects,
    }));

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
        }) => {
          if (!output[resourceId]) {
            output[resourceId] = {
              resourceId,
              url,
              domain,
              sourceFields: sourceFields.map((sourceField) => ({ tableType, sourceField })),
              reports: [],
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
  const resources = switchToResourceCentric(reports);
  const resourcesWithRecipients = resources.map((data) => {
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

  return { resources: resourcesWithRecipients, reports };
}

const recipientAddUnique = (currentRecipients, newRecipients) => newRecipients
  .reduce((recipients, recipient) => {
    const exists = recipients.find((r) => r.recipientId === recipient.recipientId);
    if (exists) {
      exists.grantIds = [...new Set([...exists.grantIds, recipient.grantId])];
      return recipients;
    }

    return [
      ...recipients,
      {
        recipientId: recipient.recipientId,
        grantIds: [recipient.grantId],
      },
    ];
  }, currentRecipients);

async function generateResourceList(
  precalculatedData, // data generated from calling resourceData
  removeLists, // exclude list of report ids and recipient ids from result
  includeNone, // include none record in result
) {
  const { resources: res, reports } = precalculatedData;
  let resourceCounts = res.reduce(
    (resources, resource) => {
      const {
        activityReportId,
        url,
        domain,
        recipients,
      } = resource;
      const exists = resources.find((o) => o.url === url);
      if (exists) {
        exists.reports.add(activityReportId);
        exists.recipients = recipientAddUnique(exists.recipients, recipients);
        exists.count += 1;
        return resources;
      }

      return [...resources, {
        domain,
        name: url,
        url,
        count: 1,
        reports: new Set([activityReportId]),
        recipients: recipientAddUnique([], recipients),
      }];
    },
    [],
  );

  resourceCounts = resourceCounts.map((rc) => ({
    ...rc,
    participantCount: [...rc.reports]
      .reduce((acc, reportId) => acc + reports
        .filter((r) => r.id === reportId)
        .reduce((a, r) => a + r.numberOfParticipants, 0), 0),
  }));
  resourceCounts = resourceCounts.map((rc) => ({
    ...rc,
    reportCount: rc.reports.size,
    recipientCount: rc.recipients.length,
  }));
  if (removeLists) {
    resourceCounts = resourceCounts.map((rc) => ({
      ...rc,
      reports: undefined,
      recipients: undefined,
    }));
  }

  if (includeNone) {
    const allReportIds = new Set([...reports.map((r) => r.id)]);
    const allReportIdsWithResources = new Set([...res.map((r) => r.activityReportId)]);
    const noneCnt = (allReportIds.size - allReportIdsWithResources.size);
    if (noneCnt) {
      const allRecipeintIds = new Set([...reports.map((r) => r['activityRecipients.grant.recipientId'])].flat());
      const allRecipientIdsWithResources = new Set([
        ...res.map((r) => r.recipients.recipientId),
      ].flat());
      const noneRecipeintCnt = (allRecipeintIds.size - allRecipientIdsWithResources.size);
      const allReportIdsWithoutResources = new Set([...allReportIds]
        .filter((r) => !allReportIdsWithResources.has(r)));
      const noneParticipantCount = reports
        .filter((r) => allReportIdsWithoutResources.has(r.id))
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
}

async function generateResourceDomainList(
  precalculatedData, // data generated from calling resourceData
  removeLists, // exclude list of report ids and recipient ids from result
) {
  const data = await generateResourceList(precalculatedData, false, false);

  let domainCounts = data.reduce((domains, resource) => {
    const {
      domain,
      url,
      count,
      reports,
      recipients,
    } = resource;
    const exists = domains.find((o) => o.domain === domain);
    if (exists) {
      reports.forEach(exists.reports.add, exists.reports);
      recipients.forEach(exists.recipients.add, exists.recipients);
      exists.resources.add(url);
      exists.count += count;
      return domains;
    }

    return [...domains, {
      domain,
      count,
      reports,
      recipients: new Set(resource.recipients),
      resources: new Set([url]),
    }];
  }, []);

  domainCounts = domainCounts.map((dc) => ({
    ...dc,
    reportCount: dc.reports.size,
    recipientCount: dc.recipients.size,
    resourceCount: dc.resources.size,
  }));

  if (removeLists) {
    domainCounts = domainCounts.map((dc) => ({
      ...dc,
      reports: undefined,
      recipients: undefined,
      resources: undefined,
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

export async function resourceList(scopes) {
  const data = await resourceData(scopes);
  return generateResourceList(data, true, true);
}
export async function resourceDomainList(scopes) {
  const data = await resourceData(scopes);
  return generateResourceDomainList(data, true);
}

export async function resourcesDashboardOverview(scopes) {
  const { resources, reports } = await resourceData(scopes);

  const domainData = await generateResourceDomainList({ resources, reports }, false);

  const data = {};
  // report based intermediate data
  data.reportIntermediate = {};
  data.reportIntermediate
    .reportsWithResources = new Set(resources.flatMap((r) => r.reports).map((r) => r.id));
  data.reportIntermediate
    .allRecipientIdsWithEclkcResources = new Set(resources
      .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
      .flatMap((r) => r.reports)
      .map((r) => r.id));
  data.reportIntermediate
    .allRecipientIdsWithNonEclkcResources = new Set(resources
      .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
      .flatMap((r) => r.reports)
      .map((r) => r.id));

  // report based stats
  data.report = {};
  data.report.num = reports.length;
  data.report.numResources = data.reportIntermediate.reportsWithResources.size;
  data.report.percentResources = (data.report.numResources / data.report.num) * 100.0;

  data.report.numNoResources = data.report.num - data.report.numResources;
  data.report.percentNoResources = (data.report.numNoResources / data.report.num) * 100.0;

  data.report.numEclkc = data.reportIntermediate.allRecipientIdsWithEclkcResources.size;
  data.report.percentEclkc = (data.report.numEclkc / data.report.num) * 100.0;

  data.report.numNonEclkc = data.reportIntermediate.allRecipientIdsWithNonEclkcResources.size;
  data.report.percentNonEclkc = (data.report.numNonEclkc / data.report.num) * 100.0;

  // recipient based intermediate data
  data.recipientIntermediate = {};
  data.recipientIntermediate
    .allRecipeintIds = reports
      .flatMap((r) => r.recipients)
      .reduce((currentRecipients, recipient) => {
        const exists = currentRecipients.find((cr) => (
          (cr.recipientId === recipient.recipientId && recipient.recipientId)
          || (cr.otherEntityId === recipient.otherEntityId && recipient.otherEntityId)));
        if (exists) {
          return currentRecipients;
        }
        return [
          ...currentRecipients,
          recipient,
        ];
      }, []);
  data.recipientIntermediate
    .allRecipientIdsWithResources = resources
      .flatMap((r) => r.recipients)
      .reduce((currentRecipients, recipient) => {
        const exists = currentRecipients.find((cr) => (
          (cr.recipientId === recipient.recipientId && recipient.recipientId)
          || (cr.otherEntityId === recipient.otherEntityId && recipient.otherEntityId)));
        if (exists) {
          return currentRecipients;
        }
        return [
          ...currentRecipients,
          recipient,
        ];
      }, []);
  // TODO: fix
  data.recipientIntermediate.allRecipientIdsWithEclkcResources = new Set();
  data.recipientIntermediate.allRecipientIdsWithNonEclkcResources = new Set();
  // data.recipientIntermediate.allRecipientIdsWithEclkcResources = new Set([
  //   ...domainData
  //     .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
  //     .map((dd) => [...dd.recipients]),
  // ].flat());
  // data.recipientIntermediate.allRecipientIdsWithNonEclkcResources = new Set([
  //   ...domainData
  //     .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
  //     .map((dd) => [...dd.recipients]),
  // ].flat());

  // recipient based stats
  data.recipient = {};
  data.recipient.num = data.recipientIntermediate.allRecipeintIds.size;
  data.recipient.numResources = data.recipientIntermediate.allRecipientIdsWithResources.length;
  data.recipient
    .percentResources = (data.recipient.numResources / data.recipient.num) * 100.0;

  data.recipient.numNoResources = data.recipient.num - data.recipient.numResources;
  data.recipient.percentNoResources = (data.recipient.numNoResources / data.recipient.num) * 100.0;

  data.recipient.numEclkc = data.recipientIntermediate.allRecipientIdsWithEclkcResources.size;
  data.recipient.percentEclkc = (data.recipient.numEclkc / data.recipient.num) * 100.0;

  data.recipient.numNonEclkc = data.recipientIntermediate.allRecipientIdsWithNonEclkcResources.size;
  data.recipient.percentNonEclkc = (data.recipient.numNonEclkc / data.recipient.num) * 100.0;

  // resource based intermediate data
  data.resourceIntermediate = {};
  data.resourceIntermediate
    .allResources = new Set([...domainData.map((dd) => [...dd.resources])].flat());
  data.resourceIntermediate.allEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.resources]),
  ].flat());
  data.resourceIntermediate.allNonEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.resources]),
  ].flat());

  // resource based stats
  data.resource = {};
  data.resource.num = data.resourceIntermediate.allResources.size;

  data.resource.numEclkc = data.resourceIntermediate.allEclkcResources.size;
  data.resource.percentEclkc = (data.resource.numEclkc / data.resource.num) * 100.0;

  data.resource.numNonEclkc = data.resourceIntermediate.allNonEclkcResources.size;
  data.resource.percentNonEclkc = (data.resource.numNonEclkc / data.resource.num) * 100.0;

  data.participant = {};
  data.participant.num = reports
    .map((r) => ({
      activityReportId: r.id,
      participants: r.numberOfParticipants,
    }))
    .reduce((partialSum, r) => partialSum + r.participants, 0);

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
}

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
export async function resourceUse(scopes) {
  const { resources, reports } = await resourceData(scopes);
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
}
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
