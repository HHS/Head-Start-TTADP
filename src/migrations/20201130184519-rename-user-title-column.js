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
    queryInterface.removeColumn('Users', 'title');
    queryInterface.addColumn(
      'Users',
      'role',
      {
        type: Sequelize.DataTypes.ENUM(...roles),
      },
    );
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.addColumn(
      'Users',
      'title',
      {
        type: Sequelize.DataTypes.ENUM(...titles),
      },
    );
    queryInterface.removeColumn('Users', 'role');
  },
};
