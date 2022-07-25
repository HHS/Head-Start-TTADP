/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.addColumn(
    'Recipients',
    'uei',
    { type: Sequelize.DataTypes.STRING, defaultValue: '', allowNull: true },
    { transaction },
  )),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'Recipients',
    'uei',
    { transaction },
  )),
};
