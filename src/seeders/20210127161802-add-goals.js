const now = new Date();

const bulletedGoal = `
  * Staff have become very Tech Savvy
  * Recipient utilized down time to promote individual Professional Development and began training on Conscious Discipline to support staff and families with challenges.
  * Created program changes to support COVID times such as:
        Swivel cameras for observations
        DOJO communication device for parents
        Weekly ZOOM connects to support staff.
`;

const longGoal = `Recipient will receive support in developing a full enrollment action plan that covers the 12-month under-enrollment period.
Recipient will receive strategies for ensuring they can consistently meet enrollment requirement via their ERSEA policies and procedures. Recipient will receive strategies for ensuring their partnership with Skyline leads to sustainable enrollment.`;

module.exports = {
  up: async (queryInterface) => {
    const goalTemplates = [
      {
        id: 50, // 2,
        hash: queryInterface.sequelize.fn('md5', queryInterface.sequelize.fn('TRIM', 'Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.')),
        templateName: 'Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.',
        createdAt: now,
        updatedAt: now,
        templateNameModifiedAt: now,
        creationMethod: 'Automatic',
      },
      {
        id: 51, // 3,
        hash: queryInterface.sequelize.fn('md5', queryInterface.sequelize.fn('TRIM', 'Recipient supports and sustains comprehensive, integrated and systemic SR, PFCE, and PD processes and services.')),
        templateName: 'Recipient supports and sustains comprehensive, integrated and systemic SR, PFCE, and PD processes and services.',
        createdAt: now,
        updatedAt: now,
        templateNameModifiedAt: now,
        creationMethod: 'Automatic',
      },
      {
        id: 52, // 4,
        hash: queryInterface.sequelize.fn('md5', queryInterface.sequelize.fn('TRIM', bulletedGoal)),
        templateName: bulletedGoal,
        createdAt: now,
        updatedAt: now,
        templateNameModifiedAt: now,
        creationMethod: 'Automatic',
      },
      {
        id: 53, // 5,
        hash: queryInterface.sequelize.fn('md5', queryInterface.sequelize.fn('TRIM', longGoal)),
        templateName: longGoal,
        createdAt: now,
        updatedAt: now,
        templateNameModifiedAt: now,
        creationMethod: 'Automatic',
      },
    ];

    const goals = [
      {
        id: 1,
        name: 'Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.',
        status: 'Not Started',
        createdAt: now,
        updatedAt: now,
        goalTemplateId: 50,
        grantId: 1,
        onAR: false,
        onApprovedAR: false,
        isRttapa: 'Yes',
      },
      {
        id: 2,
        name: 'Recipient supports and sustains comprehensive, integrated and systemic SR, PFCE, and PD processes and services.',
        status: 'Not Started',
        createdAt: now,
        updatedAt: now,
        goalTemplateId: 51,
        grantId: 1,
        onAR: false,
        onApprovedAR: false,
      },
      {
        id: 3,
        name: bulletedGoal,
        status: 'Not Started',
        createdAt: now,
        updatedAt: now,
        goalTemplateId: 52,
        grantId: 1,
        onAR: false,
        onApprovedAR: false,
      },
      {
        id: 4,
        name: longGoal,
        status: 'Not Started',
        createdAt: now,
        updatedAt: now,
        goalTemplateId: 53,
        grantId: 2,
        onAR: false,
        onApprovedAR: false,
      },
    ];

    await queryInterface.bulkInsert('GoalTemplates', goalTemplates, { validate: true, individualHooks: true });
    await queryInterface.bulkInsert('Goals', goals, { validate: true, individualHooks: true });

    await queryInterface.sequelize.query(`ALTER SEQUENCE "GoalTemplates_id_seq" RESTART WITH ${goalTemplates[goalTemplates.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "Goals_id_seq" RESTART WITH ${goals[goals.length - 1].id + 1};`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Goals', null);
    await queryInterface.bulkDelete('GoalTemplates', null);
  },
};
