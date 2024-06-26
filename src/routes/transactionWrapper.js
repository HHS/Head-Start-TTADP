import { sequelize } from '../models';
import { addAuditTransactionSettings, removeFromAuditedTransactions } from '../models/auditModelGenerator';
import handleErrors from '../lib/apiErrorHandler';
import { auditLogger } from '../logger';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

export default function transactionWrapper(originalFunction, context = '') {
  return async function wrapper(req, res, next) {
    let error;
    const startTime = Date.now();
    try {
      return sequelize.transaction(async () => {
        let result;
        try {
          await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
          result = await originalFunction(req, res, next);
          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          removeFromAuditedTransactions();
        } catch (err) {
          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${err.message}`);
          error = err;
          throw err;
        }
        return result;
      });
    } catch (err) {
      return handleErrors(req, res, error || err, logContext);
    }
  };
}
