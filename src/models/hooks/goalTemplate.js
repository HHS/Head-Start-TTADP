const { Op } = require('sequelize');
const { AUTOMATIC_CREATION } = require('../../constants');

const processForEmbeddedResources = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForGoalTemplate, processGoalTemplateForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForGoalTemplate(changed)) {
    await processGoalTemplateForResourcesById(instance.id);
  }
};

const autoPopulateHash = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateName')
    && instance.templateName !== null
    && instance.templateName !== undefined) {
    instance.set('hash', sequelize.fn('md5', sequelize.fn('TRIM', instance.templateName)));
    if (!options.fields.includes('hash')) {
      options.fields.push('hash');
    }
  }
};

const autoPopulateTemplateNameModifiedAt = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateName')
    && instance.templateName !== null
    && instance.templateName !== undefined) {
    instance.set('templateNameModifiedAt', new Date());
    if (!options.fields.includes('templateNameModifiedAt')) {
      options.fields.push('templateNameModifiedAt');
    }
  }
};

// TODO: TTAHUB-3970: We can remove this when we switch to standard goals.
// Going forward, all goals will be standard goals.
// We determine what the creation method is going to be for standard goals.
// Automatic, created, system generated or something different all together (check with Nathan).
const autoPopulateCreationMethod = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && (!changed.includes('creationMethod')
        || instance.creationMethod === null
        || instance.creationMethod === undefined)) {
    instance.set('creationMethod', AUTOMATIC_CREATION); // 'Automatic'
    if (!options.fields.includes('creationMethod')) {
      options.fields.push('creationMethod');
    }
  }
};

const beforeValidate = (sequelize, instance, options) => {
  autoPopulateHash(sequelize, instance, options);
  autoPopulateTemplateNameModifiedAt(sequelize, instance, options);
  autoPopulateCreationMethod(sequelize, instance, options);
};

const beforeUpdate = (sequelize, instance, options) => {
  autoPopulateHash(sequelize, instance, options);
  autoPopulateTemplateNameModifiedAt(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  autoPopulateHash,
  autoPopulateTemplateNameModifiedAt,
  autoPopulateCreationMethod,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
};
