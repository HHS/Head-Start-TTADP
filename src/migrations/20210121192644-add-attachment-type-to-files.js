module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Files',
      'attachmentType',
      {
        type: Sequelize.ENUM('ATTACHMENT', 'RESOURCE'),
        allowNull: false,
      });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Files', 'attachmentType');
  },
};
