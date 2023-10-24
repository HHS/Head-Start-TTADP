import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { TargetPopulation: Audience } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(Audience, data);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(Audience, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(Audience, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(Audience, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Audience, id);

export {
  findAll,
  findByPk,
  create,
  updateById,
  deleteById,
};
