import { REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import db from '../models';
import { baseTRScopes } from './helpers';
import { getRecipientGrantIds, sessionRecipientGrantFilter } from './trSessionsForRecipient';
import type { IScopes } from './types';

const { ActivityReport, ActivityReportGoal, EventReportPilot, Goal, GoalTemplate } = db;

export interface ITTAHoursActivityReportRef {
  id: number;
  displayId: string;
}

export interface ITTAHoursSessionRef {
  id: number;
  eventId: number;
  eventDisplayId: string;
  sessionName: string;
}

export interface ITTAHoursOverTimeRow {
  startDate: string;
  duration: number;
  goals: string[];
  deliveryMethods: string[];
  activityReports: ITTAHoursActivityReportRef[];
  trainingReportSessions: ITTAHoursSessionRef[];
}

interface IRowAccumulator {
  startDate: string;
  duration: number;
  goals: Set<string>;
  deliveryMethods: Set<string>;
  activityReports: ITTAHoursActivityReportRef[];
  trainingReportSessions: ITTAHoursSessionRef[];
}

interface IActivityReportForHours {
  id: number;
  displayId: string;
  duration: string | null;
  deliveryMethod: string | null;
  getDataValue(key: 'startDate'): string;
}

interface IActivityReportGoalRow {
  activityReportId: number;
  name: string | null;
  goal: { name: string | null; goalTemplate: { standard: string | null } | null };
}

interface ISessionForHours {
  id: number;
  startDate: string;
  data: {
    duration?: number | string;
    deliveryMethod?: string;
    sessionName?: string;
  };
  goalTemplates: { standard: string | null }[];
}

interface IEventForHours {
  id: number;
  eventId: string;
  sessionReports: ISessionForHours[];
}

function getRow(rows: Map<string, IRowAccumulator>, startDate: string): IRowAccumulator {
  let row = rows.get(startDate);
  if (!row) {
    row = {
      startDate,
      duration: 0,
      goals: new Set(),
      deliveryMethods: new Set(),
      activityReports: [],
      trainingReportSessions: [],
    };
    rows.set(startDate, row);
  }
  return row;
}

function addDeliveryMethod(row: IRowAccumulator, deliveryMethod: string | null | undefined) {
  const normalized = (deliveryMethod || '').trim().toLowerCase();
  if (normalized) row.deliveryMethods.add(normalized);
}

async function addActivityReports(
  scopes: IScopes,
  grantIds: number[],
  rows: Map<string, IRowAccumulator>
) {
  const reports = (await ActivityReport.findAll({
    attributes: ['id', 'legacyId', 'regionId', 'startDate', 'duration', 'deliveryMethod'],
    where: {
      [Op.and]: [scopes.activityReport],
      calculatedStatus: REPORT_STATUSES.APPROVED,
      startDate: { [Op.ne]: null },
    },
    order: [
      ['startDate', 'ASC'],
      ['id', 'ASC'],
    ],
  })) as IActivityReportForHours[];

  if (reports.length === 0) return;

  // Only show goals for the scoped recipient's grants, since multi-recipient ARs carry
  // goals for other recipients too.
  const reportGoals = (
    grantIds.length
      ? await ActivityReportGoal.findAll({
          attributes: ['activityReportId', 'name'],
          where: { activityReportId: reports.map((r) => r.id) },
          include: [
            {
              model: Goal,
              as: 'goal',
              attributes: ['name'],
              required: true,
              where: { grantId: grantIds },
              include: [
                {
                  model: GoalTemplate,
                  as: 'goalTemplate',
                  attributes: ['standard'],
                  required: false,
                },
              ],
            },
          ],
          raw: true,
          nest: true,
        })
      : []
  ) as IActivityReportGoalRow[];

  const goalsByReport = new Map<number, string[]>();
  reportGoals.forEach((rg) => {
    const label = rg.goal?.goalTemplate?.standard || rg.name || rg.goal?.name;
    if (!label) return;
    const list = goalsByReport.get(rg.activityReportId) || [];
    list.push(label);
    goalsByReport.set(rg.activityReportId, list);
  });

  reports.forEach((report) => {
    // DATEONLY's raw value is YYYY-MM-DD; the model getter reformats to MM/DD/YYYY.
    const row = getRow(rows, report.getDataValue('startDate'));
    row.duration += parseFloat(report.duration) || 0;
    addDeliveryMethod(row, report.deliveryMethod);
    (goalsByReport.get(report.id) || []).forEach((g) => {
      row.goals.add(g);
    });
    row.activityReports.push({ id: report.id, displayId: report.displayId });
  });
}

async function addTrainingReportSessions(
  scopes: IScopes,
  grantIds: number[],
  rows: Map<string, IRowAccumulator>
) {
  if (grantIds.length === 0) return;

  const baseScopes = baseTRScopes(scopes);
  const events = (await EventReportPilot.findAll({
    attributes: ['id', 'eventId'],
    where: baseScopes.where,
    include: [
      {
        ...baseScopes.include,
        attributes: ['id', 'startDate', 'data'],
        where: {
          ...baseScopes.include.where,
          startDate: { [Op.ne]: null },
          [Op.and]: [sessionRecipientGrantFilter(grantIds)],
        },
        include: [
          {
            model: GoalTemplate,
            as: 'goalTemplates',
            attributes: ['standard'],
            through: { attributes: [] },
            required: false,
          },
        ],
      },
    ],
  })) as IEventForHours[];

  events.forEach((event) => {
    event.sessionReports.forEach((session) => {
      const row = getRow(rows, session.startDate);
      row.duration += parseFloat(session.data?.duration as string) || 0;
      addDeliveryMethod(row, session.data?.deliveryMethod);
      (session.goalTemplates || []).forEach((gt) => {
        if (gt.standard) row.goals.add(gt.standard);
      });
      row.trainingReportSessions.push({
        id: session.id,
        eventId: event.id,
        eventDisplayId: event.eventId,
        sessionName: session.data?.sessionName || '',
      });
    });
  });
}

/**
 * Widget: TTA hours provided over time, for the RTR TTA History tab.
 *
 * Returns one row per start date, summing recorded TTA duration (hours) from
 * approved Activity Reports (by AR start date) and complete Training Report
 * sessions (by session start date) for the scoped recipient. Each row also lists
 * the goals, delivery methods, and the AR / TR session references for that date.
 * Rows are sorted by start date ascending.
 */
export default async function ttaHoursProvidedOverTime(
  scopes: IScopes,
  _query: Record<string, unknown>
): Promise<ITTAHoursOverTimeRow[]> {
  const grantIds = await getRecipientGrantIds(scopes);
  const rows = new Map<string, IRowAccumulator>();

  await Promise.all([
    addActivityReports(scopes, grantIds, rows),
    addTrainingReportSessions(scopes, grantIds, rows),
  ]);

  return [...rows.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((row) => ({
      startDate: row.startDate,
      duration: Math.round(row.duration * 10) / 10,
      goals: [...row.goals].sort(),
      deliveryMethods: [...row.deliveryMethods].sort(),
      activityReports: row.activityReports,
      trainingReportSessions: row.trainingReportSessions.sort((a, b) => a.id - b.id),
    }));
}
