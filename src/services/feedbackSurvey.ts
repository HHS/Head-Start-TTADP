import { Op } from 'sequelize';
import { FEEDBACK_SURVEY_STATUSES } from '../constants';
import { auditLogger } from '../logger';
import db from '../models';
import { FeedbackSurveyDefinitionError, openOnDay, todayDateOnly } from './feedbackSurveyDefinitions';

const { FeedbackSurvey, FeedbackSurveyCompletion, FeedbackSurveyDefinition, FeedbackSurveyQuestion } = db;

export type ResponseValue = 'yes' | 'no';

export type SurveyAnswerInput = {
  questionId: number;
  response: ResponseValue;
  comment?: string;
};

export type SaveFeedbackSurveyInput = {
  surveyId: number;
  responses: SurveyAnswerInput[];
  userId: number;
  regionId?: number | null;
  userRoles?: string[];
  timestamp?: string;
};

type SortBy = 'submittedAt' | 'createdAt' | 'pageId' | 'regionId' | 'response';
type SortDir = 'asc' | 'desc';

export type GetFeedbackSurveysInput = {
  pageId?: string;
  surveyId?: number;
  response?: ResponseValue;
  q?: string;
  regionId?: number;
  userRole?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: number;
  offset?: number;
};

export type GetFeedbackSurveysResult = {
  rows: Array<Record<string, unknown>>;
  count: number;
};

type SaveFeedbackSurveyCompletionInput = {
  surveyId: number;
  pageId: string;
  userId: number;
  timestamp?: string;
};

/**
 * Loads the survey a submission is for and confirms it is currently showing,
 * and that the answers cover exactly the survey's questions
 */
async function getSurveyForSubmission(surveyId: number, responses: SurveyAnswerInput[]) {
  const today = todayDateOnly();
  const survey = await FeedbackSurveyDefinition.findOne({
    where: {
      id: surveyId,
      status: FEEDBACK_SURVEY_STATUSES.ACTIVE,
      ...openOnDay(today),
    },
    include: [{ model: FeedbackSurveyQuestion, as: 'questions', attributes: ['id'] }],
  });

  if (!survey) {
    throw new FeedbackSurveyDefinitionError('Survey is not currently active');
  }

  const questionIds = survey.questions.map((q) => q.id).sort();
  const answeredIds = responses.map((r) => r.questionId).sort();

  if (questionIds.length !== answeredIds.length || questionIds.some((id, i) => id !== answeredIds[i])) {
    throw new FeedbackSurveyDefinitionError('Every survey question must be answered exactly once');
  }

  return survey;
}

export async function saveFeedbackSurvey(feedbackData: SaveFeedbackSurveyInput) {
  const { surveyId, responses, timestamp, userId, regionId, userRoles } = feedbackData;

  const survey = await getSurveyForSubmission(surveyId, responses);

  const submittedAt = timestamp ? new Date(timestamp) : new Date();
  let normalizedRegionId = regionId ?? null;
  let normalizedUserRoles = Array.isArray(userRoles) ? userRoles.filter(Boolean) : [];

  if (normalizedRegionId === null || normalizedUserRoles.length === 0) {
    const user = await db.User.findByPk(userId, {
      attributes: ['homeRegionId'],
      include: [
        {
          model: db.Role,
          as: 'roles',
          attributes: ['name', 'fullName'],
          through: { attributes: [] },
        },
      ],
    });

    normalizedRegionId = normalizedRegionId ?? user?.homeRegionId ?? null;
    if (normalizedUserRoles.length === 0) {
      normalizedUserRoles = (user?.roles || []).map((role) => role.fullName || role.name).filter(Boolean);
    }
  }

  const feedback = await FeedbackSurvey.bulkCreate(
    responses.map(({ questionId, response, comment }) => ({
      pageId: survey.pageId,
      surveyId: survey.id,
      questionId,
      response,
      regionId: normalizedRegionId,
      userRoles: normalizedUserRoles,
      comment: comment || '',
      submittedAt,
    }))
  );

  // Log the feedback for analytics
  auditLogger.info('Survey feedback submitted', {
    pageId: survey.pageId,
    surveyId: survey.id,
    answers: responses.map(({ questionId, response, comment }) => ({
      questionId,
      response,
      commentLength: (comment || '').length,
    })),
    timestamp: submittedAt.toISOString(),
    regionId: normalizedRegionId,
    userRoles: normalizedUserRoles,
    feedbackIds: feedback.map((f) => f.id),
  });

  return { survey, feedback };
}

export async function getFeedbackSurveys(
  filters: GetFeedbackSurveysInput = {},
): Promise<GetFeedbackSurveysResult> {
  const {
    pageId,
    surveyId,
    response,
    q,
    regionId,
    userRole,
    createdAtFrom,
    createdAtTo,
    sortBy = 'submittedAt',
    sortDir = 'desc',
    limit = 500,
    offset = 0,
  } = filters;

  const where = {} as {
    pageId?: { [Op.iLike]: string };
    surveyId?: number;
    response?: ResponseValue;
    createdAt?: {
      [Op.gte]?: Date;
      [Op.lt]?: Date;
    };
    regionId?: number;
    userRoles?: {
      [Op.contains]: string[];
    };
    [Op.or]?: Array<{
      pageId?: { [Op.iLike]: string };
      comment?: { [Op.iLike]: string };
    }>;
  };

  if (pageId) {
    where.pageId = { [Op.iLike]: `%${pageId}%` };
  }

  if (surveyId !== undefined) {
    where.surveyId = surveyId;
  }

  if (response) {
    where.response = response;
  }

  if (regionId !== undefined) {
    where.regionId = regionId;
  }

  if (userRole) {
    where.userRoles = { [Op.contains]: [userRole] };
  }

  if (q) {
    where[Op.or] = [
      { pageId: { [Op.iLike]: `%${q}%` } },
      { comment: { [Op.iLike]: `%${q}%` } },
    ];
  }

  if (createdAtFrom || createdAtTo) {
    where.createdAt = {};

    if (createdAtFrom) {
      where.createdAt[Op.gte] = new Date(`${createdAtFrom}T00:00:00.000Z`);
    }

    if (createdAtTo) {
      const nextDay = new Date(`${createdAtTo}T00:00:00.000Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      where.createdAt[Op.lt] = nextDay;
    }
  }

  const safeSortBy: SortBy[] = ['submittedAt', 'createdAt', 'pageId', 'regionId', 'response'];
  const safeSortDir: SortDir[] = ['asc', 'desc'];
  const normalizedSortBy = safeSortBy.includes(sortBy) ? sortBy : 'submittedAt';
  const normalizedSortDir = safeSortDir.includes(sortDir) ? sortDir : 'desc';

  const { rows, count } = await FeedbackSurvey.findAndCountAll({
    where,
    include: [{ model: FeedbackSurveyQuestion, as: 'question', attributes: ['id', 'questionText'] }],
    order: [[normalizedSortBy, normalizedSortDir.toUpperCase()]],
    limit,
    offset,
  });

  return {
    rows,
    count,
  };
}

export async function markFeedbackSurveyCompleted(input: SaveFeedbackSurveyCompletionInput) {
  const { surveyId, pageId, userId, timestamp } = input;

  const completedAt = timestamp ? new Date(timestamp) : new Date();

  const [completion] = await FeedbackSurveyCompletion.findOrCreate({
    where: {
      surveyId,
      userId,
    },
    defaults: {
      surveyId,
      pageId,
      userId,
      completedAt,
    },
  });

  return completion;
}

export default saveFeedbackSurvey;
