import { Op } from 'sequelize';
import db from '../models';
import { auditLogger } from '../logger';

const { FeedbackSurvey } = db;

type SurveyType = 'scale' | 'thumbs';
type ThumbsValue = 'up' | 'down' | null;

export type SaveFeedbackSurveyInput = {
  pageId: string;
  rating: number;
  userId: number;
  surveyType?: SurveyType;
  thumbs?: ThumbsValue;
  comment?: string;
  timestamp?: string;
};

type SortBy = 'submittedAt' | 'rating' | 'pageId' | 'surveyType';
type SortDir = 'asc' | 'desc';

export type GetFeedbackSurveysInput = {
  pageId?: string;
  surveyType?: SurveyType;
  thumbs?: Exclude<ThumbsValue, null>;
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
    rating,
    surveyType,
    thumbs,
    comment,
    timestamp,
    userId,
  } = feedbackData;

  const submittedAt = timestamp ? new Date(timestamp) : new Date();
  const normalizedComment = comment || '';
  const normalizedSurveyType: SurveyType = surveyType || 'scale';

  const feedback = await FeedbackSurvey.create({
    pageId,
    rating,
    surveyType: normalizedSurveyType,
    thumbs: normalizedSurveyType === 'thumbs' ? thumbs : null,
    comment: normalizedComment,
    submittedAt,
    userId,
  });

  // Log the feedback for analytics
  auditLogger.info('Survey feedback submitted', {
    pageId,
    rating,
    surveyType: normalizedSurveyType,
    thumbs: normalizedSurveyType === 'thumbs' ? thumbs : null,
    commentLength: normalizedComment.length,
    timestamp: submittedAt.toISOString(),
    userId,
    feedbackId: feedback.id,
  });

  return feedback;
}

export async function getFeedbackSurveys(filters: GetFeedbackSurveysInput = {}) {
  const {
    pageId,
    surveyType,
    thumbs,
    q,
    createdAtFrom,
    createdAtTo,
    sortBy = 'submittedAt',
    sortDir = 'desc',
    limit = 500,
  } = filters;

  const where = {} as {
    pageId?: { [Op.iLike]: string };
    surveyType?: SurveyType;
    thumbs?: Exclude<ThumbsValue, null>;
    createdAt?: {
      [Op.gte]?: Date;
      [Op.lt]?: Date;
    };
    [Op.or]?: Array<{
      pageId?: { [Op.iLike]: string };
      comment?: { [Op.iLike]: string };
      '$user.name$'?: { [Op.iLike]: string };
      '$user.email$'?: { [Op.iLike]: string };
    }>;
  };

  if (pageId) {
    where.pageId = { [Op.iLike]: `%${pageId}%` };
  }

  if (surveyType) {
    where.surveyType = surveyType;
  }

  if (thumbs) {
    where.thumbs = thumbs;
  }

  if (q) {
    where[Op.or] = [
      { pageId: { [Op.iLike]: `%${q}%` } },
      { comment: { [Op.iLike]: `%${q}%` } },
      { '$user.name$': { [Op.iLike]: `%${q}%` } },
      { '$user.email$': { [Op.iLike]: `%${q}%` } },
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

  const safeSortBy: SortBy[] = ['submittedAt', 'rating', 'pageId', 'surveyType'];
  const safeSortDir: SortDir[] = ['asc', 'desc'];
  const normalizedSortBy = safeSortBy.includes(sortBy) ? sortBy : 'submittedAt';
  const normalizedSortDir = safeSortDir.includes(sortDir) ? sortDir : 'desc';

  const rows = await FeedbackSurvey.findAll({
    where,
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id', 'name', 'email'],
      required: false,
    }],
    order: [[normalizedSortBy, normalizedSortDir.toUpperCase()]],
    limit,
  });

  return rows;
}

export default saveFeedbackSurvey;
