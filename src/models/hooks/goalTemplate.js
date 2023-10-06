import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateFlag,
} from '../helpers/isFlagged';

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
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateFlag(sequelize, instance, options, 'isFoiaable');
  autoPopulateFlag(sequelize, instance, options, 'isReferenced');
  autoPopulateHash(sequelize, instance, options);
  autoPopulateTemplateNameModifiedAt(sequelize, instance, options);
  autoPopulateCreationMethod(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
  autoPopulateHash(sequelize, instance, options);
  autoPopulateTemplateNameModifiedAt(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
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
  beforeDestroy,
  afterCreate,
  afterUpdate,
};
