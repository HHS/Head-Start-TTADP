import db from '../models';

const {
  CollaboratorType,
  validFor,
} = db;

const getCollaboratorTypeMapping = async (
  collectionName: string,
): Promise<{ [key: string]: number }> => {
  const collaboratorTypes = CollaboratorType.findAll({
    attributes: ['id', 'name'],
    include: [{
      model: validFor,
      as: 'validFor',
      attributes: [],
      required: true,
      where: { name: collectionName },
    }],
  });

  // Create a mapping of collaborator types by name
  const collaboratorTypeMapping = collaboratorTypes.reduce((
    acc,
    { dataValues: { id, name } },
  ) => {
    acc[name] = id;
    return acc;
  }, {});

  return collaboratorTypeMapping;
};

export {
  getCollaboratorTypeMapping,
};
