import orderGoalsBy from './orderGoalsBy';
import { sequelize } from '../models';

describe('orderGoalsBy', () => {
  it('returns the correct values', () => {
    const one = orderGoalsBy('goalStatus', 'asc');
    expect(one).toStrictEqual([
      [
        sequelize.literal('status_sort asc'),
      ],
      [
        'createdAt',
        'DESC',
      ],
    ]);

    const two = orderGoalsBy('createdOn', 'desc');
    expect(two).toStrictEqual([
      [
        'createdAt', 'desc',
      ],
      [
        sequelize.literal('status_sort ASC'),
      ],
    ]);

    const three = orderGoalsBy('fuzzbucket', 'desc');
    expect(three).toStrictEqual('');
  });
});
