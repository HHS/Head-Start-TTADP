import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Activity extends Model {
    static associate(models) {
      Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      Activity.belongsTo(models.User, { foreignKey: 'userId', as: 'recentEditor' });
      Activity.hasMany(models.ActivityCollaborator);
      Activity.hasMany(models.ActivityParticipant);
    }
  }
  Activity.init({
    attendees: {
      comment: 'total count of attendees',
      type: DataTypes.INTEGER,
    },
    deliveryMethod: {
      comment: 'constrained to specific values but not enforced by db',
      type: DataTypes.STRING,
    },
    duration: {
      comment: 'length of activity in hours, rounded to nearest half hour',
      type: DataTypes.DECIMAL(3, 1),
    },
    endDate: {
      type: DataTypes.DATEONLY,
    },
    participantType: {
      allowNull: false,
      comment: 'constrained to specific values but not enforced by db',
      type: DataTypes.STRING,
    },
    requestor: {
      comment: 'constrained to specific values but not enforced by db',
      type: DataTypes.STRING,
    },
    startDate: {
      type: DataTypes.DATEONLY,
    },
    status: {
      allowNull: false,
      comment: 'constrained to specific values but not enforced by db',
      type: DataTypes.STRING,
    },
    ttaType: {
      comment: 'constrained to specific values but not enforced by db',
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Activity',
    validate: {
      checkRequiredForSubmission() {
        const requiredForSubmission = [
          this.deliveryMethod,
          this.duration,
          this.endDate,
          this.requestor,
          this.startDate,
          this.ttaType,
        ];
        if (this.status !== 'draft') {
          if (requiredForSubmission.includes(null)) {
            throw new Error('Missing required field(s)');
          }
        }
      },
    },
  });
  return Activity;
};
