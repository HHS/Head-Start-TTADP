/* eslint-disable max-len */

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.addColumn(
      'Files',
      'metadata',
      { type: Sequelize.DataTypes.JSON, allowNull: true },
      { transaction },
    ),
  ])),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.removeColumn('Files', 'metadata', { transaction }),
  ])),
};
