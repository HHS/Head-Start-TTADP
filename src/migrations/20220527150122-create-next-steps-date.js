/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.addColumn(
    'NextSteps',
    'completeDate',
    { type: Sequelize.DataTypes.DATEONLY, allowNull: true },
    { transaction },
  )),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'NextSteps',
    'completeDate',
    { transaction },
  )),
};
