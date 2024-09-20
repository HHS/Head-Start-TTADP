import { Op } from 'sequelize';
import httpContext from 'express-http-context';
import db, { sequelize } from '../models';
import { addAuditTransactionSettings, removeFromAuditedTransactions } from '../models/auditModelGenerator';
import handleErrors from '../lib/apiErrorHandler';
import { captureSnapshot } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

// This method of validating the transaction has not modified data is needed as the following
// command fails on any creation of temp tables:
// `SET TRANSACTION READ ONLY;`
export async function hasModifiedData(snapShot, transactionId = httpContext.get('transactionId')) {
  if (!transactionId) {
    throw new Error('Transaction ID not found');
  }

  // Filter the keys of the `db` object for tables that start with 'ZAL'
  const zalTables = Object.keys(db).filter(key => key.startsWith('ZAL'));

  if (zalTables.length === 0) {
    return false;
  }

  const buildCondition = (table, maxId) => {
    let condition = {
      id: { [Op.gt]: maxId },
      dml_txid: transactionId,
    }; // Default condition for ZAL tables

    if (table === 'ZALDDL') {
      condition = {
        id: { [Op.gt]: maxId },
        ddl_txid: transactionId,
        object_identity: { [Op.notLike]: 'pg_temp.%' },
      };
    }
    return condition;
  };

  // Create an array of promises for each table
  const queryPromises = zalTables.map(table => {
    const tableName = db[table].getTableName();
    const snapShotEntry = snapShot.find((entry) => entry.tableName === tableName);

    if (!snapShotEntry) {
      throw new Error(`Snapshot entry not found for table: ${tableName}`);
    }

    const condition = buildCondition(table, snapShotEntry.maxId);

    return db[table].findOne({
      where: condition,
      attributes: ['id'], // Only return the `id` column
    });
  });

  // Await all the promises at once
  const results = await Promise.all(queryPromises);

  // Check if any of the results returned a non-null value
  return results.some((result) => result !== null);
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
