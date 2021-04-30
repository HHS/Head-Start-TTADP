/* eslint-disable no-multi-str */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('"Objectives"', 'goalId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('"Objectives"', 'goalId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
