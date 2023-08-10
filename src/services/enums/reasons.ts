import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { Reasons } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Reasons, data);

const findById = async (
  id: number,
) => genericEnum.findById(Reasons, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number },
) => genericEnum.create(Reasons, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(Reasons, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Reasons, id);

export {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
