/* eslint-disable no-empty-function */

/**
 * update roles table based on info provided in this Jira
 * https://ocio-jira.acf.hhs.gov/browse/TTAHUB-948
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // disable audit logging
      const loggedUser = '0';
      const sessionSig = __filename;
      const auditDescriptor = 'RUN MIGRATIONS';
      await queryInterface.sequelize.query(
        `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction },
      );

      await queryInterface.sequelize.query(`
      -- update current roles
      UPDATE "Roles" SET "fullName" = 'Other Federal Staff' WHERE "fullName" = 'Central Office: Other Divisions';
      UPDATE "Roles" SET "name" = 'OFS' WHERE "fullName" = 'Other Federal Staff';
      UPDATE "Roles" SET "fullName" = 'COR' WHERE "name" = 'COR';
      UPDATE "Roles" SET "fullName" = 'Central Office' WHERE "fullName" = 'Central Office: TTA and Comprehensive Services Division';

      -- insert new roles
      INSERT INTO "Roles" ("name", "fullName", "isSpecialist", "createdAt", "updatedAt") VALUES ('NC', 'National Center', false, now(), now());
      INSERT INTO "Roles" ("name", "fullName", "isSpecialist", "createdAt", "updatedAt") VALUES ('CSC', 'Customer Service Contact', false, now(), now());
    `, { transaction });

      // create user role table
      await queryInterface.createTable('UserRoles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Users',
            },
            key: 'id',
          },
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Roles',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { 
          uniqueKeys: {
              userId_roleId_unique: {
                 fields: ['userId', 'roleId']
              }
          },
          transaction,
      });

      await queryInterface.sequelize.query(
        `DO
        $$
        DECLARE
            u record;
        BEGIN
        FOR u IN SELECT "id" as user_id, unnest("role")::text as user_role FROM "Users" WHERE array_length("role", 1) > 0
          LOOP               
              INSERT INTO "UserRoles" 
                  (
                      "userId", 
                      "roleId",
                      "createdAt",
                      "updatedAt"
                  ) 
              VALUES 
                  (
                      u.user_id, 
                     (SELECT "id" from "Roles" WHERE u.user_role = "Roles"."fullName"),
                     now(),
                     now()
                  );
          END LOOP; 
        END;
        $$
        LANGUAGE plpgsql;
        `,
        { transaction },
      );

      // remove old column from users table
      await queryInterface.removeColumn(
        'Users',
        'role',
        { transaction },
      );

      // drop old enum
      await queryInterface.sequelize.query(
        'DROP TYPE public."enum_Users_role";',
        { transaction },
      );
    });
  },

  async down() {},
};
