import { Model } from 'sequelize';

const deliveryMethods = [
  'in person',
  'virtual',
];

const granteeParticipantRoles = [
  'CEO / CFO / Executive',
  'Center Director / Site Director',
  'Coach',
  'Direct Service: Other',
  'Family Service Worker / Case Manager',
  'Fiscal Manager/Team',
  'Governing Body / Tribal Council / Policy Council',
  'Home Visitor',
  'Manager / Coordinator / Specialist',
  'Parent / Guardian',
  'Program Director (HS / EHS)',
  'Program Support / Administrative Assistant',
  'Teacher / Infant-Toddler Caregiver',
  'Volunteer',
];

const otherParticipantRoles = [
  'HSCO',
  'Local/State Agency(ies)',
  'OCC Regional Office',
  'OHS Regional Office',
  'Regional Head Start Association',
  'Regional TTA Team / Specialists',
  'State Early Learning System',
  'State Head Start Association',
  'Other',
];

const participantTypes = [
  'grantee',
  'non-grantee',
];

const programTypes = [
  'Early Head Start (ages 0-3)',
  'EHS-CCP',
  'Head Start (ages 3-5)',
]

const reasons = [
  'Change in Scope',
  'Coordination / Planning',
  'Full Enrollment',
  'Grantee TTA Plan / Agreement',
  'New Grantee',
  'New Director or Management',
  'New Program Option',
  'Ongoing Quality Improvement',
  'School Readiness Goals',
  'Monitoring | Area of Concern',
  'Monitoring | Noncompliance',
  'Monitoring | Deficiency',
];

const requestors = [
  'grantee',
  'regional office',
];

const statuses = [
  'approved',
  'draft',
  'submitted',
];

const targetPopulations = [
  'Affected by Child Welfare Involvement',
  'Affected by Disaster',
  'Affected by Substance Use',
  'Children with Disabilities',
  'Children experiencing Homelessness',
  'Dual-Language Learners',
  'Pregnant Women',
];

const topics = [
  'Behavioral / Mental Health',
  'Child Assessment, Development, Screening',
  'CLASS: Classroom Management',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Early Childhood or Parenting',
  'Data and Evaluation',
  'ERSEA',
  'Environmental Health and Safety',
  'Facilities',
  'Family Support Services',
  'Fiscal / Budget',
  'Five-Year Grant',
  'Human Resources',
  'Leadership / Governance',
  'Nutrition',
  'Oral Health',
  'Parent and Family Engagement',
  'Partnerships and Community Engagement',
  'Physical Health and Screenings',
  'Pregnancy',
  'Program Planning and Services',
  'QIP',
  'Recordkeeping and Reporting',
  'Safety Practices',
  'Transportation',
  'Other',
];

const types = [
  'technical assistance',
  'training',
];

export default (sequelize, DataTypes) => {
  class Activity extends Model {
    static associate(models) {
      Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'recentEditor' });
      // Activity.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
    }
  }
  Activity.init({
    attendees: {
      type: DataTypes.INTEGER,
      comment: 'total number of attendees',
    },
    deliveryMethod: {
      type: DataTypes.ENUM(deliveryMethods),
    },
    duration: {
      type: DataTypes.DECIMAL(3, 1),
      comment: 'length of activity in hours, rounded to nearest half hour',
    },
    endDate: {
      type: DataTypes.DATEONLY,
    },
    granteeParticipantRole: {
      type: DataTypes.ARRAY(Sequelize.ENUM(granteeParticipantRoles)),
      allowNull: false,
      comment: 'roles of grantees who attended the activity',
    },
    otherParticipantRole: {
      type: DataTypes.ARRAY(Sequelize.ENUM(otherParticipantRoles)),
      comment: 'roles of non-grantees who attended the activity',
    },
    participantType: {
      type: DataTypes.ENUM(participantTypes),
      allowNull: false,
    },
    programType: {
      type: DataTypes.ENUM(programTypes),
      allowNull: false,
    },
    reason: {
      type: DataTypes.ARRAY(Sequelize.ENUM(reasons)),
    },
    requestor: {
      type: DataTypes.ENUM(requestors),
    },
    startDate: {
      type: DataTypes.DATEONLY,
    },
    status: {
      type: DataTypes.ENUM(statuses),
      allowNull: false,
    },
    targetPopulation: {
      type: DataTypes.ARRAY(Sequelize.ENUM(targetPopulations)),
    },
    topic : {
      type: DataTypes.ARRAY(Sequelize.ENUM(topics)),
    },
    type: {
      type: DataTypes.ENUM(types),
    },
  }, {
    sequelize,
    modelName: 'Activity',
    validate: {
      checkRequiredForSubmission() {
        if (this.status !== 'draft') {
          const requiredForSubmission = [
            this.attendees,
            this.deliveryMethod,
            this.duration,
            this.endDate,
            this.granteeRolesInAttendance,
            this.requestor,
            this.startDate,
            this.type,
          ];
          if (requiredForSubmission.includes(null)) {
            throw new Error('Missing field(s) required for activity report submission');
          }
        }
      },
    },
  });
  return Activity;
};
