import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import { propagateDestroyToFile } from './genericFile';

const { cleanupOrphanFiles } = require('../helpers/orphanCleanupHelper');

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
};

const afterCreate = async (sequelize, instance, options) => {
};

const beforeDestroy = async (sequelize, instance, options) => {
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToFile(sequelize, instance, options);
  await cleanupOrphanFiles(sequelize, instance.fileId);
};

export {
  beforeValidate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
};
