import moment from 'moment-timezone';
import { Op } from 'sequelize';
import { FEEDBACK_SURVEY_PAGES, FEEDBACK_SURVEY_STATUSES } from '../constants';
import { auditLogger } from '../logger';
import db from '../models';

const { FeedbackSurveyDefinition, FeedbackSurveyQuestion, FeedbackSurveyCompletion, sequelize } = db;

const TIMEZONE = 'America/New_York';

// What admins submit: a date range, or manualClose to open today with no end date
export type SurveyScheduleInput = {
  manualClose?: boolean;
  startDate?: string;
  endDate?: string;
};

// A resolved window; a null end date means the survey stays open until an admin closes it
type SurveyWindow = {
  startDate: string;
  endDate: string | null;
};

export type CreateSurveyDefinitionInput = SurveyScheduleInput & {
  pageId: string;
  question: string;
};

/**
 * Thrown for invalid admin requests (overlaps, bad state transitions) so routes can return 400
 */
export class FeedbackSurveyDefinitionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'FeedbackSurveyDefinitionError';
    this.status = status;
  }
}

// Surveys open and close on Eastern calendar days, matching the cron schedule timezone
export const todayDateOnly = (): string => moment().tz(TIMEZONE).format('YYYY-MM-DD');

function resolveWindow({ manualClose, startDate, endDate }: SurveyScheduleInput): SurveyWindow {
  if (manualClose) {
    return { startDate: todayDateOnly(), endDate: null };
  }

  if (!startDate || !endDate) {
    throw new FeedbackSurveyDefinitionError('Start and end dates are required unless the survey is closed manually');
  }

  return { startDate, endDate };
}

// Active surveys whose window includes the given day; open-ended surveys never expire on their own
export const openOnDay = (day: string) => ({
  startDate: { [Op.lte]: day },
  [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: day } }],
});

const questionInclude = {
  model: FeedbackSurveyQuestion,
  as: 'questions',
  attributes: ['id', 'questionText', 'order'],
};

async function assertNoOverlap(pageId: string, { startDate, endDate }: SurveyWindow, excludeId?: number) {
  const where: Record<string | symbol, unknown> = {
    pageId,
    status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
    [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: startDate } }],
  };

  if (endDate) {
    where.startDate = { [Op.lte]: endDate };
  }

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const overlapping = await FeedbackSurveyDefinition.findOne({ where, attributes: ['id', 'startDate', 'endDate'] });

  if (overlapping) {
    throw new FeedbackSurveyDefinitionError(
      `${FEEDBACK_SURVEY_PAGES[pageId] || pageId} already has an active survey from ${overlapping.startDate} ${
        overlapping.endDate ? `to ${overlapping.endDate}` : 'until it is closed'
      }`
    );
  }
}

function assertValidDates({ startDate, endDate }: SurveyWindow) {
  if (!endDate) {
    return;
  }

  if (endDate < startDate) {
    throw new FeedbackSurveyDefinitionError('End date must be on or after start date');
  }

  if (endDate < todayDateOnly()) {
    throw new FeedbackSurveyDefinitionError('End date cannot be in the past');
  }
}

export async function listSurveyDefinitions() {
  const surveys = await FeedbackSurveyDefinition.findAll({
    attributes: [
      'id',
      'pageId',
      'startDate',
      'endDate',
      'status',
      'closedAt',
      'createdAt',
      [
        // Every submission answers every question, so answers to the first question = submissions
        sequelize.literal(`(
          SELECT COUNT(*) FROM "FeedbackSurveys" fs
          WHERE fs."questionId" = (
            SELECT q.id FROM "FeedbackSurveyQuestions" q
            WHERE q."surveyId" = "FeedbackSurveyDefinition"."id"
            ORDER BY q."order" ASC LIMIT 1
          )
        )`),
        'responseCount',
      ],
    ],
    include: [questionInclude],
    order: [
      ['startDate', 'DESC'],
      ['id', 'DESC'],
      [{ model: FeedbackSurveyQuestion, as: 'questions' }, 'order', 'ASC'],
    ],
  });

  const rows = surveys.map((survey) => {
    const json = survey.toJSON();
    return { ...json, responseCount: Number(json.responseCount) };
  });

  return {
    active: rows.filter((s) => s.status === FEEDBACK_SURVEY_STATUSES.ACTIVE),
    closed: rows.filter((s) => s.status === FEEDBACK_SURVEY_STATUSES.CLOSED),
    pages: FEEDBACK_SURVEY_PAGES,
  };
}

