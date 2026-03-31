import { Op } from 'sequelize';
import db from '../models';
import { auditLogger } from '../logger';

const { FeedbackSurvey, FeedbackSurveyCompletion } = db;

export type SaveFeedbackSurveyInput = {
  pageId: string;
  response: 'yes' | 'no';
  userId: number;
  regionId?: number | null;
  userRoles?: string[];
  comment?: string;
  timestamp?: string;
};

type SortBy = 'submittedAt' | 'createdAt' | 'pageId' | 'regionId' | 'response';
type SortDir = 'asc' | 'desc';

export type GetFeedbackSurveysInput = {
  pageId?: string;
  response?: 'yes' | 'no';
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
  pageId: string;
  userId: number;
  timestamp?: string;
};

type GetFeedbackSurveyCompletionStatusInput = {
  pageId: string;
  userId: number;
};

export async function saveFeedbackSurvey(feedbackData: SaveFeedbackSurveyInput) {
  const {
    pageId,
    response,
    comment,
    timestamp,
    userId,
    regionId,
    userRoles,
  } = feedbackData;

  const submittedAt = timestamp ? new Date(timestamp) : new Date();
  const normalizedComment = comment || '';
  let normalizedRegionId = regionId ?? null;
  let normalizedUserRoles = Array.isArray(userRoles) ? userRoles.filter(Boolean) : [];

  if (normalizedRegionId === null || normalizedUserRoles.length === 0) {
    const user = await db.User.findByPk(userId, {
      attributes: ['homeRegionId'],
      include: [{
        model: db.Role,
        as: 'roles',
        attributes: ['name', 'fullName'],
        through: { attributes: [] },
      }],
    });

    normalizedRegionId = normalizedRegionId ?? user?.homeRegionId ?? null;
    if (normalizedUserRoles.length === 0) {
      normalizedUserRoles = (user?.roles || [])
        .map((role) => role.fullName || role.name)
        .filter(Boolean);
    }
  }

  const feedback = await FeedbackSurvey.create({
    pageId,
    response,
    regionId: normalizedRegionId,
    userRoles: normalizedUserRoles,
    comment: normalizedComment,
    submittedAt,
  });

  // Log the feedback for analytics
  auditLogger.info('Survey feedback submitted', {
    pageId,
    response,
    commentLength: normalizedComment.length,
    timestamp: submittedAt.toISOString(),
    regionId: normalizedRegionId,
    userRoles: normalizedUserRoles,
    feedbackId: feedback.id,
  });

  return feedback;
}

export async function getFeedbackSurveys(
  filters: GetFeedbackSurveysInput = {},
): Promise<GetFeedbackSurveysResult> {
  const {
    pageId,
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
    response?: 'yes' | 'no';
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
    order: [[normalizedSortBy, normalizedSortDir.toUpperCase()]],
    limit,
    offset,
  });

  return {
    rows,
    count,
  };
}

export async function markFeedbackSurveyCompleted(
  input: SaveFeedbackSurveyCompletionInput,
) {
  const {
    pageId,
    userId,
    timestamp,
  } = input;

  const completedAt = timestamp ? new Date(timestamp) : new Date();

  const [completion] = await FeedbackSurveyCompletion.findOrCreate({
    where: {
      pageId,
      userId,
    },
    defaults: {
      pageId,
      userId,
      completedAt,
    },
  });

  return completion;
}

export async function hasCompletedFeedbackSurvey(
  input: GetFeedbackSurveyCompletionStatusInput,
): Promise<boolean> {
  const completion = await FeedbackSurveyCompletion.findOne({
    where: {
      pageId: input.pageId,
      userId: input.userId,
    },
    attributes: ['id'],
  });

  return Boolean(completion);
}

export default saveFeedbackSurvey;
