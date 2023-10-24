import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { Organizer } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Organizer, data);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(Organizer, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(Organizer, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(Organizer, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Organizer, id);

export {
  findAll,
  findByPk,
  create,
  updateById,
  deleteById,
};
