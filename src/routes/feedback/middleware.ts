import type { NextFunction, Request, Response } from 'express';
import feedbackSurveySchema from '../../models/schemas/feedbackSurvey';

export function validateSubmitSurveyFeedbackBody(req: Request, res: Response, next: NextFunction) {
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
