const objectives = [
  {
    id: 1,
    title: 'Objective 1',
    status: 'Draft',
    onApprovedAR: false,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Objectives', objectives, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Objectives', null, {});
  },
};
