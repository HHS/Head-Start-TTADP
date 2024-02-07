module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Files',
      'attachmentType',
      {
        type: Sequelize.ENUM('ATTACHMENT', 'RESOURCE'),
        allowNull: false,
      },
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (t) => {
      const query = 'DROP TYPE public."enum_Files_attachmentType";';
      await queryInterface.removeColumn('Files', 'attachmentType', { transaction: t });
      await queryInterface.sequelize.query(query, { transaction: t });
    });
  },
};
