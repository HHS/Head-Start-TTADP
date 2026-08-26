import { NextFunction, Request, Response } from 'express';
import feedbackSurveySchema from '../../models/schemas/feedbackSurvey';

type ResponseValue = 'yes' | 'no';

type SurveyFeedbackBody = {
  pageId: string;
  response: ResponseValue;
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
  if (!req.body?.pageId) {
    return res.status(400).json({
      error: 'Missing required field: pageId is required',
    });
  }

  const { error, value } = feedbackSurveySchema.validate(req.body, {
    abortEarly: true,
    allowUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  req.body = value;
  return next();
}

export default validateSubmitSurveyFeedbackBody;
