const USER_ROLES = [
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
  up: async (queryInterface, Sequelize) => queryInterface.addColumn(
    'ActivityReports',
    'creatorRole',
    {
      type: Sequelize.DataTypes.ENUM(USER_ROLES),
    },
  ),

  down: async (queryInterface) => queryInterface.removeColumn('ActivityReports', 'creatorRole'),
};
