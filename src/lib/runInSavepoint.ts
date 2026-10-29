import cls from 'cls-hooked';
import type { Transaction } from 'sequelize';
import { auditLogger } from '../logger';
import { sequelize } from '../models';

/**
 * Runs best-effort work (e.g. creating notifications) without letting it fail the caller.
 * Catching the error is not enough: a failed query aborts the request's transaction
 * (transactionWrapper), so every later query and the commit fail too. Running it in a nested
 * transaction creates a SAVEPOINT, so a failure rolls back on its own.
 * @param fn The work to run.
 * @param errorMessage Logged with the error when the work fails.
 * @returns {Promise<void>} Resolves once the work finishes or its error is logged.
 */
export default async function runInSavepoint(
  fn: () => Promise<unknown>,
  errorMessage: string
): Promise<void> {
  const parentTransaction: Transaction | undefined = cls
    .getNamespace('transaction')
    ?.get('transaction');
  try {
    await sequelize.transaction({ transaction: parentTransaction }, fn);
  } catch (err) {
    auditLogger.error(errorMessage, err);
  }
}
