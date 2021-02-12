const statuses = [
  'draft',
  'submitted',
  'needs_action',
  'approved',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.changeColumn(
      'ActivityReports',
      'status',
      {
        type: Sequelize.DataTypes.ENUM(...statuses),
      },
    );
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.changeColumn(
        'ActivityReports',
        'status',
        {
          type: Sequelize.STRING,
        },
        { transaction: t },
      ),
      queryInterface.sequelize.query('DROP TYPE public."enum_ActivityReports_status";', { transaction: t }),
    ]));
  },
};
