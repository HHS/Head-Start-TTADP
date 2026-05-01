/* eslint-disable no-plusplus */

import formatMonitoringCitationName from '../lib/formatMonitoringCitationName';
import { auditLogger } from '../logger';
import db, { sequelize } from '../models';

const { Citation } = db;

export async function textByCitation(
  citationIds: string[]
): Promise<{ text: string; citation: string }[]> {
  return Citation.findAll({
    attributes: [['standard_text', 'text'], 'citation'],
    where: {
      citation: citationIds,
    },
    group: ['standard_text', 'citation'],
    order: ['citation'],
  });
}

/*
  The purpose of this function is to get citations by grant id.
  We then need to format the response for how it needs to be
  displayed on the FE for selection on objectives.
*/

export interface CitationsByGrantId {
  standardId: number;
  citation: string;
  grants: {
    acro: string;
    grantId: number;
    citation: string;
    severity: number;
    findingId: string;
    reviewName: string;
    findingType: string;
    grantNumber: string;
    findingSource: string | null;
    reportDeliveryDate: Date;
    monitoringFindingStatusName: string;
    name: string;
  }[];
}

function addCitationNames(citationsByGrantId: CitationsByGrantId[]): CitationsByGrantId[] {
  return citationsByGrantId
    .map((citation) => ({
      ...citation,
      grants: citation.grants
        .map((grant) => {
          const name = formatMonitoringCitationName({
            acro: grant.acro,
            citation: grant.citation,
            findingSource: grant.findingSource,
          });

          if (!name) {
            return null;
          }

          return {
            ...grant,
            name,
          };
        })
        .filter(Boolean) as CitationsByGrantId['grants'],
    }))
    .filter((citation) => citation.grants.length > 0);
}

export async function getCitationsByGrantIds(
  grantIds: number[],
  reportStartDate: string
): Promise<CitationsByGrantId[]> {
  const grantsByCitations = await sequelize.query(
    /* sql */
    `WITH monitoring_template AS (
      SELECT DISTINCT ON (standard) id monitoring_gtid
      FROM "GoalTemplates"
      WHERE standard = 'Monitoring'
        AND "deletedAt" IS NULL
      ORDER BY standard, id DESC
    )
    SELECT
      c.standard_id AS "standardId",
      c.citation,
      JSONB_AGG(DISTINCT
        JSONB_BUILD_OBJECT(
          'findingId', c.finding_uuid,
          'grantId', gc."grantId",
          'grantNumber', gr.number,
          'reviewName', dr.review_name,
          'reportDeliveryDate', c.latest_report_delivery_date,
          'findingType', c.calculated_finding_type,
          'findingSource', c.source_category,
          'monitoringFindingStatusName', c.raw_status,
          'citation', c.citation,
          'severity', CASE
            WHEN c.calculated_finding_type = 'Deficiency' THEN 1
            WHEN c.calculated_finding_type = 'Noncompliance' THEN 2
            ELSE 3
          END,
          'acro', CASE
            WHEN c.calculated_finding_type = 'Deficiency' THEN 'DEF'
            WHEN c.calculated_finding_type = 'Noncompliance' THEN 'ANC'
            ELSE 'AOC'
          END
        )
      ) grants
    FROM "GrantCitations" gc
    JOIN "Citations" c
      ON c.id = gc."citationId"
      AND c."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.id = gc."grantId"
    JOIN "Goals" g
      ON g."grantId" = gc."grantId"
      AND g."status" NOT IN ('Closed', 'Suspended')
      AND g."deletedAt" IS NULL
    JOIN monitoring_template
      ON g."goalTemplateId" = monitoring_gtid
    JOIN "DeliveredReviewCitations" drc
      ON drc."citationId" = c.id
      AND '${reportStartDate}'::date BETWEEN drc.latest_review_start AND drc.latest_review_end
    JOIN "DeliveredReviews" dr
      ON dr.id = drc."deliveredReviewId"
      AND dr."deletedAt" IS NULL
    WHERE c.active = true
      AND gc."grantId" IN (${grantIds.join(',')})
    GROUP BY 1, 2
    ORDER BY 2, 1`
  );

  const results = grantsByCitations[0] as CitationsByGrantId[];

  if (results.length === 0) {
    auditLogger.warn(
      `citations.getCitationsByGrantIds - zero active citations returned for grantIds: [${grantIds.join(', ')}]. ` +
        'MonitoringFindingStandards or MonitoringStandards rows may all be source-deleted.'
    );
  }

  return addCitationNames(results);
}
