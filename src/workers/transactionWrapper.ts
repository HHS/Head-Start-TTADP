import { Sequelize } from 'sequelize';
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
  let error: Error | undefined;
  const startTime = Date.now();
  try {
    return sequelize.transaction(async () => {
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
        error = err as Error;
        throw err;
      }
      return result;
    });
  } catch (err) {
    await handleWorkerErrors(job, error || err, logContext);
    throw error || err;
  }
};

export default transactionQueueWrapper;
