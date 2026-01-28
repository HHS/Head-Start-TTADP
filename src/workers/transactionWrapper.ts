import httpContext from 'express-http-context';
import { addAuditTransactionSettings, removeFromAuditedTransactions } from '../models/auditModelGenerator';
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
    httpContext.set('loggedUser', job?.data?.referenceData?.userId);
    httpContext.set('impersonationUserId', job?.data?.referenceData?.impersonationId);
    httpContext.set('sessionSig', job?.data?.referenceData?.transactionId
      ? `${job.id}:${job?.data?.referenceData?.transactionId}`
      : job.id);
    httpContext.set('auditDescriptor', originalFunction.name);

    if (job.data && job.data.referenceData !== undefined) {
       
      delete job.data.referenceData;
    }
    try {
      // eslint-disable-next-line node/global-require
      const { sequelize } = require('../models');
      return await sequelize.transaction(async (transaction) => {
        httpContext.set('transactionId', transaction.id);
        try {
           
          await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
          const result = await originalFunction(job);
          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          removeFromAuditedTransactions();
          return result;
        } catch (err) {
          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${(err as Error).message}`);
          throw err;
        }
      });
    } catch (err) {
      await handleWorkerErrors(job, err, logContext);
      throw err;
    }
  });
};

export default transactionQueueWrapper;
