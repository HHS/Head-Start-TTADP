import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { SupportType } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(SupportType, data);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(SupportType, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(SupportType, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(SupportType, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(SupportType, id);

export {
  findAll,
  findByPk,
  create,
  updateById,
  deleteById,
};
