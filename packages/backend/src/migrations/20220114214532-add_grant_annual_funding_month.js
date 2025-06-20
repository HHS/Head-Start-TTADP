module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.addColumn('Grants', 'annualFundingMonth', { type: Sequelize.STRING }),

  down: async (queryInterface) => queryInterface.removeColumn('Grants', 'annualFundingMonth'),
};
