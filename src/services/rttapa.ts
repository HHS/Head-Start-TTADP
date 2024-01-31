import db from '../models';
import {
  NewRttapaRequest,
  RttapaResponse,
} from './types/rttapa';

const {
  sequelize,
  Grant,
  Recipient: RecipientModel,
  Goal,
  RttapaPilot,
} = db;

export async function findRttapa(reportId: number): Promise<RttapaResponse> {
  return RttapaPilot.findOne({
    attributes: [
      'id',
      'goals',
      'regionId',
      'recipientId',
      'notes',
      'reviewDate',
      [
        sequelize.fn(
          'jsonb_build_object',
          sequelize.literal('\'id\''),
          sequelize.col('user.id'),
          sequelize.literal('\'name\''),
          sequelize.col('user.name'),
        ),
        'user',
      ],
      'createdAt',
    ],
    where: { id: reportId },
    raw: true,
  });
}

export async function findAllRttapa(
  regionId: number,
  recipientId: number,
): Promise<RttapaResponse[]> {
  return RttapaPilot.findAll({
    attributes: [
      'id',
      'goals',
      'regionId',
      'recipientId',
      'notes',
      [
        sequelize.fn(
          'jsonb_build_object',
          sequelize.literal('\'id\''),
          sequelize.col('user.id'),
          sequelize.literal('\'name\''),
          sequelize.col('user.name'),
        ),
        'user',
      ],
      'createdAt',
      'reviewDate',
    ],
    where: { regionId, recipientId },
    raw: true,
  });
}

