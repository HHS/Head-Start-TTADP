module.exports = {
/**
  * Drop 'NOT NULL' requirement, so we can import data not associable with users (yet)
  */
  up: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => {
    const nullIntegerColumn = { type: Sequelize.DataTypes.INTEGER, allowNull: true };
    return Promise.all([
      queryInterface.changeColumn('ActivityReports', 'userId', nullIntegerColumn, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'lastUpdatedById', nullIntegerColumn, { transaction }),
    ]);
  }),

  down: (queryInterface, Sequelize) => queryInterface.sequelize.transaction((transaction) => {
    const notNullIntegerColumn = { type: Sequelize.DataTypes.INTEGER, allowNull: false };
    return Promise.all([
      queryInterface.changeColumn('ActivityReports', 'userId', notNullIntegerColumn, { transaction }),
      queryInterface.changeColumn('ActivityReports', 'lastUpdatedById', notNullIntegerColumn, { transaction }),
    ]);
  }),
};
