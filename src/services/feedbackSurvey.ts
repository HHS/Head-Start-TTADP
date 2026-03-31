import { Op } from 'sequelize';
import db from '../models';
import { auditLogger } from '../logger';

const { FeedbackSurvey } = db;

export type SaveFeedbackSurveyInput = {
  pageId: string;
  response: 'yes' | 'no';
  userId: number;
  regionId?: number | null;
  userRoles?: string[];
  comment?: string;
  timestamp?: string;
};

type SortBy = 'submittedAt' | 'createdAt' | 'pageId';
type SortDir = 'asc' | 'desc';

export type GetFeedbackSurveysInput = {
  pageId?: string;
  response?: 'yes' | 'no';
  q?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: number;
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

export async function getFeedbackSurveys(filters: GetFeedbackSurveysInput = {}) {
  const {
    pageId,
    response,
    q,
    createdAtFrom,
    createdAtTo,
    sortBy = 'submittedAt',
    sortDir = 'desc',
    limit = 500,
  } = filters;

  const where = {} as {
    pageId?: { [Op.iLike]: string };
    response?: 'yes' | 'no';
    createdAt?: {
      [Op.gte]?: Date;
      [Op.lt]?: Date;
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

  const safeSortBy: SortBy[] = ['submittedAt', 'createdAt', 'pageId'];
  const safeSortDir: SortDir[] = ['asc', 'desc'];
  const normalizedSortBy = safeSortBy.includes(sortBy) ? sortBy : 'submittedAt';
  const normalizedSortDir = safeSortDir.includes(sortDir) ? sortDir : 'desc';

  const rows = await FeedbackSurvey.findAll({
    where,
    order: [[normalizedSortBy, normalizedSortDir.toUpperCase()]],
    limit,
  });

  return rows;
}

export default saveFeedbackSurvey;
