const statuses = [
  'deleted',
  'draft',
  'submitted',
  'needs_action',
  'approved',
];

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.renameColumn('ActivityReports', 'status', 'submissionStatus', { transaction }),
      queryInterface.renameColumn('ActivityReports', 'approvingManagerId', 'oldApprovingManagerId', { transaction }),
      queryInterface.renameColumn('ActivityReports', 'managerNotes', 'oldManagerNotes', { transaction }),
      queryInterface.addColumn('ActivityReports', 'calculatedStatus', { type: Sequelize.DataTypes.ENUM(...statuses) }, { transaction }),
    ])
  )),

  down: async (queryInterface) => queryInterface.sequelize.transaction((transaction) => {
    const query = 'DROP TYPE public."enum_ActivityReports_calculatedStatus";';

    return Promise.all([
      queryInterface.renameColumn('ActivityReports', 'submissionStatus', 'status', { transaction }),
      queryInterface.renameColumn('ActivityReports', 'oldApprovingManagerId', 'approvingManagerId', { transaction }),
      queryInterface.renameColumn('ActivityReports', 'oldManagerNotes', 'managerNotes', { transaction }),
      queryInterface.removeColumn('ActivityReports', 'calculatedStatus', { transaction }),
      queryInterface.sequelize.query(query, { transaction }),
    ]);
  }),
};
