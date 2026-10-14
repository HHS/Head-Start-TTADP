import type { Transaction } from 'sequelize';

// Tail of the promise chain for each transaction. WeakMap so entries are dropped
// once the transaction object is garbage collected.
const locks = new WeakMap<Transaction, Promise<unknown>>();

/**
 * Runs `fn` exclusively among callers sharing the same transaction.
 *
 * Sibling calls launched through `Promise.all` on one transaction interleave their statements,
 * and a `SELECT ... FOR UPDATE` row lock doesn't separate them (they are the same lock holder),
 * so a read-modify-write in one sibling can overwrite another's. Serializing per transaction
 * makes each read-modify-write see the previous sibling's result.
 *
 * With no transaction, `fn` runs immediately: each statement gets its own connection.
 * Calling this again for the same transaction from inside `fn` would wait on itself forever.
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
