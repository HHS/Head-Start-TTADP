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
