import * as genericEnum from './generic';
import db from '../../models';

const { Roles } = db;

const findAll = async (
  onlySpecialist = false,
) => genericEnum.findAll(
  Roles,
  {
    ...(onlySpecialist && { isSpecialist: true }),
  },
);

const findById = async (
  id: number,
) => genericEnum.findById(Roles, id);

const create = async (
  data: { name: string, fullName: string, mapsTo?: number },
) => genericEnum.create(Roles, data);

const updateById = async (
  id: number,
  data: { name?: string, fullName: string, mapsTo?: number },
) => genericEnum.updateById(Roles, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Roles, id);

export {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
