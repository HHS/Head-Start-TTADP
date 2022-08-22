module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'UserSettings',
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'Users' }, key: 'id' },
        },
        key: { allowNull: false, type: Sequelize.STRING },
        value: { allowNull: false, type: Sequelize.STRING },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    await queryInterface.addIndex('UserSettings', ['userId', 'key'], { transaction });

    await queryInterface.sequelize.query(
      `
        DO $$
        DECLARE usr record;
        BEGIN FOR usr IN
            SELECT id FROM "Users" ORDER BY id ASC
          LOOP
            INSERT INTO "UserSettings" ("userId", "key", "value", "createdAt", "updatedAt")
            VALUES (usr.id, 'emailWhenReportSubmittedForReview', 'never', current_timestamp, current_timestamp);
            INSERT INTO "UserSettings" ("userId", "key", "value", "createdAt", "updatedAt")
            VALUES (usr.id, 'emailWhenChangeRequested', 'never', current_timestamp, current_timestamp);
            INSERT INTO "UserSettings" ("userId", "key", "value", "createdAt", "updatedAt")
            VALUES (usr.id, 'emailWhenReportApproval', 'never', current_timestamp, current_timestamp);
            INSERT INTO "UserSettings" ("userId", "key", "value", "createdAt", "updatedAt")
            VALUES (usr.id, 'emailWhenAppointedCollaborator', 'never', current_timestamp, current_timestamp);
          END LOOP;
        END $$
      `,
      { transaction },
    );
  }),
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('UserSettings', { transaction });
  }),
};
