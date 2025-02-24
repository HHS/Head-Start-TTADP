const md5 = require('md5');
const { prepMigration } = require('../lib/migration');
const { CREATION_METHOD } = require('../constants');

const standardGoalTexts = [
  '(Teaching Practices) The recipient will implement systems and services that ensure eﬀective adult-child interactions and responsive care using eﬀective teaching and home visiting practices.',
  '(Child Safety) The recipient will implement systems and services to ensure that everyone promotes a culture of program safety, so children are kept safe at all times.',
  '(ERSEA) The recipient will implement systems and services to ensure their Eligibility, Recruitment, Selection, Enrollment, and Attendance procedures meet the needs of their children, families, and community.',
  '(Governance) The recipient will establish and maintain a formal structure for program governance that ensures clear roles, responsibilities and procedures, eﬀective training, and representation of families and the community.',
  '(Fiscal Management) The recipient will implement strong fiscal management and reporting systems to ensure the safeguarding of federal funds, facilities, and resources.',
  '(Development and Learning) The recipient will implement child development and early learning services that are developmentally, culturally, and linguistically appropriate for all children and families.',
  '(Mental Health) The recipient will implement systems and services that promote the mental and behavioral health of all children and families.',
  '(Physical Health) The recipient will implement systems and services that ensure expectant families and children\'s health, oral health, and nutrition needs are met in developmentally, culturally, and linguistically appropriate ways.',
  '(DEIA) The recipient will implement comprehensive systems and services that promote diversity, equity, inclusion, accessibility, and belonging.',
  '(Family Engagement) The recipient will implement family engagement strategies that are relationship-based and culturally and linguistically appropriate.',
  '(Family Support) The recipient will implement collaborative systems and services with families and community partners to support family well-being and the needs of vulnerable families.',
  '(Professional Development) The recipient will implement a systematic approach to staﬀ training and professional development that assists staﬀ in acquiring, refining, or increasing the knowledge and skills needed to provide high-quality, comprehensive services.',
  '(Workforce Development) The recipient will implement systems to recruit, hire, onboard, support, and retain staﬀ to ensure all program staﬀ have suﬃcient knowledge, experience, competencies, and resources to fulfill the roles and responsibilities of their positions.',
  '(New Leaders) The recipient\'s new leader(s) will identify and use resources, professional development, and access to necessary regulations to meet the needs of their role(s) and responsibilities.',
  '(CQI and Data) The recipient will implement data and ongoing monitoring systems to inform continuous quality improvement.',
  '(Program Structure) The recipient will implement management and program structures that provide eﬀective oversight and administration and meet the needs of the staﬀ, families, and communities.',
  '(Disaster Recovery) The recipient will implement systems and services to support children, families, and staﬀ with recovering from disasters.',
  '(RAN investigation) The recipient will implement systems and services to address a reported child incident during the RO investigation.',
];

const now = new Date();

const standardGoal = (templateName) => ({
  creationMethod: CREATION_METHOD.CURATED,
  hash: md5(templateName),
  createdAt: now,
  updatedAt: now,
  templateNameModifiedAt: now,
});

const standardGoalTemplates = standardGoalTexts.map((templateName) => ({
  ...standardGoal(templateName),
  templateName,
}));

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.bulkInsert('GoalTemplates', standardGoalTemplates, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.bulkDelete(
        'GoalTemplates',
        {
          creationMethod: CREATION_METHOD.CURATED,
          templateName: standardGoalTexts,
        },
        { transaction },
      );
    },
  ),
};
