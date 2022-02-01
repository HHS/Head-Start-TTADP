import db, { User, ZALUser } from '..';
import { auditLogger } from '../../logger';

describe('Audit models', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('audit user model', () => {
    describe('default scope', () => {
      let t;
      // let userIds = [];
      // let userIdNames = [];

      beforeEach(async () => {
        t = await db.sequelize.transaction();

        const descriptor = await db.sequelize.queryInterface.sequelize.query(
          `SELECT
            set_config('audit.auditDescriptor', '${expect.getState().currentTestName}', TRUE) as "auditDescriptor";`,
          { transaction: t },
        );
        auditLogger.info(descriptor);
      });

      afterEach(async () => {
        if (t) {
          await t.rollback();
        }
      });

      it('Added user in audit record', async () => {
        const addedUser = await User.create({
          name: 'aa',
          email: 'aa@aa.com',
          hsesUserId: 11111,
          hsesUsername: 'aa',
        }, { transaction: t });
        const auditUsers = await ZALUser.findAll({
          where: { data_id: addedUser.id },
          transaction: t,
        });

        expect(auditUsers[0].dml_type).toEqual('INSERT');

        expect({
          id: parseInt(auditUsers[0].data_id, 10),
          name: auditUsers[0].new_row_data.name,
        })
          .toEqual({
            id: addedUser.id,
            name: 'aa',
          });
      });

      it('Modified users in audit record', async () => {
        const addedUser = await User.create({
          name: 'aa',
          email: 'aa@aa.com',
          hsesUserId: 11111,
          hsesUsername: 'aa',
        }, { transaction: t });
        await User.update(
          { name: 'zz', email: 'zz@zz.com' },
          {
            where: { id: addedUser.id },
            transaction: t,
          },
        );

        const auditUsers = await ZALUser.findAll({
          where: { data_id: addedUser.id, dml_type: 'UPDATE' },
          transaction: t,
        });

        expect({
          id: parseInt(auditUsers[0].data_id, 10),
          oldName: auditUsers[0].old_row_data.name,
          newName: auditUsers[0].new_row_data.name,
        })
          .toEqual({
            id: addedUser.id,
            oldName: addedUser.name,
            newName: 'zz',
          });
      });

      // it('Deleted users in audit record', async () => {
      //   const addedUser = await User.create({
      //     name: 'aa',
      //     email: 'aa@aa.com',
      //     hsesUserId: 11111,
      //     hsesUsername: 'aa',
      //   }, { transaction: t });
      //   await User.update(
      //     { name: 'zz', email: 'zz@zz.com' },
      //     {
      //       where: { id: addedUser.id },
      //       transaction: t,
      //     },
      //   );

      //   const auditUsers = await ZALUser.findAll({
      //     where: { data_id: addedUser.id, dml_type: 'UPDATE' },
      //     transaction: t,
      //   });

      //   expect({
      //     id: parseInt(auditUsers[0].data_id, 10),
      //     oldName: auditUsers[0].old_row_data.name,
      //     newName: auditUsers[0].new_row_data.name,
      //   })
      //     .toEqual({
      //       id: addedUser.id,
      //       oldName: addedUser.name,
      //       newName: 'zz',
      //     });
      // });
    });
  });
});
