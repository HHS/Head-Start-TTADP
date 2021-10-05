import orderGranteesBy from './orderGranteesBy';

describe('orderGranteesBy', () => {
  it('returns the correct values', () => {
    const one = orderGranteesBy('name', 'asc');
    expect(one).toStrictEqual([[
      'name',
      'asc',
    ]]);

    const two = orderGranteesBy('regionId', 'desc');
    expect(two).toStrictEqual([
      [
        'grants', 'regionId', 'desc',
      ],
      [
        'id',
        'desc',
      ]]);

    const three = orderGranteesBy('programSpecialist', 'asc');

    expect(three).toStrictEqual([
      [
        'grants', 'programSpecialistName', 'asc',
      ],
    ]);

    const four = orderGranteesBy('sorcery', 'asc');

    expect(four).toStrictEqual('');
  });
});
