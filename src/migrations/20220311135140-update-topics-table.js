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
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
    // create an "isSelectable" column, denoting that this topic
    // is in active use
      await queryInterface.addColumn(
        'Topics',
        'isSelectable',
        {
          type: Sequelize.DataTypes.BOOLEAN,
        },
        { transaction },
      );

      // set all inactive topics to not selectable
      await queryInterface.bulkUpdate('Topics', {
        isSelectable: false,
      }, {
        name: {
          [Sequelize.Op.notIn]: TOPICS,
        },
      }, { transaction });

      // delete all existing active topics
      // (couldn't figure out how to do a targeted bulk update with
      // the sequelize query interface object)
      await queryInterface.bulkDelete('Topics', {
        name: {
          [Sequelize.Op.in]: TOPICS,
        },
      }, { transaction });

      const topicsToInsert = TOPICS.map((topic) => ({
        name: topic,
        isSelectable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // add topics back, and they are now selectable
      return queryInterface.bulkInsert('Topics', topicsToInsert, {
        transaction,
      });
    },
  ),

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Topics', 'isSelectable');
  },
};
