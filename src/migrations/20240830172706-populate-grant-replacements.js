const { prepMigration } = require('../lib/migration');

const { GRANT_INACTIVATION_REASONS } = require('../constants');

const inactivationReasons = Object.values(GRANT_INACTIVATION_REASONS);

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Create GrantReplacementTypes table
      await queryInterface.createTable('GrantReplacementTypes', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          references: {
            model: 'GrantReplacementTypes',
            key: 'id',
          },
          allowNull: true,
        },
      }, { transaction });

      // Create GrantReplacement table
      await queryInterface.createTable('GrantReplacements', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        replacedGrantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Grants',
            key: 'id',
          },
        },
        replacingGrantId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Grants',
            key: 'id',
          },
        },
        grantReplacementTypeId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'GrantReplacementTypes',
            key: 'id',
          },
        },
        replacementDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });

      await queryInterface.sequelize.query(/* sql */`
        INSERT INTO "GrantReplacements" (
          "replacedGrantId",
          "replacingGrantId",
          "replacementDate",
          "createdAt",
          "updatedAt"
        )
        SELECT
          gr1."oldGrantId" AS "replacedGrantId",
          gr1."id" AS "replacingGrantId",
          gr2."inactivationDate" AS "replacementDate",
          gr1."createdAt",
          gr1."updatedAt"
        FROM "Grants" gr1
        JOIN "Grants" gr2
        ON gr1."oldGrantId" = gr2.id
        WHERE gr1."oldGrantId" IS NOT NULL;
      `, { transaction });

      await queryInterface.removeColumn('Grants', 'oldGrantId', { transaction });
      await queryInterface.removeColumn('Grants', 'inactivationDate', { transaction });
      await queryInterface.removeColumn('Grants', 'inactivationReason', { transaction });
    },
  ),

  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.addColumn('Grants', 'oldGrantId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Grants', 'inactivationDate', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('Grants', 'inactivationReason', {
        type: Sequelize.ENUM(...inactivationReasons),
        allowNull: true,
      }, { transaction });

      await queryInterface.dropTable('GrantReplacements', { transaction });
      await queryInterface.dropTable('GrantReplacementTypes', { transaction });
    },
  ),
};
