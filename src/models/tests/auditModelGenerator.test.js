import db, { User, ZALUser } from '..';
import { auditLogger } from '../../logger';

describe('Audit models', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('audit user model', () => {
    describe('default scope', () => {
      let t;
      let userIds = [];
      let userIdNames = [];

      beforeEach(async () => {
        t = await db.sequelize.transaction();

        const descriptor = await db.sequelize.queryInterface.sequelize.query(
          `SELECT
            set_config('audit.auditDescriptor', '${expect.getState().currentTestName}', TRUE) as "auditDescriptor";`,
          { transaction: t },
        );
        auditLogger.info(descriptor);

        const users = await Promise.all([
          await User.create({
            name: 'aa',
            email: 'aa@aa.com',
            hsesUserId: 11111,
            hsesUsername: 'aa',
          }, { transaction: t })
            .catch(() => console.error(users)), // eslint-disable-line no-console
          await User.create({
            name: 'bb',
            email: 'bb@bb.com',
            hsesUserId: 22222,
            hsesUsername: 'bb',
          }, { transaction: t })
            .catch(() => console.error(users)), // eslint-disable-line no-console
          await User.create({
            name: 'cc',
            email: 'cc@cc.com',
            hsesUserId: 33333,
            hsesUsername: 'cc',
          }, { transaction: t })
            .catch(() => console.error(users)), // eslint-disable-line no-console
          await User.create({
            name: 'dd',
            email: 'dd@dd.com',
            hsesUserId: 44444,
            hsesUsername: 'dd',
          }, { transaction: t })
            .catch(() => console.error(users)), // eslint-disable-line no-console
        ]);

        userIds = users.map((u) => u.id)
          .catch(() => console.error(users)); // eslint-disable-line no-console

        userIdNames = users.map((u) => ({ id: u.id, name: u.name }))
          .catch(() => console.error(users)); // eslint-disable-line no-console
      });

      afterEach(async () => {
        if (t) {
          // t.rollback();
          t.commit();
        }
      });

      it('Added users in audit record', async () => {
        const auditUsers = await ZALUser.findAll({
          where: { data_id: userIds },
          transaction: t,
        });

        auditLogger.info(auditUsers);

        const dmlType = auditUsers.map((au) => au.dml_type);
        dmlType.sort();
        expect(dmlType).toEqual(['INSERT', 'INSERT', 'INSERT', 'INSERT']);

        const data = auditUsers.map((au) => ({
          id: parseInt(au.data_id, 10),
          name: au.new_row_data.name,
        }));
        data.sort((a, b) => ((a.id > b.id) ? 1 : -1));
        expect(data).toEqual(userIdNames);
      });

      it('Modified users in audit record', async () => {
        const updates = await User.update(
          { name: 'zz', email: 'zz@zz.com' },
          {
            where: { id: userIds[0] },
            transaction: t,
          },
        ).catch((err) => console.error(err)); // eslint-disable-line no-console

        auditLogger.info(updates);

        const auditUsers = await ZALUser.findAll({
          where: { data_id: userIds[0], dml_type: 'UPDATE' },
          transaction: t,
        });

        auditLogger.info(auditUsers);

        const data = auditUsers.map((au) => ({
          id: parseInt(au.data_id, 10),
          oldName: au.old_row_data.name,
          newName: au.new_row_data.name,
        }));
        data.sort((a, b) => ((a.id > b.id) ? 1 : -1));

        const modified = [{ id: userIdNames[0].id, oldName: userIdNames[0].name, newName: 'z' }];

        expect(data).toEqual(modified);
      });
    });
  });
});
