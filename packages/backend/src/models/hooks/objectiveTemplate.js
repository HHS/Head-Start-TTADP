import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';

const autoPopulateHash = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateTitle')
    && instance.templateTitle !== null
    && instance.templateTitle !== undefined) {
    instance.set('hash', sequelize.fn('md5', sequelize.fn('TRIM', instance.templateTitle)));
    if (!options.fields.includes('hash')) {
      options.fields.push('hash');
    }
  }
};

const autoPopulateTemplateTitleModifiedAt = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateTitle')
    && instance.templateTitle !== null
    && instance.templateTitle !== undefined) {
    instance.set('templateTitleModifiedAt', new Date());
    if (!options.fields.includes('templateTitleModifiedAt')) {
      options.fields.push('templateTitleModifiedAt');
    }
  }
};

const autoPopulateCreationMethod = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && (!changed.includes('creationMethod')
        || instance.creationMethod === null
        || instance.creationMethod === undefined)) {
    instance.set('creationMethod', AUTOMATIC_CREATION);
    if (!options.fields.includes('creationMethod')) {
      options.fields.push('creationMethod');
    }
  }
};

const propagateTemplateTitle = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && changed.includes('templateTitle')
        && instance.creationMethod === AUTOMATIC_CREATION) {
    await sequelize.models.Objective.update(
      { title: instance.templateTitle },
      {
        where: {
          [Op.and]: [
            { goalTemplateId: instance.id },
            { onApprovedAR: false },
            { name: { [Op.not]: instance.templateTitle } },
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
  autoPopulateTemplateTitleModifiedAt(sequelize, instance, options);
  autoPopulateCreationMethod(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  autoPopulateHash(sequelize, instance, options);
  autoPopulateTemplateTitleModifiedAt(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateTemplateTitle(sequelize, instance, options);
};

export {
  autoPopulateTemplateTitleModifiedAt,
  autoPopulateCreationMethod,
  propagateTemplateTitle,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
};
