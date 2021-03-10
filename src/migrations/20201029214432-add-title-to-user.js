module.exports = {
  up: (queryInterface, Sequelize) => {
    const titles = [
      'Program Specialist',
      'Early Childhood Specialist',
      'Grantee Specialist',
      'Family Engagement Specialist',
      'Health Specialist',
      'Systems Specialist',
    ];

    return queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.addColumn(
        'Users',
        'title',
        {
          type: Sequelize.DataTypes.ENUM(...titles),
        },
        { transaction: t },
      ),
      queryInterface.addColumn(
        'Users',
        'homeRegionId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Regions',
            key: 'id',
          },
          onUpdate: 'SET NULL',
          onDelete: 'SET NULL',
          defaultValue: null,
        },
        { transaction: t },
      ),
      queryInterface.changeColumn(
        'Users',
        'email', {
          type: Sequelize.STRING,
          unique: true,
        },
        { transaction: t },
      ),
    ]));
  },

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((t) => {
    const query = 'DROP TYPE public."enum_Users_title";';
    return Promise.all([
      queryInterface.removeColumn('Users', 'title', { transaction: t }),
      queryInterface.removeColumn('Users', 'homeRegionId', {
        transaction: t,
      }),
      queryInterface.changeColumn(
        'Users',
        'email', {
          type: Sequelize.STRING,
          unique: false,
        },
        { transaction: t },
      ),
      queryInterface.sequelize.query(query, { transaction: t }),
    ]);
  }),
};
