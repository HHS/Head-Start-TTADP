module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'UserValidationStatus',
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
        // 'email', 'phone', etc.
        type: { allowNull: false, type: Sequelize.STRING },
        token: { allowNull: true, type: Sequelize.STRING },
        validatedAt: { allowNull: true, type: Sequelize.DATE },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    await queryInterface.addIndex('UserValidationStatus', ['userId', 'type'], { transaction });
  }),

  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('UserValidationStatus', { transaction });

    // Remove ZALUserValidationStatus and functions.
    await queryInterface.dropTable('ZALUserValidationStatus', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFUserValidationStatus" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFUserValidationStatus" ()', { transaction });
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFUserValidationStatus" ()', { transaction });
  }),
};
