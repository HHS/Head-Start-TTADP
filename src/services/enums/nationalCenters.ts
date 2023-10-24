import * as genericEnum from './generic';
import db from '../../models';

const { NationalCenter } = db;

const findAll = async () => genericEnum.findAll(NationalCenter);

const findByPk = async (
  id: number,
) => genericEnum.findByPk(NationalCenter, id);

const create = async (
  data: { name: string, mapsTo?: number },
) => genericEnum.create(NationalCenter, data);

const updateById = async (
  id: number,
  data: { name?: string, mapsTo?: number },
) => genericEnum.updateById(NationalCenter, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(NationalCenter, id);

export {
  findAll,
  findByPk,
  create,
  updateById,
  deleteById,
};
