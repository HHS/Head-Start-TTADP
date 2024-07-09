import httpContext from 'express-http-context';
import convertToUUID from '../lib/uuidConverter';
import { addAuditTransactionSettings, removeFromAuditedTransactions } from '../models/auditModelGenerator';
import { sequelize } from '../models';
import { handleWorkerErrors } from '../lib/apiErrorHandler';
import { auditLogger } from '../logger';

const namespace = 'WORKER:WRAPPER';
const logContext = {
  namespace,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Job = any; // Define the correct type for your job here

const transactionQueueWrapper = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalFunction: (job: Job) => Promise<any>,
  context = '',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => async (job: Job): Promise<any> => {
  const startTime = Date.now();
  return httpContext.ns.runPromise(async () => {
    httpContext.set('loggedUser', job.referenceData.userId);
    httpContext.set('impersonationUserId', job.referenceData.impersonationUserId);
    httpContext.set('sessionSig', job.id); // TODO: what value should be used here
    httpContext.set('auditDescriptor', originalFunction.name);
    try {
      return sequelize.transaction(async (transaction) => {
        httpContext.set('transactionId', transaction.id);
        let result;
        try {
          // eslint-disable-next-line
          await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
          result = await originalFunction(job);
          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          removeFromAuditedTransactions();
        } catch (err) {
          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${(err as Error).message}`);
          throw err;
        }
        return result;
      });
    } catch (err) {
      await handleWorkerErrors(job, err, logContext);
      throw err;
    }
  });
};

export default transactionQueueWrapper;
