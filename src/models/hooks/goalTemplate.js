import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';

const autoPopulateHash = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateName')
    && instance.templateName !== null
    && instance.templateName !== undefined) {
    instance.set('hash', sequelize.fn('md5', sequelize.fn('TRIM', instance.templateName)));
  }
};

const autoPopulateTemplateNameModifiedAt = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateName')
    && instance.templateName !== null
    && instance.templateName !== undefined) {
    instance.set('templateNameModifiedAt', new Date());
  }
};

const autoPopulateCreationMethod = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && (!changed.includes('creationMethod')
        || instance.creationMethod === null
        || instance.creationMethod === undefined)) {
    instance.set('creationMethod', AUTOMATIC_CREATION); // 'Automatic'
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
      },
    );
  }
};

const beforeValidate = (sequelize, instance) => {
  autoPopulateHash(sequelize, instance);
  autoPopulateTemplateNameModifiedAt(sequelize, instance);
  autoPopulateCreationMethod(sequelize, instance);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateTemplateName(sequelize, instance, options);
};

export {
  autoPopulateHash,
  autoPopulateTemplateNameModifiedAt,
  autoPopulateCreationMethod,
  propagateTemplateName,
  beforeValidate,
  afterUpdate,
};
