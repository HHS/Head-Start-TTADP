/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.addColumn(
    'Goals',
    'endDate',
    { type: Sequelize.DataTypes.DATEONLY, allowNull: true },
    { transaction },
  )),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'Goals',
    'endDate',
    { transaction },
  )),
};
