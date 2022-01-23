import db, { User, ZALUser } from '..';

describe('Audit models', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('audit user model', () => {
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
        const foundAuditUsers = await ZALUser.findAll({ where: { data_id: ids } });
        const auditedUserIds = foundAuditUsers.map((au) => parseInt(au.data_id, 10));
        auditedUserIds.sort();
        const auditedUserDMLType = foundAuditUsers.map((au) => au.dml_type);
        const auditedUserNames = foundAuditUsers.map((au) => au.new_row_data.name);
        auditedUserNames.sort();
        // const foundUsers = await User.findAll({
        //   where: { id: ids },
        // });
        // const names = foundAuditUsers.map((u) => u.name);
        expect(auditedUserIds).toEqual([60, 61, 62, 63]);
        expect(auditedUserDMLType).toEqual(['INSERT', 'INSERT', 'INSERT', 'INSERT']);
        expect(auditedUserNames).toEqual(['a', 'b', 'c', 'd']);
      });
    });
  });
});
