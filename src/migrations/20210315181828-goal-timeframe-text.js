'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Goals', 'timeframe', { type: Sequelize.TEXT });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Goals', 'timeframe', { type: Sequelize.STRING });
  },
};
