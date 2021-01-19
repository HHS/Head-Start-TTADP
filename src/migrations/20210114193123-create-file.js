module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Files', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      originalFileName: {
        type: Sequelize.STRING,
      },
      key: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM('UPLOADING', 'UPLOADED', 'UPLOAD_FAILED', 'SCANNING', 'APPROVED', 'REJECTED'),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Files');
  },
};
