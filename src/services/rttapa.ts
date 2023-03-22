import faker from '@faker-js/faker';
import Recipient from '../policies/recipient';
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

const mockGoals = [
  {
    id: 1,
    ids: [1, 2, 3],
    goalStatus: 'Not Started',
    createdOn: new Date(),
    goalText: 'The active and engaged Head Start Association provides leadership within the state early childhood community and the state Head Start and Early Head Start community.',
    goalNumbers: ['19160'],
    objectiveCount: 3,
    goalTopics: ['Human Resources', 'Parent and Family Engagements'],
    reasons: ['Ongoing Quality Improvement'],
    previousStatus: 'null',
    isRttapa: 'Yes',
    objectives: [
      {
        id: 1,
        title: 'The Grantee Specialist (GS) team will support the directors to set a clear direction for the Head Start Association for the next three years.',
        arNumber: 'AR 1',
        ttaProvided: 'TTA 1',
        endDate: '01/01/2021',
        reasons: ['Ongoing Quality Improvement'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: [{
          legacyId: 'Legacy 1',
          number: 'AR 1',
          id: 1,
          endDate: '2021-01-01',
        }],
      },
      {
        id: 2,
        title: 'TA staff will provide an opportunity for participants to discuss EPRR planning strategies with other GRs throughout the region.',
        arNumber: 'AR 2',
        ttaProvided: 'TTA 2',
        endDate: '01/01/2021',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: [
          {
            legacyId: 'Legacy 2',
            number: 'AR 2',
            id: 2,
            endDate: '2021-01-01',
          },
        ],
      },
      {
        id: 3,
        title: 'Health Specialist (HS) will present, in detail, the three phases of Emergency Management and the planning components included in each phase.',
        arNumber: 'AR 3',
        ttaProvided: 'TTA 3',
        endDate: '01/01/2021',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'In Progress',
        grantNumbers: ['Grant 1', 'Grant 2'],
        activityReports: [{
          legacyId: 'Legacy 3',
          number: 'AR 3',
          id: 3,
          endDate: '2021-01-01',
        }],
      },
    ],
  },
  {
    id: 34184,
    ids: [34184],
    goalStatus: 'In Progress',
    createdOn: new Date(),
    goalText: 'The HS/EHS Director will have the knowledge, skills and resources needed to be effective in her new role',
    goalNumbers: ['G-34184'],
    objectiveCount: 0,
    goalTopics: ['Community and Self Asssesment'],
    reasons: ['Reason 1', 'Reason 2'],
    previousStatus: 'Not Started',
    objectives: [],
    isRttapa: 'Yes',
  },
];

const mockRttapa = (
  id: number,
  regionId?: number,
  recipientId?: number,
): RttapaResponse => ({
  id,
  createdAt: new Date(),
  regionId: regionId || 1,
  recipientId: recipientId || 1,
  goals: mockGoals,
  notes: 'Notes',
  user: {
    id,
    name: faker.name.findName(),
  },
});

export async function rttapa(reportId: number): Promise<RttapaResponse> {
  return RttapaPilot.findOne({
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
    ],
    where: { id: reportId },
    raw: true,
  });
}

export async function allRttapas(regionId: number, recipientId: number): Promise<RttapaResponse[]> {
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
    ],
    where: { regionId, recipientId },
    raw: true,
  });
}

export async function newRttapa(userId: number, data: NewRttapaRequest): Promise<RttapaResponse> {
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
          'objectives', gg."objectives"
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
              SELECT ar.topic
              FROM UNNEST(
                ARRAY_AGG(ari."topics") filter (WHERE ari."topics" IS NOT NULL AND array_length(ari."topics",1) > 0)
                )ar(topic)
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
            SELECT ARRAY_AGG(DISTINCT rx.reason)
            FROM (
              SELECT DISTINCT rxx.reason
              FROM UNNEST(
                ARRAY_AGG(ari."reason") filter (WHERE ari."reason" IS NOT NULL AND array_length(ari."reason",1) > 0)
                )rxx(reason)
            ) rx(reason)
            GROUP BY TRUE
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
                  SELECT ARRAY_AGG(DISTINCT rx.reason)
                  FROM (
                    SELECT DISTINCT rxx.reason
                    FROM UNNEST(
                        ARRAY_AGG(arii."reason") filter (WHERE arii."reason" IS NOT NULL AND array_length(arii."reason",1) > 0)
                      )rxx(reason)
                  ) rx(reason)
                  GROUP BY TRUE
                ) "reasons",
                (ARRAY_AGG(oii.status ORDER BY oii.id ASC))[1] "status",
                ARRAY_AGG(DISTINCT grii.number) "grantNumbers",
                jsonb_agg(DISTINCT jsonb_build_object(
                  'legacyId', arii."legacyId",
                  'number', 'R' || LPAD(arii."regionId"::text, 2, '0') || '-AR-' ||arii.id,
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
          ) "objectives"
        FROM "Goals" gi
        JOIN UNNEST(ARRAY_AGG(DISTINCT "grants->goals".id)) gx(id)
        ON gi.id = gx.id
        JOIN "Objectives" oi
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
  });

  return rttapa(rttapaReport.id);
}
