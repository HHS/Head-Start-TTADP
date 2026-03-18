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

export default saveFeedbackSurvey;
