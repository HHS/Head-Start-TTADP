/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.addColumn(
    'Recipient',
    'uei',
    { type: Sequelize.DataTypes.STRING, allowNull: false },
    { transaction },
  )),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'Recipient',
    'uei',
    { transaction },
  )),
};
