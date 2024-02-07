module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.addColumn('Grants', 'stateCode', { type: Sequelize.STRING }),

  down: async (queryInterface) => queryInterface.removeColumn('Grants', 'stateCode'),
};
