import type { Transaction } from 'sequelize';

// Tail of the promise chain for each transaction. WeakMap so entries are dropped
// once the transaction object is garbage collected.
const locks = new WeakMap<Transaction, Promise<unknown>>();

/**
 * Runs `fn` exclusively among callers sharing the same transaction.
 *
 * Every query in a transaction runs on a single connection, so sibling calls launched
 * through `Promise.all` interleave their statements. SAVEPOINTs don't survive that:
 * `ROLLBACK TO SAVEPOINT` for one caller also discards any SAVEPOINT a sibling opened
 * after it, and the sibling's own rollback then fails, leaving the whole transaction
 * aborted ("current transaction is aborted, commands ignored until end of transaction
 * block"). Serializing savepoint-based find-or-create work per transaction avoids that.
 *
 * With no transaction, `fn` runs immediately: each statement gets its own connection.
 * Calls made inside `fn` with a nested savepoint transaction lock on that savepoint,
 * so they don't deadlock against the outer lock.
 */
const withTransactionLock = async <T>(
  transaction: Transaction | null | undefined,
  fn: () => Promise<T>
): Promise<T> => {
  if (!transaction) return fn();

  const previous = locks.get(transaction) || Promise.resolve();
  const run = previous.then(fn);
  // Keep the chain alive regardless of whether this call fails.
  locks.set(
    transaction,
    run.catch(() => undefined)
  );
  return run;
};

export default withTransactionLock;
