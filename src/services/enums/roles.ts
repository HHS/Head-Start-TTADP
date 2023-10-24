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

const findByPk = async (
  id: number,
) => genericEnum.findByPk(Roles, id);

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
  findByPk,
  create,
  updateById,
  deleteById,
};
