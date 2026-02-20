/* eslint-disable max-len */
import { Sequelize, Op, QueryTypes } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import { format, parse } from 'date-fns';
import {
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityRecipient,
  Grant,
  Goal,
  Objective,
  Recipient,
  Resource,
  sequelize,
} from '../../models';
import { formatNumber } from '../../widgets/helpers';
import { RESOURCE_DOMAIN } from '../../constants';

/**
 * @typedef {Object} RecipientPrimitive
 * @property {number?} recipientId
 * @property {number?} grantId
 * @property {number?} otherEntityId
 *
 * @typedef {Object} Recipient
 * @property {number?} recipientId
 * @property {number[]?} grantIds
 * @property {number?} otherEntityId
 */

/**
 * combine and dedupe recipient lists
 * @param {RecipientPrimitive[]|Recipient[]} source
 * @param {RecipientPrimitive[]|Recipient[]} adding
 * @returns {Recipient[]}
 */
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

/**
 * @typedef {Object} RespourceDBPrimitive
 * @property {number} resourceId
 * @property {string} url
 * @property {string} domain
 * @property {string} title
 * @property {string[]} sourceFields
 * @property {string} tableType
 * @property {string[]?} topics
 *
 * @typedef {Object} RespourcePrimitive
 * @property {number} resourceId
 * @property {string} url
 * @property {string} domain
 * @property {string} title
 * @property {{ sourceField: string, tableType: string }[]} sourceFields
 * @property {string[]?} topics
 *
 * @typedef {Object} ReportDBData
 * @property {number} id
 * @property {number} numberOfParticipants
 * @property {string[]?} topics
 * @property {string?} startDate
 * @property {RecipientPrimitive[]} recipients
 * @property {RespourceDBPrimitive[]?} resourceObjects
 *
 * @typedef {Object} ReportData
 * @property {number} id
 * @property {number} numberOfParticipants
 * @property {string[]?} topics
 * @property {string?} startDate
 * @property {RecipientPrimitive[]} recipients
 * @property {RespourcePrimitive[]?} resourceObjects
 * */

/**
 * merge a set of resources into the full reports list
 * @param {ReportData[]} currentData
 * @param {ReportDBData[]} additionalData
 * @returns {ReportData[]}
 */
const mergeInResources = (currentData, additionalData) => additionalData
  .reduce((
    clusteredReports,
    report,
  ) => {
    const exists = clusteredReports.get(report.id);
    if (exists) {
      exists.resources = (report.resourceObjects || [])
        .reduce((resources, resource) => {
          const roExists = resources
            .find((ro) => ro.resourceId === resource.resourceId);
          if (roExists) {
            roExists.sourceFields = resource.sourceFields
              .reduce((sourceFields, sourceField) => {
                const sfExists = sourceFields
                  .find((sf) => sf.tableType === sourceField.tableType
                  && sf.sourceField === sourceField.sourceField);
                if (sfExists) {
                  return sourceFields;
                }
                return [...sourceFields, sourceField];
              }, roExists.sourceFields);
            return resources;
          }
          return [
            ...resources,
            {
              ...resource,
              sourceFields: resource.sourceFields
                .map((sourceField) => ({
                  tableType: resource.tableType,
                  sourceField,
                })),
            },
          ];
        }, (exists.resources || []));
      return clusteredReports;
    }
    clusteredReports.set(report.id, report);
    return clusteredReports;
  }, currentData);

/**
* @typedef {Object} ReportPrimitive
* @property {number} id
* @property {number} numberOfParticipants
* @property {string[]?} topics
* @property {string?} startDate
* @property {RecipientPrimitive[]} recipients
*
* @typedef {Object} ResourceData
* @property {number} resourceId
* @property {string} url
* @property {string} domain
* @property {string} title
* @property {string[]} sourceFields
* @property {string} tableType
* @property {string[]?} topics
* @property {ReportPrimitive[]} reports
* */

