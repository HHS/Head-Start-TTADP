import orderGranteesBy from './orderGranteesBy';
import { sequelize } from '../models';

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
        'name',
        'desc',
      ],
    ]);

    const three = orderGranteesBy('programSpecialist', 'asc');

    expect(three).toStrictEqual([
      [
        sequelize.literal('"programSpecialists"'), 'asc',
      ],
    ]);

    const four = orderGranteesBy('sorcery', 'asc');

    expect(four).toStrictEqual('');
  });
});
