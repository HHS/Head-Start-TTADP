const {
  Model,
} = require('sequelize');

/**
 * Grants table. Stores grants.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Region, { foreignKey: 'regionId' });
      Grant.belongsTo(models.Grantee, { foreignKey: 'granteeId', as: 'grantee' });
      Grant.belongsToMany(models.Goal, { through: models.GrantGoal, foreignKey: 'grantId', as: 'goals' });
      Grant.hasMany(models.Program, { foreignKey: 'grantId', as: 'programs' });
      Grant.hasMany(models.ActivityRecipient, { foreignKey: 'grantId', as: 'activityRecipients' });
    }
  }
  Grant.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: false,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      /*
        We're not setting unique true here to allow
        bulkCreate/updateOnDuplicate to properly match rows on just the id.
        unique: true,
      */
    },
    cdi: DataTypes.BOOLEAN,
    status: DataTypes.STRING,
    grantSpecialistName: DataTypes.STRING,
    grantSpecialistEmail: DataTypes.STRING,
    programSpecialistName: DataTypes.STRING,
    programSpecialistEmail: DataTypes.STRING,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    granteeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    oldGrantId: DataTypes.INTEGER,
    programTypes: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.programs && this.programs.length > 0 ? [
          ...new Set(
            this.programs.filter((p) => (p.programType))
              .map((p) => (p.programType)).sort(),
          )] : [];
      },
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        const programTypes = this.programTypes.length > 0 ? ` - ${this.programTypes.join(', ')}` : '';
        return `${this.grantee.name} - ${this.number}${programTypes}`;
      },
    },
  }, {
    sequelize,
    modelName: 'Grant',
  });
  return Grant;
};
