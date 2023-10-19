import { Model, Op } from 'sequelize';
import { auditLogger } from '../../logger';
import { ENTITY_TYPE } from '../../constants';
import db from '../../models';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import { pascalToCamelCase } from '../../models/helpers/associationsAndScopes';

const {
  ValidFor,
  sequelize,
} = db;

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
    options: { individualHooks?: boolean, returning?: boolean },
  ) => Promise<GenericEnumType>,
  update: (
    args: { updatedAt?: Date, mapsTo?: number },
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

interface EntityInfo {
  name: string,
  id?: number,
  type?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE];
}

interface EnumInfo {
  model: EntityEnumModel,
  alias: string,
  entityTypeFiltered?: boolean,
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
  let instance = model.findOne({
    where: {
      name: data.name,
    },
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

  if (!instance) {
    instance = model.create({
      name: data.name,
      ...(data.mapsTo && { mapsTo: data.mapsTo }),
    }, { returning: true });
  }
  return instance;
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

  await model.update({
    mapsTo: newValue.id,
  }, {
    where: { id: existing.id },
    individualHooks: true,
  });

  return newValue;
};

const deleteById = async (
  model: EnumModel,
  id: number,
) => model.destroy({
  where: { id },
  individualHooks: true,
});

//---------------------------------------------------------------------------
interface EntityGenericEnum {
  id: number,
  [key: string]: number | string,
  name: string,
}

// @ts-ignore
interface EntityEnumModel extends Model {
  name: string,
  tableName: string,
  associations: object[],
  findAll: (args: {
    attributes: (object | string)[],
    where: object,
    include: object[],
  }) => Promise<EntityGenericEnum[]>,
  bulkCreate: (
    args: { [x:string]: number }[],
    options: { individualHooks: boolean },
  ) => Promise<EntityGenericEnum[]>,
  update: (
    args: { updatedAt?: Date, mapsTo?: number },
    options: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<this>,
  destroy: (
    options?: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<void>,
}
// @ts-check

type EnumSyncResponse = {
  promises: Promise<any[]>,
  unmatched: { id?: number, name?: string }[] | null,
};

const includeGenericEnums = (
  entity: EntityInfo,
  entityEnum: EnumInfo,
) => {
  const {
    model,
    alias,
    entityTypeFiltered = false,
  } = entityEnum;
  const association = model?.associations?.[alias];
  if (!association) throw new Error(`Association:'${alias}' not found on Model:'${model.name}'`);
  const {
    target,
    as,
    foreignKey,
  } = association;

  return {
    model,
    as: pascalToCamelCase(model.tableName),
    attributes: [
      'id',
      entity.name,
      foreignKey,
      [sequelize.literal(`"${as}".name`), 'name'],
    ],
    include: [{
      model: target,
      as,
      required: true,
      attributes: [],
      ...(entityTypeFiltered && {
        include: [{
          model: ValidFor,
          as: 'validFor',
          required: true,
          attributes: [],
          where: {
            name: entity.type,
          },
        }],
      }),
    }],
  };
};

const getGenericEnums = (
  entity: EntityInfo,
  entityEnum: EnumInfo,
  genericEnums: (number | string)[] | null = null,
):Promise<EntityGenericEnum[]> => includeToFindAll(
  includeGenericEnums,
  {
    ...(entity.id && { [entity.name]: entity.id }),
    ...(genericEnums?.every((ge) => typeof ge === 'number')
      // Note that the pre/post-fix $ are required to utilize a column from an included table
      // in the top most where
      && { [`$"${entityEnum.alias}".id$`]: genericEnums }),
    ...(genericEnums?.every((ge) => typeof ge === 'string')
      // Note that the pre/post-fix $ are required to utilize a column from an included table
      // in the top most where
      && { [`$"${entityEnum.alias}".name$`]: genericEnums }),
  },
  [
    entity,
    entityEnum,
  ],
);

const syncGenericEnums = async (
  entity: EntityInfo,
  entityEnum: EnumInfo,
  genericEnums: { id?: number, name?: string }[] | null = null,
) => {
  const [incomingValidEnums, currentEnums] = await Promise.all([
    findAll(
      entityEnum.model.associations[entityEnum.alias].target,
      {
        ...(entityEnum?.entityTypeFiltered
          && entity?.type
          && { validFor: entity.type }),
        [Op.or]: [
          {
            id: genericEnums
              .filter(({ id }) => id)
              .map(({ id }) => id),
          },
          {
            name: genericEnums
              .filter(({ name }) => name)
              .map(({ name }) => name),
          },
        ],
      },
    ),
    getGenericEnums(
      entity,
      entityEnum,
    ),
  ]);
  const [
    incomingValidEnumIds,
    incomingInvalidEnum,
    currentEnumIds,
  ] = [
    incomingValidEnums.map((ive) => ive.id),
    genericEnums.reduce((acc, ge) => {
      const matched = incomingValidEnums
        .find(({ id, name }) => ge.id === id || ge.name === name);
      if (!matched) {
        acc.push(ge);
      }
      return acc;
    }, []),
    currentEnums.map((ce) => ce[`${entityEnum.alias}Id`]),
  ];
  const [
    createList,
    updateList,
    destroyList,
  ] = [
    incomingValidEnumIds.filter((iveId) => !currentEnumIds.includes(iveId)),
    incomingValidEnumIds.filter((iveId) => currentEnumIds.includes(iveId)),
    currentEnumIds.filter((ceId: number) => incomingValidEnumIds.includes(ceId)),
  ];

  return {
    promises: Promise.all([
      (createList && createList.length)
        ? entityEnum.model.bulkCreate(
          createList.map((id) => ({
            [`${entityEnum.alias}Id`]: id,
            [entity.name]: entity.id,
          })),
          { individualHooks: true },
        )
        : Promise.resolve(),
      (updateList && updateList.length)
        ? entityEnum.model.update(
          {
            updatedAt: new Date(),
          },
          {
            where: {
              [`${entityEnum.alias}Id`]: updateList,
              [entity.name]: entity.id,
            },
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      (destroyList && destroyList.length)
        ? entityEnum.model.destroy({
          where: {
            [entity.name]: entity.id,
            [`${entityEnum.alias}Id`]: destroyList,
          },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]),
    unmatched: incomingInvalidEnum,
  };
};

export {
  type EntityInfo,
  type EnumInfo,
  type GenericEnumType,
  findAll,
  findById,
  findByName,
  create,
  updateById,
  deleteById,
  type EntityEnumModel,
  type EntityGenericEnum,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
};
