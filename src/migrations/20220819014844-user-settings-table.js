module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'UserSettings',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        // 'email', etc.
        class: { type: Sequelize.STRING, allowNull: false },
        key: { type: Sequelize.STRING, allowNull: false },
        default: { type: Sequelize.STRING, allowNull: false },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    const keys = [
      'emailWhenReportSubmittedForReview',
      'emailWhenChangeRequested',
      'emailWhenReportApproval',
      'emailWhenAppointedCollaborator',
    ];

    await Promise.all(keys.map(async (key) => {
      await queryInterface.sequelize.query(
        `INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt") VALUES ('email', '${key}', 'never', current_timestamp, current_timestamp)`,
        { transaction },
      );
    }));

    await queryInterface.createTable(
      'UserSettingOverrides',
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
        userSettingId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'UserSettings' }, key: 'id' },
        },
        value: { allowNull: false, type: Sequelize.STRING },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    await queryInterface.addIndex('UserSettingOverrides', ['userId', 'userSettingId'], { transaction });
    await queryInterface.addConstraint('UserSettingOverrides', {
      fields: ['userId', 'userSettingId'],
      type: 'unique',
      transaction,
    });
  }),
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('UserSettingOverrides', { transaction });
    await queryInterface.dropTable('UserSettings', { transaction });

    // Remove ZALUserSettings and functions.
    await queryInterface.dropTable('ZALUserSettings', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFUserSettings" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFUserSettings" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFUserSettings" ()', { transaction });

    // Remove ZALUserSettingOverrides and functions.
    await queryInterface.dropTable('ZALUserSettingOverrides', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFUserSettingOverrides" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFUserSettingOverrides" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFUserSettingOverrides" ()', { transaction });
  }),
};