export async function createRttapa(
  userId: number,
  data: NewRttapaRequest,
): Promise<RttapaResponse> {
  const rttapaData = await RecipientModel.findOne({
    attributes: [
      [sequelize.col('Recipient.id'), 'recipientId'],
      [sequelize.col('grants.regionId'), 'regionId'],
      [sequelize.literal(`(
        SELECT
        jsonb_agg(DISTINCT jsonb_build_object(
          'id', gg.id,
          'ids', gg.ids,
          'goalStatus', gg."goalStatus",
          'createdOn', gg."createdOn",
          'goalText', gg."goalText",
          'goalNumbers', gg."goalNumbers",
          'objectiveCount', gg."objectiveCount",
          'goalTopics', gg."goalTopics",
          'reasons', gg."reasons",
          'previousStatus', gg."previousStatus",
          'isRttapa', gg."isRttapa",
          'objectives', gg."objectives",
          'fieldPromptResponses', gg."fieldPromptResponses"
        ))
      FROM (
        SELECT
          MIN(gi.id) id,
          ARRAY_AGG(DISTINCT gi.id) ids,
          (ARRAY_AGG(gi.status ORDER BY gi.id ASC))[1] "goalStatus",
          MIN(gi."createdAt") "createdOn",
          TRIM(gi.name) "goalText",
          ARRAY_AGG(DISTINCT 'G-' || gi.id) "goalNumbers",
          COUNT(DISTINCT TRIM(oi.title)) "objectiveCount",
          (
            SELECT
              ARRAY_REMOVE(
                ARRAY_AGG(DISTINCT COALESCE(
                txy.name,
                txx.name
              ) )FILTER (WHERE txx."deletedAt" IS NULL
                    OR txx."mapsTo" IS NOT NULL), NULL)
            FROM (
              SELECT DISTINCT tart.topic
              FROM "ActivityReports" tar
              JOIN UNNEST(ARRAY_AGG(ari.id)) arix(id)
              ON tar.id = arix.id
              CROSS JOIN UNNEST(tar.topics) tart(topic)
              UNION ALL
              SELECT aro.topic
              FROM UNNEST(ARRAY_AGG(ti.name)) aro(topic)
            ) tx(topic)
            JOIN "Topics" txx
            ON tx.topic = txx.name
            LEFT JOIN "Topics" txy
            ON txx."mapsTo" = txy.id
            GROUP BY TRUE
          ) "goalTopics",
          (
            SELECT ARRAY_AGG(DISTINCT rarr.r)
            FROM "ActivityReports" rar
            JOIN UNNEST(ARRAY_AGG(ari.id)) arix(id)
            ON rar.id = arix.id
            CROSS JOIN UNNEST(rar.reason) rarr(r)
          ) "reasons",
          (ARRAY_AGG(gi."previousStatus" ORDER BY gi.id ASC))[1] "previousStatus",
          (ARRAY_AGG(gi."isRttapa" ORDER BY gi.id ASC))[1] "isRttapa",
          (
            SELECT
              jsonb_agg(DISTINCT jsonb_build_object(
                'id', oo.id,
                'ids', oo.ids,
                'title', oo."title",
                'arNumber', oo."arNumber",
                'ttaProvided', oo."ttaProvided",
                'endDate', oo."endDate",
                'reasons', oo."reasons",
                'status', oo."status",
                'grantNumbers', oo."grantNumbers",
                'activityReports', oo."activityReports"
              ))
            FROM (
              SELECT
                MIN(oii.id) id,
                ARRAY_AGG(DISTINCT oii.id) ids,
                TRIM(oii.title) title,
                (ARRAY_AGG('R' || LPAD(arii."regionId"::text, 2, '0') || '-AR-' || arii.id ORDER BY arii.id ASC))[1] "arNumber",
                ARRAY_AGG(DISTINCT aroii."ttaProvided") "ttaProvided",
                MAX(arii."endDate") "endDate",
                (
                  SELECT ARRAY_AGG(DISTINCT rarr.reason)
                  FROM "ActivityReports" rar
                  JOIN UNNEST(ARRAY_AGG(arii.id)) ariix(id)
                  ON rar.id = ariix.id
                  CROSS JOIN UNNEST(rar.reason) rarr(reason)
                ) "reasons",
                (ARRAY_AGG(oii.status ORDER BY oii.id ASC))[1] "status",
                ARRAY_AGG(DISTINCT grii.number) "grantNumbers",
                jsonb_agg(DISTINCT jsonb_build_object(
                  'legacyId', arii."legacyId",
                  'number', 'R' || LPAD(arii."regionId"::text, 2, '0') || '-AR-' ||arii.id,
                  'displayId', 'R' || LPAD(arii."regionId"::text, 2, '0') || '-AR-' ||arii.id,
                  'id', arii.id,
                  'endDate', arii."endDate"
                )) "activityReports"
              FROM "Objectives" oii
              JOIN UNNEST(ARRAY_AGG(oi.id)) ox(id)
              ON oii.id = ox.id
              JOIN "Goals" gii
              ON oii."goalId" = gii.id
              JOIN "Grants" grii
              ON gii."grantId" = grii.id
              LEFT JOIN "ActivityReportObjectives" aroii
              ON oii.id = aroii."objectiveId"
              LEFT JOIN "ActivityReports" arii
              ON aroii."activityReportId" = arii.id
              GROUP BY TRIM(oii.title)
            ) oo
          ) "objectives",
          (
            SELECT
              jsonb_agg(DISTINCT jsonb_build_object(
                'fieldPromptId', gtfp.id,
                'ordinal', gtfp.ordinal,
                'title', gtfp.title,
                'hint', gtfp.hint,
                'fieldType', gtfp."fieldType",
                'options', gtfp.options,
                'validations', gtfp.validations,
                'response', gfr.response
              )) "fieldPromptResponse"
            FROM "GoalFieldResponses" gfr
            JOIN UNNEST(ARRAY_AGG(DISTINCT "gi".id)) gix(id)
            ON gfr.id = gix.id
            JOIN "GoalTemplateFieldPrompts" gtfp
            ON gfr."goalTemplateFieldPromptId" = gtfp.id
            GROUP BY gtfp.id
          ) "fieldPromptResponses"
        FROM "Goals" gi
        JOIN UNNEST(ARRAY_AGG(DISTINCT "grants->goals".id)) gx(id)
        ON gi.id = gx.id
        LEFT JOIN "Objectives" oi
        ON gi.id = oi."goalId"
        LEFT JOIN "ActivityReportObjectives" aroi
        ON oi.id = aroi."objectiveId"
        LEFT JOIN "ActivityReports" ari
        ON aroi."activityReportId" = ari.id
        LEFT JOIN "ActivityReportObjectiveTopics" aroti
        ON aroi.id = aroti."activityReportObjectiveId"
        LEFT JOIN "Topics" ti
        ON aroti."topicId" = ti.id
        GROUP BY TRIM(gi.name)
      ) gg
      )`), 'goals'],
    ],
    where: { id: data.recipientId },
    include: [
      {
        attributes: [],
        model: Grant.scope(),
        as: 'grants',
        where: { regionId: data.regionId },
        include: [
          {
            attributes: [],
            model: Goal,
            as: 'goals',
            where: { id: data.goalIds },
          },
        ],
      },
    ],
    group: [
      sequelize.col('Recipient.id'),
      sequelize.col('grants.regionId'),
    ],
    raw: true,
  });

  const rttapaReport = await RttapaPilot.create({
    ...rttapaData,
    notes: data.notes,
    userId,
    reviewDate: data.reviewDate,
  });

  return findRttapa(rttapaReport.id);
}
