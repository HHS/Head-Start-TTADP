import db, { User } from '..';

describe('Users model', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  const ids = [60, 61, 62, 63];

  describe('default scope', () => {
    const users = [
      {
        id: 60,
        name: 'd',
      },
      {
        id: 61,
        name: 'c',
      },
      {
        id: 62,
        name: 'a',
      },
      {
        id: 63,
        name: 'b',
      },
    ];

    beforeEach(async () => {
      await Promise.all(
        users.map((u) => User.create({
          id: u.id,
          name: u.name,
          hsesUsername: u.id,
          hsesUserId: u.id,
        })),
      );
    });

    afterEach(async () => {
      await User.destroy({ where: { id: ids } });
    });

    it('Properly orders users', async () => {
      const expected = ['a', 'b', 'c', 'd'];
      const foundUsers = await User.findAll({
        where: { id: ids },
      });
      const names = foundUsers.map((u) => u.name);
      expect(names).toEqual(expected);
    });
  });
});
