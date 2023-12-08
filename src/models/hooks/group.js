const { GROUP_COLLABORATORS } = require('../../constants');
const {
  currentUserPopulateCollaboratorForType,
} = require('../helpers/genericCollaborator');
const { skipIf } = require('../helpers/flowControl');

const autoPopulateCreator = async (sequelize, instance, options) => {
  if (skipIf(options, 'autoPopulateCreator')) return Promise.resolve();
  const { id: groupId } = instance;
  return currentUserPopulateCollaboratorForType(
    'group',
    sequelize,
    options.transaction,
    groupId,
    GROUP_COLLABORATORS.CREATOR,
  );
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateCreator(sequelize, instance, options);
};

export {
  // eslint-disable-next-line  import/prefer-default-export
  afterCreate,
};
