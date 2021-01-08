const titles = [
  'Program Specialist',
  'Early Childhood Specialist',
  'Grantee Specialist',
  'Family Engagement Specialist',
  'Health Specialist',
  'Systems Specialist',
];

const roles = [
  'Regional Program Manager',
  'COR',
  'Supervisory Program Specialist',
  'Program Specialist',
  'Grants Specialist',
  'Central Office',
  'TTAC',
  'Admin. Assistant',
  'Early Childhood Manager',
  'Early Childhood Specialist',
  'Family Engagement Specialist',
  'Grantee Specialist Manager',
  'Grantee Specialist',
  'Health Specialist',
  'System Specialist',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.removeColumn('Users', 'title', { transaction: t }),
      queryInterface.sequelize.query('DROP TYPE public."enum_Users_title";', { transaction: t }),
      queryInterface.addColumn(
        'Users',
        'role',
        {
          type: Sequelize.DataTypes.ENUM(...roles),
        },
        { transaction: t },
      ),
    ]));
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.sequelize.transaction((t) => Promise.all([
      queryInterface.removeColumn('Users', 'role', { transaction: t }),
      queryInterface.sequelize.query('DROP TYPE public."enum_Users_role";', { transaction: t }),
      queryInterface.addColumn(
        'Users',
        'title',
        {
          type: Sequelize.DataTypes.ENUM(...titles),
        },
        { transaction: t },
      ),
    ]));
  },
};
