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

const goalTemplates = [
  {
    id: 1,
    templateName: 'Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.',
    createdAt: now,
    updatedAt: now,
    templateNameModifiedAt: now,
    creationMethod: 'Automatic',
  },
  {
    id: 2,
    templateName: 'Recipient supports and sustains comprehensive, integrated and systemic SR, PFCE, and PD processes and services.',
    createdAt: now,
    updatedAt: now,
    templateNameModifiedAt: now,
    creationMethod: 'Automatic',
  },
  {
    id: 3,
    templateName: bulletedGoal,
    createdAt: now,
    updatedAt: now,
    templateNameModifiedAt: now,
    creationMethod: 'Automatic',
  },
  {
    id: 4,
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
    goalTemplateId: 1,
    grantId: 1,
    onApprovedAR: false,
  },
  {
    id: 2,
    name: 'Recipient supports and sustains comprehensive, integrated and systemic SR, PFCE, and PD processes and services.',
    status: 'Not Started',
    createdAt: now,
    updatedAt: now,
    goalTemplateId: 2,
    grantId: 1,
    onApprovedAR: false,
  },
  {
    id: 3,
    name: bulletedGoal,
    status: 'Not Started',
    createdAt: now,
    updatedAt: now,
    goalTemplateId: 3,
    grantId: 1,
    onApprovedAR: false,
  },
  {
    id: 4,
    name: longGoal,
    status: 'Not Started',
    createdAt: now,
    updatedAt: now,
    goalTemplateId: 4,
    grantId: 2,
    onApprovedAR: false,
  },
];

// const grantGoals = [
//   {
//     id: 1,
//     grantId: 1,
//     goalId: 1,
//     recipientId: 1,
//     createdAt: now,
//     updatedAt: now,
//   },
//   {
//     id: 2,
//     grantId: 1,
//     goalId: 2,
//     recipientId: 1,
//     createdAt: now,
//     updatedAt: now,
//   },
//   {
//     id: 3,
//     grantId: 1,
//     goalId: 3,
//     recipientId: 1,
//     createdAt: now,
//     updatedAt: now,
//   },
//   {
//     id: 4,
//     grantId: 2,
//     goalId: 4,
//     recipientId: 2,
//     createdAt: now,
//     updatedAt: now,
//   },
// ];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('GoalTemplates', goalTemplates, { validate: true });
    await queryInterface.bulkInsert('Goals', goals, { validate: true });
    // await queryInterface.bulkInsert('GrantGoals', grantGoals);
    await queryInterface.sequelize.query('ALTER SEQUENCE "Goals_id_seq" RESTART WITH 10;');
    await queryInterface.sequelize.query('ALTER SEQUENCE "GrantGoals_id_seq" RESTART WITH 10;');
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Goals', null);
    await queryInterface.bulkDelete('GrantGoals', null);
  },
};