/**
 * restructure the input from report centric to resource centric
 * @param {ReportData[]} input
 * @returns {ResourceData[]}
 */
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
        title,
        tableType,
        sourceFields,
        topics: resourceTopics,
      }) => {
        if (!output[resourceId]) {
          output[resourceId] = {
            resourceId,
            url,
            domain,
            title,
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
  return Object.values(output)
    .map((data) => {
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
  return Object.values(output)
    .map((data) => {
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
};

async function GenerateFlatTempTables(reportIds, tblNames) {
  const flatResourceSql = /* sql */ `
  -- 1.) Create AR temp table.
  DROP TABLE IF EXISTS ${tblNames.createdArTempTableName};
  SELECT
    id,
    "startDate",
    "numberOfParticipants",
    to_char("startDate", 'Mon-YY') AS "rollUpDate",
    "regionId",
    "calculatedStatus"
    INTO TEMP ${tblNames.createdArTempTableName}
    FROM "ActivityReports" ar
    WHERE ar."id" IN (${reportIds.map((r) => r.id).join(',')});

  -- 2.) Create ARO Resources temp table.
  DROP TABLE IF EXISTS ${tblNames.createdAroResourcesTempTableName};
  SELECT
  DISTINCT
    ar.id AS "activityReportId",
    COALESCE(r2.id, r.id) AS "resourceId"
    INTO TEMP ${tblNames.createdAroResourcesTempTableName}
    FROM ${tblNames.createdArTempTableName} ar
    JOIN "ActivityReportObjectives" aro
      ON ar."id" = aro."activityReportId"
    JOIN "ActivityReportObjectiveResources" aror
      ON aro.id = aror."activityReportObjectiveId"
    JOIN "Resources" r
      ON aror."resourceId" = r.id
    LEFT JOIN "Resources" r2
      ON r."mapsTo" = r2.id
    WHERE aror."sourceFields" && '{resource}';

    -- 3.) Create Resources temp table (only what we need).
    DROP TABLE IF EXISTS ${tblNames.createdResourcesTempTableName};
    SELECT
    DISTINCT
      r.id,
      r.domain,
      r.url,
      r.title
      INTO TEMP ${tblNames.createdResourcesTempTableName}
      FROM "Resources" r
      JOIN ${tblNames.createdAroResourcesTempTableName} dr
        ON r.id = dr."resourceId";

      -- 4.) Create ARO Topics temp table. **** Revisit
      DROP TABLE IF EXISTS  ${tblNames.createdAroTopicsTempTableName};
      SELECT
      ar.id AS "activityReportId",
      arot."topicId",
      count(DISTINCT aro."objectiveId") AS "objectiveCount"
      INTO TEMP ${tblNames.createdAroTopicsTempTableName}
      FROM ${tblNames.createdArTempTableName}  ar
      JOIN "ActivityReportObjectives" aro
        ON ar."id" = aro."activityReportId"
      JOIN "ActivityReportObjectiveResources" aror
        ON aro.id = aror."activityReportObjectiveId"
      JOIN "ActivityReportObjectiveTopics" arot
        ON aro.id = arot."activityReportObjectiveId"
      GROUP BY ar.id, arot."topicId";

      -- 5.) Create Topics temp table (only what we need).
      DROP TABLE IF EXISTS ${tblNames.createdTopicsTempTableName};
      SELECT
      DISTINCT
        id,
        name
      INTO TEMP ${tblNames.createdTopicsTempTableName}
      FROM "Topics"
      JOIN ${tblNames.createdAroTopicsTempTableName} dt
        ON "Topics".id = dt."topicId";

      -- 6.) Create Flat Resource temp table.
      DROP TABLE IF EXISTS ${tblNames.createdFlatResourceTempTableName};
      SELECT
      DISTINCT
        ar.id AS "activityReportId",
        ar."startDate",
        ar."rollUpDate",
        arorr.domain,
        arorr.title,
        arorr.url,
        ar."numberOfParticipants"
      INTO TEMP ${tblNames.createdFlatResourceTempTableName}
      FROM ${tblNames.createdArTempTableName} ar
      JOIN ${tblNames.createdAroResourcesTempTableName} aror
        ON ar.id = aror."activityReportId"
      JOIN ${tblNames.createdResourcesTempTableName} arorr
        ON aror."resourceId" = arorr.id;

      -- 7.) Create flat reports with courses temp table.
      DROP TABLE IF EXISTS ${tblNames.createdAroCoursesTempTableName};
      SELECT
      DISTINCT
        ar.id AS "activityReportId",
        c.id AS "courseId",
        c.name
      INTO TEMP ${tblNames.createdAroCoursesTempTableName}
      FROM ${tblNames.createdArTempTableName} ar
      JOIN "ActivityReportObjectives" aro
        ON ar."id" = aro."activityReportId"
      JOIN "ActivityReportObjectiveCourses" aroc
        ON aro.id = aroc."activityReportObjectiveId"
      JOIN "Courses" c
        ON aroc."courseId" = c.id;

      -- 8.) Create date headers.
      DROP TABLE IF EXISTS ${tblNames.createdFlatResourceHeadersTempTableName};
      SELECT
          generate_series(
            date_trunc('month', (SELECT MIN("startDate") FROM ${tblNames.createdFlatResourceTempTableName})),
            date_trunc('month', (SELECT MAX("startDate") FROM ${tblNames.createdFlatResourceTempTableName})),
            interval '1 month'
          )::date AS "date"
        INTO TEMP ${tblNames.createdFlatResourceHeadersTempTableName};
  `;

  // Execute the flat table sql.
  await sequelize.query(
    flatResourceSql,
    {
      type: QueryTypes.SELECT,
    },
  );
}

function getResourceUseSql(tblNames) {
  const resourceUseSql = /* sql */`
  WITH urlvals AS (
    SELECT
        url,
        title,
        "rollUpDate",
        count(tf."activityReportId") AS "resourceCount"
      FROM ${tblNames.createdFlatResourceTempTableName} tf
      GROUP BY url, title, "rollUpDate"
      ORDER BY "url", tf."rollUpDate" ASC),
    distincturls AS (
    SELECT DISTINCT url, title
    FROM ${tblNames.createdFlatResourceTempTableName}
    ),
    totals AS
    (
      SELECT
      url,
      title,
      SUM("resourceCount") AS "totalCount"
      FROM urlvals
      GROUP BY url, title
      ORDER BY SUM("resourceCount")  DESC,
      url ASC
      LIMIT 10
    )
      SELECT
      d.url,
      d.title,
      to_char(s."date", 'Mon-YY') AS "rollUpDate",
      s."date",
      coalesce(u."resourceCount", 0) AS "resourceCount",
      t."totalCount"
      FROM distincturls d
      CROSS JOIN ${tblNames.createdFlatResourceHeadersTempTableName} s
      JOIN totals t
        ON d.url = t.url
      LEFT JOIN urlvals u
        ON d.url = u.url AND to_char(s."date", 'Mon-YY') = u."rollUpDate"
      ORDER BY 1,4 ASC;
  `;

  return sequelize.query(
    resourceUseSql,
    {
      type: QueryTypes.SELECT,
    },
  );
}

function getTopicsUseSql(tblNames) {
  const topicUseSql = /* sql */`
  WITH topicsuse AS (
      SELECT
        f."activityReportId",
        t.name,
        f."rollUpDate",
        count(DISTINCT f.url) AS "resourceCount" -- Only count each resource once per ar and topic.
      FROM ${tblNames.createdTopicsTempTableName}  t
        JOIN ${tblNames.createdAroTopicsTempTableName} arot
        ON t.id = arot."topicId"
        JOIN ${tblNames.createdFlatResourceTempTableName} f
        ON arot."activityReportId" = f."activityReportId"
        GROUP BY f."activityReportId", t.name, f."rollUpDate"
        ORDER BY t.name, f."rollUpDate" ASC
    ),
    topicsperdate AS
    (
    SELECT
      "name",
      "rollUpDate",
      SUM("resourceCount") AS "resourceCount"
    FROM topicsuse
    GROUP BY "name", "rollUpDate"
    ),
    totals AS
    (
      SELECT
        name,
        SUM("resourceCount") AS "totalCount"
      FROM topicsperdate
      GROUP BY name
      ORDER BY SUM("resourceCount") DESC
    )
    SELECT
      d.name,
      to_char(s."date", 'Mon-YY') AS "rollUpDate",
      s."date",
      coalesce(t."resourceCount", 0) AS "resourceCount",
      tt."totalCount"
    FROM ${tblNames.createdTopicsTempTableName} d
    JOIN ${tblNames.createdFlatResourceHeadersTempTableName} s
      ON 1=1
    JOIN totals tt
      ON d.name = tt.name
    LEFT JOIN topicsperdate t
      ON d.name = t.name AND to_char(s."date", 'Mon-YY') = t."rollUpDate"
    ORDER BY 1, 3 ASC;`;
  return sequelize.query(
    topicUseSql,
    {
      type: QueryTypes.SELECT,
    },
  );
}

function getOverview(tblNames, totalReportCount) {
  // - Number of Participants -
  const numberOfParticipants = sequelize.query(/* sql */`
  WITH ar_participants AS (
    SELECT
    f."activityReportId",
    f."numberOfParticipants"
    FROM ${tblNames.createdFlatResourceTempTableName} f
    GROUP BY f."activityReportId", f."numberOfParticipants"
  )
  SELECT
         SUM("numberOfParticipants") AS participants
  FROM ar_participants;
  `, {
    type: QueryTypes.SELECT,
  });

  const numberOfRecipSql = /* sql */`
   SELECT
         count(DISTINCT g."recipientId") AS recipients
  FROM ${tblNames.createdFlatResourceTempTableName} ar
  JOIN "ActivityRecipients" arr
    ON ar."activityReportId" = arr."activityReportId"
  JOIN "Grants" g
    ON arr."grantId" = g.id
  `;

  // - Number of Recipients -
  const numberOfRecipients = sequelize.query(numberOfRecipSql, {
    type: QueryTypes.SELECT,
  });

  // - Reports with Resources Pct -
  const pctOfResourcesSql = /* sql */`
  SELECT
    count(DISTINCT "activityReportId")::decimal AS "reportsWithResourcesCount",
    ${totalReportCount}::decimal AS "totalReportsCount",
    CASE WHEN ${totalReportCount} = 0 THEN
      0
    ELSE
      (count(DISTINCT "activityReportId") / ${totalReportCount}::decimal * 100)::decimal(5,2)
    END AS "resourcesPct"
  FROM ${tblNames.createdAroResourcesTempTableName};
  `;

  const pctOfReportsWithResources = sequelize.query(pctOfResourcesSql, {
    type: QueryTypes.SELECT,
  });

  const pctOfReportsWithCoursesSql = /* sql */`
  SELECT
    count(DISTINCT "activityReportId")::decimal AS "reportsWithCoursesCount",
    ${totalReportCount}::decimal AS "totalReportsCount",
    CASE WHEN ${totalReportCount} = 0 THEN
      0
    ELSE
      (count(DISTINCT "activityReportId") / ${totalReportCount}::decimal * 100)::decimal(5,2)
    END AS "coursesPct"
  FROM ${tblNames.createdAroCoursesTempTableName};
  `;

  const pctOfReportsWithCourses = sequelize.query(pctOfReportsWithCoursesSql, {
    type: QueryTypes.SELECT,
  });

  // - Number of Reports with HeadStart Resources Pct -
  const pctOfHeadStartResources = sequelize.query(/* sql */`
    WITH headstart AS (
      SELECT
    COUNT(DISTINCT url) AS "headStartCount"
    FROM  ${tblNames.createdFlatResourceTempTableName}
    WHERE domain = 'headstart.gov'
    ), allres AS (
    SELECT
    COUNT(DISTINCT url) AS "allCount"
    FROM ${tblNames.createdFlatResourceTempTableName}
    )
    SELECT
      e."headStartCount",
    r."allCount",
      CASE WHEN
    r."allCount" = 0
    THEN 0
    ELSE  (e."headStartCount" / r."allCount"::decimal * 100)::decimal(5,2)
    END AS "headStartPct"
    FROM headstart e
    CROSS JOIN allres r;
  `, {
    type: QueryTypes.SELECT,
  });

  // 5.) Date Headers table.
  const dateHeaders = sequelize.query(/* sql */`
   SELECT
    to_char("date", 'Mon-YY') AS "rollUpDate"
   FROM ${tblNames.createdFlatResourceHeadersTempTableName};
 `, {
    type: QueryTypes.SELECT,
  });
  return {
    numberOfParticipants,
    numberOfRecipients,
    pctOfReportsWithResources,
    pctOfReportsWithCourses,
    pctOfHeadStartResources,
    dateHeaders,
  };
}

/*
  Create a flat table to calculate the resource data. Use temp tables to ONLY join to the rows we need.
  If over time the amount of data increases and slows again we can cache the flat table a set frequency.
*/
export async function resourceFlatData(scopes) {
  // Date to retrieve report data from.
  const reportCreatedAtDate = '2022-12-01';

  // 1.) Get report ids using the scopes.
  const reportIds = await ActivityReport.findAll({
    attributes: [
      'id',
    ],
    where: {
      [Op.and]: [
        scopes.activityReport,
        {
          calculatedStatus: REPORT_STATUSES.APPROVED,
          startDate: { [Op.ne]: null },
          createdAt: { [Op.gt]: reportCreatedAtDate },
        },
      ],
    },
    raw: true,
  });

  // Get total number of reports.
  const totalReportCount = reportIds.length;

  if (reportIds.length === 0) {
    reportIds.push({ id: 0 });
  }
  // 2.) Create temp table names.
  const uuid = uuidv4().replaceAll('-', '_');
  const createdArTempTableName = `Z_temp_resdb_ar__${uuid}`;
  const createdAroResourcesTempTableName = `Z_temp_resdb_aror__${uuid}`;
  const createdAroCoursesTempTableName = `Z_temp_resdb_aroc__${uuid}`;
  const createdResourcesTempTableName = `Z_temp_resdb_res__${uuid}`;
  const createdAroTopicsTempTableName = `Z_temp_resdb_arot__${uuid}`;
  const createdTopicsTempTableName = `Z_temp_resdb_topics__${uuid}`;
  const createdFlatResourceHeadersTempTableName = `Z_temp_resdb_headers__${uuid}`; // Date Headers.
  const createdFlatResourceTempTableName = `Z_temp_resdb_flat__${uuid}`; // Main Flat Table.

  const tempTableNames = {
    createdArTempTableName,
    createdAroResourcesTempTableName,
    createdAroCoursesTempTableName,
    createdResourcesTempTableName,
    createdAroTopicsTempTableName,
    createdTopicsTempTableName,
    createdFlatResourceTempTableName,
    createdFlatResourceHeadersTempTableName,
  };

  // 3. Generate the base temp tables (used for all calcs).
  await GenerateFlatTempTables(reportIds, tempTableNames);

  // 4.) Calculate the resource data.

  // -- Resource Use --
  let resourceUseResult = getResourceUseSql(tempTableNames);

  // -- Topic Use --
  let topicUseResult = getTopicsUseSql(tempTableNames);

  // -- Overview --
  let {
    numberOfParticipants,
    numberOfRecipients,
    pctOfReportsWithResources,
    pctOfReportsWithCourses,
    pctOfHeadStartResources,
    dateHeaders,
  } = getOverview(tempTableNames, totalReportCount);

  // -- Wait for all results --
  [
    resourceUseResult,
    topicUseResult,
    numberOfParticipants,
    numberOfRecipients,
    pctOfReportsWithResources,
    pctOfReportsWithCourses,
    pctOfHeadStartResources,
    dateHeaders,
  ] = await Promise.all(
    [
      resourceUseResult,
      topicUseResult,
      numberOfParticipants,
      numberOfRecipients,
      pctOfReportsWithResources,
      pctOfReportsWithCourses,
      pctOfHeadStartResources,
      dateHeaders,
    ],
  );

  // 5.) Restructure Overview.
  const overView = {
    numberOfParticipants, numberOfRecipients, pctOfReportsWithResources, pctOfHeadStartResources, pctOfReportsWithCourses,
  };

  // 6.) Return the data.
  return {
    resourceUseResult, topicUseResult, overView, dateHeaders, reportIds,
  };
}

// collect all resource data from the db filtered via the scopes
export async function resourceData(scopes, skipResources = false, skipTopics = false) {
  // Date to retrieve report data from.
  const reportCreatedAtDate = '2022-12-01';
  // Query Database for all Resources within the scope.
  const dbData = {
    allReports: null,
    viaObjectives: null,
    viaGoals: null,
  };
  [
    dbData.allReports,
    dbData.viaObjectives,
    dbData.viaGoals,
  ] = await Promise.all([
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'grantId\''),
              sequelize.literal('"activityRecipients->grant"."id"'),
              sequelize.literal('\'recipientId\''),
              sequelize.literal('"activityRecipients->grant"."recipientId"'),
              sequelize.literal('\'otherEntityId\''),
              sequelize.literal('"activityRecipients"."otherEntityId"'),
            ),
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
          {
            calculatedStatus: REPORT_STATUSES.APPROVED,
            startDate: { [Op.ne]: null },
            createdAt: { [Op.gt]: reportCreatedAtDate },
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
      ],
      raw: true,
    }),

    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'grantId\''),
              sequelize.literal('"activityRecipients->grant"."id"'),
              sequelize.literal('\'recipientId\''),
              sequelize.literal('"activityRecipients->grant"."recipientId"'),
              sequelize.literal('\'otherEntityId\''),
              sequelize.literal('"activityRecipients"."otherEntityId"'),
            ),
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
              sequelize.literal('\'title\''),
              sequelize.literal('"activityReportObjectives->resources"."title"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal(`(
                SELECT jsonb_agg( DISTINCT jsonb_build_object(
                  'sourceField', "sourceField",
                  'tableType', 'objective'
                  ))
              FROM UNNEST("activityReportObjectives->resources->ActivityReportObjectiveResource"."sourceFields") SF("sourceField")
                GROUP BY 1=1
              )`),
              sequelize.literal('\'topics\''),
              sequelize.literal(`(
                SELECT ARRAY_AGG(DISTINCT t."name")
                FROM "ActivityReportObjectiveTopics" arot
                JOIN "Topics" t
                ON arot."topicId" = t.id
                WHERE arot."activityReportObjectiveId" = "activityReportObjectives"."id"
                GROUP BY 1=1
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
          {
            calculatedStatus: REPORT_STATUSES.APPROVED,
            startDate: { [Op.ne]: null },
            createdAt: { [Op.gt]: reportCreatedAtDate },
          },
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
          ],
          required: true,
        },
      ],
      raw: true,
    }),
    await ActivityReport.findAll({
      attributes: [
        'id',
        'numberOfParticipants',
        'topics',
        'startDate',
        [sequelize.fn(
          'jsonb_agg',
          sequelize.fn(
            'DISTINCT',
            sequelize.fn(
              'jsonb_build_object',
              sequelize.literal('\'grantId\''),
              sequelize.literal('"activityRecipients->grant"."id"'),
              sequelize.literal('\'recipientId\''),
              sequelize.literal('"activityRecipients->grant"."recipientId"'),
              sequelize.literal('\'otherEntityId\''),
              sequelize.literal('"activityRecipients"."otherEntityId"'),
            ),
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
              sequelize.literal('\'title\''),
              sequelize.literal('"activityReportGoals->resources"."title"'),
              sequelize.literal('\'sourceFields\''),
              sequelize.literal(`(
                SELECT jsonb_agg( DISTINCT jsonb_build_object(
                  'sourceField', "sourceField",
                  'tableType', 'goals'
                  ))
              FROM UNNEST("activityReportGoals->resources->ActivityReportGoalResource"."sourceFields") SF("sourceField")
                GROUP BY 1=1
              )`),
              sequelize.literal('\'topics\''),
              sequelize.literal(`(
                SELECT ARRAY_AGG(t."name")
                FROM "ActivityReportObjectiveTopics" arot
                JOIN "Topics" t
                ON arot."topicId" = t.id
                WHERE arot."activityReportObjectiveId" = "activityReportObjectives"."id"
                GROUP BY 1=1
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
          {
            calculatedStatus: REPORT_STATUSES.APPROVED,
            startDate: { [Op.ne]: null },
            createdAt: { [Op.gt]: reportCreatedAtDate },
          },
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
          ],
          required: true,
        },
      ],
      raw: true,
    }),
  ]);

  let reportsMap = mergeInResources(new Map(), dbData.allReports);
  const reportIds = Array.from(reportsMap.keys());

  delete dbData.allReports;

  reportsMap = mergeInResources(reportsMap, dbData.viaObjectives);
  delete dbData.viaObjectives;
  reportsMap = mergeInResources(reportsMap, dbData.viaGoals);
  delete dbData.viaGoals;
  const reports = Array.from(reportsMap.values());

  const resources = skipResources
    ? []
    : switchToResourceCentric(reports);

  const topics = skipTopics
    ? []
    : switchToTopicCentric(reports);

  return {
    resources,
    reports,
    topics,
    reportIds,
  };
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
        title: resource.title,
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
      domain, title, count, reportCount, recipientCount, resourceCount,
    }) => ({
      domain, title, count, reportCount, recipientCount, resourceCount,
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

  // report based stats
  data.report = {};
  data.report.num = reports.length;
  data.report.numResources = data.reportIntermediate.reportsWithResources.size;
  data.report.percentResources = (data.report.numResources / data.report.num) * 100.0;

  data.report.numNoResources = data.report.num - data.report.numResources;
  data.report.percentNoResources = (data.report.numNoResources / data.report.num) * 100.0;

  delete data.reportIntermediate;
  // recipient based intermediate data
  data.recipientIntermediate = {};
  data.recipientIntermediate
    .allRecipientIds = reduceRecipients([], reports.flatMap((r) => r.recipients));
  data.recipientIntermediate
    .allRecipientIdsWithResources = reduceRecipients([], resources.flatMap((r) => r.recipients));

  // recipient based stats
  data.recipient = {};
  data.recipient.num = data.recipientIntermediate.allRecipientIds.length;
  data.recipient.numResources = data.recipientIntermediate.allRecipientIdsWithResources.length;
  data.recipient
    .percentResources = (data.recipient.numResources / data.recipient.num) * 100.0;

  data.recipient.numNoResources = data.recipient.num - data.recipient.numResources;
  data.recipient.percentNoResources = (data.recipient.numNoResources / data.recipient.num) * 100.0;

  delete data.recipientIntermediate;
  // resource based intermediate data
  data.resourceIntermediate = {};
  data.resourceIntermediate
    .allResources = resources;
  data.resourceIntermediate.allheadstartResources = resources
    .filter((r) => r.domain === RESOURCE_DOMAIN.HEAD_START);

  // resource based stats
  data.resource = {};
  data.resource.num = data.resourceIntermediate.allResources.length;

  data.resource.numHeadStart = data.resourceIntermediate.allheadstartResources.length;
  data.resource.percentHeadStart = (data.resource.numHeadStart / data.resource.num) * 100.0;

  delete data.resourceIntermediate;

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
    },
    resource: {
      num: formatNumber(data.resource.num),
      numHeadStart: formatNumber(data.resource.numHeadStart),
      percentHeadStart: `${formatNumber(data.resource.percentHeadStart, 2)}%`,
    },
    recipient: {
      num: formatNumber(data.recipient.num),
      numResources: formatNumber(data.recipient.numResources),
      percentResources: `${formatNumber(data.recipient.percentResources, 2)}%`,
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
    numHeadStart: '1,819',
    num: '2,365',
    percentHeadStart: '79.91%',
  },
  recipient: {
    numResources: '248',
  },
  participant: {
    numParticipants: '765',
  },
}
*/

// Create a Date object from the date string
// Get the month abbreviation from the month number
// Get the year as a two-digit string
// Concatenate the month abbreviation and year string with a hyphen separator
const getMonthYear = (dateStr) => new Intl
  .DateTimeFormat('en-US', { month: 'short', year: '2-digit' })
  .format(new Date(dateStr))
  .replace(' ', '-');

const getMinMax = (data) => {
  const dateObjects = data
    // Get an array of all valid startDates
    .flatMap((r) => r.startDates)
    .map((d) => new Date(`${d}`))
    .filter((d) => !Number.isNaN(Date.parse(d)));

  // Find the minimum and maximum dates
  return {
    min: new Date(Math.min.apply(null, dateObjects)),
    max: new Date(Math.max.apply(null, dateObjects)),
  };
  // Note: Math.min.apply(null, []) is faster then Math.min(...[])
  // https://medium.com/coding-at-dawn/the-fastest-way-to-find-minimum-and-maximum-values-in-an-array-in-javascript-2511115f8621
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

  resources.sort((a, b) => {
    const aTotal = a.startDates.length;
    const bTotal = b.startDates.length;
    if (aTotal > bTotal) return -1;
    if (aTotal < bTotal) return 1;
    if (a.url < b.url) return -1;
    if (a.url > b.url) return 1;
    return 0;
  });

  const clusteredResources = resources
    .slice(0, 10) // limit to the top 10
    .map((resource) => ({
      heading: resource.url,
      title: resource.title,
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
        }, [...dateList.map((d) => ({ ...d })), { title: 'Total', cnt: 0 }]),
      ]
        .map(({ title, cnt }) => ({
          title,
          value: formatNumber(cnt),
        })),
    }));

  return {
    headers: [...dateList.map(({ title }) => title)],
    resources: clusteredResources,
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

  topics.sort((a, b) => {
    const aTotal = a.startDates.length;
    const bTotal = b.startDates.length;
    if (aTotal > bTotal) return -1;
    if (aTotal < bTotal) return 1;
    if (a.topic < b.topic) return -1;
    if (a.topic > b.topic) return 1;
    return 0;
  });

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
        }, [...dateList.map((d) => ({ ...d })), { title: 'Total', cnt: 0 }]),
      ]
        .map(({ title, cnt }) => ({
          title,
          value: formatNumber(cnt),
        })),
    }));

  return {
    headers: [...dateList.map(({ title }) => title)],
    topics: clusteredTopics,
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

export async function resourceDashboardPhase1(scopes) {
  const data = await resourceData(scopes);
  return {
    overview: generateResourcesDashboardOverview(data),
    use: generateResourceUse(data),
    topicUse: generateResourceTopicUse(data),
    reportIds: data.reportIds,
  };
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

export async function rollUpResourceUse(data) {
  const rolledUpResourceUse = data.resourceUseResult.reduce((accumulator, resource) => {
    const exists = accumulator.find((r) => r.url === resource.url);
    if (!exists) {
      // Add a property with the resource's URL.
      return [
        ...accumulator,
        {
          heading: resource.url,
          url: resource.url,
          title: resource.title,
          sortBy: resource.title || resource.url,
          total: resource.totalCount,
          isUrl: true,
          data: [{ title: resource.rollUpDate, value: resource.resourceCount }],
        },
      ];
    }

    // Add the resource to the accumulator.
    exists.data.push({ title: resource.rollUpDate, value: resource.resourceCount });
    return accumulator;
  }, []);

  // Loop through the rolled up resources and add a total.
  rolledUpResourceUse.forEach((resource) => {
    resource.data.push({ title: 'Total', value: resource.total });
  });

  // Sort by total and name or url.
  // rolledUpResourceUse.sort((r1, r2) => r2.total - r1.total || r1.sortBy.localeCompare(r2.sortBy));
  rolledUpResourceUse.sort((r1, r2) => r2.total - r1.total || r1.url.localeCompare(r2.url));
  return rolledUpResourceUse;
}

export async function rollUpTopicUse(data) {
  const filteredTopics = data.topicUseResult.filter((topic) => topic.name !== 'Equity');
  const rolledUpTopicUse = filteredTopics.reduce((accumulator, topic) => {
    const exists = accumulator.find((r) => r.name === topic.name);
    if (!exists) {
      // Add a property with the resource's name.
      return [
        ...accumulator,
        {
          heading: topic.name,
          name: topic.name,
          total: topic.totalCount,
          isUrl: false,
          data: [{ title: topic.rollUpDate, value: topic.resourceCount }],
        },
      ];
    }

    // Add the resource to the accumulator.
    exists.data.push({ title: topic.rollUpDate, value: topic.resourceCount });
    return accumulator;
  }, []);

  // Loop through the rolled up resources and add a total.
  rolledUpTopicUse.forEach((topic) => {
    topic.data.push({ title: 'Total', value: topic.total });
  });

  // Sort by total then topic name.
  rolledUpTopicUse.sort((r1, r2) => r2.total - r1.total || r1.name.localeCompare(r2.name));
  return rolledUpTopicUse;
}

export function restructureOverview(data) {
  return {
    report: {
      percentResources: `${formatNumber(data.overView.pctOfReportsWithResources[0].resourcesPct, 2)}%`,
      numResources: formatNumber(data.overView.pctOfReportsWithResources[0].reportsWithResourcesCount),
      num: formatNumber(data.overView.pctOfReportsWithResources[0].totalReportsCount),
    },
    participant: {
      numParticipants: formatNumber(data.overView.numberOfParticipants[0].participants),
    },
    recipient: {
      numResources: formatNumber(data.overView.numberOfRecipients[0].recipients),
    },
    resource: {
      numHeadStart: formatNumber(data.overView.pctOfHeadStartResources[0].headStartCount),
      num: formatNumber(data.overView.pctOfHeadStartResources[0].allCount),
      percentHeadStart: `${formatNumber(data.overView.pctOfHeadStartResources[0].headStartPct, 2)}%`,
    },
    ipdCourses: {
      percentReports: `${formatNumber(data.overView.pctOfReportsWithCourses[0].coursesPct, 2)}%`,
    },
  };
}

export async function resourceDashboardFlat(scopes) {
  // Get flat resource data.
  const data = await resourceFlatData(scopes);

  // Restructure overview.
  const dashboardOverview = restructureOverview(data);

  // Roll up resources.
  const rolledUpResourceUse = await rollUpResourceUse(data);

  // Roll up topics.
  const rolledUpTopicUse = await rollUpTopicUse(data);

  // Date headers.
  const dateHeadersArray = data.dateHeaders.map((date) => ({
    name: format(parse(date.rollUpDate, 'MMM-yy', new Date()), 'MMMM yyyy'),
    displayName: date.rollUpDate,
  }));

  return {
    resourcesDashboardOverview: dashboardOverview,
    resourcesUse: { headers: dateHeadersArray, resources: rolledUpResourceUse },
    topicUse: { headers: dateHeadersArray, topics: rolledUpTopicUse },
    reportIds: data.reportIds.map((r) => r.id),
  };
}
