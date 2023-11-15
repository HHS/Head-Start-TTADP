import orderGoalsBy, { STATUS_SORT, MERGED_ID } from './orderGoalsBy';
import { sequelize } from '../models';

describe('orderGoalsBy', () => {
  it('returns the correct values', () => {
    const one = orderGoalsBy('goalStatus', 'asc');
    expect(one).toStrictEqual([
      [
        sequelize.col(STATUS_SORT), 'asc',
      ],
      [
        sequelize.col('createdAt'),
        'DESC',
      ],
    ]);

    const two = orderGoalsBy('createdOn', 'DESC');
    expect(two).toStrictEqual([
      [
        sequelize.col('createdAt'),
        'DESC',
      ],
      [
        sequelize.col(STATUS_SORT), 'ASC',
      ],
    ]);

    const three = orderGoalsBy('fuzzbucket', 'DESC');
    expect(three).toStrictEqual([
      [
        sequelize.col('id'),
        'DESC',
      ],
      [
        sequelize.col(STATUS_SORT), 'DESC',
      ],
    ]);

    const four = orderGoalsBy('id', 'ASC');
    expect(four).toStrictEqual([
      [
        sequelize.col('id'),
        'ASC',
      ],
      [
        sequelize.col(STATUS_SORT), 'ASC',
      ],
    ]);

    const five = orderGoalsBy('mergedGoals', 'ASC');
    expect(five).toStrictEqual([
      [
        sequelize.col(MERGED_ID), 'ASC',
      ],
      [
        sequelize.col(STATUS_SORT), 'ASC',
      ],
      [
        sequelize.col('createdAt'), 'DESC',
      ],
    ]);
  });
});
