const { Op } = require('sequelize');
const { AUTOMATIC_CREATION } = require('../../constants');
const { calculateIsAutoDetectedForNextStep, processNextStepForResourcesById } = require('../../services/resource');

const processForEmbeddedResources = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (calculateIsAutoDetectedForNextStep(changed)) {
    await processNextStepForResourcesById(instance.id);
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

const propagateTemplateName = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && changed.includes('templateName')
        && instance.creationMethod === AUTOMATIC_CREATION) { // 'Automatic'
    await sequelize.models.Goal.update(
      { name: instance.templateName },
      {
        where: {
          [Op.and]: [
            { goalTemplateId: instance.id },
            { onApprovedAR: false },
            { name: { [Op.not]: instance.templateName } },
          ],
        },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
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
  await propagateTemplateName(sequelize, instance, options);
  await processForEmbeddedResources(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  autoPopulateHash,
  autoPopulateTemplateNameModifiedAt,
  autoPopulateCreationMethod,
  propagateTemplateName,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
};
