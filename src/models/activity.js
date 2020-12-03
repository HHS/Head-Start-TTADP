import { Model } from 'sequelize';

const deliveryMethods = [
  'in person',
  'virtual'
]

const granteeRoles = [

];

const otherRoles = [

];

const requestors = [
  'grantee',
  'regional office',
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
      type: DataTypes.INTEGER),
      allowNull: false,
      comment: 'total number of attendees',
    }
    deliveryMethod: {
      type: DataTypes.ENUM(deliveryMethods),
      allowNull: false,
    },
    duration: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'length of activity in hours, rounded to nearest half hour',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    granteeRolesInAttendance: {
      type: DataTypes.ARRAY(Sequelize.ENUM(granteeRoles))
      allowNull: false,
      comment: 'roles of grantees who attended the activity',
    }
    otherRolesInAttendance: {
      type: DataTypes.ARRAY(Sequelize.ENUM(otherRoles))
      allowNull: false,
      comment: 'roles of non-grantees who attended the activity',
    }
    requestor: {
      type: DataTypes.ENUM(requestors),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(types),
      allowNull: false,
    },

  }, {
    sequelize,
    modelName: 'Activity',
  });
  return Activity;
};
