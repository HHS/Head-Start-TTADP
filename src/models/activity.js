import { Model } from 'sequelize';

const deliveryMethods = [
  'in person',
  'virtual',
];

const granteeRoles = [

];

const otherRoles = [

];

const participantTypes = [
  'grantee',
  'non-grantee',
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

const types = [
  'technical assistance',
  'training',
];

export default (sequelize, DataTypes) => {
  class Activity extends Model {
    static associate(models) {
      Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      // Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      // Activity.belongsToMany(models.Scope, {
      //   through: models.Permission, foreignKey: 'userId', as: 'scopes', timestamps: false,
      // });
      // Activity.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
    }
  }
  Activity.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
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
    granteeRolesInAttendance: {
      type: DataTypes.ARRAY(Sequelize.ENUM(granteeRoles)),
      allowNull: false,
      comment: 'roles of grantees who attended the activity',
    },
    otherRolesInAttendance: {
      type: DataTypes.ARRAY(Sequelize.ENUM(otherRoles)),
      comment: 'roles of non-grantees who attended the activity',
    },
    participantType: {
      type: DataTypes.ENUM(participantTypes),
      allowNull: false,
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
