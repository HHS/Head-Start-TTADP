export {};
const { Model } = require('sequelize');
const { auditLogger } = require('../../logger');

interface GenericEnumType {
  name: string;
  id: number;
  mapsTo?: number;
}

interface GenericEnumModel extends GenericEnumType {
  destroy: (args: { individualHooks: boolean }) => Promise<void>;
  save: () => Promise<void>;
  update: (args: { mapsTo: number }, options: { individualHooks: boolean }) => Promise<void>;
}

const findAll = async (
  model: typeof Model,
  data: object | null,
): Promise<GenericEnumType[]> => model.findAll({
  where: {
    mapsTo: null,
    ...(data && data),
  },
  attributes: ['id', 'name', 'mapsTo'],
  order: [['name', 'ASC']],
});

const findById = async (
  model: typeof Model,
  id: number,
): Promise<GenericEnumModel> => model.findByPk(id);

// TODO: add support of just setting the mapsTo and other values passed in data
const create = async (
  model: typeof Model,
  data: { name: string, mapsTo?: number },
): Promise<GenericEnumType> => model.create(data);

const updateById = async (
  model: typeof Model,
  id: number,
  data: { name?: string, mapsTo?: number },
): Promise<GenericEnumType> => {
  const existing = await findById(model, id);

  if (existing.name === data.name) {
    auditLogger.info(`Name ${data.name} has not changed`);
    return existing;
  }

  const newValue = await model.create({
    name: data.name,
  }, { individualHooks: true });

  await existing.update({
    mapsTo: newValue.id,
  }, { individualHooks: true });

  return newValue;
};

const deleteById = async (
  model: typeof Model,
  id: number,
) => model.destroy({
  where: { id },
  individualHooks: true,
});

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
