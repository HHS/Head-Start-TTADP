const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        /* sql */ `

      -- Change national centers id to type INT.
      ALTER TABLE "NationalCenters"
      ALTER COLUMN "id" TYPE INT;

      -- Delete all data from table "NationalCenters".
        DELETE FROM "NationalCenters";

      -- Insert default national centers 'DTL','HBHS', 'PFCE', 'PFMO' into table "NationalCenters".
      INSERT INTO "NationalCenters" ("id", "name", "createdAt", "updatedAt")
      VALUES
        (1, 'DTL', NOW(), NOW()),
        (2, 'HBHS', NOW(), NOW()),
        (3, 'PFCE', NOW(), NOW()),
        (4, 'PFMO', NOW(), NOW());
      `,
        { transaction }
      )

      // Create table 'NationalCenterUsers'.
      await queryInterface.createTable(
        'NationalCenterUsers',
        {
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
        },
        { transaction }
      )
    })
  },

  down: async () => {},
}