export async function getSurveyDefinition(id: number) {
  return FeedbackSurveyDefinition.findByPk(id, {
    include: [questionInclude],
    order: [[{ model: FeedbackSurveyQuestion, as: 'questions' }, 'order', 'ASC']],
  });
}

export async function createSurveyDefinition(input: CreateSurveyDefinitionInput, userId: number) {
  const { pageId, question } = input;

  if (!FEEDBACK_SURVEY_PAGES[pageId]) {
    throw new FeedbackSurveyDefinitionError('Unknown survey page');
  }

  const { startDate, endDate } = resolveWindow(input);
  assertValidDates({ startDate, endDate });
  await assertNoOverlap(pageId, { startDate, endDate });

  const survey = await FeedbackSurveyDefinition.create({
    pageId,
    startDate,
    endDate,
    status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
    createdBy: userId,
  });

  await FeedbackSurveyQuestion.create({
    surveyId: survey.id,
    questionText: question,
    order: 1,
  });

  auditLogger.info(`Feedback survey ${survey.id} created for ${pageId} by user ${userId}`);

  return getSurveyDefinition(survey.id);
}

export async function closeSurveyDefinition(id: number) {
  const survey = await FeedbackSurveyDefinition.findByPk(id);

  if (!survey) {
    throw new FeedbackSurveyDefinitionError('Survey not found', 404);
  }

  if (survey.status === FEEDBACK_SURVEY_STATUSES.CLOSED) {
    throw new FeedbackSurveyDefinitionError('Survey is already closed');
  }

  await survey.update({ status: FEEDBACK_SURVEY_STATUSES.CLOSED, closedAt: new Date() });

  auditLogger.info(`Feedback survey ${id} closed`);

  return getSurveyDefinition(id);
}

export async function reopenSurveyDefinition(id: number, schedule: SurveyScheduleInput) {
  const survey = await FeedbackSurveyDefinition.findByPk(id);

  if (!survey) {
    throw new FeedbackSurveyDefinitionError('Survey not found', 404);
  }

  if (survey.status === FEEDBACK_SURVEY_STATUSES.ACTIVE) {
    throw new FeedbackSurveyDefinitionError('Survey is already active');
  }

  const window = resolveWindow(schedule);
  assertValidDates(window);
  await assertNoOverlap(survey.pageId, window, id);

  await survey.update({
    status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
    startDate: window.startDate,
    endDate: window.endDate,
    closedAt: null,
  });

  auditLogger.info(`Feedback survey ${id} reopened (${window.startDate} - ${window.endDate ?? 'manual close'})`);

  return getSurveyDefinition(id);
}

/**
 * Returns the survey currently showing on a page (active and within its date window),
 * and whether the user has already completed it
 */
export async function getActiveSurveyForPage(pageId: string, userId: number) {
  const today = todayDateOnly();

  const survey = await FeedbackSurveyDefinition.findOne({
    where: {
      pageId,
      status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
      ...openOnDay(today),
    },
    attributes: ['id', 'pageId', 'startDate', 'endDate'],
    include: [questionInclude],
    order: [
      ['startDate', 'DESC'],
      [{ model: FeedbackSurveyQuestion, as: 'questions' }, 'order', 'ASC'],
    ],
  });

  if (!survey) {
    return { survey: null, completed: false };
  }

  const completion = await FeedbackSurveyCompletion.findOne({
    where: { surveyId: survey.id, userId },
    attributes: ['id'],
  });

  return { survey: survey.toJSON(), completed: Boolean(completion) };
}

/**
 * Closes every active survey whose end date has passed. Run nightly from cron.
 */
export async function closeExpiredSurveyDefinitions(): Promise<number> {
  const [closedCount] = await FeedbackSurveyDefinition.update(
    { status: FEEDBACK_SURVEY_STATUSES.CLOSED, closedAt: new Date() },
    {
      where: {
        status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
        endDate: { [Op.lt]: todayDateOnly() },
      },
    }
  );

  auditLogger.info(`Closed ${closedCount} expired feedback surveys`);

  return closedCount;
}
