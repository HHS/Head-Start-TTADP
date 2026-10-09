import type { Transaction } from 'sequelize';
import withTransactionLock from './transactionLock';

const deferred = () => {
  let resolve: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('withTransactionLock', () => {
  it('runs callers sharing a transaction one at a time, in order', async () => {
    const transaction = {} as Transaction;
    const events: string[] = [];
    const gate = deferred();

    const first = withTransactionLock(transaction, async () => {
      events.push('first:start');
      await gate.promise;
      events.push('first:end');
      return 1;
    });
    const second = withTransactionLock(transaction, async () => {
      events.push('second:start');
      return 2;
    });

    await new Promise((r) => {
      setImmediate(r);
    });
    expect(events).toEqual(['first:start']);

    gate.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('does not block callers on different transactions', async () => {
    const gate = deferred();
    const blocked = withTransactionLock({} as Transaction, () => gate.promise);
    await expect(withTransactionLock({} as Transaction, async () => 'free')).resolves.toBe('free');
    gate.resolve();
    await blocked;
  });

  it('keeps the chain going after a caller fails', async () => {
    const transaction = {} as Transaction;
    const failing = withTransactionLock(transaction, async () => {
      throw new Error('boom');
    });
    const next = withTransactionLock(transaction, async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });

  it('runs immediately without a transaction', async () => {
    await expect(withTransactionLock(undefined, async () => 'now')).resolves.toBe('now');
  });
});
