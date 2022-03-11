const TOPICS = [
  'Behavioral / Mental Health / Trauma',
  'Child Assessment, Development, Screening',
  'CLASS: Classroom Organization',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Instructional or Parenting)',
  'Data and Evaluation',
  'ERSEA',
  'Environmental Health and Safety / EPRR',
  'Equity',
  'Facilities',
  'Family Support Services',
  'Fiscal / Budget',
  'Five-Year Grant',
  'Home Visiting',
  'Human Resources',
  'Leadership / Governance',
  'Learning Environments',
  'Nutrition',
  'Oral Health',
  'Parent and Family Engagement',
  'Partnerships and Community Engagement',
  'Physical Health and Screenings',
  'Pregnancy Services / Expectant Families',
  'Program Planning and Services',
  'Quality Improvement Plan / QIP',
  'Recordkeeping and Reporting',
  'Safety Practices',
  'Staff Wellness',
  'Teaching Practices / Teacher-Child Interactions',
  'Technology and Information Systems',
  'Transition Practices',
  'Transportation',
];

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      // delete all existing active topics
      await queryInterface.bulkDelete('Topics', {}, { transaction });

      const topicsToInsert = TOPICS.map((topic) => ({
        name: topic,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // add topics back, and they are now selectable
      return queryInterface.bulkInsert('Topics', topicsToInsert, {
        transaction,
      });
    },
  ),

  down: async () => {
  // out of luck here I think
  },
};
