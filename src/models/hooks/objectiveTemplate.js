// import { auditLogger } from '../../logger';

const { Op } = require('sequelize');

const autoPopulateTemplateTitleModifiedAt = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('templateTitle')
    && instance.templateTitle !== null
    && instance.templateTitle !== undefined) {
    instance.set('templateTitleModifiedAt', new Date());
  }
};

const autoPopulateCreationMethod = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && (!changed.includes('creationMethod')
        || instance.creationMethod === null
        || instance.creationMethod === undefined)) {
    instance.set('creationMethod', 'Automatic');
  }
};

const propagateTemplateTitle = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
        && changed.includes('templateTitle')
        && instance.creationMethod === 'Automatic') {
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
      },
    );
  }
};

const beforeValidate = (sequelize, instance) => {
  autoPopulateTemplateTitleModifiedAt(sequelize, instance);
  autoPopulateCreationMethod(sequelize, instance);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateTemplateTitle(sequelize, instance, options);
};

export {
  autoPopulateTemplateTitleModifiedAt,
  autoPopulateCreationMethod,
  propagateTemplateTitle,
  beforeValidate,
  afterUpdate,
};
