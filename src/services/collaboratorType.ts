import db from '../models'

const { CollaboratorType, ValidFor } = db

const getCollaboratorTypeMapping = async (collectionName: string): Promise<{ [key: string]: number }> => {
  const collaboratorTypes = await CollaboratorType.findAll({
    attributes: ['id', 'name'],
    include: [
      {
        model: ValidFor,
        as: 'validFor',
        attributes: [],
        required: true,
        where: { name: collectionName },
      },
    ],
  })
  // Create a mapping of collaborator types by name
  const collaboratorTypeMapping = collaboratorTypes.reduce((acc, { dataValues: { id, name } }) => {
    acc[name] = id
    return acc
  }, {})

  return collaboratorTypeMapping
}

export {
  // eslint-disable-next-line import/prefer-default-export
  getCollaboratorTypeMapping,
}
