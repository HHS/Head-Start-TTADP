import { Model } from 'sequelize';
import { auditLogger } from '../../logger';
import { ENTITY_TYPE } from '../../constants';
import db from '../../models';

const { ValidFor } = db;

// @ts-ignore ts(2430)
interface EnumModel extends Model {
  findAll: (args: {
    attributes?: (object | string)[],
    where?: object,
    include?: object[],
    order?: object[],
  }) => Promise<GenericEnumType[]>,
  findByPk: (id: number) => Promise<GenericEnumType>,
  findOne: (args: {
    attributes?: (object | string)[],
    where?: object,
    include?: object[],
    order?: object[],
  }) => Promise<GenericEnumType>,
  bulkCreate: (
    args: { name: string, mapsTo?: number }[],
    options: { individualHooks: boolean },
  ) => Promise<GenericEnumType[]>,
  create: (
    args: { name: string, mapsTo?: number },
    options: { individualHooks: boolean },
  ) => Promise<GenericEnumType>,
  update: (
    args: { updatedAt: Date },
    options: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<this>,
  destroy: (
    args: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<GenericEnumType[]>,
}

interface EnumInfo {
  model: EnumModel,
  as: string,
  entityTypeFiltered?: boolean,
  keyName: string,
}

interface GenericEnumType {
  name: string;
  id: number;
  mapsTo?: number;
}

interface GenericEnumModel extends GenericEnumType {
  findByPk: (args: { id: number }) => Promise<GenericEnumType>,
  destroy: (args: { individualHooks: boolean }) => Promise<void>;
  save: () => Promise<void>;
  update: (args: { mapsTo: number }, options: { individualHooks: boolean }) => Promise<void>;
}

const findAll = async (
  model: EnumModel,
  data: object | null = null,
): Promise<GenericEnumType[]> => model.findAll({
  where: {
    mapsTo: null,
    ...(data && data),
  },
  attributes: ['id', 'name', 'mapsTo'],
  order: [['name', 'ASC']],
});

const findById = async (
  model: EnumModel,
  id: number,
): Promise<GenericEnumType> => model.findByPk(id);

const findByName = async (
  model: EnumModel,
  name: string,
  validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
): Promise<GenericEnumType> => model.findOne({
  where: { name },
  ...(validFor && {
    include: [{
      model: ValidFor,
      as: 'validFor',
      required: true,
      attributes: [],
      where: { name: validFor },
    }],
  }),
});

const findOrCreateByName = async (
  model: EnumModel,
  data: { name: string, mapsTo?: number },
  validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
):Promise<GenericEnumType> => {
  // TODO: find if exists, if not then create
};

// TODO: add support of just setting the mapsTo and other values passed in data
const create = async (
  model: EnumModel,
  data: { name: string, mapsTo?: number },
): Promise<GenericEnumType> => model.create(
  data,
  { individualHooks: true },
);

// TODO: needs to support updating other fields, only updating name replaces record
const updateById = async (
  model: EnumModel,
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
  model: EnumModel,
  id: number,
) => model.destroy({
  where: { id },
  individualHooks: true,
});

export {
  type EnumInfo,
  type GenericEnumType,
  findAll,
  findById,
  findByName,
  create,
  updateById,
  deleteById,
};
