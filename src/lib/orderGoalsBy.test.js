import orderGoalsBy from './orderGoalsBy';
import { sequelize } from '../models';

describe('orderGoalsBy', () => {
  it('returns the correct values', () => {
    const one = orderGoalsBy('goalStatus', 'asc');
    expect(one).toStrictEqual([
      [
        sequelize.literal('status_sort asc'),
      ],
    ]);

    const two = orderGoalsBy('createdOn', 'desc');
    expect(two).toStrictEqual([[
      'createdAt', 'desc',
    ]]);
  });
});
