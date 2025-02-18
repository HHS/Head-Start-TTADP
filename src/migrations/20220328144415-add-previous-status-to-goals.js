module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.addColumn('Goals', 'previousStatus', { type: Sequelize.TEXT, allowNull: true }, { transaction }),
    ])
  )),

  down: (queryInterface) => queryInterface.sequelize.transaction((transaction) => (
    Promise.all([
      queryInterface.removeColumn('Goals', 'previousStatus', { transaction }),
    ])
  )),
};
