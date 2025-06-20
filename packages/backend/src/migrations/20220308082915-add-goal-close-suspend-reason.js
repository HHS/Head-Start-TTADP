const CLOSE_SUSPEND_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'TTA complete',
  'Key staff turnover',
  'Recipient is not responding',
  'Other',
];

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.addColumn('Goals', 'closeSuspendReason', { type: Sequelize.DataTypes.ENUM(CLOSE_SUSPEND_REASONS) }, { transaction }),
      queryInterface.addColumn('Goals', 'closeSuspendContext', { type: Sequelize.TEXT }, { transaction }),
    ])
  )),

  down: (queryInterface) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.removeColumn('Goals', 'closeSuspendReason', { transaction }),
      queryInterface.removeColumn('Goals', 'closeSuspendContext', { transaction }),
    ])
  )),
};
