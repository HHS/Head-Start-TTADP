import { Op, QueryTypes } from 'sequelize';
import {
  ActivityReport,
  ActivityRecipient,
  Grant,
  OtherEntity,
  Recipient,
  sequelize,
} from '../models';
import { formatNumber } from './helpers';
import { REPORT_STATUSES, RESOURCE_DOMAIN } from '../constants';

export async function resourceData(scopes) {
  // Query Database for all Resources within the scope.
  const reports = await ActivityReport.findAll({
    attributes: [
      'id',
    ],
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
        where: { [Op.and]: [scopes.activityRecipient] },
        required: true,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: ['recipientId'],
            where: { [Op.and]: [scopes.grant] },
            required: true,
            include: [
              {
                model: Recipient,
                as: 'recipient',
                attributes: ['id'],
                where: { [Op.and]: [scopes.recipient] },
                required: false,
              },
            ],
          },
          {
            model: OtherEntity,
            as: 'otherEntity',
            attributes: ['id'],
            where: { [Op.and]: [scopes.otherEntity] },
            required: false,
          },
        ],
      },
    ],
    raw: true,
  });

  const reportIds = reports.map((r) => r.id);
  // to get correct escaping https://regex101.com/ code generator works well
  const urlRegex = '(?:(?:http|ftp|https|file):\\/\\/)(?:www\\.)?(?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:]))(?:[\\w\\\\\'\'.,@?^=%&:\\/~+#()-]*[\\w@?^=%&\\/~+#-])';
  const domainRegex = '^(?:(?:http|ftp|https|file):\\/\\/)?(?:www\\.)?((?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:])))';

  const resources = await sequelize.query(`
    WITH
    "ARResources" AS (
        SELECT
            id "activityReportId",
            "nonECLKCResourcesUsed",
            "ECLKCResourcesUsed",
            "createdAt",
            "updatedAt"
        FROM "ActivityReports" a
        WHERE a.id in (${reportIds.join(',') || null})
        AND (( a."nonECLKCResourcesUsed" is not null
                AND  ARRAY_LENGTH(a."nonECLKCResourcesUsed",1) > 0
                AND nullIf(a."nonECLKCResourcesUsed"[1],'') IS NOT null)
        OR (a."ECLKCResourcesUsed" is not null
            AND  ARRAY_LENGTH(a."ECLKCResourcesUsed",1) > 0
            AND nullIf(a."ECLKCResourcesUsed"[1],'') IS NOT null))
        order by ID
          ),
          "ARNResources" AS (
        SELECT
            arr."activityReportId",
            (regexp_matches(ne.resource,'${urlRegex}','g')) urls,
            'nonECLKCResourcesUsed' "SourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."nonECLKCResourcesUsed") AS ne(resource)
          ),
          "AREResources" AS (
        SELECT
            arr."activityReportId",
            (regexp_matches(ne.resource,'${urlRegex}','g')) urls,
            'ECLKCResourcesUsed' "SourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."ECLKCResourcesUsed") AS ne(resource)
          ),
      "ARCResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a.context,'${urlRegex}','g')) urls,
          'context' "SourceField",
          a."createdAt",
          a."updatedAt"
        FROM "ActivityReports" a
        WHERE a.id in (${reportIds.join(',') || null})
      ),
      "ARAResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a."additionalNotes",'${urlRegex}','g')) urls,
          'additionalNotes' "SourceField",
          a."createdAt",
          a."updatedAt"
        FROM "ActivityReports" a
        WHERE a.id in (${reportIds.join(',') || null})
      ),
      "ClusteredARResources" AS (
        SELECT *
        FROM "ARNResources"
        UNION
        SELECT *
        FROM "AREResources"
        UNION
        SELECT *
        FROM "ARCResources"
        UNION
        SELECT *
        FROM "ARAResources"
      ),
      "AllARResources" AS (
        SELECT
          carr."activityReportId",
          carr."SourceField",
          (regexp_match(url,'${domainRegex}'))[1] "domain",
          u.url,
          carr."createdAt" "createdAt",
          carr."updatedAt" "updatedAt"
        FROM "ClusteredARResources" carr
        CROSS JOIN UNNEST(carr.urls) u(url)
        WHERE u.url ~ '[a-zA-Z]' -- URLS need to have atleast one alpha char
      ),
      "ORurlsArray" AS (
        SELECT
          aro."activityReportId",
          (regexp_matches("userProvidedUrl",'${urlRegex}','g'))[1] url,
          r."createdAt",
          r."updatedAt"
        FROM "ActivityReportObjectiveResources" r
        JOIN "ActivityReportObjectives" aro
        ON r."activityReportObjectiveId" = aro."id"
        WHERE aro."activityReportId" in (${reportIds.join(',') || null})
      ),
      "AllObjectiveResources" AS (
        SELECT
          orua."activityReportId",
          'userProvidedUrl' "SourceField",
          (regexp_match(orua.url,'${domainRegex}'))[1] "domain",
          orua.url,
          orua."createdAt",
          orua."updatedAt"
        FROM "ORurlsArray" orua
        WHERE orua.url ~ '[a-zA-Z]' -- URLS need to have at least one alpha char
      ),
      "AllResources" AS (
        SELECT *
        FROM "AllARResources"
        WHERE "domain" ~ '[a-zA-Z]' -- Domains need to have at least one alpha char
        AND "domain" ~ '.*[.][^.0-9][a-zA-Z0-9]' -- Domains need to have a valid tld
        UNION
        SELECT *
        FROM "AllObjectiveResources"
        WHERE "domain" ~ '[a-zA-Z]' -- Domains need to have at least one alpha char
        AND "domain" ~ '.*[.][^.0-9][a-zA-Z0-9]' -- Domains need to have a valid tld
      )
      SELECT
        ar."activityReportId",
        ARRAY_AGG(ar."SourceField") "SourceFields",
        ar."domain",
        ar.url,
        MIN(ar."createdAt") "createdAt",
        MAX(ar."updatedAt") "updatedAt"
      FROM "AllResources" ar
      GROUP BY
        ar."activityReportId",
        ar."domain",
        ar.url;
  `, { raw: true, type: QueryTypes.SELECT } /* , { type: QueryTypes.SELECT } */);

  const resourcesWithRecipients = resources.map((data) => {
    const recipients = reports
      .filter((r) => r.id === data.activityReportId)
      .map((r) => r['activityRecipients.grant.recipientId']);
    return { ...data, recipients };
  });

  return { resources: resourcesWithRecipients, reports };
}

