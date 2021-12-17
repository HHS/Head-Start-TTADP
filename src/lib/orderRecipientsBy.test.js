import orderRecipientsBy from './orderRecipientsBy';
import { sequelize } from '../models';

describe('orderRecipientsBy', () => {
  it('returns the correct values', () => {
    const one = orderRecipientsBy('name', 'asc');
    expect(one).toStrictEqual([[
      'name',
      'asc',
    ]]);

    const two = orderRecipientsBy('regionId', 'desc');
    expect(two).toStrictEqual([
      [
        'grants', 'regionId', 'desc',
      ],
      [
        'name',
        'desc',
      ],
    ]);

    const three = orderRecipientsBy('programSpecialist', 'asc');

    expect(three).toStrictEqual([
      [
        sequelize.literal('"programSpecialists"'), 'asc',
      ],
    ]);

    const four = orderRecipientsBy('sorcery', 'asc');

    expect(four).toStrictEqual('');
  });
});
