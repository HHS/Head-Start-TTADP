import { NextFunction, Request, Response } from 'express';
import httpCodes from 'http-codes';
import feedbackSurveySchema from '../../models/schemas/feedbackSurvey';

type SurveyType = 'scale' | 'thumbs';
type ThumbsValue = 'up' | 'down' | null;

type SurveyFeedbackBody = {
  pageId: string;
  rating: number;
  surveyType: SurveyType;
  thumbs: ThumbsValue;
  comment: string;
  timestamp?: string;
};

type SurveyFeedbackRequest = Request & {
  body: SurveyFeedbackBody;
};

export function validateSubmitSurveyFeedbackBody(
  req: SurveyFeedbackRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.body?.pageId || req.body?.rating === undefined || req.body?.rating === null) {
    return res.status(httpCodes.BAD_REQUEST).json({
      error: 'Missing required fields: pageId and rating are required',
    });
  }

  const { error, value } = feedbackSurveySchema.validate(req.body, {
    abortEarly: true,
    allowUnknown: false,
  });

  if (error) {
    return res.status(httpCodes.BAD_REQUEST).json({
      error: error.message,
    });
  }

  req.body = value;
  return next();
}

export default validateSubmitSurveyFeedbackBody;
