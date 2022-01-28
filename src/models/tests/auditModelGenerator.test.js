import db, { User, ZALUser } from '..';

describe('Audit models', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('audit user model', () => {
    let transaction;

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
        transaction = await db.sequelize.transaction();
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
        transaction.rollback();
        // await User.destroy({ where: { id: ids } });
      });

      it('Added users in audit record', async () => {
        const auditUsers = await ZALUser.findAll({
          where: { data_id: users.map((u) => u.id) },
          transaction,
        });
        const dmlType = auditUsers.map((au) => au.dml_type);
        dmlType.sort();
        expect(dmlType).toEqual(['INSERT', 'INSERT', 'INSERT', 'INSERT']);

        const data = auditUsers.map((au) => ({
          id: parseInt(au.data_id, 10),
          name: au.new_row_data.name,
        }));
        data.sort((a, b) => ((a.id > b.id) ? 1 : -1));
        expect(data).toEqual(users);
      });

      it('Modified users in audit record', async () => {
        await User.update(
          { name: 'z', email: 'z@z.com' },
          {
            where: { id: users[0].id },
            transaction,
          },
        );

        const auditUsers = await ZALUser.findAll({
          where: { data_id: users[0].id, dml_type: 'UPDATE' },
          transaction,
        });

        const data = auditUsers.map((au) => ({
          id: parseInt(au.data_id, 10),
          oldName: au.old_row_data.name,
          newName: au.new_row_data.name,
        }));
        data.sort((a, b) => ((a.id > b.id) ? 1 : -1));

        const modified = [{ id: users[0].id, oldName: users[0].name, newName: 'z' }];

        expect(data).toEqual(modified);
      });
    });
  });
});
