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

// function reportsWithResources(resources) {
//   return resources.reduce((withResources, resource) => {
//     const { activityReportId } = resource;
//     const exists = withResources.find((r) => r === activityReportId);
//     if (exists) {
//       return withResources;
//     }
//     return [...withResources, activityReportId];
//   }, []);
// }

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
  const urlRegex = '(?:(?:http|ftp|https|file):\\/\\/)?(?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:]))(?:[\\w\\\\\'\'.,@?^=%&:\\/~+#()-]*[\\w@?^=%&\\/~+#-])';
  const domainRegex = '^(?:https?:\\/\\/)?(?:[^@\\n]+@)?(?:www\\.)?([^:\\/\\n?]+)';

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
        WHERE orua.url ~ '[a-zA-Z]' -- URLS need to have atleast one alpha char
      ),
      "AllResources" AS (
        SELECT *
        FROM "AllARResources"
        UNION
        SELECT *
        FROM "AllObjectiveResources"
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
      const allRecipeintIds = new Set([...reports.map((r) => r.recipients)].flat());
      const allRecipientIdsWithResources = new Set([...res.map((r) => r.recipients)].flat());
      const noneRecipeintCnt = (allRecipeintIds.size - allRecipientIdsWithResources.size);
      resourceCounts.push({
        url: 'none',
        count: noneCnt,
        reportCount: noneCnt,
        recipientCount: noneRecipeintCnt,
      });
    }
  }

  // Sort By Count largest to smallest.
  resourceCounts.sort((r1, r2) => {
    if (r2.count - r1.count === 0) {
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
    return r2.count - r1.count;
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
      count,
      reports,
      recipients,
    } = resource;
    const exists = domains.find((o) => o.domain === domain);
    if (exists) {
      reports.forEach(exists.reports.add, exists.reports);
      recipients.forEach(exists.recipients.add, exists.recipients);
      exists.count += count;
      return domains;
    }

    return [...domains, {
      domain,
      count,
      reports,
      recipients: new Set(resource.recipients),
    }];
  }, []);

  domainCounts = domainCounts.map((dc) => ({
    ...dc,
    reportCount: dc.reports.size,
    recipientCount: dc.recipients.size,
  }));

  if (removeLists) {
    domainCounts = domainCounts.map((dc) => ({
      ...dc,
      reports: undefined,
      recipients: undefined,
    }));
  }

  // Sort By Count largest to smallest.
  domainCounts.sort((r1, r2) => {
    if (r2.count - r1.count === 0) {
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
    return r2.count - r1.count;
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

  // const withResources = reportsWithResources(resources);

  const domainData = await generateResourceList({ resources, reports }, false);

  // // report based stats
  // const reportData = {};
  // reportData.num = reports.length;
  // reportData.numWithResources = withResources.length;
  // reportData.numWithNoResources = reportData.num - reportData.numWithResources;
  // reportData.percentWithResources = (reportData.numWithResources / reportData.num);
  // reportData.percentWithNoResources = (reportData.numWithNoResources / reportData.num);
  // reportData.numWithEclkc = domainData
  //   .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
  //   .reduce((accumulator, d) => accumulator + d.reports.length, 0);

  const recipientIntermediateData = {};
  recipientIntermediateData
    .allRecipeintIds = new Set([...reports.map((r) => r['activityRecipients.grant.recipientId'])].flat());
  recipientIntermediateData
    .allRecipientIdsWithResources = new Set([...domainData.map((dd) => [...dd.recipients])].flat());
  recipientIntermediateData
    .allRecipientIdsWithEclkcResources = new Set([
      ...domainData
        .filter((d) => d.domain === RESOURCE_DOMAIN.ECLKC)
        .map((dd) => [...dd.recipients]),
    ].flat());
  recipientIntermediateData
    .allRecipientIdsWithNonEclkcResources = new Set([
      ...domainData
        .filter((d) => d.domain !== RESOURCE_DOMAIN.ECLKC)
        .map((dd) => [...dd.recipients]),
    ].flat());
  // recipient based stats
  const recipientData = {};
  recipientData.num = recipientIntermediateData.allRecipeintIds.size;
  recipientData.numWithResources = recipientIntermediateData.allRecipientIdsWithResources.size;
  recipientData.numWithNoResources = recipientData.num - recipientData.numWithResources;
  recipientData.percentWithResources = (recipientData.numWithResources / recipientData.num);
  recipientData.percentWithNoResources = (recipientData.numWithNoResources / recipientData.num);
  recipientData.numWithEclkc = recipientIntermediateData.allRecipientIdsWithEclkcResources.size;
  recipientData
    .numWithNonEclkc = recipientIntermediateData.allRecipientIdsWithNonEclkcResources.size;
  recipientData.percentWithEclkc = (recipientData.numWithEclkc / recipientData.num);
  recipientData.percentWithNonEclkc = (recipientData.numWithNonEclkc / recipientData.num);

  return {
    numEclkc: formatNumber(recipientData.numWithEclkc),
    totalNumEclkc: formatNumber(recipientData.numWithResources),
    numEclkcPercentage: `${formatNumber(recipientData.percentWithEclkc, 2)}%`,
    numNonEclkc: formatNumber(recipientData.numWithNonEclkc),
    totalNumNonEclkc: formatNumber(recipientData.numWithResources),
    numNonEclkcPercentage: `${formatNumber(recipientData.percentWithNonEclkc, 2)}%`,
    numResources: formatNumber(recipientData.numWithResources),
    totalNumResources: formatNumber(recipientData.numWithResources),
    numResourcesPercentage: `${formatNumber(recipientData.percentWithResources, 2)}%`,
    numNoResources: formatNumber(recipientData.numWithNoResources),
    totalNumNoResources: formatNumber(recipientData.numWithResources),
    numNoResourcesPercentage: `${formatNumber(recipientData.percentWithNoResources, 2)}%`,
  };
}
