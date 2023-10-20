import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { CollaboratorType } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(CollaboratorType, data);

const findById = async (
  id: number,
) => genericEnum.findById(CollaboratorType, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(CollaboratorType, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(CollaboratorType, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(CollaboratorType, id);

export {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
