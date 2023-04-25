import { Model, DataTypes } from 'sequelize'; // eslint-disable-line import/no-import-module-exports

const generateModelClass = async (sequelize, name, schema) => {
  const auditModelName = name;
  const auditModel = class extends Model {};
  auditModel.init(schema, {
    sequelize,
    modelName: auditModelName,
    createdAt: false,
    updatedAt: false,
  });
  module.exports[auditModelName] = auditModel;
  return auditModel;
};

const generateZALDDL = async (sequelize) => {
  const name = 'ZALDDL';
  const schema = {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    ddl_timestamp: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    ddl_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
    },
    session_sig: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ddl_txid: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 'all' },
    },
    descriptor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    command_tag: {
      type: DataTypes.STRING,
    },
    object_type: {
      type: DataTypes.STRING,
    },
    schema_name: {
      type: DataTypes.STRING,
    },
    object_identity: {
      type: DataTypes.STRING,
    },
  };

  return generateModelClass(sequelize, name, schema);
};

const generateZADescriptor = async (sequelize) => {
  const name = 'ZADescriptor';
  const schema = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    descriptor: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
  };

  return generateModelClass(sequelize, name, schema);
};

const generateZAFilter = async (sequelize) => {
  const name = 'ZAFilter';
  const schema = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    tableName: {
      allowNull: true,
      type: DataTypes.STRING,
    },
    columnName: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  };

  return generateModelClass(sequelize, name, schema);
};

export {
  generateZALDDL,
  generateZADescriptor,
  generateZAFilter,
};
