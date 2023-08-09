import * as genericEnum from './generic';
import db from '../../models';

const { TargetPopulation } = db;

const findAll = async () => genericEnum.findAll(TargetPopulation);

const findById = async (
  id: number,
) => genericEnum.findById(TargetPopulation, id);

const create = async (
  data: { name: string, mapsTo?: number },
) => genericEnum.create(TargetPopulation, data);

const updateById = async (
  id: number,
  data: { name?: string, mapsTo?: number },
) => genericEnum.updateById(TargetPopulation, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(TargetPopulation, id);

export {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
