module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('Regions', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  }),
  down: (queryInterface) => queryInterface.dropTable('Regions'),
};
