import { sequelize } from '../models';
import audit from '../models/auditModelGenerator';

export default function transactionWrapper(originalFunction) {
  return async function wrapper(req, res, next) {
    return sequelize.transaction(async () => {
      await audit.addAuditTransactionSettings(sequelize, null, null, 'transaction', originalFunction.name);
      const result = await originalFunction(req, res, next);
      audit.removeFromAuditedTransactions();
      return result;
    });
  };
}
