export {};
const genericEnum = require('generic');
const { TargetPopulation } = require('../../models');

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

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
