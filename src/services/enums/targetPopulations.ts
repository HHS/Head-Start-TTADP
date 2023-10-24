import * as genericEnum from './generic';
import db from '../../models';
import { ENTITY_TYPE } from '../../constants';

const { TargetPopulation } = db;

const findAll = async (
  data: { validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE] },
) => genericEnum.findAll(TargetPopulation, data);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(TargetPopulation, id);

const create = async (
  data: {
    name: string,
    validFor: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.create(TargetPopulation, data);

const updateById = async (
  id: number,
  data: {
    name?: string,
    validFor?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
    mapsTo?: number,
  },
) => genericEnum.updateById(TargetPopulation, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(TargetPopulation, id);

export {
  findAll,
  findByPk,
  create,
  updateById,
  deleteById,
};
