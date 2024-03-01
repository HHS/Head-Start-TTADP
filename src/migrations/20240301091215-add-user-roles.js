/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Add ITM, IST, GSM roles.
      await queryInterface.bulkInsert('Roles', [
        {
          name: 'ITM',
          fullName: 'Interim Management Team',
          isSpecialist: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'IST',
          fullName: 'Integrated Service Team',
          isSpecialist: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'GMS',
          fullName: 'Grants Management Specialist',
          isSpecialist: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ], { transaction });
    });
  },

  async down() {},
};
