import { sequelize } from '../models';
import {
  addAuditTransactionSettings,
  removeFromAuditedTransactions,
} from '../models/auditModelGenerator';

export default function transactionWrapper(originalFunction) {
  return async function wrapper(req, res, next) {
    return sequelize.transaction(async () => {
      await addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
      const result = await originalFunction(req, res, next);
      removeFromAuditedTransactions();
      return result;
    });
  };
}
