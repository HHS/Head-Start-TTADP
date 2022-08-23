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
        validatedAt: { allowNull: true, type: Sequelize.DATE },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      },
      { transaction },
    );

    await queryInterface.addIndex('UserValidationStatus', ['userId', 'type'], { transaction });

    // Add default values for existing users.
    await queryInterface.sequelize.query(
      `
        DO $$
        DECLARE usr record;
        BEGIN FOR usr IN
            SELECT id FROM "Users" ORDER BY id ASC
          LOOP
            INSERT INTO "UserValidationStatus" ("userId", "type", "createdAt", "updatedAt")
            VALUES (usr.id, 'email', current_timestamp, current_timestamp);
          END LOOP;
        END $$
      `,
      { transaction },
    );
  }),

  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('UserValidationStatus', { transaction });
  }),
};
