module.exports = {
  up: (queryInterface, Sequelize) => (
    queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Users',
        'hsesUsername',
        {
          allowNull: true,
          type: Sequelize.STRING,
        },
        {
          transaction,
        },
      );
      await queryInterface.addColumn(
        'Users',
        'hsesAuthorities',
        {
          allowNull: true,
          type: Sequelize.ARRAY(Sequelize.STRING),
        },
        {
          transaction,
        },
      );
      await queryInterface.sequelize.query('UPDATE "Users" SET "hsesUsername"="email"', { transaction });
      await queryInterface.changeColumn(
        'Users',
        'hsesUsername',
        {
          allowNull: false,
          type: Sequelize.STRING,
        },
        {
          transaction,
        },
      );
    })
  ),

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'hsesAuthorities');
    await queryInterface.removeColumn('Users', 'hsesUsername');
  },
};
