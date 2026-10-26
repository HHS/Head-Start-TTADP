import httpContext from 'express-http-context';
import handleErrors from '../lib/apiErrorHandler';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import { sequelize } from '../models';
import {
  addAuditTransactionSettings,
  removeFromAuditedTransactions,
} from '../models/auditModelGenerator';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

/**
 * Registers work to run once the request's transaction has committed successfully, such as
 * sending the response or queueing jobs that read the rows it wrote. Callbacks are skipped
 * if the handler throws or the commit fails. Unlike Sequelize's transaction.afterCommit,
 * which also runs when the COMMIT itself fails.
 * @param {object} req - request handled by transactionWrapper
 * @param {() => (void | Promise<void>)} callback
 */
export function onTransactionCommitted(req, callback) {
  if (!req?.inTransactionWrapper) {
    throw new Error('onTransactionCommitted must be called from within transactionWrapper');
  }
  req.transactionCommittedCallbacks = [...(req.transactionCommittedCallbacks || []), callback];
}

export default function transactionWrapper(
  originalFunction,
  context = '',
  isReadOnly = false,
  transactionOptions = {}
) {
  return async function wrapper(req, res, next) {
    const startTime = Date.now();
    try {
      httpContext.set('auditDescriptor', originalFunction.name);
      if (req) {
        req.inTransactionWrapper = true;
      }
      const committed = await sequelize.transaction(transactionOptions, async (transaction) => {
        httpContext.set('transactionId', transaction.id);
        let snapShot;
        try {
          await addAuditTransactionSettings(
            sequelize,
            null,
            null,
            'transaction',
            originalFunction.name
          );

          if (isReadOnly) {
            snapShot = await captureSnapshot(true);
          }

          const result = await originalFunction(req, res, next);

          if (isReadOnly && (await hasModifiedData(snapShot, transaction.id))) {
            throw new Error('Transaction was flagged as READONLY, but has modifed data.');
          }

          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          return result;
        } catch (err) {
          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${err.message}`);
          throw err;
        } finally {
          removeFromAuditedTransactions();
        }
      });

      // sequelize.transaction only resolves once the COMMIT succeeds
      if (req) {
        req.inTransactionWrapper = false;
        for (const callback of req.transactionCommittedCallbacks || []) {
          // eslint-disable-next-line no-await-in-loop
          await callback();
        }
      }
      return committed;
    } catch (err) {
      if (req) {
        req.inTransactionWrapper = false;
      }
      if (
        Number.isInteger(err?.statusCode) &&
        err?.responseBody &&
        typeof res?.status === 'function'
      ) {
        return res.status(err.statusCode).json(err.responseBody);
      }
      return handleErrors(req, res, err, logContext);
    } finally {
      if (req) {
        delete req.inTransactionWrapper;
        delete req.transactionCommittedCallbacks;
      }
    }
  };
}

export function readOnlyTransactionWrapper(
  originalFunction,
  context = '',
  transactionOptions = {}
) {
  return transactionWrapper(originalFunction, context, true, transactionOptions);
}
