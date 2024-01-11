import httpCodes from 'http-codes';
import { auditLogger } from '../logger';

const errorMessage = 'Received malformed request params';

function canBeInt(str) {
  return Number.isInteger(Number(str)) && Number(str) > 0;
}

/**
 *  Check activityReportId req param
 *
 * This middleware validates that the Activity Report id supplied
 * by the activityReportId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkActivityReportIdParam(req, res, next) {
  if (req.params && req.params.activityReportId && canBeInt(req.params.activityReportId)) {
    return next();
  }

  const msg = `${errorMessage}: activityReportId ${req.params ? (req.params.activityReportId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check fileId req param
 *
 * This middleware validates that the File id supplied
 * by the fileId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkFileIdParam(req, res, next) {
  if (
    req.params
    && req.params.fileId
    && canBeInt(req.params.fileId)
  ) {
    return next();
  }

  const msg = `${errorMessage}: fileId ${req.params ? (req.params.fileId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check reportId req param
 *
 * This middleware validates that the Activity Report id supplied
 * by the reportId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkReportIdParam(req, res, next) {
  if (req.params && req.params.reportId && canBeInt(req.params.reportId)) {
    return next();
  }

  const msg = `${errorMessage}: reportId ${req.params ? (req.params.reportId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check objectiveId req param
 *
 * This middleware validates that the Objective id supplied
 * by the objectiveId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkObjectiveIdParam(req, res, next) {
  if (req.params && req.params.objectiveId && canBeInt(req.params.objectiveId)) {
    return next();
  }

  const msg = `${errorMessage}: objectiveId ${req.params ? (req.params.objectiveId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check objectiveTemplateId req param
 *
 * This middleware validates that the Objective Template id supplied
 * by the objectiveTemplateId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkObjectiveTemplateIdParam(req, res, next) {
  if (req.params && req.params.objectiveTemplateId && canBeInt(req.params.objectiveTemplateId)) {
    return next();
  }

  const msg = `${errorMessage}: objectiveTemplateId ${req.params ? (req.params.objectiveTemplateId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check groupId req param
 *
 * This middleware validates that the site alert id supplied
 * by the alertId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkGroupIdParam(req, res, next) {
  if (req.params && req.params.groupId && canBeInt(req.params.groupId)) {
    return next();
  }

  const msg = `${errorMessage}: groupId ${req.params ? (req.params.groupId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check alertId req param
 *
 * This middleware validates that the site alert id supplied
 * by the alertId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkAlertIdParam(req, res, next) {
  if (req.params && req.params.alertId && canBeInt(req.params.alertId)) {
    return next();
  }

  const msg = `${errorMessage}: alertId ${req.params ? (req.params.alertId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

/**
 *  Check goalTemplateId req param
 *
 * This middleware validates that the site alert id supplied
 * by the goalTemplateId query param is an integer before we proceed with the request
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export function checkGoalTemplateIdParam(req, res, next) {
  if (req.params && req.params.goalTemplateId && canBeInt(req.params.goalTemplateId)) {
    return next();
  }

  const msg = `${errorMessage}: goalTemplateId ${req.params ? (req.params.goalTemplateId || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

export function checkIdParam(req, res, next, paramName) {
  if (req.params && req.params[paramName] && canBeInt(req.params[paramName])) {
    return next();
  }

  const msg = `${errorMessage}: ${paramName} ${req.params ? (req.params[paramName] || 'undefined') : 'undefined'}`;
  auditLogger.error(msg);
  return res.status(httpCodes.BAD_REQUEST).send(msg);
}

export function checkCommunicationLogIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'communicationLogId');
}

export function checkSessionAttachmentIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'sessionAttachmentId');
}

export function checkRegionIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'regionId');
}

export function checkRecipientIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'recipientId');
}

export function checkGoalGroupIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'goalGroupId');
}

export function checkIdIdParam(req, res, next) {
  return checkIdParam(req, res, next, 'id');
}
