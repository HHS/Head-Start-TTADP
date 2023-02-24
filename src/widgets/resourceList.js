import { Op, QueryTypes } from 'sequelize';
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
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'numberOfParticipants', 'topics', 'startDate'],
    where: {
      [Op.and]: [
        scopes.activityReport,
        { calculatedStatus: REPORT_STATUSES.APPROVED },
      ],
    },
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        attributes: ['id'],
        required: true,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: ['id', 'recipientId'],
            required: false,
          },
          {
            model: OtherEntity,
            as: 'otherEntity',
            attributes: ['id'],
            required: false,
          },
        ],
      },
      {
        model: Resource,
        as: 'resources',
        attributes: ['id', 'url', 'domain'],
        through: {
          attributes: ['sourceFields'],
        },
        required: false,
      },
      {
        model: NextStep,
        as: 'specialistNextSteps',
        attributes: ['id'],
        include: [{
          model: Resource,
          as: 'resources',
          attributes: ['id', 'url', 'domain'],
          through: {
            attributes: ['sourceFields'],
          },
          required: false,
        }],
        required: false,
      },
      {
        model: NextStep,
        as: 'recipientNextSteps',
        attributes: ['id'],
        include: [{
          model: Resource,
          as: 'resources',
          attributes: ['id', 'url', 'domain'],
          through: {
            attributes: ['sourceFields'],
          },
          required: false,
        }],
        required: false,
      },
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: ['id'],
        separate: true,
        include: [
          {
            model: Resource,
            as: 'resources',
            attributes: ['id', 'url', 'domain'],
            through: {
              attributes: ['sourceFields'],
            },
            required: false,
          },
          {
            model: Objective,
            as: 'objective',
            attributes: ['id', 'goalId'],
            required: true,
          },
          {
            model: Topic,
            as: 'topics',
            attributes: ['id', 'name'],
          },
        ],
        required: false,
      },
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: ['id', 'goalId'],
        separate: true,
        include: [
          {
            model: Resource,
            as: 'resources',
            attributes: ['id', 'url', 'domain'],
            through: {
              attributes: ['sourceFields'],
            },
            required: false,
          },
          {
            model: Goal,
            as: 'goal',
            attributes: ['id'],
            required: true,
          },
        ],
        required: false,
      },
    ],
  });

  const reportIds = reports.map((r) => r.id);
  const reportResources = reports.reduce((reportData, report) => {
    const x = null;
    // collect topics from the objectives and the activity report
    let objectiveTopics = [];
    if (report.activityReportObjectives
      && Array.isArray(report.activityReportObjectives)
      && report.activityReportObjectives.length > 0) {
      objectiveTopics = report.activityReportObjectives
        .map((o) => o.topics.map((t) => t.dataValues.name))
        .flat(2);
    }
    const reportTopics = [...new Set([
      ...report.dataValues.topics,
      ...objectiveTopics.map((t) => t.name),
    ])];

    // collect the recipients
    let grantRecipients = [];
    let otherEntityRecipeints = [];
    if (report.activityRecipients
      && Array.isArray(report.activityRecipients)
      && report.activityRecipients.length > 0) {
      grantRecipients = report.activityRecipients
        .filter((r) => r.grant !== null)
        .map((r) => ({
          grantId: r.grant.dataValues.id,
          recipientId: r.grant.dataValues.recipientId,
        }));
      otherEntityRecipeints = report.activityRecipients
        .filter((r) => r.otherEntity !== null)
        .map((r) => ({
          otherEntityId: r.otherEntity.dataValues.id,
        }));
    }
    const recipients = [
      ...grantRecipients,
      ...otherEntityRecipeints,
    ];

    // resources
    const resourcesFromReport = report.resources
      && Array.isArray(report.resources)
      && report.resources.length > 0
      ? report.resources.map((r) => ({
        id: r.dataValues.id,
        url: r.dataValues.url,
        domain: r.dataValues.domain,
        sourceFields: r.ActivityReportResource.dataValues.sourceFields,
        tableType: 'report',
        ActivityReportResource: undefined,
        topics: reportTopics,
      }))
      : [];
    const resourcesFromSpecialistNextStep = report.specialistNextSteps
      && Array.isArray(report.specialistNextSteps)
      && report.specialistNextSteps.length > 0
      ? report.specialistNextSteps
        .map((sns) => sns.resources.map((r) => ({
          id: r.dataValues.id,
          url: r.dataValues.url,
          domain: r.dataValues.domain,
          sourceFields: r.NextStepResource.dataValues.sourceFields,
          tableType: 'specialistNextStep',
          NextStepResource: undefined,
          topics: reportTopics,
        })))
        .filter((r) => r)
      : [];
    const resourcesFromRecipientNextStep = report.recipientNextSteps
      && Array.isArray(report.recipientNextSteps)
      && report.recipientNextSteps.length > 0
      ? report.recipientNextSteps
        .map((rns) => rns.resources.map((r) => ({
          id: r.dataValues.id,
          url: r.dataValues.url,
          domain: r.dataValues.domain,
          sourceFields: r.NextStepResource.dataValues.sourceFields,
          tableType: 'recipientNextStep',
          NextStepResource: undefined,
          topics: reportTopics,
        })))
        .filter((r) => r)
      : [];
    const resourcesFromGoal = report.activityReportGoals
    && Array.isArray(report.activityReportGoals)
    && report.activityReportGoals.length > 0
      ? report.activityReportGoals
        .map((arg) => arg.resources.map((r) => ({
          id: r.dataValues.id,
          url: r.dataValues.url,
          domain: r.dataValues.domain,
          sourceFields: r.ActivityReportGoalResource.dataValues.sourceFields,
          tableType: 'goal',
          ActivityReportGoalResource: undefined,
          topics: [...new Set(report.activityReportObjectives
            .filter((aro) => aro.objective.dataValue.grantId
              === r.ActivityReportGoalResource.dataValues.goalId)
            .map((aro) => aro.topics.map((t) => t.dataValues.name))
            .flat())],
        })))
        .filter((r) => r)
      : [];
    const resourcesFromObjective = report.activityReportObjectives
    && Array.isArray(report.activityReportObjectives)
    && report.activityReportObjectives.length > 0
      ? report.activityReportObjectives
        .map((aro) => aro.resources.map((r) => ({
          id: r.dataValues.id,
          url: r.dataValues.url,
          domain: r.dataValues.domain,
          sourceFields: r.ActivityReportObjectiveResource.dataValues.sourceFields,
          tableType: 'objective',
          topics: aro.topics.map((t) => t.dataValues.name),
        })))
        .filter((r) => r)
      : [];
    const resourceFromFields = [
      ...resourcesFromReport,
      ...resourcesFromSpecialistNextStep,
      ...resourcesFromRecipientNextStep,
      ...resourcesFromGoal,
      ...resourcesFromObjective,
    ].filter((r) => r && r.length > 0).flat();
    const resourcesReduced = resourceFromFields.reduce((resources, resource) => {
      const exists = resources.find((r) => r.resourceId === resource.id);
      if (exists) {
        exists.topics = [...new Set([
          ...exists.topics,
          ...resource.topics,
        ])];
        exists.source = [
          ...exists.source,
          ...resource.sourceFields
            .map((sourceField) => ({ table: resource.tableType, field: sourceField })),
        ].filter((value, index, self) => index === self
          .findIndex((t) => t.table === value.table && t.field === value.field));
        return resources;
      }

      return [
        ...resources,
        {
          resourceId: resource.id,
          url: resource.url,
          domain: resource.domain,
          topics: resource.topics,
          source: resource.sourceFields
            .map((sourceField) => ({ table: resource.tableType, field: sourceField }))
            .filter((value, index, self) => index === self
              .findIndex((t) => t.table === value.table && t.field === value.field)),
        },
      ];
    }, []);
    return [
      ...reportData,
      ...resourcesReduced.map((resource) => ({
        activityReportId: report.dataValues.id,
        numberOfParticipants: report.dataValues.numberOfParticipants,
        recipients,
        ...resource,
      })),
    ];
  }, []);
  const resources = reportResources;
  const resourcesWithRecipients = resources.map((data) => {
    const participants = reports
      .filter((r) => r.id === data.activityReportId)
      .reduce((accumulator, r) => accumulator + r.numberOfParticipants, 0);
    const startDates = reports
      .filter((r) => r.id === data.activityReportId)
      .map((r) => r.startDate);
    return { ...data, /* recipients, */ participants, startDates };
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
    .reportsWithResources = new Set([...domainData.map((dd) => [...dd.reports])].flat());
  data.reportIntermediate
    .allRecipientIdsWithEclkcResources = new Set([
      ...domainData
        .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
        .map((dd) => [...dd.reports]),
    ].flat());
  data.reportIntermediate
    .allRecipientIdsWithNonEclkcResources = new Set([
      ...domainData
        .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
        .map((dd) => [...dd.reports]),
    ].flat());

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
    .allRecipeintIds = new Set([...reports.map((r) => r['activityRecipients.grant.recipientId'])].flat());
  data.recipientIntermediate
    .allRecipientIdsWithResources = recipientAddUnique(
      [],
      [...domainData.map((dd) => [...dd.recipients])].flat(),
    );
  data.recipientIntermediate.allRecipientIdsWithEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.recipients]),
  ].flat());
  data.recipientIntermediate.allRecipientIdsWithNonEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.recipients]),
  ].flat());

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
      activityReportId: r.dataValues.id,
      participants: r.dataValues.numberOfParticipants,
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
      // Convert all dates to Date objects
      .map((dateString) => new Date(dateString));

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
    .reduce((dedupedResources, resource) => {
      const exists = dedupedResources.find((r) => r.resourceId === resource.resourceId);
      if (exists) {
        exists.startDates = [...exists.startDates, ...resource.startDates];
        return dedupedResources;
      }
      return [
        ...dedupedResources,
        {
          resourceId: resource.resourceId,
          url: resource.url,
          startDates: resource.startDates,
        },
      ];
    }, [])
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

  return {
    headers: [...dateList.map(({ title }) => title), 'Total'],
    resources: clusteredResources,
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
