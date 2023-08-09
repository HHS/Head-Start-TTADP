export {};
const genericEnum = require('generic');
const { NationalCenter } = require('../../models');

const findAll = async () => genericEnum.findAll(NationalCenter);

const findById = async (
  id: number,
) => genericEnum.findById(NationalCenter, id);

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

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
