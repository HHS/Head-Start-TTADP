// New Relic's automatic transaction naming doesn't always produce
// desired results. These middleware functions were created for cases
// where we want to separate routes that were automatically grouped.

const nr = require('newrelic');

/**
 * Set transaction name by request method, baseUrl, and asterisk
 * to denote grouped parameter. Example: api/activity-reports/:activityReportId
 * will be named api/activity-reports/*
 *
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - call next middleware
 */
export function nameTransactionByBase(req, res, next) {
  nr.setTransactionName(`${req.method} ${req.baseUrl}/*`);
  next();
}

/**
 * Set transaction name by request method, baseUrl, and path.
 * Suitable for routes with params in path that you do NOT want
 * to be grouped. Example: api/widgets/:widgetId
 * will be named api/widgets/overview
 *
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - call next middleware
 */
export function nameTransactionByPath(req, res, next) {
  nr.setTransactionName(`${req.method} ${req.baseUrl}${req.path}`);
  next();
}
