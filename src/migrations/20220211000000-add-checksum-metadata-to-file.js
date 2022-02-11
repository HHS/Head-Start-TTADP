/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.addColumn('file', 'checksums', { type: Sequelize.DataTypes.JSON, allowNull: true }, { transaction }),
    queryInterface.addColumn('file', 'metadata', { type: Sequelize.DataTypes.JSON, allowNull: true }, { transaction }),
  ])),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => Promise.all([
    queryInterface.removeColumn('file', 'checksums', { transaction }),
    queryInterface.removeColumn('file', 'metadata', { transaction }),
  ])),
};