async function generateResourceList(
  precalculatedData, // data generated from calling resourceData
  removeLists, // exclude list of report ids and recipient ids from result
  includeNone, // include none record in result
) {
  const { resources: res, reports } = precalculatedData;

  let resourceCounts = res.reduce(
    (resources, resource) => {
      const { activityReportId, url, domain } = resource;
      const exists = resources.find((o) => o.url === url);
      if (exists) {
        exists.reports.add(activityReportId);
        resource.recipients.forEach(exists.recipients.add, exists.recipients);
        exists.count += 1;
        return resources;
      }

      return [...resources, {
        domain,
        name: url,
        url,
        count: 1,
        reports: new Set([activityReportId]),
        recipients: new Set(resource.recipients),
      }];
    },
    [],
  );

  resourceCounts = resourceCounts.map((rc) => ({
    ...rc,
    reportCount: rc.reports.size,
    recipientCount: rc.recipients.size,
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
      const allRecipientIdsWithResources = new Set([...res.map((r) => r.recipients)].flat());
      const noneRecipeintCnt = (allRecipeintIds.size - allRecipientIdsWithResources.size);
      resourceCounts.push({
        name: 'none',
        url: null,
        count: noneCnt,
        reportCount: noneCnt,
        recipientCount: noneRecipeintCnt,
      });
    }
  }

  // Sort By Count largest to smallest.
  resourceCounts.sort((r1, r2) => {
    if (r2.reportCount - r1.reportCount === 0) {
      if (r2.recipientCount - r1.recipientCount === 0) {
        // Break tie on url
        const url1 = r1.url.toUpperCase().replace(' ', ''); // ignore upper and lowercase
        const url2 = r2.url.toUpperCase().replace(' ', ''); // ignore upper and lowercase
        if (url1 < url2) {
          return -1;
        }
        if (url1 > url2) {
          return 1;
        }
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
      exists.urls.add(url);
      exists.count += count;
      return domains;
    }

    return [...domains, {
      domain,
      count,
      reports,
      recipients: new Set(resource.recipients),
      urls: new Set([url]),
    }];
  }, []);

  domainCounts = domainCounts.map((dc) => ({
    ...dc,
    reportCount: dc.reports.size,
    recipientCount: dc.recipients.size,
    urlCount: dc.urls.size,
  }));

  if (removeLists) {
    domainCounts = domainCounts.map((dc) => ({
      ...dc,
      reports: undefined,
      recipients: undefined,
      urls: undefined,
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
  data.report.percentResources = (data.report.numResources / data.report.num);

  data.report.numNoResources = data.report.num - data.report.numResources;
  data.report.percentNoResources = (data.report.numNoResources / data.report.num);

  data.report.numEclkc = data.reportIntermediate.allRecipientIdsWithEclkcResources.size;
  data.report.percentEclkc = (data.report.numEclkc / data.report.num);

  data.report.numNonEclkc = data.reportIntermediate.allRecipientIdsWithNonEclkcResources.size;
  data.report.percentNonEclkc = (data.report.numNonEclkc / data.report.num);

  // recipient based intermediate data
  data.recipientIntermediate = {};
  data.recipientIntermediate
    .allRecipeintIds = new Set([...reports.map((r) => r['activityRecipients.grant.recipientId'])].flat());
  data.recipientIntermediate
    .allRecipientIdsWithResources = new Set([...domainData.map((dd) => [...dd.recipients])].flat());
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

  data.recipient.numResources = data.recipientIntermediate.allRecipientIdsWithResources.size;
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
    .allResources = new Set([...domainData.map((dd) => [...dd.urls])].flat());
  data.resourceIntermediate.allEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.urls]),
  ].flat());
  data.resourceIntermediate.allNonEclkcResources = new Set([
    ...domainData
      .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
      .map((dd) => [...dd.urls]),
  ].flat());

  // resource based stats
  data.resource = {};
  data.resource.num = data.resourceIntermediate.allResources.size;

  data.resource.numEclkc = data.resourceIntermediate.allEclkcResources.size;
  data.resource.percentEclkc = (data.resource.numEclkc / data.resource.num) * 100.0;

  data.resource.numNonEclkc = data.resourceIntermediate.allNonEclkcResources.size;
  data.resource.percentNonEclkc = (data.resource.numNonEclkc / data.resource.num) * 100.0;

  data.recipientIntermediate = undefined;
  data.reportIntermediate = undefined;
  data.resourceIntermediate = undefined;

  return {
    ...data,
    numEclkc: formatNumber(data.recipient.numEclkc),
    totalNumEclkc: formatNumber(data.recipient.numResources),
    numEclkcPercentage: `${formatNumber(data.recipient.percentEclkc, 2)}%`,
    numNonEclkc: formatNumber(data.recipient.numNonEclkc),
    totalNumNonEclkc: formatNumber(data.recipient.numResources),
    numNonEclkcPercentage: `${formatNumber(data.recipient.percentNonEclkc, 2)}%`,
    numResources: formatNumber(data.recipient.numResources),
    totalNumResources: formatNumber(data.recipient.numResources),
    numResourcesPercentage: `${formatNumber(data.recipient.percentResources, 2)}%`,
    numNoResources: formatNumber(data.recipient.numNoResources),
    totalNumNoResources: formatNumber(data.recipient.numResources),
    numNoResourcesPercentage: `${formatNumber(data.recipient.percentNoResources, 2)}%`,
  };
}
