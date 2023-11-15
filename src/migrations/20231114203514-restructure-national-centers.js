const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(/* sql */`

      -- Change national centers id to type INT.
      ALTER TABLE "NationalCenters"
      ALTER COLUMN "id" TYPE INT;

      -- Delete all data from table "NationalCenters".
        DELETE FROM "NationalCenters";

     -- Remove the column 'mapsTo' from table "NationalCenters".
        ALTER TABLE "NationalCenters"
        DROP COLUMN "mapsTo";
      `, { transaction });

      // Create table 'NationalCenterUsers'.
      await queryInterface.createTable('NationalCenterUsers', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        nationalCenterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'NationalCenters',
            },
            key: 'id',
          },
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });
    });
  },

  down: async () => {},
};
