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
            throw new Error('Transaction was flagged as READONLY, but has modifed data.');
          }

          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          removeFromAuditedTransactions();
          return result;
        } catch (err) {
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
