import orderGoalsBy from './orderGoalsBy';

describe('orderGoalsBy', () => {
  it('returns the correct values', () => {
    const one = orderGoalsBy('goalStatus', 'asc');
    expect(one).toStrictEqual([[
      'status',
      'asc',
    ]]);

    const two = orderGoalsBy('createdOn', 'desc');
    expect(two).toStrictEqual([[
      'createdAt', 'desc',
    ]]);
  });
});
