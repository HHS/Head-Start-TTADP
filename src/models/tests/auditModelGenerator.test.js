import faker from 'faker';
import { Model } from 'sequelize';
import db, { User, ZALUser } from '..';
import { auditLogger } from '../../logger';
import audit from '../auditModelGenerator';

describe('Audit System', () => {
  let t;
  let transactionVariables;

  beforeEach(async () => {
    t = await db.sequelize.transaction();
    transactionVariables = {
      loggedUser: `${faker.datatype.number()}`,
      transactionId: faker.datatype.uuid(),
      sessionSig: faker.datatype.string(32).replace(/[^a-zA-Z0-9!@#$%^&*()_+,.<>?;:]/g, ''),
      auditDescriptor: 'Audit System Test',
    };

    const query = `SELECT
      set_config('audit.loggedUser', '${transactionVariables.loggedUser}', TRUE) as "loggedUser",
      set_config('audit.transactionId', '${transactionVariables.transactionId}', TRUE) as "transactionId",
      set_config('audit.sessionSig', '${transactionVariables.sessionSig}', TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', '${transactionVariables.auditDescriptor}', TRUE) as "auditDescriptor";`;

    await db.sequelize.queryInterface.sequelize.query(
      query,
      { transaction: t },
    );
  });

  afterEach(async () => {
    if (t) {
      // await t.commit();
      await t.rollback();
    }
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('General Audit System', () => {
    it('Transaction variables', async () => {
      const query = `select
      current_setting('audit.loggedUser', true) as "loggedUser",
      current_setting('audit.transactionId', true) as "transactionId",
      current_setting('audit.sessionSig', true) as "sessionSig",
      current_setting('audit.auditDescriptor', true) as "auditDescriptor";`;

      const values = await db.sequelize.queryInterface.sequelize.query(
        query,
        {
          type: db.sequelize.QueryTypes.SELECT,
          transaction: t,
        },
      );

      expect(values[0]).toEqual(transactionVariables);
    });

    describe('Automatic Audit New Tables', () => {
      it('Audit Triggers Automatic added to New Tables', async () => {
        class Test extends Model {}

        Test.init(
          {
            id: {
              allowNull: false,
              primaryKey: true,
              type: db.Sequelize.BIGINT,
              autoIncrement: true,
            },
            value: {
              allowNull: true,
              default: null,
              type: db.Sequelize.STRING,
            },
          },
          {
            sequelize: db.sequelize,
            createdAt: false,
            updatedAt: false,
            transaction: t,
          },
        );

        try {
          await Test.sync({ force: true, alter: true, transaction: t });
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        let data;
        try {
          data = await db.sequelize.queryInterface.sequelize.query(
            `SELECT
              table_catalog,
              table_name
            FROM information_schema.tables
            WHERE table_name like '%Tests';`,
            {
              type: db.sequelize.QueryTypes.SELECT,
              transaction: t,
            },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        expect(data)
          .toEqual([{
            table_catalog: 'ttasmarthub',
            table_name: 'Tests',
          }, {
            table_catalog: 'ttasmarthub',
            table_name: 'ZALTests',
          }]);

        // Postgres information_schema.triggers table does not include any triggers on truncate so
        // to find them the following simulates the same data including all the triggers.
        let triggers;
        try {
          triggers = await db.sequelize.queryInterface.sequelize.query(
            `SELECT
              triggers.trigger_name as name,
              triggers.trigger_action as action
            FROM
              (
              SELECT
                t.tgname                           as trigger_name,
                TRIM(
                  (CASE WHEN (tgtype::int::bit(7) & b'0000100')::int = 0 THEN '' ELSE ' INSERT' END) ||
                  (CASE WHEN (tgtype::int::bit(7) & b'0001000')::int = 0 THEN '' ELSE ' DELETE' END) ||
                  (CASE WHEN (tgtype::int::bit(7) & b'0010000')::int = 0 THEN '' ELSE ' UPDATE' END) ||
                  (CASE WHEN (tgtype::int::bit(7) & b'0100000')::int = 0 THEN '' ELSE ' TRUNCATE' END)
                )                                  as trigger_action
              FROM pg_trigger t
              ) triggers
            WHERE triggers.trigger_name like '%Tests'
            ORDER BY name, action;`,
            {
              type: db.sequelize.QueryTypes.SELECT,
              transaction: t,
            },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        expect(triggers)
          .toEqual([{
            name: 'ZALNoDeleteTTests',
            action: 'DELETE',
          }, {
            name: 'ZALNoTruncateTTests',
            action: 'TRUNCATE',
          }, {
            name: 'ZALNoUpdateTTests',
            action: 'UPDATE',
          }, {
            name: 'ZALTTests',
            action: 'INSERT DELETE UPDATE',
          }, {
            name: 'ZALTruncateTTests',
            action: 'TRUNCATE',
          }]);

        let routines;
        try {
          routines = await db.sequelize.queryInterface.sequelize.query(
            `SELECT
              routine_name as name
            FROM information_schema.routines
            WHERE routine_name like 'ZAL%'
            AND  routine_name like '%FTests';`,
            {
              type: db.sequelize.QueryTypes.SELECT,
              transaction: t,
            },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        expect(routines)
          .toEqual([
            { name: 'ZALFTests' },
            { name: 'ZALNoDeleteFTests' },
            { name: 'ZALNoTruncateFTests' },
            { name: 'ZALNoUpdateFTests' },
            { name: 'ZALTruncateFTests' },
          ]);

        const hooks = [
          'beforeBulkCreate',
          'beforeBulkDestroy',
          'beforeBulkUpdate',
          'afterValidate',
          'beforeCreate',
          'beforeDestroy',
          'beforeUpdate',
          'beforeSave',
          'beforeUpsert',
        ];
        hooks.map((hook) => expect(db.sequelize.hasHook(hook)).toEqual(true));

        const ZALTest = audit.generateAuditModel(db.sequelize, Test);

        let addTest;
        try {
          addTest = await Test.create(
            { value: faker.datatype.string(32).replace(/[^a-zA-Z0-9!@#$%^&*()_+,.<>?;:]/g, '') },
            { transaction: t },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        let auditTest;
        try {
          auditTest = await ZALTest.findAll({
            where: { data_id: addTest.id },
            transaction: t,
          });
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        expect({
          id: auditTest[0].data_id,
          value: auditTest[0].new_row_data.value,
        })
          .toEqual(addTest.dataValues);

        const updateTo = {
          id: addTest.id,
          oldValue: addTest.value,
          newValue: faker.datatype.string(32).replace(/[^a-zA-Z0-9!@#$%^&*()_+,.<>?;:]/g, ''),
        };

        try {
          await Test.update(
            { value: updateTo.newValue },
            {
              where: { id: addTest.id },
              transaction: t,
            },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        let auditTestUpdate;
        try {
          auditTestUpdate = await ZALTest.findAll({
            where: { data_id: addTest.id, dml_type: 'UPDATE' },
            transaction: t,
          });
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        expect({
          id: auditTestUpdate[0].data_id,
          oldValue: auditTestUpdate[0].old_row_data.value,
          newValue: auditTestUpdate[0].new_row_data.value,
        })
          .toEqual(updateTo);

        try {
          await Test.destroy(
            {
              where: { id: addTest.id },
              transaction: t,
            },
          );
        } catch (err) {
          auditLogger.error(err);
          throw (err);
        }

        const auditTestDestroy = await ZALTest.findAll({
          where: { data_id: addTest.id, dml_type: 'DELETE' },
          transaction: t,
        });

        expect({
          id: auditTestDestroy[0].data_id,
          oldValue: auditTestDestroy[0].old_row_data.value,
        })
          .toEqual({
            id: updateTo.id,
            oldValue: updateTo.newValue,
          });

        Test.drop().catch((err) => auditLogger.error(err));
      });
    });
  });

  describe('audit user model', () => {
    let addedUser;

    beforeEach(async () => {
      addedUser = await User.create({
        name: faker.name.findName(),
        email: faker.internet.exampleEmail(),
        hsesUserId: faker.datatype.number(),
        hsesUsername: faker.internet.userName(),
      }, { transaction: t });
    });

    it('Added user in audit record', async () => {
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
          name: addedUser.name,
        });
    });

    it('Modified users in audit record', async () => {
      const updateData = {
        name: faker.name.findName(),
        email: faker.internet.exampleEmail(),
        hsesUsername: faker.internet.userName(),
      };

      await User.update(
        updateData,
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
        oldEmail: auditUsers[0].old_row_data.email,
        newEmail: auditUsers[0].new_row_data.email,
        oldUsername: auditUsers[0].old_row_data.hsesUsername,
        newUsername: auditUsers[0].new_row_data.hsesUsername,
      })
        .toEqual({
          id: addedUser.id,
          oldName: addedUser.name,
          newName: updateData.name,
          oldEmail: addedUser.email,
          newEmail: updateData.email,
          oldUsername: addedUser.hsesUsername,
          newUsername: updateData.hsesUsername,
        });
    });

    it('Deleted users in audit record', async () => {
      await User.destroy(
        {
          where: { id: addedUser.id },
          transaction: t,
        },
      );

      const auditUsers = await ZALUser.findAll({
        where: { data_id: addedUser.id, dml_type: 'DELETE' },
        transaction: t,
      });

      expect({
        id: parseInt(auditUsers[0].data_id, 10),
        name: auditUsers[0].old_row_data.name,
      })
        .toEqual({
          id: addedUser.id,
          name: addedUser.name,
        });
    });
  });
});
