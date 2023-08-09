export {};
const genericEnum = require('generic');
const { Topic } = require('../../models');

const findAll = async () => genericEnum.findAll(Topic);

const findById = async (
  id: number,
) => genericEnum.findById(Topic, id);

const create = async (
  data: { name: string, mapsTo?: number },
) => genericEnum.create(Topic, data);

const updateById = async (
  id: number,
  data: { name?: string, mapsTo?: number },
) => genericEnum.updateById(Topic, id, data);

const deleteById = async (
  id: number,
) => genericEnum.deleteById(Topic, id);

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
};
