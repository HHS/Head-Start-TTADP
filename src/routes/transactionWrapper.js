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
    const startTime = Date.now();
    try {
      httpContext.set('auditDescriptor', originalFunction.name);
      // eslint-disable-next-line @typescript-eslint/return-await
      return await sequelize.transaction(async () => {
        try {
          await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
          const result = await originalFunction(req, res, next);
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
