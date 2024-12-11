import newrelic from 'newrelic';
import httpContext from 'express-http-context';
import { sequelize } from '../models';
import { addAuditTransactionSettings, removeFromAuditedTransactions } from '../models/auditModelGenerator';
import handleErrors from '../lib/apiErrorHandler';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

const requestDurations = {
  success: {},
  error: {},
}; // Separate caches for success and error durations, keyed by function name
const MAX_CACHE_SIZE = 50; // Maximum number of durations to keep per function
// Default to 10 seconds
const MAX_DURATION_THRESHOLD = parseInt(process.env.MAX_DURATION_THRESHOLD, 10) || 10000;
// Default to 100 ms
const MIN_DURATION_THRESHOLD = parseInt(process.env.MIN_DURATION_THRESHOLD, 10) || 100;
// Default to 50 ms
const MIN_DURATION_DELTA = parseInt(process.env.MIN_DURATION_DELTA, 10) || 50;

// Helper function to calculate mean and standard deviation
export function calculateStats(durations) {
  const mean = durations.reduce((sum, val) => sum + val, 0) / durations.length;
  const variance = durations.reduce((sum, val) => sum + ((val - mean) ** 2), 0) / durations.length;
  const stddev = Math.sqrt(variance);
  return { mean, stddev };
}

// Function to log duration and check for New Relic alert threshold
export function logRequestDuration(functionName, durationMs, status) {
  const cache = requestDurations[status];
  if (!cache[functionName]) {
    cache[functionName] = [];
  }

  const durations = cache[functionName];

  // Add the new duration to the cache
  durations.push(durationMs);
  if (durations.length > MAX_CACHE_SIZE) {
    durations.shift(); // Remove oldest entry if cache exceeds size
  }

  // Calculate stats
  const { mean, stddev } = calculateStats(durations);

  // Check if the duration exceeds thresholds and delta constraints
  const threshold = mean + 2 * stddev;
  if (
    (durationMs > MAX_DURATION_THRESHOLD || (durations.length >= 20 && durationMs > threshold))
    && durationMs > MIN_DURATION_THRESHOLD
    && Math.abs(durationMs - mean) > MIN_DURATION_DELTA
  ) {
    if (process.env.NODE_ENV === 'production') {
      newrelic.noticeError(
        new Error(`Request duration for ${functionName} exceeded threshold: ${durationMs}ms`),
        {
          functionName,
          duration: durationMs,
          mean,
          stddev,
          threshold,
          status,
          maxThreshold: MAX_DURATION_THRESHOLD,
          minThreshold: MIN_DURATION_THRESHOLD,
          minDelta: MIN_DURATION_DELTA,
        },
      );
    }
  }

  auditLogger.info(
    `Request for ${functionName} took ${durationMs.toFixed(2)}ms (status: ${status}, mean: ${mean.toFixed(2)}ms, stddev: ${stddev.toFixed(2)}ms, max threshold: ${MAX_DURATION_THRESHOLD}ms, min threshold: ${MIN_DURATION_THRESHOLD}ms, min delta: ${MIN_DURATION_DELTA}ms)`,
  );
}

export default function transactionWrapper(originalFunction, context = '', isReadOnly = false) {
  return async function wrapper(req, res, next) {
    const startTime = Date.now();
    try {
      httpContext.set('auditDescriptor', originalFunction.name);
      // eslint-disable-next-line @typescript-eslint/return-await
      return await sequelize.transaction(async (transaction) => {
        httpContext.set('transactionId', transaction.id);
        let snapShot;
        try {
          await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);

          if (isReadOnly) {
            snapShot = await captureSnapshot(true);
          }

          const result = await originalFunction(req, res, next);

          if (isReadOnly && await hasModifiedData(snapShot, transaction.id)) {
            throw new Error('Transaction was flagged as READONLY, but has modified data.');
          }

          const duration = Date.now() - startTime;
          logRequestDuration(originalFunction.name, duration, 'success');

          removeFromAuditedTransactions();
          return result;
        } catch (err) {
          const duration = Date.now() - startTime;
          logRequestDuration(originalFunction.name, duration, 'error');

          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${err.message}`);
          throw err;
        }
      });
    } catch (err) {
      return handleErrors(req, res, err, logContext);
    }
  };
}

export function readOnlyTransactionWrapper(originalFunction, context = '') {
  return transactionWrapper(originalFunction, context, true);
}
