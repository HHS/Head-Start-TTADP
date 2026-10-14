import { faker } from '@faker-js/faker';
import db, { User } from '..';

describe('User', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('flags', () => {
    let user;

    beforeAll(async () => {
      user = await User.create({
        id: faker.number.int({ min: 100000, max: 199999 }),
        hsesUsername: faker.string.alphanumeric(16),
        hsesUserId: faker.string.alphanumeric(16),
        lastLogin: new Date(),
      });
    });

    afterAll(async () => {
      await User.destroy({ where: { id: user.id } });
    });

    it('defaults to an empty array', async () => {
      const found = await User.findByPk(user.id);
      expect(found.flags).toEqual([]);
    });

    it('saves and returns valid flags as an array', async () => {
      await user.update({ flags: ['quality_assurance_dashboard', 'tta_timeline'] });
      const found = await User.findByPk(user.id);
      expect(found.flags).toEqual(['quality_assurance_dashboard', 'tta_timeline']);
    });

    it('rejects unknown flags', async () => {
      await expect(user.update({ flags: ['not_a_flag'] })).rejects.toThrow(
        'Invalid feature flag: not_a_flag'
      );
    });

    it('rejects a non-array value', async () => {
      await expect(user.update({ flags: 'quality_assurance_dashboard' })).rejects.toThrow(
        'Flags must be an array'
      );
    });
  });
});
