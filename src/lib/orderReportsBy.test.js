import { sequelize } from '../models';
import orderReportsBy, { normalizeSortDir } from './orderReportsBy';

describe('orderReportsBy', () => {
  it('returns the correct values', () => {
    let sort = orderReportsBy('author', 'asc');
    expect(sort).toStrictEqual([[sequelize.literal('authorName ASC')]]);

    sort = orderReportsBy('collaborators', 'asc');
    expect(sort).toStrictEqual([[sequelize.literal('collaboratorName ASC NULLS LAST')]]);

    sort = orderReportsBy('topics', 'asc');
    expect(sort).toStrictEqual([[sequelize.literal('topics ASC')]]);

    sort = orderReportsBy('regionId', 'asc');
    expect(sort).toStrictEqual([
      ['regionId', 'ASC'],
      ['id', 'ASC'],
    ]);

    sort = orderReportsBy('activityRecipients', 'asc');
    expect(sort).toStrictEqual([
      [sequelize.literal('recipientName ASC')],
      [sequelize.literal('otherEntityName ASC')],
    ]);

    sort = orderReportsBy('calculatedStatus', 'asc');
    expect(sort).toStrictEqual([['calculatedStatus', 'ASC']]);

    sort = orderReportsBy('startDate', 'asc');
    expect(sort).toStrictEqual([['startDate', 'ASC']]);

    sort = orderReportsBy('updatedAt', 'asc');
    expect(sort).toStrictEqual([['updatedAt', 'ASC']]);

    sort = orderReportsBy('approvedAt', 'asc');
    expect(sort).toStrictEqual([['approvedAt', 'ASC']]);

    sort = orderReportsBy('createdAt', 'asc');
    expect(sort).toStrictEqual([['createdAt', 'ASC']]);

    sort = orderReportsBy('fuzzbucket', 'desc');
    expect(sort).toStrictEqual('');
  });

  it('normalizes sortDir so it cannot inject SQL', () => {
    expect(normalizeSortDir('asc')).toBe('ASC');
    expect(normalizeSortDir('DESC')).toBe('DESC');
    expect(normalizeSortDir(undefined)).toBe('DESC');
    expect(normalizeSortDir('ASC LIMIT 1), (SELECT pg_sleep(5))--')).toBe('DESC');
    expect(orderReportsBy('author', 'asc; DROP TABLE "Users"--')).toStrictEqual([
      [sequelize.literal('authorName DESC')],
    ]);
  });
});
