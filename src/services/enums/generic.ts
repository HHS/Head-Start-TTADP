import { Model, Op } from 'sequelize';
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

//---------------------------------------------------------------------------
interface EntityGenericEnum {
  id: number,
  [key: string]: number | string,
  enumId: number,
  name: string,
}

// @ts-ignore
interface EntityEnumModel extends Model {
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
    args: { updatedAt: Date },
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

const getEntityGenericEnum = async (
  entityEnumModel: EntityEnumModel,
  enumInfo: EnumInfo,
  entity: { name: string, id: number, type?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
  genericEnumIds: number[] | null = null,
): Promise<EntityGenericEnum[]> => entityEnumModel.findAll({
  attributes: [
    'id',
    entity.name,
    [`"${enumInfo.as}".id`, 'enumId'],
    [`"${enumInfo.as}".name`, 'name'],
  ],
  where: {
    [entity.name]: entity.id,
    ...(genericEnumIds && { genericEnumIds }),
  },
  include: [
    {
      model: enumInfo.model,
      as: enumInfo.as,
      where: {
        ...(enumInfo?.entityTypeFiltered && entity?.type && { validFor: entity.type }),
      },
      attributes: [],
      required: true,
    },
  ],
});

const syncEntityGenericEnum = async (
  entityEnumModel: EntityEnumModel,
  enumInfo: EnumInfo,
  entity: { name: string, id: number, type: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
  genericEnums: { id?: number, name?: string }[] | null = null,
): Promise<EnumSyncResponse> => {
  try {
    // in parallel:
    //    validate that the type is valid for the report type
    //    get current collaborators for this report having this type
    const [incomingValidEnums, currentEnums] = await Promise.all([
      findAll(
        enumInfo.model,
        {
          ...(enumInfo?.entityTypeFiltered && { validFor: entity.type }),
          [Op.or]: [
            { id: genericEnums.filter(({ id }) => id).map(({ id }) => id) },
            { name: genericEnums.filter(({ name }) => name).map(({ name }) => name) },
          ],
        },
      ),
      getEntityGenericEnum(
        entityEnumModel,
        enumInfo,
        entity,
      ),
    ]);

    // collect the valid ids, the invalid enums, and the current enum ids
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
      currentEnums.map((ce) => ce.id),
    ];
    // filter to the create, update, and destroy lists
    const [
      createList,
      updateList,
      destroyList,
    ] = [
      incomingValidEnumIds.filter((iveId) => !currentEnumIds.includes(iveId)),
      incomingValidEnumIds.filter((iveId) => currentEnumIds.includes(iveId)),
      currentEnumIds.filter((ceId) => incomingValidEnumIds.includes(ceId)),
    ];
    // in parallel:
    //    perform in insert/update/delete based on the sub lists
    //        if a sublist is empty, do not call the db at all for that sublist
    return {
      promises: Promise.all([
        (createList && createList.length)
          ? entityEnumModel.bulkCreate(
            createList.map((id) => ({
              [enumInfo.keyName]: id,
              [entity.name]: entity.id,
            })),
            { individualHooks: true },
          )
          : Promise.resolve(),
        (updateList && updateList.length)
          ? entityEnumModel.update(
            {
              updatedAt: new Date(),
            },
            {
              where: {
                [enumInfo.keyName]: updateList,
                [entity.name]: entity.id,
              },
              individualHooks: true,
            },
          )
          : Promise.resolve(),
        (destroyList && destroyList.length)
          ? entityEnumModel.destroy({
            where: {
              [entity.name]: entity.id,
              [enumInfo.keyName]: destroyList,
            },
            individualHooks: true,
          })
          : Promise.resolve(),
      ]),
      unmatched: incomingInvalidEnum,
    };
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

const includeEntityGenericEnums = (
  model: EntityEnumModel,
  enumInfo: EnumInfo,
  entity: { name: string, type: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => ({
  model,
  as: '', // TODO: figure out how to get this
  attributes: [
    'id',
    [entity.name],
    [`"${enumInfo.as}".id`, 'enumId'],
    [`"${enumInfo.as}".name`, 'name'],
  ],
  includes: [{
    model: enumInfo.model,
    as: enumInfo.as,
    required: true,
    attributes: [],
    ...(enumInfo?.entityTypeFiltered && {
      includes: [{
        model: ValidFor,
        as: 'validFor',
        required: true,
        attributes: [],
        where: {
          name: entity.type,
          isReport: true,
        },
      }],
    }),
  }],
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
  type EntityEnumModel,
  type EntityGenericEnum,
  type EnumSyncResponse,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
};
