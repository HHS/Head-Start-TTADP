const { GROUP_COLLABORATORS } = require('../../constants')
const { currentUserPopulateCollaboratorForType } = require('../helpers/genericCollaborator')
const { skipIf } = require('../helpers/flowControl')

const autoPopulateCreator = async (sequelize, instance, options) => {
  if (skipIf(options, 'autoPopulateCreator')) return Promise.resolve()
  const { id: groupId } = instance
  return currentUserPopulateCollaboratorForType('group', sequelize, options.transaction, groupId, GROUP_COLLABORATORS.CREATOR)
}

const autoPopulateEditor = async (sequelize, instance, options) => {
  const { id: groupId } = instance
  return currentUserPopulateCollaboratorForType('group', sequelize, options.transaction, groupId, GROUP_COLLABORATORS.EDITOR)
}

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateCreator(sequelize, instance, options)
  await autoPopulateEditor(sequelize, instance, options)
}

const afterUpdate = async (sequelize, instance, options) => {
  await autoPopulateEditor(sequelize, instance, options)
}

export { afterCreate, afterUpdate }
